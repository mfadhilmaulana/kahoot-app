// Panen massal soal dari OpenCode Zen (gratis, anonim) -> lib/ai-seed.json
// Jalankan: node scripts/bulk-seed.mjs  (server lokal di 4000 harus hidup)
// Env: TARGET_PER_QUIZ (default 200), MAX_MINUTES (default 25), WORKERS (default 5)

import { io } from "socket.io-client";
import { readFileSync, writeFileSync, existsSync } from "fs";

const URL = "http://localhost:4000";
const ZEN = "https://opencode.ai/zen/v1";
const MODELS = ["mimo-v2.5-free", "deepseek-v4-flash-free", "nemotron-3.5-lightning-free", "laguna-s-2.1-free", "x-preview-f-free", "nemotron-3-ultra-free", "hy3-free", "big-pickle"];
const SKIP = new Set(["math", "iq", "fisika", "kimia", "statistika", "akuntansi", "bing-grammar", "bing-vocab", "kritis"]);
const TARGET = parseInt(process.env.TARGET_PER_QUIZ || "200", 10);
const MAX_MINUTES = parseFloat(process.env.MAX_MINUTES || "25");
const WORKERS = parseInt(process.env.WORKERS || "5", 10);
const SEED_FILE = "lib/ai-seed.json";

const deadline = Date.now() + MAX_MINUTES * 60_000;
let modelIdx = 0;

// ── state bank ──
const bank = existsSync(SEED_FILE) ? JSON.parse(readFileSync(SEED_FILE, "utf8")) : {};
const seen = new Map(); // quizId -> Set(question text lower)
for (const [qid, qs] of Object.entries(bank)) {
  seen.set(qid, new Set(qs.map((x) => x.question.trim().toLowerCase())));
}

function save() {
  writeFileSync(SEED_FILE, JSON.stringify(bank));
}

function nextModel() {
  return MODELS[modelIdx++ % MODELS.length];
}

function extract(content) {
  if (!content) return null;
  let cleaned = content.replace(/```json|```/g, "").trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { parsed = JSON.parse(cleaned.slice(a, b + 1)); } catch { return null; }
  }
  const qs = parsed?.questions;
  if (!Array.isArray(qs)) return null;
  return qs.filter((d) => d.question && Array.isArray(d.options) && d.options.length === 4 &&
    Number.isInteger(d.correctIndex) && d.correctIndex >= 0 && d.correctIndex < 4);
}

async function zenBatch(model, title, count) {
  const prompt = [
    `Buat ${count} soal kuis pilihan ganda berbahasa Indonesia tentang topik: "${title}".`,
    'Balas HANYA dengan JSON valid berbentuk {"questions":[...]}.',
    'Setiap soal: {"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"singkat"}',
    "Variasikan tingkat kesulitan dan sudut pertanyaan. Jangan mengulang soal yang mirip.",
  ].join("\n");
  const res = await fetch(`${ZEN}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.9 }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return extract(data.choices?.[0]?.message?.content);
}

async function main() {
  const s = io(URL, { transports: ["websocket"] });
  await new Promise((r, j) => { s.on("connect", r); s.on("connect_error", j); setTimeout(() => j(new Error("timeout")), 20000); });
  const list = await new Promise((res) => s.emit("quizzes:list", {}, res));
  s.close();

  const jobs = [];
  for (const quiz of list) {
    if (SKIP.has(quiz.id)) continue;
    if (quiz.source === "custom") continue; // jangan seed kuis kustom
    const have = bank[quiz.id]?.length ?? 0;
    if (have >= TARGET) continue;
    jobs.push({ id: quiz.id, title: quiz.title, need: TARGET - have });
  }
  console.log(`Kuis perlu seed: ${jobs.length} | target ${TARGET}/kuis | deadline ${MAX_MINUTES} menit`);

  let qi = 0, batches = 0, added = 0, okB = 0, failB = 0;

  async function worker(wid) {
    while (Date.now() < deadline) {
      const job = jobs[qi];
      if (!job || job.need <= 0) return;
      qi++;
      const batchN = Math.min(8, job.need);
      job.need -= batchN;
      const model = nextModel();
      try {
        const drafts = await zenBatch(model, job.title, batchN);
        if (!bank[job.id]) { bank[job.id] = []; if (!seen.has(job.id)) seen.set(job.id, new Set()); }
        const set = seen.get(job.id);
        let n = 0;
        for (const d of drafts ?? []) {
          const key = d.question.trim().toLowerCase();
          if (set.has(key)) continue;
          set.add(key);
          bank[job.id].push({
            id: `${job.id}-ai-${bank[job.id].length + 1}`,
            type: "mc", question: d.question, options: d.options,
            correctIndex: d.correctIndex, timeLimit: 20,
            category: "AI", explanation: d.explanation ?? "",
          });
          n++; added++; job.need--;
        }
        batches++; okB++;
        save();
        console.log(`[w${wid}] ${job.title}: +${n} (total ${bank[job.id].length}) via ${model}`);
        await new Promise((r) => setTimeout(r, 2000)); // jeda antar-job antar-worker
      } catch (e) {
        batches++; failB++;
        const msg = String(e.message);
        console.log(`[w${wid}] ${job.title} gagal (${model}): ${msg.slice(0, 60)}`);
        if (msg.includes("429")) {
          console.log(`[w${wid}] rate-limited, istirahat 45 detik...`);
          await new Promise((r) => setTimeout(r, 45_000));
        } else {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
  save();
  const total = Object.values(bank).reduce((s, x) => s + x.length, 0);
  console.log(`\nSELESAI: +${added} soal baru | batch ok/gagal: ${okB}/${failB} | total bank: ${total}`);
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
