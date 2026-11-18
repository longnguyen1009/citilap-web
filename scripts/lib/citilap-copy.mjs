// CitiLap editorial copy generator: original product descriptions built from specs (no laptopnew text).
import { createHash } from 'node:crypto';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (seed, arr, salt = '') => arr[parseInt(createHash('md5').update(seed + salt).digest('hex').slice(0, 8), 16) % arr.length];

export function productKind(rootId, template) {
  if (template && template !== 'LAPTOP') return 'acc';
  return { 'cat-gaming': 'gaming', 'cat-do-hoa': 'ws', 'cat-macbook': 'mac' }[rootId] || 'office';
}

const INTRO = {
  gaming: [
    (n, b) => `<strong>${n}</strong> là lựa chọn mà đội kỹ thuật CitiLap hay gợi ý cho game thủ muốn chơi mượt các tựa game eSports lẫn AAA mà không phải đầu tư quá tay. Máy giữ đúng tinh thần gaming của ${b}: cấu hình khỏe, tản nhiệt chắc tay và dễ nâng cấp về sau.`,
    (n, b) => `Nếu bạn đang tìm một chiếc laptop chiến game ổn định cho cả ngày dài, <strong>${n}</strong> đáng để cân nhắc. Đây là mẫu máy ${b} cân bằng tốt giữa hiệu năng, nhiệt độ và giá thành – đúng tiêu chí CitiLap ưu tiên khi chọn hàng về showroom.`,
    (n, b) => `<strong>${n}</strong> mang tới trải nghiệm gaming đúng chất ${b}: khung hình cao, phản hồi nhanh và đủ sức gánh thêm stream, dựng clip ngắn. Tại CitiLap, máy được test tải nặng trước khi giao để bạn yên tâm "cắm là chiến".`,
  ],
  office: [
    (n, b) => `<strong>${n}</strong> hướng tới người dùng cần một chiếc máy gọn, bền và chạy êm cho công việc hằng ngày. CitiLap đánh giá cao mẫu ${b} này ở sự ổn định – mở máy là làm việc, không phải lăn tăn.`,
    (n, b) => `Với học sinh, sinh viên và dân văn phòng, <strong>${n}</strong> là lựa chọn "đủ dùng mà vẫn dư sức". Máy kế thừa thiết kế tinh gọn của ${b}, pin ổn và hiệu năng mượt cho Office, họp online, duyệt web nhiều tab.`,
    (n, b) => `<strong>${n}</strong> là mẫu laptop ${b} được nhiều khách CitiLap chọn để làm việc lâu dài: nhẹ nhàng khi mang theo, bàn phím gõ thoải mái và cấu hình đủ thoáng cho đa nhiệm.`,
  ],
  ws: [
    (n, b) => `<strong>${n}</strong> thuộc nhóm máy trạm di động dành cho kỹ sư, kiến trúc sư và người làm đồ họa chuyên nghiệp. ${b} tối ưu dòng máy này cho độ ổn định khi render, dựng hình và chạy phần mềm chuyên ngành nhiều giờ liền.`,
    (n, b) => `Khi công việc đòi hỏi AutoCAD, SolidWorks, Revit hay dựng phim 4K, <strong>${n}</strong> là công cụ đáng tin. CitiLap kiểm tra kỹ GPU, nhiệt độ và màn hình trước khi bàn giao để máy sẵn sàng làm việc ngay.`,
  ],
  mac: [
    (n) => `<strong>${n}</strong> mang lại trải nghiệm macOS mượt mà, pin bền và màn hình Retina sắc nét – phù hợp cho cả học tập, sáng tạo nội dung lẫn công việc chuyên nghiệp. CitiLap hỗ trợ cài đặt, chuyển dữ liệu và hướng dẫn sử dụng cho người mới.`,
  ],
  acc: [
    (n, b) => `<strong>${n}</strong> là phụ kiện chính hãng ${b} giúp góc làm việc và chơi game của bạn trọn vẹn hơn. CitiLap chọn sản phẩm này vì độ bền, tính tương thích rộng và mức giá hợp lý.`,
  ],
};

