import { createServer } from "http";
import { parse } from "url";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import next from "next";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { PDFParse } from "pdf-parse";
import type { Quiz, Question, Player, LBEntry, QuestionType, Assignment, AssignmentResult, GameReport, ReportQuestionStat } from "./lib/types";
import {
  getCustomQuizzes, saveCustomQuiz,
  saveAssignment, getAssignment, listAssignments, addAssignmentResult,
  saveReport, getReport, listReports,
  getAiQuestions, addAiQuestions,
} from "./lib/db";
import { generateProceduralBatch, isProceduralQuiz } from "./lib/generators";
import { mtkSd, ipaSd } from "./lib/extra-sd1";
import { bindoSd, ppknSd } from "./lib/extra-sd2";
import { mtkSmp, ipaSmp, ipsSmp, bingSmp } from "./lib/extra-smp";
import { fisika, kimia, biologiSma, bingSma, informatikaSma } from "./lib/extra-sma";
import { akuntansi, manajemen, hukumDasar, statistika, anatomi, algoritma } from "./lib/extra-kuliah";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

process.on("uncaughtException", (e) => {
  console.error("[fatal] uncaughtException:\n" + (e.stack ?? e));
});

// ─────────────────────────────────────────────────────────────────────────────
// Game state
// ─────────────────────────────────────────────────────────────────────────────
interface Answer { playerId: string; optionIndex: number; timeMs: number; order?: number[]; }
interface Game {
  pin: string; quiz: Quiz; hostSocketId: string;
  players: Map<string, Player>;
  state: "lobby" | "question" | "review" | "ended";
  currentQuestionIndex: number; questionStartTime: number;
  answers: Map<string, Answer>;
  openAnswers: Map<string, string>; // playerId -> text untuk tipe open & blank
  questionTimer: ReturnType<typeof setTimeout> | null;
  currentShuffled?: string[];       // urutan tampil soal reorder
  questionStats: ReportQuestionStat[];
  teams: boolean;                   // mode tim (Merah vs Biru)
  economy: boolean;                 // mode koin & power-up
}

const quizzes = new Map<string, Quiz>();
const games   = new Map<string, Game>();

// ─────────────────────────────────────────────────────────────────────────────
// Quiz library
// ─────────────────────────────────────────────────────────────────────────────
const Q = (
  type: QuestionType, question: string, options: string[],
  correctIndex: number, timeLimit: number, category: string, explanation: string
): Question => ({ id: uuidv4(), type, question, options, correctIndex, timeLimit, category, explanation });

const mc   = (q: string, opts: string[], ci: number, t: number, cat: string, exp: string) => Q("mc", q, opts, ci, t, cat, exp);
const tf   = (q: string, correct: boolean, t: number, cat: string, exp: string) => Q("tf", q, ["Benar", "Salah"], correct ? 0 : 1, t, cat, exp);
const poll = (q: string, opts: string[], t: number, cat: string, exp: string) => Q("poll", q, opts, -1, t, cat, exp);
const rating = (q: string, t: number, cat: string, exp: string) => Q("rating", q, ["1","2","3","4","5"], -1, t, cat, exp);
const open = (q: string, t: number, cat: string, exp: string) => Q("open", q, [], -1, t, cat, exp);

// ── QUIZ 1: Sains & Teknologi ─────────────────────────────────────────────────
const scienceQuiz: Quiz = {
  id: "science", title: "Sains & Teknologi", icon: "⚗️", color: "#6366F1",
  description: "Jelajahi misteri alam semesta, fisika, biologi, dan ilmu pengetahuan modern",
  category: "Sains", difficulty: "Sedang",
  questions: [
    mc("Unsur paling melimpah di alam semesta adalah?",
      ["Helium","Hidrogen","Oksigen","Karbon"],1,20,"Sains",
      "Hidrogen mencakup ~75% semua materi di alam semesta. Matahari dan bintang-bintang sebagian besar terdiri dari hidrogen yang bereaksi fusi menjadi helium untuk menghasilkan energi."),
    mc("Kecepatan cahaya di ruang hampa sekitar?",
      ["150.000 km/s","299.792 km/s","450.000 km/s","1.000.000 km/s"],1,20,"Sains",
      "Cahaya bergerak 299.792 km/detik — cukup untuk mengelilingi bumi 7,5× dalam satu detik! Tidak ada yang bisa bergerak lebih cepat dari cahaya (relativitas Einstein)."),
    mc("Gas apa yang paling banyak di atmosfer bumi?",
      ["Oksigen (21%)","Karbon dioksida","Nitrogen (78%)","Argon"],2,20,"Sains",
      "Nitrogen mencakup 78% atmosfer, Oksigen 21%. CO₂ hanya 0.04% — tapi dampaknya terhadap iklim sangat besar karena ia memerangkap panas seperti selimut di sekitar bumi."),
    mc("Apa yang menghasilkan energi utama di dalam sel tubuh kita?",
      ["Ribosom","Nukleus","Mitokondria","Lisosom"],2,20,"Sains",
      "Mitokondria adalah 'pembangkit listrik' sel! Ia mengubah glukosa + oksigen → ATP (energi). Mitokondria punya DNA sendiri — bukti bahwa ia dulunya bakteri bebas yang 'ditelan' sel primitif."),
    mc("Berapa lama cahaya matahari mencapai bumi?",
      ["3 menit","8 menit 20 detik","30 menit","2 jam"],1,20,"Sains",
      "Cahaya matahari menempuh 150 juta km dalam 8 menit 20 detik. Artinya, matahari yang kita lihat sekarang adalah kondisi matahari 8 menit lalu!"),
    tf("Suara dapat merambat di ruang hampa udara.", false, 15, "Sains",
      "Suara adalah gelombang mekanik yang butuh medium (udara, air, padatan) untuk merambat. Di luar angkasa tidak ada molekul — tidak ada suara. Ledakan bintang terjadi dalam keheningan total!"),
    mc("Planet mana yang memiliki badai terbesar di tata surya?",
      ["Saturnus","Jupiter","Neptunus","Uranus"],1,20,"Sains",
      "Jupiter memiliki 'Great Red Spot' — badai yang sudah berlangsung lebih dari 350 tahun! Diameternya lebih besar dari planet Bumi. Jupiter bisa menampung 1.300 Bumi di dalamnya."),
    mc("Berapa persen air di permukaan bumi?",
      ["51%","61%","71%","81%"],2,15,"Sains",
      "71% permukaan bumi tertutup air, namun hanya 2.5% yang merupakan air tawar, dan sebagian besar terkunci di es kutub & gletser. Hanya ~0.3% air tawar yang mudah diakses manusia!"),
    mc("Tulang terpanjang di tubuh manusia adalah?",
      ["Tulang betis (fibula)","Tulang kering (tibia)","Tulang paha (femur)","Tulang lengan (humerus)"],2,20,"Sains",
      "Tulang paha (femur) adalah tulang terpanjang (45-50 cm) dan terkuat di tubuh. Ia bisa menahan tekanan hingga 1.7 ton — lebih kuat dari beton!"),
    tf("Bintang yang kita lihat di langit malam mungkin sudah tidak ada lagi.", true, 15, "Sains",
      "Benar! Cahaya bintang terdekat di luar tata surya membutuhkan 4 tahun untuk mencapai kita. Bintang yang jauh mungkin cahayanya sudah ribuan tahun dalam perjalanan!"),
    mc("Apa itu supernova?",
      ["Bintang baru yang lahir","Ledakan dahsyat bintang masif yang sekarat","Galaksi yang bertabrakan","Lubang hitam yang aktif"],1,20,"Sains",
      "Supernova adalah ledakan terdahsyat di alam semesta — satu ledakan bisa lebih terang dari seluruh galaksi! Dari supernova inilah unsur-unsur berat seperti emas dan karbon tersebar. Kita terbuat dari debu bintang."),
    mc("Hukum gravitasi universal ditemukan oleh?",
      ["Albert Einstein","Galileo Galilei","Isaac Newton","Johannes Kepler"],2,20,"Sains",
      "Isaac Newton merumuskan hukum gravitasi pada 1687. Einstein kemudian menyempurnakannya dengan relativitas umum — gravitasi adalah 'kelengkungan ruang-waktu', bukan gaya biasa."),
    mc("DNA merupakan singkatan dari?",
      ["Deoxyribonucleic Acid","Dinucleic Acid Assembly","Deoxyribose Natural Acid","Dynamic Nucleic Acid"],0,20,"Sains",
      "DNA (Deoxyribonucleic Acid) adalah molekul yang menyimpan informasi genetik semua makhluk hidup. Jika DNA dalam satu sel manusia direntangkan, panjangnya ~2 meter! Tubuh kita memiliki 37 triliun sel."),
    mc("Teori evolusi spesies dipopulerkan oleh?",
      ["Gregor Mendel","Louis Pasteur","Charles Darwin","James Watson"],2,25,"Sains",
      "Charles Darwin mempublikasikan 'On the Origin of Species' (1859) berdasarkan pengamatannya di Kepulauan Galapagos. Evolusi melalui seleksi alam adalah salah satu teori paling penting dalam sains — menjadi fondasi seluruh biologi modern."),
    rating("Seberapa tertarik kamu mempelajari sains lebih dalam? (1 = tidak tertarik, 5 = sangat tertarik)",
      25,"Sains",
      "Sains adalah cara manusia memahami alam semesta. Keingintahuan adalah modal utama ilmuwan. Tidak ada pertanyaan yang terlalu bodoh dalam sains — setiap 'mengapa?' adalah awal dari penemuan baru!"),
  ],
};

// ── QUIZ 2: Sejarah Indonesia ──────────────────────────────────────────────────
const historyIdQuiz: Quiz = {
  id: "history-id", title: "Sejarah Indonesia", icon: "🏛️", color: "#DC2626",
  description: "Perjuangan kemerdekaan, kerajaan besar, pahlawan, dan peristiwa bersejarah nusantara",
  category: "Sejarah", difficulty: "Sedang",
  questions: [
    tf("Indonesia memproklamasikan kemerdekaan pada 17 Agustus 1945.", true, 15, "Sejarah",
      "Benar! Proklamasi dibacakan Soekarno-Hatta di Jl. Pegangsaan Timur 56, Jakarta pukul 10.00 — dua hari setelah Jepang menyerah pada Sekutu. Naskah ditulis tangan Soekarno dan diketik Sayuti Melik."),
    mc("Siapa yang membacakan teks Proklamasi Kemerdekaan RI?",
      ["Mohammad Hatta","Soekarno","Sutan Sjahrir","Ki Hajar Dewantara"],1,20,"Sejarah",
      "Soekarno membacakan teks proklamasi dengan Hatta mendampingi. Teks ditulis pada dini hari 17 Agustus setelah para pemuda 'menculik' Soekarno-Hatta ke Rengasdengklok agar segera memproklamasikan kemerdekaan."),
    mc("Candi Borobudur dibangun pada masa kerajaan apa?",
      ["Majapahit","Sriwijaya","Dinasti Syailendra","Kediri"],2,20,"Sejarah",
      "Borobudur dibangun Dinasti Syailendra abad ke-8 sampai ke-9 Masehi. Candi Buddha terbesar di dunia ini memiliki 2.672 panel relief dan 504 patung Buddha. Sempat terkubur abu vulkanik sebelum ditemukan kembali oleh Raffles pada 1814."),
    mc("Patih Majapahit yang bersumpah Sumpah Palapa adalah?",
      ["Ken Arok","Raden Wijaya","Gajah Mada","Hayam Wuruk"],2,20,"Sejarah",
      "Gajah Mada bersumpah tidak menikmati makanan 'palapa' sebelum menyatukan Nusantara. Di bawah Raja Hayam Wuruk + Gajah Mada (1350-1389), Majapahit mencapai kejayaan tertinggi."),
    tf("Bahasa Indonesia berasal dari Bahasa Jawa.", false, 15, "Sejarah",
      "Bahasa Indonesia berasal dari Bahasa Melayu — dipilih karena sudah lama dipakai sebagai lingua franca di seluruh nusantara. Keputusan ini bijak: tidak ada suku yang merasa bahasanya 'kalah'."),
    mc("Konferensi Asia-Afrika pertama diadakan di?",
      ["Jakarta","Surabaya","Bandung","Yogyakarta"],2,20,"Sejarah",
      "KAA pertama diadakan di Bandung, April 1955, dihadiri 29 negara. Menghasilkan 'Dasasila Bandung' — prinsip hidup berdampingan secara damai."),
    mc("Hari Kebangkitan Nasional diperingati setiap tanggal?",
      ["17 Agustus","28 Oktober","20 Mei","10 November"],2,15,"Sejarah",
      "20 Mei diperingati sebagai Hari Kebangkitan Nasional, menandai berdirinya Budi Utomo pada 1908 — organisasi modern pertama yang mencita-citakan kemajuan bangsa."),
    tf("Sumpah Pemuda diikrarkan pada 28 Oktober 1928.", true, 15, "Sejarah",
      "Benar! Sumpah Pemuda menegaskan: Satu Nusa, Satu Bangsa, Satu Bahasa. Momen ini menyatukan pemuda dari berbagai suku dan daerah."),
    mc("Siapakah pendiri organisasi Taman Siswa?",
      ["HOS Cokroaminoto","Ki Hajar Dewantara","R.A. Kartini","Dewi Sartika"],1,20,"Sejarah",
      "Ki Hajar Dewantara mendirikan Taman Siswa (1922) di Yogyakarta — sekolah untuk rakyat pribumi. Ajarnya: Ing ngarso sung tulodo, ing madyo mangun karso, tut wuri handayani."),
    mc("Kerajaan Sriwijaya mencapai puncak kejayaan sebagai kerajaan?",
      ["Maritim berbasis perdagangan laut","Agraris berbasis pertanian","Militer berbasis penaklukan","Religius berbasis kuil"],0,20,"Sejarah",
      "Sriwijaya adalah kerajaan maritim terbesar di Asia Tenggara (abad 7-13). Dengan menguasai Selat Malaka, Sriwijaya mengontrol jalur perdagangan antara India, China, dan Arab."),
    mc("Apa nama perjanjian yang mengakhiri perang kemerdekaan Indonesia?",
      ["Perjanjian Renville","Perjanjian Linggarjati","Konferensi Meja Bundar","Perjanjian Roem-Royen"],2,20,"Sejarah",
      "Konferensi Meja Bundar (1949) di Den Haag menghasilkan pengakuan kedaulatan Indonesia oleh Belanda pada 27 Desember 1949."),
    mc("Pertempuran 10 November 1945 di Surabaya dipimpin oleh?",
      ["Bung Tomo","Soekarno","Jenderal Sudirman","Mohammad Hatta"],0,20,"Sejarah",
      "Bung Tomo (Sutomo) membakar semangat arek-arek Surabaya dengan orasi berapi-api di radio. Pertempuran ini begitu dahsyat sehingga 10 November diperingati sebagai Hari Pahlawan."),
    open("Sebutkan satu pahlawan nasional Indonesia yang paling menginspirasimu dan mengapa!",
      30,"Sejarah",
      "Indonesia memiliki banyak pahlawan luar biasa — dari Pangeran Diponegoro, Cut Nyak Dhien, R.A. Kartini, hingga Soekarno dan Hatta. Setiap pahlawan mengajarkan nilai-nilai berbeda: keberanian, keteguhan, emansipasi, atau kepemimpinan."),
  ],
};

