import Link from 'next/link';
export const metadata = {title:'Hỗ trợ khách hàng', robots:{index:false,follow:true}};

export default function ProfilePage() {
  return <main className="container mx-auto max-w-2xl px-4 py-12 space-y-5">
    <h1 className="text-2xl font-bold">Hỗ trợ khách hàng</h1>
    <p>Website chưa cung cấp tài khoản khách hàng và lịch sử mua hàng trực tuyến. Bạn có thể mua hàng không cần đăng ký.</p>
    <p>Để kiểm tra đơn đã đặt, mở liên kết xác nhận được cấp sau khi đặt hàng hoặc liên hệ cửa hàng kèm mã đơn.</p>
    <Link href="/lien-he" className="underline">Liên hệ cửa hàng</Link>
    <p><Link href="/wishlist" className="underline">Sản phẩm yêu thích trên thiết bị này</Link></p>
  </main>;
}
