import type { MarketStatus } from "../types";

/** Current time in Madrid (Europe/Madrid) as HH:MM */
export function getMadridTime(): string {
  return new Date().toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Current time in New York (America/New_York) as h:MM AM/PM */
export function getNewYorkTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** NYSE/NASDAQ market status based on New York time.
 *  Uses Intl.DateTimeFormat.formatToParts — reliable across all JS engines.
 */
export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = dayMap[parts.weekday] ?? 1;
  const hour = parseInt(parts.hour, 10) % 24; // "24" → 0 at midnight
  const minutes = hour * 60 + parseInt(parts.minute, 10);

  if (day === 0 || day === 6) return { t: "Cerrado (fin de semana)", o: false };
  if (minutes < 240)  return { t: "Cerrado", o: false };    // 00:00–03:59 ET
  if (minutes < 570)  return { t: "Pre-market", o: false }; // 04:00–09:29 ET
  if (minutes < 960)  return { t: "Abierto", o: true };     // 09:30–15:59 ET
  if (minutes < 1200) return { t: "After-hours", o: false };// 16:00–19:59 ET
  return { t: "Cerrado", o: false };                         // 20:00–23:59 ET
}
