"use client";

import { useRef } from "react";
import { useBoard } from "@/lib/store";
import type { Obj } from "@/lib/types";

type Sized = Extract<Obj, { w: number; h: number }>;
const CORNERS = [
  ["nw", -1, -1, "nwse-resize"],
  ["ne", 1, -1, "nesw-resize"],
  ["sw", -1, 1, "nesw-resize"],
  ["se", 1, 1, "nwse-resize"],
] as const;

/**
 * Corner handles on a selected object. Proportions are kept by default;
 * hold shift to stretch freely.
 */
export function ResizeHandles({ o }: { o: Sized }) {
  const update = useBoard((s) => s.update);
  const move = useBoard((s) => s.move);
  const zoom = useBoard((s) => s.zoom);
  const start = useRef<{
    px: number; py: number; w: number; h: number; x: number; y: number;
  } | null>(null);

  return (
    <>
      {CORNERS.map(([id, dx, dy, cursor]) => (
        <div
          key={id}
          style={{
            cursor,
            left: dx < 0 ? -5 : undefined,
            right: dx > 0 ? -5 : undefined,
            top: dy < 0 ? -5 : undefined,
            bottom: dy > 0 ? -5 : undefined,
          }}
          className="absolute z-20 h-[10px] w-[10px] rounded-[2px] border border-[var(--accent)] bg-[var(--bg)]"
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as Element).setPointerCapture(e.pointerId);
            start.current = { px: e.clientX, py: e.clientY, w: o.w, h: o.h, x: o.x, y: o.y };
          }}
          onPointerMove={(e) => {
            const s = start.current;
            if (!s) return;
            const ratio = s.w / s.h;
            let w = Math.max(90, s.w + (dx * (e.clientX - s.px)) / zoom);
            let h = Math.max(70, s.h + (dy * (e.clientY - s.py)) / zoom);
            if (!e.shiftKey) {
              // keep proportions: let the larger change lead
              if (Math.abs(w - s.w) > Math.abs(h - s.h)) h = Math.max(70, w / ratio);
              else w = Math.max(90, h * ratio);
            }
            update<Sized>(o.id, { w: Math.round(w), h: Math.round(h) });
            // dragging a left/top corner also moves the origin
            move(
              o.id,
              dx < 0 ? s.x + (s.w - w) : s.x,
              dy < 0 ? s.y + (s.h - h) : s.y,
            );
          }}
          onPointerUp={() => (start.current = null)}
        />
      ))}
    </>
  );
}
