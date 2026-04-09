import { useState, useRef, useEffect } from "react";
import {
  analyzeStock,
  calcStats,
  toEur,
  getMadridTime,
  getNewYorkTime,
  getMarketStatus,
  ZONE_LABEL,
  ZONE_COLOR,
  ALERT_BG,
  ALERT_COLOR,
} from "@stock-pulse/core";

// ═══════════════════════════════════════════
// API CLIENT — calls apps/backend, not Anthropic directly
// API key NEVER leaves the server
// ═══════════════════════════════════════════

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("sp-auth-token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const msg = data.error || `HTTP ${res.status}`;
    if (msg.includes("limit") || msg.includes("exceeded")) throw new Error("RATE_LIMIT");
    throw new Error(msg.slice(0, 150));
  }
  return data;
}

async function runAnalysis() {
  const data = await apiFetch("/api/analysis", { method: "POST" });
  return { analysis: data.analysis, cache_info: data.cache_info };
}

async function checkPriceApi(runId, stockIndex) {
  return apiFetch(`/api/stocks/${runId}/check`, {
    method: "POST",
    body: JSON.stringify({ stockIndex }),
  });
}

async function bulkRefreshApi() {
  return apiFetch("/api/prices/bulk", { method: "POST" });
}

async function updateManualPriceApi(runId, stockIndex, priceUsd) {
  return apiFetch(`/api/stocks/${runId}/manual`, {
    method: "PATCH",
    body: JSON.stringify({ priceUsd, stockIndex }),
  });
}

async function fetchRuns() {
  const { runs } = await apiFetch("/api/analysis");
  return runs || [];
}

// ═══════════════════════════════════════════
// STYLE HELPERS (unchanged from original)
// ═══════════════════════════════════════════

const pC = p => p >= 70 ? "#00ff87" : p >= 50 ? "#ffb800" : "#ff4757";
const potentialColor = v => v === "Alto" ? "#00ff87" : v === "Medio" ? "#ffb800" : "#ff4757";
const convictionColor = v => v === "Alta" ? "#00ff87" : v === "Media" ? "#ffb800" : "#ff4757";
const potentialEmoji = v => v === "Alto" ? "🟢" : v === "Medio" ? "🟡" : "🔴";
const convictionEmoji = v => v === "Alta" ? "🟢" : v === "Media" ? "🟡" : "🔴";
const lbl = { fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 };
const mn = (s, c = "#e6edf3") => ({ fontSize: s, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: c });
const pS = { fontSize: 13, lineHeight: 1.7, color: "#c9d1d9", margin: "0 0 6px" };
const catC = { Tecnología: "#00c8ff", Aranceles: "#ffb800", Energía: "#00ff87", Biotech: "#a882ff", Infraestructura: "#ff8700", Geopolítica: "#ff4757" };

const POTENTIAL_INFO = [
  { level: "🟢 Alto",   color: "#00ff87", desc: "La IA identifica múltiples catalizadores concretos y próximos, la empresa tiene ventajas competitivas claras y el contexto macro es favorable." },
  { level: "🟡 Medio",  color: "#ffb800", desc: "Hay un catalizador real pero con incertidumbre relevante. El contexto es mixto o el margen entre precio actual y zonas de interés es limitado." },
  { level: "🔴 Bajo",   color: "#ff4757", desc: "El análisis detecta vientos en contra importantes: competencia intensa, macro adversa o catalizador débil. Se incluye para comparar, no como recomendación." },
];
const CONVICTION_INFO = [
  { level: "🟢 Alta",   color: "#00ff87", desc: "El análisis está respaldado por múltiples fuentes, datos recientes verificados y señales técnicas y fundamentales alineadas." },
  { level: "🟡 Media",  color: "#ffb800", desc: "Hay señales positivas pero también factores de incertidumbre que reducen la claridad del análisis. Requiere seguimiento más activo." },
  { level: "🔴 Baja",   color: "#ff4757", desc: "Información limitada, señales contradictorias o situación muy dependiente de un único evento incierto. Mayor margen de error." },
];

