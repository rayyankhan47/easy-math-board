# Mathematical coverage

What the board needs to support to accommodate most mathematical ideas.
Organised by **representation**, not by subject — one representation usually
serves many subjects, and enumerating by subject produces forty overlapping
objects instead of a closed set.

Everything here is deterministic. No model in the loop.

## Built so far

| | status |
|---|---|
| S1 Expression | ✅ typed freely, rendered with KaTeX |
| S2 Binding | ⬜ not yet — values do not flow between objects |
| S3 Manipulation | ✅ simplify · expand · factor · solve · diff · integrate · **substitute · eliminate** |
| S4 Ink | ⬜ not yet — no freehand layer |
| P1 Grid | ✅ matrices (rank, det, trace) and Cayley tables (full group axioms) |
| P2 Graph | ✅ 12 families, drag/rewire, real planarity, girth, χ, diameter, cliques |
| P3 Plot | ✅ multiple curves, pan/zoom range |
| P4 Strip | ✅ 8 predicates + residues, divisors, multiples |
| P5 Set | ⬜ not yet |
| T6–T11 | ✅ modular clock only; the rest not yet |

Nearest gaps worth closing, in order: **S2 bindings** (so a graph's V and E can
feed an inequality), **S4 ink** (the mess layer the whole idea rests on), and
**P5 sets**.

---

## Substrate

Not objects. These make every object below live, and without them the board is
a drawing program.

| | | |
|---|---|---|
| **S1** | Expression | Rendered notation. The universal object. |
| **S2** | Binding | `n = 6`, `f(x) = x²`, `G = <that graph>`. A named value other objects read. |
| **S3** | Manipulation | substitute · simplify · expand · factor · solve · differentiate · integrate · evaluate. Applied to a selection, producing a new line below. |
| **S4** | Ink | Freehand, arrows, circling, `WHY???`. Never cleaned up, never interpreted. |

**S3 is the single most important feature in this document.** It is what makes
the torus derivation work:

```
V - E + F = 0          (given)
3F = 2E                (given, triangulated)
  select both → substitute
V - E + 2E/3 = 0
  → solve for E
E = 3V
```

That is not an object type. It is an operation over expressions, and it is the
difference between a whiteboard and a mathematical instrument.

---

## Tier 1 — five primitives

These five cover roughly eighty percent of recreational mathematics. Each is
one object with variants, not several objects.

### P1 · Grid
Rows and columns of editable cells.

Serves: matrix · adjacency matrix · Cayley table (group/ring) · truth table ·
function table · Young tableau · magic square · Sudoku · Pascal's triangle ·
distance matrix · transition matrix.

Live: dimensions, rank, determinant, trace, inverse, eigenvalues, RREF,
characteristic polynomial, symmetry, associativity check, identity/inverses
(for Cayley tables).

### P2 · Graph
Vertices and edges, several layouts.

Serves: general graphs · trees · rooted trees · Hasse diagrams / posets ·
subgroup lattices · state machines & automata · commutative diagrams
(labelled arrows) · flow networks · dependency graphs · Cayley graphs ·
knot diagrams (loosely).

Variants: directed · weighted · multigraph · labelled edges · bipartite layout ·
tree layout · circular · force-directed · grid.

Live: V, E, degree sequence, components, planarity (real test, not the Euler
bound), chromatic number, girth, diameter, cycles, bipartiteness, connectivity,
spanning tree, isomorphism check between two graphs, Euler/Hamiltonian paths.

### P3 · Plot
A curve or set of marks over axes.

Serves: y = f(x) · parametric · polar · sequences a_n · histograms ·
distributions · slope fields · vector fields · scatter · step functions ·
implicit curves · number-theoretic functions (τ, σ, φ, π(x)).

Live: parameter sliders bound to S2 bindings, roots, extrema, asymptotes,
area under curve, tangent at a point, domain/range.

### P4 · Strip
An integer number line.

Serves: primes and the sieve · residues mod m · divisors · multiples ·
sequence terms · partitions · Collatz trajectories · Ulam-style highlighting ·
intervals on ℝ.

