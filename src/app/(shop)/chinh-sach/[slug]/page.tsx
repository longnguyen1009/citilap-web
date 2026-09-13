import Link from "next/link";
import { ChevronRight, FileText, ShieldCheck, Truck, CreditCard, RefreshCw, AlertCircle } from "lucide-react";

const policyNames: Record<string, string> = {
  "huong-dan-mua-hang": "Hướng dẫn mua hàng",
  "bao-hanh": "Chính sách bảo hành",
  "doi-tra": "Chính sách đổi trả",
  "van-chuyen": "Chính sách vận chuyển",
  "thanh-toan": "Phương thức thanh toán",
  "bao-mat": "Chính sách bảo mật",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = policyNames[slug] || "Chính sách";
  return {
    title: name,
    description: `${name} tại CITILAP.VN - Xem chi tiết chính sách bảo hành, đổi trả, vận chuyển và thanh toán.`,
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const policies = [
    { id: "huong-dan-mua-hang", name: "Hướng dẫn mua hàng", icon: <FileText className="w-5 h-5" /> },
    { id: "bao-hanh", name: "Chính sách bảo hành", icon: <ShieldCheck className="w-5 h-5" /> },
    { id: "doi-tra", name: "Chính sách đổi trả", icon: <RefreshCw className="w-5 h-5" /> },
    { id: "tra-gop", name: "Hướng dẫn mua trả góp", icon: <CreditCard className="w-5 h-5" /> },
    { id: "kiem-tra-bao-hanh", name: "Kiểm tra bảo hành", icon: <ShieldCheck className="w-5 h-5" /> },
    { id: "giao-hang", name: "Chính sách giao hàng", icon: <Truck className="w-5 h-5" /> },
    { id: "thanh-toan", name: "Chính sách thanh toán", icon: <CreditCard className="w-5 h-5" /> },
    { id: "privacy", name: "Chính sách bảo mật", icon: <AlertCircle className="w-5 h-5" /> },
    { id: "dieu-khoan", name: "Điều khoản sử dụng", icon: <AlertCircle className="w-5 h-5" /> },
  ];

  const currentPolicy = policies.find(p => p.id === slug) || policies[0];

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">{currentPolicy.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Menu */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="bg-gray-50 p-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900 uppercase">Hỗ trợ khách hàng</h2>
              </div>
              <div className="flex flex-col p-2">
                {policies.map((policy) => (
                  <Link 
                    key={policy.id} 
                    href={`/chinh-sach/${policy.id}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      slug === policy.id 
                        ? "bg-blue-50 text-blue-600" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    }`}
                  >
                    {policy.icon}
                    {policy.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
              <h1 className="text-3xl font-black text-gray-900 mb-6 uppercase border-b border-gray-100 pb-4">{currentPolicy.name}</h1>
              
              {/* Dynamic Content based on slug */}
              <div className="prose prose-blue max-w-none text-gray-700">
                
                {slug === "bao-hanh" ? (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">1. Điều kiện bảo hành</h3>
                    <p>Sản phẩm được bảo hành miễn phí nếu đảm bảo tất cả các điều kiện sau:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6">
                      <li>Sản phẩm thuộc danh mục được bảo hành từ Nhà sản xuất hoặc Nhà phân phối.</li>
                      <li>Sản phẩm bị lỗi kỹ thuật do Nhà sản xuất.</li>
                      <li>Thời hạn bảo hành trên phiếu bảo hành vẫn còn hiệu lực.</li>
                      <li>Phiếu bảo hành còn nguyên vẹn, không chắp vá, không bị gạch xóa hay sửa chữa, bôi bẩn.</li>
                      <li>Tem bảo hành và tem niêm phong (nếu có) của Nhà sản xuất trên sản phẩm còn nguyên vẹn.</li>
                    </ul>

                    <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">2. Những trường hợp không được bảo hành</h3>
                    <ul className="list-disc pl-5 space-y-2 mb-6">
                      <li>Sản phẩm không thỏa mãn một trong những điều kiện bảo hành ở mục 1.</li>
                      <li>Số series, model sản phẩm không khớp với Phiếu bảo hành.</li>
                      <li>Sản phẩm bị hư hỏng do lỗi người sử dụng (rơi vỡ, móp méo, vào nước...).</li>
                    </ul>
                  </>
                ) : slug === "kiem-tra-bao-hanh" ? (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Tra cứu thông tin bảo hành</h3>
                    <p className="mb-6 text-gray-600">Vui lòng nhập số Serial (S/N) hoặc số điện thoại mua hàng để kiểm tra thời hạn bảo hành của thiết bị.</p>
                    <form className="flex flex-col md:flex-row gap-4">
                      <input type="text" placeholder="Nhập Serial hoặc SĐT..." className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors flex-shrink-0">
                        Kiểm tra ngay
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    <p className="mb-4">Chào mừng bạn đến với <strong>{currentPolicy.name}</strong> của CitiLap.</p>
                    <p className="mb-4">Nội dung chi tiết của chính sách này đang được cập nhật. CitiLap cam kết luôn mang đến những quyền lợi tốt nhất cho khách hàng. Vui lòng liên hệ Hotline <strong>0899.188.186</strong> để được giải đáp thắc mắc trực tiếp.</p>
                    
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mt-8 flex flex-col items-center text-center">
                      <ShieldCheck className="w-12 h-12 text-blue-600 mb-3" />
                      <h4 className="font-bold text-lg text-gray-900 mb-2">Yên tâm mua sắm tại CitiLap</h4>
                      <p className="text-sm text-gray-600 max-w-md">Chúng tôi cam kết 100% hàng chính hãng, bảo hành minh bạch và hỗ trợ đổi trả linh hoạt trong vòng 15 ngày đầu tiên.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
