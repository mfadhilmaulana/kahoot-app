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
const numOpts = (correct: number, wrongs: number[], fmt?: (n: number) => string) => {
  const set: number[] = [correct];
  for (const w of wrongs) { if (set.length >= 4) break; if (!set.includes(w)) set.push(w); }
  let b = 1;
  while (set.length < 4) { set.push(correct + b); b = -b + (b > 0 ? 1 : 0) + 1; }
  for (let i = set.length - 1; i > 0; i--) { const j = ri(0, i); [set[i], set[j]] = [set[j], set[i]]; }
  const f = fmt ?? ((n: number) => n.toLocaleString("id-ID"));
  return { options: set.map(f), correctIndex: set.indexOf(correct) };
};

// ── KIMIA (prosedural) ────────────────────────────────────────────────────────
const ELEMENTS: Array<[string, string, number]> = [ // [simbol, nama, Z]
  ["H", "Hidrogen", 1], ["He", "Helium", 2], ["Li", "Litium", 3], ["Be", "Berilium", 4],
  ["B", "Boron", 5], ["C", "Karbon", 6], ["N", "Nitrogen", 7], ["O", "Oksigen", 8],
  ["F", "Fluor", 9], ["Ne", "Neon", 10], ["Na", "Natrium", 11], ["Mg", "Magnesium", 12],
  ["Al", "Aluminium", 13], ["Si", "Silikon", 14], ["P", "Fosforus", 15], ["S", "Sulfur", 16],
  ["Cl", "Klor", 17], ["Ar", "Argon", 18], ["K", "Kalium", 19], ["Ca", "Kalsium", 20],
];
const COMPOUNDS: Array<[string, number]> = [ // [rumus, Mr]
  ["H2O", 18], ["CO2", 44], ["NaCl", 58.5], ["O2", 32], ["H2", 2], ["NH3", 17],
  ["CH4", 16], ["HCl", 36.5], ["CaO", 56], ["CO", 28], ["SO2", 64], ["NO2", 46],
  ["KCl", 74.5], ["MgO", 40], ["Al2O3", 102], ["FeS", 88], ["ZnO", 81], ["CaCO3", 100],
];

export function kimiaQuestion(): Question {
  const t = ri(1, 4);
  if (t === 1) { // proton/elektron dari nomor atom
    const [sym, name, z] = pick(ELEMENTS);
    const askProton = Math.random() < 0.5;
    const ans = z;
    const { options, correctIndex } = numOpts(ans, [z + 1, z - 1, z + 2]);
    return askProton
      ? q("mc", `Unsur ${name} (${sym}) memiliki nomor atom ${z}. Jumlah protonnya?`, options, correctIndex, `Nomor atom = jumlah proton = ${z}.`, "Kimia", 15)
      : q("mc", `Atom netral ${sym} memiliki nomor atom ${z}. Jumlah elektronnya?`, options, correctIndex, `Atom netral: elektron = proton = ${z}.`, "Kimia", 15);
  }
  if (t === 2) { // massa molar senyawa
    const [formula, mr] = pick(COMPOUNDS);
    const { options, correctIndex } = numOpts(mr, [mr + 2, mr - 2, mr * 2], (n) => `${n} g/mol`);
    return q("mc", `Massa molar (Mr) senyawa ${formula} adalah?`, options, correctIndex,
      `Jumlahkan massa atom penyusun: ${formula} = ${mr} g/mol.`, "Kimia", 20);
  }
  if (t === 3) { // massa n mol
    const [formula, mr] = pick(COMPOUNDS);
    const n = ri(2, 5);
    const mass = mr * n;
    const { options, correctIndex } = numOpts(Math.round(mass * 10) / 10, [Math.round(mr * 10) / 10, Math.round((mass + mr) * 10) / 10, Math.round((mass - mr) * 10) / 10], (x) => `${x} g`);
    return q("mc", `Massa dari ${n} mol ${formula} (Mr = ${mr}) adalah?`, options, correctIndex,
      `Massa = mol x Mr = ${n} x ${mr} = ${Math.round(mass * 10) / 10} g.`, "Kimia", 25);
  }
  // pH asam kuat
  const conc = ri(1, 5);
  const { options, correctIndex } = numOpts(conc, [14 - conc, conc + 1, 7 - conc]);
  return q("mc", `Larutan asam kuat memiliki konsentrasi [H+] = 10^-${conc} M. pH larutan itu?`, options, correctIndex,
    `pH = -log[H+] = -log(10^-${conc}) = ${conc}.`, "Kimia", 20);
}

