"use client";

import { useEffect, useState } from "react";
import { COMMANDS } from "@/lib/commands";

/** Generated from the command registry, so it can never drift from reality. */
export function Help() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if (typing) return;
      if (e.key === "?") setOpen((o) => !o);
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = [...new Set(COMMANDS.map((c) => c.group))];

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute right-4 bottom-4 z-30 font-mono text-[10px] text-[var(--text-ghost)] hover:text-[var(--text-dim)]"
      >
        ?
      </button>
    );

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[80vh] w-[600px] overflow-y-auto rounded-[8px] border border-[var(--border)] bg-[var(--panel)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-[12px] tracking-[0.14em] text-[var(--text-dim)] uppercase">
            everything it knows
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-faint)]">? to close</span>
        </div>

        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[var(--text-faint)]">{g}</div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1">
              {COMMANDS.filter((c) => c.group === g).map((c) => (
                <div key={c.id} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[11px] text-[var(--text)]">{c.label}</span>
                  <span className="text-[10px] text-[var(--text-faint)]">{c.hint}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-5 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[var(--text-faint)]">
            anything else you type
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">
            Maths renders as maths — <span className="font-mono text-[var(--text)]">E &lt;= 3V - 6</span>,{" "}
            <span className="font-mono text-[var(--text)]">alpha + beta &gt;= pi</span>. Everything else
            stays exactly as you typed it, including{" "}
            <span className="font-mono text-[var(--text)]">WHY???</span>
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[var(--text-faint)]">working with it</div>
          <ul className="space-y-1 text-[11px] text-[var(--text-dim)]">
            <li>click empty space → type · ↑↓ pick a suggestion · tab to fill</li>
            <li>double-click any line to edit it</li>
            <li>select a line → simplify, factor, solve, differentiate, integrate</li>
            <li>
              <span className="text-[var(--accent-soft)]">shift-click two equations</span> → substitute or
              eliminate a variable
            </li>
            <li>graphs: drag a vertex · click two vertices to toggle an edge</li>
            <li>planes and surfaces: drag inside to pan or orbit, scroll to zoom</li>
            <li>paste or drop an image anywhere on the board</li>
            <li>scroll to pan · ⌘-scroll to zoom · backspace to delete</li>
            <li>drag an object by the ⋯ grip above it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
