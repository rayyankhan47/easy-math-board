"use client";

import katex from "katex";
import { useMemo } from "react";

export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        errorColor: "#8a8f98",
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (!html) return <span className="text-[#8a8f98]">{tex}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
