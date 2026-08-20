import Link from "next/link";
import { Cpu, Monitor, Laptop } from "lucide-react";

export default function ProductCard({ product, badgeColor = "bg-red-600" }: { product: any, badgeColor?: string }) {
  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col bg-white border border-gray-100 hover:border-blue-500 rounded-md overflow-hidden transition-all duration-300 hover:shadow-lg relative">
      <div className={`absolute top-2 left-2 z-10 ${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm`}>
        {product.discount}
      </div>
      <div className="relative aspect-square p-4 flex items-center justify-center bg-white overflow-hidden">
        <img src={product.image} alt={product.name} className="object-contain group-hover:scale-105 transition duration-300 w-full h-full" />
      </div>
      <div className="p-3 flex-grow flex flex-col">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition">
          {product.name}
        </h3>
        
        <div className="bg-gray-50 rounded border border-gray-100 p-2 mb-3 mt-auto">
          <div className="grid grid-cols-2 gap-x-1 gap-y-2 text-[10px] text-gray-600">
            <span className="truncate flex items-center gap-1"><Cpu className="w-3 h-3 text-gray-400"/> {product.specs.cpu}</span>
            <span className="truncate flex items-center gap-1"><Monitor className="w-3 h-3 text-gray-400"/> {product.specs.ram}</span>
            <span className="truncate flex items-center gap-1"><Laptop className="w-3 h-3 text-gray-400"/> {product.specs.ssd}</span>
            <span className="truncate flex items-center gap-1"><Monitor className="w-3 h-3 text-gray-400"/> {product.specs.display}</span>
          </div>
        </div>

        <div className="flex flex-col mt-auto">
          <span className="text-red-600 font-bold text-lg leading-none mb-1">{product.price}</span>
          <span className="text-gray-400 text-xs line-through">{product.oldPrice}</span>
        </div>
      </div>
    </Link>
  );
}
