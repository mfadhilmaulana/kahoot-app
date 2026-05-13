"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import type { QuestionType } from "@/lib/types";
import { playCorrect, playWrong, playStart, playEnd, playTick } from "@/lib/sounds";
import { SiKuisLogoMark, IconBrain, IconTarget, IconClock, IconCheckCircle, IconZap, IconBarChart } from "@/components/icons";

interface IQQ { id: string; type: QuestionType; question: string; options: string[]; correctIndex: number; timeLimit: number; category: string; }
interface IQAnswer { isCorrect: boolean; timeLeft: number; timeLimit: number; }

type Phase = "intro" | "loading" | "testing" | "feedback" | "results";

/* ── IQ Classification ───────────────────────────────────────────────────────── */
const BANDS = [
  { min: 130, label: "Sangat Superior", color: "#4F46E5", emoji: "💎", pct: 98,
    desc: "Kamu berada di 2% teratas populasi dunia. Kemampuan berpikir abstrak, analitis, dan kecepatan pemrosesan informasi kamu berada pada level tertinggi." },
  { min: 120, label: "Superior", color: "#2563EB", emoji: "🏆", pct: 91,
    desc: "Kamu masuk dalam 9% teratas. Penalaran logis dan pemecahan masalah kompleks adalah kekuatan utamamu. Potensi akademik dan profesionalmu sangat besar." },
  { min: 110, label: "Di Atas Rata-rata", color: "#0891B2", emoji: "⭐", pct: 75,
    desc: "Kamu berada di 25% teratas populasi. Kemampuan belajar yang cepat dan pemahaman mendalam membuatmu menonjol di berbagai bidang." },
  { min: 90, label: "Rata-rata", color: "#16A34A", emoji: "✅", pct: 50,
    desc: "Kemampuan kognitif yang solid dan seimbang — tepat di tengah distribusi populasi. Dengan latihan konsisten, potensimu bisa terus berkembang." },
  { min: 80, label: "Di Bawah Rata-rata", color: "#CA8A04", emoji: "📈", pct: 25,
    desc: "Ada ruang yang besar untuk bertumbuh. Latihan soal, membaca, dan aktivitas kognitif aktif dapat meningkatkan kemampuanmu secara signifikan." },
  { min: 0, label: "Terus Berkembang", color: "#EA580C", emoji: "💪", pct: 10,
    desc: "Setiap otak bisa dilatih dan berkembang. Konsistensi dalam belajar adalah kunci untuk meningkatkan kemampuan kognitif." },
];
function getBand(iq: number) { return BANDS.find((b) => iq >= b.min) ?? BANDS[BANDS.length - 1]; }

function calcIQ(answers: IQAnswer[]): number {
  if (!answers.length) return 100;
  let score = 0;
  for (const a of answers) {
    if (!a.isCorrect) continue;
    score += 5;
    const ratio = a.timeLeft / a.timeLimit;
    if (ratio > 0.6) score += 2;
    else if (ratio > 0.3) score += 1;
  }
  const max = answers.length * 7;
  return Math.round(70 + (score / max) * 75);
}

function calcAbilities(n: number, answers: IQAnswer[]) {
  const q = Math.ceil(n / 4);
  return [
    { name: "Pengenalan Pola", color: "#7C3AED", s: 0,     e: q     },
    { name: "Penalaran Logis",  color: "#2563EB", s: q,     e: q * 2 },
    { name: "Kemampuan Numerik",color: "#0891B2", s: q * 2, e: q * 3 },
    { name: "Penalaran Verbal", color: "#16A34A", s: q * 3, e: n     },
  ].map(({ name, color, s, e }) => {
    const sub = answers.slice(s, e);
    const pct = sub.length ? Math.round((sub.filter((a) => a.isCorrect).length / sub.length) * 100) : 50;
    return { name, color, pct };
  });
}

