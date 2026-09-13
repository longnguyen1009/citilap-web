import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import ScrollToTop from "@/components/layout/ScrollToTop";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "CITILAP.VN - Một chữ tín - Vạn niềm tin",
    template: "%s | CITILAP.VN",
  },
  description: "Cửa hàng công nghệ hàng đầu - Laptop Gaming, MacBook, Linh kiện PC, Phụ kiện chính hãng giá tốt nhất thị trường. Tư vấn miễn phí, bảo hành 12 tháng.",
  keywords: ["laptop", "laptop gaming", "macbook", "pc", "linh kiện", "phụ kiện", "công nghệ", "citilap", "RTX", "Lenovo Legion", "ASUS ROG"],
  authors: [{ name: "CITILAP.VN" }],
  creator: "CITILAP.VN",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://citilap.vn"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "CITILAP.VN",
    title: "CITILAP.VN - Một chữ tín - Vạn niềm tin",
    description: "Cửa hàng công nghệ hàng đầu - Laptop Gaming, MacBook, Linh kiện PC, Phụ kiện chính hãng giá tốt nhất thị trường.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CITILAP.VN - Một chữ tín - Vạn niềm tin",
    description: "Cửa hàng công nghệ hàng đầu - Laptop Gaming, MacBook, Linh kiện PC, Phụ kiện chính hãng giá tốt nhất thị trường.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <WishlistProvider>
            {children}
            <ScrollToTop />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
