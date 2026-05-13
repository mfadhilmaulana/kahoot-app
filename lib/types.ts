export type QuestionType = "mc" | "tf" | "poll" | "rating" | "open";

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number; // -1 for poll/rating/open (no correct answer)
  timeLimit: number;    // seconds
  category: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;        // hex
  difficulty: "Mudah" | "Sedang" | "Sulit";
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
  questionCount: number;
  estimatedMins: number;
  types: QuestionType[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  lastScore: number;
}

export interface LBEntry {
  rank: number;
  name: string;
  score: number;
  lastScore: number;
  id: string;
}

export interface QuestionPayload {
  index: number;
  total: number;
  type: QuestionType;
  question: string;
  options: string[];
  timeLimit: number;
  category: string;
  isLast: boolean;
}

export interface ResultsPayload {
  correctIndex: number;     // -1 for poll/rating/open
  counts: number[];
  leaderboard: LBEntry[];
  isLast: boolean;
  type: QuestionType;
  question: string;
  options: string[];
  explanation: string;
  openAnswers?: string[];   // for "open" type
  ratingAvg?: number;       // for "rating" type (1-5)
}
