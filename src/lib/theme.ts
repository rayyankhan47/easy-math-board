"use client";

import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

const KEY = "emb.theme";

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
}

interface ThemeState {
  theme: Theme;
  set: (t: Theme) => void;
  init: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: "system",
  set: (t) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode */
    }
    apply(t);
    set({ theme: t });
  },
  init: () => {
    let t: Theme = "system";
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark" || saved === "system") t = saved;
    } catch {
      /* private mode */
    }
    apply(t);
    set({ theme: t });
  },
}));

/** Read a resolved CSS token — canvas drawing can't use var(). */
export function token(name: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}
