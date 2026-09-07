"use client";

import { ops } from "./engine";
import { rhs } from "./axes";
import { complete, pairsToEdges, circleNodes, cycle, degrees, chromatic } from "./graphs";
import { shapeFacts, tidy as sTidy } from "./shapes";
import type { GraphObj, MatrixObj, Obj, ObjKind, PlaneObj, ShapeObj, Spec, StripObj, SurfaceObj, ClockObj } from "./types";
import { uid } from "./types";
import { CURVE_INK } from "@/components/objects/PlaneObject";

export interface ActionCtx {
  add: (spec: Spec, at: { x: number; y: number }) => void;
  update: <T extends Obj>(id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  /** A free spot just under the object. */
  below: () => { x: number; y: number };
  fail: (msg: string) => void;
}

export interface Action {
  id: string;
  label: string;
  hint: string;
  kinds: ObjKind[];
  aliases?: string[];
  run: (o: Obj, c: ActionCtx) => void | Promise<void>;
}

/** Prefer x, then any single letter, so "derivative" rarely has to ask. */
async function mainVar(expr: string): Promise<string> {
  const r = await ops.vars(expr);
  const vars = (r.vars as string[]) ?? [];
  return vars.includes("x") ? "x" : (vars[0] ?? "x");
}

const asText = (c: ActionCtx, text: string, latex: string | null) =>
  c.add({ kind: "text", raw: text, latex }, c.below());

/** Run a SymPy call and drop the result on the board, or report the error. */
async function sym(
  c: ActionCtx,
  p: Promise<{ text?: string; latex?: string; error?: string }>,
) {
  const r = await p;
  if (r.error) return c.fail(r.error);
  asText(c, r.text ?? "", r.latex ?? null);
}

const MATH: ObjKind[] = ["text"];

export const ACTIONS: Action[] = [
  // ------------------------------------------------------------- symbolic
  {
    id: "derivative", label: "derivative", hint: "d/dx of this", kinds: MATH,
    aliases: ["differentiate", "d/dx", "diff", "slope"],
    run: async (o, c) => {
      const src = (o as { raw: string }).raw;
      await sym(c, ops.diff(src, await mainVar(src)));
    },
  },
  {
    id: "integral", label: "integral", hint: "antiderivative", kinds: MATH,
    aliases: ["integrate", "antiderivative", "∫"],
    run: async (o, c) => {
      const src = (o as { raw: string }).raw;
      await sym(c, ops.integrate(src, await mainVar(src)));
    },
  },
  {
    id: "simplify", label: "simplify", hint: "reduce it", kinds: MATH,
    run: (o, c) => sym(c, ops.simplify((o as { raw: string }).raw)),
  },
  {
    id: "expand", label: "expand", hint: "multiply it out", kinds: MATH,
    run: (o, c) => sym(c, ops.expand((o as { raw: string }).raw)),
  },
  {
    id: "factor", label: "factor", hint: "into factors", kinds: MATH,
    aliases: ["factorise", "factorize"],
    run: (o, c) => sym(c, ops.factor((o as { raw: string }).raw)),
  },
  {
    id: "solve", label: "solve", hint: "for the main variable", kinds: MATH,
    aliases: ["roots", "zeros", "zeroes"],
    run: async (o, c) => {
      const src = (o as { raw: string }).raw;
      await sym(c, ops.solve(src, await mainVar(src)));
    },
  },
  {
    id: "plot-it", label: "plot it", hint: "put this on a plane", kinds: MATH,
    aliases: ["graph it", "draw it", "chart"],
    run: (o, c) => c.add({ kind: "plane", exprs: [rhs((o as { raw: string }).raw)] }, c.below()),
  },
  {
    id: "surface-it", label: "as a 3d surface", hint: "needs x and y", kinds: MATH,
    aliases: ["3d", "surface"],
    run: (o, c) => c.add({ kind: "surface", expr: rhs((o as { raw: string }).raw) }, c.below()),
  },

  // ---------------------------------------------------------------- graph
  {
    id: "adjacency", label: "adjacency matrix", hint: "as an editable grid", kinds: ["graph"],
    aliases: ["matrix", "incidence"],
    run: (o, c) => {
      const g = o as GraphObj;
      const idx = new Map(g.nodes.map((n, i) => [n.id, i]));
      const m = g.nodes.map(() => g.nodes.map(() => "0"));
      for (const e of g.edges) {
        const a = idx.get(e.a), b = idx.get(e.b);
        if (a === undefined || b === undefined) continue;
        m[a][b] = "1";
        m[b][a] = "1";
      }
      c.add({ kind: "matrix", rows: g.nodes.length, cols: g.nodes.length, cells: m, label: "A" }, c.below());
    },
  },
  {
    id: "degseq", label: "degree sequence", hint: "as a line of maths", kinds: ["graph"],
    aliases: ["degrees"],
    run: (o, c) => {
      const g = o as GraphObj;
      const d = Object.values(degrees(g.nodes, g.edges)).sort((a, b) => b - a);
      asText(c, `(${d.join(", ")})`, `(${d.join(",\\ ")})`);
    },
  },
  {
    id: "gprops", label: "write out its numbers", hint: "V, E and χ as maths", kinds: ["graph"],
    aliases: ["properties", "stats", "summary"],
    run: (o, c) => {
      const g = o as GraphObj;
      const chi = chromatic(g.nodes, g.edges);
      asText(
        c,
        `V = ${g.nodes.length}, E = ${g.edges.length}${chi ? `, chi = ${chi}` : ""}`,
        `V = ${g.nodes.length},\\ E = ${g.edges.length}${chi ? `,\\ \\chi = ${chi}` : ""}`,
      );
    },
  },
  {
    id: "complement", label: "complement", hint: "swap edges for non-edges", kinds: ["graph"],
    run: (o, c) => {
      const g = o as GraphObj;
      const has = new Set(g.edges.map((e) => [e.a, e.b].sort().join("|")));
      const edges = [];
      for (let i = 0; i < g.nodes.length; i++)
        for (let j = i + 1; j < g.nodes.length; j++) {
          const key = [g.nodes[i].id, g.nodes[j].id].sort().join("|");
          if (!has.has(key)) edges.push({ a: g.nodes[i].id, b: g.nodes[j].id });
        }
      c.update<GraphObj>(g.id, { edges, label: `${g.label}ᶜ` });
    },
  },
  {
    id: "complete-it", label: "make it complete", hint: "join every pair", kinds: ["graph"],
    run: (o, c) => {
      const g = o as GraphObj;
      c.update<GraphObj>(g.id, { edges: pairsToEdges(complete(g.nodes.length)) });
    },
  },
  {
    id: "clear-edges", label: "clear edges", hint: "keep the vertices", kinds: ["graph"],
    run: (o, c) => c.update<GraphObj>(o.id, { edges: [] }),
  },
  {
    id: "relayout", label: "relayout", hint: "back to a circle", kinds: ["graph"],
    aliases: ["tidy", "arrange"],
    run: (o, c) => {
      const g = o as GraphObj;
      c.update<GraphObj>(g.id, {
        nodes: circleNodes(g.nodes.length).map((n, i) => ({ ...n, label: g.nodes[i].label })),
      });
    },
  },

  // --------------------------------------------------------------- matrix
  ...(
    [
      ["determinant", "det", ["det"]],
      ["rank", "rank", []],
      ["trace", "trace", []],
      ["eigenvalues", "eigenvalues", ["eigen", "spectrum"]],
      ["characteristic polynomial", "charpoly", ["charpoly"]],
    ] as const
  ).map(([label, what, aliases]) => ({
    id: `m-${what}`,
    label,
    hint: "as a line of maths",
    kinds: ["matrix"] as ObjKind[],
    aliases: [...aliases],
    run: async (o: Obj, c: ActionCtx) => {
      const r = await ops.matrix((o as MatrixObj).cells, what);
      if (r.error) return c.fail(r.error as string);
      asText(c, (r.text as string) ?? "", (r.latex as string) ?? null);
    },
  })),
  ...(
    [
      ["transpose", "transpose", ["flip"]],
      ["inverse", "inverse", ["invert"]],
      ["row reduce", "rref", ["rref", "echelon", "gauss"]],
    ] as const
  ).map(([label, what, aliases]) => ({
    id: `m-${what}`,
    label,
    hint: "as a new matrix",
    kinds: ["matrix"] as ObjKind[],
    aliases: [...aliases],
    run: async (o: Obj, c: ActionCtx) => {
      const r = await ops.matrix((o as MatrixObj).cells, what);
      if (r.error) return c.fail(r.error as string);
      const cells = r.cells as string[][];
      c.add({ kind: "matrix", rows: cells.length, cols: cells[0]?.length ?? 0, cells }, c.below());
    },
  })),

  // ---------------------------------------------------------------- plane
  {
    id: "p-derivative", label: "add the derivative", hint: "as another curve", kinds: ["plane"],
    aliases: ["differentiate", "d/dx"],
    run: async (o, c) => {
      const p = o as PlaneObj;
      const first = p.curves[0];
      if (!first) return c.fail("no curve to differentiate");
      const r = await ops.diff(rhs(first.expr), "x");
      if (r.error) return c.fail(r.error);
      c.update<PlaneObj>(p.id, {
        curves: [
          ...p.curves,
          { id: uid(), expr: (r.text as string).replace(/\*\*/g, "^"), color: CURVE_INK[p.curves.length % CURVE_INK.length], on: true },
        ],
      });
    },
  },
  {
    id: "p-curve", label: "add a curve", hint: "empty, edit it in the panel", kinds: ["plane"],
    run: (o, c) => {
      const p = o as PlaneObj;
      c.update<PlaneObj>(p.id, {
        curves: [...p.curves, { id: uid(), expr: "x", color: CURVE_INK[p.curves.length % CURVE_INK.length], on: true }],
      });
    },
  },
  {
    id: "p-recentre", label: "recentre", hint: "back to the origin", kinds: ["plane"],
    aliases: ["reset", "home"],
    run: (o, c) => c.update<PlaneObj>(o.id, { cx: 0, cy: 0, ppu: 34 }),
  },

  // -------------------------------------------------------------- surface
  {
    id: "s-wire", label: "toggle wireframe", hint: "solid or mesh", kinds: ["surface"],
    run: (o, c) => c.update<SurfaceObj>(o.id, { wire: !(o as SurfaceObj).wire }),
  },
  {
    id: "s-reset", label: "reset view", hint: "back to the default angle", kinds: ["surface"],
    run: (o, c) => c.update<SurfaceObj>(o.id, { yaw: 0.7, pitch: 0.5, zoom: 1 }),
  },

  // --------------------------------------------------------------- strips
  ...(["prime", "composite", "even", "odd", "square", "triangular", "fibonacci", "perfect"] as const).map(
    (r) => ({
      id: `strip-${r}`,
      label: `highlight ${r}`,
      hint: "change the rule",
      kinds: ["strip"] as ObjKind[],
      run: (o: Obj, c: ActionCtx) => c.update<StripObj>(o.id, { rule: r }),
    }),
  ),
  {
    id: "strip-extend", label: "extend", hint: "double the range", kinds: ["strip"],
    run: (o, c) => c.update<StripObj>(o.id, { to: (o as StripObj).to * 2 }),
  },

  // --------------------------------------------------------------- clocks
  {
    id: "clock-step", label: "next step", hint: "walk the generator", kinds: ["clock"],
    run: (o, c) => {
      const k = o as ClockObj;
      c.update<ClockObj>(k.id, { step: (k.step % k.n) + 1 });
    },
  },

  // ---------------------------------------------------------------- shape
  {
    id: "sh-numbers", label: "write out its numbers", hint: "area, perimeter, angles", kinds: ["shape"],
    aliases: ["area", "perimeter", "measurements", "properties"],
    run: (o, c) => {
      const sh = o as ShapeObj;
      const r = Math.max(8, Math.min(sh.w, sh.h) / 2 - 6);
      const f = shapeFacts(sh.sides, r);
      if (sh.sides === 0) {
        asText(c, `r = ${sTidy(r)}, C = ${sTidy(f.perimeter)}, A = ${sTidy(f.area)}`,
          `r = ${sTidy(r)},\\ C = ${sTidy(f.perimeter)},\\ A = ${sTidy(f.area)}`);
        return;
      }
      asText(
        c,
        `n = ${f.sides}, s = ${sTidy(f.side)}, P = ${sTidy(f.perimeter)}, A = ${sTidy(f.area)}`,
        `n = ${f.sides},\\ s = ${sTidy(f.side)},\\ P = ${sTidy(f.perimeter)},\\ A = ${sTidy(f.area)}`,
      );
    },
  },
  {
    id: "sh-graph", label: "as a cycle graph", hint: "its vertices and edges", kinds: ["shape"],
    aliases: ["graph", "cycle", "c_n"],
    run: (o, c) => {
      const sh = o as ShapeObj;
      if (sh.sides < 3) return c.fail("a circle has no vertices");
      c.add(
        { kind: "graph", n: sh.sides, edges: cycle(sh.sides), label: `C_${sh.sides}` },
        c.below(),
      );
    },
  },
  {
    id: "sh-more", label: "add a side", hint: "n + 1", kinds: ["shape"],
    run: (o, c) => {
      const sh = o as ShapeObj;
      c.update<ShapeObj>(sh.id, { sides: Math.min(60, Math.max(3, sh.sides + 1)), showVertices: true });
    },
  },
  {
    id: "sh-less", label: "remove a side", hint: "n − 1", kinds: ["shape"],
    run: (o, c) => {
      const sh = o as ShapeObj;
      c.update<ShapeObj>(sh.id, { sides: Math.max(3, sh.sides - 1) });
    },
  },
  {
    id: "sh-diag", label: "show diagonals", hint: "all n(n−3)/2 of them", kinds: ["shape"],
    run: (o, c) => c.update<ShapeObj>(o.id, { showDiagonals: !(o as ShapeObj).showDiagonals }),
  },
  {
    id: "sh-circles", label: "circumcircle and incircle", hint: "both dashed guides", kinds: ["shape"],
    aliases: ["inscribed", "circumscribed"],
    run: (o, c) => {
      const sh = o as ShapeObj;
      const on = !(sh.showCircum && sh.showIn);
      c.update<ShapeObj>(sh.id, { showCircum: on, showIn: on && sh.sides >= 3 });
    },
  },

  // ------------------------------------------------------------ universal
  {
    id: "duplicate", label: "duplicate", hint: "a copy just below", kinds: [],
    aliases: ["copy", "clone"],
    run: (o, c) => {
      const { id: _id, x: _x, y: _y, ...rest } = o as Obj & Record<string, unknown>;
      void _id; void _x; void _y;
      c.add({ ...(rest as object) } as Spec, c.below());
    },
  },
  {
    id: "delete", label: "delete", hint: "remove it", kinds: [],
    aliases: ["remove", "clear"],
    run: (o, c) => c.remove(o.id),
  },
];

/** Actions available for one object — an empty `kinds` means "anything". */
export function actionsFor(kind: ObjKind): Action[] {
  return ACTIONS.filter((a) => a.kinds.length === 0 || a.kinds.includes(kind));
}

export function searchActions(kind: ObjKind, q: string, limit = 7): Action[] {
  const all = actionsFor(kind);
  const s = q.trim().toLowerCase();
  if (!s) return all.slice(0, limit);
  const score = (a: Action) => {
    const hay = [a.label, ...(a.aliases ?? [])];
    let best = 0;
    for (const h of hay) {
      const l = h.toLowerCase();
      if (l.startsWith(s)) best = Math.max(best, 100);
      else if (l.includes(s)) best = Math.max(best, 50);
    }
    if (!best && a.hint.toLowerCase().includes(s)) best = 10;
    return best;
  };
  return all
    .map((a) => ({ a, n: score(a) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n)
    .slice(0, limit)
    .map((x) => x.a);
}
