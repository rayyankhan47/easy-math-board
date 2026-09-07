"use client";

import { useMemo } from "react";
import { evaluate, format } from "mathjs";

/**
 * Apple Notes behaviour: type "1 + 2 =" and the answer appears ahead of the
 * caret. Nothing is committed until you accept it.
 */
export function mathGhost(value: string): string | null {
  // only fires once you have actually written an equals sign
  const m = value.match(/^(.+?)=\s*$/);
  if (!m) return null;
  const lhs = m[1].trim();
  if (!lhs || /[<>≤≥]/.test(lhs)) return null;

  try {
    const r = evaluate(lhs.replace(/\^/g, "^"));
    if (typeof r !== "number" || !Number.isFinite(r)) return null;
    const out = format(r, { precision: 12 });
    // an answer identical to the input is not worth offering
    return out === lhs ? null : out;
  } catch {
    return null;
  }
}

export const useMathGhost = (value: string) => useMemo(() => mathGhost(value), [value]);

/** True when the caret sits at the very end, where accepting makes sense. */
export const atEnd = (el: HTMLInputElement | HTMLTextAreaElement | null) =>
  !!el && el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
