import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { businessProfile } from "@/config/business-profile";
import { mediaEnvironment } from "@/server/media-http";
import { getSystemPageResolution } from "@/server/services/page.service";
import { sanitizeHtml } from "@/lib/sanitize-html";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const env = await mediaEnvironment();
    const resolution = await getSystemPageResolution(env.DB, "RETURNS");
    if (resolution.state === "PUBLISHED") {
      const title = `${resolution.page.seo.title} | ${businessProfile.brandName}`;
      const description = resolution.page.seo.description || `Chính sách đổi trả tại ${businessProfile.brandName}.`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "article",
          publishedTime: resolution.page.publishedAt,
          modifiedTime: resolution.page.updatedAt,
          images: resolution.page.seo.ogImageUrl ? [{ url: resolution.page.seo.ogImageUrl }] : undefined,
        },
        alternates: {
          canonical: `${businessProfile.canonicalSiteUrl}/chinh-sach-doi-tra`,
        },
      };
    }
  } catch {
    // Fail-safe static metadata fallback
  }

  return {
    title: `Chính sách đổi trả & hoàn tiền | ${businessProfile.brandName}`,
    description: `Thông tin chính sách đổi trả sản phẩm lỗi và điều kiện hoàn tiền tại ${businessProfile.brandName}.`,
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ReturnPolicyPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;

  // Fail-closed on infrastructure errors (do NOT catch and disguise DB errors as static content)
  const env = await mediaEnvironment();
  const resolution = await getSystemPageResolution(env.DB, "RETURNS");

  // State C: Published CMS content
  if (resolution.state === "PUBLISHED") {
    const cmsPage = resolution.page;
    return (
      <PolicyLayout
        currentSlug="chinh-sach-doi-tra"
        title={cmsPage.title}
        subtitle={cmsPage.seo.description || undefined}
        isPublished={true}
        lastUpdated={new Date(cmsPage.updatedAt).toLocaleDateString("vi-VN")}
      >
        <div
          className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsPage.contentHtml) }}
        />
      </PolicyLayout>
    );
  }

  // State D: Intentionally unpublished by operator (Must NOT resurrect legacy hard-coded content)
  if (resolution.state === "UNPUBLISHED") {
    return (
      <PolicyLayout
        currentSlug="chinh-sach-doi-tra"
        title="Chính sách đang cập nhật"
        subtitle="Nội dung chính sách đổi trả đang được rà soát và cập nhật bởi ban quản trị CitiLap"
        isPublished={false}
      >
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 space-y-2">
          <p className="font-bold text-base">Chính sách đổi trả hiện đang tạm ẩn</p>
          <p className="text-xs text-amber-700">
            Nội dung đang được cập nhật để phù hợp với quy định mới. Quý khách vui lòng liên hệ hotline{" "}
            <strong>{businessProfile.displayPhone}</strong> để được hỗ trợ thông tin chi tiết.
          </p>
        </div>
      </PolicyLayout>
    );
  }

  // State A (NO_CMS_RECORD) & State B (DRAFT_ONLY):
  // Transitional fallback to verified legacy policy until official CMS version is published.

  return (
    <PolicyLayout
      currentSlug="chinh-sach-doi-tra"
      title="Chính sách đổi trả & hoàn tiền"
      subtitle="Quy định hỗ trợ đổi sản phẩm khi phát sinh sự cố kỹ thuật và giải quyết quyền lợi khách hàng"
      isPublished={false}
    >
      <section className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Chuẩn bị yêu cầu hỗ trợ</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Gửi mã đơn hoặc phiếu mua hàng, serial máy, mô tả lỗi và thời điểm phát hiện; bổ sung ảnh hoặc video nếu có.</li>
            <li>Liên hệ CitiLap để xác nhận nơi tiếp nhận và cách gửi máy. Trao đổi phí vận chuyển theo tình huống trước khi gửi.</li>
            <li>Sao lưu dữ liệu; không gửi mật khẩu, mã OTP trong biểu mẫu. Ghi nhận ngoại hình, phụ kiện và serial khi bàn giao.</li>
            <li>Giữ biên bản tiếp nhận và thông tin phương án xử lý. Thời gian kiểm tra, đổi hoặc hoàn tiền được xác nhận theo hồ sơ.</li>
          </ol>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Quy định đổi trả trong 7 ngày đầu</h2>
          <p className="text-sm leading-relaxed">
            Trong vòng <strong>7 ngày đầu kể từ thời điểm nhận máy</strong>, nếu laptop phát sinh lỗi kỹ thuật phần cứng thuộc phạm vi bảo hành của cửa hàng, quý khách có quyền yêu cầu đổi một máy tương đương hoặc phương án xử lý phù hợp sau khi kỹ thuật viên xác nhận lỗi.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm mt-3">
            <li>Máy đổi mới phải giữ nguyên hình thức ban đầu, không bị trầy xước, cấn móp phát sinh mới so với thời điểm nhận.</li>
            <li>Đầy đủ phụ kiện kèm theo (sạc zin, dây nguồn, quà tặng nếu có).</li>
            <li>Phiếu bán hàng và tem bảo hành trên máy còn nguyên vẹn.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Phương án hoàn tiền</h2>
          <p className="text-sm leading-relaxed">
            Khi sản phẩm lỗi thuộc điều kiện đổi trả hoặc bảo hành nhưng không có phương án xử lý phù hợp, CitiLap trao đổi phương án hoàn tiền theo kết quả kiểm tra và quyền lợi hợp pháp của khách hàng. Số tiền, phương thức, thời gian hoàn và chi phí vận chuyển cần được xác nhận bằng thông tin trao đổi hoặc biên bản trước khi thực hiện.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Trường hợp khách hàng thay đổi nhu cầu sử dụng</h2>
          <p className="text-sm leading-relaxed">
            Nếu máy hoạt động bình thường và không có lỗi kỹ thuật nhưng quý khách có nhu cầu đổi sang dòng máy khác hoặc không còn nhu cầu sử dụng:
          </p>
          <p className="text-sm leading-relaxed mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            CitiLap có thể xem xét <strong>thu mua lại theo chính sách thu mua máy cũ (Trade-in)</strong> thỏa thuận theo thời giá thị trường. Đây là chính sách thu cũ riêng biệt, <em>không áp dụng chế độ hoàn tiền không điều kiện</em>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Đầu mối hỗ trợ tiếp nhận</h2>
          <p className="text-sm leading-relaxed">
            Để được hướng dẫn thủ tục đổi trả nhanh chóng, quý khách vui lòng liên hệ:
          </p>
          <ul className="space-y-1.5 text-sm mt-2">
            <li>• <strong>Đầu mối chính:</strong> {hanoi.name} ({hanoi.address})</li>
            <li>• <strong>Hotline tiếp nhận:</strong> <a href={businessProfile.telHref} className="text-blue-600 font-bold hover:underline">{businessProfile.displayPhone}</a></li>
            <li>• <strong>Email hỗ trợ:</strong> <a href={`mailto:${businessProfile.email}`} className="text-blue-600 hover:underline">{businessProfile.email}</a></li>
          </ul>
        </div>
      </section>
    </PolicyLayout>
  );
}
