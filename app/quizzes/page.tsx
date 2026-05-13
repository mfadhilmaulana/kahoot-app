"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuizMeta } from "@/lib/types";
import { QuizIconByID, IconPlay, SiKuisLogoMark } from "@/components/icons";

const DIFF_COLOR: Record<string, string> = {
  Mudah: "#16A34A", Sedang: "#CA8A04", Sulit: "#DC2626",
};
const FILTERS = ["Semua", "Mudah", "Sedang", "Sulit"];
const TYPE_LABEL: Record<string, string> = {
  mc: "PG", tf: "B/S", poll: "Pendapat", rating: "Rating", open: "Teks",
};

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
        background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)",
        padding: "1.75rem 1.5rem 2.5rem",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 40, padding: "0.35rem 0.875rem", color: "rgba(255,255,255,0.85)",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", marginBottom: "1.25rem",
        }}>
          ← Beranda
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <SiKuisLogoMark size={32} id="qz-logo" />
          <div>
            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.03em" }}>Jelajahi Kuis</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              {loading ? "Memuat..." : `${quizzes.length} kuis · Host langsung, mulai dalam detik`}
            </p>
          </div>
        </div>

        {!loading && (
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { label: `${quizzes.length} Kuis` },
              { label: `${quizzes.reduce((s, q) => s + q.questionCount, 0)} Soal` },
              { label: "Gratis" },
            ].map((s, i) => (
              <span key={i} style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 40, padding: "0.25rem 0.75rem",
                fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.9)",
              }}>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0.75rem 1.25rem", position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kuis..."
            className="input"
            style={{ flex: "1 1 140px", fontSize: "0.82rem", height: 34 }}
          />
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "0.28rem 0.65rem", fontSize: "0.72rem", fontWeight: 700,
                borderRadius: 40, border: "1.5px solid",
                cursor: "pointer", transition: "all 100ms",
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
        <div style={{ maxWidth: 900, margin: "1rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ padding: "0.7rem 1rem", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 12, color: "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* ── Card grid ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "5rem 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--surface-3)", borderTopColor: "var(--accent)", animation: "spinRing 0.8s linear infinite" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Memuat kuis...</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ color: "var(--text-dim)", fontWeight: 600, marginBottom: "0.75rem" }}>Tidak ada kuis yang cocok</p>
            <button onClick={() => { setSearch(""); setFilter("Semua"); }} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
              Reset filter
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px,100%), 1fr))", gap: "0.75rem" }}>
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
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: 16, padding: "1rem 1.125rem",
                    cursor: creating ? "wait" : "pointer", textAlign: "left",
                    transition: "border-color 150ms, transform 150ms, box-shadow 150ms",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = quiz.color;
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 8px 24px ${quiz.color}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${quiz.color}cc, ${quiz.color})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 12px ${quiz.color}44`,
                  }}>
                    <QuizIconByID quizId={quiz.id} size={24} color="#fff" />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <p style={{ fontWeight: 800, color: "var(--text)", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {quiz.title}
                      </p>
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 800, flexShrink: 0,
                        color: DIFF_COLOR[quiz.difficulty],
                        background: DIFF_COLOR[quiz.difficulty] + "18",
                        borderRadius: 40, padding: "0.12rem 0.45rem",
                      }}>
                        {quiz.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.72rem", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.55rem" }}>
                      {quiz.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>
                          {quiz.questionCount} soal · ~{quiz.estimatedMins} mnt
                        </span>
                        <div style={{ display: "flex", gap: "0.2rem" }}>
                          {quiz.types.slice(0, 3).map((t) => (
                            <span key={t} style={{
                              background: `${quiz.color}15`, color: quiz.color,
                              fontSize: "0.58rem", fontWeight: 700,
                              padding: "0.1rem 0.35rem", borderRadius: 40,
                            }}>
                              {TYPE_LABEL[t] ?? t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.3rem",
                        background: isCreating ? "var(--surface-3)" : quiz.color,
                        color: "#fff", borderRadius: 40,
                        padding: "0.25rem 0.65rem", fontSize: "0.68rem", fontWeight: 800,
                        opacity: creating && !isCreating ? 0.5 : 1,
                        flexShrink: 0,
                      }}>
                        {isCreating
                          ? <><div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spinRing 0.7s linear infinite" }} /></>
                          : <><IconPlay size={10} color="#fff" /> Host</>
                        }
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
