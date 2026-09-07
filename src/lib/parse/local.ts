import type { Spec } from "../types";
import * as G from "../graphs";

/* ------------------------------------------------------------------ *
 * The instant path. Every phrase matched here skips the network call. *
 * Anything this returns null for falls through to the model.          *
 * ------------------------------------------------------------------ */

const GREEK = [
  "alpha","beta","gamma","delta","epsilon","zeta","eta","theta","iota","kappa",
  "lambda","mu","nu","xi","pi","rho","sigma","tau","phi","chi","psi","omega",
  "Gamma","Delta","Theta","Lambda","Xi","Pi","Sigma","Phi","Psi","Omega",
];
const FUNCS = ["sin","cos","tan","log","ln","exp","min","max","gcd","lcm","deg","det","dim","ker"];
const BIG = ["sum","prod","int","lim","bigcup","bigcap"];

/** Loose ASCII -> LaTeX. Deliberately partial: the model covers the rest. */
export function latexify(s: string): string {
  let t = " " + s + " ";
  t = t.replace(/<=/g, " \\le ").replace(/>=/g, " \\ge ");
  t = t.replace(/!=/g, " \\ne ").replace(/~=/g, " \\approx ");
  t = t.replace(/->/g, " \\to ").replace(/=>/g, " \\Rightarrow ");
  t = t.replace(/\binf(inity)?\b/g, " \\infty ");
  t = t.replace(/\bin\b/g, " \\in ").replace(/\bsubset\b/g, " \\subset ");
  t = t.replace(/\bforall\b/g, " \\forall ").replace(/\bexists\b/g, " \\exists ");
  t = t.replace(/\bsqrt\(([^()]*)\)/g, "\\sqrt{$1}");
  for (const b of BIG) t = t.replace(new RegExp(`\\b${b}\\b`, "g"), `\\${b} `);
  for (const f of FUNCS) t = t.replace(new RegExp(`\\b${f}\\b`, "g"), `\\${f} `);
  for (const g of GREEK) t = t.replace(new RegExp(`\\b${g}\\b`, "g"), `\\${g} `);
  t = t.replace(/\*/g, " \\cdot ");
  // simple single-token fractions: a/b, (a+b)/c
  t = t.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
  t = t.replace(/\(([^()]+)\)\s*\/\s*([A-Za-z0-9]+)/g, "\\frac{$1}{$2}");
  t = t.replace(/(?<![\\\w}])([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/g, "\\frac{$1}{$2}");
  return t.replace(/\s+/g, " ").trim();
}

/** Connectives that survive latexify as literal words — a sign the line is
 *  spoken-style ("sum i=1 to n of i^2") and needs real translation. */
const SPOKEN = new Set([
  "to","of","from","for","where","with","over","then","all","each","every",
  "the","a","an","is","are","be","by","as","that","this","goes","up","down",
]);

function hasSpokenLeftovers(tex: string): boolean {
  return (tex.match(/(?<![\\A-Za-z])[A-Za-z]{2,}(?![A-Za-z])/g) ?? []).some((w) =>
    SPOKEN.has(w.toLowerCase()),
  );
}

const MATH_WORDS = new Set([
  ...GREEK, ...FUNCS, ...BIG,
  "sqrt","inf","infinity","mod","and","or","not","in","subset","forall","exists",
  "to","iff","implies","let","where","if","then","for","all","of","from","is",
]);

/** Count of ordinary English words — the signal that a line is prose. */
export function wordiness(s: string): number {
  return s
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length >= 4 && !MATH_WORDS.has(w.toLowerCase())).length;
}

/** Does this read as math, or as a note to yourself? */
export function looksLikeMath(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/[0-9=+\-*/^_<>≤≥(){}\\]/.test(t)) return false;
  return wordiness(t) <= 1;
}

const num = (s: string | undefined, d = 0) => (s ? parseInt(s, 10) : d);
const graphSpec = (n: number, edges: [number, number][], label: string): Spec => ({
  kind: "graph", n, edges, label,
});

