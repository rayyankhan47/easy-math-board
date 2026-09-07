"use client";

import { useEffect, useState } from "react";
import { join, leave, newRoomId, useCollab } from "@/lib/collab";
import { setPersistKey, useBoard } from "@/lib/store";

export function ShareBar() {
  const room = useCollab((s) => s.room);
  const peers = useCollab((s) => s.peers);
  const me = useCollab((s) => s.me);
  const [copied, setCopied] = useState(false);

  // A ?room= link joins automatically.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("room");
    if (id) start(id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start(id: string, seedFromLocal: boolean) {
    setPersistKey(id);
    const board = useBoard.getState();
    join(id, seedFromLocal ? board.objs : [], (objs) => board.replaceAll(objs));
    const url = new URL(window.location.href);
    url.searchParams.set("room", id);
    window.history.replaceState({}, "", url);
  }

  function share() {
    const id = newRoomId();
    start(id, true); // your current board seeds the room
    copy(id);
  }

  function copy(id = room!) {
    const url = new URL(window.location.href);
    url.searchParams.set("room", id);
    void navigator.clipboard?.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function stop() {
    leave();
    setPersistKey(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
    void useBoard.getState().hydrate();
  }

  if (!room)
    return (
      <button
        onClick={share}
        className="rounded-[6px] border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--text-dim)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      >
        Share
      </button>
    );

  const here = [me, ...peers].filter(Boolean).slice(0, 6);

  return (
    <div
      className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <div className="flex -space-x-1.5">
        {here.map((p, i) => (
          <span
            key={i}
            title={p!.name}
            className="h-5 w-5 rounded-full border-2 border-[var(--panel)] text-[9px] leading-[1.05rem] font-medium text-white"
            style={{ background: p!.color, textAlign: "center" }}
          >
            {p!.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-[var(--text-faint)]">
        {peers.length === 0 ? "just you" : `${peers.length + 1} here`}
      </span>
      <button
        onClick={() => copy()}
        className="rounded-[5px] bg-[var(--accent)] px-2 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
      >
        {copied ? "copied" : "copy link"}
      </button>
      <button
        onClick={stop}
        title="leave the shared board"
        className="px-1 text-[13px] text-[var(--text-ghost)] hover:text-[var(--danger)]"
      >
        ×
      </button>
    </div>
  );
}
