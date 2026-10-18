import Link from 'next/link';
export const metadata = {title:'Hỗ trợ tra cứu đơn hàng', robots:{index:false,follow:true}};

export default function OrderTrackingPage() {
  return <main className="container mx-auto max-w-2xl px-4 py-12 space-y-5">
    <h1 className="text-2xl font-bold">Hỗ trợ tra cứu đơn hàng</h1>
    <p>Tra cứu tự động bằng mã đơn và số điện thoại chưa được hỗ trợ. Trang này không xác nhận trạng thái hoặc sự tồn tại của đơn hàng.</p>
    <p>Mở liên kết xác nhận đã nhận sau khi đặt hàng. Nếu không còn liên kết, liên hệ cửa hàng và cung cấp mã đơn để được hỗ trợ.</p>
    <Link href="/lien-he" className="underline">Xem hotline và showroom hiện tại</Link>
  </main>;
}
