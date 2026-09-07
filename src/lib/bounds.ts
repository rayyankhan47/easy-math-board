import { GRAPH_R } from "./graphs";
import { inkBounds } from "./ink";
import type { Obj } from "./types";

/**
 * Approximate on-screen size of an object. Exact for anything with explicit
 * dimensions; a reasonable guess for text, which is measured by its content.
 */
export function objSize(o: Obj): { w: number; h: number } {
  switch (o.kind) {
    case "plane":
    case "surface":
      return { w: o.w, h: o.h + 18 };
    case "image":
      return { w: o.w, h: o.h };
    case "plot":
      return { w: o.w, h: o.h + 16 };
    case "graph":
      return { w: GRAPH_R * 2 + 52, h: GRAPH_R * 2 + 52 };
    case "matrix": {
      const cols = o.cells[0]?.length ?? 1;
      return { w: cols * 34 + 40, h: o.cells.length * 24 + 20 };
    }
    case "strip": {
      const rows = Math.ceil((o.to - o.from + 1) / o.perRow);
      return { w: o.perRow * 29, h: rows * 21 + 20 };
    }
    case "clock":
      return { w: 152, h: 172 };
    case "shape":
      return { w: o.w, h: o.h + 14 };
    case "ink": {
      const b = inkBounds(o.points, o.size);
      return { w: Math.max(6, b.w), h: Math.max(6, b.h) };
    }
    default: {
      const size = o.style?.size ?? 16;
      return { w: Math.max(40, o.raw.length * size * 0.55), h: size * 1.6 };
    }
  }
}

/** Objects whose size the user can drag. */
export const RESIZABLE = new Set(["plane", "surface", "image", "plot"]);
