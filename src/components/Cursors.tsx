"use client";

import { useCollab } from "@/lib/collab";

/** Other people's pointers, drawn in board coordinates. */
export function Cursors() {
  const peers = useCollab((s) => s.peers);

  return (
    <>
      {peers
        .filter((p) => p.active)
        .map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute z-40 transition-transform duration-75 ease-linear"
            style={{ left: p.x, top: p.y }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: p.color }}>
              <path
                d="M2 2l5.5 13 2-5.5 5.5-2z"
                fill="currentColor"
                stroke="var(--bg)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="absolute top-4 left-4 rounded-[4px] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white"
              style={{ background: p.color }}
            >
              {p.name}
            </span>
          </div>
        ))}
    </>
  );
}
