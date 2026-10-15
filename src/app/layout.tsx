import type { Metadata, Viewport } from "next";
import { M_PLUS_2 } from "next/font/google";
import "./globals.css";

// 端末を問わず同じ見た目にするため、日本語も Web フォントで配信する（可変ウェイト）。
const mplus = M_PLUS_2({
  weight: "variable",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mplus",
});

export const metadata: Metadata = {
  title: "日程調整",
  description: "自然文で作れる、自分用の日程調整ツール",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "日程調整", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ノッチやホームインジケーターの領域まで背景を広げ、余白は safe-area で取る
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${mplus.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
