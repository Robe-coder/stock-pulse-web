import type { AnalysisResult, Pick, ConvictionLevel, PotentialLevel } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Validation report
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationReport {
  violations: string[]; // what was wrong
  fixes: string[];      // what was auto-corrected
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Maps a percentage number (0-100) to a conviction level */
function pctToConviction(pct: number): ConvictionLevel {
  if (pct >= 67) return "Alta";
  if (pct >= 34) return "Media";
  return "Baja";
}

/** Maps a percentage number (0-100) to a potential level */
function pctToPotential(pct: number): PotentialLevel {
  if (pct >= 67) return "Alto";
  if (pct >= 34) return "Medio";
  return "Bajo";
}

/**
 * Normalize conviction value.
 * Accepts: "Alta"|"Media"|"Baja" (correct), "85%"|"85" (pct), "1"|"2"|"3" (numeric rank).
 * Returns canonical value + whether it was already canonical.
 */
export function normalizeConviction(v: string): { value: ConvictionLevel; wasCanonical: boolean } {
  const s = String(v).trim();

  // Already canonical (case-insensitive)
  const lower = s.toLowerCase();
  if (lower === "alta") return { value: "Alta", wasCanonical: s === "Alta" };
  if (lower === "media") return { value: "Media", wasCanonical: s === "Media" };
  if (lower === "baja") return { value: "Baja", wasCanonical: s === "Baja" };

  // Numeric rank: 1 = Alta, 2 = Media, 3 = Baja
  if (s === "1") return { value: "Alta", wasCanonical: false };
  if (s === "2") return { value: "Media", wasCanonical: false };
  if (s === "3") return { value: "Baja", wasCanonical: false };

  // Percentage string: "85%" or "85"
  const numStr = s.replace("%", "").trim();
  const pct = parseFloat(numStr);
  if (!isNaN(pct) && pct >= 0 && pct <= 100) {
    return { value: pctToConviction(pct), wasCanonical: false };
  }

  // Unknown — default to Media and flag
  return { value: "Media", wasCanonical: false };
}

/**
 * Normalize potential value.
 * Accepts: "Alto"|"Medio"|"Bajo" (correct), "85%"|"85" (pct), "1"|"2"|"3" (numeric rank).
 */
export function normalizePotential(v: string): { value: PotentialLevel; wasCanonical: boolean } {
  const s = String(v).trim();

  const lower = s.toLowerCase();
  if (lower === "alto") return { value: "Alto", wasCanonical: s === "Alto" };
  if (lower === "medio") return { value: "Medio", wasCanonical: s === "Medio" };
  if (lower === "bajo") return { value: "Bajo", wasCanonical: s === "Bajo" };

  if (s === "1") return { value: "Alto", wasCanonical: false };
  if (s === "2") return { value: "Medio", wasCanonical: false };
  if (s === "3") return { value: "Bajo", wasCanonical: false };

  const numStr = s.replace("%", "").trim();
  const pct = parseFloat(numStr);
  if (!isNaN(pct) && pct >= 0 && pct <= 100) {
    return { value: pctToPotential(pct), wasCanonical: false };
  }

  return { value: "Medio", wasCanonical: false };
}

/**
 * Normalize cap string.
 * Accepts "Large-cap", "large-cap", "large cap", "largecap", etc.
 */
export function normalizeCap(v: string): { value: string; wasCanonical: boolean } {
  const s = String(v).trim();
  const lower = s.toLowerCase().replace(/[\s_]+/g, "-");

  if (lower.startsWith("mega"))  return { value: "Mega-cap",  wasCanonical: s === "Mega-cap" };
  if (lower.startsWith("large")) return { value: "Large-cap", wasCanonical: s === "Large-cap" };
  if (lower.startsWith("mid"))   return { value: "Mid-cap",   wasCanonical: s === "Mid-cap" };
  if (lower.startsWith("small")) return { value: "Small-cap", wasCanonical: s === "Small-cap" };

  // Unknown — keep as-is, flag
  return { value: s, wasCanonical: false };
}

/**
 * Recalculate R:R ratio from entry/target/stop.
 * Returns "1:X" string, or null if levels are invalid.
 */
export function recalculateRR(entry: number, target: number, stop: number): string | null {
  if (entry <= 0 || target <= entry || stop >= entry) return null;
  const rr = (target - entry) / (entry - stop);
  return `1:${rr.toFixed(1)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-pick validation
// ─────────────────────────────────────────────────────────────────────────────

export function validatePick(pick: Pick): { pick: Pick; violations: string[]; fixes: string[] } {
  const violations: string[] = [];
  const fixes: string[] = [];
  let p = { ...pick };
  const tk = pick.tk || "?";

  // ── conviction ──────────────────────────────────────────────────────────────
  if (p.conviction != null) {
    const { value, wasCanonical } = normalizeConviction(String(p.conviction));
    if (!wasCanonical) {
      violations.push(`[${tk}] conviction "${p.conviction}" is not canonical`);
      fixes.push(`[${tk}] conviction "${p.conviction}" → "${value}"`);
      p = { ...p, conviction: value };
    }
  } else {
    violations.push(`[${tk}] conviction is missing`);
  }

  // ── potential ───────────────────────────────────────────────────────────────
  if (p.potential != null) {
    const { value, wasCanonical } = normalizePotential(String(p.potential));
    if (!wasCanonical) {
      violations.push(`[${tk}] potential "${p.potential}" is not canonical`);
      fixes.push(`[${tk}] potential "${p.potential}" → "${value}"`);
      p = { ...p, potential: value };
    }
  } else {
    violations.push(`[${tk}] potential is missing`);
  }

  // ── cap ─────────────────────────────────────────────────────────────────────
  if (p.cap != null) {
    const { value, wasCanonical } = normalizeCap(p.cap);
    if (!wasCanonical) {
      if (value !== p.cap) {
        fixes.push(`[${tk}] cap "${p.cap}" → "${value}"`);
        p = { ...p, cap: value };
      } else {
        violations.push(`[${tk}] cap "${p.cap}" is not canonical`);
      }
    }
  } else {
    violations.push(`[${tk}] cap is missing`);
  }

  // ── price levels: entry < target, stop < entry ───────────────────────────
  const hasLevels = typeof p.entry === "number" && typeof p.target === "number" && typeof p.stop === "number";

  if (hasLevels) {
    if (p.entry >= p.target) {
      violations.push(`[${tk}] entry (${p.entry}) >= target (${p.target}) — levels may be wrong`);
    }
    if (p.stop >= p.entry) {
      violations.push(`[${tk}] stop (${p.stop}) >= entry (${p.entry}) — levels may be wrong`);
    }

    // ── rr: always recalculate if levels are valid ───────────────────────────
    if (p.entry < p.target && p.stop < p.entry) {
      const computed = recalculateRR(p.entry, p.target, p.stop);
      if (computed && computed !== p.rr) {
        fixes.push(`[${tk}] rr "${p.rr}" → "${computed}" (recalculated from levels)`);
        p = { ...p, rr: computed };
      }
    }
  }

  // ── risks: exactly 3 ─────────────────────────────────────────────────────
  if (!Array.isArray(p.risks)) {
    violations.push(`[${tk}] risks is not an array`);
  } else if (p.risks.length > 3) {
    fixes.push(`[${tk}] risks trimmed from ${p.risks.length} to 3`);
    p = { ...p, risks: p.risks.slice(0, 3) };
  } else if (p.risks.length < 3) {
    violations.push(`[${tk}] risks has ${p.risks.length} items (expected 3)`);
  }

  // ── scenarios ────────────────────────────────────────────────────────────
  if (p.scenarios) {
    if (!p.scenarios.optimistic) violations.push(`[${tk}] scenarios.optimistic is missing`);
    if (!p.scenarios.base)       violations.push(`[${tk}] scenarios.base is missing`);
    if (!p.scenarios.adverse)    violations.push(`[${tk}] scenarios.adverse is missing`);
  } else {
    violations.push(`[${tk}] scenarios block is missing`);
  }

  // ── percentage fields: p1m, p3m, p6m must contain "%" ───────────────────
  for (const field of ["p1m", "p3m", "p6m"] as const) {
    const val = p[field];
    if (typeof val === "number") {
      // AI returned a raw number — convert to string with %
      fixes.push(`[${tk}] ${field} ${val} (number) → "${val}%" (converted to string)`);
      p = { ...p, [field]: `${val}%` };
    } else if (typeof val === "string" && val.length > 0 && !val.includes("%")) {
      fixes.push(`[${tk}] ${field} "${val}" → "${val}%" (appended %)`);
      p = { ...p, [field]: `${val}%` };
    }
  }

  // ── cat_date format ──────────────────────────────────────────────────────
  if (p.cat_date && p.cat_date !== "N/D") {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(p.cat_date)) {
      violations.push(`[${tk}] cat_date "${p.cat_date}" is not YYYY-MM-DD or "N/D"`);
    }
  }

  // ── required string fields not empty ────────────────────────────────────
  for (const field of ["tk", "co", "tldr", "why", "verdict"] as const) {
    if (!p[field] || String(p[field]).trim() === "") {
      violations.push(`[${tk}] field "${field}" is empty`);
    }
  }

  // ── why: minimum 4 sentences ─────────────────────────────────────────────
  // Match sentence-ending punctuation followed by whitespace or end-of-string
  // to avoid false positives from abbreviations ("Dr.") and decimal numbers ("3.5").
  if (p.why && p.why.trim() !== "") {
    const sentenceCount = (p.why.match(/[.!?]+(\s|$)/g) ?? []).length;
    if (sentenceCount < 4) {
      violations.push(`[${tk}] why has ${sentenceCount} sentence(s), expected at least 4`);
    }
  }

  return { pick: p, violations, fixes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function validateAndSanitize(
  rawResult: AnalysisResult
): { result: AnalysisResult; report: ValidationReport } {
  const violations: string[] = [];
  const fixes: string[] = [];

  let result = { ...rawResult };

  // ── picks count ─────────────────────────────────────────────────────────
  const picks = result.picks ?? [];

  if (picks.length !== 6) {
    violations.push(`picks count is ${picks.length} (expected 6)`);
  }

  if (picks.length > 6) {
    fixes.push(`picks trimmed from ${picks.length} to 6`);
    result = { ...result, picks: picks.slice(0, 6) };
  }

  // ── per-pick validation ──────────────────────────────────────────────────
  const sanitizedPicks: Pick[] = [];
  for (const pick of (result.picks as Pick[])) {
    const { pick: sanitized, violations: pv, fixes: pf } = validatePick(pick);
    violations.push(...pv);
    fixes.push(...pf);
    sanitizedPicks.push(sanitized);
  }
  result = { ...result, picks: sanitizedPicks };

  return { result, report: { violations, fixes } };
}
