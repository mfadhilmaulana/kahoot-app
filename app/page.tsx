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
    if (cleaned.length !== 6) { setError("Kode game terdiri dari 6 angka"); return; }
    router.push(`/play/${cleaned}`);
  }

  return (
    <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "8%", left: "15%",
          width: 520, height: 520,
          background: "radial-gradient(circle, rgba(99,102,241,0.1), transparent 65%)",
          filter: "blur(48px)",
        }} />
        <div style={{
          position: "absolute", bottom: "12%", right: "10%",
          width: 380, height: 380,
          background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent 65%)",
          filter: "blur(64px)",
        }} />
      </div>

      <div className="flex-1 col items-center justify-center px-5 py-16" style={{ position: "relative" }}>
        {/* Wordmark */}
        <div className="text-center mb-12 a-fadeup">
          <div className="t-display mb-2">
            <span style={{ color: "var(--text)" }}>KUIS</span>
            <span style={{ color: "var(--accent)" }}>!</span>
          </div>
          <p className="t-label" style={{ letterSpacing: "0.16em" }}>
            Platform Kuis Interaktif Real-Time
          </p>
        </div>

        {/* PIN card */}
        <div className="card a-fadeup d-1 mb-5" style={{ width: "100%", maxWidth: 380, padding: "2rem" }}>
          <p className="t-label text-center mb-4">Masukkan Kode Game</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="● ● ● ● ● ●"
              maxLength={6}
              className="input input-xl mb-3"
            />
            {error && (
              <p style={{ color: "#F87171", textAlign: "center", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Bergabung
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="row a-fadeup d-2 mb-5" style={{ gap: "1rem", width: "100%", maxWidth: 380 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 }}>atau</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Action buttons */}
        <div className="col a-fadeup d-3" style={{ gap: "0.75rem", width: "100%", maxWidth: 380 }}>
          <button onClick={() => router.push("/quizzes")} className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            Pilih Demo Kuis
          </button>
          <button onClick={() => router.push("/create")} className="btn btn-surface btn-lg" style={{ width: "100%" }}>
            Buat Kuis Sendiri
          </button>
        </div>

        {/* Stats */}
        <div className="row a-fadeup d-4 mt-14" style={{ gap: "3rem" }}>
          {[
            { value: "8", label: "Kategori" },
            { value: "90+", label: "Soal Edukatif" },
            { value: "3", label: "Jenis Soal" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{value}</div>
              <div className="t-label mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center pb-6 a-fadein d-5" style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
        KUIS! — Gratis selamanya &middot; Multiplayer real-time &middot; Edukatif
      </footer>
    </main>
  );
}
