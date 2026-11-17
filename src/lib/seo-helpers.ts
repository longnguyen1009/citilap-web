import { businessProfile } from "../config/business-profile";

/**
 * Serializes JSON-LD object to safe JSON string, escaping HTML tag injection characters
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const TRAILING_BRAND_SUFFIX_RE =
  /(?:\s*[|–—-]\s*(?:citilap(?:\.vn)?|citi\s*lap|citi[a-z]*))+$/i;

const GENERIC_CATEGORY_DESC_RE =
  /^Khám phá [^,]+,\s*(?:đối chiếu cấu hình và liên hệ CitiLap để xác nhận sản phẩm phù hợp|so sánh cấu hình và chọn theo nhu cầu)\.?$/i;

const DEMO_LOCAL_DESC_RE = /^Dữ liệu mẫu local\b/i;

const GENERIC_POLICY_BOILERPLATE_RE =
  /:\s*phạm vi áp dụng,\s*quy trình và kênh hỗ trợ khách hàng tại CitiLap\.?$/i;

/**
 * Normalizes a page SEO title into a clean string without duplicate or truncated "| CitiLap" suffixes.
 */
export function formatSeoTitleString(
  rawTitle?: string | null,
  fallback?: string
): string {
  const source = (rawTitle || "").trim() || (fallback || "").trim();
  if (!source) {
    return `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`;
  }

  // Strip one or more trailing "| CitiLap", "| CITILAP.VN", or truncated "| CitiLa" suffixes
  const base = source.replace(TRAILING_BRAND_SUFFIX_RE, "").trim();
  if (!base) {
    return `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`;
  }

  // If the title already starts with "CitiLap" or ends with "CitiLap", do not append another "| CitiLap"
  if (/^citilap\b/i.test(base) || /\bcitilap(?:\.vn)?$/i.test(base)) {
    return base;
  }

  return `${base} | ${businessProfile.brandName}`;
}

/**
 * Returns Next.js Metadata title object with `absolute` so parent layout `title.template`
 * never appends a duplicate "| CitiLap" suffix.
 */
export function formatSeoTitle(
  rawTitle?: string | null,
  fallback?: string
): { absolute: string } {
  return {
    absolute: formatSeoTitleString(rawTitle, fallback),
  };
}

/**
 * Cleans and normalizes meta descriptions, rejecting local demo placeholders,
 * generic boilerplate when a richer fallback is provided, and repairing mid-word truncations.
 */
export function cleanSeoDescription(
  rawDesc?: string | null,
  fallback?: string,
  options?: { rejectPolicyBoilerplate?: boolean }
): string {
  const candidate = (rawDesc || "").trim();
  const fb = (fallback || "").trim();

  if (!candidate || DEMO_LOCAL_DESC_RE.test(candidate)) {
    return fb || `${businessProfile.primaryTagline}. ${businessProfile.traditionalMotto}.`;
  }

  if (
    options?.rejectPolicyBoilerplate &&
    GENERIC_POLICY_BOILERPLATE_RE.test(candidate) &&
    fb
  ) {
    return fb;
  }

  // Detect mid-word truncation around 160 characters (e.g. from legacy .slice(0, 160))
  if (
    candidate.length >= 155 &&
    candidate.length <= 162 &&
    !/[.!?…)"'»]$/.test(candidate)
  ) {
    const lastPunct = Math.max(
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf("; "),
      candidate.lastIndexOf("! "),
      candidate.lastIndexOf("? ")
    );
    if (lastPunct >= 80) {
      return candidate.slice(0, lastPunct + 1).trim();
    }
    const lastSpace = candidate.lastIndexOf(" ");
    if (lastSpace >= 100) {
      return `${candidate.slice(0, lastSpace).replace(/[,;:\-–—]+$/, "").trim()}...`;
    }
  }

  return candidate;
}

interface CategorySeoPreset {
  title: string;
  description: string;
  intro: string;
}

