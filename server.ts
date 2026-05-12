import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import type { Quiz, Question, Player, LBEntry, QuestionType } from "./lib/types";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─────────────────────────────────────────────────────────────────────────────
// Game state
// ─────────────────────────────────────────────────────────────────────────────
interface Answer { playerId: string; optionIndex: number; timeMs: number; }
interface Game {
  pin: string; quiz: Quiz; hostSocketId: string;
  players: Map<string, Player>;
  state: "lobby" | "question" | "review" | "ended";
  currentQuestionIndex: number; questionStartTime: number;
  answers: Map<string, Answer>;
  questionTimer: ReturnType<typeof setTimeout> | null;
}

const quizzes = new Map<string, Quiz>();
const games   = new Map<string, Game>();

// ─────────────────────────────────────────────────────────────────────────────
// Quiz library  — 7 categories, 70+ questions
// ─────────────────────────────────────────────────────────────────────────────

const Q = (
  type: QuestionType,
  question: string,
  options: string[],
  correctIndex: number,
  timeLimit: number,
  category: string,
  explanation: string
): Question => ({ id: uuidv4(), type, question, options, correctIndex, timeLimit, category, explanation });

const mc  = (q: string, opts: string[], ci: number, t: number, cat: string, exp: string) => Q("mc",   q, opts, ci, t, cat, exp);
const tf  = (q: string, correct: boolean, t: number, cat: string, exp: string) =>
  Q("tf", q, ["Benar", "Salah"], correct ? 0 : 1, t, cat, exp);
const poll = (q: string, opts: string[], t: number, cat: string, exp: string) => Q("poll", q, opts, -1, t, cat, exp);

// ── QUIZ 1: Sains & Teknologi ─────────────────────────────────────────────────
const scienceQuiz: Quiz = {
  id: "science",
  title: "Sains & Teknologi",
  description: "Jelajahi misteri alam semesta, fisika, biologi, dan ilmu pengetahuan modern",
  category: "Sains",
  icon: "⚗️",
  color: "#6366F1",
  difficulty: "Sedang",
  questions: [
    mc("Unsur paling melimpah di alam semesta adalah?",
      ["Helium", "Hidrogen", "Oksigen", "Karbon"],1, 20, "Sains",
      "Hidrogen mencakup ~75% semua materi di alam semesta. Matahari dan bintang-bintang sebagian besar terdiri dari hidrogen yang bereaksi fusi menjadi helium untuk menghasilkan energi."),
    mc("Kecepatan cahaya di ruang hampa sekitar?",
      ["150.000 km/s", "299.792 km/s", "450.000 km/s", "1.000.000 km/s"],1, 20, "Sains",
      "Cahaya bergerak 299.792 km/detik — cukup untuk mengelilingi bumi 7,5× dalam satu detik! Tidak ada yang bisa bergerak lebih cepat dari cahaya (relativitas Einstein)."),
    mc("Gas apa yang paling banyak di atmosfer bumi?",
      ["Oksigen (21%)", "Karbon dioksida", "Nitrogen (78%)", "Argon"],2, 20, "Sains",
      "Nitrogen mencakup 78% atmosfer, Oksigen 21%. CO₂ hanya 0.04% — tapi dampaknya terhadap iklim sangat besar karena ia memerangkap panas seperti selimut di sekitar bumi."),
    mc("Apa yang menghasilkan energi utama di dalam sel tubuh kita?",
      ["Ribosom", "Nukleus", "Mitokondria", "Lisosom"],2, 20, "Sains",
      "Mitokondria adalah 'pembangkit listrik' sel! Ia mengubah glukosa + oksigen → ATP (energi). Menariknya, mitokondria punya DNA sendiri — bukti bahwa ia dulunya adalah bakteri bebas yang 'ditelan' oleh sel primitif."),
    mc("Berapa lama cahaya matahari mencapai bumi?",
      ["3 menit", "8 menit 20 detik", "30 menit", "2 jam"],1, 20, "Sains",
      "Cahaya matahari menempuh 150 juta km dalam 8 menit 20 detik. Artinya, matahari yang kita lihat sekarang adalah kondisi matahari 8 menit lalu!"),
    tf("Suara dapat merambat di ruang hampa udara.", false, 15, "Sains",
      "Suara adalah gelombang mekanik yang butuh medium (udara, air, padatan) untuk merambat. Di luar angkasa tidak ada molekul — tidak ada suara. Ledakan bintang di luar angkasa terjadi dalam keheningan total!"),
    mc("Planet mana yang memiliki badai terbesar di tata surya?",
      ["Saturnus", "Jupiter", "Neptunus", "Uranus"],1, 20, "Sains",
      "Jupiter memiliki 'Great Red Spot' — badai besar yang sudah berlangsung lebih dari 350 tahun! Diameter badai ini lebih besar dari planet Bumi. Jupiter bisa menampung 1.300 Bumi di dalamnya."),
    mc("Berapa persen air yang ada di permukaan bumi?",
      ["51%", "61%", "71%", "81%"],2, 15, "Sains",
      "71% permukaan bumi tertutup air, namun hanya 2.5% yang merupakan air tawar, dan sebagian besar terkunci di es kutub & gletser. Hanya ~0.3% air tawar yang mudah diakses manusia!"),
    mc("Tulang terpanjang di tubuh manusia adalah?",
      ["Tulang betis (fibula)", "Tulang kering (tibia)", "Tulang paha (femur)", "Tulang lengan (humerus)"],2, 20, "Sains",
      "Tulang paha (femur) adalah tulang terpanjang (45-50 cm) dan terkuat di tubuh. Ia bisa menahan tekanan hingga 1.7 ton — lebih kuat dari beton!"),
    tf("Bintang yang kita lihat di langit malam mungkin sudah tidak ada lagi.", true, 15, "Sains",
      "Benar! Bintang terdekat di luar tata surya berjarak 4 tahun cahaya. Artinya cahaya yang kita lihat adalah kondisi bintang 4 tahun lalu. Bintang-bintang yang jauh mungkin cahayanya sudah ribuan tahun dalam perjalanan!"),
    mc("Apa itu supernova?",
      ["Bintang baru yang lahir", "Ledakan dahsyat bintang masif yang sekarat", "Galaksi yang bertabrakan", "Lubang hitam yang aktif"],1, 20, "Sains",
      "Supernova adalah ledakan terdahsyat di alam semesta — satu ledakan bisa lebih terang dari seluruh galaksi! Dari supernova inilah unsur-unsur berat seperti emas, uranium, dan karbon tersebar ke alam semesta. Kita harfiah terbuat dari debu bintang."),
    mc("Hukum gravitasi universal ditemukan oleh?",
      ["Albert Einstein", "Galileo Galilei", "Isaac Newton", "Johannes Kepler"],2, 20, "Sains",
      "Isaac Newton merumuskan hukum gravitasi pada 1687 (konon terinspirasi apel yang jatuh). Einstein kemudian menyempurnakannya dengan teori relativitas umum — menjelaskan bahwa gravitasi adalah 'kelengkungan ruang-waktu', bukan gaya biasa."),
  ],
};