Live: highlight by predicate (`prime`, `≡ 2 mod 5`, `divides 60`, `perfect`),
gaps, density, counts.

### P5 · Set
Elements and containment.

Serves: Venn/Euler diagrams · set algebra · relations · equivalence classes ·
partitions · power sets · intervals.

Live: union, intersection, difference, complement, cardinality, subset checks,
Cartesian product.

---

## Tier 2 — distinct enough to need their own

| | | Serves |
|---|---|---|
| **T6** | Complex plane | Roots of unity, polynomial roots, domain colouring, Möbius transforms, Julia/Mandelbrot |
| **T7** | Transformation space | Apply a matrix to a grid or shape — eigenvectors become *visible*, determinant becomes area |
| **T8** | Geometry sketch | Points, lines, circles, angles, classical constructions, with snapping |
| **T9** | 3D | Surfaces, contours, polyhedra, and **graphs embedded on a torus** |
| **T10** | Probability | Tree diagrams, distributions, and run-N-trials simulation with a plotted result |
| **T11** | Modular clock | ℤ_n as a dial — cyclic groups, residues, orders, generators |

T7 and T11 are cheap to build and disproportionately fun. T8 is the hardest
here: real constructions need a constraint solver, so start with snapping and
measurement only.

---

## Tier 3 — specialist, add on demand

Continued fractions · factorisation trees · proof / derivation trees ·
automata with a tape (DFA, Turing machine) · tilings and lattices ·
polynomial objects (roots ↔ coefficients ↔ factored form) ·
permutations (cycle notation ↔ one-line ↔ permutation matrix) ·
braid and knot diagrams.

---

## Coverage check

Read as: *can I explore this subject on the board?*

| Subject | Covered by | Gaps |
|---|---|---|
| Graph theory | P2, P1 (adjacency) | — |
| Number theory | P4, P3, T12/T13, S3 | — |
| Linear algebra | P1, T7, P3 | — |
| Calculus & analysis | P3, S3 | — |
| Combinatorics | P1 (tableaux), P4, P5, S3 | — |
| Group & ring theory | P1 (Cayley), P2 (lattice), T11, T18 | Representation theory is thin |
| Topology | T9, P2 (Euler characteristic) | Homology is out of scope |
| Logic | P1 (truth tables), T14 | — |
| Probability & statistics | T10, P3 | — |
| Geometry | T8, T7, T9 | Constructions need a solver |
| Complex analysis | T6, P3 | — |
| Discrete maths / CS | P2, T15, P1 | — |
| Category theory | P2 (commutative diagrams) | Diagram chasing is manual |
| Differential equations | P3 (slope & vector fields) | No numerical solver yet |

Honest gaps: representation theory, homology, and formal proof checking. All
three are specialist enough that a bed-notebook does not need them.

---

## Engine

With no model in the loop, the mathematics is entirely library work.

| Need | Library |
|---|---|
| Symbolic algebra, calculus, number theory, polynomials, logic | **SymPy** |
| All graph theory incl. planarity, colouring, isomorphism | **NetworkX** |
| Linear algebra, numerics, simulation | **NumPy / SciPy** |
| Group theory, permutations | **sympy.combinatorics** |

All four run in the browser under **Pyodide** in a Web Worker, lazy-loaded on
the first mathematical operation so typing and dragging stay instant. Rendering
stays native (SVG/canvas) rather than matplotlib, so objects remain draggable.

---

## Discoverability without a model

Cutting the model puts the input problem back: a command grammar is a syntax,
and a syntax is something to learn. Two mechanisms replace it, neither
requiring memorisation:

1. **Live autocomplete.** Type `mat` and the caret offers `matrix 3x3`,
   `matrix identity 4`, `matrix random 2x3` with previews. Discovery, not recall.
2. **Right-click the canvas** for a menu of every object type.

The grammar stays typeable for speed once it is in your fingers, but you never
have to learn it first.
