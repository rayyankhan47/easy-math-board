"use client";

import { useBoard } from "@/lib/store";
import { circleNodes, complete, pairsToEdges, degrees, components, bipartition, chromatic } from "@/lib/graphs";
import { numeric, rank, det, trace, tidy } from "@/lib/matrix";
import { checkGroup } from "@/lib/group";
import { rule, numberFacts } from "@/lib/predicates";
import { ops, useEngine } from "@/lib/engine";
import { useEffect, useState } from "react";
import { DEFAULT_STYLE, uid } from "@/lib/types";
import type {
  ClockObj, GraphObj, ImageObj, MatrixObj, PlaneObj, PlotObj, StripObj,
  SurfaceObj, TextObj, FontFamily, InkObj, ShapeObj,
} from "@/lib/types";
import { CURVE_INK } from "./objects/PlaneObject";
import { HIGHLIGHT_COLORS, INK_COLORS, SIZES } from "@/lib/ink";
import { shapeFacts, shapeName, tidy as sTidy } from "@/lib/shapes";
import { paramsIn } from "@/lib/axes";

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-[3px]">
    <span className="text-[11px] text-[var(--text-dim2)]">{k}</span>
    <span className="font-mono text-[12px] text-[var(--text)]">{v}</span>
  </div>
);

const Btn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="rounded-[3px] border border-[var(--border-strong)] px-2 py-1 text-[11px] text-[var(--text-dim)] transition-colors hover:border-[var(--text-ghost)] hover:text-[var(--text)]"
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
    <aside className="absolute top-4 right-4 z-30 w-60 rounded-[6px] border border-[var(--border)] bg-[var(--panel)]/95 p-3 backdrop-blur">
      {obj.kind === "graph" && <GraphPanel o={obj} update={update} />}
      {obj.kind === "matrix" && <MatrixPanel o={obj} update={update} />}
      {obj.kind === "plot" && <PlotPanel o={obj} update={update} />}
      {obj.kind === "strip" && <StripPanel o={obj} update={update} />}
      {obj.kind === "clock" && <ClockPanel o={obj} update={update} />}
      {obj.kind === "plane" && <PlanePanel o={obj} update={update} />}
      {obj.kind === "surface" && <SurfacePanel o={obj} update={update} />}
      {obj.kind === "image" && <ImagePanel o={obj} update={update} />}
      {obj.kind === "text" && <TextPanel o={obj} update={update} />}
      {obj.kind === "ink" && <InkPanel o={obj} update={update} />}
      {obj.kind === "shape" && <ShapePanel o={obj} update={update} />}
    </aside>
  );
}

