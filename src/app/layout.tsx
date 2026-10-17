import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CompareProvider } from "@/context/CompareContext";
import CompareFloatingBar from "@/components/product/CompareFloatingBar";
import CompareModal from "@/components/product/CompareModal";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { businessProfile } from "@/config/business-profile";
import {
  generateOrganizationJsonLd,
  generateLocalBusinessesJsonLd,
  generateWebSiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo-helpers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const baseMetadata: Metadata = {
  title: {
    default: `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`,
    template: `%s | ${businessProfile.brandName}`,
  },
  description: `Cửa hàng chuyên Laptop Gaming, Ultrabook cao cấp và máy like-new tuyển chọn kỹ lưỡng. ${businessProfile.traditionalMotto}. Tư vấn cấu hình chuẩn xác, bảo hành chu đáo theo gói sản phẩm.`,
  keywords: [
    "CitiLap",
    "laptop",
    "laptop gaming",
    "ultrabook",
    "laptop cu",
    "laptop like new",
    "linh kiện laptop",
    "Lenovo Legion",
    "ASUS ROG",
    "Dell XPS",
    "ThinkPad",
    "Hà Nội",
    "Bắc Ninh",
  ],
  authors: [{ name: businessProfile.brandName, url: businessProfile.canonicalSiteUrl }],
  creator: businessProfile.brandName,
  publisher: businessProfile.brandName,
  metadataBase: new URL(businessProfile.canonicalSiteUrl),
  alternates: {
    canonical: businessProfile.canonicalSiteUrl,
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: businessProfile.brandName,
    title: `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`,
    description: `Cửa hàng chuyên Laptop Gaming, Ultrabook cao cấp và máy like-new tuyển chọn kỹ lưỡng. ${businessProfile.traditionalMotto}.`,
    url: businessProfile.canonicalSiteUrl,
    images: [
      {
        url: `${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`,
        width: 900,
        height: 900,
        alt: `${businessProfile.brandName} Logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`,
    description: `Cửa hàng chuyên Laptop Gaming, Ultrabook cao cấp và máy like-new tuyển chọn kỹ lưỡng. ${businessProfile.traditionalMotto}.`,
    images: [`${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const {mediaEnvironment}=await import('@/server/media-http');
  const {seoDefaults}=await import('@/server/services/seo.service');
  const defaults=await seoDefaults((await mediaEnvironment()).DB);
  return {...baseMetadata,title:{default:defaults.title,template:'%s | CitiLap'},description:defaults.description,alternates:undefined,
    openGraph:{...baseMetadata.openGraph,title:defaults.title,description:defaults.description},twitter:{...baseMetadata.twitter,title:defaults.title,description:defaults.description}};
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = generateOrganizationJsonLd();
  const webSiteJsonLd = generateWebSiteJsonLd();
  const localBusinessesJsonLd = generateLocalBusinessesJsonLd();

  const structuredDataString = serializeJsonLd([
    orgJsonLd,
    webSiteJsonLd,
    ...localBusinessesJsonLd,
  ]);

  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataString }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              {children}
              <CompareFloatingBar />
              <CompareModal />
              <ScrollToTop />
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
