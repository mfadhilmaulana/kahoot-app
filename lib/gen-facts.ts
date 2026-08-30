import { v4 as uuidv4 } from "uuid";
import type { Question, Quiz } from "./types";

// Generator variasi universal (v3):
// - Satu variasi per soal inti per sesi -> TIDAK ADA pengulangan teks soal
// - Distractor TETAP dari soal yang sama (hanya diacak urutannya) -> kategori jawaban selalu koheren
//   Contoh: "Berapa banyak bahasa..." tetap [Sekitar 1.000, Sekitar 3.000, Sekitar 7.000, Lebih dari 12.000]
//   Contoh: "Negara terluas..." tetap [Kanada, China, AS, Rusia] — tidak lagi tercampur angka/teks acak
// - Tanpa reformat Benar/Salah yang menduplikasi soal

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Buat SATU variasi dari satu soal inti (mc) — hanya acak urutan opsi. TF diteruskan apa adanya. */
export function factVariation(src: Question): Question {
  if (src.type !== "mc" || src.correctIndex < 0 || src.options.length < 2) {
    return { ...src, id: uuidv4() };
  }
  const correct = src.options[src.correctIndex];
  const options = shuffle([...src.options]);
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
 * urutan diacak. Jika seed kurang dari `count`, sesi berisi sebanyak seed.
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
    out.push(factVariation(s));
  }
  return out.slice(0, count);
}