const Head = ({ t }: { t: string }) => (
  <div className="mb-2 border-b border-[var(--border)] pb-2 text-[10px] tracking-[0.14em] text-[var(--text-faint)] uppercase">
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
      <div className="my-2 border-t border-[var(--border)]" />
      <Row k="3V−6" v={V >= 3 ? bound : "—"} />
      <Row
        k="planar"
        v={
          deep?.planar !== undefined ? (
            <span className={deep.planar ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
              {deep.planar ? "yes" : "no"}
              {!deep.planar && violatesEuler ? " · E > 3V−6" : ""}
            </span>
          ) : violatesEuler ? (
            <span className="text-[var(--danger)]">no · E &gt; 3V−6</span>
          ) : (
            <span className="text-[var(--text-faint)]">…</span>
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
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-ghost)]">
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
      <span className={b ? "text-[var(--ok)]" : "text-[var(--danger)]"}>{b ? "yes" : "no"}</span>
    );
    return (
      <>
        <Head t={o.label || "table"} />
        <Row k="order" v={rows} />
        <Row k="closed" v={yn(g.closed)} />
        <Row k="associative" v={yn(g.associative)} />
        <Row k="identity" v={g.identity ?? <span className="text-[var(--danger)]">none</span>} />
        <Row k="inverses" v={yn(g.allInverses)} />
        <Row k="commutative" v={yn(g.commutative)} />
        <div className="my-2 border-t border-[var(--border)]" />
        <Row k="group" v={yn(g.isGroup)} />
        {g.isGroup && <Row k="abelian" v={yn(g.commutative)} />}
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-ghost)]">
          edit any cell — the checks rerun
        </p>
      </>
    );
  }

  return (
    <>
      <Head t={o.label || "matrix"} />
      <Row
        k="size"
        v={
          <span className="flex items-center gap-1">
            <Num value={rows} onChange={(v) => resize(v, cols)} />
            <span className="text-[var(--text-faint)]">×</span>
            <Num value={cols} onChange={(v) => resize(rows, v)} />
          </span>
        }
      />
      {m ? (
        <>
          <Row k="rank" v={rank(m)} />
          <Row k="det" v={rows === cols ? (tidy(det(m) ?? 0) ?? "—") : "—"} />
          <Row k="trace" v={rows === cols ? tidy(trace(m) ?? 0) : "—"} />
        </>
      ) : (
        <Row k="entries" v={<span className="text-[var(--text-dim2)]">symbolic</span>} />
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


/* ------------------------------------------------------------------ text */

const FONTS: { id: FontFamily; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];

const INK = [
  { name: "default", value: null },
  { name: "grey", value: "#787774" },
  { name: "brown", value: "#9f6b53" },
  { name: "orange", value: "#d9730d" },
  { name: "yellow", value: "#cb912f" },
  { name: "green", value: "#0f7b6c" },
  { name: "blue", value: "#2383e2" },
  { name: "purple", value: "#9065b0" },
  { name: "pink", value: "#c14c8a" },
  { name: "red", value: "#d44c47" },
];

function TextPanel({ o, update }: { o: TextObj; update: Update }) {
  const st = o.style ?? DEFAULT_STYLE;
  const patch = (p: Partial<typeof st>) => update<TextObj>(o.id, { style: { ...st, ...p } });

  return (
    <>
      <Head t="text" />
      <Row k="renders as" v={o.latex ? "maths" : "note"} />

      <Label>font</Label>
      <div className="flex gap-1">
        {FONTS.map((f) => (
          <Toggle key={f.id} on={st.font === f.id} onClick={() => patch({ font: f.id })}>
            {f.label}
          </Toggle>
        ))}
      </div>

      <Label>size</Label>
      <div className="flex items-center gap-2">
        <input
          type="range" min={11} max={56} value={st.size}
          onChange={(e) => patch({ size: +e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-1 flex-1 accent-[var(--accent)]"
        />
        <span className="w-7 text-right font-mono text-[11px] text-[var(--text-dim)]">{st.size}</span>
      </div>

      <Label>style</Label>
      <div className="flex gap-1">
        <Toggle on={st.bold} onClick={() => patch({ bold: !st.bold })}>
          <span className="font-semibold">B</span>
        </Toggle>
        <Toggle on={st.italic} onClick={() => patch({ italic: !st.italic })}>
          <span className="italic">I</span>
        </Toggle>
      </div>

      <Label>colour</Label>
      <div className="flex flex-wrap gap-1.5">
        {INK.map((c) => (
          <button
            key={c.name}
            title={c.name}
            onClick={() => patch({ color: c.value })}
            className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
              st.color === c.value ? "border-[var(--accent)] ring-2 ring-[var(--accent-wash)]" : "border-[var(--border-strong)]"
            }`}
            style={{ background: c.value ?? "var(--text)" }}
          />
        ))}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- plane */

function PlanePanel({ o, update }: { o: PlaneObj; update: Update }) {
  const setCurve = (id: string, p: Partial<PlaneObj["curves"][number]>) =>
    update<PlaneObj>(o.id, { curves: o.curves.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  const addCurve = () =>
    update<PlaneObj>(o.id, {
      curves: [
        ...o.curves,
        { id: uid(), expr: "x", color: CURVE_INK[o.curves.length % CURVE_INK.length], on: true },
      ],
    });

  const params = paramsIn(o.curves.map((c) => c.expr));

  return (
    <>
      <Head t="plane" />
      <div className="space-y-1">
        {o.curves.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <button
              onClick={() => setCurve(c.id, { on: !c.on })}
              className="h-3 w-3 shrink-0 rounded-full border"
              style={{
                background: c.on ? c.color || CURVE_INK[i % CURVE_INK.length] : "transparent",
                borderColor: c.color || CURVE_INK[i % CURVE_INK.length],
              }}
              title={c.on ? "hide" : "show"}
            />
            <input
              value={c.expr}
              onChange={(e) => setCurve(c.id, { expr: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded-[3px] bg-[var(--inset)] px-1.5 py-1 font-mono text-[11px] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              onClick={() => update<PlaneObj>(o.id, { curves: o.curves.filter((x) => x.id !== c.id) })}
              className="shrink-0 px-1 text-[11px] text-[var(--text-ghost)] hover:text-[var(--danger)]"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addCurve}
        className="mt-1.5 w-full rounded-[4px] border border-dashed border-[var(--border-strong)] py-1 text-[11px] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        + curve
      </button>

      {params.length > 0 && (
        <>
          <Label>parameters</Label>
          {params.map((k) => (
            <div key={k} className="mb-1 flex items-center gap-2">
              <span className="w-3 font-mono text-[11px] text-[var(--text-dim)]">{k}</span>
              <input
                type="range" min={-10} max={10} step={0.1}
                value={o.params[k] ?? 1}
                onChange={(e) => update<PlaneObj>(o.id, { params: { ...o.params, [k]: +e.target.value } })}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-1 flex-1 accent-[var(--accent)]"
              />
              <span className="w-8 text-right font-mono text-[10px] tabular-nums text-[var(--text-dim)]">
                {(o.params[k] ?? 1).toFixed(1)}
              </span>
            </div>
          ))}
        </>
      )}

      <Label>view</Label>
      <div className="flex flex-wrap gap-1.5">
        <Btn onClick={() => update<PlaneObj>(o.id, { cx: 0, cy: 0, ppu: 34 })}>recentre</Btn>
        <Btn onClick={() => update<PlaneObj>(o.id, { ppu: o.ppu * 1.5 })}>zoom in</Btn>
        <Btn onClick={() => update<PlaneObj>(o.id, { ppu: o.ppu / 1.5 })}>zoom out</Btn>
        <Btn onClick={() => update<PlaneObj>(o.id, { w: o.w + 80, h: o.h + 60 })}>bigger</Btn>
        <Btn onClick={() => update<PlaneObj>(o.id, { w: Math.max(200, o.w - 80), h: Math.max(160, o.h - 60) })}>
          smaller
        </Btn>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-ghost)]">
        drag inside to pan · scroll to zoom
      </p>
    </>
  );
}

/* --------------------------------------------------------------- surface */

function SurfacePanel({ o, update }: { o: SurfaceObj; update: Update }) {
  return (
    <>
      <Head t="3d surface" />
      <Label>z = f(x, y)</Label>
      <input
        value={o.expr}
        onChange={(e) => update<SurfaceObj>(o.id, { expr: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-full rounded-[3px] bg-[var(--inset)] px-1.5 py-1 font-mono text-[11px] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
      <div className="mt-2">
        <Row k="range" v={`±${o.range}`} />
        <Row k="grid" v={`${o.res} × ${o.res}`} />
      </div>
      <Label>detail</Label>
      <input
        type="range" min={10} max={54} step={2} value={o.res}
        onChange={(e) => update<SurfaceObj>(o.id, { res: +e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        className="h-1 w-full accent-[var(--accent)]"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={() => update<SurfaceObj>(o.id, { wire: !o.wire })}>{o.wire ? "solid" : "wireframe"}</Btn>
        <Btn onClick={() => update<SurfaceObj>(o.id, { range: o.range * 1.5 })}>wider</Btn>
        <Btn onClick={() => update<SurfaceObj>(o.id, { range: Math.max(0.5, o.range / 1.5) })}>narrower</Btn>
        <Btn onClick={() => update<SurfaceObj>(o.id, { yaw: 0.7, pitch: 0.5, zoom: 1 })}>reset view</Btn>
        <Btn onClick={() => update<SurfaceObj>(o.id, { w: o.w + 80, h: o.h + 60 })}>bigger</Btn>
        <Btn onClick={() => update<SurfaceObj>(o.id, { w: Math.max(200, o.w - 80), h: Math.max(160, o.h - 60) })}>
          smaller
        </Btn>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- image */

function ImagePanel({ o, update }: { o: ImageObj; update: Update }) {
  const scale = (f: number) =>
    update<ImageObj>(o.id, { w: Math.round(o.w * f), h: Math.round(o.h * f) });
  return (
    <>
      <Head t="image" />
      <Row k="size" v={`${o.w} × ${o.h}`} />
      {o.alt && <Row k="name" v={<span className="truncate">{o.alt}</span>} />}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn onClick={() => scale(1.25)}>bigger</Btn>
        <Btn onClick={() => scale(0.8)}>smaller</Btn>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- shared */

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 mb-1.5 text-[10px] tracking-wide text-[var(--text-faint)]">{children}</div>
);

const Toggle = ({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex-1 rounded-[4px] border px-2 py-1 text-[11px] transition-colors ${
      on
        ? "border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]"
        : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-strong)]"
    }`}
  >
    {children}
  </button>
);


/* ------------------------------------------------------------------- ink */

function InkPanel({ o, update }: { o: InkObj; update: Update }) {
  const palette = o.tool === "highlighter" ? HIGHLIGHT_COLORS : INK_COLORS;
  return (
    <>
      <Head t={o.tool} />
      <Row k="points" v={o.points.length} />

      <Label>colour</Label>
      <div className="flex flex-wrap gap-1.5">
        {palette.map((c) => (
          <button
            key={c}
            onClick={() => update<InkObj>(o.id, { color: c })}
            className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
              o.color === c ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]" : "ring-1 ring-[var(--border-strong)]"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <Label>nib</Label>
      <div className="flex gap-1.5">
        {SIZES.map((s) => {
          const v = o.tool === "highlighter" ? s * 3 : s;
          return (
            <Btn key={s} onClick={() => update<InkObj>(o.id, { size: v })}>
              {o.size === v ? `● ${s}` : String(s)}
            </Btn>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-ghost)]">
        strokes are kept exactly as drawn
      </p>
    </>
  );
}


/** A number you can type into or nudge with the arrow keys. */
function Num({
  value, onChange, min = 1, max = 12,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
      }}
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-9 rounded-[3px] border border-[var(--border)] bg-[var(--inset)] px-1 py-0.5 text-center font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
    />
  );
}


/* ----------------------------------------------------------------- shape */

function ShapePanel({ o, update }: { o: ShapeObj; update: Update }) {
  const r = Math.max(8, Math.min(o.w, o.h) / 2 - 6);
  const f = shapeFacts(o.sides, r);
  const circle = o.sides === 0;

  const setSides = (n: number) =>
    update<ShapeObj>(o.id, { sides: n === 0 ? 0 : Math.max(3, Math.min(60, n)), showVertices: n >= 3 });
  const setRadius = (v: number) => {
    const s = Math.max(24, Math.min(600, v)) * 2 + 12;
    update<ShapeObj>(o.id, { w: s, h: s });
  };

  return (
    <>
      <Head t={shapeName(o.sides)} />

      <Row
        k="sides"
        v={
          <span className="flex items-center gap-1">
            <Num value={o.sides} min={0} max={60} onChange={setSides} />
            <button
              onClick={() => setSides(circle ? 6 : 0)}
              className="rounded-[3px] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              {circle ? "n-gon" : "circle"}
            </button>
          </span>
        }
      />
      <Row k="radius" v={<Num value={Math.round(r)} min={24} max={600} onChange={setRadius} />} />

      <div className="my-2 border-t border-[var(--border)]" />

      {circle ? (
        <>
          <Row k="circumference" v={sTidy(f.perimeter)} />
          <Row k="area" v={sTidy(f.area)} />
        </>
      ) : (
        <>
          <Row k="side" v={sTidy(f.side)} />
          <Row k="apothem" v={sTidy(f.apothem)} />
          <Row k="perimeter" v={sTidy(f.perimeter)} />
          <Row k="area" v={sTidy(f.area)} />
          <Row k="interior ∠" v={`${sTidy(f.interior)}°`} />
          <Row k="exterior ∠" v={`${sTidy(f.exterior)}°`} />
          <Row k="diagonals" v={f.diagonals} />
          <Row
            k="constructible"
            v={
              <span className={f.constructible ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
                {f.constructible ? "yes" : "no"}
              </span>
            }
          />
        </>
      )}

      {!circle && (
        <>
          <Label>rotation</Label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={360} value={Math.round((o.rotation * 180) / Math.PI)}
              onChange={(e) => update<ShapeObj>(o.id, { rotation: (+e.target.value * Math.PI) / 180 })}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-1 flex-1 accent-[var(--accent)]"
            />
            <span className="w-8 text-right font-mono text-[10px] text-[var(--text-dim)]">
              {Math.round((o.rotation * 180) / Math.PI)}°
            </span>
          </div>
        </>
      )}

      <Label>show</Label>
      <div className="flex flex-wrap gap-1.5">
        <Toggle on={o.showVertices} onClick={() => update<ShapeObj>(o.id, { showVertices: !o.showVertices })}>
          vertices
        </Toggle>
        <Toggle on={o.showCircum} onClick={() => update<ShapeObj>(o.id, { showCircum: !o.showCircum })}>
          circumcircle
        </Toggle>
      </div>
      {!circle && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Toggle on={o.showIn} onClick={() => update<ShapeObj>(o.id, { showIn: !o.showIn })}>
            incircle
          </Toggle>
          <Toggle on={o.showDiagonals} onClick={() => update<ShapeObj>(o.id, { showDiagonals: !o.showDiagonals })}>
            diagonals
          </Toggle>
        </div>
      )}

      <Label>fill</Label>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => update<ShapeObj>(o.id, { fill: null })}
          className={`h-5 w-5 rounded-full border border-dashed border-[var(--border-strong)] text-[9px] text-[var(--text-faint)] ${
            o.fill === null ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]" : ""
          }`}
          title="no fill"
        >
          ∅
        </button>
        {INK_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => update<ShapeObj>(o.id, { fill: `${c}33`, stroke: c })}
            className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
              o.stroke === c ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]" : "ring-1 ring-[var(--border-strong)]"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </>
  );
}
