"use client";

import { useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { GRAPH_R } from "@/lib/graphs";
import type { GraphObj } from "@/lib/types";

const PAD = 26;
const SIZE = GRAPH_R * 2 + PAD * 2;

export function GraphObject({ o }: { o: GraphObj }) {
  const update = useBoard((s) => s.update);
  const zoom = useBoard((s) => s.zoom);
  const select = useBoard((s) => s.select);
  const [pending, setPending] = useState<string | null>(null); // first click of an edge
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  const byId = Object.fromEntries(o.nodes.map((n) => [n.id, n]));

  function onNodeDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    select(o.id);
    const n = byId[id];
    moved.current = false;
    drag.current = { id, ox: e.clientX / zoom - n.x, oy: e.clientY / zoom - n.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onNodeMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    moved.current = true;
    const nodes = o.nodes.map((n) =>
      n.id === d.id ? { ...n, x: e.clientX / zoom - d.ox, y: e.clientY / zoom - d.oy } : n,
    );
    update<GraphObj>(o.id, { nodes });
  }

  /** A click that didn't drag is an edge gesture: pick a node, then a second. */
  function onNodeUp(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    drag.current = null;
    if (moved.current) return;
    if (pending === null) return setPending(id);
    if (pending === id) return setPending(null);

    const exists = o.edges.some(
      (x) => (x.a === pending && x.b === id) || (x.a === id && x.b === pending),
    );
    update<GraphObj>(o.id, {
      edges: exists
        ? o.edges.filter((x) => !((x.a === pending && x.b === id) || (x.a === id && x.b === pending)))
        : [...o.edges, { a: pending, b: id }],
    });
    setPending(null);
  }

  return (
    <svg
      width={SIZE}
      height={SIZE}
      className="overflow-visible select-none"
      onPointerMove={onNodeMove}
      onPointerUp={() => (drag.current = null)}
    >
      <g transform={`translate(${PAD},${PAD})`}>
        {o.edges.map((e, i) => {
          const a = byId[e.a];
          const b = byId[e.b];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--text-faint)"
              strokeWidth={1.25}
            />
          );
        })}
        {o.nodes.map((n) => {
          const on = pending === n.id;
          return (
            <g
              key={n.id}
              className="cursor-pointer"
              onPointerDown={(e) => onNodeDown(e, n.id)}
              onPointerUp={(e) => onNodeUp(e, n.id)}
            >
              <circle
                cx={n.x} cy={n.y} r={7.5}
                fill={on ? "var(--accent)" : "var(--inset)"}
                stroke={on ? "var(--accent)" : "var(--text-dim2)"}
                strokeWidth={1.5}
              />
              <text
                x={n.x} y={n.y - 13}
                textAnchor="middle"
                className="pointer-events-none fill-[var(--text-dim2)] font-mono text-[10px]"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
