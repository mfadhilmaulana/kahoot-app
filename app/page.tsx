"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SiKuisLogoMark,
  IconZap, IconBrain, IconBarChart, IconGift,
  IconFlask, IconLandmark, IconSigma, IconCode,
  IconHeartPulse, IconLeaf, IconGlobe, IconTrendingUp, IconType, IconTrophy,
  IconPlay, IconUsers, IconStar, IconTarget, IconCheckCircle,
  IconClock, IconAward, IconLightbulb, IconArrowRight, IconHome,
} from "@/components/icons";

/* ── Nav configuration (Kahoot-style colored pills) ─────────────────────────── */
const NAV_TABS = [
  { label: "Jelajahi",    Icon: IconGlobe,   iconBg: "#22C55E", href: "/quizzes"    },
  { label: "Belajar Solo",Icon: IconBrain,   iconBg: "#F59E0B", href: "/solo"       },
  { label: "Flashcards",  Icon: IconStar,    iconBg: "#8B5CF6", href: "/flashcards" },
  { label: "Host Game",   Icon: IconPlay,    iconBg: "#2563EB", href: "/quizzes"    },
  { label: "Buat Kuis",   Icon: IconCode,    iconBg: "#EF4444", href: "/create"     },
];

/* ── Feature grid (12 features — Kahoot360-level) ───────────────────────────── */
const FEATURES = [
  { Icon: IconZap,        title: "Multiplayer Real-Time",    desc: "Ratusan pemain, satu skor live. Skor diperbarui setiap detik tanpa refresh.",      color: "#2563EB", bg: "rgba(37,99,235,0.10)"   },
  { Icon: IconBrain,      title: "Mode Belajar Solo",        desc: "Latihan mandiri kapan saja. Solo kompetitif, latihan santai, flashcards, atau Ghost Mode.", color: "#7C3AED", bg: "rgba(124,58,237,0.10)"  },
  { Icon: IconBarChart,   title: "5 Jenis Pertanyaan",       desc: "Pilihan ganda, benar/salah, pendapat, rating bintang, dan jawaban teks bebas.",     color: "#E21B3C", bg: "rgba(226,27,60,0.10)"   },
  { Icon: IconTrophy,     title: "Leaderboard Live",         desc: "Skor dan peringkat tampil langsung setelah setiap pertanyaan selesai.",             color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  { Icon: IconTarget,     title: "Tes IQ & Psikologi",       desc: "Uji kemampuan kognitif dan pola pikir dengan soal ilmiah berstandar tinggi.",       color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  { Icon: IconLightbulb,  title: "Penjelasan Mendalam",      desc: "Setiap jawaban dilengkapi penjelasan ilmiah — belajar dari setiap pertanyaan.",     color: "#059669", bg: "rgba(5,150,105,0.10)"   },
  { Icon: IconStar,       title: "Flashcards 3D",            desc: "Kartu belajar dengan animasi flip 3D. Tandai 'Sudah Tahu' dan ulang kartu yang sulit.", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  { Icon: IconCode,       title: "Buat Kuis + AI Generator", desc: "Desain kuis kustom dengan semua tipe soal. AI Generator temukan soal relevan dari bank.", color: "#0891B2", bg: "rgba(8,145,178,0.10)" },
  { Icon: IconGlobe,      title: "200+ Soal Siap Pakai",     desc: "Konten dari 13 kategori: sains, sejarah, matematika, IQ, psikologi, dan lainnya.", color: "#16A34A", bg: "rgba(22,163,74,0.10)"   },
  { Icon: IconUsers,      title: "Bergabung Instan",         desc: "Tanpa akun, tanpa download. Masukkan PIN 6-digit dan langsung main dalam 5 detik.", color: "#EC4899", bg: "rgba(236,72,153,0.10)"  },
  { Icon: IconTarget,     title: "Mode Latihan",             desc: "Belajar tanpa tekanan waktu. Lihat penjelasan langsung & kontrol sendiri tempo belajarmu.", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  { Icon: IconGift,       title: "Ghost Mode",               desc: "Tantang skor terbaikmu sendiri. Skor sebelumnya tersimpan otomatis sebagai 'hantu' lawan.", color: "#22C55E", bg: "rgba(34,197,94,0.10)" },
];

/* ── Categories ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { Icon: IconFlask,      name: "Sains",        grad: "linear-gradient(135deg,#6366F1,#8B5CF6)", glow: "rgba(99,102,241,0.30)"   },
  { Icon: IconLandmark,   name: "Sejarah",      grad: "linear-gradient(135deg,#DC2626,#F97316)", glow: "rgba(220,38,38,0.28)"    },
  { Icon: IconSigma,      name: "Matematika",   grad: "linear-gradient(135deg,#059669,#0D9488)", glow: "rgba(5,150,105,0.28)"    },
  { Icon: IconCode,       name: "Teknologi",    grad: "linear-gradient(135deg,#2563EB,#0891B2)", glow: "rgba(37,99,235,0.28)"    },
  { Icon: IconHeartPulse, name: "Kesehatan",    grad: "linear-gradient(135deg,#EC4899,#8B5CF6)", glow: "rgba(236,72,153,0.28)"   },
  { Icon: IconLeaf,       name: "Lingkungan",   grad: "linear-gradient(135deg,#16A34A,#059669)", glow: "rgba(22,163,74,0.28)"    },
  { Icon: IconGlobe,      name: "Pengetahuan",  grad: "linear-gradient(135deg,#7C3AED,#4F46E5)", glow: "rgba(124,58,237,0.28)"   },
  { Icon: IconTrendingUp, name: "Ekonomi",      grad: "linear-gradient(135deg,#CA8A04,#EA580C)", glow: "rgba(202,138,4,0.28)"    },
  { Icon: IconType,       name: "Bahasa",       grad: "linear-gradient(135deg,#0891B2,#2563EB)", glow: "rgba(8,145,178,0.28)"    },
  { Icon: IconTrophy,     name: "Olahraga",     grad: "linear-gradient(135deg,#EA580C,#EF4444)", glow: "rgba(234,88,12,0.28)"    },
  { Icon: IconBrain,      name: "Tes IQ",       grad: "linear-gradient(135deg,#7C3AED,#6D28D9)", glow: "rgba(124,58,237,0.28)"   },
  { Icon: IconTarget,     name: "Psikologi",    grad: "linear-gradient(135deg,#8B5CF6,#6366F1)", glow: "rgba(139,92,246,0.28)"   },
  { Icon: IconGlobe,      name: "Geografi",     grad: "linear-gradient(135deg,#0891B2,#06B6D4)", glow: "rgba(8,145,178,0.28)"    },
];

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = pin.trim();
    if (cleaned.length !== 6) { setError("Kode game 6 digit"); return; }
    router.push(`/play/${cleaned}`);
  }

  return (
    <main style={{ background: "var(--bg)" }}>

      {/* ══════════════════════════════════════════════════════════════════════════
          STICKY NAV — Kahoot-style dark pill tabs
      ══════════════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(8, 14, 44, 0.92)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        height: 64,
        display: "flex", alignItems: "center",
        padding: "0 1.25rem", gap: "0.5rem",
      }}>
        {/* Logo */}
        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "0.45rem",
          background: "none", border: "none", cursor: "pointer", padding: "0 0.5rem 0 0",
          marginRight: "0.5rem", flexShrink: 0,
        }}>
          <SiKuisLogoMark size={30} id="nav-logo" />
          <span style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.03em", color: "#fff" }}>
            Si<span style={{ color: "#60A5FA" }}>Kuis</span>
          </span>
        </button>

        {/* Nav tabs */}
        <div style={{ display: "flex", gap: "0.35rem", flex: 1, overflow: "hidden" }}>
          {NAV_TABS.map((t) => (
            <button key={t.label} onClick={() => router.push(t.href)} className="nav-tab">
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: t.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <t.Icon size={12} color="#fff" />
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Join button */}
        <button onClick={() => document.getElementById("pin-input")?.focus()} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
          border: "none", borderRadius: 30, cursor: "pointer",
          padding: "0.42rem 1.1rem",
          color: "#fff", fontWeight: 800, fontSize: "0.82rem",
          fontFamily: "inherit",
          boxShadow: "0 2px 12px rgba(37,99,235,0.45)",
          flexShrink: 0,
          transition: "transform 120ms, box-shadow 120ms",
        }}>
          <span style={{ display: "flex", gap: 3 }}>
            {["#22C55E","#F59E0B","#EF4444","#3B82F6"].map((c, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
          </span>
          Bergabung
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════════
          HERO — Full viewport, Kahoot-style dark blue, centered PIN
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100dvh",
        background: "linear-gradient(150deg, #05082A 0%, #0D1B5E 38%, #1E3A8A 70%, #1D4ED8 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 1.5rem 2rem",
        position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        {/* Background blobs */}
        <div className="a-float-slow" style={{ position: "absolute", top: "5%", right: "-8%", width: "50vw", height: "50vw", maxWidth: 600, maxHeight: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="a-float-slow" style={{ position: "absolute", bottom: "5%", left: "-5%", width: "40vw", height: "40vw", maxWidth: 500, maxHeight: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)", pointerEvents: "none", animationDelay: "3s" }} />
        <div style={{ position: "absolute", top: "22%", left: "8%", width: 80, height: 80, borderRadius: "50%", background: "rgba(96,165,250,0.10)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "18%", right: "12%", width: 56, height: 56, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "55%", left: "5%", width: 36, height: 36, borderRadius: 8, background: "rgba(139,92,246,0.14)", transform: "rotate(20deg)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "35%", right: "7%", width: 28, height: 28, borderRadius: 6, background: "rgba(34,197,94,0.12)", transform: "rotate(-15deg)", pointerEvents: "none" }} />

        {/* Grid dot pattern */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }} />

        {/* Center content */}
        <div style={{ position: "relative", maxWidth: 460, width: "100%" }}>
          {/* Logo mark */}
          <div className="a-popin center mb-4">
            <SiKuisLogoMark size={64} id="hero-logo" />
          </div>

          {/* Wordmark */}
          <h1 className="a-fadeup d-1" style={{
            fontSize: "clamp(3rem, 14vw, 5.5rem)",
            fontWeight: 900, letterSpacing: "-0.04em",
            color: "#fff", lineHeight: 1,
            marginBottom: "0.5rem",
          }}>
            SiKuis<span style={{ color: "#F59E0B" }}>!</span>
          </h1>

          <p className="a-fadeup d-2" style={{
            color: "rgba(255,255,255,0.62)", fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
            fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
            marginBottom: "2rem",
          }}>
            Platform Kuis Interaktif Indonesia
          </p>

          {/* PIN card */}
          <div className="a-fadeup d-3 pin-card">
            <p style={{ color: "#6B7280", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Game PIN
            </p>
            <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <input
                id="pin-input"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="● ● ● ● ● ●"
                maxLength={6}
                style={{
                  width: "100%", border: `2px solid ${pin.length > 0 ? "#2563EB" : "#E5E7EB"}`,
                  borderRadius: 12, fontSize: "2rem", fontWeight: 900,
                  textAlign: "center", letterSpacing: "0.25em",
                  padding: "0.9rem", outline: "none",
                  fontFamily: "inherit", color: "#111827",
                  background: "#F9FAFB",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,0.14)"}
                onBlur={(e) => e.target.style.boxShadow = "none"}
              />
              {error && <p style={{ color: "#DC2626", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", marginTop: "-0.2rem" }}>{error}</p>}
              <button type="submit" style={{
                background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
                color: "#fff", border: "none", borderRadius: 12,
                padding: "1rem", fontSize: "1.05rem", fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 20px rgba(37,99,235,0.38)",
                transition: "transform 120ms, box-shadow 120ms, filter 120ms",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.filter = "brightness(1.1)"; (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.filter = "none"; (e.target as HTMLElement).style.transform = "none"; }}>
                Masuk <IconArrowRight size={18} color="#fff" />
              </button>
            </form>
          </div>

          {/* Alt CTAs */}
          <div className="a-fadeup d-4" style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: "rgba(255,255,255,0.18)" }} />
            <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.72rem", fontWeight: 600 }}>atau</span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: "rgba(255,255,255,0.18)" }} />
          </div>

          <div className="a-fadeup d-5" style={{ marginTop: "1rem", display: "flex", gap: "0.65rem", justifyContent: "center" }}>
            <button onClick={() => router.push("/solo")} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(255,255,255,0.10)", border: "1.5px solid rgba(255,255,255,0.22)",
              borderRadius: 30, padding: "0.5rem 1.1rem",
              color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 120ms, transform 120ms",
            }}>
              <IconPlay size={15} color="#60A5FA" /> Mode Solo
            </button>
            <button onClick={() => router.push("/quizzes")} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(245,158,11,0.18)", border: "1.5px solid rgba(245,158,11,0.35)",
              borderRadius: 30, padding: "0.5rem 1.1rem",
              color: "#FCD34D", fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 120ms, transform 120ms",
            }}>
              <IconGlobe size={15} color="#FCD34D" /> Demo Kuis
            </button>
            <button onClick={() => router.push("/create")} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
              borderRadius: 30, padding: "0.5rem 1.1rem",
              color: "rgba(255,255,255,0.75)", fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 120ms, transform 120ms",
            }}>
              + Buat Kuis
            </button>
          </div>

          {/* Scroll hint */}
          <div className="a-bounce" style={{ marginTop: "2.5rem", color: "rgba(255,255,255,0.28)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em" }}>
            ↓ scroll untuk lihat fitur
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(90deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
        padding: "1.4rem 1.5rem",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "1rem" }}>
          {[
            { value: "200+", label: "Soal Edukatif", Icon: IconBrain },
            { value: "13",   label: "Kategori Kuis",  Icon: IconGlobe },
            { value: "5",    label: "Tipe Soal",       Icon: IconBarChart },
            { value: "∞",    label: "Pemain / Game",   Icon: IconUsers },
          ].map(({ value, label, Icon }) => (
            <div key={label} style={{ textAlign: "center", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
              <Icon size={18} color="rgba(255,255,255,0.65)" />
              <div style={{ fontSize: "clamp(1.4rem,4vw,2rem)", fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, opacity: 0.72, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURES — Dark section, Kahoot360-style comprehensive
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(180deg, #0A0F2E 0%, #0D1B5E 100%)",
        padding: "5rem 1.5rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 1020, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(37,99,235,0.18)", border: "1px solid rgba(37,99,235,0.30)", borderRadius: 30, padding: "0.35rem 1rem", marginBottom: "1rem" }}>
              <IconStar size={13} color="#60A5FA" />
              <span style={{ color: "#93C5FD", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Fitur Lengkap</span>
            </div>
            <h2 style={{ color: "#fff", fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.75rem", lineHeight: 1.15 }}>
              Ekosistem belajar yang <br />
              <span style={{ background: "linear-gradient(135deg,#60A5FA,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>komprehensif</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "1rem", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
              Dari kuis multiplayer hingga tes IQ mandiri — semua fitur yang kamu butuhkan untuk belajar lebih seru.
            </p>
          </div>

          {/* 4-col feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px,100%),1fr))", gap: "1rem" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feat-mega a-fadeup" style={{ animationDelay: `${i * 0.05}s` }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: f.bg,
                  border: `1px solid ${f.color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "0.875rem",
                }}>
                  <f.Icon size={22} color={f.color} />
                </div>
                <h3 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.48)", fontSize: "0.82rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          SOLO MODE HIGHLIGHT
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #0891B2 100%)",
        padding: "4.5rem 1.5rem",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -80, width: 340, height: 340, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 840, margin: "0 auto", display: "flex", gap: "3.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "rgba(245,158,11,0.22)", border: "1px solid rgba(245,158,11,0.38)", borderRadius: 40, padding: "0.3rem 0.9rem", marginBottom: "1.1rem" }}>
              <IconTarget size={12} color="#FCD34D" />
              <span style={{ color: "#FCD34D", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Fitur Baru</span>
            </div>
            <h2 style={{ color: "#fff", fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "0.875rem" }}>
              Belajar kapan saja,<br />tanpa perlu teman
            </h2>
            <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.97rem", lineHeight: 1.7, marginBottom: "1.75rem", maxWidth: 380 }}>
              Mode Solo SiKuis memungkinkan kamu berlatih dari 13 kategori kuis — termasuk Tes IQ dan Psikologi. Skor instan, penjelasan mendalam, dan rating bintang setelah selesai.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/solo")} className="btn btn-lg" style={{
                background: "#fff", color: "#1D4ED8", fontWeight: 800,
                display: "flex", alignItems: "center", gap: "0.45rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
              }}>
                <IconPlay size={18} color="#1D4ED8" /> Mulai Sekarang
              </button>
              <button onClick={() => router.push("/quizzes")} className="btn btn-lg" style={{
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.28)",
                display: "flex", alignItems: "center", gap: "0.45rem",
              }}>
                <IconUsers size={18} color="#fff" /> Mode Multiplayer
              </button>
            </div>
          </div>

          {/* Feature bullets */}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {[
              { Icon: IconCheckCircle, text: "13 Kategori kuis pilihan",    color: "#34D399" },
              { Icon: IconBrain,       text: "Tes IQ & analisis psikologi", color: "#A78BFA" },
              { Icon: IconTarget,      text: "Skor & penjelasan instan",    color: "#60A5FA" },
              { Icon: IconStar,        text: "Rating bintang 1–3",          color: "#FCD34D" },
              { Icon: IconClock,       text: "Timer per pertanyaan",        color: "#FB7185" },
              { Icon: IconAward,       text: "Rangkuman hasil lengkap",     color: "#F97316" },
            ].map(({ Icon, text, color }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ color: "rgba(255,255,255,0.88)", fontSize: "0.875rem", fontWeight: 600 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--bg)", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <p className="t-label mb-2">Cara Bermain</p>
          <h2 className="t-h1" style={{ color: "var(--text)", marginBottom: "0.5rem" }}>Mulai dalam 3 langkah</h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "3rem", fontSize: "0.95rem" }}>Tanpa daftar akun. Tanpa download. Langsung main.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%),1fr))", gap: "1.25rem" }}>
            {[
              { n: "1", Icon: IconHome,   color: "#2563EB", title: "Host buka kuis",      desc: "Pilih dari 13 kategori atau buat kuis kustom sendiri. Host mendapat kode PIN 6-digit." },
              { n: "2", Icon: IconUsers,  color: "#EC4899", title: "Pemain scan PIN",      desc: "Buka sikuis.com di HP atau laptop, masukkan PIN yang ditampilkan host. Tidak perlu akun!" },
              { n: "3", Icon: IconTrophy, color: "#F59E0B", title: "Jawab & menangkan!",   desc: "Jawab lebih cepat dan tepat untuk skor tertinggi. Cek leaderboard live setiap ronde!" },
            ].map((s) => (
              <div key={s.n} className="card" style={{ padding: "2rem 1.5rem", textAlign: "center", position: "relative" }}>
                <div style={{
                  position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
                  width: 36, height: 36, borderRadius: "50%",
                  background: s.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: "0.9rem",
                  boxShadow: `0 4px 14px ${s.color}55`,
                }}>
                  {s.n}
                </div>
                <div style={{ paddingTop: "1rem" }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 18,
                    background: `linear-gradient(135deg, ${s.color}22, ${s.color}0A)`,
                    border: `2px solid ${s.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}>
                    <s.Icon size={28} color={s.color} />
                  </div>
                  <h3 className="t-h3" style={{ marginBottom: "0.5rem" }}>{s.title}</h3>
                  <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--surface-2)", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <p className="t-label mb-2">Pilihan Topik</p>
            <h2 className="t-h1" style={{ color: "var(--text)" }}>13 Kategori Pengetahuan</h2>
            <p style={{ color: "var(--text-dim)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Dari sains hingga psikologi — tersedia lengkap untuk semua minat</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(120px, 45%), 1fr))", gap: "0.75rem" }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} className="cat-tile a-fadeup" style={{ animationDelay: `${i * 0.04}s` }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: c.grad,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 0.6rem",
                  boxShadow: `0 6px 16px ${c.glow}`,
                }}>
                  <c.Icon size={24} color="#fff" />
                </div>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.8rem" }}>{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(180deg, #0A0F2E 0%, #05082A 100%)",
        padding: "5rem 1.5rem",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
          <SiKuisLogoMark size={56} id="cta-logo" />
          <h2 style={{ color: "#fff", fontSize: "clamp(1.75rem,5vw,3rem)", fontWeight: 900, letterSpacing: "-0.03em", margin: "1.25rem 0 0.75rem", lineHeight: 1.1 }}>
            Siap mulai? Masukkan<br />
            <span style={{ background: "linear-gradient(135deg,#60A5FA,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>PIN game sekarang!</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.50)", marginBottom: "2rem", fontSize: "0.97rem", lineHeight: 1.65 }}>
            Gratis selamanya. Tidak perlu daftar. Langsung main.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => document.getElementById("pin-input")?.focus(), 600); }} style={{
              background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "0.95rem 2rem", fontSize: "1rem", fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(37,99,235,0.40)",
              display: "flex", alignItems: "center", gap: "0.45rem",
            }}>
              <IconPlay size={18} color="#fff" /> Masukkan PIN
            </button>
            <button onClick={() => router.push("/solo")} className="btn btn-lg" style={{ background: "rgba(255,255,255,0.10)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <IconBrain size={18} color="#A78BFA" /> Mode Solo
            </button>
            <button onClick={() => router.push("/create")} className="btn btn-lg" style={{ background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1.5px solid rgba(245,158,11,0.30)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              + Buat Kuis
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: "#030714",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "2rem 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <SiKuisLogoMark size={20} id="footer-logo" />
          <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "#fff", letterSpacing: "-0.02em" }}>
            Si<span style={{ color: "#60A5FA" }}>Kuis</span>
          </span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.72rem", lineHeight: 1.7 }}>
          Gratis selamanya · Real-time multiplayer · Mode solo · 200+ soal · 13 kategori
        </p>
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {[
            { label: "Demo Kuis", href: "/quizzes" },
            { label: "Mode Solo", href: "/solo" },
            { label: "Buat Kuis", href: "/create" },
          ].map((l) => (
            <button key={l.label} onClick={() => router.push(l.href)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.38)", fontSize: "0.75rem", fontWeight: 600,
              fontFamily: "inherit", transition: "color 120ms",
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.75)"}
            onMouseLeave={(e) => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.38)"}>
              {l.label}
            </button>
          ))}
        </div>
      </footer>
    </main>
  );
}
