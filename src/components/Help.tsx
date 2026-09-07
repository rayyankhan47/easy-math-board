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
            <span className="font-mono text-[var(--text)]">WHY???</span>. Shapes know their own
            geometry — a <span className="font-mono text-[var(--text)]">polygon 17</span> will tell
            you it is constructible with compass and straightedge, and a{" "}
            <span className="font-mono text-[var(--text)]">7-gon</span> that it is not
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 font-mono text-[10px] tracking-wide text-[var(--text-faint)]">working with it</div>
          <ul className="space-y-1 text-[11px] text-[var(--text-dim)]">
            <li>click empty space → type · ↑↓ pick a suggestion · tab to fill</li>
            <li>double-click any line to edit it</li>
            <li>
              select something and press <span className="font-mono">/</span> — the menu changes to
              match what you picked: derivative, integral, plot it, adjacency matrix, determinant…
            </li>
            <li>select a line → simplify, factor, solve, differentiate, integrate</li>
            <li>
              <span className="text-[var(--accent-soft)]">shift-click two equations</span> → substitute or
              eliminate a variable
            </li>
            <li>graphs: drag a vertex · click two vertices to toggle an edge</li>
            <li>planes and surfaces: drag inside to pan or orbit, scroll to zoom</li>
            <li>paste or drop an image anywhere on the board</li>
            <li>scroll to pan · ⌘-scroll to zoom · backspace to delete</li>
            <li>drag an object by the soft frame around it</li>
            <li>clicking away commits what you typed — escape discards it</li>
            <li>
              type <span className="font-mono">1 + 2 =</span> and the answer appears ahead of the
              caret — <span className="font-mono">→</span> accepts it, anything else ignores it
            </li>
            <li>
              <span className="font-mono">ctrl/⌘ Z</span> undoes anything ·{" "}
              <span className="font-mono">⇧</span> to redo
            </li>
            <li>ink is picked out with a dashed outline; only the stroke itself is clickable</li>
            <li>the left toolbar spawns anything — hover an icon for what it is</li>
            <li>
              <span className="font-mono">V</span> select ·{" "}
              <span className="font-mono">H</span> move · hold{" "}
              <span className="font-mono">space</span> to pan from any tool
            </li>
            <li>drag a box over empty canvas to select several at once</li>
            <li>drag a corner of a selected object to resize — shift stretches freely</li>
            <li>the minimap in the corner jumps you anywhere on the board</li>
            <li>
              <span className="font-mono">P</span> pen ·{" "}
              <span className="font-mono">M</span> highlighter ·{" "}
              <span className="font-mono">A</span> arrow ·{" "}
              <span className="font-mono">E</span> eraser
            </li>
            <li>scribble over anything — strokes are kept exactly as drawn</li>
            <li>
              <span className="text-[var(--accent-soft)]">Share</span> makes a link; anyone who
              opens it joins the same board, with their own cursor
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
