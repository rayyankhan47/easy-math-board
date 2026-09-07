"use client";

import { vh, vw } from "@/lib/viewport";

import { useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { parse } from "@/lib/commands";
import { storeImage } from "@/lib/images";
import type { Spec } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { objSize } from "@/lib/bounds";

/* Hand-drawn 16px glyphs — no icon dependency, and they inherit the theme. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Icons = {
  text: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <path d="M3 4V3h10v1M8 3v10M6 13h4" />
    </svg>
  ),
  plane: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <path d="M2 13h12M8 2v12" opacity="0.45" />
      <path d="M2 11c2.5 0 3-7 6-7s3.5 5 6 5" />
    </svg>
  ),
  surface: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <path d="M1.5 9.5 8 6l6.5 3.5L8 13z" />
      <path d="M1.5 9.5 8 13v-3M14.5 9.5 8 6v4" opacity="0.45" />
      <path d="M4.5 4.2 8 2.5l3.5 1.7" opacity="0.55" />
    </svg>
  ),
  graph: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <circle cx="8" cy="3" r="1.6" />
      <circle cx="3" cy="12" r="1.6" />
      <circle cx="13" cy="12" r="1.6" />
      <path d="M8 4.6 4 10.6M8 4.6l4 6M4.6 12h6.8" />
    </svg>
  ),
  matrix: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <path d="M5 2H3v12h2M11 2h2v12h-2" />
      <circle cx="6.5" cy="6" r="0.6" fill="currentColor" />
      <circle cx="9.5" cy="6" r="0.6" fill="currentColor" />
      <circle cx="6.5" cy="10" r="0.6" fill="currentColor" />
      <circle cx="9.5" cy="10" r="0.6" fill="currentColor" />
    </svg>
  ),
  numbers: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <rect x="1.5" y="4" width="4" height="4" rx="1" />
      <rect x="6.5" y="4" width="4" height="4" rx="1" />
      <rect x="11.5" y="4" width="3" height="4" rx="1" />
      <rect x="1.5" y="9" width="4" height="4" rx="1" opacity="0.45" />
      <rect x="6.5" y="9" width="4" height="4" rx="1" opacity="0.45" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 2" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="5.8" cy="6.5" r="1" />
      <path d="M2.5 11.5 6 8.5l2.5 2L11 8l3 3" />
    </svg>
  ),
};

interface Tool {
  id: keyof typeof Icons;
  name: string;
  hint: string;
  spawn?: string;
}

const TOOLS: Tool[] = [
  { id: "text", name: "Text", hint: "type maths or a note", spawn: "" },
  { id: "plane", name: "Plane", hint: "Cartesian axes — pan, zoom, add curves", spawn: "plane" },
  { id: "surface", name: "3D surface", hint: "z = f(x, y), drag to orbit", spawn: "surface x^2 - y^2" },
  { id: "graph", name: "Graph", hint: "vertices and edges", spawn: "graph 6 nodes" },
  { id: "matrix", name: "Matrix", hint: "editable grid", spawn: "matrix 3x3" },
  { id: "numbers", name: "Numbers", hint: "integer strip — primes, residues, divisors", spawn: "primes to 100" },
  { id: "clock", name: "Modular clock", hint: "Z_n as a dial", spawn: "clock 12" },
  { id: "image", name: "Image", hint: "or just paste one anywhere" },
];

export function Toolbar({ onText }: { onText: (at: { x: number; y: number }) => void }) {
  const add = useBoard((s) => s.add);
  const pan = useBoard((s) => s.pan);
  const zoom = useBoard((s) => s.zoom);
  const file = useRef<HTMLInputElement>(null);
  const tool = useSettings((s) => s.tool);
  const setTool = useSettings((s) => s.setTool);

  /**
   * Drop new objects left of centre so the properties panel doesn't cover them,
   * cascading down-right past anything already sitting there.
   */
  const where = () => {
    let x = (vw() * 0.42 - pan.x) / zoom;
    let y = (vh() * 0.32 - pan.y) / zoom;
    // Step past anything already there, measuring real footprints so large
    // objects do not end up stacked.
    const taken = useBoard.getState().objs.map((o) => ({ x: o.x, y: o.y, ...objSize(o) }));
    for (let i = 0; i < 60; i++) {
      const hit = taken.find(
        (r) => x < r.x + r.w + 16 && x + 300 > r.x && y < r.y + r.h + 16 && y + 220 > r.y,
      );
      if (!hit) break;
      x = hit.x + hit.w + 28;
      if (x > (vw() - pan.x) / zoom - 260) {
        x = (vw() * 0.14 - pan.x) / zoom;
        y = hit.y + hit.h + 28;
      }
    }
    return { x, y };
  };

  const click = (t: Tool) => {
    if (t.id === "image") return file.current?.click();
    if (t.spawn === "") return onText(where());
    add(parse(t.spawn!) as Spec, where());
  };

  return (
    <>
      <div
        className="absolute top-1/2 left-3 z-30 flex -translate-y-1/2 flex-col gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel)] p-1"
        style={{ boxShadow: "var(--shadow)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Tip name="Select" hint="drag a box to pick several — V">
          <ToolBtn on={tool === "select"} label="Select" onClick={() => setTool("select")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M3 2l4.5 11 1.8-4.7L14 6.5z" />
            </svg>
          </ToolBtn>
        </Tip>
        <Tip name="Move" hint="drag to pan the board — H, or hold space">
          <ToolBtn on={tool === "move"} label="Move" onClick={() => setTool("move")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M8 1.5v13M1.5 8h13M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" />
            </svg>
          </ToolBtn>
        </Tip>

        <Tip name="Pen" hint="draw freehand — P">
          <ToolBtn on={tool === "pen"} label="Pen" onClick={() => setTool("pen")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M11.5 2.2 13.8 4.5 5.6 12.7 2.4 13.6l0.9-3.2z" />
              <path d="M10 3.7l2.3 2.3" />
            </svg>
          </ToolBtn>
        </Tip>
        <Tip name="Highlighter" hint="wide translucent marker — M">
          <ToolBtn on={tool === "highlighter"} label="Highlighter" onClick={() => setTool("highlighter")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M4 10.5 9.8 4.7a1.6 1.6 0 0 1 2.3 0l0.8 0.8a1.6 1.6 0 0 1 0 2.3L7.1 13.6H4.3z" />
              <path d="M2.5 14.2h11" strokeWidth="2" />
            </svg>
          </ToolBtn>
        </Tip>
        <Tip name="Arrow" hint="draw a line that points — A">
          <ToolBtn on={tool === "arrow"} label="Arrow" onClick={() => setTool("arrow")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M2.5 13C5 9.5 8 5.5 13 3" />
              <path d="M9.2 2.4 13.2 2.9 12.7 6.9" />
            </svg>
          </ToolBtn>
        </Tip>
        <Tip name="Eraser" hint="drag over strokes to remove them — E">
          <ToolBtn on={tool === "eraser"} label="Eraser" onClick={() => setTool("eraser")}>
            <svg viewBox="0 0 16 16" width="16" height="16" {...S}>
              <path d="M6.4 13.5 2.6 9.7a1.2 1.2 0 0 1 0-1.7l5.6-5.6a1.2 1.2 0 0 1 1.7 0l3.6 3.6a1.2 1.2 0 0 1 0 1.7l-5.4 5.8z" />
              <path d="M13.5 13.5h-7" />
            </svg>
          </ToolBtn>
        </Tip>

        <div className="my-1 h-px bg-[var(--border)]" />

        {TOOLS.map((t) => (
          <Tip key={t.id} name={t.name} hint={t.hint}>
            <button
              onClick={() => click(t)}
              aria-label={t.name}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--text-dim)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              {Icons[t.id]}
            </button>
          </Tip>
        ))}
      </div>

      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const { key, w, h } = await storeImage(f);
          add({ kind: "image", blobKey: key, w, h, alt: f.name }, where());
          e.target.value = "";
        }}
      />
    </>
  );
}

/** Appears after a beat of hovering, the way a real toolbar does. */
function Tip({ name, hint, children }: { name: string; hint: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const enabled = useSettings((s) => s.showTooltips);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = () => {
    if (!enabled) return;
    timer.current = setTimeout(() => setShow(true), 700);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {show && (
        <div
          className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-[6px] border border-[var(--border)] bg-[var(--panel-solid)] px-2.5 py-1.5 whitespace-nowrap"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <div className="text-[12px] leading-tight text-[var(--text)]">{name}</div>
          <div className="mt-0.5 text-[10px] leading-tight text-[var(--text-faint)]">{hint}</div>
        </div>
      )}
    </div>
  );
}


function ToolBtn({
  on, label, onClick, children,
}: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors ${
        on
          ? "bg-[var(--accent-wash)] text-[var(--accent)]"
          : "text-[var(--text-dim)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
