// Smoke test end-to-end SiKuis — jalankan: node scripts/smoke.mjs  (TRACE=1 utk log event)
import { io } from "socket.io-client";

const URL = "http://localhost:4000";
let passed = 0, failed = 0;
function ok(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const emit = (sock, ev, data) => new Promise((res) => sock.emit(ev, data, res));
const waitEvent = (sock, ev) => new Promise((r) => sock.once(ev, r));

const host = io(URL);
const p1 = io(URL);
const p2 = io(URL);
await Promise.all([host, p1, p2].map((s) => new Promise((r) => s.on("connect", r))));
console.log("— Semua socket terhubung —");

// 1. Daftar kuis
const list = await emit(host, "quizzes:list", {});
ok("quizzes:list → 32 kuis bawaan", Array.isArray(list) && list.length >= 32, `got ${list?.length}`);
ok("source flag ada", list.every((q) => q.source === "builtin" || q.source === "custom"));

// 2. Kuis kustom dengan tipe baru + gambar
const custom = await emit(host, "host:createCustom", {
  title: "Kuis Uji Fitur",
  questions: [
    { type: "mc", question: "2+2?", options: ["3", "4", "5", "6"], correctIndex: 1, timeLimit: 10 },
    { type: "reorder", question: "Urutkan dari terkecil", options: [], correctIndex: -1, timeLimit: 15, items: ["1", "2", "3"] },
    { type: "blank", question: "Ibukota Indonesia?", options: [], correctIndex: -1, timeLimit: 15, answers: ["jakarta", "Jakarta"] },
    { type: "open", question: "Pendapatmu?", options: [], correctIndex: -1, timeLimit: 15 },
    { type: "mc", question: "Soal bergambar", options: ["a", "b", "c", "d"], correctIndex: 0, timeLimit: 10, image: "https://example.com/x.png" },
  ],
});
ok("host:createCustom ok", !!custom.pin, JSON.stringify(custom));

// 3. Persistence check via list
const list2 = await emit(host, "quizzes:list", {});
ok("kuis kustom masuk daftar + source custom", list2.some((q) => q.id && q.source === "custom" && q.title === "Kuis Uji Fitur"));

let myResult1 = null, myResult2 = null;
p1.on("game:myResult", (r) => { myResult1 = r; });
p2.on("game:myResult", (r) => { myResult2 = r; });
await emit(p1, "player:join", { pin: custom.pin, name: "Ani" });
await emit(p2, "player:join", { pin: custom.pin, name: "Budi" });

// Urutan soal sesi kini ACAK — jawab adaptif per tipe (race-safe: daftar sebelum emit)
const seen = {};
let nextQ = waitEvent(p1, "game:question");
host.emit("host:start", { pin: custom.pin }, () => {});
for (let i = 0; i < 5; i++) {
  const qp = await nextQ;
  // daftarkan nextQ sebelum menjawab, agar tidak race dengan auto-reveal/next
  if (i < 4) nextQ = waitEvent(p1, "game:question");
  const rP = waitEvent(p1, "game:questionResults");
  if (qp.type === "mc" && qp.image) {
    seen.img = qp;
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 0 });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 0 });
  } else if (qp.type === "mc") {
    seen.mc = qp;
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 1 });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 0 });
  } else if (qp.type === "reorder") {
    seen.reorder = qp;
    const sh = qp.shuffledItems;
    const ix = (s) => sh.indexOf(s);
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: -3, order: [ix("1"), ix("2"), ix("3")] });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: -3, order: [ix("3"), ix("2"), ix("1")] });
  } else if (qp.type === "blank") {
    seen.blank = qp;
    await emit(p1, "player:openAnswer", { pin: custom.pin, text: "JAKARTA " });
    await emit(p2, "player:openAnswer", { pin: custom.pin, text: "bandung" });
  } else {
    seen.open = qp;
    await emit(p1, "player:openAnswer", { pin: custom.pin, text: "bagus" });
    await emit(p2, "player:openAnswer", { pin: custom.pin, text: "seru" });
  }
  const res = await rP;
  if (qp.type === "mc" && !qp.image) { seen.mcSnap = [myResult1, myResult2]; }
  if (qp.type === "reorder") { seen.reorderRes = res; seen.reorderSnap = [myResult1, myResult2]; }
  if (qp.type === "blank") { seen.blankRes = res; seen.blankSnap = [myResult1, myResult2]; }
  await delay(30);
  if (i < 4) host.emit("host:next", { pin: custom.pin });
}
ok("5 soal sesi acak lengkap", !!(seen.mc && seen.reorder && seen.blank && seen.open && seen.img), JSON.stringify(Object.keys(seen)));
ok("MC dinilai benar/salah", seen.mcSnap?.[0]?.correct === true && seen.mcSnap?.[1]?.correct === false);
ok("reorder dinilai benar/salah", seen.reorderSnap?.[0]?.correct === true && seen.reorderSnap?.[1]?.correct === false);
ok("reorder correctOrder dikirim", Array.isArray(seen.reorderRes?.correctOrder) && seen.reorderRes.correctOrder.join() === "1,2,3");
ok("blank normalisasi benar/salah", seen.blankSnap?.[0]?.correct === true && seen.blankSnap?.[1]?.correct === false);
ok("blank acceptedAnswers + jawaban masuk", Array.isArray(seen.blankRes?.acceptedAnswers) && Array.isArray(seen.blankRes?.openAnswers));
ok("gambar dikirim", seen.img?.image === "https://example.com/x.png");

