"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FEATURES = [
  { icon: "⚡", title: "Real-Time Multiplayer", desc: "Bermain bersama ratusan orang sekaligus, skor diperbarui langsung.", grad: "linear-gradient(135deg,#4F46E5,#7C3AED)" },
  { icon: "🧠", title: "150+ Soal Edukatif", desc: "Sains, sejarah, matematika, teknologi, dan banyak lagi.", grad: "linear-gradient(135deg,#059669,#0891B2)" },
  { icon: "📊", title: "5 Jenis Soal", desc: "Pilihan ganda, benar/salah, pendapat, rating bintang, dan teks bebas.", grad: "linear-gradient(135deg,#E21B3C,#EC4899)" },
  { icon: "🎉", title: "Gratis Selamanya", desc: "Tanpa biaya, tanpa iklan mengganggu. Buat kuis sendiri kapan saja.", grad: "linear-gradient(135deg,#F59E0B,#EF4444)" },
];

const CATEGORIES = [
  { icon: "⚗️", name: "Sains",        grad: "linear-gradient(135deg,#6366F1,#8B5CF6)", glow: "rgba(99,102,241,0.30)" },
  { icon: "🏛️", name: "Sejarah",      grad: "linear-gradient(135deg,#DC2626,#F97316)", glow: "rgba(220,38,38,0.28)" },
  { icon: "🔢", name: "Matematika",   grad: "linear-gradient(135deg,#059669,#0D9488)", glow: "rgba(5,150,105,0.28)" },
  { icon: "💻", name: "Teknologi",    grad: "linear-gradient(135deg,#2563EB,#0891B2)", glow: "rgba(37,99,235,0.28)" },
  { icon: "🧬", name: "Kesehatan",    grad: "linear-gradient(135deg,#EC4899,#8B5CF6)", glow: "rgba(236,72,153,0.28)" },
  { icon: "🌍", name: "Lingkungan",   grad: "linear-gradient(135deg,#16A34A,#059669)", glow: "rgba(22,163,74,0.28)" },
  { icon: "🌐", name: "Pengetahuan",  grad: "linear-gradient(135deg,#7C3AED,#4F46E5)", glow: "rgba(124,58,237,0.28)" },
  { icon: "📈", name: "Ekonomi",      grad: "linear-gradient(135deg,#CA8A04,#EA580C)", glow: "rgba(202,138,4,0.28)" },
  { icon: "📖", name: "Bahasa",       grad: "linear-gradient(135deg,#0891B2,#2563EB)", glow: "rgba(8,145,178,0.28)" },
  { icon: "⚽", name: "Olahraga",     grad: "linear-gradient(135deg,#EA580C,#EF4444)", glow: "rgba(234,88,12,0.28)" },
];

