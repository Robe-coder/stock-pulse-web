import type { Stock, TechnicalAnalysis, Alert, Zone } from "../types";

export const ZONE_LABEL: Record<Zone, string> = {
  profit: "🎯 Target",
  stopped: "🛑 Stop",
  buy: "💰 Compra",
  near_target: "🎯 Cerca",
  hold: "📊 Hold",
  unknown: "—",
};

export const ZONE_COLOR: Record<Zone, string> = {
  profit: "#00ff87",
  stopped: "#ff4757",
  buy: "#ffb800",
  near_target: "#00c8ff",
  hold: "#8b949e",
  unknown: "#6e7681",
};

export const ALERT_BG: Record<Alert["t"], string> = {
  profit: "rgba(0,255,135,.06)",
  stop: "rgba(255,71,87,.06)",
  buy: "rgba(255,183,0,.06)",
  near: "rgba(0,200,255,.06)",
  warn: "rgba(255,71,87,.06)",
  bull: "rgba(0,255,135,.06)",
  bear: "rgba(255,71,87,.06)",
};

export const ALERT_COLOR: Record<Alert["t"], string> = {
  profit: "#00ff87",
  stop: "#ff4757",
  buy: "#ffb800",
  near: "#00c8ff",
  warn: "#ff4757",
  bull: "#00ff87",
  bear: "#ff4757",
};

/**
 * Technical analysis engine — pure algorithms, no AI, no I/O.
 * Runs in both client (mobile/web) and server.
 */
export function analyzeStock(stock: Pick<Stock, "ph" | "px" | "entry" | "tgt" | "stp">): TechnicalAnalysis {
  const alerts: Alert[] = [];
  const prices = stock.ph || [];
  const current = prices.length > 0 ? prices[prices.length - 1].p : stock.px;
  const entry = stock.entry;
  const target =
    stock.tgt ?? (entry ? entry * 1.15 : null);
  const stop =
    stock.stp ?? (entry ? entry * 0.9 : null);

  if (!current || !entry) {
    return { alerts: [], score: 0, zone: "unknown", progress: 0 };
  }

  const progress =
    target !== null && target !== entry
      ? ((current - entry) / (target - entry)) * 100
      : 0;
  const pctFromEntry = ((current - entry) / entry) * 100;
  const pctToTarget = target !== null ? ((target - current) / current) * 100 : 0;
  const pctToStop = stop !== null ? ((current - stop) / current) * 100 : 0;

  // Zone classification
  let zone: Zone = "hold";
  if (target !== null && current >= target) zone = "profit";
  else if (stop !== null && current <= stop) zone = "stopped";
  else if (stop !== null && current < entry && current > stop) zone = "buy";
  else if (progress >= 75) zone = "near_target";

  // Key level alerts
  if (zone === "profit")
    alerts.push({ t: "profit", m: "🎯 ¡TARGET ALCANZADO! Considerar tomar beneficios" });
  if (zone === "stopped")
    alerts.push({ t: "stop", m: "🛑 STOP LOSS ACTIVADO — considerar salir" });
  if (zone === "buy")
    alerts.push({ t: "buy", m: `💰 Bajo entrada: -${Math.abs(pctFromEntry).toFixed(1)}% — zona de compra` });
  if (zone === "near_target")
    alerts.push({ t: "near", m: `🎯 ${progress.toFixed(0)}% del recorrido al target` });
  if (pctToStop < 5 && zone !== "stopped" && zone !== "buy")
    alerts.push({ t: "warn", m: `⚠️ Solo ${pctToStop.toFixed(1)}% del stop loss` });

  // Trend (2+ data points)
  if (prices.length >= 2) {
    const prev = prices[prices.length - 2].p;
    const chg = ((current - prev) / prev) * 100;
    if (chg > 2) alerts.push({ t: "bull", m: `📈 +${chg.toFixed(1)}% desde última revisión` });
    if (chg < -2) alerts.push({ t: "bear", m: `📉 ${chg.toFixed(1)}% desde última revisión` });
  }

  // Momentum (3+ data points) — requires meaningful total move (>1.5%) to avoid noise
  if (prices.length >= 3) {
    const p = prices.slice(-3).map(x => x.p);
    const d1 = p[1] - p[0], d2 = p[2] - p[1];
    const totalPct = ((p[2] - p[0]) / p[0]) * 100;
    if (d2 > 0 && d2 > d1 && totalPct > 1.5) alerts.push({ t: "bull", m: "🚀 Momentum acelerado: subidas crecientes" });
    if (d2 < 0 && d2 < d1 && totalPct < -1.5) alerts.push({ t: "bear", m: "📉 Momentum bajista acelerado" });
  }

  // Breakout (4+ data points) — requires >2% above/below previous range to avoid noise
  if (prices.length >= 4) {
    const recent = prices.slice(-4).map(x => x.p);
    const prevHigh = Math.max(...recent.slice(0, -1));
    const prevLow = Math.min(...recent.slice(0, -1));
    if (current > prevHigh * 1.02) alerts.push({ t: "bull", m: "💥 Breakout: nuevo máximo reciente" });
    if (current < prevLow * 0.98) alerts.push({ t: "bear", m: "💥 Breakdown: nuevo mínimo reciente" });
  }

  // Score
  let score = Math.min(Math.max(progress, -50), 120) * 0.4;
  if (pctToStop < 5) score -= 30;
  if (zone === "stopped") score = -80;
  if (zone === "profit") score = 90;
  if (prices.length >= 2) {
    score +=
      ((current - prices[prices.length - 2].p) / prices[prices.length - 2].p) *
      100 *
      3;
  }
  score = Math.max(-100, Math.min(100, Math.round(score)));

  return {
    alerts,
    score,
    zone,
    progress: Math.round(progress),
    pctFromEntry,
    pctToTarget,
    pctToStop,
    current,
  };
}
