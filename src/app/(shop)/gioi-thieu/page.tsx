import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Award,
  Phone,
  Store,
  Laptop,
} from "lucide-react";
import { businessProfile } from "@/config/business-profile";

import { mediaEnvironment } from "@/server/media-http";
import { getSystemPageResolution } from "@/server/services/page.service";
import { sanitizeHtml } from "@/lib/sanitize-html";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const env = await mediaEnvironment();
    const resolution = await getSystemPageResolution(env.DB, "ABOUT");
    if (resolution.state === "PUBLISHED") {
      const title = `${resolution.page.seo.title} | ${businessProfile.brandName}`;
      const description = resolution.page.seo.description || `Tìm hiểu về ${businessProfile.brandName}.`;
      return {
        title,
        description,
        alternates: {
          canonical: `${businessProfile.canonicalSiteUrl}/gioi-thieu`,
        },
        openGraph: {
          title,
          description,
          url: `${businessProfile.canonicalSiteUrl}/gioi-thieu`,
          images: resolution.page.seo.ogImageUrl ? [{ url: resolution.page.seo.ogImageUrl }] : undefined,
        },
      };
    }
  } catch {
    // Fail-safe static metadata fallback
  }

  return {
    title: `Giới thiệu | ${businessProfile.brandName}`,
    description: `Tìm hiểu về ${businessProfile.brandName} - Cửa hàng chuyên Laptop Gaming, Ultrabook cao cấp và máy like-new tuyển chọn kỹ lưỡng. Thành lập từ 07/2024. ${businessProfile.traditionalMotto}.`,
    alternates: {
      canonical: `${businessProfile.canonicalSiteUrl}/gioi-thieu`,
    },
    openGraph: {
      title: `Giới thiệu ${businessProfile.brandName} - ${businessProfile.traditionalMotto}`,
      description: `Tìm hiểu về ${businessProfile.brandName} - Cửa hàng chuyên Laptop Gaming, Ultrabook cao cấp. Thành lập từ 07/2024.`,
      url: `${businessProfile.canonicalSiteUrl}/gioi-thieu`,
    },
  };
}

export default async function AboutPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  // Fail-closed on infrastructure errors (do NOT catch and disguise DB errors)
  const env = await mediaEnvironment();
  const resolution = await getSystemPageResolution(env.DB, "ABOUT");
  const cmsPage = resolution.state === "PUBLISHED" ? resolution.page : null;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1240px]">
          <nav className="flex text-sm text-gray-500 py-3.5 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-bold">Giới thiệu CitiLap</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1240px] mt-8">
        {/* 2. Hero Header */}
        <div className="bg-gradient-to-br from-[#0b1221] via-blue-950 to-[#0b1221] text-white rounded-3xl p-8 md:p-14 shadow-xl border border-blue-900/60 relative overflow-hidden mb-12">
          <div className="max-w-2xl relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Thành lập từ tháng {businessProfile.founded}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {cmsPage?.title || businessProfile.brandName}
            </h1>
            <p className="text-blue-200 text-lg md:text-xl font-medium">
              {businessProfile.primaryTagline}
            </p>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed pt-2">
              Chúng tôi tập trung vào phân khúc laptop gaming, Ultrabook cao cấp và các dòng máy like-new tuyển chọn kỹ càng. Với phương châm <strong className="text-white">&ldquo;{businessProfile.traditionalMotto}&rdquo;</strong>, CitiLap cam kết mang tới sản phẩm chuẩn mô tả, cấu hình tối ưu cùng sự đồng hành kỹ thuật tận tâm.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                href="/phan-loai"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
              >
                Khám phá sản phẩm
              </Link>
              <Link
                href="/he-thong-cua-hang"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition border border-white/20"
              >
                Hệ thống showroom
              </Link>
            </div>
          </div>
        </div>

        {cmsPage?.contentHtml && (
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-6 sm:p-10 md:p-12 mb-12">
            <div
              className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsPage.contentHtml) }}
            />
          </div>
        )}

        {/* 3. Core Values Grid */}
        <div className="mb-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase">
              Giá trị cốt lõi tại CitiLap
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Tiêu chuẩn chất lượng và nguyên tắc phục vụ định hình mọi hoạt động của chúng tôi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Kiểm tra kỹ thuật nghiêm ngặt</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Từng chiếc laptop, đặc biệt là máy đã qua sử dụng, đều được kỹ thuật viên kiểm tra kỹ mainboard, tình trạng pin thực tế, số giờ hoạt động của ổ cứng SSD và chất lượng hiển thị màn hình trước khi đến tay khách hàng.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Bảo hành linh hoạt & Minh bạch</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Áp dụng các gói bảo hành 3, 6 hoặc 12 tháng theo từng model và gói dịch vụ khách hàng lựa chọn. Thông số bảo hành được công bố công khai, hỗ trợ đổi máy trong 7 ngày đầu nếu phát sinh lỗi kỹ thuật phần cứng.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Tư vấn đúng nhu cầu thực tế</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Chúng tôi không tư vấn máy đắt nhất mà tìm chiếc laptop tối ưu nhất cho ngân sách và công việc của bạn — từ học tập, lập trình, thiết kế đồ họa đến gaming cường độ cao.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Real Store Gallery (Hà Nội Store Photos) */}
        {hanoi.photos && hanoi.photos.length > 0 && (
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                  <Store className="w-4 h-4" /> Không gian thực tế
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                  Cơ sở chính CitiLap Hà Nội
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {hanoi.photoCaption} ({hanoi.address})
                </p>
              </div>
              <Link
                href="/he-thong-cua-hang"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
              >
                Xem tất cả chi nhánh <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {hanoi.photos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="group relative h-64 rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs bg-gray-100"
                >
                  <Image
                    src={photoUrl}
                    alt={`Hình ảnh thực tế cơ sở CitiLap Hà Nội số ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
                    <span className="text-xs font-medium text-white">
                      CitiLap Hà Nội • Ảnh {idx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 italic text-center mt-3">
              * Toàn bộ hình ảnh trên được chụp thực tế tại trụ sở CitiLap Hà Nội. Quý khách có thể đến trực tiếp trải nghiệm máy trước khi mua.
            </p>
          </div>
        )}

        {/* 5. Contact CTA */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-200 text-center max-w-3xl mx-auto shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-gray-900 uppercase">
            Bạn cần hỗ trợ hoặc tư vấn cấu hình?
          </h2>
          <p className="text-gray-600 text-sm max-w-lg mx-auto">
            Đội ngũ chuyên viên CitiLap luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc về model, nâng cấp phần cứng và chính sách bán hàng.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <a
              href={businessProfile.telHref}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-600/20"
            >
              <Phone className="w-4 h-4" /> Gọi Hotline: {businessProfile.displayPhone}
            </a>
            <Link
              href="/lien-he"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition"
            >
              Xem thông tin liên hệ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