// ── QUIZ 3: Matematika & Logika ────────────────────────────────────────────────
const mathQuiz: Quiz = {
  id: "math", title: "Matematika & Logika", icon: "🔢", color: "#059669",
  description: "Latih otak dengan soal aljabar, geometri, bilangan, dan pola matematika yang menarik",
  category: "Matematika", difficulty: "Sedang",
  questions: [
    mc("Jika 5x − 3 = 22, berapa nilai x?",
      ["4","5","6","7"],1,20,"Matematika",
      "5x − 3 = 22 → 5x = 25 → x = 5. Teknik dasar aljabar: isolasi variabel dengan memindahkan konstanta ke kanan, bagi kedua sisi dengan koefisien."),
    mc("Berapakah nilai 2¹⁰?",
      ["256","512","1.024","2.048"],2,15,"Matematika",
      "2¹⁰ = 1.024. Sangat penting di dunia komputer! 1 kilobyte = 1.024 bytes. Itulah kenapa kapasitas hard disk yang tertera selalu lebih besar dari yang terdeteksi di komputer."),
    mc("Luas lingkaran dengan jari-jari 7 cm (π ≈ 22/7) adalah?",
      ["44 cm²","88 cm²","154 cm²","308 cm²"],2,20,"Matematika",
      "L = πr² = (22/7) × 49 = 154 cm². Rumus ini ditemukan Archimedes lebih dari 2.000 tahun lalu!"),
    mc("Jumlah semua sudut dalam segi lima (pentagon) adalah?",
      ["360°","450°","540°","720°"],2,20,"Matematika",
      "Rumus: (n−2) × 180° = (5−2) × 180° = 540°. Sarang lebah berbentuk segi enam karena bentuk ini paling efisien: keliling terkecil untuk luas terbesar."),
    mc("√(16 × 25) = ?",
      ["16","20","25","40"],1,15,"Matematika",
      "√(16 × 25) = √400 = 20. Atau: √16 × √25 = 4 × 5 = 20. Sifat: √(a×b) = √a × √b."),
    mc("Deret Fibonacci: 1, 1, 2, 3, 5, 8, 13, ___?",
      ["18","20","21","24"],2,20,"Matematika",
      "Jawabannya 21 (8+13=21). Deret Fibonacci muncul di alam: spiral bunga matahari, kerang nautilus, susunan daun. Rasio antar bilangan mendekati 'Golden Ratio' (φ ≈ 1.618)!"),
    mc("Jika 30% dari suatu bilangan adalah 60, bilangan itu adalah?",
      ["120","150","180","200"],3,20,"Matematika",
      "30% × x = 60 → x = 60 ÷ 0.3 = 200. Cara cepat: 30% = 60, maka 10% = 20, sehingga 100% = 200."),
    mc("Segitiga siku-siku dengan kaki 5 dan 12, panjang hipotenusanya?",
      ["13","14","15","17"],0,20,"Matematika",
      "c² = 5² + 12² = 25 + 144 = 169, c = 13. Tripel Pythagoras: 5-12-13. Teorema Pythagoras dari navigasi GPS hingga arsitektur modern."),
    mc("Berapa bilangan prima antara 10 sampai 30?",
      ["4","5","6","7"],2,25,"Matematika",
      "Bilangan prima antara 10-30: 11, 13, 17, 19, 23, 29 = 6 bilangan. Bilangan prima adalah fondasi kriptografi modern — enkripsi yang mengamankan internet kita bergantung pada bilangan prima besar!"),
    mc("Jika sebuah kerucut memiliki jari-jari 3 dan tinggi 4, berapa volumenya? (π≈3.14)",
      ["37,68","12,56","25,12","50,24"],0,25,"Matematika",
      "V = (1/3)πr²h = (1/3) × 3.14 × 9 × 4 = (1/3) × 3.14 × 36 = 37.68 satuan kubik. Kerucut digunakan dalam teknik, arsitektur, dan bahkan desain makanan (cone es krim!)."),
    poll("Bagian matematika mana yang menurutmu paling berguna dalam kehidupan sehari-hari?",
      ["Statistik & probabilitas","Geometri & pengukuran","Aljabar & persamaan","Kalkulus & turunan"],
      30,"Matematika",
      "Semua cabang matematika penting! Statistik membantu kita membaca berita kritis. Geometri dipakai arsitek. Aljabar ada di setiap baris kode. Kalkulus mendasari fisika dan AI."),
    mc("0.999... (nol koma sembilan berulang) sama dengan?",
      ["Lebih kecil dari 1","Sama dengan 1","Lebih besar dari 0.999 tapi kurang dari 1","Tak terdefinisi"],1,25,"Matematika",
      "0.999... = 1 secara matematis! Bukti: x = 0.999..., maka 10x = 9.999..., 10x - x = 9, 9x = 9, x = 1. Ini salah satu fakta matematika yang mengejutkan — tidak ada 'celah' antara 0.999... dan 1."),
  ],
};

// ── QUIZ 4: Dunia Digital & Internet ───────────────────────────────────────────
const digitalQuiz: Quiz = {
  id: "digital", title: "Dunia Digital & Internet", icon: "💻", color: "#2563EB",
  description: "Teknologi, internet, pemrograman, keamanan siber, dan inovasi digital yang mengubah dunia",
  category: "Teknologi", difficulty: "Sedang",
  questions: [
    mc("Siapa yang menciptakan World Wide Web (WWW)?",
      ["Bill Gates","Steve Jobs","Tim Berners-Lee","Vint Cerf"],2,20,"Teknologi",
      "Tim Berners-Lee menciptakan WWW pada 1989 di CERN, Swiss. Yang luar biasa: ia tidak mempatenkan penemuannya agar internet bisa gratis untuk semua orang. Sebuah keputusan yang mengubah dunia!"),
    mc("HTTP singkatan dari?",
      ["HyperText Transfer Protocol","High Tech Transfer Protocol","Home Text Transfer Protocol","Hybrid Transfer Processing"],0,20,"Teknologi",
      "HTTP (HyperText Transfer Protocol) adalah fondasi data transfer di web. HTTPS menambahkan lapisan enkripsi SSL/TLS — itu sebabnya ada gembok kecil di address bar browser."),
    mc("1 Gigabyte (GB) setara dengan berapa Megabyte (MB) dalam sistem biner?",
      ["100 MB","512 MB","1.000 MB","1.024 MB"],3,20,"Teknologi",
      "1 GB = 1.024 MB dalam sistem biner. Namun produsen storage sering menggunakan 1 GB = 1.000 MB. Selisih itulah yang membuat hard disk 1 TB terlihat hanya 931 GB di Windows!"),
    mc("Bahasa pemrograman apa yang paling banyak digunakan untuk web front-end?",
      ["Python","Java","JavaScript","C++"],2,20,"Teknologi",
      "JavaScript adalah satu-satunya bahasa yang berjalan langsung di browser. Hampir setiap website menggunakannya. Node.js membawa JS ke server-side, React/Vue/Angular menjadikannya basis aplikasi web modern."),
    tf("Python adalah bahasa pemrograman yang dikompilasi (compiled language).", false, 20, "Teknologi",
      "Python adalah bahasa yang diinterpretasikan (interpreted). Kode dieksekusi baris per baris secara langsung. Python sangat populer untuk AI/ML, data science, dan otomasi."),
    mc("Apa itu 'open source'?",
      ["Software berbayar premium","Software pemerintah","Software yang kode sumbernya terbuka & bebas dimodifikasi","Software tanpa virus"],2,20,"Teknologi",
      "Open source = kode bisa dilihat, dimodifikasi, dibagikan siapa saja. Linux, Android, Python, Firefox, WordPress semuanya open source. Model ini mendorong inovasi kolaboratif yang luar biasa!"),
    mc("Apa yang dimaksud dengan Cloud Computing?",
      ["Komputasi menggunakan cuaca","Layanan komputasi via internet (server, storage, database)","Software berbasis cuaca","Jaringan komputer berbentuk awan"],1,20,"Teknologi",
      "Cloud computing = mengakses sumber daya komputasi via internet, bukan dari perangkat lokal. AWS (Amazon), Azure (Microsoft), GCP (Google) adalah provider terbesar."),
    mc("Apa itu enkripsi end-to-end (E2E)?",
      ["Data dienkripsi hanya di server","Data terenkripsi dari pengirim ke penerima, tidak bisa dibaca siapapun di tengah","Enkripsi yang menggunakan dua kunci","Enkripsi untuk website saja"],1,25,"Teknologi",
      "E2E encryption berarti hanya pengirim dan penerima yang bisa membaca pesan — bahkan platform pun tidak bisa. WhatsApp dan Signal menggunakannya."),
    mc("Apa yang dimaksud algoritma dalam pemrograman?",
      ["Jenis bahasa pemrograman","Langkah-langkah sistematis untuk menyelesaikan masalah","Database khusus","Framework JavaScript"],1,20,"Teknologi",
      "Algoritma adalah resep atau langkah-langkah logis untuk menyelesaikan masalah. Google Search, rekomendasi Netflix, feed Instagram — semua digerakkan algoritma canggih."),
    mc("RAM dalam komputer berfungsi sebagai?",
      ["Penyimpanan permanen file","Prosesor utama","Memori kerja sementara","Koneksi internet"],2,15,"Teknologi",
      "RAM (Random Access Memory) adalah memori sementara — data hilang saat komputer dimatikan. Makin besar RAM, makin banyak program yang bisa berjalan bersamaan tanpa lag."),
    mc("Apa itu 'phishing' dalam konteks keamanan siber?",
      ["Virus yang merusak hardware","Penipuan untuk mencuri informasi sensitif dengan menyamar sebagai pihak terpercaya","Serangan yang melambatkan server","Software mata-mata"],1,25,"Teknologi",
      "Phishing adalah penipuan via email/SMS/website palsu yang meniru lembaga terpercaya untuk mencuri password atau data kartu kredit. 80%+ serangan siber dimulai dari phishing!"),
    poll("Platform digital mana yang paling mengubah cara kamu belajar?",
      ["YouTube","Aplikasi belajar (Duolingo, Ruangguru, dll)","ChatGPT / AI","Google / Wikipedia"],
      30,"Teknologi",
      "AI seperti ChatGPT sedang merevolusi cara belajar. Studi menunjukkan AI bisa menjadi 'tutor personal' yang disesuaikan dengan kebutuhan tiap individu!"),
    mc("Apa kepanjangan dari AI?",
      ["Automated Interface","Artificial Intelligence","Advanced Internet","Automated Integration"],1,15,"Teknologi",
      "AI = Artificial Intelligence (Kecerdasan Buatan). AI belajar dari data untuk membuat keputusan. Machine learning adalah bagian dari AI. Deep learning (neural networks) adalah subset dari machine learning."),
  ],
};

// ── QUIZ 5: Kesehatan & Biologi ────────────────────────────────────────────────
const healthQuiz: Quiz = {
  id: "health", title: "Kesehatan & Biologi Tubuh", icon: "🧬", color: "#EC4899",
  description: "Rahasia tubuh manusia, kesehatan, nutrisi, dan ilmu biologi yang perlu kamu ketahui",
  category: "Kesehatan", difficulty: "Mudah",
  questions: [
    mc("Berapa jumlah tulang dalam tubuh manusia dewasa?",
      ["156","186","206","256"],2,20,"Kesehatan",
      "Tubuh manusia dewasa memiliki 206 tulang. Bayi lahir dengan 270-300 tulang — banyak yang menyatu saat tumbuh. Tulang kita terus beregenerasi: setiap 10 tahun, semua tulang kita sudah diperbarui!"),
    tf("Jantung manusia berdenyut rata-rata 100-120 kali per menit saat istirahat.", false, 15, "Kesehatan",
      "Detak normal saat istirahat: 60-100 kali/menit. Atlet terlatih bisa 40-60/menit karena jantungnya lebih efisien. Jantung berdetak ~100.000 kali/hari — memompa 7.000 liter darah!"),
    mc("Organ internal terbesar di tubuh manusia adalah?",
      ["Paru-paru","Usus besar","Hati (liver)","Lambung"],2,20,"Kesehatan",
      "Hati adalah organ internal terbesar (~1.5 kg). Ia melakukan 500+ fungsi: menyaring racun, memproduksi protein, menyimpan energi. Hati bisa beregenerasi — bahkan setelah kehilangan 70% jaringannya!"),
    mc("Vitamin D diproduksi tubuh kita dari?",
      ["Suplemen vitamin","Paparan sinar matahari pada kulit","Makanan manis","Olahraga intensif"],1,20,"Kesehatan",
      "Kulit mengubah sinar UV-B matahari menjadi Vitamin D3. Vitamin D penting untuk penyerapan kalsium, kekuatan tulang, dan sistem imun. 15-20 menit sinar pagi sudah cukup untuk produksi harian!"),
    mc("Berapa persen tubuh manusia terdiri dari air?",
      ["40-50%","55-65%","70-80%","85-95%"],1,20,"Kesehatan",
      "Tubuh manusia dewasa 55-65% adalah air. Otak 75% air, tulang 22%, darah 83%! Kehilangan 2% cairan sudah menurunkan konsentrasi dan performa."),
    tf("Antibiotik efektif untuk mengobati penyakit yang disebabkan virus seperti flu.", false, 15, "Kesehatan",
      "Antibiotik HANYA efektif untuk bakteri, tidak untuk virus! Minum antibiotik sembarangan menciptakan bakteri 'super' yang kebal antibiotik — ancaman kesehatan global yang serius."),
    mc("Apa fungsi utama sel darah putih (leukosit)?",
      ["Mengangkut oksigen ke seluruh tubuh","Membentuk bekuan darah","Melawan infeksi dan penyakit","Memproduksi energi"],2,20,"Kesehatan",
      "Leukosit adalah sistem pertahanan tubuh kita. Ada beberapa jenis: neutrofil (menyerang bakteri), limfosit (menghasilkan antibodi), makrofag (memakan partikel asing)."),
    mc("Organ manakah yang mengatur kadar gula darah?",
      ["Lambung","Hati","Pankreas","Ginjal"],2,20,"Kesehatan",
      "Pankreas menghasilkan insulin (menurunkan gula darah) dan glukagon (menaikkan). Pada diabetes tipe 1, sel pankreas rusak. Tipe 2: tubuh resisten terhadap insulin."),
    mc("Berapa lama rata-rata satu siklus tidur manusia?",
      ["30 menit","60 menit","90 menit","120 menit"],2,20,"Kesehatan",
      "Satu siklus tidur = ±90 menit, terdiri dari tidur ringan, tidur dalam (NREM), dan REM. Tidur 7-9 jam = 5-6 siklus penuh. Kurang tidur menurunkan imunitas, konsentrasi, bahkan mengubah ekspresi gen!"),
    poll("Kebiasaan sehat mana yang paling sulit kamu lakukan secara konsisten?",
      ["Olahraga rutin minimal 30 menit/hari","Tidur cukup 7-8 jam/malam","Makan sayur & buah setiap hari","Minum 8 gelas air/hari"],
      30,"Kesehatan",
      "Penelitian menunjukkan tidur cukup sering paling diabaikan di era digital. Namun olahraga rutin memberikan manfaat paling luas: kesehatan jantung, otak, mental, dan imunitas sekaligus."),
    rating("Seberapa puas kamu dengan pola hidup sehatmu saat ini? (1 = buruk, 5 = sangat baik)",
      20,"Kesehatan",
      "Kesehatan adalah investasi terbaik! Bahkan perubahan kecil yang konsisten — tidur cukup, minum air, jalan kaki 30 menit — memberikan dampak besar dalam jangka panjang. Tidak ada terlambat untuk mulai hidup sehat."),
  ],
};

