"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

export default function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages = [...images];
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json();
        if (result.success && result.url) newImages.push(result.url);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    onChange(newImages);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  const removeImage = (index: number) => onChange(images.filter((_, i) => i !== index));

  const addUrl = () => onChange([...images, ""]);

  const updateUrl = (index: number, value: string) => onChange(images.map((x, i) => (i === index ? value : x)));

  return (
    <div className="space-y-3">
      {images.map((url, i) => (
        <div key={i} className="flex gap-2 items-start group">
          <div className="flex flex-col gap-0.5 pt-1">
            <button type="button" onClick={() => moveImage(i, i - 1)} disabled={i === 0} className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30">▲</button>
            <button type="button" onClick={() => moveImage(i, i + 1)} disabled={i === images.length - 1} className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30">▼</button>
          </div>
          <div className="w-14 h-14 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {url ? <img src={url} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
          </div>
          <input value={url} onChange={(e) => updateUrl(i, e.target.value)} className="input flex-1" placeholder="URL ảnh hoặc đường dẫn uploads" />
          <button type="button" onClick={() => removeImage(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={addUrl} className="text-sm text-blue-600 font-bold flex items-center gap-1"><Upload className="w-4 h-4" /> Thêm URL</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-sm text-emerald-600 font-bold flex items-center gap-1 disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Upload ảnh
        </button>
      </div>
      <p className="text-xs text-gray-400">Kéo thả thứ tự bằng nút ▲▼. Ảnh đầu tiên là ảnh chính.</p>
    </div>
  );
}
