import type { MetadataRoute } from "next";

const BASE_URL = "https://trigradar.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE_URL}/deals`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${BASE_URL}/inspire`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.8 },
    { url: `${BASE_URL}/auth/login`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE_URL}/auth/register`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE_URL}/cgu`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
  ];
}