const CATEGORY_SEO_PRESETS: Record<string, CategorySeoPreset> = {
  "laptop-gaming": {
    title: "Laptop Gaming Chính Hãng — Cấu Hình Chiến Game & Đồ Họa",
    description:
      "Chuyên Laptop Gaming Lenovo Legion, LOQ, ASUS ROG, TUF, Acer Nitro, Predator, MSI, HP Victus/Omen trang bị card RTX 3050, RTX 4050, RTX 4060, RTX 4070. Kiểm định kỹ thuật 12 bước, bảo hành uy tín tại CitiLap Hà Nội & Bắc Ninh.",
    intro:
      "Tuyển chọn các dòng Laptop Gaming tản nhiệt tốt, màn hình tần số quét cao 144Hz–240Hz từ Lenovo Legion, LOQ, ASUS ROG, Acer Nitro đến HP Omen. Đối chiếu trực tiếp GPU, công suất TGP, RAM và giá bán theo từng cấu hình tại CitiLap.",
  },
  "laptop-van-phong": {
    title: "Laptop Văn Phòng & Học Tập — Mỏng Nhẹ, Pin Bền, Giá Tốt",
    description:
      "Tuyển chọn Laptop Văn Phòng, Học Tập, Sinh Viên & Doanh Nhân tại CitiLap: Lenovo ThinkPad, ThinkBook, Dell XPS, Latitude, Inspiron, ASUS Zenbook, Vivobook, HP EliteBook, LG Gram. Máy mới & Like New kiểm định minh bạch, lỗi 1 đổi 1 7 ngày.",
    intro:
      "Danh mục Laptop Văn Phòng, Học Tập & Doanh Nhân mỏng nhẹ, bàn phím gõ êm, thời lượng pin tốt cho làm việc đa nhiệm, lập trình và họp trực tuyến. Hỗ trợ nâng cấp RAM/SSD và cài đặt phần mềm miễn phí tại CitiLap Hà Nội & Bắc Ninh.",
  },
  "laptop-workstation": {
    title: "Laptop Workstation & Đồ Họa Kỹ Thuật — Chuyên CAD, 3D, Render",
    description:
      "Chuyên máy trạm Mobile Workstation Dell Precision, Lenovo ThinkPad P Series, HP ZBook cấu hình CPU hiệu năng cao, card đồ họa RTX Ada / Quadro chuyên dụng cho AutoCAD, SolidWorks, Revit, 3ds Max và dựng phim tại CitiLap.",
    intro:
      "Dòng máy trạm Workstation chuyên nghiệp cho kỹ sư CAD/CAM, kiến trúc sư và nhà sáng tạo nội dung 3D/Video: Dell Precision, ThinkPad P Series, HP ZBook với hệ thống tản nhiệt bền bỉ, VRAM lớn và màn hình chuẩn màu.",
  },
  "laptop-do-hoa": {
    title: "Laptop Đồ Họa & Kỹ Thuật — Chuyên Thiết Kế, Dựng Phim, 3D",
    description:
      "Chuyên Laptop Đồ Họa & Máy Trạm Dell Precision, Lenovo ThinkPad P, HP ZBook, ASUS ROG/ProArt màn hình chuẩn màu 100% sRGB/DCI-P3, GPU rời mạnh mẽ tại CitiLap.",
    intro:
      "Tuyển chọn các mẫu Laptop Đồ Họa và Workstation đáp ứng tốt Adobe Photoshop, Premiere, AutoCAD, SolidWorks, Revit và Blender tại CitiLap.",
  },
  macbook: {
    title: "Apple MacBook Air & MacBook Pro (M1, M2, M3, M4) Chính Hãng",
    description:
      "Khám phá Apple MacBook Air và MacBook Pro 13, 14, 15, 16 inch chip Apple Silicon M1, M2, M3, M4 chính hãng & Like New tuyển chọn tại CitiLap. Màn hình Liquid Retina sắc nét, pin bền bỉ, bảo hành minh bạch tại Hà Nội & Bắc Ninh.",
    intro:
      "Hệ sinh thái Apple MacBook Air và MacBook Pro trang bị chip Apple Silicon hiệu năng cao, thiết kế nhôm nguyên khối sang trọng, màn hình Retina chuẩn màu và thời lượng pin ấn tượng cho công việc sáng tạo và di chuyển.",
  },
  "laptop-ultrabook": {
    title: "Laptop Ultrabook Mỏng Nhẹ Cao Cấp — Doanh Nhân & Di Động",
    description:
      "Bộ sưu tập Laptop Ultrabook mỏng nhẹ cao cấp dưới 1.3kg, màn hình OLED/2K sắc nét: Dell XPS, Lenovo ThinkPad X1 Carbon, ASUS Zenbook, LG Gram, HP Spectre/OmniBook tại CitiLap.",
    intro:
      "Các dòng Ultrabook cao cấp ưu tiên tính cơ động, trọng lượng siêu nhẹ, hoàn thiện kim loại/carbon cao cấp cùng màn hình độ phân giải cao dành cho doanh nhân và người hay di chuyển.",
  },
  "laptop-likenew": {
    title: "Laptop Like New 99% Tuyển Chọn — Kiểm Định Kỹ Thuật Minh Bạch",
    description:
      "Laptop Like New 99% tuyển chọn kỹ lưỡng tại CitiLap: kiểm tra nghiêm ngặt mainboard, sức khỏe pin, ổ cứng SSD và màn hình. Bảo hành tiêu chuẩn 3–12 tháng, lỗi 1 đổi 1 trong 7 ngày đầu tiên.",
    intro:
      "Tổng hợp các mẫu Laptop Like New ngoại hình đẹp, nguyên bản, đã qua quy trình kiểm định kỹ thuật 12 bước tại CitiLap giúp tiết kiệm 30–50% chi phí so với máy mới.",
  },
  "laptop-cu": {
    title: "Laptop Cũ & Like New Chất Lượng — Giá Tốt, Bảo Hành Uy Tín",
    description:
      "Laptop đã qua sử dụng và Like New được kiểm định phần cứng nghiêm ngặt tại CitiLap. Công khai tình trạng thực tế, pin, màn hình, hỗ trợ lỗi 1 đổi 1 trong 7 ngày đầu.",
    intro:
      "Các dòng laptop đã qua sử dụng và Like New được kỹ thuật viên CitiLap kiểm tra toàn diện phần cứng, công khai tình trạng minh bạch và bảo hành chu đáo.",
  },
  "laptop-moi": {
    title: "Laptop Mới 100% Fullbox Chính Hãng — Giá Tốt Nhất",
    description:
      "Laptop mới 100% nguyên seal, chính hãng đầy đủ phân khúc Gaming, Văn phòng, Ultrabook, Đồ họa kỹ thuật và MacBook tại CitiLap. Bảo hành uy tín, giao hàng đồng kiểm toàn quốc.",
    intro:
      "Danh sách Laptop Mới 100% nguyên hộp cập nhật các thế hệ vi xử lý Intel Core Ultra, AMD Ryzen AI và Apple Silicon mới nhất tại CitiLap.",
  },
  "phu-kien": {
    title: "Phụ Kiện Laptop & Đồ Chơi Công Nghệ Chính Hãng",
    description:
      "Hệ sinh thái phụ kiện laptop chính hãng tại CitiLap: Chuột & bàn phím cơ, củ sạc nhanh GaN, cáp sạc, Hub chuyển đổi Type-C, balo chống sốc Tomtoc, giá đỡ tản nhiệt, nâng cấp RAM & SSD.",
    intro:
      "Phụ kiện công nghệ và linh kiện nâng cấp tuyển chọn cho góc làm việc: chuột không dây, bàn phím cơ, sạc nhanh GaN, Hub USB-C, balo chống sốc và RAM/SSD laptop chính hãng.",
  },
  "phu-kien-mouse-keyboard": {
    title: "Chuột Không Dây & Bàn Phím Cơ Laptop Chính Hãng",
    description:
      "Tuyển chọn chuột không dây công thái học, chuột gaming và bàn phím cơ gõ êm từ Logitech, DareU, HyperWork tại CitiLap. Bảo hành uy tín, lỗi 1 đổi 1 trong 7 ngày.",
    intro:
      "Các mẫu chuột không dây, chuột silent văn phòng và bàn phím cơ nhỏ gọn kết nối Bluetooth / 2.4GHz / Type-C tối ưu cho laptop.",
  },
  "balo-tui-laptop": {
    title: "Balo & Túi Chống Sốc Laptop 13, 14, 15.6, 16 inch",
    description:
      "Balo laptop trượt nước và túi chống sốc tiêu chuẩn quân đội từ Tomtoc, WiWU, Lenovo Legion, Acer tại CitiLap. Bảo vệ toàn diện cho MacBook, Ultrabook và Laptop Gaming.",
    intro:
      "Bộ sưu tập balo laptop và túi chống sốc đệm góc 360 độ, kháng nước bền bỉ cho các kích thước màn hình từ 13 inch đến 16 inch.",
  },
  "sac-cap": {
    title: "Củ Sạc Nhanh GaN & Cáp Sạc USB-C PD Cho Laptop",
    description:
      "Củ sạc nhanh GaN 65W, 100W, 140W và cáp sạc USB-C Power Delivery công suất cao từ Anker, Ugreen, Baseus tương thích MacBook, ThinkPad, Dell XPS tại CitiLap.",
    intro:
      "Giải pháp sạc nhanh GaN nhỏ gọn và cáp USB-C PD dòng cao giúp sạc đồng thời laptop, máy tính bảng và điện thoại an toàn.",
  },
  "hub-usb-c": {
    title: "Hub Chuyển Đổi USB-C Đa Năng — Xuất Hình HDMI 4K, LAN, PD",
    description:
      "Hub USB-C và cổng chuyển đổi đa năng Ugreen, Baseus, HyperWork hỗ trợ xuất màn hình HDMI 4K@60Hz, sạc PD 100W, cổng USB 3.0, thẻ nhớ SD/TF và LAN Gigabit tại CitiLap.",
    intro:
      "Mở rộng tối đa cổng kết nối cho MacBook và Ultrabook mỏng nhẹ với các mẫu Hub USB-C hỗ trợ xuất hình 4K, mạng LAN và sạc nhanh PD.",
  },
  "gia-do-tan-nhiet": {
    title: "Giá Đỡ Laptop Nhôm & Đế Tản Nhiệt Công Thái Học",
    description:
      "Giá đỡ laptop hợp kim nhôm công thái học và đế tản nhiệt quạt tốc độ cao từ HyperWork, Ugreen giúp hạ nhiệt GPU/CPU và cải thiện tư thế ngồi làm việc tại CitiLap.",
    intro:
      "Giá đỡ nâng độ cao màn hình chuẩn công thái học và đế tản nhiệt tăng cường lưu thông khí cho laptop văn phòng lẫn laptop gaming.",
  },
  "den-man-hinh": {
    title: "Đèn Treo Màn Hình Bảo Vệ Mắt (Screenbar) & Desk Setup",
    description:
      "Đèn treo màn hình chống chói, bảo vệ mắt Baseus, Yeelight dùng cho laptop và màn hình rời tại CitiLap. Ánh sáng bất đối xứng không gây lóa màn hình.",
    intro:
      "Đèn kẹp màn hình thông minh điều chỉnh nhiệt độ màu và độ sáng linh hoạt, chiếu sáng vùng bàn phím mà không gây phản chiếu lên màn hình.",
  },
  "tai-nghe": {
    title: "Tai Nghe & Thiết Bị Âm Thanh Cho Học Tập, Họp Online & Gaming",
    description:
      "Tai nghe chụp tai, tai nghe không dây chống ồn tích hợp micro đàm thoại rõ nét phục vụ họp trực tuyến, học tập và giải trí tại CitiLap.",
    intro:
      "Các mẫu tai nghe và thiết bị âm thanh chất lượng cao tích hợp micro lọc ồn phục vụ họp trực tuyến, học ngoại ngữ và chơi game.",
  },
  "ram-ssd": {
    title: "Nâng Cấp RAM & Ổ Cứng SSD Laptop NVMe Chính Hãng",
    description:
      "Nâng cấp RAM DDR4, DDR5 (8GB, 16GB, 32GB) và ổ cứng SSD NVMe PCIe Gen 3/Gen 4 (512GB, 1TB, 2TB) Samsung, SK Hynix, Kingston, Crucial cho laptop tại CitiLap. Hỗ trợ lắp đặt miễn phí.",
    intro:
      "Linh kiện RAM DDR4/DDR5 và ổ cứng SSD NVMe chính hãng giúp tăng tốc khởi động, mở rộng dung lượng lưu trữ và xử lý đa nhiệm mượt mà.",
  },
};

