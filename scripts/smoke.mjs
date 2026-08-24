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
ok("quizzes:list → 13 kuis bawaan", Array.isArray(list) && list.length >= 13, `got ${list?.length}`);
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

// Pola aman: daftarkan listener SEBELUM memicu aksi.
// host:next & host:showResults tidak pakai ack → fire-and-forget.
async function nextQuestion() {
  const qp = waitEvent(p1, "game:question");
  host.emit("host:next", { pin: custom.pin });
  return qp;
}

// ── Q1 (mc) ──
let qP = waitEvent(p1, "game:question");
host.emit("host:start", { pin: custom.pin });
let qPayload = await qP;
ok("Q1 payload mc", qPayload.type === "mc");
let rP = waitEvent(p1, "game:questionResults");
await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 1 }); // benar
await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 0 }); // salah → reveal otomatis
let res1 = await rP;
await delay(30);
ok("Q1 Ani benar (myResult)", myResult1?.correct === true);
ok("Q1 Budi salah (myResult)", myResult2?.correct === false);

// ── Q2 (reorder) ──
qPayload = await nextQuestion();
ok("Q2 payload reorder + shuffledItems", qPayload.type === "reorder" && Array.isArray(qPayload.shuffledItems) && qPayload.shuffledItems.length === 3);
const shuf = qPayload.shuffledItems;
const idxOf = (s) => shuf.indexOf(s);
rP = waitEvent(p1, "game:questionResults");
await emit(p1, "player:answer", { pin: custom.pin, optionIndex: -3, order: [idxOf("1"), idxOf("2"), idxOf("3")] });
await emit(p2, "player:answer", { pin: custom.pin, optionIndex: -3, order: [idxOf("3"), idxOf("2"), idxOf("1")] });
let res2 = await rP;
await delay(30);
ok("Q2 reorder penilaian benar/salah", myResult1?.correct === true && myResult2?.correct === false);
ok("Q2 correctOrder dikirim", Array.isArray(res2.correctOrder) && res2.correctOrder.join() === "1,2,3");

// ── Q3 (blank) ──
qPayload = await nextQuestion();
ok("Q3 payload blank", qPayload.type === "blank");
rP = waitEvent(p1, "game:questionResults");
await emit(p1, "player:openAnswer", { pin: custom.pin, text: "JAKARTA " });
await emit(p2, "player:openAnswer", { pin: custom.pin, text: "bandung" });
let res3 = await rP;
await delay(30);
ok("Q3 blank normalisasi benar/salah", myResult1?.correct === true && myResult2?.correct === false);
ok("Q3 acceptedAnswers + openAnswers", Array.isArray(res3.acceptedAnswers) && Array.isArray(res3.openAnswers) && res3.openAnswers.length === 2);

// ── Q4 (open) partisipasi ──
qPayload = await nextQuestion();
ok("Q4 payload open", qPayload.type === "open");
rP = waitEvent(p1, "game:questionResults");
await emit(p1, "player:openAnswer", { pin: custom.pin, text: "bagus" });
await emit(p2, "player:openAnswer", { pin: custom.pin, text: "seru" });
await rP;

// ── Q5 (gambar) → selesai ──
qPayload = await nextQuestion();
ok("Q5 image dikirim", qPayload.image === "https://example.com/x.png");
let endedP = waitEvent(p1, "game:ended");
await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 0 });
await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 0 });
// soal terakhir: host tekan "Lihat Hasil Akhir" → memicu game:ended
host.emit("host:next", { pin: custom.pin });
const endedData = await endedP;
ok("game selesai + leaderboard", endedData.leaderboard.length === 2);

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
ok("assignment:submit skor > 0 & rank", sub1.ok && sub1.score > 0 && sub1.rank >= 1, JSON.stringify(sub1));
const asgRes = await emit(host, "assignment:results", { code: asg.code });
ok("assignment:results entri terurut", asgRes.results?.length >= 1 && asgRes.results[0].score >= asgRes.results[asgRes.results.length - 1].score);
const badSub = await emit(p1, "assignment:submit", { code: "ZZZZZZ", name: "X", responses: [] });
ok("kode salah ditolak", !!badSub.error);

// 6. AI fallback bank (tanpa key)
const ai = await emit(host, "quiz:generateFromTopic", { topic: "sains", count: 5 });
ok("AI fallback bank + engine label", ai.questions?.length > 0 && ai.engine === "bank", JSON.stringify(ai.engine ?? ai.error));

console.log(`\n═══ HASIL: ${passed} lulus, ${failed} gagal ═══`);
process.exit(failed > 0 ? 1 : 0);
