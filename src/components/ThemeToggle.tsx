"use client";

import { useEffect } from "react";
import { useTheme, type Theme } from "@/lib/theme";

const OPTS: { id: Theme; icon: string; title: string }[] = [
  { id: "light", icon: "☀", title: "light" },
  { id: "dark", icon: "☾", title: "dark" },
  { id: "system", icon: "◐", title: "system" },
];

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const set = useTheme((s) => s.set);
  const init = useTheme((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex items-center gap-0.5 rounded-[6px] border border-[var(--border)] bg-[var(--panel)] p-0.5">
      {OPTS.map((o) => (
        <button
          key={o.id}
          title={o.title}
          onClick={() => set(o.id)}
          className={`h-6 w-6 rounded-[4px] text-[11px] transition-colors ${
            theme === o.id
              ? "bg-[var(--hover)] text-[var(--text)]"
              : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
