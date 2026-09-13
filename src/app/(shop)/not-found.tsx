import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-[#f1f5f9] min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
        <div className="text-6xl font-black text-blue-600 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy trang</h2>
        <p className="text-gray-500 mb-6">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Về trang chủ
          </Link>
          <Link
            href="/search"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg transition"
          >
            Tìm kiếm sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}