// selesai: host lanjut dari review terakhir → ended
const endedP = waitEvent(p1, "game:ended");
host.emit("host:next", { pin: custom.pin });
const endedData = await Promise.race([endedP, delay(15000).then(() => null)]);
ok("game selesai + leaderboard", !!endedData && endedData.leaderboard.length === 2);

// 4. Laporan tersimpan
const rep = await emit(host, "report:get", { pin: custom.pin });
ok("report:get berisi statistik soal", !rep.error && rep.questions?.length === 5 && rep.players?.length === 2, JSON.stringify(rep).slice(0, 140));
const repList = await emit(host, "report:list", {});
ok("report:list memuat game tadi", repList.some((r) => r.pin === custom.pin));

// 5. Tugas
const asg = await emit(host, "assignment:create", { quizId: list[0].id, hours: 24 });
ok("assignment:create dapat kode", /^[A-Z0-9]{6}$/.test(asg.code ?? ""), JSON.stringify(asg));
const asgGet = await emit(p1, "assignment:get", { code: asg.code });
ok("assignment:get tanpa kunci jawaban", asgGet.ok && asgGet.questions.length > 0 &&
  asgGet.questions.every((q) => q.correctIndex === undefined && q.answers === undefined && q.items === undefined));
const sub1 = await emit(p1, "assignment:submit", { code: asg.code, name: "Citra", durationSec: 100,
  responses: asgGet.questions.map((q) => {
    if (q.type === "reorder") return { order: q.itemsShuffled };
    if (q.type === "blank") return { text: "zzz" };
    return { choice: 0 };
  }) });
ok("assignment:submit ok (skor bisa 0 jika jawaban acak)", sub1.ok && sub1.score >= 0 && sub1.rank >= 1, JSON.stringify(sub1));
const asgRes = await emit(host, "assignment:results", { code: asg.code });
ok("assignment:results entri terurut", asgRes.results?.length >= 1 && asgRes.results[0].score >= asgRes.results[asgRes.results.length - 1].score);
const badSub = await emit(p1, "assignment:submit", { code: "ZZZZZZ", name: "X", responses: [] });
ok("kode salah ditolak", !!badSub.error);

// 6. AI: OpenCode Zen anonim (gratis, tanpa key) — fallback bank bila jaringan gagal
const ai2 = await emit(host, "quiz:generateFromTopic", { topic: "fotosintesis", count: 3 });
ok("AI Zen/bank merespons", ai2.questions?.length > 0 && (ai2.engine?.startsWith("zen:") || ai2.engine === "bank"),
  `engine=${ai2.engine ?? "?"} err=${ai2.error ?? "-"}`);
if (ai2.engine?.startsWith("zen:")) console.log(`    ℹ️ mesin AI: ${ai2.engine} (tanpa API key!)`);

// ── 7. Mode TIM: penugasan otomatis + teamTotals ──
const tHost = io(URL), tA = io(URL), tB = io(URL);
await Promise.all([tHost, tA, tB].map((s) => new Promise((r) => s.on("connect", r))));
const tGame = await emit(tHost, "host:createCustom", {
  title: "TimTest", teams: true,
  questions: [{ type: "mc", question: "1+1?", options: ["1","2","3","4"], correctIndex: 1, timeLimit: 20 }],
});
let joinedPayload = null;
tHost.on("game:playerJoined", (p) => { joinedPayload = p; });
await emit(tA, "player:join", { pin: tGame.pin, name: "Tim-A" });
await emit(tB, "player:join", { pin: tGame.pin, name: "Tim-B" });
ok("tim dibagi otomatis Merah/Biru", joinedPayload?.players?.length === 2 &&
  new Set(joinedPayload.players.map((x) => x.team)).size === 2, JSON.stringify(joinedPayload));
const qP7 = waitEvent(tA, "game:question");
tHost.emit("host:start", { pin: tGame.pin }, () => {});
await qP7;
const rP7 = waitEvent(tA, "game:ended");
await emit(tA, "player:answer", { pin: tGame.pin, optionIndex: 1 });
await emit(tB, "player:answer", { pin: tGame.pin, optionIndex: 0 }); // semua jawab → reveal otomatis
await waitEvent(tA, "game:questionResults");
tHost.emit("host:next", { pin: tGame.pin }); // soal terakhir → ended + teamTotals
const ended7 = await Promise.race([rP7, delay(20000).then(() => null)]);
ok("teamTotals dikirim di akhir", !!ended7 && Array.isArray(ended7.teamTotals) && ended7.teamTotals.length === 2,
  JSON.stringify(ended7?.teamTotals ?? null));
