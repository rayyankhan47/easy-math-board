"use client";

import { useBoard } from "@/lib/store";
import { circleNodes, complete, pairsToEdges, degrees, components, bipartition, chromatic } from "@/lib/graphs";
import { numeric, rank, det, trace, tidy } from "@/lib/matrix";
import { checkGroup } from "@/lib/group";
import { rule, numberFacts } from "@/lib/predicates";
import { ops, useEngine } from "@/lib/engine";
import { useEffect, useState } from "react";
import type { ClockObj, GraphObj, MatrixObj, PlotObj, StripObj } from "@/lib/types";

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
  const one = useBoard((s) => (s.selection.length === 1 ? s.selection[0] : null));
  const obj = useBoard((s) => s.objs.find((o) => o.id === one));
  const update = useBoard((s) => s.update);
  if (!one || !obj) return null;

  return (
    <aside className="absolute top-4 right-4 z-30 w-60 rounded-[6px] border border-[#22242a] bg-[#141518]/95 p-3 backdrop-blur">
      {obj.kind === "graph" && <GraphPanel o={obj} update={update} />}
      {obj.kind === "matrix" && <MatrixPanel o={obj} update={update} />}
      {obj.kind === "plot" && <PlotPanel o={obj} update={update} />}
      {obj.kind === "strip" && <StripPanel o={obj} update={update} />}
      {obj.kind === "clock" && <ClockPanel o={obj} update={update} />}
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
  const deep = useGraphProps(o);

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
          deep?.planar !== undefined ? (
            <span className={deep.planar ? "text-[#6cc7a1]" : "text-[#e06c6c]"}>
              {deep.planar ? "yes" : "no"}
              {!deep.planar && violatesEuler ? " · E > 3V−6" : ""}
            </span>
          ) : violatesEuler ? (
            <span className="text-[#e06c6c]">no · E &gt; 3V−6</span>
          ) : (
            <span className="text-[#4a4e57]">…</span>
          )
        }
      />
      {deep?.girth != null && <Row k="girth" v={String(deep.girth)} />}
      {deep?.diameter != null && <Row k="diameter" v={String(deep.diameter)} />}
      {deep?.clique != null && <Row k="max clique" v={String(deep.clique)} />}
      {deep?.eulerian != null && (
        <Row k="eulerian" v={deep.eulerian ? "yes" : "no"} />
      )}
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

  // A Cayley table is a group table, not a matrix — different questions apply.
  if (o.headers) {
    const g = checkGroup(o.headers, o.cells);
    const yn = (b: boolean) => (
      <span className={b ? "text-[#6cc7a1]" : "text-[#e06c6c]"}>{b ? "yes" : "no"}</span>
    );
    return (
      <>
        <Head t={o.label || "table"} />
        <Row k="order" v={rows} />
        <Row k="closed" v={yn(g.closed)} />
        <Row k="associative" v={yn(g.associative)} />
        <Row k="identity" v={g.identity ?? <span className="text-[#e06c6c]">none</span>} />
        <Row k="inverses" v={yn(g.allInverses)} />
        <Row k="commutative" v={yn(g.commutative)} />
        <div className="my-2 border-t border-[#22242a]" />
        <Row k="group" v={yn(g.isGroup)} />
        {g.isGroup && <Row k="abelian" v={yn(g.commutative)} />}
        <p className="mt-2 text-[10px] leading-relaxed text-[#3a3d44]">
          edit any cell — the checks rerun
        </p>
      </>
    );
  }

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


type Update = ReturnType<typeof useBoard.getState>["update"];

function PlotPanel({ o, update }: { o: PlotObj; update: Update }) {
  const span = o.to - o.from;
  const zoom = (f: number) => {
    const mid = (o.from + o.to) / 2;
    update<PlotObj>(o.id, { from: mid - (span * f) / 2, to: mid + (span * f) / 2 });
  };
  return (
    <>
      <Head t="plot" />
      {o.exprs.map((e, i) => (
        <Row key={i} k={i === 0 ? "f(x)" : " "} v={e} />
      ))}
      <Row k="domain" v={`[${o.from}, ${o.to}]`} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={() => zoom(0.5)}>zoom in</Btn>
        <Btn onClick={() => zoom(2)}>zoom out</Btn>
        <Btn onClick={() => update<PlotObj>(o.id, { from: -10, to: 10 })}>reset</Btn>
        <Btn onClick={() => update<PlotObj>(o.id, { w: o.w + 60, h: o.h + 40 })}>bigger</Btn>
        <Btn onClick={() => update<PlotObj>(o.id, { w: Math.max(140, o.w - 60), h: Math.max(100, o.h - 40) })}>
          smaller
        </Btn>
      </div>
    </>
  );
}

