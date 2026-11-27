export const CUSTOMER_EXPERIENCE_BASE_PATH = '/khach-hang-chia-se';
export const CUSTOMER_EXPERIENCE_CATEGORY_SLUG = 'khach-hang-chia-se';

export interface CustomerExperienceCardItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  authorName: string;
  publishedAt: string;
  isFeatured: boolean;
  coverImage: {
    url: string;
    alt: string;
    thumbnailUrl?: string;
  } | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  relatedProduct?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  entryNumber?: number;
}

export function isCustomerExperienceCategory(
  category?: { slug?: string | null; name?: string | null } | null
): boolean {
  if (!category) return false;
  const slug = (category.slug || '').trim().toLowerCase();
  const name = (category.name || '').trim().toLowerCase();

  if (slug === CUSTOMER_EXPERIENCE_CATEGORY_SLUG || slug === 'trai-nghiem-khach-hang') {
    return true;
  }
  if (/(khach-hang-chia-se|trai-nghiem|nhat-ky-khach|khach-hang-trai-nghiem|feedback-khach)/.test(slug)) {
    return true;
  }
  if (/(trải\s*nghiệm\s*khách|khách\s*hàng\s*chia\s*sẻ|nhật\s*ký\s*khách|nhật\s*ký\s*bàn\s*giao)/.test(name)) {
    return true;
  }
  return false;
}

export function isCustomerExperienceSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return isCustomerExperienceCategory({ slug });
}

export function getPostHref(post: {
  slug: string;
  category?: { slug?: string | null; name?: string | null } | null;
}): string {
  if (isCustomerExperienceCategory(post.category)) {
    return `${CUSTOMER_EXPERIENCE_BASE_PATH}/${post.slug}`;
  }
  return `/news/${post.slug}`;
}

export function getPostCategoryHref(category: {
  slug: string;
  name?: string | null;
}): string {
  if (isCustomerExperienceCategory(category)) {
    return CUSTOMER_EXPERIENCE_BASE_PATH;
  }
  return `/news?category=${encodeURIComponent(category.slug)}`;
}

const VN_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatJournalDateParts(dateInput: string): {
  day: string;
  monthLabel: string;
  fullDate: string;
  isToday: boolean;
} {
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '--', monthLabel: 'Th--', fullDate: '', isToday: false };
  }

  const parts = VN_DATE_PARTS_FORMATTER.formatToParts(parsed);
  const day = parts.find((p) => p.type === 'day')?.value || '--';
  const month = parts.find((p) => p.type === 'month')?.value || '--';
  const year = parts.find((p) => p.type === 'year')?.value || '----';

  return {
    day,
    monthLabel: `Th${month}`,
    fullDate: `${day}/${month}/${year}`,
    isToday: false,
  };
}