const PERF = {
  gaming: (s, gpu) => `<p>Bộ đôi <strong>${esc(s.CPU || 'CPU hiệu năng cao')}</strong> và <strong>${esc(gpu || 'card đồ họa rời')}</strong> giúp máy xử lý tốt các tựa game phổ biến như Valorant, CS2, LMHT ở thiết lập cao, đồng thời chơi được game AAA ở mức thiết lập hợp lý. ${s.RAM ? `RAM <strong>${esc(s.RAM)}</strong>` : 'RAM dung lượng lớn'} cho phép vừa chơi vừa mở Discord, trình duyệt hay phần mềm stream mà không bị khựng.</p>`,
  office: (s, gpu) => `<p>Với <strong>${esc(s.CPU || 'vi xử lý thế hệ mới')}</strong>${s.RAM ? ` và RAM <strong>${esc(s.RAM)}</strong>` : ''}, máy chạy mượt Word, Excel, PowerPoint, Zoom/Teams cùng hàng chục tab trình duyệt. ${s.SSD ? `Ổ <strong>${esc(s.SSD)}</strong> giúp khởi động và mở ứng dụng chỉ trong vài giây.` : ''} ${gpu ? `Card <strong>${esc(gpu)}</strong>` : 'Đồ họa tích hợp'} đủ cho chỉnh ảnh nhẹ và giải trí.</p>`,
  ws: (s, gpu) => `<p>Trái tim của máy là <strong>${esc(s.CPU || 'CPU hiệu năng cao')}</strong> kết hợp <strong>${esc(gpu || 'GPU chuyên dụng')}</strong> – cấu hình phù hợp cho dựng hình 3D, render và xử lý dữ liệu nặng. ${s.RAM ? `RAM <strong>${esc(s.RAM)}</strong>` : 'RAM lớn'}${s.SSD ? ` cùng ổ <strong>${esc(s.SSD)}</strong>` : ''} giúp làm việc với file dự án dung lượng lớn mà vẫn mượt.</p>`,
  mac: (s) => `<p>Chip <strong>${esc(s.CPU || 'Apple Silicon')}</strong> cùng ${s.RAM ? `<strong>${esc(s.RAM)}</strong>` : 'bộ nhớ hợp nhất'} xử lý nhanh từ công việc văn phòng tới chỉnh ảnh, dựng video trên Final Cut hay Lightroom, trong khi máy vẫn mát và êm.</p>`,
  acc: () => '',
};

const FIT = {
  gaming: ['Game thủ eSports cần FPS cao, phản hồi nhanh.', 'Sinh viên IT, đồ họa cần một máy "cân" cả học lẫn chơi.', 'Streamer, người làm video ngắn muốn một máy đa năng.'],
  office: ['Học sinh, sinh viên cần máy bền, gọn để mang đi học.', 'Nhân viên văn phòng, kế toán, kinh doanh làm việc đa nhiệm.', 'Người dùng gia đình cần máy ổn định cho học online, giải trí.'],
  ws: ['Kỹ sư cơ khí, xây dựng dùng AutoCAD, SolidWorks, Revit.', 'Designer 3D, dựng phim, hậu kỳ màu.', 'Doanh nghiệp cần máy trạm ổn định, bảo hành rõ ràng.'],
  mac: ['Người làm sáng tạo nội dung, thiết kế, chỉnh ảnh.', 'Sinh viên, lập trình viên muốn máy pin bền, êm.', 'Người dùng hệ sinh thái Apple.'],
  acc: ['Người dùng laptop muốn nâng cấp trải nghiệm làm việc, giải trí.', 'Game thủ cần phụ kiện bền bỉ, phản hồi tốt.'],
};

