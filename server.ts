import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  lastScore: number;
}

interface Answer {
  playerId: string;
  optionIndex: number;
  timeMs: number;
}

interface Game {
  pin: string;
  quiz: Quiz;
  hostSocketId: string;
  players: Map<string, Player>;
  state: "lobby" | "question" | "review" | "ended";
  currentQuestionIndex: number;
  questionStartTime: number;
  answers: Map<string, Answer>;
  questionTimer: ReturnType<typeof setTimeout> | null;
}

const quizzes = new Map<string, Quiz>();
const games = new Map<string, Game>();

// ─── Demo Quiz ────────────────────────────────────────────────────────────────

const demoQuiz: Quiz = {
  id: "demo",
  title: "Kuis Pengetahuan Umum",
  questions: [
    {
      id: "q1",
      question: "Ibu kota Indonesia adalah?",
      options: ["Surabaya", "Bandung", "Jakarta", "Medan"],
      correctIndex: 2,
      timeLimit: 20,
    },
    {
      id: "q2",
      question: "Berapa hasil dari 7 × 8?",
      options: ["54", "56", "64", "48"],
      correctIndex: 1,
      timeLimit: 15,
    },
    {
      id: "q3",
      question: "Siapa penemu bola lampu listrik?",
      options: ["Nikola Tesla", "Albert Einstein", "Thomas Edison", "Alexander Bell"],
      correctIndex: 2,
      timeLimit: 20,
    },
    {
      id: "q4",
      question: "Planet terbesar di tata surya kita adalah?",
      options: ["Saturnus", "Jupiter", "Uranus", "Neptunus"],
      correctIndex: 1,
      timeLimit: 20,
    },
    {
      id: "q5",
      question: "Bahasa pemrograman apa yang dibuat oleh Guido van Rossum?",
      options: ["Java", "Ruby", "Python", "Rust"],
      correctIndex: 2,
      timeLimit: 25,
    },
    {
      id: "q6",
      question: "Berapa jumlah sisi pada segitiga?",
      options: ["2", "3", "4", "5"],
      correctIndex: 1,
      timeLimit: 10,
    },
    {
      id: "q7",
      question: "Negara mana yang memiliki populasi terbanyak di dunia?",
      options: ["Amerika Serikat", "India", "China", "Indonesia"],
      correctIndex: 1,
      timeLimit: 20,
    },
    {
      id: "q8",
      question: "Apa warna bendera Indonesia?",
      options: ["Merah Putih", "Merah Biru", "Biru Putih", "Kuning Hijau"],
      correctIndex: 0,
      timeLimit: 10,
    },
    {
      id: "q9",
      question: "Siapa presiden pertama Indonesia?",
      options: ["Soeharto", "B.J. Habibie", "Soekarno", "Megawati"],
      correctIndex: 2,
      timeLimit: 15,
    },
    {
      id: "q10",
      question: "Berapakah nilai dari Pi (π) secara umum?",
      options: ["2.71", "3.14", "1.61", "3.41"],
      correctIndex: 1,
      timeLimit: 15,
    },
  ],
};
quizzes.set(demoQuiz.id, demoQuiz);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calcScore(timeMs: number, timeLimit: number): number {
  const ratio = Math.max(0, 1 - timeMs / (timeLimit * 1000));
  return Math.round(1000 * ratio);
}

function getLeaderboard(game: Game) {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.score,
      lastScore: p.lastScore,
      id: p.id,
    }));
}

function getQuestionResults(game: Game) {
  const q = game.quiz.questions[game.currentQuestionIndex];
  const counts = [0, 0, 0, 0];
  const correct: string[] = [];
  const wrong: string[] = [];

  game.answers.forEach((ans, playerId) => {
    if (ans.optionIndex >= 0 && ans.optionIndex < 4) counts[ans.optionIndex]++;
    if (ans.optionIndex === q.correctIndex) correct.push(playerId);
    else wrong.push(playerId);
  });

  return { counts, correct, wrong, correctIndex: q.correctIndex };
}

