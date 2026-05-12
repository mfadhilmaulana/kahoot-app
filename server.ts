import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── In-Memory Store ──────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number; // seconds
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
}

interface Answer {
  playerId: string;
  optionIndex: number;
  timeMs: number; // how fast they answered
}

interface Game {
  pin: string;
  quiz: Quiz;
  hostSocketId: string;
  players: Map<string, Player>;
  state: "lobby" | "question" | "review" | "leaderboard" | "ended";
  currentQuestionIndex: number;
  questionStartTime: number;
  answers: Map<string, Answer>; // playerId -> Answer
  questionTimer: ReturnType<typeof setTimeout> | null;
}

const quizzes = new Map<string, Quiz>();
const games = new Map<string, Game>();

// Seed a demo quiz
const demoQuiz: Quiz = {
  id: "demo",
  title: "Demo Quiz",
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
      question: "Siapa penemu telepon?",
      options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Albert Einstein"],
      correctIndex: 2,
      timeLimit: 20,
    },
  ],
};
quizzes.set(demoQuiz.id, demoQuiz);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calcScore(timeMs: number, timeLimit: number): number {
  const maxScore = 1000;
  const ratio = Math.max(0, 1 - timeMs / (timeLimit * 1000));
  return Math.round(maxScore * ratio);
}

function getLeaderboard(game: Game) {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, id: p.id }));
}

function getQuestionResults(game: Game) {
  const q = game.quiz.questions[game.currentQuestionIndex];
  const counts = [0, 0, 0, 0];
  const correct: string[] = [];
  const wrong: string[] = [];

  game.answers.forEach((ans, playerId) => {
    if (ans.optionIndex < counts.length) counts[ans.optionIndex]++;
    if (ans.optionIndex === q.correctIndex) correct.push(playerId);
    else wrong.push(playerId);
  });

  return { counts, correct, wrong, correctIndex: q.correctIndex };
}

// ─── Socket.io Logic ──────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    // ── Host: create game ──────────────────────────────────────────────────
    socket.on("host:create", ({ quizId }: { quizId: string }, cb) => {
      const quiz = quizzes.get(quizId);
      if (!quiz) return cb({ error: "Quiz not found" });

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
      cb({ pin, quiz });
    });

    // ── Host: create custom quiz and game ─────────────────────────────────
    socket.on("host:createCustom", ({ title, questions }: { title: string; questions: Omit<Question, "id">[] }, cb) => {
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
      cb({ pin, quiz });
    });

    // ── Player: join game ──────────────────────────────────────────────────
    socket.on("player:join", ({ pin, name }: { pin: string; name: string }, cb) => {
      const game = games.get(pin);
      if (!game) return cb({ error: "Game not found" });
      if (game.state !== "lobby") return cb({ error: "Game already started" });
      if ([...game.players.values()].some((p) => p.name === name))
        return cb({ error: "Name already taken" });

      const player: Player = { id: socket.id, name, score: 0, streak: 0 };
      game.players.set(socket.id, player);
      socket.join(`game:${pin}`);
      socket.data.pin = pin;
      socket.data.isPlayer = true;

      io.to(`game:${pin}`).emit("game:playerJoined", {
        players: [...game.players.values()].map((p) => ({ id: p.id, name: p.name })),
      });
      cb({ ok: true, quizTitle: game.quiz.title });
    });

    // ── Host: start game ───────────────────────────────────────────────────
    socket.on("host:start", ({ pin }: { pin: string }, cb) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id) return cb?.({ error: "Unauthorized" });
      if (game.players.size === 0) return cb?.({ error: "No players yet" });

      startNextQuestion(game, io, pin);
      cb?.({ ok: true });
    });

    // ── Host: show results for current question ────────────────────────────
    socket.on("host:showResults", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id) return;
      if (game.questionTimer) clearTimeout(game.questionTimer);
      revealResults(game, io, pin);
    });

    // ── Host: next question ────────────────────────────────────────────────
    socket.on("host:next", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id) return;
      const nextIndex = game.currentQuestionIndex + 1;
      if (nextIndex >= game.quiz.questions.length) {
        endGame(game, io, pin);
      } else {
        startNextQuestion(game, io, pin);
      }
    });

    // ── Player: answer ─────────────────────────────────────────────────────
    socket.on("player:answer", ({ pin, optionIndex }: { pin: string; optionIndex: number }, cb) => {
      const game = games.get(pin);
      if (!game || game.state !== "question") return cb?.({ error: "Not in question state" });
      if (game.answers.has(socket.id)) return cb?.({ error: "Already answered" });

      const timeMs = Date.now() - game.questionStartTime;
      game.answers.set(socket.id, { playerId: socket.id, optionIndex, timeMs });

      const q = game.quiz.questions[game.currentQuestionIndex];
      const isCorrect = optionIndex === q.correctIndex;

      cb?.({ ok: true, answered: game.answers.size, total: game.players.size });

      // Notify host of answer count
      io.to(game.hostSocketId).emit("game:answerCount", {
        answered: game.answers.size,
        total: game.players.size,
      });

      // If everyone answered, auto-reveal
      if (game.answers.size >= game.players.size) {
        if (game.questionTimer) clearTimeout(game.questionTimer);
        revealResults(game, io, pin);
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const pin = socket.data.pin;
      if (!pin) return;
      const game = games.get(pin);
      if (!game) return;

      if (socket.data.isPlayer) {
        game.players.delete(socket.id);
        io.to(`game:${pin}`).emit("game:playerLeft", {
          players: [...game.players.values()].map((p) => ({ id: p.id, name: p.name })),
        });
      } else {
        // Host disconnected — end game
        io.to(`game:${pin}`).emit("game:hostLeft");
        if (game.questionTimer) clearTimeout(game.questionTimer);
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
    const payload = {
      index: game.currentQuestionIndex,
      total: game.quiz.questions.length,
      question: q.question,
      options: q.options,
      timeLimit: q.timeLimit,
    };

    io.to(`game:${pin}`).emit("game:question", payload);

    game.questionTimer = setTimeout(() => {
      revealResults(game, io, pin);
    }, q.timeLimit * 1000);
  }

  function revealResults(game: Game, io: Server, pin: string) {
    if (game.state !== "question") return;
    game.state = "review";

    const q = game.quiz.questions[game.currentQuestionIndex];
    const results = getQuestionResults(game);

    // Update scores
    results.correct.forEach((playerId) => {
      const player = game.players.get(playerId);
      const ans = game.answers.get(playerId);
      if (!player || !ans) return;
      player.streak++;
      const streakBonus = Math.min(player.streak - 1, 5) * 50;
      player.score += calcScore(ans.timeMs, q.timeLimit) + streakBonus;
    });
    results.wrong.forEach((playerId) => {
      const player = game.players.get(playerId);
      if (player) player.streak = 0;
    });

    const leaderboard = getLeaderboard(game);

    io.to(`game:${pin}`).emit("game:questionResults", {
      correctIndex: results.correctIndex,
      counts: results.counts,
      leaderboard,
      isLast: game.currentQuestionIndex === game.quiz.questions.length - 1,
    });
  }

  function endGame(game: Game, io: Server, pin: string) {
    game.state = "ended";
    const leaderboard = getLeaderboard(game);
    io.to(`game:${pin}`).emit("game:ended", { leaderboard });
    setTimeout(() => games.delete(pin), 60000);
  }

  const PORT = parseInt(process.env.PORT || "3000");
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
