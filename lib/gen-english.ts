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

// ── ENGLISH GRAMMAR (prosedural) ──────────────────────────────────────────────
const SUBJ_S = ["He", "She", "It", "The cat", "My mother", "Rina"];
const SUBJ_P = ["They", "We", "I", "You", "My friends", "The students"];
const VERBS: Array<[string, string, string, string]> = [ // [base, sForm, ing, past]
  ["go", "goes", "going", "went"], ["eat", "eats", "eating", "ate"],
  ["play", "plays", "playing", "played"], ["read", "reads", "reading", "read"],
  ["write", "writes", "writing", "wrote"], ["drink", "drinks", "drinking", "drank"],
  ["swim", "swims", "swimming", "swam"], ["run", "runs", "running", "ran"],
  ["study", "studies", "studying", "studied"], ["watch", "watches", "watching", "watched"],
  ["buy", "buys", "buying", "bought"], ["sing", "sings", "singing", "sang"],
  ["drive", "drives", "driving", "drove"], ["speak", "speaks", "speaking", "spoke"],
  ["sleep", "sleeps", "sleeping", "slept"], ["cook", "cooks", "cooking", "cooked"],
];
const OBJECTS = ["in the morning", "every day", "at school", "a book", "rice", "football", "music", "water"];

export function englishGrammarQuestion(): Question {
  const t = ri(1, 6);
  if (t === 1) { // simple present s-form
    const s = pick(SUBJ_S);
    const [base, sForm] = pick(VERBS);
    const obj = pick(OBJECTS);
    const { options, correctIndex } = shuffleOpts(sForm, [base, base + "s", base + "ing"]);
    return q("mc", `___ ${base} ${obj}. (He/She/It) — pilih bentuk yang tepat untuk subjek "${s}":`, options, correctIndex,
      `Subjek tunggal (he/she/it) pada simple present memakai bentuk -s/-es: "${s} ${sForm} ${obj}."`, "Bahasa Inggris", 20);
  }
  if (t === 2) { // present continuous
    const s = pick([...SUBJ_S, ...SUBJ_P]);
    const [, , ing] = pick(VERBS);
    const be = ["He", "She", "It", "The cat", "My mother", "Rina"].includes(s) ? "is" : s === "I" ? "am" : "are";
    const correct = `${be} ${ing}`;
    const { options, correctIndex } = shuffleOpts(correct, [`am ${ing}`, `are ${ing}`, `${be} ${ing.slice(0, -3)}`]);
    return q("mc", `${s} ___ now. (bentuk present continuous yang benar)`, options, correctIndex,
      `Present continuous: ${s} ${correct}.`, "Bahasa Inggris", 20);
  }
  if (t === 3) { // simple past
    const [base, , , past] = pick(VERBS);
    const s = pick([...SUBJ_S, ...SUBJ_P]);
    const { options, correctIndex } = shuffleOpts(past, [base, base + "ed", base + "ing"]);
    return q("mc", `Yesterday, ${s.toLowerCase()} ___ ${pick(OBJECTS)}. (${base})`, options, correctIndex,
      `Keterangan "yesterday" menunjukkan simple past: ${past}.`, "Bahasa Inggris", 20);
  }
  if (t === 4) { // a / an
    const pairs: Array<[string, string]> = [["elephant", "an"], ["apple", "an"], ["umbrella", "an"], ["hour", "an"], ["orange", "an"], ["book", "a"], ["car", "a"], ["university", "a"], ["house", "a"], ["egg", "an"]];
    const [noun, art] = pick(pairs);
    const { options, correctIndex } = shuffleOpts(art, ["a", "an", "the", "-"]);
    return q("mc", `I saw ___ ${noun}.`, options, correctIndex,
      art === "an" ? `"${noun}" diawali bunyi vokal → an.` : `"${noun}" diawali bunyi konsonan → a.`, "Bahasa Inggris", 15);
  }
  if (t === 5) { // is/are/am
    const s = pick([...SUBJ_S, ...SUBJ_P]);
    const correct = ["He", "She", "It", "The cat", "My mother", "Rina"].includes(s) ? "is" : s === "I" ? "am" : "are";
    const { options, correctIndex } = shuffleOpts(correct, ["is", "are", "am"]);
    return q("mc", `${s} ___ happy today.`, options, correctIndex, `Subjek "${s}" memakai to-be "${correct}".`, "Bahasa Inggris", 15);
  }
  // has/have
  const s = pick([...SUBJ_S, ...SUBJ_P]);
  const correct = ["He", "She", "It", "The cat", "My mother", "Rina"].includes(s) ? "has" : "have";
  const { options, correctIndex } = shuffleOpts(correct, ["has", "have", "had"]);
  return q("mc", `${s} ___ two brothers.`, options, correctIndex, `Subjek tunggal → has; jamak/I/You → have.`, "Bahasa Inggris", 15);
}

