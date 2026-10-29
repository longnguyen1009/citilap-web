import { Truck, CheckCircle2 } from 'lucide-react';

const DEFAULT_SHIPPING_ITEMS = [
  'Miễn phí giao hàng bán kính 10km quanh cơ sở CitiLap Hà Nội',
  'Giao hàng toàn quốc – Đồng kiểm máy trước khi thanh toán (COD)',
  'Lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu lỗi kỹ thuật nhà sản xuất',
];

export default function ProductShippingCommitment({ items = [] }: { items?: string[] }) {
  const displayItems = items.length > 0 ? items : DEFAULT_SHIPPING_ITEMS;
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 space-y-3">
      <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase flex items-center gap-2 pb-2.5 border-b border-gray-100">
        <Truck className="w-4 h-4 text-blue-600" />
        Chính sách vận chuyển & cam kết
      </h3>
      <div className="space-y-2.5 text-xs sm:text-sm text-gray-700">
        {displayItems.map((text, index) => (
          <div key={index} className="flex items-start gap-2 leading-snug">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
