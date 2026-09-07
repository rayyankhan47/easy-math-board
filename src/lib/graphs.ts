import type { GraphEdge, GraphNode } from "./types";

export const GRAPH_R = 92; // radius of the default circular layout

/** Place n nodes evenly on a circle. Looks right for K_n, cycles, wheels. */
export function circleNodes(n: number, r = GRAPH_R): GraphNode[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id: `v${i}`,
      x: r + r * Math.cos(t),
      y: r + r * Math.sin(t),
      label: String(i + 1),
    };
  });
}

export const pairsToEdges = (p: [number, number][]): GraphEdge[] =>
  p.map(([a, b]) => ({ a: `v${a}`, b: `v${b}` }));

export const complete = (n: number): [number, number][] => {
  const e: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) e.push([i, j]);
  return e;
};

export const cycle = (n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number]);

export const path = (n: number): [number, number][] =>
  Array.from({ length: Math.max(0, n - 1) }, (_, i) => [i, i + 1] as [number, number]);

export const star = (n: number): [number, number][] =>
  Array.from({ length: Math.max(0, n - 1) }, (_, i) => [0, i + 1] as [number, number]);

export const wheel = (n: number): [number, number][] => [
  ...star(n),
  ...Array.from({ length: n - 1 }, (_, i) => [i + 1, ((i + 1) % (n - 1)) + 1] as [number, number]),
];

export const completeBipartite = (m: number, n: number): [number, number][] => {
  const e: [number, number][] = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) e.push([i, m + j]);
  return e;
};

export const tree = (n: number): [number, number][] =>
  Array.from({ length: Math.max(0, n - 1) }, (_, i) => [Math.floor((i + 1) / 2), i + 1] as [number, number]);

export const grid = (r: number, c: number): [number, number][] => {
  const e: [number, number][] = [];
  const id = (i: number, j: number) => i * c + j;
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      if (j + 1 < c) e.push([id(i, j), id(i, j + 1)]);
      if (i + 1 < r) e.push([id(i, j), id(i + 1, j)]);
    }
  return e;
};

export const hypercube = (d: number): [number, number][] => {
  const e: [number, number][] = [];
  for (let v = 0; v < 1 << d; v++)
    for (let b = 0; b < d; b++) {
      const w = v ^ (1 << b);
      if (v < w) e.push([v, w]);
    }
  return e;
};

export const petersen = (): [number, number][] => [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
  [5, 7], [7, 9], [9, 6], [6, 8], [8, 5],
  [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
];

export function randomEdges(n: number, p = 0.35): [number, number][] {
  const e: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (Math.random() < p) e.push([i, j]);
  return e;
}

// ---- live properties, computed on every render ----

export function degrees(nodes: GraphNode[], edges: GraphEdge[]): Record<string, number> {
  const d: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (e.a in d) d[e.a]++;
    if (e.b in d) d[e.b]++;
  }
  return d;
}

export function components(nodes: GraphNode[], edges: GraphEdge[]): number {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    adj.get(e.a)?.push(e.b);
    adj.get(e.b)?.push(e.a);
  }
  const seen = new Set<string>();
  let c = 0;
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    c++;
    const stack = [n.id];
    while (stack.length) {
      const v = stack.pop()!;
      if (seen.has(v)) continue;
      seen.add(v);
      for (const w of adj.get(v) ?? []) if (!seen.has(w)) stack.push(w);
    }
  }
  return c;
}

/** 2-colourability. Returns the parts when bipartite, else null. */
export function bipartition(nodes: GraphNode[], edges: GraphEdge[]): [string[], string[]] | null {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    adj.get(e.a)?.push(e.b);
    adj.get(e.b)?.push(e.a);
  }
  const colour = new Map<string, 0 | 1>();
  for (const n of nodes) {
    if (colour.has(n.id)) continue;
    colour.set(n.id, 0);
    const stack = [n.id];
    while (stack.length) {
      const v = stack.pop()!;
      const cv = colour.get(v)!;
      for (const w of adj.get(v) ?? []) {
        if (!colour.has(w)) {
          colour.set(w, cv === 0 ? 1 : 0);
          stack.push(w);
        } else if (colour.get(w) === cv) return null;
      }
    }
  }
  const a: string[] = [];
  const b: string[] = [];
  for (const [id, c] of colour) (c === 0 ? a : b).push(id);
  return [a, b];
}

/** Exact chromatic number by trying k = 1, 2, ... with backtracking. Fine to ~n=14. */
export function chromatic(nodes: GraphNode[], edges: GraphEdge[]): number | null {
  const n = nodes.length;
  if (n === 0) return 0;
  if (n > 14) return null; // too slow to be fun; the Inspector shows a dash
  const idx = new Map(nodes.map((v, i) => [v.id, i]));
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const a = idx.get(e.a);
    const b = idx.get(e.b);
    if (a === undefined || b === undefined || a === b) continue;
    adj[a].push(b);
    adj[b].push(a);
  }
  const colour = new Array<number>(n).fill(-1);
  const fits = (v: number, c: number) => adj[v].every((w) => colour[w] !== c);
  const tryK = (k: number, v: number): boolean => {
    if (v === n) return true;
    for (let c = 0; c < k; c++) {
      if (!fits(v, c)) continue;
      colour[v] = c;
      if (tryK(k, v + 1)) return true;
      colour[v] = -1;
    }
    return false;
  };
  for (let k = 1; k <= n; k++) {
    colour.fill(-1);
    if (tryK(k, 0)) return k;
  }
  return n;
}


/** Rectangular layout, for grid graphs. */
export function gridNodes(r: number, c: number, gap = 46): GraphNode[] {
  const out: GraphNode[] = [];
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      out.push({ id: `v${i * c + j}`, x: j * gap, y: i * gap, label: String(i * c + j + 1) });
  return out;
}

/** Layered layout for rooted trees (child i has parent floor((i-1)/2)). */
export function treeNodes(n: number, gap = 40): GraphNode[] {
  const depth = (i: number) => Math.floor(Math.log2(i + 1));
  const maxD = depth(n - 1);
  const width = Math.pow(2, maxD);
  const perLevel: Record<number, number> = {};
  return Array.from({ length: n }, (_, i) => {
    const d = depth(i);
    const k = (perLevel[d] = (perLevel[d] ?? 0) + 1) - 1;
    const count = Math.min(Math.pow(2, d), n - (Math.pow(2, d) - 1));
    return {
      id: `v${i}`,
      x: ((k + 0.5) / count) * width * gap * 0.5,
      y: d * gap * 1.1,
      label: String(i + 1),
    };
  });
}

/** Two rows, for bipartite graphs. */
export function bipartiteNodes(m: number, n: number, gap = 44): GraphNode[] {
  const out: GraphNode[] = [];
  for (let i = 0; i < m; i++) out.push({ id: `v${i}`, x: i * gap, y: 0, label: String(i + 1) });
  for (let j = 0; j < n; j++)
    out.push({ id: `v${m + j}`, x: j * gap, y: gap * 2.4, label: String(m + j + 1) });
  return out;
}
