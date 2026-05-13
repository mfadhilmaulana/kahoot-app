"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuizMeta } from "@/lib/types";
import {
  IconFlask, IconLandmark, IconSigma, IconCode, IconHeartPulse,
  IconLeaf, IconGlobe, IconTrendingUp, IconType, IconTrophy,
  IconBrain, IconTarget, IconLightbulb, IconZap,
  IconPlay, IconStar,
} from "@/components/icons";
import { SiKuisLogoMark } from "@/components/icons";

/* Map quiz ID → SVG icon component */
function QuizIcon({ quizId, size = 26, color }: { quizId: string; size?: number; color: string }) {
  const map: Record<string, React.FC<{ size?: number; color?: string }>> = {
    science:      IconFlask,
    "history-id": IconLandmark,
    math:         IconSigma,
    digital:      IconCode,
    health:       IconHeartPulse,
    environment:  IconLeaf,
    general:      IconGlobe,
    economics:    IconTrendingUp,
    bahasa:       IconType,
    sports:       IconTrophy,
    iq:           IconBrain,
    psychology:   IconTarget,
    geography:    IconGlobe,
  };
  const Icon = map[quizId] ?? IconLightbulb;
  return <Icon size={size} color={color} />;
}

const DIFF_COLOR: Record<string, string> = {
  Mudah: "#16A34A",
  Sedang: "#CA8A04",
  Sulit: "#DC2626",
};

const TYPE_LABEL: Record<string, string> = {
  mc: "Pilihan Ganda",
  tf: "Benar/Salah",
  poll: "Pendapat",
  rating: "Rating",
  open: "Teks Bebas",
};

const FILTERS = ["Semua", "Mudah", "Sedang", "Sulit"];

