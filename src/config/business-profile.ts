/**
 * CITILAP BUSINESS PROFILE - SINGLE SOURCE OF TRUTH
 * Updated: 2026-10-09
 * 
 * Nguồn dữ liệu chính thức cho toàn bộ ứng dụng:
 * Header, Footer, Checkout, Contact, Showroom, Policies, SEO và JSON-LD.
 * Dựa trên tài liệu phê duyệt: docs/CitiLap_Business_Profile_2026-10-09.md
 */

export interface OpeningHourRule {
  days: number[]; // 1: Monday ... 6: Saturday
  dayNames: string;
  opens: string;
  closes: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  shortName: string;
  status: "ACTIVE" | "TEMPORARILY_CLOSED";
  address: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
  phone: string;
  displayPhone: string;
  telHref: string;
  mapsUrl?: string;
  openingHoursText: string;
  openingHours: OpeningHourRule[];
  sundayNote: string;
  isHeadOffice: boolean;
  onlinePickupEnabled: boolean; // Chỉ cơ sở cho phép nhận đơn online tại quầy
  walkInViewingAndPurchaseEnabled: boolean; // Cơ sở đón khách xem và mua trực tiếp
  warrantyDropoffEnabled: boolean;
  publicDisplay: boolean;
  statusNotice?: string;
  photos?: string[];
  photoCaption?: string;
  freeshipRadiusKm?: number;
  freeshipNote?: string;
}

export interface BusinessProfile {
  brandName: string;
  legalEntityNotice: string;
  alternateNames: string[];
  canonicalSiteUrl: string;
  logoAsset: string;
  bannerAsset: string;
  primaryTagline: string;
  traditionalMotto: string;
  founded: string;
  productFocus: string;
  targetSegment: string;
  targetMarket: string;
  phone: string;
  displayPhone: string;
  telHref: string;
  email: string;
  supportHours: string;
  sundayConsultationNote: string;
  socialProfiles: {
    facebook: string;
    tiktok: string;
    zalo: string;
    zaloPhone: string;
  };
  shippingPolicy: {
    estimatedFeeRange: string;
    consultationNotice: string;
    hanoiFreeShippingRadiusKm: number;
    hanoiFreeShippingNote: string;
    dispatchTarget: string;
    consultationTarget: string;
  };
  warrantySummary: {
    newLaptop: string;
    usedLaptop: string;
    components: string;
    returnPolicyDays: number;
    returnPolicyNote: string;
  };
  locations: StoreLocation[];
}