// ── QUIZ 6: Bumi & Lingkungan ──────────────────────────────────────────────────
const envQuiz: Quiz = {
  id: "environment", title: "Bumi & Lingkungan Hidup", icon: "🌍", color: "#16A34A",
  description: "Perubahan iklim, ekosistem, energi terbarukan, dan tantangan lingkungan hidup kita",
  category: "Lingkungan", difficulty: "Sedang",
  questions: [
    mc("Gas rumah kaca utama yang dihasilkan aktivitas manusia adalah?",
      ["Nitrogen (N₂)","Oksigen (O₂)","Karbon Dioksida (CO₂)","Argon (Ar)"],2,20,"Lingkungan",
      "CO₂ dari pembakaran bahan bakar fosil adalah penyebab utama pemanasan global. Sejak revolusi industri, konsentrasi CO₂ naik dari 280 ppm ke 420 ppm — tertinggi dalam 3 JUTA tahun terakhir!"),
    tf("Hutan Amazon menghasilkan 20% oksigen bumi.", false, 20, "Lingkungan",
      "Ini mitos populer! Amazon memproduksi oksigen besar, tapi organisme di dalamnya juga mengkonsumsi jumlah yang sama. 50-80% oksigen bumi dihasilkan fitoplankton laut!"),
    mc("Plastik membutuhkan berapa lama untuk terurai di alam?",
      ["2-5 tahun","10-50 tahun","100-200 tahun","400-1.000 tahun"],3,20,"Lingkungan",
      "Plastik bisa bertahan 400-1.000 tahun! Ia tidak benar-benar terurai tapi menjadi mikroplastik yang masuk ke rantai makanan. Mikroplastik sudah ditemukan dalam darah manusia. Indonesia adalah penghasil sampah plastik laut terbesar ke-2 di dunia!"),
    mc("Terumbu karang mencakup berapa persen lautan tapi mendukung kehidupan laut dalam jumlah?",
      ["5% lautan, 50% kehidupan","10% lautan, 70% kehidupan","0.5% lautan, 25% kehidupan","2% lautan, 40% kehidupan"],2,25,"Lingkungan",
      "Terumbu karang hanya 0.5% lautan tapi menopang 25% semua spesies laut! Indonesia memiliki Coral Triangle terbesar di dunia. 50% terumbu karang sudah hilang sejak 1950."),
    mc("Sumber energi terbarukan yang tumbuh paling cepat saat ini adalah?",
      ["Energi nuklir","Energi air (hidroelektrik)","Energi surya (solar)","Energi angin"],2,20,"Lingkungan",
      "Energi surya adalah yang tumbuh paling cepat — biayanya turun 90% dalam 10 tahun terakhir! Solar kini lebih murah dari batu bara di banyak negara."),
    tf("Lapisan ozon di stratosfer melindungi bumi dari sinar ultraviolet berbahaya.", true, 15, "Lingkungan",
      "Benar! Ozon (O₃) menyerap 97-99% sinar UV-B berbahaya. Lubang ozon akibat CFC sudah membaik berkat Protokol Montreal 1987 — kisah sukses kerja sama lingkungan global!"),
    mc("Apa efek 'Urban Heat Island'?",
      ["Kota lebih dingin karena AC","Kota lebih panas dari pedesaan sekitarnya karena beton & aspal","Pulau terisolasi di tengah lautan","Efek rumah kaca khusus di kota"],1,25,"Lingkungan",
      "Urban Heat Island: kota bisa 1-7°C lebih panas dari pedesaan sekitarnya! Penyebab: beton & aspal menyerap panas, AC membuang panas ke luar. Solusi: lebih banyak taman kota dan green roof."),
    mc("Manakah dampak terbesar perubahan iklim yang sudah terasa hari ini?",
      ["Cuaca lebih panas dan ekstrem","Peningkatan biodiversitas","Lautan menjadi lebih segar","Gunung es bertambah"],0,20,"Lingkungan",
      "Cuaca ekstrem — gelombang panas, banjir, kekeringan, badai — semakin sering dan intens. Tahun 2023 adalah tahun terpanas dalam sejarah pencatatan."),
    poll("Langkah apa yang paling siap kamu lakukan untuk mengurangi dampak lingkungan?",
      ["Mengurangi plastik sekali pakai","Hemat energi di rumah","Lebih banyak naik transportasi umum","Mengurangi konsumsi daging"],
      30,"Lingkungan",
      "Semua pilihan berdampak! Penelitian menunjukkan pola makan (kurangi daging merah) memiliki dampak karbon terbesar secara individual. Namun perubahan kebijakan sistemik jauh lebih berdampak dari pilihan individual."),
    mc("Indonesia memiliki berapa persen hutan hujan tropis dunia?",
      ["2%","5%","10%","15%"],2,20,"Lingkungan",
      "Indonesia memiliki ~10% hutan tropis dunia — terbesar ketiga setelah Brazil dan Kongo. Hutan ini menyimpan miliaran ton karbon dan menjadi rumah 10-15% spesies dunia."),
    open("Apa satu tindakan nyata yang akan kamu lakukan minggu ini untuk menjaga lingkungan?",
      30,"Lingkungan",
      "Setiap tindakan kecil berarti! Membawa tas belanja sendiri, mematikan lampu saat tidak digunakan, mengurangi penggunaan sedotan plastik — semua itu berkontribusi. Perubahan besar dimulai dari kebiasaan kecil setiap individu."),
  ],
};

// ── QUIZ 7: Pengetahuan Umum & Dunia ──────────────────────────────────────────
const generalQuiz: Quiz = {
  id: "general", title: "Pengetahuan Umum & Dunia", icon: "🌐", color: "#7C3AED",
  description: "Geografi, seni, budaya, rekor dunia, dan fakta menarik yang memperluas wawasanmu",
  category: "Pengetahuan", difficulty: "Mudah",
  questions: [
    mc("Berapa banyak bahasa yang ada di dunia saat ini?",
      ["Sekitar 1.000","Sekitar 3.000","Sekitar 7.000","Lebih dari 12.000"],2,20,"Pengetahuan",
      "Ada ~7.000 bahasa di dunia! 40% di antaranya terancam punah. Indonesia memiliki 700+ bahasa daerah — kekayaan linguistik yang luar biasa."),
    tf("Tembok Besar China bisa dilihat dari luar angkasa dengan mata telanjang.", false, 20, "Pengetahuan",
      "Ini mitos! Tembok Besar hanya selebar 5-8 meter — terlalu tipis untuk dilihat dari luar angkasa tanpa alat bantu. Mitos ini sudah beredar lebih dari 300 tahun!"),
    mc("Negara manakah yang memiliki luas wilayah terbesar di dunia?",
      ["Kanada","China","Amerika Serikat","Rusia"],3,15,"Pengetahuan",
      "Rusia adalah negara terluas di dunia (17 juta km²) — mencakup 11% daratan bumi dan 11 zona waktu! Populasinya 'hanya' 144 juta."),
    mc("Piramida Giza dibangun sekitar tahun?",
      ["1.500 SM","2.560 SM","4.000 SM","500 SM"],1,20,"Pengetahuan",
      "Piramida Giza dibangun 2.560-2.540 SM oleh Firaun Khufu. Selama 3.800 tahun, ini adalah bangunan tertinggi di dunia (146 m)."),
    mc("Olimpiade modern pertama diadakan di?",
      ["London, 1880","Paris, 1900","Athena, 1896","Berlin, 1904"],2,20,"Pengetahuan",
      "Olimpiade modern pertama: Athena 1896, digagas Pierre de Coubertin. Ada 14 negara, 241 atlet (semua laki-laki). Olimpiade 2024 di Paris diikuti 200+ negara."),
    mc("Bahasa Inggris menjadi bahasa resmi di berapa negara?",
      ["27 negara","67 negara","42 negara","100+ negara"],1,20,"Pengetahuan",
      "Bahasa Inggris adalah bahasa resmi di 67 negara — paling banyak di dunia. Sebagai bahasa kedua, digunakan lebih dari 1,5 miliar orang."),
    tf("Gunung Everest adalah gunung tertinggi jika diukur dari inti bumi.", false, 20, "Pengetahuan",
      "Gunung Chimborazo di Ekuador lebih tinggi dari inti bumi! Bumi mengembung di ekuator. Everest tertinggi dari 'permukaan laut' — keduanya benar dengan definisi berbeda."),
    mc("Berapa jumlah negara anggota PBB saat ini?",
      ["172","185","193","210"],2,15,"Pengetahuan",
      "Ada 193 negara anggota PBB + 2 pengamat (Vatikan & Palestina). PBB didirikan 1945 dengan hanya 51 negara anggota pertama."),
    poll("Menurut kamu, kemampuan apa yang paling penting untuk generasi masa depan?",
      ["Literasi digital & AI","Kreativitas & berpikir kritis","Kecerdasan emosional & empati","Kemampuan kolaborasi lintas budaya"],
      30,"Pengetahuan",
      "Laporan World Economic Forum: di era AI, kemampuan yang TIDAK bisa digantikan mesin adalah yang paling berharga. Kreativitas, empati, pemikiran kritis — semua 'soft skills' justru menjadi 'hard skills' di masa depan!"),
    mc("Manakah salah satu sumber listrik terbersih di dunia?",
      ["Pembangkit batu bara","Energi nuklir","Gas alam","Minyak bumi"],1,20,"Pengetahuan",
      "Energi nuklir menghasilkan emisi karbon paling sedikit per kWh — bahkan lebih rendah dari solar dan angin jika dihitung total siklus produksi."),
    mc("Gunung berapi terbesar di tata surya ada di planet mana?",
      ["Bumi","Merkurius","Mars","Venus"],2,20,"Pengetahuan",
      "Olympus Mons di Mars adalah gunung berapi terbesar di tata surya — tingginya 22 km (hampir 3x Everest!) dan lebarnya 600 km. Meski Mars lebih kecil dari Bumi, gravitasinya yang lebih lemah membuat gunung lebih tinggi bisa terbentuk."),
  ],
};

// ── QUIZ 8: Ekonomi & Bisnis ────────────────────────────────────────────────────
const economicsQuiz: Quiz = {
  id: "economics", title: "Ekonomi, Bisnis & Keuangan", icon: "📈", color: "#CA8A04",
  description: "Pahami cara kerja ekonomi, investasi, bisnis global, dan literasi keuangan yang wajib kamu tahu",
  category: "Ekonomi", difficulty: "Sedang",
  questions: [
    mc("Apa yang dimaksud dengan inflasi?",
      ["Penurunan nilai barang secara umum","Kenaikan nilai mata uang","Kenaikan harga barang & jasa secara umum","Penurunan suku bunga bank"],2,20,"Ekonomi",
      "Inflasi = kenaikan harga barang secara umum dari waktu ke waktu. Inflasi rendah (2-3%) itu sehat — mendorong orang berinvestasi. Hiperinflasi seperti Zimbabwe (2008) membuat uang tidak berharga."),
    mc("GDP (Gross Domestic Product / PDB) mengukur?",
      ["Total utang negara","Total nilai barang & jasa yang diproduksi suatu negara dalam setahun","Total tabungan masyarakat","Total ekspor dikurangi impor"],1,20,"Ekonomi",
      "GDP adalah ukuran total 'kue ekonomi' suatu negara. Amerika Serikat GDP terbesar (~$27 triliun). Indonesia berada di urutan ke-16 (~$1.4 triliun)."),
    tf("Bursa Efek Indonesia (BEI) berlokasi di Surabaya.", false, 15, "Ekonomi",
      "BEI berlokasi di Jakarta. BEI adalah gabungan Bursa Efek Jakarta (BEJ) + Bursa Efek Surabaya (BES) yang merger pada 2007. BEI mencatatkan 900+ perusahaan."),
    mc("Apa itu 'compound interest' (bunga majemuk)?",
      ["Bunga dihitung hanya dari modal awal","Bunga yang dihitung dari modal + bunga yang sudah terakumulasi","Bunga tetap setiap tahun","Bunga dari pinjaman bank"],1,25,"Ekonomi",
      "Einstein konon menyebut bunga majemuk sebagai 'keajaiban dunia ke-8'. Jika kamu investasi Rp 10 juta dengan return 10%/tahun selama 30 tahun, akan menjadi Rp 174 juta!"),
    mc("Apa yang dimaksud dengan 'diversifikasi' dalam investasi?",
      ["Investasi semua di satu aset terbaik","Menyebar investasi ke berbagai aset berbeda untuk kurangi risiko","Investasi di luar negeri saja","Selalu menjual saat harga turun"],1,25,"Ekonomi",
      "'Jangan taruh semua telur dalam satu keranjang.' Diversifikasi = spread investasi ke saham, obligasi, properti, emas, dll. Ketika satu turun, yang lain mungkin naik."),
    mc("Siapa pendiri Amazon?",
      ["Bill Gates","Jeff Bezos","Elon Musk","Mark Zuckerberg"],1,15,"Ekonomi",
      "Jeff Bezos mendirikan Amazon pada 1994 dari garasi di Seattle, awalnya toko buku online. Kini Amazon menguasai e-commerce global, cloud computing (AWS), dan streaming (Prime Video)."),
    mc("Apa itu 'startup unicorn'?",
      ["Startup teknologi apa saja","Startup dengan valuasi lebih dari $1 miliar sebelum IPO","Startup yang sudah IPO (go public)","Startup yang didukung pemerintah"],1,20,"Ekonomi",
      "Unicorn = startup valuasi $1 miliar+. Indonesia memiliki beberapa unicorn: GoTo (Gojek-Tokopedia), Traveloka, OVO, Bukalapak. Gojek adalah unicorn pertama di Asia Tenggara!"),
    poll("Investasi apa yang menurutmu paling tepat untuk mulai di usia muda?",
      ["Saham / reksa dana","Properti / tanah","Kripto / aset digital","Investasi pada diri sendiri (pendidikan, skill)"],
      30,"Ekonomi",
      "Para ahli keuangan hampir sepakat: investasi terbaik untuk anak muda adalah pada diri sendiri — skill dan pengetahuan yang meningkatkan penghasilan seumur hidup. Setelah itu, mulai investasi finansial sesegera mungkin."),
    mc("Apa itu 'resesi' dalam ekonomi?",
      ["Pertumbuhan ekonomi yang sangat cepat","Dua kuartal berturut-turut penurunan GDP","Tingkat inflasi yang sangat tinggi","Pengangguran di bawah 5%"],1,20,"Ekonomi",
      "Resesi = dua kuartal berturut-turut (6 bulan) GDP mengalami penurunan. Tanda-tanda: pengangguran naik, konsumsi turun, investasi berkurang. Resesi terburuk abad ini: Krisis Keuangan Global 2008-2009."),
    rating("Seberapa percaya diri kamu dalam mengelola keuangan pribadi? (1 = belum percaya diri, 5 = sangat percaya diri)",
      20,"Ekonomi",
      "Literasi keuangan adalah keterampilan hidup yang sangat penting tapi jarang diajarkan di sekolah. Mulai dari yang sederhana: catat pemasukan dan pengeluaran, pisahkan tabungan, pahami perbedaan aset dan liabilitas."),
  ],
};

