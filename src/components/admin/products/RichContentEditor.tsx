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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Sparkles,
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
  const [mode, setMode] = useState<'visual' | 'code' | 'split'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef<boolean>(false);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgCaption, setImgCaption] = useState<string>('');
  const [imgAlt, setImgAlt] = useState<string>('');
  const [imgWidth, setImgWidth] = useState<string>('100%');

  // Sync incoming value to contentEditable div only when changed externally
  useEffect(() => {
    if ((mode === 'visual' || mode === 'split') && editorRef.current) {
      if (!isInternalChange.current && editorRef.current.innerHTML !== (value || '')) {
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

  const exec = (command: string, cmdVal: string | undefined = undefined) => {
    if (mode === 'code' || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, cmdVal);
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

  const handleFormatHtmlCode = () => {
    if (!value) return;
    const formatted = value
      .replace(/>\s*</g, '>\n<')
      .replace(/(<\/(?:p|h2|h3|h4|figure|table|ul|ol|blockquote|div)>)/gi, '$1\n');
    onChange(formatted.trim());
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setSelectedImg(img);
      setImgAlt(img.getAttribute('alt') || '');
      const fig = img.closest('figure');
      const cap = fig?.querySelector('figcaption');
      setImgCaption(cap?.textContent || '');
      const currentW = fig?.style.width || img.style.width || img.getAttribute('width') || '100%';
      setImgWidth(currentW);
    } else {
      setSelectedImg(null);
    }
  };

  const applyImageSize = (sizeStr: string) => {
    if (!selectedImg || !editorRef.current) return;
    setImgWidth(sizeStr);
    const fig = selectedImg.closest('figure') as HTMLElement | null;
    if (fig) {
      fig.style.width = sizeStr;
      fig.style.maxWidth = '100%';
      selectedImg.style.width = '100%';
      selectedImg.style.height = 'auto';
    } else {
      selectedImg.style.width = sizeStr;
      selectedImg.style.maxWidth = '100%';
      selectedImg.style.height = 'auto';
    }
    handleInput();
  };

  const applyImageAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg || !editorRef.current) return;
    const targetEl = (selectedImg.closest('figure') as HTMLElement | null) || selectedImg;
    targetEl.style.display = 'block';
    if (align === 'center') {
      targetEl.style.marginLeft = 'auto';
      targetEl.style.marginRight = 'auto';
      targetEl.style.textAlign = 'center';
    } else if (align === 'left') {
      targetEl.style.marginLeft = '0';
      targetEl.style.marginRight = 'auto';
      targetEl.style.textAlign = 'left';
    } else {
      targetEl.style.marginLeft = 'auto';
      targetEl.style.marginRight = '0';
      targetEl.style.textAlign = 'right';
    }
    handleInput();
  };

  const handleUpdateImgMeta = (newAlt: string, newCap: string) => {
    if (!selectedImg) return;
    setImgAlt(newAlt);
    setImgCaption(newCap);
    selectedImg.setAttribute('alt', newAlt);
    let fig = selectedImg.closest('figure');
    if (!fig && newCap.trim()) {
      fig = document.createElement('figure');
      fig.style.width = imgWidth;
      fig.style.marginLeft = 'auto';
      fig.style.marginRight = 'auto';
      fig.style.textAlign = 'center';
      selectedImg.parentNode?.insertBefore(fig, selectedImg);
      fig.appendChild(selectedImg);
    }
    if (fig) {
      let cap = fig.querySelector('figcaption');
      if (newCap.trim()) {
        if (!cap) {
          cap = document.createElement('figcaption');
          fig.appendChild(cap);
        }
        cap.textContent = newCap;
      } else if (cap) {
        cap.remove();
      }
    }
    handleInput();
  };

  const handleRemoveSelectedImage = () => {
    if (!selectedImg) return;
    const fig = selectedImg.closest('figure');
    if (fig) fig.remove();
    else selectedImg.remove();
    setSelectedImg(null);
    handleInput();
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
      {/* Editor Header Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2">
        {mode !== 'code' ? (
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

            {/* Alignment */}
            <button
              type="button"
              onClick={() => exec('justifyLeft')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Căn trái"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('justifyCenter')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Căn giữa"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec('justifyRight')}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Căn phải"
            >
              <AlignRight className="w-3.5 h-3.5" />
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono py-1 px-2">
              Đang biên tập chế độ mã HTML (Raw Code)
            </span>
            <button
              type="button"
              onClick={handleFormatHtmlCode}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-blue-600" /> Làm đẹp dòng HTML
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedImg(null);
              setMode('visual');
            }}
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
            onClick={() => {
              setSelectedImg(null);
              setMode('split');
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
              mode === 'split'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Song song</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedImg(null);
              setMode('code');
            }}
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

      {/* Contextual Image Inspector Bar when an image is clicked */}
      {selectedImg && mode !== 'code' && (
        <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Tùy chỉnh ảnh đang chọn:
            </span>
            <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5">
              {(['25%', '50%', '75%', '100%', '400px', '600px'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => applyImageSize(sz)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                    imgWidth === sz
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => applyImageAlign('left')}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 hover:bg-blue-50 cursor-pointer"
                title="Căn trái ảnh"
              >
                Trái
              </button>
              <button
                type="button"
                onClick={() => applyImageAlign('center')}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 hover:bg-blue-50 cursor-pointer"
                title="Căn giữa ảnh"
              >
                Giữa
              </button>
              <button
                type="button"
                onClick={() => applyImageAlign('right')}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 hover:bg-blue-50 cursor-pointer"
                title="Căn phải ảnh"
              >
                Phải
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              value={imgCaption}
              onChange={e => handleUpdateImgMeta(imgAlt, e.target.value)}
              placeholder="Chú thích dưới ảnh (figcaption)..."
              className="flex-1 bg-white border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleRemoveSelectedImage}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold cursor-pointer"
              title="Xóa ảnh này khỏi bài viết"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
            </button>
            <button
              type="button"
              onClick={() => setSelectedImg(null)}
              className="text-slate-500 hover:text-slate-800 px-1.5 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Editor Body */}
      {mode === 'visual' && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onClick={handleEditorClick}
          onInput={handleInput}
          onBlur={handleInput}
          className="min-h-[380px] max-h-[650px] overflow-y-auto p-4 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500/20 prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-slate-800 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_figure]:my-3 [&_figcaption]:text-[11px] [&_figcaption]:text-slate-500 [&_figcaption]:italic [&_figcaption]:mt-1 [&_figcaption]:text-center [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_img]:cursor-pointer [&_img:hover]:ring-2 [&_img:hover]:ring-blue-400 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_hr]:my-4 [&_hr]:border-slate-200"
        />
      )}

      {mode === 'code' && (
        <textarea
          rows={18}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="<h2>Đánh giá chi tiết...</h2><p>Mô tả sản phẩm...</p>"
          className="w-full text-xs font-mono p-4 border-0 focus:outline-none focus:ring-0 leading-relaxed text-slate-800 bg-slate-900 text-emerald-100 resize-y"
        />
      )}

      {mode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onClick={handleEditorClick}
            onInput={handleInput}
            onBlur={handleInput}
            className="min-h-[380px] max-h-[600px] overflow-y-auto p-4 text-xs text-slate-800 leading-relaxed focus:outline-none prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_p]:mb-2 [&_figure]:my-3 [&_figcaption]:text-[11px] [&_figcaption]:text-slate-500 [&_figcaption]:italic [&_figcaption]:text-center [&_img]:max-w-full [&_img]:rounded-lg [&_img]:cursor-pointer [&_img:hover]:ring-2 [&_img:hover]:ring-blue-400"
          />
          <textarea
            rows={18}
            value={value}
            onChange={e => {
              isInternalChange.current = false;
              onChange(e.target.value);
            }}
            placeholder="<h2>Đánh giá chi tiết...</h2><p>Mô tả sản phẩm...</p>"
            className="w-full min-h-[380px] max-h-[600px] text-xs font-mono p-4 border-0 focus:outline-none focus:ring-0 leading-relaxed bg-slate-900 text-emerald-100 resize-y"
          />
        </div>
      )}

      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>💡 Mẹo: Click trực tiếp vào bất kỳ ảnh nào trong bài viết để chỉnh kích thước (25% – 100%), căn lề hoặc sửa chú thích.</span>
        <span>{(value || '').replace(/<[^>]*>/g, '').trim().length} ký tự</span>
      </div>
    </div>
  );
}
