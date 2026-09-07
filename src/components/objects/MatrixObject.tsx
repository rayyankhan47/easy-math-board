"use client";

import { useBoard } from "@/lib/store";
import type { MatrixObj } from "@/lib/types";

export function MatrixObject({ o }: { o: MatrixObj }) {
  const update = useBoard((s) => s.update);
  const select = useBoard((s) => s.select);
  const cols = o.cells[0]?.length ?? 0;

  const setCell = (r: number, c: number, v: string) =>
    update<MatrixObj>(o.id, {
      cells: o.cells.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)),
    });

  const cell = (v: string, r: number, c: number) => (
    <input
      key={`${r}-${c}`}
      value={v}
      onChange={(e) => setCell(r, c, e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => { e.stopPropagation(); select(o.id); }}
      className="w-[3.5ch] rounded-[3px] bg-transparent px-1 py-0.5 text-center font-mono text-[13px] text-[var(--text)] outline-none focus:bg-[var(--border)]"
    />
  );

  // A Cayley table gets headers and a rule corner rather than brackets.
  if (o.headers) {
    return (
      <div className="select-none">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="border-r border-b border-[var(--border-strong)] px-1.5 py-0.5 font-mono text-[11px] font-normal text-[var(--text-dim2)]">
                +
              </th>
              {o.headers.map((h) => (
                <th key={h} className="border-b border-[var(--border-strong)] px-1 py-0.5 font-mono text-[11px] font-normal text-[var(--text-dim2)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {o.cells.map((row, r) => (
              <tr key={r}>
                <th className="border-r border-[var(--border-strong)] px-1.5 font-mono text-[11px] font-normal text-[var(--text-dim2)]">
                  {o.headers![r]}
                </th>
                {row.map((v, c) => (
                  <td key={c}>{cell(v, r, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {o.label && <div className="mt-1 font-mono text-[10px] text-[var(--text-faint)]">{o.label}</div>}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-1.5 select-none">
      {o.label && (
        <div className="self-center pr-1 font-mono text-[13px] text-[var(--text-dim)]">{o.label} =</div>
      )}
      <div className="w-2 rounded-l-[3px] border-y border-l border-[var(--text-ghost)]" />
      <div
        className="grid gap-x-1 gap-y-0.5 py-1"
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
      >
        {o.cells.map((row, r) => row.map((v, c) => cell(v, r, c)))}
      </div>
      <div className="w-2 rounded-r-[3px] border-y border-r border-[var(--text-ghost)]" />
    </div>
  );
}