// ── QUIZ 9: Bahasa & Sastra Indonesia ─────────────────────────────────────────
const bahasaQuiz: Quiz = {
  id: "bahasa", title: "Bahasa & Sastra Indonesia", icon: "📖", color: "#0891B2",
  description: "Kekayaan bahasa Indonesia, karya sastra, kosakata, dan linguistik yang perlu diketahui",
  category: "Bahasa", difficulty: "Mudah",
  questions: [
    mc("Siapa pengarang novel 'Laskar Pelangi'?",
      ["Pramoedya A. Toer","Ayu Utami","Andrea Hirata","Sutan Takdir Alisjahbana"],2,20,"Bahasa",
      "Andrea Hirata menulis Laskar Pelangi berdasarkan pengalaman nyata masa kecilnya di Belitung. Novel ini terjual jutaan kopi dan diadaptasi menjadi film sukses."),
    tf("Bahasa Indonesia menggunakan sistem penulisan Latin.", true, 15, "Bahasa",
      "Benar! Bahasa Indonesia menggunakan abjad Latin sejak era kolonial. Sebelumnya, berbagai suku di Nusantara menggunakan aksara lokal: Jawa, Bali, Bugis-Makassar, Sunda, dll."),
    mc("Dalam EYD, penulisan yang benar adalah?",
      ["di rumah","dirumah","Di Rumah","diRumah"],0,20,"Bahasa",
      "'Di' sebagai kata depan (preposisi) ditulis terpisah: 'di rumah', 'di sana'. 'Di' sebagai awalan (prefiks) ditulis serangkai: 'dibeli', 'dimakan'. Cara membedakan: jika 'di' bisa diganti 'ke' atau 'dari', maka ditulis terpisah."),
    mc("Puisi 'Aku' yang terkenal ditulis oleh?",
      ["Chairil Anwar","WS Rendra","Sapardi Djoko Damono","Taufik Ismail"],0,20,"Bahasa",
      "Chairil Anwar menulis 'Aku' (1943) — salah satu puisi terpenting dalam sastra Indonesia modern. Baris 'Aku mau hidup seribu tahun lagi!' menggambarkan semangat hidup yang kuat. Ia meninggal muda di 26 tahun."),
    tf("Bahasa Indonesia memiliki lebih dari 700 bahasa daerah.", true, 15, "Bahasa",
      "Benar! Indonesia adalah negara dengan keragaman bahasa terbesar kedua di dunia setelah Papua Nugini. Lebih dari 700 bahasa daerah hidup berdampingan."),
    mc("Apa itu 'pantun' dalam sastra Melayu-Indonesia?",
      ["Cerita rakyat panjang","Puisi dengan pola AB-AB, terdiri dari sampiran dan isi","Lagu tradisional Jawa","Drama tradisional Betawi"],1,20,"Bahasa",
      "Pantun adalah puisi lama dengan pola 4 baris: 2 baris sampiran dan 2 baris isi. Rima: AB-AB. UNESCO mengakui pantun sebagai Warisan Budaya Tak Benda!"),
    mc("Kata 'selfie' diserap ke dalam bahasa Indonesia menjadi?",
      ["swafoto","foto diri","gambar sendiri","potret mandiri"],0,20,"Bahasa",
      "Swafoto adalah padanan resmi 'selfie' dalam KBBI. BPPB aktif menciptakan padanan: unggah (upload), unduh (download), gawai (gadget), surel (email), warganet (netizen)."),
    mc("Peribahasa 'Air beriak tanda tak dalam' bermakna?",
      ["Orang yang banyak bicara biasanya tidak berilmu","Air yang dalam selalu beriak","Jangan menilai dari penampilan","Tenang itu selalu baik"],0,20,"Bahasa",
      "Peribahasa ini menggambarkan orang yang banyak bicara atau suka pamer biasanya tidak memiliki ilmu yang dalam. Kebalikannya: orang berpengetahuan luas cenderung lebih rendah hati."),
    mc("Kata 'mumpung' dalam bahasa Indonesia artinya?",
      ["setelah","sebelum","selagi/selama masih ada kesempatan","meskipun"],2,20,"Bahasa",
      "Mumpung berarti 'selagi masih ada kesempatan'. Contoh: 'Mumpung masih muda, belajarlah sebanyak-banyaknya.' Ada nilai kearifan lokal tentang memanfaatkan waktu dan kesempatan."),
    open("Tuliskan satu kata bahasa daerah atau bahasa Indonesia unik yang kamu suka, beserta artinya!",
      30,"Bahasa",
      "Bahasa Indonesia kaya akan kata-kata indah yang tak terterjemahkan: 'jayus' (lelucon yang tidak lucu tapi jadi lucu), 'gemas' (ingin mencubit karena terlalu menggemaskan), 'baper' (terbawa perasaan). Indonesia punya kata-kata yang tak ada padanannya di bahasa lain!"),
    rating("Seberapa percaya diri kamu dalam kemampuan menulis dalam bahasa Indonesia? (1 = kurang percaya diri, 5 = sangat percaya diri)",
      20,"Bahasa",
      "Kemampuan menulis bisa terus diasah! Mulai dari menulis jurnal harian, blog, atau caption media sosial yang bermakna. Para penulis besar pun mulai dari tulisan sederhana."),
    mc("Karya sastra Pramoedya Ananta Toer yang paling terkenal adalah?",
      ["Sitti Nurbaya","Salah Asuhan","Tetralogi Buru (Bumi Manusia, dll)","Atheis"],2,25,"Bahasa",
      "Tetralogi Buru (Bumi Manusia, Anak Semua Bangsa, Jejak Langkah, Rumah Kaca) ditulis Pramoedya saat dipenjara di Pulau Buru. Dianggap sebagai karya terbaik sastra Indonesia, diterjemahkan ke 40+ bahasa. Pram adalah calon terkuat Nobel Sastra dari Indonesia."),
  ],
};

// ── QUIZ 10: Olahraga & Rekor Dunia ───────────────────────────────────────────
const sportsQuiz: Quiz = {
  id: "sports", title: "Olahraga & Rekor Dunia", icon: "⚽", color: "#EA580C",
  description: "Olimpiade, rekor dunia, legenda olahraga, dan fakta menarik dari dunia sport internasional",
  category: "Olahraga", difficulty: "Mudah",
  questions: [
    mc("Negara mana yang paling banyak memenangkan Piala Dunia FIFA?",
      ["Argentina","Jerman","Italia","Brasil"],3,20,"Olahraga",
      "Brasil memimpin dengan 5 gelar Piala Dunia (1958, 1962, 1970, 1994, 2002). Jerman/Jerman Barat: 4 gelar. Italia: 4 gelar. Argentina: 3 gelar (terakhir 2022, momen bersejarah Messi!)."),
    tf("Olimpiade modern pertama diadakan di Yunani, Athena.", true, 15, "Olahraga",
      "Benar! Olimpiade modern pertama diadakan di Athena, 1896, digagas oleh Baron Pierre de Coubertin. Ada 14 negara dan 241 atlet (semua laki-laki)."),
    mc("Rekor dunia lari 100m putra dipegang oleh?",
      ["Usain Bolt (9.58 detik)","Erriyon Knighton (9.59 detik)","Noah Lyles (9.61 detik)","Tyson Gay (9.69 detik)"],0,20,"Olahraga",
      "Usain Bolt mencetak 9.58 detik di Kejuaraan Dunia Berlin 2009 — rekor yang masih berdiri! Rata-rata kecepatan puncaknya 44.72 km/jam. Bolt juga memegang rekor 200m (19.19 detik)."),
    mc("Olahraga apa yang memiliki turnamen Grand Slam?",
      ["Bola basket","Tenis","Golf","Bola voli"],1,15,"Olahraga",
      "Grand Slam Tenis terdiri dari 4 turnamen: Australian Open, Roland Garros, Wimbledon, US Open. Novak Djokovic saat ini terbanyak memenangkan Grand Slam (24+)."),
    mc("Indonesia pertama kali meraih medali emas Olimpiade di cabang olahraga apa?",
      ["Sepak bola","Bulutangkis","Renang","Panahan"],1,20,"Olahraga",
      "Bulutangkis memberi Indonesia medali emas pertama di Olimpiade Barcelona 1992 — Susi Susanti (putri tunggal) dan Alan Budikusuma (putra tunggal) sama-sama meraih emas!"),
    tf("Renang adalah olahraga Olimpiade yang ada sejak edisi pertama tahun 1896.", true, 15, "Olahraga",
      "Benar! Renang sudah ada sejak Olimpiade Athena 1896. Michael Phelps (AS) adalah perenang paling berhias di sejarah Olimpiade dengan 23 emas dan 28 total medali!"),
    mc("Formula 1: Constructor Championship terbanyak dipegang oleh tim apa?",
      ["McLaren","Williams","Ferrari","Mercedes"],2,20,"Olahraga",
      "Ferrari memegang rekor constructor championship terbanyak (16 gelar) hingga 2024. Mercedes mendominasi era hybrid 2014-2021 dengan 8 gelar berturut-turut."),
    mc("Asian Games pertama kali diadakan di kota mana?",
      ["Tokyo, Jepang","Bangkok, Thailand","New Delhi, India","Manila, Filipina"],2,20,"Olahraga",
      "Asian Games pertama diadakan di New Delhi, India pada 1951. Indonesia pertama kali menjadi tuan rumah Asian Games pada 1962 di Jakarta."),
    poll("Olahraga apa yang paling sering kamu tonton atau ikuti?",
      ["Sepak bola / Futsal","Bulutangkis / Tenis","Basket / Voli","E-Sports / Gaming"],
      30,"Olahraga",
      "E-Sports berkembang sangat pesat — kini sudah jadi cabang olahraga resmi di SEA Games! Indonesia memiliki banyak atlet e-sports berprestasi."),
    rating("Seberapa aktif kamu berolahraga dalam seminggu? (1 = hampir tidak pernah, 5 = setiap hari)",
      20,"Olahraga",
      "WHO merekomendasikan orang dewasa untuk aktif bergerak minimal 150 menit/minggu. Olahraga rutin terbukti meningkatkan kesehatan jantung, otak, mood, dan umur panjang. Mulai dari yang kecil!"),
    mc("Siapa yang memegang rekor gol terbanyak dalam sejarah sepak bola internasional putra?",
      ["Lionel Messi","Cristiano Ronaldo","Miroslav Klose","Romário"],1,20,"Olahraga",
      "Cristiano Ronaldo memegang rekor gol terbanyak internasional putra dengan 130+ gol untuk Portugal. Messi mengikutinya dengan dekat. Keduanya sering disebut sebagai pemain terbaik sepanjang masa (GOAT debate!)."),
    mc("Di Olimpiade, medali emas benar-benar terbuat dari emas murni?",
      ["Ya, 100% emas murni","Tidak, terbuat dari perak berlapis tipis emas","Tidak, terbuat dari emas 70%","Ya tapi hanya pada Olimpiade modern awal"],1,20,"Olahraga",
      "Medali emas Olimpiade modern terbuat dari perak murni (sterling silver) berlapis tipis emas minimal 6 gram! Medali emas murni terakhir diberikan di Olimpiade Stockholm 1912. Nilai intrinsik medali emas sekitar $800-1.000."),
  ],
};

