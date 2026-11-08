'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  FileCode,
  Eye,
  Minus,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  Sparkles,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  Maximize2,
  Minimize2,
  Plus,
  Columns,
  Rows,
  Check,
  X,
} from 'lucide-react';

export interface RichContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  onInsertMediaClick: () => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  { label: 'Mặc định', value: '' },
  { label: 'Đậm (Slate 900)', value: '#0f172a' },
  { label: 'Xám (Slate 600)', value: '#475569' },
  { label: 'Xanh dương (Blue)', value: '#2563eb' },
  { label: 'Đỏ (Red)', value: '#dc2626' },
  { label: 'Xanh lá (Emerald)', value: '#16a34a' },
  { label: 'Cam (Orange)', value: '#ea580c' },
  { label: 'Tím (Purple)', value: '#9333ea' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Không nền', value: '' },
  { label: 'Vàng nhạt', value: '#fef08a' },
  { label: 'Xanh dương nhạt', value: '#dbeafe' },
  { label: 'Xanh lá nhạt', value: '#dcfce7' },
  { label: 'Đỏ nhạt', value: '#fee2e2' },
  { label: 'Cam nhạt', value: '#ffedd5' },
];

/**
 * Custom Tiptap Image node that supports width, alignment (left/center/right),
 * alt text, and optional <figcaption> inside a <figure> wrapper.
 */
const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const fig = el.tagName === 'FIGURE' ? el : el.closest('figure');
          const img = el.tagName === 'IMG' ? el : el.querySelector('img');
          return (
            fig?.style?.width ||
            img?.style?.width ||
            img?.getAttribute('width') ||
            '100%'
          );
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const target = (el.tagName === 'FIGURE' ? el : el.closest('figure')) || el;
          const ml = target.style?.marginLeft;
          const mr = target.style?.marginRight;
          const ta = target.style?.textAlign;
          if (ta === 'left' || ((ml === '0px' || ml === '0') && mr === 'auto')) return 'left';
          if (ta === 'right' || (ml === 'auto' && (mr === '0px' || mr === '0'))) return 'right';
          return 'center';
        },
      },
      caption: {
        default: '',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const fig = el.tagName === 'FIGURE' ? el : el.closest('figure');
          const cap = fig?.querySelector('figcaption');
          return cap?.textContent || '';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const img = el.querySelector('img');
          if (!img) return false;
          const cap = el.querySelector('figcaption');
          const width = el.style.width || img.style.width || img.getAttribute('width') || '100%';
          let align = 'center';
          const ml = el.style.marginLeft;
          const mr = el.style.marginRight;
          const ta = el.style.textAlign;
          if (ta === 'left' || ((ml === '0px' || ml === '0') && mr === 'auto')) align = 'left';
          else if (ta === 'right' || (ml === 'auto' && (mr === '0px' || mr === '0'))) align = 'right';
          return {
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
            width,
            align,
            caption: cap?.textContent || '',
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          const img = node as HTMLElement;
          if (img.closest('figure')) return false;
          const width = img.style.width || img.getAttribute('width') || '100%';
          let align = 'center';
          const ml = img.style.marginLeft;
          const mr = img.style.marginRight;
          if ((ml === '0px' || ml === '0') && mr === 'auto') align = 'left';
          else if (ml === 'auto' && (mr === '0px' || mr === '0')) align = 'right';
          return {
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
            width,
            align,
            caption: '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      title,
      width = '100%',
      align = 'center',
      caption = '',
    } = HTMLAttributes as {
      src?: string;
      alt?: string;
      title?: string;
      width?: string;
      align?: 'left' | 'center' | 'right';
      caption?: string;
    };

    const alignStyle =
      align === 'left'
        ? 'margin-left: 0; margin-right: auto; text-align: left;'
        : align === 'right'
        ? 'margin-left: auto; margin-right: 0; text-align: right;'
        : 'margin-left: auto; margin-right: auto; text-align: center;';

    const figStyle = `width: ${width || '100%'}; max-width: 100%; display: block; ${alignStyle}`;
    const imgAttrs: Record<string, string> = {
      src: src || '',
      alt: alt || '',
      style: 'width: 100%; max-width: 100%; height: auto; border-radius: 8px;',
    };
    if (title) imgAttrs.title = title;

    if (caption && String(caption).trim()) {
      return [
        'figure',
        { style: figStyle },
        ['img', imgAttrs],
        ['figcaption', {}, String(caption).trim()],
      ];
    }

    return ['figure', { style: figStyle }, ['img', imgAttrs]];
  },
});

