import { mc, tf, quiz } from "./extra-sd1";

export const kritisQuiz = quiz("kritis", "Berpikir Kritis & Logika Cepat", "Umum", "brain", "#7C3AED", "Sedang", "Berpikir Kritis",
  "Tema khusus melatih logika, deduksi, pola, dan kecepatan berpikir - ribuan soal unik",
  [
    mc("Semua kucing takut air. Simba adalah kucing. Kesimpulan?", ["Simba takut air", "Simba suka air", "Simba bukan kucing", "Tidak dapat disimpulkan"], 0, 20, "Berpikir Kritis", "Silogisme valid: kucing ⊆ takut air, Simba kucing."),
    mc("Mana yang lebih besar: 2/3 atau 3/5?", ["2/3", "3/5", "Sama", "Tidak bisa dibandingkan"], 0, 20, "Berpikir Kritis", "Samakan penyebut: 10/15 vs 9/15 → 2/3 lebih besar."),
    mc("Jika semua jendela di rumah tertutup dan tak ada jalan lain masuk, lantai berdebu, siapa yang membersihkannya? (teka-teki klasik: 'Siapa pembunuhnya' versi logika)", ["Tetangga", "Tidak ada yang masuk - soal butuh data lain", "Pemilik rumah", "Kucing"], 1, 25, "Berpikir Kritis", "Berpikir kritis: jangan menarik kesimpulan tanpa data cukup."),
    mc("Hari ini hari Kamis. 100 hari lagi hari apa?", ["Sabtu", "Minggu", "Senin", "Jumat"], 0, 25, "Berpikir Kritis", "100 : 7 = 14 sisa 2 → Kamis + 2 hari = Sabtu."),
    mc("Kamu punya 2 koin total Rp1.500, dan salah satunya bukan Rp1.000. Berapa nilainya masing-masing?", ["Rp1.000 dan Rp500", "Rp1.200 dan Rp300", "Rp750 dan Rp750", "Rp1.400 dan Rp100"], 0, 30, "Berpikir Kritis", "Trik bahasa: 'salah satunya' bukan Rp1.000 - yang satunya Rp500, berarti yang itu Rp1.000."),
    tf("Argumen 'Semua orang hebat bangun pagi; aku bangun pagi; jadi aku hebat' adalah argumen yang valid.", false, 20, "Berpikir Kritis", "Salah - arah silogismenya terbalik (menyimpulkan dari sifat umum tanpa premis kebalikan)."),
    mc("Dalam 1 menit, keran A mengisi 3 liter. Keran B menguras 1 liter per menit. Waktu mengisi 60 liter (keduanya terbuka)?", ["15 menit", "20 menit", "30 menit", "60 menit"], 2, 30, "Berpikir Kritis", "Neto 3-1 = 2 L/menit → 60:2 = 30 menit."),
    mc("Mana kelanjutan pola yang benar: J, F, M, A, M, J, J, ...?", ["A (Agustus)", "S (September)", "O (Oktober)", "N (November)"], 0, 20, "Berpikir Kritis", "Awal nama bulan: Januari, Februari, ..., Juli → berikutnya Agustus (A)."),
  ]);