export function parseLocal(input: string): Spec | null {
  const s = input.trim();
  if (!s) return null;
  const l = s.toLowerCase();

  // ---- named + parameterised graphs ----
  let m: RegExpMatchArray | null;

  if ((m = l.match(/^k[_\s]*(\d+)\s*,\s*(\d+)$/)) || (m = l.match(/^(?:complete\s+)?bipartite\s+(\d+)\s*(?:,|x|by|and)\s*(\d+)$/))) {
    const a = num(m[1]), b = num(m[2]);
    return graphSpec(a + b, G.completeBipartite(a, b), `K_{${a},${b}}`);
  }
  if ((m = l.match(/^k[_\s]*(\d+)$/)) || (m = l.match(/^complete\s+graph\s+(?:on\s+|with\s+)?(\d+)/))) {
    const n = num(m[1]);
    return graphSpec(n, G.complete(n), `K_${n}`);
  }
  if (/^petersen(\s+graph)?$/.test(l)) return graphSpec(10, G.petersen(), "Petersen");
  if ((m = l.match(/^cycle\s*(?:graph\s*)?(?:c[_\s]*)?(\d+)/)) || (m = l.match(/^c[_\s]*(\d+)$/))) {
    const n = num(m[1]);
    return graphSpec(n, G.cycle(n), `C_${n}`);
  }
  if ((m = l.match(/^path\s*(?:graph\s*)?(\d+)/))) {
    const n = num(m[1]);
    return graphSpec(n, G.path(n), `P_${n}`);
  }
  if ((m = l.match(/^star\s*(?:graph\s*)?(\d+)/))) {
    const n = num(m[1]);
    return graphSpec(n, G.star(n), `Star_${n}`);
  }
  if ((m = l.match(/^wheel\s*(?:graph\s*)?(\d+)/))) {
    const n = num(m[1]);
    return graphSpec(n, G.wheel(n), `W_${n}`);
  }
  if ((m = l.match(/^random\s+graph\s+(?:on\s+|with\s+)?(\d+)(?:\s*(?:nodes?|vertices|vertexes))?(?:\s*(?:p\s*=?\s*)?(0?\.\d+))?/))) {
    const n = num(m[1]);
    return graphSpec(n, G.randomEdges(n, m[2] ? parseFloat(m[2]) : 0.35), "random");
  }
  // "graph 5 nodes" / "5 node graph" / "graph with 6 vertices" / "empty graph 4"
  if (
    (m = l.match(/^(?:empty\s+)?graph\s+(?:with\s+|on\s+|of\s+)?(\d+)\s*(?:nodes?|vertices|vertexes|pts?|points?)?$/)) ||
    (m = l.match(/^(\d+)[\s-]*(?:node|vertex|vertice)s?\s+graph$/))
  ) {
    return graphSpec(num(m[1]), [], "graph");
  }

  // ---- matrices ----
  if ((m = l.match(/^(?:identity|eye)\s*(?:matrix\s*)?(\d+)$/)) || (m = l.match(/^i[_\s]*(\d+)$/))) {
    const n = num(m[1]);
    const cells = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? "1" : "0")),
    );
    return { kind: "matrix", rows: n, cols: n, cells, label: `I_${n}` };
  }
  if ((m = l.match(/^(zeros?|ones?)\s*(?:matrix\s*)?(\d+)\s*(?:x|by|\*|,)\s*(\d+)$/))) {
    const v = m[1].startsWith("zero") ? "0" : "1";
    const r = num(m[2]), c = num(m[3]);
    return { kind: "matrix", rows: r, cols: c, cells: Array.from({ length: r }, () => Array(c).fill(v)) };
  }
  if ((m = l.match(/^random\s+matrix\s+(\d+)\s*(?:x|by|\*|,)\s*(\d+)$/))) {
    const r = num(m[1]), c = num(m[2]);
    return {
      kind: "matrix", rows: r, cols: c,
      cells: Array.from({ length: r }, () =>
        Array.from({ length: c }, () => String(Math.floor(Math.random() * 19) - 9)),
      ),
    };
  }
  if (
    (m = l.match(/^matrix\s+(\d+)\s*(?:x|by|\*|,)\s*(\d+)$/)) ||
    (m = l.match(/^(\d+)\s*(?:x|by|\*)\s*(\d+)\s+matrix$/))
  ) {
    return { kind: "matrix", rows: num(m[1]), cols: num(m[2]) };
  }
  if ((m = l.match(/^matrix\s+(\d+)$/))) {
    return { kind: "matrix", rows: num(m[1]), cols: num(m[1]) };
  }

  // ---- math vs. note ----
  if (looksLikeMath(s)) {
    const tex = latexify(s);
    // Spoken phrasing survived as literal words — let the model translate it.
    if (hasSpokenLeftovers(tex)) return null;
    return { kind: "text", latex: tex, raw: s };
  }

  // A scrawl, a note, an aside, or a full sentence that merely mentions
  // numbers. Those are the point of the board, so they land instantly and
  // never cost a round-trip. The caret makes objects; it does not answer
  // questions — asking is a separate gesture.
  if (!/[0-9=+\-*/^_<>≤≥\\]/.test(s) || wordiness(s) >= 3)
    return { kind: "text", latex: null, raw: s };

  return null;
}
