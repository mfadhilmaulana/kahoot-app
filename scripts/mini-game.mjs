import { io } from "socket.io-client";
const URL = "http://localhost:4000";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const emit = (sock, ev, data) => new Promise((res) => sock.emit(ev, data, res));
const waitEvent = (sock, ev) => new Promise((r) => sock.once(ev, r));

const host = io(URL), p1 = io(URL), p2 = io(URL);
await Promise.all([host, p1, p2].map((s) => new Promise((r) => s.on("connect", r))));
console.log("connected");
const custom = await emit(host, "host:createCustom", {
  title: "Mini",
  questions: [
    { type: "mc", question: "Q1?", options: ["a","b","c","d"], correctIndex: 0, timeLimit: 15 },
    { type: "reorder", question: "Urutkan", options: [], correctIndex: -1, timeLimit: 15, items: ["1","2","3"] },
    { type: "blank", question: "Ibukota?", options: [], correctIndex: -1, timeLimit: 15, answers: ["jakarta"] },
    { type: "open", question: "Bebas?", options: [], correctIndex: -1, timeLimit: 15 },
    { type: "mc", question: "Q5?", options: ["a","b","c","d"], correctIndex: 0, timeLimit: 15, image: "https://example.com/x.png" },
  ],
});
console.log("pin", custom.pin);
await emit(p1, "player:join", { pin: custom.pin, name: "A" });
await emit(p2, "player:join", { pin: custom.pin, name: "B" });
console.log("joined");

let nextQ = waitEvent(p1, "game:question");
host.emit("host:start", { pin: custom.pin }, () => console.log("start ack"));
for (let i=0;i<5;i++) {
  console.log(`--- iter ${i} waiting for Q`);
  const qp = await Promise.race([nextQ, delay(10000).then(() => { throw new Error("Q timeout "+i); })]);
  console.log(`Q${i}:`, qp.type, qp.question.slice(0,30));
  if (i < 4) nextQ = waitEvent(p1, "game:question");
  const rP = waitEvent(p1, "game:questionResults");
  if (qp.type === "mc" && qp.image) {
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 0 });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 0 });
  } else if (qp.type === "mc") {
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: 0 });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: 1 });
  } else if (qp.type === "reorder") {
    const sh = qp.shuffledItems;
    await emit(p1, "player:answer", { pin: custom.pin, optionIndex: -3, order: [sh.indexOf("1"), sh.indexOf("2"), sh.indexOf("3")] });
    await emit(p2, "player:answer", { pin: custom.pin, optionIndex: -3, order: [sh.indexOf("3"), sh.indexOf("2"), sh.indexOf("1")] });
  } else {
    await emit(p1, "player:openAnswer", { pin: custom.pin, text: "x" });
    await emit(p2, "player:openAnswer", { pin: custom.pin, text: "y" });
  }
  console.log(`  answered, waiting results`);
  const res = await Promise.race([rP, delay(10000).then(() => { throw new Error("R timeout "+i); })]);
  console.log(`  results for Q${i}:`, res.type);
  await delay(50);
  if (i < 4) host.emit("host:next", { pin: custom.pin });
}
console.log("loop done, waiting ended");
const ended = await Promise.race([waitEvent(p1, "game:ended"), delay(10000).then(()=>{throw new Error("ended timeout")})]);
console.log("ended:", ended.leaderboard.length);
process.exit(0);
