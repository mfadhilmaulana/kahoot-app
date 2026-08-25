// Tangkap error konsol nyata dari halaman live pakai Edge headless
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pages = process.argv[2] ? [process.argv[2]] : [
  "https://sikuis.com/flashcards",
  "https://sikuis.com/iq",
  "https://sikuis.com/assignments",
];

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

for (const url of pages) {
  errors.length = 0;
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 4000)); // beri waktu socket + render
    const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("=== " + url);
    console.log("Konten terlihat: " + text.replace(/\n/g, " | ").slice(0, 180));
    console.log(errors.length ? "ERRORS:\n" + errors.slice(0, 5).join("\n") : "✅ tanpa error konsol");
  } catch (e) {
    console.log("=== " + url + "\n❌ " + e.message);
  }
}
await browser.close();