// ── QUIZ 11: Tes IQ & Logika ──────────────────────────────────────────────────
const iqQuiz: Quiz = {
  id: "iq", title: "Tes IQ & Logika", icon: "🧠", color: "#7C3AED",
  description: "Uji kemampuan penalaran, pola angka, logika verbal, dan kecerdasan analitis kamu",
  category: "Logika", difficulty: "Sulit",
  questions: [
    mc("Angka berikutnya dalam barisan: 2, 4, 8, 16, 32, ___?",
      ["48","64","60","56"],1,20,"Logika",
      "Setiap angka dikali 2. Pola: ×2 berturut-turut (barisan geometri dengan rasio 2). 32 × 2 = 64. Barisan ini adalah pangkat dua: 2¹, 2², 2³, 2⁴, 2⁵, 2⁶."),
    mc("Angka berikutnya dalam barisan: 1, 3, 6, 10, 15, ___?",
      ["18","20","21","22"],2,20,"Logika",
      "Ini adalah bilangan segitiga (triangular numbers)! Selisihnya: +2, +3, +4, +5, +6. Jadi 15 + 6 = 21. Rumus: n(n+1)/2. Bilangan segitiga muncul di susunan bola biliar, koin, dll."),
    mc("Yang TIDAK satu kelompok: Sapi, Kambing, Kuda, Lumba-lumba",
      ["Sapi","Kambing","Kuda","Lumba-lumba"],3,20,"Logika",
      "Sapi, Kambing, dan Kuda adalah hewan darat. Lumba-lumba adalah mamalia laut. Pola kategorisasi adalah kunci IQ — kemampuan melihat persamaan dan perbedaan."),
    mc("Dokter : Pasien = Guru : ___",
      ["Buku","Murid","Sekolah","Kelas"],1,20,"Logika",
      "Analogi relasi profesional: Dokter melayani Pasien → Guru mendidik Murid. Soal analogi mengukur kemampuan abstraksi — melihat hubungan antar konsep yang berbeda."),
    mc("Semua A adalah B. Semua B adalah C. Kesimpulan yang PASTI benar:",
      ["Semua B adalah A","Semua C adalah A","Semua A adalah C","Semua C adalah B"],2,20,"Logika",
      "Silogisme klasik Aristoteles! Jika A ⊆ B dan B ⊆ C, maka A ⊆ C. Contoh: Semua kucing adalah mamalia, semua mamalia bernapas → semua kucing bernapas. Logika deduktif ini adalah fondasi matematika dan filosofi."),
    mc("Barisan: 100, 91, 82, 73, ___?",
      ["54","64","60","65"],1,20,"Logika",
      "Selisih tetap: dikurangi 9 setiap langkah (barisan aritmetika). 73 − 9 = 64. Kemampuan mendeteksi pola aritmetika sederhana adalah indikator kecerdasan kuantitatif."),
    mc("Deret Fibonacci: 1, 1, 2, 3, 5, 8, ___?",
      ["11","13","12","14"],1,15,"Logika",
      "Setiap angka adalah jumlah dua angka sebelumnya: 5 + 8 = 13. Fibonacci ada di mana-mana di alam: spiral bunga, cangkang siput, susunan daun. Rasio antar bilangan mendekati phi (φ ≈ 1.618) — Rasio Emas!"),
    mc("Jika 2+3=10, 7+2=63, 6+5=66, maka 8+4=?",
      ["48","96","84","80"],1,25,"Logika",
      "Polanya: a + b = a × (a + b). Verifikasi: 2×(2+3)=2×5=10 ✓, 7×(7+2)=7×9=63 ✓, 6×(6+5)=6×11=66 ✓. Jadi 8×(8+4)=8×12=96. Soal ini mengukur kemampuan menemukan pola tersembunyi — kunci kreativitas."),
    mc("3, 9, 27, ___, 243",
      ["54","72","81","90"],2,20,"Logika",
      "Pola: dikali 3 setiap langkah (pangkat tiga: 3¹, 3², 3³, 3⁴, 3⁵). 27 × 3 = 81. Pengenalan barisan geometri mengukur kemampuan penalaran eksponensial yang sangat berguna di sains dan bisnis."),
    mc("Yang BUKAN warna: Biru, Merah, Kuning, Persegi",
      ["Biru","Merah","Kuning","Persegi"],3,15,"Logika",
      "Biru, Merah, Kuning adalah warna primer. Persegi adalah bentuk geometri, bukan warna. Kategorisasi konseptual — kemampuan mengklasifikasikan hal berdasarkan atribut — adalah inti dari kecerdasan."),
    mc("Jam menunjukkan pukul 3:00. Sudut antara jarum jam dan jarum menit adalah?",
      ["60°","45°","90°","120°"],2,20,"Logika",
      "Pada pukul 3:00: jarum menit di 12 (0°) dan jarum jam di 3 (90° dari 12). Sudut antara keduanya = 90°. Penalaran spasial dan geometri adalah komponen utama tes IQ klasik."),
    mc("Jika 5 orang butuh 5 menit untuk menggali 5 lubang, berapa menit yang dibutuhkan 100 orang untuk menggali 100 lubang?",
      ["100 menit","10 menit","5 menit","1 menit"],2,25,"Logika",
      "Kecepatan: 5 orang × 5 menit = 5 lubang → 1 orang menggali 1 lubang dalam 5 menit. Dengan 100 orang bekerja paralel, 100 lubang tetap selesai dalam 5 menit! Ini soal proporsi dan pemikiran paralel."),
    mc("Ayah dari ibu saya adalah ___ saya",
      ["Paman","Om","Kakek","Sepupu"],2,15,"Logika",
      "Ibu saya → Ayah ibu saya = Kakek saya (Kakek dari pihak ibu). Penalaran relasional dan hubungan kekeluargaan mengukur kemampuan membangun 'peta mental' hubungan antar entitas."),
    mc("Pagi : Siang = Musim Semi : ___",
      ["Musim Dingin","Musim Gugur","Musim Panas","Musim Hujan"],2,20,"Logika",
      "Analogi urutan waktu: Pagi mendahului Siang → Musim Semi mendahului Musim Panas. Kemampuan analogi mengukur pemikiran relasional dan abstraksi — salah satu prediktor terkuat kecerdasan umum (g-factor)."),
    mc("Angka yang tepat: 2, 6, 12, 20, 30, ___?",
      ["40","42","44","48"],1,25,"Logika",
      "Selisihnya: +4, +6, +8, +10, +12 (bertambah 2 setiap kali). 30 + 12 = 42. Alternatif: n(n+1) untuk n=1,2,3,4,5,6: 2,6,12,20,30,42. Barisan polinom derajat 2 yang elegan!"),
    rating("Seberapa menantang tes IQ ini menurutmu? (1 = terlalu mudah, 5 = sangat menantang)",
      15,"Logika",
      "Tes IQ tradisional mengukur 'g-factor' (kecerdasan umum). Namun Howard Gardner mengusulkan teori Multiple Intelligences: ada 9 jenis kecerdasan berbeda! Kamu mungkin jenius di bidang yang tidak diukur tes ini."),
  ],
};

// ── QUIZ 12: Psikologi & Perilaku Manusia ─────────────────────────────────────
const psychologyQuiz: Quiz = {
  id: "psychology", title: "Psikologi & Pikiran Manusia", icon: "🧩", color: "#8B5CF6",
  description: "Bias kognitif, motivasi, kepribadian, persepsi, dan rahasia cara kerja pikiran kita",
  category: "Psikologi", difficulty: "Sedang",
  questions: [
    mc("Apa itu 'Efek Dunning-Kruger'?",
      ["Orang pintar sering meremehkan kemampuannya","Orang dengan kemampuan rendah cenderung melebih-lebihkan kompetensinya","Bias terhadap informasi pertama yang diterima","Kecenderungan mengikuti pendapat mayoritas"],1,25,"Psikologi",
      "Dunning-Kruger effect: orang yang tidak kompeten sering tidak tahu bahwa mereka tidak kompeten ('blind spot'). Sebaliknya, ahli sejati sering meragukan dirinya sendiri. Kuncinya: metacognition — kemampuan menilai kemampuan diri sendiri."),
    mc("'Confirmation bias' adalah kecenderungan untuk?",
      ["Selalu memilih jawaban pertama","Mencari & mempercayai informasi yang mendukung keyakinan yang sudah ada","Mengikuti pendapat orang tua","Takut pada hal baru"],1,20,"Psikologi",
      "Confirmation bias adalah bias kognitif paling berbahaya. Kita cenderung mencari berita yang mendukung pandangan kita dan mengabaikan yang bertentangan. Media sosial memperparah ini dengan 'filter bubble'. Solusi: aktif cari perspektif berlawanan!"),
    mc("Eksperimen Milgram (1960-an) membuktikan bahwa?",
      ["Manusia pada dasarnya baik","Banyak orang bersedia menyakiti orang lain jika diperintah otoritas","Memori manusia sangat akurat","Anak-anak lebih jujur dari orang dewasa"],1,25,"Psikologi",
      "Eksperimen Milgram mengejutkan dunia: 65% peserta bersedia memberikan 'sengatan listrik' berbahaya pada orang lain karena diperintah 'ilmuwan'. Ini menjelaskan bagaimana kekejaman terjadi dalam perang dan rezim otoriter."),
    mc("Teori 'Maslow's Hierarchy of Needs' menyatakan bahwa kebutuhan manusia?",
      ["Semua kebutuhan sama pentingnya","Bertingkat dari yang paling dasar (fisiologis) ke paling tinggi (aktualisasi diri)","Hanya ada 3 tingkatan","Kebutuhan spiritual adalah yang paling mendasar"],1,20,"Psikologi",
      "Maslow: Fisiologis (makan, tidur) → Keamanan → Kasih sayang → Harga diri → Aktualisasi diri. Kebutuhan dasar harus terpenuhi sebelum manusia bisa fokus pada pertumbuhan diri. Model ini masih relevan dalam manajemen, pendidikan, dan terapi."),
    mc("Apa itu 'Growth Mindset' menurut Carol Dweck?",
      ["Keyakinan bahwa kecerdasan dan kemampuan bisa berkembang melalui usaha","Keyakinan bahwa kecerdasan adalah tetap sejak lahir","Fokus pada pertumbuhan ekonomi","Mindfulness dan meditasi"],0,20,"Psikologi",
      "Growth mindset vs Fixed mindset: orang dengan growth mindset melihat tantangan sebagai peluang belajar, bukan ancaman. Penelitian Dweck membuktikan mindset ini berdampak besar pada prestasi akademik dan karir!"),
    tf("Manusia hanya menggunakan 10% dari kapasitas otaknya.", false, 15, "Psikologi",
      "Ini mitos populer! Scan otak (fMRI) menunjukkan hampir semua area otak aktif, meski pada waktu berbeda. Otak mengonsumsi 20% energi tubuh — evolusi tidak akan mempertahankan organ sebesar itu jika 90%-nya tidak terpakai!"),
    mc("Dalam psikologi, 'flow state' (kondisi flow) adalah?",
      ["Kondisi tidur paling dalam","Keadaan fokus optimal saat seseorang tenggelam dalam aktivitas yang menantang","Teknik meditasi Zen","Fase pertama tidur"],1,20,"Psikologi",
      "Mihaly Csikszentmihalyi menemukan 'flow': kondisi psikologis optimal di mana kita sangat fokus, waktu terasa terbang, dan kita menikmati aktivitas sepenuhnya. Terjadi saat tantangan seimbang dengan kemampuan."),
    mc("Apa yang dimaksud 'Placebo Effect'?",
      ["Efek samping obat palsu","Perbaikan kondisi karena keyakinan bahwa sedang mendapat pengobatan efektif","Efek relaksasi dari meditasi","Peningkatan performa karena kafein"],1,20,"Psikologi",
      "Placebo effect adalah bukti kuat koneksi pikiran-tubuh! Pasien yang diberi pil gula namun diyakini obat nyata sering mengalami perbaikan nyata. Ini mengakibatkan bahwa ekspektasi dan keyakinan secara harfiah mengubah biologi tubuh."),
    poll("Dari teori kepribadian MBTI, tipe manakah yang paling menggambarkan dirimu?",
      ["Introvert (suka sendiri, energi dari dalam)","Ekstrovert (suka sosial, energi dari luar)","Ambivert (campuran keduanya)","Belum tahu / Berubah-ubah"],
      30,"Psikologi",
      "Penelitian terbaru menunjukkan kebanyakan orang adalah ambivert! MBTI banyak dikritik karena validitasnya — kepribadian lebih kompleks dari 4 dikotomi. Big Five (OCEAN) lebih didukung sains: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism."),
    mc("'Learned helplessness' (ketidakberdayaan yang dipelajari) terjadi ketika?",
      ["Seseorang belajar keterampilan baru","Seseorang berhenti mencoba karena berulang kali gagal dan merasa tidak punya kendali","Seseorang terlalu bergantung pada bantuan orang lain","Seseorang sangat termotivasi setelah gagal"],1,25,"Psikologi",
      "Ditemukan oleh Martin Seligman: anjing yang diberi sengatan tak terkontrol kemudian tidak mencoba menghindarinya meski bisa. Pada manusia, ini menjelaskan depresi, pasif, dan kurangnya inisiatif — tapi juga bisa dibalik melalui pengalaman keberhasilan kecil!"),
    open("Sebutkan satu bias kognitif yang menurutmu sering mempengaruhimu dalam kehidupan sehari-hari!",
      30,"Psikologi",
      "Kita semua punya bias kognitif — itu manusiawi! Contoh: Sunk cost fallacy (tetap menonton film membosankan karena sudah bayar), Availability heuristic (menilai risiko berdasarkan seberapa mudah contoh terpikir), atau Bandwagon effect (mengikuti tren karena semua orang melakukannya). Mengenali bias adalah langkah pertama mengatasinya."),
  ],
};

