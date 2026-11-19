import type { MetadataRoute } from "next";
import { businessProfile } from "@/config/business-profile";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV === "staging") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const baseUrl = businessProfile.canonicalSiteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/", "/api/library/"],
        disallow: [
          "/admin",
          "/admin/",
          "/login",
          "/preview",
          "/builder-preview",
          "/api/",
          "/cart",
          "/checkout",
          "/order-tracking",
          "/tra-cuu-don-hang",
          "/search",
          "/tim-kiem",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
