/** Tick spacing that lands on 1, 2 or 5 times a power of ten. */
export function niceStep(pixelsPerUnit: number, targetPx = 72): number {
  const raw = targetPx / pixelsPerUnit;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return step * mag;
}

/** Label a tick without float noise: 0.30000000000000004 helps nobody. */
export function tickLabel(v: number, step: number): string {
  if (Math.abs(v) < step / 1000) return "0";
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-4 && v !== 0)) return v.toExponential(1);
  return v.toFixed(Math.min(6, decimals));
}

/** Expressions arrive as "y = x^2" or "f(x) = sin x" — plot the right-hand side. */
export function rhs(expr: string): string {
  const i = expr.indexOf("=");
  if (i < 0) return expr.trim();
  const left = expr.slice(0, i).trim();
  if (/^(y|f\s*\(\s*x\s*\)|z|g\s*\(\s*x\s*\))$/i.test(left)) return expr.slice(i + 1).trim();
  return expr.trim();
}


/** Single letters other than x (and y, for surfaces) are tunable parameters. */
export function paramsIn(exprs: string[], reserved = "xy"): string[] {
  const found = new Set<string>();
  for (const e of exprs)
    for (const m of e.match(/(?<![A-Za-z0-9_])[a-z](?![A-Za-z0-9_(])/g) ?? [])
      if (!reserved.includes(m)) found.add(m);
  return [...found].sort();
}
