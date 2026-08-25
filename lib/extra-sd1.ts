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
  ]);
