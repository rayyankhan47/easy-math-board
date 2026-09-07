export type ObjKind = "text" | "graph" | "matrix";

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
}

export type Obj = TextObj | GraphObj | MatrixObj;

/** What the parser produces before it becomes a positioned object. */
export type Spec =
  | { kind: "text"; latex: string | null; raw: string }
  | { kind: "graph"; n: number; edges: [number, number][]; label?: string }
  | { kind: "matrix"; rows: number; cols: number; cells?: string[][]; label?: string };

export const uid = () => Math.random().toString(36).slice(2, 10);
