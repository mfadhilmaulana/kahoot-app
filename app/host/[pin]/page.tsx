"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuestionPayload, ResultsPayload, LBEntry } from "@/lib/types";
import { playJoin, playStart, playEnd, playTick } from "@/lib/sounds";

interface PlayerInfo { id: string; name: string; }

const AVATAR_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function CircleTimer({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const r = 44, circ = 2 * Math.PI * r;
  const pct = timeLeft / timeLimit;
  const color = pct > 0.5 ? "#22C55E" : pct > 0.25 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-hi)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }} />
      </svg>
      <div className="center" style={{ position: "absolute", inset: 0 }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text)" }}>{timeLeft}</span>
      </div>
    </div>
  );
}

type Phase = "lobby" | "question" | "review" | "ended";

export default function HostGamePage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startError, setStartError] = useState("");
  const [finalLB, setFinalLB] = useState<LBEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onPlayerJoined = ({ players: p }: { players: PlayerInfo[] }) => {
      setPlayers(p);
      playJoin();
    };
    const onPlayerLeft = ({ players: p }: { players: PlayerInfo[] }) => setPlayers(p);

    const onQuestion = (payload: QuestionPayload) => {
      setPhase("question");
      setQuestion(payload);
      setResults(null);
      setAnswerCount(0);
      setTimeLeft(payload.timeLimit);
      playStart();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          if (t <= 5) playTick();
          return t - 1;
        });
      }, 1000);
    };

    const onAnswerCount = ({ answered }: { answered: number }) => setAnswerCount(answered);

    const onResults = (payload: ResultsPayload) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setPhase("review");
      setResults(payload);
    };

    const onEnded = ({ leaderboard }: { leaderboard: LBEntry[] }) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setFinalLB(leaderboard);
      setPhase("ended");
      playEnd();
    };

    const onHostLeft = () => router.replace("/");

    socket.on("game:playerJoined", onPlayerJoined);
    socket.on("game:playerLeft", onPlayerLeft);
    socket.on("game:question", onQuestion);
    socket.on("game:answerCount", onAnswerCount);
    socket.on("game:questionResults", onResults);
    socket.on("game:ended", onEnded);
    socket.on("game:hostLeft", onHostLeft);

    return () => {
      socket.off("game:playerJoined", onPlayerJoined);
      socket.off("game:playerLeft", onPlayerLeft);
      socket.off("game:question", onQuestion);
      socket.off("game:answerCount", onAnswerCount);
      socket.off("game:questionResults", onResults);
      socket.off("game:ended", onEnded);
      socket.off("game:hostLeft", onHostLeft);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const emit = (ev: string, data: object, cb?: (r: object) => void) =>
    socketRef.current?.emit(ev, data, cb);

  function handleStart() {
    setStartError("");
    emit("host:start", { pin }, (res: object) => {
      const r = res as { ok?: boolean; error?: string };
      if (r.error) setStartError(r.error);
    });
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div style={{
          background: "var(--accent)",
          padding: "2rem 1.25rem 1.75rem",
          textAlign: "center",
        }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Kode Game</p>
          <div style={{ fontSize: "clamp(2.25rem, 10vw, 3.75rem)", fontWeight: 900, letterSpacing: "0.18em", color: "#fff", fontFamily: "monospace", marginBottom: "0.75rem" }}>
            {pin}
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
            Buka <span style={{ color: "#fff", fontWeight: 600 }}>sikuis.com</span> dan masukkan kode ini
          </p>
        </div>

        <div className="flex-1 px-4 pt-5" style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
          <div className="row mb-4" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ gap: "0.5rem" }}>
              <span className="t-h3">Pemain</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--accent)" }}>{players.length}</span>
            </div>
            {startError && <p style={{ color: "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}>{startError}</p>}
          </div>

          {players.length === 0 ? (
            <div className="center col py-16" style={{ gap: "1rem" }}>
              <div className="row" style={{ gap: "0.5rem" }}>
                {[0,1,2].map((i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: "var(--accent)",
                    animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Menunggu pemain bergabung...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.55rem" }}>
              {players.map((p, i) => (
                <div key={p.id} className="card a-slidein" style={{
                  padding: "0.55rem 0.75rem",
                  display: "flex", alignItems: "center", gap: "0.55rem",
                  animationDelay: `${i * 0.04}s`,
                }}>
                  <div className="center" style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: avatarColor(p.name), color: "#fff",
                    fontSize: "0.75rem", fontWeight: 900, flexShrink: 0,
                  }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-5 safe-bottom" style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
          <button
            onClick={handleStart}
            disabled={players.length === 0}
            className="btn btn-primary btn-xl"
            style={{ width: "100%" }}
          >
            {players.length === 0 ? "Menunggu pemain..." : `Mulai Game — ${players.length} Pemain`}
          </button>
        </div>
      </main>
    );
  }

  // ── QUESTION ──────────────────────────────────────────────────────────────────
  if (phase === "question" && question) {
    const timerPct = timeLeft / question.timeLimit;
    const timerColor = timerPct > 0.5 ? "#22C55E" : timerPct > 0.25 ? "#F59E0B" : "#EF4444";
    const isTF = question.type === "tf";
    const isPoll = question.type === "poll";
    const isRating = question.type === "rating";
    const isOpen = question.type === "open";

    return (
      <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem 0.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 80 }}>
            <p className="t-label">
              {question.index + 1} / {question.total}
              {question.category && ` · ${question.category}`}
            </p>
            {(isPoll || isRating) && (
              <span className="badge" style={{ background: "var(--accent-dim)", color: "var(--accent)", marginTop: "0.25rem", display: "inline-block" }}>
                {isRating ? "⭐ Rating" : "Pendapat"}
              </span>
            )}
            {isOpen && (
              <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706", marginTop: "0.25rem", display: "inline-block" }}>
                ✏️ Teks Bebas
              </span>
            )}
          </div>
          <CircleTimer timeLeft={timeLeft} timeLimit={question.timeLimit} />
          <div style={{ textAlign: "right", flex: 1, minWidth: 60 }}>
            <p className="t-label">Menjawab</p>
            <p style={{ color: "var(--text)", fontWeight: 900, fontSize: "1.15rem" }}>
              {answerCount}
              <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.8rem" }}>/{players.length}</span>
            </p>
          </div>
        </div>

        <div className="progress-track mx-4 mb-4">
          <div className="progress-fill" style={{ width: `${timerPct * 100}%`, background: timerColor }} />
        </div>

        <div className="flex-1 col items-center justify-center px-4 py-2">
          <div className="card center mb-4" style={{ width: "100%", maxWidth: 720, padding: "1.25rem 1.5rem", textAlign: "center" }}>
            <p className="t-h2" style={{ lineHeight: 1.35 }}>{question.question}</p>
          </div>

          {isOpen ? (
            <div className="card center" style={{ width: "100%", maxWidth: 720, padding: "2rem", textAlign: "center", background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.25)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✏️</div>
              <p style={{ color: "var(--text-dim)", fontSize: "1rem" }}>Pemain mengetik jawaban mereka...</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>{answerCount} dari {players.length} sudah menjawab</p>
            </div>
          ) : isRating ? (
            <div className="card center" style={{ width: "100%", maxWidth: 720, padding: "2rem", textAlign: "center" }}>
              <div className="row center" style={{ gap: "1rem", fontSize: "2.5rem", marginBottom: "1rem" }}>
                {[1,2,3,4,5].map((s) => <span key={s}>⭐</span>)}
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: "1rem" }}>Pemain memilih rating 1-5</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>{answerCount} dari {players.length} sudah memberikan rating</p>
            </div>
          ) : isTF ? (
            <div className="row" style={{ gap: "0.75rem", width: "100%", maxWidth: 720 }}>
              <div className="center flex-1 ans-btn ans-tf-t" style={{ minHeight: 88, justifyContent: "center" }}>
                <span className="t-h2">Benar</span>
              </div>
              <div className="center flex-1 ans-btn ans-tf-f" style={{ minHeight: 88, justifyContent: "center" }}>
                <span className="t-h2">Salah</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", width: "100%", maxWidth: 720 }}>
              {question.options.map((opt, i) => {
                const clsMap = ["ans-a","ans-b","ans-c","ans-d"];
                const shapes = ["▲","◆","●","■"];
                return (
                  <div key={i} className={`ans-btn ${clsMap[i % 4]}`} style={{ cursor: "default" }}>
                    <span className="shape">{shapes[i % 4]}</span>
                    <span className="ans-text">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 safe-bottom" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <button onClick={() => emit("host:showResults", { pin })} className="btn btn-ghost btn-lg" style={{ width: "100%" }}>
            Tampilkan Hasil Sekarang
          </button>
        </div>
      </main>
    );
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────────
  if (phase === "review" && results && question) {
    const isPoll = results.type === "poll";
    const isTF = results.type === "tf";
    const isRating = results.type === "rating";
    const isOpen = results.type === "open";
    const isParticipation = isPoll || isRating || isOpen;
    const maxCount = Math.max(...results.counts, 1);
    const mcColors = ["#E21B3C","#1368CE","#26890C","#D89E00"];
    const tfColors = ["#26890C","#E21B3C"];
    const shapes = ["▲","◆","●","■"];

    return (
      <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
        <div style={{ padding: "1.5rem 1.5rem 0.5rem", textAlign: "center" }}>
          <p className="t-label mb-2">
            Pertanyaan {question.index + 1} — {isRating ? "Hasil Rating" : isOpen ? "Jawaban Pemain" : isPoll ? "Hasil Pendapat" : "Jawaban"}
          </p>
          <p className="t-h3" style={{ maxWidth: 640, margin: "0 auto", lineHeight: 1.35 }}>{results.question}</p>
        </div>

        {/* Open type: show all responses */}
        {isOpen && results.openAnswers && results.openAnswers.length > 0 ? (
          <div className="px-4 py-3" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            <p className="t-label mb-2 text-center">{results.openAnswers.length} Jawaban Masuk</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
              {results.openAnswers.map((ans, i) => (
                <div key={i} className="a-popin" style={{
                  animationDelay: `${i * 0.05}s`,
                  background: "var(--surface)", border: "1.5px solid var(--border-hi)",
                  borderRadius: 40, padding: "0.45rem 1rem",
                  fontSize: "0.875rem", fontWeight: 600, color: "var(--text)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  {ans}
                </div>
              ))}
            </div>
          </div>
        ) : isRating ? (
          /* Rating: show star distribution + average */
          <div className="px-4" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            {results.ratingAvg !== undefined && (
              <div className="card center mb-3" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{results.ratingAvg}</div>
                <div style={{ fontSize: "1.5rem", marginTop: "0.25rem" }}>{"⭐".repeat(Math.round(results.ratingAvg))}</div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.25rem" }}>Rating rata-rata</p>
              </div>
            )}
            <div className="row items-end justify-center" style={{ gap: "0.5rem", height: 120 }}>
              {results.counts.map((cnt, i) => {
                const pct = Math.max((cnt / maxCount) * 100, 4);
                return (
                  <div key={i} className="col items-center flex-1" style={{ gap: "0.15rem" }}>
                    <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "0.8rem" }}>{cnt}</span>
                    <div className="col justify-end" style={{ height: 80, width: "100%" }}>
                      <div className="a-bargrow" style={{
                        height: `${pct}%`,
                        borderRadius: "5px 5px 0 0",
                        background: "#F59E0B",
                        animationDelay: `${i * 0.07}s`,
                      }} />
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{"⭐".repeat(i + 1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MC/TF/Poll: bar chart */
          <div className="flex-1 row items-end justify-center px-4" style={{ gap: "0.5rem", minHeight: 140, maxHeight: 200 }}>
            {results.options.map((opt, i) => {
              const isCorrect = !isParticipation && i === results.correctIndex;
              const color = isTF ? tfColors[i] : mcColors[i % 4];
              const heightPct = Math.max((results.counts[i] / maxCount) * 100, 4);
              return (
                <div key={i} className="col items-center flex-1" style={{ gap: "0.15rem" }}>
                  <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "0.8rem" }}>{results.counts[i]}</span>
                  <div className="col justify-end" style={{ height: 140, width: "100%" }}>
                    <div className="a-bargrow" style={{
                      height: `${heightPct}%`,
                      borderRadius: "5px 5px 0 0",
                      background: (isParticipation || isCorrect) ? color : `${color}66`,
                      border: isCorrect ? `2px solid ${color}` : "none",
                      animationDelay: `${i * 0.07}s`,
                    }} />
                  </div>
                  {!isTF && <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{shapes[i % 4]}</span>}
                  <span style={{ color: "var(--text-dim)", fontSize: "0.65rem", fontWeight: 600, textAlign: "center", maxWidth: 72, lineHeight: 1.25 }}>
                    {opt}
                  </span>
                  {isCorrect && <span style={{ color: "#16A34A", fontWeight: 900, fontSize: "0.62rem", letterSpacing: "0.04em" }}>✓ BENAR</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation */}
        {results.explanation && (
          <div className="card" style={{ margin: "0.5rem 1rem", padding: "0.75rem 1rem", maxWidth: 720, marginLeft: "auto", marginRight: "auto", borderLeft: "3px solid var(--accent)" }}>
            <p className="t-label mb-1">Penjelasan</p>
            <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", lineHeight: 1.6 }}>{results.explanation}</p>
          </div>
        )}

        {/* Leaderboard */}
        {!isOpen && (
          <div className="px-4 pb-2" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            <p className="t-label text-center mb-2 mt-2">Peringkat Sementara</p>
            <div className="col" style={{ gap: "0.4rem" }}>
              {results.leaderboard.slice(0, 3).map((e, i) => {
                const medals = ["🥇","🥈","🥉"];
                return (
                  <div key={e.id} className="card row" style={{ gap: "0.6rem", padding: "0.6rem 0.875rem" }}>
                    <span style={{ width: 24, fontSize: "1rem" }}>{medals[i]}</span>
                    <span style={{ color: "var(--text)", fontWeight: 700, flex: 1, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                    {e.lastScore > 0 && <span style={{ color: "#16A34A", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 }}>+{e.lastScore}</span>}
                    <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "0.875rem", flexShrink: 0 }}>{e.score.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-4 pb-4 safe-bottom" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <button onClick={() => emit("host:next", { pin })} className="btn btn-primary btn-xl" style={{ width: "100%", marginTop: "0.5rem" }}>
            {results.isLast ? "Lihat Hasil Akhir" : "Pertanyaan Berikutnya →"}
          </button>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const top3 = finalLB.slice(0, 3);
    const rest = finalLB.slice(3);
    const podiumOrder = [top3[1], top3[0], top3[2]];
    const podHeightPx = [120, 160, 90];
    const podColors = [
      { bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.28)" },
      { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.35)" },
      { bg: "rgba(180,83,9,0.1)",    border: "rgba(180,83,9,0.25)" },
    ];
    const medals = ["🥇","🥈","🥉"];

    return (
      <main className="min-h-screen col items-center px-4 pt-8 pb-10 safe-bottom" style={{ background: "linear-gradient(150deg, #EFF6FF, #EEF2FF)" }}>
        <div className="text-center mb-6 a-popin">
          <div style={{ fontWeight: 900, fontSize: "clamp(2.5rem,8vw,4rem)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text)" }}>Si</span><span style={{ color: "var(--accent)" }}>Kuis</span>
          </div>
          <h2 className="t-h2 mb-1">🎉 Game Selesai!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Peringkat akhir</p>
        </div>

        {top3.length > 0 && (
          <div className="row items-end justify-center mb-6" style={{ gap: "0.75rem", width: "100%", maxWidth: 420 }}>
            {podiumOrder.map((e, pos) => {
              if (!e) return <div key={pos} style={{ flex: 1 }} />;
              const rank = [2, 1, 3][pos];
              const pc = podColors[rank - 1];
              return (
                <div key={e.id} className="col items-center flex-1 a-fadeup" style={{ gap: "0.35rem", animationDelay: `${pos * 0.1}s` }}>
                  <span style={{ fontSize: "1.75rem" }}>{medals[rank - 1]}</span>
                  <div className="center" style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(e.name), color: "#fff", fontWeight: 900, fontSize: "0.95rem" }}>
                    {e.name[0].toUpperCase()}
                  </div>
                  <span style={{ color: "var(--text)", fontSize: "0.7rem", fontWeight: 700, textAlign: "center", lineHeight: 1.2, wordBreak: "break-word" }}>{e.name}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", fontWeight: 700 }}>{e.score.toLocaleString()}</span>
                  <div className="center" style={{ width: "100%", height: podHeightPx[rank - 1], borderRadius: "8px 8px 0 0", background: pc.bg, border: `1.5px solid ${pc.border}` }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-dim)" }}>{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rest.length > 0 && (
          <div className="col mb-6" style={{ gap: "0.4rem", width: "100%", maxWidth: 420 }}>
            {rest.map((e, i) => (
              <div key={e.id} className="card row a-fadeup" style={{ padding: "0.6rem 0.875rem", gap: "0.65rem", animationDelay: `${(i + 3) * 0.06}s` }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", width: 20, fontWeight: 700 }}>{e.rank}</span>
                <div className="center" style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(e.name), color: "#fff", fontSize: "0.7rem", fontWeight: 900, flexShrink: 0 }}>
                  {e.name[0].toUpperCase()}
                </div>
                <span style={{ color: "var(--text)", fontWeight: 600, flex: 1, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "0.85rem" }}>{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => router.push("/")} className="btn btn-primary btn-lg" style={{ minWidth: 180 }}>
          Kembali ke Beranda
        </button>
      </main>
    );
  }

  return null;
}
