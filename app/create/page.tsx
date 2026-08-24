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
  image: string;      // URL gambar opsional
  items: string[];    // tipe "reorder": urutan yang benar
  answers: string[];  // tipe "blank": jawaban yang diterima
  explanation?: string;
}

function emptyQ(type: QuestionType = "mc"): QuestionForm {
  if (type === "tf")     return { type, question: "", options: ["Benar", "Salah"], correctIndex: 0, timeLimit: 20, image: "", items: [], answers: [] };
  if (type === "poll")   return { type, question: "", options: ["", ""], correctIndex: -1, timeLimit: 30, image: "", items: [], answers: [] };
  if (type === "rating") return { type, question: "", options: ["1","2","3","4","5"], correctIndex: -1, timeLimit: 20, image: "", items: [], answers: [] };
  if (type === "open")   return { type, question: "", options: [], correctIndex: -1, timeLimit: 40, image: "", items: [], answers: [] };
  if (type === "reorder")return { type, question: "", options: [], correctIndex: -1, timeLimit: 40, image: "", items: ["", "", ""], answers: [] };
  if (type === "blank")  return { type, question: "", options: [], correctIndex: -1, timeLimit: 30, image: "", items: [], answers: [""] };
  return { type, question: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20, image: "", items: [], answers: [] };
}

const MC_COLORS = ["#E21B3C","#1368CE","#26890C","#D89E00"];
const TF_COLORS = ["#26890C","#E21B3C"];
const TIME_OPTIONS = [10, 20, 30, 40, 60];
const TYPE_CONFIG: Record<QuestionType, { label: string; desc: string }> = {
  mc:      { label: "Pilihan Ganda", desc: "4 opsi · 1 jawaban benar" },
  tf:      { label: "Benar / Salah", desc: "2 opsi · 1 jawaban benar" },
  poll:    { label: "Pendapat",      desc: "Opsi bebas · Tidak ada jawaban benar" },
  rating:  { label: "⭐ Rating",     desc: "Pemain beri rating 1-5 bintang" },
  open:    { label: "✏️ Teks Bebas", desc: "Pemain ketik jawaban sendiri" },
  reorder: { label: "🔢 Urutkan",    desc: "Pemain menyusun item ke urutan yang benar" },
  blank:   { label: "📝 Isian",      desc: "Pemain mengetik jawaban · dicek otomatis" },
};

