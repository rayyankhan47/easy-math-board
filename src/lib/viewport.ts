/**
 * Viewport size that is never zero. Some embedded contexts report
 * window.innerWidth as 0, which would pile every new object at the origin.
 */
const size = (a: number, b: number, fallback: number) =>
  Math.round(a || b || fallback);

export const vw = () =>
  typeof window === "undefined"
    ? 1200
    : size(window.innerWidth, document.documentElement?.clientWidth ?? 0, 1200);

export const vh = () =>
  typeof window === "undefined"
    ? 800
    : size(window.innerHeight, document.documentElement?.clientHeight ?? 0, 800);
