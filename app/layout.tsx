import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ocean-check.site"),
  title: "Ocean Check | AI 해양 건강검진",
  description: "바다를 사람의 건강검진처럼 분석하고 관리하는 AI 기반 해양 건강 진단 서비스",
  openGraph: {
    title: "Ocean Check | AI 해양 건강검진",
    description: "바다의 건강 신호를 읽고, 기록하고, 회복시키세요.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ocean Check | AI 해양 건강검진",
    description: "바다의 건강 신호를 읽고, 기록하고, 회복시키세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
