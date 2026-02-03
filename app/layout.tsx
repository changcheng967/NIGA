import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NEGAA - Brutally Honest Grammar Correction",
  description: "An ancient scholar cursed to correct your garbage grammar for eternity. Enter at your own risk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-zinc-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
