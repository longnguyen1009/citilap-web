// Upgrade SEO titles & descriptions for Homepage (LandingPageStudio), SiteSettings, and all CMS Pages.
// Updates local D1 AND writes backups/update-seo-prod.sql for fast remote D1 execution.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, realpathSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const HOME_TITLE = 'CitiLap — Laptop Gaming, Văn Phòng, Workstation & MacBook Chính Hãng';
const HOME_DESC = 'CitiLap chuyên Laptop Gaming, Văn Phòng, Workstation & MacBook chính hãng, LikeNew tại Hà Nội & Bắc Ninh. Test máy trực tiếp, bảo hành uy tín, 1 đổi 1 7 ngày.';
const HOME_OG_IMAGE = 'https://citilap.vn/brand/citilap-hero.webp';

const PAGE_SEO = {
  'he-thong-cua-hang': {
    title: 'Hệ Thống Cửa Hàng CitiLap — Showroom Hà Nội & Bắc Ninh',
    description: 'Showroom CitiLap Hà Nội (23/40 Tạ Quang Bửu, Bạch Mai) và CitiLap Bắc Ninh (40 Trần Hưng Đạo). Mở cửa 09:00–20:00, test máy trực tiếp & bảo hành lấy ngay.',
  },
  'gioi-thieu': {
    title: 'Về CitiLap — Hệ Thống Laptop Chính Hãng & LikeNew Uy Tín',
    description: 'Tìm hiểu về CitiLap — Một Chữ Tín, Vạn Niềm Tin. Chuyên laptop chính hãng và LikeNew tuyển chọn kỹ, kiểm định minh bạch, hỗ trợ cài đặt & vệ sinh trọn đời.',
  },
  'chinh-sach-bao-hanh': {
    title: 'Chính Sách Bảo Hành CitiLap — Lỗi 1 Đổi 1 Trong 7 Ngày',
    description: 'Bảo hành phần cứng 6 tháng cho laptop mới, 3 tháng cho máy LikeNew tại CitiLap; hỗ trợ gói mở rộng đến 12 tháng, lỗi 1 đổi 1 trong 7 ngày đầu tiên.',
  },
  'chinh-sach-doi-tra': {
    title: 'Chính Sách Đổi Trả 7 Ngày Tại CitiLap',
    description: 'An tâm mua sắm tại CitiLap với chính sách đổi trả linh hoạt trong 7 ngày đầu nếu phát sinh lỗi phần cứng từ nhà sản xuất hoặc giao sai cấu hình.',
  },
  'chinh-sach-van-chuyen': {
    title: 'Chính Sách Giao Hàng Toàn Quốc — Miễn Phí Nội Thành Hà Nội',
    description: 'Miễn phí giao hàng bán kính 10 km quanh showroom CitiLap Hà Nội, ship COD toàn quốc đồng kiểm trước khi thanh toán, đóng gói chống sốc an toàn.',
  },
  'huong-dan-mua-hang': {
    title: 'Hướng Dẫn Đặt Hàng & Thanh Toán Tại CitiLap',
    description: 'Quy trình đặt mua laptop trực tuyến và trực tiếp tại showroom CitiLap: chọn cấu hình, kiểm tra máy, thanh toán linh hoạt COD hoặc chuyển khoản an toàn.',
  },
  'chinh-sach-bao-mat': {
    title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng | CitiLap',
    description: 'Cam kết bảo vệ thông tin cá nhân, đơn hàng và quyền riêng tư của khách hàng khi mua sắm và tư vấn tại hệ thống CitiLap.',
  },
  'dieu-khoan-mua-hang': {
    title: 'Điều Khoản Mua Hàng & Giao Dịch | CitiLap',
    description: 'Quy định minh bạch về báo giá, xác nhận cấu hình, bảo hành, thanh toán và quyền lợi khách hàng khi mua sắm tại CitiLap.',
  },
  'cau-hoi-thuong-gap': {
    title: 'Câu Hỏi Thường Gặp Khi Mua Laptop Tại CitiLap',
    description: 'Giải đáp nhanh về bảo hành, đổi trả 7 ngày, kiểm tra máy trực tiếp, giao hàng toàn quốc và hỗ trợ trả góp tại hệ thống CitiLap.',
  },
};

const escSql = (v) => `'${String(v).replace(/'/g, "''")}'`;

const d1Root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = readdirSync(d1Root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='SiteSettings'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(d1Root, dbFile));
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; BEGIN IMMEDIATE');

