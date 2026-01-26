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
      <body className={inter.className}>
        <main>
          <Navbar />
          {/* Main content area */}
          <section>
            <section>{children}</section>
          </section>
          <Footer />
        </main>
      </body>
    </html>
  );
}
