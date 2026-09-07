"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { CommandInput } from "./CommandInput";
import { Inspector } from "./Inspector";
import { OpsBar } from "./OpsBar";
import { EngineBadge } from "./EngineBadge";
import { Help } from "./Help";
import { TextObject } from "./objects/TextObject";
import { GraphObject } from "./objects/GraphObject";
import { MatrixObject } from "./objects/MatrixObject";
import { PlotObject } from "./objects/PlotObject";
import { StripObject } from "./objects/StripObject";
import { ClockObject } from "./objects/ClockObject";
import type { Obj } from "@/lib/types";

export function Board() {
  const { objs, pan, zoom, selection, select, move, remove, setView, hydrate } = useBoard();
  const [caret, setCaret] = useState<{ x: number; y: number } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const panning = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const toWorld = (cx: number, cy: number) => {
    const r = surface.current!.getBoundingClientRect();
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  };

  // delete / escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCaret(null);
        select(null);
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selection.length && !caret) {
        e.preventDefault();
        selection.forEach(remove);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, caret, remove, select]);

  function onSurfaceDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget && !(e.target as Element).closest?.("[data-surface]")) return;
    select(null);
    setCaret(null);
    panning.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
  }

  function onMove(e: React.PointerEvent) {
    if (panning.current) {
      const p = panning.current;
      setView({ x: p.ox + (e.clientX - p.px), y: p.oy + (e.clientY - p.py) }, zoom);
    } else if (dragging.current) {
      const d = dragging.current;
      const w = toWorld(e.clientX, e.clientY);
      move(d.id, w.x - d.ox, w.y - d.oy);
    }
  }

  function onUp(e: React.PointerEvent) {
    // A click with no drag on empty canvas opens the caret there.
    if (panning.current) {
      const p = panning.current;
      const still = Math.abs(e.clientX - p.px) < 3 && Math.abs(e.clientY - p.py) < 3;
      panning.current = null;
      if (still) setCaret(toWorld(e.clientX, e.clientY));
    }
    dragging.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      const r = surface.current!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const next = Math.min(3, Math.max(0.25, zoom * (1 - e.deltaY / 400)));
      // keep the point under the cursor fixed
      setView(
        { x: mx - ((mx - pan.x) / zoom) * next, y: my - ((my - pan.y) / zoom) * next },
        next,
      );
    } else {
      setView({ x: pan.x - e.deltaX, y: pan.y - e.deltaY }, zoom);
    }
  }

  const render = (o: Obj) => {
    switch (o.kind) {
      case "graph": return <GraphObject o={o} />;
      case "matrix": return <MatrixObject o={o} />;
      case "plot": return <PlotObject o={o} />;
      case "strip": return <StripObject o={o} />;
      case "clock": return <ClockObject o={o} />;
      default: return <TextObject o={o} />;
    }
  };

  return (
    <div
      ref={surface}
      data-surface
      onPointerDown={onSurfaceDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={onWheel}
      className="relative h-screen w-screen overflow-hidden bg-[#0e0f11]"
      style={{
        backgroundImage: "radial-gradient(#1c1e23 1px, transparent 1px)",
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {objs.map((o) => (
          <div
            key={o.id}
            className={`absolute w-max rounded-[4px] p-1.5 ${
              selection.includes(o.id)
                ? "ring-1 ring-[#5b8def]/60"
                : "hover:ring-1 hover:ring-[#2b2e35]"
            }`}
            style={{ left: o.x, top: o.y }}
            onPointerDown={(e) => {
              e.stopPropagation();
              select(o.id, e.shiftKey);
              setCaret(null);
              const w = toWorld(e.clientX, e.clientY);
              dragging.current = { id: o.id, ox: w.x - o.x, oy: w.y - o.y };
            }}
          >
            {render(o)}
          </div>
        ))}

        {caret && <CommandInput at={caret} onDone={() => setCaret(null)} />}
      </div>

      <Inspector />
      <OpsBar />

      {objs.length === 0 && !caret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-[13px] text-[#4a4e57]">click anywhere and start typing</p>
            <p className="mt-2 font-mono text-[11px] text-[#2f323a]">
              K5 · matrix 3x3 · plot sin(x)/x · primes to 100 · clock 12 · V - E + F = 2
            </p>
            <p className="mt-4 font-mono text-[10px] text-[#26282e]">
              shift-click two equations to combine them
            </p>
          </div>
        </div>
      )}

      <EngineBadge />
      <Help />
    </div>
  );
}
