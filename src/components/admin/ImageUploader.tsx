"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Star, AlertCircle } from "lucide-react";
import Image from "next/image";
import MediaBrowser, { mediaRequest } from './media/MediaBrowser';
import MediaDialog from './media/MediaDialog';

export interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId?: string;
}

export default function ImageUploader({
  images,
  onChange,
  productId,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMessage(null);

    const newImages = [...images];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/media", { method: "POST", body: formData });
        const result = await res.json();

        if (result.success && result.data?.asset?.url) {
          newImages.push(result.data.asset.url);
        } else {
          const reason = result.failed?.[0]?.reason || result.error || "Tải lên thất bại";
          errors.push(`${file.name}: ${reason}`);
        }
      } catch (err) {
        console.error("Upload failed:", err);
        errors.push(`${file.name}: Lỗi kết nối mạng`);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(" | "));
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

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const addUrl = () => onChange([...images, ""]);

  const updateUrl = (index: number, value: string) =>
    onChange(images.map((x, i) => (i === index ? value : x)));

  const makePrimary = (index: number) => {
    if (index === 0) return;
    moveImage(index, 0);
  };

  return (
    <div className="space-y-3">
      <button type="button" disabled={uploading} className="media-button" onClick={() => setLibraryOpen(true)}>Chọn ảnh từ thư viện</button>
      {libraryOpen && <MediaDialog title="Chọn ảnh từ thư viện" onClose={() => { if (!uploading) setLibraryOpen(false); }}>
        {errorMessage && <p role="alert" className="media-error">{errorMessage}</p>}
        <MediaBrowser picker onSelect={async (asset) => {
          if (uploading || !asset.url) return;
          setUploading(true); setErrorMessage(null);
          try {
            if (productId) await mediaRequest(`/api/admin/media/${asset.id}/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
            onChange(Array.from(new Set([...images, asset.url]))); setLibraryOpen(false);
          } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Không thể chọn ảnh.'); }
          finally { setUploading(false); }
        }} />
      </MediaDialog>}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 font-bold"
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}

      {images.map((url, i) => {
        const isPrimary = i === 0;
        return (
          <div
            key={i}
            className={`flex gap-2 items-start p-2 rounded-lg border transition ${
              isPrimary ? "bg-amber-50/40 border-amber-300" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-0.5 pt-1">
              <button
                type="button"
                onClick={() => moveImage(i, i - 1)}
                disabled={i === 0 || uploading}
                aria-label="Di chuyển lên trên"
                className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveImage(i, i + 1)}
                disabled={i === images.length - 1 || uploading}
                aria-label="Di chuyển xuống dưới"
                className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30"
              >
                ▼
              </button>
            </div>

            {/* Thumbnail */}
            <div className="relative w-14 h-14 rounded border border-gray-200 bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center">
              {url ? (
                <div className="relative w-full h-full">
                  <Image
                    src={url}
                    alt={`Ảnh sản phẩm ${i + 1}`}
                    fill
                    sizes="56px"
                    className="object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-300" />
              )}
              {isPrimary && (
                <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-white text-[9px] font-bold text-center py-0.2">
                  Chính
                </span>
              )}
            </div>

            {/* URL input */}
            <div className="flex-1 flex flex-col gap-1">
              <input
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                disabled={uploading}
                className="input text-xs font-mono"
                placeholder="R2 Key (products/...) hoặc URL ảnh"
                aria-label={`Đường dẫn ảnh ${i + 1}`}
              />
              {!isPrimary && (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold self-start flex items-center gap-1"
                >
                  <Star className="w-3 h-3" /> Đặt làm ảnh chính
                </button>
              )}
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeImage(i)}
              disabled={uploading}
              aria-label={`Xóa ảnh ${i + 1}`}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0 mt-0.5 disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addUrl}
          disabled={uploading}
          className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> Thêm URL/Key
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên Cloudflare R2...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" /> Tải ảnh lên R2 (JPG, PNG, WebP)
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Ảnh đầu tiên là ảnh đại diện chính. Lưu trữ trên Cloudflare R2 với độ nén tối ưu.
      </p>
    </div>
  );
}
