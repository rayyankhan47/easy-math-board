"use client";

import { vh, vw } from "@/lib/viewport";

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
import { InkObject } from "./objects/InkObject";
import { InkPalette } from "./InkPalette";
import { ActionPalette } from "./ActionPalette";
import { strokeHit, strokePath } from "@/lib/ink";
import { SettingsButton } from "./Settings";
import { Minimap } from "./Minimap";
import { ResizeHandles } from "./ResizeHandles";
import { useSettings, SCALE } from "@/lib/settings";
import { objSize } from "@/lib/bounds";
import { imageFrom, storeImage } from "@/lib/images";
import { Toolbar } from "./Toolbar";
import { ShareBar } from "./ShareBar";
import { Cursors } from "./Cursors";
import { publishCursor } from "@/lib/collab";
import type { Obj } from "@/lib/types";

export function Board() {
  const { objs, pan, zoom, selection, select, move, remove, setView, hydrate } = useBoard();
  const [caret, setCaret] = useState<{ x: number; y: number } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const panning = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const marquee = useRef<{ x: number; y: number } | null>(null);
  const drawing = useRef<[number, number, number][] | null>(null);
  const [wet, setWet] = useState<[number, number, number][] | null>(null);
  const erasing = useRef(false);
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [space, setSpace] = useState(false);
  const tool = useSettings((s) => s.tool);
  const settings = useSettings();
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
      x: (vw() / 2 - pan.x) / zoom,
      y: (vh() / 2 - pan.y) / zoom,
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
        if (settings.confirmDelete && !confirm(`Delete ${selection.length} object(s)?`)) return;
        selection.forEach(remove);
      }
      if (!caret && !e.metaKey && !e.ctrlKey) {
        const keys: Record<string, string> = {
          v: "select", h: "move", p: "pen", m: "highlighter", a: "arrow", e: "eraser",
        };
        const t = keys[e.key.toLowerCase()];
        if (t) useSettings.getState().setTool(t as never);
      }
      if (e.code === "Space" && !caret) setSpace(true);
    };
    const onUp = (e: KeyboardEvent) => e.code === "Space" && setSpace(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [selection, caret, remove, select, settings.confirmDelete]);

  function onSurfaceDown(e: React.PointerEvent) {
    // Chrome (toolbar, panels, minimap) stops propagation itself; anything that
    // reaches here is genuinely the empty canvas.
    if (e.target !== e.currentTarget) return;
    select(null);
    setCaret(null);
    const w = toWorld(e.clientX, e.clientY);
    if (tool === "move" || space || e.button === 1) {
      panning.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
    } else if (tool === "pen" || tool === "highlighter" || tool === "arrow") {
      drawing.current = [[w.x, w.y, e.pressure || 0.5]];
      setWet(drawing.current);
    } else if (tool === "eraser") {
      erasing.current = true;
      erase(w.x, w.y);
    } else {
      marquee.current = w;
      setBand({ ...w, w: 0, h: 0 });
    }
  }

  function onMove(e: React.PointerEvent) {
    const w = toWorld(e.clientX, e.clientY);
    publishCursor(w.x, w.y);
    if (panning.current) {
      const p = panning.current;
      setView({ x: p.ox + (e.clientX - p.px), y: p.oy + (e.clientY - p.py) }, zoom);
    } else if (drawing.current) {
      drawing.current = [...drawing.current, [w.x, w.y, e.pressure || 0.5]];
      setWet(drawing.current);
    } else if (erasing.current) {
      erase(w.x, w.y);
    } else if (marquee.current) {
      const a = marquee.current;
      setBand({
        x: Math.min(a.x, w.x), y: Math.min(a.y, w.y),
        w: Math.abs(w.x - a.x), h: Math.abs(w.y - a.y),
      });
    } else if (dragging.current) {
      const d = dragging.current;
      const g = settings.snap ? settings.gridSize : 0;
      const nx = w.x - d.ox;
      const ny = w.y - d.oy;
      move(d.id, g ? Math.round(nx / g) * g : nx, g ? Math.round(ny / g) * g : ny);
    }
  }

  function onUp(e: React.PointerEvent) {
    // A click with no drag on empty canvas opens the caret there.
    if (panning.current) {
      const p = panning.current;
      const still = Math.abs(e.clientX - p.px) < 3 && Math.abs(e.clientY - p.py) < 3;
      panning.current = null;
      if (still && settings.clickToType) setCaret(toWorld(e.clientX, e.clientY));
    }
    if (drawing.current) {
      const pts = drawing.current;
      drawing.current = null;
      setWet(null);
      // a tap is not a stroke
      if (pts.length > 1) {
        const ox = pts[0][0];
        const oy = pts[0][1];
        useBoard.getState().add(
          {
            kind: "ink",
            tool: tool as "pen" | "highlighter" | "arrow",
            points: pts.map(([x, y, p]) => [x - ox, y - oy, p] as [number, number, number]),
            color: tool === "highlighter" ? settings.highlightColor : settings.inkColor,
            size: tool === "highlighter" ? settings.inkSize * 3 : settings.inkSize,
          },
          { x: ox, y: oy },
        );
        select(null);
      }
    }
    erasing.current = false;
    if (marquee.current) {
      const a = marquee.current;
      const b = toWorld(e.clientX, e.clientY);
      marquee.current = null;
      setBand(null);
      const tiny = Math.abs(b.x - a.x) < 4 && Math.abs(b.y - a.y) < 4;
      if (tiny) {
        if (settings.clickToType) setCaret(b);
      } else {
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
        const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
        const hit = objs.filter((o) => {
          const sz = objSize(o);
          return o.x < x1 && o.x + sz.w > x0 && o.y < y1 && o.y + sz.h > y0;
        });
        useBoard.setState({ selection: hit.map((o) => o.id) });
      }
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

  /** Remove any stroke the eraser passes over. */
  function erase(x: number, y: number) {
    const r = 12 / zoom;
    for (const o of useBoard.getState().objs)
      if (o.kind === "ink" && strokeHit(o, x, y, r)) remove(o.id);
  }

  /**
   * Only these use drags of their own (panning a plane, orbiting a surface), so
   * only these need the frame to move them. Everything else drags from anywhere
   * that is not itself interactive.
   */
  const OWNS_INTERIOR = new Set(["plane", "surface"]);

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
      case "ink": return <InkObject o={o} />;
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
        backgroundImage:
          settings.grid === "dots"
            ? "radial-gradient(var(--dot) 1px, transparent 1px)"
            : settings.grid === "lines"
              ? "linear-gradient(var(--dot) 1px, transparent 1px), linear-gradient(90deg, var(--dot) 1px, transparent 1px)"
              : "none",
        backgroundSize: `${settings.gridSize * zoom}px ${settings.gridSize * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor:
          tool === "move" || space
            ? "grab"
            : tool === "eraser"
              ? "cell"
              : tool === "select"
                ? "default"
                : "crosshair",
        fontSize: `${SCALE[settings.uiScale] * 100}%`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {objs.map((o) => (
          <div
            key={o.id}
            className={`group absolute w-max rounded-[9px] transition-colors ${
              o.kind === "ink" ? "" : "cursor-grab p-[14px] active:cursor-grabbing"
            } ${
              selection.includes(o.id)
                ? "bg-[var(--grab-strong)] ring-2 ring-[var(--accent)]"
                : "hover:bg-[var(--grab)]"
            }`}
            style={{ left: o.x, top: o.y }}
            onPointerDown={(e) => {
              e.stopPropagation();
              select(o.id, e.shiftKey);
              setCaret(null);
              // The move tool drags anything, from anywhere.
              if (tool !== "move" && OWNS_INTERIOR.has(o.kind)) {
                // Otherwise these move by their frame or any zone marked as a
                // handle (their caption strip); the rest is the object's own.
                const el = e.target as Element;
                const onHandle = el === e.currentTarget || !!el.closest?.("[data-drag]");
                if (!onHandle) return;
              }
              const w = toWorld(e.clientX, e.clientY);
              dragging.current = { id: o.id, ox: w.x - o.x, oy: w.y - o.y };
            }}
          >
            {render(o)}
            {selection.length === 1 && selection[0] === o.id && "w" in o && "h" in o && (
              <ResizeHandles o={o as Extract<Obj, { w: number; h: number }>} />
            )}
          </div>
        ))}

        {wet && wet.length > 1 && (
          <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 25 }}>
            <path
              d={strokePath(wet, tool === "highlighter" ? "highlighter" : tool === "arrow" ? "arrow" : "pen",
                tool === "highlighter" ? settings.inkSize * 3 : settings.inkSize)}
              fill={tool === "highlighter" ? settings.highlightColor : settings.inkColor}
              opacity={tool === "highlighter" ? 0.42 : 1}
            />
          </svg>
        )}

        {band && (
          <div
            className="pointer-events-none absolute z-30 rounded-[2px] border border-[var(--accent)] bg-[var(--accent-wash)]"
            style={{ left: band.x, top: band.y, width: band.w, height: band.h }}
          />
        )}

        {caret && (
          // Keyed by position: opening a caret elsewhere must be a new instance,
          // otherwise React reuses this one and the old text is never written.
          <CommandInput
            key={`${caret.x},${caret.y}`}
            at={caret}
            onDone={() => setCaret(null)}
          />
        )}
        {!caret && <ActionPalette />}
        <Cursors />
      </div>

      <div
        className="absolute top-4 right-4 z-40 flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ShareBar />
        <SettingsButton />
      </div>

      <Toolbar onText={(at) => { select(null); setCaret(at); }} />
      <InkPalette />
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
      {settings.showMinimap && <Minimap />}
      <Help />
    </div>
  );
}