// ── QUIZ 2: Sejarah Indonesia ──────────────────────────────────────────────────
const historyIdQuiz: Quiz = {
  id: "history-id",
  title: "Sejarah Indonesia",
  description: "Perjuangan kemerdekaan, kerajaan besar, pahlawan, dan peristiwa bersejarah nusantara",
  category: "Sejarah",
  icon: "🏛️",
  color: "#DC2626",
  difficulty: "Sedang",
  questions: [
    tf("Indonesia memproklamasikan kemerdekaan pada 17 Agustus 1945.", true, 15, "Sejarah",
      "Benar! Proklamasi dibacakan Soekarno-Hatta di Jl. Pegangsaan Timur 56, Jakarta pukul 10.00 pagi — dua hari setelah Jepang menyerah pada Sekutu. Naskah ditulis tangan Soekarno dan diketik Sayuti Melik."),
    mc("Siapa yang membacakan teks Proklamasi Kemerdekaan RI?",
      ["Mohammad Hatta", "Soekarno", "Sutan Sjahrir", "Ki Hajar Dewantara"],1, 20, "Sejarah",
      "Soekarno membacakan teks proklamasi dengan Hatta mendampingi. Kisah di baliknya dramatis: teks ditulis pada dini hari 17 Agustus setelah para pemuda 'menculik' Soekarno-Hatta ke Rengasdengklok agar segera memproklamasikan kemerdekaan."),
    mc("Candi Borobudur dibangun pada masa kerajaan apa?",
      ["Majapahit", "Sriwijaya", "Dinasti Syailendra", "Kediri"],2, 20, "Sejarah",
      "Borobudur dibangun Dinasti Syailendra abad ke-8 sampai ke-9 Masehi. Candi Buddha terbesar di dunia ini memiliki 2.672 panel relief dan 504 patung Buddha. Sempat terkubur abu vulkanik selama berabad-abad sebelum ditemukan kembali oleh Raffles pada 1814."),
    mc("Patih Majapahit yang bersumpah Sumpah Palapa adalah?",
      ["Ken Arok", "Raden Wijaya", "Gajah Mada", "Hayam Wuruk"],2, 20, "Sejarah",
      "Gajah Mada bersumpah tidak menikmati makanan 'palapa' sebelum menyatukan Nusantara. Di bawah pemerintahan Raja Hayam Wuruk + Gajah Mada (1350-1389), Majapahit mencapai kejayaan tertinggi, menguasai hampir seluruh nusantara."),
    tf("Bahasa Indonesia berasal dari Bahasa Jawa.", false, 15, "Sejarah",
      "Bahasa Indonesia berasal dari Bahasa Melayu — dipilih karena sudah lama dipakai sebagai bahasa perdagangan (lingua franca) di seluruh nusantara. Keputusan ini sangat bijak: tidak ada suku yang merasa bahasanya 'kalah', mempersatukan tanpa mempermalukan."),
    mc("Konferensi Asia-Afrika pertama diadakan di?",
      ["Jakarta", "Surabaya", "Bandung", "Yogyakarta"],2, 20, "Sejarah",
      "KAA pertama diadakan di Bandung, April 1955, dihadiri 29 negara. Menghasilkan 'Dasasila Bandung' — prinsip hidup berdampingan secara damai. Ini adalah momen bersejarah solidaritas negara-negara Asia-Afrika yang baru merdeka."),
    mc("Hari Kebangkitan Nasional diperingati setiap tanggal?",
      ["17 Agustus", "28 Oktober", "20 Mei", "10 November"],2, 15, "Sejarah",
      "20 Mei diperingati sebagai Hari Kebangkitan Nasional, menandai berdirinya Budi Utomo pada 1908 oleh dr. Wahidin Sudirohusodo dan mahasiswa STOVIA — organisasi modern pertama yang mencita-citakan kemajuan bangsa."),
    tf("Sumpah Pemuda diikrarkan pada 28 Oktober 1928.", true, 15, "Sejarah",
      "Benar! Sumpah Pemuda menegaskan tiga hal: Satu Nusa (tanah air Indonesia), Satu Bangsa (bangsa Indonesia), Satu Bahasa (Bahasa Indonesia). Momen ini menyatukan pemuda dari berbagai suku dan daerah yang sebelumnya masih bergerak secara terpisah."),
    mc("Siapakah pendiri organisasi Taman Siswa?",
      ["HOS Cokroaminoto", "Ki Hajar Dewantara", "R.A. Kartini", "Dewi Sartika"],1, 20, "Sejarah",
      "Ki Hajar Dewantara mendirikan Taman Siswa (1922) di Yogyakarta — sekolah untuk rakyat pribumi yang tidak mampu bersekolah di sekolah kolonial Belanda. Ia dikenal sebagai 'Bapak Pendidikan Nasional'. Ajarnya: Ing ngarso sung tulodo, ing madyo mangun karso, tut wuri handayani."),
    mc("Kerajaan Sriwijaya mencapai puncak kejayaan sebagai kerajaan?",
      ["Maritim berbasis perdagangan laut", "Agraris berbasis pertanian", "Militer berbasis penaklukan", "Religius berbasis kuil"],0, 20, "Sejarah",
      "Sriwijaya adalah kerajaan maritim terbesar di Asia Tenggara (abad 7-13). Dengan menguasai Selat Malaka, Sriwijaya mengontrol jalur perdagangan antara India, China, dan Arab. Palembang adalah pusat perdagangan dan pembelajaran Buddha yang penting."),
    mc("Apa nama perjanjian yang mengakhiri perang kemerdekaan Indonesia?",
      ["Perjanjian Renville", "Perjanjian Linggarjati", "Konferensi Meja Bundar", "Perjanjian Roem-Royen"],2, 20, "Sejarah",
      "Konferensi Meja Bundar (1949) di Den Haag menghasilkan pengakuan kedaulatan Indonesia oleh Belanda pada 27 Desember 1949. Sebelumnya ada Perjanjian Linggarjati (1946) dan Renville (1948) yang kedua-duanya lebih menguntungkan Belanda."),
  ],
};

