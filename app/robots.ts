import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/host/", "/play/"] }],
    sitemap: "https://sikuis.com/sitemap.xml",
  };
}
