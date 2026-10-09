import { businessProfile } from "@/config/business-profile";

/**
 * Site configuration helper - references canonical businessProfile
 */
export const siteConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || businessProfile.canonicalSiteUrl,
  phone: businessProfile.displayPhone,
  rawPhone: businessProfile.phone,
  telHref: businessProfile.telHref,
  email: businessProfile.email,
  address: businessProfile.locations[0].address,
  zaloUrl: businessProfile.socialProfiles.zalo,
  brandName: businessProfile.brandName,
  tagline: businessProfile.primaryTagline,
  motto: businessProfile.traditionalMotto,
} as const;

export { businessProfile };
