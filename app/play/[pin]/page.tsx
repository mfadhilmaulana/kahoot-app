"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

type PlayerState = "join" | "lobby" | "question" | "answered" | "review" | "ended";

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
  leaderboard: { rank: number; name: string; score: number; id: string }[];
  isLast: boolean;
}

const OPTION_COLORS = ["#e53e3e", "#3182ce", "#38a169", "#d69e2e"];
const OPTION_SHAPES = ["▲", "◆", "●", "■"];

export default function PlayPage() {
  const { pin } = useParams<{ pin: string }>();
  const router = useRouter();
  const socket = getSocket();

  const [state, setState] = useState<PlayerState>("join");
  const [name, setName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finalLeaderboard, setFinalLeaderboard] = useState<ResultsPayload["leaderboard"]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    socket.on("game:playerJoined", ({ players: p }) => setPlayers(p));
    socket.on("game:playerLeft", ({ players: p }) => setPlayers(p));

    socket.on("game:question", (payload: QuestionPayload) => {
      setQuestion(payload);
      setChosen(null);
      setResults(null);
      setState("question");
      setTimeLeft(payload.timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    });

    socket.on("game:questionResults", (payload: ResultsPayload) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResults(payload);
      // Find own rank & score
      const myEntry = payload.leaderboard.find((e) => e.id === socket.id);
      if (myEntry) { setMyScore(myEntry.score); setMyRank(myEntry.rank); }
      setState("review");
    });

    socket.on("game:ended", ({ leaderboard }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinalLeaderboard(leaderboard);
      const myEntry = leaderboard.find((e: { id: string }) => e.id === socket.id);
      if (myEntry) { setMyScore(myEntry.score); setMyRank(myEntry.rank); }
      setState("ended");
    });

    socket.on("game:hostLeft", () => {
      alert("Host telah meninggalkan game");
      router.replace("/");
    });

    return () => {
      socket.off("game:playerJoined");
      socket.off("game:playerLeft");
      socket.off("game:question");
      socket.off("game:questionResults");
      socket.off("game:ended");
      socket.off("game:hostLeft");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, router]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setJoinError("Masukkan namamu"); return; }
    setJoinError("");

    socket.emit("player:join", { pin, name: cleanName }, (res: { ok?: boolean; error?: string; quizTitle?: string }) => {
      if (res.error) { setJoinError(res.error); return; }
      setQuizTitle(res.quizTitle || "");
      setState("lobby");
    });
  }

  function handleAnswer(optionIndex: number) {
    if (chosen !== null || state !== "question") return;
    setChosen(optionIndex);
    setState("answered");
    socket.emit("player:answer", { pin, optionIndex }, () => {});
  }

  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100;
  const timerColor = timerPct > 50 ? "#38a169" : timerPct > 25 ? "#d69e2e" : "#e53e3e";

  // ── JOIN FORM ─────────────────────────────────────────────────────────────
  if (state === "join") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}>

        <div className="text-center mb-8 bounce-in">
          <h1 className="text-5xl font-black text-white mb-2">
            Kuis<span style={{ color: "#a78bfa" }}>!</span>
          </h1>
          <div className="inline-block px-6 py-2 rounded-2xl"
            style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)" }}>
            <span className="text-purple-300 font-bold tracking-widest text-xl">{pin}</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="w-full max-w-sm slide-up">
          <div className="rounded-3xl p-8"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 className="text-white text-2xl font-bold text-center mb-6">Masukkan Namamu</h2>

            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setJoinError(""); }}
              placeholder="Nama kamu..."
              maxLength={20}
              autoFocus
              className="w-full text-center text-2xl font-bold px-5 py-4 rounded-2xl text-white outline-none mb-4"
              style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.2)" }}
              onFocus={(e) => { e.target.style.borderColor = "#a78bfa"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
            />

            {joinError && (
              <p className="text-red-400 text-center text-sm mb-4 font-medium">{joinError}</p>
            )}

            <button type="submit"
              className="w-full py-4 rounded-2xl text-xl font-black text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              BERGABUNG
            </button>
          </div>
        </form>
      </main>
    );
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (state === "lobby") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}>
        <div className="bounce-in">
          <div className="text-8xl mb-6">🎮</div>
          <h2 className="text-white text-3xl font-black mb-2">{name}</h2>
          <p className="text-purple-300 text-lg mb-2">Kamu sudah bergabung!</p>
          {quizTitle && (
            <p className="text-gray-400 text-base mb-8">Kuis: <span className="text-white font-bold">{quizTitle}</span></p>
          )}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
            <p className="text-gray-300 text-base">Menunggu host memulai game...</p>
          </div>
          <p className="text-gray-500 text-sm mt-6">{players.length} pemain bergabung</p>
        </div>
      </main>
    );
  }

  // ── QUESTION ──────────────────────────────────────────────────────────────
  if ((state === "question" || state === "answered") && question) {
    return (
      <main className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}>

        {/* Progress bar */}
        <div className="h-2 w-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-2 transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {/* Timer */}
        <div className="text-center py-4">
          <span className="text-6xl font-black" style={{ color: timerColor }}>{timeLeft}</span>
        </div>

        {/* Question */}
        <div className="px-4 mb-6">
          <div className="max-w-lg mx-auto rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              {question.index + 1} / {question.total}
            </p>
            <p className="text-white text-xl font-bold leading-relaxed">{question.question}</p>
          </div>
        </div>

        {/* Answer buttons */}
        {state === "answered" ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
            <div className="rounded-full w-24 h-24 flex items-center justify-center text-5xl"
              style={{ background: OPTION_COLORS[chosen!] }}>
              {OPTION_SHAPES[chosen!]}
            </div>
            <p className="text-white text-xl font-bold">Jawabanmu terkirim!</p>
            <p className="text-gray-400">Menunggu pemain lain...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-4 px-4 content-start">
            {question.options.map((opt, i) => (
              <button key={i}
                onClick={() => handleAnswer(i)}
                className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 hover:opacity-90 min-h-[120px]"
                style={{ background: OPTION_COLORS[i] }}>
                <span className="text-4xl text-white">{OPTION_SHAPES[i]}</span>
                <span className="text-white font-bold text-center text-base leading-tight">{opt}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if (state === "review" && results && question) {
    const isCorrect = chosen === results.correctIndex;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: isCorrect ? "linear-gradient(135deg, #052e16, #064e3b)" : "linear-gradient(135deg, #2d1515, #450a0a)" }}>

        <div className="bounce-in mb-8">
          <div className="text-8xl mb-4">{isCorrect ? "✅" : "❌"}</div>
          <h2 className="text-4xl font-black text-white mb-2">
            {isCorrect ? "Benar!" : "Salah!"}
          </h2>
          {!isCorrect && (
            <p className="text-gray-300 text-base mb-2">
              Jawaban benar: <span className="font-bold text-white">{question.options[results.correctIndex]}</span>
            </p>
          )}
        </div>

        <div className="flex gap-6 mb-6">
          <div className="rounded-2xl px-8 py-4 text-center"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-gray-400 text-xs uppercase mb-1">Skor</p>
            <p className="text-white text-3xl font-black">{myScore.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl px-8 py-4 text-center"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-gray-400 text-xs uppercase mb-1">Peringkat</p>
            <p className="text-white text-3xl font-black">#{myRank}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
          <p className="text-gray-300 text-sm">
            {results.isLast ? "Menghitung hasil akhir..." : "Menunggu pertanyaan berikutnya..."}
          </p>
        </div>
      </main>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────────
  if (state === "ended") {
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>

        <div className="bounce-in mb-6">
          <div className="text-8xl mb-4">{myRank && myRank <= 3 ? medals[myRank - 1] : "🎉"}</div>
          <h2 className="text-5xl font-black text-white mb-1">{name}</h2>
          <p className="text-purple-300 text-xl mb-4">
            Peringkat #{myRank} • {myScore.toLocaleString()} poin
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3 mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-wider mb-4">Peringkat Akhir</p>
          {finalLeaderboard.slice(0, 5).map((entry, i) => (
            <div key={entry.id}
              className="flex items-center gap-3 rounded-2xl px-5 py-3 slide-up"
              style={{
                animationDelay: `${i * 0.1}s`,
                background: entry.id === socket.id
                  ? "rgba(167,139,250,0.3)"
                  : "rgba(255,255,255,0.06)",
                border: entry.id === socket.id
                  ? "1px solid rgba(167,139,250,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}>
              <span className="w-8 text-center text-lg">{i < 3 ? medals[i] : `${i + 1}.`}</span>
              <span className="text-white font-bold flex-1 text-left">{entry.name}</span>
              <span className="text-white font-black">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button onClick={() => router.push("/")}
          className="px-10 py-4 rounded-2xl text-lg font-black text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          Main Lagi
        </button>
      </main>
    );
  }

  return null;
}
