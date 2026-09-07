"use client";

import { useEffect, useState } from "react";
import { DEFAULTS, useSettings, type Settings as S } from "@/lib/settings";
import { useTheme, type Theme } from "@/lib/theme";
import { useBoard } from "@/lib/store";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const load = useSettings((s) => s.load);
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    load();
    initTheme();
  }, [load, initTheme]);

  // keep the theme store and settings in step
  const reduceMotion = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-motion", reduceMotion);
    if (reduceMotion) document.documentElement.setAttribute("data-motion", "reduce");
    else document.documentElement.removeAttribute("data-motion");
  }, [reduceMotion]);

  const theme = useSettings((s) => s.theme);
  const setTheme = useTheme((s) => s.set);
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Settings"
        aria-label="Settings"
        className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6 3.5 3.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && <Panel onClose={() => setOpen(false)} />}
    </>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const clear = useBoard((b) => b.clear);
  const count = useBoard((b) => b.objs.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="max-h-[85vh] w-[440px] overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel-solid)] p-5"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium text-[var(--text)]">Settings</h2>
          <button onClick={onClose} className="text-[16px] text-[var(--text-faint)] hover:text-[var(--text)]">
            ×
          </button>
        </div>

        <Group title="Appearance">
          <Choice<Theme>
            label="Theme"
            value={s.theme}
            onChange={(v) => s.update("theme", v)}
            options={[
              { v: "light", l: "Light" },
              { v: "dark", l: "Dark" },
              { v: "system", l: "System" },
            ]}
          />
          <Choice<S["grid"]>
            label="Background"
            value={s.grid}
            onChange={(v) => s.update("grid", v)}
            options={[
              { v: "dots", l: "Dots" },
              { v: "lines", l: "Grid" },
              { v: "none", l: "Plain" },
            ]}
          />
          {s.grid !== "none" && (
            <Slider
              label="Grid size"
              value={s.gridSize}
              min={12}
              max={64}
              step={4}
              suffix="px"
              onChange={(v) => s.update("gridSize", v)}
            />
          )}
          <Choice<S["uiScale"]>
            label="Interface size"
            hint="Scales panels, toolbar and menus"
            value={s.uiScale}
            onChange={(v) => s.update("uiScale", v)}
            options={[
              { v: "small", l: "Small" },
              { v: "normal", l: "Normal" },
              { v: "large", l: "Large" },
            ]}
          />
        </Group>

        <Group title="Canvas">
          <Switch
            label="Snap to grid"
            hint="Objects align to the grid as you drag"
            on={s.snap}
            onChange={(v) => s.update("snap", v)}
          />
          <Switch
            label="Click empty space to type"
            hint="Off means you only create from the toolbar"
            on={s.clickToType}
            onChange={(v) => s.update("clickToType", v)}
          />
          <Switch
            label="Show minimap"
            on={s.showMinimap}
            onChange={(v) => s.update("showMinimap", v)}
          />
        </Group>

        <Group title="Maths">
          <Choice<S["angleUnit"]>
            label="Angles"
            hint="How sin, cos and tan read their input"
            value={s.angleUnit}
            onChange={(v) => s.update("angleUnit", v)}
            options={[
              { v: "rad", l: "Radians" },
              { v: "deg", l: "Degrees" },
            ]}
          />
        </Group>

        <Group title="Accessibility">
          <Switch
            label="Reduce motion"
            hint="Removes transitions and easing"
            on={s.reduceMotion}
            onChange={(v) => s.update("reduceMotion", v)}
          />
          <Switch
            label="Toolbar tooltips"
            hint="Describe each tool on hover"
            on={s.showTooltips}
            onChange={(v) => s.update("showTooltips", v)}
          />
          <Switch
            label="Confirm before deleting"
            hint="Ask before backspace removes a selection"
            on={s.confirmDelete}
            onChange={(v) => s.update("confirmDelete", v)}
          />
        </Group>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <button
            onClick={() => s.reset()}
            className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            Reset settings
          </button>
          <button
            onClick={() => {
              if (!count) return;
              if (confirm(`Delete all ${count} objects on this board?`)) clear();
            }}
            className="rounded-[5px] border border-[var(--danger)] px-2.5 py-1 text-[12px] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
          >
            Clear board
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ primitives */

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-5">
    <h3 className="mb-2 text-[10px] tracking-[0.12em] text-[var(--text-faint)] uppercase">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="text-[13px] text-[var(--text)]">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-faint)]">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

function Choice<T extends string>({
  label, hint, value, options, onChange,
}: {
  label: string; hint?: string; value: T;
  options: { v: T; l: string }[]; onChange: (v: T) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-0.5 rounded-[6px] border border-[var(--border)] p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-[4px] px-2 py-1 text-[11px] transition-colors ${
              value === o.v
                ? "bg-[var(--hover)] text-[var(--text)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </Field>
  );
}

const Switch = ({
  label, hint, on, onChange,
}: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) => (
  <Field label={label} hint={hint}>
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-[18px] w-8 rounded-full transition-colors ${
        on ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
      }`}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all"
        style={{ left: on ? 16 : 2 }}
      />
    </button>
  </Field>
);

const Slider = ({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix?: string; onChange: (v: number) => void;
}) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="h-1 w-28 accent-[var(--accent)]"
      />
      <span className="w-10 text-right font-mono text-[11px] text-[var(--text-dim)]">
        {value}
        {suffix}
      </span>
    </div>
  </Field>
);

export { DEFAULTS };
