"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "join" | "lobby" | "question" | "answered" | "review" | "ended";

interface QuestionPayload {
  index: number; total: number; question: string;
  options: string[]; timeLimit: number; isLast: boolean;
}
interface LBEntry { rank: number; name: string; score: number; lastScore: number; id: string; }
interface ResultsPayload {
  correctIndex: number; counts: number[];
  leaderboard: LBEntry[]; isLast: boolean;
  question: string; options: string[];
}

const OPT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const OPT_SHAPES = ["▲", "◆", "●", "■"];
const BG_DARK = "linear-gradient(160deg, #0f0f1a 0%, #1a0533 100%)";

const AVATAR_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function CircleTimer({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / timeLimit;
  const offset = circ * (1 - pct);
  const color = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#eab308" : "#ef4444";
  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-white">{timeLeft}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
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
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myLastScore, setMyLastScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [finalLB, setFinalLB] = useState<LBEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socketIdRef.current = socket.id ?? "";

    // Update socketId on connect/reconnect
    function onConnect() { socketIdRef.current = socket.id ?? ""; }

    function onPlayerJoined({ players }: { players: { id: string }[] }) {
      setPlayerCount(players.length);
    }
    function onPlayerLeft({ players }: { players: { id: string }[] }) {
      setPlayerCount(players.length);
    }

    function onQuestion(payload: QuestionPayload) {
      setQuestion(payload);
      setChosen(null);
      setResults(null);
      setIsCorrect(false);
      setPhase("question");
      setTimeLeft(payload.timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
      }, 1000);
    }

    function onResults(payload: ResultsPayload) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setResults(payload);
      const me = payload.leaderboard.find((e) => e.id === socketIdRef.current);
      if (me) {
        setMyScore(me.score);
        setMyRank(me.rank);
        setMyLastScore(me.lastScore);
      }
      setPhase("review");
    }

    function onEnded({ leaderboard }: { leaderboard: LBEntry[] }) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setFinalLB(leaderboard);
      const me = leaderboard.find((e) => e.id === socketIdRef.current);
      if (me) { setMyScore(me.score); setMyRank(me.rank); }
      setPhase("ended");
    }

    function onHostLeft() {
      if (timerRef.current) clearInterval(timerRef.current);
      router.replace("/");
    }

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

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setJoinError("Masukkan namamu"); return; }
    setJoinError("");

    const socket = socketRef.current;
    if (!socket) return;

    function doJoin() {
      socket!.emit(
        "player:join",
        { pin, name: cleanName },
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

  const timerPct = question ? timeLeft / question.timeLimit : 1;

  // ── JOIN ─────────────────────────────────────────────────────────────────
  if (phase === "join") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: BG_DARK }}>
        <div className="text-center mb-8 pop-in">
          <h1 className="text-6xl font-black text-white mb-2">
            Kuis<span style={{ color: "#a78bfa" }}>!</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)" }}>
            <span className="text-purple-300 font-bold tracking-widest text-lg">{pin}</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="w-full max-w-sm fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="glass rounded-3xl p-7">
            <h2 className="text-white text-xl font-bold text-center mb-5">Siapa namamu?</h2>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setJoinError(""); }}
              placeholder="Nama kamu..."
              maxLength={20}
              autoFocus
              className="input-dark w-full text-center text-2xl font-bold px-4 py-4 rounded-2xl mb-3"
            />
            {joinError && (
              <p className="text-red-400 text-center text-sm mb-3 font-medium">⚠️ {joinError}</p>
            )}
            <button type="submit" className="btn-primary w-full py-4 text-xl rounded-2xl">
              BERGABUNG
            </button>
          </div>
        </form>
      </main>
    );
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center" style={{ background: BG_DARK }}>
        <div className="pop-in">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white mx-auto mb-5"
            style={{ background: avatarColor(name), boxShadow: `0 0 40px ${avatarColor(name)}66` }}
          >
            {name[0]?.toUpperCase()}
          </div>
          <h2 className="text-white text-3xl font-black mb-1">{name}</h2>
          <p className="text-purple-300 text-base font-semibold mb-1">Berhasil bergabung! 🎉</p>
          {quizTitle && (
            <p className="text-gray-400 text-sm mb-1">
              Kuis: <span className="text-white font-semibold">{quizTitle}</span>
            </p>
          )}
          {totalQ > 0 && (
            <p className="text-gray-500 text-sm mb-6">{totalQ} pertanyaan</p>
          )}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl glass">
            <div className="flex gap-1">
              {[0,1,2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#a78bfa", animation: `pulse-dot 1.2s ease ${i*0.2}s infinite` }} />
              ))}
            </div>
            <p className="text-gray-300 text-sm">Menunggu host memulai...</p>
          </div>
          <p className="text-gray-600 text-xs mt-5">{playerCount} pemain bergabung</p>
        </div>
      </main>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────────────────────
  if ((phase === "question" || phase === "answered") && question) {
    return (
      <main className="min-h-screen flex flex-col" style={{ background: BG_DARK }}>
        {/* Timer bar */}
        <div className="h-1.5 w-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full transition-all duration-1000"
            style={{ width: `${timerPct * 100}%`, background: timerPct > 0.5 ? "#22c55e" : timerPct > 0.25 ? "#eab308" : "#ef4444" }} />
        </div>

        {/* Timer + progress */}
        <div className="py-4 flex flex-col items-center gap-1">
          <CircleTimer timeLeft={timeLeft} timeLimit={question.timeLimit} />
          <p className="text-gray-500 text-xs">{question.index + 1} / {question.total}</p>
        </div>

        {/* Question card */}
        <div className="px-4 mb-5">
          <div className="glass rounded-2xl p-5 text-center max-w-lg mx-auto">
            <p className="text-white text-xl font-bold leading-relaxed">{question.question}</p>
          </div>
        </div>

        {/* Answers */}
        {phase === "answered" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-5xl pop-in"
              style={{ background: OPT_COLORS[chosen!] }}
            >
              {OPT_SHAPES[chosen!]}
            </div>
            <p className="text-white text-xl font-bold">Jawaban terkirim!</p>
            <p className="text-gray-400 text-sm">Menunggu pemain lain...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-4 content-start">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
                style={{ background: OPT_COLORS[i], minHeight: "120px" }}
              >
                <span className="text-5xl text-white">{OPT_SHAPES[i]}</span>
                <span className="text-white font-bold text-base text-center leading-tight">{opt}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── REVIEW ──────────────────────────────────────────────────────────────
  if (phase === "review" && results && question) {
    const correct = chosen === results.correctIndex;
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: correct ? "linear-gradient(160deg, #052e16, #064e3b)" : "linear-gradient(160deg, #2d1515, #450a0a)" }}
      >
        {/* Result icon */}
        <div className="pop-in mb-6">
          <div className="text-8xl mb-3">{correct ? "✅" : "❌"}</div>
          <h2 className="text-4xl font-black text-white mb-2">
            {correct ? "Benar!" : "Salah!"}
          </h2>
          {!correct && (
            <p className="text-gray-300 text-sm">
              Jawaban benar:{" "}
              <span className="font-bold text-white">{results.options[results.correctIndex]}</span>
            </p>
          )}
        </div>

        {/* Score + streak */}
        <div className="flex gap-4 mb-6 fade-in">
          <div className="glass rounded-2xl px-6 py-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Skor</p>
            <p className="text-white text-3xl font-black">{myScore.toLocaleString()}</p>
          </div>
          <div className="glass rounded-2xl px-6 py-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Peringkat</p>
            <p className="text-white text-3xl font-black">#{myRank}</p>
          </div>
          {myLastScore > 0 && (
            <div className="glass rounded-2xl px-6 py-4 text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Dapat</p>
              <p className="text-green-400 text-3xl font-black">+{myLastScore}</p>
            </div>
          )}
        </div>

        {/* Waiting indicator */}
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass fade-in">
          <div className="flex gap-1">
            {[0,1,2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{ background: "#a78bfa", animation: `pulse-dot 1.2s ease ${i*0.2}s infinite` }} />
            ))}
          </div>
          <p className="text-gray-300 text-sm">
            {results.isLast ? "Menghitung hasil akhir..." : "Menunggu pertanyaan berikutnya..."}
          </p>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const medals = ["🥇", "🥈", "🥉"];
    const myEntry = finalLB.find((e) => e.id === socketIdRef.current);
    const rank = myRank ?? myEntry?.rank ?? null;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center" style={{ background: BG_DARK }}>
        <div className="pop-in mb-6">
          <div className="text-7xl mb-3">
            {rank && rank <= 3 ? medals[rank - 1] : "🎉"}
          </div>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mx-auto mb-3"
            style={{ background: avatarColor(name), boxShadow: `0 0 30px ${avatarColor(name)}66` }}
          >
            {name[0]?.toUpperCase()}
          </div>
          <h2 className="text-4xl font-black text-white mb-1">{name}</h2>
          <p className="text-purple-300 text-lg font-semibold">
            Peringkat #{rank} · {myScore.toLocaleString()} poin
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2 mb-8">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-bold">Peringkat Akhir</p>
          {finalLB.slice(0, 5).map((entry, i) => {
            const isMe = entry.id === socketIdRef.current;
            return (
              <div key={entry.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 fade-in"
                style={{
                  animationDelay: `${i * 0.07}s`,
                  background: isMe ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)",
                  border: isMe ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                <span className="w-7 text-center text-base">
                  {i < 3 ? medals[i] : `${i + 1}.`}
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: avatarColor(entry.name) }}>
                  {entry.name[0]?.toUpperCase()}
                </div>
                <span className={`font-bold flex-1 text-left text-sm ${isMe ? "text-purple-300" : "text-white"}`}>
                  {entry.name} {isMe && "(kamu)"}
                </span>
                <span className="text-white font-black text-sm">{entry.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push("/")}
          className="btn-primary px-10 py-4 text-base rounded-2xl"
        >
          Main Lagi!
        </button>
      </main>
    );
  }

  return null;
}