export function getCategorySeoMeta(
  category: {
    slug: string;
    name: string;
    description?: string | null;
    href?: string;
  },
  page = 1
): {
  titleString: string;
  title: { absolute: string };
  description: string;
  introText: string;
} {
  const slug = (category.slug || "").toLowerCase();
  const preset = CATEGORY_SEO_PRESETS[slug];
  const rawDesc = (category.description || "").trim();
  const hasCustomDesc =
    Boolean(rawDesc) && !GENERIC_CATEGORY_DESC_RE.test(rawDesc);

  const pageSuffix = page > 1 ? ` – Trang ${page}` : "";

  const baseTitle = preset
    ? `${preset.title}${pageSuffix}`
    : `${category.name} Chính Hãng — Bảng Giá & Cấu Hình Chi Tiết${pageSuffix}`;

  const titleString = formatSeoTitleString(baseTitle);
  const title = { absolute: titleString };

  const description = hasCustomDesc
    ? rawDesc
    : preset
    ? preset.description
    : `Khám phá các dòng ${category.name} chính hãng và Like New tuyển chọn tại CitiLap. Đối chiếu chi tiết CPU, RAM, SSD, màn hình, bảng giá mới nhất và nhận tư vấn cấu hình chuẩn nhu cầu tại Hà Nội & Bắc Ninh.`;

  const introText = hasCustomDesc
    ? rawDesc
    : preset
    ? preset.intro
    : `Tổng hợp các mẫu ${category.name} được kiểm định kỹ thuật kỹ lưỡng tại CitiLap. Bạn có thể lọc nhanh theo cấu hình CPU, RAM, ổ cứng SSD, card đồ họa và mức giá để chọn chiếc máy phù hợp nhất với nhu cầu thực tế.`;

  return {
    titleString,
    title,
    description,
    introText,
  };
}