export default function RichContentEditor({
  value,
  onChange,
  onInsertMediaClick,
  placeholder = 'Nhập nội dung chi tiết bài viết, mô tả sản phẩm, bảng thông số hoặc hình ảnh...',
}: RichContentEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code' | 'split'>('visual');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Popover / bar states
  const [linkBarOpen, setLinkBarOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [imageUrlBarOpen, setImageUrlBarOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);

  const lastEmittedHtmlRef = useRef<string>(value || '');
  const isCodeInputRef = useRef<boolean>(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: 'w-full text-xs border-collapse border border-slate-300 my-4',
          },
        },
      }),
      RichImage.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-prose min-h-[380px] p-4 text-xs sm:text-[13px] text-slate-800 leading-relaxed focus:outline-none max-w-none ' +
          '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 ' +
          '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1.5 ' +
          '[&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-slate-800 [&_h4]:mt-2 [&_h4]:mb-1 ' +
          '[&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5 [&_li]:mb-1 ' +
          '[&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50/40 [&_blockquote]:py-1.5 [&_blockquote]:px-3 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg ' +
          '[&_pre]:bg-slate-900 [&_pre]:text-emerald-200 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto ' +
          '[&_code]:bg-slate-100 [&_code]:text-rose-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px] [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 ' +
          '[&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium ' +
          '[&_figure]:my-3 [&_figcaption]:text-[11px] [&_figcaption]:text-slate-500 [&_figcaption]:italic [&_figcaption]:mt-1.5 [&_figcaption]:text-center ' +
          '[&_img]:max-w-full [&_img]:rounded-lg [&_img]:cursor-pointer [&_img:hover]:ring-2 [&_img:hover]:ring-blue-400 ' +
          '[&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-blue-600 [&_.ProseMirror-selectednode]:rounded-lg ' +
          '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold [&_th]:text-left [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_td]:align-top ' +
          '[&_hr]:my-4 [&_hr]:border-slate-200',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  // Sync external `value` changes into Tiptap editor
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming === lastEmittedHtmlRef.current) {
      isCodeInputRef.current = false;
      return;
    }

    // If an external dialog (like MediaBrowser) appended HTML snippet to the previous content,
    // insert the new snippet at the current cursor position in visual mode!
    const prev = lastEmittedHtmlRef.current;
    if (
      !isCodeInputRef.current &&
      mode !== 'code' &&
      prev.length > 0 &&
      incoming.startsWith(prev) &&
      incoming.length > prev.length
    ) {
      const appendedSnippet = incoming.slice(prev.length);
      editor.chain().focus().insertContent(appendedSnippet).run();
      return;
    }

    isCodeInputRef.current = false;
    lastEmittedHtmlRef.current = incoming;
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor, mode]);

  // Close Fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const currentBlockValue = (() => {
    if (!editor) return 'p';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    if (editor.isActive('blockquote')) return 'blockquote';
    if (editor.isActive('codeBlock')) return 'codeBlock';
    return 'p';
  })();

  const handleBlockChange = (val: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (val === 'p') chain.setParagraph().run();
    else if (val === 'h2') chain.toggleHeading({ level: 2 }).run();
    else if (val === 'h3') chain.toggleHeading({ level: 3 }).run();
    else if (val === 'h4') chain.toggleHeading({ level: 4 }).run();
    else if (val === 'blockquote') chain.toggleBlockquote().run();
    else if (val === 'codeBlock') chain.toggleCodeBlock().run();
  };

  const handleOpenLinkBar = () => {
    if (!editor) return;
    const existingHref = editor.getAttributes('link').href || 'https://';
    setLinkUrlInput(existingHref);
    setLinkBarOpen((prev) => !prev);
    setImageUrlBarOpen(false);
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const url = linkUrlInput.trim();
    if (!url || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkBarOpen(false);
  };

  const handleInsertExternalImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor || !imageUrlInput.trim()) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: imageUrlInput.trim(),
        alt: imageAltInput.trim() || 'Hình ảnh minh họa',
      })
      .run();
    setImageUrlInput('');
    setImageAltInput('');
    setImageUrlBarOpen(false);
  };

  const handleInsertSpecTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(`
        <table class="w-full text-xs border-collapse border border-slate-300 my-4">
          <thead>
            <tr class="bg-slate-100 font-semibold">
              <th class="border border-slate-300 p-2 text-left">Đặc điểm / Tính năng</th>
              <th class="border border-slate-300 p-2 text-left">Thông số chi tiết</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-slate-300 p-2">Thiết kế &amp; Khung vỏ</td>
              <td class="border border-slate-300 p-2">Hợp kim nhôm nguyên khối cao cấp, độ bền chuẩn quân đội</td>
            </tr>
            <tr>
              <td class="border border-slate-300 p-2">Khả năng nâng cấp</td>
              <td class="border border-slate-300 p-2">Hỗ trợ 2 khe RAM DDR5 &amp; 2 khe SSD M.2 NVMe PCIe Gen 4</td>
            </tr>
          </tbody>
        </table><p></p>
      `)
      .run();
  };

  const handleFormatHtmlCode = () => {
    if (!value) return;
    const formatted = value
      .replace(/>\s*</g, '>\n<')
      .replace(/(<\/(?:p|h2|h3|h4|figure|table|thead|tbody|tr|ul|ol|blockquote|div|pre)>)/gi, '$1\n');
    isCodeInputRef.current = true;
    onChange(formatted.trim());
  };

  const isImageSelected = Boolean(editor?.isActive('image'));
  const selectedImgAttrs = isImageSelected && editor ? editor.getAttributes('image') : null;
  const isTableActive = Boolean(editor?.isActive('table'));

  const plainText = (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const charCount = plainText.length;
  const wordCount = plainText ? plainText.split(' ').length : 0;

  const toolbarBtnCls = (active = false) =>
    `p-1.5 rounded transition cursor-pointer inline-flex items-center justify-center ${
      active
        ? 'bg-blue-100 text-blue-700 font-semibold shadow-2xs'
        : 'hover:bg-slate-200/80 text-slate-700'
    } disabled:opacity-35 disabled:cursor-not-allowed`;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white flex flex-col overflow-hidden'
          : 'border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col'
      }
    >
      {/* 1. MAIN HEADER TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {mode !== 'code' ? (
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className={toolbarBtnCls()}
              title="Hoàn tác (Ctrl+Z)"
              aria-label="Hoàn tác"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className={toolbarBtnCls()}
              title="Làm lại (Ctrl+Y)"
              aria-label="Làm lại"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Block Format Selector */}
            <select
              aria-label="Định dạng đoạn văn"
              value={currentBlockValue}
              onChange={(e) => handleBlockChange(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value="p">Đoạn văn (P)</option>
              <option value="h2">Tiêu đề lớn (H2)</option>
              <option value="h3">Tiêu đề vừa (H3)</option>
              <option value="h4">Tiêu đề nhỏ (H4)</option>
              <option value="blockquote">Trích dẫn (Quote)</option>
              <option value="codeBlock">Khối mã (Code)</option>
            </select>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Inline Formatting */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={toolbarBtnCls(editor?.isActive('bold'))}
              title="In đậm (Ctrl+B)"
              aria-label="In đậm"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={toolbarBtnCls(editor?.isActive('italic'))}
              title="In nghiêng (Ctrl+I)"
              aria-label="In nghiêng"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={toolbarBtnCls(editor?.isActive('underline'))}
              title="Gạch chân (Ctrl+U)"
              aria-label="Gạch chân"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={toolbarBtnCls(editor?.isActive('strike'))}
              title="Gạch ngang chữ"
              aria-label="Gạch ngang chữ"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* Text Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setColorMenuOpen((prev) => !prev);
                  setHighlightMenuOpen(false);
                }}
                className={toolbarBtnCls(colorMenuOpen)}
                title="Màu chữ"
                aria-label="Màu chữ"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              {colorMenuOpen && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 w-48 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>Chọn màu chữ</span>
                    <button
                      type="button"
                      onClick={() => setColorMenuOpen(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => {
                          if (!c.value) editor?.chain().focus().unsetColor().run();
                          else editor?.chain().focus().setColor(c.value).run();
                          setColorMenuOpen(false);
                        }}
                        title={c.label}
                        className="h-6 rounded border border-slate-200 flex items-center justify-center text-[10px] font-bold cursor-pointer hover:scale-105 transition"
                        style={{
                          backgroundColor: c.value || '#ffffff',
                          color: c.value ? '#ffffff' : '#334155',
                        }}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setHighlightMenuOpen((prev) => !prev);
                  setColorMenuOpen(false);
                }}
                className={toolbarBtnCls(editor?.isActive('highlight') || highlightMenuOpen)}
                title="Tô sáng nền chữ (Highlight)"
                aria-label="Tô sáng nền chữ"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
              {highlightMenuOpen && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 w-48 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>Màu tô sáng nền</span>
                    <button
                      type="button"
                      onClick={() => setHighlightMenuOpen(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => {
                          if (!c.value) editor?.chain().focus().unsetHighlight().run();
                          else editor?.chain().focus().toggleHighlight({ color: c.value }).run();
                          setHighlightMenuOpen(false);
                        }}
                        title={c.label}
                        className="h-6 rounded border border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-800 cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: c.value || '#f8fafc' }}
                      >
                        {c.value ? 'Abc' : 'Xóa'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Alignment */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={toolbarBtnCls(editor?.isActive({ textAlign: 'left' }))}
              title="Căn trái"
              aria-label="Căn trái"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={toolbarBtnCls(editor?.isActive({ textAlign: 'center' }))}
              title="Căn giữa"
              aria-label="Căn giữa"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={toolbarBtnCls(editor?.isActive({ textAlign: 'right' }))}
              title="Căn phải"
              aria-label="Căn phải"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              className={toolbarBtnCls(editor?.isActive({ textAlign: 'justify' }))}
              title="Căn đều hai bên"
              aria-label="Căn đều"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Lists & Quote */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={toolbarBtnCls(editor?.isActive('bulletList'))}
              title="Danh sách dấu chấm"
              aria-label="Danh sách dấu chấm"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={toolbarBtnCls(editor?.isActive('orderedList'))}
              title="Danh sách đánh số"
              aria-label="Danh sách đánh số"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={toolbarBtnCls(editor?.isActive('blockquote'))}
              title="Khối trích dẫn"
              aria-label="Khối trích dẫn"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-5 bg-slate-300 mx-1" />

            {/* Link & Media */}
            <button
              type="button"
              onClick={handleOpenLinkBar}
              className={toolbarBtnCls(editor?.isActive('link') || linkBarOpen)}
              title="Chèn / sửa liên kết (Link)"
              aria-label="Chèn liên kết"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            {editor?.isActive('link') && (
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                title="Gỡ liên kết"
                aria-label="Gỡ liên kết"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onInsertMediaClick}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium cursor-pointer transition border border-blue-200"
              title="Chèn ảnh từ Thư viện Media Cloudflare R2"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Chèn ảnh từ Media</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImageUrlBarOpen((prev) => !prev);
                setLinkBarOpen(false);
              }}
              className={toolbarBtnCls(imageUrlBarOpen)}
              title="Chèn ảnh bằng đường dẫn URL"
              aria-label="Chèn ảnh từ URL"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleInsertSpecTable}
              className={toolbarBtnCls(isTableActive)}
              title="Chèn bảng thông số / so sánh"
              aria-label="Chèn bảng"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              className={toolbarBtnCls()}
              title="Chèn đường phân cách ngang"
              aria-label="Đường phân cách ngang"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
              className={toolbarBtnCls()}
              title="Xóa định dạng văn bản đang chọn"
              aria-label="Xóa định dạng"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-mono py-1 px-2 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              Đang biên tập chế độ mã HTML (Raw Code)
            </span>
            <button
              type="button"
              onClick={handleFormatHtmlCode}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-blue-600" /> Làm đẹp dòng HTML
            </button>
          </div>
        )}

        {/* Right Side Mode Switcher & Fullscreen */}
        <div className="flex items-center gap-1.5">
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
              onClick={() => setMode('split')}
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
              onClick={() => setMode('code')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
                mode === 'code'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Mã HTML</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition"
            title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Phóng toàn màn hình'}
            aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. INLINE LINK BAR */}
      {linkBarOpen && mode !== 'code' && (
        <form
          onSubmit={handleApplyLink}
          className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-2 text-xs"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5 text-blue-600" /> Liên kết URL:
          </span>
          <input
            type="text"
            value={linkUrlInput}
            onChange={(e) => setLinkUrlInput(e.target.value)}
            placeholder="https://... hoặc /laptop-gaming"
            className="flex-1 min-w-[220px] bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Áp dụng
          </button>
          <button
            type="button"
            onClick={() => setLinkBarOpen(false)}
            className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            Đóng
          </button>
        </form>
      )}

      {/* 3. INLINE EXTERNAL IMAGE URL BAR */}
      {imageUrlBarOpen && mode !== 'code' && (
        <form
          onSubmit={handleInsertExternalImage}
          className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-2 text-xs"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Chèn ảnh từ URL:
          </span>
          <input
            type="text"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="https://... hoặc /api/library/..."
            className="flex-1 min-w-[200px] bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono"
            autoFocus
          />
          <input
            type="text"
            value={imageAltInput}
            onChange={(e) => setImageAltInput(e.target.value)}
            placeholder="Mô tả ảnh (Alt)..."
            className="w-48 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Chèn ảnh
          </button>
          <button
            type="button"
            onClick={() => setImageUrlBarOpen(false)}
            className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            Đóng
          </button>
        </form>
      )}

      {/* 4. CONTEXTUAL TABLE CONTROLS BAR */}
      {isTableActive && mode !== 'code' && editor && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-amber-900 flex items-center gap-1 mr-1">
              <TableIcon className="w-3.5 h-3.5 text-amber-700" /> Công cụ bảng:
            </span>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-700 hover:bg-amber-100 text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <Columns className="w-3 h-3" /> + Cột trái
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-700 hover:bg-amber-100 text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <Columns className="w-3 h-3" /> + Cột phải
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium cursor-pointer"
            >
              Xóa cột
            </button>
            <span className="w-px h-4 bg-amber-300 mx-0.5" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-700 hover:bg-amber-100 text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <Rows className="w-3 h-3" /> + Dòng trên
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-700 hover:bg-amber-100 text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <Rows className="w-3 h-3" /> + Dòng dưới
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium cursor-pointer"
            >
              Xóa dòng
            </button>
            <span className="w-px h-4 bg-amber-300 mx-0.5" />
            <button
              type="button"
              onClick={() => editor.chain().focus().mergeOrSplit().run()}
              className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-700 hover:bg-amber-100 text-[11px] font-medium cursor-pointer"
            >
              Gộp / Tách ô
            </button>
          </div>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Xóa bảng
          </button>
        </div>
      )}

      {/* 5. CONTEXTUAL IMAGE INSPECTOR BAR */}
      {isImageSelected && selectedImgAttrs && mode !== 'code' && editor && (
        <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Tùy chỉnh ảnh đang chọn:
            </span>
            <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5">
              {(['25%', '50%', '75%', '100%', '400px', '600px'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes('image', { width: sz }).run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                    (selectedImgAttrs.width || '100%') === sz
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5">
              {(
                [
                  { key: 'left', label: 'Trái' },
                  { key: 'center', label: 'Giữa' },
                  { key: 'right', label: 'Phải' },
                ] as const
              ).map((al) => (
                <button
                  key={al.key}
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: al.key }).run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    (selectedImgAttrs.align || 'center') === al.key
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  {al.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              value={selectedImgAttrs.alt || ''}
              onChange={(e) =>
                editor.chain().updateAttributes('image', { alt: e.target.value }).run()
              }
              placeholder="Thẻ Alt (SEO)..."
              className="w-36 bg-white border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={selectedImgAttrs.caption || ''}
              onChange={(e) =>
                editor.chain().updateAttributes('image', { caption: e.target.value }).run()
              }
              placeholder="Chú thích dưới ảnh (figcaption)..."
              className="flex-1 bg-white border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteSelection().run()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold cursor-pointer"
              title="Xóa ảnh này khỏi bài viết"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
            </button>
          </div>
        </div>
      )}

      {/* 6. EDITOR BODY */}
      {mode === 'visual' && (
        <div
          className={`overflow-y-auto flex-1 ${
            isFullscreen ? 'min-h-0' : 'min-h-[380px] max-h-[650px]'
          }`}
          onClick={() => {
            if (colorMenuOpen) setColorMenuOpen(false);
            if (highlightMenuOpen) setHighlightMenuOpen(false);
          }}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {mode === 'code' && (
        <textarea
          rows={isFullscreen ? 32 : 18}
          value={value}
          onChange={(e) => {
            isCodeInputRef.current = true;
            onChange(e.target.value);
          }}
          placeholder="<h2>Đánh giá chi tiết...</h2><p>Mô tả sản phẩm...</p>"
          className={`w-full text-xs font-mono p-4 border-0 focus:outline-none focus:ring-0 leading-relaxed bg-slate-900 text-emerald-100 resize-y ${
            isFullscreen ? 'flex-1' : 'min-h-[380px]'
          }`}
        />
      )}

      {mode === 'split' && (
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 ${
            isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : ''
          }`}
        >
          <div
            className={`overflow-y-auto ${
              isFullscreen ? 'h-full' : 'min-h-[380px] max-h-[600px]'
            }`}
          >
            <EditorContent editor={editor} />
          </div>
          <textarea
            rows={18}
            value={value}
            onChange={(e) => {
              isCodeInputRef.current = true;
              onChange(e.target.value);
            }}
            placeholder="<h2>Đánh giá chi tiết...</h2><p>Mô tả sản phẩm...</p>"
            className={`w-full text-xs font-mono p-4 border-0 focus:outline-none focus:ring-0 leading-relaxed bg-slate-900 text-emerald-100 resize-y ${
              isFullscreen ? 'h-full' : 'min-h-[380px] max-h-[600px]'
            }`}
          />
        </div>
      )}

      {/* 7. FOOTER STATUS BAR */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
        <span>
          💡 Mẹo: Click vào ảnh để chỉnh kích thước (25% – 100%), căn lề hoặc chú thích; đặt con trỏ vào bảng để thêm/xóa dòng cột.
        </span>
        <span className="font-mono tabular-nums">
          {wordCount} từ • {charCount} ký tự
        </span>
      </div>
    </div>
  );
}
