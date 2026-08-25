import { v4 as uuidv4 } from "uuid";
import type { Question, QuestionType } from "./types";

// Generator soal prosedural — ribuan variasi unik untuk Matematika & Tes IQ.
// Setiap pemanggilan menghasilkan soal baru dengan angka acak.

function mc(
  question: string, options: string[], correctIndex: number,
  explanation: string, category: string, timeLimit = 20
): Question {
  return { id: uuidv4(), type: "mc" as QuestionType, question, options, correctIndex, timeLimit, category, explanation };
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[ri(0, arr.length - 1)];

/** Buat 4 opsi unik dengan jawaban benar di posisi acak. */
function optionSet(correct: number, distractors: number[], format?: (n: number) => string): { options: string[]; correctIndex: number } {
  const set = new Set<number>([correct]);
  for (const d of distractors) { if (set.size >= 4) break; if (d !== correct && !set.has(d)) set.add(d); }
  let bump = 1;
  while (set.size < 4) { set.add(correct + bump); bump = bump > 0 ? -bump : -bump + 1; }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) { const j = ri(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const f = format ?? ((n: number) => n.toLocaleString("id-ID"));
  return { options: arr.map(f), correctIndex: arr.indexOf(correct) };
}

// ── MATEMATIKA ────────────────────────────────────────────────────────────────
function mathQuestion(): Question {
  const t = ri(1, 14);
  switch (t) {
    case 1: { // penjumlahan/pengurangan besar
      const a = ri(120, 9800), b = ri(120, 9800);
      const plus = Math.random() < 0.5;
      const ans = plus ? a + b : Math.max(a, b) - Math.min(a, b);
      const { options, correctIndex } = optionSet(ans, [ans + ri(1, 30) * ri(1, 9), ans - ri(1, 30) * ri(1, 9), ans + ri(100, 900)]);
      return mc(`${plus ? "Hasil dari" : "Selisih dari"} ${a.toLocaleString("id-ID")} ${plus ? "+" : "−"} ${b.toLocaleString("id-ID")} = ?`, options, correctIndex,
        `Operasi bilangan bulat: ${a} ${plus ? "+" : "−"} ${b} = ${ans.toLocaleString("id-ID")}.`, "Matematika", 20);
    }
    case 2: { // perkalian
      const a = ri(12, 99), b = ri(6, 99);
      const ans = a * b;
      const { options, correctIndex } = optionSet(ans, [ans + a, ans - b, a * (b + 1)]);
      return mc(`${a} × ${b} = ?`, options, correctIndex, `${a} × ${b} = ${ans.toLocaleString("id-ID")}. Trik: pecah ${b} menjadi ${b - 1} + 1 bila perlu.`, "Matematika", 20);
    }
    case 3: { // pembagian bulat
      const b = ri(3, 19), ans = ri(8, 120), a = b * ans;
      const { options, correctIndex } = optionSet(ans, [ans + 1, ans - 1, ans + b]);
      return mc(`${a.toLocaleString("id-ID")} ÷ ${b} = ?`, options, correctIndex, `${a} ÷ ${b} = ${ans}. Periksa: ${ans} × ${b} = ${a}.`, "Matematika", 20);
    }
    case 4: { // persen
      const p = pick([5, 10, 15, 20, 25, 40, 50, 60, 75, 80]);
      const base = ri(2, 60) * 20;
      const ans = (p * base) / 100;
      const { options, correctIndex } = optionSet(ans, [ans + base / 20, ans - base / 20, (p * base) / 50]);
      return mc(`${p}% dari ${base.toLocaleString("id-ID")} adalah?`, options, correctIndex,
        `${p}% × ${base} = ${p}/100 × ${base} = ${ans.toLocaleString("id-ID")}.`, "Matematika", 25);
    }
    case 5: { // aljabar ax + b = c
      const a = ri(2, 12), x = ri(2, 30), b = ri(1, 60);
      const c = a * x + b;
      const { options, correctIndex } = optionSet(x, [x + 1, x - 1, c - b - a]);
      return mc(`Jika ${a}x + ${b} = ${c.toLocaleString("id-ID")}, maka x = ?`, options, correctIndex,
        `${a}x = ${c} − ${b} = ${c - b}, sehingga x = ${c - b} ÷ ${a} = ${x}.`, "Matematika", 25);
    }
    case 6: { // KPK / FPB
      const isKpk = Math.random() < 0.5;
      const a = pick([6, 8, 9, 10, 12, 14, 15, 18, 20, 21]), b = pick([4, 6, 7, 8, 9, 10, 12, 15, 16, 25]);
      const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
      const g = gcd(a, b);
      const ans = isKpk ? (a * b) / g : g;
      const { options, correctIndex } = optionSet(ans, [isKpk ? g : (a * b) / g, ans + a, Math.max(2, ans - g)]);
      return mc(`${isKpk ? "KPK" : "FPB"} dari ${a} dan ${b} adalah?`, options, correctIndex,
        isKpk ? `KPK(${a}, ${b}) = ${a}×${b} ÷ FPB(${g}) = ${ans}.` : `FPB(${a}, ${b}) = ${g} — faktor persekutuan terbesarnya.`, "Matematika", 25);
    }
    case 7: { // pangkat / akar
      const n = ri(2, 20);
      const kuadrat = Math.random() < 0.5;
      if (kuadrat) {
        const ans = n * n;
        const { options, correctIndex } = optionSet(ans, [ans + n, ans - n, (n + 1) * (n + 1)]);
        return mc(`${n}² = ?`, options, correctIndex, `${n}² = ${n} × ${n} = ${ans}.`, "Matematika", 15);
      }
      const ans = n;
      const { options, correctIndex } = optionSet(ans, [ans + 1, ans - 1, ans + 2]);
      return mc(`√${n * n} = ?`, options, correctIndex, `√${n * n} = ${n}, karena ${n} × ${n} = ${n * n}.`, "Matematika", 15);
    }
    case 8: { // keliling / luas persegi panjang
      const p = ri(5, 40), l = ri(3, 30);
      const luas = Math.random() < 0.5;
      const ans = luas ? p * l : 2 * (p + l);
      const { options, correctIndex } = optionSet(ans, [ans + p, ans - l, 2 * p + l]);
      return mc(`Persegi panjang dengan panjang ${p} cm dan lebar ${l} cm. ${luas ? "Luas" : "Keliling"}nya?`, options, correctIndex,
        luas ? `L = p × l = ${p} × ${l} = ${ans} cm².` : `K = 2(p + l) = 2(${p} + ${l}) = ${ans} cm.`, "Matematika", 25);
    }
    case 9: { // rata-rata
      const n = ri(3, 5);
      const nums = Array.from({ length: n }, () => ri(4, 90));
      const sum = nums.reduce((s, x) => s + x, 0);
      const ans = Math.round((sum / n) * 10) / 10;
      const { options, correctIndex } = optionSet(ans, [ans + 2, ans - 2, sum]);
      return mc(`Rata-rata dari ${nums.join(", ")} adalah?`, options, correctIndex,
        `Jumlah = ${sum}, dibagi ${n} data → rata-rata = ${ans}.`, "Matematika", 25);
    }
    case 10: { // diskon
      const price = ri(4, 40) * 10000;
      const disc = pick([10, 15, 20, 25, 30, 50]);
      const ans = price - (price * disc) / 100;
      const { options, correctIndex } = optionSet(ans, [ans + price * 0.05, (price * disc) / 100, ans - price * 0.05]);
      return mc(`Harga baju Rp${price.toLocaleString("id-ID")} didiskon ${disc}%. Harga akhirnya?`, options, correctIndex,
        `Potongan = ${disc}% × ${price.toLocaleString("id-ID")} = Rp${((price * disc) / 100).toLocaleString("id-ID")}. Harga akhir = Rp${ans.toLocaleString("id-ID")}.`, "Matematika", 25);
    }
    case 11: { // deret aritmetika
      const a = ri(2, 30), k = ri(3, 15);
      const seq = [a, a + k, a + 2 * k, a + 3 * k];
      const ans = a + 4 * k;
      const { options, correctIndex } = optionSet(ans, [ans + k, ans - k, a + 5 * k]);
      return mc(`Lanjutkan barisan: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Selisih tetap +${k}. Jadi ${seq[3]} + ${k} = ${ans}.`, "Matematika", 20);
    }
    case 12: { // deret geometri
      const a = ri(2, 6), r = pick([2, 3]);
      const seq = [a, a * r, a * r * r, a * r * r * r];
      const ans = a * r ** 4;
      const { options, correctIndex } = optionSet(ans, [ans + a, ans * r - ans, seq[3] + seq[2]]);
      return mc(`Lanjutkan barisan: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Rasio ×${r}. Jadi ${seq[3]} × ${r} = ${ans}.`, "Matematika", 20);
    }
    case 13: { // luas segitiga / lingkaran sederhana
      const base = ri(4, 30) * 2, h = ri(3, 25);
      const ans = (base * h) / 2;
      const { options, correctIndex } = optionSet(ans, [base * h, ans + h, ans - base]);
      return mc(`Segitiga dengan alas ${base} cm dan tinggi ${h} cm. Luasnya?`, options, correctIndex,
        `L = ½ × alas × tinggi = ½ × ${base} × ${h} = ${ans} cm².`, "Matematika", 25);
    }
    case 14: { // perbandingan skala
      const k = ri(2, 9), real = ri(3, 30) * k;
      const ans = real / k;
      const { options, correctIndex } = optionSet(ans, [ans + k, ans - 1, real]);
      return mc(`Skala peta 1 : ${k * 100000}. Jarak dua kota di peta ${ans} cm. Jarak sebenarnya?`, options, correctIndex,
        `Jarak sebenarnya = ${ans} cm × ${k * 100000} = ${(ans * k).toLocaleString("id-ID")} km... perhatikan skala: setiap 1 cm mewakili ${k * 100000} cm = ${k} km, jadi ${ans} × ${k} = ${ans * k} km.`,
        "Matematika", 30);
    }
    default: { // pecahan senilai
      const d = pick([4, 6, 8, 10, 12]), n = ri(1, d - 1);
      const m = ri(2, 5);
      const ans = `${n * m}/${d * m}`;
      const wrongs = [`${n}/${d * m}`, `${n * m}/${d}`, `${n + m}/${d + m}`];
      const options = [ans, ...wrongs].sort(() => Math.random() - 0.5);
      return mc(`Pecahan senilai dengan ${n}/${d} adalah?`, options, options.indexOf(ans),
        `Kalikan pembilang & penyebut dengan ${m}: ${n}×${m}/${d}×${m} = ${ans}.`, "Matematika", 20);
    }
  }
}

// ── LOGIKA / IQ ───────────────────────────────────────────────────────────────
const ODD_SETS: Array<{ group: string; items: string[]; odd: string; reason: string }> = [
  { group: "hewan darat", items: ["Sapi", "Kambing", "Kuda", "Rusa", "Babi"], odd: "Lumba-lumba", reason: "lumba-lumba hidup di air" },
  { group: "buah", items: ["Apel", "Mangga", "Pisang", "Jeruk", "Anggur"], odd: "Wortel", reason: "wortel adalah sayuran" },
  { group: "warna", items: ["Merah", "Biru", "Hijau", "Kuning", "Ungu"], odd: "Persegi", reason: "persegi adalah bentuk, bukan warna" },
  { group: "alat tulis", items: ["Pensil", "Pulpen", "Spidol", "Krayon"], odd: "Gunting", reason: "gunting bukan alat tulis" },
  { group: "planet", items: ["Merkurius", "Venus", "Mars", "Saturnus"], odd: "Bulan", reason: "bulan adalah satelit" },
  { group: "olahraga bola", items: ["Sepak bola", "Bola voli", "Bola basket"], odd: "Renang", reason: "renang tidak memakai bola" },
  { group: "kendaraan bermotor", items: ["Motor", "Mobil", "Bus", "Truk"], odd: "Sepeda", reason: "sepeda tanpa motor" },
  { group: "sayuran", items: ["Bayam", "Kangkung", "Brokoli", "Tomat"], odd: "Nanas", reason: "nanas adalah buah" },
];

function iqQuestion(): Question {
  const t = ri(1, 8);
  switch (t) {
    case 1: { // barisan +k
      const a = ri(3, 60), k = ri(4, 19);
      const seq = [a, a + k, a + 2 * k, a + 3 * k];
      const ans = a + 4 * k;
      const { options, correctIndex } = optionSet(ans, [ans + 1, ans + k + 1, ans - k]);
      return mc(`Angka berikutnya: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Pola: +${k} setiap langkah. ${seq[3]} + ${k} = ${ans}.`, "Logika", 20);
    }
    case 2: { // barisan ×r
      const a = ri(2, 7), r = pick([2, 3]);
      const seq = [a, a * r, a * r ** 2, a * r ** 3];
      const ans = a * r ** 4;
      const { options, correctIndex } = optionSet(ans, [ans + a, seq[3] * 2, ans - r]);
      return mc(`Angka berikutnya: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Pola: ×${r}. ${seq[3]} × ${r} = ${ans}.`, "Logika", 20);
    }
    case 3: { // kuadrat + k
      const k = ri(1, 9);
      const seq = [1 + k, 4 + k, 9 + k, 16 + k];
      const ans = 25 + k;
      const { options, correctIndex } = optionSet(ans, [ans + 2, 36 + k, ans - 1]);
      return mc(`Angka berikutnya: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Pola: n² + ${k} (1,4,9,16,25...). Jadi 25 + ${k} = ${ans}.`, "Logika", 25);
    }
    case 4: { // fibonacci-like
      const a = ri(1, 9), b = ri(2, 12);
      const seq = [a, b, a + b, a + 2 * b, 2 * a + 3 * b];
      const ans = 3 * a + 5 * b;
      const { options, correctIndex } = optionSet(ans, [ans + 1, seq[4] + seq[3] - a, ans - 2]);
      return mc(`Angka berikutnya: ${seq.join(", ")}, ___?`, options, correctIndex,
        `Setiap angka = jumlah dua angka sebelumnya. ${seq[3]} + ${seq[4]} = ${ans}.`, "Logika", 25);
    }
    case 5: { // ganjil satu kelompok
      const s = pick(ODD_SETS);
      const three = [...s.items].sort(() => Math.random() - 0.5).slice(0, 3);
      const opts = [...three, s.odd].sort(() => Math.random() - 0.5);
      return mc(`Yang TIDAK satu kelompok (${s.group}): ${opts.join(", ")}`, opts, opts.indexOf(s.odd),
        `${s.odd} berbeda karena ${s.reason}, sedangkan ${three.join(", ")} termasuk ${s.group}.`, "Logika", 20);
    }
    case 6: { // kelipatan ganjil
      const k = pick([3, 4, 5, 6, 7]);
      const base = ri(4, 15);
      const mult = [base, base + 1, base + 2].map((x) => x * k);
      const odd = mult[ri(0, 2)] + 1;
      const opts = [...mult, odd].sort(() => Math.random() - 0.5).map(String);
      return mc(`Mana yang BUKAN kelipatan ${k}? ${opts.join(", ")}`, opts, opts.indexOf(String(odd)),
        `${mult.join(", ")} semuanya habis dibagi ${k}, sedangkan ${odd} tidak (${odd} ÷ ${k} bersisa).`, "Logika", 20);
    }
    case 7: { // analogi perkalian
      const a = ri(2, 9), k = ri(2, 6), c = ri(2, 12);
      const ans = c * k;
      const { options, correctIndex } = optionSet(ans, [ans + k, c + k, ans - c]);
      return mc(`${a} : ${a * k} = ${c} : ___?`, options, correctIndex,
        `Hubungan: ×${k}. Maka ${c} × ${k} = ${ans}.`, "Logika", 20);
    }
    default: { // prima berikutnya
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
      const i = ri(2, 12);
      const seq = primes.slice(i - 2, i + 1);
      const ans = primes[i + 1];
      const { options, correctIndex } = optionSet(ans, [ans + 2, ans - 2, ans + 4]);
      return mc(`Bilangan prima berikutnya setelah ${seq.join(", ")} adalah?`, options, correctIndex,
        `Bilangan prima hanya habis dibagi 1 dan dirinya sendiri. Prima setelah ${seq[2]} adalah ${ans}.`, "Logika", 20);
    }
  }
}

export function generateProceduralBatch(quizId: string, count: number): Question[] {
  const gen = quizId === "math" ? mathQuestion : quizId === "iq" ? iqQuestion : null;
  if (!gen) return [];
  const out: Question[] = [];
  for (let i = 0; i < count; i++) out.push(gen());
  return out;
}

export function isProceduralQuiz(quizId: string): boolean {
  return quizId === "math" || quizId === "iq";
}
