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

const emptyQuestion = (): QuestionForm => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  timeLimit: 20,
});

const OPTION_COLORS = ["#e53e3e", "#3182ce", "#38a169", "#d69e2e"];
const OPTION_SHAPES = ["▲", "◆", "●", "■"];

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function updateQuestion(idx: number, field: keyof QuestionForm, value: unknown) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }

  function updateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = [...q.options] as [string, string, string, string];
      options[optIdx] = value;
      return { ...q, options };
    }));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(idx: number) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCreate() {
    if (!title.trim()) { setError("Judul kuis tidak boleh kosong"); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) { setError(`Pertanyaan ${i + 1} kosong`); return; }
      if (q.options.some((o) => !o.trim())) { setError(`Semua opsi di pertanyaan ${i + 1} harus diisi`); return; }
    }

    setCreating(true);
    setError("");
    const socket = getSocket();

    socket.emit("host:createCustom", {
      title: title.trim(),
      questions: questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
        timeLimit: q.timeLimit,
      })),
    }, (res: { pin?: string; error?: string }) => {
      setCreating(false);
      if (res.error) { setError(res.error); return; }
      if (res.pin) router.push(`/host/${res.pin}`);
    });
  }

  return (
    <main className="min-h-screen p-4 pb-24"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>

      {/* Header */}
      <div className="max-w-2xl mx-auto pt-8 mb-8 flex items-center gap-4">
        <button onClick={() => router.push("/")}
          className="text-gray-400 hover:text-white transition-colors text-2xl">&larr;</button>
        <h1 className="text-3xl font-black text-white">Buat Kuis Baru</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <div className="rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <label className="block text-white font-bold mb-3 text-lg">Judul Kuis</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kuis Pengetahuan Umum"
            className="w-full px-5 py-4 rounded-2xl text-white text-lg outline-none"
            style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)" }}
          />
        </div>

        {/* Questions */}
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>

            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-400 font-bold text-sm uppercase tracking-wider">
                Pertanyaan {qIdx + 1}
              </span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qIdx)}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                  Hapus
                </button>
              )}
            </div>

            {/* Question text */}
            <textarea
              value={q.question}
              onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
              placeholder="Tulis pertanyaan di sini..."
              rows={2}
              className="w-full px-5 py-4 rounded-2xl text-white text-base outline-none resize-none mb-4"
              style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)" }}
            />

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: OPTION_COLORS[optIdx] }}>
                    {OPTION_SHAPES[optIdx]}
                  </div>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                    placeholder={`Opsi ${optIdx + 1}`}
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: q.correctIndex === optIdx
                        ? `rgba(${optIdx === 0 ? "229,83,83" : optIdx === 1 ? "49,130,206" : optIdx === 2 ? "56,161,105" : "214,158,46"},0.25)`
                        : "rgba(255,255,255,0.08)",
                      border: `2px solid ${q.correctIndex === optIdx ? OPTION_COLORS[optIdx] : "rgba(255,255,255,0.15)"}`,
                    }}
                  />
                  <button
                    onClick={() => updateQuestion(qIdx, "correctIndex", optIdx)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg font-bold transition-all"
                    style={{
                      background: q.correctIndex === optIdx ? OPTION_COLORS[optIdx] : "rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}>
                    {q.correctIndex === optIdx ? "✓" : "○"}
                  </button>
                </div>
              ))}
            </div>

            {/* Time limit */}
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">⏱ Waktu:</span>
              {[10, 20, 30, 60].map((t) => (
                <button key={t}
                  onClick={() => updateQuestion(qIdx, "timeLimit", t)}
                  className="px-3 py-1 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: q.timeLimit === t ? "#7c3aed" : "rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}>
                  {t}d
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Add question */}
        <button onClick={addQuestion}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(255,255,255,0.08)", border: "2px dashed rgba(255,255,255,0.3)" }}>
          + Tambah Pertanyaan
        </button>

        {error && (
          <div className="rounded-2xl px-6 py-4 text-center"
            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: "linear-gradient(to top, #1a1a2e, transparent)" }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            {creating ? "Membuat game..." : `Mulai Game (${questions.length} Pertanyaan)`}
          </button>
        </div>
      </div>
    </main>
  );
}