/**
 * Extracts FAQ items from HTML containing <details><summary>...</summary><p>...</p></details>
 * or (when allowHeadingPairs is true) <h2>Question?</h2><p>Answer</p> pairs.
 */
export function extractFaqsFromHtml(
  html: string,
  allowHeadingPairs = false
): Array<{ question: string; answer: string }> {
  if (!html) return [];
  const results: Array<{ question: string; answer: string }> = [];
  const stripTags = (str: string) =>
    str
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();

  const detailsRegex =
    /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let match: RegExpExecArray | null;
  while ((match = detailsRegex.exec(html)) !== null) {
    const question = stripTags(match[1]);
    const answer = stripTags(match[2]);
    if (question && answer) {
      results.push({ question, answer });
    }
  }

  if (results.length === 0 && allowHeadingPairs) {
    const headingRegex =
      /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*((?:<p[^>]*>[\s\S]*?<\/p>\s*)+)/gi;
    while ((match = headingRegex.exec(html)) !== null) {
      const question = stripTags(match[1]);
      const answer = stripTags(match[2]);
      if (
        question &&
        answer &&
        (question.includes("?") || !/^liên hệ\b/i.test(question))
      ) {
        results.push({ question, answer });
      }
    }
  }

  return results;
}

/**
 * Generates Schema.org Organization structured data
 */
