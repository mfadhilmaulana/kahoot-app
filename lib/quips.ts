// Quip interlude — teks lucu saat pemain menunggu soal berikutnya (ala Quizizz)

const QUIPS = [
  "Jempolnya cepat banget, otaknya kejar dong...",
  "Sabar, yang lain masih mikir keras nih.",
  "Pertanyaan: itu jawaban yakin atau tebak-tebakan?",
  "Santai, yang penting jujur... eh, maksudnya fokus!",
  "Kamu terlalu cepat, kopi dulu sebentar.",
  "Yang lain masih baca soal pakai kaca pembesar.",
  "Streak kamu panggil, katanya rindu.",
  "Tenang, salah itu bagian dari strategi... katanya.",
  "Kalau menang, jangan lupa traktir teman.",
  "Otak: loading... 47%",
  "Istirahat sejenak, poin kamu kami jagain.",
  "Serius? Sudah kelar? Gila sih.",
  "Jangan sombong kalau peringkat satu nanti.",
  "Pertanyaan berikutnya lebih seru, janji.",
  "Napas dulu, jangan tegang.",
  "Kalau bingung, pilih yang paling panjang... eh, jangan dong.",
  "Tim kamu bangga banget sama kamu (mungkin).",
  "Kunci jawaban lagi pada tidur, jangan dicari.",
  "Semangat! Sisa soal makin menantang.",
  "Legenda bilang: yang paling cepat belum tentu paling benar.",
];

export function randomQuip(): string {
  return QUIPS[Math.floor(Math.random() * QUIPS.length)];
}
