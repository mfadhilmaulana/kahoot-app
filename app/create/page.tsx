"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSocket } from "@/lib/socket";
import type { QuestionType } from "@/lib/types";

interface QuestionForm {
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

function emptyQ(type: QuestionType = "mc"): QuestionForm {
  if (type === "tf")     return { type, question: "", options: ["Benar", "Salah"], correctIndex: 0, timeLimit: 20 };
  if (type === "poll")   return { type, question: "", options: ["", ""], correctIndex: -1, timeLimit: 30 };
  if (type === "rating") return { type, question: "", options: ["1","2","3","4","5"], correctIndex: -1, timeLimit: 20 };
  if (type === "open")   return { type, question: "", options: [], correctIndex: -1, timeLimit: 40 };
  return { type, question: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 };
}

const MC_COLORS = ["#E21B3C","#1368CE","#26890C","#D89E00"];
const TF_COLORS = ["#26890C","#E21B3C"];
const TIME_OPTIONS = [10, 20, 30, 40, 60];
const TYPE_CONFIG: Record<QuestionType, { label: string; desc: string }> = {
  mc:     { label: "Pilihan Ganda", desc: "4 opsi · 1 jawaban benar" },
  tf:     { label: "Benar / Salah", desc: "2 opsi · 1 jawaban benar" },
  poll:   { label: "Pendapat",      desc: "Opsi bebas · Tidak ada jawaban benar" },
  rating: { label: "⭐ Rating",     desc: "Pemain beri rating 1-5 bintang" },
  open:   { label: "✏️ Teks Bebas", desc: "Pemain ketik jawaban sendiri" },
};

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQ("mc")]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setQ(idx: number, patch: Partial<QuestionForm>) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  function changeType(idx: number, type: QuestionType) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? emptyQ(type) : q));
  }

  function setOpt(qIdx: number, optIdx: number, val: string) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = [...q.options];
      options[optIdx] = val;
      return { ...q, options };
    }));
  }

  function addPollOption(idx: number) {
    const q = questions[idx];
    if (q.options.length >= 4) return;
    setQ(idx, { options: [...q.options, ""] });
  }

  function removePollOption(qIdx: number, optIdx: number) {
    const q = questions[qIdx];
    if (q.options.length <= 2) return;
    setQ(qIdx, { options: q.options.filter((_, i) => i !== optIdx) });
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQ("mc")]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  }

  function removeQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate(): { msg: string; scrollId?: string } | null {
    if (!title.trim()) return { msg: "Judul kuis tidak boleh kosong", scrollId: "quiz-title" };
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return { msg: `Pertanyaan ${i + 1}: teks soal masih kosong`, scrollId: `q-${i}` };
      if (q.type === "mc" || q.type === "poll") {
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) return { msg: `Pertanyaan ${i + 1}: opsi ${j + 1} masih kosong`, scrollId: `q-${i}` };
        }
      }
    }
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err.msg);
      if (err.scrollId) {
        const el = document.getElementById(err.scrollId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setError("");
    setLoading(true);

    const socket = getSocket();
    function doCreate() {
      socket.emit(
        "host:createCustom",
        {
          title: title.trim(),
          questions: questions.map((q) => ({
            type: q.type,
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
            timeLimit: q.timeLimit,
          })),
        },
        (res: { pin?: string; error?: string }) => {
          setLoading(false);
          if (res.error) { setError(res.error); return; }
          if (res.pin) router.push(`/host/${res.pin}`);
        }
      );
    }
    if (socket.connected) doCreate();
    else socket.once("connect", doCreate);
  }

  return (
    <main className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      {/* Sticky header */}
      <div className="row px-5 py-4" style={{
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(79,70,229,0.10)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ marginRight: "1rem", padding: "0.5rem 0.75rem" }}>
          ←
        </button>
        <div>
          <h1 className="t-h3">✏️ Buat Kuis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{questions.length} pertanyaan</p>
        </div>
      </div>

      <div className="col px-4 pt-6" style={{ maxWidth: 680, margin: "0 auto", gap: "1rem" }}>
        {/* Title */}
        <div id="quiz-title" className="card a-fadeup" style={{ padding: "1.25rem 1.5rem", border: error && !title.trim() ? "2px solid #EF4444" : undefined }}>
          <label className="t-label mb-2" style={{ display: "block" }}>Judul Kuis</label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="Contoh: Kuis Sejarah Indonesia"
            className="input"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
          />
        </div>

        {/* Questions */}
        {questions.map((q, qi) => {
          const isTF = q.type === "tf";
          const isPoll = q.type === "poll";
          const isRating = q.type === "rating";
          const isOpen = q.type === "open";
          return (
            <div id={`q-${qi}`} key={qi} className="card a-fadeup" style={{ padding: "1.25rem 1.5rem", animationDelay: `${qi * 0.04}s` }}>
              {/* Question header */}
              <div className="row mb-4" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row" style={{ gap: "0.6rem" }}>
                  <div className="center" style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: "0.8rem", fontWeight: 900 }}>
                    {qi + 1}
                  </div>
                  <span className="t-label">Pertanyaan</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="btn btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", color: "#F87171" }}>
                    Hapus
                  </button>
                )}
              </div>

              {/* Type selector */}
              <div className="row mb-1" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
                {(Object.keys(TYPE_CONFIG) as QuestionType[]).map((t) => (
                  <button key={t} onClick={() => changeType(qi, t)} className="btn" style={{
                    padding: "0.3rem 0.75rem", fontSize: "0.78rem", fontWeight: 700,
                    background: q.type === t ? "var(--accent)" : "var(--surface-2)",
                    color: q.type === t ? "#fff" : "var(--text-dim)",
                    border: q.type === t ? "none" : "1px solid var(--border)",
                    borderRadius: 8,
                  }}>
                    {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginBottom: "1rem" }}>
                {TYPE_CONFIG[q.type].desc}
              </p>

              {/* Question text */}
              <textarea
                value={q.question}
                onChange={(e) => { setQ(qi, { question: e.target.value }); setError(""); }}
                placeholder="Tulis pertanyaan di sini..."
                rows={2}
                className="input mb-4"
                style={{ resize: "none" }}
              />

              {/* Options */}
              {isTF ? (
                <div className="row mb-4" style={{ gap: "0.65rem" }}>
                  {["Benar", "Salah"].map((label, oi) => (
                    <button key={oi} onClick={() => setQ(qi, { correctIndex: oi })} className="btn flex-1" style={{
                      padding: "0.875rem", fontWeight: 700, fontSize: "0.9rem",
                      background: q.correctIndex === oi ? TF_COLORS[oi] : "var(--surface-2)",
                      color: q.correctIndex === oi ? "#fff" : "var(--text-dim)",
                      border: q.correctIndex === oi ? "none" : "1px solid var(--border)",
                    }}>
                      {label} {q.correctIndex === oi ? "✓" : ""}
                    </button>
                  ))}
                </div>
              ) : isPoll ? (
                <div className="col mb-4" style={{ gap: "0.45rem" }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="row" style={{ gap: "0.5rem" }}>
                      <div style={{ width: 4, borderRadius: 2, background: MC_COLORS[oi % 4], alignSelf: "stretch", flexShrink: 0 }} />
                      <input
                        value={opt}
                        onChange={(e) => setOpt(qi, oi, e.target.value)}
                        placeholder={`Opsi ${oi + 1}`}
                        className="input flex-1"
                        style={{ fontSize: "0.9rem" }}
                      />
                      {q.options.length > 2 && (
                        <button onClick={() => removePollOption(qi, oi)} className="btn btn-ghost" style={{ padding: "0.45rem 0.6rem", color: "#F87171" }}>×</button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <button onClick={() => addPollOption(qi)} className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "0.45rem 0.875rem", alignSelf: "flex-start" }}>
                      + Tambah opsi
                    </button>
                  )}
                </div>
              ) : isRating ? (
                <div className="card-hi center mb-4" style={{ padding: "1rem", textAlign: "center", gap: "0.5rem" }}>
                  <div className="row center" style={{ gap: "0.5rem", fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                    {[1,2,3,4,5].map((s) => <span key={s}>⭐</span>)}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Pemain akan memilih rating 1–5 bintang</p>
                </div>
              ) : isOpen ? (
                <div className="card-hi center mb-4" style={{ padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✏️</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Pemain akan mengetik jawaban teks bebas mereka</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ position: "relative", display: "flex", gap: "0.5rem" }}>
                      <div style={{ width: 4, borderRadius: 2, background: MC_COLORS[oi], alignSelf: "stretch", flexShrink: 0 }} />
                      <input
                        value={opt}
                        onChange={(e) => setOpt(qi, oi, e.target.value)}
                        placeholder={`Opsi ${oi + 1}`}
                        className="input flex-1"
                        style={{
                          fontSize: "0.875rem", paddingRight: "2.25rem",
                          borderColor: q.correctIndex === oi ? MC_COLORS[oi] : "var(--border)",
                          background: q.correctIndex === oi ? `${MC_COLORS[oi]}18` : "var(--surface-2)",
                        }}
                      />
                      <button onClick={() => setQ(qi, { correctIndex: oi })} style={{
                        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                        width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer",
                        background: q.correctIndex === oi ? MC_COLORS[oi] : "var(--surface-3)",
                        color: "#fff", fontSize: "0.65rem", fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {q.correctIndex === oi ? "✓" : "·"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Time limit */}
              <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>Waktu:</span>
                {TIME_OPTIONS.map((t) => (
                  <button key={t} onClick={() => setQ(qi, { timeLimit: t })} className="btn" style={{
                    padding: "0.28rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: 8,
                    background: q.timeLimit === t ? "var(--accent)" : "var(--surface-2)",
                    color: q.timeLimit === t ? "#fff" : "var(--text-muted)",
                    border: q.timeLimit === t ? "none" : "1px solid var(--border)",
                  }}>
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add question button */}
        <button onClick={addQuestion} className="btn btn-ghost" style={{
          width: "100%", padding: "1rem",
          border: "2px dashed var(--border-hi)", borderRadius: 16, fontSize: "0.875rem",
        }}>
          + Tambah Pertanyaan
        </button>

      </div>

      {/* Sticky submit footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, var(--bg) 85%, transparent)", padding: "0.6rem 1rem", paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {error && (
            <div style={{
              background: "#FEF2F2", border: "1.5px solid #FECACA",
              borderRadius: 10, padding: "0.55rem 0.875rem",
              marginBottom: "0.5rem",
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              <span style={{ fontSize: "0.95rem" }}>⚠️</span>
              <p style={{ color: "#DC2626", fontSize: "0.82rem", fontWeight: 700, flex: 1 }}>{error}</p>
              <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} className="btn btn-gradient btn-xl" style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Membuat game..." : `Buat Game — ${questions.length} Pertanyaan`}
          </button>
        </div>
      </div>
    </main>
  );
}
