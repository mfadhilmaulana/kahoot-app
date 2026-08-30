import { mc, tf, quiz } from "./extra-sd1";

// Grammar & Vocab = prosedural (ribuan); Reading & Writing = seed + tumbuh via AI
export const bingGrammar = quiz("bing-grammar", "Bahasa Inggris: Grammar", "Umum", "abc", "#3B82F6", "Mudah", "Bahasa Inggris",
  "Tenses, to-be, article, dan agreement - ribuan soal acak grammar",
  [
    mc("She ___ English every morning.", ["go", "goes", "going", "gone"], 1, 15, "Bahasa Inggris", "Subjek she + simple present → goes."),
    mc("I ___ my homework last night.", ["do", "does", "did", "done"], 2, 15, "Bahasa Inggris", "Last night → past tense: did."),
    mc("They ___ watching TV now.", ["is", "am", "are", "be"], 2, 15, "Bahasa Inggris", "They + are + verb-ing."),
    mc("___ apple a day keeps the doctor away.", ["A", "An", "The", "-"], 1, 15, "Bahasa Inggris", "Apple diawali bunyi vokal → an."),
    tf("After 'does', the verb returns to base form.", true, 15, "Bahasa Inggris", "Correct: 'She does not go' bukan 'goes'."),
    mc("My father ___ coffee every morning.", ["drink", "drinks", "drinking", "drank"], 1, 15, "Bahasa Inggris", "My father = he → drinks."),
  ]);

export const bingVocab = quiz("bing-vocab", "Bahasa Inggris: Vocabulary", "Umum", "cards", "#8B5CF6", "Mudah", "Bahasa Inggris",
  "Kosakata harian EN-ID dua arah - ribuan kombinasi acak",
  [
    mc("Apa arti 'brave'?", ["Berani", "Takut", "Lemah", "Marah"], 0, 15, "Bahasa Inggris", "Brave = berani."),
    mc("English word for 'mahal'?", ["Cheap", "Expensive", "Fast", "Heavy"], 1, 15, "Bahasa Inggris", "Expensive = mahal; cheap = murah."),
    mc("Apa arti 'honest'?", ["Jujur", "Sombong", "Malas", "Kikir"], 0, 15, "Bahasa Inggris", "Honest = jujur."),
    mc("English word for 'sabar'?", ["Patient", "Passion", "Parent", "Pattern"], 0, 15, "Bahasa Inggris", "Patient = sabar."),
    tf("'Rich' berarti miskin.", false, 10, "Bahasa Inggris", "Salah - rich = kaya; poor = miskin."),
    mc("Apa arti 'dangerous'?", ["Berbahaya", "Aman", "Mudah", "Cepat"], 0, 15, "Bahasa Inggris", "Dangerous = berbahaya."),
  ]);

export const bingReading = quiz("bing-reading", "Bahasa Inggris: Reading", "SMA", "openbook", "#0EA5E9", "Sedang", "Bahasa Inggris",
  "Pemahaman bacaan (reading comprehension) dengan berbagai topik",
  [
    mc("Read: 'Tom always arrives early, but today he came late because of the heavy rain.' Why was Tom late today?", ["He woke up late", "The heavy rain", "He forgot", "He was sick"], 1, 25, "Bahasa Inggris", "Because of the heavy rain = karena hujan deras."),
    mc("Read: 'Despite the high price, the product sold well.' What does 'despite' signal?", ["Sebab", "Pertentangan", "Tujuan", "Waktu"], 1, 20, "Bahasa Inggris", "Despite = meskipun (pertentangan)."),
    mc("'The meeting was postponed due to technical issues.' The meeting happened?", ["On time", "Earlier", "Later than planned", "Never"], 2, 20, "Bahasa Inggris", "Postponed = ditunda ke waktu berikutnya."),
    mc("Main idea of a paragraph is usually found in the?", ["First sentence (topic sentence)", "Last word", "Title only", "Footer"], 0, 20, "Bahasa Inggris", "Topic sentence biasanya di awal paragraf."),
    tf("'Scan reading' means reading every word slowly.", false, 15, "Bahasa Inggris", "Wrong - scanning = mencari informasi spesifik dengan cepat."),
    mc("'The results contradict the hypothesis.' 'Contradict' means?", ["Support", "Oppose", "Ignore", "Repeat"], 1, 20, "Bahasa Inggris", "Contradict = bertentangan dengan."),
  ]);

export const bingWriting = quiz("bing-writing", "Bahasa Inggris: Writing & Speaking", "Umum", "mic", "#F59E0B", "Mudah", "Bahasa Inggris",
  "Latihan menulis & berbicara - prompt terbuka untuk melatih produksi bahasa",
  [
    mc("Which is the best opening for a formal email?", ["Hey!", "Dear Mr. Smith,", "Yo bro", "Hi there!!"], 1, 15, "Bahasa Inggris", "Formal email dibuka dengan Dear + nama/gelar."),
    mc("'I am writing to inquire about...' - this sentence is used for?", ["Complaining to a friend", "Formal inquiry", "Telling a story", "Giving orders"], 1, 20, "Bahasa Inggris", "Inquire = menanyakan; ungkapan formal surat resmi."),
    mc("Best way to express opinion in a discussion?", ["You are wrong!", "In my opinion, ...", "Whatever!", "I don't care"], 1, 15, "Bahasa Inggris", "In my opinion = santun menyatakan pendapat."),
    mc("Complete: 'Could you please ___ the door?'", ["to open", "open", "opening", "opened"], 1, 15, "Bahasa Inggris", "Could you please + base verb."),
    mc("Speaking tips: saat lupa kata, sebaiknya?", ["Berhenti total", "Parafrase dengan kata lain", "Ganti bahasa ibu terus", "Diam"], 1, 20, "Bahasa Inggris", "Parafrase menjaga kelancaran bicara."),
    mc("Which sentence has correct capitalization?", ["my brother lives in jakarta.", "My Brother lives in jakarta.", "My brother lives in Jakarta.", "my Brother lives in Jakarta."], 2, 15, "Bahasa Inggris", "Awal kalimat kapital; nama kota kapital."),
  ]);
