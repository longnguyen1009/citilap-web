// Clear all existing product reviews and seed 200 realistic, varied Vietnamese customer reviews in local D1.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_REVIEWS = 200;

const FIRST_NAMES = [
  'Nguyễn Minh Tuấn', 'Trần Quang Huy', 'Lê Hoàng Nam', 'Phạm Thảo Vy', 'Đặng Đình Khoa',
  'Vũ Ngọc Anh', 'Bùi Đức Anh', 'Đỗ Bích Ngọc', 'Hoàng Gia Bảo', 'Phan Thanh Tùng',
  'Ngô Khánh Linh', 'Dương Hải Đăng', 'Tạ Quốc Khánh', 'Lý Phương Thảo', 'Trịnh Công Minh',
  'Võ Tiến Đạt', 'Đinh Thu Hà', 'Cao Xuân Trường', 'Lương Nhật Minh', 'Mai Hồng Nhung',
  'Nguyễn Việt Hoàng', 'Trần Anh Dũng', 'Lê Thị Lan Anh', 'Phạm Văn Hiếu', 'Nguyễn Kiều Trang',
  'Đào Mạnh Cường', 'Chu Minh Hiếu', 'Nguyễn Thế Anh', 'Trần Mỹ Duyên', 'Lê Bá Thành',
  'Phùng Trung Kiên', 'Hà Quỳnh Chi', 'Tô Văn Quyết', 'Nguyễn Hữu Phước', 'Đoàn Gia Hân',
  'Nghiêm Đức Thịnh', 'Trương Thanh Hải', 'Nguyễn Trọng Nghĩa', 'Lê Hoài Nam', 'Phạm Minh Châu',
  'Anh Quân (HN)', 'Chị Hương', 'Minh Đức', 'Tuấn Kiệt', 'Hải Yến', 'Khánh Duy',
  'Hoàng Long', 'Ngọc Tú', 'Quốc Việt', 'Thành Đạt',
];

const GAMING_5 = [
  'Lấy máy ở showroom Tạ Quang Bửu, anh kỹ thuật mở hộp cho tự kiểm tra màn hình với test nhiệt độ luôn. Chơi Valorant với CS2 rất mượt, màn hình tần số quét cao nhìn sướng mắt.',
  'Đã dùng gần 2 tuần để cày game với học lập trình. Tản nhiệt ổn hơn mình nghĩ, kê thêm đế tản nhiệt chơi AAA 2-3 tiếng máy chỉ ấm nhẹ ở phần trên bàn phím.',
  'Máy đẹp, build chắc tay, đúng hàng chuẩn như tư vấn. Mình đặt giao nội thành Hà Nội tầm 2 tiếng là có anh shipper mang qua, còn được cài sẵn phần mềm cơ bản.',
  'Cấu hình này tầm giá quá hợp lý. Test render video Premiere với chơi Cyberpunk đều ngon lành, không bị tụt xung. Các bạn nhân viên tư vấn có tâm, không chèo kéo.',
  'Mình sinh viên Bách Khoa ghé ngay Tạ Quang Bửu xem máy, ưng là chốt luôn. Bàn phím gõ nảy, màn đẹp 100% sRGB nên làm đồ họa nhẹ cũng chuẩn màu.',
  'Đóng gói ship tỉnh cực kỳ kỹ, bọc chống sốc 2 lớp. Mở máy lên là dùng ngay, kiểm tra serial trùng hộp đầy đủ. Rất yên tâm khi mua ở CitiLap.',
  'Lần đầu mua laptop gaming nên hỏi hơi nhiều nhưng shop giải đáp rất kiên nhẫn. Máy chạy êm ở chế độ văn phòng, bật Performance lên chiến game FPS cao ổn định.',
  'Ưng nhất quả màn hình sắc nét với tần số quét cao, lướt web thôi đã thấy mượt hơn hẳn máy cũ. Tặng kèm túi chống sốc và chuột dùng khá ổn.',
  'Nâng cấp thêm RAM ngay lúc mua, kỹ thuật làm nhanh gọn và giữ nguyên bảo hành. Dùng cả tuần nay chưa thấy lỗi vặt gì, đáng tiền.',
  'Cấu hình khỏe, khởi động Windows chỉ mất vài giây. Chơi FC Online, GTA V mượt re. Shop hỗ trợ vệ sinh máy miễn phí sau này nữa nên khá an tâm.',
];

