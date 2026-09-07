"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Tex } from "../Tex";
import { useBoard } from "@/lib/store";
import { parse } from "@/lib/commands";
import { atEnd, useMathGhost } from "@/lib/mathGhost";
import { Ghost } from "../Ghost";
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const ghost = useMathGhost(draft);
  const st = { ...DEFAULT_STYLE, ...(o.style ?? {}) };

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  // grow the field to fit while typing
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing, o.w, st.size]);

  const css: React.CSSProperties = {
    fontFamily: FONT_STACK[st.font],
    fontSize: st.size,
    fontWeight: st.bold ? 600 : 400,
    fontStyle: st.italic ? "italic" : "normal",
    color: st.color ?? undefined,
    textAlign: st.align,
    lineHeight: 1.5,
    width: o.w ?? undefined,
  };

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (!next) return remove(o.id);
    if (next === o.raw) return;
    const spec = parse(next);
    update<TextObj>(o.id, { raw: next, latex: spec.kind === "text" ? spec.latex : null });
  }

  if (editing)
    return (
      <span className="relative inline-block" style={{ width: o.w ?? undefined }}>
        <textarea
          ref={ref}
          value={draft}
          autoFocus
          rows={1}
          spellCheck={false}
          style={{
            ...css,
            width: o.w ?? `${Math.max(8, draft.length + (ghost?.length ?? 0) + 3)}ch`,
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "ArrowRight" && ghost && atEnd(ref.current)) {
              e.preventDefault();
              setDraft(draft + (draft.endsWith(" ") ? "" : " ") + ghost);
              return;
            }
            // Enter commits, as everywhere else; shift-enter breaks the line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(o.raw);
              setEditing(false);
            }
          }}
          className="min-w-[8ch] resize-none overflow-hidden bg-transparent text-[var(--text)] outline-none"
        />
        <Ghost value={draft} ghost={ghost} style={css} />
      </span>
    );

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(o.raw);
        setEditing(true);
      }}
      style={css}
      className={
        o.latex
          ? `text-[var(--text)] ${o.w ? "overflow-x-auto" : ""}`
          : "wrap-anywhere whitespace-pre-wrap text-[var(--text-dim)]"
      }
    >
      {o.latex ? <Tex tex={o.latex} /> : o.raw}
    </div>
  );
}
