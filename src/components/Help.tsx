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
        className="absolute right-4 bottom-4 z-30 font-mono text-[10px] text-[#3a3d44] hover:text-[#8a8f98]"
      >
        ?
      </button>
    );

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#0e0f11]/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[80vh] w-[600px] overflow-y-auto rounded-[8px] border border-[#22242a] bg-[#141518] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-[12px] tracking-[0.14em] text-[#8a8f98] uppercase">
            everything it knows
          </h2>
          <span className="font-mono text-[10px] text-[#4a4e57]">? to close</span>
        </div>

        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[#4a4e57]">{g}</div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1">
              {COMMANDS.filter((c) => c.group === g).map((c) => (
                <div key={c.id} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[11px] text-[#e6e6e6]">{c.label}</span>
                  <span className="text-[10px] text-[#4a4e57]">{c.hint}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-5 border-t border-[#22242a] pt-3">
          <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[#4a4e57]">
            anything else you type
          </div>
          <p className="text-[11px] leading-relaxed text-[#8a8f98]">
            Maths renders as maths — <span className="font-mono text-[#e6e6e6]">E &lt;= 3V - 6</span>,{" "}
            <span className="font-mono text-[#e6e6e6]">alpha + beta &gt;= pi</span>. Everything else
            stays exactly as you typed it, including{" "}
            <span className="font-mono text-[#e6e6e6]">WHY???</span>
          </p>
        </div>

        <div className="mt-4 border-t border-[#22242a] pt-3">
          <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[#4a4e57]">working with it</div>
          <ul className="space-y-1 text-[11px] text-[#8a8f98]">
            <li>click empty space → type · ↑↓ pick a suggestion · tab to fill</li>
            <li>double-click any line to edit it</li>
            <li>select a line → simplify, factor, solve, differentiate, integrate</li>
            <li>
              <span className="text-[#9dc0ff]">shift-click two equations</span> → substitute or
              eliminate a variable
            </li>
            <li>graphs: drag a vertex · click two vertices to toggle an edge</li>
            <li>scroll to pan · ⌘-scroll to zoom · backspace to delete</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
