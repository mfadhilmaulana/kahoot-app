import { mc, tf, quiz } from "./extra-sd1";

export const akuntansi = quiz("akuntansi", "Akuntansi Dasar", "Kuliah", "ledger", "#CA8A04", "Sedang", "Akuntansi",
  "Persamaan akuntansi, jurnal, laporan keuangan untuk mahasiswa ekonomi",
  [
    mc("Persamaan dasar akuntansi adalah?", ["Pendapatan - Beban = Laba", "Aset = Liabilitas + Ekuitas", "Aset + Liabilitas = Ekuitas", "Debit = Kredit x 2"], 1, 20, "Akuntansi", "Aset = Kewajiban + Ekuitas pemilik."),
    mc("Pembelian peralatan tunai akan?", ["Aset naik, aset turun", "Aset naik, liabilitas naik", "Ekuitas naik", "Liabilitas turun"], 0, 25, "Akuntansi", "Peralatan (+aset) dan kas (-aset): total aset tetap."),
    mc("Akun 'Utang Usaha' bersaldo normal di?", ["Debit", "Kredit", "Keduanya", "Tidak bersaldo"], 1, 20, "Akuntansi", "Liabilitas bertambah di kredit."),
    mc("Laporan yang menunjukkan pendapatan dan beban selama periode adalah?", ["Neraca", "Laba rugi", "Arus kas", "Perubahan ekuitas"], 1, 20, "Akuntansi", "Laporan laba rugi (income statement)."),
    tf("Prinsip biaya historis mencatat aset seharga harga perolehan.", true, 20, "Akuntansi", "Benar, historical cost principle."),
    mc("Depresiasi garis lurus: aset Rp10 juta, residu Rp1 juta, umur 3 tahun. Beban/tahun?", ["Rp2 juta", "Rp3 juta", "Rp3,5 juta", "Rp4 juta"], 1, 30, "Akuntansi", "(10-1)/3 = 3 juta per tahun."),
    mc("Pencatatan pendapatan saat diterima kas, terlepas kewajiban serah jasa, disebut?", ["Akrual", "Kas basis", "Deferral", "Matching"], 1, 25, "Akuntansi", "Basis kas: pendapatan dicatat saat kas diterima."),
    mc("Rumus laba bersih adalah?", ["Pendapatan + Beban", "Pendapatan - Beban", "Aset - Pendapatan", "Ekuitas + Liabilitas"], 1, 15, "Akuntansi", "Laba bersih = pendapatan - beban."),
    mc("Akun yang bertambah dengan kredit adalah?", ["Kas", "Peralatan", "Utang Bank", "Beban Listrik"], 2, 20, "Akuntansi", "Liabilitas (utang) bertambah di sisi kredit."),
    mc("Jurnal untuk pembelian peralatan secara kredit adalah?", ["Peralatan (D) - Kas (K)", "Peralatan (D) - Utang (K)", "Kas (D) - Peralatan (K)", "Utang (D) - Peralatan (K)"], 1, 25, "Akuntansi", "Peralatan bertambah (debit), utang bertambah (kredit)."),
    tf("Neraca menampilkan posisi keuangan pada tanggal tertentu.", true, 15, "Akuntansi", "Benar - balance sheet = snapshot pada satu titik waktu."),
    mc("HPP (Harga Pokok Penjualan) = ?", ["Persediaan awal - pembelian", "Persediaan awal + pembelian - persediaan akhir", "Penjualan - laba", "Pendapatan + beban"], 1, 25, "Akuntansi", "HPP = persediaan awal + pembelian - persediaan akhir."),
  ]);

