/* --------------------------------------------------------------- *
 * Free-form text: is it maths, and if so what is the notation?      *
 * Object commands live in lib/commands.ts.                          *
 * --------------------------------------------------------------- */

const GREEK = [
  "alpha","beta","gamma","delta","epsilon","zeta","eta","theta","iota","kappa",
  "lambda","mu","nu","xi","pi","rho","sigma","tau","phi","chi","psi","omega",
  "Gamma","Delta","Theta","Lambda","Xi","Pi","Sigma","Phi","Psi","Omega",
];
const FUNCS = ["sin","cos","tan","log","ln","exp","min","max","gcd","lcm","deg","det","dim","ker"];
const BIG = ["sum","prod","int","lim","bigcup","bigcap"];

/** Loose ASCII -> LaTeX. Deliberately partial: the model covers the rest. */
export function latexify(s: string): string {
  let t = " " + s + " ";
  t = t.replace(/<=/g, " \\le ").replace(/>=/g, " \\ge ");
  t = t.replace(/!=/g, " \\ne ").replace(/~=/g, " \\approx ");
  t = t.replace(/->/g, " \\to ").replace(/=>/g, " \\Rightarrow ");
  t = t.replace(/\binf(inity)?\b/g, " \\infty ");
  t = t.replace(/\bin\b/g, " \\in ").replace(/\bsubset\b/g, " \\subset ");
  t = t.replace(/\bforall\b/g, " \\forall ").replace(/\bexists\b/g, " \\exists ");
  /*
   * \b is not a boundary between a digit and a letter, so "35sqrt(16)" never
   * matched \bsqrt — implicit multiplication silently left the name unconverted.
   * Guard on letters instead, and on a backslash so an already-converted
   * command is not converted twice.
   */
  const name = (w: string) => new RegExp(`(?<![A-Za-z\\\\])${w}(?![A-Za-z])`, "g");

  t = t.replace(/(?<![A-Za-z\\])sqrt\s*\(([^()]*)\)/g, "\\sqrt{$1}");
  for (const b of BIG) t = t.replace(name(b), `\\${b} `);
  for (const f of FUNCS) t = t.replace(name(f), `\\${f} `);
  for (const g of GREEK) t = t.replace(name(g), `\\${g} `);
  t = t.replace(/\*/g, " \\cdot ");
  // command over command: tan(x)/sin(x)
  t = t.replace(
    /(\\[a-zA-Z]+)\s*\(([^()]*)\)\s*\/\s*(\\[a-zA-Z]+)\s*\(([^()]*)\)/g,
    "\\frac{$1($2)}{$3($4)}",
  );
  // braced commands: sqrt(2)/2 has already become \sqrt{2}
  t = t.replace(
    /((?:\d+\.?\d*)?\\[a-zA-Z]+\{[^{}]*\})\s*\/\s*([A-Za-z0-9^_]+|\([^()]+\))/g,
    (_m, a, b) => `\\frac{${a}}{${String(b).replace(/^\(|\)$/g, "")}}`,
  );
  // A function call is part of the numerator, not a bracket to be split:
  // sin(x)/x is (sin x)/x, never sin(x/x).
  t = t.replace(
    /((?:\d+\.?\d*)?\\[a-zA-Z]+)\s*\(([^()]*)\)\s*\/\s*\(([^()]+)\)/g,
    "\\frac{$1($2)}{$3}",
  );
  t = t.replace(
    /((?:\d+\.?\d*)?\\[a-zA-Z]+)\s*\(([^()]*)\)\s*\/\s*([A-Za-z0-9^_]+)/g,
    "\\frac{$1($2)}{$3}",
  );
  // simple fractions: (a+b)/(c), (a+b)/c, a/b — but never straight after a
  // command, which would steal that command's argument.
  t = t.replace(/(?<!\\[a-zA-Z]{1,12}\s?)\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
  t = t.replace(/(?<!\\[a-zA-Z]{1,12}\s?)\(([^()]+)\)\s*\/\s*([A-Za-z0-9]+)/g, "\\frac{$1}{$2}");
  t = t.replace(/(?<![\\\w})])([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/g, "\\frac{$1}{$2}");
  return t.replace(/\s+/g, " ").trim();
}

/** Connectives that survive latexify as literal words — a sign the line is
 *  spoken-style ("sum i=1 to n of i^2") and needs real translation. */
const SPOKEN = new Set([
  "to","of","from","for","where","with","over","then","all","each","every",
  "the","a","an","is","are","be","by","as","that","this","goes","up","down",
]);

function hasSpokenLeftovers(tex: string): boolean {
  return (tex.match(/(?<![\\A-Za-z])[A-Za-z]{2,}(?![A-Za-z])/g) ?? []).some((w) =>
    SPOKEN.has(w.toLowerCase()),
  );
}

const MATH_WORDS = new Set([
  ...GREEK, ...FUNCS, ...BIG,
  "sqrt","inf","infinity","mod","and","or","not","in","subset","forall","exists",
  "to","iff","implies","let","where","if","then","for","all","of","from","is",
]);

/** Count of ordinary English words — the signal that a line is prose. */
export function wordiness(s: string): number {
  return s
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length >= 4 && !MATH_WORDS.has(w.toLowerCase())).length;
}

/** Does this read as math, or as a note to yourself? */
export function looksLikeMath(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/[0-9=+\-*/^_<>≤≥(){}\\]/.test(t)) return false;
  return wordiness(t) <= 1;
}