export function generateOrganizationJsonLd() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;
  const sameAs = [
    businessProfile.socialProfiles.facebook,
    businessProfile.socialProfiles.tiktok,
    businessProfile.socialProfiles.youtube,
    businessProfile.socialProfiles.zalo,
  ].filter((url): url is string => Boolean(url));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
    name: businessProfile.brandName,
    legalName: "HỘ KINH DOANH CITI LAP",
    taxID: "01D8053589",
    alternateName: businessProfile.alternateNames,
    url: businessProfile.canonicalSiteUrl,
    logo: `${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`,
    image: `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`,
    slogan: businessProfile.traditionalMotto,
    description: `${businessProfile.primaryTagline}. Chuyên ${businessProfile.productFocus}. Thành lập từ ${businessProfile.founded}.`,
    telephone: businessProfile.telHref.replace("tel:", ""),
    email: businessProfile.email,
    foundingDate: "2024-07",
    sameAs,
    address: {
      "@type": "PostalAddress",
      streetAddress: hanoi.streetAddress,
      addressLocality: hanoi.addressLocality,
      addressCountry: hanoi.addressCountry,
      postalCode: hanoi.postalCode,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: businessProfile.telHref.replace("tel:", ""),
        contactType: "customer service",
        email: businessProfile.email,
        areaServed: "VN",
        availableLanguage: ["Vietnamese"],
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "09:00",
          closes: "20:00",
        },
      },
    ],
  };
}

