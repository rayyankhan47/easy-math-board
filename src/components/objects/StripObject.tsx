"use client";

import { useMemo } from "react";
import { rule } from "@/lib/predicates";
import type { StripObj } from "@/lib/types";

export function StripObject({ o }: { o: StripObj }) {
  const { cells, hits, label } = useMemo(() => {
    const r = rule(o.rule);
    const out: { n: number; on: boolean }[] = [];
    for (let i = o.from; i <= o.to; i++) out.push({ n: i, on: o.rule ? r.test(i) : false });
    return { cells: out, hits: out.filter((c) => c.on).length, label: r.label };
  }, [o]);

  return (
    <div className="select-none">
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${o.perRow}, 1fr)` }}
      >
        {cells.map((c) => (
          <div
            key={c.n}
            className={`w-[26px] rounded-[2px] py-[3px] text-center font-mono text-[10px] ${
              c.on
                ? "bg-[#5b8def]/22 text-[#9dc0ff]"
                : "text-[#4a4e57]"
            }`}
          >
            {c.n}
          </div>
        ))}
      </div>
      {o.rule && (
        <div className="mt-1.5 font-mono text-[10px] text-[#6b707a]">
          {label} · {hits} of {cells.length}
        </div>
      )}
    </div>
  );
}
