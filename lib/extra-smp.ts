import { mc, tf, quiz } from "./extra-sd1";

export const mtkSmp = quiz("mtk-smp", "Matematika SMP", "SMP", "sigma", "#059669", "Sedang", "Matematika",
  "Aljabar, persamaan linear, perbandingan, dan bangun ruang jenjang SMP",
  [
    mc("Jika 3x + 6 = 21, maka x = ?", ["3", "4", "5", "6"], 2, 20, "Matematika", "3x = 21 - 6 = 15, maka x = 5."),
    mc("Harga barang Rp80.000 didiskon 25%. Harga bayar?", ["Rp50.000", "Rp55.000", "Rp60.000", "Rp65.000"], 2, 20, "Matematika", "Potongan 25% x 80.000 = 20.000. Bayar = 60.000."),
    mc("Perbandingan umur A : B = 3 : 5. Jika jumlah 24 tahun, umur B?", ["9", "12", "15", "18"], 2, 20, "Matematika", "B = 5/8 x 24 = 15 tahun."),
    mc("Volume kubus dengan rusuk 5 cm adalah?", ["25", "75", "125", "150"], 2, 20, "Matematika", "V = s^3 = 5^3 = 125 cm kubik."),
    mc("Gradien garis yang melalui (1,2) dan (3,8) adalah?", ["2", "3", "4", "6"], 1, 25, "Matematika", "m = (8-2)/(3-1) = 6/2 = 3."),
    tf("Luas lingkaran = pi x r x r.", true, 15, "Matematika", "Benar, L = pi r^2."),
    mc("Nilai dari 2^3 x 2^2 adalah?", ["16", "32", "64", "8"], 1, 15, "Matematika", "Pangkat dijumlah: 2^(3+2) = 2^5 = 32."),
    mc("Median dari data 4, 7, 5, 8, 6 adalah?", ["5", "6", "7", "8"], 1, 20, "Matematika", "Urutkan: 4,5,6,7,8 → nilai tengah = 6."),
  ]);

export const ipaSmp = quiz("ipa-smp", "IPA SMP", "SMP", "flask", "#10B981", "Sedang", "IPA",
  "Klasifikasi makhluk hidup, energi, listrik, dan tubuh manusia jenjang SMP",
  [
    mc("Satuan daya listrik adalah?", ["Volt", "Ampere", "Watt", "Ohm"], 2, 15, "IPA", "Daya (P) diukur dalam watt; P = V x I."),
    mc("Alat yang digunakan untuk mengukur suhu adalah?", ["Barometer", "Termometer", "Higrometer", "Dinamometer"], 1, 15, "IPA", "Termometer mengukur suhu berdasarkan pemuaian zat."),
    mc("Sel bagian yang menghasilkan energi (pembangkit sel) adalah?", ["Inti sel", "Mitokondria", "Ribosom", "Dinding sel"], 1, 20, "IPA", "Mitokondria melakukan respirasi seluler menghasilkan ATP."),
    tf("Gaya berat benda = massa x percepatan gravitasi.", true, 15, "IPA", "Benar, w = m x g (g sekitar 9,8 m/s^2)."),
    mc("Kelompok hewan bertulang belakang (vertebrata) adalah?", ["Kupu-kupu", "Udang", "Katak", "Cacing tanah"], 2, 20, "IPA", "Katak termasuk amphibi bertulang belakang."),
    mc("Bunyi tidak dapat merambat melalui?", ["Udara", "Air", "Besi", "Ruang hampa"], 3, 20, "IPA", "Bunyi butuh medium; ruang hampa tidak punya partikel."),
    mc("Rumus hukum Ohm adalah?", ["V = I x R", "V = I / R", "I = V x R", "R = V x I"], 0, 15, "IPA", "Tegangan = arus x hambatan."),
    mc("Zat yang diperlukan tumbuhan untuk fotosintesis, selain air dan cahaya?", ["Oksigen", "Nitrogen", "Karbon dioksida", "Hidrogen"], 2, 20, "IPA", "CO2 dari udara masuk lewat stomata daun."),
  ]);

