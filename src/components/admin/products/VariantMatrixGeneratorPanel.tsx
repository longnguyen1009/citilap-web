'use client';

import { Sparkles } from 'lucide-react';
import { AdminButton } from '@/components/admin/ui';

export function slugifySkuPart(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toUpperCase();
}

export function deduplicateSku(rawCandidate: string, takenSkus: Set<string>): string {
  const base =
    rawCandidate
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'SP-1';
  let sku = base;
  let suffix = 2;
  while (takenSkus.has(sku)) {
    sku = `${base}-${suffix}`;
    suffix++;
  }
  takenSkus.add(sku);
  return sku;
}

const formatNumberDots = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  if (n < 0) return '-' + new Intl.NumberFormat('vi-VN').format(Math.abs(n));
  return new Intl.NumberFormat('vi-VN').format(n);
};

const parseNumberDots = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return Math.min(2000000000, parseInt(digits, 10) || 0);
};

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export interface VariantMatrixGeneratorPanelProps {
  docPrice: number;
  matrixRAMs: string[];
  setMatrixRAMs: React.Dispatch<React.SetStateAction<string[]>>;
  matrixSSDs: string[];
  setMatrixSSDs: React.Dispatch<React.SetStateAction<string[]>>;
  matrixGPU: string;
  setMatrixGPU: (gpu: string) => void;
  matrixBasePrice: number;
  setMatrixBasePrice: (price: number) => void;
  matrixStepPrice: number;
  setMatrixStepPrice: (step: number) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export default function VariantMatrixGeneratorPanel({
  docPrice,
  matrixRAMs,
  setMatrixRAMs,
  matrixSSDs,
  setMatrixSSDs,
  matrixGPU,
  setMatrixGPU,
  matrixBasePrice,
  setMatrixBasePrice,
  matrixStepPrice,
  setMatrixStepPrice,
  onGenerate,
  onClose,
}: VariantMatrixGeneratorPanelProps) {
  const effectiveBase = matrixBasePrice > 0 ? matrixBasePrice : docPrice;

  return (
    <div className="matrix-generator-panel mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <strong className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Sinh nhanh (RAM × SSD)
        </strong>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
          <span className="text-[11px] font-bold text-blue-900 block mb-1.5">RAM</span>
          <div className="flex flex-wrap gap-1.5">
            {['8GB DDR5', '16GB DDR5', '32GB DDR5', '64GB DDR5'].map(r => (
              <label key={r} className="generator-chip-label">
                <input
                  type="checkbox"
                  checked={matrixRAMs.includes(r)}
                  onChange={e => {
                    setMatrixRAMs(prev => (e.target.checked ? [...prev, r] : prev.filter(x => x !== r)));
                  }}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
          <span className="text-[11px] font-bold text-blue-900 block mb-1.5">SSD</span>
          <div className="flex flex-wrap gap-1.5">
            {['512GB NVMe', '1TB NVMe', '2TB NVMe'].map(s => (
              <label key={s} className="generator-chip-label">
                <input
                  type="checkbox"
                  checked={matrixSSDs.includes(s)}
                  onChange={e => {
                    setMatrixSSDs(prev => (e.target.checked ? [...prev, s] : prev.filter(x => x !== s)));
                  }}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-2">
          <div>
            <span className="text-[11px] font-bold text-blue-900 block mb-0.5">GPU & Giá</span>
            <input
              type="text"
              value={matrixGPU}
              onChange={e => setMatrixGPU(e.target.value)}
              placeholder="GPU mặc định (VD: RTX 4060 8GB)"
              className="w-full text-xs border border-slate-300 rounded px-2 py-1 mb-1.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block">Giá từ (0 = theo giá SP)</label>
              <input
                type="text"
                inputMode="numeric"
                value={matrixBasePrice > 0 ? formatNumberDots(matrixBasePrice) : ''}
                placeholder={formatNumberDots(docPrice || 25000000)}
                onChange={e => setMatrixBasePrice(parseNumberDots(e.target.value) ?? 0)}
                className="w-full text-xs font-bold text-blue-700 border border-slate-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block">Bước giá (+)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberDots(matrixStepPrice)}
                onChange={e => setMatrixStepPrice(parseNumberDots(e.target.value) ?? 0)}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="font-semibold text-slate-700">Tăng theo bậc: </span>
            {money(effectiveBase)} → {money(effectiveBase + matrixStepPrice)} → {money(effectiveBase + matrixStepPrice * 2)}...
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <AdminButton variant="secondary" size="sm" onClick={onClose}>
          Hủy
        </AdminButton>
        <AdminButton
          variant="primary"
          size="sm"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          onClick={onGenerate}
        >
          Tạo {Math.max(1, matrixRAMs.length) * Math.max(1, matrixSSDs.length)} dòng
        </AdminButton>
      </div>
    </div>
  );
}
