"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Escape discards; anything else — including clicking away — commits. */
  const cancelled = useRef(false);
  const committed = useRef(false);
  /** Kept current so the unmount handler sees the latest text, not a stale closure. */
  const latest = useRef("");
  latest.current = v;

  const hits = useMemo(() => suggest(v), [v]);
  const preview = useMemo(() => (v.trim() ? describe(parse(v)) : ""), [v]);

  const write = (text: string) => {
    if (cancelled.current || committed.current) return;
    const input = text.trim();
    if (!input) return;
    committed.current = true;
    add(parse(input), at);
  };

  const commit = (text: string) => {
    write(text);
    onDone();
  };

  /**
   * Dismissing the caret writes what you typed. Blur alone is not enough:
   * clicking the canvas unmounts this input before any blur can fire, so the
   * commit has to happen on the way out, whichever path got us here.
   */
  useEffect(
    () => () => write(latest.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commit(sel >= 0 && hits[sel] ? hits[sel].label : v);
    } else if (e.key === "Escape") {
      cancelled.current = true;
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
        className="w-[40ch] border-b border-[var(--text-ghost)] bg-transparent pb-1 font-mono text-[15px] text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
      />

      {preview && (
        <div className="mt-1 font-mono text-[10px] text-[var(--text-faint)]">→ {preview}</div>
      )}

      {hits.length > 0 && (
        <ul className="mt-1.5 w-[40ch] overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--panel)]/97 backdrop-blur">
          {hits.map((c, i) => (
            <li
              key={c.id}
              onMouseEnter={() => setSel(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(c.label);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-2.5 py-1.5 ${
                i === sel ? "bg-[var(--accent)]/12" : ""
              }`}
            >
              <span className="font-mono text-[12px] text-[var(--text)]">{c.label}</span>
              <span className="text-[10px] text-[var(--text-faint)]">{c.hint}</span>
            </li>
          ))}
        </ul>
      )}

      {hits.length > 0 && (
        <div className="mt-1 font-mono text-[9px] text-[var(--text-ghost)]">↑↓ pick · tab fill · ⏎ create</div>
      )}
    </div>
  );
}
