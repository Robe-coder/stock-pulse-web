// ─────────────────────────────────────────
// Core domain types for Stock Pulse
// ─────────────────────────────────────────

export interface UpcomingEvent {
  e: string; // event description
  d: string; // date
  i: "Alto" | "Medio" | "Bajo"; // impact
}

export interface ExpertOpinion {
  s: string; // source
  o: string; // opinion
  d: string; // date
}

export interface Trend {
  t: string;    // trend description
  cat: string;  // category
  skip: string[];
  skip_why: string;
}

export interface Scenarios {
  optimistic: string;
  base: string;
  adverse: string;
}

export type PotentialLevel = "Alto" | "Medio" | "Bajo";
export type ConvictionLevel = "Alta" | "Media" | "Baja";

export interface Pick {
  tk: string;       // ticker
  co: string;       // company name
  cap: string;      // "Small-cap" | "Mid-cap"
  tldr: string;     // one-sentence plain-language summary for beginners
  px: number;       // current price USD
  src: string;      // price source
  link: string;     // indirect connection to trend (plain language)
  cat: string;      // catalyst (plain language)
  cat_date: string; // catalyst date
  notPI: string;    // why not priced-in (plain language)
  p1m: string;
  p3m: string;
  p6m: string;
  exp: ExpertOpinion[];
  next: UpcomingEvent[];
  radar: boolean;
  radarNote: string;
  entry: number;
  target: number;
  stop: number;
  potential: PotentialLevel;  // replaces gain %
  time: string;
  conviction: ConvictionLevel; // replaces prob %
  rr: string;
  why: string;      // full story-driven explanation (plain language)
  risks: string[];  // plain language risks
  verdict: string;  // 2-sentence plain language verdict
  scenarios?: Scenarios;
  analystTarget?: number | null; // enriched post-analysis from Yahoo Finance
}

export interface AnalysisResult {
  fx: number;
  macro: string;
  trends: Trend[];
  picks: Pick[];
}

// ─────────────────────────────────────────
// Data pipeline types (analysis v2)
// ─────────────────────────────────────────

/** Macro indicators from FRED (Federal Reserve) + VIX */
export interface MacroContext {
  cpi:          { value: number; date: string } | null;  // CPI YoY %
  fedRate:      { value: number; date: string } | null;  // Fed Funds Rate %
  unemployment: { value: number; date: string } | null;  // Unemployment %
  gdpGrowth:    { value: number; date: string } | null;  // GDP QoQ %
  vix?:         { value: number; signal: string } | null; // Fear index
}

/** A single insider Form 4 transaction from SEC EDGAR */
export interface InsiderTransaction {
  date:          string;
  type:          "purchase" | "sale" | "award";
  shares:        number;
  pricePerShare: number | null;
  totalValue:    number | null; // USD
  role:          string;        // "Director", "CEO", "10% Owner", etc.
}

/** Aggregated insider activity for a ticker */
export interface InsiderActivity {
  ticker:       string;
  transactions: InsiderTransaction[];
  signal:       "bullish" | "bearish" | "neutral";
  summary:      string; // e.g. "3 compras por directivos en últimos 60 días"
}

/** Weekly sector performance from Alpha Vantage */
export interface SectorPerformance {
  sector: string;
  weeklyReturn: string; // e.g. "+2.45%"
}

/** Upcoming earnings event from FMP */
export interface EarningsEvent {
  symbol: string;
  name:   string;
  date:   string;
  epsEstimate:     number | null;
  revenueEstimate: number | null;
}

/** Real fundamentals for a ticker from Yahoo Finance quoteSummary */
export interface TickerFundamentals {
  ticker:           string;
  peRatio:          number | null;
  forwardPE:        number | null;
  epsGrowth:        number | null;  // % YoY
  debtToEquity:     number | null;
  operatingMargin:  number | null;  // %
  revenueGrowth:    number | null;  // % YoY
  analystTarget:    number | null;  // mean analyst price target
  analystRating:    string | null;  // "Strong Buy" | "Buy" | "Hold" | "Sell"
  analystCount:     number | null;
  fiftyTwoWeekChg:  number | null;  // %
  marketCap:        number | null;  // in USD
  recentNews:       string[];       // last 3 headlines
}

/** Ticker candidate identified in Call 1 */
export interface AnalysisCandidate {
  tk:     string;
  reason: string; // why it was selected (second-order logic)
  sector: string;
  trend:  string; // which macro trend it relates to
}

/** Output of Call 1 (Perplexity: macro + candidates) */
export interface Call1Result {
  fx:         number;
  trends:     Trend[];
  candidates: AnalysisCandidate[];
}

export interface PricePoint {
  d: string;  // ISO date
  p: number;  // price USD
}

/** A stock entry inside a run (persisted record) */
export interface Stock {
  tk: string;
  co: string;
  tldr?: string;    // plain-language one-liner
  px: number;
  pxE: string;
  entry: number;
  entryE: string;
  targetE: string;
  potential: PotentialLevel;  // qualitative upside label
  conviction: ConvictionLevel; // qualitative conviction label
  gain: number;    // kept for backwards compat with old records (0 on new)
  prob: number;    // kept for backwards compat with old records (0 on new)
  time: string;
  link: string;
  tgt: number | null;
  stp: number | null;
  ph: PricePoint[];
  res: "pending" | "w" | "l";
  monitored?: boolean; // true = shown in monitor; false = dismissed or not yet added; undefined = legacy (treated as true)
  ag: number | null;   // actual gain %
  cd: string | null;   // close date
  apE: string | null;  // actual price EUR
  scenarios?: Scenarios;
}

/** A single analysis run persisted locally or in Supabase */
export interface AnalysisRun {
  id: number;
  date: string;
  fx: number;
  stocks: Stock[];
  assigned_picks?: Pick[]; // full Pick data saved at analysis time
}

export type Zone = "profit" | "stopped" | "buy" | "near_target" | "hold" | "unknown";

export interface Alert {
  t: "profit" | "stop" | "buy" | "near" | "warn" | "bull" | "bear";
  m: string;
}

export interface TechnicalAnalysis {
  alerts: Alert[];
  score: number;
  zone: Zone;
  progress: number;
  pctFromEntry?: number;
  pctToTarget?: number;
  pctToStop?: number;
  current?: number;
}

export interface CalibrationStats {
  n: number;
  bias: string;
  avgPred: string;
  avgActual: string;
  avgProb: string;
  realWinRate: string;
  probBias: string;
  gainAdj: string;
  probAdj: string;
}

export interface Stats {
  tot: number;
  w: number;
  l: number;
  pend: number;
  aP: string;  // avg predicted gain
  aA: string;  // avg actual gain
  wr: string;  // win rate %
  best: { t: string; g: number } | null;
  worst: { t: string; g: number } | null;
  cal: CalibrationStats | null;
}

export type MarketStatusText =
  | "Abierto"
  | "Pre-market"
  | "After-hours"
  | "Cerrado"
  | "Cerrado (fin de semana)";

export interface MarketStatus {
  t: MarketStatusText;
  o: boolean;
}
