"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Search as SearchIcon, RefreshCw } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumb from "@/components/layout/Breadcrumb";

type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  images: string;
  stock: number;
  status: string;
  specs: string | null;
  category?: { name: string; slug: string } | null;
};

function parseImages(images: string): string {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop";
  } catch {
    return images || "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop";
  }
}

function parseSpecs(specs: string | null): { cpu: string; ram: string; ssd: string; gpu: string; display: string } {
  const fallback = { cpu: "", ram: "", ssd: "", gpu: "", display: "" };
  if (!specs) return fallback;
  try {
    const parsed = JSON.parse(specs);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString("vi-VN") + "đ";
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/products?search=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setResults(data.data);
        else setResults([]);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <Breadcrumb items={[
        { label: "Trang chủ", href: "/" },
        { label: "Tìm kiếm", href: "/search" },
      ]} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-black text-gray-900 uppercase mb-4">Tìm kiếm sản phẩm</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập tên sản phẩm, CPU, GPU, thương hiệu..."
                aria-label="Tìm kiếm sản phẩm"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition shadow-md shadow-blue-600/30 shrink-0">
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Results */}
        {query ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {loading ? (
                  "Đang tìm kiếm..."
                ) : (
                  <>
                    Tìm thấy <span className="font-bold text-blue-600">{results.length}</span> sản phẩm cho &quot;<span className="font-bold">{query}</span>&quot;
                  </>
                )}
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Đang tìm kiếm sản phẩm...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {results.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      price: formatPrice(p.price),
                      oldPrice: p.originalPrice ? formatPrice(p.originalPrice) : null,
                      discount: p.originalPrice ? `-${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined,
                      image: parseImages(p.images),
                      specs: parseSpecs(p.specs),
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy sản phẩm</h2>
                <p className="text-gray-500 mb-6">Không có sản phẩm nào khớp với từ khoá &quot;{query}&quot;.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Legion", "MacBook", "ROG", "Dell XPS", "RTX 4060", "Predator"].map((sug) => (
                    <Link key={sug} href={`/search?q=${sug}`} className="px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-sm font-bold text-gray-700 rounded-full transition">
                      {sug}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Nhập từ khoá để tìm kiếm</h2>
            <p className="text-gray-500 mb-6">Tìm kiếm laptop, linh kiện, phụ kiện và nhiều hơn nữa.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Laptop Gaming", "MacBook", "RTX 4060", "Dell XPS", "Lenovo Legion", "Acer Predator"].map((sug) => (
                <button key={sug} onClick={() => router.push(`/search?q=${sug}`)} className="px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-sm font-bold text-gray-700 rounded-full transition">
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#f1f5f9] min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
