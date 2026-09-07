/** Checks for a Cayley table: is this actually a group? */
export interface GroupCheck {
  closed: boolean;
  commutative: boolean;
  associative: boolean;
  identity: string | null;
  allInverses: boolean;
  isGroup: boolean;
}

export function checkGroup(headers: string[], cells: string[][]): GroupCheck {
  const n = headers.length;
  const idx = new Map(headers.map((h, i) => [h.trim(), i]));
  const at = (i: number, j: number) => (cells[i]?.[j] ?? "").trim();

  const closed = cells.every((row) => row.length === n && row.every((v) => idx.has(v.trim())));

  let commutative = true;
  for (let i = 0; i < n && commutative; i++)
    for (let j = 0; j < n; j++) if (at(i, j) !== at(j, i)) { commutative = false; break; }

  let associative = closed;
  if (closed) {
    outer: for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++)
        for (let c = 0; c < n; c++) {
          const ab = idx.get(at(a, b))!;
          const bc = idx.get(at(b, c))!;
          if (at(ab, c) !== at(a, bc)) { associative = false; break outer; }
        }
  }

  let identity: string | null = null;
  for (let e = 0; e < n; e++) {
    let ok = true;
    for (let i = 0; i < n; i++)
      if (at(e, i) !== headers[i].trim() || at(i, e) !== headers[i].trim()) { ok = false; break; }
    if (ok) { identity = headers[e]; break; }
  }

  let allInverses = identity !== null && closed;
  if (identity !== null) {
    const e = identity.trim();
    for (let i = 0; i < n; i++) {
      let found = false;
      for (let j = 0; j < n; j++) if (at(i, j) === e && at(j, i) === e) { found = true; break; }
      if (!found) { allInverses = false; break; }
    }
  }

  return {
    closed, commutative, associative, identity, allInverses,
    isGroup: closed && associative && identity !== null && allInverses,
  };
}
