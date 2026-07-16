import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import LLMSettings from "@/components/LLMSettings";
import CrisisSupport from "@/components/CrisisSupport";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COPIUM | 焦虑急诊室",
  description:
    "AI时代的幽默减压工具。挂号、分诊、治疗、出院——用荒诞幽默短暂松一口气。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col scanlines">
        <LLMSettings />
        <CrisisSupport />
        {children}
      </body>
    </html>
  );
}
