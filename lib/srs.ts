import type { SrsMap } from "./types";

// Review Cerdas — sistem Leitner box sederhana (spaced repetition).
// Box 0..4, interval hari: [10 menit, 1, 3, 7, 21 hari]
const INTERVALS_MS = [10 * 60_000, 86_400_000, 3 * 86_400_000, 7 * 86_400_000, 21 * 86_400_000];
const KEY = "srs:v1";

export function loadSrs(): SrsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as SrsMap;
  } catch {
    return {};
  }
}

function persist(map: SrsMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* penuh */ }
}

function entryKey(quizId: string, questionId: string): string {
  return `${quizId}:${questionId}`;
}

/** Catat hasil jawaban satu soal. correct → naik box; salah → reset ke box 0. */
export function recordAnswer(quizId: string, questionId: string, correct: boolean): void {
  if (typeof window === "undefined") return;
  const map = loadSrs();
  const k = entryKey(quizId, questionId);
  const cur = map[k]?.box ?? 0;
  const nextBox = correct ? Math.min(cur + 1, INTERVALS_MS.length - 1) : 0;
  map[k] = { box: nextBox, due: Date.now() + INTERVALS_MS[nextBox] };
  persist(map);
}

/** Jumlah soal yang jatuh tempo direview untuk sebuah quiz. */
export function dueCount(quizId: string, questionIds: string[]): number {
  const map = loadSrs();
  const now = Date.now();
  return questionIds.filter((qid) => {
    const e = map[entryKey(quizId, qid)];
    return e && e.due <= now && e.box < INTERVALS_MS.length - 1;
  }).length;
}

/**
 * Susun urutan soal untuk mode Review Cerdas:
 * soal jatuh tempo duluan (paling lewat deadline), sisanya acak.
 */
export function smartOrder<T extends { id: string }>(quizId: string, questions: T[]): T[] {
  const map = loadSrs();
  const now = Date.now();
  const scored = questions.map((q) => {
    const e = map[entryKey(quizId, q.id)];
    const overdue = e ? Math.max(0, now - e.due) : 0;
    const neverSeen = !e;
    return { q, prio: neverSeen ? 1 : overdue > 0 ? 2 : 0, overdue };
  });
  scored.sort((a, b) => (b.prio - a.prio) || (b.overdue - a.overdue));
  return scored.map((s) => s.q);
}

/** Statistik ringkas penguasaan per quiz. */
export function masteryStats(quizId: string, questionIds: string[]): { mastered: number; learning: number; unseen: number } {
  const map = loadSrs();
  let mastered = 0, learning = 0, unseen = 0;
  for (const qid of questionIds) {
    const e = map[entryKey(quizId, qid)];
    if (!e) unseen++;
    else if (e.box >= 3) mastered++;
    else learning++;
  }
  return { mastered, learning, unseen };
}
