"use client";

import { create } from "zustand";
import type { Theme } from "./theme";

export type UiScale = "small" | "normal" | "large";
export type Tool = "select" | "move" | "pen" | "highlighter" | "arrow" | "eraser";

export interface Settings {
  theme: Theme;
  grid: "dots" | "lines" | "none";
  gridSize: number;
  snap: boolean;
  uiScale: UiScale;
  reduceMotion: boolean;
  clickToType: boolean;
  showMinimap: boolean;
  showTooltips: boolean;
  angleUnit: "rad" | "deg";
  confirmDelete: boolean;
  inkColor: string;
  highlightColor: string;
  inkSize: number;
}

export const DEFAULTS: Settings = {
  theme: "system",
  grid: "dots",
  gridSize: 24,
  snap: false,
  uiScale: "normal",
  reduceMotion: false,
  clickToType: true,
  showMinimap: true,
  showTooltips: true,
  angleUnit: "rad",
  confirmDelete: false,
  inkColor: "#2383e2",
  highlightColor: "#ffd93d",
  inkSize: 4,
};

const KEY = "margin.settings";

interface SettingsState extends Settings {
  tool: Tool;
  setTool: (t: Tool) => void;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
  load: () => void;
}

const persist = (s: Settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
};

const pick = (s: SettingsState): Settings => ({
  theme: s.theme, grid: s.grid, gridSize: s.gridSize, snap: s.snap,
  uiScale: s.uiScale, reduceMotion: s.reduceMotion, clickToType: s.clickToType,
  showMinimap: s.showMinimap, showTooltips: s.showTooltips,
  angleUnit: s.angleUnit, confirmDelete: s.confirmDelete,
  inkColor: s.inkColor, highlightColor: s.highlightColor, inkSize: s.inkSize,
});

export const SCALE: Record<UiScale, number> = { small: 0.9, normal: 1, large: 1.15 };

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  tool: "select",
  setTool: (tool) => set({ tool }),

  update: (k, v) => {
    set({ [k]: v } as Partial<SettingsState>);
    persist(pick({ ...get(), [k]: v } as SettingsState));
  },

  reset: () => {
    set({ ...DEFAULTS });
    persist(DEFAULTS);
  },

  load: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) set({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      /* ignore malformed or blocked storage */
    }
  },
}));
