"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

interface Player { id: string; name: string; }
interface LeaderboardEntry { rank: number; name: string; score: number; id: string; }

type GameState = "lobby" | "question" | "review" | "ended";

interface QuestionPayload {
  index: number;
  total: number;
  question: string;
  options: string[];
  timeLimit: number;
}

interface ResultsPayload {
  correctIndex: number;
  counts: number[];
  leaderboard: LeaderboardEntry[];
  isLast: boolean;
}

const OPTION_COLORS = ["#e53e3e", "#3182ce", "#38a169", "#d69e2e"];
const OPTION_SHAPES = ["▲", "◆", "●", "■"];
const OPTION_LABELS = ["A", "B", "C", "D"];

export default function HostGamePage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const socket = getSocket();

  const [gameState, setGameState] = useState<GameState>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startError, setStartError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    socket.on("game:playerJoined", ({ players: p }: { players: Player[] }) => {
      setPlayers(p);
    });
    socket.on("game:playerLeft", ({ players: p }: { players: Player[] }) => {
      setPlayers(p);
    });
    socket.on("game:question", (payload: QuestionPayload) => {
      setGameState("question");
      setQuestion(payload);
      setResults(null);
      setAnswerCount(0);
      setTimeLeft(payload.timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    });
    socket.on("game:answerCount", ({ answered }: { answered: number }) => {
      setAnswerCount(answered);
    });
    socket.on("game:questionResults", (payload: ResultsPayload) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState("review");
      setResults(payload);
    });
    socket.on("game:ended", ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState("ended");
      setResults((prev) => prev ? { ...prev, leaderboard } : { correctIndex: -1, counts: [], leaderboard, isLast: true });
    });
    socket.on("game:hostLeft", () => router.replace("/"));

    return () => {
      socket.off("game:playerJoined");
      socket.off("game:playerLeft");
      socket.off("game:question");
      socket.off("game:answerCount");
      socket.off("game:questionResults");
      socket.off("game:ended");
      socket.off("game:hostLeft");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, router]);

  function handleStart() {
    setStartError("");
    socket.emit("host:start", { pin }, (res: { ok?: boolean; error?: string }) => {
      if (res?.error) setStartError(res.error);
    });
  }

  function handleShowResults() {
    socket.emit("host:showResults", { pin });
  }

  function handleNext() {
    socket.emit("host:next", { pin });
  }

  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100;
  const timerColor = timerPct > 50 ? "#38a169" : timerPct > 25 ? "#d69e2e" : "#e53e3e";

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (gameState === "lobby") {
    return (
      <main className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>

        {/* Header */}
        <div className="text-center pt-12 pb-6">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-2">Kode Game</p>
          <div className="inline-block px-10 py-5 rounded-3xl"
            style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(167,139,250,0.4)" }}>
            <span className="text-7xl font-black tracking-[0.2em] text-white">{pin}</span>
          </div>
          <p className="text-gray-400 mt-4 text-base">
            Buka <span className="text-purple-400 font-bold">localhost:3000</span> dan masukkan kode ini
          </p>
        </div>

        {/* Players */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl">
              Pemain ({players.length})
            </h2>
            {startError && <p className="text-red-400 text-sm">{startError}</p>}
          </div>

          {players.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-gray-400 text-lg">Menunggu pemain bergabung...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {players.map((p) => (
                <div key={p.id}
                  className="rounded-2xl px-4 py-3 text-center font-bold text-white bounce-in"
                  style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)" }}>
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start button */}
        <div className="p-6 max-w-4xl mx-auto w-full">
          <button onClick={handleStart}
            className="w-full py-5 rounded-2xl text-2xl font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: players.length > 0 ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(255,255,255,0.15)" }}>
            {players.length === 0 ? "Menunggu pemain..." : "Mulai Game! 🚀"}
          </button>
        </div>
      </main>
    );
  }

  // ── QUESTION ──────────────────────────────────────────────────────────────
  if (gameState === "question" && question) {
    return (
      <main className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}>

        {/* Progress bar */}
        <div className="h-2 w-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-2 transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {/* Timer + progress */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-gray-400 text-sm font-medium">
            Pertanyaan {question.index + 1} / {question.total}
          </div>
          <div className="text-5xl font-black" style={{ color: timerColor }}>
            {timeLeft}
          </div>
          <div className="text-gray-400 text-sm font-medium">
            {answerCount} / {players.length} menjawab
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-3xl rounded-3xl p-8 mb-8 text-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-3xl font-bold text-white leading-relaxed">{question.question}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
            {question.options.map((opt, i) => (
              <div key={i} className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: OPTION_COLORS[i], opacity: 0.9 }}>
                <span className="text-3xl font-black text-white">{OPTION_SHAPES[i]}</span>
                <span className="text-xl font-bold text-white flex-1">{opt}</span>
                <span className="text-lg font-black text-white opacity-60">{OPTION_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Host controls */}
        <div className="p-6 max-w-3xl mx-auto w-full">
          <button onClick={handleShowResults}
            className="w-full py-4 rounded-2xl text-lg font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
            Tampilkan Hasil Sekarang
          </button>
        </div>
      </main>
    );
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if (gameState === "review" && results && question) {
    const maxCount = Math.max(...results.counts, 1);
    return (
      <main className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}>

        <div className="text-center pt-8 px-6">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-2">
            Pertanyaan {question.index + 1} — Hasil
          </p>
          <p className="text-white text-xl font-bold max-w-2xl mx-auto">{question.question}</p>
        </div>

        {/* Bar chart */}
        <div className="flex-1 flex items-end justify-center gap-4 px-8 py-8 max-w-3xl mx-auto w-full">
          {question.options.map((opt, i) => {
            const heightPct = maxCount > 0 ? (results.counts[i] / maxCount) * 100 : 0;
            const isCorrect = i === results.correctIndex;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-white font-bold text-sm">{results.counts[i]}</span>
                <div className="w-full rounded-t-xl flex flex-col justify-end transition-all duration-700"
                  style={{
                    height: `${Math.max(heightPct, 5)}%`,
                    minHeight: "20px",
                    maxHeight: "200px",
                    background: isCorrect ? OPTION_COLORS[i] : `${OPTION_COLORS[i]}66`,
                    border: isCorrect ? `3px solid #fff` : "none",
                  }}>
                </div>
                <span className="text-2xl">{OPTION_SHAPES[i]}</span>
                <span className="text-white text-xs font-bold text-center line-clamp-2">{opt}</span>
                {isCorrect && <span className="text-green-400 font-black text-sm">✓ BENAR</span>}
              </div>
            );
          })}
        </div>

        {/* Top 3 leaderboard */}
        <div className="px-6 pb-4 max-w-3xl mx-auto w-full">
          <p className="text-gray-400 text-sm font-medium mb-3 text-center uppercase tracking-wider">Top 3 Pemain</p>
          <div className="space-y-2">
            {results.leaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-4 rounded-2xl px-5 py-3"
                style={{
                  background: i === 0 ? "rgba(251,191,36,0.2)" : i === 1 ? "rgba(156,163,175,0.2)" : "rgba(180,83,9,0.2)",
                  border: `1px solid ${i === 0 ? "rgba(251,191,36,0.4)" : i === 1 ? "rgba(156,163,175,0.4)" : "rgba(180,83,9,0.4)"}`,
                }}>
                <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                <span className="text-white font-bold flex-1">{entry.name}</span>
                <span className="text-white font-black text-lg">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto w-full">
          <button onClick={handleNext}
            className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            {results.isLast ? "Lihat Hasil Akhir 🏆" : "Pertanyaan Berikutnya →"}
          </button>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────
  if (gameState === "ended" && results) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>

        <div className="text-center mb-8 bounce-in">
          <div className="text-8xl mb-4">🏆</div>
          <h2 className="text-5xl font-black text-white mb-2">Game Selesai!</h2>
          <p className="text-gray-400">Peringkat akhir semua pemain</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          {results.leaderboard.map((entry, i) => (
            <div key={entry.id}
              className="flex items-center gap-4 rounded-2xl px-6 py-4 slide-up"
              style={{
                animationDelay: `${i * 0.1}s`,
                background: i === 0 ? "linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1))"
                  : i === 1 ? "linear-gradient(135deg, rgba(156,163,175,0.3), rgba(156,163,175,0.1))"
                  : i === 2 ? "linear-gradient(135deg, rgba(180,83,9,0.3), rgba(180,83,9,0.1))"
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 0 ? "rgba(251,191,36,0.5)" : i === 1 ? "rgba(156,163,175,0.4)" : i === 2 ? "rgba(180,83,9,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}>
              <span className="text-2xl w-8 text-center">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </span>
              <span className="text-white font-bold flex-1 text-lg">{entry.name}</span>
              <span className="text-white font-black text-xl">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button onClick={() => router.push("/")}
          className="mt-10 px-10 py-4 rounded-2xl text-lg font-black text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          Kembali ke Beranda
        </button>
      </main>
    );
  }

  return null;
}