function SiKuisLogo({ size = 36 }: { size?: number }) {
  const id = `lg${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED"/>
          <stop offset="55%" stopColor="#4F46E5"/>
          <stop offset="100%" stopColor="#3B82F6"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${id})`}/>
      <ellipse cx="36" cy="22" rx="26" ry="11" fill="rgba(255,255,255,0.16)"/>
      <path d="M33,32 C33,18 67,18 67,32 C67,46 53,50 53,63"
        stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <circle cx="53" cy="77" r="6.5" fill="white"/>
    </svg>
  );
}

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
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(79,70,229,0.10)",
        padding: "0 1.5rem",
        height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SiKuisLogo size={34} />
          <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.03em", color: "var(--text)" }}>
            Si<span style={{ color: "var(--accent)" }}>Kuis</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={() => router.push("/quizzes")} className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Demo Kuis
          </button>
          <button onClick={() => router.push("/create")} className="btn btn-gradient" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Buat Kuis
          </button>
        </div>
      </nav>

      {/* ── Hero ─── */}
      <section style={{
        background: "linear-gradient(145deg, #F0EAFF 0%, #EAF0FF 45%, #FFF6E6 100%)",
        padding: "4.5rem 1.5rem 3.5rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div className="a-float-slow" style={{ position: "absolute", top: -80, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="a-float-slow" style={{ position: "absolute", bottom: -60, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)", pointerEvents: "none", animationDelay: "2s" }} />
        <div style={{ position: "absolute", top: "30%", left: "8%", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#8B5CF6)", opacity: 0.18, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#F59E0B,#EF4444)", opacity: 0.18, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "15%", width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#3B82F6,#06B6D4)", opacity: 0.15, pointerEvents: "none", transform: "rotate(15deg)" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          {/* Logo mark + badge */}
          <div className="a-popin center mb-5" style={{ gap: "1rem" }}>
            <div style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 40,
              background: "rgba(79,70,229,0.08)",
              border: "1.5px solid rgba(79,70,229,0.18)",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              <SiKuisLogo size={24} />
              <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--accent)", letterSpacing: "0.04em" }}>SiKuis</span>
              <span style={{ width: 1, height: 16, background: "rgba(79,70,229,0.25)" }} />
              <span style={{ color: "var(--purple)", fontSize: "0.75rem", fontWeight: 700 }}>✦ Gratis Selamanya</span>
            </div>
          </div>

          <h1 className="t-display a-fadeup d-1" style={{ color: "var(--text)", marginBottom: "1.25rem", lineHeight: 1.05 }}>
            Belajar Lebih<br />
            <span className="gradient-text">Seru Bersama!</span>
          </h1>

          <p className="a-fadeup d-2" style={{
            color: "var(--text-dim)", fontSize: "clamp(1rem,2.5vw,1.2rem)",
            lineHeight: 1.65, marginBottom: "2.75rem", maxWidth: 480, margin: "0 auto 2.75rem",
          }}>
            Platform kuis multiplayer real-time. Tantang teman, perluas wawasan, dan nikmati belajar dengan cara yang menyenangkan.
          </p>

          {/* PIN join card */}
          <div className="a-fadeup d-3" style={{ maxWidth: 420, margin: "0 auto 1.25rem" }}>
            <div className="card" style={{ padding: "1.75rem 2rem", boxShadow: "0 12px 40px rgba(79,70,229,0.14)", borderColor: "rgba(79,70,229,0.15)" }}>
              <p className="t-label text-center mb-3">Punya kode game?</p>
              <form onSubmit={handleJoin}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  placeholder="● ● ● ● ● ●"
                  maxLength={6}
                  className="input input-xl mb-3"
                  style={{ borderColor: pin.length > 0 ? "var(--accent)" : undefined }}
                />
                {error && (
                  <p style={{ color: "#DC2626", textAlign: "center", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn-gradient btn-lg" style={{ width: "100%", fontSize: "1.05rem" }}>
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
      <section style={{
        background: "linear-gradient(90deg, #7C3AED 0%, #4F46E5 50%, #2563EB 100%)",
        padding: "1.5rem 1.5rem",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(1.5rem, 5vw, 4rem)", flexWrap: "wrap" }}>
          {[
            { value: "150+", label: "Soal Edukatif", icon: "📚" },
            { value: "10",   label: "Kategori",      icon: "🗂️" },
            { value: "5",    label: "Jenis Soal",    icon: "🎯" },
            { value: "∞",    label: "Pemain",        icon: "👥" },
          ].map(({ value, label, icon }) => (
            <div key={label} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>{icon}</div>
              <div style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.78, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.15rem" }}>{label}</div>
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
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: f.grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem", marginBottom: "1rem",
                boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
              }}>
                {f.icon}
              </div>
              <h3 className="t-h3" style={{ marginBottom: "0.4rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ─── */}
      <section style={{ padding: "0 1.5rem 4.5rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p className="t-label mb-2">Topik Tersedia</p>
          <h2 className="t-h2" style={{ color: "var(--text)" }}>10 Kategori Pengetahuan</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(140px, 45%), 1fr))", gap: "0.75rem" }}>
          {CATEGORIES.map((c, i) => (
            <div key={c.name} className="cat-tile a-fadeup" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{
                width: 54, height: 54, borderRadius: 16,
                background: c.grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
                margin: "0 auto 0.65rem",
                boxShadow: `0 6px 16px ${c.glow}`,
              }}>
                {c.icon}
              </div>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.82rem" }}>{c.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─── */}
      <section style={{ background: "linear-gradient(150deg, #F0EAFF, #EAF0FF)", padding: "4.5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p className="t-label mb-2">Cara Bermain</p>
          <h2 className="t-h1" style={{ color: "var(--text)", marginBottom: "2.5rem" }}>Mudah dalam 3 langkah</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px,100%),1fr))", gap: "1.5rem" }}>
            {[
              { step: "1", icon: "🎮", title: "Host pilih kuis", desc: "Pilih dari 10 kategori atau buat kuis sendiri dalam hitungan menit.", color: "#4F46E5" },
              { step: "2", icon: "📱", title: "Pemain masukkan PIN", desc: "Buka sikuis.com, masukkan 6-digit kode game yang ditampilkan host.", color: "#EC4899" },
              { step: "3", icon: "🏆", title: "Jawab & menangkan!", desc: "Jawab cepat dan tepat untuk skor tertinggi. Pantau leaderboard live!", color: "#F59E0B" },
            ].map((s) => (
              <div key={s.step} className="card" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.color}dd, ${s.color})`,
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: "1rem",
                  margin: "0 auto 1rem",
                  boxShadow: `0 4px 14px ${s.color}44`,
                }}>
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
      <section style={{ padding: "5rem 1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
          <h2 className="t-h1" style={{ marginBottom: "1rem" }}>
            Siap bermain? <span className="gradient-text">Mulai sekarang!</span>
          </h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem", fontSize: "1rem", lineHeight: 1.65 }}>
            Gratis selamanya. Tidak perlu daftar akun. Langsung main!
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/quizzes")} className="btn btn-gradient btn-xl" style={{ minWidth: 180 }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <SiKuisLogo size={22} />
          <span style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Si<span style={{ color: "var(--accent)" }}>Kuis</span>
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
          Gratis selamanya · Multiplayer real-time · Edukatif · 150+ soal
        </p>
      </footer>
    </main>
  );
}
