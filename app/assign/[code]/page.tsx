"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { AssignmentQuestion, QuestionType } from "@/lib/types";
import { SiKuisLogoMark } from "@/components/icons";
import { playJoin, playStart, playEnd } from "@/lib/sounds";
import { speak } from "@/lib/tts";
import { randomNickname } from "@/lib/nicknames";

interface AssignData {
  ok: true; code: string; title: string; expired: boolean; deadlineMs: number;
  questions: AssignmentQuestion[];
}
interface SubmitResp { choice?: number | null; text?: string | null; order?: string[] | null }
const TYPE_LABEL: Record<string, string> = {
  mc: "Pilihan Ganda", tf: "Benar / Salah", poll: "Pendapat",
  rating: "Rating", open: "Jawaban Bebas", reorder: "Urutkan", blank: "Isi Jawaban",
};

export default function AssignPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = use(params);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [data, setData] = useState<AssignData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<"join" | "run" | "done">("join");
  const [name, setName] = useState("");
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState<SubmitResp[]>([]);
  const [orderPick, setOrderPick] = useState<string[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; total: number; rank: number } | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    const code = rawCode?.toUpperCase();
    function load() {
      socket.emit("assignment:get", { code }, (res: AssignData | { error: string }) => {
        if ("error" in res) { setLoadError(res.error); return; }
        setData(res);
        setResponses(new Array(res.questions.length).fill(null));
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }, [rawCode]);

  const q = data?.questions[idx];

  function commitCurrent() {
    if (!q || !data) return;
    setResponses((prev) => {
      const next = [...prev];
      if (q.type === "reorder") next[idx] = { order: orderPick };
      else if (q.type === "open" || q.type === "blank") next[idx] = { text: textDraft.trim() || null };
      else next[idx] = { choice: (next[idx]?.choice ?? null) as number | null };
      return next;
    });
  }

  function choose(optionIndex: number) {
    playJoin();
    setResponses((prev) => {
      const next = [...prev];
      next[idx] = { choice: optionIndex };
      return next;
    });
  }

  function goNext() {
    commitCurrent();
    playStart();
    setTextDraft("");
    setOrderPick([]);
    setIdx((i) => i + 1);
  }

  function goPrev() {
    commitCurrent();
    setTextDraft("");
    setOrderPick([]);
    setIdx((i) => Math.max(0, i - 1));
  }

  function handleSubmit() {
    if (!data || submitting) return;
    setSubmitting(true);
    socketRef.current?.emit("assignment:submit",
      { code: data.code, name: name.trim(), responses, durationSec: Math.round((Date.now() - startedAtRef.current) / 1000) },
      (res: { ok?: boolean; score?: number; correctCount?: number; total?: number; rank?: number; error?: string }) => {
        setSubmitting(false);
        if (res.error) { setLoadError(res.error); return; }
        if (res.ok) {
          playEnd();
          setResult({ score: res.score!, correctCount: res.correctCount!, total: res.total!, rank: res.rank! });
          setPhase("done");
        }
      });
  }

  function startRun() {
    const cleanName = name.trim().slice(0, 30);
    if (!cleanName || !data) return;
    playStart();
    startedAtRef.current = Date.now();
    setPhase("run");
  }

  function answeredState(qt: AssignmentQuestion): boolean {
    const r = responses[idx];
    if (!r) return false;
    if (qt.type === "reorder") return Array.isArray(r.order) && r.order.length === (qt.itemsShuffled?.length ?? 0);
    if (qt.type === "open" || qt.type === "blank") return typeof r.text === "string" && r.text.length > 0;
    return r.choice != null && r.choice >= 0;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loadError && !data) {
    return (
      <main className="min-h-screen " style={{ background: "var(--bg)", padding: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
        <p style={{ color: "var(--text)", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>{loadError}</p>
        <button onClick={() => router.push("/assignments")} className="btn-primary">Lihat daftar tugas</button>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-screen " style={{ background: "var(--bg)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--surface-3)", borderTopColor: "var(--accent)", animation: "spinRing 0.8s linear infinite" }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header style={{
        background: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)",
        padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <SiKuisLogoMark size={28} id={`asg-${data.code}`} />
        <div>
          <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>📝 {data.title}</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}>
            Kode tugas {data.code} · tenggat {new Date(data.deadlineMs).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        {phase === "join" && (
          <section style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "1.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🧑‍🎓</p>
            <h1 style={{ color: "var(--text)", fontWeight: 900, fontSize: "1.15rem", marginBottom: "0.35rem" }}>Masuk ke Tugas</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
              {data.questions.length} soal · kerjakan dengan tenang tanpa tekanan waktu
              {data.expired && <span style={{ color: "#DC2626", fontWeight: 700 }}> · ⚠️ Tenggat sudah lewat (jawaban mungkin ditolak)</span>}
            </p>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startRun()}
              placeholder="Nama lengkapmu..." maxLength={30} className="input"
              style={{ width: "100%", height: 44, fontSize: "0.95rem", textAlign: "center", marginBottom: "0.6rem" }}
            />
            <button onClick={() => setName(randomNickname())} style={{
              background: "none", border: "none", color: "var(--accent)",
              fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.9rem",
            }}>
              🎲 Pakai nama acak
            </button>
            <br />
            <button onClick={startRun} disabled={!name.trim()} className="btn-primary" style={{ width: "100%", opacity: name.trim() ? 1 : 0.5 }}>
              Mulai Mengerjakan →
            </button>
          </section>
        )}

        {phase === "run" && q && (
          <>
            {/* progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.9rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Soal {idx + 1}/{data.questions.length}</span>
              <div style={{ flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 40, overflow: "hidden" }}>
                <div style={{ width: `${((idx + 1) / data.questions.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#2563EB,#7C3AED)", transition: "width 250ms" }} />
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--surface-3)", borderRadius: 40, padding: "0.15rem 0.5rem" }}>
                {TYPE_LABEL[q.type]}
              </span>
            </div>

            <section style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "1.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                <h2 style={{ color: "var(--text)", fontWeight: 800, fontSize: "1rem", lineHeight: 1.45, marginBottom: "0.9rem" }}>{q.question}</h2>
                <button title="Dengarkan soal" onClick={() => speak(q.question)} style={{
                  flexShrink: 0, background: "var(--surface-3)", border: "1px solid var(--border-hi)",
                  borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "0.85rem",
                }}>🔊</button>
              </div>

              {q.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={q.image} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, marginBottom: "0.9rem", border: "1px solid var(--border)" }} />
              )}

              {(q.type === "mc" || q.type === "tf" || q.type === "poll" || q.type === "rating") &&
                q.options.map((opt, i) => {
                  const selected = responses[idx]?.choice === i;
                  return (
                    <button key={i} onClick={() => choose(i)} style={{
                      display: "flex", alignItems: "center", gap: "0.7rem", width: "100%",
                      padding: "0.8rem 0.9rem", marginBottom: "0.5rem",
                      background: selected ? "rgba(37,99,235,0.12)" : "var(--surface-2, var(--surface))",
                      border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 12, cursor: "pointer", textAlign: "left",
                    }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: ["#EF4444", "#2563EB", "#F59E0B", "#16A34A"][i % 4],
                        color: "#fff", fontWeight: 900, fontSize: "0.8rem",
                      }}>{["▲", "◆", "●", "■"][i % 4]}</span>
                      <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.88rem" }}>{opt}</span>
                    </button>
                  );
                })}

              {(q.type === "open" || q.type === "blank") && (
                <textarea
                  value={responses[idx]?.text ?? textDraft ?? ""}
                  onChange={(e) => {
                    setTextDraft(e.target.value);
                    setResponses((prev) => { const n = [...prev]; n[idx] = { text: e.target.value }; return n; });
                  }}
                  placeholder={q.type === "blank" ? "Ketik jawabanmu di sini..." : "Tulis pendapatmu..."}
                  rows={3} maxLength={150} className="input"
                  style={{ width: "100%", fontSize: "0.9rem", padding: "0.8rem", resize: "vertical" }}
                />
              )}

              {q.type === "reorder" && q.itemsShuffled && (
                <div>
                  <p style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginBottom: "0.6rem" }}>
                    Ketuk item sesuai urutan yang benar ({orderPick.length}/{q.itemsShuffled.length} tersusun):
                  </p>
                  <ol style={{ listStyle: "decimal", paddingLeft: "1.4rem", marginBottom: "0.8rem", minHeight: 30 }}>
                    {orderPick.map((item, i) => (
                      <li key={i} onClick={() => setOrderPick((p) => p.filter((x) => x !== item))}
                        style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", padding: "0.2rem 0", cursor: "pointer" }}>
                        {item} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.68rem" }}>(ketuk utk batal)</span>
                      </li>
                    ))}
                  </ol>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {q.itemsShuffled.filter((it) => !orderPick.includes(it)).map((item) => (
                      <button key={item} onClick={() => setOrderPick((p) => [...p, item])} style={{
                        padding: "0.7rem 0.9rem", background: "var(--surface-2, var(--surface))",
                        border: "2px solid var(--border)", borderRadius: 12, cursor: "pointer",
                        color: "var(--text)", fontWeight: 600, fontSize: "0.88rem", textAlign: "left",
                      }}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* nav */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem" }}>
              {idx > 0 ? (
                <button onClick={goPrev} className="btn-surface" style={{ flex: 1 }}>← Sebelumnya</button>
              ) : <div style={{ flex: 1 }} />}
              {idx < data.questions.length - 1 ? (
                <button onClick={goNext} disabled={!answeredState(q)} className="btn-primary"
                  style={{ flex: 2, opacity: answeredState(q) ? 1 : 0.45 }}>Berikutnya →</button>
              ) : (
                <button onClick={() => { commitCurrent(); setTimeout(handleSubmit, 30); }} disabled={!answeredState(q) || submitting}
                  className="btn-primary" style={{ flex: 2, opacity: answeredState(q) && !submitting ? 1 : 0.45 }}>
                  {submitting ? "Mengirim..." : "✅ Kirim Jawaban"}
                </button>
              )}
            </div>
          </>
        )}

        {phase === "done" && result && (
          <section style={{ background: "var(--surface)", border: "1.5px solid rgba(22,163,74,0.4)", borderRadius: 16, padding: "2rem 1.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</p>
            <h1 style={{ color: "var(--text)", fontWeight: 900, fontSize: "1.25rem", marginBottom: "0.25rem" }}>Jawaban Terkirim!</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>Semangat belajarnya keren, {name.trim()}!</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Skor", value: result.score.toLocaleString("id-ID") },
                { label: "Benar", value: `${result.correctCount}/${result.total}` },
                { label: "Peringkat", value: `#${result.rank}` },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--surface-2, var(--surface))", border: "1px solid var(--border)", borderRadius: 12, padding: "0.8rem 0.4rem" }}>
                  <p style={{ color: "var(--accent)", fontWeight: 900, fontSize: "1.05rem" }}>{s.value}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontWeight: 700 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => router.push("/")} className="btn-surface" style={{ width: "100%" }}>🏠 Kembali ke Beranda</button>
          </section>
        )}
      </div>
    </main>
  );
}
