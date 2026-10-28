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
  const messenger = settings?.messengerUrl;
  const tiktok = settings ? settings.tiktokUrl : businessProfile.socialProfiles.tiktok;
  const zalo = settings ? settings.zaloUrl : businessProfile.socialProfiles.zalo;
  const youtube = settings?.youtubeUrl;

  const hanoiAddr = settings?.addressHanoi || hanoi.address;
  const bacNinhAddr = settings ? settings.addressBacNinh : bacNinh.address;
  const bacNinhPhone = settings?.storePhoneBacNinh || bacNinh.displayPhone;

  const DEFAULT_MOIT_BADGE_IMAGE = "https://bizweb.dktcdn.net/thumb/medium/100/372/934/themes/892516/assets/logo_bct.png";
  const legalName = settings?.legalBusinessName?.trim() || "HỘ KINH DOANH CITI LAP";
  const registrationNumber = settings?.businessRegistrationNumber?.trim() || "01D8053589";
  const registrationIssuer = settings?.businessRegistrationIssuer?.trim() || "";
  const registrationDate = settings?.businessRegistrationDate?.trim() || "";
  const legalRepresentative = settings?.legalRepresentative?.trim() || "";
  const legalAddress = settings?.legalAddress?.trim() || hanoiAddr;
  const moitEnabled = settings ? settings.moitBadgeEnabled !== false : true;
  const moitUrl = settings?.moitBadgeUrl?.trim() || "#";
  const rawMoitImage = settings?.moitBadgeImage?.trim();
  const moitImage =
    !rawMoitImage || rawMoitImage === "/brand/bo-cong-thuong.svg"
      ? DEFAULT_MOIT_BADGE_IMAGE
      : rawMoitImage;

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
                {messenger && (
                  <a
                    href={messenger}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white transition"
                  >
                    Messenger
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

            {[{ title: 'Chính sách khách hàng', id: 'footer-policies', links: [
              { label: 'Chính sách bảo hành', href: '/chinh-sach-bao-hanh' },
              { label: 'Đổi trả & hoàn tiền', href: '/chinh-sach-doi-tra' },
              { label: 'Vận chuyển & giao nhận', href: '/chinh-sach-van-chuyen' },
              { label: 'Bảo vệ thông tin cá nhân', href: '/chinh-sach-bao-mat' },
              { label: 'Điều khoản mua hàng', href: '/dieu-khoan-mua-hang' },
            ] }, { title: 'Về CitiLap', id: 'footer-about', links: [
              { label: 'Giới thiệu CitiLap', href: '/gioi-thieu' },
              { label: 'Hệ thống cửa hàng', href: '/he-thong-cua-hang' },
              { label: 'Liên hệ CitiLap', href: '/lien-he' },
              { label: 'Hướng dẫn đặt hàng', href: '/huong-dan-mua-hang' },
              { label: 'Tra cứu đơn hàng', href: '/order-tracking' },
              { label: 'Câu hỏi thường gặp', href: '/cau-hoi-thuong-gap' },
            ] }].map(group => <div key={group.id}><h3 className="mb-4 text-base font-bold uppercase tracking-wide text-white">{group.title}</h3><ul className="space-y-2.5 text-sm text-gray-400">{(navigation?.menus.footer.find(item => item.id === group.id)?.children || group.links).map(item => <li key={item.href}><Link href={item.href} className="transition hover:text-white">{item.label}</Link></li>)}</ul></div>)}

          </div>
        </div>
      </div>

      {/* 3. Bottom Copyright, Legal Entity & MOIT badge */}
      <div className="bg-[#050a14] pt-5 pb-20 md:pb-6 text-gray-400 text-xs border-t border-gray-800/80">
        <div className="container mx-auto px-4 max-w-[1370px] flex flex-col items-center text-center gap-2.5">
          <div className="max-w-4xl space-y-1 leading-relaxed">
            <p className="text-gray-300">
              <span className="font-semibold text-gray-200">{legalName}</span>
              {registrationNumber && (
                <>
                  {" "}- Mã số đăng ký hộ kinh doanh: <span className="font-semibold text-gray-200">{registrationNumber}</span>
                  {registrationIssuer && <> cấp tại {registrationIssuer}</>}
                  {registrationDate && <> ngày {registrationDate}</>}
                </>
              )}
              {legalRepresentative && <>. Chủ hộ kinh doanh: {legalRepresentative}</>}
              {legalAddress && <>. Địa chỉ: {legalAddress}</>}
              {phone && <>. Điện thoại: {phone}.</>}
            </p>
            <p className="text-[11px] text-gray-500">{copyright}</p>
          </div>
          {moitEnabled && moitImage && (
            <div className="flex items-center justify-center pt-1">
              <a
                href={moitUrl || "#"}
                target={moitUrl && moitUrl !== "#" ? "_blank" : undefined}
                rel={moitUrl && moitUrl !== "#" ? "noopener noreferrer nofollow" : undefined}
                className="inline-flex items-center"
                title="Đã thông báo Bộ Công Thương"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-configurable badge may be hosted externally */}
                <img
                  src={moitImage}
                  alt="Đã thông báo Bộ Công Thương"
                  width={130}
                  height={49}
                  loading="lazy"
                  className="h-[44px] w-auto object-contain"
                />
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