export const ipsSmp = quiz("ips-smp", "IPS SMP", "SMP", "globe2", "#F97316", "Mudah", "IPS",
  "Geografi, sejarah, ekonomi, dan sosial dasar jenjang SMP",
  [
    mc("Ibukota Provinsi Jawa Barat adalah?", ["Semarang", "Bandung", "Surabaya", "Serang"], 1, 15, "IPS", "Bandung adalah ibukota Jawa Barat."),
    mc("Proses pelapukan batu dan pengangkutannya oleh air disebut?", ["Erosi", "Sedimentasi", "Konveksi", "Evaporasi"], 0, 20, "IPS", "Erosi = pengikisan tanah/batu oleh air, angin, atau gelombang."),
    mc("Mata uang negara Jepang adalah?", ["Yuan", "Won", "Yen", "Baht"], 2, 15, "IPS", "Yen adalah mata uang Jepang."),
    mc("Kerajaan Hindu tertua di Indonesia adalah?", ["Majapahit", "Kutai", "Sriwijaya", "Demak"], 1, 20, "IPS", "Kutai di Kalimantan Timur, abad ke-4 Masehi."),
    tf("Garis khayal yang membagi bumi utara-selatan disebut khatulistiwa (equator).", true, 15, "IPS", "Benar, garis lintang 0 derajat."),
    mc("Kegiatan menghasilkan barang/jasa disebut?", ["Konsumsi", "Distribusi", "Produksi", "Investasi"], 2, 15, "IPS", "Produksi = menghasilkan; konsumsi = memakai; distribusi = menyalurkan."),
    mc("Masuknya budaya asing tanpa merusak budaya lokal adalah contoh?", ["Asimilasi", "Akomodasi", "Difusi", "Akulturasi"], 3, 25, "IPS", "Akulturasi = pertukaran budaya tanpa menghilangkan ciri asli."),
    mc("Waktu Indonesia bagian barat (WIB) adalah UTC berapa?", ["+7", "+8", "+9", "+6"], 0, 15, "IPS", "WIB = UTC+7, WITA = UTC+8, WIT = UTC+9."),
  ]);

export const bingSmp = quiz("bing-smp", "Bahasa Inggris SMP", "SMP", "chat", "#8B5CF6", "Mudah", "Bahasa Inggris",
  "Grammar dasar, kosakata, dan pemahaman percakapan jenjang SMP",
  [
    mc("She ___ to school every day.", ["go", "goes", "going", "gone"], 1, 15, "Bahasa Inggris", "Subjek she (singular) + simple present → goes."),
    mc("'Book' dalam bahasa Indonesia artinya?", ["Pensil", "Buku", "Meja", "Tas"], 1, 10, "Bahasa Inggris", "Book = buku."),
    mc("What is the opposite of 'big'?", ["Tall", "Small", "Long", "Fast"], 1, 10, "Bahasa Inggris", "Big = besar; lawannya small = kecil."),
    mc("They ___ playing football now.", ["is", "am", "are", "be"], 2, 15, "Bahasa Inggris", "They + are + verb-ing (present continuous)."),
    tf("'Good morning' digunakan sebelum pukul 12 siang.", true, 10, "Bahasa Inggris", "Benar, morning = pagi sampai tengah hari."),
    mc("I ___ my homework yesterday.", ["do", "does", "did", "doing"], 2, 15, "Bahasa Inggris", "Yesterday menandakan past tense → did."),
    mc("'How much' digunakan untuk menanyakan?", ["Benda dapat dihitung", "Benda tak dapat dihitung", "Waktu", "Tempat"], 1, 20, "Bahasa Inggris", "How much untuk uncountable (air, uang); how many untuk countable."),
    mc("Arrange: 'is / my / This / book' →", ["This is my book.", "My book this is.", "Is this my book.", "Book my is this."], 0, 20, "Bahasa Inggris", "Pola: Subject + be + noun → This is my book."),
  ]);
