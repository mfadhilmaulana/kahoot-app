"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useRouter as useNextRouter } from "next/navigation";

export default function HostDemoPage() {
  const router = useNextRouter();

  useEffect(() => {
    const socket = getSocket();
    socket.emit("host:create", { quizId: "demo" }, (res: { pin?: string; error?: string }) => {
      if (res.pin) {
        router.replace(`/host/${res.pin}`);
      } else {
        router.replace("/");
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
      <div className="text-center">
        <div className="text-6xl mb-4 animate-spin">⚙️</div>
        <p className="text-white text-xl font-bold">Membuat game...</p>
      </div>
    </main>
  );
}
