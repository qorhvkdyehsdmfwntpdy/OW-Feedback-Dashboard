import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR, Rajdhani } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const body = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "OW-Feedback-Dashboard",
  description: "오버워치 5인 스쿼드 OW-Score 분석 및 코칭 피드백 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            className: "border border-slate-700 bg-slate-900 text-slate-100",
          }}
        />
      </body>
    </html>
  );
}
