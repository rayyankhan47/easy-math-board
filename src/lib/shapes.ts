/** Regular polygons and circles, with the numbers that make them interesting. */

export const POLY_NAMES: Record<number, string> = {
  3: "triangle", 4: "square", 5: "pentagon", 6: "hexagon", 7: "heptagon",
  8: "octagon", 9: "nonagon", 10: "decagon", 11: "hendecagon", 12: "dodecagon",
  13: "tridecagon", 14: "tetradecagon", 15: "pentadecagon", 16: "hexadecagon",
  17: "heptadecagon", 20: "icosagon",
};

export const shapeName = (sides: number) =>
  sides === 0 ? "circle" : (POLY_NAMES[sides] ?? `${sides}-gon`);

/** Vertices of a regular n-gon on a circle of radius r, centred at (r, r). */
export function polyPoints(sides: number, r: number, rotation = 0): [number, number][] {
  return Array.from({ length: sides }, (_, i) => {
    const t = (i / sides) * Math.PI * 2 - Math.PI / 2 + rotation;
    return [r + r * Math.cos(t), r + r * Math.sin(t)] as [number, number];
  });
}

export interface ShapeFacts {
  sides: number;
  side: number;
  apothem: number;
  perimeter: number;
  area: number;
  interior: number;   // degrees
  exterior: number;   // degrees
  diagonals: number;
  constructible: boolean | null;
}

/** Everything derivable from a circumradius. */
export function shapeFacts(sides: number, r: number): ShapeFacts {
  if (sides === 0)
    return {
      sides: 0, side: 0, apothem: r,
      perimeter: 2 * Math.PI * r,
      area: Math.PI * r * r,
      interior: 0, exterior: 0, diagonals: 0, constructible: null,
    };
  const side = 2 * r * Math.sin(Math.PI / sides);
  const apothem = r * Math.cos(Math.PI / sides);
  return {
    sides,
    side,
    apothem,
    perimeter: sides * side,
    area: 0.5 * sides * r * r * Math.sin((2 * Math.PI) / sides),
    interior: ((sides - 2) * 180) / sides,
    exterior: 360 / sides,
    diagonals: (sides * (sides - 3)) / 2,
    constructible: isConstructible(sides),
  };
}

const FERMAT_PRIMES = [3, 5, 17, 257, 65537];

/**
 * Gauss–Wantzel: a regular n-gon is constructible with compass and straightedge
 * exactly when n is a power of two times distinct Fermat primes.
 */
export function isConstructible(n: number): boolean {
  if (n < 3) return false;
  let m = n;
  while (m % 2 === 0) m /= 2;
  if (m === 1) return true;
  for (const p of FERMAT_PRIMES) {
    if (m % p === 0) {
      m /= p;
      if (m % p === 0) return false; // a repeated Fermat prime is not allowed
    }
  }
  return m === 1;
}

/** Pairs of vertex indices that are diagonals, not sides. */
export function diagonalPairs(sides: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < sides; i++)
    for (let j = i + 2; j < sides; j++) {
      if (i === 0 && j === sides - 1) continue; // that pair is a side
      out.push([i, j]);
    }
  return out;
}

export const tidy = (x: number, dp = 2) =>
  Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(dp);
