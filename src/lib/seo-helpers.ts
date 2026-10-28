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

function toAbsoluteSiteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return businessProfile.canonicalSiteUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${businessProfile.canonicalSiteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function resolveSchemaItemCondition(condition?: string | null): string {
  const raw = (condition || "").trim().toUpperCase();
  if (!raw || raw === "NEW" || raw.includes("MỚI") || raw.includes("100%")) {
    return "https://schema.org/NewCondition";
  }
  if (raw === "LIKE_NEW" || raw.includes("LIKE NEW") || raw.includes("99%")) {
    return "https://schema.org/RefurbishedCondition";
  }
  return "https://schema.org/UsedCondition";
}

function resolveSchemaAvailability(params: {
  availability?: string | null;
  canOrder?: boolean;
  inStock?: boolean;
}): string {
  if (params.canOrder === false) {
    return "https://schema.org/OutOfStock";
  }
  const av = (params.availability || "").trim().toUpperCase();
  if (av === "PREORDER") return "https://schema.org/PreOrder";
  if (av === "OUT_OF_STOCK" || av === "SOLD" || av === "DISCONTINUED") {
    return "https://schema.org/OutOfStock";
  }
  if (av === "AVAILABLE") return "https://schema.org/InStock";
  return params.inStock === false
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
}

export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; href: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(item.href),
    })),
  };
}

export function generateFaqJsonLd(
  faqs: Array<{ question?: string; q?: string; answer?: string; a?: string }>
) {
  const valid = faqs
    .map((f) => ({
      q: (f.question ?? f.q ?? "").trim(),
      a: (f.answer ?? f.a ?? "").trim(),
    }))
    .filter((f) => f.q && f.a);

  if (valid.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export interface ProductJsonLdInput {
  id: string;
  name: string;
  description: string;
  canonicalPath: string;
  images: string[];
  sku?: string | null;
  modelCode?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  condition?: string | null;
  price: number;
  availability?: string | null;
  canOrder?: boolean;
  inStock?: boolean;
  specs?: Array<{ key: string; value: string }>;
}

export function generateProductJsonLd(input: ProductJsonLdInput) {
  const url = toAbsoluteSiteUrl(input.canonicalPath);
  const itemCondition = resolveSchemaItemCondition(input.condition);
  const availability = resolveSchemaAvailability({
    availability: input.availability,
    canOrder: input.canOrder,
    inStock: input.inStock,
  });
  const images = input.images
    .filter(Boolean)
    .map((img) => toAbsoluteSiteUrl(img));

  const additionalProperty = (input.specs || [])
    .filter((s) => s.key?.trim() && s.value?.trim())
    .slice(0, 10)
    .map((s) => ({
      "@type": "PropertyValue",
      name: s.key.trim(),
      value: s.value.trim(),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.name,
    description: input.description,
    url,
    ...(images.length > 0 ? { image: images } : {}),
    sku: input.sku || input.id,
    ...(input.modelCode ? { mpn: input.modelCode } : {}),
    ...(input.brand
      ? {
          brand: {
            "@type": "Brand",
            name: input.brand,
          },
        }
      : {}),
    ...(input.categoryName ? { category: input.categoryName } : {}),
    itemCondition,
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "VND",
      price: input.price,
      availability,
      itemCondition,
      seller: {
        "@type": "Organization",
        "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
        name: businessProfile.brandName,
      },
    },
  };
}
