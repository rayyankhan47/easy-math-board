import type { Spec } from "../types";
import { parseLocal } from "./local";

/**
 * Never throws, never returns null. Anything we cannot interpret becomes a
 * plain note — the board has no error states by design.
 */
export async function parse(input: string, signal?: AbortSignal): Promise<Spec> {
  const local = parseLocal(input);
  if (local) return local;

  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
      signal,
    });
    const { spec } = (await res.json()) as { spec: Spec | null };
    if (spec) return spec;
  } catch {
    /* offline, no key, aborted — fall through */
  }
  return { kind: "text", latex: null, raw: input };
}

export { parseLocal, looksLikeMath, latexify } from "./local";