/**
 * Generates Schema.org LocalBusiness / ComputerStore for ACTIVE branches
 * Note: Only Hà Nội & Bắc Ninh are active. HCM is TEMPORARILY_CLOSED and omitted from active schema.
 * Note: Sunday is by appointment only, omitted from regular openingHoursSpecification.
 */
export function generateLocalBusinessesJsonLd() {
  const activeLocations = businessProfile.locations.filter(
    (loc) => loc.status === "ACTIVE"
  );

  const geoByLocationId: Record<string, { latitude: number; longitude: number }> = {
    hanoi: { latitude: 21.0031, longitude: 105.8466 },
    "bac-ninh": { latitude: 21.1861, longitude: 106.0763 },
  };

  return activeLocations.map((loc) => ({
    "@context": "https://schema.org",
    "@type": "ComputerStore",
    "@id": `${businessProfile.canonicalSiteUrl}/#store-${loc.id}`,
    name: `${businessProfile.brandName} - ${loc.name}`,
    description: `Cơ sở ${loc.name} - ${businessProfile.brandName}. ${loc.openingHoursText}`,
    url: `${businessProfile.canonicalSiteUrl}/he-thong-cua-hang#${loc.id}`,
    telephone: loc.telHref.replace("tel:", ""),
    email: businessProfile.email,
    parentOrganization: {
      "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
    },
    image: loc.photos
      ? loc.photos.map((p) => `${businessProfile.canonicalSiteUrl}${p}`)
      : [`${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`],
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.streetAddress,
      addressLocality: loc.addressLocality,
      addressRegion: loc.addressRegion || loc.addressLocality,
      postalCode: loc.postalCode,
      addressCountry: loc.addressCountry,
    },
    ...(geoByLocationId[loc.id]
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: geoByLocationId[loc.id].latitude,
            longitude: geoByLocationId[loc.id].longitude,
          },
        }
      : {}),
    hasMap: loc.mapsUrl,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "20:00",
      },
    ],
    priceRange: "$$",
    paymentAccepted: "Cash, Credit Card, Bank Transfer, VietQR",
    currenciesAccepted: "VND",
  }));
}

/**
 * Generates Schema.org WebSite structured data with SearchAction
 */
export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${businessProfile.canonicalSiteUrl}/#website`,
    url: businessProfile.canonicalSiteUrl,
    name: businessProfile.brandName,
    alternateName: businessProfile.alternateNames,
    description: businessProfile.primaryTagline,
    inLanguage: "vi-VN",
    publisher: {
      "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${businessProfile.canonicalSiteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function toAbsoluteSiteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return businessProfile.canonicalSiteUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${businessProfile.canonicalSiteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function resolveSchemaItemCondition(condition?: string | null): string {
  const raw = (condition || "").trim().toUpperCase();
  if (!raw || raw === "NEW" || raw.includes("MỚI") || raw.includes("100%")) {
    return "https://schema.org/NewCondition";
  }
  if (raw === "LIKE_NEW" || raw.includes("LIKE NEW") || raw.includes("99%")) {
    return "https://schema.org/RefurbishedCondition";
  }
  return "https://schema.org/UsedCondition";
}

