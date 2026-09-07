import type { Spec } from "./types";
import * as G from "./graphs";
import { latexify, looksLikeMath, wordiness } from "./parse/local";

/**
 * One registry drives both parsing and autocomplete, so what the caret offers
 * and what it understands can never drift apart.
 */
export interface Command {
  id: string;
  /** Canonical, runnable example — this is what the dropdown shows. */
  label: string;
  hint: string;
  group: string;
  match: RegExp;
  build: (m: RegExpMatchArray) => Spec;
  /** Extra search terms so typing "complete" finds K_n. */
  aliases?: string[];
}

const n = (s: string | undefined, d = 0) => (s ? parseInt(s, 10) : d);
const graph = (
  count: number,
  edges: [number, number][],
  label: string,
  extra: Partial<Spec> = {},
): Spec => ({ kind: "graph", n: count, edges, label, ...extra }) as Spec;

export const COMMANDS: Command[] = [
  // ---------------------------------------------------------------- graphs
  {
    id: "complete", label: "K5", hint: "complete graph", group: "graph",
    aliases: ["complete graph", "kn", "clique"],
    match: /^(?:k[_\s]*(\d+)|complete\s+graph\s+(?:on\s+|with\s+)?(\d+))$/i,
    build: (m) => { const v = n(m[1] ?? m[2]); return graph(v, G.complete(v), `K_${v}`); },
  },
  {
    id: "bipartite", label: "K3,3", hint: "complete bipartite", group: "graph",
    aliases: ["bipartite", "utility graph"],
    match: /^(?:k[_\s]*(\d+)\s*,\s*(\d+)|(?:complete\s+)?bipartite\s+(\d+)\s*(?:,|x|by|and)\s*(\d+))$/i,
    build: (m) => {
      const a = n(m[1] ?? m[3]), b = n(m[2] ?? m[4]);
      return graph(a + b, G.completeBipartite(a, b), `K_{${a},${b}}`, { layout: "bipartite", cols: a });
    },
  },
  {
    id: "graph", label: "graph 6 nodes", hint: "empty graph, add your own edges", group: "graph",
    aliases: ["empty graph", "vertices", "blank"],
    match: /^(?:(?:empty\s+)?graph\s+(?:with\s+|on\s+|of\s+)?(\d+)\s*(?:nodes?|vertices|vertexes|pts?|points?)?|(\d+)[\s-]*(?:node|vertex|vertice)s?\s+graph)$/i,
    build: (m) => graph(n(m[1] ?? m[2]), [], "graph"),
  },
  {
    id: "cycle", label: "cycle 7", hint: "C_n", group: "graph", aliases: ["ring", "circuit"],
    match: /^(?:cycle\s*(?:graph\s*)?(?:c[_\s]*)?(\d+)|c[_\s]*(\d+))$/i,
    build: (m) => { const v = n(m[1] ?? m[2]); return graph(v, G.cycle(v), `C_${v}`); },
  },
  {
    id: "path", label: "path 5", hint: "P_n", group: "graph", aliases: ["line graph"],
    match: /^path\s*(?:graph\s*)?(\d+)$/i,
    build: (m) => graph(n(m[1]), G.path(n(m[1])), `P_${n(m[1])}`),
  },
  {
    id: "star", label: "star 7", hint: "one hub", group: "graph",
    match: /^star\s*(?:graph\s*)?(\d+)$/i,
    build: (m) => graph(n(m[1]), G.star(n(m[1])), `Star_${n(m[1])}`),
  },
  {
    id: "wheel", label: "wheel 7", hint: "hub plus rim", group: "graph",
    match: /^wheel\s*(?:graph\s*)?(\d+)$/i,
    build: (m) => graph(n(m[1]), G.wheel(n(m[1])), `W_${n(m[1])}`),
  },
  {
    id: "tree", label: "tree 7", hint: "rooted binary tree", group: "graph",
    aliases: ["binary tree", "rooted"],
    match: /^(?:binary\s+)?tree\s*(?:graph\s*)?(\d+)$/i,
    build: (m) => graph(n(m[1]), G.tree(n(m[1])), `tree`, { layout: "tree" }),
  },
  {
    id: "grid", label: "grid 3x4", hint: "lattice graph", group: "graph", aliases: ["lattice", "mesh"],
    match: /^grid\s*(?:graph\s*)?(\d+)\s*(?:x|by|,)\s*(\d+)$/i,
    build: (m) => {
      const r = n(m[1]), c = n(m[2]);
      return graph(r * c, G.grid(r, c), `grid ${r}×${c}`, { layout: "grid", cols: c });
    },
  },
  {
    id: "hypercube", label: "hypercube 3", hint: "Q_d", group: "graph", aliases: ["cube graph", "qd"],
    match: /^(?:hypercube|q)\s*[_\s]*(\d+)$/i,
    build: (m) => { const d = n(m[1]); return graph(1 << d, G.hypercube(d), `Q_${d}`); },
  },
  {
    id: "petersen", label: "petersen", hint: "the classic counterexample", group: "graph",
    match: /^petersen(\s+graph)?$/i,
    build: () => graph(10, G.petersen(), "Petersen"),
  },
  {
    id: "random-graph", label: "random graph 8", hint: "Erdős–Rényi", group: "graph",
    aliases: ["erdos", "renyi"],
    match: /^random\s+graph\s+(?:on\s+|with\s+)?(\d+)(?:\s*(?:nodes?|vertices))?(?:\s*(?:p\s*=?\s*)?(0?\.\d+))?$/i,
    build: (m) => graph(n(m[1]), G.randomEdges(n(m[1]), m[2] ? parseFloat(m[2]) : 0.35), "random"),
  },

  // -------------------------------------------------------------- matrices
  {
    id: "matrix", label: "matrix 3x3", hint: "editable grid", group: "matrix",
    aliases: ["grid", "table", "array"],
    match: /^(?:matrix\s+(\d+)\s*(?:x|by|\*|,)\s*(\d+)|(\d+)\s*(?:x|by|\*)\s*(\d+)\s+matrix|matrix\s+(\d+))$/i,
    build: (m) => {
      const r = n(m[1] ?? m[3] ?? m[5]);
      const c = n(m[2] ?? m[4] ?? m[5]);
      return { kind: "matrix", rows: r, cols: c };
    },
  },
  {
    id: "identity", label: "identity 4", hint: "I_n", group: "matrix", aliases: ["eye", "unit matrix"],
    match: /^(?:identity|eye)\s*(?:matrix\s*)?(\d+)$/i,
    build: (m) => {
      const v = n(m[1]);
      return {
        kind: "matrix", rows: v, cols: v, label: `I_${v}`,
        cells: Array.from({ length: v }, (_, i) =>
          Array.from({ length: v }, (_, j) => (i === j ? "1" : "0"))),
      };
    },
  },
  {
    id: "zeros", label: "zeros 3x3", hint: "filled with 0 or 1", group: "matrix", aliases: ["ones"],
    match: /^(zeros?|ones?)\s*(?:matrix\s*)?(\d+)\s*(?:x|by|\*|,)\s*(\d+)$/i,
    build: (m) => {
      const v = m[1].toLowerCase().startsWith("zero") ? "0" : "1";
      const r = n(m[2]), c = n(m[3]);
      return { kind: "matrix", rows: r, cols: c, cells: Array.from({ length: r }, () => Array(c).fill(v)) };
    },
  },
  {
    id: "random-matrix", label: "random matrix 3x3", hint: "small integers", group: "matrix",
    match: /^random\s+matrix\s+(\d+)\s*(?:x|by|\*|,)\s*(\d+)$/i,
    build: (m) => {
      const r = n(m[1]), c = n(m[2]);
      return {
        kind: "matrix", rows: r, cols: c,
        cells: Array.from({ length: r }, () =>
          Array.from({ length: c }, () => String(Math.floor(Math.random() * 19) - 9))),
      };
    },
  },
  {
    id: "cayley", label: "cayley 5", hint: "addition table for Z_n", group: "matrix",
    aliases: ["group table", "operation table", "addition table"],
    match: /^cayley\s*(?:table\s*)?(?:z[_\s]*)?(\d+)$/i,
    build: (m) => {
      const v = n(m[1]);
      return {
        kind: "matrix", rows: v, cols: v, label: `Z_${v}`,
        headers: Array.from({ length: v }, (_, i) => String(i)),
        cells: Array.from({ length: v }, (_, i) =>
          Array.from({ length: v }, (_, j) => String((i + j) % v))),
      };
    },
  },

  // ----------------------------------------------------------------- plots
  {
    id: "plot", label: "plot sin(x)/x", hint: "curve over a range", group: "plot",
    aliases: ["graph of", "draw", "curve", "function"],
    match: /^(?:plot|draw|curve)\s+(.+?)(?:\s+from\s+(-?[\d.]+)\s+to\s+(-?[\d.]+))?$/i,
    build: (m) => ({
      kind: "plot",
      exprs: m[1].split(/\s*,\s*/).filter(Boolean),
      from: m[2] ? parseFloat(m[2]) : -10,
      to: m[3] ? parseFloat(m[3]) : 10,
    }),
  },

  // ---------------------------------------------------------------- strips
  {
    id: "primes", label: "primes to 100", hint: "sieve strip", group: "numbers",
    aliases: ["prime numbers", "sieve"],
    match: /^primes?\s+(?:up\s+)?to\s+(\d+)$/i,
    build: (m) => ({ kind: "strip", from: 1, to: n(m[1]), rule: "prime" }),
  },
  {
    id: "numbers", label: "numbers 1 to 60", hint: "integer strip", group: "numbers",
    aliases: ["integers", "strip", "number line"],
    match: /^(?:numbers?|integers?)\s+(-?\d+)\s+to\s+(\d+)$/i,
    build: (m) => ({ kind: "strip", from: n(m[1]), to: n(m[2]), rule: "" }),
  },
  {
    id: "divisors", label: "divisors of 60", hint: "highlights the divisors", group: "numbers",
    aliases: ["factors of"],
    match: /^(?:divisors?|factors?)\s+of\s+(\d+)$/i,
    build: (m) => ({ kind: "strip", from: 1, to: n(m[1]), rule: `divisors of ${m[1]}` }),
  },
  {
    id: "residues", label: "mod 7 = 3 to 100", hint: "residue class", group: "numbers",
    aliases: ["residues", "congruent", "modular"],
    match: /^mod\s*(\d+)\s*=\s*(\d+)(?:\s+to\s+(\d+))?$/i,
    build: (m) => ({ kind: "strip", from: 1, to: n(m[3], 100), rule: `mod ${m[1]} = ${m[2]}` }),
  },
  {
    id: "multiples", label: "multiples of 7 to 100", hint: "highlights multiples", group: "numbers",
    match: /^multiples?\s+of\s+(\d+)(?:\s+to\s+(\d+))?$/i,
    build: (m) => ({ kind: "strip", from: 1, to: n(m[2], 100), rule: `multiples of ${m[1]}` }),
  },
  {
    id: "fibonacci", label: "fibonacci to 100", hint: "highlights Fibonacci numbers", group: "numbers",
    aliases: ["squares", "triangular", "perfect"],
    match: /^(fibonacci|squares?|triangular|perfect|composite|even|odd)\s+to\s+(\d+)$/i,
    build: (m) => ({ kind: "strip", from: 1, to: n(m[2]), rule: m[1].replace(/s$/, "") }),
  },

  // ---------------------------------------------------------------- clocks
  {
    id: "clock", label: "clock 12", hint: "Z_n as a dial", group: "numbers",
    aliases: ["cyclic group", "zn", "modular clock"],
    match: /^(?:clock|z)\s*[_\s]*(\d+)(?:\s+step\s+(\d+))?$/i,
    build: (m) => ({ kind: "clock", n: n(m[1]), step: n(m[2], 1) }),
  },
];

