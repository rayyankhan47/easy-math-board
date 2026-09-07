"use client";

import { get, set, del } from "idb-keyval";
import { uid } from "./types";

/** Blobs live in IndexedDB; objects only carry the key. */
const k = (key: string) => `img:${key}`;
const urls = new Map<string, string>();

export async function storeImage(blob: Blob): Promise<{ key: string; w: number; h: number }> {
  const key = uid();
  await set(k(key), blob);
  const { w, h } = await measure(blob);
  return { key, w, h };
}

export async function imageUrl(key: string): Promise<string | null> {
  const cached = urls.get(key);
  if (cached) return cached;
  const blob = await get<Blob>(k(key));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
}

export async function dropImage(key: string) {
  const url = urls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(key);
  }
  await del(k(key));
}

function measure(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 360 / img.width, 360 / img.height);
      URL.revokeObjectURL(url);
      resolve({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ w: 240, h: 180 });
    };
    img.src = url;
  });
}

/** Pull the first image out of a paste or drop. */
export function imageFrom(e: ClipboardEvent | DragEvent): File | null {
  const items =
    (e as ClipboardEvent).clipboardData?.items ?? (e as DragEvent).dataTransfer?.items;
  if (!items) return null;
  for (const it of items) {
    if (it.kind === "file" && it.type.startsWith("image/")) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  return null;
}
