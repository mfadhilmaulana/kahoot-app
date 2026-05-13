"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SiKuisLogoMark,
  IconZap, IconBrain, IconBarChart, IconGift,
  IconFlask, IconLandmark, IconSigma, IconCode,
  IconHeartPulse, IconLeaf, IconGlobe, IconTrendingUp, IconType, IconTrophy,
  IconPlay, IconUsers, IconStar, IconTarget,
} from "@/components/icons";

const FEATURES = [
  { Icon: IconZap,      title: "Real-Time Multiplayer", desc: "Bermain bersama ratusan orang sekaligus, skor diperbarui langsung.",                 grad: "linear-gradient(135deg,#1D4ED8,#2563EB)" },
  { Icon: IconBrain,    title: "200+ Soal Edukatif",    desc: "Sains, sejarah, matematika, teknologi, psikologi, tes IQ, dan banyak lagi.",         grad: "linear-gradient(135deg,#059669,#0891B2)" },
  { Icon: IconBarChart, title: "5 Jenis Soal",          desc: "Pilihan ganda, benar/salah, pendapat, rating bintang, dan teks bebas.",               grad: "linear-gradient(135deg,#E21B3C,#EC4899)" },
  { Icon: IconGift,     title: "Gratis Selamanya",      desc: "Tanpa biaya, tanpa iklan mengganggu. Buat kuis sendiri kapan saja.",                  grad: "linear-gradient(135deg,#F59E0B,#EF4444)" },
];

