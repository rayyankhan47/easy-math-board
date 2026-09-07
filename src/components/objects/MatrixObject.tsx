"use client";

import { useBoard } from "@/lib/store";
import type { MatrixObj } from "@/lib/types";

export function MatrixObject({ o }: { o: MatrixObj }) {
  const update = useBoard((s) => s.update);

  const setCell = (r: number, c: number, v: string) => {
    const cells = o.cells.map((row, i) =>
      i === r ? row.map((x, j) => (j === c ? v : x)) : row,
    );
    update<MatrixObj>(o.id, { cells });
  };

  const cols = o.cells[0]?.length ?? 0;

  return (
    <div className="flex items-stretch gap-1.5 select-none">
      {o.label && (
        <div className="self-center pr-1 font-mono text-[13px] text-[#8a8f98]">{o.label} =</div>
      )}
      <div className="w-2 rounded-l-[3px] border-y border-l border-[#3a3d44]" />
      <div
        className="grid gap-x-1 gap-y-0.5 py-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {o.cells.map((row, r) =>
          row.map((v, c) => (
            <input
              key={`${r}-${c}`}
              value={v}
              onChange={(e) => setCell(r, c, e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-[4ch] rounded-[3px] bg-transparent px-1 py-0.5 text-center font-mono text-[14px] text-[#e6e6e6] outline-none focus:bg-[#22242a]"
            />
          )),
        )}
      </div>
      <div className="w-2 rounded-r-[3px] border-y border-r border-[#3a3d44]" />
    </div>
  );
}