// ─── Server Setup ─────────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {

    // ── Host: use demo quiz ────────────────────────────────────────────────
    socket.on("host:create", ({ quizId }: { quizId: string }, cb: (res: object) => void) => {
      const quiz = quizzes.get(quizId);
      if (!quiz) return cb({ error: "Kuis tidak ditemukan" });

      let pin = generatePin();
      while (games.has(pin)) pin = generatePin();

      const game: Game = {
        pin,
        quiz,
        hostSocketId: socket.id,
        players: new Map(),
        state: "lobby",
        currentQuestionIndex: -1,
        questionStartTime: 0,
        answers: new Map(),
        questionTimer: null,
      };
      games.set(pin, game);
      socket.join(`game:${pin}`);
      socket.data.pin = pin;
      socket.data.isHost = true;
      cb({ pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length });
    });

    // ── Host: create custom quiz ───────────────────────────────────────────
    socket.on(
      "host:createCustom",
      (
        { title, questions }: { title: string; questions: Omit<Question, "id">[] },
        cb: (res: object) => void
      ) => {
        if (!title || questions.length === 0) return cb({ error: "Data kuis tidak valid" });

        const quiz: Quiz = {
          id: uuidv4(),
          title,
          questions: questions.map((q) => ({ ...q, id: uuidv4() })),
        };
        quizzes.set(quiz.id, quiz);

        let pin = generatePin();
        while (games.has(pin)) pin = generatePin();

        const game: Game = {
          pin,
          quiz,
          hostSocketId: socket.id,
          players: new Map(),
          state: "lobby",
          currentQuestionIndex: -1,
          questionStartTime: 0,
          answers: new Map(),
          questionTimer: null,
        };
        games.set(pin, game);
        socket.join(`game:${pin}`);
        socket.data.pin = pin;
        socket.data.isHost = true;
        cb({ pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length });
      }
    );

    // ── Player: join ───────────────────────────────────────────────────────
    socket.on(
      "player:join",
      ({ pin, name }: { pin: string; name: string }, cb: (res: object) => void) => {
        const game = games.get(pin);
        if (!game) return cb({ error: "Game tidak ditemukan. Periksa kode kamu." });
        if (game.state !== "lobby") return cb({ error: "Game sudah dimulai." });
        if (!name || name.trim().length === 0) return cb({ error: "Nama tidak boleh kosong." });
        if ([...game.players.values()].some((p) => p.name === name.trim()))
          return cb({ error: "Nama sudah dipakai orang lain." });

        const player: Player = {
          id: socket.id,
          name: name.trim(),
          score: 0,
          streak: 0,
          lastScore: 0,
        };
        game.players.set(socket.id, player);
        socket.join(`game:${pin}`);
        socket.data.pin = pin;
        socket.data.isPlayer = true;

        const playerList = [...game.players.values()].map((p) => ({ id: p.id, name: p.name }));
        io.to(`game:${pin}`).emit("game:playerJoined", { players: playerList });
        cb({ ok: true, quizTitle: game.quiz.title, totalQuestions: game.quiz.questions.length });
      }
    );

    // ── Host: start ────────────────────────────────────────────────────────
    socket.on("host:start", ({ pin }: { pin: string }, cb: (res: object) => void) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id) return cb({ error: "Unauthorized" });
      if (game.players.size === 0) return cb({ error: "Belum ada pemain yang bergabung." });
      if (game.state !== "lobby") return cb({ error: "Game sudah berjalan." });
      startNextQuestion(game, io, pin);
      cb({ ok: true });
    });

    // ── Host: force show results ───────────────────────────────────────────
    socket.on("host:showResults", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id || game.state !== "question") return;
      if (game.questionTimer) clearTimeout(game.questionTimer);
      game.questionTimer = null;
      revealResults(game, io, pin);
    });

    // ── Host: advance ──────────────────────────────────────────────────────
    socket.on("host:next", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id || game.state !== "review") return;
      const nextIndex = game.currentQuestionIndex + 1;
      if (nextIndex >= game.quiz.questions.length) {
        endGame(game, io, pin);
      } else {
        startNextQuestion(game, io, pin);
      }
    });

    // ── Player: answer ─────────────────────────────────────────────────────
    socket.on(
      "player:answer",
      (
        { pin, optionIndex }: { pin: string; optionIndex: number },
        cb: (res: object) => void
      ) => {
        const game = games.get(pin);
        if (!game || game.state !== "question") return cb({ error: "Bukan waktunya menjawab." });
        if (game.answers.has(socket.id)) return cb({ error: "Sudah menjawab." });
        if (optionIndex < 0 || optionIndex > 3) return cb({ error: "Pilihan tidak valid." });

        const timeMs = Date.now() - game.questionStartTime;
        game.answers.set(socket.id, { playerId: socket.id, optionIndex, timeMs });

        const answered = game.answers.size;
        const total = game.players.size;
        cb({ ok: true });

        io.to(game.hostSocketId).emit("game:answerCount", { answered, total });

        if (answered >= total) {
          if (game.questionTimer) clearTimeout(game.questionTimer);
          game.questionTimer = null;
          revealResults(game, io, pin);
        }
      }
    );

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const pin = socket.data.pin as string | undefined;
      if (!pin) return;
      const game = games.get(pin);
      if (!game) return;

      if (socket.data.isPlayer) {
        game.players.delete(socket.id);
        const playerList = [...game.players.values()].map((p) => ({ id: p.id, name: p.name }));
        io.to(`game:${pin}`).emit("game:playerLeft", { players: playerList });

        // If game is in progress and all remaining players answered, reveal
        if (
          game.state === "question" &&
          game.players.size > 0 &&
          game.answers.size >= game.players.size
        ) {
          if (game.questionTimer) clearTimeout(game.questionTimer);
          revealResults(game, io, pin);
        }
      } else if (socket.data.isHost) {
        if (game.questionTimer) clearTimeout(game.questionTimer);
        io.to(`game:${pin}`).emit("game:hostLeft");
        games.delete(pin);
      }
    });
  });

  // ── Game flow helpers ──────────────────────────────────────────────────────

  function startNextQuestion(game: Game, io: Server, pin: string) {
    game.currentQuestionIndex++;
    game.state = "question";
    game.answers = new Map();
    game.questionStartTime = Date.now();

    const q = game.quiz.questions[game.currentQuestionIndex];
    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;

    io.to(`game:${pin}`).emit("game:question", {
      index: game.currentQuestionIndex,
      total: game.quiz.questions.length,
      question: q.question,
      options: q.options,
      timeLimit: q.timeLimit,
      isLast,
    });

    game.questionTimer = setTimeout(() => {
      game.questionTimer = null;
      revealResults(game, io, pin);
    }, q.timeLimit * 1000);
  }

  function revealResults(game: Game, io: Server, pin: string) {
    if (game.state !== "question") return;
    game.state = "review";

    const q = game.quiz.questions[game.currentQuestionIndex];
    const results = getQuestionResults(game);

    // Award scores
    results.correct.forEach((playerId) => {
      const player = game.players.get(playerId);
      const ans = game.answers.get(playerId);
      if (!player || !ans) return;
      player.streak++;
      const streakBonus = Math.min(player.streak - 1, 5) * 50;
      const earned = calcScore(ans.timeMs, q.timeLimit) + streakBonus;
      player.lastScore = earned;
      player.score += earned;
    });
    results.wrong.forEach((playerId) => {
      const player = game.players.get(playerId);
      if (!player) return;
      player.streak = 0;
      player.lastScore = 0;
    });
    // Also 0 lastScore for non-answerers
    game.players.forEach((player) => {
      if (!game.answers.has(player.id)) {
        player.streak = 0;
        player.lastScore = 0;
      }
    });

    const leaderboard = getLeaderboard(game);
    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;

    io.to(`game:${pin}`).emit("game:questionResults", {
      correctIndex: results.correctIndex,
      counts: results.counts,
      leaderboard,
      isLast,
      question: q.question,
      options: q.options,
    });
  }

  function endGame(game: Game, io: Server, pin: string) {
    game.state = "ended";
    const leaderboard = getLeaderboard(game);
    io.to(`game:${pin}`).emit("game:ended", { leaderboard });
    // Clean up after 5 minutes
    setTimeout(() => games.delete(pin), 5 * 60 * 1000);
  }

  const PORT = parseInt(process.env.PORT || "3000");
  httpServer.listen(PORT, () => {
    console.log(`\n  🎮 Kuis! ready on http://localhost:${PORT}\n`);
  });
});
