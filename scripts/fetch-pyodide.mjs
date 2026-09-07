/**
 * Puts the Python runtime into public/pyodide so the board works offline.
 *
 * The core files are copied out of the installed `pyodide` package, and the
 * three wheels we actually use are fetched from the CDN at the exact version
 * that package pins — so the runtime and its libraries can never drift apart.
 * None of it is committed; this runs on install.
 */
import { createRequire } from "node:module";
import { mkdir, copyFile, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "pyodide");

/** Loaded lazily so the whole file is skippable when pyodide is absent. */
const require = createRequire(import.meta.url);

const CORE = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

/** Only what the maths engine imports. Their own deps are pure Python. */
const PACKAGES = ["mpmath", "sympy", "networkx"];

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
  let pkgDir;
  try {
    pkgDir = dirname(require.resolve("pyodide/package.json"));
  } catch {
    console.log("[pyodide] package not installed yet — skipping");
    return;
  }

  const { version } = JSON.parse(await readFile(join(pkgDir, "package.json"), "utf8"));
  await mkdir(out, { recursive: true });

  for (const f of CORE) {
    const from = join(pkgDir, f);
    if (!(await exists(from))) continue;
    await copyFile(from, join(out, f));
  }

  const lock = JSON.parse(await readFile(join(pkgDir, "pyodide-lock.json"), "utf8"));
  const base = `https://cdn.jsdelivr.net/pyodide/v${version}/full`;

  for (const name of PACKAGES) {
    const entry = lock.packages?.[name];
    if (!entry) {
      console.warn(`[pyodide] ${name} is not in the lock file — skipping`);
      continue;
    }
    const dest = join(out, entry.file_name);
    if (await exists(dest)) continue;

    const res = await fetch(`${base}/${entry.file_name}`);
    if (!res.ok) throw new Error(`[pyodide] ${entry.file_name}: HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`[pyodide] fetched ${entry.file_name}`);
  }

  // The worker loads wheels by name, so hand it the resolved list.
  await writeFile(
    join(out, "wheels.json"),
    JSON.stringify(
      { version, wheels: PACKAGES.map((n) => lock.packages[n]?.file_name).filter(Boolean) },
      null,
      2,
    ) + "\n",
  );
  console.log(`[pyodide] ready (v${version})`);
}

main().catch((err) => {
  console.error(String(err));
  console.error("[pyodide] the maths engine will not run until this succeeds");
  process.exitCode = 1;
});
