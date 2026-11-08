import Link from "next/link";
import { Home, Search, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-slate-50 min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs text-center max-w-md w-full">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8" />
        </div>
        <div className="text-xs font-extrabold uppercase tracking-widest text-blue-600 mb-1">Lỗi 404</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy trang</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Trang bạn đang tìm kiếm không tồn tại hoặc đường dẫn đã được thay đổi.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 px-5 rounded-xl transition"
          >
            <Search className="w-4 h-4" />
            <span>Tìm kiếm sản phẩm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