// ── QUIZ 13: Geografi & Budaya Dunia ──────────────────────────────────────────
const geographyQuiz: Quiz = {
  id: "geography", title: "Geografi & Budaya Dunia", icon: "🗺️", color: "#0891B2",
  description: "Benua, lautan, ibukota, budaya, dan keajaiban geografi dari seluruh penjuru dunia",
  category: "Geografi", difficulty: "Sedang",
  questions: [
    mc("Benua manakah yang memiliki populasi terbanyak di dunia?",
      ["Afrika","Amerika","Eropa","Asia"],3,15,"Geografi",
      "Asia adalah rumah bagi ~4.7 miliar orang (60% populasi dunia)! China dan India masing-masing memiliki lebih dari 1 miliar penduduk. Asia Tenggara sendiri dihuni ~700 juta orang."),
    mc("Sungai terpanjang di dunia adalah?",
      ["Amazon (Brasil)","Nil (Afrika)","Yangtze (China)","Mississippi (AS)"],1,20,"Geografi",
      "Sungai Nil di Afrika adalah yang terpanjang (~6.650 km), mengalir dari Uganda/Ethiopia ke Mesir. Amazon adalah yang terbesar berdasarkan volume air — mengalirkan 20% air tawar dunia ke lautan!"),
    mc("Ibukota Australia adalah?",
      ["Sydney","Melbourne","Brisbane","Canberra"],3,20,"Geografi",
      "Canberra adalah ibukota Australia — bukan Sydney atau Melbourne yang lebih terkenal! Canberra sengaja dibangun antara dua kota besar yang bersaing itu sebagai kompromi. Didirikan 1913, didesain khusus sebagai ibukota."),
    mc("Gurun terluas di dunia adalah?",
      ["Sahara (Afrika Utara)","Gobi (Asia)","Antartika","Arabian (Arab)"],2,20,"Geografi",
      "Antartika adalah gurun terluas di dunia (14 juta km²)! Gurun bukan hanya berarti panas — definisinya adalah wilayah dengan curah hujan sangat rendah (<250mm/tahun). Sahara adalah gurun panas terluas."),
    mc("Negara mana yang memiliki jumlah pulau terbanyak di dunia?",
      ["Filipina","Indonesia","Kanada","Swedia"],3,20,"Geografi",
      "Swedia memiliki lebih dari 220.000 pulau! Diikuti Norwegia, Finlandia, dan Kanada. Indonesia berada di urutan ke-5 dengan ~17.000 pulau. Swedia memiliki banyak pulau kecil di kepulauan (skärgård) pesisirnya."),
    mc("Di negara manakah terdapat lebih dari 800 bahasa yang berbeda?",
      ["India","Indonesia","Brasil","Papua Nugini"],3,20,"Geografi",
      "Papua Nugini memiliki 800+ bahasa — lebih dari negara lain mana pun! Ini karena sejarah isolasi geografis di antara pegunungan yang memisahkan komunitas selama ribuan tahun. Indonesia urutan ke-2 dengan 700+ bahasa."),
    mc("Laut Kaspia adalah?",
      ["Laut terluas di dunia","Danau air asin terbesar di dunia","Selat sempit di Asia","Teluk dalam di Rusia"],1,25,"Geografi",
      "Secara teknis, Laut Kaspia adalah danau (danau air asin terbesar di dunia, ~371.000 km²). Meski disebut 'laut', ia tidak terhubung ke samudra. Dibatasi Rusia, Kazakhstan, Turkmenistan, Iran, dan Azerbaijan."),
    mc("Puncak tertinggi di masing-masing benua dikenal dengan istilah?",
      ["Seven Wonders","Summit Seven","Seven Peaks","Seven Summits"],3,20,"Geografi",
      "Seven Summits: 7 puncak tertinggi di 7 benua: Everest (Asia), Aconcagua (Amerika), Denali (Amerika Utara), Kilimanjaro (Afrika), Elbrus (Eropa), Vinson (Antartika), Carstensz Pyramid/Puncak Jaya (Oseania/Indonesia!)."),
    poll("Jika bisa berkunjung ke mana saja, benua mana yang pertama ingin kamu jelajahi?",
      ["Eropa — sejarah & arsitektur","Asia Timur — teknologi & budaya","Amerika Latin — alam & petualangan","Afrika — satwa & suku kuno"],
      30,"Geografi",
      "Setiap benua punya keajaiban unik! Eropa untuk sejarah panjang, Asia Timur untuk inovasi modern bertemu tradisi kuno, Amerika Latin untuk Amazon dan Machu Picchu, Afrika untuk safari dan budaya yang belum banyak dieksplor."),
    mc("Negara manakah yang berada di dua benua sekaligus?",
      ["Rusia","Mesir","Turki","Semua jawaban benar"],3,20,"Geografi",
      "Ketiganya! Rusia (Eropa & Asia), Mesir (Afrika & Asia, dengan Semenanjung Sinai), Turki (Eropa & Asia). Rusia yang paling jelas — Pegunungan Ural adalah batasnya."),
    mc("Lautan terdalam di bumi adalah?",
      ["Samudra Atlantik","Samudra Hindia","Samudra Pasifik","Samudra Arktik"],2,20,"Geografi",
      "Samudra Pasifik adalah yang terluas DAN terdalam. Palung Mariana di Pasifik adalah titik terdalam bumi (~11.034 meter) — lebih dalam dari Everest yang tinggi! Tekanannya 1.000× tekanan atmosfer normal."),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Register all quizzes (+ muat kuis kustom yang tersimpan di db.json)
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_BY_ID: Record<string, string> = {
  science: "SMA", "history-id": "SMP", math: "SMP", digital: "SMA", health: "SMP",
  environment: "SMP", general: "Umum", economics: "SMA", bahasa: "SMP", sports: "Umum",
  iq: "Umum", psychology: "Kuliah", geography: "SMP",
};

[
  scienceQuiz, historyIdQuiz, mathQuiz, digitalQuiz, healthQuiz, envQuiz, generalQuiz,
  economicsQuiz, bahasaQuiz, sportsQuiz, iqQuiz, psychologyQuiz, geographyQuiz,
  mtkSd, ipaSd, bindoSd, ppknSd,
  mtkSmp, ipaSmp, ipsSmp, bingSmp,
  fisika, kimia, biologiSma, bingSma, informatikaSma,
  akuntansi, manajemen, hukumDasar, statistika, anatomi, algoritma,
].forEach((qq) => {
  quizzes.set(qq.id, { ...qq, level: (qq.level ?? LEVEL_BY_ID[qq.id]) as Quiz["level"] });
});

for (const [id, custom] of Object.entries(getCustomQuizzes())) {
  quizzes.set(id, custom);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function shuffleArr<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normText(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
}

function generateCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  do {
    c = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (getAssignment(c));
  return c;
}

function calcScore(type: QuestionType, timeMs: number, timeLimit: number): number {
  if (type === "poll" || type === "rating" || type === "open") return 100;
  if (type === "tf")  return Math.round(800  * Math.max(0, 1 - timeMs / (timeLimit * 1000)));
  return                     Math.round(1000 * Math.max(0, 1 - timeMs / (timeLimit * 1000)));
}

function getLeaderboard(game: Game): LBEntry[] {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, lastScore: p.lastScore, id: p.id, team: game.teams ? p.team : undefined }));
}

const TEAM_NAMES = ["Merah", "Biru"];
function isScoredType(t: QuestionType): boolean {
  return t === "mc" || t === "tf" || t === "blank" || t === "reorder";
}

// ── Sesi soal acak: base + bank AI + prosedural → diacak, ambil 10 ───────────
const SESSION_SIZE = 10;
function buildSessionQuestions(quiz: Quiz): Question[] {
  const pool: Question[] = [...quiz.questions, ...getAiQuestions(quiz.id)];
  if (isProceduralQuiz(quiz.id)) pool.push(...generateProceduralBatch(quiz.id, 300));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(SESSION_SIZE, pool.length));
}

// ── Penanam bank soal AI di latar belakang (gratis, anonim) ───────────────────
const AI_BANK_TARGET = 120;
async function seedAiBanks(): Promise<void> {
  const builtins = [
    scienceQuiz, historyIdQuiz, digitalQuiz, healthQuiz, envQuiz, generalQuiz, economicsQuiz,
    bahasaQuiz, sportsQuiz, psychologyQuiz, geographyQuiz,
    mtkSd, ipaSd, bindoSd, ppknSd, mtkSmp, ipaSmp, ipsSmp, bingSmp,
    kimia, biologiSma, bingSma, informatikaSma,
    akuntansi, manajemen, hukumDasar, statistika, anatomi, algoritma,
  ];
  for (const quiz of builtins) {
    let guard = 14; // batas batch per quiz per boot (ramah rate-limit)
    while (getAiQuestions(quiz.id).length < AI_BANK_TARGET && guard-- > 0) {
      const ai = await aiChainFromPrompt(QUESTION_PROMPT(quiz.title, 8), 8).catch(() => null);
      if (!ai?.drafts.length) break;
      addAiQuestions(quiz.id, draftsToQuestions(ai.drafts, quiz.title) as unknown as Question[]);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  console.log("  📚  Penanaman bank soal AI selesai untuk sesi ini.");
}

// ─────────────────────────────────────────────────────────────────────────────
// AI generator — OpenCode Zen (model gratis) → Ollama lokal → bank soal
// ─────────────────────────────────────────────────────────────────────────────

// ── 1) OpenCode Zen: https://opencode.ai/zen/v1 — model gratis bisa dipakai
//     ANONIM (tanpa API key). Jika user menaruh key di data/opencode.key atau
//     env OPENCODE_API_KEY, key ikut dikirim (membuka model lebih banyak).
const ZEN_URL = "https://opencode.ai/zen/v1";
// urutan preferensi — model terverifikasi gratis-anonim di depan
const ZEN_FREE_MODELS = [
  "mimo-v2.5-free", "deepseek-v4-flash-free", "nemotron-3.5-lightning-free",
  "laguna-s-2.1-free", "x-preview-f-free", "nemotron-3-ultra-free",
  "hy3-free", "big-pickle",
];
let zenKeyCache: string | null | undefined;
let zenModelIdx = 0;        // rotasi model bila upstream sedang error
let zenLogged = false;

function getZenKey(): string | null {
  if (zenKeyCache !== undefined) return zenKeyCache;
  const env = process.env.OPENCODE_API_KEY?.trim();
  if (env) { zenKeyCache = env; return zenKeyCache; }
  try {
    const p = join(process.cwd(), "data", "opencode.key");
    if (existsSync(p)) {
      const k = readFileSync(p, "utf8").trim();
      if (k) { zenKeyCache = k; return zenKeyCache; }
    }
  } catch { /* abaikan */ }
  zenKeyCache = null;
  return null;
}

function zenHeaders(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  const key = getZenKey();
  if (key) h.authorization = `Bearer ${key}`;
  return h;
}

// Daftar model gratis yang sedang tersedia (urutan preferensi)
async function getZenCandidates(): Promise<string[]> {
  try {
    const r = await fetch(`${ZEN_URL}/models`, { headers: zenHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { data?: Array<{ id: string }> };
    const ids = new Set((j.data ?? []).map((m) => m.id));
    const avail = ZEN_FREE_MODELS.filter((m) => ids.has(m));
    if (avail.length) {
      if (!zenLogged) { console.log(`  🤖  OpenCode Zen aktif (gratis, anonim): ${avail.join(", ")}`); zenLogged = true; }
      return avail;
    }
    return [...ids].filter((id) => id.endsWith("-free"));
  } catch (e) {
    console.error("[ai] OpenCode Zen tidak tersedia:", e);
    return [];
  }
}

async function nextZenModel(): Promise<string | null> {
  const avail = await getZenCandidates();
  if (!avail.length) return null;
  return avail[zenModelIdx++ % avail.length];
}

function extractJsonBlock(text: string): unknown | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* lanjut */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* gagal */ }
  }
  return null;
}

interface AiDraft { question: string; options: string[]; correctIndex: number; explanation?: string }

const QUESTION_PROMPT = (topic: string, count: number) => [
  `Buat ${count} soal kuis pilihan ganda berbahasa Indonesia tentang topik: "${topic}".`,
  'Balas HANYA dengan JSON valid berbentuk {"questions":[...]}.',
  'Setiap soal berbentuk: {"question":"teks soal","options":["A","B","C","D"],"correctIndex":0,"explanation":"penjelasan singkat"}',
  "correctIndex adalah indeks opsi yang benar (0-3). Variasikan tingkat kesulitan. Jangan mengulang soal yang mirip.",
].join("\n");

function draftsFromContent(content: string | undefined): AiDraft[] | null {
  if (!content) return null;
  const parsed = extractJsonBlock(content) as { questions?: AiDraft[] } | null;
  if (!parsed?.questions) return null;
  const drafts = parsed.questions.filter(
    (d) => d.question && Array.isArray(d.options) && d.options.length >= 2 &&
           Number.isInteger(d.correctIndex) && d.correctIndex >= 0 && d.correctIndex < d.options.length
  );
  return drafts.length ? drafts : null;
}

// ── 2) Ollama lokal (fallback jika Zen tidak dikonfigurasi)
const OLLAMA_URL = "http://127.0.0.1:11434";
let ollamaModelCache: string | null | undefined; // undefined = belum pernah dicek

async function detectOllamaModel(): Promise<string | null> {
  if (ollamaModelCache !== undefined) return ollamaModelCache;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    const j = (await r.json()) as { models?: Array<{ name: string }> };
    const names = (j.models ?? []).map((m) => m.name);
    const prefer = ["llama3.2", "llama3", "qwen2.5", "qwen", "mistral", "gemma", "phi"];
    ollamaModelCache = prefer.find((p) => names.some((n) => n.startsWith(p))) ?? names[0] ?? null;
    if (ollamaModelCache) console.log(`  🤖  Ollama terdeteksi, model: ${ollamaModelCache}`);
  } catch {
    ollamaModelCache = null;
  }
  return ollamaModelCache;
}

async function ollamaGenerateQuestions(topic: string, count: number): Promise<{ drafts: AiDraft[]; model: string } | null> {
  const model = await detectOllamaModel();
  if (!model) return null;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: QUESTION_PROMPT(topic, count) }],
        stream: false,
        format: "json",
        options: { temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await res.json()) as { message?: { content?: string } };
    const drafts = draftsFromContent(data.message?.content);
    return drafts ? { drafts: drafts.slice(0, count), model } : null;
  } catch (e) {
    console.error("[ai] pemanggilan Ollama gagal:", e);
    return null;
  }
}
void ollamaGenerateQuestions; // dipertahankan utk pemakaian manual/debug

// Prompt berbasis teks bahan bacaan (untuk impor PDF/tempel teks)
const PASSAGE_PROMPT = (passage: string, count: number) => [
  "Buat soal kuis pilihan ganda berbahasa Indonesia BERDASARKAN teks berikut.",
  `Jumlah soal: ${count}.`,
  'Balas HANYA dengan JSON valid berbentuk {"questions":[...]}.',
  'Setiap soal berbentuk: {"question":"teks soal","options":["A","B","C","D"],"correctIndex":0,"explanation":"penjelasan singkat"}',
  "Semua jawaban HARUS dapat ditemukan dalam teks. Jangan mengarang fakta di luar teks.",
  "--- TEKS BAHAN ---",
  passage,
].join("\n");

function draftsToQuestions(drafts: AiDraft[], source: string): Array<Record<string, unknown>> {
  return drafts.map((d) => ({
    id: uuidv4(), type: "mc" as QuestionType,
    question: d.question, options: d.options, correctIndex: d.correctIndex,
    timeLimit: 20, category: "AI", explanation: d.explanation ?? "",
    sourceQuiz: source,
  }));
}