[tHost, tA, tB].forEach((s) => s.close());

// ── 8. Mode EKONOMI: koin, beli ×2, efek penggandaan (adaptif acak) ──
const eHost = io(URL), eP = io(URL);
await Promise.all([eHost, eP].map((s) => new Promise((r) => s.on("connect", r))));
const eGame = await emit(eHost, "host:createCustom", {
  title: "Ekonomi Test",
  economy: true,
  questions: [
    { type: "mc", question: "1+1?", options: ["1","2","3","4"], correctIndex: 1, timeLimit: 20 },
    { type: "mc", question: "2+2?", options: ["3","4","5","6"], correctIndex: 1, timeLimit: 20 },
    { type: "open", question: "Bebas", options: [], correctIndex: -1, timeLimit: 20 },
    { type: "mc", question: "3+3?", options: ["5","6","7","8"], correctIndex: 1, timeLimit: 20 },
  ],
});
let coinState = null;
eP.on("game:coins", (x) => { coinState = x; });
await emit(eP, "player:join", { pin: eGame.pin, name: "Koin" });
ok("uang saku awal 200 koin", coinState?.coins === 200, JSON.stringify(coinState));

const eFirst = waitEvent(eP, "game:question");
eHost.emit("host:start", { pin: eGame.pin }, () => {});
let boughtX2 = false, doubledScore = null, firstMcChecked = false;
for (let i = 0; i < 4; i++) {
  const qp = await (i === 0 ? eFirst : nextQuestionEmit(eHost, eP, eGame.pin));
  const rP = waitEvent(eP, "game:questionResults");
  if (qp.type === "open") await emit(eP, "player:openAnswer", { pin: eGame.pin, text: "apa saja" });
  else await emit(eP, "player:answer", { pin: eGame.pin, optionIndex: 1 }); // idx1 selalu kunci untuk kuis ini
  const res = await rP;
  await delay(40);
  if (qp.type === "mc") {
    if (!firstMcChecked) {
      firstMcChecked = true;
      ok("koin: 200 awal +100 setelah benar", coinState?.coins === 300, JSON.stringify(coinState));
    }
    const me = res.leaderboard.find((x) => x.name === "Koin");
    if (boughtX2 && doubledScore === null) doubledScore = me?.lastScore ?? 0;
    else if ((coinState?.coins ?? 0) >= 300) {
      const b = await emit(eP, "player:buyPowerUp", { pin: eGame.pin, type: "x2" });
      ok("beli power-up x2 (300 koin)", b.ok === true && coinState?.coins === 0, JSON.stringify([b, coinState]));
      const poor = await emit(eP, "player:buyPowerUp", { pin: eGame.pin, type: "shield" });
      ok("beli saat koin kurang ditolak", !!poor.error);
      boughtX2 = true;
    }
  }
}
ok("x2 menggandakan poin (>=2000)", boughtX2 && doubledScore !== null && doubledScore >= 2000, `score=${doubledScore} bought=${boughtX2}`);
[eHost, eP].forEach((s) => s.close());

// ── 9. Impor teks → AI (Zen anonim / fallback Ollama) ──
let imp = await emit(host, "quiz:generateFromText", {
  text: "Fotosintesis adalah proses pembuatan makanan pada tumbuhan hijau yang memiliki klorofil. Proses ini membutuhkan sinar matahari, air, dan karbon dioksida, lalu menghasilkan glukosa serta oksigen. Fotosintesis terjadi di kloroplas dan sangat penting bagi kehidupan di bumi karena menjadi sumber oksigen bebas.",
  count: 3,
});
if (imp.error && !imp.questions) {
  await new Promise((r) => setTimeout(r, 3000));
  imp = await emit(host, "quiz:generateFromText", {
    text: "Fotosintesis adalah proses pembuatan makanan pada tumbuhan hijau yang memiliki klorofil. Proses ini membutuhkan sinar matahari, air, dan karbon dioksida, lalu menghasilkan glukosa serta oksigen. Fotosintesis terjadi di kloroplas dan sangat penting bagi kehidupan di bumi karena menjadi sumber oksigen bebas.",
    count: 3,
  });
}
ok("impor teks → soal AI", imp.questions?.length > 0,
  `engine=${imp.engine ?? "?"} err=${imp.error ?? "-"}`);
if (imp.questions?.length) console.log(`    ℹ️ contoh soal: ${imp.questions[0].question?.slice(0, 80)}…`);

console.log(`\n═══ HASIL: ${passed} lulus, ${failed} gagal ═══`);
process.exit(failed > 0 ? 1 : 0);

function nextQuestionEmit(h, sock, pin) {
  const qp = waitEvent(sock, "game:question");
  h.emit("host:next", { pin });
  return qp;
}
