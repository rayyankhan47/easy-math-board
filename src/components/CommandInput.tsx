"use client";

import { useState } from "react";
import { parse } from "@/lib/parse";
import { parseLocal } from "@/lib/parse/local";
import { useBoard } from "@/lib/store";

/** The one input. Type anything; the right object appears. */
export function CommandInput({
  at,
  onDone,
}: {
  at: { x: number; y: number };
  onDone: () => void;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const add = useBoard((s) => s.add);

  // Only shows when we'll actually need the network — so the pause is explained.
  const willAsk = v.trim().length > 0 && !parseLocal(v);

  async function commit() {
    const input = v.trim();
    if (!input) return onDone();
    setBusy(true);
    const spec = await parse(input);
    add(spec, at);
    onDone();
  }

  return (
    <div
      className="absolute z-20 flex items-center gap-2"
      style={{ left: at.x, top: at.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={v}
        disabled={busy}
        placeholder="graph 5 nodes · matrix 3x3 · E <= 3n-6"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") onDone();
        }}
        onBlur={() => !busy && onDone()}
        className="w-[42ch] border-b border-[#3a3d44] bg-transparent pb-1 font-mono text-[15px] text-[#e6e6e6] placeholder:text-[#4a4e57] outline-none focus:border-[#5b8def]"
      />
      <span className="w-16 font-mono text-[10px] tracking-wide text-[#4a4e57]">
        {busy ? "···" : willAsk ? "⏎ ask" : ""}
      </span>
    </div>
  );
}