// Rantai AI: OpenCode Zen (anonim/gratis, rotasi model bila gagal) → Ollama lokal
async function aiChainFromPrompt(prompt: string, count: number): Promise<{ drafts: AiDraft[]; engine: string } | null> {
  // hingga 3 percobaan dengan model Zen berbeda (upstream kadang flaky)
  for (let attempt = 0; attempt < 3; attempt++) {
    const model = await nextZenModel();
    if (!model) break;
    try {
      const res = await fetch(`${ZEN_URL}/chat/completions`, {
        method: "POST",
        headers: zenHeaders(),
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) {
        console.error(`[ai] Zen ${model} HTTP ${res.status} — coba model lain…`);
        continue;
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const drafts = draftsFromContent(data.choices?.[0]?.message?.content);
      if (drafts?.length) return { drafts, engine: `zen:${model}` };
      console.error(`[ai] Zen ${model} menghasilkan output tak valid — coba model lain…`);
    } catch (e) {
      console.error(`[ai] Zen ${model} error:`, e);
    }
  }
  const om = await detectOllamaModel();
  if (om) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: om, messages: [{ role: "user", content: prompt }], stream: false, format: "json" }),
        signal: AbortSignal.timeout(180_000),
      });
      const data = (await res.json()) as { message?: { content?: string } };
      const drafts = draftsFromContent(data.message?.content);
      if (drafts?.length) return { drafts, engine: `ollama:${om}` };
    } catch (e) {
      console.error("[ai] Ollama error:", e);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket server
// ─────────────────────────────────────────────────────────────────────────────
app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {

    // solo: get session data (10 soal acak) with correct answers (client-side solo play)
    socket.on("quiz:getSoloData", ({ quizId }: { quizId: string }, cb: (r: object) => void) => {
      const quiz = quizzes.get(quizId);
      if (!quiz) return cb({ error: "Kuis tidak ditemukan" });
      const session = buildSessionQuestions(quiz);
      cb({
        id: quiz.id, title: quiz.title, icon: quiz.icon, color: quiz.color,
        category: quiz.category, difficulty: quiz.difficulty, description: quiz.description,
        questions: session.map((q) => ({
          id: q.id, type: q.type, question: q.question, options: q.options,
          correctIndex: q.correctIndex, timeLimit: q.timeLimit,
          category: q.category, explanation: q.explanation,
          image: q.image, video: q.video, items: q.items, answers: q.answers,
        })),
      });
    });

    // AI: generate questions — OpenCode Zen (gratis, anonim) → Ollama → bank soal
    socket.on("quiz:generateFromTopic", async ({ topic, count = 10 }: { topic: string; count?: number }, cb: (r: object) => void) => {
      if (!topic?.trim()) return cb({ error: "Topik tidak boleh kosong" });
      const cleanTopic = topic.trim();

      // 1+2) Rantai AI dengan rotasi model Zen lalu Ollama
      const ai = await aiChainFromPrompt(QUESTION_PROMPT(cleanTopic, count), count).catch(() => null);
      if (ai?.drafts.length) {
        const src = ai.engine.startsWith("zen:")
          ? `OpenCode Zen (${ai.engine.split(":")[1]})` : `AI (${ai.engine.split(":")[1]})`;
        return cb({ engine: ai.engine, questions: draftsToQuestions(ai.drafts, src) });
      }

      // 3) Fallback: pencarian kata kunci di bank soal internal
      const kw = cleanTopic.toLowerCase().split(/\s+/);
      const scored: Array<{ q: Question; score: number; quizTitle: string }> = [];
      for (const quiz of quizzes.values()) {
        for (const q of quiz.questions) {
          if (q.type === "rating" || q.type === "open") continue; // skip non-scoreable types
          let score = 0;
          const haystack = [q.question, q.category ?? "", q.explanation ?? "", quiz.title, quiz.category].join(" ").toLowerCase();
          for (const k of kw) {
            if (k.length < 2) continue;
            if (haystack.includes(k)) score += haystack.split(k).length - 1;
          }
          if (score > 0) scored.push({ q, score, quizTitle: quiz.title });
        }
      }
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, count);
      if (top.length === 0) return cb({ error: "Tidak ada yang cocok. Coba kata kunci lain." });
      cb({
        engine: "bank",
        questions: top.map(({ q, quizTitle }) => ({
          id: q.id, type: q.type, question: q.question, options: q.options,
          correctIndex: q.correctIndex, timeLimit: q.timeLimit,
          category: q.category, explanation: q.explanation, sourceQuiz: quizTitle,
        })),
      });
    });

    // Impor: buat soal dari teks bahan (AI gratis Zen → Ollama)
    socket.on("quiz:generateFromText", async ({ text, count = 8 }: { text: string; count?: number }, cb: (r: object) => void) => {
      const clean = text?.trim() ?? "";
      if (clean.length < 60) return cb({ error: "Teks terlalu pendek — tempel minimal beberapa paragraf materi." });
      const ai = await aiChainFromPrompt(PASSAGE_PROMPT(clean.slice(0, 8000), count), count).catch(() => null);
      if (!ai) return cb({ error: "AI sedang tidak tersedia. Coba lagi sebentar." });
      cb({ engine: ai.engine, questions: draftsToQuestions(ai.drafts, `AI impor teks (${ai.engine})`) });
    });

    // Impor: ekstrak PDF → buat soal dengan AI
    socket.on("quiz:importPdf", async ({ b64, count = 8 }: { b64: string; count?: number }, cb: (r: object) => void) => {
      try {
        if (!b64 || b64.length > 14_000_000) return cb({ error: "File terlalu besar / tidak valid (maks ~10 MB)." });
        const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ""), "base64");
        const p = new PDFParse({ data: new Uint8Array(buf) });
        const pdf = await p.getText();
        await p.destroy();
        const text = (pdf.text || "").replace(/\s+/g, " ").trim().slice(0, 8000);
        if (text.length < 60) return cb({ error: "Teks PDF tidak terbaca / terlalu pendek. PDF hasil scan tidak didukung." });
        const ai = await aiChainFromPrompt(PASSAGE_PROMPT(text, count), count).catch(() => null);
        if (!ai) return cb({ error: "AI sedang tidak tersedia. Coba lagi sebentar." });
        cb({ engine: ai.engine, questions: draftsToQuestions(ai.drafts, `AI impor PDF (${ai.engine})`), chars: text.length });
      } catch (e) {
        console.error("[pdf] gagal memproses:", e);
        cb({ error: "Gagal membaca PDF. Pastikan file PDF valid dan tidak terkunci password." });
      }
    });

    // list quizzes
    socket.on("quizzes:list", (_data: unknown, cb: (list: object[]) => void) => {
      const customs = getCustomQuizzes();
      const list = Array.from(quizzes.values()).map((q) => {
        const poolSize = q.questions.length + getAiQuestions(q.id).length;
        return {
          id: q.id, title: q.title, description: q.description,
          category: q.category, icon: q.icon, color: q.color,
          difficulty: q.difficulty,
          level: q.level ?? "Umum",
          questionCount: isProceduralQuiz(q.id) ? Math.max(poolSize, 5000) : poolSize,
          infinite: isProceduralQuiz(q.id),
          estimatedMins: Math.ceil(Math.min(poolSize, 10) * 0.5) + 2,
          types: [...new Set(q.questions.map((x) => x.type))],
          source: customs[q.id] ? ("custom" as const) : ("builtin" as const),
        };
      });
      cb(list);
    });

    // host: start with existing quiz
    socket.on("host:create",
      ({ quizId, teams, economy }: { quizId: string; teams?: boolean; economy?: boolean }, cb: (r: object) => void) => {
        const quiz = quizzes.get(quizId);
        if (!quiz) return cb({ error: "Kuis tidak ditemukan" });
        const pin = makeGame(quiz, socket.id, { teams, economy });
        socket.join(`game:${pin}`);
        socket.data.pin = pin; socket.data.isHost = true;
        cb({ pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length, description: quiz.description });
      }
    );

    // host: custom quiz
    socket.on("host:createCustom",
      ({ title, questions, teams, economy }: { title: string; questions: Omit<Question, "id">[]; teams?: boolean; economy?: boolean }, cb: (r: object) => void) => {
        if (!title || !questions?.length) return cb({ error: "Data tidak valid" });
        const quiz: Quiz = {
          id: uuidv4(), title, description: "Kuis kustom",
          category: "Kustom", icon: "✏️", color: "#2563EB",
          difficulty: "Sedang",
          questions: questions.map((q) => ({ ...q, id: uuidv4(), category: q.category ?? "Kustom", explanation: q.explanation ?? "" })),
        };
        quizzes.set(quiz.id, quiz);
        saveCustomQuiz(quiz);
        const pin = makeGame(quiz, socket.id, { teams, economy });
        socket.join(`game:${pin}`);
        socket.data.pin = pin; socket.data.isHost = true;
        cb({ pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length });
      }
    );

    // player: join
    socket.on("player:join",
      ({ pin, name }: { pin: string; name: string }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game)                     return cb({ error: "Game tidak ditemukan. Cek kode game-mu." });
        if (game.state !== "lobby")    return cb({ error: "Game sudah dimulai, tidak bisa bergabung." });
        const cleanName = name?.trim();
        if (!cleanName)                return cb({ error: "Nama tidak boleh kosong." });
        if ([...game.players.values()].some((p) => p.name === cleanName))
                                       return cb({ error: "Nama sudah dipakai. Pilih nama lain." });

        const team = game.teams
          ? (Array.from(game.players.values()).filter((p) => p.team === 0).length <=
             Array.from(game.players.values()).filter((p) => p.team === 1).length ? 0 : 1)
          : -1;
        // uang saku awal agar power-up langsung terasa
        const STARTING_COINS = 200;
        const player: Player = { id: socket.id, name: cleanName, score: 0, streak: 0, lastScore: 0, correctCount: 0, coins: game.economy ? STARTING_COINS : 0, team, x2Next: false, shieldNext: false };
        game.players.set(socket.id, player);
        socket.join(`game:${pin}`);
        socket.data.pin = pin; socket.data.isPlayer = true;

        io.to(`game:${pin}`).emit("game:playerJoined", { players: playerList(game) });
        io.to(socket.id).emit("game:coins", { coins: player.coins, x2: false, shield: false });
        cb({ ok: true, quizTitle: game.quiz.title, totalQuestions: game.quiz.questions.length, team: game.teams ? team : undefined });
      }
    );

    // host: start
    socket.on("host:start", ({ pin }: { pin: string }, cb: (r: object) => void) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id) return cb({ error: "Unauthorized" });
      if (game.players.size === 0) return cb({ error: "Belum ada pemain yang bergabung." });
      if (game.state !== "lobby")  return cb({ error: "Game sudah berjalan." });
      startNextQuestion(game, io, pin);
      cb({ ok: true });
    });

    // host: force reveal
    socket.on("host:showResults", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id || game.state !== "question") return;
      clearTimer(game);
      revealResults(game, io, pin);
    });

    // host: next
    socket.on("host:next", ({ pin }: { pin: string }) => {
      const game = games.get(pin);
      if (!game || game.hostSocketId !== socket.id || game.state !== "review") return;
      if (game.currentQuestionIndex + 1 >= game.quiz.questions.length) endGame(game, io, pin);
      else startNextQuestion(game, io, pin);
    });

    // player: answer (mc, tf, poll, rating, reorder)
    socket.on("player:answer",
      ({ pin, optionIndex, order }: { pin: string; optionIndex: number; order?: number[] }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game || game.state !== "question") return cb({ error: "Bukan waktunya menjawab." });
        if (game.answers.has(socket.id))        return cb({ error: "Sudah menjawab." });
        const q = game.quiz.questions[game.currentQuestionIndex];
        if (q.type === "open" || q.type === "blank") return cb({ error: "Gunakan jawaban teks untuk soal ini." });

        if (q.type === "reorder") {
          if (!Array.isArray(order) || order.length !== (q.items?.length ?? 0)) return cb({ error: "Urutan tidak lengkap." });
          if (new Set(order).size !== order.length || order.some((i) => !Number.isInteger(i) || i < 0 || i >= order.length))
            return cb({ error: "Urutan tidak valid." });
          game.answers.set(socket.id, { playerId: socket.id, optionIndex: -3, timeMs: Date.now() - game.questionStartTime, order });
        } else {
          if (optionIndex < 0 || optionIndex >= q.options.length) return cb({ error: "Pilihan tidak valid." });
          game.answers.set(socket.id, { playerId: socket.id, optionIndex, timeMs: Date.now() - game.questionStartTime });
        }
        cb({ ok: true });
        io.to(game.hostSocketId).emit("game:answerCount", { answered: game.answers.size, total: game.players.size });

        if (game.answers.size >= game.players.size) { clearTimer(game); revealResults(game, io, pin); }
      }
    );

    // player: open text answer (tipe open & blank)
    socket.on("player:openAnswer",
      ({ pin, text }: { pin: string; text: string }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game || game.state !== "question") return cb({ error: "Bukan waktunya menjawab." });
        if (game.answers.has(socket.id))        return cb({ error: "Sudah menjawab." });
        const q = game.quiz.questions[game.currentQuestionIndex];
        if (q.type !== "open" && q.type !== "blank") return cb({ error: "Soal ini bukan soal teks." });
        const cleanText = text?.trim().slice(0, 150);
        if (!cleanText) return cb({ error: "Jawaban tidak boleh kosong." });

        game.openAnswers.set(socket.id, cleanText);
        game.answers.set(socket.id, { playerId: socket.id, optionIndex: -2, timeMs: Date.now() - game.questionStartTime });
        cb({ ok: true });
        io.to(game.hostSocketId).emit("game:answerCount", { answered: game.answers.size, total: game.players.size });

        if (game.answers.size >= game.players.size) { clearTimer(game); revealResults(game, io, pin); }
      }
    );

    // ── Tugas / Homework asinkron ─────────────────────────────────────────────
    socket.on("assignment:create",
      ({ quizId, hours, ownerKey }: { quizId: string; hours?: number; ownerKey?: string }, cb: (r: object) => void) => {
        const quiz = quizzes.get(quizId);
        if (!quiz) return cb({ error: "Kuis tidak ditemukan" });
        const h = Math.max(1, Math.min(hours ?? 24, 24 * 30));
        const a: Assignment = {
          id: uuidv4(), code: generateCode(), title: quiz.title,
          ownerKey: ownerKey || undefined,
          createdAt: Date.now(), deadlineMs: Date.now() + h * 3600_000,
          // tugas memakai 10 soal acak dari pool
          questions: buildSessionQuestions(quiz).map((q) => ({
            id: q.id, type: q.type, question: q.question, options: q.options,
            timeLimit: q.timeLimit, image: q.image, video: q.video,
            itemsShuffled: q.type === "reorder" ? shuffleArr([...(q.items ?? [])]) : undefined,
            correctIndex: q.correctIndex, items: q.items, answers: q.answers,
          })),
          results: [],
        };
        saveAssignment(a);
        cb({ ok: true, code: a.code, deadlineMs: a.deadlineMs, title: a.title });
      }
    );

    socket.on("assignment:list", ({ ownerKey }: { ownerKey?: string }, cb: (r: object[]) => void) => {
      // punya key → lihat milik sendiri + lama tanpa pemilik; tanpa key → hanya tanpa pemilik
      const mine = listAssignments().filter((a) => ownerKey ? (!a.ownerKey || a.ownerKey === ownerKey) : !a.ownerKey);
      cb(mine.map((a) => ({
        id: a.id, code: a.code, title: a.title, createdAt: a.createdAt,
        deadlineMs: a.deadlineMs, resultCount: a.results.length, questionCount: a.questions.length,
      })));
    });

    // Siswa ambil detail tugas (tanpa kunci jawaban)
    socket.on("assignment:get", ({ code }: { code: string }, cb: (r: object) => void) => {
      const a = getAssignment(code);
      if (!a) return cb({ error: "Tugas tidak ditemukan. Cek kode tugasnya." });
      cb({
        ok: true, code: a.code, title: a.title, expired: Date.now() > a.deadlineMs,
        deadlineMs: a.deadlineMs,
        questions: a.questions.map(({ id, type, question, options, timeLimit, image, video, itemsShuffled }) =>
          ({ id, type, question, options, timeLimit, image, video, itemsShuffled })),
      });
    });

    interface SubmitResponse { choice?: number | null; text?: string | null; order?: string[] | null }

    socket.on("assignment:submit",
      ({ code, name, responses, durationSec }: { code: string; name: string; responses: SubmitResponse[]; durationSec?: number }, cb: (r: object) => void) => {
        const a = getAssignment(code);
        if (!a) return cb({ error: "Tugas tidak ditemukan." });
        if (Date.now() > a.deadlineMs) return cb({ error: "Tugas sudah melewati tenggat waktu." });
        const cleanName = name?.trim().slice(0, 30);
        if (!cleanName) return cb({ error: "Nama tidak boleh kosong." });
        if (!Array.isArray(responses)) return cb({ error: "Jawaban tidak valid." });

        let score = 0;
        let correctCount = 0;
        let total = 0;
        a.questions.forEach((q, i) => {
          const resp = responses[i];
          const isScored = q.type === "mc" || q.type === "tf" || q.type === "blank" || q.type === "reorder";
          if (!isScored) { score += 100; return; } // partisipasi
          total++;
          let correct = false;
          if (q.type === "blank" && typeof resp?.text === "string") {
            correct = (q.answers ?? []).some((ans) => normText(ans) === normText(resp.text as string));
          } else if (q.type === "reorder" && Array.isArray(resp?.order)) {
            const orig = q.items ?? [];
            correct = orig.length > 0 && resp!.order!.length === orig.length &&
              resp!.order!.every((s, k) => s === orig[k]);
          } else if ((q.type === "mc" || q.type === "tf") && typeof resp?.choice === "number") {
            correct = resp.choice === q.correctIndex;
          }
          if (correct) { correctCount++; score += q.type === "tf" ? 800 : 1000; }
        });

        // timpa hasil sebelumnya dengan nama yang sama
        a.results = a.results.filter((r) => normText(r.name) !== normText(cleanName));
        const result: AssignmentResult = {
          name: cleanName, score, correctCount,
          total: Math.max(total, 1),
          durationSec: Math.max(0, Math.round(durationSec ?? 0)),
          finishedAt: Date.now(),
        };
        addAssignmentResult(code, result);

        const sorted = [...getAssignment(code)!.results].sort((x, y) => y.score - x.score);
        const rank = sorted.findIndex((r) => r.name === cleanName) + 1;
        cb({ ok: true, score, correctCount, total, rank });
      }
    );

    socket.on("assignment:results", ({ code }: { code: string }, cb: (r: object) => void) => {
      const a = getAssignment(code);
      if (!a) return cb({ error: "Tugas tidak ditemukan." });
      cb({
        ok: true, code: a.code, title: a.title, createdAt: a.createdAt,
        deadlineMs: a.deadlineMs, results: [...a.results].sort((x, y) => y.score - x.score),
      });
    });

    // ── Laporan game live ─────────────────────────────────────────────────────
    socket.on("report:get", ({ pin }: { pin: string }, cb: (r: object) => void) => {
      const rep = getReport(pin);
      if (!rep) return cb({ error: "Laporan tidak ditemukan. Pastikan kode PIN-nya benar." });
      cb(rep);
    });

    socket.on("report:list", (_data: unknown, cb: (r: object[]) => void) => cb(listReports()));

    // ── Opsi game (host, sebelum mulai) ───────────────────────────────────────
    socket.on("host:setOptions",
      ({ pin, teams, economy }: { pin: string; teams?: boolean; economy?: boolean }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game || game.hostSocketId !== socket.id) return cb({ error: "Unauthorized" });
        if (game.state !== "lobby") return cb({ error: "Opsi hanya bisa diubah di lobby." });
        if (typeof teams === "boolean") game.teams = teams;
        if (typeof economy === "boolean") game.economy = economy;
        io.to(`game:${pin}`).emit("game:options", { teams: game.teams, economy: game.economy });
        io.to(`game:${pin}`).emit("game:playerJoined", { players: playerList(game) });
        cb({ ok: true, teams: game.teams, economy: game.economy });
      }
    );

    // ── Power-up (mode ekonomi) ───────────────────────────────────────────────
    socket.on("player:buyPowerUp",
      ({ pin, type }: { pin: string; type: string }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game || !game.economy) return cb({ error: "Mode koin tidak aktif." });
        if (game.state !== "review") return cb({ error: "Belanja hanya antara soal." });
        const p = game.players.get(socket.id);
        if (!p) return cb({ error: "Bukan pemain game ini." });
        const COST = { x2: 300, shield: 200 } as Record<string, number>;
        const cost = COST[type];
        if (!cost) return cb({ error: "Power-up tidak dikenal." });
        if (type === "x2" && p.x2Next) return cb({ error: "×2 sudah aktif." });
        if (type === "shield" && p.shieldNext) return cb({ error: "Perisai sudah aktif." });
        if (p.coins < cost) return cb({ error: `Koin kurang (butuh ${cost}).` });
        p.coins -= cost;
        if (type === "x2") p.x2Next = true; else p.shieldNext = true;
        io.to(socket.id).emit("game:coins", { coins: p.coins, x2: p.x2Next, shield: p.shieldNext });
        cb({ ok: true, coins: p.coins });
      }
    );

    // disconnect
    socket.on("disconnect", () => {
      const pin = socket.data.pin as string | undefined;
      if (!pin) return;
      const game = games.get(pin);
      if (!game) return;

      if (socket.data.isPlayer) {
        game.players.delete(socket.id);
        io.to(`game:${pin}`).emit("game:playerLeft", { players: playerList(game) });
        if (game.state === "question" && game.players.size > 0 && game.answers.size >= game.players.size) {
          clearTimer(game); revealResults(game, io, pin);
        }
      } else if (socket.data.isHost) {
        clearTimer(game);
        io.to(`game:${pin}`).emit("game:hostLeft");
        games.delete(pin);
      }
    });
  });

  // ── Game flow helpers ────────────────────────────────────────────────────────
  function makeGame(quiz: Quiz, hostId: string, opts?: { teams?: boolean; economy?: boolean }): string {
    let pin = generatePin();
    while (games.has(pin)) pin = generatePin();
    // setiap game mendapat 10 soal acak dari pool besar
    const sessionQuiz: Quiz = { ...quiz, questions: buildSessionQuestions(quiz) };
    games.set(pin, {
      pin, quiz: sessionQuiz, hostSocketId: hostId,
      players: new Map(), state: "lobby",
      currentQuestionIndex: -1, questionStartTime: 0,
      answers: new Map(), openAnswers: new Map(),
      questionTimer: null, questionStats: [],
      teams: !!opts?.teams, economy: !!opts?.economy,
    });
    return pin;
  }

  function playerList(game: Game) {
    return [...game.players.values()].map((p) => ({
      id: p.id, name: p.name,
      team: game.teams ? p.team : undefined,
    }));
  }

  function clearTimer(game: Game) {
    if (game.questionTimer) { clearTimeout(game.questionTimer); game.questionTimer = null; }
  }

  function startNextQuestion(game: Game, io: Server, pin: string) {
    game.currentQuestionIndex++;
    game.state = "question";
    game.answers = new Map();
    game.openAnswers = new Map();
    game.questionStartTime = Date.now();
    const q = game.quiz.questions[game.currentQuestionIndex];
    game.currentShuffled = q.type === "reorder" ? shuffleArr([...(q.items ?? [])]) : undefined;
    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;

    io.to(`game:${pin}`).emit("game:question", {
      index: game.currentQuestionIndex, total: game.quiz.questions.length,
      type: q.type, question: q.question, options:
        q.type === "reorder" && game.currentShuffled ? game.currentShuffled : q.options,
      timeLimit: q.timeLimit, category: q.category, isLast,
      image: q.image, video: q.video, shuffledItems: game.currentShuffled,
    });

    game.questionTimer = setTimeout(() => { game.questionTimer = null; revealResults(game, io, pin); }, q.timeLimit * 1000);
  }

  function revealResults(game: Game, io: Server, pin: string) {
    if (game.state !== "question") return;
    game.state = "review";

    const q = game.quiz.questions[game.currentQuestionIndex];
    const counts = new Array(Math.max(q.options.length, 0)).fill(0);
    const correct: string[] = [];
    const wrong: string[] = [];

    game.answers.forEach((ans, pid) => {
      if (ans.optionIndex >= 0 && ans.optionIndex < counts.length) {
        counts[ans.optionIndex]++;
      }
      let isCorrect: boolean;
      if (q.type === "reorder") {
        const sh = game.currentShuffled ?? [];
        isCorrect = Array.isArray(ans.order) && ans.order.length === (q.items?.length ?? 0) &&
          q.items!.every((item, k) => sh[ans.order![k]] === item);
      } else if (q.type === "blank") {
        const t = game.openAnswers.get(pid);
        isCorrect = !!t && (q.answers ?? []).some((acc) => normText(acc) === normText(t));
      } else {
        // All non-mc/tf types use correctIndex -1 → everyone is correct
        // Open/blank text uses sentinel optionIndex -2 → also correct
        isCorrect = q.correctIndex === -1 || ans.optionIndex === q.correctIndex || ans.optionIndex === -2;
      }
      if (isCorrect) correct.push(pid);
      else wrong.push(pid);
    });

    // Award scores
    const scoredQ = isScoredType(q.type);
    correct.forEach((pid) => {
      const p = game.players.get(pid); const a = game.answers.get(pid);
      if (!p || !a) return;
      p.streak++;
      p.correctCount++;
      const streakBonus = (q.type === "mc" || q.type === "tf" || q.type === "blank") ? Math.min(p.streak - 1, 5) * 50 : 0;
      let earned = calcScore(q.type, a.timeMs, q.timeLimit) + streakBonus;
      if (game.economy && scoredQ) {
        p.coins += 100;
        if (p.x2Next) { earned *= 2; p.x2Next = false; }
      }
      p.lastScore = earned; p.score += earned;
    });
    wrong.forEach((pid) => {
      const p = game.players.get(pid); if (!p) return;
      if (scoredQ && game.economy && p.shieldNext) {
        p.shieldNext = false; // perisai: pertahankan streak
      } else {
        p.streak = 0;
      }
      p.lastScore = 0;
    });
    game.players.forEach((p) => {
      if (!game.answers.has(p.id)) { p.streak = 0; p.lastScore = 0; }
      io.to(p.id).emit("game:coins", { coins: p.coins, x2: p.x2Next, shield: p.shieldNext });
    });

    // kirim hasil personal (akurat untuk blank & reorder)
    game.answers.forEach((_ans, pid) => {
      io.to(pid).emit("game:myResult", { correct: correct.includes(pid), earned: game.players.get(pid)?.lastScore ?? 0 });
    });

    // Calculate rating average
    let ratingAvg: number | undefined;
    if (q.type === "rating") {
      const total = counts.reduce((s, c) => s + c, 0);
      const sum = counts.reduce((s, c, i) => s + c * (i + 1), 0);
      ratingAvg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
    }

    // Collect free-text answers (open & blank)
    const openAnswers = (q.type === "open" || q.type === "blank")
      ? Array.from(game.openAnswers.values()) : undefined;

    // Statistik soal untuk laporan akhir
    const answerableTotal = correct.length + wrong.length;
    game.questionStats.push({
      index: game.currentQuestionIndex, text: q.question, type: q.type,
      answered: game.answers.size, correctCount: correct.length,
      correctPct: answerableTotal > 0 ? Math.round((correct.length / answerableTotal) * 100) : 0,
    });

    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;
    io.to(`game:${pin}`).emit("game:questionResults", {
      correctIndex: q.correctIndex, counts, leaderboard: getLeaderboard(game),
      isLast, type: q.type,
      question: q.question,
      options: q.type === "reorder" ? (game.currentShuffled ?? q.options) : q.options,
      explanation: q.explanation, image: q.image, openAnswers, ratingAvg,
      correctOrder: q.type === "reorder" ? q.items : undefined,
      acceptedAnswers: q.type === "blank" ? q.answers : undefined,
      correctRate: answerableTotal > 0 ? Math.round((correct.length / answerableTotal) * 100) : undefined,
    });
  }

  function endGame(game: Game, io: Server, pin: string) {
    game.state = "ended";
    const lb = getLeaderboard(game);
    // Total skor tim (mode tim)
    let teamTotals;
    if (game.teams) {
      teamTotals = [0, 1].map((t) => ({
        team: t,
        name: TEAM_NAMES[t],
        score: [...game.players.values()].filter((p) => p.team === t).reduce((s, p) => s + p.score, 0),
      })).sort((a, b) => b.score - a.score);
    }
    // Simpan laporan permanen (bertahan setelah restart)
    saveReport({
      pin, quizId: game.quiz.id, title: game.quiz.title,
      endedAt: Date.now(), playerCount: lb.length,
      players: [...game.players.values()]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, correctCount: p.correctCount, team: game.teams ? p.team : undefined })),
      questions: game.questionStats,
      teamTotals,
    });
    io.to(`game:${pin}`).emit("game:ended", { leaderboard: lb, teamTotals });
    setTimeout(() => games.delete(pin), 5 * 60 * 1000);
  }

  const PORT = parseInt(process.env.PORT || "3000");
  httpServer.listen(PORT, () => {
    console.log(`\n  🎯  SiKuis — http://localhost:${PORT}\n`);
    // tanam bank soal AI di latar belakang (tidak menahan startup)
    setTimeout(() => { seedAiBanks().catch(() => {}); }, 5000);
  });
});
