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
  metadataBase: new URL("https://sikuis.com"),
  title: {
    default: "SiKuis — Platform Kuis Online Interaktif No.1 Indonesia | Kahoot Gratis",
    template: "%s | SiKuis",
  },
  description:
    "SiKuis adalah platform kuis online interaktif No.1 Indonesia — alternatif Kahoot & Quizizz gratis. 5000+ soal acak SD, SMP, SMA/SMK, Kuliah & Umum. Kuis multiplayer real-time, solo, flashcards, tes IQ. Buat kuis dalam detik, tanpa daftar.",
  keywords: [
    "kuis online",
    "kuis interaktif indonesia",
    "platform kuis",
    "kahoot indonesia",
    "kahoot gratis",
    "quizizz indonesia",
    "kuis online gratis",
    "buat kuis online",
    "kuis sd",
    "kuis smp",
    "kuis sma",
    "kuis smk",
    "kuis kuliah",
    "soal sd",
    "soal smp",
    "soal sma",
    "tes iq online",
    "flashcards indonesia",
    "kuis bahasa inggris",
    "kuis matematika",
    "sikuis",
    "sikuis.com",
    "game kuis edukasi",
    "kuis multiplayer",
  ],
  authors: [{ name: "SiKuis", url: "https://sikuis.com" }],
  creator: "SiKuis",
  publisher: "SiKuis",
  alternates: { canonical: "https://sikuis.com" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://sikuis.com",
    siteName: "SiKuis",
    title: "SiKuis — Platform Kuis Online Interaktif No.1 Indonesia",
    description:
      "5000+ soal acak SD–Kuliah. Kuis multiplayer real-time, solo, flashcards & tes IQ. Alternatif Kahoot & Quizizz gratis — tanpa daftar, langsung main.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SiKuis — Platform Kuis Interaktif Indonesia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SiKuis — Platform Kuis Online Interaktif No.1 Indonesia",
    description: "5000+ soal acak SD–Kuliah. Multiplayer real-time & solo. Alternatif Kahoot gratis.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
  verification: { google: "ganti-dengan-kode-verifikasi" },
  category: "education",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
