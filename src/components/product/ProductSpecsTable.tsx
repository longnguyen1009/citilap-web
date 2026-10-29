"use client";

import { useState } from "react";
import { Cpu, HardDrive, Monitor, BatteryCharging, Shield, ChevronDown, ChevronUp } from "lucide-react";
import type { ProductDetailSpecGroup } from "@/server/services/catalog.service";

interface ProductSpecsTableProps {
  fullSpecs: ProductDetailSpecGroup[];
  productName: string;
}

function getGroupIcon(groupName: string) {
  if (groupName.includes("CPU") || groupName.includes("xử lý")) {
    return <Cpu className="w-5 h-5 text-blue-600 shrink-0" />;
  }
  if (groupName.includes("Bộ nhớ") || groupName.includes("Lưu trữ") || groupName.includes("RAM") || groupName.includes("Ổ cứng")) {
    return <HardDrive className="w-5 h-5 text-indigo-600 shrink-0" />;
  }
  if (groupName.includes("Đồ họa") || groupName.includes("Màn hình") || groupName.includes("GPU")) {
    return <Monitor className="w-5 h-5 text-purple-600 shrink-0" />;
  }
  if (groupName.includes("Pin") || groupName.includes("Thiết kế") || groupName.includes("Trọng lượng")) {
    return <BatteryCharging className="w-5 h-5 text-emerald-600 shrink-0" />;
  }
  return <Shield className="w-5 h-5 text-amber-600 shrink-0" />;
}

export default function ProductSpecsTable({
  fullSpecs,
  productName,
}: ProductSpecsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!fullSpecs || fullSpecs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
        Thông số kỹ thuật đang được cập nhật cho {productName}.
      </div>
    );
  }

  // Display first 3 groups if collapsed, all if expanded
  const visibleGroups = isExpanded ? fullSpecs : fullSpecs.slice(0, 3);
  const hasMore = fullSpecs.length > 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
          Bảng thông số kỹ thuật chi tiết
        </h2>
        <span className="text-xs text-gray-500 font-medium hidden sm:inline">
          Dữ liệu chuẩn hóa từ nhà sản xuất
        </span>
      </div>

      {/* Specification Groups */}
      <div className="divide-y divide-gray-100">
        {visibleGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-3.5">
              {getGroupIcon(group.group)}
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {group.group}
              </h3>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {group.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className={`flex flex-col sm:flex-row sm:items-baseline justify-between py-2 px-3 rounded-lg ${
                    itemIdx % 2 === 0 ? "bg-gray-50/60" : "bg-white"
                  }`}
                >
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 sm:w-2/5 shrink-0">
                    {item.label}:
                  </dt>
                  <dd data-spec-key={item.label} className="text-xs sm:text-sm font-bold text-gray-900 sm:w-3/5 break-words">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Expand / Collapse Button */}
      {hasMore && (
        <div className="p-4 bg-gray-50/60 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition"
          >
            {isExpanded ? (
              <>
                Thu gọn thông số <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Xem toàn bộ thông số kỹ thuật ({fullSpecs.length} danh mục) <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
