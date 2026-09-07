import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Margin",
  description: "A whiteboard for doing math for fun.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overscroll-none bg-[var(--bg)] antialiased">{children}</body>
    </html>
  );
}