export const manajemen = quiz("manajemen", "Manajemen Dasar", "Kuliah", "chart", "#7C3AED", "Mudah", "Manajemen",
  "Perencanaan, pengorganisasian, kepemimpinan, dan pengendalian",
  [
    mc("Fungsi manajemen pertama adalah?", ["Pengorganisasian", "Perencanaan", "Pengawasan", "Pengarahan"], 1, 15, "Manajemen", "POAC: Planning, Organizing, Actuating, Controlling."),
    mc("SWOT Analysis menilai?", ["Hanya kekuatan", "Kekuatan, kelemahan, peluang, ancaman", "Hanya pasar", "Hanya keuangan"], 1, 20, "Manajemen", "Strengths, Weaknesses, Opportunities, Threats."),
    mc("Gaya kepemimpinan yang memberi kebebasan penuh pada bawahan adalah?", ["Otokratis", "Demokratis", "Laissez-faire", "Karismatik"], 2, 20, "Manajemen", "Laissez-faire = membiarkan (free-rein)."),
    tf("Manajer menengah (middle management) langsung mengawasi pekerja operasional.", false, 20, "Manajemen", "Salah - itu manajer lini bawah; middle mengawasi manajer bawah."),
    mc("Struktur organisasi yang mengelompokkan berdasarkan fungsi (marketing, HR, keuangan) disebut?", ["Matriks", "Fungsional", "Divisional", "Jaringan"], 1, 20, "Manajemen", "Struktur fungsional mengelompokkan per keahlian."),
    mc("Tahap pengendalian yang membandingkan kinerja dengan standar disebut?", ["Perencanaan", "Pengukuran & evaluasi", "Pengorganisasian", "Perekrutan"], 1, 20, "Manajemen", "Controlling: standar → ukur → koreksi."),
    mc("4P dalam bauran pemasaran adalah?", ["People, Process, Product, Price", "Product, Price, Place, Promotion", "Plan, Price, Position, People", "Product, Profit, Place, Public"], 1, 15, "Manajemen", "Marketing mix klasik McCarthy."),
    mc("Motivasi teori hierarki kebutuhan dikemukakan oleh?", ["Frederick Taylor", "Abraham Maslow", "Peter Drucker", "Henri Fayol"], 1, 20, "Manajemen", "Maslow: fisiologis, rasa aman, sosial, penghargaan, aktualisasi."),
    mc("Proses menentukan tujuan dan cara mencapainya disebut?", ["Pengorganisasian", "Perencanaan", "Pengawasan", "Perekrutan"], 1, 15, "Manajemen", "Planning = merumuskan tujuan dan strategi."),
    mc("Pembagian tugas menjadi unit-unit kerja disebut?", ["Pengarahan", "Pengorganisasian", "Pengendalian", "Penganggaran"], 1, 15, "Manajemen", "Organizing = menyusun struktur dan pembagian tugas."),
  ]);

export const hukumDasar = quiz("hukum-dasar", "Hukum Dasar", "Kuliah", "scale", "#DC2626", "Sedang", "Hukum",
  "Pengantar ilmu hukum, norma, UUD 1945, dan perundang-undangan Indonesia",
  [
    mc("Hukum tertinggi di Indonesia adalah?", ["UUD 1945", "UU", "Perpres", "Perda"], 0, 15, "Hukum", "Konstitusi (UUD NRI 1945) menempati hierarki tertinggi."),
    mc("Hukum yang memuat kewajiban dan larangan disebut hukum?", ["Publik", "Privat", "Formal", "Adat"], 1, 20, "Hukum", "Hukum privat mengatur hubungan antar-orang (KUHPerdata)."),
    mc("Maksud asas 'lex specialis derogat lex generali' adalah?", ["Hukum umum mengesampingkan khusus", "Hukum khusus mengesampingkan hukum umum", "Hukum baru menghapus lama", "Hukum lama berlaku surut"], 1, 25, "Hukum", "Ketentuan khusus mengesampingkan ketentuan umum."),
    tf("Putusan pengadilan yang telah berkekuatan hukum tetap disebut inkracht.", true, 20, "Hukum", "Benar, in kracht van gewijsde."),
    mc("Lembaga negara pemegang kekuasaan kehakiman bersama MA adalah?", ["MPR", "MK", "DPR", "KPK"], 1, 20, "Hukum", "Kekuasaan kehakiman: Mahkamah Agung & Mahkamah Konstitusi."),
    mc("Delik yang ancamannya di bawah 5 tahun termasuk?", ["Kejahatan", "Pelanggaran", "Tindak pidana korporasi", "Delik politik"], 1, 25, "Hukum", "KUHP lama membagi kejahatan & pelanggaran."),
    mc("Norma yang sanksinya paling tegas dan dipaksakan negara adalah norma?", ["Agama", "Kesopanan", "Kesusilaan", "Hukum"], 3, 15, "Hukum", "Norma hukum bersanksi tegas dari negara."),
    mc("Perjanjian yang sah memenuhi syarat pasal 1320 KUHPerdata, KECUALI?", ["Sepakat", "Cakap hukum", "Suatu hal tertentu", "Disaksikan notaris"], 3, 25, "Hukum", "Syarat sah: sepakat, cakap, hal tertentu, sebab halal — notaris bukan syarat umum."),
    mc("Hukum yang berlaku pada waktu tertentu dan wilayah tertentu disebut?", ["Hukum privat", "Hukum publik", "Hukum positif", "Hukum adat"], 2, 20, "Hukum", "Hukum positif = berlaku saat ini di wilayah tertentu."),
    mc("Asas 'fiat justitia ruat caelum' berarti?", ["Hukum demi keadilan walau langit runtuh", "Hukum adalah perintah", "Tiada pidana tanpa aturan", "Hakim itu lembam"], 0, 25, "Hukum", "Keadilan harus ditegakkan apa pun yang terjadi."),
    mc("Badan peradilan yang menguji undang-undang terhadap UUD adalah?", ["MA", "MK", "KY", "Pengadilan Negeri"], 1, 20, "Hukum", "Mahkamah Konstitusi menguji UU terhadap konstitusi."),
  ]);

