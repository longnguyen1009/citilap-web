import type { MetadataRoute } from "next";
import { businessProfile } from "@/config/business-profile";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = businessProfile.canonicalSiteUrl;
  const now = new Date();
  const urlMap = new Map<string, MetadataRoute.Sitemap[number]>();

  const addEntry = (entry: MetadataRoute.Sitemap[number]) => {
    urlMap.set(entry.url, entry);
  };

  // 1. Core Verified Public Pages (Always active)
  const corePages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/hot-sale`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/category`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/lien-he`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
  corePages.forEach(addEntry);

  // 2. Policy / System Pages: verify publication eligibility
  // (Exclude if explicitly UNPUBLISHED in D1; include if published or in valid transitional service)
  const systemPageSlugs: Record<string, string> = {
    WARRANTY: "chinh-sach-bao-hanh",
    RETURNS: "chinh-sach-doi-tra",
    SHIPPING: "chinh-sach-van-chuyen",
    ABOUT: "gioi-thieu",
    STORES: "he-thong-cua-hang",
  };

  try {
    const unpublishedTypes = await prisma.page.findMany({
      where: {
        deletedAt: null,
        pageType: { in: ["WARRANTY", "RETURNS", "SHIPPING", "ABOUT", "STORES"] },
        studio: {
          published: null,
          publicUpdatedAt: { not: null },
        },
      },
      select: { pageType: true },
    });
    const unpublishedSet = new Set(unpublishedTypes.map((p) => p.pageType));

    for (const [type, slug] of Object.entries(systemPageSlugs)) {
      if (!unpublishedSet.has(type)) {
        addEntry({
          url: `${baseUrl}/${slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // If table query fails, fallback to standard transitional policy routes
    for (const slug of Object.values(systemPageSlugs)) {
      addEntry({
        url: `${baseUrl}/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  // 3. Dynamic Active Brands from D1
  try {
    const brands = await prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    });
    for (const b of brands) {
      addEntry({
        url: `${baseUrl}/brand/${b.slug}`,
        lastModified: b.updatedAt || now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.error("[Sitemap] Failed to query brands:", err);
  }

  // 4. Dynamic Active Categories from D1
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    });
    for (const cat of categories) {
      addEntry({
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: cat.updatedAt || now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch (err) {
    console.error("[Sitemap] Failed to query categories:", err);
  }

  // 5. Dynamic Active Products (Full public eligibility: active, non-deleted)
  try {
    const products = await prisma.product.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
        deletedAt: null,
      },
      select: { slug: true, updatedAt: true },
    });
    for (const prod of products) {
      addEntry({
        url: `${baseUrl}/product/${prod.slug}`,
        lastModified: prod.updatedAt || now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.error("[Sitemap] Failed to query products:", err);
  }

  // 6. Dynamic Published CMS Posts (Only published, non-deleted, using publicUpdatedAt)
  try {
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        studio: { published: { not: null } },
      },
      select: {
        slug: true,
        studio: { select: { publicUpdatedAt: true, publishedAt: true } },
      },
    });
    for (const p of posts) {
      const lastMod = p.studio?.publicUpdatedAt
        ? new Date(p.studio.publicUpdatedAt)
        : (p.studio?.publishedAt ? new Date(p.studio.publishedAt) : now);
      addEntry({
        url: `${baseUrl}/news/${p.slug}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.error("[Sitemap] Failed to query published posts:", err);
  }

  // 7. Dynamic Published Custom CMS Pages (Have active renderer at /[slug])
  try {
    const customPages = await prisma.page.findMany({
      where: {
        deletedAt: null,
        pageType: "CUSTOM",
        studio: { published: { not: null } },
      },
      select: {
        slug: true,
        studio: { select: { publicUpdatedAt: true, publishedAt: true } },
      },
    });
    for (const p of customPages) {
      const lastMod = p.studio?.publicUpdatedAt
        ? new Date(p.studio.publicUpdatedAt)
        : (p.studio?.publishedAt ? new Date(p.studio.publishedAt) : now);
      addEntry({
        url: `${baseUrl}/${p.slug}`,
        lastModified: lastMod,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[Sitemap] Failed to query published custom pages:", err);
  }

  return Array.from(urlMap.values());
}
