# SiKuis — Platform Kuis Interaktif Indonesia

Platform kuis real-time ala Kahoot untuk kelas, belajar mandiri, dan tugas online. Dibangun dengan Next.js 16 + Socket.IO + TypeScript.

**Live**: https://sikuis.com

## Fitur

### Game Live Multiplayer
- Join instan via PIN 6-digit, tanpa akun & tanpa install
- 7 tipe soal: pilihan ganda, benar/salah, urutkan (reorder), isian (auto-check), pendapat, rating bintang, teks bebas
- Skor kecepatan + streak bonus, leaderboard live, podium top-3
- **Mode Tim** — otomatis dibagi Tim Merah vs Biru, skor agregat
- **Mode Koin & Power-Up** — kumpulkan koin, beli ×2 Poin atau Perisai Streak di sela soal
- Word cloud untuk jawaban teks, confetti, sound effect, read-aloud (TTS)
- Gambar & video YouTube di setiap soal

### Ribuan Soal Selalu Acak
- Setiap sesi mengambil **10 soal acak** dari pool besar — tidak pernah sama
- Matematika & Tes IQ: generator prosedural (variasi praktis tak terbatas)
- Kategori lain: bank soal AI yang tumbuh otomatis (ditanam di latar belakang)

### AI Generator Gratis (tanpa API key)
- Generator soal via model gratis OpenCode Zen — anonim, dengan rotasi model otomatis
- Impor soal dari **teks tempel**, **PDF**, atau **CSV**
- Fallback: Ollama lokal → pencarian bank soal

### Tugas & PR Online
- Guru membuat tugas dengan tenggat waktu dari kuis mana pun
- Siswa mengerjakan mandiri via link `/assign/KODE`
- Penilaian otomatis di server, peringkat + export CSV
- Tugas terikat per guru (owner key) & auto-terhapus setelah tenggat + 12 jam

### Belajar Mandiri
- Mode Solo (skor kecepatan), Mode Latihan (santai + penjelasan)
- **Ghost Mode** — lawan skor terbaikmu sendiri
- Flashcards 3D dengan putaran ulang kartu sulit
- **Review Cerdas** — spaced repetition Leitner, soal lemah muncul duluan
- Tes IQ dengan profil 4 dimensi kognitif

### Laporan
- Hasil game live tersimpan permanen, buka via `/reports/PIN`
- Analisis per pemain & ketuntasan per soal, export CSV

## Menjalankan Lokal

```bash
npm install
npm run dev        # http://localhost:4000
```

Build produksi:

```bash
npm run build
npm run start      # PORT mengikuti environment (Railway-ready)
```

## Arsitektur

- `server.ts` — Socket.IO + Next.js dalam satu proses; state game in-memory
- `lib/db.ts` — persistensi JSON (`data/db.json`): kuis kustom, tugas, laporan, bank soal AI
- `lib/generators.ts` — generator soal prosedural matematika & logika
- `lib/srs.ts` — spaced repetition (Leitner box)
- `scripts/smoke.mjs` — 28 pengujian end-to-end (`node scripts/smoke.mjs`)

## Deploy

Otomatis dari GitHub ke **Railway** (config di `railway.json`). Domain kustom: tambahkan CNAME ke domain Railway di panel DNS Anda.

Opsional: pasang Volume Railway ke `/app/data` agar data bertahan antar deploy.

## AI (OpenCode Zen)

Berjalan anonim memakai model gratis Zen — tanpa konfigurasi. Untuk akses model lebih luas, simpan API key di `data/opencode.key` atau env `OPENCODE_API_KEY` (opsional).
