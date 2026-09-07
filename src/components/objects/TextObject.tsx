"use client";

import { useEffect, useRef, useState } from "react";
import { Tex } from "../Tex";
import { useBoard } from "@/lib/store";
import { parse } from "@/lib/commands";
import { DEFAULT_STYLE, type TextObj } from "@/lib/types";

export const FONT_STACK = {
  sans: "ui-sans-serif, -apple-system, 'Segoe UI', Inter, sans-serif",
  serif: "ui-serif, Georgia, 'Iowan Old Style', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export function TextObject({ o }: { o: TextObj }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(o.raw);
  const update = useBoard((s) => s.update);
  const remove = useBoard((s) => s.remove);
  const ref = useRef<HTMLInputElement>(null);
  const st = o.style ?? DEFAULT_STYLE;

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const css: React.CSSProperties = {
    fontFamily: FONT_STACK[st.font],
    fontSize: st.size,
    fontWeight: st.bold ? 600 : 400,
    fontStyle: st.italic ? "italic" : "normal",
    color: st.color ?? undefined,
    lineHeight: 1.45,
  };

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (!next) return remove(o.id);
    if (next === o.raw) return;
    const spec = parse(next);
    update<TextObj>(o.id, {
      raw: next,
      latex: spec.kind === "text" ? spec.latex : null,
    });
  }

  if (editing)
    return (
      <input
        ref={ref}
        value={draft}
        autoFocus
        style={{ ...css, width: `${Math.max(8, draft.length + 1)}ch` }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(o.raw); setEditing(false); }
        }}
        className="min-w-[8ch] bg-transparent text-[var(--text)] outline-none"
      />
    );

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setDraft(o.raw); setEditing(true); }}
      style={css}
      className={
        o.latex
          ? "text-[var(--text)]"
          : "whitespace-pre-wrap text-[var(--text-dim)]"
      }
    >
      {o.latex ? <Tex tex={o.latex} /> : o.raw}
    </div>
  );
}
