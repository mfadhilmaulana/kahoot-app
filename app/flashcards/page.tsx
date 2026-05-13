"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import {
  SiKuisLogoMark, IconBrain, IconCheckCircle, IconArrowRight,
  IconHome, IconStar, IconTarget, IconPlay, IconAward,
} from "@/components/icons";

interface QuizCard {
  id: string; title: string; icon: string; color: string;
  category: string; difficulty: string; questionCount: number;
}
interface Flashcard {
  question: string; answer: string; explanation: string; allOptions?: string[];
}

type Phase = "select" | "loading" | "studying" | "reviewing" | "done";

const DIFF_COLOR: Record<string, string> = { Mudah: "#16A34A", Sedang: "#CA8A04", Sulit: "#DC2626" };

export default function FlashcardsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [quizList, setQuizList] = useState<QuizCard[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knew, setKnew] = useState<number[]>([]);
  const [learning, setLearning] = useState<number[]>([]);
  const [round, setRound] = useState(1);

  useEffect(() => {
    const socket = getSocket();
    function load() {
      socket.emit("quizzes:list", {}, (list: QuizCard[]) => setQuizList(list));
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }, []);

  function startQuiz(quiz: QuizCard) {
    setPhase("loading");
    const socket = getSocket();
    function load() {
      socket.emit("quiz:getSoloData", { quizId: quiz.id }, (res: any) => {
        if (res.error) { setPhase("select"); return; }
        const fc: Flashcard[] = (res.questions as any[])
          .filter((q) => q.type === "mc" || q.type === "tf")
          .map((q) => ({
            question: q.question,
            answer: q.options[q.correctIndex] ?? "—",
            explanation: q.explanation ?? "",
            allOptions: q.type === "mc" ? q.options : undefined,
          }));
        setCards(fc);
        setQuizTitle(res.title);
        setIdx(0); setFlipped(false); setKnew([]); setLearning([]); setRound(1);
        setPhase("studying");
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }

  function markKnew() {
    const next = [...knew, idx];
    setKnew(next);
    advance(next, learning);
  }

  function markLearning() {
    const next = [...learning, idx];
    setLearning(next);
    advance(knew, next);
  }

  function advance(k: number[], l: number[]) {
    if (idx + 1 >= cards.length) {
      setPhase(l.length > 0 ? "reviewing" : "done");
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  function reviewLearning() {
    const reviewCards = learning.map((i) => cards[i]);
    setCards(reviewCards);
    setIdx(0); setFlipped(false); setKnew([]); setLearning([]);
    setRound((r) => r + 1);
    setPhase("studying");
  }

  /* ── SELECT ──────────────────────────────────────────────────────────────── */
  if (phase === "select") {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div style={{
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, zIndex: 10,
          padding: "0 1.25rem", height: 62,
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ padding: "0.45rem 0.75rem" }}>
            <IconHome size={18} color="var(--text-dim)" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <IconBrain size={22} color="var(--accent)" />
            <div>
              <h1 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>Flashcards</h1>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Pilih kuis untuk dipelajari</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🃏</div>
          <h2 style={{ color: "#fff", fontSize: "clamp(1.4rem,4vw,2rem)", fontWeight: 900, marginBottom: "0.5rem" }}>Mode Flashcard</h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", maxWidth: 400, margin: "0 auto" }}>
            Pelajari soal dan jawaban satu per satu. Tandai yang sudah tahu — ulangi yang belum.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {[
              { icon: "🔄", text: "Flip untuk jawaban" },
              { icon: "✅", text: "Tandai yang Tahu" },
              { icon: "📚", text: "Ulangi yang Belum" },
            ].map((i) => (
              <div key={i.text} style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>{i.icon}</span>{i.text}
              </div>
            ))}
          </div>
        </div>

        {/* Quiz list */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem" }}>
          <p className="t-label mb-3">Pilih Kuis</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(310px,100%),1fr))", gap: "0.75rem" }}>
            {quizList.filter((q) => q.questionCount > 0).map((q) => (
              <button key={q.id} onClick={() => startQuiz(q)} style={{
                background: "var(--surface)", border: "1.5px solid var(--border)",
                borderRadius: 16, padding: "1rem 1.25rem",
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: "1rem",
                transition: "border-color 140ms, transform 140ms, box-shadow 140ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px var(--accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: q.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", flexShrink: 0,
                  boxShadow: `0 4px 12px ${q.color}55`,
                }}>
                  {q.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.title}</p>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{q.questionCount} soal</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)" }} />
                    <span style={{ fontSize: "0.72rem", color: DIFF_COLOR[q.difficulty] ?? "var(--text-muted)", fontWeight: 700 }}>{q.difficulty}</span>
                  </div>
                </div>
                <IconArrowRight size={16} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ── LOADING ─────────────────────────────────────────────────────────────── */
  if (phase === "loading") {
    return (
      <main className="min-h-screen center col" style={{ background: "var(--bg)", gap: "1rem" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid var(--accent)", borderTopColor: "transparent", animation: "spinRing 0.8s linear infinite" }} />
        <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Memuat kartu...</p>
      </main>
    );
  }

  /* ── STUDYING ────────────────────────────────────────────────────────────── */
  if (phase === "studying" && cards.length > 0) {
    const card = cards[idx];
    const progress = ((idx) / cards.length) * 100;

    return (
      <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
        {/* Top bar */}
        <div style={{ padding: "0.75rem 1rem", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => setPhase("select")} className="btn btn-ghost" style={{ padding: "0.4rem 0.6rem" }}>
            <IconHome size={16} color="var(--text-dim)" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.35rem" }}>
              <span>{quizTitle}{round > 1 ? ` · Ulangan ${round}` : ""}</span>
              <span>{idx + 1} / {cards.length}</span>
            </div>
            <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--accent)", borderRadius: 2, width: `${progress}%`, transition: "width 0.3s ease" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
            <span style={{ color: "#16A34A" }}>✓ {knew.length}</span>
            <span style={{ color: "#DC2626" }}>✗ {learning.length}</span>
          </div>
        </div>

        {/* Card area */}
        <div className="flex-1 col items-center justify-center px-4 py-6" style={{ gap: "1.5rem" }}>
          {/* Flip hint */}
          {!flipped && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em" }}>
              KETUK KARTU UNTUK LIHAT JAWABAN
            </p>
          )}

          {/* The card */}
          <div className="fc-scene" style={{ height: 280, maxWidth: 500 }} onClick={() => setFlipped(!flipped)}>
            <div className={`fc-inner${flipped ? " fc-flipped" : ""}`} style={{ height: 280 }}>
              {/* Front — Question */}
              <div className="fc-face" style={{ background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem" }}>PERTANYAAN</p>
                <p style={{ color: "var(--text)", fontSize: "clamp(1rem,3vw,1.25rem)", fontWeight: 700, textAlign: "center", lineHeight: 1.45 }}>{card.question}</p>
                {card.allOptions && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginTop: "0.875rem" }}>
                    {card.allOptions.map((o, i) => (
                      <span key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.2rem 0.6rem", fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>
                        {o}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "auto", paddingTop: "1rem" }}>🔄 ketuk untuk balik</p>
              </div>

              {/* Back — Answer */}
              <div className="fc-face fc-back" style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "2px solid rgba(37,99,235,0.25)", boxShadow: "0 8px 32px rgba(37,99,235,0.14)" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: "0.75rem" }}>JAWABAN BENAR</p>
                <p style={{ color: "var(--accent)", fontSize: "clamp(1.1rem,3.5vw,1.5rem)", fontWeight: 900, textAlign: "center", marginBottom: card.explanation ? "1rem" : 0 }}>{card.answer}</p>
                {card.explanation && (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", textAlign: "center", lineHeight: 1.55, maxWidth: 340 }}>{card.explanation}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons — only show after flip */}
          {flipped ? (
            <div style={{ display: "flex", gap: "0.875rem", width: "100%", maxWidth: 500 }}>
              <button onClick={markLearning} style={{
                flex: 1, padding: "0.875rem", border: "2px solid #FECACA",
                background: "#FEF2F2", borderRadius: 14,
                color: "#DC2626", fontWeight: 800, fontSize: "0.95rem",
                cursor: "pointer", fontFamily: "inherit",
                transition: "transform 120ms, box-shadow 120ms",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
              }}>
                ✗ Belum Tahu
              </button>
              <button onClick={markKnew} style={{
                flex: 1, padding: "0.875rem", border: "2px solid #BBF7D0",
                background: "#F0FDF4", borderRadius: 14,
                color: "#16A34A", fontWeight: 800, fontSize: "0.95rem",
                cursor: "pointer", fontFamily: "inherit",
                transition: "transform 120ms, box-shadow 120ms",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
              }}>
                <IconCheckCircle size={18} color="#16A34A" /> Sudah Tahu
              </button>
            </div>
          ) : (
            <button onClick={() => setFlipped(true)} className="btn btn-ghost" style={{ padding: "0.75rem 2rem" }}>
              Lihat Jawaban →
            </button>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {cards.map((_, i) => (
              <div key={i} style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i < idx ? (knew.includes(i) ? "#16A34A" : "#EF4444") : i === idx ? "var(--accent)" : "var(--surface-3)",
                transition: "all 0.2s",
              }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ── REVIEWING (end of round with some "learning" left) ──────────────────── */
  if (phase === "reviewing") {
    const knewPct = Math.round((knew.length / (knew.length + learning.length)) * 100);
    return (
      <main className="min-h-screen col items-center justify-center px-4 text-center" style={{ background: "var(--bg)", paddingTop: "2rem", paddingBottom: "2rem", gap: "0" }}>
        <div className="a-popin" style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎯</div>
          <h2 className="t-h2 mb-1">Putaran {round} selesai!</h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem", fontSize: "0.9rem" }}>
            Kamu sudah menjawab semua {knew.length + learning.length} kartu
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "2rem" }}>
            <div className="card" style={{ padding: "1rem 1.5rem", textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#16A34A" }}>{knew.length}</p>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>SUDAH TAHU</p>
            </div>
            <div className="card" style={{ padding: "1rem 1.5rem", textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#DC2626" }}>{learning.length}</p>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>BELUM TAHU</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 10, background: "var(--surface-3)", borderRadius: 5, overflow: "hidden", marginBottom: "0.5rem" }}>
            <div style={{ height: "100%", width: `${knewPct}%`, background: "linear-gradient(90deg, #16A34A, #22C55E)", transition: "width 0.8s ease", borderRadius: 5 }} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "2rem" }}>{knewPct}% dikuasai</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {learning.length > 0 && (
              <button onClick={reviewLearning} className="btn btn-gradient btn-lg" style={{ display: "flex", alignItems: "center", gap: "0.45rem", justifyContent: "center" }}>
                🔄 Ulangi {learning.length} Kartu Belum Tahu
              </button>
            )}
            <button onClick={() => setPhase("done")} className="btn btn-surface btn-lg">
              Lihat Hasil Akhir
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ── DONE ────────────────────────────────────────────────────────────────── */
  if (phase === "done") {
    const total = knew.length + learning.length;
    const pct = total > 0 ? Math.round((knew.length / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;

    return (
      <main className="min-h-screen col items-center justify-center px-4 text-center" style={{ background: "var(--bg)", paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="a-popin" style={{ maxWidth: 440, width: "100%" }}>
          <SiKuisLogoMark size={48} id="fc-done-logo" />
          <h2 className="t-h2 mb-1" style={{ marginTop: "1rem" }}>Sesi Selesai! 🎉</h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "1.5rem" }}>{quizTitle}</p>

          {/* Stars */}
          <div className="row center mb-4" style={{ gap: "0.5rem", fontSize: "2.5rem" }}>
            {[1, 2, 3].map((s) => (
              <span key={s} className={s <= stars ? "a-starburst" : ""}
                style={{ animationDelay: `${(s - 1) * 0.15}s`, filter: s <= stars ? "none" : "grayscale(1) opacity(0.28)" }}>⭐</span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "2rem" }}>
            <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#16A34A" }}>{knew.length}</p>
              <p className="t-label">Sudah Tahu</p>
            </div>
            <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#DC2626" }}>{learning.length}</p>
              <p className="t-label">Belum Tahu</p>
            </div>
            <div className="card" style={{ padding: "1rem", textAlign: "center", gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--accent)" }}>{pct}%</p>
              <p className="t-label">Tingkat Penguasaan · {round} Putaran</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <button onClick={() => setPhase("select")} className="btn btn-gradient btn-lg">
              <IconPlay size={18} color="#fff" /> Kuis Lain
            </button>
            <button onClick={() => router.push("/solo")} className="btn btn-surface btn-lg">
              <IconTarget size={18} color="var(--text-dim)" /> Mode Solo (dengan Skor)
            </button>
            <button onClick={() => router.push("/")} className="btn btn-ghost btn-lg">
              <IconHome size={18} color="var(--text-dim)" /> Beranda
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
