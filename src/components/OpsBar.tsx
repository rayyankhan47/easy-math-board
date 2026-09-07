"use client";

import { useEffect, useMemo, useState } from "react";
import { useBoard } from "@/lib/store";
import { ops, useEngine, warm, type Result } from "@/lib/engine";
import type { TextObj } from "@/lib/types";

const Btn = ({
  children,
  onClick,
  tone = "plain",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "plain" | "accent";
}) => (
  <button
    onClick={onClick}
    className={`rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors ${
      tone === "accent"
        ? "border-[#5b8def]/40 text-[#9dc0ff] hover:border-[#5b8def] hover:bg-[#5b8def]/10"
        : "border-[#2b2e35] text-[#8a8f98] hover:border-[#3a3d44] hover:text-[#e6e6e6]"
    }`}
  >
    {children}
  </button>
);

/**
 * Appears when text is selected. Every operation is SymPy — deterministic,
 * and the result lands on the board as a new line rather than replacing yours.
 */
export function OpsBar() {
  const objs = useBoard((s) => s.objs);
  const selection = useBoard((s) => s.selection);
  const add = useBoard((s) => s.add);
  const status = useEngine((s) => s.status);
  const detail = useEngine((s) => s.detail);

  const [vars, setVars] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const picked = useMemo(
    () =>
      selection
        .map((id) => objs.find((o) => o.id === id))
        .filter((o): o is TextObj => !!o && o.kind === "text" && !!o.raw.trim()),
    [selection, objs],
  );

  const first = picked[0];
  const second = picked[1];

  // Warm the engine as soon as anything is selected, so the first click is fast.
  useEffect(() => {
    if (picked.length) warm();
  }, [picked.length]);

  useEffect(() => {
    setErr(null);
    if (!first) return setVars([]);
    let live = true;
    // Union the free variables of each line. Concatenating two equations is not
    // parseable — both contain "=".
    Promise.all([first, second].filter(Boolean).map((o) => ops.vars(o!.raw)))
      .then((rs) => {
        if (!live) return;
        const all = new Set<string>();
        for (const r of rs) for (const v of (r.vars as string[]) ?? []) all.add(v);
        setVars([...all].sort());
      })
      .catch(() => live && setVars([]));
    return () => {
      live = false;
    };
  }, [first, second]);

  if (!picked.length) return null;

  const place = () => {
    const below = picked.reduce((a, b) => (b.y > a.y ? b : a), picked[0]);
    return { x: below.x, y: below.y + 44 };
  };

  const run = async (label: string, p: Promise<Result>) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await p;
      if (r.error) setErr(r.error);
      else add({ kind: "text", latex: r.latex ?? null, raw: r.text ?? "" }, place());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const booting = status === "booting";

  return (
    <div className="absolute bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="flex max-w-[92vw] flex-wrap items-center gap-1.5 rounded-[7px] border border-[#22242a] bg-[#141518]/96 px-2.5 py-2 backdrop-blur">
        <span className="pr-1 font-mono text-[10px] text-[#4a4e57]">
          {picked.length === 1 ? "1 selected" : `${picked.length} selected`}
        </span>

        {picked.length === 1 && (
          <>
            <Btn onClick={() => run("simplify", ops.simplify(first.raw))}>simplify</Btn>
            <Btn onClick={() => run("expand", ops.expand(first.raw))}>expand</Btn>
            <Btn onClick={() => run("factor", ops.factor(first.raw))}>factor</Btn>
            <Sep />
            <VarOps label="solve for" vars={vars} onPick={(v) => run("solve", ops.solve(first.raw, v))} />
            <VarOps label="d/d" vars={vars} onPick={(v) => run("diff", ops.diff(first.raw, v))} />
            <VarOps label="∫d" vars={vars} onPick={(v) => run("integrate", ops.integrate(first.raw, v))} />
          </>
        )}

        {picked.length === 2 && (
          <>
            <Btn tone="accent" onClick={() => run("substitute", ops.substitute(first.raw, second.raw))}>
              substitute
            </Btn>
            <VarOps
              label="eliminate"
              vars={vars}
              accent
              onPick={(v) => run("eliminate", ops.eliminate(first.raw, second.raw, v))}
            />
          </>
        )}

        {picked.length > 2 && (
          <span className="font-mono text-[10px] text-[#4a4e57]">select one or two lines</span>
        )}

        {(busy || booting) && (
          <span className="pl-1 font-mono text-[10px] text-[#5b8def]">
            {booting ? detail : "···"}
          </span>
        )}
      </div>

      {err && (
        <div className="mt-1.5 rounded-[4px] border border-[#e06c6c]/25 bg-[#e06c6c]/8 px-2.5 py-1 font-mono text-[10px] text-[#e06c6c]">
          {err}
        </div>
      )}
    </div>
  );
}

const Sep = () => <span className="mx-0.5 h-4 w-px bg-[#22242a]" />;

function VarOps({
  label,
  vars,
  onPick,
  accent,
}: {
  label: string;
  vars: string[];
  onPick: (v: string) => void;
  accent?: boolean;
}) {
  if (!vars.length) return null;
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[10px] text-[#4a4e57]">{label}</span>
      {vars.slice(0, 5).map((v) => (
        <Btn key={v} tone={accent ? "accent" : "plain"} onClick={() => onPick(v)}>
          {v}
        </Btn>
      ))}
    </span>
  );
}