const GAMING_4 = [
  'Máy mạnh, chơi game mượt không chê vào đâu được. Trừ nhẹ 1 điểm vì cục sạc hơi to và nặng khi mang đi học, nhưng dòng gaming con nào cũng vậy. Shop tư vấn nhiệt tình.',
  'Hiệu năng tốt, màn hình đẹp. Khi chơi game nặng bật quạt max thì tiếng quạt hơi rõ một chút, đeo tai nghe vào là hết nghe. Giao hàng nhanh, đóng gói cẩn thận.',
  'Máy ổn định, đúng cấu hình cam kết. Hôm mình đặt trời mưa nên giao chậm hơn hẹn tầm 1 tiếng nhưng bạn giao hàng gọi báo trước rất lịch sự.',
  'Build máy chắc chắn, chiến game ngon. Pin dùng văn phòng được khoảng 3-4 tiếng, chơi game thì vẫn phải cắm sạc. Tổng thể rất hài lòng với mức giá tại CitiLap.',
];

const OFFICE_5 = [
  'Mua cho em gái học đại học, máy mỏng nhẹ mang đi học cả ngày không bị mỏi vai. Màn hình sáng rõ, bàn phím gõ rất êm tay.',
  'Mình làm kế toán mở nhiều file Excel nặng và hàng chục tab Chrome vẫn chạy trơn tru, không bị lag. Pin dùng họp online với làm việc văn phòng được gần cả buổi.',
  'Ghé showroom xem trực tiếp thấy máy ngoài đẹp hơn trên ảnh. Nhân viên hỗ trợ cài đầy đủ Office, Unikey và chuyển dữ liệu từ máy cũ sang rất nhanh.',
  'Thiết kế thanh lịch, mang đi gặp khách hàng nhìn rất chuyên nghiệp. Khởi động nhanh, quạt chạy gần như không nghe tiếng.',
  'Đặt hàng online ship về Bắc Ninh hôm trước hôm sau nhận được. Kiểm tra ngoại hình nguyên vẹn, hóa đơn và phiếu bảo hành rõ ràng.',
  'Máy gọn nhẹ, cổng kết nối đủ dùng khỏi cần mua thêm hub lỉnh kỉnh. Webcam rõ nét họp Zoom/Teams tốt. Rất đáng mua trong tầm giá.',
  'Dùng được hơn 3 tuần thấy cực kỳ ổn định, máy mát rượi khi làm việc văn phòng. Cảm ơn đội ngũ CitiLap đã tư vấn đúng nhu cầu, đỡ tốn tiền mua cấu hình dư.',
  'Màn hình chống chói làm việc dưới đèn văn phòng không bị lóa mắt. Touchpad mượt, gõ văn bản lâu rất thoải mái.',
  'Mua làm quà cho con vào năm nhất, shop cài sẵn phần mềm học tập và hướng dẫn cách bảo quản pin rất chu đáo. Chấm 5 sao cho dịch vụ.',
  'So sánh vài nơi rồi chốt bên CitiLap vì giá tốt và có sẵn hàng để test trực tiếp. Máy chạy mượt, pin trâu, rất ưng ý.',
];

const OFFICE_4 = [
  'Máy mỏng nhẹ, chạy văn phòng mượt mà, thiết kế đẹp. Loa ngoài ở mức đủ nghe trong phòng yên tĩnh chứ không quá lớn. Shop phục vụ nhanh nhẹn.',
  'Hài lòng về độ hoàn thiện và bàn phím gõ thích. Chỉ tiếc là màu mình thích ban đầu hết hàng phải đổi sang màu khác, nhưng nhìn thực tế cũng rất sang.',
  'Máy dùng tốt, pin ổn. Vỏ hơi dễ bám vân tay một chút nên cần lau thường xuyên, còn lại hiệu năng và dịch vụ bảo hành của CitiLap đều rất ổn.',
];

