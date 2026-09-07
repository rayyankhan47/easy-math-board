"use client";

/**
 * Draws the suggested continuation in line with the text already typed, by
 * laying an invisible copy of that text under it. Font metrics must match the
 * input exactly, so the caller passes the same classes.
 */
export function Ghost({
  value,
  ghost,
  className = "",
  style,
}: {
  value: string;
  ghost: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!ghost) return null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-0 left-0 whitespace-pre ${className}`}
      style={style}
    >
      <span className="invisible">{value}</span>
      <span className="text-[var(--accent)] opacity-75">{ghost}</span>
      <span className="ml-1.5 align-middle text-[9px] text-[var(--text-faint)] opacity-80">→</span>
    </span>
  );
}
