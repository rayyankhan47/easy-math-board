import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Spec } from "@/lib/types";

/* Flat, all-required schema: far more reliable under a strict output format
 * than a discriminated union. We narrow it back to a Spec below. */
const Parsed = z.object({
  kind: z.enum(["text", "graph", "matrix"]),
  prose: z.boolean().describe("true when the input is a note to self, not math"),
  latex: z.string().describe("LaTeX body without delimiters; empty unless kind=text"),
  n: z.number().describe("vertex count; 0 unless kind=graph"),
  edges: z.array(z.array(z.number())).describe("0-indexed [a,b] pairs; empty unless kind=graph"),
  rows: z.number().describe("0 unless kind=matrix"),
  cols: z.number().describe("0 unless kind=matrix"),
  cells: z.array(z.array(z.string())).describe("matrix entries, or empty to default to zeros"),
  label: z.string().describe("short display name, or empty"),
});

const SYSTEM = `You turn a single line a mathematician typed on a whiteboard into one object.

kind="graph"  — they asked for a graph. Set n and edges (0-indexed pairs). Give label like "K_5".
kind="matrix" — they asked for a matrix. Set rows, cols, and cells if the values are implied.
kind="text"   — everything else.
  If it is mathematics, set latex to the LaTeX body (no $ delimiters) and prose=false.
  If it is a note, an aside, or a question to themselves, set prose=true and leave latex empty.

Interpret loose spoken-style phrasing: "sum of i squared from 1 to n" is math,
"wait why isn't this planar" is prose. Never solve anything, never add commentary,
never expand what they wrote. Transcribe intent into an object.`;

export async function POST(req: Request) {
  const { input } = (await req.json()) as { input?: string };
  if (!input?.trim()) return Response.json({ spec: null });

  // No key configured: let the client fall back to a plain note.
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ spec: null, reason: "no-key" });

  try {
    const client = new Anthropic();
    const res = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(Parsed), effort: "low" },
      messages: [{ role: "user", content: input }],
    });

    const p = res.parsed_output;
    if (!p) return Response.json({ spec: null, reason: "unparsed" });

    let spec: Spec;
    if (p.kind === "graph") {
      spec = {
        kind: "graph",
        n: Math.max(0, Math.min(60, p.n)),
        edges: p.edges.filter((e) => e.length === 2).map((e) => [e[0], e[1]] as [number, number]),
        label: p.label || "graph",
      };
    } else if (p.kind === "matrix") {
      spec = {
        kind: "matrix",
        rows: Math.max(1, Math.min(12, p.rows)),
        cols: Math.max(1, Math.min(12, p.cols)),
        cells: p.cells.length ? p.cells : undefined,
        label: p.label,
      };
    } else {
      spec = { kind: "text", latex: p.prose || !p.latex ? null : p.latex, raw: input };
    }
    return Response.json({ spec });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError)
      return Response.json({ spec: null, reason: "bad-key" });
    if (err instanceof Anthropic.RateLimitError)
      return Response.json({ spec: null, reason: "rate-limited" });
    console.error("[parse]", err);
    return Response.json({ spec: null, reason: "error" });
  }
}