// ── QUIZ 3: Matematika & Logika ────────────────────────────────────────────────
const mathQuiz: Quiz = {
  id: "math",
  title: "Matematika & Logika",
  description: "Latih otak dengan soal aljabar, geometri, bilangan, dan pola matematika yang menarik",
  category: "Matematika",
  icon: "🔢",
  color: "#059669",
  difficulty: "Sedang",
  questions: [
    mc("Jika 5x − 3 = 22, berapa nilai x?",
      ["4", "5", "6", "7"],1, 20, "Matematika",
      "5x − 3 = 22 → 5x = 25 → x = 5. Teknik dasar aljabar: isolasi variabel. Pindahkan konstanta ke kanan, bagi kedua sisi dengan koefisien. Aljabar digunakan setiap hari — dari menghitung kembalian hingga pemrograman AI!"),
    mc("Berapakah nilai 2¹⁰?",
      ["256", "512", "1.024", "2.048"],2, 15, "Matematika",
      "2¹⁰ = 1.024. Sangat penting di dunia komputer! 1 kilobyte = 1.024 bytes (bukan 1.000). Itulah kenapa kapasitas hard disk yang tertera selalu lebih besar dari yang terdeteksi di komputer."),
    mc("Luas lingkaran dengan jari-jari 7 cm (π ≈ 22/7) adalah?",
      ["44 cm²", "88 cm²", "154 cm²", "308 cm²"],2, 20, "Matematika",
      "L = πr² = (22/7) × 49 = 154 cm². Rumus ini ditemukan Archimedes lebih dari 2.000 tahun lalu! Lingkaran adalah satu-satunya bentuk 2D yang memaksimalkan luas dengan keliling terkecil — itulah kenapa planet, bintang, gelembung berbentuk bulat."),
    mc("Jumlah semua sudut dalam segi lima (pentagon) adalah?",
      ["360°", "450°", "540°", "720°"],2, 20, "Matematika",
      "Rumus: (n−2) × 180° = (5−2) × 180° = 540°. Segi empat = 360°, segi enam = 720°. Sarang lebah berbentuk segi enam karena bentuk ini paling efisien: keliling terkecil untuk luas terbesar, menghemat lilin!"),
    mc("√(16 × 25) = ?",
      ["16", "20", "25", "40"],1, 15, "Matematika",
      "√(16 × 25) = √400 = 20. Atau: √16 × √25 = 4 × 5 = 20. Sifat: √(a×b) = √a × √b. Akar kuadrat fundamental untuk fisika, rekayasa, dan statistik — misalnya rumus jarak Euclidean."),
    mc("Deret Fibonacci: 1, 1, 2, 3, 5, 8, 13, ___?",
      ["18", "20", "21", "24"],2, 20, "Matematika",
      "Jawabannya 21 (8+13=21). Deret Fibonacci muncul di alam: spiral bunga matahari, kerang nautilus, susunan daun (phyllotaxis), pola perkembangbiakan kelinci. Rasio antar bilangan mendekati 'Golden Ratio' (φ ≈ 1.618)!"),
    mc("Jika 30% dari suatu bilangan adalah 60, bilangan itu adalah?",
      ["120", "150", "180", "200"],3, 20, "Matematika",
      "30% × x = 60 → x = 60 ÷ 0.3 = 200. Cara cepat: 30% = 60, maka 10% = 20, sehingga 100% = 200. Persentase penting untuk memahami diskon, inflasi, statistik, dan laporan keuangan."),
    mc("Segitiga siku-siku dengan kaki 5 dan 12, panjang hipotenusanya?",
      ["13", "14", "15", "17"],0, 20, "Matematika",
      "c² = 5² + 12² = 25 + 144 = 169, c = 13. Tripel Pythagoras: 5-12-13. Teorema Pythagoras adalah salah satu rumus tertua yang masih digunakan: dari navigasi GPS hingga arsitektur modern."),
    mc("Berapa bilangan prima antara 10 sampai 30?",
      ["4", "5", "6", "7"],1, 25, "Matematika",
      "Bilangan prima antara 10-30: 11, 13, 17, 19, 23, 29 = 6 bilangan. Bilangan prima adalah fondasi kriptografi modern — enkripsi yang mengamankan bank, email, dan internet kita bergantung pada sulitnya memfaktorkan bilangan prima besar!"),
    poll("Bagian matematika mana yang menurutmu paling berguna dalam kehidupan sehari-hari?",
      ["Statistik & probabilitas", "Geometri & pengukuran", "Aljabar & persamaan", "Kalkulus & turunan"],
      30, "Matematika",
      "Semua cabang matematika penting! Statistik membantu kita membaca berita dengan kritis. Geometri dipakai arsitek. Aljabar ada di setiap baris kode. Kalkulus mendasari fisika dan AI."),
  ],
};

