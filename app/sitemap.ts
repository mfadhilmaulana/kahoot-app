import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sikuis.com";
  const now = new Date();
  const routes = ["", "/quizzes", "/solo", "/flashcards", "/iq", "/create", "/assignments"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  return routes;
}
