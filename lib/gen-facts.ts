import { v4 as uuidv4 } from "uuid";
import type { Question, Quiz } from "./types";

// Generator variasi universal: dari soal inti sebuah kuis, hasilkan variasi
// tak terbatas - opsi jawaban diacak & distractor diambil dari opsi soal lain
// dalam kuis yang sama (tetap relevan domain), plus format Benar/Salah acak.

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function factShuffleQuestion(quiz: Quiz, pool: Question[]): Question {
  const scored = pool.filter((x) => x.type === "mc" && x.correctIndex >= 0 && x.options.length >= 3);
  const tfs = pool.filter((x) => x.type === "tf");
  const useTf = (scored.length < 2 || Math.random() < 0.25) && tfs.length > 0;

  if (useTf) {
    // Variasi TF: pernyataan "Jawaban dari soal X adalah Y" - benar atau salah
    const src = pick(scored.length ? scored : pool);
    const correct = src.options[src.correctIndex];
    const wrong = pick(scored.filter((x) => x.id !== src.id).flatMap((x) => x.options.filter((o) => o !== correct))) ?? correct + "?";
    const claimTrue = Math.random() < 0.5;
    const shown = claimTrue ? correct : wrong;
    return {
      id: uuidv4(), type: "tf",
      question: `Benar atau Salah: "${src.question}" Jawabannya: ${shown}`,
      options: ["Benar", "Salah"],
      correctIndex: claimTrue ? 0 : 1,
      timeLimit: src.timeLimit, category: src.category,
      explanation: `${src.explanation} (Jawaban benar: ${correct})`,
    };
  }

  // Variasi MC: distractor diambil dari opsi soal lain (domain-appropriate)
  const src = pick(scored);
  const correct = src.options[src.correctIndex];
  const otherOpts = scored
    .filter((x) => x.id !== src.id)
    .flatMap((x) => x.options)
    .filter((o) => o !== correct && !src.options.includes(o));
  const distractors: string[] = [];
  while (distractors.length < 3 && otherOpts.length) {
    const i = ri(0, otherOpts.length - 1);
    const [o] = otherOpts.splice(i, 1);
    if (!distractors.includes(o)) distractors.push(o);
  }
  // fallback: opsi asli soal yang bukan kunci
  for (const o of src.options) {
    if (distractors.length >= 3) break;
    if (o !== correct && !distractors.includes(o)) distractors.push(o);
  }
  const options = [correct, ...distractors.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) { const j = ri(0, i); [options[i], options[j]] = [options[j], options[i]]; }
  return {
    id: uuidv4(), type: "mc",
    question: src.question, options,
    correctIndex: options.indexOf(correct),
    timeLimit: src.timeLimit, category: src.category,
    explanation: src.explanation,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