function LevelModal({ type, onClose }) {
  const items = type === "potential" ? POTENTIAL_INFO : CONVICTION_INFO;
  const title = type === "potential" ? "🚀 Niveles de Potencial" : "🎯 Niveles de Convicción";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0d1117", border: "1px solid #1e2433", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3", marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
          {title}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6e7681", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {items.map(({ level, color, desc }) => (
          <div key={level} style={{ marginBottom: 14, padding: "10px 14px", backgroundColor: `${color}06`, border: `1px solid ${color}20`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 5 }}>{level}</div>
            <div style={{ fontSize: 12, color: "#c9d1d9", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#6e7681", marginTop: 8, textAlign: "center" }}>
          ⚠️ Valoraciones cualitativas generadas por IA. No son asesoría financiera.
        </div>
      </div>
    </div>
  );
}

function PaywallModal({ onClose }) {
  const FEATURES_FREE = ["4 análisis al mes", "Tracking ilimitado de stocks", "Historial de predicciones", "Calibración de la IA"];
  const FEATURES_PREMIUM = ["2 análisis al día (cada 12h)", "Todo lo del plan Gratis", "Picks personalizados del pool global", "Soporte prioritario"];
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setErr(null);
    try {
      const data = await apiFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=cancel`,
        }),
      });
      window.location.href = data.url;
    } catch (e) {
      setErr(e.message);
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setErr(null);
    try {
      const data = await apiFetch("/api/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });
      window.location.href = data.url;
    } catch (e) {
      setErr(e.message);
      setPortalLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0d1117", border: "1px solid #1e2433", borderRadius: 16, padding: 24, maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00ff87" }}>💎 Stock Pulse Premium</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6e7681", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "#6e7681", margin: "0 0 20px" }}>Más análisis, más oportunidades</p>

        {err && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 12, backgroundColor: "rgba(255,71,87,.08)", color: "#ff4757", fontSize: 12, border: "1px solid rgba(255,71,87,.2)" }}>{err}</div>}

        {/* Free plan */}
        <div style={{ backgroundColor: "#0a0e17", border: "1px solid #1e2433", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>Gratis</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#00ff87" }}>0€/mes</span>
          </div>
          {FEATURES_FREE.map(f => <div key={f} style={{ fontSize: 13, color: "#8b949e", marginBottom: 6 }}>✅ {f}</div>)}
        </div>

        {/* Premium plan */}
        <div style={{ backgroundColor: "#0a0e17", border: "1px solid rgba(255,184,0,.25)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffb800" }}>⭐ Premium</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#ffb800" }}>9.99€/mes</span>
          </div>
          {FEATURES_PREMIUM.map(f => <div key={f} style={{ fontSize: 13, color: "#e6edf3", marginBottom: 6 }}>✅ {f}</div>)}
          <button onClick={handleCheckout} disabled={checkoutLoading} style={{ width: "100%", marginTop: 14, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "inherit", backgroundColor: checkoutLoading ? "#1e2433" : "#ffb800", color: checkoutLoading ? "#8b949e" : "#0a0e17", border: "none", borderRadius: 8, cursor: checkoutLoading ? "not-allowed" : "pointer" }}>
            {checkoutLoading ? "Redirigiendo..." : "⭐ Activar Premium — 9.99€/mes"}
          </button>
        </div>

        {/* Manage existing subscription */}
        <button onClick={handlePortal} disabled={portalLoading} style={{ width: "100%", padding: "10px", fontSize: 13, fontFamily: "inherit", backgroundColor: "transparent", color: portalLoading ? "#6e7681" : "#88c6ff", border: "1px solid #1e2433", borderRadius: 8, cursor: portalLoading ? "not-allowed" : "pointer" }}>
          {portalLoading ? "..." : "Gestionar suscripción existente"}
        </button>
      </div>
    </div>
  );
}

function Sec({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════
// AUTH — Supabase JWT via localStorage
// ═══════════════════════════════════════════

function AuthGate({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // For password reset: session tokens extracted from URL hash
  const [resetTokens, setResetTokens] = useState(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  // Detect password recovery token in URL (hash = implicit flow, search = PKCE flow)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const searchParams = new URLSearchParams(window.location.search.slice(1));

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    const code = searchParams.get("code");

    if (accessToken && type === "recovery") {
      // Implicit flow
      setResetTokens({ accessToken, refreshToken });
      setMode("reset");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (code) {
      // PKCE flow — intercambiar code por sesión
      setLoading(true);
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({ auth_code: code }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.access_token) {
            setResetTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
            setMode("reset");
          }
          window.history.replaceState(null, "", window.location.pathname);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSubmit = async () => {
    if (mode === "reset") {
      if (!password || !resetTokens) return;
      setLoading(true);
      setError(null);
      try {
        // First set the session, then update the password
        const setRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
          body: JSON.stringify({ refresh_token: resetTokens.refreshToken }),
        });
        const setData = await setRes.json();
        if (!setRes.ok) throw new Error(setData.error_description || "Token inválido o expirado");

        const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON,
            "Authorization": `Bearer ${setData.access_token}`,
          },
          body: JSON.stringify({ password }),
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(updateData.message || "Error al cambiar contraseña");

        // Log in with new token
        localStorage.setItem("sp-auth-token", setData.access_token);
        onAuth(setData.access_token);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email) return;
    if (mode !== "forgot" && !password) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "forgot") {
        const redirectTo = encodeURIComponent(window.location.origin);
        const res = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${redirectTo}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error_description || d.msg || "Error");
        }
        setError("✅ Revisa tu email para restablecer la contraseña");
        return;
      }

      if (mode === "register") {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error_description || data.msg || "Auth failed");
        // Supabase returns a user with empty identities when the email already exists
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("Este correo ya está registrado. Inicia sesión.");
        }
        setError("✅ Revisa tu email para confirmar la cuenta");
        return;
      }

      // login
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || "Auth failed");
      localStorage.setItem("sp-auth-token", data.access_token);
      onAuth(data.access_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inpStyle = { flex: 1, padding: "8px 12px", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", backgroundColor: "#0a0e17", border: "1px solid #1e2433", borderRadius: 6, color: "#e6edf3", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0e17", color: "#e6edf3", fontFamily: "'Instrument Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px", background: "linear-gradient(135deg,#e6edf3,#00ff87)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textAlign: "center" }}>💎 Stock Pulse</h1>
        <p style={{ color: "#6e7681", fontSize: 11, textAlign: "center", marginBottom: 24 }}>Hidden gems · Segundo orden · Tracking</p>

        {error && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 12, backgroundColor: error.startsWith("✅") ? "rgba(0,255,135,.08)" : "rgba(255,71,87,.08)", color: error.startsWith("✅") ? "#00ff87" : "#ff4757", fontSize: 12, border: `1px solid ${error.startsWith("✅") ? "rgba(0,255,135,.2)" : "rgba(255,71,87,.2)"}` }}>{error}</div>}

        {mode === "reset" ? (
          <>
            <p style={{ fontSize: 13, color: "#8b949e", marginBottom: 12 }}>Introduce tu nueva contraseña:</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={inpStyle} placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
          </>
        ) : (
          <>
            {mode !== "reset" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input style={inpStyle} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" autoCapitalize="none" />
              </div>
            )}
            {mode !== "forgot" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input style={inpStyle} placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
            )}
            {mode === "forgot" && <div style={{ marginBottom: 16 }} />}
          </>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", backgroundColor: loading ? "#1e2433" : "#00ff87", color: loading ? "#8b949e" : "#0a0e17", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "..." : mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : mode === "reset" ? "Guardar nueva contraseña" : "Enviar enlace de reset"}
        </button>

        <div style={{ textAlign: "center", marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {mode === "login" && <>
            <button onClick={() => { setMode("register"); setError(null); }} style={{ fontSize: 12, color: "#88c6ff", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              ¿Sin cuenta? Regístrate gratis
            </button>
            <button onClick={() => { setMode("forgot"); setError(null); }} style={{ fontSize: 12, color: "#6e7681", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </>}
          {mode !== "login" && mode !== "reset" && (
            <button onClick={() => { setMode("login"); setError(null); }} style={{ fontSize: 12, color: "#88c6ff", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

function isRecoveryUrl() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const searchParams = new URLSearchParams(window.location.search.slice(1));
  const isImplicit = hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
  const isPkce = !!searchParams.get("code");
  return isImplicit || isPkce;
}

export default function StockAnalyzer() {
  const [authed, setAuthed] = useState(() => !isRecoveryUrl() && !!localStorage.getItem("sp-auth-token"));
  const [tab, setTab] = useState("analyze");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadPhase, setLoadPhase] = useState(0);
  const [clock, setClock] = useState({ m: getMadridTime(), n: getNewYorkTime(), ...getMarketStatus() });
  const [runs, setRuns] = useState([]);
  const [checking, setChecking] = useState(null);
  const [mPrices, setMPrices] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [levelModal, setLevelModal] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [currency, setCurrency] = useState(() => localStorage.getItem("sp-currency") || "USD");
  const loadStart = useRef(0);
  const phaseTimer = useRef(null);
  const pendingData = useRef(null);

  const MIN_LOAD_MS = 40000;
  const PHASE_TIMES = [0, 10000, 25000];

  useEffect(() => { const iv = setInterval(() => setClock({ m: getMadridTime(), n: getNewYorkTime(), ...getMarketStatus() }), 15000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    if (!authed) return;
    fetchRuns().then(setRuns).catch(() => {});
  }, [authed]);

  if (!authed) {
    return <AuthGate onAuth={() => { setAuthed(true); fetchRuns().then(setRuns).catch(() => {}); }} />;
  }

  const stats = calcStats(runs);
  const fx = data?.fx;

  const startPhaseTimer = () => {
    setLoadPhase(0);
    loadStart.current = Date.now();
    phaseTimer.current = setInterval(() => {
      const elapsed = Date.now() - loadStart.current;
      const phase = PHASE_TIMES.filter(t => elapsed >= t).length - 1;
      setLoadPhase(Math.min(phase, 2));
    }, 500);
  };

  const stopPhaseTimer = () => {
    if (phaseTimer.current) { clearInterval(phaseTimer.current); phaseTimer.current = null; }
  };

  const analyze = async () => {
    setLoading(true); setData(null); setError(null); pendingData.current = null;
    startPhaseTimer();
    try {
      const { analysis } = await runAnalysis();
      pendingData.current = analysis;
      const elapsed = Date.now() - loadStart.current;
      const remaining = Math.max(0, MIN_LOAD_MS - elapsed);
      setTimeout(async () => {
        stopPhaseTimer();
        setData(pendingData.current);
        pendingData.current = null;
        setLoading(false);
        const updated = await fetchRuns();
        setRuns(updated);
      }, remaining);
    } catch (e) {
      stopPhaseTimer();
      setLoading(false);
      const msg = e.message || "";
      if (msg === "RATE_LIMIT") setError("Límite de la API alcanzado. Espera 2-3 minutos y reintenta.");
      else if (msg === "FREEMIUM_LIMIT_MONTHLY") { setError("FREEMIUM_LIMIT_MONTHLY"); }
      else if (msg === "FREEMIUM_LIMIT_DAILY") setError("Has alcanzado el límite diario de 2 análisis premium.");
      else if (msg.startsWith("FREEMIUM_LIMIT_12H")) {
        const secs = parseInt(msg.split(":")[1] || "0", 10);
        const h = Math.floor(secs / 3600);
        const m = Math.ceil((secs % 3600) / 60);
        setError(`Debes esperar 12h entre análisis. Próximo disponible en ${h}h ${m}m.`);
      } else setError(msg.slice(0, 200));
    }
  };

  const check = async (runId, si) => {
    setChecking(`${runId}-${si}`);
    try {
      await checkPriceApi(runId, si);
      const updated = await fetchRuns();
      setRuns(updated);
    } catch { /* silent */ } finally { setChecking(null); }
  };

  const updateManualPrice = async (runId, si, priceUsd) => {
    if (!priceUsd || isNaN(priceUsd)) return;
    await updateManualPriceApi(runId, si, parseFloat(priceUsd));
    const updated = await fetchRuns();
    setRuns(updated);
    setMPrices(p => ({ ...p, [`${runId}-${si}`]: "" }));
  };

  const bulkRefresh = async () => {
    setRefreshing(true);
    try {
      await bulkRefreshApi();
      const updated = await fetchRuns();
      setRuns(updated);
    } catch (e) { console.error(e); } finally { setRefreshing(false); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0e17", color: "#e6edf3", fontFamily: "'Instrument Sans',sans-serif", padding: "20px 14px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 15px rgba(0,255,135,.08)}50%{box-shadow:0 0 30px rgba(0,255,135,.15)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", background: "linear-gradient(135deg,#e6edf3,#00ff87)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>⚡ Stock Pulse</h1>
          <p style={{ color: "#e6edf3", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Invierte como un pro. Sin serlo.</p>
          <p style={{ color: "#6e7681", fontSize: 10, margin: 0 }}>Análisis en profundidad · Mercado global · No es consejo de inversión</p>
        </div>

        {/* Sign out */}
        <div style={{ marginBottom: 6, textAlign: "right" }}>
          <button onClick={() => { localStorage.removeItem("sp-auth-token"); setAuthed(false); setRuns([]); setData(null); }} style={{ fontSize: 9, color: "#6e7681", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>🚪 Cerrar sesión</button>
        </div>

        {/* MARKET BAR */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14, padding: "5px 12px", backgroundColor: clock.o ? "rgba(0,255,135,.04)" : "rgba(136,198,255,.04)", border: `1px solid ${clock.o ? "rgba(0,255,135,.1)" : "rgba(136,198,255,.1)"}`, borderRadius: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: clock.o ? "#00ff87" : "#88c6ff", animation: clock.o ? "pulse 1.5s infinite" : "none" }} />
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: clock.o ? "#00ff87" : "#88c6ff" }}>🇺🇸 NYSE · {clock.t}</span>
          </span>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#6e7681" }}>🇪🇸 {clock.m} · 🇺🇸 {clock.n}</span>
          {stats.tot > 0 && <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#6e7681" }}>📊 {stats.tot} pred · {stats.wr}% win</span>}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", marginBottom: 18, borderBottom: "1px solid #1e2433" }}>
          {[["analyze", "🌍 Analizar"], ["monitor", `📡 Monitor${stats.pend ? ` (${stats.pend})` : ""}`], ["history", `📊 Historial`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, fontFamily: "inherit", backgroundColor: "transparent", color: tab === k ? "#00ff87" : "#6e7681", border: "none", borderBottom: tab === k ? "2px solid #00ff87" : "2px solid transparent", cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {/* ═══ ANALYZE ═══ */}
        {tab === "analyze" && <>
          {/* Currency toggle — always visible */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "'JetBrains Mono',monospace" }}>Moneda:</span>
            <div style={{ display: "flex", border: "1px solid #1e2433", borderRadius: 6, overflow: "hidden" }}>
              {[["USD","$ USD"],["EUR","€ EUR"]].map(([c, label]) => (
                <button key={c} onClick={() => { setCurrency(c); localStorage.setItem("sp-currency", c); }} style={{ padding: "3px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", border: "none", backgroundColor: currency === c ? "#00ff87" : "transparent", color: currency === c ? "#000" : "#6e7681", fontFamily: "inherit" }}>{label}</button>
              ))}
            </div>
            {data && <span style={{ fontSize: 10, color: "#6e7681" }}>· 1 USD = {fx} EUR</span>}
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <button onClick={analyze} disabled={loading} style={{ background: loading ? "linear-gradient(135deg,#1a1f2e,#1e2433)" : "linear-gradient(135deg,#00ff87,#00cc6a)", color: loading ? "#8b949e" : "#0a0e17", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 14, height: 14, border: "2px solid #8b949e", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />Analizando...</span> : "💎 Buscar oportunidades ocultas"}
            </button>
            {!loading && !data && !error && <p style={{ fontSize: 10, color: "#6e7681", marginTop: 6 }}>~40s · Análisis del mercado global a fondo</p>}
            {loading && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, maxWidth: 280, margin: "14px auto 0" }}>
                {[
                  { emoji: "🌍", text: "Analizando mercado global",   fs: 11 },
                  { emoji: "🔍", text: "Identificando oportunidades", fs: 14 },
                  { emoji: "📊", text: "Preparando tu informe",       fs: 18 },
                ].slice(0, loadPhase + 1).map((s, i) => (
                  <span key={i} style={{ fontSize: s.fs, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#00ff87", opacity: i === loadPhase ? 1 : 0.3, transition: "opacity .3s" }}>
                    {s.emoji} {s.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ backgroundColor: "rgba(255,71,87,.06)", border: "1px solid rgba(255,71,87,.2)", borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 16 }}>
              {error === "FREEMIUM_LIMIT_MONTHLY" ? (
                <>
                  <div style={{ fontSize: 14, color: "#ff4757", marginBottom: 6 }}>⚠️ Has alcanzado el límite de 4 análisis/mes</div>
                  <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 14 }}>Mejora a Premium para 2 análisis al día</div>
                  <button onClick={() => setShowPaywall(true)} style={{ padding: "10px 24px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", backgroundColor: "#ffb800", color: "#0a0e17", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    💎 Ver planes Premium
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: "#ff4757", marginBottom: 4 }}>⚠️ Error</div>
                  <div style={{ fontSize: 11, color: "#8b949e" }}>{error}</div>
                </>
              )}
            </div>
          )}

          {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

          {data && <>
            <div style={{ background: "linear-gradient(135deg,rgba(0,255,135,.03),rgba(0,204,106,.01))", border: "1px solid rgba(0,255,135,.1)", borderRadius: 10, padding: 14, marginBottom: 12, animation: "glow 3s infinite" }}>
              <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "#00ff87", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>🌍 Panorama macro</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#c9d1d9" }}>{data.macro}</p>
            </div>

            {data.trends?.map((t, i) => {
              const cc = catC[t.cat] || "#88c6ff";
              return (
                <div key={i} style={{ backgroundColor: "#0d1117", border: "1px solid #1e2433", borderRadius: 8, padding: 12, marginBottom: 6, animation: `slideUp .3s ease-out ${i * .08}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: `${cc}10`, color: cc, border: `1px solid ${cc}20` }}>{t.cat}</span>
                  </div>
                  <p style={{ ...pS, fontSize: 12, fontWeight: 500, color: "#e6edf3" }}>{t.t}</p>
                  {t.skip?.length > 0 && <div style={{ fontSize: 10, color: "#6e7681", marginTop: 2 }}><span style={{ color: "#ff4757" }}>❌ Skip:</span> {t.skip.join(", ")} <span style={{ fontSize: 9 }}>— {t.skip_why}</span></div>}
                </div>
              );
            })}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "14px 0 10px" }}>
              <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "'JetBrains Mono',monospace" }}>── 💎 HIDDEN GEMS ──</span>
            </div>

            {data.picks?.map((p, idx) => {
              const pc = potentialColor(p.potential);
              const cc = convictionColor(p.conviction);
              return (
                <div key={p.tk} style={{ backgroundColor: "#0d1117", border: `1px solid ${idx === 0 ? "rgba(0,255,135,.2)" : "#1e2433"}`, borderRadius: 12, padding: 20, marginBottom: 14, animation: `slideUp .4s ease-out ${idx * .15}s both`, position: "relative", overflow: "hidden" }}>
                  {idx === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#00ff87,#00cc6a,transparent)" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 18 }}>{idx === 0 ? "💎" : "🔹"}</span>
                        <span style={mn(20)}>{p.tk}</span>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: "rgba(136,198,255,.05)", color: "#88c6ff", border: "1px solid rgba(136,198,255,.1)" }}>{p.cap}</span>
                        {p.radar && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: "rgba(0,255,135,.05)", color: "#00ff87", border: "1px solid rgba(0,255,135,.1)" }}>🔇 Bajo radar</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#8b949e" }}>{p.co}</div>
                      <div style={{ fontSize: 10, color: "#6e7681", marginTop: 1 }}>Precio: {currency === "USD" ? `$${p.px}` : `${toEur(p.px, fx)}€`} · {p.src}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setLevelModal("potential")} style={{ textAlign: "center", backgroundColor: `${pc}08`, border: `1px solid ${pc}25`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={lbl}>🚀 Potencial</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pc }}>{potentialEmoji(p.potential)} {p.potential ?? "—"}</div>
                        <div style={{ fontSize: 9, color: "#6e7681" }}>{p.time}</div>
                        <div style={{ fontSize: 8, color: "#6e7681", marginTop: 2 }}>toca para saber más</div>
                      </button>
                      <button onClick={() => setLevelModal("conviction")} style={{ textAlign: "center", backgroundColor: `${cc}08`, border: `1px solid ${cc}25`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={lbl}>🎯 Convicción</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cc }}>{convictionEmoji(p.conviction)} {p.conviction ?? "—"}</div>
                        <div style={{ fontSize: 8, color: "#6e7681", marginTop: 2 }}>toca para saber más</div>
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "7px 10px", backgroundColor: "rgba(136,198,255,.02)", border: "1px solid rgba(136,198,255,.06)", borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "#88c6ff", marginBottom: 2 }}>🔗 Conexión indirecta</div>
                    <p style={{ ...pS, fontSize: 12, margin: 0 }}>{p.link}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {[["1M", p.p1m], ["3M", p.p3m], ["6M", p.p6m]].map(([l, v]) => v && (
                      <div key={l} style={{ padding: "4px 10px", backgroundColor: "#0a0e17", border: "1px solid #1e2433", borderRadius: 5, textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: "#8b949e" }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: String(v).includes("-") ? "#ff4757" : "#00ff87" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 6, marginBottom: 12, padding: 10, backgroundColor: "rgba(0,255,135,.02)", border: "1px solid rgba(0,255,135,.06)", borderRadius: 8 }}>
                    <div><div style={lbl}>🟢 Entrada</div><div style={mn(14)}>{currency === "USD" ? `$${p.entry}` : `${toEur(p.entry, fx)}€`}</div></div>
                    <div><div style={lbl}>🎯 Target</div><div style={mn(14, "#00ff87")}>{currency === "USD" ? `$${p.target}` : `${toEur(p.target, fx)}€`}</div></div>
                    <div><div style={lbl}>🛑 Stop</div><div style={mn(14, "#ff4757")}>{currency === "USD" ? `$${p.stop}` : `${toEur(p.stop, fx)}€`}</div></div>
                    <div><div style={lbl}>⚖️ R/R</div><div style={mn(14)}>{p.rr || "—"}</div></div>
                  </div>
                  {p.cat && <Sec icon="⚡" title="Catalizador"><p style={pS}>{p.cat}</p>{p.cat_date && <p style={{ ...pS, fontSize: 11, color: "#6e7681" }}>📅 {p.cat_date}</p>}{p.notPI && <p style={{ ...pS, fontSize: 11, color: "#00ff87" }}>💡 No priced-in: {p.notPI}</p>}</Sec>}
                  {p.next?.length > 0 && <Sec icon="📅" title="Próximos catalizadores">{p.next.map((c, j) => (<div key={j} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 2, backgroundColor: c.i === "Alto" ? "rgba(0,255,135,.06)" : "rgba(136,198,255,.05)", color: c.i === "Alto" ? "#00ff87" : "#88c6ff" }}>{c.i}</span><span style={{ fontSize: 11, color: "#c9d1d9" }}>{c.e}</span><span style={{ fontSize: 9, color: "#6e7681", marginLeft: "auto" }}>{c.d}</span></div>))}</Sec>}
                  {p.exp?.length > 0 && <Sec icon="🗣️" title="Expertos">{p.exp.map((e, j) => (<div key={j} style={{ marginBottom: 5, padding: "5px 8px", backgroundColor: "rgba(136,198,255,.02)", border: "1px solid rgba(136,198,255,.06)", borderRadius: 5 }}><span style={{ fontSize: 10, fontWeight: 600, color: "#88c6ff" }}>{e.s}</span><span style={{ fontSize: 9, color: "#6e7681", marginLeft: 6 }}>{e.d}</span><p style={{ ...pS, margin: "2px 0 0", fontSize: 11 }}>{e.o}</p></div>))}</Sec>}
                  {p.radarNote && <Sec icon="📡" title="Radar"><p style={{ ...pS, fontSize: 11 }}>{p.radarNote}</p></Sec>}
                  {p.why && <Sec icon="🧠" title="Síntesis"><p style={{ ...pS, lineHeight: 1.8 }}>{p.why}</p></Sec>}
                  {p.verdict && <div style={{ padding: 8, backgroundColor: "rgba(0,255,135,.02)", border: "1px solid rgba(0,255,135,.08)", borderRadius: 5, marginBottom: 8 }}><p style={{ ...pS, margin: 0, fontWeight: 500, fontSize: 12 }}>💡 {p.verdict}</p></div>}
                  {p.risks?.length > 0 && <div style={{ padding: 8, backgroundColor: "rgba(255,71,87,.02)", border: "1px solid rgba(255,71,87,.08)", borderRadius: 5, marginBottom: p.scenarios ? 10 : 0 }}><div style={{ fontSize: 9, fontWeight: 600, color: "#ff4757", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>⚠️ Riesgos</div>{p.risks.map((r, j) => <div key={j} style={{ fontSize: 11, color: "#c9d1d9", marginBottom: 2, paddingLeft: 8, borderLeft: "2px solid rgba(255,71,87,.2)" }}>{r}</div>)}</div>}
                  {p.scenarios && (
                    <div style={{ padding: 10, backgroundColor: "rgba(136,198,255,.02)", border: "1px solid rgba(136,198,255,.08)", borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#88c6ff", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>📊 Escenarios</div>
                      {[["🟢 OPTIMISTA", p.scenarios.optimistic, "#00ff87"], ["🔵 BASE", p.scenarios.base, "#88c6ff"], ["🔴 ADVERSO", p.scenarios.adverse, "#ff4757"]].map(([label, text, color]) => (
                        <div key={label} style={{ marginBottom: 7 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 2, letterSpacing: 0.8 }}>{label}</div>
                          <div style={{ fontSize: 11, color: "#c9d1d9", lineHeight: 1.6, paddingLeft: 6, borderLeft: `2px solid ${color}30` }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ textAlign: "center", padding: "10px 12px", fontSize: 10, color: "#8b949e", backgroundColor: "rgba(255,183,0,.03)", border: "1px solid rgba(255,183,0,.1)", borderRadius: 8 }}>⚠️ No es asesoría financiera. Los precios pueden diferir de tu broker — SIEMPRE verifica antes de operar. 1 USD ≈ {fx} EUR.</div>
          </>}
          {levelModal && <LevelModal type={levelModal} onClose={() => setLevelModal(null)} />}

          {!loading && !data && !error && (
            <div style={{ textAlign: "center", padding: "30px 16px", color: "#6e7681" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💎</div>
              <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 8 }}>Oportunidades ocultas para swing trading</div>
              <div style={{ fontSize: 11, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                1 sola llamada a la IA que internamente:<br />
                <span style={{ color: "#00ff87" }}>→</span> Escanea macro (aranceles, tech, regulaciones)<br />
                <span style={{ color: "#00ff87" }}>→</span> Descarta mega-caps obvias<br />
                <span style={{ color: "#00ff87" }}>→</span> Encuentra hidden gems de segundo orden<br />
                <span style={{ color: "#00ff87" }}>→</span> Verifica precios reales y catalizadores
              </div>
            </div>
          )}
        </>}

        {/* ═══ MONITOR ═══ */}
        {tab === "monitor" && (() => {
          const pending = runs.flatMap(r => (r.stocks || []).filter(s => s.res === "pending").map((s, si) => ({ ...s, runId: r.id, si: r.stocks.indexOf(s), fx: r.fx, runDate: r.date })));
          if (pending.length === 0) return (
            <div style={{ textAlign: "center", padding: "30px 16px", color: "#6e7681" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
              <div style={{ fontSize: 13, color: "#8b949e" }}>Sin stocks pendientes</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Lanza un análisis para empezar a monitorear</div>
            </div>
          );
          return <>
            <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 10, padding: "6px 10px", backgroundColor: "rgba(136,198,255,.03)", border: "1px solid rgba(136,198,255,.08)", borderRadius: 6 }}>
              💡 Actualiza precios con 1 sola llamada a IA, o introduce manualmente desde tu broker.
            </div>
            <div style={{ marginBottom: 12 }}>
              <button onClick={bulkRefresh} disabled={refreshing} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", backgroundColor: refreshing ? "#1e2433" : "rgba(0,255,135,.08)", color: refreshing ? "#8b949e" : "#00ff87", border: "1px solid rgba(0,255,135,.2)", borderRadius: 8, cursor: refreshing ? "not-allowed" : "pointer" }}>
                {refreshing ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ width: 12, height: 12, border: "2px solid #8b949e", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />Actualizando precios...</span> : `📡 Actualizar todos los precios (${pending.length} stocks · 1 llamada IA)`}
              </button>
            </div>
            {pending.map((s, idx) => {
              const analysis = analyzeStock(s);
              const key = `${s.runId}-${s.si}`;
              const lastPrice = s.ph?.length > 0 ? s.ph[s.ph.length - 1] : null;
              const lastDate = lastPrice ? new Date(lastPrice.d) : null;
              const ago = lastDate ? Math.round((Date.now() - lastDate.getTime()) / 3600000) : null;
              const zc = ZONE_COLOR[analysis.zone] || "#8b949e";

              return (
                <div key={key} style={{ backgroundColor: "#0d1117", border: `1px solid ${zc}25`, borderRadius: 10, padding: 16, marginBottom: 10, animation: `slideUp .3s ease-out ${idx * .08}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={mn(16)}>{s.tk}</span>
                        <span style={{ fontSize: 10, color: "#8b949e" }}>{s.co}</span>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, backgroundColor: `${zc}10`, color: zc, border: `1px solid ${zc}25` }}>{ZONE_LABEL[analysis.zone]}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#6e7681" }}>
                        Último: {lastPrice ? `${toEur(lastPrice.p, s.fx)}€ ($${lastPrice.p})` : `${toEur(s.px, s.fx)}€`} · {ago !== null ? (ago < 1 ? "hace <1h" : `hace ${ago}h`) : "sin check"}
                        {s.ph?.length > 1 && ` · ${s.ph.length} data points`}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", padding: "4px 12px", backgroundColor: `${analysis.score >= 20 ? "#00ff87" : analysis.score >= 0 ? "#ffb800" : "#ff4757"}08`, border: `1px solid ${analysis.score >= 20 ? "#00ff87" : analysis.score >= 0 ? "#ffb800" : "#ff4757"}20`, borderRadius: 8 }}>
                      <div style={{ fontSize: 8, color: "#8b949e", textTransform: "uppercase" }}>Score</div>
                      <div style={mn(18, analysis.score >= 20 ? "#00ff87" : analysis.score >= 0 ? "#ffb800" : "#ff4757")}>{analysis.score > 0 ? "+" : ""}{analysis.score}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6e7681", marginBottom: 3 }}>
                      <span>Stop {toEur(s.stp || s.stop || s.entry * 0.9, s.fx)}€</span>
                      <span>Entrada {toEur(s.entry, s.fx)}€</span>
                      <span>Target {toEur(s.tgt || s.target || s.entry * 1.15, s.fx)}€</span>
                    </div>
                    <div style={{ position: "relative", width: "100%", height: 8, backgroundColor: "#1e2433", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, Math.max(0, analysis.progress))}%`, backgroundColor: analysis.progress >= 80 ? "#00ff87" : analysis.progress >= 40 ? "#ffb800" : analysis.progress >= 0 ? "#88c6ff" : "#ff4757", borderRadius: 4, transition: "width .3s" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#6e7681", marginTop: 2 }}>{analysis.progress}% hacia target · Desde entrada: {analysis.pctFromEntry?.toFixed(1)}%</div>
                  </div>
                  {analysis.alerts.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {analysis.alerts.map((a, i) => (
                        <div key={i} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, marginBottom: 2, backgroundColor: ALERT_BG[a.t] || "rgba(136,198,255,.04)", color: ALERT_COLOR[a.t] || "#88c6ff", border: `1px solid ${ALERT_COLOR[a.t] || "#88c6ff"}15` }}>
                          {a.m}
                        </div>
                      ))}
                    </div>
                  )}
                  {s.ph?.length >= 2 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 8, color: "#6e7681", marginBottom: 3, textTransform: "uppercase" }}>Historial de precios</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36 }}>
                        {(() => {
                          const pts = s.ph.slice(-15);
                          const mn2 = Math.min(...pts.map(x => x.p));
                          const mx = Math.max(...pts.map(x => x.p));
                          const range = mx - mn2 || 1;
                          return pts.map((pt, i) => {
                            const h = Math.max(4, ((pt.p - mn2) / range) * 30);
                            const isLast = i === pts.length - 1;
                            return <div key={i} style={{ width: 8, height: h, backgroundColor: isLast ? "#00ff87" : "#88c6ff", borderRadius: 1, opacity: isLast ? 1 : .5 }} />;
                          });
                        })()}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="number" step="0.01" placeholder="Precio USD (de tu broker)" value={mPrices[key] || ""} onChange={e => setMPrices(p => ({ ...p, [key]: e.target.value }))} style={{ flex: 1, padding: "6px 10px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", backgroundColor: "#0a0e17", border: "1px solid #1e2433", borderRadius: 6, color: "#e6edf3", outline: "none" }} />
                    <button onClick={() => check(s.runId, s.si)} disabled={checking === key} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", backgroundColor: "rgba(136,198,255,.06)", color: "#88c6ff", border: "1px solid rgba(136,198,255,.2)", borderRadius: 6, cursor: checking === key ? "not-allowed" : "pointer" }}>
                      {checking === key ? <span style={{ display: "inline-block", width: 8, height: 8, border: "2px solid #88c6ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : "🔄 IA"}
                    </button>
                    <button onClick={() => updateManualPrice(s.runId, s.si, mPrices[key])} disabled={!mPrices[key]} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", backgroundColor: mPrices[key] ? "rgba(0,255,135,.08)" : "rgba(136,198,255,.04)", color: mPrices[key] ? "#00ff87" : "#6e7681", border: `1px solid ${mPrices[key] ? "rgba(0,255,135,.2)" : "#1e2433"}`, borderRadius: 6, cursor: mPrices[key] ? "pointer" : "not-allowed" }}>
                      Manual
                    </button>
                  </div>
                </div>
              );
            })}
          </>;
        })()}

        {/* ═══ HISTORY ═══ */}
        {tab === "history" && <>
          {stats.tot > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 6, marginBottom: 14, padding: 12, backgroundColor: "#0d1117", border: "1px solid #1e2433", borderRadius: 10 }}>
              <div style={{ textAlign: "center" }}><div style={lbl}>Total</div><div style={mn(18)}>{stats.tot}</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>Win%</div><div style={mn(18, stats.wr !== "—" && +stats.wr >= 50 ? "#00ff87" : "#ff4757")}>{stats.wr}%</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>✅</div><div style={mn(18, "#00ff87")}>{stats.w}</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>❌</div><div style={mn(18, "#ff4757")}>{stats.l}</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>⏳</div><div style={mn(18, "#ffb800")}>{stats.pend}</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>Pred</div><div style={mn(14)}>+{stats.aP}%</div></div>
              <div style={{ textAlign: "center" }}><div style={lbl}>Real</div><div style={mn(14, +stats.aA >= 0 ? "#00ff87" : "#ff4757")}>{+stats.aA >= 0 ? "+" : ""}{stats.aA}%</div></div>
              {stats.best && <div style={{ textAlign: "center" }}><div style={lbl}>🏆</div><div style={mn(11, "#00ff87")}>{stats.best.t} +{stats.best.g}%</div></div>}
            </div>
          )}
          {stats?.cal && (
            <div style={{ marginBottom: 14, padding: 14, backgroundColor: "#0d1117", border: "1px solid rgba(168,130,255,.15)", borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#a882ff", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>🔬 Calibración IA (basada en {stats.cal.n} resultados)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: 10, backgroundColor: "rgba(168,130,255,.04)", border: "1px solid rgba(168,130,255,.08)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: "#8b949e", marginBottom: 3 }}>GANANCIA: Predicha vs Real</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={mn(14, "#8b949e")}>+{stats.cal.avgPred}%</span>
                    <span style={{ fontSize: 11, color: "#6e7681" }}>→</span>
                    <span style={mn(14, parseFloat(stats.cal.avgActual) >= 0 ? "#00ff87" : "#ff4757")}>{parseFloat(stats.cal.avgActual) >= 0 ? "+" : ""}{stats.cal.avgActual}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: parseFloat(stats.cal.bias) > 0 ? "#ffb800" : "#00ff87", marginTop: 3 }}>
                    {parseFloat(stats.cal.bias) > 0 ? `⚠️ IA sobreestima ${stats.cal.bias}% de media` : `✅ IA subestima ${Math.abs(parseFloat(stats.cal.bias)).toFixed(1)}% de media`}
                  </div>
                </div>
                <div style={{ padding: 10, backgroundColor: "rgba(168,130,255,.04)", border: "1px solid rgba(168,130,255,.08)", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: "#8b949e", marginBottom: 3 }}>PROBABILIDAD: Predicha vs Real</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={mn(14, "#8b949e")}>{stats.cal.avgProb}%</span>
                    <span style={{ fontSize: 11, color: "#6e7681" }}>→</span>
                    <span style={mn(14, parseFloat(stats.cal.realWinRate) >= 50 ? "#00ff87" : "#ff4757")}>{stats.cal.realWinRate}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: parseFloat(stats.cal.probBias) > 0 ? "#ffb800" : "#00ff87", marginTop: 3 }}>
                    {parseFloat(stats.cal.probBias) > 0 ? `⚠️ IA sobreconfiada ${stats.cal.probBias}%` : `✅ IA conservadora ${Math.abs(parseFloat(stats.cal.probBias))}%`}
                  </div>
                </div>
              </div>
            </div>
          )}
          {runs.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 16px", color: "#6e7681" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 12 }}>Sin historial aún</div>
            </div>
          )}
          {runs.map(r => (
            <div key={r.id} style={{ backgroundColor: "#0d1117", border: "1px solid #1e2433", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e6edf3", marginBottom: 6 }}>
                {new Date(r.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {new Date(r.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                <span style={{ fontSize: 9, color: "#6e7681", marginLeft: 6 }}>FX: {r.fx}</span>
              </div>
              {r.stocks?.map((s, si) => {
                const isPend = s.res === "pending";
                const isW = s.res === "w";
                const isCh = checking === `${r.id}-${si}`;
                return (
                  <div key={si} style={{ padding: 8, backgroundColor: isPend ? "rgba(255,183,0,.02)" : isW ? "rgba(0,255,135,.02)" : "rgba(255,71,87,.02)", border: `1px solid ${isPend ? "rgba(255,183,0,.06)" : isW ? "rgba(0,255,135,.06)" : "rgba(255,71,87,.06)"}`, borderRadius: 5, marginBottom: 3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <div>
                        <span style={mn(12)}>{s.tk}</span>
                        <span style={{ fontSize: 10, color: "#8b949e", marginLeft: 5 }}>{s.co}</span>
                        <div style={{ fontSize: 9, color: "#6e7681", marginTop: 1 }}>
                          Pred: <span style={{ color: "#00ff87" }}>+{s.gain}%</span> · {s.time} · Entrada: {s.entryE}€
                        </div>
                      </div>
                      {isPend && (
                        <button onClick={() => check(r.id, si)} disabled={isCh} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, border: "1px solid rgba(136,198,255,.2)", backgroundColor: "rgba(136,198,255,.04)", color: "#88c6ff", cursor: isCh ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                          {isCh ? <span style={{ display: "inline-block", width: 8, height: 8, border: "2px solid #88c6ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : "Comprobar"}
                        </button>
                      )}
                      {!isPend && (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isW ? "#00ff87" : "#ff4757" }}>
                            {isW ? "✅" : "❌"} {s.ag >= 0 ? "+" : ""}{s.ag}%
                          </span>
                          <div style={{ fontSize: 8, color: "#6e7681" }}>{s.apE}€ · {new Date(s.cd).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</div>
                        </div>
                      )}
                    </div>
                    {s.link && <div style={{ fontSize: 8, color: "#6e7681", marginTop: 2 }}>🔗 {s.link.slice(0, 90)}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}
