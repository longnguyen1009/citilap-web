import Link from "next/link";
import { Cpu, Monitor, Laptop } from "lucide-react";

export default function ProductCard({ product, badgeColor = "bg-red-600" }: { product: any, badgeColor?: string }) {
  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col bg-white border border-gray-100 hover:border-blue-300 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative">
      <div className={`absolute top-3 left-3 z-10 ${badgeColor} text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm`}>
        {product.discount}
      </div>
      
      <div className="relative aspect-square p-5 flex items-center justify-center bg-white overflow-hidden">
        <img src={product.image} alt={product.name} className="object-contain group-hover:scale-110 transition duration-500 w-full h-full" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col z-20 bg-white border-t border-gray-50 group-hover:border-blue-50 transition-colors">
        <h3 className="text-[13px] md:text-sm font-semibold text-gray-800 line-clamp-2 mb-3 group-hover:text-blue-600 transition min-h-[40px]">
          {product.name}
        </h3>
        
        <div className="bg-[#f8fafc] rounded-lg border border-gray-100 p-3 mb-4 mt-auto group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] text-gray-600">
            <span className="truncate flex items-center gap-1.5"><Cpu className="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"/> {product.specs.cpu}</span>
            <span className="truncate flex items-center gap-1.5"><Monitor className="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"/> {product.specs.ram}</span>
            <span className="truncate flex items-center gap-1.5"><Laptop className="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"/> {product.specs.ssd}</span>
            <span className="truncate flex items-center gap-1.5"><Monitor className="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"/> {product.specs.display}</span>
          </div>
        </div>

        <div className="flex flex-col mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-red-600 font-extrabold text-base md:text-[17px] leading-none">{product.price}</span>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Sẵn hàng</span>
          </div>
          <span className="text-gray-400 text-xs line-through decoration-gray-300">{product.oldPrice}</span>
        </div>
      </div>
    </Link>
  );
}
