import { evaluate } from "mathjs";

/** Cells are strings so symbolic entries work. Numeric view, or null. */
export function numeric(cells: string[][]): number[][] | null {
  const out: number[][] = [];
  for (const row of cells) {
    const r: number[] = [];
    for (const c of row) {
      try {
        const v = evaluate(c.trim() || "0");
        if (typeof v !== "number" || !Number.isFinite(v)) return null;
        r.push(v);
      } catch {
        return null;
      }
    }
    out.push(r);
  }
  return out;
}

export function rank(m: number[][]): number {
  const a = m.map((r) => [...r]);
  const rows = a.length;
  const cols = a[0]?.length ?? 0;
  let rk = 0;
  for (let c = 0; c < cols && rk < rows; c++) {
    let p = rk;
    for (let r = rk + 1; r < rows; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-10) continue;
    [a[rk], a[p]] = [a[p], a[rk]];
    for (let r = 0; r < rows; r++) {
      if (r === rk) continue;
      const f = a[r][c] / a[rk][c];
      for (let k = c; k < cols; k++) a[r][k] -= f * a[rk][k];
    }
    rk++;
  }
  return rk;
}

export function det(m: number[][]): number | null {
  const n = m.length;
  if (!n || m.some((r) => r.length !== n)) return null;
  const a = m.map((r) => [...r]);
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return 0;
    if (p !== c) {
      [a[c], a[p]] = [a[p], a[c]];
      d = -d;
    }
    d *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return d;
}

export const trace = (m: number[][]): number | null =>
  m.length && m.every((r) => r.length === m.length)
    ? m.reduce((s, r, i) => s + r[i], 0)
    : null;

/** Round away float noise from elimination. */
export const tidy = (x: number) =>
  Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : Number(x.toFixed(4));
