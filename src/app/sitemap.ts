import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://survivethedarkforest.com";
  return [
    { url: `${base}/` },
    { url: `${base}/play` },
  ];
}
