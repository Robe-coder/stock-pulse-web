// ─────────────────────────────────────────
// @stock-pulse/core — public API
// ─────────────────────────────────────────

// Types
export * from "./types";

// Prompts (used by backend only, but exported for type safety)
export * from "./prompts/analysisSystem";
export * from "./prompts/deepAnalysis";

// Analysis
export { extractJson } from "./analysis/jsonParser";
export { calcStats } from "./analysis/stats";
export {
  analyzeStock,
  ZONE_LABEL,
  ZONE_COLOR,
  ALERT_BG,
  ALERT_COLOR,
} from "./analysis/technicalEngine";
export {
  validateAndSanitize,
  validatePick,
  normalizeConviction,
  normalizePotential,
  normalizeCap,
  recalculateRR,
} from "./analysis/responseValidator";
export type { ValidationReport } from "./analysis/responseValidator";

// Utils
export { toEur, sanitizeFxRate, probColor } from "./utils/currency";
export { getMadridTime, getNewYorkTime, getMarketStatus } from "./utils/marketHours";