// ── QUIZ 4: Dunia Digital & Coding ─────────────────────────────────────────────
const digitalQuiz: Quiz = {
  id: "digital",
  title: "Dunia Digital & Internet",
  description: "Teknologi, internet, pemrograman, keamanan siber, dan inovasi digital yang mengubah dunia",
  category: "Teknologi",
  icon: "💻",
  color: "#2563EB",
  difficulty: "Sedang",
  questions: [
    mc("Siapa yang menciptakan World Wide Web (WWW)?",
      ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Vint Cerf"],2, 20, "Teknologi",
      "Tim Berners-Lee menciptakan WWW pada 1989 di CERN, Swiss. Yang luar biasa: ia tidak mempatenkan penemuannya agar internet bisa gratis untuk semua orang. Sebuah keputusan yang mengubah dunia!"),
    mc("HTTP singkatan dari?",
      ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Home Text Transfer Protocol", "Hybrid Transfer Processing"],0, 20, "Teknologi",
      "HTTP (HyperText Transfer Protocol) adalah fondasi data transfer di web. HTTPS menambahkan lapisan enkripsi SSL/TLS — itu sebabnya ada gembok kecil di address bar browser. Selalu pastikan situs yang dikunjungi menggunakan HTTPS!"),
    mc("1 Gigabyte (GB) setara dengan berapa Megabyte (MB) dalam sistem biner?",
      ["100 MB", "512 MB", "1.000 MB", "1.024 MB"],3, 20, "Teknologi",
      "1 GB = 1.024 MB dalam sistem biner (basis 2). Namun produsen storage sering menggunakan 1 GB = 1.000 MB. Selisih itulah yang membuat hard disk 1 TB terlihat hanya 931 GB di Windows!"),
    mc("Bahasa pemrograman apa yang paling banyak digunakan untuk web front-end?",
      ["Python", "Java", "JavaScript", "C++"],2, 20, "Teknologi",
      "JavaScript adalah satu-satunya bahasa yang berjalan langsung di browser. Hampir setiap website menggunakannya. Node.js membawa JS ke server-side, React/Vue/Angular menjadikannya basis aplikasi web modern."),
    tf("Python adalah bahasa pemrograman yang dikompilasi (compiled language).", false, 20, "Teknologi",
      "Python adalah bahasa yang diinterpretasikan (interpreted). Kode dieksekusi baris per baris secara langsung, membuatnya lebih mudah dikembangkan tapi lebih lambat dari C++. Python sangat populer untuk AI/ML, data science, dan otomasi."),
    mc("Apa itu 'open source'?",
      ["Software berbayar premium", "Software pemerintah", "Software yang kode sumbernya terbuka & bebas dimodifikasi", "Software tanpa virus"],2, 20, "Teknologi",
      "Open source = kode bisa dilihat, dimodifikasi, dibagikan siapa saja. Linux, Android, Python, Firefox, WordPress semuanya open source. Model ini mendorong inovasi kolaboratif yang luar biasa — ribuan developer di seluruh dunia berkontribusi gratis!"),
    mc("Apa yang dimaksud dengan Cloud Computing?",
      ["Komputasi menggunakan cuaca", "Layanan komputasi via internet (server, storage, database)", "Software berbasis cuaca", "Jaringan komputer berbentuk awan"],1, 20, "Teknologi",
      "Cloud computing = mengakses sumber daya komputasi (server, storage, aplikasi) via internet, bukan dari perangkat lokal. AWS (Amazon), Azure (Microsoft), GCP (Google) adalah provider terbesar. Hampir semua app yang kamu pakai berjalan di cloud!"),
    mc("Apa itu enkripsi end-to-end (E2E)?",
      ["Data dienkripsi hanya di server", "Data terenkripsi dari pengirim ke penerima, tidak bisa dibaca siapapun di tengah", "Enkripsi yang menggunakan dua kunci", "Enkripsi untuk website saja"],1, 25, "Teknologi",
      "E2E encryption berarti hanya pengirim dan penerima yang bisa membaca pesan — bahkan platform pun tidak bisa. WhatsApp dan Signal menggunakannya. Ini penting untuk privasi, tapi juga jadi perdebatan antara privasi pengguna vs keamanan nasional."),
    mc("Apa yang dimaksud algoritma dalam pemrograman?",
      ["Jenis bahasa pemrograman", "Langkah-langkah sistematis untuk menyelesaikan masalah", "Database khusus", "Framework JavaScript"],1, 20, "Teknologi",
      "Algoritma adalah resep atau langkah-langkah logis untuk menyelesaikan masalah. Google Search, rekomendasi Netflix, feed Instagram — semua digerakkan algoritma canggih. Memahami algoritma adalah skill inti setiap programmer."),
    poll("Platform digital mana yang paling mengubah cara kamu belajar?",
      ["YouTube", "Aplikasi belajar (Duolingo, Ruangguru, dll)", "ChatGPT / AI", "Google / Wikipedia"],
      30, "Teknologi",
      "AI seperti ChatGPT sedang merevolusi cara belajar. Studi menunjukkan AI bisa menjadi 'tutor personal' yang disesuaikan dengan kebutuhan tiap individu — sesuatu yang selama ini hanya bisa dimiliki orang kaya!"),
    mc("RAM dalam komputer berfungsi sebagai?",
      ["Penyimpanan permanen file", "Prosesor utama", "Memori kerja sementara", "Koneksi internet"],2, 15, "Teknologi",
      "RAM (Random Access Memory) adalah memori sementara — data hilang saat komputer dimatikan. RAM menyimpan data yang sedang aktif digunakan. Makin besar RAM, makin banyak program yang bisa berjalan bersamaan tanpa lag."),
    mc("Apa itu 'phishing' dalam konteks keamanan siber?",
      ["Virus yang merusak hardware", "Penipuan untuk mencuri informasi sensitif dengan menyamar sebagai pihak terpercaya", "Serangan yang melambatkan server", "Software mata-mata"],1, 25, "Teknologi",
      "Phishing adalah penipuan via email/SMS/website palsu yang meniru lembaga terpercaya (bank, pemerintah) untuk mencuri password atau data kartu kredit. 80%+ serangan siber dimulai dari phishing. Selalu verifikasi URL sebelum memasukkan data pribadi!"),
  ],
};

// ── QUIZ 5: Kesehatan & Biologi ────────────────────────────────────────────────
const healthQuiz: Quiz = {
  id: "health",
  title: "Kesehatan & Biologi Tubuh",
  description: "Rahasia tubuh manusia, kesehatan, nutrisi, dan ilmu biologi yang perlu kamu ketahui",
  category: "Kesehatan",
  icon: "🧬",
  color: "#EC4899",
  difficulty: "Mudah",
  questions: [
    mc("Berapa jumlah tulang dalam tubuh manusia dewasa?",
      ["156", "186", "206", "256"],2, 20, "Kesehatan",
      "Tubuh manusia dewasa memiliki 206 tulang. Bayi lahir dengan 270-300 tulang — banyak yang menyatu saat tumbuh. Tulang kita terus beregenerasi: setiap 10 tahun, semua tulang kita sudah diperbarui!"),
    tf("Jantung manusia berdenyut rata-rata 100-120 kali per menit saat istirahat.", false, 15, "Kesehatan",
      "Detak normal saat istirahat: 60-100 kali/menit. Atlet terlatih bisa 40-60/menit karena jantungnya lebih efisien. Lebih dari 100 bpm disebut tachycardia. Jantung berdetak ~100.000 kali/hari — memompa 7.000 liter darah!"),
    mc("Organ internal terbesar di tubuh manusia adalah?",
      ["Paru-paru", "Usus besar", "Hati (liver)", "Lambung"],2, 20, "Kesehatan",
      "Hati adalah organ internal terbesar (~1.5 kg). Ia melakukan 500+ fungsi: menyaring racun, memproduksi protein, menyimpan energi, dan menghasilkan empedu. Hati bisa beregenerasi — bahkan setelah kehilangan 70% jaringannya!"),
    mc("Vitamin D diproduksi tubuh kita dari?",
      ["Suplemen vitamin", "Paparan sinar matahari pada kulit", "Makanan manis", "Olahraga intensif"],1, 20, "Kesehatan",
      "Kulit mengubah sinar UV-B matahari menjadi Vitamin D3. Vitamin D penting untuk penyerapan kalsium, kekuatan tulang, dan sistem imun. 15-20 menit sinar pagi (sebelum jam 10) sudah cukup untuk produksi harian!"),
    mc("Berapa persen tubuh manusia terdiri dari air?",
      ["40-50%", "55-65%", "70-80%", "85-95%"],1, 20, "Kesehatan",
      "Tubuh manusia dewasa 55-65% adalah air. Otak 75% air, tulang 22%, darah 83%! Kehilangan 2% cairan sudah menurunkan konsentrasi dan performa. Minum 8 gelas air/hari bukan mitos — tapi kebutuhan variatif tergantung aktivitas dan iklim."),
    tf("Antibiotik efektif untuk mengobati penyakit yang disebabkan virus seperti flu.", false, 15, "Kesehatan",
      "Antibiotik HANYA efektif untuk bakteri, tidak untuk virus! Flu, pilek, COVID-19 = virus. Minum antibiotik sembarangan menciptakan bakteri 'super' yang kebal antibiotik (antibiotic resistance) — ancaman kesehatan global yang serius."),
    mc("Apa fungsi utama sel darah putih (leukosit)?",
      ["Mengangkut oksigen ke seluruh tubuh", "Membentuk bekuan darah", "Melawan infeksi dan penyakit", "Memproduksi energi"],2, 20, "Kesehatan",
      "Leukosit adalah sistem pertahanan tubuh kita. Ada beberapa jenis: neutrofil (menyerang bakteri cepat), limfosit (menghasilkan antibodi), makrofag (memakan partikel asing). Saat infeksi, produksi leukosit meningkat drastis."),
    mc("Organ manakah yang mengatur kadar gula darah?",
      ["Lambung", "Hati", "Pankreas", "Ginjal"],2, 20, "Kesehatan",
      "Pankreas menghasilkan insulin (menurunkan gula darah) dan glukagon (menaikkan). Pada diabetes tipe 1, sel pankreas rusak sehingga tidak bisa produksi insulin. Tipe 2: tubuh resisten terhadap insulin. Keduanya bisa dikontrol dengan gaya hidup sehat!"),
    mc("Berapa lama rata-rata satu siklus tidur manusia?",
      ["30 menit", "60 menit", "90 menit", "120 menit"],2, 20, "Kesehatan",
      "Satu siklus tidur = ±90 menit, terdiri dari tidur ringan, tidur dalam (NREM), dan REM. Tidur 7-9 jam = 5-6 siklus penuh. Kurang tidur menurunkan imunitas, konsentrasi, dan bahkan mengubah ekspresi gen! Tidur bukan pemborosan waktu — itu investasi kesehatan."),
    poll("Kebiasaan sehat mana yang menurutmu paling sulit untuk dilakukan secara konsisten?",
      ["Olahraga rutin minimal 30 menit/hari", "Tidur cukup 7-8 jam/malam", "Makan sayur & buah setiap hari", "Minum 8 gelas air/hari"],
      30, "Kesehatan",
      "Penelitian menunjukkan tidur cukup sering paling diabaikan di era digital. Namun olahraga rutin memberikan manfaat paling luas: kesehatan jantung, otak, mental, dan imunitas sekaligus. Kuncinya: mulai dari yang paling kecil!"),
  ],
};

