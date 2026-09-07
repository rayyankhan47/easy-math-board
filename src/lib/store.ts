"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { Obj, Spec } from "./types";
import { DEFAULT_STYLE, uid } from "./types";
import { CURVE_INK } from "@/components/objects/PlaneObject";
import { bipartiteNodes, circleNodes, gridNodes, pairsToEdges, treeNodes } from "./graphs";
import { paramsIn } from "./axes";

const KEY = "board.v1";

interface Board {
  objs: Obj[];
  selection: string[];
  pan: { x: number; y: number };
  zoom: number;

  add: (spec: Spec, at: { x: number; y: number }) => void;
  update: <T extends Obj>(id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  select: (id: string | null, additive?: boolean) => void;
  move: (id: string, x: number, y: number) => void;
  setView: (pan: { x: number; y: number }, zoom: number) => void;
  hydrate: () => Promise<void>;
  clear: () => void;
}

function specToObj(spec: Spec, at: { x: number; y: number }): Obj {
  const base = { id: uid(), x: at.x, y: at.y };
  switch (spec.kind) {
    case "graph": {
      const nodes =
        spec.layout === "grid"
          ? gridNodes(Math.ceil(spec.n / (spec.cols ?? 1)), spec.cols ?? 1)
          : spec.layout === "tree"
            ? treeNodes(spec.n)
            : spec.layout === "bipartite"
              ? bipartiteNodes(spec.cols ?? 0, spec.n - (spec.cols ?? 0))
              : circleNodes(spec.n);
      return {
        ...base, kind: "graph", nodes,
        edges: pairsToEdges(spec.edges),
        directed: false,
        label: spec.label ?? "graph",
      };
    }
    case "matrix":
      return {
        ...base, kind: "matrix",
        cells: spec.cells ?? Array.from({ length: spec.rows }, () => Array(spec.cols).fill("0")),
        label: spec.label ?? "",
        headers: spec.headers ?? null,
      };
    case "plot":
      return {
        ...base, kind: "plot",
        exprs: spec.exprs,
        from: spec.from ?? -10,
        to: spec.to ?? 10,
        w: 260, h: 180,
      };
    case "strip":
      return {
        ...base, kind: "strip",
        from: spec.from ?? 1,
        to: spec.to,
        rule: spec.rule ?? "",
        perRow: 10,
      };
    case "clock":
      return { ...base, kind: "clock", n: spec.n, step: spec.step ?? 1 };
    case "plane":
      return {
        ...base, kind: "plane",
        curves: spec.exprs.map((e, i) => ({
          id: uid(), expr: e, color: CURVE_INK[i % CURVE_INK.length], on: true,
        })),
        cx: spec.cx ?? 0, cy: spec.cy ?? 0, ppu: spec.ppu ?? 34,
        w: 340, h: 280,
        // parameters start at 1 so a curve using them draws immediately
        params: Object.fromEntries(paramsIn(spec.exprs).map((k) => [k, 1])),
      };
    case "surface":
      return {
        ...base, kind: "surface",
        expr: spec.expr, range: spec.range ?? 3, res: 26,
        w: 300, h: 250, yaw: 0.7, pitch: 0.5, zoom: 1, wire: false,
      };
    case "image":
      return { ...base, kind: "image", blobKey: spec.blobKey, w: spec.w, h: spec.h, alt: spec.alt ?? "" };
    default:
      return { ...base, kind: "text", raw: spec.raw, latex: spec.latex, style: { ...DEFAULT_STYLE } };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const persist = (objs: Obj[]) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void idbSet(KEY, objs), 250);
};

export const useBoard = create<Board>((set, get) => ({
  objs: [],
  selection: [],
  pan: { x: 0, y: 0 },
  zoom: 1,

  add: (spec, at) => {
    const obj = specToObj(spec, at);
    set((s) => {
      const objs = [...s.objs, obj];
      persist(objs);
      return { objs, selection: [obj.id] };
    });
  },

  update: (id, patch) =>
    set((s) => {
      const objs = s.objs.map((o) => (o.id === id ? ({ ...o, ...patch } as Obj) : o));
      persist(objs);
      return { objs };
    }),

  remove: (id) =>
    set((s) => {
      const objs = s.objs.filter((o) => o.id !== id);
      persist(objs);
      return { objs, selection: s.selection.filter((x) => x !== id) };
    }),

  select: (id, additive = false) =>
    set((s) => {
      if (id === null) return { selection: [] };
      if (!additive) return { selection: [id] };
      return {
        selection: s.selection.includes(id)
          ? s.selection.filter((x) => x !== id)
          : [...s.selection, id],
      };
    }),

  move: (id, x, y) =>
    set((s) => {
      const objs = s.objs.map((o) => (o.id === id ? { ...o, x, y } : o));
      persist(objs);
      return { objs };
    }),

  setView: (pan, zoom) => set({ pan, zoom }),

  hydrate: async () => {
    const saved = await idbGet<Obj[]>(KEY);
    if (saved?.length) set({ objs: saved });
  },

  clear: () => {
    void idbSet(KEY, []);
    set({ objs: [], selection: [] });
  },
}));
