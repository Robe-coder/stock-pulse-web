import type { AnalysisRun, Stats, CalibrationStats } from "../types";

/**
 * Calculate aggregated stats + AI calibration from historical runs.
 * Pure function — no side effects.
 */
export function calcStats(runs: AnalysisRun[]): Stats {
  let tot = 0, w = 0, l = 0, pend = 0, sP = 0, sA = 0, chk = 0;
  let best: Stats["best"] = null;
  let worst: Stats["worst"] = null;
  const predVsActual: Array<{ pred: number; actual: number; prob: number }> = [];

  runs.forEach(r =>
    (r.stocks || []).forEach(s => {
      tot++;
      sP += s.gain || 0;
      if (s.res === "w") {
        w++;
        sA += s.ag || 0;
        chk++;
        predVsActual.push({ pred: s.gain, actual: s.ag ?? 0, prob: s.prob });
        if (!best || (s.ag ?? 0) > best.g) best = { t: s.tk, g: s.ag ?? 0 };
      } else if (s.res === "l") {
        l++;
        sA += s.ag || 0;
        chk++;
        predVsActual.push({ pred: s.gain, actual: s.ag ?? 0, prob: s.prob });
        if (!worst || (s.ag ?? 0) < worst.g) worst = { t: s.tk, g: s.ag ?? 0 };
      } else {
        pend++;
      }
    })
  );

  let cal: CalibrationStats | null = null;
  if (predVsActual.length >= 2) {
    const avgPred =
      predVsActual.reduce((a, x) => a + (x.pred || 0), 0) / predVsActual.length;
    const avgActual =
      predVsActual.reduce((a, x) => a + (x.actual || 0), 0) / predVsActual.length;
    const bias = avgPred - avgActual;
    const avgProb =
      predVsActual.reduce((a, x) => a + (x.prob ?? 50), 0) / predVsActual.length;
    const realWinRate =
      predVsActual.length > 0
        ? (predVsActual.filter(x => x.actual > 0).length / predVsActual.length) * 100
        : 0;
    const probBias = avgProb - realWinRate;

    cal = {
      n: predVsActual.length,
      bias: bias.toFixed(1),
      avgPred: avgPred.toFixed(1),
      avgActual: avgActual.toFixed(1),
      avgProb: avgProb.toFixed(0),
      realWinRate: realWinRate.toFixed(0),
      probBias: probBias.toFixed(0),
      gainAdj: bias > 0 ? `-${bias.toFixed(1)}%` : `+${Math.abs(bias).toFixed(1)}%`,
      probAdj:
        probBias > 0
          ? `-${probBias.toFixed(0)}%`
          : `+${Math.abs(probBias).toFixed(0)}%`,
    };
  }

  return {
    tot,
    w,
    l,
    pend,
    aP: tot ? (sP / tot).toFixed(1) : "0",
    aA: chk ? (sA / chk).toFixed(1) : "0",
    wr: w + l ? ((w / (w + l)) * 100).toFixed(0) : "—",
    best,
    worst,
    cal,
  };
}
