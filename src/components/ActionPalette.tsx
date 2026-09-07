"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { objSize } from "@/lib/bounds";
import { searchActions, type Action, type ActionCtx } from "@/lib/actions";
import { useEngine, warm } from "@/lib/engine";

/**
 * Slash-menu for whatever is selected. Same idea as the caret on empty canvas,
 * but the choices depend on the object you are pointing at.
 */
export function ActionPalette() {
  const objs = useBoard((s) => s.objs);
  const selection = useBoard((s) => s.selection);
  const add = useBoard((s) => s.add);
  const update = useBoard((s) => s.update);
  const remove = useBoard((s) => s.remove);
  const status = useEngine((s) => s.status);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const obj = selection.length === 1 ? objs.find((o) => o.id === selection[0]) : undefined;
  const hits = useMemo(() => (obj ? searchActions(obj, q) : []), [obj, q]);

  // "/" opens it for the current selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (typing) return;
      if (e.key === "/" && obj) {
        e.preventDefault();
        setQ("");
        setSel(0);
        setErr(null);
        setOpen(true);
        warm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [obj]);

  useEffect(() => {
    if (!obj) setOpen(false);
  }, [obj]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!obj) return null;

  const size = objSize(obj);

  const ctx: ActionCtx = {
    add,
    update,
    remove,
    below: () => ({ x: obj.x, y: obj.y + size.h + 22 }),
    fail: (m) => setErr(m),
  };

  async function run(a: Action) {
    setBusy(true);
    setErr(null);
    try {
      await a.run(obj!, ctx);
      if (!err) setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => { setQ(""); setSel(0); setErr(null); setOpen(true); warm(); }}
        className="absolute z-40 rounded-[5px] border border-[var(--border)] bg-[var(--panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-faint)] hover:text-[var(--text)]"
        style={{ left: obj.x, top: obj.y + size.h + 6, boxShadow: "var(--shadow)" }}
        title="actions for this object"
      >
        / actions
      </button>
    );

  return (
    <div
      className="absolute z-50"
      style={{ left: obj.x, top: obj.y + size.h + 6 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="w-[280px] overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--panel-solid)]"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <input
          ref={input}
          value={q}
          placeholder={`do something with this ${obj.kind}…`}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % Math.max(1, hits.length)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s <= 0 ? hits.length - 1 : s - 1)); }
            else if (e.key === "Enter" && hits[sel]) { e.preventDefault(); void run(hits[sel]); }
          }}
          className="w-full border-b border-[var(--border)] bg-transparent px-2.5 py-2 font-mono text-[12px] text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none"
        />

        <ul className="max-h-[240px] overflow-y-auto py-1">
          {hits.map((a, i) => (
            <li
              key={a.id}
              onMouseEnter={() => setSel(i)}
              onMouseDown={(e) => { e.preventDefault(); void run(a); }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-2.5 py-1.5 ${
                i === sel ? "bg-[var(--accent-wash)]" : ""
              }`}
            >
              <span className="text-[12px] text-[var(--text)]">{a.label}</span>
              <span className="shrink-0 text-[10px] text-[var(--text-faint)]">{a.hint}</span>
            </li>
          ))}
          {!hits.length && (
            <li className="px-2.5 py-2 text-[11px] text-[var(--text-faint)]">nothing matches</li>
          )}
        </ul>

        {(busy || err || status === "booting") && (
          <div
            className={`border-t border-[var(--border)] px-2.5 py-1.5 font-mono text-[10px] ${
              err ? "text-[var(--danger)]" : "text-[var(--accent)]"
            }`}
          >
            {err ?? (status === "booting" ? "starting maths engine…" : "working…")}
          </div>
        )}
      </div>
    </div>
  );
}