export function buildCitiLapContent({ name, brand, kind, specs, catPath, catName, variantCount = 1 }) {
  const s = Object.fromEntries((specs || []).map((x) => [x.key, x.value]));
  const gpu = s.GPU && !/^(none|n\/a|không|-|—)$/i.test(String(s.GPU).trim()) ? s.GPU : '';
  const n = esc(name), b = esc(brand || 'chính hãng');
  const intro = pick(name, INTRO[kind] || INTRO.office)(n, b);
  const hl = kind === 'acc'
    ? (specs || []).slice(0, 5).map((x) => `<li><strong>${esc(x.key)}:</strong> ${esc(x.value)}</li>`)
    : [
        s.CPU && `<li><strong>CPU:</strong> ${esc(s.CPU)}</li>`,
        gpu && `<li><strong>Card đồ họa:</strong> ${esc(gpu)}</li>`,
        (s.RAM || s.SSD) && `<li><strong>Bộ nhớ:</strong> ${esc([s.RAM, s.SSD].filter(Boolean).join(' · '))}</li>`,
        s['Màn hình'] && `<li><strong>Màn hình:</strong> ${esc(s['Màn hình'])}</li>`,
        s['Trọng lượng'] && `<li><strong>Trọng lượng:</strong> ${esc(s['Trọng lượng'])}</li>`,
      ].filter(Boolean);
  const display = kind !== 'acc' && s['Màn hình']
    ? `<h3>Màn hình &amp; thiết kế</h3><p>Màn hình <strong>${esc(s['Màn hình'])}</strong>${s['Tần số quét'] && !/hz/i.test(s['Màn hình']) ? `, tần số quét ${esc(s['Tần số quét'])}` : ''} ${pick(name, ['cho hình ảnh rõ nét, màu sắc dễ chịu khi làm việc lâu.', 'hiển thị sắc nét, chuyển động mượt và đỡ mỏi mắt.', 'đáp ứng tốt cả công việc lẫn giải trí hằng ngày.'], 'd')} Thân máy ${pick(name, ['hoàn thiện chắc chắn', 'thiết kế gọn gàng', 'mang phong cách đặc trưng của ' + b])}, cổng kết nối đủ dùng cho màn hình rời, chuột, ổ cứng ngoài.</p>`
    : '';
  const variants = variantCount > 1 ? `<p>Sản phẩm có <strong>${variantCount} tùy chọn cấu hình</strong> RAM/SSD – bạn có thể chọn ngay phía trên, giá sẽ cập nhật theo cấu hình.</p>` : '';
  return [
    `<h2>Tổng quan ${n}</h2>`,
    `<p>${intro}</p>`,
    hl.length ? `<h3>Điểm nổi bật</h3><ul>${hl.join('')}</ul>` : '',
    kind !== 'acc' ? `<h3>Hiệu năng thực tế</h3>${PERF[kind](s, gpu)}` : '',
    display,
    variants,
    `<h3>Phù hợp với ai?</h3><ul>${(FIT[kind] || FIT.office).map((x) => `<li>${x}</li>`).join('')}</ul>`,
    `<h3>Mua ${n} tại CitiLap</h3><p>Xem thêm các mẫu cùng dòng tại <a href="${esc(catPath)}">${esc(catName)}</a>. Mua tại CitiLap, bạn được kiểm tra máy trực tiếp, <a href="/chinh-sach-bao-hanh">bảo hành rõ ràng</a>, lỗi 1 đổi 1 trong 7 ngày và hỗ trợ cài đặt phần mềm trọn đời. Ghé showroom 23/40 Tạ Quang Bửu, Hai Bà Trưng hoặc gọi <a href="/lien-he">0899.188.186</a> để được tư vấn.</p>`,
  ].filter(Boolean).join('\n');
}

