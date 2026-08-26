import { v4 as uuidv4 } from "uuid";
import type { Question, Quiz } from "./types";

// Generator variasi universal (v2):
// - Satu variasi per soal inti per sesi -> TIDAK ADA pengulangan teks soal
// - Distractor dicocokkan TIPE: soal angka -> angka near-miss; soal teks -> teks
//   dari opsi soal lain dalam kuis yang sama
// - Tanpa reformat Benar/Salah yang malah menduplikasi soal

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const NUM_RE = /^-?[\d.,]+ ?(cm|mm|m|km|kg|g|gr|L|mL|detik|menit|jam|tahun|derajat|%)?$/i;
const isNumeric = (s: string) => NUM_RE.test(s.trim());

function parseNum(s: string): number | null {
  const m = s.trim().match(/^(-?[\d.,]+) ?(cm|mm|m|km|kg|g|gr|L|mL)?$/i);
  if (!m) return null;
  const raw = m[1];
  const normalized = raw.includes(",") && !raw.includes(".")
    ? parseFloat(raw.replace(/\./g, "").replace(",", "."))
    : parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return isNaN(normalized) ? null : normalized;
}

function fmtLike(sample: string, n: number): string {
  const unitMatch = sample.trim().match(/ (cm|mm|m|km|kg|g|gr|L|mL)$/i);
  const hasSep = sample.includes(".");
  const body = hasSep ? n.toLocaleString("id-ID") : String(n);
  return unitMatch ? `${body} ${unitMatch[1]}` : body;
}

function numericDistractors(correctStr: string): string[] {
  const n = parseNum(correctStr);
  if (n === null) return [];
  const unit = correctStr.trim().match(/ (cm|mm|m|km|kg|g|gr|L|mL)$/i)?.[1] ?? "";
  const out = new Set<number>();
  const deltas = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3];
  for (let i = deltas.length - 1; i > 0; i--) { const j = ri(0, i); [deltas[i], deltas[j]] = [deltas[j], deltas[i]]; }
  for (const d of deltas) {
    const v: number = n + d;
    if (v !== n && v > 0 && out.size < 3) out.add(v);
  }
  return [...out].map((v) => (unit ? `${v.toLocaleString("id-ID")} ${unit}` : v.toLocaleString("id-ID")));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Buat SATU variasi dari satu soal inti (mc). TF diteruskan apa adanya. */
export function factVariation(src: Question, pool: Question[]): Question {
  if (src.type !== "mc" || src.correctIndex < 0 || src.options.length < 2) {
    return { ...src, id: uuidv4() };
  }
  const correct = src.options[src.correctIndex];

  let distractors: string[] = [];
  if (isNumeric(correct)) {
    // angka -> near-miss numerik (bukan angka acak dari soal lain)
    distractors = numericDistractors(correct);
  }
  if (distractors.length < 3) {
    // teks (atau kurang) -> opsi teks dari soal lain di kuis yang sama
    const textOpts = pool
      .filter((x) => x.id !== src.id && x.options?.length)
      .flatMap((x) => x.options)
      .filter((o) => o !== correct && !src.options.includes(o) && (isNumeric(correct) ? false : !isNumeric(o)));
    for (const o of shuffle(textOpts)) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(o)) distractors.push(o);
    }
  }
  for (const o of shuffle(src.options)) {
    if (distractors.length >= 3) break;
    if (o !== correct && !distractors.includes(o)) distractors.push(o);
  }

  const options = shuffle([correct, ...distractors.slice(0, 3)]);
  return {
    id: uuidv4(), type: "mc",
    question: src.question, options,
    correctIndex: options.indexOf(correct),
    timeLimit: src.timeLimit, category: src.category,
    explanation: src.explanation,
  };
}

/**
 * Susun sesi penuh variasi unik: setiap soal inti dipakai MAKSIMAL SATU kali,
 * urutan & distractor diacak. Jika seed kurang dari `count`, izinkan putaran
 * kedua (variasi distractor berbeda) sebagai jalan terakhir.
 */
export function factVariations(quiz: Quiz, pool: Question[], count: number): Question[] {
  const seeds = shuffle(pool.filter((x) => x.type === "mc" || x.type === "tf"));
  const out: Question[] = [];
  const seenText = new Set<string>();
  const key = (x: Question) => x.question.trim().toLowerCase();

  for (const s of seeds) {
    if (out.length >= count) break;
    if (seenText.has(key(s))) continue;
    seenText.add(key(s));
    out.push(factVariation(s, pool));
  }
  if (out.length < count) {
    for (const s of shuffle(seeds)) {
      if (out.length >= count) break;
      const v = factVariation(s, pool);
      if (seenText.has(key(s)) && out.some((x) => x.question === v.question && x.options.join() === v.options.join())) continue;
      seenText.add(key(s));
      out.push(v);
    }
  }
  return out.slice(0, count);
}
