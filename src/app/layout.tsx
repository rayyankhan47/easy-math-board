import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Math Board",
  description: "A whiteboard for doing maths for fun.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overscroll-none bg-[var(--bg)] antialiased">{children}</body>
    </html>
  );
}
