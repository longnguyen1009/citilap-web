import { NextResponse } from "next/server";
import { businessProfile } from "@/config/business-profile";

export interface StorefrontSettings {
  // Store info
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storePhoneBacNinh: string;
  zaloUrl: string;
  addressHanoi: string;
  addressBacNinh: string;
  openingHours: string;

  // Flash sale
  flashSaleEnabled: boolean;
  flashSaleTitle: string;
  flashSaleEndAt: string;

  // Hero & Banners
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSlogan: string;
  heroBgImage: string;
  heroCtaPrimaryText: string;
  heroCtaPrimaryLink: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryLink: string;

  subBanner1Title: string;
  subBanner1Subtitle: string;
  subBanner1Link: string;
  subBanner1Image: string;

  subBanner2Title: string;
  subBanner2Subtitle: string;
  subBanner2Link: string;
  subBanner2Image: string;

  // Feature strip
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;

  // Shipping & Payment
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankAccountInfo: string;
}

const hanoi = businessProfile.locations.find((l) => l.id === "hanoi");
const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh");

export const DEFAULT_SETTINGS: StorefrontSettings = {
  storeName: businessProfile.brandName,
  storeEmail: businessProfile.email,
  storePhone: businessProfile.displayPhone,
  storePhoneBacNinh: bacNinh?.displayPhone || "0988.234.567",
  zaloUrl: businessProfile.socialProfiles.zalo,
  addressHanoi: hanoi?.address || "Hà Nội",
  addressBacNinh: bacNinh?.address || "Bắc Ninh",
  openingHours: "T2 - T7: 09:00 - 20:00 (CN hẹn trước)",

  flashSaleEnabled: true,
  flashSaleTitle: "Giá Sốc Giờ Vàng",
  flashSaleEndAt: process.env.NEXT_PUBLIC_FLASH_SALE_END_AT || new Date(Date.now() + 86400000 * 3).toISOString(),

  heroBadge: "CitiLap Gaming Zone",
  heroTitle: "LAPTOP",
  heroHighlight: "GAMING",
  heroSlogan: "✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩",
  heroBgImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
  heroCtaPrimaryText: "Khám Phá Ngay",
  heroCtaPrimaryLink: "/category/laptop-gaming",
  heroCtaSecondaryText: "Xem Ưu Đãi",
  heroCtaSecondaryLink: "/hot-sale",

  subBanner1Title: "Ultrabook Cao Cấp",
  subBanner1Subtitle: "Sang trọng & Mỏng nhẹ",
  subBanner1Link: "/category/laptop-van-phong",
  subBanner1Image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop",

  subBanner2Title: "Ưu đãi cực khủng",
  subBanner2Subtitle: "Tặng chuột Gaming & Balo",
  subBanner2Link: "/hot-sale",
  subBanner2Image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",

  feature1Title: "Máy lướt, giá tốt",
  feature1Desc: "Like-new 99%, tiết kiệm 30 - 50%",
  feature2Title: "Cam kết nguyên zin",
  feature2Desc: "100% linh kiện chuẩn, chưa sửa chữa",
  feature3Title: "Dịch vụ vượt trội",
  feature3Desc: "Bảo hành 12 tháng, 1 đổi 1 trong 7 ngày",
  feature4Title: "Giao hàng hỏa tốc",
  feature4Desc: "Đồng kiểm máy trước khi thanh toán",

  freeShippingThreshold: 5000000,
  shippingFee: 30000,
  codEnabled: true,
  bankTransferEnabled: true,
  bankAccountInfo: "MBBank - STK: 0899188186 - Chủ TK: NGUYEN VAN A",
};

// Global in-memory cache for settings
let cachedSettings: StorefrontSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  return NextResponse.json({
    success: true,
    data: cachedSettings,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<StorefrontSettings>;
    cachedSettings = {
      ...cachedSettings,
      ...body,
    };

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cấu hình Storefront thành công!",
      data: cachedSettings,
    });
  } catch (error) {
    console.error("[SettingsAPI] Failed to update settings:", error);
    return NextResponse.json(
      { success: false, error: "Không thể lưu cài đặt. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
