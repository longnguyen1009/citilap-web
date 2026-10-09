import Link from "next/link";
import { Award } from "lucide-react";

export default function BrandSection() {
  const brands = [
    { name: "ASUS", href: "/category/laptop-gaming" },
    { name: "DELL", href: "/category/laptop-van-phong" },
    { name: "HP", href: "/category/laptop-do-hoa" },
    { name: "LENOVO", href: "/category/laptop-gaming" },
    { name: "ACER", href: "/category/laptop-gaming" },
    { name: "APPLE", href: "/category/macbook" },
    { name: "MSI", href: "/category/laptop-gaming" },
    { name: "SAMSUNG", href: "/category/laptop-van-phong" },
  ];

  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Award className="w-6 h-6" /> 
              </div>
              Khám Phá Theo Thương Hiệu
            </h2>
          </div>
          <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {brands.map(brand => (
              <Link 
                key={brand.name} 
                href={brand.href} 
                className="flex items-center justify-center h-20 md:h-24 bg-gray-50 border border-gray-100 rounded-xl text-lg md:text-xl font-black tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition duration-300 group"
              >
                <span className="group-hover:scale-110 transition duration-300">{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
