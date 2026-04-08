import { describe, it, expect } from "vitest";
import { calcStats } from "../analysis/stats";
import type { AnalysisRun } from "../types";

const makeRun = (stocks: Partial<import("../types").Stock>[]): AnalysisRun => ({
  id: 1,
  date: "2026-01-01",
  fx: 0.92,
  stocks: stocks.map((s, i) => ({
    tk: s.tk ?? `T${i}`,
    co: "Corp",
    tldr: "",
    px: 100,
    pxE: "92",
    entry: 100,
    entryE: "92",
    targetE: "115",
    potential: "Medio",
    conviction: "Media",
    gain: s.gain ?? 10,
    prob: s.prob ?? 70,
    time: "3-6 months",
    link: "",
    tgt: 115,
    stp: 90,
    ph: [],
    res: s.res ?? "pending",
    ag: s.ag ?? null,
    cd: null,
    apE: null,
  })),
});

describe("calcStats", () => {
  it("returns zeros for empty runs", () => {
    const stats = calcStats([]);
    expect(stats.tot).toBe(0);
    expect(stats.w).toBe(0);
    expect(stats.l).toBe(0);
    expect(stats.pend).toBe(0);
    expect(stats.wr).toBe("—");
    expect(stats.cal).toBeNull();
  });

  it("counts pending, wins and losses correctly", () => {
    const runs = [
      makeRun([
        { res: "w", ag: 12 },
        { res: "l", ag: -5 },
        { res: "pending" },
      ]),
    ];
    const stats = calcStats(runs);
    expect(stats.tot).toBe(3);
    expect(stats.w).toBe(1);
    expect(stats.l).toBe(1);
    expect(stats.pend).toBe(1);
  });

  it("calculates win rate correctly", () => {
    const runs = [makeRun([{ res: "w", ag: 10 }, { res: "w", ag: 8 }, { res: "l", ag: -3 }])];
    const stats = calcStats(runs);
    expect(stats.wr).toBe("67"); // 2/3 = 66.67% → "67"
  });

  it("returns — win rate when no completed stocks", () => {
    const runs = [makeRun([{ res: "pending" }, { res: "pending" }])];
    expect(calcStats(runs).wr).toBe("—");
  });

  it("calculates calibration when >= 2 closed results", () => {
    const runs = [makeRun([{ res: "w", ag: 10, gain: 15, prob: 80 }, { res: "l", ag: -5, gain: 12, prob: 70 }])];
    const stats = calcStats(runs);
    expect(stats.cal).not.toBeNull();
    expect(stats.cal!.n).toBe(2);
  });

  it("skips calibration with fewer than 2 closed results", () => {
    const runs = [makeRun([{ res: "w", ag: 10 }, { res: "pending" }])];
    expect(calcStats(runs).cal).toBeNull();
  });

  it("tracks best and worst stock", () => {
    const runs = [
      makeRun([
        { tk: "BEST", res: "w", ag: 30 },
        { tk: "WORST", res: "l", ag: -20 },
      ]),
    ];
    const stats = calcStats(runs);
    expect(stats.best?.t).toBe("BEST");
    expect(stats.worst?.t).toBe("WORST");
  });

  it("aggregates stocks across multiple runs", () => {
    const runs = [
      makeRun([{ res: "w", ag: 10 }]),
      makeRun([{ res: "w", ag: 8 }, { res: "l", ag: -3 }]),
    ];
    const stats = calcStats(runs);
    expect(stats.tot).toBe(3);
    expect(stats.w).toBe(2);
    expect(stats.l).toBe(1);
  });
});