const RULES = ["prime", "composite", "even", "odd", "square", "triangular", "fibonacci", "perfect"];

function StripPanel({ o, update }: { o: StripObj; update: Update }) {
  const r = rule(o.rule);
  const count = (() => {
    let c = 0;
    for (let i = o.from; i <= o.to; i++) if (o.rule && r.test(i)) c++;
    return c;
  })();
  return (
    <>
      <Head t="numbers" />
      <Row k="range" v={`${o.from} – ${o.to}`} />
      <Row k="rule" v={o.rule || "none"} />
      {o.rule && <Row k="matches" v={`${count} of ${o.to - o.from + 1}`} />}
      {o.rule && (
        <Row k="density" v={`${((count / (o.to - o.from + 1)) * 100).toFixed(1)}%`} />
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {RULES.map((x) => (
          <Btn key={x} onClick={() => update<StripObj>(o.id, { rule: x })}>{x}</Btn>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Btn onClick={() => update<StripObj>(o.id, { to: o.to * 2 })}>extend</Btn>
        <Btn onClick={() => update<StripObj>(o.id, { to: Math.max(o.from + 1, Math.floor(o.to / 2)) })}>halve</Btn>
        <Btn onClick={() => update<StripObj>(o.id, { perRow: o.perRow === 10 ? 12 : o.perRow === 12 ? 20 : 10 })}>
          {o.perRow} wide
        </Btn>
        <Btn onClick={() => update<StripObj>(o.id, { rule: "" })}>clear</Btn>
      </div>
    </>
  );
}

function ClockPanel({ o, update }: { o: ClockObj; update: Update }) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const order = o.n / g(o.step % o.n || o.n, o.n);
  const generators = Array.from({ length: o.n - 1 }, (_, i) => i + 1).filter(
    (k) => g(k, o.n) === 1,
  );
  const facts = numberFacts(o.n);
  return (
    <>
      <Head t={`Z_${o.n}`} />
      <Row k="step" v={o.step} />
      <Row k="order of ⟨k⟩" v={order} />
      <Row k="generator" v={order === o.n ? "yes" : "no"} />
      <Row k="φ(n)" v={facts.phi} />
      <Row k="generators" v={generators.length > 8 ? `${generators.length}` : generators.join(" ")} />
      <Row k="divisors" v={facts.divisors.join(" ")} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={() => update<ClockObj>(o.id, { step: (o.step % o.n) + 1 })}>step +1</Btn>
        <Btn onClick={() => update<ClockObj>(o.id, { step: 1 })}>reset</Btn>
        <Btn onClick={() => update<ClockObj>(o.id, { n: o.n + 1, step: Math.min(o.step, o.n) })}>n + 1</Btn>
        <Btn onClick={() => update<ClockObj>(o.id, { n: Math.max(2, o.n - 1), step: 1 })}>n − 1</Btn>
      </div>
    </>
  );
}


/** Properties that need a real algorithm: planarity, girth, diameter, cliques. */
function useGraphProps(o: GraphObj) {
  const [props, setProps] = useState<Record<string, unknown> | null>(null);
  const key = `${o.nodes.map((n) => n.id).join(",")}|${o.edges.map((e) => `${e.a}-${e.b}`).join(",")}`;

  useEffect(() => {
    let live = true;
    setProps(null);
    ops
      .graph(o.nodes.map((n) => n.id), o.edges.map((e) => [e.a, e.b] as [string, string]))
      .then((r) => live && !r.error && setProps(r as Record<string, unknown>))
      .catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return props as null | {
    planar?: boolean; girth?: number | null; diameter?: number;
    clique?: number; eulerian?: boolean;
  };
}
