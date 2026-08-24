// Text-to-speech via Web Speech API (read-aloud soal)

export function isTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!isTtsAvailable() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 1.02;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* diamkan */
  }
}

export function stopSpeaking(): void {
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}