// ── QUIZ 6: Bumi & Lingkungan ──────────────────────────────────────────────────
const envQuiz: Quiz = {
  id: "environment",
  title: "Bumi & Lingkungan Hidup",
  description: "Perubahan iklim, ekosistem, energi terbarukan, dan tantangan lingkungan hidup kita",
  category: "Lingkungan",
  icon: "🌍",
  color: "#16A34A",
  difficulty: "Sedang",
  questions: [
    mc("Gas rumah kaca utama yang dihasilkan aktivitas manusia adalah?",
      ["Nitrogen (N₂)", "Oksigen (O₂)", "Karbon Dioksida (CO₂)", "Argon (Ar)"],2, 20, "Lingkungan",
      "CO₂ dari pembakaran bahan bakar fosil adalah penyebab utama pemanasan global. Sejak revolusi industri, konsentrasi CO₂ naik dari 280 ppm ke 420 ppm — tertinggi dalam 3 JUTA tahun terakhir. Setiap 1°C kenaikan suhu = dampak bencana yang jauh lebih besar!"),
    tf("Hutan Amazon menghasilkan 20% oksigen bumi.", false, 20, "Lingkungan",
      "Ini mitos populer! Amazon memang memproduksi oksigen besar, tapi organisme di dalamnya juga mengkonsumsi jumlah yang sama. 50-80% oksigen bumi dihasilkan fitoplankton laut — alga mikroskopik di samudra. Itulah kenapa kesehatan laut sangat penting!"),
    mc("Plastik membutuhkan berapa lama untuk terurai di alam?",
      ["2-5 tahun", "10-50 tahun", "100-200 tahun", "400-1.000 tahun"],3, 20, "Lingkungan",
      "Plastik bisa bertahan 400-1.000 tahun! Ia tidak benar-benar terurai tapi menjadi mikroplastik yang masuk ke rantai makanan. Mikroplastik sudah ditemukan di ikan, air minum, dan bahkan dalam darah manusia. Indonesia adalah penghasil sampah plastik laut terbesar ke-2 di dunia!"),
    mc("Terumbu karang mencakup berapa persen lautan tapi mendukung kehidupan laut dalam jumlah?",
      ["5% lautan, 50% kehidupan", "10% lautan, 70% kehidupan", "0.5% lautan, 25% kehidupan", "2% lautan, 40% kehidupan"],2, 25, "Lingkungan",
      "Terumbu karang hanya 0.5% lautan tapi menopang 25% semua spesies laut! Indonesia memiliki segitiga karang (Coral Triangle) terbesar di dunia. Sayangnya, 50% terumbu karang sudah hilang sejak 1950 akibat pemutihan (bleaching) dari pemanasan laut."),
    mc("Sumber energi terbarukan yang tumbuh paling cepat saat ini adalah?",
      ["Energi nuklir", "Energi air (hidroelektrik)", "Energi surya (solar)", "Energi angin"],2, 20, "Lingkungan",
      "Energi surya adalah yang tumbuh paling cepat — biayanya turun 90% dalam 10 tahun terakhir! Solar kini lebih murah dari batu bara di banyak negara. Di 2050, proyeksi energi surya bisa mensuplai 40% kebutuhan listrik global. Indonesia dengan garis khatulistiwa sangat potensial!"),
    tf("Lapisan ozon di stratosfer melindungi bumi dari sinar ultraviolet berbahaya.", true, 15, "Lingkungan",
      "Benar! Ozon (O₃) menyerap 97-99% sinar UV-B berbahaya. Tanpanya, kanker kulit dan katarak akan melonjak. Lubang ozon akibat CFC (freon) sudah membaik berkat Protokol Montreal 1987 — salah satu kisah sukses kerja sama lingkungan global!"),
    mc("Apa efek 'Urban Heat Island'?",
      ["Kota lebih dingin karena AC", "Kota lebih panas dari pedesaan sekitarnya karena beton & aspal", "Pulau terisolasi di tengah lautan", "Efek rumah kaca khusus di kota"],1, 25, "Lingkungan",
      "Urban Heat Island: kota bisa 1-7°C lebih panas dari pedesaan sekitarnya! Penyebab: beton & aspal menyerap panas (tidak seperti tanah & pohon), AC membuang panas ke luar, kendaraan & industri. Solusi: lebih banyak taman kota dan green roof."),
    mc("Manakah dampak terbesar perubahan iklim yang sudah terasa hari ini?",
      ["Cuaca lebih panas dan ekstrem", "Peningkatan biodiversitas", "Lautan menjadi lebih segar", "Gunung es bertambah"],0, 20, "Lingkungan",
      "Cuaca ekstrem — gelombang panas, banjir, kekeringan, badai — semakin sering dan intens. Tahun 2023 adalah tahun terpanas dalam sejarah pencatatan. Gletser mencair mempercepat kenaikan permukaan laut yang mengancam kota-kota pesisir."),
    poll("Langkah apa yang paling siap kamu lakukan untuk mengurangi dampak lingkungan?",
      ["Mengurangi plastik sekali pakai", "Hemat energi di rumah", "Lebih banyak naik transportasi umum", "Mengurangi konsumsi daging"],
      30, "Lingkungan",
      "Semua pilihan berdampak! Penelitian menunjukkan pola makan (kurangi daging merah) memiliki dampak karbon terbesar secara individual. Namun perubahan kebijakan sistemik (energi terbarukan, regulasi industri) jauh lebih berdampak dari pilihan individual."),
    mc("Indonesia memiliki berapa persen hutan hujan tropis dunia?",
      ["2%", "5%", "10%", "15%"],2, 20, "Lingkungan",
      "Indonesia memiliki ~10% hutan tropis dunia — terbesar ketiga setelah Brazil dan Kongo. Hutan ini menyimpan miliaran ton karbon dan menjadi rumah 10-15% spesies dunia. Deforestasi Indonesia adalah salah satu yang tertinggi — tantangan besar bagi generasi kita."),
  ],
};

