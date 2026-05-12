"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

export default function HostDemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Menghubungkan...");

  useEffect(() => {
    const socket = getSocket();

    function createGame() {
      setStatus("Membuat game...");
      socket.emit(
        "host:create",
        { quizId: "demo" },
        (res: { pin?: string; error?: string }) => {
          if (res.pin) {
            router.replace(`/host/${res.pin}`);
          } else {
            setStatus("Gagal membuat game. Kembali...");
            setTimeout(() => router.replace("/"), 2000);
          }
        }
      );
    }

    if (socket.connected) {
      createGame();
    } else {
      socket.once("connect", createGame);
    }

    return () => {
      socket.off("connect", createGame);
    };
  }, [router]);

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0f0f1a 0%, #1a0533 100%)" }}
    >
      <div className="text-center fade-in">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <svg className="w-full h-full animate-spin" style={{ animationDuration: "1.5s" }} viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="6" />
            <circle cx="40" cy="40" r="35" fill="none" stroke="#a78bfa" strokeWidth="6"
              strokeDasharray="40 180" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🎮</span>
        </div>
        <p className="text-white text-xl font-bold">{status}</p>
      </div>
    </main>
  );
}
