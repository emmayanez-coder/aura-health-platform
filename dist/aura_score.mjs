// AURA v0.1: unvalidated prototype. Inputs must be validated by acquisition adapters.
const weights = {hr: 0.30, hrv: 0.30, sleep: 0.25, activity: 0.15};
const clamp = x => Math.max(0, Math.min(100, x));
const positive = x => Number.isFinite(x) && x > 0;
const nonnegative = x => Number.isFinite(x) && x >= 0;

export function scoreReadiness(input = {}) {
  const {metrics = {}, baseline = {}, eligible = {}, reasons = {}} = input;
  const components = {}, excluded = {}, deviations = {};
  const baselineReady = Number.isInteger(baseline.validDays) && baseline.validDays >= 7;
  for (const name of Object.keys(weights)) {
    if (eligible[name] !== true) {
      excluded[name] = reasons[name] || 'Not confirmed comparable, valid and fresh';
      continue;
    }
    if ((name === 'hr' || name === 'hrv') && !baselineReady) {
      excluded[name] = 'Building personal baseline'; continue;
    }
    let value = null;
    if (name === 'hr' && positive(metrics.hrBpm) && positive(baseline.hrMedian) && nonnegative(baseline.hrMad)) {
      const z = (metrics.hrBpm - baseline.hrMedian) / Math.max(1.4826 * baseline.hrMad, 3);
      deviations.hrZ = z;
      value = clamp(100 - 20 * Math.max(0, z - 1));
    }
    if (name === 'hrv' && positive(metrics.rmssdMs) && Number.isFinite(baseline.logRmssdMedian) && nonnegative(baseline.logRmssdMad)) {
      const z = (Math.log(metrics.rmssdMs) - baseline.logRmssdMedian) / Math.max(1.4826 * baseline.logRmssdMad, 0.10);
      deviations.hrvZ = z;
      value = clamp(100 - 20 * Math.max(0, -z - 1));
    }
    if (name === 'sleep' && nonnegative(metrics.sleepHours) && positive(metrics.sleepTargetHours))
      value = clamp(100 * metrics.sleepHours / metrics.sleepTargetHours);
    if (name === 'activity' && nonnegative(metrics.completedUnits) && positive(metrics.plannedUnits))
      value = clamp(100 * metrics.completedUnits / metrics.plannedUnits);
    if (value === null || !Number.isFinite(value)) excluded[name] = 'Missing or invalid input';
    else components[name] = value;
  }
  const domains = Object.keys(components);
  const coverage = domains.reduce((s, n) => s + weights[n], 0);
  const enough = baselineReady && domains.length >= 3 && coverage >= 0.60 && domains.includes('hr') && domains.includes('sleep');
  const rawScore = enough ? domains.reduce((s, n) => s + weights[n] * components[n], 0) / coverage : null;
  const score = rawScore === null ? null : Math.round(rawScore);
  return {
    version: 'AURA-prototype-0.1', score, rawScore,
    status: !baselineReady ? 'BUILDING_BASELINE' : !enough ? 'INSUFFICIENT_DATA' : domains.length === 4 ? 'FULL' : 'PARTIAL',
    band: score === null ? null : score >= 80 ? 'Closer to baseline/targets' : score >= 60 ? 'Some deviation' : 'Larger deviation',
    coveragePercent: Math.round(coverage * 100), domains, components, excluded, deviations,
    independentAlert: input.independentAlert === true,
    // This flag is supplied by a separate reviewed alert path, never inferred from score.
    demo: input.demo === true
  };
}

export const demoInput = {
  demo: true,
  baseline: {validDays: 14, hrMedian: 66, hrMad: 0, logRmssdMedian: Math.log(40), logRmssdMad: 0},
  eligible: {hr: true, hrv: true, sleep: true, activity: true},
  metrics: {hrBpm: 72, rmssdMs: 32, sleepHours: 6.5, sleepTargetHours: 8, completedUnits: 4, plannedUnits: 5}
};
