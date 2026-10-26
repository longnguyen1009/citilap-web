export const NEED_LABELS: Record<string, string> = {
  "van-phong": "Văn phòng", gaming: "Gaming", "mong-nhe": "Mỏng nhẹ",
  "do-hoa": "Đồ họa – kỹ thuật", "sinh-vien": "Sinh viên", "cam-ung": "Cảm ứng", "laptop-ai": "Laptop AI", "doanh-nhan": "Doanh nhân",
};

// Only group explicit saved tags; product names/specs never imply a need.
export function catalogNeedTag(tag: string): string {
  const value = tag.trim().toLocaleLowerCase("vi-VN");
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("đ", "d").replace(/[\s_-]/g, "");
  const aliases: Record<string, string> = {
    vanphong: "van-phong", office: "van-phong", gaming: "gaming", game: "gaming",
    mongnhe: "mong-nhe", ultrabook: "mong-nhe", dohoa: "do-hoa", creator: "do-hoa",
    sinhvien: "sinh-vien", camung: "cam-ung", touchscreen: "cam-ung", laptopai: "laptop-ai", doanhnhan: "doanh-nhan", business: "doanh-nhan",
  };
  return aliases[key] || value;
}
