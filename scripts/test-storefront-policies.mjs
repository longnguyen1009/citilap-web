import assert from 'node:assert/strict';

const base = 'http://localhost:3001';
const cases = [
  ['/cau-hoi-thuong-gap', 'Gửi đơn có nghĩa đã thanh toán', 'dQw4w9WgXcQ'],
  ['/huong-dan-mua-hang', 'Thêm vào giỏ yêu cầu', 'MUA NGAY'],
  ['/chinh-sach-doi-tra', 'Chuẩn bị yêu cầu hỗ trợ', 'hoàn tiền 100%'],
  ['/chinh-sach-van-chuyen', 'Kiểm tra phí giao hàng và tổng tiền', 'mức phí sẽ hiển thị là'],
  ['/chinh-sach-bao-mat', 'Thống kê tương tác mặc định tắt', '<strong>2 năm</strong>'],
  ['/lien-he', '09:00', 'Hỗ trợ 24/7'],
];
for (const [path, expected, forbidden] of cases) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert(html.includes(expected), `${path}: missing current guidance`);
  assert(!html.includes(forbidden), `${path}: stale claim`);
  assert(html.includes('href="/cau-hoi-thuong-gap"'), `${path}: FAQ discoverability`);
  console.log('PASS', path);
}
