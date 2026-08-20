"use client";

import { useState } from "react";

export default function ProductGallery({ images, productName, discount }: { images: string[], productName: string, discount: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="lg:col-span-5">
      <div className="border border-gray-200 rounded-lg p-4 mb-4 relative aspect-square flex items-center justify-center overflow-hidden group">
        <img 
          src={images[activeIndex]} 
          alt={productName} 
          className="w-full h-full object-contain group-hover:scale-105 transition duration-500" 
        />
        {discount && (
          <div className="absolute top-4 left-4 bg-red-600 text-white font-bold px-3 py-1 rounded shadow-md text-sm">
            {discount}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <div 
            key={idx} 
            onClick={() => setActiveIndex(idx)}
            className={`border rounded-lg overflow-hidden cursor-pointer p-2 aspect-square flex items-center justify-center transition-all ${
              idx === activeIndex ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200 hover:border-blue-400'
            }`}
          >
            <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
