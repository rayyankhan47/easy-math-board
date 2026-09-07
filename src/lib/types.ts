export type ObjKind = "text" | "graph" | "matrix" | "plot" | "strip" | "clock";

export interface BaseObj {
  id: string;
  kind: ObjKind;
  x: number;
  y: number;
}

/** Anything you type. Renders as math when it looks like math, prose otherwise. */
export interface TextObj extends BaseObj {
  kind: "text";
  raw: string;
  latex: string | null; // null => render as plain prose
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

export type Obj = TextObj | GraphObj | MatrixObj | PlotObj | StripObj | ClockObj;

export type Spec =
  | { kind: "text"; latex: string | null; raw: string }
  | { kind: "graph"; n: number; edges: [number, number][]; label?: string; layout?: GraphLayout; cols?: number }
  | { kind: "matrix"; rows: number; cols: number; cells?: string[][]; label?: string; headers?: string[] }
  | { kind: "plot"; exprs: string[]; from?: number; to?: number }
  | { kind: "strip"; from?: number; to: number; rule?: string }
  | { kind: "clock"; n: number; step?: number };

export const uid = () => Math.random().toString(36).slice(2, 10);
