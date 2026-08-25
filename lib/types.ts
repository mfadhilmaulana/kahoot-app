export type QuestionType = "mc" | "tf" | "poll" | "rating" | "open" | "reorder" | "blank";

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number; // -1 for poll/rating/open/blank/reorder (no single correct option)
  timeLimit: number;    // seconds
  category: string;
  explanation: string;
  image?: string;       // optional image URL shown with the question
  video?: string;       // optional YouTube URL (ditampilkan di layar host & solo)
  items?: string[];     // "reorder": correct order of items
  answers?: string[];   // "blank": accepted free-text answers
}

export type QuizLevel = "SD" | "SMP" | "SMA" | "Kuliah" | "Umum";

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;        // hex
  difficulty: "Mudah" | "Sedang" | "Sulit";
  level?: QuizLevel;    // jenjang pendidikan
  questions: Question[];
}

export interface QuizMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  difficulty: Quiz["difficulty"];
  level?: Quiz["level"];
  questionCount: number;
  infinite?: boolean; // bank soal prosedural (ribuan variasi)
  estimatedMins: number;
  types: QuestionType[];
  source?: "builtin" | "custom";
}

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  lastScore: number;
  correctCount: number;
  coins: number;      // mode ekonomi
  team: number;       // -1 = tanpa tim; 0 Merah, 1 Biru
  x2Next: boolean;    // power-up: gandakan poin soal berikutnya
  shieldNext: boolean;// power-up: pertahankan streak saat salah
}

export interface LBEntry {
  rank: number;
  name: string;
  score: number;
  lastScore: number;
  id: string;
  team?: number;
}

export interface GameOptions { teams: boolean; economy: boolean; }

export interface QuestionPayload {
  index: number;
  total: number;
  type: QuestionType;
  question: string;
  options: string[];
  timeLimit: number;
  category: string;
  isLast: boolean;
  image?: string;
  video?: string;
  shuffledItems?: string[]; // "reorder": items in randomized display order
}

export interface ResultsPayload {
  correctIndex: number;     // -1 for poll/rating/open/blank/reorder
  counts: number[];
  leaderboard: LBEntry[];
  isLast: boolean;
  type: QuestionType;
  question: string;
  options: string[];
  explanation: string;
  image?: string;
  openAnswers?: string[];      // for "open" and "blank" types
  ratingAvg?: number;          // for "rating" type (1-5)
  correctOrder?: string[];     // for "reorder" type
  acceptedAnswers?: string[];  // for "blank" type
  correctRate?: number;        // 0-100 share of correct answers
}

// ── Tugas / Homework (asinkron) ───────────────────────────────────────────────
export interface AssignmentQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  timeLimit: number;
  image?: string;
  video?: string;
  itemsShuffled?: string[]; // "reorder": pre-shuffled for stable display
  // kunci jawaban — TIDAK PERNAH dikirim ke klien, hanya untuk penilaian server
  correctIndex?: number;
  items?: string[];
  answers?: string[];
}

export interface AssignmentResult {
  name: string;
  score: number;
  correctCount: number;
  total: number;
  durationSec: number;
  finishedAt: number;
}

export interface Assignment {
  id: string;
  code: string;             // join code, e.g. "ABC123"
  title: string;
  ownerKey?: string;        // pemilik tugas (guru) — daftar difilter per kunci ini
  createdAt: number;
  deadlineMs: number;       // epoch ms
  questions: AssignmentQuestion[];
  results: AssignmentResult[];
}

// ── Laporan game live ─────────────────────────────────────────────────────────
export interface ReportQuestionStat {
  index: number;
  text: string;
  type: QuestionType;
  answered: number;
  correctCount: number;
  correctPct: number; // 0-100 among scored-answerable participants
}

export interface GameReport {
  pin: string;
  quizId: string;
  title: string;
  endedAt: number;
  playerCount: number;
  players: Array<{ rank: number; name: string; score: number; correctCount: number; team?: number }>;
  questions: ReportQuestionStat[];
  teamTotals?: Array<{ team: number; name: string; score: number }>;
}

// ── Review Cerdas (spaced repetition / Leitner) ───────────────────────────────
export interface SrsEntry { box: number; due: number; }
export type SrsMap = Record<string, SrsEntry>; // key: `${quizId}:${questionId}`
