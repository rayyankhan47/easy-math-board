"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { GraphObj, MatrixObj, Obj, Spec, TextObj } from "./types";
import { uid } from "./types";
import { circleNodes, pairsToEdges } from "./graphs";

const KEY = "board.v1";

interface Board {
  objs: Obj[];
  selected: string | null;
  pan: { x: number; y: number };
  zoom: number;

  add: (spec: Spec, at: { x: number; y: number }) => void;
  update: <T extends Obj>(id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  move: (id: string, x: number, y: number) => void;
  setView: (pan: { x: number; y: number }, zoom: number) => void;
  hydrate: () => Promise<void>;
  clear: () => void;
}

function specToObj(spec: Spec, at: { x: number; y: number }): Obj {
  const base = { id: uid(), x: at.x, y: at.y };
  switch (spec.kind) {
    case "graph":
      return {
        ...base,
        kind: "graph",
        nodes: circleNodes(spec.n),
        edges: pairsToEdges(spec.edges),
        directed: false,
        label: spec.label ?? "graph",
      } satisfies GraphObj;
    case "matrix":
      return {
        ...base,
        kind: "matrix",
        cells:
          spec.cells ??
          Array.from({ length: spec.rows }, () => Array(spec.cols).fill("0")),
        label: spec.label ?? "",
      } satisfies MatrixObj;
    default:
      return { ...base, kind: "text", raw: spec.raw, latex: spec.latex } satisfies TextObj;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const persist = (objs: Obj[]) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void idbSet(KEY, objs), 250);
};

export const useBoard = create<Board>((set, get) => ({
  objs: [],
  selected: null,
  pan: { x: 0, y: 0 },
  zoom: 1,

  add: (spec, at) => {
    const obj = specToObj(spec, at);
    set((s) => {
      const objs = [...s.objs, obj];
      persist(objs);
      return { objs, selected: obj.id };
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
      return { objs, selected: s.selected === id ? null : s.selected };
    }),

  select: (id) => set({ selected: id }),

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
    set({ objs: [], selected: null });
  },
}));
