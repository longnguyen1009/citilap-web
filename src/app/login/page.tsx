"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Monitor, ShieldCheck, ClipboardCheck, Heart, Store } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "Đăng nhập thất bại.");
        return;
      }
      if (result.role === "ADMIN" || result.role === "OWNER" || result.role === "EDITOR" || result.role === "SALES") {
        router.push(result.redirect || "/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {/* Left side - CitiLap Branding & Customer Self-Service Guide */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden flex-col items-center justify-center">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500 rounded-full filter blur-[120px] opacity-25 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600 rounded-full filter blur-[100px] opacity-30 translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 max-w-lg px-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <Monitor className="w-12 h-12 text-blue-400" />
            <div className="flex flex-col text-left text-white">
              <span className="text-3xl font-black leading-none tracking-wider">CITILAP.VN</span>
              <span className="text-[11px] tracking-[0.2em] font-semibold uppercase mt-1 text-blue-300">
                Laptop &amp; Công nghệ tuyển chọn
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-black text-white mb-3 leading-snug">
            Hệ thống vận hành &amp; Tiện ích khách hàng CitiLap
          </h2>
          <p className="text-slate-300 text-sm mb-8 leading-relaxed">
            Khách mua lẻ tại CitiLap có thể đặt hàng, tra cứu tiến độ đơn, xem hồ sơ kiểm định kỹ thuật và bảo hành mà không cần tạo tài khoản.
          </p>

          {/* Customer Self-Service Quick Cards */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 space-y-3 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Dành cho khách mua hàng (Không cần đăng nhập)
            </div>
            <Link
              href="/order-tracking"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <ClipboardCheck className="w-4 h-4 text-blue-300" />
                Tra cứu đơn hàng &amp; Hồ sơ kiểm định máy
              </span>
              <ArrowRight className="w-4 h-4 text-blue-300" />
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <Heart className="w-4 h-4 text-rose-300" />
                Danh sách sản phẩm yêu thích đã lưu
              </span>
              <ArrowRight className="w-4 h-4 text-blue-300" />
            </Link>
            <Link
              href="/he-thong-cua-hang"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <Store className="w-4 h-4 text-emerald-300" />
                Showroom Hà Nội &amp; Bắc Ninh (Lỗi 1 đổi 1 trong 7 ngày đầu tiên)
              </span>
              <ArrowRight className="w-4 h-4 text-blue-300" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Staff / Admin Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <Link
          href="/"
          className="absolute top-8 right-8 text-sm font-medium text-gray-500 hover:text-blue-600 transition flex items-center gap-1"
        >
          Trở về trang chủ <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cổng Quản Trị &amp; Nhân Viên
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Đăng nhập hệ thống
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Dành cho quản trị viên, biên tập viên nội dung và chuyên viên kinh doanh CitiLap.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Email công việc</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="admin@citilap.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-base mt-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Đang xác thực..." : "Đăng nhập quản trị"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 rounded-2xl bg-slate-50 p-4 border">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Bạn là khách mua hàng cần hỗ trợ?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              CitiLap hỗ trợ mua sắm và bảo hành nhanh không cần mật khẩu. Bạn có thể mở trung tâm tiện ích khách hàng hoặc tra cứu trực tiếp:
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/order-tracking"
                className="text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                Tra cứu đơn &amp; Kiểm định
              </Link>
              <Link
                href="/profile"
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
              >
                Trung tâm hỗ trợ khách hàng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