function resolveSchemaAvailability(params: {
  availability?: string | null;
  canOrder?: boolean;
  inStock?: boolean;
}): string {
  if (params.canOrder === false) {
    return "https://schema.org/OutOfStock";
  }
  const av = (params.availability || "").trim().toUpperCase();
  if (av === "PREORDER") return "https://schema.org/PreOrder";
  if (av === "OUT_OF_STOCK" || av === "SOLD" || av === "DISCONTINUED") {
    return "https://schema.org/OutOfStock";
  }
  if (av === "AVAILABLE") return "https://schema.org/InStock";
  return params.inStock === false
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
}

export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; href: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(item.href),
    })),
  };
}

export function generateFaqJsonLd(
  faqs: Array<{ question?: string; q?: string; answer?: string; a?: string }>
) {
  const valid = faqs
    .map((f) => ({
      q: (f.question ?? f.q ?? "").trim(),
      a: (f.answer ?? f.a ?? "").trim(),
    }))
    .filter((f) => f.q && f.a);

  if (valid.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export interface ProductReviewJsonLdItem {
  authorName?: string;
  reviewerName?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

export interface ProductJsonLdInput {
  id: string;
  name: string;
  description: string;
  canonicalPath: string;
  images: string[];
  sku?: string | null;
  modelCode?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  condition?: string | null;
  price: number;
  availability?: string | null;
  canOrder?: boolean;
  inStock?: boolean;
  specs?: Array<{ key: string; value: string }>;
  reviews?: ProductReviewJsonLdItem[];
}

export function generateProductJsonLd(input: ProductJsonLdInput) {
  const url = toAbsoluteSiteUrl(input.canonicalPath);
  const itemCondition = resolveSchemaItemCondition(input.condition);
  const availability = resolveSchemaAvailability({
    availability: input.availability,
    canOrder: input.canOrder,
    inStock: input.inStock,
  });
  const images = input.images
    .filter(Boolean)
    .map((img) => toAbsoluteSiteUrl(img));

  const additionalProperty = (input.specs || [])
    .filter((s) => s.key?.trim() && s.value?.trim())
    .slice(0, 12)
    .map((s) => ({
      "@type": "PropertyValue",
      name: s.key.trim(),
      value: s.value.trim(),
    }));

  const validReviews = (input.reviews || [])
    .map((r) => ({
      authorName: (r.authorName ?? r.reviewerName ?? "").trim(),
      rating: r.rating,
      comment: r.comment.trim(),
      createdAt: r.createdAt,
    }))
    .filter((r) => r.authorName && r.comment && r.rating >= 1 && r.rating <= 5);
  const aggregateRating =
    validReviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(
            (
              validReviews.reduce((sum, r) => sum + r.rating, 0) /
              validReviews.length
            ).toFixed(1)
          ),
          reviewCount: validReviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const reviewEntities =
    validReviews.length > 0
      ? validReviews.slice(0, 5).map((r) => ({
          "@type": "Review",
          author: {
            "@type": "Person",
            name: r.authorName,
          },
          ...(r.createdAt ? { datePublished: r.createdAt.split("T")[0] } : {}),
          reviewBody: r.comment,
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }))
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.name,
    description: cleanSeoDescription(input.description, input.name),
    url,
    ...(images.length > 0 ? { image: images } : {}),
    sku: input.sku || input.id,
    ...(input.modelCode ? { mpn: input.modelCode } : {}),
    ...(input.brand
      ? {
          brand: {
            "@type": "Brand",
            name: input.brand,
          },
        }
      : {}),
    ...(input.categoryName ? { category: input.categoryName } : {}),
    itemCondition,
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewEntities ? { review: reviewEntities } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "VND",
      price: input.price,
      availability,
      itemCondition,
      seller: {
        "@type": "Organization",
        "@id": `${businessProfile.canonicalSiteUrl}/#organization`,
        name: businessProfile.brandName,
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "VN",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: businessProfile.warrantySummary.returnPolicyDays,
        returnMethod: "https://schema.org/ReturnInStore",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "VN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 4,
            unitCode: "DAY",
          },
        },
      },
    },
  };
}
