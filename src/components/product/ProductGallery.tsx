"use client";

import { useState } from "react";

export default function ProductGallery({ images, productName, discount }: { images: string[]; productName: string; discount?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="w-full">
      <div className="border border-gray-200 rounded-lg p-4 mb-4 relative aspect-square flex items-center justify-center overflow-hidden bg-white group">
        <img
          src={images[activeIndex]}
          alt={productName}
          className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.12]"
        />
        {discount && (
          <div className="absolute top-4 left-4 bg-red-600 text-white font-bold px-3 py-1 rounded shadow-md text-sm">
            {discount}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`border rounded-lg overflow-hidden p-2 aspect-square flex items-center justify-center transition-all bg-white ${
              idx === activeIndex ? 'border-red-600 ring-1 ring-red-600 shadow-sm' : 'border-gray-200 hover:border-red-400'
            }`}
          >
            <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}
