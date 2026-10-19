import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

assert.deepEqual(process.argv.slice(2), ['--local']);
await build({ stdin: { contents: `export * from './src/server/services/navigation.service'; export * from './src/server/services/product-studio.service'; export * from './src/server/services/media-library.service'; export * from './src/contracts/cms/product-studio'; export * from './src/server/services/site-builder.service'; export * from './src/server/services/settings.service'; export * from './src/server/services/post.service'; export * from './src/server/services/page.service';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.official-store-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.official-store-bundle.mjs');
const state = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates = readdirSync(state).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
  const db = new DatabaseSync(resolve(state, f), { readOnly: true });
  try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get(); } finally { db.close(); }
});
assert.equal(candidates.length, 1, 'Ambiguous local catalog');
const db = new DatabaseSync(resolve(state, candidates[0]));
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
// D1 service contract over local SQLite; batch keeps CMS revision guards atomic.
const DB = {
  prepare(sql) {
    let values = [];
    const statement = { bind(...args) { values = args; return statement; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { const r = db.prepare(sql).run(...values); return { success: true, meta: { changes: Number(r.changes) } }; } };
    return statement;
  },
  async batch(statements) { db.exec('BEGIN IMMEDIATE'); try { const out = []; for (const s of statements) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
};
let mf;
try {
    const token = crypto.randomUUID();
    mf = new Miniflare({ ...convertV4MiniflareOptions({ host: '127.0.0.1', modules: true, bindings: { IMPORT_TOKEN: token }, script: String.raw`export default {async fetch(r,e){
      if(r.headers.get('Authorization') !== 'Bearer '+e.IMPORT_TOKEN) return new Response(null,{status:403});
      const key=new URL(r.url).searchParams.get('key');
      if(!/^library\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/.test(key || '')) return new Response(null,{status:400});
      if(r.method==='PUT'){await e.PRODUCT_MEDIA.put(key,r.body,{httpMetadata:{contentType:r.headers.get('Content-Type')}});return new Response(null,{status:204});}
      if(r.method==='DELETE'){await e.PRODUCT_MEDIA.delete(key);return new Response(null,{status:204});}
      if(r.method==='HEAD') return new Response(null,{status:await e.PRODUCT_MEDIA.head(key)?204:404});
      return new Response(null,{status:405});
    }}`, compatibilityDate: '2026-10-01', r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' } }), resourcePersistencePath: resolve('.wrangler/state/v3') });
    const mediaRequest = async (method, key, body, type) => {
      const response = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), { method, body, headers: { Authorization: 'Bearer ' + token, 'Content-Type': type || 'application/octet-stream' } });
      assert(response.ok, `Local R2 ${method}: ${response.status}`);
      return { key };
    };
    const mediaExists = async key => {
      const r = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), { method: 'HEAD', headers: { Authorization: 'Bearer ' + token } });
      assert(r.ok || r.status === 404, `Local R2 HEAD: ${r.status}`);
      return r.ok;
    };
    const env = { DB, PRODUCT_MEDIA: { put: (key, body, options) => mediaRequest('PUT', key, body, options.httpMetadata.contentType), delete: key => mediaRequest('DELETE', key) } };

    env.PRODUCT_MEDIA.head = async key => await mediaExists(key) ? {key} : null;


    const marker = '.wrangler/competitor-research/official-store-result.json';
    assert(!existsSync(marker), 'Already completed; use admin for subsequent edits');
    mkdirSync('.wrangler/backups', {recursive:true});
    await backup(db, resolve('.wrangler/backups', `before-official-store-${Date.now()}.sqlite`));
    const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const settings = await api.getAdminSettings(DB);
    Object.assign(settings.document, {
      storeName:'CitiLap', motto:'Một chữ tín - Vạn niềm tin',
      logoUrl:'/brand/citilap-logo.svg',faviconUrl:'/brand/citilap-mark.svg',
      zaloUrl:'https://zalo.me/0899188186',copyrightText:'Hộ kinh doanh CitiLap · Laptop, công nghệ và phụ kiện.',
      flashSaleEnabled:false,flashSaleTitle:'Ưu đãi CitiLap',
      defaultSeoTitle:'CitiLap | Laptop gaming, văn phòng và phụ kiện',
      defaultSeoDescription:'Hộ kinh doanh CitiLap. Tư vấn laptop theo nhu cầu, so sánh cấu hình và đặt lịch xem máy tại Hà Nội, Bắc Ninh.',
    });
    await api.saveAdminSettings(DB,{expectedRevision:settings.revision,document:settings.document});
    const contact='<p>Đơn vị vận hành: <strong>Hộ kinh doanh CitiLap</strong>. Hotline: <a href="tel:+84899188186">0899.188.186</a> · Email: <a href="mailto:contact@citilap.vn">contact@citilap.vn</a>. Tiếp nhận hỗ trợ 09:00–20:00, Thứ Hai–Thứ Bảy; Chủ nhật theo lịch hẹn.</p>';
    const pages = [
      ['WARRANTY','chinh-sach-bao-hanh','Chính sách bảo hành', 'Phạm vi, thời hạn và quy trình tiếp nhận bảo hành sản phẩm CitiLap.', [
        ['Thời hạn theo sản phẩm','Laptop mới áp dụng gói 6 hoặc 12 tháng; laptop đã qua sử dụng áp dụng gói 3, 6 hoặc 12 tháng; linh kiện áp dụng 3–6 tháng theo gói. Thời hạn của đúng cấu hình phải được xác nhận trên thông tin bán hàng hoặc phiếu bảo hành; không mặc định mọi máy đều bảo hành 12 tháng.'],
        ['Phạm vi và điều kiện','Bảo hành lỗi kỹ thuật thuộc phạm vi sản phẩm và gói đã xác nhận. Pin, sạc, màn hình, linh kiện thay thế và phần mềm cần được ghi rõ phạm vi trước khi mua. Hư hỏng do ngoại lực, chất lỏng hoặc sử dụng sai được đánh giá theo nguyên nhân và điều kiện đã công bố; không dùng điều khoản loại trừ chung để phủ nhận quyền lợi theo pháp luật.'],
        ['Gửi yêu cầu và bàn giao','Chuẩn bị mã đơn/phiếu mua hàng, serial máy, mô tả lỗi và hình ảnh nếu có. Liên hệ trước để được hướng dẫn nơi tiếp nhận tại cơ sở đang hoạt động hoặc cách gửi máy. Sao lưu dữ liệu trước khi bàn giao; ghi nhận ngoại hình, phụ kiện và tình trạng máy trong biên bản. Không gửi mật khẩu hoặc mã OTP qua biểu mẫu.'],
        ['Kiểm tra và xử lý','CitiLap kiểm tra nguyên nhân, thông báo phương án sửa chữa, thay thế hoặc phương án phù hợp. Thời gian xử lý phụ thuộc lỗi và linh kiện; nhân viên xác nhận tiến độ theo hồ sơ. Chi phí ngoài phạm vi bảo hành chỉ thực hiện sau khi khách hàng đồng ý. Chi phí vận chuyển được trao đổi theo từng tình huống.'],
        ['Trao đổi khi chưa thống nhất','Khách hàng giữ biên bản tiếp nhận và liên hệ đầu mối hỗ trợ để yêu cầu giải thích kết quả kiểm tra. Nếu chưa tìm được phương án phù hợp, hai bên trao đổi phương án thay thế hoặc hoàn tiền theo điều kiện áp dụng và quyền lợi hợp pháp.'],
      ]],
      ['RETURNS','chinh-sach-doi-tra','Chính sách đổi trả và hoàn tiền','Điều kiện đổi lỗi 7 ngày, hồ sơ tiếp nhận và phương án hoàn tiền.',[
        ['Đổi lỗi trong 7 ngày đầu','Trong 7 ngày đầu từ khi nhận máy, khách hàng có thể yêu cầu xử lý lỗi kỹ thuật phần cứng thuộc phạm vi sản phẩm. CitiLap kiểm tra và trao đổi máy tương đương hoặc phương án phù hợp. Đây không phải cam kết đổi trả vô điều kiện khi thay đổi nhu cầu.'],
        ['Chuẩn bị yêu cầu hỗ trợ','Cung cấp mã đơn hoặc phiếu mua hàng, serial, mô tả lỗi và thời điểm phát hiện; gửi ảnh/video nếu có. Giữ phụ kiện, chứng từ và tình trạng máy khi nhận. Những hư hỏng phát sinh được ghi nhận riêng khi kiểm tra, không tự động làm mất mọi quyền lợi hợp pháp.'],
        ['Tiếp nhận và bàn giao','Liên hệ trước khi gửi máy để xác nhận địa chỉ và phí vận chuyển theo tình huống. Sao lưu dữ liệu, ghi nhận ngoại hình và phụ kiện trong biên bản. Nhân viên xác nhận thời gian kiểm tra và phương án xử lý theo hồ sơ.'],
        ['Hoàn tiền','Nếu sản phẩm lỗi thuộc điều kiện đổi trả/bảo hành và không có phương án xử lý phù hợp, CitiLap trao đổi phương án hoàn tiền theo kết quả kiểm tra và quyền lợi hợp pháp. Số tiền, phương thức, thời gian hoàn và phí liên quan được xác nhận bằng thông tin trao đổi hoặc biên bản trước khi thực hiện.'],
        ['Thay đổi nhu cầu','Máy hoạt động bình thường nhưng khách muốn đổi dòng máy có thể được xem xét theo chương trình thu mua/đổi máy riêng, sau khi kiểm tra và thống nhất giá. Thu mua lại không phải hoàn tiền miễn phí hoặc hoàn tiền không điều kiện.'],
      ]],
      ['SHIPPING','chinh-sach-van-chuyen','Chính sách vận chuyển và giao nhận','Phí giao hàng, xác nhận đơn, đồng kiểm và nhận máy tại showroom.',[
        ['Phạm vi và phí giao','CitiLap tiếp nhận yêu cầu giao hàng toàn quốc theo tuyến vận chuyển. Mức tham khảo 100.000–300.000đ tùy địa chỉ, trọng lượng và phương thức giao. Kiểm tra phí giao hàng và tổng tiền ở bước đặt hàng; nhân viên xác nhận mức áp dụng trước khi gửi. Mọi thay đổi cần được thông báo và thống nhất với khách hàng.'],
        ['Giao hàng gần cơ sở Hà Nội','Miễn phí trong bán kính 10 km quanh cơ sở 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội khi nhân viên xác nhận đủ điều kiện. Không mặc định áp dụng cho cơ sở Bắc Ninh hoặc tự suy ra phí bằng 0 từ tên tỉnh/thành phố.'],
        ['Thời gian dự kiến','Mục tiêu liên hệ xác nhận trong 1–4 giờ làm việc và xử lý gửi hàng trong 1 ngày làm việc sau khi thống nhất đơn. Thời gian nhận hàng phụ thuộc tuyến, thời tiết và đơn vị giao nhận; nhân viên thông báo thời gian dự kiến theo từng đơn.'],
        ['Đồng kiểm và sự cố giao nhận','Xác nhận phương án đồng kiểm trước khi gửi. Khi nhận, kiểm tra tình trạng kiện hàng, ngoại hình và phụ kiện theo thỏa thuận với đơn vị giao. Nếu phát hiện sai lệch, hư hỏng hoặc thiếu hàng, ghi nhận bằng ảnh/video nếu có và liên hệ CitiLap để được hướng dẫn; không tự tháo máy để khắc phục.'],
        ['Nhận tại showroom','Đơn online nhận tại CitiLap Hà Nội: 23/40 Tạ Quang Bửu, Phường Bạch Mai. Bắc Ninh tại 40 Trần Hưng Đạo, Phường Võ Cường đón khách xem và mua trực tiếp, chưa nhận đơn online tại quầy. Vui lòng xác nhận lịch và máy trước khi đến; Chủ nhật theo lịch hẹn.'],
      ]],
      ['CUSTOM','huong-dan-mua-hang','Hướng dẫn mua hàng','Từ chọn cấu hình đến gửi yêu cầu, xác nhận và nhận máy.',[
        ['1. Chọn sản phẩm','Duyệt danh mục, tìm kiếm hoặc dùng bộ chọn laptop theo ngân sách. Thêm sản phẩm vào so sánh để đối chiếu CPU, RAM, SSD, màn hình và tình trạng. Ảnh tham khảo không thay thế hồ sơ kiểm tra chiếc máy thực tế.'],
        ['2. Kiểm tra cấu hình và liên hệ','Chọn đúng cấu hình, tình trạng và gói bảo hành. Với sản phẩm cần xác nhận hàng, chọn Liên hệ tư vấn để kiểm tra giá và khả năng cung ứng. Chỉ sản phẩm đang tiếp nhận yêu cầu mua mới có nút Thêm vào giỏ yêu cầu.'],
        ['3. Kiểm tra giỏ hàng','Bấm Thêm vào giỏ yêu cầu, sau đó Xem giỏ hàng. Kiểm tra cấu hình, số lượng và tổng tạm tính. Nếu giá hoặc trạng thái thay đổi, xác nhận thông tin mới trước khi tiếp tục.'],
        ['4. Gửi yêu cầu đặt hàng','Điền tên, số điện thoại, địa chỉ giao hoặc chọn nhận tại Hà Nội. Kiểm tra phí giao, tổng tiền và phương thức thanh toán được hiển thị. Gửi đơn và giữ mã đơn để tra cứu. Chưa cần tài khoản; gửi yêu cầu không đồng nghĩa đã thanh toán hoặc chắc chắn giữ được máy.'],
        ['5. Xác nhận và nhận máy','CitiLap liên hệ xác nhận cấu hình, tình trạng, giá và lịch giao. Chỉ thanh toán theo phương thức đã thống nhất. Xác nhận cách đồng kiểm trước khi nhận; giữ chứng từ mua hàng và thông tin bảo hành. Không gửi số thẻ, mật khẩu hoặc OTP trong ghi chú.'],
      ]],
      ['CUSTOM','dieu-khoan-mua-hang','Điều khoản mua hàng và thanh toán','Quy định tiếp nhận yêu cầu mua hàng, xác nhận giá, thanh toán và thay đổi đơn.',[
        ['Đơn vị vận hành và phạm vi','Website do Hộ kinh doanh CitiLap vận hành, giới thiệu sản phẩm và tiếp nhận yêu cầu mua hàng. Chính sách này áp dụng cùng thông tin đã xác nhận của sản phẩm và đơn hàng; không hạn chế quyền lợi bắt buộc theo pháp luật.'],
        ['Giá và tình trạng sản phẩm','Giá niêm yết gắn với cấu hình tại thời điểm hiển thị, chưa bao gồm phí vận chuyển nếu không có thông báo khác. Sản phẩm cần liên hệ phải được xác nhận giá và hàng trước khi nhận yêu cầu mua. Hình ảnh và thông số tham khảo có thể khác phụ kiện, ngoại hình của chiếc máy cụ thể; hai bên đối chiếu trước giao.'],
        ['Xác nhận đơn','Sau khi gửi, đơn ở trạng thái chờ xác nhận. Nhân viên xác nhận cấu hình, tình trạng, tổng tiền và giao nhận. Việc lưu giỏ hoặc gửi yêu cầu không đồng nghĩa đã thanh toán hoặc giữ hàng cố định. Nếu giá thay đổi, khách hàng được thông báo và lựa chọn tiếp tục hoặc dừng yêu cầu.'],
        ['Thanh toán','Website chưa tích hợp cổng thanh toán trực tuyến. Thanh toán COD khi nhận hoặc trực tiếp tại showroom theo phương án đã thống nhất. Không nhập thông tin thẻ, mật khẩu hoặc mã OTP vào ghi chú. Không chuyển tiền vào tài khoản chưa được xác thực qua đầu mối CitiLap.'],
        ['Thay đổi, hủy đơn và khiếu nại','Liên hệ kèm mã đơn khi cần đổi cấu hình, địa chỉ hoặc hủy yêu cầu. Nếu đơn đã bàn giao vận chuyển, CitiLap kiểm tra trạng thái và trao đổi phương án, chi phí phát sinh nếu có trước khi thực hiện. Khiếu nại cần mã đơn, mô tả và chứng từ liên quan; kết quả xử lý được thông báo qua kênh liên hệ đã thống nhất.'],
      ]],
      ['CUSTOM','chinh-sach-bao-mat','Chính sách bảo vệ dữ liệu cá nhân','Thông tin thu thập, mục đích sử dụng và cách thực hiện quyền về dữ liệu cá nhân.',[
        ['Đơn vị phụ trách','Hộ kinh doanh CitiLap là đơn vị vận hành website và đầu mối tiếp nhận yêu cầu về dữ liệu cá nhân qua contact@citilap.vn hoặc 0899.188.186. Địa chỉ liên hệ: 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội.'],
        ['Dữ liệu và mục đích xử lý','CitiLap tiếp nhận tên, điện thoại, email nếu cung cấp, địa chỉ, sản phẩm, nội dung đơn và yêu cầu hỗ trợ để tư vấn, xác nhận, giao hàng, bảo hành và giải quyết khiếu nại. Dữ liệu kỹ thuật cần thiết phục vụ bảo mật, chống spam và vận hành. Không gửi thông tin thẻ, mật khẩu, mã OTP hoặc dữ liệu nhạy cảm không cần thiết.'],
        ['Phạm vi chia sẻ','Nhân sự được phân quyền xử lý dữ liệu theo nhiệm vụ. Đơn vị vận chuyển nhận thông tin cần thiết cho giao hàng; nhà cung cấp hạ tầng và dịch vụ hỗ trợ xử lý theo phạm vi vận hành. Cung cấp cho cơ quan có thẩm quyền khi pháp luật yêu cầu. CitiLap không bán dữ liệu cá nhân.'],
        ['Thời gian lưu và yêu cầu của khách hàng','Dữ liệu được lưu phù hợp mục đích xử lý, bảo hành, đối soát và nghĩa vụ pháp luật. Khách hàng có thể đề nghị truy cập, chỉnh sửa, xóa, hạn chế xử lý hoặc rút lại sự đồng ý đối với hoạt động dựa trên sự đồng ý qua email/hotline. CitiLap xác minh người yêu cầu và thông báo cách xử lý, bao gồm nghĩa vụ lưu trữ còn hiệu lực.'],
        ['Dữ liệu trình duyệt và thống kê','Giỏ hàng, so sánh và lựa chọn quyền riêng tư có thể lưu trên trình duyệt để hỗ trợ sử dụng. Thống kê tương tác mặc định tắt; có thể bật/tắt ở cuối trang. Sự kiện thống kê không chứa nội dung tìm kiếm, email hay điện thoại; nhật ký bảo mật/hạ tầng được xử lý riêng. Tắt thống kê không ngăn mua sắm. Trên thiết bị dùng chung, hãy xóa dữ liệu duyệt web sau sử dụng.'],
        ['Bảo vệ và phản ánh sự cố','CitiLap áp dụng phân quyền và biện pháp kỹ thuật phù hợp để hạn chế truy cập trái phép. Nếu nghi ngờ lộ thông tin hoặc có yêu cầu về quyền riêng tư, liên hệ đầu mối phụ trách; không cung cấp mật khẩu hoặc OTP để chứng minh danh tính.'],
      ]],
      ['ABOUT','gioi-thieu','Về CitiLap','Laptop và công nghệ cho học tập, công việc và giải trí.',[
        ['Chọn laptop từ nhu cầu thật','CitiLap được thành lập từ tháng 7/2024, tập trung laptop gaming, ultrabook, laptop văn phòng, đồ họa và phụ kiện. Hộ kinh doanh CitiLap tư vấn dựa trên phần mềm, ngân sách và cách sử dụng, giúp khách hàng đối chiếu đúng cấu hình trước khi lựa chọn.'],
        ['Thông tin rõ ràng trước khi mua','Cấu hình, tình trạng, phụ kiện, giá và gói bảo hành được xác nhận theo từng sản phẩm. Với máy đã qua sử dụng, khách hàng nên yêu cầu hồ sơ và kiểm tra chiếc máy cụ thể; không suy ra mọi máy có cùng sức khỏe pin hoặc lịch sử sử dụng.'],
        ['Kết nối với CitiLap','CitiLap Hà Nội tại 23/40 Tạ Quang Bửu, Phường Bạch Mai; CitiLap Bắc Ninh tại 40 Trần Hưng Đạo, Phường Võ Cường. Đặt lịch trước để được xác nhận máy và thời gian xem. Nhận đơn online tại Hà Nội, phục vụ giao hàng toàn quốc theo điều kiện vận chuyển.'],
      ]],
    ];
    pages.push(['STORES','he-thong-cua-hang','Hệ thống cửa hàng CitiLap','Địa chỉ, giờ mở cửa và hướng dẫn đặt lịch xem máy.',[
      ['CitiLap Hà Nội','23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội. Điện thoại 0899.188.186. Đón khách xem máy, nhận đơn online và tiếp nhận bảo hành theo hướng dẫn.'],
      ['CitiLap Bắc Ninh','40 Trần Hưng Đạo, Phường Võ Cường, Bắc Ninh. Điện thoại 0842.044.999. Đón khách xem và mua trực tiếp; chưa nhận đơn online tại quầy.'],
      ['Đặt lịch trước khi đến','Giờ làm việc 09:00–20:00, Thứ Hai–Thứ Bảy; Chủ nhật theo lịch hẹn. Liên hệ để xác nhận chiếc máy, cấu hình và thời gian trước khi đến. Yêu cầu lịch hẹn chưa giữ hàng.'],
    ]]);
    pages.push(['CUSTOM','cau-hoi-thuong-gap','Câu hỏi thường gặp','Giải đáp về chọn máy, đặt hàng, giao nhận và hỗ trợ sau mua.',[
      ['Chưa biết chọn cấu hình nào?','Bắt đầu từ phần mềm, công việc và ngân sách. Bộ chọn laptop gợi ý tối đa 3 máy; bảng so sánh giúp đối chiếu cấu hình. Giá tham khảo và khả năng cung ứng cần được xác nhận trước khi mua.'],
      ['Gửi đơn có nghĩa đã thanh toán hoặc giữ máy?','Chưa. Website tiếp nhận yêu cầu mua hàng; nhân viên xác nhận cấu hình, tình trạng, giá và giao nhận. Giữ mã đơn để trao đổi và tra cứu.'],
      ['Có thể nhận đơn online tại Bắc Ninh không?','Đơn online nhận tại Hà Nội. Bắc Ninh đón khách xem và mua trực tiếp; liên hệ trước để kiểm tra máy có sẵn. Chủ nhật theo lịch hẹn.'],
      ['Phí giao hàng thế nào?','Mức tham khảo 100.000–300.000đ tùy địa chỉ và phương thức giao. Kiểm tra phí tại bước đặt hàng và xác nhận trước khi gửi. Miễn phí trong bán kính 10 km quanh cơ sở Hà Nội khi đủ điều kiện.'],
      ['Máy nào cũng được bảo hành 12 tháng?','Không. Máy mới áp dụng gói 6/12 tháng; máy đã qua sử dụng 3/6/12 tháng; linh kiện 3–6 tháng theo gói. Phạm vi và thời hạn của đúng cấu hình được xác nhận trước mua.'],
      ['Báo lỗi hoặc đổi máy cần chuẩn bị gì?','Chuẩn bị mã đơn, serial, mô tả lỗi, thời điểm phát hiện và ảnh/video nếu có. Sao lưu dữ liệu trước bàn giao. Đổi lỗi trong 7 ngày theo điều kiện và kết quả kiểm tra; thay đổi nhu cầu không đồng nghĩa hoàn tiền miễn phí.'],
      ['Muốn đổi địa chỉ hoặc hủy yêu cầu?','Liên hệ kèm mã đơn và nội dung cần đổi. Nếu đã gửi hàng, CitiLap kiểm tra trạng thái vận chuyển và trao đổi phương án. Không tạo đơn mới để tự thay thế đơn cũ.'],
      ['Có thể tắt thống kê truy cập?','Có. Tùy chọn nằm ở cuối trang; tắt thống kê không ngăn chọn máy hoặc đặt hàng. Không gửi mật khẩu, mã OTP hoặc dữ liệu nhạy cảm trong biểu mẫu.'],
    ]]);
    const pageResults=[];
    for(const [pageType,slug,title,description,sections] of pages){
      const row=db.prepare('SELECT p.id,s.revision FROM Page p LEFT JOIN PageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND (p.slug=? OR (p.pageType=? AND ?<>\'CUSTOM\')) ORDER BY s.updatedAt DESC LIMIT 1').get(slug,pageType,pageType);
      const contentHtml=sections.map(([heading,body])=>slug==='cau-hoi-thuong-gap'
        ? `<details class="rounded-xl border border-slate-200 p-4 mb-3"><summary class="cursor-pointer font-semibold">${esc(heading)}</summary><p>${esc(body)}</p></details>`
        : `<h2>${esc(heading)}</h2><p>${esc(body)}</p>`).join('')+contact;
      await api.writePage(env,row?.id||null,{expectedRevision:row?.revision||0,action:'publish',document:{schemaVersion:1,title,slug,pageType,contentHtml,seo:{title,description,ogImageAssetId:null}}});
      pageResults.push(slug);
    }
    // Imported reference stock must not become sellable stock when demo labels are removed.
    const sources=new Map(Array.from({length:20},(_,i)=>JSON.parse(readFileSync(`.wrangler/competitor-research/products-${i+1}.json`,'utf8'))).flat().map(p=>['ref-tgs-'+p.id,p]));
    const products=db.prepare("SELECT p.id,p.slug,s.revision,s.draft FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.slug LIKE 'ref-tgs-%' AND p.deletedAt IS NULL").all();
    for(const [i,row] of products.entries()){
      const d=JSON.parse(row.draft);
      const source=sources.get(row.slug);
      d.price=Math.round(Number(source?.prices.price||0)/10**(source?.prices.currency_minor_unit||0));
      d.availability='CONTACT';d.isFlashSale=false;d.isBestSeller=false;d.originalPrice=null;
      d.variants=d.variants.map(v=>({...v,price:d.price,availability:'CONTACT',originalPrice:null}));
      d.warranties=[];
      d.contentHtml=d.contentHtml.replace(/<h3>Bảo hành và nhận hàng<\/h3>[\s\S]*$/,'<h3>Tư vấn và xác nhận sản phẩm</h3><p>Giá và thông số mang tính tham khảo; liên hệ CitiLap để xác nhận cấu hình, tình trạng, phụ kiện, giá bán và gói bảo hành trước khi đặt mua. Hình ảnh tham khảo không thay thế hồ sơ kiểm tra chiếc máy thực tế.</p><p><a href="/chinh-sach-bao-hanh">Bảo hành</a> · <a href="/chinh-sach-doi-tra">Đổi trả</a> · <a href="/chinh-sach-van-chuyen">Giao nhận</a></p>');
      await api.writeStudio(env,row.id,{expectedRevision:row.revision,action:'publish',document:d});
      db.prepare("UPDATE Product SET stock=0,warranty='Xác nhận theo cấu hình' WHERE id=?").run(row.id);
      if(i%300===0)console.log('Updated reference products',i+1);
    }
    const nav=await api.navigationDetail(DB);
    const link=(id,label,path)=>({id,label,target:{kind:'path',path}});
    nav.document.menus.main=nav.document.menus.main.filter(m=>m.target.path!=='/hot-sale');
    const about=nav.document.menus.main.find(m=>m.target.path==='/gioi-thieu');
    if(about)about.children=[link('official-about','Câu chuyện CitiLap','/gioi-thieu'),link('official-stores','Hệ thống cửa hàng','/he-thong-cua-hang'),link('official-appointment','Đặt lịch xem máy','/lien-he?intent=appointment'),link('official-faq','Câu hỏi thường gặp','/cau-hoi-thuong-gap'),link('official-advisor','Tư vấn chọn laptop','/chon-laptop')];
    nav.document.menus.footer=[{...link('official-footer','Hộ kinh doanh CitiLap','/gioi-thieu'),children:[link('official-footer-stores','Hệ thống cửa hàng','/he-thong-cua-hang'),link('official-footer-contact','Liên hệ và hỗ trợ','/lien-he'),link('official-footer-terms','Điều khoản mua hàng','/dieu-khoan-mua-hang'),link('official-footer-privacy','Bảo vệ dữ liệu cá nhân','/chinh-sach-bao-mat')]}];
    for(const c of nav.document.categories){
      c.name=c.name.replace(/\s*99%/g,'');
      if(c.visible)c.description=`Khám phá ${c.name.toLowerCase()}, đối chiếu cấu hình và liên hệ CitiLap để xác nhận sản phẩm phù hợp.`;
    }
    await api.writeNavigation(env,{expectedRevision:nav.revision,action:'publish',document:nav.document});
    const home=await api.getLandingPageDetail(DB,'home');
    home.document.internalName='Trang chủ CitiLap';
    for(const section of home.document.sections)if(section.type==='banner')section.data.imageUrl='/brand/citilap-hero.webp';
    await api.writeLandingPage(env,'home',{expectedRevision:home.revision,action:'publish',document:home.document});
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare("SELECT count(*) n FROM ProductStudio s JOIN Product p ON p.id=s.productId WHERE p.slug LIKE 'ref-tgs-%' AND json_extract(s.published,'$.availability')<>'CONTACT'").get().n,0);
    writeFileSync(marker,JSON.stringify({completedAt:new Date().toISOString(),pages:pageResults,referenceProducts:products.length,logo:settings.document.logoUrl},null,2));
    console.log('PASS official CMS pages, branding, menus and reference catalog',pageResults.length,products.length);
} finally { if(mf) await mf.dispose(); db.close(); }
