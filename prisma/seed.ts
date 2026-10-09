import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaLibSql({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const imageUrls = {
  legion: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=900&auto=format&fit=crop",
  gaming: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=900&auto=format&fit=crop",
  office: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=900&auto=format&fit=crop",
  macbook: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=900&auto=format&fit=crop",
  accessory: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=900&auto=format&fit=crop",
};

type CategoryInput = { name: string; slug: string; description: string; parentSlug?: string };

const categoryInputs: CategoryInput[] = [
  { name: "Laptop Gaming", slug: "laptop-gaming", description: "Laptop gaming hiệu năng cao cho học tập, giải trí và thi đấu." },
  { name: "Laptop Văn Phòng", slug: "laptop-van-phong", description: "Laptop mỏng nhẹ, pin lâu cho công việc và học tập." },
  { name: "MacBook", slug: "macbook", description: "MacBook chính hãng với chip Apple Silicon mới nhất." },
  { name: "Laptop Đồ Họa - Kỹ Thuật", slug: "laptop-do-hoa", description: "Máy trạm và laptop chuyên dụng cho thiết kế, dựng phim, kỹ thuật." },
  { name: "Laptop Like New", slug: "laptop-cu", description: "Laptop đã qua sử dụng được kiểm tra kỹ lưỡng, bảo hành rõ ràng." },
  { name: "Phụ Kiện", slug: "phu-kien", description: "Phụ kiện laptop và thiết bị công nghệ chính hãng." },
  { name: "Chuột Gaming", slug: "chuot-gaming", description: "Chuột gaming chính xác, độ bền cao.", parentSlug: "phu-kien" },
  { name: "Bàn phím cơ", slug: "ban-phim-co", description: "Bàn phím cơ cho gaming và làm việc.", parentSlug: "phu-kien" },
];

const productInputs = [
  ["Lenovo Legion 5 15ARH7H", "lenovo-legion-5-15arh7h", 28490000, 32990000, "laptop-gaming", "lenovo,legion,gaming", "AMD Ryzen 7 6800H", "16GB DDR5", "512GB NVMe", "RTX 3050 Ti 4GB", "legion", { brand: "Lenovo", model: "Legion 5 15ARH7H", series: "Legion", warranty: "12 tháng chính hãng", condition: "Mới 100%", origin: "Trung Quốc", seoTitle: "Lenovo Legion 5 15ARH7H - Giá tốt, bảo hành 12 tháng | CITILAP.VN", seoDescription: "Lenovo Legion 5 15ARH7H Ryzen 7 6800H, 16GB, 512GB, RTX 3050 Ti. Tư vấn mua trả góp, giao hàng nhanh toàn quốc.", lowestPrice30d: 27490000, isFeatured: true }],
  ["Lenovo Legion Pro 5 16ARX8", "lenovo-legion-pro-5-16arx8", 38990000, 42990000, "laptop-gaming", "lenovo,legion,gaming", "Ryzen 9 7945HX", "32GB DDR5", "1TB NVMe", "RTX 4070 8GB", "legion"],
  ["ASUS ROG Strix G16 G614JI", "asus-rog-strix-g16-g614ji", 42990000, 47990000, "laptop-gaming", "asus,rog,gaming", "Intel Core i9-13980HX", "32GB DDR5", "1TB NVMe", "RTX 4070 8GB", "gaming"],
  ["Acer Predator Helios Neo 16", "acer-predator-helios-neo-16", 34990000, 39990000, "laptop-gaming", "acer,predator,gaming", "Intel Core i7-13700HX", "16GB DDR5", "512GB NVMe", "RTX 4060 8GB", "gaming"],
  ["MSI Katana 15 B13VFK", "msi-katana-15-b13vfk", 29990000, 33990000, "laptop-gaming", "msi,katana,gaming", "Intel Core i7-13620H", "16GB DDR5", "512GB NVMe", "RTX 4060 8GB", "gaming"],
  ["HP Victus 16-s0010AX", "hp-victus-16-s0010ax", 21990000, 25990000, "laptop-gaming", "hp,victus,gaming", "Ryzen 5 7640HS", "16GB DDR5", "512GB NVMe", "RTX 4050 6GB", "gaming", { brand: "HP", model: "Victus 16-s0010AX", series: "Victus", warranty: "12 tháng chính hãng", condition: "Mới 100%", origin: "Trung Quốc", seoTitle: "HP Victus 16 gaming giá rẻ, cấu hình mạnh | CITILAP.VN", seoDescription: "HP Victus 16 Ryzen 5 7640HS, 16GB RAM, SSD 512GB, RTX 4050 6GB lý tưởng cho sinh viên.", lowestPrice30d: 20990000, isFlashSale: true }],
  ["Dell XPS 15 9530", "dell-xps-15-9530", 42990000, 47990000, "laptop-van-phong", "dell,xps,vanphong,ultrabook", "Intel Core i7-13700H", "16GB DDR5", "512GB NVMe", "Intel Iris Xe", "office", { brand: "Dell", model: "XPS 15 9530", series: "XPS", warranty: "12 tháng chính hãng", condition: "Mới 100%", origin: "Trung Quốc", seoTitle: "Dell XPS 15 9530 ultrabook cao cấp | CITILAP.VN", seoDescription: "Dell XPS 15 9530 i7-13700H, 16GB, 512GB, màn hình OLED cho dân thiết kế.", lowestPrice30d: 41990000, isNewArrival: true }],
  ["Lenovo ThinkPad X1 Carbon Gen 11", "lenovo-thinkpad-x1-carbon-gen-11", 35990000, 39990000, "laptop-van-phong", "lenovo,thinkpad,vanphong,ultrabook", "Intel Core i7-1365U", "16GB LPDDR5", "512GB NVMe", "Intel Iris Xe", "office"],
  ["ASUS Zenbook 14 OLED UX3402", "asus-zenbook-14-oled-ux3402", 24490000, 27990000, "laptop-van-phong", "asus,zenbook,vanphong,ultrabook", "Intel Core i5-1240P", "16GB LPDDR5", "512GB NVMe", "Intel Iris Xe", "office"],
  ["HP EliteBook 840 G10", "hp-elitebook-840-g10", 28990000, 32990000, "laptop-van-phong", "hp,elitebook,vanphong,ultrabook", "Intel Core i7-1355U", "16GB DDR5", "512GB NVMe", "Intel Iris Xe", "office"],
  ["MacBook Air M3 15 inch", "macbook-air-m3-15-inch", 37990000, 39990000, "macbook", "apple,macbook,air", "Apple M3 8-core", "8GB Unified", "256GB SSD", "GPU 10-core", "macbook"],
  ["MacBook Air M2 13 inch", "macbook-air-m2-13-inch", 26990000, 29990000, "macbook", "apple,macbook,air", "Apple M2 8-core", "8GB Unified", "256GB SSD", "GPU 8-core", "macbook"],
  ["MacBook Pro M3 Pro 14 inch", "macbook-pro-m3-pro-14-inch", 49990000, 52990000, "macbook", "apple,macbook,pro", "Apple M3 Pro", "18GB Unified", "512GB SSD", "GPU 14-core", "macbook"],
  ["MacBook Pro M3 Max 16 inch", "macbook-pro-m3-max-16-inch", 74990000, 79990000, "macbook", "apple,macbook,pro", "Apple M3 Max", "36GB Unified", "1TB SSD", "GPU 30-core", "macbook"],
  ["HP ZBook Studio G10", "hp-zbook-studio-g10", 45990000, 50990000, "laptop-do-hoa", "hp,zbook,workstation", "Intel Core i7-13800H", "32GB DDR5", "1TB NVMe", "RTX A1000 6GB", "gaming"],
  ["Dell Precision 5680", "dell-precision-5680", 52990000, 58990000, "laptop-do-hoa", "dell,precision,workstation", "Intel Core i7-13700H", "32GB DDR5", "1TB NVMe", "RTX A2000 8GB", "gaming"],
  ["ASUS ProArt Studiobook 16", "asus-proart-studiobook-16", 48990000, 54990000, "laptop-do-hoa", "asus,proart,designer", "Intel Core i9-13980HX", "32GB DDR5", "1TB NVMe", "RTX 4070 8GB", "gaming"],
  ["Lenovo ThinkPad P16 Gen 2", "lenovo-thinkpad-p16-gen-2", 55990000, 62990000, "laptop-do-hoa", "lenovo,thinkpad,workstation", "Intel Core i7-13850HX", "32GB DDR5", "1TB NVMe", "RTX A2000 8GB", "gaming"],
  ["Chuột Logitech G102 LIGHTSYNC", "chuot-logitech-g102-lightsync", 450000, 600000, "chuot-gaming", "logitech,mouse,gaming", "Cảm biến quang học", "—", "—", "DPI 8.000", "accessory"],
  ["Bàn phím cơ DareU EK87", "ban-phim-co-dareu-ek87", 790000, 990000, "ban-phim-co", "dareu,keyboard,mechanical", "Switch Brown", "87 phím", "—", "LED RGB", "accessory"],
].map(([name, slug, price, originalPrice, categorySlug, tags, cpu, ram, ssd, gpu, imageKey, meta]) => ({ name: String(name), slug: String(slug), price: Number(price), originalPrice: Number(originalPrice), categorySlug: String(categorySlug), tags: String(tags), specs: { CPU: String(cpu), RAM: String(ram), SSD: String(ssd), GPU: String(gpu) }, image: imageUrls[String(imageKey) as keyof typeof imageUrls], meta: (meta as Record<string, unknown>) || {} }));

async function main() {
  console.log("Seeding categories and products...");
  const categories = new Map<string, { id: string }>();

  for (const input of categoryInputs) {
    const parent = input.parentSlug ? categories.get(input.parentSlug) : undefined;
    const category = await prisma.category.upsert({
      where: { slug: input.slug },
      update: { name: input.name, description: input.description, parentId: parent?.id ?? null },
      create: { name: input.name, slug: input.slug, description: input.description, parentId: parent?.id ?? null },
      select: { id: true },
    });
    categories.set(input.slug, category);
  }

  for (const input of productInputs) {
    const category = categories.get(input.categorySlug);
    if (!category) throw new Error(`Missing category: ${input.categorySlug}`);
    await prisma.product.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name, description: `${input.name} chính hãng, bảo hành 12 tháng tại CITILAP.VN.`,
        contentHtml: `<h2>${input.name}</h2><p>Sản phẩm chính hãng, hiệu năng ổn định và được kiểm tra kỹ trước khi giao.</p><ul><li>Bảo hành 12 tháng</li><li>Hỗ trợ kỹ thuật miễn phí</li></ul>`,
        brand: (input.meta.brand as string) || null, model: (input.meta.model as string) || null, series: (input.meta.series as string) || null,
        warranty: (input.meta.warranty as string) || "12 tháng chính hãng", condition: (input.meta.condition as string) || "Mới 100%", origin: (input.meta.origin as string) || null,
        seoTitle: (input.meta.seoTitle as string) || null, seoDescription: (input.meta.seoDescription as string) || null, canonicalSlug: null,
        isFeatured: Boolean(input.meta.isFeatured), isNewArrival: Boolean(input.meta.isNewArrival), isFlashSale: Boolean(input.meta.isFlashSale), isBestSeller: false,
        allowBackorder: false, minOrderQty: 1, maxOrderQty: null, lowestPrice30d: (input.meta.lowestPrice30d as number) || null, publishAt: null, unpublishAt: null,
        price: input.price, originalPrice: input.originalPrice, images: JSON.stringify([input.image]),
        stock: 10, status: "active", tags: input.tags, specs: JSON.stringify(input.specs), categoryId: category.id,
      },
      create: {
        name: input.name, slug: input.slug, description: `${input.name} chính hãng, bảo hành 12 tháng tại CITILAP.VN.`,
        contentHtml: `<h2>${input.name}</h2><p>Sản phẩm chính hãng, hiệu năng ổn định và được kiểm tra kỹ trước khi giao.</p><ul><li>Bảo hành 12 tháng</li><li>Hỗ trợ kỹ thuật miễn phí</li></ul>`,
        brand: (input.meta.brand as string) || null, model: (input.meta.model as string) || null, series: (input.meta.series as string) || null,
        warranty: (input.meta.warranty as string) || "12 tháng chính hãng", condition: (input.meta.condition as string) || "Mới 100%", origin: (input.meta.origin as string) || null,
        seoTitle: (input.meta.seoTitle as string) || null, seoDescription: (input.meta.seoDescription as string) || null, canonicalSlug: null,
        isFeatured: Boolean(input.meta.isFeatured), isNewArrival: Boolean(input.meta.isNewArrival), isFlashSale: Boolean(input.meta.isFlashSale), isBestSeller: false,
        allowBackorder: false, minOrderQty: 1, maxOrderQty: null, lowestPrice30d: (input.meta.lowestPrice30d as number) || null, publishAt: null, unpublishAt: null,
        price: input.price, originalPrice: input.originalPrice, images: JSON.stringify([input.image]),
        stock: 10, status: "active", tags: input.tags, specs: JSON.stringify(input.specs), categoryId: category.id,
      },
    });
  }

  const legion = await prisma.product.findUniqueOrThrow({ where: { slug: "lenovo-legion-5-15arh7h" } });
  const legionVariants = [
    { sku: "LEGION5-R7-16-512-3050", name: "Ryzen 7 / 16GB / 512GB / RTX 3050 Ti", options: { CPU: "Ryzen 7 6800H", RAM: "16GB", SSD: "512GB", GPU: "RTX 3050 Ti" }, price: 28490000, originalPrice: 32990000, stock: 8 },
    { sku: "LEGION5-R7-16-1TB-3050", name: "Ryzen 7 / 16GB / 1TB / RTX 3050 Ti", options: { CPU: "Ryzen 7 6800H", RAM: "16GB", SSD: "1TB", GPU: "RTX 3050 Ti" }, price: 29990000, originalPrice: 34490000, stock: 5 },
    { sku: "LEGION5-R7-32-1TB-3050", name: "Ryzen 7 / 32GB / 1TB / RTX 3050 Ti", options: { CPU: "Ryzen 7 6800H", RAM: "32GB", SSD: "1TB", GPU: "RTX 3050 Ti" }, price: 31490000, originalPrice: 36990000, stock: 3 },
  ];
  for (const variant of legionVariants) {
    await prisma.productVariant.upsert({ where: { sku: variant.sku }, update: { ...variant, options: JSON.stringify(variant.options), productId: legion.id, status: "active" }, create: { ...variant, options: JSON.stringify(variant.options), productId: legion.id, status: "active" } });
  }

  const user = await prisma.user.upsert({
    where: { email: "demo@citilap.vn" },
    update: { name: "Khách hàng Demo", phone: "0901234567" },
    create: { email: "demo@citilap.vn", password: "demo-password", name: "Khách hàng Demo", phone: "0901234567", role: "USER", tier: "Bạc" },
  });
  const demoProduct = await prisma.product.findUniqueOrThrow({ where: { slug: "lenovo-legion-5-15arh7h" } });
  const existingOrder = await prisma.order.findFirst({ where: { userId: user.id, shippingAddress: "Demo seed - Hà Nội" } });
  if (!existingOrder) {
    await prisma.order.create({
      data: {
        userId: user.id,
        customerName: "Khách hàng Demo",
        customerPhone: "0901234567",
        status: "COMPLETED",
        totalAmount: demoProduct.price,
        subtotalAmount: demoProduct.price,
        shippingAddress: "Demo seed - Hà Nội",
        paymentMethod: "COD",
        paymentStatus: "COMPLETED",
        items: {
          create: [{
            productId: demoProduct.id,
            productName: demoProduct.name,
            productNameSnapshot: demoProduct.name,
            quantity: 1,
            price: demoProduct.price,
            priceSnapshot: demoProduct.price,
            lineTotal: demoProduct.price,
          }],
        },
      },
    });
  }
  console.log(`Seeded ${categoryInputs.length} categories and ${productInputs.length} products.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
