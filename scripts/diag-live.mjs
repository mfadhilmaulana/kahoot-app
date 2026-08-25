// Diagnosa live sikuis.com — alur yang sama dengan halaman flashcards & IQ
import { io } from "socket.io-client";

const s = io("https://sikuis.com", { transports: ["websocket", "polling"], reconnectionAttempts: 3, timeout: 20000 });
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout " + ms)), ms));

s.on("connect", async () => {
  console.log("✅ socket terhubung ke sikuis.com");
  try {
    const list = await Promise.race([
      new Promise((res) => s.emit("quizzes:list", {}, res)),
      timeout(15000),
    ]);
    console.log("✅ quizzes:list →", list.length, "kuis");
    const withQ = list.filter((q) => q.questionCount > 0);
    console.log("   kuis dengan questionCount > 0:", withQ.length);

    // alur flashcards untuk SETIAP kuis: cari yang hasilkan 0 kartu mc/tf
    let zeroCardQuizzes = [];
    for (const q of withQ.slice(0, 30)) {
      const data = await Promise.race([
        new Promise((res) => s.emit("quiz:getSoloData", { quizId: q.id }, res)),
        timeout(15000),
      ]);
      if (data.error) { console.log("   ❌", q.id, "error:", data.error); continue; }
      const fc = data.questions.filter((x) => x.type === "mc" || x.type === "tf");
      if (fc.length === 0) zeroCardQuizzes.push(q.title);
      const bad = data.questions.find((x) => !Array.isArray(x.options));
      if (bad) console.log("   ⚠️", q.id, "ada soal tanpa options:", bad.type);
    }
    console.log(zeroCardQuizzes.length ? "   ❌ kuis 0 kartu flashcard: " + zeroCardQuizzes.join(", ") : "   ✅ semua kuis punya kartu mc/tf");

    // alur IQ
    const iq = await Promise.race([
      new Promise((res) => s.emit("quiz:getSoloData", { quizId: "iq" }, res)),
      timeout(15000),
    ]);
    const iqFilt = (iq.questions ?? []).filter((q) => q.type === "mc" || q.type === "tf");
    console.log(iq.error ? "   ❌ IQ error: " + iq.error :
      iqFilt.length === 0 ? "   ❌ IQ: 0 soal mc/tf (filtered[0] crash!) — total diterima: " + (iq.questions ?? []).length :
      "   ✅ IQ: " + iqFilt.length + " soal mc/tf dari " + (iq.questions ?? []).length);
  } catch (e) {
    console.log("❌", e.message);
  }
  process.exit(0);
});
s.on("connect_error", (e) => { console.log("❌ connect_error:", e.message); });
s.on("disconnect", (r) => console.log("disconnect:", r));
setTimeout(() => { console.log("❌ gagal connect dalam 25s"); process.exit(1); }, 25000);
