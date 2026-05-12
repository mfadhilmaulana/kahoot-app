import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuis! — Live Quiz Game",
  description: "Game kuis multiplayer real-time seperti Kahoot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
