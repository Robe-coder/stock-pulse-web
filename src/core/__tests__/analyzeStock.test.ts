import { describe, it, expect } from "vitest";
import { analyzeStock } from "../analysis/technicalEngine";

const base = { entry: 100, tgt: 120, stp: 90, px: 100, ph: [] as { d: string; p: number }[] };

describe("analyzeStock", () => {
  it("returns unknown zone when entry is missing", () => {
    const result = analyzeStock({ ...base, entry: 0, px: 0, ph: [] });
    expect(result.zone).toBe("unknown");
    expect(result.alerts).toHaveLength(0);
  });

  it("returns hold zone at entry price (no price history)", () => {
    const result = analyzeStock({ ...base, ph: [] });
    expect(result.zone).toBe("hold");
    expect(result.progress).toBe(0);
  });

  it("returns buy zone when price is below entry but above stop", () => {
    const result = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 95 }] });
    expect(result.zone).toBe("buy");
    expect(result.alerts.some((a) => a.t === "buy")).toBe(true);
  });

  it("returns stopped zone when price hits or drops below stop", () => {
    const result = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 89 }] });
    expect(result.zone).toBe("stopped");
    expect(result.alerts.some((a) => a.t === "stop")).toBe(true);
  });

  it("returns profit zone when price reaches target", () => {
    const result = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 120 }] });
    expect(result.zone).toBe("profit");
    expect(result.alerts.some((a) => a.t === "profit")).toBe(true);
  });

  it("returns near_target zone when progress >= 75%", () => {
    // 75% of way from 100 to 120 = 115
    const result = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 115 }] });
    expect(result.zone).toBe("near_target");
  });

  it("calculates progress correctly at midpoint", () => {
    // 50% of way from 100 to 120 = 110
    const result = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 110 }] });
    expect(result.progress).toBe(50);
  });

  it("detects bullish trend when price rises >2% from previous", () => {
    const result = analyzeStock({
      ...base,
      ph: [
        { d: "2026-01-01", p: 100 },
        { d: "2026-01-02", p: 103 },
      ],
    });
    expect(result.alerts.some((a) => a.t === "bull")).toBe(true);
  });

  it("detects bearish trend when price drops >2% from previous", () => {
    const result = analyzeStock({
      ...base,
      ph: [
        { d: "2026-01-01", p: 100 },
        { d: "2026-01-02", p: 97 },
      ],
    });
    expect(result.alerts.some((a) => a.t === "bear")).toBe(true);
  });

  it("warns when within 5% of stop loss (hold zone)", () => {
    // entry=100, stop=96, tgt=115 → price=101 is above entry (hold zone)
    // pctToStop = (101-96)/101 = 4.95% < 5% → warn triggered
    const result = analyzeStock({
      entry: 100, tgt: 115, stp: 96, px: 101,
      ph: [{ d: "2026-01-01", p: 101 }],
    });
    expect(result.zone).toBe("hold");
    expect(result.alerts.some((a) => a.t === "warn")).toBe(true);
  });

  it("uses default target (+15%) and stop (-10%) when not provided", () => {
    const result = analyzeStock({
      entry: 100,
      tgt: null as unknown as number,
      stp: null as unknown as number,
      px: 115,
      ph: [{ d: "2026-01-01", p: 115 }],
    });
    // target = 115, so progress = 100%
    expect(result.zone).toBe("profit");
  });

  it("score is clamped between -100 and 100", () => {
    const r1 = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 89 }] });
    const r2 = analyzeStock({ ...base, ph: [{ d: "2026-01-01", p: 130 }] });
    expect(r1.score).toBeGreaterThanOrEqual(-100);
    expect(r2.score).toBeLessThanOrEqual(100);
  });
});