/** The registry, tried in order. Returns null when nothing matches. */
export function matchCommand(input: string): Spec | null {
  const s = input.trim();
  for (const c of COMMANDS) {
    const m = s.match(c.match);
    if (m) return c.build(m);
  }
  return null;
}

/** Fuzzy subsequence match, the usual command-palette behaviour. */
function fuzzy(needle: string, hay: string): number {
  const n2 = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (!n2) return 1;
  if (h.startsWith(n2)) return 100;
  if (h.includes(n2)) return 50;
  let i = 0;
  for (const ch of h) if (ch === n2[i]) i++;
  return i === n2.length ? 10 : 0;
}

export function suggest(input: string, limit = 6): Command[] {
  const s = input.trim();
  if (!s) return COMMANDS.filter((c) => ["complete", "matrix", "plot", "primes", "clock", "tree"].includes(c.id));
  // Once it is clearly free-form maths or a note, stop suggesting commands.
  if (looksLikeMath(s) || wordiness(s) >= 3) return [];
  return COMMANDS.map((c) => ({
      c,
      score: Math.max(
        fuzzy(s, c.label),
        fuzzy(s, c.group) * 0.6,
        ...(c.aliases ?? []).map((a) => fuzzy(s, a) * 0.9),
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

/** What Enter will actually produce. Never throws, never returns null. */
export function parse(input: string): Spec {
  const s = input.trim();
  const cmd = matchCommand(s);
  if (cmd) return cmd;
  if (looksLikeMath(s)) return { kind: "text", latex: latexify(s), raw: s };
  return { kind: "text", latex: null, raw: s };
}

/** One-line description of what a spec will create, shown under the caret. */
export function describe(spec: Spec): string {
  switch (spec.kind) {
    case "graph": return `graph · ${spec.n} vertices · ${spec.edges.length} edges`;
    case "matrix": return `matrix · ${spec.rows} × ${spec.cols}`;
    case "plot": return `plot · ${spec.exprs.join(", ")}`;
    case "strip": return `numbers ${spec.from ?? 1}–${spec.to}${spec.rule ? ` · ${spec.rule}` : ""}`;
    case "clock": return `Z_${spec.n} dial`;
    default: return spec.latex ? "maths" : "note";
  }
}
