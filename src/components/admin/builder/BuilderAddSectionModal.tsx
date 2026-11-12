'use client';

import React from 'react';
import type { SectionType } from '@/contracts/cms/site-builder';
import { SECTION_TYPE_META } from './builder-defaults';

export interface BuilderAddSectionModalProps {
  open: boolean;
  onAddSection: (type: SectionType) => void;
}

export default function BuilderAddSectionModal({
  open,
  onAddSection,
}: BuilderAddSectionModalProps) {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 space-y-1 max-h-96 overflow-y-auto">
      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Chọn loại khối
      </div>
      {(Object.keys(SECTION_TYPE_META) as SectionType[]).map((type) => {
        const meta = SECTION_TYPE_META[type];
        const Icon = meta.icon;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAddSection(type)}
            className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-blue-50/70 text-left transition group cursor-pointer"
          >
            <span className="p-1.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                {meta.label}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {meta.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