const WORKSTATION_5 = [
  'Mình làm kiến trúc dùng AutoCAD, Revit và SketchUp hằng ngày, máy chạy rất ổn định, xoay file 3D nặng không bị giật. Màn hình chuẩn màu làm việc rất sướng.',
  'Cần máy trạm bền bỉ để chạy SolidWorks và render cả đêm nên chọn dòng này. Test tải nặng tại showroom thấy nhiệt độ kiểm soát rất tốt.',
  'Hiệu năng đồ họa vượt mong đợi, xuất video 4K trên Premiere nhanh hơn hẳn máy cũ của mình. Nhân viên CitiLap am hiểu phần mềm kỹ thuật nên tư vấn chuẩn.',
  'Build vỏ cứng cáp đúng chất workstation, cổng kết nối đầy đủ cắm 2 màn hình rời chạy ngon lành. Bảo hành rõ ràng, yên tâm làm dự án dài hạn.',
  'Đã mua máy thứ 2 cho công ty thiết kế ở CitiLap. Máy chuẩn chỉnh, giao nhanh, hỗ trợ xuất chứng từ đầy đủ.',
];

const WORKSTATION_4 = [
  'Chạy CAD, 3ds Max rất mượt, màn hình đẹp chuẩn màu. Trọng lượng hơi đầm tay một chút nhưng đổi lại tản nhiệt cực kỳ ổn định khi render lâu.',
  'Hiệu năng tốt, đúng yêu cầu công việc kỹ thuật. Thời lượng pin khi không cắm sạc ở mức trung bình, chủ yếu cắm nguồn làm việc tại bàn thì tuyệt vời.',
];

const MAC_5 = [
  'Máy nguyên seal đẹp không tì vết, pin dùng thực tế cả ngày làm việc không cần mang sạc. Màn Retina hiển thị cực kỳ sắc nét.',
  'Chuyển từ Windows sang MacBook được bạn nhân viên CitiLap hướng dẫn thao tác và cài bộ ứng dụng cơ bản rất nhiệt tình. Máy chạy im phăng phắc, mát lạnh.',
  'Dựng clip ngắn trên CapCut, Final Cut mượt mà, xuất file nhanh. Thiết kế nhôm nguyên khối cầm sang và chắc tay.',
  'Kiểm tra số serial chính hãng đầy đủ, bảo hành minh bạch. Giá bên CitiLap mềm hơn nhiều hệ thống lớn mà dịch vụ chăm sóc khách hàng lại rất nhanh.',
];

const MAC_4 = [
  'Máy quá mượt và pin rất lâu. Chỉ có điều ít cổng USB-A nên phải mua kèm thêm cái hub Type-C tại shop luôn. Trải nghiệm mua hàng rất tốt.',
];

const ACC_5 = [
  'Phụ kiện chính hãng, hoàn thiện chắc chắn, dùng rất mượt và đúng mô tả. Mua kèm laptop nên được hỗ trợ giao luôn trong ngày.',
  'Hàng chuẩn, đóng gói cẩn thận, cắm vào nhận ngay không cần cài đặt rườm rà. Giá hợp lý hơn nhiều nơi.',
  'Dùng rất ổn định, thiết kế gọn gàng đẹp mắt, phù hợp góc làm việc. Nhân viên tư vấn đúng loại tương thích với máy của mình.',
];

const ACC_4 = [
  'Chất lượng tốt trong tầm giá, dùng ổn định. Hộp ngoài hơi móp nhẹ góc do vận chuyển nhưng sản phẩm bên trong nguyên vẹn.',
];

const EXTRA_SNIPPETS = [
  ' Sẽ giới thiệu bạn bè qua ủng hộ shop.',
  ' Rất hài lòng với cách làm việc minh bạch của CitiLap.',
  ' Nói chung là đáng tiền trong phân khúc này.',
  ' Sau này có nhu cầu nâng cấp chắc chắn quay lại.',
  ' Mọi thứ từ máy tới thái độ phục vụ đều ổn áp.',
  '',
  '',
  '',
];

const d1Root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = readdirSync(d1Root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='ContactSubmission'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(d1Root, dbFile));
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');

const cats = new Map(db.prepare('SELECT id, parentId FROM Category').all().map((c) => [c.id, c]));
const rootOf = (id) => {
  let c = cats.get(id);
  while (c?.parentId) c = cats.get(c.parentId);
  return c?.id || id;
};

