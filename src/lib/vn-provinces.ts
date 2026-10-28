/**
 * Đơn vị hành chính cấp tỉnh của Việt Nam sau sắp xếp có hiệu lực từ 01/07/2025
 * (Nghị quyết 202/2025/QH15): 34 tỉnh, thành phố. Địa chỉ dùng 2 cấp: Tỉnh/Thành phố → Phường/Xã.
 */
const PRIORITY = ["Hà Nội", "TP. Hồ Chí Minh"] as const;

const OTHERS = [
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Cần Thơ",
  "Đà Nẵng",
  "Đắk Lắk",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hải Phòng",
  "Huế",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lạng Sơn",
  "Lào Cai",
  "Lâm Đồng",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
] as const;

export const VN_PROVINCES: readonly string[] = [...PRIORITY, ...OTHERS];

export function isVnProvince(value: string): boolean {
  return VN_PROVINCES.includes(value);
}

