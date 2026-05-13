"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuestionPayload, ResultsPayload, LBEntry } from "@/lib/types";
import { playCorrect, playWrong, playPoll, playStart, playEnd, playTick } from "@/lib/sounds";

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
    <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto" }}>
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-hi)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }} />
      </svg>
      <div className="center" style={{ position: "absolute", inset: 0 }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text)" }}>{timeLeft}</span>
      </div>
    </div>
  );
}

type Phase = "join" | "lobby" | "question" | "answered" | "review" | "ended";

export default function PlayPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const socketIdRef = useRef<string>("");

  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [totalQ, setTotalQ] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [openText, setOpenText] = useState("");
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myLastScore, setMyLastScore] = useState(0);
  const [finalLB, setFinalLB] = useState<LBEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socketIdRef.current = socket.id ?? "";

    const onConnect = () => { socketIdRef.current = socket.id ?? ""; };
    const onPlayerJoined = ({ players }: { players: { id: string }[] }) => setPlayerCount(players.length);
    const onPlayerLeft = ({ players }: { players: { id: string }[] }) => setPlayerCount(players.length);

    const onQuestion = (payload: QuestionPayload) => {
      setQuestion(payload);
      setChosen(null);
      setOpenText("");
      setResults(null);
      setPhase("question");
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

    const onResults = (payload: ResultsPayload) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setResults(payload);
      const me = payload.leaderboard.find((e) => e.id === socketIdRef.current);
      if (me) { setMyScore(me.score); setMyRank(me.rank); setMyLastScore(me.lastScore); }
      setPhase("review");
    };

    const onEnded = ({ leaderboard }: { leaderboard: LBEntry[] }) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setFinalLB(leaderboard);
      const me = leaderboard.find((e) => e.id === socketIdRef.current);
      if (me) { setMyScore(me.score); setMyRank(me.rank); }
      setPhase("ended");
      playEnd();
    };

    const onHostLeft = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      router.replace("/");
    };

    socket.on("connect", onConnect);
    socket.on("game:playerJoined", onPlayerJoined);
    socket.on("game:playerLeft", onPlayerLeft);
    socket.on("game:question", onQuestion);
    socket.on("game:questionResults", onResults);
    socket.on("game:ended", onEnded);
    socket.on("game:hostLeft", onHostLeft);

    return () => {
      socket.off("connect", onConnect);
      socket.off("game:playerJoined", onPlayerJoined);
      socket.off("game:playerLeft", onPlayerLeft);
      socket.off("game:question", onQuestion);
      socket.off("game:questionResults", onResults);
      socket.off("game:ended", onEnded);
      socket.off("game:hostLeft", onHostLeft);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  // Play sound after results arrive (client side)
  useEffect(() => {
    if (!results || !question) return;
    const isParticipation = results.correctIndex === -1;
    if (isParticipation) { playPoll(); return; }
    if (chosen === results.correctIndex) playCorrect();
    else playWrong();
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setJoinError("Masukkan namamu"); return; }
    setJoinError("");
    const socket = socketRef.current;
    if (!socket) return;

    function doJoin() {
      socket!.emit("player:join", { pin, name: cleanName },
        (res: { ok?: boolean; error?: string; quizTitle?: string; totalQuestions?: number }) => {
          if (res.error) { setJoinError(res.error); return; }
          setQuizTitle(res.quizTitle ?? "");
          setTotalQ(res.totalQuestions ?? 0);
          socketIdRef.current = socket!.id ?? "";
          setPhase("lobby");
        }
      );
    }
    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);
  }

  function handleAnswer(optIdx: number) {
    if (chosen !== null || phase !== "question") return;
    setChosen(optIdx);
    setPhase("answered");
    socketRef.current?.emit("player:answer", { pin, optionIndex: optIdx }, () => {});
  }

  function handleOpenAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (chosen !== null || phase !== "question") return;
    const text = openText.trim();
    if (!text) return;
    setChosen(-2);
    setPhase("answered");
    socketRef.current?.emit("player:openAnswer", { pin, text }, () => {});
  }

  // ── JOIN ──────────────────────────────────────────────────────────────────────
  if (phase === "join") {
    return (
      <main className="min-h-screen col items-center justify-center px-5" style={{ background: "var(--bg)" }}>
        <div className="text-center mb-8 a-popin">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="joinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED"/>
                  <stop offset="55%" stopColor="#4F46E5"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="24" fill="url(#joinGrad)"/>
              <ellipse cx="36" cy="22" rx="26" ry="11" fill="rgba(255,255,255,0.16)"/>
              <path d="M33,32 C33,18 67,18 67,32 C67,46 53,50 53,63" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
              <circle cx="53" cy="77" r="6.5" fill="white"/>
            </svg>
            <div style={{ fontWeight: 900, fontSize: "clamp(2rem,8vw,3rem)", letterSpacing: "-0.04em" }}>
              <span style={{ color: "var(--text)" }}>Si</span><span style={{ color: "var(--accent)" }}>Kuis</span>
            </div>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", padding: "0.45rem 1.25rem",
            background: "linear-gradient(135deg, rgba(79,70,229,0.10), rgba(124,58,237,0.10))",
            border: "1.5px solid rgba(79,70,229,0.20)", borderRadius: 40,
          }}>
            <span style={{ color: "var(--accent)", fontWeight: 800, letterSpacing: "0.18em", fontSize: "1.1rem" }}>{pin}</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="a-fadeup d-2" style={{ width: "100%", maxWidth: 360 }}>
          <div className="card" style={{ padding: "2rem" }}>
            <h2 className="t-h3 text-center mb-5">Siapa namamu?</h2>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setJoinError(""); }}
              placeholder="Nama kamu..."
              maxLength={20}
              autoFocus
              className="input mb-3"
              style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }}
            />
            {joinError && (
              <p style={{ color: "#DC2626", textAlign: "center", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" }}>{joinError}</p>
            )}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Bergabung
            </button>
          </div>
        </form>
      </main>
    );
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <main className="min-h-screen col items-center justify-center px-5 text-center" style={{ background: "var(--bg)" }}>
        <div className="a-popin">
          <div className="center mb-5" style={{
            width: 88, height: 88, borderRadius: "50%",
            background: avatarColor(name),
            boxShadow: `0 0 52px ${avatarColor(name)}44`,
            color: "#fff", fontSize: "2.25rem", fontWeight: 900,
          }}>
            {name[0]?.toUpperCase()}
          </div>
          <h2 className="t-h2 mb-1">{name}</h2>
          <p style={{ color: "var(--accent)", fontWeight: 700, marginBottom: "0.3rem" }}>Berhasil bergabung!</p>
          {quizTitle && (
            <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Kuis: <span style={{ color: "var(--text)", fontWeight: 600 }}>{quizTitle}</span>
            </p>
          )}
          {totalQ > 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>{totalQ} pertanyaan</p>}

          <div className="card row center" style={{ padding: "0.875rem 1.5rem", gap: "0.75rem" }}>
            <div className="row" style={{ gap: "0.4rem" }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--accent)",
                  animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Menunggu host memulai...</p>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1.25rem" }}>{playerCount} pemain bergabung</p>
        </div>
      </main>
    );
  }

  // ── QUESTION ──────────────────────────────────────────────────────────────────
  if ((phase === "question" || phase === "answered") && question) {
    const timerPct = timeLeft / question.timeLimit;
    const timerColor = timerPct > 0.5 ? "#22C55E" : timerPct > 0.25 ? "#F59E0B" : "#EF4444";
    const isTF = question.type === "tf";
    const isPoll = question.type === "poll";
    const isRating = question.type === "rating";
    const isOpen = question.type === "open";
    const mcColors = ["#E21B3C","#1368CE","#26890C","#D89E00"];

    return (
      <main className="min-h-screen col" style={{ background: "var(--bg)" }}>
        {/* Timer progress bar */}
        <div style={{ height: 5, background: "var(--surface-3)" }}>
          <div style={{ height: "100%", width: `${timerPct * 100}%`, background: timerColor, transition: "width 0.9s linear, background-color 0.4s" }} />
        </div>

        {/* Timer + progress */}
        <div className="col items-center pt-3 pb-1" style={{ gap: "0.2rem" }}>
          <CircleTimer timeLeft={timeLeft} timeLimit={question.timeLimit} />
          <p className="t-label mt-1">{question.index + 1} / {question.total}</p>
          {(isPoll || isRating) && <span className="badge" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{isRating ? "⭐ Rating" : "Pendapat"}</span>}
          {isOpen && <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>✏️ Jawaban Terbuka</span>}
        </div>

        {/* Question */}
        <div style={{ padding: "0 0.875rem 0.75rem" }}>
          <div className="card center" style={{ padding: "1rem 1.125rem", textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
            <p className="t-h3" style={{ lineHeight: 1.4, fontSize: "clamp(0.95rem, 3.5vw, 1.1rem)" }}>{question.question}</p>
          </div>
        </div>

        {/* Answered state */}
        {phase === "answered" ? (
          <div className="flex-1 col items-center justify-center" style={{ gap: "1rem" }}>
            <div className="center a-popin" style={{
              width: 90, height: 90, borderRadius: "50%",
              background: isOpen || isRating ? "var(--accent)"
                : isTF ? (chosen === 0 ? "#26890C" : "#E21B3C")
                : mcColors[chosen ?? 0] ?? "var(--accent)",
            }}>
              <span style={{ fontSize: isRating ? "1.8rem" : "2.25rem", color: "#fff", fontWeight: 900 }}>
                {isOpen ? "✓" : isRating ? `${(chosen ?? 0) + 1}★` : isTF ? (chosen === 0 ? "B" : "S") : ["▲","◆","●","■"][chosen ?? 0]}
              </span>
            </div>
            <p className="t-h3">Jawaban terkirim!</p>
            <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Menunggu pemain lain...</p>
          </div>

        /* Open text input */
        ) : isOpen ? (
          <div className="flex-1 col items-center justify-center px-4 safe-bottom" style={{ gap: "1rem" }}>
            <form onSubmit={handleOpenAnswer} className="col" style={{ gap: "0.75rem", width: "100%", maxWidth: 440 }}>
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                placeholder="Tulis jawabanmu di sini..."
                maxLength={150}
                rows={3}
                className="input"
                style={{ fontSize: "1rem", resize: "none" }}
                autoFocus
              />
              <button type="submit" disabled={!openText.trim()} className="btn btn-primary btn-lg">
                Kirim Jawaban
              </button>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", textAlign: "center" }}>{openText.length}/150 karakter</p>
            </form>
          </div>

        /* Rating (stars) */
        ) : isRating ? (
          <div className="flex-1 col items-center justify-center px-4 safe-bottom" style={{ gap: "1.5rem" }}>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>Pilih rating kamu:</p>
            <div className="row" style={{ gap: "0.75rem" }}>
              {[1,2,3,4,5].map((star) => (
                <button key={star} onClick={() => handleAnswer(star - 1)} className="btn" style={{
                  width: 60, height: 60, fontSize: "1.75rem", padding: 0,
                  background: "var(--surface)",
                  border: "2px solid var(--border-hi)",
                  borderRadius: "50%",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 120ms ease",
                }}>
                  ⭐
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: "1.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Buruk</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Sangat Baik</span>
            </div>
          </div>

        /* TF answer buttons */
        ) : isTF ? (
          <div className="flex-1 row px-3 pb-3 safe-bottom" style={{ gap: "0.65rem", minHeight: 120 }}>
            <button onClick={() => handleAnswer(0)} className="ans-btn ans-tf-t flex-1"
              style={{ minHeight: 120, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "clamp(2rem, 8vw, 3rem)", fontWeight: 900, color: "#fff" }}>B</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Benar</span>
            </button>
            <button onClick={() => handleAnswer(1)} className="ans-btn ans-tf-f flex-1"
              style={{ minHeight: 120, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "clamp(2rem, 8vw, 3rem)", fontWeight: 900, color: "#fff" }}>S</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Salah</span>
            </button>
          </div>

        /* MC / Poll answer buttons */
        ) : (
          <div className="flex-1 px-3 pb-3 safe-bottom" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem", alignContent: "start" }}>
            {question.options.map((opt, i) => {
              const clsMap = ["ans-a","ans-b","ans-c","ans-d"];
              const shapes = ["▲","◆","●","■"];
              return (
                <button key={i} onClick={() => handleAnswer(i)} className={`ans-btn ${clsMap[i % 4]}`}
                  style={{ minHeight: 100, flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "clamp(1.5rem, 6vw, 2.25rem)" }}>{shapes[i % 4]}</span>
                  <span className="ans-text" style={{ textAlign: "center", fontSize: "clamp(0.8rem, 2.5vw, 0.9rem)" }}>{opt}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────────
  if (phase === "review" && results && question) {
    const isParticipation = results.correctIndex === -1;
    const isCorrect = !isParticipation && chosen === results.correctIndex;
    const isRating = results.type === "rating";
    const isOpen = results.type === "open";

    const bgColor = isParticipation
      ? "var(--bg)"
      : isCorrect
      ? "linear-gradient(160deg, #F0FDF4, #DCFCE7)"
      : "linear-gradient(160deg, #FFF1F2, #FFE4E6)";

    const resultTextColor = isParticipation ? "var(--text)" : isCorrect ? "#15803D" : "#DC2626";

    return (
      <main className="min-h-screen col items-center justify-center px-4 text-center safe-bottom" style={{ background: bgColor, paddingTop: "2rem", paddingBottom: "2rem" }}>
        {/* Result icon + label */}
        <div className="a-popin mb-4">
          {isParticipation ? (
            <>
              <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--accent)", marginBottom: "0.4rem" }}>
                +{myLastScore}
              </div>
              <h2 className="t-h2 mb-1">{isRating ? "Rating terkirim!" : isOpen ? "Jawaban tercatat!" : "Terima kasih!"}</h2>
              {isRating && results.ratingAvg !== undefined && (
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
                  Rating rata-rata: <span style={{ fontWeight: 700, color: "var(--accent)" }}>{"⭐".repeat(Math.round(results.ratingAvg))} ({results.ratingAvg}/5)</span>
                </p>
              )}
              {isOpen && (
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Pendapatmu sudah dicatat</p>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: "clamp(3.5rem, 15vw, 5rem)", fontWeight: 900, marginBottom: "0.2rem", color: resultTextColor, lineHeight: 1 }}>
                {isCorrect ? "✓" : "✗"}
              </div>
              <h2 className="t-h2 mb-1" style={{ color: resultTextColor }}>{isCorrect ? "Benar!" : "Salah!"}</h2>
              {!isCorrect && results.correctIndex >= 0 && (
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
                  Jawaban: <span style={{ color: "var(--text)", fontWeight: 700 }}>{results.options[results.correctIndex]}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Score cards */}
        <div className="a-fadeup d-1 mb-4" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center" }}>
          <div className="card" style={{ padding: "0.875rem 1.25rem", textAlign: "center", minWidth: 100 }}>
            <p className="t-label mb-1">Total Skor</p>
            <p className="t-h2">{myScore.toLocaleString()}</p>
          </div>
          <div className="card" style={{ padding: "0.875rem 1.25rem", textAlign: "center", minWidth: 80 }}>
            <p className="t-label mb-1">Peringkat</p>
            <p className="t-h2">#{myRank}</p>
          </div>
          {myLastScore > 0 && (
            <div className="card" style={{ padding: "0.875rem 1.25rem", textAlign: "center", minWidth: 80 }}>
              <p className="t-label mb-1">Dapat</p>
              <p className="t-h2" style={{ color: "#16A34A" }}>+{myLastScore}</p>
            </div>
          )}
        </div>

        {/* Explanation */}
        {results.explanation && (
          <div className="card mb-4 a-fadeup d-2" style={{ padding: "0.875rem 1.125rem", textAlign: "left", maxWidth: 380, width: "100%", borderLeft: "3px solid var(--accent)" }}>
            <p className="t-label mb-1">Penjelasan</p>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.6 }}>{results.explanation}</p>
          </div>
        )}

        {/* Waiting indicator */}
        <div className="card row center a-fadeup d-3" style={{ padding: "0.75rem 1.25rem", gap: "0.65rem" }}>
          <div className="row" style={{ gap: "0.35rem" }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: `dotPulse 1.2s ease ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
            {results.isLast ? "Menghitung hasil akhir..." : "Menunggu pertanyaan berikutnya..."}
          </p>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const myEntry = finalLB.find((e) => e.id === socketIdRef.current);
    const rank = myRank ?? myEntry?.rank ?? null;

    return (
      <main className="min-h-screen col items-center justify-center px-4 text-center safe-bottom" style={{ background: "var(--bg)", paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="a-popin mb-5">
          {rank !== null && rank <= 3 && (
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--accent)", marginBottom: "0.4rem" }}>
              {["🥇","🥈","🥉"][rank - 1]} #{rank}
            </div>
          )}
          <div className="center mb-3" style={{
            width: 72, height: 72, borderRadius: "50%",
            background: avatarColor(name),
            boxShadow: `0 0 36px ${avatarColor(name)}44`,
            color: "#fff", fontSize: "1.6rem", fontWeight: 900,
          }}>
            {name[0]?.toUpperCase()}
          </div>
          <h2 className="t-h2 mb-1">{name}</h2>
          <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.95rem" }}>
            Peringkat #{rank} · {myScore.toLocaleString()} poin
          </p>
        </div>

        <div className="col mb-6" style={{ gap: "0.4rem", width: "100%", maxWidth: 360 }}>
          <p className="t-label text-center mb-2">Peringkat Akhir</p>
          {finalLB.slice(0, 5).map((entry, i) => {
            const isMe = entry.id === socketIdRef.current;
            return (
              <div key={entry.id} className="card row a-fadeup" style={{
                padding: "0.55rem 0.75rem", gap: "0.6rem",
                animationDelay: `${i * 0.06}s`,
                borderColor: isMe ? "var(--accent)" : "var(--border)",
                background: isMe ? "var(--accent-dim)" : "var(--surface)",
              }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", width: 18, fontWeight: 700 }}>{i + 1}.</span>
                <div className="center" style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(entry.name), color: "#fff", fontSize: "0.68rem", fontWeight: 900, flexShrink: 0 }}>
                  {entry.name[0]?.toUpperCase()}
                </div>
                <span style={{ color: isMe ? "var(--accent)" : "var(--text)", fontWeight: isMe ? 700 : 600, flex: 1, fontSize: "0.85rem", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.name}{isMe ? " (kamu)" : ""}
                </span>
                <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "0.85rem", flexShrink: 0 }}>{entry.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <button onClick={() => router.push("/")} className="btn btn-primary btn-lg" style={{ minWidth: 180 }}>
          Main Lagi
        </button>
      </main>
    );
  }

  return null;
}
