import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import "dotenv/config"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log(`Start seeding ...`)

  // Create Categories
  const catGaming = await prisma.category.upsert({
    where: { slug: 'laptop-gaming' },
    update: {},
    create: {
      name: 'Laptop Gaming',
      slug: 'laptop-gaming',
    },
  })

  const catOffice = await prisma.category.upsert({
    where: { slug: 'laptop-van-phong' },
    update: {},
    create: {
      name: 'Laptop Văn phòng',
      slug: 'laptop-van-phong',
    },
  })

  const catPhuKien = await prisma.category.upsert({
    where: { slug: 'phu-kien' },
    update: {},
    create: {
      name: 'Phụ kiện',
      slug: 'phu-kien',
    },
  })

  const catChuotGaming = await prisma.category.upsert({
    where: { slug: 'chuot-gaming' },
    update: {},
    create: {
      name: 'Chuột Gaming',
      slug: 'chuot-gaming',
      parentId: catPhuKien.id,
    },
  })

  // Create Products
  const prod1 = await prisma.product.upsert({
    where: { slug: 'lenovo-legion-5-15arh7h' },
    update: {},
    create: {
      name: 'Lenovo Legion 5 15ARH7H',
      slug: 'lenovo-legion-5-15arh7h',
      description: 'Lenovo Legion 5 15ARH7H mang đến sức mạnh ấn tượng...',
      price: 28490000,
      originalPrice: 32000000,
      images: '["https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=600"]',
      stock: 15,
      status: 'active',
      tags: 'gaming,rtx3050',
      specs: JSON.stringify([
        { name: 'CPU', value: 'AMD Ryzen 7 6800H' },
        { name: 'RAM', value: '16GB DDR5 4800MHz' },
        { name: 'Màn hình', value: '15.6" FHD (1920x1080) IPS 165Hz' },
        { name: 'VGA', value: 'NVIDIA GeForce RTX 3050 Ti 4GB GDDR6' }
      ]),
      categoryId: catGaming.id,
    },
  })

  const prod2 = await prisma.product.upsert({
    where: { slug: 'macbook-pro-14-m3' },
    update: {},
    create: {
      name: 'MacBook Pro 14 M3',
      slug: 'macbook-pro-14-m3',
      description: 'MacBook Pro 14 inch mới nhất với chip M3 siêu mạnh mẽ...',
      price: 39990000,
      originalPrice: 42000000,
      images: '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600"]',
      stock: 8,
      status: 'active',
      tags: 'macbook,m3,apple',
      specs: JSON.stringify([
        { name: 'CPU', value: 'Apple M3 8-core' },
        { name: 'RAM', value: '8GB Unified Memory' },
        { name: 'Màn hình', value: '14.2" Liquid Retina XDR' },
      ]),
      categoryId: catOffice.id,
    },
  })

  const prod3 = await prisma.product.upsert({
    where: { slug: 'chuot-logitech-g102' },
    update: {},
    create: {
      name: 'Chuột Logitech G102',
      slug: 'chuot-logitech-g102',
      description: 'Chuột chơi game Logitech G102 LIGHTSYNC RGB...',
      price: 450000,
      originalPrice: 600000,
      images: '["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600"]',
      stock: 50,
      status: 'active',
      tags: 'mouse,gaming,logitech',
      specs: JSON.stringify([
        { name: 'Cảm biến', value: 'Quang học' },
        { name: 'DPI', value: '200 - 8000' },
        { name: 'Kết nối', value: 'Có dây (USB)' },
      ]),
      categoryId: catChuotGaming.id,
    },
  })

  // Create Users
  const user1 = await prisma.user.upsert({
    where: { email: 'nguyenvana@gmail.com' },
    update: {},
    create: {
      email: 'nguyenvana@gmail.com',
      password: 'hashed_password_here',
      name: 'Nguyễn Văn A',
      phone: '0988123456',
      role: 'USER',
      tier: 'Vàng',
      totalSpend: 28490000,
    }
  })
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@citilap.com' },
    update: {},
    create: {
      email: 'admin@citilap.com',
      password: 'hashed_password_here',
      name: 'Admin CitiLap',
      role: 'ADMIN',
      tier: 'Vàng',
    }
  })

  // Create Orders
  const order1 = await prisma.order.create({
    data: {
      userId: user1.id,
      status: 'Đang vận chuyển',
      totalAmount: 28490000,
      shippingAddress: '123 Đường Nguyễn Hữu Cảnh, Quận Bình Thạnh, TP. Hồ Chí Minh',
      paymentMethod: 'COD',
      paymentStatus: 'Chưa thanh toán',
      items: {
        create: [
          {
            productId: prod1.id,
            quantity: 1,
            price: 28490000
          }
        ]
      }
    }
  })

  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
