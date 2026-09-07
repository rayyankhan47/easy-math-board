"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { Obj, Spec } from "./types";
import { DEFAULT_STYLE, uid } from "./types";
import { CURVE_INK } from "@/components/objects/PlaneObject";
import { bipartiteNodes, circleNodes, gridNodes, pairsToEdges, treeNodes } from "./graphs";
import { paramsIn } from "./axes";
import { isApplyingRemote, publish } from "./collab";

const LOCAL_KEY = "board.v1";
/** A shared room persists under its own key so local work is never clobbered. */
let KEY = LOCAL_KEY;
export const setPersistKey = (room: string | null) =>
  (KEY = room ? `board.room.${room}` : LOCAL_KEY);

/** How many steps back you can go. Snapshots are small; objects are few. */
const HISTORY = 120;

interface Board {
  objs: Obj[];
  past: Obj[][];
  future: Obj[][];
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
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Replace everything, e.g. when a room hands us its contents. */
  replaceAll: (objs: Obj[]) => void;
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
    case "shape": {
      const r = spec.r ?? 78;
      return {
        ...base, kind: "shape", sides: spec.sides,
        w: r * 2 + 12, h: r * 2 + 12, rotation: 0,
        fill: null, stroke: "var(--text)",
        showVertices: spec.sides >= 3, showDiagonals: false,
        showCircum: false, showIn: false,
      };
    }
    case "ink":
      return {
        ...base, kind: "ink",
        tool: spec.tool, points: spec.points, color: spec.color, size: spec.size,
      };
    default:
      return {
        ...base, kind: "text", raw: spec.raw, latex: spec.latex,
        style: { ...DEFAULT_STYLE }, w: null,
      };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Save locally and mirror to the room, unless this change *came* from the room. */
const persist = (objs: Obj[]) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void idbSet(KEY, objs), 250);
  if (!isApplyingRemote()) publish(objs);
};

/**
 * Consecutive changes of the same kind inside one gesture collapse into a
 * single undo step — dragging an object is one undo, not two hundred.
 */
let lastTag = "";
let lastAt = 0;

function record(state: Board, tag: string): Partial<Board> {
  const now = Date.now();
  const merge = tag !== "" && tag === lastTag && now - lastAt < 700;
  lastTag = tag;
  lastAt = now;
  if (merge) return {};
  return { past: [...state.past, state.objs].slice(-HISTORY), future: [] };
}

export const useBoard = create<Board>((set, get) => ({
  objs: [],
  past: [],
  future: [],
  selection: [],
  pan: { x: 0, y: 0 },
  zoom: 1,

  add: (spec, at) => {
    const obj = specToObj(spec, at);
    set((s) => {
      const objs = [...s.objs, obj];
      persist(objs);
      return { ...record(s, `add:${obj.id}`), objs, selection: [obj.id] };
    });
  },

  update: (id, patch) =>
    set((s) => {
      const objs = s.objs.map((o) => (o.id === id ? ({ ...o, ...patch } as Obj) : o));
      persist(objs);
      return { ...record(s, `update:${id}:${Object.keys(patch).join(",")}`), objs };
    }),

  remove: (id) =>
    set((s) => {
      const objs = s.objs.filter((o) => o.id !== id);
      persist(objs);
      return { ...record(s, ""), objs, selection: s.selection.filter((x) => x !== id) };
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
      return { ...record(s, `move:${id}`), objs };
    }),

  setView: (pan, zoom) => set({ pan, zoom }),

  hydrate: async () => {
    const saved = await idbGet<Obj[]>(KEY);
    if (saved?.length) set({ objs: saved });
  },

  clear: () =>
    set((s) => {
      void idbSet(KEY, []);
      return { ...record(s, ""), objs: [], selection: [] };
    }),

  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const objs = s.past[s.past.length - 1];
      lastTag = "";
      persist(objs);
      return {
        objs,
        past: s.past.slice(0, -1),
        future: [s.objs, ...s.future].slice(0, HISTORY),
        selection: s.selection.filter((id) => objs.some((o) => o.id === id)),
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const objs = s.future[0];
      lastTag = "";
      persist(objs);
      return {
        objs,
        past: [...s.past, s.objs].slice(-HISTORY),
        future: s.future.slice(1),
        selection: s.selection.filter((id) => objs.some((o) => o.id === id)),
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  replaceAll: (objs) => {
    // Remote changes are not part of your own undo history.
    void idbSet(KEY, objs);
    set((s) => ({ objs, selection: s.selection.filter((id) => objs.some((o) => o.id === id)) }));
  },
}));
