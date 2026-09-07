"use client";

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { create } from "zustand";
import type { Obj } from "./types";

export const PEER_COLORS = [
  "#2383e2", // blue
  "#d44c47", // red
  "#0f7b6c", // green
  "#cb912f", // yellow
  "#d9730d", // orange
  "#9065b0", // purple
  "#c14c8a", // pink
  "#4dab9a", // teal
];

export interface Peer {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  active: boolean;
}

interface CollabState {
  room: string | null;
  connected: boolean;
  me: { name: string; color: string } | null;
  peers: Peer[];
  set: (p: Partial<CollabState>) => void;
}

export const useCollab = create<CollabState>((set) => ({
  room: null,
  connected: false,
  me: null,
  peers: [],
  set: (p) => set(p),
}));

const LOCAL = Symbol("local");

let doc: Y.Doc | null = null;
let provider: WebrtcProvider | null = null;
let objects: Y.Map<Obj> | null = null;
let applyingRemote = false;

export const isApplyingRemote = () => applyingRemote;

/** A short, URL-safe room id. */
export const newRoomId = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

const ADJECTIVES = ["swift", "quiet", "bright", "odd", "prime", "convex", "dense", "smooth"];
const NOUNS = ["lemma", "torus", "vertex", "sheaf", "monoid", "cusp", "kernel", "spiral"];
const randomName = () =>
  `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;

/** Signalling only introduces peers; the board data itself is peer-to-peer. */
const SIGNALING = (process.env.NEXT_PUBLIC_SIGNALING || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function join(room: string, seed: Obj[], onRemote: (objs: Obj[]) => void) {
  leave();

  doc = new Y.Doc();
  objects = doc.getMap<Obj>("objects");

  provider = new WebrtcProvider(`margin:${room}`, doc, {
    ...(SIGNALING.length ? { signaling: SIGNALING } : {}),
  });

  const color = PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
  const name = randomName();
  provider.awareness.setLocalStateField("user", { name, color });

  // Seed the room with whatever is already on this board.
  if (seed.length) {
    doc.transact(() => {
      for (const o of seed) if (!objects!.has(o.id)) objects!.set(o.id, o);
    }, LOCAL);
  }

  objects.observeDeep((_e, tx) => {
    if (tx.origin === LOCAL) return; // our own write echoing back
    applyingRemote = true;
    try {
      onRemote([...objects!.values()]);
    } finally {
      applyingRemote = false;
    }
  });

  const readPeers = () => {
    const states = provider!.awareness.getStates();
    const mine = provider!.awareness.clientID;
    const peers: Peer[] = [];
    states.forEach((s, id) => {
      if (id === mine) return;
      const u = (s as { user?: { name: string; color: string } }).user;
      const c = (s as { cursor?: { x: number; y: number; t: number } }).cursor;
      peers.push({
        id,
        name: u?.name ?? "someone",
        color: u?.color ?? PEER_COLORS[id % PEER_COLORS.length],
        x: c?.x ?? 0,
        y: c?.y ?? 0,
        active: !!c && Date.now() - (c.t ?? 0) < 12000,
      });
    });
    useCollab.getState().set({ peers });
  };

  provider.awareness.on("change", readPeers);
  provider.on("status", (e: { connected: boolean }) =>
    useCollab.getState().set({ connected: e.connected }),
  );

  useCollab.getState().set({ room, me: { name, color }, connected: true, peers: [] });

  // Adopt whatever is already in the room.
  if (objects.size) {
    applyingRemote = true;
    try {
      onRemote([...objects.values()]);
    } finally {
      applyingRemote = false;
    }
  }
}

export function leave() {
  provider?.destroy();
  doc?.destroy();
  provider = null;
  doc = null;
  objects = null;
  useCollab.getState().set({ room: null, connected: false, peers: [], me: null });
}

/** Mirror the local board into the shared document. */
export function publish(objs: Obj[]) {
  if (!doc || !objects || applyingRemote) return;
  doc.transact(() => {
    const seen = new Set<string>();
    for (const o of objs) {
      seen.add(o.id);
      const cur = objects!.get(o.id);
      if (!cur || JSON.stringify(cur) !== JSON.stringify(o)) objects!.set(o.id, o);
    }
    for (const key of [...objects!.keys()]) if (!seen.has(key)) objects!.delete(key);
  }, LOCAL);
}

let lastCursor = 0;
export function publishCursor(x: number, y: number) {
  if (!provider) return;
  const now = Date.now();
  if (now - lastCursor < 45) return; // ~22fps is plenty for a cursor
  lastCursor = now;
  provider.awareness.setLocalStateField("cursor", { x, y, t: now });
}
