"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FEATURES = [
  { icon: "⚡", title: "Real-Time Multiplayer", desc: "Bermain bersama ratusan orang sekaligus, skor diperbarui langsung.", color: "#2563EB" },
  { icon: "🧠", title: "150+ Soal Edukatif", desc: "Sains, sejarah, matematika, teknologi, dan banyak lagi.", color: "#26890C" },
  { icon: "📊", title: "Kuis Interaktif", desc: "Pilihan ganda, benar/salah, pendapat, rating, dan jawaban terbuka.", color: "#E21B3C" },
  { icon: "🎉", title: "Gratis Selamanya", desc: "Tanpa biaya, tanpa iklan mengganggu. Buat kuis sendiri kapan saja.", color: "#F59E0B" },
];

const CATEGORIES = [
  { icon: "⚗️", name: "Sains", color: "#6366F1" },
  { icon: "🏛️", name: "Sejarah", color: "#DC2626" },
  { icon: "🔢", name: "Matematika", color: "#059669" },
  { icon: "💻", name: "Teknologi", color: "#2563EB" },
  { icon: "🧬", name: "Kesehatan", color: "#EC4899" },
  { icon: "🌍", name: "Lingkungan", color: "#16A34A" },
  { icon: "🌐", name: "Pengetahuan", color: "#7C3AED" },
  { icon: "📈", name: "Ekonomi", color: "#CA8A04" },
  { icon: "📖", name: "Bahasa", color: "#0891B2" },
  { icon: "⚽", name: "Olahraga", color: "#EA580C" },
];

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
      {/* ── Sticky nav ─── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 900,
          }}>S</div>
          <span style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Si<span style={{ color: "var(--accent)" }}>Kuis</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={() => router.push("/quizzes")} className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Demo Kuis
          </button>
          <button onClick={() => router.push("/create")} className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Buat Kuis
          </button>
        </div>
      </nav>

      {/* ── Hero ─── */}
      <section style={{
        background: "linear-gradient(150deg, #EFF6FF 0%, #EEF2FF 50%, #FEF9EC 100%)",
        padding: "4rem 1.5rem 3rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -60, left: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(37,99,235,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, right: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(245,158,11,0.1)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div className="a-fadeup" style={{ marginBottom: "0.75rem" }}>
            <span className="badge" style={{ background: "var(--accent-dim)", color: "var(--accent)", fontSize: "0.72rem", letterSpacing: "0.12em" }}>
              ✦ Gratis Selamanya
            </span>
          </div>

          <h1 className="t-display a-fadeup d-1" style={{ color: "var(--text)", marginBottom: "1rem", lineHeight: 1.05 }}>
            Belajar Lebih<br />
            <span className="gradient-text">Seru Bersama!</span>
          </h1>

          <p className="a-fadeup d-2" style={{ color: "var(--text-dim)", fontSize: "clamp(1rem,2.5vw,1.2rem)", lineHeight: 1.65, marginBottom: "2.5rem", maxWidth: 480, margin: "0 auto 2.5rem" }}>
            Platform kuis multiplayer real-time. Tantang teman, perluas wawasan, dan nikmati belajar dengan cara yang menyenangkan.
          </p>

          {/* PIN join card */}
          <div className="a-fadeup d-3" style={{ maxWidth: 420, margin: "0 auto 1.25rem" }}>
            <div className="card" style={{ padding: "1.75rem 2rem", boxShadow: "0 8px 32px rgba(37,99,235,0.12)" }}>
              <p className="t-label text-center mb-3" style={{ color: "var(--text-muted)" }}>Punya kode game?</p>
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
                  <p style={{ color: "#DC2626", textAlign: "center", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", fontSize: "1.05rem" }}>
                  Bergabung Sekarang
                </button>
              </form>
            </div>
          </div>

          {/* Divider */}
          <div className="row a-fadeup d-4" style={{ gap: "1rem", maxWidth: 420, margin: "0 auto 1.25rem" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-hi)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 }}>atau</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-hi)" }} />
          </div>

          {/* CTA buttons */}
          <div className="a-fadeup d-5" style={{ display: "flex", gap: "0.75rem", maxWidth: 420, margin: "0 auto", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/quizzes")} className="btn btn-yellow btn-lg" style={{ flex: 1, minWidth: 140 }}>
              🎮 Demo Kuis
            </button>
            <button onClick={() => router.push("/create")} className="btn btn-surface btn-lg" style={{ flex: 1, minWidth: 140 }}>
              ✏️ Buat Kuis
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─── */}
      <section style={{ background: "var(--accent)", padding: "1.25rem 1.5rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(1.5rem, 5vw, 4rem)", flexWrap: "wrap" }}>
          {[
            { value: "150+", label: "Soal Edukatif" },
            { value: "10", label: "Kategori" },
            { value: "5", label: "Jenis Soal" },
            { value: "∞", label: "Pemain" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.8, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─── */}
      <section style={{ padding: "4rem 1.5rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <p className="t-label mb-2">Kenapa SiKuis?</p>
          <h2 className="t-h1" style={{ color: "var(--text)" }}>Platform yang kamu butuhkan</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px,100%),1fr))", gap: "1rem" }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card a-fadeup" style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1rem" }}>
                {f.icon}
              </div>
              <h3 className="t-h3" style={{ marginBottom: "0.4rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ─── */}
      <section style={{ padding: "0 1.5rem 4rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p className="t-label mb-2">Topik Tersedia</p>
          <h2 className="t-h2" style={{ color: "var(--text)" }}>10 Kategori Pengetahuan</h2>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
          {CATEGORIES.map((c, i) => (
            <div key={c.name} className="a-popin" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: c.color + "14", border: `1.5px solid ${c.color}28`,
                borderRadius: 40, padding: "0.45rem 1rem",
                fontSize: "0.82rem", fontWeight: 700, color: c.color,
              }}>
                <span>{c.icon}</span>
                <span>{c.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─── */}
      <section style={{ background: "linear-gradient(150deg, #EFF6FF, #EEF2FF)", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p className="t-label mb-2">Cara Bermain</p>
          <h2 className="t-h1" style={{ color: "var(--text)", marginBottom: "2.5rem" }}>Mudah dalam 3 langkah</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px,100%),1fr))", gap: "1.5rem" }}>
            {[
              { step: "1", icon: "🎮", title: "Host pilih kuis", desc: "Pilih dari 10 kategori atau buat kuis sendiri." },
              { step: "2", icon: "📱", title: "Pemain masukkan PIN", desc: "Buka sikuis.com, masukkan 6-digit kode game." },
              { step: "3", icon: "🏆", title: "Jawab & menangkan!", desc: "Jawab cepat dan tepat untuk skor tertinggi." },
            ].map((s) => (
              <div key={s.step} className="card" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1rem", margin: "0 auto 1rem" }}>
                  {s.step}
                </div>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{s.icon}</div>
                <h3 className="t-h3" style={{ marginBottom: "0.4rem" }}>{s.title}</h3>
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA bottom ─── */}
      <section style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2 className="t-h1" style={{ marginBottom: "1rem" }}>
            Siap bermain? <span className="gradient-text">Mulai sekarang!</span>
          </h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem", fontSize: "1rem" }}>
            Gratis selamanya. Tidak perlu daftar akun.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/quizzes")} className="btn btn-primary btn-xl" style={{ minWidth: 180 }}>
              🎮 Pilih Demo Kuis
            </button>
            <button onClick={() => router.push("/create")} className="btn btn-surface btn-xl" style={{ minWidth: 180 }}>
              ✏️ Buat Kuis Sendiri
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>SiKuis</span> · Gratis selamanya · Multiplayer real-time · Edukatif
        </p>
      </footer>
    </main>
  );
}