export default function QuizzesPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    function loadQuizzes() {
      socket.emit("quizzes:list", {}, (list: QuizMeta[]) => {
        setQuizzes(list);
        setLoading(false);
      });
    }
    if (socket.connected) loadQuizzes();
    else socket.once("connect", loadQuizzes);
  }, []);

  function handleCreate(quizId: string) {
    if (creating) return;
    setCreating(quizId);
    setError("");
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("host:create", { quizId }, (res: { pin?: string; error?: string }) => {
      setCreating(null);
      if (res.error) { setError(res.error); return; }
      if (res.pin) router.push(`/host/${res.pin}`);
    });
  }

  const visible = quizzes.filter((q) => {
    if (filter !== "Semua" && q.difficulty !== filter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)",
        padding: "2rem 1.5rem 3.5rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 40, padding: "0.4rem 0.875rem", color: "rgba(255,255,255,0.9)",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", marginBottom: "1.25rem",
        }}>
          ← Beranda
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <SiKuisLogoMark size={32} id="quizzes-logo" />
          <div>
            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(1.25rem,4vw,1.75rem)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Jelajahi Kuis
            </h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
              {loading ? "Memuat..." : `${quizzes.length} kuis tersedia · Pilih dan mulai game`}
            </p>
          </div>
        </div>

        {/* Stats pills */}
        {!loading && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { icon: "📚", label: `${quizzes.length} Kuis` },
              { icon: "❓", label: `${quizzes.reduce((s, q) => s + q.questionCount, 0)} Soal` },
              { icon: "🏆", label: "Gratis Semua" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 40, padding: "0.3rem 0.875rem",
                fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.92)",
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
                {s.icon} {s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Search + Filter bar ── */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0.875rem 1.25rem",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kuis..."
            className="input"
            style={{ flex: "1 1 160px", fontSize: "0.85rem", height: 36 }}
          />
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontWeight: 700,
                borderRadius: 40, border: "1.5px solid",
                cursor: "pointer", transition: "all 120ms",
                background: filter === f ? "var(--accent)" : "transparent",
                borderColor: filter === f ? "var(--accent)" : "var(--border-hi)",
                color: filter === f ? "#fff" : "var(--text-dim)",
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ padding: "0.75rem 1rem", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 12, color: "#DC2626", fontSize: "0.85rem", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "5rem 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--surface-3)", borderTopColor: "var(--accent)", animation: "spinRing 0.8s linear infinite" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Memuat kuis...</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ color: "var(--text-dim)", fontWeight: 600 }}>Tidak ada kuis yang cocok</p>
            <button onClick={() => { setSearch(""); setFilter("Semua"); }} style={{ marginTop: "1rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
              Reset filter
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(290px,100%), 1fr))", gap: "1rem" }}>
            {visible.map((quiz, i) => {
              const isCreating = creating === quiz.id;
              return (
                <button
                  key={quiz.id}
                  onClick={() => handleCreate(quiz.id)}
                  disabled={!!creating}
                  className="a-fadeup"
                  style={{
                    animationDelay: `${i * 0.04}s`,
                    display: "flex", flexDirection: "column",
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: 20, padding: 0, overflow: "hidden",
                    cursor: creating ? "wait" : "pointer", textAlign: "left",
                    transition: "transform 160ms, box-shadow 160ms, border-color 160ms",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = quiz.color;
                    e.currentTarget.style.boxShadow = `0 12px 32px ${quiz.color}28`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                  }}
                >
                  {/* Card banner */}
                  <div style={{
                    height: 72,
                    background: `linear-gradient(135deg, ${quiz.color}dd 0%, ${quiz.color} 100%)`,
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}>
                    {/* Large faded icon as background */}
                    <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.15 }}>
                      <QuizIcon quizId={quiz.id} size={80} color="#fff" />
                    </div>
                    {/* Difficulty badge */}
                    <div style={{
                      position: "absolute", top: 10, right: 12,
                      background: "rgba(0,0,0,0.28)", borderRadius: 40,
                      padding: "0.18rem 0.6rem", fontSize: "0.65rem", fontWeight: 800,
                      color: "#fff", letterSpacing: "0.04em",
                    }}>
                      {quiz.difficulty.toUpperCase()}
                    </div>
                    {/* Icon circle */}
                    <div style={{
                      position: "absolute", left: 16, bottom: -18,
                      width: 52, height: 52, borderRadius: 16,
                      background: "#fff",
                      boxShadow: `0 4px 16px ${quiz.color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${quiz.color}33`,
                    }}>
                      <QuizIcon quizId={quiz.id} size={26} color={quiz.color} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "1.25rem 1.125rem 1rem", paddingTop: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <h3 style={{
                      fontWeight: 800, fontSize: "0.95rem", color: "var(--text)",
                      lineHeight: 1.3, marginLeft: 60,
                    }}>
                      {quiz.title}
                    </h3>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", lineHeight: 1.5 }}>
                      {quiz.description}
                    </p>

                    {/* Stats row */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ fontSize: "0.75rem" }}>❓</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)" }}>{quiz.questionCount} soal</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ fontSize: "0.75rem" }}>⏱</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)" }}>~{quiz.estimatedMins} mnt</span>
                      </div>
                    </div>

                    {/* Type tags */}
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {quiz.types.map((t) => (
                        <span key={t} style={{
                          background: `${quiz.color}18`, color: quiz.color,
                          fontSize: "0.62rem", fontWeight: 700,
                          padding: "0.18rem 0.5rem", borderRadius: 40,
                          border: `1px solid ${quiz.color}30`,
                        }}>
                          {TYPE_LABEL[t] ?? t}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{
                      marginTop: "0.25rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: DIFF_COLOR[quiz.difficulty] }} />
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: DIFF_COLOR[quiz.difficulty] }}>{quiz.difficulty}</span>
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                        background: isCreating ? "var(--surface-3)" : quiz.color,
                        color: "#fff", borderRadius: 40,
                        padding: "0.3rem 0.875rem", fontSize: "0.75rem", fontWeight: 800,
                        transition: "opacity 150ms",
                        opacity: creating && !isCreating ? 0.5 : 1,
                      }}>
                        {isCreating ? (
                          <>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spinRing 0.7s linear infinite" }} />
                            Membuat...
                          </>
                        ) : (
                          <>
                            <IconPlay size={12} color="#fff" />
                            Host Game
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
