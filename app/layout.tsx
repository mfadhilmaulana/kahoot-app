import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "SiKuis — Platform Kuis Interaktif Gratis",
  description:
    "Platform kuis multiplayer real-time gratis. Buat kuis edukatif, tantang teman, dan belajar bersama. 150+ soal pengetahuan dari 10 kategori tersedia.",
  keywords: ["kuis", "quiz", "multiplayer", "edukatif", "interaktif", "gratis", "sikuis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
