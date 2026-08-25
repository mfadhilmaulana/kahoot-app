import { v4 as uuidv4 } from "uuid";
import type { Question, QuestionType } from "./types";

const q = (type: QuestionType, question: string, options: string[], correctIndex: number, explanation: string, category: string, timeLimit: number): Question =>
  ({ id: uuidv4(), type, question, options, correctIndex, timeLimit, category, explanation });
const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[ri(0, arr.length - 1)];

function shuffleOpts(correct: string, wrong: string[]): { options: string[]; correctIndex: number } {
  const set = [correct, ...wrong.filter((w) => w !== correct).slice(0, 3)];
  for (let i = set.length - 1; i > 0; i--) { const j = ri(0, i); [set[i], set[j]] = [set[j], set[i]]; }
  return { options: set, correctIndex: set.indexOf(correct) };
}
const NAMES = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fira", "Gilang", "Hana", "Indra", "Joko"];

// Soal latihan berpikir kritis & kecepatan — tiap soal dibuat acak & unik
export function kritisQuestion(): Question {
  const t = ri(1, 9);
  if (t === 1) { // urutan tinggi badan
    const [a, b, c] = [...NAMES].sort(() => Math.random() - 0.5);
    const ans = pick([a, b, c]);
    // kalimat logika: ans tertinggi; b di tengah; c terpendek
    const mid = [a, b, c].find((x) => x !== ans);
    const short = [a, b, c].find((x) => x !== ans && x !== mid)!;
    const { options, correctIndex } = shuffleOpts(ans, [b, c, "Tidak dapat ditentukan"]);
    return q("mc", `${ans} lebih tinggi dari ${mid}. ${mid} lebih tinggi dari ${short}. Siapa yang PALING pendek?`, options, correctIndex,
      `Urutan: ${ans} > ${mid} > ${short}. Paling pendek: ${short}.`, "Berpikir Kritis", 20);
  }
  if (t === 2) { // pola ganda (+a lalu x r)
    const start = ri(2, 6), add = ri(2, 5), r = 2;
    const s1 = start, s2 = (start + add) * r, s3 = (s2 + add) * r, s4 = (s3 + add) * r;
    const ans = (s4 + add) * r;
    const { options, correctIndex } = shuffleOpts(String(ans), [String(ans + add), String(s4 * r + add), String(ans * 2)]);
    return q("mc", `Pola: ${s1}, ${s2}, ${s3}, ${s4}, ___? (pola: +${add} lalu ×${r}, berulang)`, options, correctIndex,
      `(${s4} + ${add}) × ${r} = ${ans}.`, "Berpikir Kritis", 25);
  }
  if (t === 3) { // silogisme kategori
    const X = pick(["insinyur", "dokter", "arsitek", "guru"]), Y = pick(["suka matematika", "kerja di kantor", "punya sertifikat", "bangun pagi"]);
    const Z = pick(["rajin", "disiplin", "kreatif", "teliti"]);
    const ans = `Semua ${X} adalah ${Z}`;
    const { options, correctIndex } = shuffleOpts(ans, [
      `Semua ${Z} adalah ${X}`,
      `Semua ${Y} adalah ${X}`,
      `Tidak ada ${X} yang ${Z}`,
    ]);
    return q("mc", "Semua " + X + " adalah " + Y + ". Semua " + Y + " adalah " + Z + ". Kesimpulan yang PASTI benar:", options, correctIndex,
      `Rantai: ${X} ⊆ ${Y} ⊆ ${Z} → semua ${X} adalah ${Z}.`, "Berpikir Kritis", 25);
  }
  if (t === 4) { // teka operator kustom: a △ b = a × b + a
    const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9);
    const ans = c * b + c;
    const { options, correctIndex } = shuffleOpts(String(ans), [String(c * b), String(c + b), String(ans + c)]);
    return q("mc", `Diketahui aturan: a △ b = a × b + a. Contoh: 2 △ 3 = 2×3+2 = 8. Maka ${c} △ ${b} = ?`, options, correctIndex,
      `${c} △ ${b} = ${c}×${b}+${c} = ${c * b}+${c} = ${ans}.`, "Berpikir Kritis", 25);
  }
  if (t === 5) { // ganjil satu konsep
    const sets: Array<[string[], string, string]> = [
      [["Matahari", "Lampu", "Lilin"], "Senter", "senter butuh baterai, lainnya cahaya langsung"],
      [["Menghitung", "Menulis", "Membaca"], "Bernapas", "bernapas otomatis, lainnya butuh kesadaran"],
      [["Persegi", "Persegi panjang", "Trapesium siku"], "Lingkaran", "lingkaran tidak punya sisi lurus"],
      [["Buku", "Majalah", "Koran"], "Radio", "radio media audio, lainnya tulisan"],
      [["Emas", "Perak", "Tembaga"], "Karet", "karet bukan logam"],
    ];
    const [items, odd, why] = pick(sets);
    const opts = [...items, odd].sort(() => Math.random() - 0.5);
    return q("mc", `Mana yang TIDAK sekelompok? ${opts.join(", ")}`, opts, opts.indexOf(odd),
      `${odd} berbeda karena ${why}.`, "Berpikir Kritis", 15);
  }
  if (t === 6) { // sudut jam
    const h = ri(1, 12);
    const angle = Math.min(30 * h, 360 - 30 * h);
    const { options, correctIndex } = numOpts(angle, [angle + 30, Math.abs(360 - 30 * h - 30), angle - 15]);
    return q("mc", `Berapa sudut terkecil (derajat) antara kedua jarum jam pukul ${h.toString().padStart(2, "0")}:00?`, options, correctIndex,
      `Setiap jam = 30 derajat (360:12). Pukul ${h}:00 → ${angle} derajat.`, "Berpikir Kritis", 20);
  }
  if (t === 7) { // logika jika-maka negasi
    const ans = pick(["Tidak dapat disimpulkan", "Pasti hujan", "Pasti tidak hujan"]);
    const { options, correctIndex } = shuffleOpts(ans, ["Pasti hujan", "Pasti tidak hujan", "Tidak dapat disimpulkan"]);
    return q("mc", '"Jika mendung, maka Budi membawa payung." Hari ini Budi membawa payung. Apa yang bisa disimpulkan?', options, correctIndex,
      "Membawa payung tidak berarti mendung (affirming the consequent = kesalahan logika). Jawaban: tidak dapat disimpulkan.", "Berpikir Kritis", 25);
  }
  if (t === 8) { // tebak cepat operasi beruntun
    const a = ri(3, 15), b = ri(2, 9), c = ri(2, 6);
    const ans = a * b - c;
    const { options, correctIndex } = shuffleOpts(String(ans), [String(a * b + c), String(a + b - c), String(ans + 2)]);
    return q("mc", `Hitung cepat: ${a} × ${b} − ${c} = ?`, options, correctIndex,
      `${a} × ${b} = ${a * b}; ${a * b} − ${c} = ${ans}.`, "Berpikir Kritis", 12);
  }
  // t === 9: perbandingan umur
  const [p, rr, s2] = [...NAMES].sort(() => Math.random() - 0.5);
  const diff = ri(2, 10);
  const oldest = pick([p, rr]);
  const youngest = oldest === p ? rr : p;
  const total = diff * 2;
  const { options, correctIndex } = shuffleOpts(String(total), [String(diff), String(total + diff), String(diff + 1)]);
  return q("mc", `Umur ${oldest} ${diff} tahun lebih tua dari ${s2}. Umur ${s2} ${diff} tahun lebih tua dari ${youngest}. Selisih umur ${oldest} dan ${youngest} adalah?`, options, correctIndex,
    `${oldest} = ${s2} + ${diff} dan ${s2} = ${youngest} + ${diff} → selisih ${oldest} & ${youngest} = ${diff}+${diff} = ${total} tahun.`,
    "Berpikir Kritis", 30);
}

function numOpts(correct: number, wrongs: number[]): { options: string[]; correctIndex: number } {
  const set: number[] = [correct];
  for (const w of wrongs) { if (set.length >= 4) break; if (!set.includes(w)) set.push(w); }
  let b = 1;
  while (set.length < 4) { set.push(correct + b); b++; }
  for (let i = set.length - 1; i > 0; i--) { const j = ri(0, i); [set[i], set[j]] = [set[j], set[i]]; }
  return { options: set.map(String), correctIndex: set.indexOf(correct) };
}
