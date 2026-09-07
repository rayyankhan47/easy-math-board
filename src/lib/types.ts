export type ObjKind =
  | "text" | "graph" | "matrix" | "plot" | "strip" | "clock"
  | "plane" | "surface" | "image" | "ink";

export interface BaseObj {
  id: string;
  kind: ObjKind;
  x: number;
  y: number;
}

export type FontFamily = "sans" | "serif" | "mono";

export interface TextStyle {
  font: FontFamily;
  size: number;
  color: string | null;   // null => inherit the theme's ink
  bold: boolean;
  italic: boolean;
}

export const DEFAULT_STYLE: TextStyle = {
  font: "sans", size: 16, color: null, bold: false, italic: false,
};

/** Anything you type. Renders as math when it looks like math, prose otherwise. */
export interface TextObj extends BaseObj {
  kind: "text";
  raw: string;
  latex: string | null; // null => render as plain prose
  style: TextStyle;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
}
export interface GraphEdge {
  a: string;
  b: string;
}

export type GraphLayout = "circle" | "grid" | "tree" | "bipartite";

export interface GraphObj extends BaseObj {
  kind: "graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  label: string;
}

export interface MatrixObj extends BaseObj {
  kind: "matrix";
  cells: string[][]; // strings so symbolic entries work
  label: string;
  /** Cayley tables get row/column headers and different checks. */
  headers: string[] | null;
}

export interface PlotObj extends BaseObj {
  kind: "plot";
  exprs: string[];
  from: number;
  to: number;
  w: number;
  h: number;
}

/** An integer strip: 1..N with a highlight predicate. */
export interface StripObj extends BaseObj {
  kind: "strip";
  from: number;
  to: number;
  rule: string; // see lib/predicates.ts
  perRow: number;
}

/** Z_n as a dial. */
export interface ClockObj extends BaseObj {
  kind: "clock";
  n: number;
  step: number;
}

export interface Curve {
  id: string;
  expr: string;
  color: string;
  on: boolean;
}

/** A Cartesian plane you pan and zoom inside, with several curves on it. */
export interface PlaneObj extends BaseObj {
  kind: "plane";
  curves: Curve[];
  cx: number;   // centre, in maths units
  cy: number;
  ppu: number;  // pixels per unit
  w: number;
  h: number;
  params: Record<string, number>;
}

/** z = f(x, y), orbitable. */
export interface SurfaceObj extends BaseObj {
  kind: "surface";
  expr: string;
  range: number;   // plots over [-range, range]^2
  res: number;     // grid resolution
  w: number;
  h: number;
  yaw: number;
  pitch: number;
  zoom: number;
  wire: boolean;
}

export interface ImageObj extends BaseObj {
  kind: "image";
  blobKey: string;  // key into the image store
  w: number;
  h: number;
  alt: string;
}

export type InkTool = "pen" | "highlighter" | "arrow";

/** A stroke exactly as drawn. Never smoothed into something tidier. */
export interface InkObj extends BaseObj {
  kind: "ink";
  tool: InkTool;
  /** [x, y, pressure], relative to the object's own origin. */
  points: [number, number, number][];
  color: string;
  size: number;
}

export type Obj =
  | TextObj | GraphObj | MatrixObj | PlotObj | StripObj | ClockObj
  | PlaneObj | SurfaceObj | ImageObj | InkObj;

export type Spec =
  | { kind: "text"; latex: string | null; raw: string }
  | { kind: "graph"; n: number; edges: [number, number][]; label?: string; layout?: GraphLayout; cols?: number }
  | { kind: "matrix"; rows: number; cols: number; cells?: string[][]; label?: string; headers?: string[] }
  | { kind: "plot"; exprs: string[]; from?: number; to?: number }
  | { kind: "strip"; from?: number; to: number; rule?: string }
  | { kind: "clock"; n: number; step?: number }
  | { kind: "plane"; exprs: string[]; cx?: number; cy?: number; ppu?: number }
  | { kind: "surface"; expr: string; range?: number }
  | { kind: "image"; blobKey: string; w: number; h: number; alt?: string }
  | { kind: "ink"; tool: InkTool; points: [number, number, number][]; color: string; size: number };

export const uid = () => Math.random().toString(36).slice(2, 10);
