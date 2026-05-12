"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = pin.trim();
    if (cleaned.length < 4) {
      setError("Masukkan kode game yang valid");
      return;
    }
    router.push(`/play/${cleaned}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>

      {/* Logo */}
      <div className="text-center mb-12 bounce-in">
        <h1 className="text-7xl font-black tracking-tight mb-2"
          style={{ color: "#fff", textShadow: "0 0 40px rgba(139,92,246,0.8)" }}>
          Kuis<span style={{ color: "#a78bfa" }}>!</span>
        </h1>
        <p className="text-purple-300 text-lg font-medium">Game Kuis Multiplayer Real-time</p>
      </div>

      {/* Join Game */}
      <div className="w-full max-w-md slide-up">
        <form onSubmit={handleJoin}
          className="rounded-3xl p-8 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }}>

          <h2 className="text-2xl font-bold text-white text-center mb-6">Bergabung ke Game</h2>

          <input
            type="text"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
            placeholder="Masukkan kode game"
            maxLength={6}
            className="w-full text-center text-3xl font-black tracking-widest rounded-2xl px-6 py-5 mb-4 outline-none text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.2)" }}
            onFocus={(e) => { e.target.style.borderColor = "#a78bfa"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
          />

          {error && (
            <p className="text-red-400 text-center text-sm mb-4 font-medium">{error}</p>
          )}

          <button type="submit"
            className="w-full py-4 rounded-2xl text-xl font-black text-white cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            MASUK
          </button>
        </form>

        {/* Host section */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-4">Ingin membuat kuis?</p>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/create")}
              className="flex-1 py-4 rounded-2xl text-base font-bold text-white cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              Buat Kuis Baru
            </button>
            <button
              onClick={() => router.push("/host")}
              className="flex-1 py-4 rounded-2xl text-base font-bold text-white cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}>
              Pakai Demo Kuis
            </button>
          </div>
        </div>
      </div>

      <p className="mt-12 text-gray-500 text-sm">
        Dibuat dengan Next.js &amp; Socket.io
      </p>
    </main>
  );
}
