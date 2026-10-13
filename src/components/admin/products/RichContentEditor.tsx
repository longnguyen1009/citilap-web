'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Eye,
  Minus,
  RemoveFormatting,
} from 'lucide-react';

interface RichContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  onInsertMediaClick: () => void;
}

export default function RichContentEditor({
  value,
  onChange,
  onInsertMediaClick,
}: RichContentEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef<boolean>(false);

  // Sync incoming value to contentEditable div only when changed externally
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      if (!isInternalChange.current) {
        editorRef.current.innerHTML = value || '';
      }
      isInternalChange.current = false;
    }
  }, [value, mode]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    if (mode !== 'visual' || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleFormatBlock = (tag: string) => {
    exec('formatBlock', tag);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url && url !== 'https://') {
      exec('createLink', url);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="w-full text-xs border-collapse border border-slate-300 my-4">
        <thead>
          <tr class="bg-slate-100 font-semibold">
            <th class="border border-slate-300 p-2 text-left">Đặc điểm / Tính năng</th>
            <th class="border border-slate-300 p-2 text-left">Thông số chi tiết</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 p-2">Thiết kế</td>
            <td class="border border-slate-300 p-2">Khung nhôm nguyên khối cao cấp</td>
          </tr>
          <tr>
            <td class="border border-slate-300 p-2">Khả năng nâng cấp</td>
            <td class="border border-slate-300 p-2">Hỗ trợ 2 khe RAM DDR5 & 2 khe M.2 NVMe</td>
          </tr>
        </tbody>
      </table><p><br></p>
    `;
    exec('insertHTML', tableHtml);
  };

  const handleInsertHr = () => {
    exec('insertHorizontalRule');
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
      {/* Editor Header Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2">
        {mode === 'visual' ? (
          <div className="flex flex-wrap items-center gap-1">
            {/* Format Block (Paragraph, Heading 2, 3, 4) */}
            <select
              aria-label="Định dạng đoạn văn"
              onChange={e => {
                if (e.target.value) {
                  handleFormatBlock(e.target.value);
                  e.target.value = '';
                }
              }}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 cursor-pointer focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                Kiểu khối...
              </option>
              <option value="<p>">Đoạn văn (P)</option>
              <option value="<h2>">Tiêu đề lớn (H2)</option>
              <option value="<h3>">Tiêu đề vừa (H3)</option>
              <option value="<h4>">Tiêu đề nhỏ (H4)</option>
              <option value="<blockquote>">Trích dẫn</option>
            </select>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Inline Formatting */}
            <button
              type="button"
              onClick={() => exec('bold')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="In đậm (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('italic')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="In nghiêng (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('underline')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Gạch chân (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('strikeThrough')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Gạch ngang"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => exec('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Danh sách dấu chấm"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('insertOrderedList')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Danh sách số"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormatBlock('<blockquote>')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Khối trích dẫn"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Insert Link & Media */}
            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Chèn liên kết"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onInsertMediaClick}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium cursor-pointer transition border border-blue-200"
              title="Chèn ảnh từ Thư viện Media Cloudflare R2"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Chèn ảnh từ Media</span>
            </button>

            <button
              type="button"
              onClick={handleInsertTable}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Chèn bảng so sánh"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleInsertHr}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Đường phân cách ngang"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => exec('removeFormat')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Xóa định dạng"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono py-1 px-2">
            Đang biên tập chế độ mã HTML thô (Raw Code)
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
              mode === 'visual'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Trực quan</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
              mode === 'code'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Mã HTML</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          className="min-h-[350px] max-h-[600px] overflow-y-auto p-4 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500/20 prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-slate-800 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_hr]:my-4 [&_hr]:border-slate-200"
        />
      ) : (
        <textarea
          rows={16}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="<h2>Đánh giá chi tiết...</h2><p>Mô tả sản phẩm...</p>"
          className="w-full text-xs font-mono p-4 border-0 focus:outline-none focus:ring-0 leading-relaxed text-slate-800 bg-slate-50/50 resize-y"
        />
      )}
    </div>
  );
}
