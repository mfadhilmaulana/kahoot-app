import fs from "fs";
import path from "path";
import type { Quiz, Assignment, AssignmentResult, GameReport } from "./types";

// Server-side only JSON persistence. Semua data kuis kustom, tugas,
// dan laporan game bertahan walau server di-restart.

interface DBShape {
  customQuizzes: Record<string, Quiz>;
  assignments: Record<string, Assignment>;
  reports: Record<string, GameReport>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let cache: DBShape | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emptyDb(): DBShape {
  return { customQuizzes: {}, assignments: {}, reports: {} };
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
export function saveAssignment(a: Assignment): void {
  load().assignments[a.code] = a;
  scheduleSave();
}
export function getAssignment(code: string): Assignment | undefined {
  return load().assignments[code?.toUpperCase()];
}
export function listAssignments(): Assignment[] {
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
