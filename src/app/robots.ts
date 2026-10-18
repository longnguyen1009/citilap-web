import type { MetadataRoute } from "next";
import { businessProfile } from "@/config/business-profile";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV === 'staging') return { rules: { userAgent: '*', disallow: '/' } };
  const baseUrl = businessProfile.canonicalSiteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: [
          "/admin",
          "/login",
          "/preview",
          "/api/",
          "/cart",
          "/checkout",
          "/order-tracking",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
