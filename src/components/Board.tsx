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
import { PlaneObject } from "./objects/PlaneObject";
import { SurfaceObject } from "./objects/SurfaceObject";
import { ImageObject } from "./objects/ImageObject";
import { ThemeToggle } from "./ThemeToggle";
import { imageFrom, storeImage } from "@/lib/images";
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

  // paste or drop an image anywhere on the board
  useEffect(() => {
    const centre = () => ({
      x: (window.innerWidth / 2 - pan.x) / zoom,
      y: (window.innerHeight / 2 - pan.y) / zoom,
    });
    const take = async (file: File, at: { x: number; y: number }) => {
      const { key, w, h } = await storeImage(file);
      useBoard.getState().add({ kind: "image", blobKey: key, w, h, alt: file.name }, at);
    };
    const onPaste = (e: ClipboardEvent) => {
      const f = imageFrom(e);
      if (f) { e.preventDefault(); void take(f, centre()); }
    };
    const onDrop = (e: DragEvent) => {
      const f = imageFrom(e);
      if (!f) return;
      e.preventDefault();
      const r = surface.current!.getBoundingClientRect();
      void take(f, { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom });
    };
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("paste", onPaste);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", stop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", stop);
    };
  }, [pan, zoom]);

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

  /** These handle their own pointer events inside, so they move by the grip. */
  const OWNS_INTERIOR = new Set(["plane", "surface", "graph", "matrix"]);

  const render = (o: Obj) => {
    switch (o.kind) {
      case "graph": return <GraphObject o={o} />;
      case "matrix": return <MatrixObject o={o} />;
      case "plot": return <PlotObject o={o} />;
      case "strip": return <StripObject o={o} />;
      case "clock": return <ClockObject o={o} />;
      case "plane": return <PlaneObject o={o} />;
      case "surface": return <SurfaceObject o={o} />;
      case "image": return <ImageObject o={o} />;
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
      className="relative h-screen w-screen overflow-hidden bg-[var(--bg)]"
      style={{
        backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1px)",
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
            className={`group absolute w-max rounded-[5px] p-1.5 ${
              selection.includes(o.id)
                ? "ring-1 ring-[var(--accent)]/60"
                : "hover:ring-1 hover:ring-[var(--border-strong)]"
            }`}
            style={{ left: o.x, top: o.y }}
            onPointerDown={(e) => {
              e.stopPropagation();
              select(o.id, e.shiftKey);
              setCaret(null);
              if (OWNS_INTERIOR.has(o.kind)) return;
              const w = toWorld(e.clientX, e.clientY);
              dragging.current = { id: o.id, ox: w.x - o.x, oy: w.y - o.y };
            }}
          >
            <button
              title="drag to move"
              onPointerDown={(e) => {
                e.stopPropagation();
                select(o.id, e.shiftKey);
                const w = toWorld(e.clientX, e.clientY);
                dragging.current = { id: o.id, ox: w.x - o.x, oy: w.y - o.y };
              }}
              className={`absolute -top-1 left-1/2 z-10 -translate-x-1/2 cursor-grab rounded-[3px] px-2 leading-none text-[var(--text-ghost)] transition-opacity hover:text-[var(--text-dim)] active:cursor-grabbing ${
                selection.includes(o.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <span className="text-[9px] tracking-[0.2em]">⋯</span>
            </button>
            {render(o)}
          </div>
        ))}

        {caret && <CommandInput at={caret} onDone={() => setCaret(null)} />}
      </div>

      <div className="absolute top-4 left-4 z-30">
        <ThemeToggle />
      </div>
      <Inspector />
      <OpsBar />

      {objs.length === 0 && !caret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-[13px] text-[var(--text-faint)]">click anywhere and start typing</p>
            <p className="mt-2 font-mono text-[11px] text-[var(--text-ghost)]">
              plot sin(x) · surface x^2 - y^2 · matrix 3x3 · primes to 100 · K5
            </p>
            <p className="mt-4 font-mono text-[10px] text-[var(--text-ghost)]">
              shift-click two equations to combine them · paste an image anywhere · ? for help
            </p>
          </div>
        </div>
      )}

      <EngineBadge />
      <Help />
    </div>
  );
}
