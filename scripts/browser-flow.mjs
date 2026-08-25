// Test interaksi nyata: mulai flashcards, mulai tes IQ, buat tugas
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console] " + String(m.text()).slice(0, 300));
});
page.on("pageerror", (e) => {
  errors.push("[pageerror] " + String(e.message).slice(0, 300));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bodyText = () => page.evaluate(() => document.body.innerText.replace(/\n/g, " | ").slice(0, 220));

console.log("=== FLASHCARDS ===");
await page.goto("https://sikuis.com/flashcards", { waitUntil: "networkidle2", timeout: 45000 });
await sleep(3000);
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("soal"));
  if (btn) btn.click();
});
await sleep(4000);
console.log("Setelah pilih kuis:", await bodyText());

console.log("=== IQ ===");
await page.goto("https://sikuis.com/iq", { waitUntil: "networkidle2", timeout: 45000 });
await sleep(2500);
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Mulai Tes IQ"));
  if (btn) btn.click();
});
await sleep(5000);
console.log("Setelah mulai tes:", await bodyText());
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => /^[ABCD]$/.test(b.textContent.trim()));
  if (btn) btn.click();
});
await sleep(2000);
console.log("Setelah jawab:", await bodyText());

console.log("=== TUGAS ===");
await page.goto("https://sikuis.com/assignments", { waitUntil: "networkidle2", timeout: 45000 });
await sleep(3000);
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Buat Tugas"));
  if (btn) btn.click();
});
await sleep(4000);
console.log("Setelah buat tugas:", await bodyText());

console.log("\n=== SEMUA ERROR KONSOL YANG TERTANGKAP ===");
console.log(errors.length ? errors.slice(0, 10).join("\n") : "(tidak ada)");
await browser.close();
