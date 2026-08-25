"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuestionPayload, ResultsPayload, LBEntry } from "@/lib/types";
import { playJoin, playStart, playEnd, playTick } from "@/lib/sounds";
import { SiKuisLogoMark } from "@/components/icons";
import { toEmbedUrl } from "@/lib/video";

interface PlayerInfo { id: string; name: string; team?: number }

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
  const [teamTotals, setTeamTotals] = useState<Array<{ team: number; name: string; score: number }> | null>(null);
  const [opts, setOpts] = useState<{ teams: boolean; economy: boolean }>({ teams: false, economy: false });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onPlayerJoined = ({ players: p }: { players: PlayerInfo[] }) => {
      setPlayers(p);
      playJoin();
    };
    const onOptions = (o: { teams: boolean; economy: boolean }) => setOpts(o);

    const onEnded = ({ leaderboard, teamTotals: tt }: { leaderboard: LBEntry[]; teamTotals?: Array<{ team: number; name: string; score: number }> }) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setFinalLB(leaderboard);
      setTeamTotals(tt ?? null);
      setPhase("ended");
      playEnd();
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

    const onHostLeft = () => router.replace("/");

    socket.on("game:playerJoined", onPlayerJoined);
    socket.on("game:options", onOptions);
    socket.on("game:playerLeft", onPlayerLeft);
    socket.on("game:question", onQuestion);
    socket.on("game:answerCount", onAnswerCount);
    socket.on("game:questionResults", onResults);
    socket.on("game:ended", onEnded);
    socket.on("game:hostLeft", onHostLeft);

    return () => {
      socket.off("game:playerJoined", onPlayerJoined);
      socket.off("game:options", onOptions);
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

  function toggleOpt(key: "teams" | "economy") {
    const next = { ...opts, [key]: !opts[key] };
    setOpts(next);
    emit("host:setOptions", { pin, [key]: next[key] }, () => {});
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    const canStart = players.length > 0;
    return (
      <main className="min-h-screen col" style={{ background: "#0F172A" }}>
        {/* Hero PIN section */}
        <div style={{
          background: "linear-gradient(160deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)",
          padding: "2.5rem 1.5rem 2.5rem",
          textAlign: "center",
          position: "relative", overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.75rem" }}>
            <SiKuisLogoMark size={28} id="host-logo" />
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              Si<span style={{ color: "#F59E0B" }}>Kuis</span>
            </span>
          </div>

          {/* "Join at" instruction */}
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Buka <span style={{ color: "#fff" }}>sikuis.com</span> lalu masukkan kode
          </p>

          {/* PIN display */}
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.07)",
            border: "2px solid rgba(255,255,255,0.18)",
            borderRadius: 20,
            padding: "1rem 2.5rem",
            marginBottom: "1.25rem",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}>
            {pin.split("").map((d, i) => (
              <span key={i} style={{
                fontSize: "clamp(2rem,8vw,3.5rem)", fontWeight: 900,
                color: "#fff", fontFamily: "monospace",
                letterSpacing: "0.1em", lineHeight: 1,
                marginRight: i === 2 ? "0.6em" : "0.05em",
              }}>
                {d}
              </span>
            ))}
          </div>

          {/* Share hint */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", animation: "dotPulse 1.5s ease 0s infinite" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
              Game aktif · Menunggu pemain bergabung
            </p>
          </div>
        </div>

        {/* Mode toggles */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => toggleOpt("teams")} className="btn" style={{
            padding: "0.45rem 0.9rem", fontSize: "0.78rem", fontWeight: 800, borderRadius: 40,
            background: opts.teams ? "#DC2626" : "var(--surface-2)",
            color: opts.teams ? "#fff" : "var(--text-dim)",
            border: `1.5px solid ${opts.teams ? "#DC2626" : "var(--border)"}`,
          }}>
            Mode Tim {opts.teams ? "· AKTIF" : ""}
          </button>
          <button onClick={() => toggleOpt("economy")} className="btn" style={{
            padding: "0.45rem 0.9rem", fontSize: "0.78rem", fontWeight: 800, borderRadius: 40,
            background: opts.economy ? "#CA8A04" : "var(--surface-2)",
            color: opts.economy ? "#fff" : "var(--text-dim)",
            border: `1.5px solid ${opts.economy ? "#CA8A04" : "var(--border)"}`,
          }}>
            Mode Koin & Power-Up {opts.economy ? "· AKTIF" : ""}
          </button>
        </div>

        {/* Players section */}
        <div style={{
          flex: 1, background: "var(--bg)",
          borderRadius: "24px 24px 0 0", marginTop: -16,
          padding: "1.5rem 1.25rem 0",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: canStart ? "linear-gradient(135deg,#2563EB,#7C3AED)" : "var(--surface-3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.4s",
                }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: "0.95rem" }}>{players.length}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>Pemain Bergabung</p>
                  {canStart && <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Siap untuk memulai game</p>}
                </div>
              </div>
              {startError && (
                <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "0.3rem 0.6rem" }}>
                  <p style={{ color: "#DC2626", fontSize: "0.72rem", fontWeight: 600 }}>{startError}</p>
                </div>
              )}
            </div>

            {players.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", padding: "3.5rem 0" }}>
                {/* Animated waiting illustration */}
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  {[0,1,2].map((i) => (
                    <div key={i} style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      border: "2px solid var(--accent)",
                      opacity: 0.4,
                      animation: `dotPulse 2s ease ${i * 0.5}s infinite`,
                      transform: `scale(${1 + i * 0.35})`,
                    }} />
                  ))}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "2rem" }}></span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, marginBottom: "0.25rem" }}>Belum ada pemain</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Bagikan kode <strong style={{ color: "var(--accent)" }}>{pin}</strong> ke peserta</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "0.5rem" }}>
                {players.map((p, i) => (
                  <div key={p.id} className="a-popin" style={{
                    animationDelay: `${i * 0.03}s`,
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: 12, padding: "0.55rem 0.75rem",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: p.team === 0 ? "#DC2626" : p.team === 1 ? "#2563EB"
                        : `linear-gradient(135deg, ${avatarColor(p.name)}cc, ${avatarColor(p.name)})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: "0.8rem", fontWeight: 900,
                      boxShadow: `0 2px 8px ${avatarColor(p.name)}44`,
                    }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start button */}
        <div style={{
          background: "var(--bg)", borderTop: "1px solid var(--border)",
          padding: "1rem 1.25rem", paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <button
              onClick={handleStart}
              disabled={!canStart}
              style={{
                width: "100%", padding: "1rem 1.5rem",
                borderRadius: 16, border: "none", cursor: canStart ? "pointer" : "not-allowed",
                fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.01em",
                background: canStart
                  ? "linear-gradient(135deg, #1D4ED8, #7C3AED)"
                  : "var(--surface-3)",
                color: canStart ? "#fff" : "var(--text-muted)",
                boxShadow: canStart ? "0 4px 20px rgba(37,99,235,0.4)" : "none",
                transition: "all 0.25s",
              }}
            >
              {canStart
                ? `▶ Mulai Game — ${players.length} Pemain`
                : "Menunggu pemain bergabung..."}
            </button>
          </div>
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
    const isBlank = question.type === "blank";
    const isReorderQ = question.type === "reorder";
    const isTextQ = isOpen || isBlank;

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
                {isRating ? "Rating" : "Pendapat"}
              </span>
            )}
            {isOpen && (
              <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706", marginTop: "0.25rem", display: "inline-block" }}>
                Teks Bebas
              </span>
            )}
            {isBlank && (
              <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706", marginTop: "0.25rem", display: "inline-block" }}>
                Isi Jawaban
              </span>
            )}
            {isReorderQ && (
              <span className="badge" style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED", marginTop: "0.25rem", display: "inline-block" }}>
                Urutkan
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
          {question.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={question.image} alt="" style={{
              maxWidth: 720, width: "100%", maxHeight: 240, objectFit: "contain",
              borderRadius: 12, border: "1px solid var(--border)", marginBottom: "0.75rem", background: "#fff",
            }} />
          )}
          {question.video && (
            <div style={{ maxWidth: 720, width: "100%", marginBottom: "0.75rem", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
              <iframe
                src={toEmbedUrl(question.video) ?? undefined}
                title="Video soal"
                style={{ width: "100%", aspectRatio: "16/9", display: "block" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {isTextQ ? (
            <div className="card center" style={{ width: "100%", maxWidth: 720, padding: "2rem", textAlign: "center", background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.25)" }}>
              
              <p style={{ color: "var(--text-dim)", fontSize: "1rem" }}>Pemain mengetik jawaban mereka...</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>{answerCount} dari {players.length} sudah menjawab</p>
            </div>
          ) : isReorderQ ? (
            <div className="card" style={{ width: "100%", maxWidth: 720, padding: "1.5rem 1.75rem", background: "rgba(124,58,237,0.04)", borderColor: "rgba(124,58,237,0.25)" }}>
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                Pemain menyusun item berikut ke urutan yang benar:
              </p>
              <div className="col" style={{ gap: "0.4rem" }}>
                {question.options.map((item, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.5rem 0.8rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
                    {item}
                  </div>
                ))}
              </div>
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.7rem" }}>
                {answerCount} dari {players.length} sudah menjawab
              </p>
            </div>
          ) : isRating ? (
            <div className="card center" style={{ width: "100%", maxWidth: 720, padding: "2rem", textAlign: "center" }}>
              <div className="row center" style={{ gap: "1rem", fontSize: "2.5rem", marginBottom: "1rem" }}>
                {[1,2,3,4,5].map((s) => <span key={s}>★</span>)}
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
    const isBlank = results.type === "blank";
    const isReorderR = results.type === "reorder";
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

        {/* Reorder: correct order + accuracy */}
        {isReorderR ? (
          <div className="px-4 py-3" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            <div className="card center mb-3" style={{ padding: "0.9rem", textAlign: "center" }}>
              <p style={{ fontSize: "1.9rem", fontWeight: 900, color: (results.correctRate ?? 0) >= 60 ? "#16A34A" : "#CA8A04", lineHeight: 1 }}>
                {results.correctRate ?? 0}%
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>pemain menyusun dengan benar</p>
            </div>
            {results.correctOrder && (
              <div className="card" style={{ padding: "1rem 1.25rem" }}>
                <p className="t-label mb-2">Urutan yang Benar</p>
                <ol style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  {results.correctOrder.map((item, i) => (
                    <li key={i} style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.92rem", padding: "0.18rem 0" }}>{item}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : isBlank && results.openAnswers && results.openAnswers.length > 0 ? (
          /* Blank: accepted answers + responses */
          <div className="px-4 py-3" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            {results.acceptedAnswers && (
              <div className="card center mb-3" style={{ padding: "0.8rem 1rem", textAlign: "center", borderColor: "rgba(22,163,74,0.35)", background: "rgba(22,163,74,0.05)" }}>
                <p className="t-label mb-1">Jawaban Diterima</p>
                <p style={{ color: "#16A34A", fontWeight: 800, fontSize: "0.95rem" }}>{results.acceptedAnswers.join("  /  ")}</p>
                {results.correctRate !== undefined && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{results.correctRate}% pemain benar</p>
                )}
              </div>
            )}
            <p className="t-label mb-2 text-center">{results.openAnswers.length} Jawaban Masuk</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
              {results.openAnswers.map((ans, i) => {
                const ok = results.acceptedAnswers?.some((a) => a.toLowerCase().trim() === ans.toLowerCase().trim());
                return (
                  <div key={i} className="a-popin" style={{
                    animationDelay: `${i * 0.05}s`,
                    background: ok ? "rgba(22,163,74,0.08)" : "var(--surface)",
                    border: `1.5px solid ${ok ? "rgba(22,163,74,0.4)" : "var(--border-hi)"}`,
                    borderRadius: 40, padding: "0.45rem 1rem",
                    fontSize: "0.875rem", fontWeight: 600,
                    color: ok ? "#16A34A" : "var(--text)",
                  }}>
                    {ok && "✓ "}{ans}
                  </div>
                );
              })}
            </div>
          </div>
        ) : isOpen && results.openAnswers && results.openAnswers.length > 0 ? (
          (() => {
            const STOP = new Set(["yang","dan","di","ke","dari","itu","ini","untuk","dengan","pada","adalah","saya","aku","karena","atau","juga","tidak","bisa","akan","para","kami","kita","mereka","ada","saat","oleh","agar","supaya","lebih","paling","sangat","tapi","tetapi","serta","the","of","and","to","in"]);
            const freq = new Map<string, number>();
            for (const ans of results.openAnswers) {
              for (const w of ans.toLowerCase().split(/[^a-zà-ÿ0-9]+/)) {
                if (w.length < 3 || STOP.has(w)) continue;
                freq.set(w, (freq.get(w) ?? 0) + 1);
              }
            }
            const words = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
            const max = Math.max(...words.map(([, n]) => n), 1);
            const wColors = ["#2563EB","#7C3AED","#DC2626","#CA8A04","#0D9488","#DB2777"];
            return (
              <div className="px-4 py-3" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
                <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
                  <p className="t-label mb-2 text-center">Word Cloud — {results.openAnswers.length} jawaban</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.8rem", justifyContent: "center", alignItems: "baseline" }}>
                    {words.map(([w, n], i) => {
                      const scale = Math.sqrt(n / max);
                      return (
                        <span key={w} title={`${n}× disebut`} className="a-popin" style={{
                          fontSize: `${0.85 + scale * 1.6}rem`,
                          fontWeight: n === max ? 900 : 600,
                          color: wColors[i % wColors.length],
                          opacity: 0.55 + scale * 0.45,
                          animationDelay: `${i * 0.04}s`,
                        }}>{w}</span>
                      );
                    })}
                  </div>
                  <details style={{ marginTop: "0.9rem" }}>
                    <summary style={{ color: "var(--text-muted)", fontSize: "0.72rem", cursor: "pointer", fontWeight: 700 }}>Lihat semua jawaban mentah</summary>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                      {results.openAnswers.map((ans, i) => (
                        <span key={i} style={{
                          background: "var(--surface)", border: "1.5px solid var(--border-hi)",
                          borderRadius: 40, padding: "0.25rem 0.75rem",
                          fontSize: "0.78rem", fontWeight: 600, color: "var(--text)",
                        }}>{ans}</span>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            );
          })()
        ) : isRating ? (
          /* Rating: show star distribution + average */
          <div className="px-4" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
            {results.ratingAvg !== undefined && (
              <div className="card center mb-3" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{results.ratingAvg}</div>
                <div style={{ fontSize: "1.5rem", marginTop: "0.25rem" }}>{"★".repeat(Math.round(results.ratingAvg))}</div>
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
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{"★".repeat(i + 1)}</span>
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
                const medals = ["","",""];
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
    const medals = ["","",""];

    return (
      <main className="min-h-screen col items-center px-4 pt-8 pb-10 safe-bottom" style={{ background: "linear-gradient(150deg, #EFF6FF, #DBEAFE)" }}>
        <div className="text-center mb-6 a-popin">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <SiKuisLogoMark size={48} id="host-ended-logo" />
            <div style={{ fontWeight: 900, fontSize: "clamp(2rem,7vw,3rem)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span style={{ color: "var(--text)" }}>Si</span><span style={{ color: "var(--accent)" }}>Kuis</span>
            </div>
          </div>
          <h2 className="t-h2 mb-1">Game Selesai!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Peringkat akhir</p>
        </div>

        {teamTotals && teamTotals.length === 2 && (
          <div className="row a-fadeup mb-5" style={{ gap: "0.75rem", width: "100%", maxWidth: 420 }}>
            {teamTotals.map((t) => (
              <div key={t.team} className="col" style={{
                flex: 1, padding: "1rem 0.75rem", borderRadius: 16, textAlign: "center",
                background: t.team === 0 ? "rgba(220,38,38,0.08)" : "rgba(37,99,235,0.08)",
                border: `2px solid ${teamTotals[0].team === t.team ? "#F59E0B" : t.team === 0 ? "rgba(220,38,38,0.4)" : "rgba(37,99,235,0.4)"}`,
              }}>
                <p style={{ fontSize: "1.6rem", margin: 0 }}>{teamTotals[0].team === t.team ? "Juara" : ""}</p>
                <p style={{ fontWeight: 900, color: t.team === 0 ? "#DC2626" : "#2563EB", fontSize: "0.95rem", margin: "0.15rem 0" }}>Tim {t.name}</p>
                <p style={{ fontWeight: 900, fontSize: "1.3rem", color: "var(--text)", margin: 0 }}>{t.score.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

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

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => router.push(`/reports/${pin}`)} className="btn btn-surface btn-lg" style={{ minWidth: 170 }}>
            Lihat Laporan
          </button>
          <button onClick={() => router.push("/")} className="btn btn-primary btn-lg" style={{ minWidth: 170 }}>
            Kembali ke Beranda
          </button>
        </div>
      </main>
    );
  }

  return null;
}
