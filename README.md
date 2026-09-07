# Margin

A whiteboard for doing maths for fun. Infinite canvas, no syntax to learn, no
account, no AI — everything it computes it computes for real.

```bash
npm install
npm run dev
```

## How it works

Click anywhere and type. The right thing appears.

| you type | you get |
|---|---|
| `K5` · `petersen` · `graph 6 nodes` · `cycle 7` | a graph you can drag and rewire |
| `matrix 3x3` · `identity 4` · `cayley 5` | an editable grid, live properties |
| `plot sin(a*x)` · `plane` | a Cartesian plane you pan and zoom, with sliders |
| `surface x^2 - y^2` | a 3D surface you orbit |
| `primes to 100` · `divisors of 60` · `mod 7 = 3` | an integer strip |
| `clock 12 step 5` | ℤ_n as a dial |
| `V - E + F = 2` · `alpha >= pi` | rendered maths |
| `WHY???` | `WHY???`, untouched |

Press `?` for everything it knows — that list is generated from the command
registry, so it is never out of date. Suggestions appear as you type, so
nothing has to be memorised first.

## The part that matters

Select a line and you can simplify, expand, factor, solve, differentiate or
integrate it. **Shift-click two equations** and you can substitute one into the
other, or eliminate a shared variable.

That is what makes this different from a drawing program. The Euler
characteristic on a torus, done on the board:

```
V - E + F = 0        type it
3F = 2E              type it
                     shift-click both → eliminate F
E = 3V               appears
```

Swap the first line for `V - E + F = 2` and the same two clicks give you
`E = 3V - 6`, the planar bound.

There is a toolbar down the left for everything, if you would rather click than
type — hover an icon for a moment and it tells you what it is.

## Working together

Press **Share**. You get a link; anyone who opens it lands on the same board and
gets their own coloured cursor. No account, no sign-in, nothing to install.

It is peer-to-peer (Yjs over WebRTC) — the board data never touches a server.
A public signalling server introduces the peers to each other; point it at your
own with `NEXT_PUBLIC_SIGNALING=wss://your-server` if you would rather not
depend on someone else's.

Paste or drop an image anywhere. Select any object for its properties —
text gets font, size, colour, bold and italic. Light, dark and system themes.

See [DEPLOY.md](DEPLOY.md) for putting it online with accounts.

## Design rules

- **Nothing to learn.** Suggestions and a cheatsheet, never a syntax you must
  memorise first.
- **The mess is sacred.** Notes stay exactly as typed. Nothing is beautified.
- **Results are new lines.** An operation never overwrites what you wrote.
- **No guessing.** Every number on screen comes from an algorithm — SymPy,
  NetworkX, or code in `src/lib`. Nothing is inferred by a model.

## Layout

| | |
|---|---|
| `src/lib/commands.ts` | the command registry — drives parsing *and* autocomplete |
| `src/lib/graphs.ts` | graph families, layouts, and the properties computed in JS |
| `src/lib/predicates.ts` | integer-strip rules (prime, residue, divisor, …) |
| `src/lib/engine.ts` | client for the maths worker |
| `public/py-worker.js` | SymPy + NetworkX in Pyodide, off the main thread |
| `public/pyodide/` | vendored runtime and wheels, so it works offline |

Adding an object type means one entry in `COMMANDS`, one renderer, and one
inspector panel. See [MATH.md](MATH.md) for what is built and what is not.
