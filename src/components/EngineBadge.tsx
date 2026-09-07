"use client";

import { useEngine } from "@/lib/engine";

/** Quiet corner indicator — the engine boots lazily and takes a moment. */
export function EngineBadge() {
  const status = useEngine((s) => s.status);
  const detail = useEngine((s) => s.detail);
  if (status === "idle") return null;

  const tone =
    status === "ready" ? "text-[#3a3d44]" : status === "failed" ? "text-[#e06c6c]" : "text-[#5b8def]";

  return (
    <div className={`absolute bottom-4 left-4 z-30 font-mono text-[10px] ${tone}`}>
      {status === "ready" ? "sympy · networkx" : status === "failed" ? "engine failed" : detail || "starting"}
    </div>
  );
}
