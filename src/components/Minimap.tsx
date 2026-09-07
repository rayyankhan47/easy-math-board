"use client";

import { vh, vw } from "@/lib/viewport";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { objSize } from "@/lib/bounds";

const W = 168;
const H = 118;
const PAD = 14;

/** A whole-workspace overview. Drag the viewport box to fly around. */
export function Minimap() {
  const objs = useBoard((s) => s.objs);
  const pan = useBoard((s) => s.pan);
  const zoom = useBoard((s) => s.zoom);
  const selection = useBoard((s) => s.selection);
  const setView = useBoard((s) => s.setView);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // The viewport rectangle depends on the window size, which the server cannot
  // know — render nothing until we are on the client.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const view = useMemo(
    () => ({ x: -pan.x / zoom, y: -pan.y / zoom, w: vw() / zoom, h: vh() / zoom }),
    [pan, zoom],
  );

  // fit everything, plus where you are now, into the little frame
  const fit = useMemo(() => {
    const rects = objs.map((o) => ({ x: o.x, y: o.y, ...objSize(o) }));
    rects.push(view);
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const k = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
    return {
      k,
      ox: PAD - minX * k + ((W - PAD * 2) - spanX * k) / 2,
      oy: PAD - minY * k + ((H - PAD * 2) - spanY * k) / 2,
    };
  }, [objs, view]);

  const toBoard = (cx: number, cy: number) => {
    const r = box.current!.getBoundingClientRect();
    return {
      x: (cx - r.left - fit.ox) / fit.k,
      y: (cy - r.top - fit.oy) / fit.k,
    };
  };

  /** Centre the real viewport on a point in the map. */
  const flyTo = (cx: number, cy: number) => {
    const p = toBoard(cx, cy);
    setView({ x: vw() / 2 - p.x * zoom, y: vh() / 2 - p.y * zoom }, zoom);
  };

  if (!ready) return null;

  return (
    <div
      ref={box}
      className="absolute right-4 bottom-4 z-30 cursor-pointer overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--panel)]"
      style={{ width: W, height: H, boxShadow: "var(--shadow)" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        dragging.current = true;
        flyTo(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        e.stopPropagation();
        flyTo(e.clientX, e.clientY);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
      onWheel={(e) => e.stopPropagation()}
    >
      <svg width={W} height={H}>
        {objs.map((o) => {
          const s = objSize(o);
          const on = selection.includes(o.id);
          return (
            <rect
              key={o.id}
              x={o.x * fit.k + fit.ox}
              y={o.y * fit.k + fit.oy}
              width={Math.max(2.5, s.w * fit.k)}
              height={Math.max(2.5, s.h * fit.k)}
              rx={1.5}
              fill={on ? "var(--accent)" : "var(--text-ghost)"}
              opacity={on ? 0.95 : 0.75}
            />
          );
        })}
        <rect
          x={view.x * fit.k + fit.ox}
          y={view.y * fit.k + fit.oy}
          width={Math.max(6, view.w * fit.k)}
          height={Math.max(6, view.h * fit.k)}
          rx={2}
          fill="var(--accent)"
          fillOpacity={0.1}
          stroke="var(--accent)"
          strokeWidth={1}
        />
      </svg>
      {objs.length === 0 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-ghost)]">
          empty
        </span>
      )}
    </div>
  );
}
