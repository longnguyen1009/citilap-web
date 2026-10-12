"use client";

import { useState } from "react";
import { MessageCircle, Phone, User, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState("gaming");
  const [website, setWebsite] = useState(""); // Honeypot field for bot protection

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại.");
      return;
    }

    setLoading(true);
    setError(null);

    const needMap: Record<string, string> = {
      gaming: "Tư vấn Laptop Gaming / Đồ họa",
      office: "Tư vấn Ultrabook / Văn phòng mỏng nhẹ",
      workstation: "Tư vấn Máy Trạm Workstation",
      likenew: "Tư vấn Laptop Like-New / Cũ tuyển chọn",
      accessory: "Tư vấn Phụ kiện & Nâng cấp",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: needMap[need] || "Yêu cầu tư vấn chọn laptop từ Trang chủ",
          website: website || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error || "Gửi yêu cầu không thành công. Quý khách vui lòng gọi hotline để được hỗ trợ ngay!");
        return;
      }

      setSuccess(true);
      setName("");
      setPhone("");
    } catch {
      setError("Không thể kết nối đến máy chủ. Quý khách vui lòng liên hệ hotline " + siteConfig.phone);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-16" aria-label="Tư vấn chọn máy">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-gradient-to-br from-[#0b1221] via-blue-950 to-[#0b1221] rounded-3xl shadow-2xl p-6 sm:p-10 md:p-12 text-white relative overflow-hidden border border-blue-900/60">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-[150px] opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-[150px] opacity-20 pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Hỗ trợ chuyên sâu 24/7
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-6 flex items-center gap-3.5 drop-shadow-md">
                <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-blue-400 shrink-0" />
                Tư Vấn Chọn Máy
              </h2>
              <p className="text-gray-300 mb-8 text-base md:text-lg leading-relaxed max-w-lg">
                Chưa biết chọn cấu hình nào phù hợp với công việc và ngân sách? Đội ngũ kỹ thuật viên CitiLap sẵn sàng tư vấn chi tiết, đối chiếu thông số và test máy trực tiếp cùng bạn!
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={siteConfig.telHref}
                  className="flex justify-center items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-full font-bold transition duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 text-base"
                >
                  <Phone className="w-5 h-5 shrink-0" /> {siteConfig.phone}
                </a>
                <a
                  href={siteConfig.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-center items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white px-7 py-3.5 rounded-full font-bold transition duration-300 hover:-translate-y-0.5 text-base"
                >
                  <MessageCircle className="w-5 h-5 text-blue-400 shrink-0" /> Chat Zalo Ngay
                </a>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
              <h3 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2.5 text-white">
                <User className="w-5 h-5 text-blue-400 shrink-0" /> Để lại số điện thoại, CitiLap gọi lại ngay
              </h3>
              <p className="text-xs text-blue-200/80 mb-5">
                Chuyên viên gọi lại sau 5 - 15 phút. Miễn phí tư vấn và báo giá chi tiết.
              </p>

              {success ? (
                <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-5 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Đã tiếp nhận yêu cầu thành công!</h4>
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    Đội ngũ CitiLap đã nhận được thông tin và sẽ liên hệ lại với bạn qua số điện thoại sớm nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="text-xs font-semibold text-emerald-300 hover:underline pt-2 block mx-auto"
                  >
                    Gửi thêm yêu cầu tư vấn khác →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Honeypot field */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="ct_website">Website</label>
                    <input
                      id="ct_website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="homeCustomerName" className="block text-xs font-medium text-gray-300 mb-1.5">
                      Họ và tên của bạn *
                    </label>
                    <input
                      type="text"
                      id="homeCustomerName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full bg-gray-900/70 border border-gray-600/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="homeCustomerPhone" className="block text-xs font-medium text-gray-300 mb-1.5">
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      id="homeCustomerPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ví dụ: 0988 123 456"
                      className="w-full bg-gray-900/70 border border-gray-600/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="homeCustomerNeed" className="block text-xs font-medium text-gray-300 mb-1.5">
                      Nhu cầu bạn đang tìm kiếm
                    </label>
                    <select
                      id="homeCustomerNeed"
                      value={need}
                      onChange={(e) => setNeed(e.target.value)}
                      className="w-full bg-gray-900/70 border border-gray-600/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                    >
                      <option value="gaming">Laptop Gaming / Đồ họa hiệu năng cao</option>
                      <option value="office">Ultrabook / Văn phòng pin trâu, mỏng nhẹ</option>
                      <option value="workstation">Máy Trạm Workstation chuyên nghiệp</option>
                      <option value="likenew">Laptop Like-New 99% tiết kiệm chi phí</option>
                      <option value="accessory">Nâng cấp RAM, SSD & Phụ kiện công nghệ</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition duration-300 uppercase text-sm tracking-wider mt-2 shadow-lg hover:shadow-blue-500/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang gửi yêu cầu...
                      </>
                    ) : (
                      "Nhận Tư Vấn Miễn Phí Ngay"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
