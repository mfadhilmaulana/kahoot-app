// Generator nickname acak ala Kahoot (bahasa Indonesia, lucu & sopan)

const ADJECTIVES = [
  "Kucing", "Naga", "Panda", "Elang", "Kopi", "Bakso", "Rocket", "Pixel",
  "Ninja", "Robot", "Bintang", "Combro", "Riset", "Gajah", "Teh", "Gecko",
  "Cendol", "Mango", "Sate", "Durian", "Ombak", "Petir", "Komodo", "Cicak",
];

const NOUNS = [
  "Ceria", "Gesit", "Pintar", "Heboh", "Sakti", "Lincah", "Kuat", "Ramah",
  "Betul", "Galak", "Manis", "Keren", "Cerah", "Tenang", "Fun", "Pro",
  "Master", "Junior", "Hero", "Legend", "Star", "Prime", "Ultra", "Mega",
];

export function randomNickname(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const d = Math.floor(Math.random() * 100);
  return `${a}${n}${d}`.slice(0, 20);
}
