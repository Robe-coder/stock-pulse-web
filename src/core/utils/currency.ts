/**
 * Currency utilities — pure, no I/O.
 */

/**
 * Convert a USD price to EUR string using the given FX rate (USD→EUR).
 * Returns "—" if either value is missing.
 */
export function toEur(usd: number | string | null | undefined, fxRate: number | null | undefined): string {
  if (usd == null || fxRate == null) return "—";
  const usdNum = typeof usd === "string" ? parseFloat(usd) : usd;
  if (isNaN(usdNum) || isNaN(fxRate)) return "—";
  return (usdNum * fxRate).toFixed(2);
}

/**
 * Apply sanity check to an FX rate.
 * USD→EUR should be < 1 (currently ~0.92). If > 1.5, it's clearly inverted.
 * If between 1 and 1.5, it might be EUR→USD and needs inversion.
 */
export function sanitizeFxRate(fx: number): number {
  if (fx > 1.5) return 1 / fx;
  if (fx > 1) return parseFloat((1 / fx).toFixed(4));
  return fx;
}

/**
 * Color for probability display.
 */
export function probColor(p: number): string {
  if (p >= 70) return "#00ff87";
  if (p >= 50) return "#ffb800";
  return "#ff4757";
}
