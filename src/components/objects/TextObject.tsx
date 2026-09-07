"use client";

import { useEffect, useRef, useState } from "react";
import { Tex } from "../Tex";
import { useBoard } from "@/lib/store";
import { parse } from "@/lib/commands";
import type { TextObj } from "@/lib/types";

export function TextObject({ o }: { o: TextObj }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(o.raw);
  const update = useBoard((s) => s.update);
  const remove = useBoard((s) => s.remove);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

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

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(o.raw);
            setEditing(false);
          }
        }}
        className="min-w-[8ch] bg-transparent font-mono text-[15px] text-[#e6e6e6] outline-none"
        style={{ width: `${Math.max(8, draft.length + 1)}ch` }}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(o.raw);
        setEditing(true);
      }}
      className={
        o.latex
          ? "text-[17px] leading-snug text-[#e6e6e6]"
          : "font-mono text-[14px] leading-snug whitespace-pre-wrap text-[#8a8f98]"
      }
    >
      {o.latex ? <Tex tex={o.latex} /> : o.raw}
    </div>
  );
}