export const businessProfile: BusinessProfile = {
  brandName: "CitiLap",
  legalEntityNotice: "Đơn vị vận hành: Hộ kinh doanh CitiLap.",
  alternateNames: ["CitiLapVN", "CitiLap.VN"],
  canonicalSiteUrl: "https://citilap.vn",
  logoAsset: "/brand/citilap-mark.png",
  bannerAsset: "/brand/citilap-hero.webp",
  primaryTagline: "CitiLap - Laptop - Công Nghệ - Cho cuộc sống tốt hơn",
  traditionalMotto: "Một chữ tín - Vạn niềm tin",
  founded: "07/2024",
  productFocus: "Laptop Gaming, Ultrabook/laptop cao cấp, laptop văn phòng/đồ họa, máy like-new/used và phụ kiện công nghệ",
  targetSegment: "15–30 triệu VND",
  targetMarket: "Toàn quốc",
  phone: "0899188186",
  displayPhone: "0899.188.186",
  telHref: "tel:+84899188186",
  email: "contact@citilap.vn",
  supportHours: "09:00 – 20:00, Thứ Hai – Thứ Bảy",
  sundayConsultationNote: "Chủ nhật chỉ tiếp khách & tư vấn theo lịch hẹn trước",
  socialProfiles: {
    facebook: "https://www.facebook.com/citilap",
    tiktok: "https://www.tiktok.com/@citilapvn",
    zalo: "https://zalo.me/0899188186",
    zaloPhone: "0899188186",
  },
  shippingPolicy: {
    estimatedFeeRange: "100.000 – 300.000đ",
    consultationNotice: "Phí vận chuyển sẽ được chuyên viên tư vấn xác nhận khi gọi điện thoại",
    hanoiFreeShippingRadiusKm: 10,
    hanoiFreeShippingNote: "Miễn phí giao hàng trong bán kính 10 km chỉ áp dụng quanh cơ sở CitiLap Hà Nội",
    dispatchTarget: "Xử lý và gửi hàng trong vòng 1 ngày làm việc",
    consultationTarget: "Liên hệ tư vấn trong 1 – 4 giờ trong thời gian làm việc",
  },
  warrantySummary: {
    newLaptop: "6 hoặc 12 tháng tùy gói cấu hình & SKU",
    usedLaptop: "3, 6 hoặc 12 tháng tùy gói cấu hình & SKU",
    components: "3 – 6 tháng tùy phạm vi gói linh kiện",
    returnPolicyDays: 7,
    returnPolicyNote: "Đổi trả trong 7 ngày đầu nếu phát sinh lỗi kỹ thuật phần cứng do nhà sản xuất",
  },
  locations: [
    {
      id: "hanoi",
      name: "CitiLap Hà Nội",
      shortName: "Hà Nội (Trụ sở chính)",
      status: "ACTIVE",
      address: "Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội",
      streetAddress: "Số 23/40 Tạ Quang Bửu, Phường Bạch Mai",
      addressLocality: "Hà Nội",
      postalCode: "100000",
      addressCountry: "VN",
      phone: "0899188186",
      displayPhone: "0899.188.186",
      telHref: "tel:+84899188186",
      mapsUrl: "https://maps.app.goo.gl/vydJE4R6hyDCshh56",
      openingHoursText: "Thứ Hai – Thứ Bảy: 09:00 – 20:00 • Chủ nhật: Theo lịch hẹn trước",
      openingHours: [
        {
          days: [1, 2, 3, 4, 5, 6],
          dayNames: "Thứ Hai – Thứ Bảy",
          opens: "09:00",
          closes: "20:00",
        },
      ],
      sundayNote: "Chủ nhật chỉ tiếp khách và hỗ trợ kỹ thuật theo lịch hẹn trước (không mở cửa cố định)",
      isHeadOffice: true,
      onlinePickupEnabled: true, // Điểm nhận đơn online duy nhất
      walkInViewingAndPurchaseEnabled: true,
      warrantyDropoffEnabled: true,
      publicDisplay: true,
      photos: [
        "/brand/store-photo-01.jpg",
        "/brand/store-photo-02.jpg",
        "/brand/store-photo-03.jpg",
        "/brand/store-photo-04.jpg",
      ],
      photoCaption: "Hình ảnh thực tế không gian và cơ sở CitiLap Hà Nội",
      freeshipRadiusKm: 10,
      freeshipNote: "Miễn phí giao hàng trong bán kính 10 km quanh cơ sở Hà Nội (nhân viên xác nhận điều kiện khi gọi)",
    },
    {
      id: "bac-ninh",
      name: "CitiLap Bắc Ninh",
      shortName: "Bắc Ninh",
      status: "ACTIVE",
      address: "Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh",
      streetAddress: "Số 40 Trần Hưng Đạo, Phường Võ Cường",
      addressLocality: "TP. Bắc Ninh",
      addressRegion: "Bắc Ninh",
      postalCode: "160000",
      addressCountry: "VN",
      phone: "0842044999",
      displayPhone: "0842.044.999",
      telHref: "tel:+84842044999",
      mapsUrl: "https://maps.app.goo.gl/qH6tpuhL48P78XFr6",
      openingHoursText: "Thứ Hai – Thứ Bảy: 09:00 – 20:00 • Chủ nhật: Theo lịch hẹn trước",
      openingHours: [
        {
          days: [1, 2, 3, 4, 5, 6],
          dayNames: "Thứ Hai – Thứ Bảy",
          opens: "09:00",
          closes: "20:00",
        },
      ],
      sundayNote: "Chủ nhật chỉ tiếp khách và tư vấn theo lịch hẹn trước (không mở cửa cố định)",
      isHeadOffice: false,
      onlinePickupEnabled: false, // Bắc Ninh không nhận đơn online pickup tại quầy
      walkInViewingAndPurchaseEnabled: true, // Khách được đến xem và mua trực tiếp tại cơ sở
      warrantyDropoffEnabled: true,
      publicDisplay: true,
      freeshipRadiusKm: undefined, // Không mặc định freeship 10km tại Bắc Ninh
    },
    {
      id: "hcm",
      name: "CitiLap Hồ Chí Minh",
      shortName: "TP. Hồ Chí Minh",
      status: "TEMPORARILY_CLOSED",
      address: "Số 552 Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh",
      streetAddress: "Số 552 Cộng Hòa, Quận Tân Bình",
      addressLocality: "TP. Hồ Chí Minh",
      postalCode: "700000",
      addressCountry: "VN",
      phone: "0899188186",
      displayPhone: "0899.188.186",
      telHref: "tel:+84899188186",
      openingHoursText: "Tạm đóng cửa để nâng cấp điểm phục vụ",
      openingHours: [],
      sundayNote: "Tạm ngưng hoạt động",
      isHeadOffice: false,
      onlinePickupEnabled: false,
      walkInViewingAndPurchaseEnabled: false,
      warrantyDropoffEnabled: false,
      publicDisplay: true,
      statusNotice: "Cơ sở đang tạm ngưng hoạt động để nâng cấp trải nghiệm khách hàng.",
    },
  ],
};

/**
 * Danh sách cơ sở cho phép nhận đơn online (Pickup) tại Checkout
 */
export const onlinePickupLocations = businessProfile.locations.filter(
  (loc) => loc.status === "ACTIVE" && loc.onlinePickupEnabled
);

/**
 * Danh sách cơ sở đang hoạt động phục vụ khách
 */
export const activeStoreLocations = businessProfile.locations.filter(
  (loc) => loc.status === "ACTIVE"
);