// ── QUIZ 7: Pengetahuan Umum ───────────────────────────────────────────────────
const generalQuiz: Quiz = {
  id: "general",
  title: "Pengetahuan Umum & Dunia",
  description: "Geografi, seni, budaya, rekor dunia, dan fakta menarik yang memperluas wawasanmu",
  category: "Pengetahuan",
  icon: "🌐",
  color: "#7C3AED",
  difficulty: "Mudah",
  questions: [
    mc("Berapa banyak bahasa yang ada di dunia saat ini?",
      ["Sekitar 1.000", "Sekitar 3.000", "Sekitar 7.000", "Lebih dari 12.000"],2, 20, "Pengetahuan",
      "Ada ~7.000 bahasa di dunia! 40% di antaranya terancam punah. Indonesia memiliki 700+ bahasa daerah — kekayaan linguistik yang luar biasa. Bahasa yang paling banyak penutur native: Mandarin (920 juta), Spanyol (475 juta), Inggris (370 juta)."),
    tf("Tembok Besar China bisa dilihat dari luar angkasa dengan mata telanjang.", false, 20, "Pengetahuan",
      "Ini mitos! Tembok Besar hanya selebar 5-8 meter — terlalu tipis untuk dilihat dari luar angkasa tanpa alat bantu. Bahkan astronot China Yang Liwei yang mencoba melihatnya mengaku gagal. Mitos ini sudah beredar lebih dari 300 tahun!"),
    mc("Negara manakah yang memiliki luas wilayah terbesar di dunia?",
      ["Kanada", "China", "Amerika Serikat", "Rusia"],3, 15, "Pengetahuan",
      "Rusia adalah negara terluas di dunia (17 juta km²) — mencakup 11% daratan bumi dan 11 zona waktu! Jika Rusia dibagi dua, bagian terbesar pun masih akan menjadi negara terluas di dunia. Namun populasinya 'hanya' 144 juta."),
    mc("Piramida Giza dibangun sekitar tahun?",
      ["1.500 SM", "2.560 SM", "4.000 SM", "500 SM"],1, 20, "Pengetahuan",
      "Piramida Giza dibangun 2.560-2.540 SM oleh Firaun Khufu. Selama 3.800 tahun, ini adalah bangunan tertinggi di dunia (146 m). Dibangun oleh puluhan ribu pekerja (bukan budak seperti mitos — itu adalah pekerja terampil yang digaji dan dihormati)."),
    mc("Olimpiade modern pertama diadakan di?",
      ["London, 1880", "Paris, 1900", "Athena, 1896", "Berlin, 1904"],2, 20, "Pengetahuan",
      "Olimpiade modern pertama: Athena 1896, digagas Pierre de Coubertin. Ada 14 negara, 241 atlet (semua laki-laki). Olimpiade 2024 di Paris diikuti 200+ negara, ribuan atlet perempuan dan laki-laki secara seimbang. Kemajuan luar biasa dalam 128 tahun!"),
    mc("Bahasa Inggris menjadi bahasa resmi di berapa negara?",
      ["27 negara", "42 negara", "67 negara", "100+ negara"],1, 20, "Pengetahuan",
      "Bahasa Inggris adalah bahasa resmi di 67 negara — paling banyak di dunia. Sebagai bahasa kedua/komunikasi internasional, digunakan lebih dari 1,5 miliar orang. Ini warisan dari penyebaran Kerajaan Inggris yang pernah menguasai 25% daratan bumi."),
    tf("Gunung Everest adalah gunung tertinggi jika diukur dari inti bumi.", false, 20, "Pengetahuan",
      "Gunung Chimborazo di Ekuador lebih tinggi dari inti bumi! Bumi mengembung di ekuator, jadi titik yang paling jauh dari inti bumi adalah Chimborazo. Everest tertinggi dari 'permukaan laut' — keduanya benar dengan definisi berbeda."),
    mc("Lagu 'Happy Birthday to You' awalnya memiliki?",
      ["Hak cipta yang ketat (sudah bebas tahun 2016)", "Tidak pernah punya hak cipta", "Hak cipta yang masih berlaku", "Hak cipta pemerintah Amerika"],0, 25, "Pengetahuan",
      "Happy Birthday memiliki hak cipta yang diperdebatkan selama puluhan tahun — Warner/Chappell Music mengklaim dan memungut royalti. Tahun 2016 pengadilan memutuskan lagu ini milik publik. Estimasi kerugian atas royalti tidak sah: ratusan juta dolar!"),
    mc("Berapa jumlah negara anggota PBB (Perserikatan Bangsa-Bangsa) saat ini?",
      ["172", "185", "193", "210"],2, 15, "Pengetahuan",
      "Ada 193 negara anggota PBB + 2 pengamat (Vatikan & Palestina). Negara terbaru bergabung: Montenegro (2006), Serbia (2006), Sudan Selatan (2011). PBB didirikan 1945 dengan hanya 51 negara anggota pertama."),
    poll("Menurut kamu, kemampuan apa yang paling penting untuk generasi masa depan?",
      ["Literasi digital & AI", "Kreativitas & berpikir kritis", "Kecerdasan emosional & empati", "Kemampuan kolaborasi lintas budaya"],
      30, "Pengetahuan",
      "Laporan World Economic Forum: di era AI, kemampuan yang TIDAK bisa digantikan mesin adalah yang paling berharga. Kreativitas, empati, pemikiran kritis, dan kolaborasi — semua 'soft skills' justru menjadi 'hard skills' di masa depan!"),
    mc("Manakah salah satu sumber listrik terbersih di dunia?",
      ["Pembangkit batu bara", "Energi nuklir", "Gas alam", "Minyak bumi"],1, 20, "Pengetahuan",
      "Energi nuklir menghasilkan emisi karbon paling sedikit per kWh — bahkan lebih rendah dari solar dan angin jika dihitung total siklus produksi. Tragedi Chernobyl (1986) dan Fukushima (2011) memang menakutkan, tapi secara statistik, nuklir jauh lebih aman dari batu bara yang membunuh jutaan orang setiap tahun lewat polusi udara."),
  ],
};

