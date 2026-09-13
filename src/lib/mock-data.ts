// Mock data for when database is not configured
export const mockCategories = [
  { id: "cat-1", name: "Laptop Gaming", slug: "laptop-gaming", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-2", name: "Laptop Văn Phòng", slug: "laptop-van-phong", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-3", name: "Laptop Đồ Hoạ", slug: "laptop-do-hoa", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-4", name: "Apple - Macbook", slug: "macbook", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-5", name: "Linh Kiện - Phụ Kiện", slug: "linh-kien", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-6", name: "Laptop Like New", slug: "laptop-cu", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-7", name: "Microsoft Surface", slug: "surface", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-8", name: "PC - Máy tính để bàn", slug: "pc", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-9", name: "Linh kiện PC", slug: "linh-kien-pc", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "cat-10", name: "Camera", slug: "camera", parentId: null, createdAt: new Date(), updatedAt: new Date() },
];

export const mockProducts = [
  { id: "p-1", name: "Lenovo Legion 5 Pro 16ARX8", slug: "lenovo-legion-5-pro", description: "Laptop Gaming Lenovo Legion 5 Pro", price: 32990000, originalPrice: 37990000, images: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800", stock: 10, status: "active", specs: '{"cpu":"Ryzen 7 7845HX","ram":"16GB","ssd":"512GB","display":"16 WQXGA 165Hz"}', tags: "gaming,lenovo,legion", categoryId: "cat-1", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-2", name: "Asus ROG Strix G16 G614JI", slug: "asus-rog-strix-g16", description: "Laptop Gaming Asus ROG Strix", price: 39990000, originalPrice: 44990000, images: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800", stock: 8, status: "active", specs: '{"cpu":"i9 13980HX","ram":"32GB","ssd":"1TB","display":"16 QHD 240Hz"}', tags: "gaming,asus,rog", categoryId: "cat-1", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-3", name: "Acer Predator Helios 16 PH16-71", slug: "acer-predator-helios-16", description: "Laptop Gaming Acer Predator", price: 35990000, originalPrice: 39990000, images: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800", stock: 5, status: "active", specs: '{"cpu":"i7 13700HX","ram":"16GB","ssd":"512GB","display":"16 WQXGA 165Hz"}', tags: "gaming,acer,predator", categoryId: "cat-1", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-4", name: "Dell XPS 15 9530", slug: "dell-xps-15", description: "Laptop Văn Phòng Dell XPS", price: 42990000, originalPrice: 47990000, images: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800", stock: 12, status: "active", specs: '{"cpu":"i7 13700H","ram":"16GB","ssd":"512GB","display":"15.6 FHD+"}', tags: "vanphong,dell,xps", categoryId: "cat-2", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-5", name: "Lenovo ThinkPad X1 Carbon Gen 11", slug: "lenovo-thinkpad-x1", description: "Laptop Văn Phòng Lenovo ThinkPad", price: 35990000, originalPrice: 39990000, images: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800", stock: 15, status: "active", specs: '{"cpu":"i7 1365U","ram":"16GB","ssd":"512GB","display":"14 WUXGA"}', tags: "vanphong,lenovo,thinkpad", categoryId: "cat-2", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-6", name: "MacBook Air M3 15 inch", slug: "macbook-air-m3-15", description: "Apple MacBook Air M3", price: 37990000, originalPrice: null, images: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800", stock: 20, status: "active", specs: '{"cpu":"Apple M3","ram":"8GB","ssd":"256GB","display":"15.3 Liquid Retina"}', tags: "apple,macbook,air", categoryId: "cat-4", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-7", name: "MacBook Pro M3 Pro 14 inch", slug: "macbook-pro-m3-14", description: "Apple MacBook Pro M3 Pro", price: 49990000, originalPrice: null, images: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800", stock: 10, status: "active", specs: '{"cpu":"Apple M3 Pro","ram":"18GB","ssd":"512GB","display":"14 Liquid Retina XDR"}', tags: "apple,macbook,pro", categoryId: "cat-4", createdAt: new Date(), updatedAt: new Date() },
  { id: "p-8", name: "HP ZBook Studio G10", slug: "hp-zbook-studio", description: "Laptop Đồ Hoạ HP ZBook", price: 45990000, originalPrice: 50990000, images: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800", stock: 6, status: "active", specs: '{"cpu":"i7 13800H","ram":"32GB","ssd":"1TB","display":"15.6 4K OLED"}', tags: "dohoa,hp,zbook", categoryId: "cat-3", createdAt: new Date(), updatedAt: new Date() },
];

export const mockOrders = [
  { id: "ord-1", userId: "user-1", status: "Chờ xác nhận", totalAmount: 32990000, shippingAddress: "Hà Nội", paymentMethod: "COD", paymentStatus: "Chưa thanh toán", createdAt: new Date(), updatedAt: new Date() },
  { id: "ord-2", userId: "user-2", status: "Đang vận chuyển", totalAmount: 49990000, shippingAddress: "TP.HCM", paymentMethod: "Chuyển khoản", paymentStatus: "Đã thanh toán", createdAt: new Date(), updatedAt: new Date() },
  { id: "ord-3", userId: "user-3", status: "Đã hoàn thành", totalAmount: 37990000, shippingAddress: "Đà Nẵng", paymentMethod: "COD", paymentStatus: "Đã thanh toán", createdAt: new Date(), updatedAt: new Date() },
];

export const mockUsers = [
  { id: "user-1", email: "nguyenvan@example.com", password: "", name: "Nguyễn Văn A", phone: "0901234567", role: "USER", tier: "Vàng", totalSpend: 120000000, createdAt: new Date(), updatedAt: new Date() },
  { id: "user-2", email: "tranthib@example.com", password: "", name: "Trần Thị B", phone: "0912345678", role: "USER", tier: "Bạc", totalSpend: 50000000, createdAt: new Date(), updatedAt: new Date() },
  { id: "user-3", email: "admin@citilap.vn", password: "", name: "Admin", phone: "0899188186", role: "ADMIN", tier: "Vàng", totalSpend: 0, createdAt: new Date(), updatedAt: new Date() },
];
