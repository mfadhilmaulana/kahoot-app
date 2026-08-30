// Text-to-speech via Web Speech API — dengan pemilihan voice neural terbaik
// Prioritas: Google Bahasa Indonesia (Chrome) > Microsoft Andini/Gadis (Edge) > id-ID lain

let bestVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const idVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("id"));
  // Skor: Google > Microsoft Natural/Neural > lainnya
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    if (n.includes("google") && n.includes("indonesia")) return 100;
    if (n.includes("google")) return 90;
    if (n.includes("andini") || n.includes("gadist") || n.includes("ardi")) return 85;
    if (n.includes("natural") || n.includes("neural")) return 80;
    if (n.includes("microsoft")) return 70;
    return 50;
  };
  idVoices.sort((a, b) => score(b) - score(a));
  return idVoices[0] ?? voices.find((v) => v.lang.toLowerCase().startsWith("id")) ?? null;
}

function ensureVoices(): void {
  if (voicesReady || typeof window === "undefined") return;
  const tryPick = () => {
    const v = pickBestVoice();
    if (v) { bestVoice = v; voicesReady = true; }
  };
  tryPick();
  if (!voicesReady && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = tryPick;
    // Fallback: coba lagi setelah 500ms (Chrome kadang lambat)
    setTimeout(tryPick, 500);
  }
}

if (typeof window !== "undefined") ensureVoices();

export function isTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!isTtsAvailable() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voicesReady) ensureVoices();
    if (bestVoice) u.voice = bestVoice;
    u.lang = bestVoice?.lang ?? "id-ID";
    // Lebih natural: sedikit lebih lambat, pitch sedikit variasi
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* diamkan */
  }
}

export function stopSpeaking(): void {
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}

export function getVoiceName(): string | null {
  return bestVoice?.name ?? null;
}
