"use client";

import { useMemo, useState } from "react";
import { describe, parse, suggest } from "@/lib/commands";
import { useBoard } from "@/lib/store";

/**
 * The one input. Type anything; the right object appears. Suggestions make the
 * command set discoverable, so nothing has to be memorised first.
 */
export function CommandInput({
  at,
  onDone,
}: {
  at: { x: number; y: number };
  onDone: () => void;
}) {
  const [v, setV] = useState("");
  const [sel, setSel] = useState(-1);
  const add = useBoard((s) => s.add);

  const hits = useMemo(() => suggest(v), [v]);
  const preview = useMemo(() => (v.trim() ? describe(parse(v)) : ""), [v]);

  const commit = (text: string) => {
    const input = text.trim();
    if (input) add(parse(input), at);
    onDone();
  };

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commit(sel >= 0 && hits[sel] ? hits[sel].label : v);
    } else if (e.key === "Escape") {
      onDone();
    } else if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setSel((s) => (s + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setSel((s) => (s <= 0 ? hits.length - 1 : s - 1));
    } else if (e.key === "Tab" && hits.length) {
      e.preventDefault();
      setV(hits[Math.max(0, sel)].label);
      setSel(-1);
    }
  }

  return (
    <div
      className="absolute z-20"
      style={{ left: at.x, top: at.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={v}
        placeholder="type anything"
        onChange={(e) => {
          setV(e.target.value);
          setSel(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(onDone, 120)}
        className="w-[40ch] border-b border-[#3a3d44] bg-transparent pb-1 font-mono text-[15px] text-[#e6e6e6] placeholder:text-[#4a4e57] outline-none focus:border-[#5b8def]"
      />

      {preview && (
        <div className="mt-1 font-mono text-[10px] text-[#4a4e57]">→ {preview}</div>
      )}

      {hits.length > 0 && (
        <ul className="mt-1.5 w-[40ch] overflow-hidden rounded-[5px] border border-[#22242a] bg-[#141518]/97 backdrop-blur">
          {hits.map((c, i) => (
            <li
              key={c.id}
              onMouseEnter={() => setSel(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(c.label);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-2.5 py-1.5 ${
                i === sel ? "bg-[#5b8def]/12" : ""
              }`}
            >
              <span className="font-mono text-[12px] text-[#e6e6e6]">{c.label}</span>
              <span className="text-[10px] text-[#4a4e57]">{c.hint}</span>
            </li>
          ))}
        </ul>
      )}

      {hits.length > 0 && (
        <div className="mt-1 font-mono text-[9px] text-[#2f323a]">↑↓ pick · tab fill · ⏎ create</div>
      )}
    </div>
  );
}
