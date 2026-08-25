import fs from "fs";
import path from "path";
import type { Quiz, Assignment, AssignmentResult, GameReport } from "./types";

// Server-side only JSON persistence. Semua data kuis kustom, tugas,
// dan laporan game bertahan walau server di-restart.

interface DBShape {
  customQuizzes: Record<string, Quiz>;
  assignments: Record<string, Assignment>;
  reports: Record<string, GameReport>;
  aiQuestions: Record<string, Quiz["questions"]>; // bank soal AI per quizId (tumbuh bertahap)
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let cache: DBShape | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emptyDb(): DBShape {
  return { customQuizzes: {}, assignments: {}, reports: {}, aiQuestions: {} };
}

function load(): DBShape {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<DBShape>;
      cache = { ...emptyDb(), ...parsed };
      return cache;
    }
  } catch (e) {
    console.error("[db] gagal membaca db.json:", e);
  }
  cache = emptyDb();
  return cache;
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(load(), null, 1), "utf8");
    } catch (e) {
      console.error("[db] gagal menyimpan db.json:", e);
    }
  }, 250);
}

// ── Kuis kustom ───────────────────────────────────────────────────────────────
export function getCustomQuizzes(): Record<string, Quiz> {
  return load().customQuizzes;
}
export function saveCustomQuiz(quiz: Quiz): void {
  load().customQuizzes[quiz.id] = quiz;
  scheduleSave();
}

// ── Tugas ─────────────────────────────────────────────────────────────────────
// Tugas kedaluwarsa otomatis dibersihkan (12 jam setelah tenggat)
function purgeExpiredAssignments(): void {
  const db = load();
  const cutoff = Date.now() - 12 * 3600_000;
  let changed = false;
  for (const code of Object.keys(db.assignments)) {
    if (db.assignments[code].deadlineMs < cutoff) { delete db.assignments[code]; changed = true; }
  }
  if (changed) scheduleSave();
}

export function saveAssignment(a: Assignment): void {
  purgeExpiredAssignments();
  load().assignments[a.code] = a;
  scheduleSave();
}
export function getAssignment(code: string): Assignment | undefined {
  purgeExpiredAssignments();
  return load().assignments[code?.toUpperCase()];
}
export function listAssignments(): Assignment[] {
  purgeExpiredAssignments();
  return Object.values(load().assignments).sort((a, b) => b.createdAt - a.createdAt);
}
export function addAssignmentResult(code: string, result: AssignmentResult): boolean {
  const a = getAssignment(code);
  if (!a) return false;
  a.results.push(result);
  scheduleSave();
  return true;
}

// ── Laporan ───────────────────────────────────────────────────────────────────
export function saveReport(r: GameReport): void {
  load().reports[r.pin] = r;
  // batasi jumlah laporan tersimpan (terbaru 100)
  const db = load();
  const keys = Object.keys(db.reports);
  if (keys.length > 100) {
    keys.sort((a, b) => db.reports[a].endedAt - db.reports[b].endedAt);
    for (const k of keys.slice(0, keys.length - 100)) delete db.reports[k];
  }
  scheduleSave();
}
export function getReport(pin: string): GameReport | undefined {
  return load().reports[pin];
}
export function listReports(limit = 30): GameReport[] {
  return Object.values(load().reports)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, limit);
}

// ── Bank soal AI (tumbuh bertahap, dipakai untuk randomisasi soal) ────────────
export function getAiQuestions(quizId: string): Quiz["questions"] {
  return load().aiQuestions[quizId] ?? [];
}
export function addAiQuestions(quizId: string, questions: Quiz["questions"]): void {
  const db = load();
  if (!db.aiQuestions[quizId]) db.aiQuestions[quizId] = [];
  db.aiQuestions[quizId].push(...questions);
  scheduleSave();
}
