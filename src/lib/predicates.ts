/** Highlight rules for the integer strip. All deterministic, all cheap. */

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

const divisors = (n: number) => {
  const d: number[] = [];
  for (let i = 1; i * i <= n; i++)
    if (n % i === 0) {
      d.push(i);
      if (i !== n / i) d.push(n / i);
    }
  return d;
};

const sigma = (n: number) => divisors(n).reduce((a, b) => a + b, 0);
const totient = (n: number) => {
  let r = n;
  for (let p = 2; p * p <= n; p++)
    if (n % p === 0) {
      while (n % p === 0) n /= p;
      r -= r / p;
    }
  if (n > 1) r -= r / n;
  return r;
};

export interface Rule {
  test: (n: number) => boolean;
  label: string;
}

/** Parse a rule string into a predicate. Unknown rules highlight nothing. */
export function rule(spec: string): Rule {
  const s = spec.trim().toLowerCase();
  let m: RegExpMatchArray | null;

  if (s === "prime") return { test: isPrime, label: "prime" };
  if (s === "composite") return { test: (n) => n > 1 && !isPrime(n), label: "composite" };
  if (s === "even") return { test: (n) => n % 2 === 0, label: "even" };
  if (s === "odd") return { test: (n) => n % 2 !== 0, label: "odd" };
  if (s === "square") return { test: (n) => Number.isInteger(Math.sqrt(n)), label: "perfect square" };
  if (s === "triangular")
    return { test: (n) => Number.isInteger((Math.sqrt(8 * n + 1) - 1) / 2), label: "triangular" };
  if (s === "perfect") return { test: (n) => n > 1 && sigma(n) === 2 * n, label: "perfect" };
  if (s === "fibonacci") {
    const fib = new Set<number>();
    let a = 1, b = 1;
    while (a < 1e6) { fib.add(a); [a, b] = [b, a + b]; }
    return { test: (n) => fib.has(n), label: "Fibonacci" };
  }
  if ((m = s.match(/^mod\s*(\d+)\s*=\s*(\d+)$/)))
    return { test: (n) => n % +m![1] === +m![2], label: `≡ ${m[2]} mod ${m[1]}` };
  if ((m = s.match(/^multiples?\s+of\s+(\d+)$/)) || (m = s.match(/^divisible\s+by\s+(\d+)$/)))
    return { test: (n) => n % +m![1] === 0, label: `multiple of ${m[1]}` };
  if ((m = s.match(/^divisors?\s+of\s+(\d+)$/))) {
    const set = new Set(divisors(+m[1]));
    return { test: (n) => set.has(n), label: `divides ${m[1]}` };
  }
  if ((m = s.match(/^coprime\s+(?:to\s+)?(\d+)$/))) {
    const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
    return { test: (n) => g(n, +m![1]) === 1, label: `coprime to ${m[1]}` };
  }
  return { test: () => false, label: spec };
}

export const numberFacts = (n: number) => ({
  prime: isPrime(n),
  divisors: divisors(n).sort((a, b) => a - b),
  sigma: sigma(n),
  phi: totient(n),
});
