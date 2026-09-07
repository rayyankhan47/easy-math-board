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

/** True for "y = …", "f(x) = …", "g(t) = …" — a definition, not a constraint. */
export function isDefinition(expr: string): boolean {
  const i = expr.indexOf("=");
  if (i < 0 || expr[i + 1] === "=") return false;
  const left = expr.slice(0, i).trim();
  return /^[A-Za-z]\w*\s*(\(\s*[A-Za-z]\w*\s*\))?$/.test(left);
}

/** The part worth operating on: the body of a definition, else the whole thing. */
export function rhs(expr: string): string {
  if (!isDefinition(expr)) return expr.trim();
  return expr.slice(expr.indexOf("=") + 1).trim();
}

/** Conventional order — the variable a mathematician would assume you meant. */
const PREFERENCE = [
  "x", "t", "y", "z", "u", "v", "w", "s", "r", "n", "k", "m", "p", "q",
  "theta", "phi", "alpha", "beta",
];

/**
 * Which variable to differentiate or integrate with respect to.
 * "f(t) = t^2" is about t, not f — the name being defined is not a variable,
 * and neither is anything used as a function.
 */
export function pickVar(raw: string, vars: string[]): string {
  const def = raw.match(/^\s*([A-Za-z]\w*)\s*\(\s*([A-Za-z]\w*)\s*\)\s*=/);
  if (def) return def[2];

  // anything written as name(...) is a function here, not an unknown
  const called = new Set([...raw.matchAll(/([A-Za-z]\w*)\s*\(/g)].map((m) => m[1]));
  // the name on the left of a definition is being defined, not solved for
  if (isDefinition(raw)) called.add(raw.slice(0, raw.indexOf("=")).trim());

  const pool = vars.filter((v) => !called.has(v));
  const use = pool.length ? pool : vars;
  for (const p of PREFERENCE) if (use.includes(p)) return p;
  return use[0] ?? "x";
}


/** Single letters other than x (and y, for surfaces) are tunable parameters. */
export function paramsIn(exprs: string[], reserved = "xy"): string[] {
  const found = new Set<string>();
  for (const e of exprs)
    for (const m of e.match(/(?<![A-Za-z0-9_])[a-z](?![A-Za-z0-9_(])/g) ?? [])
      if (!reserved.includes(m)) found.add(m);
  return [...found].sort();
}
