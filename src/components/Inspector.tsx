"use client";

import { useBoard } from "@/lib/store";
import { circleNodes, complete, pairsToEdges, degrees, components, bipartition, chromatic } from "@/lib/graphs";
import { numeric, rank, det, trace, tidy } from "@/lib/matrix";
import type { GraphObj, MatrixObj } from "@/lib/types";

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-[3px]">
    <span className="text-[11px] text-[#6b707a]">{k}</span>
    <span className="font-mono text-[12px] text-[#e6e6e6]">{v}</span>
  </div>
);

const Btn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="rounded-[3px] border border-[#2b2e35] px-2 py-1 text-[11px] text-[#8a8f98] transition-colors hover:border-[#3a3d44] hover:text-[#e6e6e6]"
  >
    {children}
  </button>
);

export function Inspector() {
  const selected = useBoard((s) => s.selected);
  const obj = useBoard((s) => s.objs.find((o) => o.id === s.selected));
  const update = useBoard((s) => s.update);
  if (!selected || !obj) return null;

  return (
    <aside className="absolute top-4 right-4 z-30 w-60 rounded-[6px] border border-[#22242a] bg-[#141518]/95 p-3 backdrop-blur">
      {obj.kind === "graph" && <GraphPanel o={obj} update={update} />}
      {obj.kind === "matrix" && <MatrixPanel o={obj} update={update} />}
      {obj.kind === "text" && (
        <>
          <Head t="text" />
          <Row k="renders as" v={obj.latex ? "math" : "note"} />
          <p className="mt-2 font-mono text-[11px] break-words text-[#4a4e57]">{obj.raw}</p>
        </>
      )}
    </aside>
  );
}

const Head = ({ t }: { t: string }) => (
  <div className="mb-2 border-b border-[#22242a] pb-2 text-[10px] tracking-[0.14em] text-[#4a4e57] uppercase">
    {t}
  </div>
);

function GraphPanel({ o, update }: { o: GraphObj; update: ReturnType<typeof useBoard.getState>["update"] }) {
  const V = o.nodes.length;
  const E = o.edges.length;
  const deg = Object.values(degrees(o.nodes, o.edges)).sort((a, b) => b - a);
  const parts = bipartition(o.nodes, o.edges);
  const chi = chromatic(o.nodes, o.edges);
  const bound = 3 * V - 6; // Euler's bound, valid for V >= 3
  const violatesEuler = V >= 3 && E > bound;

  const relayout = () =>
    update<GraphObj>(o.id, {
      nodes: circleNodes(V).map((n, i) => ({ ...n, label: o.nodes[i]?.label ?? n.label })),
    });

  const addVertex = () => {
    const n = V + 1;
    update<GraphObj>(o.id, {
      nodes: circleNodes(n).map((x, i) => ({ ...x, label: o.nodes[i]?.label ?? String(n) })),
    });
  };

  const dropVertex = () => {
    if (V === 0) return;
    const gone = o.nodes[V - 1].id;
    update<GraphObj>(o.id, {
      nodes: o.nodes.slice(0, -1),
      edges: o.edges.filter((e) => e.a !== gone && e.b !== gone),
    });
  };

  return (
    <>
      <Head t={o.label || "graph"} />
      <Row k="vertices" v={V} />
      <Row k="edges" v={E} />
      <Row k="degrees" v={deg.length > 8 ? `${deg.slice(0, 8).join(" ")}…` : deg.join(" ") || "—"} />
      <Row k="components" v={components(o.nodes, o.edges)} />
      <Row k="bipartite" v={parts ? `yes (${parts[0].length}+${parts[1].length})` : "no"} />
      <Row k="χ" v={chi ?? "—"} />
      <div className="my-2 border-t border-[#22242a]" />
      <Row k="3V−6" v={V >= 3 ? bound : "—"} />
      <Row
        k="planar"
        v={
          violatesEuler ? (
            <span className="text-[#e06c6c]">no · E &gt; 3V−6</span>
          ) : (
            <span className="text-[#6b707a]">bound ok</span>
          )
        }
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={relayout}>relayout</Btn>
        <Btn onClick={addVertex}>+ vertex</Btn>
        <Btn onClick={dropVertex}>− vertex</Btn>
        <Btn onClick={() => update<GraphObj>(o.id, { edges: pairsToEdges(complete(V)) })}>
          complete
        </Btn>
        <Btn onClick={() => update<GraphObj>(o.id, { edges: [] })}>clear edges</Btn>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[#3a3d44]">
        drag a vertex to move · click two to toggle an edge
      </p>
    </>
  );
}

function MatrixPanel({ o, update }: { o: MatrixObj; update: ReturnType<typeof useBoard.getState>["update"] }) {
  const rows = o.cells.length;
  const cols = o.cells[0]?.length ?? 0;
  const m = numeric(o.cells);

  const resize = (r: number, c: number) => {
    if (r < 1 || c < 1 || r > 12 || c > 12) return;
    const cells = Array.from({ length: r }, (_, i) =>
      Array.from({ length: c }, (_, j) => o.cells[i]?.[j] ?? "0"),
    );
    update<MatrixObj>(o.id, { cells });
  };

  return (
    <>
      <Head t={o.label || "matrix"} />
      <Row k="size" v={`${rows} × ${cols}`} />
      {m ? (
        <>
          <Row k="rank" v={rank(m)} />
          <Row k="det" v={rows === cols ? (tidy(det(m) ?? 0) ?? "—") : "—"} />
          <Row k="trace" v={rows === cols ? tidy(trace(m) ?? 0) : "—"} />
        </>
      ) : (
        <Row k="entries" v={<span className="text-[#6b707a]">symbolic</span>} />
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={() => resize(rows + 1, cols)}>+ row</Btn>
        <Btn onClick={() => resize(rows - 1, cols)}>− row</Btn>
        <Btn onClick={() => resize(rows, cols + 1)}>+ col</Btn>
        <Btn onClick={() => resize(rows, cols - 1)}>− col</Btn>
        <Btn
          onClick={() =>
            update<MatrixObj>(o.id, {
              cells: Array.from({ length: cols }, (_, i) =>
                Array.from({ length: rows }, (_, j) => o.cells[j][i]),
              ),
            })
          }
        >
          transpose
        </Btn>
      </div>
    </>
  );
}
