import type { MetadataRoute } from "next";
import { businessProfile } from "@/config/business-profile";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = businessProfile.canonicalSiteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: [
          "/admin/",
          "/api/",
          "/cart",
          "/checkout/",
          "/order-tracking",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
