import type { Metadata } from "next";
import { Fira_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";
import "@excalidraw/excalidraw/index.css";
import { SiteHeader } from "@/components/SiteHeader";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillHub",
  description:
    "SkillHub: онлайн-обучение с курсами, материалами, тестами и live-занятиями в одной системе.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${firaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="min-h-full">
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
