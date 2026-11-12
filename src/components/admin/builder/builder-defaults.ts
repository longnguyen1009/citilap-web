import type React from 'react';
import {
  Sliders,
  Grid,
  Tag,
  FolderTree,
  Bookmark,
  Newspaper,
  Info,
  Sparkles,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import type { SectionItem, SectionType } from '@/contracts/cms/site-builder';

export interface ProductItem {
  id: string;
  name: string;
  status: string;
}

export interface PostItem {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface RevisionItem {
  id: string;
  revision: number;
  action: string;
  actor: string;
  createdAt: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  image?: string | null;
}

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
}

export interface PostCategoryOption {
  id: string;
  name: string;
  slug: string;
}

export const SECTION_TYPE_META: Record<
  SectionType,
  { label: string; icon: React.ElementType; desc: string }
> = {
  banner: { label: 'Banner quảng cáo', icon: ImageIcon, desc: 'Banner đơn nổi bật với nút kêu gọi hành động' },
  slider: { label: 'Slider trình chiếu', icon: Sliders, desc: 'Băng chuyền hình ảnh chạy ngang' },
  product_grid: { label: 'Lưới sản phẩm', icon: Grid, desc: 'Danh sách sản phẩm chọn thủ công hoặc theo bộ lọc' },
  featured_categories: { label: 'Danh mục nổi bật', icon: FolderTree, desc: 'Các danh mục chính kèm icon' },
  featured_brands: { label: 'Thương hiệu đối tác', icon: Tag, desc: 'Logo các hãng sản xuất lớn' },
  featured_collection: { label: 'Bộ sưu tập', icon: Bookmark, desc: 'Gắn một bộ sưu tập từ hệ thống' },
  news_reviews: { label: 'Tin tức & Đánh giá', icon: Newspaper, desc: 'Các bài viết hoặc đánh giá nổi bật' },
  intro: { label: 'Giới thiệu & Số liệu', icon: Info, desc: 'Khối giới thiệu thương hiệu và các chỉ số' },
  cta: { label: 'Kêu gọi hành động (CTA)', icon: Sparkles, desc: 'Khối chốt hành động với nút nổi bật' },
  video_reviews: { label: 'Video review', icon: Eye, desc: 'Video YouTube và TikTok' },
  customer_gallery: { label: 'Ảnh khách hàng', icon: ImageIcon, desc: 'Ảnh trải nghiệm tại cửa hàng' },
};

export function getSectionBlockSummary(sec: SectionItem, fallbackLabel: string): string {
  let blockSummary = fallbackLabel;
  if (sec.data.type === 'banner') {
    blockSummary = `Banner (${sec.data.layout || 'hero'})`;
  } else if (sec.data.type === 'intro') {
    const count = (sec.data.features || []).filter((f) => f.enabled !== false).length;
    blockSummary = `Cam kết dịch vụ • ${count} ô`;
  } else if (sec.data.type === 'featured_categories') {
    const count =
      (sec.data.items || []).filter((i) => i.enabled !== false).length ||
      sec.data.categoryIds?.length ||
      0;
    blockSummary = `${sec.data.layout === 'board' ? 'Bảng phân loại' : 'Thẻ danh mục'} • ${count} mục`;
  } else if (sec.data.type === 'product_grid') {
    if (sec.id === 'sec-hot-sale') {
      blockSummary = `HOT SALE / Flash Sale`;
    } else if (sec.data.tabs?.length) {
      const tabCount = sec.data.tabs.filter((t) => t.enabled !== false).length;
      blockSummary = `Khối Tab sản phẩm • ${tabCount} tab`;
    } else {
      const lim = sec.data.ruleCriteria?.limit || 12;
      const linkCount = sec.data.links?.length || 0;
      blockSummary = `${
        sec.data.sourceMode === 'manual'
          ? `Thủ công (${sec.data.manualProductIds?.length || 0})`
          : 'Tự động'
      } • Tối đa ${lim} SP${linkCount ? ` • ${linkCount} link` : ''}`;
    }
  } else if (sec.data.type === 'video_reviews') {
    const count = (sec.data.videos || []).filter((v) => v.enabled !== false).length;
    blockSummary = `Video Review • ${count} video`;
  } else if (sec.data.type === 'news_reviews') {
    blockSummary = `Tin tức Media • Tối đa ${sec.data.limit || 5} bài`;
  } else if (sec.data.type === 'customer_gallery') {
    const count = (sec.data.images || []).filter((i) => i.enabled !== false).length;
    blockSummary = `Ảnh khách hàng • ${count} ảnh`;
  }
  return blockSummary;
}

export function createDefaultSection(type: SectionType): SectionItem {
  const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  switch (type) {
    case 'video_reviews':
      return { id, type, name: 'Video review', enabled: true, data: { type, title: 'Video review sản phẩm', videos: [] } };
    case 'customer_gallery':
      return { id, type, name: 'Ảnh khách hàng', enabled: true, data: { type, title: 'Hình ảnh khách hàng tại CitiLap', images: [] } };
    case 'banner':
      return {
        id,
        type: 'banner',
        name: 'Banner Quảng Cáo',
        enabled: true,
        data: {
          type: 'banner',
          title: '',
          subtitle: '',
          badge: '',
          imageUrl: '',
          imageAssetId: null,
          link: '',
          buttonText: '',
          secondaryLink: '',
          secondaryButtonText: '',
          layout: 'hero',
        },
      };
    case 'slider':
      return {
        id,
        type: 'slider',
        name: 'Slider Trình Chiếu',
        enabled: true,
        data: {
          type: 'slider',
          autoplay: true,
          intervalSec: 5,
          slides: [
            {
              id: `slide_${Date.now()}_1`,
              title: '',
              subtitle: '',
              badge: '',
              imageUrl: '',
              imageAssetId: null,
              link: '',
              buttonText: '',
            },
          ],
        },
      };
    case 'product_grid':
      return {
        id,
        type: 'product_grid',
        name: 'Lưới Sản Phẩm',
        enabled: true,
        data: {
          type: 'product_grid',
          title: 'Sản Phẩm Nổi Bật',
          subtitle: 'Các dòng máy được khách hàng ưa chuộng',
          badge: 'Nổi Bật',
          badgeColor: 'bg-blue-600 text-white',
          colorTheme: 'blue',
          links: [],
          sourceMode: 'rule',
          manualProductIds: [],
          ruleCriteria: {
            productType: 'laptop',
            categoryId: null,
            brandId: null,
            tag: 'all',
            availability: 'all',
            sort: 'newest',
            limit: 8,
          },
          rankNumbering: false,
          viewAllLink: '/laptop-gaming',
        },
      };
    case 'featured_categories':
      return {
        id,
        type: 'featured_categories',
        name: 'Danh Mục Nổi Bật',
        enabled: true,
        data: {
          type: 'featured_categories',
          title: 'Khám Phá Hệ Sinh Thái Danh Mục',
          subtitle: 'Lựa chọn dòng máy phù hợp nhất theo nhu cầu',
          categoryIds: [],
          items: [],
        },
      };
    case 'featured_brands':
      return {
        id,
        type: 'featured_brands',
        name: 'Thương Hiệu Đối Tác',
        enabled: true,
        data: {
          type: 'featured_brands',
          title: 'Khám Phá Theo Thương Hiệu',
          subtitle: 'Đối tác phân phối thiết bị công nghệ chính hãng',
          brandIds: [],
        },
      };
    case 'featured_collection':
      return {
        id,
        type: 'featured_collection',
        name: 'Bộ Sưu Tập Nổi Bật',
        enabled: true,
        data: {
          type: 'featured_collection',
          title: 'Bộ Sưu Tập Tuyển Chọn',
          subtitle: '',
          collectionId: '',
          limit: 12,
        },
      };
    case 'news_reviews':
      return {
        id,
        type: 'news_reviews',
        name: 'Góc Tin Tức & Đánh Giá',
        enabled: true,
        data: {
          type: 'news_reviews',
          title: 'Góc CitiLap Media & Đánh Giá',
          subtitle: 'Chia sẻ kinh nghiệm chọn mua và sử dụng thiết bị',
          postIds: [],
          limit: 4,
          categoryId: null,
        },
      };
    case 'intro':
      return {
        id,
        type: 'intro',
        name: 'Giới Thiệu & Cam Kết',
        enabled: true,
        data: {
          type: 'intro',
          title: 'Cam Kết Chất Lượng CitiLap',
          subtitle: '4 tiêu chuẩn dịch vụ vượt trội dành cho khách hàng',
          contentHtml: '',
          features: [
            { id: 'f1', icon: 'star', title: 'Máy lướt, giá tốt', description: 'Like-new 99%, tiết kiệm 30 - 50%' },
            { id: 'f2', icon: 'shield', title: 'Cam kết nguyên zin', description: '100% linh kiện chuẩn, chưa sửa chữa' },
            { id: 'f3', icon: 'refresh', title: 'Dịch vụ vượt trội', description: 'Bảo hành chu đáo, 1 đổi 1 linh hoạt' },
            { id: 'f4', icon: 'truck', title: 'Giao hàng hỏa tốc', description: 'Đồng kiểm máy trước khi thanh toán' },
          ],
        },
      };
    case 'cta':
      return {
        id,
        type: 'cta',
        name: 'Kêu Gọi Hành Động (CTA)',
        enabled: true,
        data: {
          type: 'cta',
          title: 'Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?',
          subtitle: 'Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp 1-1 qua Zalo hoặc Hotline.',
          primaryText: 'Chat Zalo Ngay',
          primaryLink: 'https://zalo.me',
          phone: '0987654321',
          secondaryText: 'Gọi Hotline',
          secondaryLink: 'tel:0987654321',
          bgImageUrl: '',
        },
      };
  }
}