const sqlLines = ['-- CitiLap SEO metadata update for production D1'];
try {
  // 1. SiteSettings
  const sRow = db.prepare("SELECT revision, document FROM SiteSettings WHERE id='site'").get();
  if (sRow) {
    const sDoc = JSON.parse(sRow.document);
    sDoc.defaultSeoTitle = HOME_TITLE;
    sDoc.defaultSeoDescription = HOME_DESC;
    const nextRev = sRow.revision + 1;
    const sJson = JSON.stringify(sDoc);
    db.prepare("INSERT INTO SiteSettingsRevision(revision,document,action,actor) VALUES(?,?,'save','seo-upgrade')").run(nextRev, sJson);
    db.prepare("UPDATE SiteSettings SET revision=?,document=?,updatedAt=CURRENT_TIMESTAMP WHERE id='site'").run(nextRev, sJson);
    sqlLines.push(`INSERT OR REPLACE INTO SiteSettingsRevision(revision,document,action,actor) VALUES(${nextRev},${escSql(sJson)},'save','seo-upgrade');`);
    sqlLines.push(`UPDATE SiteSettings SET revision=${nextRev},document=${escSql(sJson)},updatedAt=CURRENT_TIMESTAMP WHERE id='site';`);
  }

  // 2. LandingPageStudio (Homepage)
  const lpRow = db.prepare('SELECT pageId, revision, published FROM LandingPageStudio LIMIT 1').get();
  if (lpRow?.published) {
    const lpDoc = JSON.parse(lpRow.published);
    lpDoc.seo = { ...(lpDoc.seo || {}), title: HOME_TITLE, description: HOME_DESC, ogImageAssetId: null };
    delete lpDoc.seo.ogImageUrl;
    const nextRev = lpRow.revision + 1;
    const lpJson = JSON.stringify(lpDoc);
    db.prepare("INSERT INTO LandingPageRevision(pageId,revision,document,action,actor) VALUES(?,?,?,'publish','seo-upgrade')").run(lpRow.pageId, nextRev, lpJson);
    db.prepare('UPDATE LandingPageStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE pageId=?').run(lpJson, lpJson, nextRev, nextRev, lpRow.pageId);
    sqlLines.push(`INSERT OR REPLACE INTO LandingPageRevision(pageId,revision,document,action,actor) VALUES(${escSql(lpRow.pageId)},${nextRev},${escSql(lpJson)},'publish','seo-upgrade');`);
    sqlLines.push(`UPDATE LandingPageStudio SET draft=${escSql(lpJson)},published=${escSql(lpJson)},revision=${nextRev},publishedRevision=${nextRev},updatedAt=CURRENT_TIMESTAMP WHERE pageId=${escSql(lpRow.pageId)};`);
  }

  // 3. PageStudio (CMS static pages)
  const pages = db.prepare('SELECT p.id, p.slug, s.revision, s.published FROM Page p JOIN PageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL').all();
  for (const p of pages) {
    const target = PAGE_SEO[p.slug];
    if (!target || !p.published) continue;
    const doc = JSON.parse(p.published);
    doc.seo = { ...(doc.seo || {}), title: target.title, description: target.description };
    const nextRev = p.revision + 1;
    const pJson = JSON.stringify(doc);
    db.prepare("INSERT INTO PageStudioRevision(pageId,revision,document,action,actor) VALUES(?,?,?,'publish','seo-upgrade')").run(p.id, nextRev, pJson);
    db.prepare('UPDATE PageStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE pageId=?').run(pJson, pJson, nextRev, nextRev, p.id);
    sqlLines.push(`INSERT OR REPLACE INTO PageStudioRevision(pageId,revision,document,action,actor) VALUES(${escSql(p.id)},${nextRev},${escSql(pJson)},'publish','seo-upgrade');`);
    sqlLines.push(`UPDATE PageStudio SET draft=${escSql(pJson)},published=${escSql(pJson)},revision=${nextRev},publishedRevision=${nextRev},updatedAt=CURRENT_TIMESTAMP WHERE pageId=${escSql(p.id)};`);
  }

  db.exec('COMMIT');
  mkdirSync('backups', { recursive: true });
  writeFileSync('backups/update-seo-prod.sql', sqlLines.join('\n') + '\n', 'utf8');
  console.log('Updated local SEO metadata and wrote backups/update-seo-prod.sql');
} catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.close(); }
