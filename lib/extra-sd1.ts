import { v4 as uuidv4 } from "uuid";
import type { Quiz, Question, QuestionType } from "./types";

export const q = (type: QuestionType, question: string, options: string[], correctIndex: number, timeLimit: number, category: string, explanation: string): Question =>
  ({ id: uuidv4(), type, question, options, correctIndex, timeLimit, category, explanation });
export const mc = (question: string, o: string[], c: number, t: number, cat: string, e: string) => q("mc", question, o, c, t, cat, e);
export const tf = (question: string, benar: boolean, t: number, cat: string, e: string) => q("tf", question, ["Benar", "Salah"], benar ? 0 : 1, t, cat, e);
export const quiz = (id: string, title: string, level: Quiz["level"], icon: string, color: string, difficulty: Quiz["difficulty"], category: string, description: string, questions: Question[]): Quiz =>
  ({ id, title, description, category, icon, color, difficulty, level, questions });

export const mtkSd = quiz("mtk-sd", "Matematika SD", "SD", "sum", "#F59E0B", "Mudah", "Matematika",
  "Berhitung, pecahan sederhana, bangun datar, dan soal cerita jenjang SD",
  [
    mc("25 + 37 = ?", ["52", "62", "51", "72"], 1, 20, "Matematika", "Satuan 5+7=12 (tulis 2 simpan 1), puluhan 2+3+1=6. Hasil 62."),
    mc("144 - 86 = ?", ["58", "68", "48", "66"], 0, 20, "Matematika", "144 - 86 = 58. Cek: 58 + 86 = 144."),
    mc("Hasil dari 7 x 8 adalah?", ["54", "56", "48", "63"], 1, 15, "Matematika", "7 x 8 = 56. Trik: 5x8 + 2x8 = 40 + 16 = 56."),
    mc("1/2 dari 18 adalah?", ["6", "8", "9", "12"], 2, 15, "Matematika", "1/2 x 18 = 18 : 2 = 9."),
    mc("Bangun yang memiliki 3 sisi disebut?", ["Persegi", "Segitiga", "Lingkaran", "Persegi panjang"], 1, 15, "Matematika", "Segitiga punya 3 sisi dan 3 sudut."),
    mc("Keliling persegi dengan sisi 6 cm adalah?", ["12 cm", "24 cm", "36 cm", "18 cm"], 1, 20, "Matematika", "Keliling persegi = 4 x sisi = 24 cm."),
    tf("10 lebih besar dari 9.", true, 10, "Matematika", "Benar, 10 lebih besar dari 9."),
    mc("Ani punya 12 permen dibagi 3 teman sama rata. Tiap teman dapat?", ["3", "4", "5", "6"], 1, 20, "Matematika", "12 : 3 = 4 permen tiap teman."),
    mc("Hasil dari 45 + 28 = ?", ["63", "73", "72", "83"], 1, 20, "Matematika", "45 + 28: satuan 5+8=13 (tulis 3 simpan 1), puluhan 4+2+1=7. Hasil 73."),
    mc("9 x 6 = ?", ["54", "45", "56", "63"], 0, 15, "Matematika", "9 x 6 = 54. Trik: 9 x 6 = 6 x 10 - 6 = 60 - 6 = 54."),
    mc("81 : 9 = ?", ["8", "7", "9", "6"], 2, 15, "Matematika", "81 : 9 = 9, karena 9 x 9 = 81."),
    mc("Ibu membeli 3 kg gula seharga Rp14.000 per kg. Total bayar?", ["Rp34.000", "Rp42.000", "Rp17.000", "Rp40.000"], 1, 25, "Matematika", "3 x 14.000 = Rp42.000."),
    mc("Jam sekarang menunjukkan pukul 09.15. Dua jam lagi pukul?", ["11.15", "10.15", "12.15", "11.45"], 0, 20, "Matematika", "09.15 + 2 jam = 11.15."),
    mc("Bilangan ganjil berikutnya setelah 17 adalah?", ["18", "19", "20", "21"], 1, 15, "Matematika", "Ganjil: 15, 17, 19, 21. Setelah 17 adalah 19."),
    mc("1/4 dari 20 adalah?", ["4", "6", "5", "8"], 2, 15, "Matematika", "1/4 x 20 = 20 : 4 = 5."),
    mc("Panjang pensil 15 cm. Jika diukur 2 pensil disambung, panjangnya?", ["25 cm", "30 cm", "35 cm", "20 cm"], 1, 20, "Matematika", "15 + 15 = 30 cm."),
    mc("Urutan bilangan dari terkecil: 21, 12, 22, 11 adalah?", ["11, 12, 21, 22", "11, 21, 12, 22", "12, 11, 22, 21", "21, 22, 11, 12"], 0, 20, "Matematika", "Bandingkan puluhan dulu: 11 < 12 < 21 < 22."),
    mc("Bunda punya Rp50.000, belanja Rp35.000. Kembaliannya?", ["Rp25.000", "Rp20.000", "Rp15.000", "Rp10.000"], 2, 20, "Matematika", "50.000 - 35.000 = Rp15.000."),
    mc("Hasil dari 100 - 45 + 20 = ?", ["75", "65", "80", "70"], 0, 20, "Matematika", "Kerjakan urut dari kiri: 100 - 45 = 55, lalu 55 + 20 = 75."),
    tf("Semua bilangan genap habis dibagi 2.", true, 15, "Matematika", "Benar, itu definisi bilangan genap."),
    mc("Berapa sisi pada bangun persegi panjang?", ["3", "4", "5", "6"], 1, 10, "Matematika", "Persegi panjang punya 4 sisi (dua pasang sama panjang)."),
  ]);