const CATEGORIES = [
  { Icon: IconFlask,      name: "Sains",       grad: "linear-gradient(135deg,#6366F1,#8B5CF6)", glow: "rgba(99,102,241,0.30)"  },
  { Icon: IconLandmark,   name: "Sejarah",     grad: "linear-gradient(135deg,#DC2626,#F97316)", glow: "rgba(220,38,38,0.28)"   },
  { Icon: IconSigma,      name: "Matematika",  grad: "linear-gradient(135deg,#059669,#0D9488)", glow: "rgba(5,150,105,0.28)"   },
  { Icon: IconCode,       name: "Teknologi",   grad: "linear-gradient(135deg,#2563EB,#0891B2)", glow: "rgba(37,99,235,0.28)"   },
  { Icon: IconHeartPulse, name: "Kesehatan",   grad: "linear-gradient(135deg,#EC4899,#8B5CF6)", glow: "rgba(236,72,153,0.28)"  },
  { Icon: IconLeaf,       name: "Lingkungan",  grad: "linear-gradient(135deg,#16A34A,#059669)", glow: "rgba(22,163,74,0.28)"   },
  { Icon: IconGlobe,      name: "Pengetahuan", grad: "linear-gradient(135deg,#7C3AED,#4F46E5)", glow: "rgba(124,58,237,0.28)"  },
  { Icon: IconTrendingUp, name: "Ekonomi",     grad: "linear-gradient(135deg,#CA8A04,#EA580C)", glow: "rgba(202,138,4,0.28)"   },
  { Icon: IconType,       name: "Bahasa",      grad: "linear-gradient(135deg,#0891B2,#2563EB)", glow: "rgba(8,145,178,0.28)"   },
  { Icon: IconTrophy,     name: "Olahraga",    grad: "linear-gradient(135deg,#EA580C,#EF4444)", glow: "rgba(234,88,12,0.28)"   },
  { Icon: IconBrain,      name: "Tes IQ",      grad: "linear-gradient(135deg,#7C3AED,#6D28D9)", glow: "rgba(124,58,237,0.28)"  },
  { Icon: IconTarget,     name: "Psikologi",   grad: "linear-gradient(135deg,#8B5CF6,#6366F1)", glow: "rgba(139,92,246,0.28)"  },
  { Icon: IconGlobe,      name: "Geografi",    grad: "linear-gradient(135deg,#0891B2,#06B6D4)", glow: "rgba(8,145,178,0.28)"   },
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

      {/* ── Sticky nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(37,99,235,0.10)",
        padding: "0 1.5rem",
        height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SiKuisLogoMark size={34} id="nav-logo" />
          <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.03em", color: "var(--text)" }}>
            Si<span style={{ color: "var(--accent)" }}>Kuis</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={() => router.push("/solo")} className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Mode Solo
          </button>
          <button onClick={() => router.push("/quizzes")} className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Demo Kuis
          </button>
          <button onClick={() => router.push("/create")} className="btn btn-gradient" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
            Buat Kuis
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 45%, #FEF9C3 100%)",
        padding: "4.5rem 1.5rem 3.5rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="a-float-slow" style={{ position: "absolute", top: -80, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="a-float-slow" style={{ position: "absolute", bottom: -60, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)", pointerEvents: "none", animationDelay: "2s" }} />
        <div style={{ position: "absolute", top: "30%", left: "8%", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#06B6D4)", opacity: 0.18, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#F59E0B,#EF4444)", opacity: 0.20, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "15%", width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2563EB,#1D4ED8)", opacity: 0.15, pointerEvents: "none", transform: "rotate(15deg)" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          {/* Logo badge */}
          <div className="a-popin center mb-5">
            <div style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 40,
              background: "rgba(37,99,235,0.08)",
              border: "1.5px solid rgba(37,99,235,0.18)",
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
            }}>
              <SiKuisLogoMark size={24} id="hero-badge-logo" />
              <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--accent)", letterSpacing: "0.04em" }}>SiKuis</span>
              <span style={{ width: 1, height: 16, background: "rgba(37,99,235,0.25)" }} />
              <span style={{ color: "var(--yellow)", fontSize: "0.75rem", fontWeight: 700 }}>✦ Gratis Selamanya</span>
            </div>
          </div>

          <h1 className="t-display a-fadeup d-1" style={{ color: "var(--text)", marginBottom: "1.25rem", lineHeight: 1.05 }}>
            Belajar Lebih<br />
            <span className="gradient-text">Seru Bersama!</span>
          </h1>

          <p className="a-fadeup d-2" style={{
            color: "var(--text-dim)", fontSize: "clamp(1rem,2.5vw,1.2rem)",
            lineHeight: 1.65, maxWidth: 480, margin: "0 auto 2.75rem",
          }}>
            Platform kuis multiplayer real-time. Tantang teman, perluas wawasan, dan nikmati belajar dengan cara yang menyenangkan.
          </p>

          {/* PIN join card */}
          <div className="a-fadeup d-3" style={{ maxWidth: 420, margin: "0 auto 1.25rem" }}>
            <div className="card" style={{ padding: "1.75rem 2rem", boxShadow: "0 12px 40px rgba(37,99,235,0.14)", borderColor: "rgba(37,99,235,0.15)" }}>
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
            <button onClick={() => router.push("/solo")} className="btn btn-gradient btn-lg" style={{ flex: 1, minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <IconPlay size={17} color="#fff" /> Mode Solo
            </button>
            <button onClick={() => router.push("/quizzes")} className="btn btn-yellow btn-lg" style={{ flex: 1, minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <IconUsers size={17} /> Demo Kuis
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(90deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
        padding: "1.5rem 1.5rem",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(1.5rem, 5vw, 4rem)", flexWrap: "wrap" }}>
          {[
            { value: "200+", label: "Soal Edukatif" },
            { value: "13",   label: "Kategori" },
            { value: "5",    label: "Jenis Soal" },
            { value: "∞",    label: "Pemain" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.78, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.15rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────────── */}
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
                marginBottom: "1rem",
                boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
              }}>
                <f.Icon size={26} color="#fff" />
              </div>
              <h3 className="t-h3" style={{ marginBottom: "0.4rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solo Mode CTA ───────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #0891B2 100%)",
        padding: "3.5rem 1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, right: -70, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -50, width: 240, height: 240, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: "3rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "rgba(245,158,11,0.22)", border: "1px solid rgba(245,158,11,0.40)", borderRadius: 40, padding: "0.3rem 0.85rem", marginBottom: "1rem" }}>
              <IconTarget size={13} color="#FCD34D" />
              <span style={{ color: "#FCD34D", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Mode Solo Baru</span>
            </div>
            <h2 style={{ color: "#fff", fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "0.875rem" }}>
              Latihan tanpa perlu teman!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.95rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
              Uji pengetahuanmu sendiri, tes IQ, atau latihan soal kapan saja. Skor instan, penjelasan lengkap, dan rating bintang di akhir.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/solo")} className="btn btn-lg" style={{
                background: "#fff", color: "#1D4ED8",
                display: "flex", alignItems: "center", gap: "0.45rem",
                fontWeight: 800, boxShadow: "0 4px 18px rgba(0,0,0,0.20)",
              }}>
                <IconPlay size={18} color="#1D4ED8" /> Mulai Mode Solo
              </button>
              <button onClick={() => router.push("/quizzes")} className="btn btn-lg" style={{
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.30)",
                display: "flex", alignItems: "center", gap: "0.45rem",
              }}>
                <IconUsers size={18} color="#fff" /> Multiplayer
              </button>
            </div>
          </div>
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {[
              { Icon: IconStar,   text: "13 Kategori Kuis" },
              { Icon: IconBrain,  text: "Tes IQ & Psikologi" },
              { Icon: IconTarget, text: "Skor & Penjelasan Instan" },
              { Icon: IconTrophy, text: "Rating Bintang" },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={17} color="#fff" />
                </div>
                <span style={{ color: "rgba(255,255,255,0.90)", fontSize: "0.875rem", fontWeight: 600 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "4.5rem 1.5rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p className="t-label mb-2">Topik Tersedia</p>
          <h2 className="t-h2" style={{ color: "var(--text)" }}>13 Kategori Pengetahuan</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(130px, 45%), 1fr))", gap: "0.75rem" }}>
          {CATEGORIES.map((c, i) => (
            <div key={c.name} className="cat-tile a-fadeup" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{
                width: 54, height: 54, borderRadius: 16,
                background: c.grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 0.65rem",
                boxShadow: `0 6px 16px ${c.glow}`,
              }}>
                <c.Icon size={26} color="#fff" />
              </div>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.82rem" }}>{c.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(150deg, #EFF6FF, #DBEAFE)", padding: "4.5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p className="t-label mb-2">Cara Bermain</p>
          <h2 className="t-h1" style={{ color: "var(--text)", marginBottom: "2.5rem" }}>Mudah dalam 3 langkah</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px,100%),1fr))", gap: "1.5rem" }}>
            {[
              { step: "1", Icon: IconPlay,   title: "Host pilih kuis",     desc: "Pilih dari 13 kategori atau buat kuis sendiri dalam hitungan menit.", color: "#2563EB" },
              { step: "2", Icon: IconUsers,  title: "Pemain masukkan PIN", desc: "Buka sikuis.com, masukkan 6-digit kode game yang ditampilkan host.", color: "#EC4899" },
              { step: "3", Icon: IconTrophy, title: "Jawab & menangkan!",  desc: "Jawab cepat dan tepat untuk skor tertinggi. Pantau leaderboard live!", color: "#F59E0B" },
            ].map((s) => (
              <div key={s.step} className="card" style={{ padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.color}dd, ${s.color})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1rem",
                  boxShadow: `0 4px 14px ${s.color}44`,
                }}>
                  <s.Icon size={24} color="#fff" />
                </div>
                <h3 className="t-h3" style={{ marginBottom: "0.4rem" }}>{s.title}</h3>
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA bottom ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <SiKuisLogoMark size={54} id="cta-logo" />
          </div>
          <h2 className="t-h1" style={{ marginBottom: "1rem" }}>
            Siap bermain? <span className="gradient-text">Mulai sekarang!</span>
          </h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem", fontSize: "1rem", lineHeight: 1.65 }}>
            Gratis selamanya. Tidak perlu daftar akun. Langsung main!
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/solo")} className="btn btn-gradient btn-xl" style={{ minWidth: 160, display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <IconPlay size={20} color="#fff" /> Mode Solo
            </button>
            <button onClick={() => router.push("/quizzes")} className="btn btn-yellow btn-xl" style={{ minWidth: 160, display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <IconUsers size={20} /> Demo Kuis
            </button>
            <button onClick={() => router.push("/create")} className="btn btn-surface btn-xl" style={{ minWidth: 160 }}>
              ✏️ Buat Kuis
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <SiKuisLogoMark size={22} id="footer-logo" />
          <span style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Si<span style={{ color: "var(--accent)" }}>Kuis</span>
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
          Gratis selamanya · Multiplayer real-time · Mode Solo · 200+ soal · 13 kategori
        </p>
      </footer>
    </main>
  );
}
