"use client";

import { create } from "zustand";

export interface Result {
  text?: string;
  latex?: string;
  value?: number;
  error?: string;
  [k: string]: unknown;
}

type Pending = { resolve: (r: Result) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

interface EngineState {
  status: "idle" | "booting" | "ready" | "failed";
  detail: string;
  setStatus: (s: EngineState["status"], detail?: string) => void;
}

export const useEngine = create<EngineState>((set) => ({
  status: "idle",
  detail: "",
  setStatus: (status, detail = "") => set({ status, detail }),
}));

function ensure(): Worker {
  if (worker) return worker;
  worker = new Worker("/py-worker.js", { type: "module" });
  useEngine.getState().setStatus("booting", "starting");

  worker.onmessage = (e: MessageEvent) => {
    const d = e.data;
    if (d.type === "status") {
      useEngine.getState().setStatus(d.status === "ready" ? "ready" : "booting", d.status);
      return;
    }
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.ok) p.resolve(d.result as Result);
    else p.reject(new Error(d.error));
  };

  worker.onerror = () => useEngine.getState().setStatus("failed", "worker failed to load");
  return worker;
}

/** Warm the engine in the background so the first real call feels fast. */
export function warm() {
  if (!worker) call("vars", ["x"]).catch(() => {});
}

export function call(fn: string, args: unknown[] = []): Promise<Result> {
  const w = ensure();
  const id = ++seq;
  return new Promise<Result>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, fn, args });
  });
}

export const ops = {
  vars: (a: string) => call("vars", [a]),
  simplify: (a: string) => call("simplify", [a]),
  expand: (a: string) => call("expand", [a]),
  factor: (a: string) => call("factor", [a]),
  diff: (a: string, v: string) => call("diff", [a, v]),
  integrate: (a: string, v: string) => call("integrate", [a, v]),
  solve: (a: string, v: string) => call("solve", [a, v]),
  eliminate: (a: string, b: string, v: string) => call("eliminate", [a, b, v]),
  substitute: (a: string, b: string) => call("substitute", [a, b]),
  evaluate: (a: string, binds: Record<string, string>) => call("evaluate", [a, binds]),
  graph: (nodes: string[], edges: [string, string][]) => call("graph", [nodes, edges]),
  factorint: (n: number) => call("factorint", [n]),
};