export const ipaSd = quiz("ipa-sd", "IPA SD", "SD", "leaf", "#22C55E", "Mudah", "IPA",
  "Makhluk hidup, tubuh kita, alam semesta, dan sains dasar jenjang SD",
  [
    mc("Hewan yang termasuk pemakan tumbuhan (herbivora) adalah?", ["Singa", "Kambing", "Ayam", "Kucing"], 1, 15, "IPA", "Kambing makan rumput dan daun, jadi herbivora."),
    mc("Alat pernapasan manusia adalah?", ["Jantung", "Paru-paru", "Lambung", "Ginjal"], 1, 15, "IPA", "Paru-paru mengambil oksigen dan membuang karbon dioksida."),
    mc("Air yang dipanaskan akan berubah menjadi?", ["Es", "Uap", "Batu", "Susu"], 1, 15, "IPA", "Air mendidih pada 100 derajat dan menguap menjadi uap."),
    tf("Matahari adalah sumber cahaya alami bagi bumi.", true, 10, "IPA", "Benar, matahari menerangi bumi di siang hari."),
    mc("Tumbuhan membuat makanan sendiri dengan proses?", ["Respirasi", "Fotosintesis", "Evolusi", "Transpirasi"], 1, 20, "IPA", "Fotosintesis memakai cahaya matahari, air, dan karbon dioksida."),
    mc("Bagian tubuh yang memompa darah adalah?", ["Otak", "Paru-paru", "Jantung", "Hati"], 2, 15, "IPA", "Jantung memompa darah ke seluruh tubuh."),
    mc("Perubahan wujud air menjadi es disebut?", ["Menguap", "Mencair", "Membeku", "Menyublim"], 2, 15, "IPA", "Cair menjadi padat = membeku, terjadi pada 0 derajat."),
    mc("Hewan yang mengalami metamorfosis sempurna adalah?", ["Kucing", "Kupu-kupu", "Ayam", "Ikan"], 1, 20, "IPA", "Kupu-kupu: telur, ulat, kepompong, lalu kupu-kupu."),
    mc("Organ untuk mencerna makanan adalah?", ["Jantung", "Lambung", "Paru-paru", "Ginjal"], 1, 15, "IPA", "Lambung mencerna makanan dengan cairan asam."),
    mc("Hewan yang bernapas dengan insang adalah?", ["Burung", "Ikan", "Kucing", "Ayam"], 1, 15, "IPA", "Ikan bernapas dengan insang di dalam air."),
    mc("Sumber energi terbesar bagi bumi adalah?", ["Bulan", "Matahari", "Angin", "Api"], 1, 15, "IPA", "Matahari sumber energi utama: cahaya dan panas."),
    mc("Bagian tumbuhan yang menyerap air dari tanah adalah?", ["Daun", "Batang", "Akar", "Bunga"], 2, 15, "IPA", "Akar menyerap air dan zat hara dari tanah."),
    mc("Benda di sekitar kita tersusun dari partikel kecil yang disebut?", ["Sel", "Atom", "Organ", "Serat"], 1, 20, "IPA", "Semua benda tersusun dari atom-atom."),
    mc("Magnet dapat menarik benda dari bahan?", ["Plastik", "Kayu", "Besi", "Kertas"], 2, 15, "IPA", "Magnet menarik benda magnetik seperti besi."),
    mc("Air hujan turun karena uap air di awan?", ["Membeku", "Mengembun", "Menguap", "Mencair"], 1, 20, "IPA", "Uap mengembun jadi titik air hingga jatuh sebagai hujan."),
    mc("Fungsi rangka bagi tubuh manusia adalah?", ["Mencerna makanan", "Menopang & melindungi tubuh", "Memompa darah", "Bernapas"], 1, 20, "IPA", "Rangka menopang tubuh, melindungi organ, dan tempat otot menempel."),
    mc("Peristiwa perubahan wujud dari padat langsung menjadi gas disebut?", ["Menguap", "Mencair", "Membeku", "Menyublim"], 3, 20, "IPA", "Menyublim: kapur barus lama-lama habis tanpa mencair."),
    tf("Kambing dan sapi termasuk kelompok hewan mamalia.", true, 15, "IPA", "Benar, keduanya menyusui anaknya."),
    mc("Bunyi dapat merambat paling cepat melalui?", ["Udara", "Air", "Besi", "Ruang hampa"], 2, 25, "IPA", "Bunyi paling cepat di zat padat seperti besi."),
  ]);
