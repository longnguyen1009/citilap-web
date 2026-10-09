import { businessProfile } from "../config/business-profile";

/**
 * Serializes JSON-LD object to safe JSON string, escaping HTML tag injection characters
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Generates Schema.org Organization structured data
 */
export function generateOrganizationJsonLd() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
    name: businessProfile.brandName,
    alternateName: businessProfile.alternateNames,
    url: businessProfile.canonicalSiteUrl,
    logo: `${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`,
    slogan: businessProfile.traditionalMotto,
    description: `${businessProfile.primaryTagline}. Thành lập từ ${businessProfile.founded}.`,
    telephone: businessProfile.telHref.replace("tel:", ""),
    email: businessProfile.email,
    foundingDate: "2024-07",
    sameAs: [
      businessProfile.socialProfiles.facebook,
      businessProfile.socialProfiles.tiktok,
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: hanoi.streetAddress,
      addressLocality: hanoi.addressLocality,
      addressCountry: hanoi.addressCountry,
      postalCode: hanoi.postalCode,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: businessProfile.telHref.replace("tel:", ""),
        contactType: "customer service",
        availableLanguage: ["Vietnamese"],
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "09:00",
          closes: "20:00",
        },
      },
    ],
  };
}

/**
 * Generates Schema.org LocalBusiness / ComputerStore for ACTIVE branches
 * Note: Only Hà Nội & Bắc Ninh are active. HCM is TEMPORARILY_CLOSED and omitted from active schema.
 * Note: Sunday is by appointment only, omitted from regular openingHoursSpecification.
 */
export function generateLocalBusinessesJsonLd() {
  const activeLocations = businessProfile.locations.filter(
    (loc) => loc.status === "ACTIVE"
  );

  return activeLocations.map((loc) => ({
    "@context": "https://schema.org",
    "@type": "ComputerStore",
    "@id": `${businessProfile.canonicalSiteUrl}/#store-${loc.id}`,
    name: `${businessProfile.brandName} - ${loc.name}`,
    description: `Cơ sở ${loc.name} - ${businessProfile.brandName}. ${loc.openingHoursText}`,
    url: `${businessProfile.canonicalSiteUrl}/he-thong-cua-hang#${loc.id}`,
    telephone: loc.telHref.replace("tel:", ""),
    image: loc.photos ? loc.photos.map((p) => `${businessProfile.canonicalSiteUrl}${p}`) : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.streetAddress,
      addressLocality: loc.addressLocality,
      addressRegion: loc.addressRegion,
      postalCode: loc.postalCode,
      addressCountry: loc.addressCountry,
    },
    hasMap: loc.mapsUrl,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "20:00",
      },
    ],
    priceRange: "$$",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    currenciesAccepted: "VND",
  }));
}

/**
 * Generates Schema.org WebSite structured data with SearchAction
 */
export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${businessProfile.canonicalSiteUrl}/#website`,
    url: businessProfile.canonicalSiteUrl,
    name: businessProfile.brandName,
    alternateName: businessProfile.alternateNames,
    description: businessProfile.primaryTagline,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${businessProfile.canonicalSiteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
