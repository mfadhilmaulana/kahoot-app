import { mc, tf, quiz } from "./extra-sd1";

export const bindoSd = quiz("bindo-sd", "Bahasa Indonesia SD", "SD", "book", "#0891B2", "Mudah", "Bahasa",
  "Membaca, menulis, kosakata, dan pemahaman bacaan dasar jenjang SD",
  [
    mc("Huruf vokal ada berapa jumlahnya?", ["4", "5", "6", "7"], 1, 10, "Bahasa", "A, I, U, E, O - ada 5 huruf vokal."),
    mc("Kalimat yang merupakan kalimat tanya adalah?", ["Tutup pintunya.", "Kapan kamu datang?", "Buku itu bagus.", "Aku lapar."], 1, 15, "Bahasa", "Kalimat tanya diakhiri tanda tanya."),
    mc("Lawan kata dari 'besar' adalah?", ["Tinggi", "Kecil", "Panjang", "Berat"], 1, 10, "Bahasa", "Besar berlawanan dengan kecil (antonim)."),
    mc("Tanda baca di akhir kalimat berita adalah?", ["Tanda tanya", "Tanda seru", "Tanda titik", "Tanda koma"], 2, 10, "Bahasa", "Kalimat berita diakhiri titik."),
    mc("'Ibu memasak di dapur.' Subjek kalimat itu adalah?", ["memasak", "Ibu", "di dapur", "dapur"], 1, 15, "Bahasa", "Subjek adalah pelaku, yaitu Ibu."),
    tf("Kata 'buku' diawali huruf konsonan.", true, 10, "Bahasa", "Benar, huruf b adalah konsonan."),
    mc("Sinonim kata 'pandai' adalah?", ["Bodoh", "Cerdas", "Malas", "Lemah"], 1, 10, "Bahasa", "Pandai sama makna dengan cerdas."),
    mc("Melanjutkan pantun: 'Jangan lupa belajar rajin, agar kamu menjadi ...'", ["gembira", "cerdas", "kaya", "terkenal"], 1, 20, "Bahasa", "Isi pantun tentang belajar → menjadi cerdas."),
  ]);

export const ppknSd = quiz("ppkn-sd", "PPKn SD", "SD", "shield", "#DC2626", "Mudah", "PPKn",
  "Pancasila, aturan, gotong royong, dan nilai kebangsaan dasar",
  [
    mc("Semboyan bangsa Indonesia adalah?", ["Bhinneka Tunggal Ika", "Tut Wuri Handayani", "Jer Basuki Mawa Beya", "Rawe-rawe rantas"], 0, 15, "PPKn", "Bhinneka Tunggal Ika = berbeda-beda tetapi tetap satu."),
    mc("Sila ke-3 Pancasila berbunyi?", ["Ketuhanan Yang Maha Esa", "Kemanusiaan yang adil dan beradab", "Persatuan Indonesia", "Keadilan sosial"], 2, 15, "PPKn", "Sila ke-3: Persatuan Indonesia."),
    mc("Lambang sila ke-1 Pancasila adalah?", ["Bintang", "Rantai", "Pohon beringin", "Padi dan kapas"], 0, 15, "PPKn", "Sila ke-1 dilambangkan bintang, warna emas di atas hitam."),
    mc("Bendera negara Indonesia berwarna?", ["Merah putih", "Biru putih", "Merah hitam", "Putih merah"], 0, 10, "PPKn", "Merah di atas, putih di bawah - Sang Saka Merah Putih."),
    tf("Gotong royong adalah perilaku terpuji bangsa Indonesia.", true, 10, "PPKn", "Benar, gotong royong adalah budaya dan nilai luhur bangsa."),
    mc("Sebelum bermain, kembali ke rumah pukul 6 sore. Ini contoh?", ["Hukum alam", "Kesepakatan/aturan", "Kebiasaan hewan", "Takdir"], 1, 15, "PPKn", "Aturan dibuat kesepakatan agar semua tertib."),
    mc("Lagu kebangsaan Indonesia adalah?", ["Indonesia Raya", "Garuda Pancasila", "Hari Merdeka", "Satu Nusa Satu Bangsa"], 0, 10, "PPKn", "Indonesia Raya ciptaan W.R. Supratman."),
    mc("Sikap saat lagu kebangsaan dinyanyikan adalah?", ["Bercakap-cakap", "Berdiri tegap", "Duduk santai", "Main ponsel"], 1, 10, "PPKn", "Berdiri tegap sebagai bentuk penghormatan."),
  ]);