interface AIQuestion {
  id: string; type: QuestionType; question: string; options: string[];
  correctIndex: number; timeLimit: number; sourceQuiz: string;
  explanation?: string;
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQ("mc")]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResults, setAiResults] = useState<AIQuestion[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [aiEngine, setAiEngine] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importLoading, setImportLoading] = useState("");
  const [importError, setImportError] = useState("");

  function generateFromTopic() {
    const topic = aiTopic.trim();
    if (!topic) return;
    setAiLoading(true);
    setAiError("");
    setAiResults([]);
    const socket = getSocket();
    function doGenerate() {
      socket.emit("quiz:generateFromTopic", { topic, count: 10 }, (res: { questions?: AIQuestion[]; engine?: string; error?: string }) => {
        setAiLoading(false);
        if (res.error) { setAiError(res.error); return; }
        setAiEngine(res.engine ?? "");
        setAiResults(res.questions ?? []);
      });
    }
    if (socket.connected) doGenerate();
    else socket.once("connect", doGenerate);
  }

  function addAIQuestion(q: AIQuestion) {
    setQuestions((prev) => [...prev, {
      type: q.type,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: q.timeLimit,
      image: "",
      items: [],
      answers: [],
      explanation: "",
    }]);
    setAddedIds((prev) => new Set(prev).add(q.id));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  }

  // ── Impor soal ────────────────────────────────────────────────────────────
  const readFileB64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("gagal baca file"));
    r.readAsDataURL(f);
  });

  function parseCsv(text: string): QuestionForm[] {
    const out: QuestionForm[] = [];
    for (const line of text.split(/\r?\n/).map((l) => l.trim())) {
      if (!line || /^[a-z_-]+$/i.test(line.split(";")[0])) continue; // skip header
      const parts = line.split(";").map((s) => s.trim());
      if (parts.length < 6 || !parts[0]) continue;
      const ki = Math.max(0, Math.min(3, (parseInt(parts[5], 10) || 1) - 1));
      out.push({
        type: "mc", question: parts[0],
        options: [parts[1] ?? "", parts[2] ?? "", parts[3] ?? "", parts[4] ?? ""],
        correctIndex: ki, timeLimit: 20, image: "", items: [], answers: [],
        explanation: parts[6] ?? "",
      });
    }
    return out;
  }

  async function handleGenerateFromText(textOverride?: string) {
    const t = (textOverride ?? pasteText).trim();
    if (t.length < 60) { setImportError("Tempel teks minimal beberapa paragraf (≥60 karakter)."); return; }
    setImportLoading("AI menyusun soal dari teks...");
    setImportError("");
    setAiResults([]);
    getSocket().emit("quiz:generateFromText", { text: t.slice(0, 8000), count: 8 },
      (res: { questions?: AIQuestion[]; engine?: string; error?: string }) => {
        setImportLoading("");
        if (res.error) { setImportError(res.error); return; }
        setAiEngine(res.engine ?? "");
        setAiResults(res.questions ?? []);
      });
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportError("");
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".csv")) {
        const qs = parseCsv(await file.text());
        if (qs.length === 0) { setImportError("CSV kosong / format salah. Format: soal;opsiA;opsiB;opsiC;opsiD;kunci(1-4);penjelasan"); return; }
        setQuestions((prev) => [...prev, ...qs]);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
        return;
      }
      setImportLoading(name.endsWith(".pdf") ? "Membaca PDF & menyusun soal dengan AI..." : "Menyusun soal dari teks...");
      setAiResults([]);
      if (name.endsWith(".txt")) {
        handleGenerateFromText(await file.text());
        setImportLoading("");
        return;
      }
      const b64 = await readFileB64(file);
      getSocket().emit("quiz:importPdf", { b64, count: 8 },
        (res: { questions?: AIQuestion[]; engine?: string; error?: string }) => {
          setImportLoading("");
          if (res.error) { setImportError(res.error); return; }
          setAiEngine(res.engine ?? "");
          setAiResults(res.questions ?? []);
        });
    } catch {
      setImportLoading("");
      setImportError("Gagal membaca file.");
    }
  }

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

  // ── Editor tipe "reorder" (urutan benar) ──
  function setItem(qIdx: number, iIdx: number, val: string) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const items = [...q.items];
      items[iIdx] = val;
      return { ...q, items };
    }));
  }
  function addItemRow(qIdx: number) {
    const q = questions[qIdx];
    if (q.items.length >= 6) return;
    setQ(qIdx, { items: [...q.items, ""] });
  }
  function removeItemRow(qIdx: number, iIdx: number) {
    const q = questions[qIdx];
    if (q.items.length <= 2) return;
    setQ(qIdx, { items: q.items.filter((_, i) => i !== iIdx) });
  }

  // ── Editor tipe "blank" (jawaban diterima) ──
  function setBlankAnswer(qIdx: number, aIdx: number, val: string) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const answers = [...q.answers];
      answers[aIdx] = val;
      return { ...q, answers };
    }));
  }
  function addBlankAnswer(qIdx: number) {
    const q = questions[qIdx];
    if (q.answers.length >= 5) return;
    setQ(qIdx, { answers: [...q.answers, ""] });
  }
  function removeBlankAnswer(qIdx: number, aIdx: number) {
    const q = questions[qIdx];
    if (q.answers.length <= 1) return;
    setQ(qIdx, { answers: q.answers.filter((_, i) => i !== aIdx) });
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
      if (q.type === "reorder") {
        const filled = q.items.filter((x) => x.trim());
        if (filled.length < 2) return { msg: `Pertanyaan ${i + 1}: butuh minimal 2 item untuk diurutkan`, scrollId: `q-${i}` };
      }
      if (q.type === "blank") {
        const filled = q.answers.filter((x) => x.trim());
        if (filled.length === 0) return { msg: `Pertanyaan ${i + 1}: isi minimal satu jawaban yang diterima`, scrollId: `q-${i}` };
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
            image: q.image.trim() || undefined,
            items: q.type === "reorder" ? q.items.map((x) => x.trim()).filter(Boolean) : undefined,
            answers: q.type === "blank" ? q.answers.map((x) => x.trim()).filter(Boolean) : undefined,
            explanation: q.explanation?.trim() || "",
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

        {/* AI Generator */}
        <div className="card a-fadeup" style={{ padding: "1.25rem 1.5rem", borderColor: showAI ? "var(--accent)" : undefined }}>
          <button
            onClick={() => setShowAI((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: 0 }}
          >
            <div className="center" style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#2563EB)", flexShrink: 0 }}>
              <span style={{ fontSize: "1rem" }}>✨</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text)" }}>AI Question Generator</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Soal dibuat AI lokal (Ollama) atau dicari dari bank soal</p>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", transition: "transform 0.2s", transform: showAI ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>

          {showAI && (
            <div style={{ marginTop: "1rem" }}>
              <div className="row" style={{ gap: "0.5rem", marginBottom: "0.75rem" }}>
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateFromTopic()}
                  placeholder="Ketik topik... cth: fotosintesis, pancasila, pecahan"
                  className="input flex-1"
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  onClick={generateFromTopic}
                  disabled={!aiTopic.trim() || aiLoading}
                  className="btn btn-gradient"
                  style={{ flexShrink: 0, opacity: !aiTopic.trim() || aiLoading ? 0.6 : 1 }}
                >
                  {aiLoading ? "..." : "Cari"}
                </button>
              </div>

              {aiError && (
                <p style={{ color: "#DC2626", fontSize: "0.78rem", marginBottom: "0.5rem" }}>⚠️ {aiError}</p>
              )}

              {aiResults.length > 0 && (
                <div className="col" style={{ gap: "0.4rem" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {aiResults.length} soal — klik &quot;+ Tambah&quot; untuk memasukkan ke kuis{" "}
                    <span style={{
                      marginLeft: "0.25rem", padding: "0.1rem 0.5rem", borderRadius: 40,
                      fontSize: "0.62rem", fontWeight: 800,
                      background: aiEngine.startsWith("zen") ? "rgba(124,58,237,0.12)"
                        : aiEngine.startsWith("ollama") ? "rgba(124,58,237,0.12)" : "rgba(37,99,235,0.1)",
                      color: aiEngine.startsWith("bank") ? "var(--accent)" : "#7C3AED",
                    }}>
                      {aiEngine.startsWith("zen") ? `🤖 OpenCode Zen (${aiEngine.split(":")[1] ?? "free"})`
                        : aiEngine.startsWith("ollama") ? `🤖 AI lokal (${aiEngine.split(":")[1] ?? "ollama"})`
                        : "📚 bank soal"}
                    </span>
                  </p>
                  {aiResults.map((q) => {
                    const added = addedIds.has(q.id);
                    return (
                      <div key={q.id} className="row" style={{
                        gap: "0.65rem", padding: "0.65rem 0.875rem",
                        background: added ? "rgba(37,99,235,0.05)" : "var(--surface-2)",
                        borderRadius: 10, border: `1px solid ${added ? "rgba(37,99,235,0.2)" : "var(--border)"}`,
                        alignItems: "flex-start",
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 600, marginBottom: "0.15rem", lineHeight: 1.4 }}>
                            {q.question.length > 90 ? q.question.substring(0, 90) + "…" : q.question}
                          </p>
                          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            {TYPE_CONFIG[q.type]?.label ?? q.type} · dari: {q.sourceQuiz}
                          </p>
                        </div>
                        <button
                          onClick={() => addAIQuestion(q)}
                          disabled={added}
                          className="btn"
                          style={{
                            flexShrink: 0, fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.65rem", borderRadius: 8,
                            background: added ? "var(--surface-3)" : "var(--accent)",
                            color: added ? "var(--text-muted)" : "#fff",
                            border: "none", cursor: added ? "default" : "pointer",
                          }}
                        >
                          {added ? "✓ Ditambah" : "+ Tambah"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Impor Soal */}
        <div className="card a-fadeup" style={{ padding: "1.25rem 1.5rem", borderColor: showImport ? "var(--accent)" : undefined }}>
          <button
            onClick={() => setShowImport((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: 0 }}
          >
            <div className="center" style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#059669,#2563EB)", flexShrink: 0 }}>
              <span style={{ fontSize: "1rem" }}>📥</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text)" }}>Impor Soal</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Tempel teks materi, unggah PDF/TXT (via AI gratis), atau CSV</p>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", transition: "transform 0.2s", transform: showImport ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>

          {showImport && (
            <div style={{ marginTop: "1rem" }}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Tempel materi pelajaran di sini (artikel, ringkasan bab buku, catatan) — AI akan menyusun soal darinya..."
                rows={5}
                className="input"
                style={{ fontSize: "0.82rem", resize: "vertical" }}
              />
              <div className="row" style={{ gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                <button onClick={() => handleGenerateFromText()} disabled={importLoading !== "" || pasteText.trim().length < 60} className="btn btn-gradient" style={{ flexShrink: 0, opacity: pasteText.trim().length < 60 ? 0.5 : 1 }}>
                  ✨ Buat Soal dari Teks
                </button>
                <label className="btn btn-surface" style={{ cursor: "pointer", flexShrink: 0 }}>
                  📄 Pilih PDF / TXT / CSV
                  <input type="file" accept=".pdf,.txt,.csv" hidden onChange={(e) => handleImportFile(e.target.files?.[0])} />
                </label>
              </div>
              {importLoading && <p style={{ marginTop: "0.6rem", color: "var(--accent)", fontSize: "0.78rem", fontWeight: 700 }}>⏳ {importLoading}</p>}
              {importError && <p style={{ marginTop: "0.6rem", color: "#DC2626", fontSize: "0.78rem", fontWeight: 600 }}>⚠️ {importError}</p>}
              <details style={{ marginTop: "0.7rem" }}>
                <summary style={{ color: "var(--text-muted)", fontSize: "0.72rem", cursor: "pointer" }}>Format CSV</summary>
                <code style={{ display: "block", marginTop: "0.35rem", padding: "0.5rem 0.75rem", background: "var(--surface-2)", borderRadius: 8, fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  soal;opsiA;opsiB;opsiC;opsiD;kunci(1-4);penjelasan<br />Contoh: Ibukota Indonesia?;Bandung;Jakarta;Surabaya;Medan;2;Jakarta sejak 1949
                </code>
              </details>
            </div>
          )}
        </div>

        {/* Questions */}
        {questions.map((q, qi) => {
          const isTF = q.type === "tf";
          const isPoll = q.type === "poll";
          const isRating = q.type === "rating";
          const isOpen = q.type === "open";
          const isReorder = q.type === "reorder";
          const isBlank = q.type === "blank";
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
                className="input mb-2"
                style={{ resize: "none" }}
              />

              {/* Image URL (opsional, semua tipe) */}
              <input
                value={q.image}
                onChange={(e) => setQ(qi, { image: e.target.value })}
                placeholder="🖼️ URL gambar (opsional) — https://..."
                className="input mb-4"
                style={{ fontSize: "0.78rem" }}
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
              ) : isReorder ? (
                <div className="col mb-4" style={{ gap: "0.45rem" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Tulis item dalam <strong>URUTAN YANG BENAR</strong> (item pertama = paling atas):</p>
                  {q.items.map((item, ii) => (
                    <div key={ii} className="row" style={{ gap: "0.5rem" }}>
                      <div className="center" style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: "0.75rem", fontWeight: 900, flexShrink: 0 }}>{ii + 1}</div>
                      <input
                        value={item}
                        onChange={(e) => setItem(qi, ii, e.target.value)}
                        placeholder={`Item urutan ${ii + 1}`}
                        className="input flex-1"
                        style={{ fontSize: "0.875rem" }}
                      />
                      {q.items.length > 2 && (
                        <button onClick={() => removeItemRow(qi, ii)} className="btn btn-ghost" style={{ padding: "0.45rem 0.6rem", color: "#F87171" }}>×</button>
                      )}
                    </div>
                  ))}
                  {q.items.length < 6 && (
                    <button onClick={() => addItemRow(qi)} className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "0.45rem 0.875rem", alignSelf: "flex-start" }}>
                      + Tambah item
                    </button>
                  )}
                </div>
              ) : isBlank ? (
                <div className="col mb-4" style={{ gap: "0.45rem" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                    Jawaban yang diterima — pemain mengetik salah satu dari ini dianggap benar (tidak peka huruf besar/kecil):
                  </p>
                  {q.answers.map((ans, ai2) => (
                    <div key={ai2} className="row" style={{ gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: 26, textAlign: "center", flexShrink: 0 }}>{ai2 === 0 ? "✅" : "atau"}</span>
                      <input
                        value={ans}
                        onChange={(e) => setBlankAnswer(qi, ai2, e.target.value)}
                        placeholder={`Jawaban benar ${ai2 + 1}`}
                        className="input flex-1"
                        style={{ fontSize: "0.875rem" }}
                      />
                      {q.answers.length > 1 && (
                        <button onClick={() => removeBlankAnswer(qi, ai2)} className="btn btn-ghost" style={{ padding: "0.45rem 0.6rem", color: "#F87171" }}>×</button>
                      )}
                    </div>
                  ))}
                  {q.answers.length < 5 && (
                    <button onClick={() => addBlankAnswer(qi)} className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "0.45rem 0.875rem", alignSelf: "flex-start" }}>
                      + Terima jawaban lain
                    </button>
                  )}
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
