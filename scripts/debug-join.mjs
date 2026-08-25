import { io } from "socket.io-client";
const host = io("http://localhost:4000");
const p1 = io("http://localhost:4000");
const p2 = io("http://localhost:4000");
await Promise.all([host, p1, p2].map((s) => new Promise((r) => s.on("connect", r))));
console.log("connected");
const custom = await new Promise((res) => host.emit("host:createCustom", {
  title: "Repro",
  questions: [
    { type: "mc", question: "2+2?", options: ["3", "4", "5", "6"], correctIndex: 1, timeLimit: 10 },
    { type: "reorder", question: "Urutkan", options: [], correctIndex: -1, timeLimit: 15, items: ["1", "2", "3"] },
    { type: "blank", question: "Ibukota?", options: [], correctIndex: -1, timeLimit: 15, answers: ["jakarta"] },
    { type: "open", question: "Bebas?", options: [], correctIndex: -1, timeLimit: 15 },
    { type: "mc", question: "Gambar?", options: ["a", "b", "c", "d"], correctIndex: 0, timeLimit: 10, image: "https://example.com/x.png" },
  ],
}, res));
console.log("pin", custom.pin);
await new Promise((res) => p1.emit("player:join", { pin: custom.pin, name: "Ani" }, res));
await new Promise((res) => p2.emit("player:join", { pin: custom.pin, name: "Budi" }, res));
console.log("joined");
p1.on("game:question", (q) => console.log("Q:", q.index, q.type));
host.emit("host:start", { pin: custom.pin }, (r) => console.log("start ack:", JSON.stringify(r)));
setTimeout(() => { console.log("done"); process.exit(0); }, 4000);