// ── QUIZ 8: Ekonomi & Bisnis ────────────────────────────────────────────────────
const economicsQuiz: Quiz = {
  id: "economics",
  title: "Ekonomi, Bisnis & Keuangan",
  description: "Pahami cara kerja ekonomi, investasi, bisnis global, dan literasi keuangan yang wajib kamu tahu",
  category: "Ekonomi",
  icon: "📈",
  color: "#CA8A04",
  difficulty: "Sedang",
  questions: [
    mc("Apa yang dimaksud dengan inflasi?",
      ["Penurunan nilai barang secara umum", "Kenaikan nilai mata uang", "Kenaikan harga barang & jasa secara umum", "Penurunan suku bunga bank"],2, 20, "Ekonomi",
      "Inflasi = kenaikan harga barang secara umum dari waktu ke waktu. Inflasi rendah (2-3%) itu sehat — mendorong orang berinvestasi daripada menabung. Hiperinflasi seperti Zimbabwe (2008, 89 sextillion%!) atau Jerman Weimar membuat uang tidak berharga."),
    mc("GDP (Gross Domestic Product / PDB) mengukur?",
      ["Total utang negara", "Total nilai barang & jasa yang diproduksi suatu negara dalam setahun", "Total tabungan masyarakat", "Total ekspor dikurangi impor"],1, 20, "Ekonomi",
      "GDP adalah ukuran total 'kue ekonomi' suatu negara. Amerika Serikat GDP terbesar (~$27 triliun). Indonesia berada di urutan ke-16 (~$1.4 triliun). GDP per kapita lebih penting untuk mengukur kesejahteraan rata-rata — Indonesia masih tertinggal jauh dari Singapura!"),
    tf("Bursa Efek Indonesia (BEI) berlokasi di Surabaya.", false, 15, "Ekonomi",
      "BEI berlokasi di Jakarta. BEI adalah gabungan Bursa Efek Jakarta (BEJ) + Bursa Efek Surabaya (BES) yang merger pada 2007. BEI mencatatkan 900+ perusahaan. Investasi saham jangka panjang di BEI rata-rata return 10-15%/tahun secara historis."),
    mc("Apa itu 'compound interest' (bunga majemuk)?",
      ["Bunga dihitung hanya dari modal awal", "Bunga yang dihitung dari modal + bunga yang sudah terakumulasi", "Bunga tetap setiap tahun", "Bunga dari pinjaman bank"],1, 25, "Ekonomi",
      "Einstein konon menyebut bunga majemuk sebagai 'keajaiban dunia ke-8'. Jika kamu investasi Rp 10 juta dengan return 10%/tahun selama 30 tahun, akan menjadi Rp 174 juta! Itu kekuatan waktu + bunga majemuk. Mulai investasi sedini mungkin!"),
    mc("Apa yang dimaksud dengan 'diversifikasi' dalam investasi?",
      ["Investasi semua di satu aset terbaik", "Menyebar investasi ke berbagai aset berbeda untuk kurangi risiko", "Investasi di luar negeri saja", "Selalu menjual saat harga turun"],1, 25, "Ekonomi",
      "'Jangan taruh semua telur dalam satu keranjang.' Diversifikasi = spread investasi ke saham, obligasi, properti, emas, dll. Ketika satu turun, yang lain mungkin naik. Ini strategi inti manajemen risiko yang dipakai oleh semua investor profesional."),
    mc("Siapa pendiri Amazon?",
      ["Bill Gates", "Jeff Bezos", "Elon Musk", "Mark Zuckerberg"],1, 15, "Ekonomi",
      "Jeff Bezos mendirikan Amazon pada 1994 dari garasi di Seattle, awalnya toko buku online. Kini Amazon menguasai e-commerce global, cloud computing (AWS — 30% market share), streaming (Prime Video), dan masih terus berkembang. Nilai perusahaan: $1.7 triliun!"),
    mc("Apa itu 'startup unicorn'?",
      ["Startup teknologi apa saja", "Startup dengan valuasi lebih dari $1 miliar sebelum IPO", "Startup yang sudah IPO (go public)", "Startup yang didukung pemerintah"],1, 20, "Ekonomi",
      "Unicorn = startup valuasi $1 miliar+. Decacorn = $10 miliar+. Indonesia memiliki beberapa unicorn: GoTo (gabungan Gojek-Tokopedia), Traveloka, OVO, Bukalapak, dll. Gojek adalah unicorn pertama di Asia Tenggara — lahir dari Indonesia!"),
    poll("Investasi apa yang menurutmu paling tepat untuk mulai di usia muda?",
      ["Saham / reksa dana", "Properti / tanah", "Kripto / aset digital", "Investasi pada diri sendiri (pendidikan, skill)"],
      30, "Ekonomi",
      "Para ahli keuangan hampir sepakat: investasi terbaik untuk anak muda adalah pada diri sendiri — skill dan pengetahuan yang meningkatkan penghasilan seumur hidup. Setelah itu, mulai investasi finansial sesegera mungkin, sekecil apapun jumlahnya, karena waktu adalah aset terbesar."),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Register all quizzes
// ─────────────────────────────────────────────────────────────────────────────
[scienceQuiz, historyIdQuiz, mathQuiz, digitalQuiz, healthQuiz, envQuiz, generalQuiz, economicsQuiz]
  .forEach((q) => quizzes.set(q.id, q));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calcScore(type: QuestionType, timeMs: number, timeLimit: number): number {
  if (type === "poll") return 150;
  if (type === "tf")   return Math.round(800 * Math.max(0, 1 - timeMs / (timeLimit * 1000)));
  return Math.round(1000 * Math.max(0, 1 - timeMs / (timeLimit * 1000)));
}

function getLeaderboard(game: Game): LBEntry[] {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, lastScore: p.lastScore, id: p.id }));
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

    // list quizzes
    socket.on("quizzes:list", (_data: unknown, cb: (list: object[]) => void) => {
      const list = Array.from(quizzes.values()).map((q) => ({
        id: q.id, title: q.title, description: q.description,
        category: q.category, icon: q.icon, color: q.color,
        difficulty: q.difficulty,
        questionCount: q.questions.length,
        estimatedMins: Math.ceil(q.questions.reduce((s, x) => s + x.timeLimit, 0) / 60) + q.questions.length,
        types: [...new Set(q.questions.map((x) => x.type))],
      }));
      cb(list);
    });

    // host: start with existing quiz
    socket.on("host:create", ({ quizId }: { quizId: string }, cb: (r: object) => void) => {
      const quiz = quizzes.get(quizId);
      if (!quiz) return cb({ error: "Kuis tidak ditemukan" });
      const pin = makeGame(quiz, socket.id);
      socket.join(`game:${pin}`);
      socket.data.pin = pin; socket.data.isHost = true;
      cb({ pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length, description: quiz.description });
    });

    // host: custom quiz
    socket.on("host:createCustom",
      ({ title, questions }: { title: string; questions: Omit<Question, "id">[] }, cb: (r: object) => void) => {
        if (!title || !questions?.length) return cb({ error: "Data tidak valid" });
        const quiz: Quiz = {
          id: uuidv4(), title, description: "Kuis kustom",
          category: "Kustom", icon: "✏️", color: "#6366F1",
          difficulty: "Sedang",
          questions: questions.map((q) => ({ ...q, id: uuidv4(), category: q.category ?? "Kustom", explanation: q.explanation ?? "" })),
        };
        quizzes.set(quiz.id, quiz);
        const pin = makeGame(quiz, socket.id);
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

        const player: Player = { id: socket.id, name: cleanName, score: 0, streak: 0, lastScore: 0 };
        game.players.set(socket.id, player);
        socket.join(`game:${pin}`);
        socket.data.pin = pin; socket.data.isPlayer = true;

        io.to(`game:${pin}`).emit("game:playerJoined", { players: playerList(game) });
        cb({ ok: true, quizTitle: game.quiz.title, totalQuestions: game.quiz.questions.length });
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

    // player: answer
    socket.on("player:answer",
      ({ pin, optionIndex }: { pin: string; optionIndex: number }, cb: (r: object) => void) => {
        const game = games.get(pin);
        if (!game || game.state !== "question") return cb({ error: "Bukan waktunya menjawab." });
        if (game.answers.has(socket.id))        return cb({ error: "Sudah menjawab." });
        if (optionIndex < 0 || optionIndex > 3) return cb({ error: "Pilihan tidak valid." });

        game.answers.set(socket.id, { playerId: socket.id, optionIndex, timeMs: Date.now() - game.questionStartTime });
        cb({ ok: true });
        io.to(game.hostSocketId).emit("game:answerCount", { answered: game.answers.size, total: game.players.size });

        if (game.answers.size >= game.players.size) { clearTimer(game); revealResults(game, io, pin); }
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
  function makeGame(quiz: Quiz, hostId: string): string {
    let pin = generatePin();
    while (games.has(pin)) pin = generatePin();
    games.set(pin, {
      pin, quiz, hostSocketId: hostId,
      players: new Map(), state: "lobby",
      currentQuestionIndex: -1, questionStartTime: 0,
      answers: new Map(), questionTimer: null,
    });
    return pin;
  }

  function playerList(game: Game) {
    return [...game.players.values()].map((p) => ({ id: p.id, name: p.name }));
  }

  function clearTimer(game: Game) {
    if (game.questionTimer) { clearTimeout(game.questionTimer); game.questionTimer = null; }
  }

  function startNextQuestion(game: Game, io: Server, pin: string) {
    game.currentQuestionIndex++;
    game.state = "question";
    game.answers = new Map();
    game.questionStartTime = Date.now();
    const q = game.quiz.questions[game.currentQuestionIndex];
    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;

    io.to(`game:${pin}`).emit("game:question", {
      index: game.currentQuestionIndex, total: game.quiz.questions.length,
      type: q.type, question: q.question, options: q.options,
      timeLimit: q.timeLimit, category: q.category, isLast,
    });

    game.questionTimer = setTimeout(() => { game.questionTimer = null; revealResults(game, io, pin); }, q.timeLimit * 1000);
  }

  function revealResults(game: Game, io: Server, pin: string) {
    if (game.state !== "question") return;
    game.state = "review";

    const q = game.quiz.questions[game.currentQuestionIndex];
    const counts = [0, 0, 0, 0];
    const correct: string[] = [];
    const wrong: string[] = [];

    game.answers.forEach((ans, pid) => {
      if (ans.optionIndex >= 0 && ans.optionIndex < 4) counts[ans.optionIndex]++;
      if (q.correctIndex === -1 || ans.optionIndex === q.correctIndex) correct.push(pid);
      else wrong.push(pid);
    });

    // Award scores
    correct.forEach((pid) => {
      const p = game.players.get(pid); const a = game.answers.get(pid);
      if (!p || !a) return;
      p.streak++;
      const streakBonus = Math.min(p.streak - 1, 5) * 50;
      const earned = calcScore(q.type, a.timeMs, q.timeLimit) + streakBonus;
      p.lastScore = earned; p.score += earned;
    });
    wrong.forEach((pid) => { const p = game.players.get(pid); if (p) { p.streak = 0; p.lastScore = 0; } });
    game.players.forEach((p) => { if (!game.answers.has(p.id)) { p.streak = 0; p.lastScore = 0; } });

    const isLast = game.currentQuestionIndex === game.quiz.questions.length - 1;
    io.to(`game:${pin}`).emit("game:questionResults", {
      correctIndex: q.correctIndex, counts, leaderboard: getLeaderboard(game),
      isLast, type: q.type, question: q.question, options: q.options, explanation: q.explanation,
    });
  }

  function endGame(game: Game, io: Server, pin: string) {
    game.state = "ended";
    io.to(`game:${pin}`).emit("game:ended", { leaderboard: getLeaderboard(game) });
    setTimeout(() => games.delete(pin), 5 * 60 * 1000);
  }

  const PORT = parseInt(process.env.PORT || "3000");
  httpServer.listen(PORT, () => console.log(`\n  🎮  KUIS! — http://localhost:${PORT}\n`));
});
