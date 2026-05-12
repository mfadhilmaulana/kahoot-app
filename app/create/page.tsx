"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSocket } from "@/lib/socket";

interface QuestionForm {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  timeLimit: number;
}

const emptyQ = (): QuestionForm => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  timeLimit: 20,
});

const OPT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const OPT_SHAPES = ["▲", "◆", "●", "■"];
const TIME_OPTIONS = [10, 20, 30, 60];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQ()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setQ(idx: number, patch: Partial<QuestionForm>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function setOpt(qIdx: number, optIdx: number, val: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...q.options] as [string, string, string, string];
        options[optIdx] = val;
        return { ...q, options };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQ()]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  }

  function removeQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate(): string | null {
    if (!title.trim()) return "Judul kuis tidak boleh kosong";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Pertanyaan ${i + 1} masih kosong`;
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) return `Opsi ${j + 1} di pertanyaan ${i + 1} masih kosong`;
      }
    }
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);

    const socket = getSocket();

    function doCreate() {
      socket.emit(
        "host:createCustom",
        {
          title: title.trim(),
          questions: questions.map((q) => ({
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
    <main
      className="min-h-screen pb-32"
      style={{ background: "linear-gradient(160deg, #0f0f1a 0%, #1a0533 100%)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 py-4 flex items-center gap-4"
        style={{ background: "rgba(15,15,26,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-white font-black text-xl">Buat Kuis</h1>
          <p className="text-gray-500 text-xs">{questions.length} pertanyaan</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Title card */}
        <div className="glass rounded-2xl p-5 fade-in">
          <label className="block text-purple-300 text-xs font-bold uppercase tracking-widest mb-2">
            Judul Kuis
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kuis Sejarah Indonesia"
            className="input-dark w-full px-4 py-3 rounded-xl text-lg font-semibold"
          />
        </div>

        {/* Questions */}
        {questions.map((q, qi) => (
          <div key={qi} className="glass rounded-2xl p-5 fade-in" style={{ animationDelay: `${qi * 0.05}s` }}>
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                  {qi + 1}
                </span>
                <span className="text-purple-300 text-sm font-bold uppercase tracking-wider">Pertanyaan</span>
              </div>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(qi)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  Hapus
                </button>
              )}
            </div>

            {/* Question text */}
            <textarea
              value={q.question}
              onChange={(e) => setQ(qi, { question: e.target.value })}
              placeholder="Tulis pertanyaan di sini..."
              rows={2}
              className="input-dark w-full px-4 py-3 rounded-xl text-base resize-none mb-4"
            />

            {/* Options grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {q.options.map((opt, oi) => (
                <div key={oi} className="relative">
                  {/* Color bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                    style={{ background: OPT_COLORS[oi] }}
                  />
                  <input
                    value={opt}
                    onChange={(e) => setOpt(qi, oi, e.target.value)}
                    placeholder={`Opsi ${oi + 1}`}
                    className="input-dark w-full pl-5 pr-12 py-3 rounded-xl text-sm"
                    style={{
                      borderColor: q.correctIndex === oi ? OPT_COLORS[oi] : "rgba(255,255,255,0.15)",
                      background: q.correctIndex === oi ? `${OPT_COLORS[oi]}22` : "rgba(255,255,255,0.08)",
                    }}
                  />
                  {/* Shape badge */}
                  <span
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: OPT_COLORS[oi] }}
                  >
                    {OPT_SHAPES[oi]}
                  </span>
                  {/* Correct toggle */}
                  <button
                    onClick={() => setQ(qi, { correctIndex: oi })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black transition-all"
                    style={{
                      background: q.correctIndex === oi ? OPT_COLORS[oi] : "rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                    title="Tandai sebagai jawaban benar"
                  >
                    {q.correctIndex === oi ? "✓" : "·"}
                  </button>
                </div>
              ))}
            </div>

            {/* Time limit */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-xs font-semibold mr-1">⏱ Waktu:</span>
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setQ(qi, { timeLimit: t })}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: q.timeLimit === t ? "#7c3aed" : "rgba(255,255,255,0.08)",
                    color: q.timeLimit === t ? "#fff" : "#9ca3af",
                    border: q.timeLimit === t ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Add question */}
        <button
          onClick={addQuestion}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-all hover:bg-white/10 active:scale-98"
          style={{ border: "2px dashed rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.05)" }}
        >
          + Tambah Pertanyaan
        </button>

        {error && (
          <div className="rounded-2xl px-5 py-4"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-red-400 font-semibold text-sm text-center">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: "linear-gradient(to top, #0f0f1a 70%, transparent)" }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-5 text-lg rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Membuat game..." : `🚀  Buat Game — ${questions.length} Pertanyaan`}
          </button>
        </div>
      </div>
    </main>
  );
}
