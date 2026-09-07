"use client";

import { useEffect, useState } from "react";
import { imageUrl } from "@/lib/images";
import type { ImageObj } from "@/lib/types";

export function ImageObject({ o }: { o: ImageObj }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    imageUrl(o.blobKey).then((u) => live && setUrl(u));
    return () => { live = false; };
  }, [o.blobKey]);

  if (!url)
    return (
      <div
        style={{ width: o.w, height: o.h }}
        className="flex items-center justify-center rounded-[4px] border border-dashed border-[var(--border-strong)] font-mono text-[10px] text-[var(--text-faint)]"
      >
        image missing
      </div>
    );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={o.alt || "pasted image"}
      width={o.w}
      height={o.h}
      draggable={false}
      className="rounded-[4px] border border-[var(--border)] select-none"
      style={{ width: o.w, height: o.h, objectFit: "contain" }}
    />
  );
}
