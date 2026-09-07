/* Deterministic maths engine: SymPy for symbolics, NetworkX for graphs.
 * Loaded lazily — the board stays instant until the first computation. */

/* Served from public/pyodide so the board works offline and needs no CDN.
 * Module worker — classic workers are not available in every host. */
import { loadPyodide } from "/pyodide/pyodide.mjs";

const BASE = "/pyodide/";
const WHEELS = [
  "mpmath-1.4.1-py3-none-any.whl",
  "sympy-1.14.0-py3-none-any.whl",
  "networkx-3.6.1-py3-none-any.whl",
];

const PRELUDE = String.raw`
import json
from sympy import *
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application,
    convert_xor,
)

_T = standard_transformations + (implicit_multiplication_application, convert_xor)
_REL = {"<=": Le, ">=": Ge, "!=": Ne, "<": Lt, ">": Gt}

# On a scratchpad every single letter is a variable. Without this, SymPy reads
# E as Euler's number, I as the imaginary unit, and the Euler-characteristic
# identity V - E + F = 0 silently stops being about edges.
_LOCALS = {c: Symbol(c) for c in
           "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"}

def _p(s):
    return parse_expr(s.strip(), transformations=_T, local_dict=_LOCALS)

def _eq(s):
    s = s.strip()
    for op, f in _REL.items():
        if op in s:
            l, r = s.split(op, 1)
            return f(_p(l), _p(r))
    if "=" in s:
        l, r = s.split("=", 1)
        return Eq(_p(l), _p(r))
    return _p(s)

def _out(e):
    return {"text": str(e), "latex": latex(e)}

def _err(m):
    return {"error": m}

def op_vars(a):
    return {"vars": sorted(str(s) for s in _eq(a).free_symbols)}

def op_simplify(a):  return _out(simplify(_eq(a)))
def op_expand(a):    return _out(expand(_eq(a)))
def op_factor(a):    return _out(factor(_eq(a)))
def op_diff(a, v):   return _out(diff(_eq(a), Symbol(v)))
def op_integrate(a, v): return _out(integrate(_eq(a), Symbol(v)))

def op_solve(a, v):
    sols = solve(_eq(a), Symbol(v))
    if not sols:
        return _err("no solution for " + v)
    if len(sols) == 1:
        return _out(Eq(Symbol(v), simplify(sols[0])))
    return {"text": ", ".join(str(s) for s in sols),
            "latex": ",\\ ".join(latex(s) for s in sols)}

def op_eliminate(a, b, v):
    A, B = _eq(a), _eq(b)
    x = Symbol(v)
    sols = solve(B, x)
    if not sols:
        A, B = B, A
        sols = solve(B, x)
    if not sols:
        return _err("cannot solve either equation for " + v)
    return _out(simplify(A.subs(x, sols[0])))

def op_substitute(a, b):
    """Substitute equation b (as lhs = rhs) into a."""
    A, B = _eq(a), _eq(b)
    if not isinstance(B, Equality):
        return _err("second selection is not an equation")
    return _out(simplify(A.subs(B.lhs, B.rhs)))

def op_evaluate(a, binds):
    e = _eq(a)
    for k, val in binds.items():
        e = e.subs(Symbol(k), sympify(val))
    r = simplify(e)
    try:
        return {"text": str(r), "latex": latex(r), "value": float(r)}
    except Exception:
        return _out(r)

def op_graph(nodes, edges):
    import networkx as nx
    G = nx.Graph()
    G.add_nodes_from(nodes)
    G.add_edges_from([tuple(e) for e in edges])
    n, m = G.number_of_nodes(), G.number_of_edges()
    planar, _ = nx.check_planarity(G)
    out = {
        "planar": planar,
        "connected": nx.is_connected(G) if n else False,
        "bipartite": nx.is_bipartite(G),
        "eulerian": nx.is_eulerian(G),
        "tree": nx.is_tree(G) if n else False,
        "density": round(nx.density(G), 3) if n > 1 else 0,
    }
    try:
        g = nx.girth(G)          # exact; inf for a forest
        out["girth"] = None if g == float("inf") else int(g)
    except Exception:
        out["girth"] = None
    if out["connected"] and n:
        out["diameter"] = nx.diameter(G)
        out["radius"] = nx.radius(G)
    if n and n <= 26:
        out["clique"] = nx.graph_clique_number(G) if hasattr(nx, "graph_clique_number") \
            else max((len(c) for c in nx.find_cliques(G)), default=0)
    return out

def op_gradient(a, vars):
    e = _eq(a)
    if isinstance(e, Equality):
        e = e.rhs
    parts = [simplify(diff(e, Symbol(v))) for v in vars]
    return {"text": "(" + ", ".join(str(p) for p in parts) + ")",
            "latex": r"\nabla f = \left(" + ",\\ ".join(latex(p) for p in parts) + r"\right)"}

def op_hessian(a, vars):
    e = _eq(a)
    if isinstance(e, Equality):
        e = e.rhs
    syms = [Symbol(v) for v in vars]
    rows = [[str(simplify(diff(e, p, q))) for q in syms] for p in syms]
    return {"cells": rows, "vars": list(vars)}

def op_matrix(cells, what):
    M = Matrix([[_p(str(c) if str(c).strip() else "0") for c in row] for row in cells])
    if what == "det":
        if M.rows != M.cols: return _err("determinant needs a square matrix")
        return _out(simplify(M.det()))
    if what == "rank":  return _out(M.rank())
    if what == "trace":
        if M.rows != M.cols: return _err("trace needs a square matrix")
        return _out(simplify(M.trace()))
    if what == "transpose": return {"cells": [[str(x) for x in r] for r in M.T.tolist()]}
    if what == "rref":     return {"cells": [[str(x) for x in r] for r in M.rref()[0].tolist()]}
    if what == "inverse":
        if M.rows != M.cols: return _err("inverse needs a square matrix")
        if simplify(M.det()) == 0: return _err("matrix is singular")
        return {"cells": [[str(simplify(x)) for x in r] for r in M.inv().tolist()]}
    if what == "eigenvalues":
        if M.rows != M.cols: return _err("eigenvalues need a square matrix")
        vals = M.eigenvals()
        parts = []
        for v, mult in vals.items():
            v = simplify(v)
            parts.append(latex(v) + (r"\ (\times " + str(mult) + ")" if mult > 1 else ""))
        return {"text": ", ".join(str(simplify(v)) for v in vals),
                "latex": ",\\ ".join(parts)}
    if what == "charpoly":
        if M.rows != M.cols: return _err("characteristic polynomial needs a square matrix")
        lam = Symbol("lambda")
        return _out(Eq(lam**0 * 0 + M.charpoly(lam).as_expr(), 0))
    return _err("unknown matrix operation: " + str(what))

def op_factorint(n):
    f = factorint(int(n))
    return {"factors": {str(k): int(v) for k, v in f.items()},
            "latex": latex(Mul(*[Pow(k, v, evaluate=False) for k, v in f.items()], evaluate=False))}

_OPS = {k[3:]: v for k, v in list(globals().items()) if k.startswith("op_")}

def _dispatch(fn, args_json):
    try:
        args = json.loads(args_json)
        return json.dumps(_OPS[fn](*args))
    except KeyError:
        return json.dumps({"error": "unknown operation: " + fn})
    except Exception as e:
        return json.dumps({"error": type(e).__name__ + ": " + str(e)})
`;

let py = null;
let booting = null;

async function boot() {
  self.postMessage({ type: "status", status: "loading python" });
  py = await loadPyodide({ indexURL: BASE });
  self.postMessage({ type: "status", status: "loading sympy, networkx" });
  // Explicit wheel URLs: skips lock resolution, which would drag in matplotlib.
  await py.loadPackage(WHEELS.map((w) => BASE + w));
  await py.runPythonAsync(PRELUDE);
  self.postMessage({ type: "status", status: "ready" });
}

self.onmessage = async (e) => {
  const { id, fn, args } = e.data;
  try {
    if (!booting) booting = boot();
    await booting;
    const raw = await py.runPythonAsync(
      `_dispatch(${JSON.stringify(fn)}, ${JSON.stringify(JSON.stringify(args ?? []))})`,
    );
    self.postMessage({ id, ok: true, result: JSON.parse(raw) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
