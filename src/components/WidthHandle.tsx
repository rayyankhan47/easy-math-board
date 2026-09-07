"use client";

import { useRef } from "react";
import { useBoard } from "@/lib/store";
import type { TextObj } from "@/lib/types";

/**
 * Text resizes in one dimension only — pull the right edge to set a width and
 * the text wraps. Double-click to go back to hugging its content.
 */
export function WidthHandle({ o }: { o: TextObj }) {
  const update = useBoard((s) => s.update);
  const zoom = useBoard((s) => s.zoom);
  const start = useRef<{ px: number; w: number } | null>(null);

  return (
    <div
      title="drag to set width · double-click for automatic"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        const el = (e.currentTarget.parentElement as HTMLElement)?.querySelector("div, span");
        start.current = { px: e.clientX, w: o.w ?? (el?.getBoundingClientRect().width ?? 200) / zoom };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        update<TextObj>(o.id, { w: Math.max(60, Math.round(s.w + (e.clientX - s.px) / zoom)) });
      }}
      onPointerUp={() => (start.current = null)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        update<TextObj>(o.id, { w: null });
      }}
      className="absolute top-1/2 -right-[7px] z-20 h-7 w-[7px] -translate-y-1/2 cursor-ew-resize rounded-full border border-[var(--accent)] bg-[var(--bg)]"
    />
  );
}
