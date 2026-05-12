"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = pin.trim();
    if (cleaned.length !== 6) {
      setError("Kode game terdiri dari 6 angka");
      return;
    }
    router.push(`/play/${cleaned}`);
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: "linear-gradient(160deg, #0f0f1a 0%, #1a0533 50%, #0a1628 100%)" }}
    >
      {/* Decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(60px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)", filter: "blur(60px)" }} />
      </div>

      {/* Logo */}
      <div className="text-center mb-10 fade-in relative">
        <h1 className="text-8xl font-black tracking-tight select-none"
          style={{ WebkitTextStroke: "2px rgba(167,139,250,0.3)" }}>
          <span className="text-white">Kuis</span>
          <span style={{ color: "#a78bfa" }}>!</span>
        </h1>
        <p className="text-purple-300 text-lg font-semibold mt-1 tracking-wide">
          Game Kuis Multiplayer Real-time
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-sm fade-in" style={{ animationDelay: "0.1s" }}>
        <form
          onSubmit={handleJoin}
          className="glass rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-white text-xl font-bold text-center mb-5">
            Masukkan Kode Game
          </h2>

          <input
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            placeholder="● ● ● ● ● ●"
            maxLength={6}
            className="input-dark w-full text-center text-4xl font-black tracking-[0.3em] rounded-2xl px-4 py-5 mb-3"
          />

          {error && (
            <p className="text-red-400 text-center text-sm mb-3 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-4 text-xl rounded-2xl"
          >
            MASUK →
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5 px-2">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-gray-500 text-sm font-medium">atau</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* Host buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/create")}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-103 active:scale-97"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}
          >
            ✏️  Buat Kuis Sendiri
          </button>
          <button
            onClick={() => router.push("/host")}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-103 active:scale-97"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}
          >
            🎮  Pakai Demo Kuis (10 soal)
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-gray-600 text-xs fade-in" style={{ animationDelay: "0.3s" }}>
        Dibuat dengan Next.js &amp; Socket.io
      </p>
    </main>
  );
}