// ── ENGLISH VOCABULARY (prosedural dari bank kata) ────────────────────────────
const VOCAB: Array<[string, string]> = [
  ["beautiful", "cantik"], ["brave", "berani"], ["cheap", "murah"], ["clean", "bersih"],
  ["clever", "pintar"], ["cold", "dingin"], ["dangerous", "berbahaya"], ["difficult", "sulit"],
  ["dry", "kering"], ["expensive", "mahal"], ["fast", "cepat"], ["fat", "gemuk"],
  ["happy", "bahagia"], ["heavy", "berat"], ["high", "tinggi"], ["hot", "panas"],
  ["hungry", "lapar"], ["kind", "baik hati"], ["lazy", "malas"], ["long", "panjang"],
  ["loud", "keras (suara)", ], ["lovely", "menawan"], ["lucky", "beruntung"], ["narrow", "sempit"],
  ["new", "baru"], ["old", "tua/lama"], ["polite", "sopan"], ["poor", "miskin"],
  ["quiet", "tenang"], ["rich", "kaya"], ["sad", "sedih"], ["short", "pendek"],
  ["slow", "lambat"], ["small", "kecil"], ["strong", "kuat"], ["sweet", "manis"],
  ["thirsty", "haus"], ["tired", "lelah"], ["wet", "basah"], ["wide", "lebar"],
  ["angry", "marah"], ["busy", "sibuk"], ["dark", "gelap"], ["easy", "mudah"],
  ["empty", "kosong"], ["famous", "terkenal"], ["funny", "lucu"], ["gentle", "lembut"],
  ["honest", "jujur"], ["hungry", "lapar"], ["large", "besar"], ["light", "ringan"],
  ["neat", "rapi"], ["noisy", "berisik"], ["patient", "sabar"], ["pretty", "cantik"],
  ["proud", "bangga"], ["quick", "cepat"], ["safe", "aman"], ["serious", "serius"],
  ["sharp", "tajam"], ["silent", "hening"], ["smooth", "halus"], ["soft", "lembut"],
  ["sour", "asam"], ["stupid", "bodoh"], ["sunny", "cerah"], ["sweet", "manis"],
  ["tidy", "rapi"], ["ugly", "jelek"], ["warm", "hangat"], ["weak", "lemah"],
  ["young", "muda"], ["brave", "pemberani"], ["bright", "cerdas/terang"], ["calm", "tenang"],
  ["careful", "hati-hati"], ["deep", "dalam"], ["dirty", "kotor"], ["fresh", "segar"],
  ["friendly", "ramah"], ["generous", "dermawan"], ["healthy", "sehat"], ["heavy", "berat"],
  ["lazy", "malas"], ["naughty", "nakal"], ["perfect", "sempurna"], ["rich", "kaya raya"],
  ["rude", "kasar"], ["strange", "aneh"], ["strong", "kuat"], ["useful", "berguna"],
  ["wealthy", "sangat kaya"], ["wise", "bijaksana"], ["worried", "khawatir"], ["wrong", "salah"],
];

export function englishVocabQuestion(): Question {
  const [en, id] = pick(VOCAB);
  if (Math.random() < 0.5) {
    const wrongs = VOCAB.filter(([, m]) => m !== id).sort(() => Math.random() - 0.5).slice(0, 3).map(([, m]) => m);
    const { options, correctIndex } = shuffleOpts(id, wrongs);
    return q("mc", `Apa arti kata "${en}" dalam bahasa Indonesia?`, options, correctIndex,
      `"${en}" = ${id}.`, "Bahasa Inggris", 15);
  }
  const wrongs = VOCAB.filter(([w]) => w !== en).sort(() => Math.random() - 0.5).slice(0, 3).map(([w]) => w);
  const { options, correctIndex } = shuffleOpts(en, wrongs);
  return q("mc", `Kata bahasa Inggris untuk "${id}" adalah?`, options, correctIndex,
    `"${id}" = ${en}.`, "Bahasa Inggris", 15);
}