// ── STATISTIKA (prosedural) ───────────────────────────────────────────────────
export function statistikaQuestion(): Question {
  const t = ri(1, 4);
  if (t <= 2) { // mean / median / modus / rentang dari dataset
    const n = ri(5, 7);
    const data = Array.from({ length: n }, () => ri(1, 40));
    const sorted = [...data].sort((a, b) => a - b);
    const mode = t === 1 && Math.random() < 0.5 ? "modus" : pick(["mean", "median", "rentang"]);
    let ans: number;
    let expl: string;
    if (mode === "mean") { const s = data.reduce((x, y) => x + y, 0); ans = Math.round((s / n) * 10) / 10; expl = `Mean = ${s} : ${n} = ${ans}.`; }
    else if (mode === "median") { ans = sorted[Math.floor(n / 2)]; expl = `Urutkan: ${sorted.join(", ")} → median = ${ans}.`; }
    else if (mode === "modus") { const freq = new Map<number, number>(); data.forEach((x) => freq.set(x, (freq.get(x) ?? 0) + 1)); ans = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]; expl = `Nilai tersering muncul: ${ans}.`; }
    else { ans = sorted[n - 1] - sorted[0]; expl = `Rentang = max - min = ${sorted[n - 1]} - ${sorted[0]} = ${ans}.`; }
    const { options, correctIndex } = numOpts(ans, [ans + 2, ans - 2, ans + 1]);
    return q("mc", `${mode[0].toUpperCase() + mode.slice(1)} dari data: ${data.join(", ")} adalah?`, options, correctIndex, expl, "Statistika", 25);
  }
  if (t === 3) { // peluang dadu
    const kind = pick(["genap", "ganjil", "lebih dari 4", "prima"]);
    const hits: Record<string, number[]> = { genap: [2, 4, 6], ganjil: [1, 3, 5], "lebih dari 4": [5, 6], prima: [2, 3, 5] };
    const count = hits[kind].length;
    const { options, correctIndex } = shuffleOpts(`${count}/6`, ["1/6", "2/6", "3/6", "4/6", "5/6"]);
    return q("mc", `Peluang muncul sisi ${kind} pada sekali lempar dadu adalah?`, options, correctIndex,
      `Sisi ${kind}: ${hits[kind].join(", ")} → ${count} dari 6 = ${count}/6.`, "Statistika", 20);
  }
  // peluang koin
  const n = ri(2, 3);
  const total = 2 ** n;
  const { options, correctIndex } = shuffleOpts(`1/${total}`, [`1/${total * 2}`, `1/${n}`, `1/4`]);
  return q("mc", `Peluang muncul semua angka pada ${n} kali lempar koin adalah?`, options, correctIndex,
    `Ruang sampel = 2^${n} = ${total}, hanya 1 hasil semua angka → 1/${total}.`, "Statistika", 20);
}

// ── AKUNTANSI (prosedural) ────────────────────────────────────────────────────
export function akuntansiQuestion(): Question {
  const t = ri(1, 3);
  const label = (k: string) => (k === "E" ? "Ekuitas" : k === "L" ? "Liabilitas" : "Total aset");
  const jt = (x: number) => `Rp${x.toLocaleString("id-ID")}`;
  if (t === 1) { // A = L + E
    const kind = pick(["E", "L", "A"]);
    const l = ri(2, 50), e = ri(2, 60), a = l + e;
    const ans = kind === "E" ? e : kind === "L" ? l : a;
    const jt = (x: number) => `Rp${x.toLocaleString("id-ID")} juta`;
    const soal = kind === "E"
      ? `Aset perusahaan = ${jt(a)} dan Liabilitas = ${jt(l)}. Berapa Ekuitasnya?`
      : kind === "L"
        ? `Aset = ${jt(a)} dan Ekuitas = ${jt(e)}. Berapa Liabilitasnya?`
        : `Liabilitas = ${jt(l)} dan Ekuitas = ${jt(e)}. Berapa Total asetnya?`;
    const { options, correctIndex } = numOpts(ans, [ans + 10, ans - 5, Math.abs(a - l)]);
    return q("mc", soal, options, correctIndex,
      `Aset = Liabilitas + Ekuitas → ${label(kind)} = ${jt(ans)}.`, "Akuntansi", 25);
  }
  if (t === 2) { // depresiasi garis lurus
    const cost = ri(2, 12), residu = ri(0, 2), life = ri(3, 8);
    const dep = Math.round(((cost - residu) / life) * 100) / 100;
    const { options, correctIndex } = numOpts(dep, [Math.round((cost / life) * 100) / 100, dep + 1, dep - 0.5], (x) => `Rp${x} juta`);
    return q("mc", `Mesin dibeli Rp${cost} juta, nilai residu Rp${residu} juta, umur ${life} tahun (garis lurus). Beban depresiasi per tahun?`, options, correctIndex,
      `(${cost} - ${residu}) : ${life} = Rp${dep} juta/tahun.`, "Akuntansi", 30);
  }
  // klasifikasi saldo normal
  const acc = pick([["Kas", "Debit"], ["Utang Usaha", "Kredit"], ["Modal", "Kredit"], ["Pendapatan", "Kredit"], ["Beban Gaji", "Debit"], ["Peralatan", "Debit"], ["Prive", "Debit"]] as Array<[string, string]>);
  const correct = acc[1];
  const { options, correctIndex } = shuffleOpts(correct, ["Debit", "Kredit"]);
  return q("mc", `Saldo normal akun "${acc[0]}" berada di sisi?`, options, correctIndex,
    `Akun ${acc[0]} bersaldo normal di sisi ${correct}.`, "Akuntansi", 20);
}