export const statistika = quiz("statistika", "Statistika Dasar", "Kuliah", "bars", "#0EA5E9", "Sedang", "Statistika",
  "Deskriptif, probabilitas, distribusi, dan uji hipotesis dasar",
  [
    mc("Ukuran pemusatan yang paling terpengaruh outlier (nilai ekstrem) adalah?", ["Median", "Modus", "Mean", "Rentang"], 2, 20, "Statistika", "Mean dihitung dari semua nilai → sensitif ekstrem."),
    mc("Data jenis kelamin (L/P) termasuk skala?", ["Nominal", "Ordinal", "Interval", "Rasio"], 0, 20, "Statistika", "Nominal: label tanpa urutan."),
    mc("Peluang muncul angka pada lemparan satu dadu adalah?", ["1/2", "1/3", "1/6", "2/6"], 2, 15, "Statistika", "Satu sisi 'angka' dari 6 sisi → 1/6."),
    tf("Standar deviasi mengukur sebaran data terhadap rata-rata.", true, 15, "Statistika", "Benar; semakin besar SD, data makin menyebar."),
    mc("Distribusi normal memiliki bentuk kurva?", ["Miring kanan", "Miring kiri", "Simetris lonceng", "Seragam"], 2, 15, "Statistika", "Bell-shaped, mean=median=modus."),
    mc("Rata-rata 4, 6, 8, 10 adalah?", ["6", "7", "8", "9"], 1, 15, "Statistika", "(4+6+8+10)/4 = 28/4 = 7."),
    mc("Kesimpulan menolak H0 padahal H0 benar disebut kesalahan?", ["Tipe I", "Tipe II", "Tipe III", "Sampling"], 0, 25, "Statistika", "Tipe I = false positive; Tipe II = false negative."),
    mc("Korelasi -0,9 menunjukkan hubungan?", ["Lemak positif", "Kuat negatif", "Tidak ada hubungan", "Kuat positif"], 1, 20, "Statistika", "Dekat -1 = hubungan negatif kuat."),
  ]);

