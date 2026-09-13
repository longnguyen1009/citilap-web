import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://citilap.vn";

const shopCategories = [
  "laptop-gaming",
  "laptop-van-phong",
  "macbook",
  "laptop-do-hoa",
  "may-luot",
  "phu-kien",
];

const policySlugs = [
  "chinh-sach-bao-mat",
  "chinh-sach-doi-tra",
  "chinh-sach-bao-hanh",
  "dieu-khoan-su-dung",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/hot-sale`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/cart`, lastModified: now, changeFrequency: "never", priority: 0.2 },
    { url: `${BASE_URL}/checkout`, lastModified: now, changeFrequency: "never", priority: 0.2 },
    { url: `${BASE_URL}/order-tracking`, lastModified: now, changeFrequency: "never", priority: 0.3 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "never", priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = shopCategories.map((slug) => ({
    url: `${BASE_URL}/category/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const policyPages: MetadataRoute.Sitemap = policySlugs.map((slug) => ({
    url: `${BASE_URL}/chinh-sach/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [...staticPages, ...categoryPages, ...policyPages];
}
