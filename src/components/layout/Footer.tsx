import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Truck,
  RefreshCw,
  Store,
  ExternalLink,
  Clock,
} from "lucide-react";
import { businessProfile } from "@/config/business-profile";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";
import type { PublicStorefrontSettings } from "@/contracts/cms/settings";

export default function Footer({
  navigation,
  settings,
}: {
  navigation?: ResolvedNavigation | null;
  settings?: PublicStorefrontSettings | null;
}) {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;
  const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh")!;

  const brandName = settings?.storeName || businessProfile.brandName;
  const motto = settings?.motto || businessProfile.traditionalMotto;
  const phone = settings?.storePhone || businessProfile.displayPhone;
  const telHref = settings?.storePhone ? `tel:${settings.storePhone.replace(/\s+/g, "")}` : businessProfile.telHref;
  const email = settings?.storeEmail || businessProfile.email;
  const hours = settings?.openingHours || "T2 - T7: 09:00 - 20:00 (Chủ nhật: Theo lịch hẹn trước)";
  const copyright = settings?.copyrightText || `© 2024 - ${new Date().getFullYear()} ${brandName}. ${businessProfile.primaryTagline}. Tất cả quyền được bảo lưu.`;

  const fb = settings ? settings.facebookUrl : businessProfile.socialProfiles.facebook;
  const tiktok = settings ? settings.tiktokUrl : businessProfile.socialProfiles.tiktok;
  const zalo = settings ? settings.zaloUrl : businessProfile.socialProfiles.zalo;
  const youtube = settings?.youtubeUrl;

  const hanoiAddr = settings?.addressHanoi || hanoi.address;
  const bacNinhAddr = settings ? settings.addressBacNinh : bacNinh.address;
  const bacNinhPhone = settings?.storePhoneBacNinh || bacNinh.displayPhone;

  return (
    <footer className="bg-[#0b1221] text-gray-300">
      {/* 1. Value Proposition Features Bar */}
      <div className="bg-[#0f172a] py-8 border-y border-gray-800">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <Truck className="w-10 h-10 text-blue-500 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm uppercase">Giao hàng toàn quốc</h4>
                <p className="text-xs text-gray-400">Kiểm tra máy khi nhận, cước chốt khi tư vấn</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-10 h-10 text-blue-500 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm uppercase">Bảo hành linh hoạt</h4>
                <p className="text-xs text-gray-400">Gói 3 - 12 tháng theo cấu hình & SKU máy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RefreshCw className="w-10 h-10 text-blue-500 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm uppercase">Đổi mới 7 ngày</h4>
                <p className="text-xs text-gray-400">Đổi trả nếu phát sinh lỗi kỹ thuật phần cứng</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Store className="w-10 h-10 text-blue-500 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm uppercase">Trải nghiệm thực tế</h4>
                <p className="text-xs text-gray-400">Xem và mua trực tiếp tại Hà Nội & Bắc Ninh</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Navigation & Stores */}
      <div className="pt-12 pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Column 1: Brand Info & Contacts */}
            <div className="space-y-4">
              <Link href="/" className="flex flex-col">
                <span className="text-3xl font-extrabold text-blue-500 leading-tight tracking-tight">
                  {brandName}
                </span>
                <span className="text-gray-400 text-[10px] tracking-widest uppercase font-semibold mt-0.5">
                  {motto}
                </span>
              </Link>
              <p className="text-xs text-gray-400 leading-relaxed">
                Chuyên laptop gaming, Ultrabook cao cấp và máy like-new tuyển chọn kỹ lưỡng.
              </p>

              <ul className="space-y-3 text-sm text-gray-400 pt-1">
                <li className="flex gap-3 items-center">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                  <a
                    href={telHref}
                    className="hover:text-blue-400 font-bold text-white transition"
                  >
                    Hotline: {phone}
                  </a>
                </li>
                <li className="flex gap-3 items-center">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-blue-400 transition"
                  >
                    {email}
                  </a>
                </li>
                <li className="flex gap-3 items-start">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-gray-300">{hours}</p>
                  </div>
                </li>
              </ul>

              {/* Social links */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white transition"
                  >
                    Facebook
                  </a>
                )}
                {tiktok && (
                  <a
                    href={tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-pink-600 text-gray-300 hover:text-white transition"
                  >
                    TikTok
                  </a>
                )}
                {zalo && (
                  <a
                    href={zalo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-blue-500 text-gray-300 hover:text-white transition"
                  >
                    Zalo
                  </a>
                )}
                {youtube && (
                  <a
                    href={youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white transition"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Hệ thống Showroom */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white uppercase tracking-wide flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-500" /> Hệ thống cơ sở
              </h3>

              <div className="space-y-4 text-xs text-gray-400">
                {/* Cơ sở Hà Nội */}
                <div className="border-l-2 border-blue-500 pl-3 space-y-1">
                  <div className="font-bold text-gray-200">{hanoi.name} (Trụ sở chính)</div>
                  <p className="text-gray-400">{hanoiAddr}</p>
                  <p className="text-blue-400 font-semibold">ĐT: {phone}</p>
                  {hanoi.mapsUrl && (
                    <a
                      href={hanoi.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white underline mt-0.5"
                    >
                      <MapPin className="w-3 h-3 text-red-400" /> Chỉ đường Google Maps <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Cơ sở Bắc Ninh (nếu có cấu hình) */}
                {bacNinhAddr && (
                  <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                    <div className="font-bold text-gray-200">{bacNinh.name}</div>
                    <p className="text-gray-400">{bacNinhAddr}</p>
                    <p className="text-emerald-400 font-semibold">ĐT: {bacNinhPhone}</p>
                    {bacNinh.mapsUrl && (
                      <a
                        href={bacNinh.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white underline mt-0.5"
                      >
                        <MapPin className="w-3 h-3 text-red-400" /> Chỉ đường Google Maps <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    href="/he-thong-cua-hang"
                    className="text-blue-400 hover:text-blue-300 font-medium underline inline-flex items-center gap-1"
                  >
                    Xem chi tiết giờ hoạt động & cơ sở →
                  </Link>
                </div>
              </div>
            </div>

            {/* Column 3: Hỗ trợ khách hàng */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white uppercase tracking-wide">
                Hỗ trợ mua hàng
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <Link href="/huong-dan-mua-hang" className="hover:text-white transition">
                    Hướng dẫn đặt hàng
                  </Link>
                </li>
                <li>
                  <Link href="/chinh-sach-bao-hanh" className="hover:text-white transition">
                    Chính sách bảo hành
                  </Link>
                </li>
                <li>
                  <Link href="/chinh-sach-doi-tra" className="hover:text-white transition">
                    Chính sách đổi trả & hoàn tiền
                  </Link>
                </li>
                <li>
                  <Link href="/chinh-sach-van-chuyen" className="hover:text-white transition">
                    Chính sách vận chuyển & giao nhận
                  </Link>
                </li>
                <li>
                  <Link href="/order-tracking" className="hover:text-white transition">
                    Tra cứu yêu cầu đặt hàng
                  </Link>
                </li>
                <li><Link href="/cau-hoi-thuong-gap" className="hover:text-white transition">Câu hỏi thường gặp</Link></li>
              </ul>
            </div>

            {/* Column 4: Giới thiệu & Pháp lý */}
            <div>
              <h3 className="text-base font-bold mb-4 text-white uppercase tracking-wide">
                Về CitiLap
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {navigation?.menus.footer && navigation.menus.footer.length > 0 ? (
                  navigation.menus.footer.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="hover:text-white transition font-medium">{item.label}</Link>
                      {item.children.length > 0 && (
                        <ul className="pl-3 mt-2 space-y-2 border-l border-gray-700">
                          {item.children.map((child) => (
                            <li key={child.id}><Link href={child.href} className="hover:text-white transition">{child.label}</Link></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <Link href="/gioi-thieu" className="hover:text-white transition">
                        Giới thiệu thương hiệu
                      </Link>
                    </li>
                    <li>
                      <Link href="/he-thong-cua-hang" className="hover:text-white transition">
                        Hệ thống cửa hàng
                      </Link>
                    </li>
                    <li>
                      <Link href="/lien-he" className="hover:text-white transition">
                        Liên hệ & Hỗ trợ kỹ thuật
                      </Link>
                    </li>
                    <li>
                      <Link href="/dieu-khoan-mua-hang" className="hover:text-white transition">
                        Điều khoản đặt hàng
                      </Link>
                    </li>
                    <li>
                      <Link href="/chinh-sach-bao-mat" className="hover:text-white transition">
                        Chính sách bảo mật thông tin
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Copyright & Notice */}
      <div className="bg-[#050a14] pt-4 pb-20 md:pb-4 text-center text-gray-500 text-xs border-t border-gray-800">
        <div className="container mx-auto px-4 max-w-[1370px] space-y-1">
          <p>{copyright}</p>
          <p>{businessProfile.legalEntityNotice}</p>
          <p className="text-[11px] text-gray-600">
            Website phục vụ giới thiệu sản phẩm và tiếp nhận yêu cầu mua hàng. Không thực hiện giao dịch thanh toán trực tuyến trên trang.
          </p>
        </div>
      </div>
    </footer>
  );
}
