"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Player { id: string; name: string; }
interface LBEntry { rank: number; name: string; score: number; lastScore: number; id: string; }
interface QuestionPayload {
  index: number; total: number; question: string;
  options: string[]; timeLimit: number; isLast: boolean;
}
interface ResultsPayload {
  correctIndex: number; counts: number[]; leaderboard: LBEntry[];
  isLast: boolean; question: string; options: string[];
}

type Phase = "lobby" | "question" | "review" | "ended";

// ── Constants ──────────────────────────────────────────────────────────────────
const OPT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const OPT_SHAPES = ["▲", "◆", "●", "■"];
const BG = "linear-gradient(160deg, #0f0f1a 0%, #1a0533 100%)";

const AVATAR_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Circular countdown timer ───────────────────────────────────────────────────
function CircleTimer({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / timeLimit;
  const offset = circ * (1 - pct);
  const color = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#eab308" : "#ef4444";
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-black text-white">{timeLeft}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HostGamePage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
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

    function onPlayerJoined({ players: p }: { players: Player[] }) { setPlayers(p); }
    function onPlayerLeft({ players: p }: { players: Player[] }) { setPlayers(p); }

    function onQuestion(payload: QuestionPayload) {
      setPhase("question");
      setQuestion(payload);
      setResults(null);
      setAnswerCount(0);
      setTimeLeft(payload.timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
      }, 1000);
    }

    function onAnswerCount({ answered }: { answered: number }) { setAnswerCount(answered); }

    function onResults(payload: ResultsPayload) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setPhase("review");
      setResults(payload);
    }

    function onEnded({ leaderboard }: { leaderboard: LBEntry[] }) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setFinalLB(leaderboard);
      setPhase("ended");
    }

    function onHostLeft() { router.replace("/"); }

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

  const emit = (ev: string, data: object, cb?: (r: object) => void) => {
    socketRef.current?.emit(ev, data, cb);
  };

  function handleStart() {
    setStartError("");
    emit("host:start", { pin }, (res: object) => {
      const r = res as { ok?: boolean; error?: string };
      if (r.error) setStartError(r.error);
    });
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <main className="min-h-screen flex flex-col" style={{ background: BG }}>
        {/* Pin banner */}
        <div className="text-center pt-10 pb-6 px-4">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Kode Game</p>
          <div
            className="inline-block px-10 py-5 rounded-3xl mb-4"
            style={{ background: "rgba(167,139,250,0.12)", border: "2px solid rgba(167,139,250,0.35)" }}
          >
            <span className="text-7xl font-black tracking-[0.2em] text-white">{pin}</span>
          </div>
          <p className="text-gray-400 text-sm">
            Buka <span className="text-purple-300 font-semibold">localhost:3000</span> dan masukkan kode ini
          </p>
        </div>

        {/* Players area */}
        <div className="flex-1 px-5 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">
              Pemain bergabung
              <span className="ml-2 text-purple-400 text-2xl font-black">{players.length}</span>
            </h2>
            {startError && (
              <p className="text-red-400 text-sm font-medium">⚠️ {startError}</p>
            )}
          </div>

          {players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-3 h-3 rounded-full"
                    style={{ background: "#a78bfa", animation: `pulse-dot 1.2s ease ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <p className="text-gray-500 text-base">Menunggu pemain bergabung...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {players.map((p, i) => (
                <div key={p.id}
                  className="rounded-2xl px-3 py-3 flex items-center gap-2 fade-in"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    animationDelay: `${i * 0.04}s`,
                  }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: avatarColor(p.name) }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-white font-semibold text-sm truncate">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start */}
        <div className="p-5 max-w-4xl mx-auto w-full">
          <button
            onClick={handleStart}
            disabled={players.length === 0}
            className="w-full py-5 rounded-2xl text-2xl font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: players.length > 0
                ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                : "rgba(255,255,255,0.1)",
              boxShadow: players.length > 0 ? "0 8px 30px rgba(124,58,237,0.4)" : "none",
            }}
          >
            {players.length === 0 ? "Menunggu pemain..." : "Mulai Game! 🚀"}
          </button>
        </div>
      </main>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────────────────────
  if (phase === "question" && question) {
    const timerPct = timeLeft / question.timeLimit;
    const timerColor = timerPct > 0.5 ? "#22c55e" : timerPct > 0.25 ? "#eab308" : "#ef4444";
    return (
      <main className="min-h-screen flex flex-col" style={{ background: BG }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="text-gray-400 text-sm font-semibold">
            Pertanyaan <span className="text-white font-black">{question.index + 1}</span> / {question.total}
          </div>
          <CircleTimer timeLeft={timeLeft} timeLimit={question.timeLimit} />
          <div className="text-right">
            <p className="text-gray-400 text-xs">Menjawab</p>
            <p className="text-white font-black text-xl">{answerCount}<span className="text-gray-500 font-normal text-sm">/{players.length}</span></p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 mx-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct * 100}%`, background: timerColor }} />
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4">
          <div className="w-full max-w-3xl glass rounded-3xl p-8 mb-6 text-center">
            <p className="text-white text-2xl md:text-3xl font-bold leading-relaxed">
              {question.question}
            </p>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
            {question.options.map((opt, i) => (
              <div key={i}
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: OPT_COLORS[i], opacity: 0.92 }}>
                <span className="text-4xl font-black text-white opacity-80">{OPT_SHAPES[i]}</span>
                <span className="text-white font-bold text-lg flex-1 leading-snug">{opt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Control */}
        <div className="px-5 pb-5 max-w-3xl mx-auto w-full">
          <button
            onClick={() => emit("host:showResults", { pin })}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:bg-white/15 active:scale-98"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Tampilkan Hasil Sekarang
          </button>
        </div>
      </main>
    );
  }

  // ── REVIEW ──────────────────────────────────────────────────────────────
  if (phase === "review" && results && question) {
    const maxCount = Math.max(...results.counts, 1);
    return (
      <main className="min-h-screen flex flex-col" style={{ background: BG }}>
        <div className="text-center pt-7 pb-3 px-5">
          <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">
            Pertanyaan {question.index + 1} — Jawaban
          </p>
          <p className="text-white text-lg font-bold max-w-2xl mx-auto leading-snug">
            {results.question}
          </p>
        </div>

        {/* Bar chart — fixed-height container */}
        <div className="flex-1 flex items-end justify-center gap-3 px-6 max-w-3xl mx-auto w-full"
          style={{ minHeight: "220px", maxHeight: "260px" }}>
          {results.options.map((opt, i) => {
            const isCorrect = i === results.correctIndex;
            const heightPct = Math.max((results.counts[i] / maxCount) * 100, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%" }}>
                <span className="text-white font-black text-sm mb-1">{results.counts[i]}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: "180px" }}>
                  <div
                    className="w-full rounded-t-xl bar-grow"
                    style={{
                      height: `${heightPct}%`,
                      background: isCorrect ? OPT_COLORS[i] : `${OPT_COLORS[i]}55`,
                      border: isCorrect ? "3px solid rgba(255,255,255,0.6)" : "none",
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                </div>
                <span className="text-xl mt-1">{OPT_SHAPES[i]}</span>
                <span className="text-white text-xs font-semibold text-center leading-tight" style={{ maxWidth: "80px" }}>{opt}</span>
                {isCorrect && <span className="text-green-400 font-black text-xs">✓ BENAR</span>}
              </div>
            );
          })}
        </div>

        {/* Top 3 */}
        <div className="px-5 pt-4 pb-2 max-w-3xl mx-auto w-full">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center mb-3">Peringkat Sementara</p>
          <div className="space-y-2">
            {results.leaderboard.slice(0, 3).map((e, i) => (
              <div key={e.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: i === 0 ? "rgba(251,191,36,0.15)" : i === 1 ? "rgba(156,163,175,0.12)" : "rgba(180,83,9,0.15)",
                  border: `1px solid ${i === 0 ? "rgba(251,191,36,0.35)" : i === 1 ? "rgba(156,163,175,0.3)" : "rgba(180,83,9,0.3)"}`,
                }}>
                <span className="text-xl w-7 text-center">{["🥇","🥈","🥉"][i]}</span>
                <span className="text-white font-bold flex-1 text-sm">{e.name}</span>
                {e.lastScore > 0 && (
                  <span className="text-green-400 text-xs font-bold">+{e.lastScore}</span>
                )}
                <span className="text-white font-black">{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 max-w-3xl mx-auto w-full">
          <button
            onClick={() => emit("host:next", { pin })}
            className="btn-primary w-full py-5 text-xl rounded-2xl mt-3"
          >
            {results.isLast ? "Lihat Hasil Akhir 🏆" : "Pertanyaan Berikutnya →"}
          </button>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const top3 = finalLB.slice(0, 3);
    const rest = finalLB.slice(3);
    return (
      <main className="min-h-screen flex flex-col items-center px-5 pt-8 pb-10"
        style={{ background: BG }}>
        <div className="text-center mb-8 pop-in">
          <div className="text-7xl mb-3">🏆</div>
          <h2 className="text-4xl font-black text-white mb-1">Game Selesai!</h2>
          <p className="text-gray-400 text-sm">Peringkat akhir</p>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-4 mb-8 w-full max-w-md">
            {[top3[1], top3[0], top3[2]].map((e, pos) => {
              if (!e) return <div key={pos} className="flex-1" />;
              const rank = [2, 1, 3][pos];
              const heights = [140, 180, 110];
              const medals = ["🥇","🥈","🥉"];
              const colors = ["rgba(251,191,36,0.3)","rgba(156,163,175,0.3)","rgba(180,83,9,0.3)"];
              const borders = ["rgba(251,191,36,0.5)","rgba(156,163,175,0.4)","rgba(180,83,9,0.4)"];
              return (
                <div key={e.id} className="flex-1 flex flex-col items-center gap-2 fade-in"
                  style={{ animationDelay: `${pos * 0.1}s` }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
                    style={{ background: avatarColor(e.name) }}>
                    {e.name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-xs font-bold text-center leading-tight">{e.name}</span>
                  <span className="text-white text-sm font-black">{e.score.toLocaleString()}</span>
                  <div
                    className="w-full rounded-t-2xl flex items-center justify-center text-2xl"
                    style={{ height: heights[rank - 1], background: colors[rank - 1], border: `2px solid ${borders[rank - 1]}` }}
                  >
                    {medals[rank - 1]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div className="w-full max-w-md space-y-2 mb-8">
            {rest.map((e, i) => (
              <div key={e.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 fade-in"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  animationDelay: `${(i + 3) * 0.07}s`,
                }}>
                <span className="text-gray-400 text-sm w-6 text-center font-bold">{e.rank}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ background: avatarColor(e.name) }}>
                  {e.name[0].toUpperCase()}
                </div>
                <span className="text-white font-semibold flex-1 text-sm">{e.name}</span>
                <span className="text-white font-black">{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="btn-primary px-10 py-4 text-base rounded-2xl"
        >
          Kembali ke Beranda
        </button>
      </main>
    );
  }

  return null;
}
