"use client";

import { useMemo } from "react";
import { evaluate, format } from "mathjs";
import { declaredArgs, isDefinition } from "./axes";
import { useBoard } from "./store";
import type { Obj } from "./types";

/** Definitions already written on the board: f(x) = …, n = …, g(u, v) = … */
export function definitionsOn(objs: Obj[]): string[] {
  return objs
    .filter((o): o is Extract<Obj, { kind: "text" }> => o.kind === "text" && !!o.latex)
    .map((o) => o.raw.trim())
    .filter(isDefinition);
}

/**
 * Turn those definitions into a scope. Two passes, so a definition may lean on
 * one written after it — order on a whiteboard is not dependency order.
 */
export function buildScope(defs: string[]): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  let pending = defs;
  for (let pass = 0; pass < 2 && pending.length; pass++) {
    const still: string[] = [];
    for (const d of pending) {
      try {
        evaluate(d, scope);
      } catch {
        still.push(d);
      }
    }
    if (still.length === pending.length) break; // no progress; stop
    pending = still;
  }
  return scope;
}

/**
 * Apple Notes behaviour: type "1 + 2 =" and the answer appears ahead of the
 * caret. With f(x) defined elsewhere on the board, "f(10) =" answers too.
 */
export function mathGhost(value: string, scope: Record<string, unknown> = {}): string | null {
  const m = value.match(/^(.+?)=\s*$/);
  if (!m) return null;

  /*
   * "f(x) =" is someone defining a function — not a question, so stay quiet.
   * But "f(n) =" with n already bound to a number is a call, and worth
   * answering. The binding is what tells the two apart.
   */
  if (isDefinition(value)) {
    const args = declaredArgs(value);
    const calling = !!args?.length && args.every((a) => typeof scope[a] === "number");
    if (!calling) return null;
  }

  const lhs = m[1].trim();
  if (!lhs || /[<>≤≥]/.test(lhs)) return null;

  try {
    // a copy, so evaluating never mutates the board's own scope
    const r = evaluate(lhs, { ...scope });
    if (typeof r !== "number" || !Number.isFinite(r)) return null;
    const out = format(r, { precision: 12 });
    return out === lhs ? null : out;
  } catch {
    return null;
  }
}

export function useMathGhost(value: string) {
  // A joined string is a primitive, so this selector cannot loop.
  const defs = useBoard((s) => definitionsOn(s.objs).join("\n"));
  const scope = useMemo(() => buildScope(defs ? defs.split("\n") : []), [defs]);
  return useMemo(() => mathGhost(value, scope), [value, scope]);
}

/** True when the caret sits at the very end, where accepting makes sense. */
export const atEnd = (el: HTMLInputElement | HTMLTextAreaElement | null) =>
  !!el && el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
