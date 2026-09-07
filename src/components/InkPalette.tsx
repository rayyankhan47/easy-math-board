"use client";

import { useSettings } from "@/lib/settings";
import { HIGHLIGHT_COLORS, INK_COLORS, SIZES } from "@/lib/ink";

const DRAW = new Set(["pen", "highlighter", "arrow"]);

/** Colour and nib, shown only while a drawing tool is active. */
export function InkPalette() {
  const tool = useSettings((s) => s.tool);
  const inkColor = useSettings((s) => s.inkColor);
  const highlightColor = useSettings((s) => s.highlightColor);
  const size = useSettings((s) => s.inkSize);
  const update = useSettings((s) => s.update);

  if (!DRAW.has(tool)) return null;

  const highlighting = tool === "highlighter";
  const colors = highlighting ? HIGHLIGHT_COLORS : INK_COLORS;
  const current = highlighting ? highlightColor : inkColor;
  const setColor = (c: string) => update(highlighting ? "highlightColor" : "inkColor", c);

  return (
    <div
      className="absolute top-1/2 left-[60px] z-30 flex -translate-y-1/2 flex-col gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--panel)] p-2"
      style={{ boxShadow: "var(--shadow)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-3 gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`colour ${c}`}
            className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
              current === c
                ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]"
                : "ring-1 ring-[var(--border-strong)]"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="h-px bg-[var(--border)]" />

      <div className="flex flex-col items-center gap-1.5">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => update("inkSize", s)}
            aria-label={`nib ${s}`}
            className={`flex h-5 w-5 items-center justify-center rounded-[4px] ${
              size === s ? "bg-[var(--accent-wash)]" : "hover:bg-[var(--hover)]"
            }`}
          >
            <span
              className="rounded-full"
              style={{
                width: Math.min(14, s + 2),
                height: Math.min(14, s + 2),
                background: size === s ? "var(--accent)" : "var(--text-dim)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