/* ── Counter animation ───────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600): number {
  const [val, setVal] = useState(70);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setVal(Math.round(70 + eased * (target - 70)));
      if (elapsed >= duration) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

export default function IQTestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<IQQ[]>([]);
  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<IQAnswer[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTest() {
    setPhase("loading");
    const socket = getSocket();
    function go() {
      socket.emit("quiz:getSoloData", { quizId: "iq" }, (res: { questions?: IQQ[]; error?: string }) => {
        if (res.error || !res.questions) { setPhase("intro"); return; }
        const filtered = res.questions.filter((q) => q.type === "mc" || q.type === "tf");
        setQuestions(filtered);
        setQi(0);
        setAnswers([]);
        setChosen(null);
        setPhase("testing");
        playStart();
        beginTimer(filtered[0].timeLimit);
      });
    }
    if (socket.connected) go();
    else socket.once("connect", go);
  }

  function beginTimer(limit: number) {
    setTimeLeft(limit);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        if (t <= 4) playTick();
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (timeLeft === 0 && phase === "testing" && questions.length > 0) {
      submitAnswer(null);
    }
  }, [timeLeft]); // eslint-disable-line

  function submitAnswer(optIdx: number | null) {
    if (phase !== "testing") return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const q = questions[qi];
    const isCorrect = optIdx !== null && optIdx === q.correctIndex;
    setChosen(optIdx);
    setAnswers((prev) => [...prev, { isCorrect, timeLeft, timeLimit: q.timeLimit }]);
    setPhase("feedback");
    if (isCorrect) playCorrect(); else playWrong();
    advanceRef.current = setTimeout(() => {
      const next = qi + 1;
      if (next >= questions.length) { setPhase("results"); playEnd(); return; }
      setQi(next);
      setChosen(null);
      setPhase("testing");
      beginTimer(questions[next].timeLimit);
    }, 900);
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  /* ── INTRO ─────────────────────────────────────────────────────────────────── */
  if (phase === "intro") {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0F172A" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
          {/* Glow blob */}
          <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ textAlign: "center", maxWidth: 480, position: "relative" }}>
            {/* Icon */}
            <div style={{ display: "inline-flex", width: 88, height: 88, borderRadius: 28, background: "linear-gradient(135deg,#4F46E5,#2563EB)", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", boxShadow: "0 12px 40px rgba(79,70,229,0.45)" }}>
              <IconBrain size={40} color="#fff" />
            </div>

            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(1.75rem,5vw,2.5rem)", letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>
              Tes IQ <span style={{ color: "#818CF8" }}>SiKuis</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
              Ukur kemampuan kognitif kamu melalui soal pola, logika, numerik, dan verbal. Hasil tes akan menentukan estimasi IQ dan profil kognitifmu.
            </p>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "2rem", textAlign: "left" }}>
              {[
                { Icon: IconCheckCircle, label: "12–15 soal pilihan", color: "#818CF8" },
                { Icon: IconClock, label: "Timer per soal", color: "#34D399" },
                { Icon: IconBrain, label: "4 dimensi kognitif", color: "#60A5FA" },
                { Icon: IconZap, label: "Hasil instan & detail", color: "#FBBF24" },
              ].map(({ Icon, label, color }, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Icon size={16} color={color} />
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>

            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", marginBottom: "1.25rem" }}>
              ⚠️ Kerjakan sendiri tanpa bantuan. Hasil lebih akurat jika dikerjakan jujur.
            </p>

            <button onClick={startTest} style={{
              width: "100%", padding: "1rem 1.5rem",
              background: "linear-gradient(135deg, #4F46E5, #2563EB)",
              color: "#fff", fontWeight: 900, fontSize: "1.05rem",
              border: "none", borderRadius: 16, cursor: "pointer",
              boxShadow: "0 6px 24px rgba(79,70,229,0.5)",
              letterSpacing: "-0.01em",
            }}>
              Mulai Tes IQ →
            </button>

            <button onClick={() => router.push("/")} style={{ marginTop: "0.75rem", background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", cursor: "pointer" }}>
              ← Kembali
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ── LOADING ───────────────────────────────────────────────────────────────── */
  if (phase === "loading") {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(79,70,229,0.3)", borderTopColor: "#4F46E5", animation: "spinRing 0.8s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Memuat soal tes...</p>
      </main>
    );
  }

  /* ── TESTING / FEEDBACK ────────────────────────────────────────────────────── */
  if ((phase === "testing" || phase === "feedback") && questions.length > 0) {
    const q = questions[qi];
    const progress = ((qi + (phase === "feedback" ? 1 : 0)) / questions.length) * 100;
    const timerPct = timeLeft / q.timeLimit;
    const isTF = q.type === "tf";
    const OPT_LETTERS = ["A", "B", "C", "D"];

    return (
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0F172A" }}>
        {/* Top bar */}
        <div style={{ padding: "1rem 1.25rem 0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>
              SOAL {qi + 1} / {questions.length}
            </span>
            <span style={{ color: timerPct > 0.5 ? "#34D399" : timerPct > 0.25 ? "#FBBF24" : "#F87171", fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace" }}>
              {phase === "testing" ? timeLeft : 0}s
            </span>
          </div>
          {/* Timer bar */}
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${phase === "testing" ? timerPct * 100 : 0}%`,
              background: timerPct > 0.5 ? "#34D399" : timerPct > 0.25 ? "#FBBF24" : "#F87171",
              transition: "width 0.9s linear, background 0.4s",
            }} />
          </div>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.6rem", justifyContent: "center" }}>
            {questions.map((_, i) => (
              <div key={i} style={{
                height: 4, flex: 1, borderRadius: 2,
                background: i < qi ? "#4F46E5"
                  : i === qi ? "rgba(79,70,229,0.6)"
                  : "rgba(255,255,255,0.1)",
              }} />
            ))}
          </div>
        </div>

        {/* Question */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.5rem 1.25rem" }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem", textAlign: "center" }}>
            {q.category || "Penalaran"}
          </p>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "1.5rem 1.25rem", textAlign: "center", marginBottom: "1.25rem" }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(0.95rem,3vw,1.15rem)", lineHeight: 1.6 }}>
              {q.question}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: "grid", gridTemplateColumns: isTF ? "1fr 1fr" : "1fr", gap: "0.55rem" }}>
            {q.options.map((opt, i) => {
              const isSelected = chosen === i;
              const isCorrectOpt = phase === "feedback" && i === q.correctIndex;
              const isWrongOpt = phase === "feedback" && isSelected && !isCorrectOpt;
              return (
                <button
                  key={i}
                  onClick={() => phase === "testing" && submitAnswer(i)}
                  disabled={phase === "feedback"}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.875rem 1rem", borderRadius: 14, border: "1.5px solid",
                    cursor: phase === "testing" ? "pointer" : "default",
                    textAlign: "left", transition: "all 150ms",
                    background: isCorrectOpt ? "rgba(52,211,153,0.15)"
                      : isWrongOpt ? "rgba(248,113,113,0.15)"
                      : isSelected ? "rgba(79,70,229,0.2)"
                      : "rgba(255,255,255,0.04)",
                    borderColor: isCorrectOpt ? "#34D399"
                      : isWrongOpt ? "#F87171"
                      : isSelected ? "#818CF8"
                      : "rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCorrectOpt ? "#34D399" : isWrongOpt ? "#F87171" : "rgba(255,255,255,0.08)",
                    fontWeight: 900, fontSize: "0.75rem",
                    color: isCorrectOpt || isWrongOpt ? "#fff" : "rgba(255,255,255,0.5)",
                  }}>
                    {isCorrectOpt ? "✓" : isWrongOpt ? "✗" : OPT_LETTERS[i]}
                  </div>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.4 }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  /* ── RESULTS ───────────────────────────────────────────────────────────────── */
  if (phase === "results") {
    const iq = calcIQ(answers);
    const band = getBand(iq);
    const abilities = calcAbilities(questions.length, answers);
    const correct = answers.filter((a) => a.isCorrect).length;
    return <IQResults iq={iq} band={band} abilities={abilities} correct={correct} total={answers.length} onRetry={startTest} onHome={() => router.push("/")} />;
  }

  return null;
}

/* ── Results sub-component (keeps animation clean) ───────────────────────────── */
function IQResults({ iq, band, abilities, correct, total, onRetry, onHome }: {
  iq: number; band: ReturnType<typeof getBand>;
  abilities: Array<{ name: string; color: string; pct: number }>;
  correct: number; total: number;
  onRetry: () => void; onHome: () => void;
}) {
  const displayed = useCountUp(iq, 1800);
  const pct = Math.round((correct / total) * 100);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0F172A", padding: "2rem 1.25rem", alignItems: "center" }}>
      {/* Glow */}
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${band.color}22 0%, transparent 65%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{band.emoji}</div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Estimasi IQ Kamu
          </p>
          {/* Big IQ number */}
          <div style={{ fontSize: "clamp(5rem,18vw,7rem)", fontWeight: 900, lineHeight: 1, color: "#fff", letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>
            {displayed}
          </div>
          {/* Band badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: `${band.color}22`, border: `1.5px solid ${band.color}55`,
            borderRadius: 40, padding: "0.4rem 1rem", marginTop: "0.75rem",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: band.color }} />
            <span style={{ color: band.color, fontWeight: 800, fontSize: "0.85rem" }}>{band.label}</span>
          </div>
        </div>

        {/* Percentile bar */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Persentil Populasi</span>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: "0.85rem" }}>Top {100 - band.pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${band.pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${band.color}88, ${band.color})`, transition: "width 1.2s 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.62rem" }}>0</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.62rem" }}>Rata-rata 100</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.62rem" }}>145</span>
          </div>
        </div>

        {/* Score */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "0.875rem 1.25rem", marginBottom: "0.875rem", display: "flex", justifyContent: "space-around" }}>
          {[
            { label: "Jawaban Benar", val: `${correct}/${total}`, color: "#34D399" },
            { label: "Akurasi", val: `${pct}%`, color: "#60A5FA" },
            { label: "IQ Estimasi", val: iq.toString(), color: band.color },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{s.label}</p>
              <p style={{ color: s.color, fontWeight: 900, fontSize: "1.1rem" }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Cognitive abilities */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.875rem" }}>
            Profil Kognitif
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {abilities.map((a) => (
              <div key={a.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 600 }}>{a.name}</span>
                  <span style={{ color: a.color, fontSize: "0.78rem", fontWeight: 800 }}>{a.pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ height: "100%", width: `${a.pct}%`, borderRadius: 3, background: a.color, transition: "width 1s 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: `${band.color}12`, border: `1px solid ${band.color}30`, borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ color: band.color, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Ringkasan
          </p>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", lineHeight: 1.7 }}>
            {band.desc}
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem", marginTop: "0.75rem" }}>
            * Tes ini adalah estimasi berbasis soal latihan, bukan tes IQ klinis resmi.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={onRetry} style={{
            flex: 1, padding: "0.875rem", borderRadius: 14, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${band.color}, #2563EB)`,
            color: "#fff", fontWeight: 800, fontSize: "0.875rem",
          }}>
            🔄 Ulangi Tes
          </button>
          <button onClick={onHome} style={{
            flex: 1, padding: "0.875rem", borderRadius: 14, cursor: "pointer",
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: "0.875rem",
          }}>
            ← Beranda
          </button>
        </div>
      </div>
    </main>
  );
}