const PHRASE_REWRITES = [
  [/là một trong những lựa chọn đáng cân nhắc/gi, 'là mẫu máy rất đáng chú ý'],
  [/là sự lựa chọn đáng cân nhắc/gi, 'là lựa chọn sáng giá'],
  [/đáng cân nhắc trong phân khúc/gi, 'rất đáng chọn ở tầm giá'],
  [/trong bài viết dưới đây\.?/gi, 'cùng đội ngũ kỹ thuật CitiLap ngay sau đây.'],
  [/hãy cùng\s+(?:<a[^>]*>)?CitiLap(?:<\/a>)?\s+khám phá chi tiết/gi, 'CitiLap sẽ cùng bạn đánh giá chi tiết'],
  [/hãy cùng\s+(?:<a[^>]*>)?CitiLap(?:<\/a>)?\s+tìm hiểu/gi, 'hãy cùng CitiLap xem kỹ'],
  [/hãy cùng\s+(?:<a[^>]*>)?CitiLap(?:<\/a>)?\s+đánh giá/gi, 'CitiLap gửi tới bạn bài đánh giá'],
  [/nhờ sự cân bằng giữa/gi, 'nhờ dung hòa tốt giữa'],
  [/sự cân bằng giữa/gi, 'tỉ lệ hài hòa giữa'],
  [/mang đến trải nghiệm sử dụng mượt mà và hiệu quả/gi, 'cho cảm giác làm việc liền mạch, ổn định mỗi ngày'],
  [/mang đến trải nghiệm sử dụng/gi, 'đem lại cảm giác sử dụng'],
  [/trải nghiệm sử dụng mượt mà/gi, 'vận hành trơn tru'],
  [/trải nghiệm sử dụng/gi, 'trải nghiệm thực tế'],
  [/ghi điểm ngay từ cái nhìn đầu tiên với/gi, 'tạo thiện cảm ngay khi mở hộp nhờ'],
  [/ghi điểm với người dùng nhờ/gi, 'được đánh giá cao ở'],
  [/xét về tính di động,/gi, 'Về độ gọn nhẹ khi mang theo,'],
  [/xét về hiệu năng,/gi, 'Về sức mạnh xử lý,'],
  [/xét về màn hình,/gi, 'Về chất lượng hiển thị,'],
  [/nhìn chung,/gi, 'Tổng quan lại,'],
  [/tổng kết lại,/gi, 'Chốt lại đánh giá,'],
  [/không thể không nhắc đến/gi, 'điểm cộng dễ thấy là'],
  [/đặc biệt phù hợp với/gi, 'rất hợp cho'],
  [/tổng thể máy mang lại cảm giác/gi, 'ngoại hình máy cho cảm giác'],
  [/một con số khá hợp lý trong phân khúc/gi, 'mức thông số dễ chịu ở dòng'],
  [/ở thời điểm hiện tại/gi, 'trong tầm giá hiện nay'],
  [/trong phân khúc laptop/gi, 'ở nhóm laptop'],
  [/trong phân khúc/gi, 'ở tầm giá'],
  [/công việc hàng ngày/gi, 'tác vụ thường nhật'],
  [/nhu cầu học tập,\s*làm việc văn phòng/gi, 'việc học, xử lý tài liệu văn phòng'],
  [/người dùng có thể dễ dàng/gi, 'bạn có thể thoải mái'],
  [/giúp người dùng/gi, 'giúp bạn'],
  [/cho người dùng/gi, 'cho bạn'],
  [/sản phẩm mang đến/gi, 'chiếc máy này đem lại'],
  [/chú trọng vào/gi, 'tập trung nhiều vào'],
  [/được hoàn thiện từ/gi, 'dùng chất liệu'],
  [/đáp ứng tốt nhu cầu/gi, 'gánh mượt nhu cầu'],
  [/đáp ứng hoàn hảo/gi, 'xử lý gọn gàng'],
  [/một cách mượt mà/gi, 'trơn tru'],
  [/tại\s+CitiLap/gi, 'tại showroom CitiLap'],
];

export function paraphraseToCitiLapStyle(html) {
  let out = String(html || '');
  // Rewrite text segments outside HTML tags so attributes/URLs stay untouched.
  out = out.replace(/>([^<]+)</g, (full, text) => {
    let t = text;
    for (const [rx, repl] of PHRASE_REWRITES) t = t.replace(rx, repl);
    return `>${t}<`;
  });
  return out;
}
