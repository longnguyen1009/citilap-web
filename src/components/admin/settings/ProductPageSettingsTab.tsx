"use client";

import React from "react";
import { Gift, ShoppingBag, Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_GIFT_BUNDLES,
  DEFAULT_ACCESSORY_BUNDLES,
} from "@/contracts/cms/settings";
import { inputCls, labelCls, type SettingsTabProps } from "./settings-helpers";

interface ProductPageSettingsTabProps extends SettingsTabProps {
  catalogProducts: Array<{ id: string; name: string; sku: string; price: number }>;
  bundleProductSearch: Record<string, string>;
  setBundleProductSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function ProductPageSettingsTab({
  settings,
  update,
  catalogProducts,
  bundleProductSearch,
  setBundleProductSearch,
}: ProductPageSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* CÁC GÓI QUÀ TẶNG MẶC ĐỊNH */}
      <section className="space-y-3 bg-rose-50/40 p-4 rounded-xl border border-rose-200/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-rose-600" />
              Các gói Quà tặng mặc định (Chọn nhanh khi sửa sản phẩm)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Thiết lập sẵn các gói quà theo dòng máy (VD: Laptop Văn phòng, Laptop Gaming, MacBook...). Khi sửa sản phẩm, Admin chỉ cần bấm 1 nút để áp dụng gói quà tương ứng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update("giftBundles", DEFAULT_GIFT_BUNDLES)}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
            >
              Khôi phục mẫu mặc định
            </button>
            <button
              type="button"
              disabled={(settings.giftBundles || []).length >= 12}
              onClick={() =>
                update("giftBundles", [
                  ...(settings.giftBundles || []),
                  {
                    id: `gift-${Date.now()}`,
                    name: `Gói quà tặng mới #${(settings.giftBundles || []).length + 1}`,
                    gifts: ["Balo chống sốc CitiLap cao cấp", "Chuột không dây chính hãng"],
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm gói quà
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(settings.giftBundles || []).map((bundle, bIdx) => {
            const patchBundle = (patch: Partial<typeof bundle>) => {
              update(
                "giftBundles",
                (settings.giftBundles || []).map((item, i) =>
                  i === bIdx ? { ...item, ...patch } : item
                )
              );
            };
            return (
              <div
                key={bundle.id || bIdx}
                className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Gói #{bIdx + 1} ({bundle.gifts.length} món)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "giftBundles",
                          (settings.giftBundles || []).filter((_, i) => i !== bIdx)
                        )
                      }
                      className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa gói
                    </button>
                  </div>

                  <div>
                    <label className={labelCls}>Tên gói quà tặng</label>
                    <input
                      type="text"
                      value={bundle.name}
                      onChange={(e) => patchBundle({ name: e.target.value })}
                      placeholder="VD: Gói quà Laptop Văn phòng"
                      className={`${inputCls} font-semibold`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">Danh sách món quà</label>
                      <button
                        type="button"
                        disabled={bundle.gifts.length >= 10}
                        onClick={() => patchBundle({ gifts: [...bundle.gifts, ""] })}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Thêm món
                      </button>
                    </div>
                    {bundle.gifts.map((giftItem, gIdx) => (
                      <div key={gIdx} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={giftItem}
                          onChange={(e) => {
                            const nextItems = [...bundle.gifts];
                            nextItems[gIdx] = e.target.value;
                            patchBundle({ gifts: nextItems });
                          }}
                          placeholder={`Quà tặng #${gIdx + 1}...`}
                          className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            patchBundle({
                              gifts: bundle.gifts.filter((_, i) => i !== gIdx),
                            })
                          }
                          className="text-slate-400 hover:text-rose-600 px-1 cursor-pointer"
                          title="Xóa món quà"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CÁC GÓI MUA KÈM / PHỤ KIỆN MẶC ĐỊNH */}
      <section className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-200/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              Các gói Mua kèm / Phụ kiện mặc định
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tạo sẵn các nhóm sản phẩm phụ kiện mua kèm (Chuột, Phím, Hub, Màn hình...) để chọn nhanh 1 chạm khi biên tập sản phẩm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update("accessoryBundles", DEFAULT_ACCESSORY_BUNDLES)}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
            >
              Khôi phục mẫu mặc định
            </button>
            <button
              type="button"
              disabled={(settings.accessoryBundles || []).length >= 12}
              onClick={() =>
                update("accessoryBundles", [
                  ...(settings.accessoryBundles || []),
                  {
                    id: `acc-${Date.now()}`,
                    name: `Gói phụ kiện mua kèm #${(settings.accessoryBundles || []).length + 1}`,
                    productIds: [],
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm gói mua kèm
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(settings.accessoryBundles || []).map((bundle, bIdx) => {
            const patchBundle = (patch: Partial<typeof bundle>) => {
              update(
                "accessoryBundles",
                (settings.accessoryBundles || []).map((item, i) =>
                  i === bIdx ? { ...item, ...patch } : item
                )
              );
            };
            const q = (bundleProductSearch[bundle.id] || "").trim().toLowerCase();
            const candidates = catalogProducts
              .filter((p) => !bundle.productIds.includes(p.id))
              .filter(
                (p) =>
                  !q ||
                  p.name.toLowerCase().includes(q) ||
                  (p.sku || "").toLowerCase().includes(q)
              )
              .slice(0, 6);

            return (
              <div
                key={bundle.id || bIdx}
                className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Gói #{bIdx + 1} ({bundle.productIds.length}/8 SP)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "accessoryBundles",
                          (settings.accessoryBundles || []).filter((_, i) => i !== bIdx)
                        )
                      }
                      className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa gói
                    </button>
                  </div>

                  <div>
                    <label className={labelCls}>Tên gói mua kèm</label>
                    <input
                      type="text"
                      value={bundle.name}
                      onChange={(e) => patchBundle({ name: e.target.value })}
                      placeholder="VD: Gói Phụ kiện Gaming"
                      className={`${inputCls} font-semibold`}
                    />
                  </div>

                  {/* Selected products in this bundle */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Sản phẩm trong gói ({bundle.productIds.length})
                    </label>
                    {bundle.productIds.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        Chưa chọn sản phẩm nào. Tìm &amp; bấm thêm bên dưới.
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {bundle.productIds.map((pid) => {
                          const prod = catalogProducts.find((item) => item.id === pid);
                          return (
                            <div
                              key={pid}
                              className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px]"
                            >
                              <span className="truncate font-medium text-slate-700">
                                {prod ? prod.name : pid}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  patchBundle({
                                    productIds: bundle.productIds.filter((id) => id !== pid),
                                  })
                                }
                                className="text-rose-500 hover:text-rose-700 font-bold shrink-0 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick product search to add to bundle */}
                  {bundle.productIds.length < 8 && (
                    <div className="pt-1 border-t border-slate-100 space-y-1">
                      <input
                        type="text"
                        value={bundleProductSearch[bundle.id] || ""}
                        onChange={(e) =>
                          setBundleProductSearch((prev) => ({
                            ...prev,
                            [bundle.id]: e.target.value,
                          }))
                        }
                        placeholder="Tìm sản phẩm thêm vào gói..."
                        className="w-full border border-slate-200 rounded px-2 py-1 text-[11px]"
                      />
                      <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded bg-slate-50/50">
                        {candidates.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-1.5 px-2 py-1 text-[11px]"
                          >
                            <span className="truncate text-slate-700" title={c.name}>
                              {c.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                patchBundle({ productIds: [...bundle.productIds, c.id] })
                              }
                              className="text-blue-600 hover:underline font-semibold shrink-0 cursor-pointer"
                            >
                              + Thêm
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(["productTrustItems", "productShippingItems"] as const).map((key) => (
          <section
            key={key}
            className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800">
                {key === "productTrustItems"
                  ? "Đặc quyền an tâm"
                  : "Chính sách vận chuyển & cam kết"}
              </h2>
              <button
                type="button"
                disabled={(settings[key] || []).length >= 8}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
                onClick={() => update(key, [...(settings[key] || []), ""])}
              >
                + Thêm dòng
              </button>
            </div>
            {(settings[key] || []).map((value, index) => (
              <div key={index} className="flex gap-1.5 items-center">
                <input
                  aria-label={
                    (key === "productTrustItems" ? "Đặc quyền " : "Cam kết ") + (index + 1)
                  }
                  value={value}
                  maxLength={key === "productTrustItems" ? 300 : 500}
                  onChange={(e) =>
                    update(
                      key,
                      settings[key].map((item, i) => (i === index ? e.target.value : item))
                    )
                  }
                  className={inputCls}
                />
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
                  onClick={() =>
                    update(
                      key,
                      settings[key].filter((_, i) => i !== index)
                    )
                  }
                >
                  Xóa
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>

      <section className="space-y-2.5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            Banner ưu đãi cạnh thông số (tối đa 2)
          </h3>
          <button
            type="button"
            disabled={(settings.productBanners || []).length >= 2}
            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer"
            onClick={() =>
              update("productBanners", [
                ...(settings.productBanners || []),
                { title: "", description: "", href: "/lien-he" },
              ])
            }
          >
            + Thêm banner
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(settings.productBanners || []).map((banner, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50"
            >
              {(["title", "description", "href"] as const).map((field) => (
                <label key={field} className="block text-[11px] font-semibold text-slate-600">
                  {field === "title"
                    ? "Tiêu đề"
                    : field === "description"
                    ? "Nội dung"
                    : "Liên kết"}
                  <input
                    value={banner[field]}
                    maxLength={
                      field === "title" ? 120 : field === "description" ? 500 : 1000
                    }
                    onChange={(e) =>
                      update(
                        "productBanners",
                        settings.productBanners.map((item, i) =>
                          i === index ? { ...item, [field]: e.target.value } : item
                        )
                      )
                    }
                    className={`mt-1 font-normal ${inputCls}`}
                  />
                </label>
              ))}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                  onClick={() =>
                    update(
                      "productBanners",
                      settings.productBanners.filter((_, i) => i !== index)
                    )
                  }
                >
                  Xóa banner
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
