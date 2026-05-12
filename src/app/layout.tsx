import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import VantaBackground from "@/components/VantaBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UA Parking Intelligence Demo",
  description: "Synthetic-data demo dashboard for university parking analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <VantaBackground />
        {children}
      </body>
    </html>
  );
}