export const anatomi = quiz("anatomi", "Anatomi & Fisiologi Dasar", "Kuliah", "heart", "#EF4444", "Sulit", "Kedokteran",
  "Sistem tubuh manusia untuk mahasiswa kedokteran & kesehatan",
  [
    mc("Katup antara atrium kiri dan ventrikel kiri adalah?", ["Trikuspid", "Bikus (mitral)", "Pulmonal", "Aorta"], 1, 25, "Kedokteran", "Valva mitral/bikus mencegah regurgitasi ke atrium kiri."),
    mc("Nefron adalah unit fungsional dari?", ["Hati", "Ginjal", "Paru", "Otak"], 1, 15, "Kedokteran", "Ginjal memiliki ±1 juta nefron."),
    mc("Bagian otak yang mengatur keseimbangan & koordinasi gerak adalah?", ["Serebrum", "Serebelum", "Medula", "Hipotalamus"], 1, 20, "Kedokteran", "Serebelum (little brain) mengatur koordinasi halus."),
    tf("Hormon insulin dilepaskan oleh sel beta pankreas.", true, 20, "Kedokteran", "Benar; sel beta pulau Langerhans."),
    mc("Pembuluh yang membawa darah BERoksigen dari paru ke jantung?", ["Arteri pulmonal", "Vena pulmonal", "Vena cava", "Aorta"], 1, 25, "Kedokteran", "Vena pulmonal = satu-satunya vena berdarah kaya O2."),
    mc("Surfactant paru diproduksi oleh sel?", ["Alveolar tipe I", "Alveolar tipe II", "Makrofag", "Bronkiolus"], 1, 30, "Kedokteran", "Sel alveolar tipe II memproduksi surfaktan menurunkan tegangan permukaan."),
    mc("Jumlah tulang pada tubuh manusia dewasa adalah?", ["186", "196", "206", "216"], 2, 15, "Kedokteran", "206 tulang; bayi sekitar 300 yang menyatu."),
    mc("Vitamin yang disintesis oleh bakteri usus dan berperan pembekuan darah?", ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin K"], 3, 25, "Kedokteran", "Vitamin K penting faktor koagulasi."),
    mc("Denyut nadi normal orang dewasa per menit adalah?", ["40-60", "60-100", "100-140", "140-180"], 1, 15, "Kedokteran", "Normal 60-100x/menit saat istirahat."),
    mc("Hormon yang menurunkan kadar gula darah adalah?", ["Glukagon", "Insulin", "Adrenalin", "Kortisol"], 1, 15, "Kedokteran", "Insulin membantu sel menyerap glukosa."),
    mc("Bagian jantung yang menerima darah bersih dari paru-paru adalah?", ["Atrium kanan", "Atrium kiri", "Ventrikel kanan", "Ventrikel kiri"], 1, 25, "Kedokteran", "Atrium kiri menerima darah oksigen dari vena pulmonal."),
    tf("Sistem saraf pusat terdiri dari otak dan sumsum tulang belakang.", true, 15, "Kedokteran", "Benar - CNS = brain + spinal cord."),
  ]);

export const algoritma = quiz("algoritma", "Algoritma & Pemrograman", "Kuliah", "terminal", "#0F172A", "Sedang", "Informatika",
  "Kompleksitas, struktur data, sorting, dan paradigma pemrograman untuk mahasiswa TI",
  [
    mc("Kompleksitas Big-O binary search adalah?", ["O(n)", "O(log n)", "O(n^2)", "O(1)"], 1, 20, "Informatika", "Binary search membagi ruang cari jadi separuh tiap langkah."),
    mc("Struktur data LIFO adalah?", ["Queue", "Stack", "Linked list", "Heap"], 1, 15, "Informatika", "Stack: Last In First Out (push/pop)."),
    mc("Algoritma sorting tercepat rata-rata di antara ini?", ["Bubble sort", "Insertion sort", "Merge sort", "Selection sort"], 2, 20, "Informatika", "Merge sort O(n log n) di semua kasus."),
    tf("Rekursi adalah fungsi yang memanggil dirinya sendiri.", true, 15, "Informatika", "Benar; wajib punya base case."),
    mc("Hash table rata-rata akses datanya O(?).", ["1", "log n", "n", "n log n"], 0, 25, "Informatika", "Rata-rata O(1) dengan fungsi hash baik."),
    mc("Paradigma yang memandang program sebagai interaksi objek adalah?", ["Prosedural", "Fungsional", "OOP", "Logika"], 2, 15, "Informatika", "OOP: encapsulation, inheritance, polymorphism."),
    mc("Worst-case quick sort adalah O(?).", ["n", "n log n", "n^2", "log n"], 2, 25, "Informatika", "Pivot terburuk (terurut) → O(n^2)."),
    mc("Proses menemukan dan memperbaiki kesalahan program disebut?", ["Compiling", "Debugging", "Deploying", "Documenting"], 1, 10, "Informatika", "Debugging = menghilangkan bug."),
    mc("Untuk menyimpan nilai yang tidak berubah, dipakai?", ["Variabel", "Konstanta", "Fungsi", "Array"], 1, 15, "Informatika", "Konstanta (const) nilainya tetap."),
    mc("Kompleksitas O(n^2) contohnya pada algoritma?", ["Binary search", "Bubble sort", "Hash lookup", "Pencarian linier"], 1, 25, "Informatika", "Bubble sort membandingkan semua pasangan → O(n^2)."),
    tf("Git digunakan untuk version control kode.", true, 15, "Informatika", "Benar - Git melacak perubahan kode sumber."),
    mc("SQL digunakan untuk?", ["Menggambar UI", "Mengelola basis data", "Membuat animasi", "Kompilasi program"], 1, 15, "Informatika", "SQL = Structured Query Language untuk database."),
  ]);
