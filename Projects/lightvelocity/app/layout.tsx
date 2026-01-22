import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lightvelocity | Book Flights at the Speed of Light",
  description: "An airline booking experience built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          inter.className,
          // App-wide base styling (works nicely with your new Navbar/Footer)
          "min-h-dvh bg-white text-slate-900 antialiased",
          "dark:bg-slate-950 dark:text-slate-50",
        ].join(" ")}
      >
        {/* Background ambiance (subtle brand glow) */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/15 via-cyan-400/10 to-violet-500/15 blur-3xl" />
          <div className="absolute bottom-[-220px] right-[-180px] h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="min-h-dvh flex flex-col">
          <Navbar />

          {/* Main content area */}
          <main className="flex-1">
            <section className="mx-auto max-w-6xl px-6">{children}</section>
          </main>

          <Footer />
        </div>
      </body>
    </html>
  );
}
