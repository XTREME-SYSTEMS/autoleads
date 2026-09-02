// Wilson score confidence interval for proportion metrics
// Used for small-sample evidence metrics where normal approximation is unreliable

export function wilsonCI(successes, total, z = 1.96) {
  if (total === 0 || successes === null || successes === undefined) {
    return { point: null, lower: null, upper: null };
  }
  const p = successes / total;
  const n = total;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return {
    point: Math.round(p * 1000) / 10,
    lower: Math.max(0, Math.round((center - margin) * 1000) / 10),
    upper: Math.min(100, Math.round((center + margin) * 1000) / 10),
  };
}

export function formatCI(ci) {
  if (ci.lower === null || ci.upper === null) return "";
  return `95% CI: ${ci.lower}%–${ci.upper}%`;
}

export function metricWithCI(successes, total, z = 1.96) {
  const ci = wilsonCI(successes, total, z);
  return {
    value: ci.point,
    ci: formatCI(ci),
    n: total,
  };
}