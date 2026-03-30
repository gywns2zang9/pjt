import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://gywns2zang9.dev";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "뚝딱실",
  description: "뚝딱뚝딱 만들거나 뚝딱거리는 공간",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

import { KakaoScript } from "@/components/kakao-script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* 하얀 화면(FOUC) 방지: CSS가 로드되기 전에도 테마에 맞는 배경색을 즉시 적용 */}
        <style dangerouslySetInnerHTML={{
          __html: `
          html, body { background: #f8fafc; }
          html.dark, html.dark body { background: #020617; }
          @media (prefers-color-scheme: dark) {
            html:not(.light), html:not(.light) body { background: #020617; }
          }
        ` }} />
      </head>
      <KakaoScript />
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3082415933218635"
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
