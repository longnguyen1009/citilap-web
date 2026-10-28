import { z } from 'zod';

const text = z.string().trim().max(200);
const money = z.number().int().min(0).max(2_000_000_000);

export type ProductTemplate =
  | 'LAPTOP'
  | 'MOUSE'
  | 'KEYBOARD'
  | 'HEADPHONE'
  | 'CHARGER'
  | 'HUB'
  | 'BAG'
  | 'MONITOR'
  | 'ACCESSORY'
  | 'TECH';

export interface AttributeDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  unit?: string;
  options?: string[];
  isFilterable: boolean;
  isComparable: boolean;
  displayOrder: number;
}

export const attributeTemplateDefinitions: Record<ProductTemplate, AttributeDefinition[]> = {
  LAPTOP: [
    { key: 'CPU', label: 'Bộ vi xử lý (CPU)', type: 'text', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'GPU', label: 'Card đồ họa (GPU)', type: 'text', isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'RAM', label: 'Dung lượng RAM', type: 'text', unit: 'GB', isFilterable: true, isComparable: true, displayOrder: 3 },
    { key: 'SSD', label: 'Ổ cứng SSD', type: 'text', unit: 'GB', isFilterable: true, isComparable: true, displayOrder: 4 },
    { key: 'Màn hình', label: 'Kích thước & độ phân giải màn hình', type: 'text', isFilterable: true, isComparable: true, displayOrder: 5 },
    { key: 'Tần số quét', label: 'Tần số quét màn hình', type: 'text', unit: 'Hz', isFilterable: true, isComparable: true, displayOrder: 6 },
    { key: 'Pin', label: 'Dung lượng pin', type: 'text', unit: 'Wh', isFilterable: false, isComparable: true, displayOrder: 7 },
    { key: 'Trọng lượng', label: 'Trọng lượng máy', type: 'text', unit: 'kg', isFilterable: false, isComparable: true, displayOrder: 8 },
    { key: 'Cổng kết nối', label: 'Cổng giao tiếp', type: 'text', isFilterable: false, isComparable: true, displayOrder: 9 },
    { key: 'Hệ điều hành', label: 'Hệ điều hành bản quyền', type: 'text', isFilterable: false, isComparable: true, displayOrder: 10 },
    { key: 'Phù hợp', label: 'Phù hợp với nhu cầu nào', type: 'text', isFilterable: false, isComparable: true, displayOrder: 11 },
    { key: 'Hạn chế', label: 'Điểm cần cân nhắc', type: 'text', isFilterable: false, isComparable: true, displayOrder: 12 },
    { key: 'Nâng cấp RAM', label: 'Khả năng nâng cấp RAM', type: 'text', isFilterable: false, isComparable: true, displayOrder: 13 },
    { key: 'Nâng cấp SSD', label: 'Khả năng nâng cấp SSD', type: 'text', isFilterable: false, isComparable: true, displayOrder: 14 },
    { key: 'Trọng lượng cả sạc', label: 'Trọng lượng máy và sạc', type: 'text', unit: 'kg', isFilterable: false, isComparable: true, displayOrder: 15 },
    { key: 'Năm ra mắt', label: 'Năm ra mắt', type: 'number', isFilterable: true, isComparable: true, displayOrder: 16 },
  ],
  MOUSE: [
    { key: 'Kết nối', label: 'Kiểu kết nối', type: 'select', options: ['Không dây 2.4GHz', 'Bluetooth', 'Có dây USB', 'Đa chế độ (Tri-mode)'], isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'DPI', label: 'Độ phân giải (DPI)', type: 'number', unit: 'DPI', isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Cảm biến', label: 'Cảm biến quang học', type: 'text', isFilterable: false, isComparable: true, displayOrder: 3 },
    { key: 'Số nút', label: 'Số nút bấm', type: 'number', isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Trọng lượng', label: 'Trọng lượng', type: 'number', unit: 'g', isFilterable: true, isComparable: true, displayOrder: 5 },
    { key: 'Thời lượng pin', label: 'Thời lượng pin', type: 'text', unit: 'giờ', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Đèn LED', label: 'Hệ thống đèn LED', type: 'select', options: ['RGB 16.8 triệu màu', 'Đơn sắc', 'Không LED'], isFilterable: false, isComparable: true, displayOrder: 7 },
  ],
  KEYBOARD: [
    { key: 'Layout', label: 'Bố cục bàn phím (Layout)', type: 'select', options: ['Fullsize (108 phím)', 'Tenkeyless (87 phím)', '75% (84 phím)', '68 phím', '60% (61 phím)'], isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Loại switch', label: 'Loại switch', type: 'select', options: ['Linear Red', 'Tactile Brown', 'Clicky Blue', 'Optical Switch', 'Custom Hotswap'], isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Kết nối', label: 'Kiểu kết nối', type: 'select', options: ['Có dây Type-C', 'Không dây 2.4GHz', 'Bluetooth 5.0', 'Đa chế độ (Tri-mode)'], isFilterable: true, isComparable: true, displayOrder: 3 },
    { key: 'Keycap', label: 'Chất liệu Keycap', type: 'select', options: ['PBT Double-shot', 'PBT Dye-sub', 'ABS'], isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Đèn LED', label: 'Hệ thống đèn LED', type: 'select', options: ['RGB từng phím', 'RGB gầm', 'Đơn sắc trắng', 'Không LED'], isFilterable: false, isComparable: true, displayOrder: 5 },
    { key: 'Kích thước', label: 'Kích thước', type: 'text', unit: 'mm', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Trọng lượng', label: 'Trọng lượng', type: 'number', unit: 'g', isFilterable: false, isComparable: true, displayOrder: 7 },
    { key: 'Tương thích', label: 'Hệ điều hành tương thích', type: 'text', options: ['Windows, macOS, Linux', 'Windows', 'macOS'], isFilterable: false, isComparable: true, displayOrder: 8 },
  ],
  HEADPHONE: [
    { key: 'Kiểu tai nghe', label: 'Thiết kế tai nghe', type: 'select', options: ['Over-ear (Trùm tai)', 'In-ear (Nhét tai)', 'On-ear'], isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Kết nối', label: 'Kiểu kết nối', type: 'select', options: ['Không dây 2.4GHz siêu tốc', 'Bluetooth 5.3', 'Jack 3.5mm', 'USB Type-C', 'Đa chế độ'], isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Driver', label: 'Kích thước Driver', type: 'text', unit: 'mm', isFilterable: false, isComparable: true, displayOrder: 3 },
    { key: 'Microphone', label: 'Microphone đàm thoại', type: 'select', options: ['Microphone tháo rời khử ồn', 'Microphone tích hợp', 'Không có micro'], isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Thời lượng pin', label: 'Thời lượng pin', type: 'text', unit: 'giờ', isFilterable: true, isComparable: true, displayOrder: 5 },
    { key: 'Khối lượng', label: 'Khối lượng', type: 'number', unit: 'g', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Tương thích', label: 'Thiết bị tương thích', type: 'text', isFilterable: false, isComparable: true, displayOrder: 7 },
  ],
  CHARGER: [
    { key: 'Công suất', label: 'Công suất sạc tối đa', type: 'select', options: ['20W', '30W', '45W', '65W', '100W', '140W', '240W'], unit: 'W', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Chuẩn sạc', label: 'Công nghệ & Chuẩn sạc', type: 'select', options: ['GaN (Gallium Nitride)', 'Power Delivery (PD 3.0)', 'Quick Charge (QC 4.0)', 'PPS'], isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Cổng ra', label: 'Cổng xuất nguồn ra', type: 'select', options: ['1 Cổng Type-C', '2 Cổng Type-C', '2 Type-C + 1 USB-A', '3 Type-C + 1 USB-A'], isFilterable: true, isComparable: true, displayOrder: 3 },
    { key: 'Cổng vào', label: 'Chân cắm nguồn', type: 'select', options: ['Chân gập chuẩn US', 'Chân tròn chuẩn EU'], isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Độ dài dây', label: 'Chiều dài dây cáp (nếu có)', type: 'text', unit: 'm', isFilterable: false, isComparable: true, displayOrder: 5 },
    { key: 'Chất liệu', label: 'Chất liệu vỏ', type: 'text', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Tương thích', label: 'Thiết bị hỗ trợ', type: 'text', isFilterable: false, isComparable: true, displayOrder: 7 },
  ],
  HUB: [
    { key: 'Cổng vào', label: 'Cổng kết nối vào (Host)', type: 'select', options: ['Type-C Thunderbolt 4', 'Type-C USB 3.2', 'Dual Type-C (MacBook)'], isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Cổng ra', label: 'Các cổng xuất ra', type: 'text', isFilterable: false, isComparable: true, displayOrder: 2 },
    { key: 'Hỗ trợ hiển thị', label: 'Độ phân giải màn hình phụ', type: 'select', options: ['HDMI 4K@60Hz', 'HDMI 4K@30Hz', 'Dual HDMI 4K', 'HDMI + VGA'], isFilterable: true, isComparable: true, displayOrder: 3 },
    { key: 'Công suất sạc PD', label: 'Công suất sạc xuyên qua (PD In)', type: 'select', options: ['100W PD Pass-through', '85W PD', '60W PD', 'Không hỗ trợ'], unit: 'W', isFilterable: true, isComparable: true, displayOrder: 4 },
    { key: 'Tốc độ truyền dữ liệu', label: 'Tốc độ cổng USB', type: 'select', options: ['10 Gbps (USB 3.2 Gen 2)', '5 Gbps (USB 3.0)', '480 Mbps (USB 2.0)'], isFilterable: false, isComparable: true, displayOrder: 5 },
    { key: 'Chất liệu', label: 'Chất liệu thân vỏ', type: 'select', options: ['Hợp kim nhôm tản nhiệt', 'Nhựa ABS cao cấp'], isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Tương thích', label: 'Hệ điều hành tương thích', type: 'text', isFilterable: false, isComparable: true, displayOrder: 7 },
  ],
  BAG: [
    { key: 'Cỡ laptop', label: 'Kích cỡ laptop tương thích', type: 'select', options: ['13 - 14 inch', '15.6 inch', '16 - 17.3 inch'], unit: 'inch', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Kích thước', label: 'Kích thước chi tiết (D x R x C)', type: 'text', unit: 'cm', isFilterable: false, isComparable: true, displayOrder: 2 },
    { key: 'Chất liệu', label: 'Chất liệu vải', type: 'select', options: ['Vải Oxford chống rách', 'Da PU chống xước', 'Nylon Polyester cao cấp', 'Vải tái chế bảo vệ môi trường'], isFilterable: false, isComparable: true, displayOrder: 3 },
    { key: 'Kháng nước', label: 'Khả năng chống thấm nước', type: 'select', options: ['Chống thấm nước IPX4', 'Chống bám nước nhẹ', 'Không kháng nước'], isFilterable: true, isComparable: true, displayOrder: 4 },
    { key: 'Số ngăn', label: 'Số ngăn chứa', type: 'number', isFilterable: false, isComparable: true, displayOrder: 5 },
    { key: 'Trọng lượng', label: 'Trọng lượng túi/balo', type: 'number', unit: 'g', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Màu sắc', label: 'Màu sắc cơ bản', type: 'text', isFilterable: true, isComparable: true, displayOrder: 7 },
  ],
  MONITOR: [
    { key: 'Kích thước màn hình', label: 'Kích thước màn hình', type: 'number', unit: 'inch', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Độ phân giải', label: 'Độ phân giải', type: 'select', options: ['Full HD (1920x1080)', '2K QHD (2560x1440)', '4K UHD (3840x2160)'], isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Tấm nền', label: 'Công nghệ tấm nền', type: 'select', options: ['IPS', 'Fast IPS', 'VA', 'OLED', 'TN'], isFilterable: true, isComparable: true, displayOrder: 3 },
    { key: 'Tần số quét', label: 'Tần số quét', type: 'number', unit: 'Hz', isFilterable: true, isComparable: true, displayOrder: 4 },
    { key: 'Thời gian phản hồi', label: 'Thời gian phản hồi', type: 'text', unit: 'ms', isFilterable: false, isComparable: true, displayOrder: 5 },
    { key: 'Độ sáng', label: 'Độ sáng màn hình', type: 'number', unit: 'nits', isFilterable: false, isComparable: true, displayOrder: 6 },
    { key: 'Cổng kết nối', label: 'Cổng giao tiếp', type: 'text', isFilterable: false, isComparable: true, displayOrder: 7 },
  ],
  ACCESSORY: [
    { key: 'Loại phụ kiện', label: 'Phân loại phụ kiện', type: 'text', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Kết nối', label: 'Kiểu kết nối', type: 'text', isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Chất liệu', label: 'Chất liệu cấu tạo', type: 'text', isFilterable: false, isComparable: true, displayOrder: 3 },
    { key: 'Kích thước', label: 'Kích thước', type: 'text', isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Tương thích', label: 'Thiết bị tương thích', type: 'text', isFilterable: false, isComparable: true, displayOrder: 5 },
  ],
  TECH: [
    { key: 'Tính năng chính', label: 'Tính năng nổi bật', type: 'text', isFilterable: true, isComparable: true, displayOrder: 1 },
    { key: 'Kết nối', label: 'Chuẩn kết nối', type: 'text', isFilterable: true, isComparable: true, displayOrder: 2 },
    { key: 'Pin', label: 'Dung lượng pin', type: 'text', isFilterable: false, isComparable: true, displayOrder: 3 },
    { key: 'Kích thước', label: 'Kích thước', type: 'text', isFilterable: false, isComparable: true, displayOrder: 4 },
    { key: 'Tương thích', label: 'Thiết bị tương thích', type: 'text', isFilterable: false, isComparable: true, displayOrder: 5 },
  ],
};

// Simple array of keys for backward compatibility
export const attributeTemplates: Record<ProductTemplate, readonly string[]> = Object.fromEntries(
  Object.entries(attributeTemplateDefinitions).map(([tmpl, defs]) => [tmpl, defs.map(d => d.key)])
) as unknown as Record<ProductTemplate, readonly string[]>;

export const availabilityLabels = {
  AVAILABLE: 'Sẵn hàng',
  PREORDER: 'Đặt trước',
  CONTACT: 'Liên hệ',
  UNAVAILABLE: 'Tạm ngừng nhận đơn',
} as const;

export const conditionLabels = {
  NEW: 'Mới 100%',
  LIKE_NEW: 'Like New (99%)',
  USED: 'Đã qua sử dụng',
  REFURBISHED: 'Refurbished',
  LIQUIDATION: 'Thanh lý',
} as const;

export const productVariantSchema = z.object({
  id: text.min(1),
  name: text.min(1),
  sku: text.min(1),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED']).default('NEW'),
  price: money,
  originalPrice: money.nullable().optional(),
  availability: z.enum(['AVAILABLE', 'PREORDER', 'CONTACT', 'UNAVAILABLE']).optional(),
  ram: text.optional(),
  storage: text.optional(),
  gpu: text.optional(),
  options: z.record(z.string(), z.string()).optional(),
  image: z.string().optional(),
});

export const productDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  name: text.min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
  categoryId: text.min(1),
  brand: text,
  brandId: z.string().nullable().default(null),
  template: z.enum(['LAPTOP', 'MOUSE', 'KEYBOARD', 'HEADPHONE', 'CHARGER', 'HUB', 'BAG', 'MONITOR', 'ACCESSORY', 'TECH']),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED', 'LIQUIDATION']).default('NEW'),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isFlashSale: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]).transform(values => [...new Set(values.map(value => value.toLocaleLowerCase('vi-VN')))]),
  description: z.string().max(2000),
  contentHtml: z.string().max(100000),
  price: money,
  originalPrice: money.nullable(),
  availability: z.enum(['AVAILABLE', 'PREORDER', 'CONTACT', 'UNAVAILABLE']),
  seoTitle: text,
  seoDescription: z.string().max(300),
  specs: z.array(z.object({ key: text.min(1), value: text })).max(60),
  media: z.array(z.object({ assetId: text.min(1), alt: z.string().max(300), variantId: text })).max(30),
  variants: z.array(productVariantSchema).max(40),
  warranties: z.array(z.object({
    name: text.min(1),
    description: z.string().max(500),
    adjustment: z.number().int().min(-2_000_000_000).max(2_000_000_000),
    recommended: z.boolean(),
  })).max(10),
  faqs: z.array(z.object({ q: text.min(1).max(300), a: text.min(1).max(2000) })).max(20).default([]),
  gifts: z.array(text.min(1).max(500)).max(10).default([]),
  accessoryProductIds: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  relatedProductIds: z.array(z.string()).max(10).optional().default([]),
}).superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (d.originalPrice !== null && d.originalPrice < d.price) {
    issue('Giá gốc phải lớn hơn hoặc bằng giá bán.');
  }
  d.variants.forEach((variant, index) => {
    if (variant.originalPrice != null && variant.originalPrice < variant.price) {
      ctx.addIssue({ code: 'custom', path: ['variants', index, 'originalPrice'], message: 'Giá gốc cấu hình phải lớn hơn hoặc bằng giá bán.' });
    }
  });
  for (const values of [d.variants.map(v => v.id), d.variants.map(v => v.sku), d.media.map(m => m.assetId), d.specs.map(s => s.key)]) {
    if (new Set(values).size !== values.length) {
      issue('Không được trùng mã, ảnh hoặc tên thông số.');
    }
  }

  // Prevent duplicate variant options/spec combinations
  const variantCombinations = d.variants.map(v => {
    const optSorted = Object.entries(v.options || {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => `${k}:${val}`).join('|');
    return `${v.condition}_${v.ram || ''}_${v.storage || ''}_${v.gpu || ''}_${optSorted}`;
  });
  if (new Set(variantCombinations).size !== variantCombinations.length) {
    issue('Hai biến thể không được có cùng tổ hợp cấu hình và tùy chọn.');
  }

  // Validate relatedProductIds: no duplicates
  if (d.relatedProductIds && new Set(d.relatedProductIds).size !== d.relatedProductIds.length) {
    issue('Danh sách sản phẩm liên quan không được chứa mã trùng lặp.');
  }

  if (d.media.some(m => m.variantId && !d.variants.some(v => v.id === m.variantId))) {
    issue('Ảnh tham chiếu biến thể không tồn tại.');
  }
  if (d.warranties.filter(w => w.recommended).length > 1) {
    issue('Chỉ chọn một gói bảo hành khuyên dùng.');
  }
  if (new Set(d.warranties.map(w => w.name)).size !== d.warranties.length) issue('Tên gói bảo hành không được trùng.');
  if (new Set(d.accessoryProductIds).size !== d.accessoryProductIds.length) issue('Phụ kiện mua kèm không được trùng.');
  if (d.warranties.some(w => Math.min(d.price, ...d.variants.map(v => v.price)) + w.adjustment < 0)) {
    issue('Giá sau bảo hành không được âm.');
  }
});

export type ProductDocument = z.infer<typeof productDocumentSchema>;

export const studioWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['save', 'publish', 'unpublish', 'restore']),
  document: productDocumentSchema,
});

export function blankProduct(template: ProductTemplate = 'LAPTOP'): ProductDocument {
  const specs = (attributeTemplates[template] || attributeTemplates.LAPTOP).map(key => ({ key, value: '' }));
  return {
    schemaVersion: 1,
    name: '',
    slug: '',
    categoryId: '',
    brand: '',
    brandId: null,
    template,
    condition: 'NEW',
    isNewArrival: false,
    isBestSeller: false,
    isFeatured: false,
    isFlashSale: false,
    tags: [],
    description: '',
    contentHtml: '',
    price: 0,
    originalPrice: null,
    availability: 'CONTACT',
    seoTitle: '',
    seoDescription: '',
    specs,
    media: [],
    variants: [],
    warranties: [],
    faqs: [],
    gifts: [],
    accessoryProductIds: [],
    relatedProductIds: [],
  };
}

