"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import type { QuestionType } from "@/lib/types";
import { playCorrect, playWrong, playPoll, playStart, playEnd, playTick } from "@/lib/sounds";
import { SiKuisLogoMark, IconTarget, IconClock, IconStar, IconCheckCircle, QuizIconByID } from "@/components/icons";

interface SoloQuestion {
  id: string; type: QuestionType; question: string; options: string[];
  correctIndex: number; timeLimit: number; category: string; explanation: string;
}
interface SoloQuizMeta {
  id: string; title: string; icon: string; color: string;
  category: string; difficulty: string; description: string;
  questions: SoloQuestion[];
}
interface QuizCard {
  id: string; title: string; description: string;
  category: string; icon: string; color: string;
  difficulty: string; questionCount: number; estimatedMins: number;
}
interface Answer { questionIndex: number; chosen: number | null; openText?: string; isCorrect: boolean; earned: number; }

const DIFF_COLOR: Record<string, string> = { Mudah: "#16A34A", Sedang: "#CA8A04", Sulit: "#DC2626" };

function Confetti({ count = 28 }: { count?: number }) {
  const colors = ["#2563EB","#F59E0B","#EF4444","#10B981","#8B5CF6","#EC4899","#06B6D4"];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = 10 + Math.random() * 80;
        const delay = Math.random() * 0.6;
        const dur = 1.2 + Math.random() * 1.2;
        const size = 6 + Math.random() * 10;
        const color = colors[i % colors.length];
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${x}%`,
            top: `-${size}px`,
            width: size, height: size * 1.6,
            borderRadius: Math.random() > 0.5 ? "50%" : 4,
            background: color,
            animation: `confettiFall ${dur}s ${delay}s ease-in forwards`,
          }} />
        );
      })}
    </div>
  );
}

function CircleTimer({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const r = 44, circ = 2 * Math.PI * r;
  const pct = timeLeft / timeLimit;
  const color = pct > 0.5 ? "#22C55E" : pct > 0.25 ? "#F59E0B" : "#EF4444";
  const urgent = pct <= 0.25;
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}
      className={urgent ? "a-pulse-ring" : ""}>
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }}/>
      </svg>
      <div className="center" style={{ position: "absolute", inset: 0 }}>
        <span style={{ fontSize: "1.4rem", fontWeight: 900, color: urgent ? "#EF4444" : "var(--text)" }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

function StarsResult({ pct }: { pct: number }) {
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  return (
    <div className="row center" style={{ gap: "0.5rem", fontSize: "2.5rem" }}>
      {[1,2,3].map((s) => (
        <span key={s} className={s <= stars ? "a-starburst" : ""} style={{
          animationDelay: `${(s - 1) * 0.15}s`,
          filter: s <= stars ? "none" : "grayscale(1) opacity(0.3)",
        }}>⭐</span>
      ))}
    </div>
  );
}

type Phase = "select" | "loading" | "playing" | "answered" | "reviewing" | "ended";
type PlayMode = "solo" | "practice";
interface GhostData { score: number; correctCount: number; date: string; }

export default function SoloPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [playMode, setPlayMode] = useState<PlayMode>("solo");
  const [quizList, setQuizList] = useState<QuizCard[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [quiz, setQuiz] = useState<SoloQuizMeta | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [openText, setOpenText] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const [currentQuizId, setCurrentQuizId] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    function load() {
      socket.emit("quizzes:list", {}, (list: QuizCard[]) => {
        setQuizList(list);
        setLoadingList(false);
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }, []);

  const startTimer = useCallback((limit: number) => {
    setTimeLeft(limit);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        if (t <= 5) playTick();
        return t - 1;
      });
    }, 1000);
  }, []);

  function selectQuiz(quizId: string, mode: PlayMode = playMode) {
    setPhase("loading");
    setCurrentQuizId(quizId);
    // Load ghost data from localStorage
    try {
      const raw = localStorage.getItem(`ghost:${quizId}`);
      setGhostData(raw ? (JSON.parse(raw) as GhostData) : null);
    } catch { setGhostData(null); }

    const socket = getSocket();
    function load() {
      socket.emit("quiz:getSoloData", { quizId }, (res: SoloQuizMeta & { error?: string }) => {
        if (res.error) { setPhase("select"); return; }
        setQuiz(res);
        setQIndex(0);
        setAnswers([]);
        setPhase("playing");
        playStart();
        if (mode === "solo") startTimer(res.questions[0].timeLimit);
        else setTimeLeft(res.questions[0].timeLimit); // practice: show time but don't auto-submit
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }

  useEffect(() => {
    if (phase === "playing" && quiz) {
      const q = quiz.questions[qIndex];
      setChosen(null);
      setOpenText("");
      if (playMode === "solo") startTimer(q.timeLimit);
      else setTimeLeft(q.timeLimit);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qIndex, phase, quiz, startTimer, playMode]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "playing" && playMode === "solo") {
      submitAnswer(null);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitAnswer(optIdx: number | null) {
    if (!quiz) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const q = quiz.questions[qIndex];
    const isParticipation = q.correctIndex === -1;
    const isCorrect = optIdx !== null && (isParticipation || optIdx === q.correctIndex);
    // Practice mode: flat 100 pts (no time bonus), solo: time-based
    const earned = isParticipation ? 100 : isCorrect
      ? (playMode === "practice" ? 100 : Math.round(1000 * Math.max(0, (timeLeft / q.timeLimit))))
      : 0;

    setChosen(optIdx);
    setAnswers((prev) => [...prev, { questionIndex: qIndex, chosen: optIdx, isCorrect, earned }]);
    setPhase("answered");

    if (isParticipation) playPoll();
    else if (isCorrect) { playCorrect(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2200); }
    else playWrong();

    // Practice mode: don't auto-advance; user clicks Berikutnya manually
    if (playMode === "practice") return;

    reviewTimerRef.current = setTimeout(() => {
      setPhase("reviewing");
      reviewTimerRef.current = setTimeout(() => {
        if (qIndex + 1 >= quiz.questions.length) {
          setPhase("ended");
          playEnd();
        } else {
          setQIndex((i) => i + 1);
          setPhase("playing");
        }
      }, 3000);
    }, 500);
  }

  function practiceNext() {
    if (!quiz) return;
    if (qIndex + 1 >= quiz.questions.length) {
      setPhase("ended");
      playEnd();
    } else {
      setQIndex((i) => i + 1);
      setPhase("playing");
    }
  }

  function submitOpen(e: React.FormEvent) {
    e.preventDefault();
    const text = openText.trim();
    if (!text) return;
    submitAnswer(0);
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
  }, []);

  // ── SELECT ───────────────────────────────────────────────────────────────────
  if (phase === "select" || phase === "loading") {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="row px-5 py-4" style={{
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10,
        }}>
          <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ marginRight: "1rem", padding: "0.5rem 0.75rem" }}>←</button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SiKuisLogoMark size={30} id="solo-logo"/>
            <div>
              <h1 className="t-h3">Mode Solo</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Belajar mandiri, kapan saja</p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
          {/* Mode toggle */}
          <div className="row a-fadeup mb-4" style={{ gap: "0.5rem", justifyContent: "center" }}>
            <button
              onClick={() => setPlayMode("solo")}
              className={playMode === "solo" ? "btn btn-gradient" : "btn btn-surface"}
              style={{ flex: "1 1 160px", maxWidth: 220, gap: "0.4rem" }}
            >
              <IconClock size={16} color={playMode === "solo" ? "#fff" : "var(--text-dim)"}/> Mode Solo
            </button>
            <button
              onClick={() => setPlayMode("practice")}
              className={playMode === "practice" ? "btn btn-gradient" : "btn btn-surface"}
              style={{ flex: "1 1 160px", maxWidth: 220, gap: "0.4rem" }}
            >
              <IconTarget size={16} color={playMode === "practice" ? "#fff" : "var(--text-dim)"}/> Mode Latihan
            </button>
          </div>

          {/* Mode description */}
          <div className="card a-fadeup mb-5" style={{ padding: "1rem 1.25rem", background: playMode === "solo" ? "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(245,158,11,0.06))" : "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(37,99,235,0.06))", borderColor: playMode === "solo" ? "rgba(37,99,235,0.15)" : "rgba(16,185,129,0.15)" }}>
            <div className="row" style={{ gap: "1.25rem", flexWrap: "wrap" }}>
              {(playMode === "solo" ? [
                { icon: <IconClock size={18} color="#F59E0B"/>, text: "Timer per soal — jawab secepat mungkin" },
                { icon: <IconStar size={18} color="#F59E0B"/>, text: "Skor berbasis kecepatan jawaban" },
                { icon: <IconCheckCircle size={18} color="#10B981"/>, text: "Lihat jawaban benar setelah menjawab" },
                { icon: <IconTarget size={18} color="#2563EB"/>, text: "Skor tersimpan otomatis sebagai Ghost Mode" },
              ] : [
                { icon: <IconTarget size={18} color="#10B981"/>, text: "Tanpa tekanan waktu — fokus pada pemahaman" },
                { icon: <IconCheckCircle size={18} color="#10B981"/>, text: "Lihat penjelasan langsung setelah menjawab" },
                { icon: <IconStar size={18} color="#F59E0B"/>, text: "Skor flat 100 poin per jawaban benar" },
                { icon: <IconClock size={18} color="#2563EB"/>, text: "Kontrol sendiri kapan lanjut ke soal berikutnya" },
              ]).map((item, i) => (
                <div key={i} className="row" style={{ gap: "0.5rem", flex: "1 1 180px" }}>
                  {item.icon}
                  <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {loadingList ? (
            <div className="center col py-16" style={{ gap: "1rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--surface-3)", borderTopColor: "var(--accent)", animation: "spinRing 0.8s linear infinite" }}/>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Memuat kuis...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "0.875rem" }}>
              {quizList.map((q, i) => (
                <button key={q.id} onClick={() => selectQuiz(q.id, playMode)}
                  disabled={phase === "loading"}
                  className="a-fadeup"
                  style={{
                    animationDelay: `${i * 0.04}s`,
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: 16, padding: "1rem 1.125rem",
                    textAlign: "left", cursor: phase === "loading" ? "wait" : "pointer",
                    transition: "border-color 140ms, transform 140ms, box-shadow 140ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = q.color; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${q.color}22`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${q.color}cc, ${q.color})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 12px ${q.color}44`,
                  }}>
                    <QuizIconByID quizId={q.id} size={24} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.25rem" }}>
                      <p style={{ fontWeight: 800, color: "var(--text)", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{q.title}</p>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, flexShrink: 0, color: DIFF_COLOR[q.difficulty], background: DIFF_COLOR[q.difficulty] + "18", borderRadius: 40, padding: "0.12rem 0.45rem" }}>
                        {q.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.72rem", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.4rem" }}>{q.description}</p>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>
                      {q.questionCount} soal · ~{q.estimatedMins} mnt
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!quiz) return null;
  const currentQ = quiz.questions[qIndex];
  const totalQuestions = quiz.questions.length;
  const isTF = currentQ.type === "tf";
  const isPoll = currentQ.type === "poll";
  const isRating = currentQ.type === "rating";
  const isOpen = currentQ.type === "open";
  const isParticipation = currentQ.correctIndex === -1;
  const MC_COLORS = ["#E21B3C","#1368CE","#26890C","#D89E00"];
  const shapes = ["▲","◆","●","■"];
  const lastAnswer = answers[answers.length - 1];
  const isCorrect = lastAnswer?.isCorrect ?? false;

  // ── PLAYING / ANSWERED / REVIEWING ────────────────────────────────────────
  if (phase === "playing" || phase === "answered" || phase === "reviewing") {
    const progress = ((qIndex) / totalQuestions) * 100;

    const reviewBg = phase === "reviewing"
      ? isParticipation ? "var(--bg)"
        : isCorrect ? "linear-gradient(160deg, #F0FDF4, #DCFCE7)"
        : "linear-gradient(160deg, #FFF1F2, #FFE4E6)"
      : "var(--bg)";

    return (
      <main className="min-h-screen col" style={{ background: reviewBg, transition: "background 0.4s" }}>
        {showConfetti && <Confetti/>}

        {/* Top bar */}
        <div style={{ padding: "0.75rem 1rem 0" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>
              {quiz.title} · {qIndex + 1}/{totalQuestions}
              {playMode === "practice" && <span style={{ marginLeft: "0.35rem", color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>✎ Latihan</span>}
            </span>
            <div className="row" style={{ gap: "0.75rem" }}>
              {ghostData && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>
                  👻 {ghostData.score.toLocaleString()}
                </span>
              )}
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>
                {answers.reduce((s, a) => s + a.earned, 0).toLocaleString()} poin
              </span>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: "var(--accent)", width: `${progress}%`, transition: "width 0.4s ease" }}/>
          </div>
        </div>

        {/* Timer */}
        <div className="center pt-3 pb-1">
          <CircleTimer timeLeft={phase === "playing" ? timeLeft : currentQ.timeLimit} timeLimit={currentQ.timeLimit}/>
        </div>

        {/* Question */}
        <div style={{ padding: "0 0.875rem 0.75rem" }}>
          <div className={`card center ${phase === "playing" ? "a-slideright" : ""}`} style={{ padding: "1rem 1.25rem", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
            <p className="t-h3" style={{ lineHeight: 1.4, fontSize: "clamp(0.95rem,3.5vw,1.1rem)" }}>{currentQ.question}</p>
          </div>
        </div>

        {/* REVIEW OVERLAY */}
        {phase === "reviewing" && (
          <div className="center col a-popin px-4 pb-2" style={{ gap: "0.5rem", textAlign: "center" }}>
            {isParticipation ? (
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--accent)" }}>✓</div>
            ) : isCorrect ? (
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#16A34A" }}>✓</div>
            ) : (
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#DC2626" }}>✗</div>
                {currentQ.correctIndex >= 0 && (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>
                    Jawaban: <span style={{ fontWeight: 700, color: "var(--text)" }}>{currentQ.options[currentQ.correctIndex]}</span>
                  </p>
                )}
              </>
            )}
            {lastAnswer?.earned > 0 && (
              <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--accent)" }}>+{lastAnswer.earned}</div>
            )}
            {currentQ.explanation && (
              <div className="card" style={{ padding: "0.75rem 1rem", maxWidth: 500, width: "100%", textAlign: "left", borderLeft: "3px solid var(--accent)", marginTop: "0.25rem" }}>
                <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", lineHeight: 1.6 }}>{currentQ.explanation}</p>
              </div>
            )}
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
              {qIndex + 1 < totalQuestions ? "Soal berikutnya..." : "Menghitung hasil..."}
            </p>
          </div>
        )}

        {/* ANSWERED */}
        {phase === "answered" && (
          <div className="flex-1 center col a-popin px-4" style={{ gap: "0.875rem", paddingBottom: "1.25rem" }}>
            <div className="center" style={{
              width: 72, height: 72, borderRadius: "50%",
              background: isParticipation ? "var(--accent)" : isCorrect ? "#16A34A" : "#EF4444",
            }}>
              <span style={{ color: "#fff", fontSize: "2rem", fontWeight: 900 }}>
                {isParticipation ? "✓" : isCorrect ? "✓" : "✗"}
              </span>
            </div>
            {lastAnswer?.earned > 0 && (
              <div style={{ fontWeight: 900, fontSize: "1.4rem", color: "var(--accent)" }}>+{lastAnswer.earned}</div>
            )}
            {/* Practice mode: show answer + explanation immediately */}
            {playMode === "practice" && (
              <div className="col" style={{ gap: "0.5rem", width: "100%", maxWidth: 480 }}>
                {!isCorrect && !isParticipation && currentQ.correctIndex >= 0 && (
                  <div className="card" style={{ padding: "0.65rem 1rem", borderLeft: "3px solid #16A34A" }}>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                      Jawaban benar: <span style={{ fontWeight: 700, color: "#16A34A" }}>{currentQ.options[currentQ.correctIndex]}</span>
                    </p>
                  </div>
                )}
                {currentQ.explanation && (
                  <div className="card" style={{ padding: "0.65rem 1rem", borderLeft: "3px solid var(--accent)" }}>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", lineHeight: 1.6 }}>{currentQ.explanation}</p>
                  </div>
                )}
                <button onClick={practiceNext} className="btn btn-gradient btn-lg" style={{ marginTop: "0.25rem" }}>
                  {qIndex + 1 >= totalQuestions ? "Lihat Hasil →" : "Berikutnya →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PLAYING: answer buttons */}
        {phase === "playing" && (
          <>
            {isOpen ? (
              <div className="flex-1 col items-center justify-center px-4 safe-bottom" style={{ gap: "0.75rem" }}>
                <form onSubmit={submitOpen} className="col" style={{ gap: "0.75rem", width: "100%", maxWidth: 440 }}>
                  <textarea value={openText} onChange={(e) => setOpenText(e.target.value)}
                    placeholder="Tulis jawabanmu..." maxLength={150} rows={3}
                    className="input" style={{ resize: "none", fontSize: "1rem" }} autoFocus/>
                  <button type="submit" disabled={!openText.trim()} className="btn btn-primary btn-lg">Kirim Jawaban</button>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", textAlign: "center" }}>{openText.length}/150</p>
                </form>
              </div>
            ) : isRating ? (
              <div className="flex-1 col items-center justify-center px-4 safe-bottom" style={{ gap: "1.5rem" }}>
                <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>Pilih rating kamu:</p>
                <div className="row" style={{ gap: "0.75rem" }}>
                  {[1,2,3,4,5].map((star) => (
                    <button key={star} onClick={() => submitAnswer(star - 1)} className="btn" style={{
                      width: 60, height: 60, fontSize: "1.75rem", padding: 0,
                      background: "var(--surface)", border: "2px solid var(--border-hi)", borderRadius: "50%",
                    }}>⭐</button>
                  ))}
                </div>
              </div>
            ) : isTF ? (
              <div className="flex-1 row px-3 pb-3 safe-bottom" style={{ gap: "0.65rem", minHeight: 120 }}>
                <button onClick={() => submitAnswer(0)} className="ans-btn ans-tf-t flex-1"
                  style={{ minHeight: 120, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "clamp(2rem,8vw,3rem)", fontWeight: 900, color: "#fff" }}>B</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Benar</span>
                </button>
                <button onClick={() => submitAnswer(1)} className="ans-btn ans-tf-f flex-1"
                  style={{ minHeight: 120, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "clamp(2rem,8vw,3rem)", fontWeight: 900, color: "#fff" }}>S</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Salah</span>
                </button>
              </div>
            ) : (
              <div className={`flex-1 px-3 pb-3 safe-bottom ${phase === "playing" ? "a-fadeup" : ""}`}
                style={{ display: "grid", gridTemplateColumns: isPoll ? "1fr" : "1fr 1fr", gap: "0.55rem", alignContent: "start" }}>
                {currentQ.options.map((opt, i) => {
                  const cls = ["ans-a","ans-b","ans-c","ans-d"];
                  return (
                    <button key={i} onClick={() => submitAnswer(i)}
                      className={`ans-btn ${isPoll ? "ans-b" : cls[i % 4]}`}
                      style={{ minHeight: isPoll ? 52 : 90, flexDirection: isPoll ? "row" : "column", alignItems: "center", gap: "0.3rem" }}>
                      {!isPoll && <span style={{ fontSize: "clamp(1.5rem,5vw,2rem)" }}>{shapes[i % 4]}</span>}
                      <span className="ans-text" style={{ textAlign: "center", fontSize: "clamp(0.82rem,2.5vw,0.9rem)" }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  // ── ENDED ────────────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const totalEarned = answers.reduce((s, a) => s + a.earned, 0);
    const mcTfAnswers = answers.filter((_, i) => quiz.questions[i]?.correctIndex !== -1);
    const mcTfCorrect = mcTfAnswers.filter((a) => a.isCorrect).length;
    const pct = mcTfAnswers.length > 0 ? Math.round((mcTfCorrect / mcTfAnswers.length) * 100) : 100;
    const grade = pct >= 90 ? "Luar Biasa! 🎉" : pct >= 70 ? "Bagus! 👏" : pct >= 50 ? "Cukup Baik 👍" : "Terus Berlatih 💪";

    // Save solo score as ghost (only in solo mode to keep ghost meaningful)
    if (playMode === "solo" && currentQuizId) {
      try {
        const newGhost: GhostData = { score: totalEarned, correctCount: mcTfCorrect, date: new Date().toLocaleDateString("id-ID") };
        localStorage.setItem(`ghost:${currentQuizId}`, JSON.stringify(newGhost));
      } catch { /* ignore */ }
    }
    const ghostDiff = ghostData ? totalEarned - ghostData.score : null;

    return (
      <main className="min-h-screen col items-center px-4 py-8 safe-bottom" style={{ background: "linear-gradient(160deg, var(--bg), #FFF8E6)" }}>
        <Confetti count={40}/>

        <div className="a-popin text-center mb-6" style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <SiKuisLogoMark size={40} id="end-logo"/>
            <div style={{ fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.03em" }}>
              <span style={{ color: "var(--text)" }}>Si</span><span style={{ color: "var(--accent)" }}>Kuis</span>
            </div>
          </div>
          <h2 className="t-h2 mb-1">Kuis Selesai!</h2>
          <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{quiz.title}</p>
          <StarsResult pct={pct}/>
          <div style={{ marginTop: "1rem", fontSize: "1.25rem", fontWeight: 800, color: "var(--accent)" }}>{grade}</div>
        </div>

        {/* Score cards */}
        <div className="a-fadeup d-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", width: "100%", maxWidth: 480, marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "0.875rem 0.5rem", textAlign: "center" }}>
            <p className="t-label mb-1">Skor</p>
            <p className="t-h2" style={{ color: "var(--accent)" }}>{totalEarned.toLocaleString()}</p>
          </div>
          <div className="card" style={{ padding: "0.875rem 0.5rem", textAlign: "center" }}>
            <p className="t-label mb-1">Benar</p>
            <p className="t-h2" style={{ color: "#16A34A" }}>{mcTfCorrect}/{mcTfAnswers.length}</p>
          </div>
          <div className="card" style={{ padding: "0.875rem 0.5rem", textAlign: "center" }}>
            <p className="t-label mb-1">Akurasi</p>
            <p className="t-h2" style={{ color: pct >= 70 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626" }}>{pct}%</p>
          </div>
        </div>

        {/* Ghost comparison */}
        {ghostData && ghostDiff !== null && (
          <div className="card a-fadeup d-1" style={{
            width: "100%", maxWidth: 480, marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: ghostDiff >= 0 ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(37,99,235,0.06))" : "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.06))",
            borderColor: ghostDiff >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)",
          }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div className="row" style={{ gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>👻</span>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Ghost — {ghostData.date}</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 700 }}>{ghostData.score.toLocaleString()} poin</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Kamu sekarang</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 900, color: ghostDiff >= 0 ? "#16A34A" : "#EF4444" }}>
                  {ghostDiff >= 0 ? "+" : ""}{ghostDiff.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <div className="col a-fadeup d-2 mb-6" style={{ gap: "0.4rem", width: "100%", maxWidth: 480 }}>
          <p className="t-label text-center mb-2">Ringkasan Jawaban</p>
          {answers.map((ans, i) => {
            const q = quiz.questions[i];
            const isPartic = q.correctIndex === -1;
            return (
              <div key={i} className="card row" style={{ padding: "0.6rem 0.875rem", gap: "0.6rem" }}>
                <span style={{ color: isPartic ? "var(--accent)" : ans.isCorrect ? "#16A34A" : "#EF4444", fontWeight: 900, fontSize: "1.1rem", flexShrink: 0 }}>
                  {isPartic ? "○" : ans.isCorrect ? "✓" : "✗"}
                </span>
                <span style={{ flex: 1, color: "var(--text-dim)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.question.substring(0, 60)}{q.question.length > 60 ? "..." : ""}
                </span>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.78rem", flexShrink: 0 }}>+{ans.earned}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { setPhase("select"); setQuiz(null); setAnswers([]); setQIndex(0); }} className="btn btn-gradient btn-lg">
            🔄 Coba Quiz Lain
          </button>
          <button onClick={() => quiz && selectQuiz(quiz.id, playMode)} className="btn btn-surface btn-lg">
            🔁 Ulangi Quiz Ini
          </button>
          <button onClick={() => router.push("/")} className="btn btn-ghost btn-lg">← Beranda</button>
        </div>
      </main>
    );
  }

  return null;
}