const products = db.prepare(`
  SELECT p.id, p.name, p.categoryId, p.isFeatured, p.isBestSeller, p.isNewArrival,
         json_extract(s.published, '$.template') template
  FROM Product p JOIN ProductStudio s ON s.productId=p.id
  WHERE p.deletedAt IS NULL AND p.status='ACTIVE'
  ORDER BY p.isFeatured DESC, p.isBestSeller DESC, p.isNewArrival DESC, p.createdAt DESC
`).all();

// Spread 200 reviews across ~95 top/diverse products (1-3 reviews per product)
const targetProducts = products.slice(0, Math.min(95, products.length));

db.exec('BEGIN IMMEDIATE');
try {
  db.exec("DELETE FROM ContactEvent WHERE contactId IN (SELECT id FROM ContactSubmission WHERE message LIKE '[Đánh giá%');");
  const delRes = db.prepare("DELETE FROM ContactSubmission WHERE message LIKE '[Đánh giá%'").run();
  console.log('Deleted old reviews:', delRes.changes);

  const now = Date.now();
  let inserted = 0;
  for (let i = 0; i < TARGET_REVIEWS; i++) {
    const prod = targetProducts[i % targetProducts.length];
    const rootId = rootOf(prod.categoryId);
    const isAcc = prod.template && prod.template !== 'LAPTOP';
    const is4Star = i % 7 === 3; // ~14% 4-star, ~86% 5-star
    const rating = is4Star ? 4 : 5;

    let pool;
    if (isAcc) pool = is4Star ? ACC_4 : ACC_5;
    else if (rootId === 'cat-gaming') pool = is4Star ? GAMING_4 : GAMING_5;
    else if (rootId === 'cat-do-hoa') pool = is4Star ? WORKSTATION_4 : WORKSTATION_5;
    else if (rootId === 'cat-macbook') pool = is4Star ? MAC_4 : MAC_5;
    else pool = is4Star ? OFFICE_4 : OFFICE_5;

    const hashNum = parseInt(createHash('md5').update(`${prod.id}-${i}`).digest('hex').slice(0, 8), 16);
    const reviewer = FIRST_NAMES[(i * 7 + hashNum) % FIRST_NAMES.length];
    const baseComment = pool[(i + hashNum) % pool.length];
    const extra = EXTRA_SNIPPETS[(i * 3 + hashNum) % EXTRA_SNIPPETS.length];
    const comment = (baseComment + extra).trim();

    const phonePrefixes = ['098', '097', '096', '091', '094', '090', '093', '035', '038', '086'];
    const phone = phonePrefixes[i % phonePrefixes.length] + String(1000000 + ((hashNum + i * 7919) % 8999999));
    const daysAgo = 1 + (i % 58);
    const hoursOffset = (hashNum % 14) + 8;
    const createdDate = new Date(now - daysAgo * 86400_000 - hoursOffset * 3600_000);
    const handledDate = new Date(createdDate.getTime() + 1800_000);
    const createdIso = createdDate.toISOString();
    const handledIso = handledDate.toISOString();

    const message = `[Đánh giá ${rating}⭐ sản phẩm: ${prod.name}]: ${comment}`;
    const id = randomUUID();

    db.prepare(`INSERT INTO ContactSubmission(id, name, phone, email, message, status, createdAt, updatedAt, handledAt, handledBy, revision)
      VALUES(?, ?, ?, NULL, ?, 'HANDLED', ?, ?, ?, 'CitiLap Admin', 2)`)
      .run(id, reviewer, phone, message, createdIso, handledIso, handledIso);
    inserted++;
  }

  db.exec('COMMIT');
  console.log(`Seeded ${inserted} realistic reviews across ${targetProducts.length} products`);
  console.log('Rating breakdown:', {
    fiveStar: db.prepare("SELECT count(*) n FROM ContactSubmission WHERE status='HANDLED' AND message LIKE '[Đánh giá 5%'").get().n,
    fourStar: db.prepare("SELECT count(*) n FROM ContactSubmission WHERE status='HANDLED' AND message LIKE '[Đánh giá 4%'").get().n,
  });
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
} finally {
  db.close();
}
