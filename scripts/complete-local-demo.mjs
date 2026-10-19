import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

assert.deepEqual(process.argv.slice(2), ['--local']);
await build({ stdin: { contents: `export * from './src/server/services/navigation.service'; export * from './src/server/services/product-studio.service'; export * from './src/server/services/media-library.service'; export * from './src/contracts/cms/product-studio'; export * from './src/server/services/site-builder.service'; export * from './src/server/services/settings.service'; export * from './src/server/services/post.service';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.complete-demo-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.complete-demo-bundle.mjs');
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

    mkdirSync('.wrangler/backups', {recursive:true});
    await backup(db, resolve('.wrangler/backups', `before-complete-demo-${Date.now()}.sqlite`));
    const marker = '.wrangler/competitor-research/complete-demo-result.json';
    assert(!existsSync(marker), 'Demo already completed; review current edits before rebuilding');
    const source = Array.from({length:20},(_,i)=>JSON.parse(readFileSync(`.wrangler/competitor-research/products-${i+1}.json`,'utf8'))).flat();
    const byId = new Map(source.map(p=>[String(p.id),p]));
    const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const insert = (table, data) => db.prepare(`INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(()=>'?').join(',')}) ON CONFLICT DO NOTHING`).run(...Object.values(data));
    const now = new Date().toISOString();
    const settings = await api.getAdminSettings(DB);
    Object.assign(settings.document, {
      motto:'DEMO LOCAL · Trải nghiệm mua sắm CitiLap', logoUrl:'/brand/brand-logo-original.jpg', faviconUrl:'/brand/brand-logo-original.jpg',
      storePhone:'0899188186',storePhoneBacNinh:'0842044999',storeEmail:'contact@citilap.vn',
      addressHanoi:'23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội',addressBacNinh:'40 Trần Hưng Đạo, Phường Võ Cường, Bắc Ninh',
      openingHours:'Thứ Hai–Thứ Bảy 09:00–20:00; Chủ nhật theo lịch hẹn',
      facebookUrl:'https://www.facebook.com/citilap',tiktokUrl:'https://www.tiktok.com/@citilapvn',zaloUrl:'',
      defaultSeoTitle:'CitiLap | Laptop gaming, văn phòng và phụ kiện',defaultSeoDescription:'Chọn laptop theo công việc và ngân sách. Khám phá cấu hình, so sánh sản phẩm và đặt lịch xem máy tại CitiLap.',
      feature1Title:'Chọn đúng nhu cầu',feature1Desc:'So sánh cấu hình theo công việc và ngân sách',
      feature2Title:'Thông tin rõ ràng',feature2Desc:'Xem cấu hình và tình trạng theo từng sản phẩm',
      feature3Title:'Bảo hành theo gói',feature3Desc:'Phạm vi và thời hạn ghi trong từng sản phẩm',
      feature4Title:'Giao hàng toàn quốc',feature4Desc:'Phí và phương án đồng kiểm được xác nhận khi tư vấn',
      codEnabled:true,bankTransferEnabled:false,bankAccountInfo:'',shippingFee:100000,freeShippingThreshold:0,
      flashSaleEnabled:true,flashSaleTitle:'Ưu đãi trải nghiệm CitiLap',flashSaleStartAt:now,flashSaleEndAt:new Date(Date.now()+30*86400000).toISOString(),
    });
    await api.saveAdminSettings(DB,{expectedRevision:settings.revision,document:settings.document});
    insert('Warehouse',{id:'demo-showroom-hanoi',code:'DEMO-HN',name:'Kho trải nghiệm local Hà Nội',address:settings.document.addressHanoi,status:'ACTIVE',updatedAt:now});
    const rows=db.prepare("SELECT p.id,p.slug,s.revision,s.draft FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.slug LIKE 'ref-tgs-%' AND p.deletedAt IS NULL").all();
    const featured=[];
    for(const [index,row] of rows.entries()) {
      const d=JSON.parse(row.draft), sourceId=row.slug.replace('ref-tgs-',''), p=byId.get(sourceId);
      assert(p,'Missing source');
      d.name=d.name.replace(/^\[Tham khảo\]\s*/,'');
      const laptop=d.template==='LAPTOP';
      d.price=Math.round(Number(p.prices.price)/10**p.prices.currency_minor_unit) || (laptop?15990000:490000);
      const regularPrice=Math.round(Number(p.prices.regular_price)/10**p.prices.currency_minor_unit);
      d.originalPrice=regularPrice>d.price?regularPrice:null;
      d.availability='AVAILABLE';
      const brandName=d.brand || (/macbook/i.test(d.name)?'Apple':'');
      if(brandName) {
        let b=db.prepare('SELECT id,name FROM Brand WHERE lower(name)=lower(?) AND deletedAt IS NULL').get(brandName);
        if(!b){const slug=brandName.toLowerCase().replace(/[^a-z0-9]+/g,'-');insert('Brand',{id:'demo-brand-'+slug,name:brandName,slug,status:'ACTIVE',updatedAt:now});b={id:'demo-brand-'+slug,name:brandName};}
        d.brand=b.name;d.brandId=b.id;
      }
      const need=d.categoryId==='cat-gaming'?'chơi game và học kỹ thuật':d.categoryId==='cat-do-hoa'?'thiết kế và xử lý nội dung':d.categoryId==='cat-macbook'?'học tập và làm việc với macOS':laptop?'học tập, văn phòng và đa nhiệm':'bổ sung tiện ích cho góc làm việc';
      d.specs=d.specs.filter(s=>!['Phù hợp','Hạn chế'].includes(s.key));
      d.specs.push({key:'Phù hợp',value:need},{key:'Hạn chế',value:laptop?'Đối chiếu phần mềm, màn hình và khả năng nâng cấp của đúng phiên bản.':'Kiểm tra cổng kết nối và kích thước thiết bị trước khi chọn.'});
      const facts=Object.fromEntries(d.specs.map(s=>[s.key,s.value]));
      const warranty=laptop?(d.condition==='NEW'?12:6):6;
      d.description=`${d.name.replace(/^\[[^\]]+\]\s*/,'')} — lựa chọn cho ${need}. ${laptop?'Cấu hình được trình bày riêng để dễ so sánh theo ngân sách.':'Đối chiếu thông số tương thích trước khi thêm vào giỏ.'}`.slice(0,2000);
      d.contentHtml=`<h2>${esc(d.name)}</h2><p>${esc(d.description)}</p><h3>Thông số và lựa chọn cấu hình</h3><ul>${d.specs.map(s=>`<li><strong>${esc(s.key)}:</strong> ${esc(s.value)}</li>`).join('')}</ul><h3>Trước khi chọn mua</h3><p>${laptop?'Hãy liệt kê phần mềm thường dùng và dung lượng dự án. RAM ảnh hưởng khả năng đa nhiệm; GPU cần phù hợp với game hoặc phần mềm đồ họa. Với máy đã qua sử dụng, nên kiểm tra pin, bàn phím, màn hình và cổng kết nối trên đúng chiếc máy.':'Đối chiếu chuẩn kết nối, nguồn điện và kích thước với thiết bị của bạn. Không suy ra khả năng tương thích chỉ từ hình dáng cổng cắm.'}</p><h3>Bảo hành và nhận hàng</h3><p>Gói bảo hành ${warranty} tháng trong bản demo. Phạm vi áp dụng theo điều kiện sản phẩm; đổi lỗi trong 7 ngày theo chính sách CitiLap. Giao toàn quốc, phí giao hàng xác nhận khi tư vấn; nhận đơn online tại showroom Hà Nội.</p><p><small>Dữ liệu trải nghiệm local: giá và tồn kho mô phỏng. Thông số, ảnh tham chiếu từ <a href="${esc(p.permalink)}">trang sản phẩm nguồn</a>; ảnh không phải hồ sơ kiểm định chiếc máy tại CitiLap.</small></p>`;
      d.seoTitle=d.name.slice(0,200);d.seoDescription=d.description.slice(0,300);
      d.isFeatured=index<48;d.isNewArrival=index<24;d.isBestSeller=false;d.isFlashSale=index<12 && !!d.originalPrice;
      d.warranties=[{name:`Bảo hành ${warranty} tháng`,description:'Gói trải nghiệm local; pin, sạc và linh kiện áp dụng điều kiện riêng.',adjustment:0,recommended:true}];
      d.variants=[{id:`local-demo-variant-${sourceId}`,sku:`LOCAL-${sourceId}`,name:'Cấu hình tiêu chuẩn',condition:d.condition,price:d.price,originalPrice:d.originalPrice,availability:'AVAILABLE',ram:facts.RAM||'',storage:facts.SSD||'',gpu:facts.GPU||'',options:{},image:''}];
      await api.writeStudio(env,row.id,{expectedRevision:row.revision,action:'publish',document:d});
      db.exec('BEGIN IMMEDIATE');
      try {
        const vid=d.variants[0].id;
        db.prepare('UPDATE Product SET inventoryType=?,warranty=?,stock=?,updatedAt=? WHERE id=?').run(laptop?'SERIALIZED':'QUANTITY',`${warranty} tháng`,laptop?2:12,now,row.id);
        if(laptop) for(let n=1;n<=2;n++)insert('SerialUnit',{id:`local-demo-unit-${sourceId}-${n}`,productId:row.id,variantId:vid,warehouseId:'demo-showroom-hanoi',serialNumber:`DEMO-${sourceId}-${n}`,condition:d.condition,status:'AVAILABLE',warrantyMonths:warranty,notes:'SIMULATED_LOCAL_INVENTORY',updatedAt:now});
        else insert('InventoryBalance',{id:`local-demo-balance-${sourceId}`,warehouseId:'demo-showroom-hanoi',productId:row.id,variantId:vid,onHand:12,reserved:0,updatedAt:now});
        insert('InventoryTransaction',{id:`local-demo-opening-${sourceId}`,warehouseId:'demo-showroom-hanoi',productId:row.id,variantId:vid,transactionType:'RECEIPT',quantityDelta:laptop?2:12,referenceType:'LOCAL_DEMO',referenceId:sourceId,idempotencyKey:`local-demo-opening-${sourceId}`,reason:'SIMULATED_LOCAL_INVENTORY',balanceBefore:0,balanceAfter:laptop?2:12});
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
      featured.push({id:row.id,...d});
      if(index%200===0)console.log('Completed products',index+1);
    }
    // Keep old fixtures and their history, but remove them from the public catalog.
    db.prepare("UPDATE Product SET status='INACTIVE' WHERE id LIKE 'demo-%' OR id LIKE 'temp-%' OR id IN (SELECT id FROM Product WHERE id LIKE 'p-%') OR name LIKE 'Phụ kiện QA %'").run();
    db.prepare("UPDATE Brand SET status='INACTIVE' WHERE id LIKE 'temp-%' OR name LIKE '%(mẫu)%'").run();
    const nav=await api.navigationDetail(DB);
    for(const c of nav.document.categories){
      if(c.id.startsWith('demo-'))c.visible=false;
      const product=featured.find(p=>p.categoryId===c.id) || (c.id==='cat-phu-kien'?featured.find(p=>p.template==='ACCESSORY'):null);
      if(product){c.assetId=product.media[0].assetId;c.image='/api/library/'+c.assetId;c.alt=c.name;c.description=`Khám phá ${c.name.toLowerCase()}, so sánh cấu hình và chọn theo nhu cầu.`;}
    }
    const accessories=nav.document.menus.main.find(m=>m.id==='nav-accessories');
    if(accessories)accessories.children=accessories.children.filter(m=>featured.some(p=>p.categoryId===m.target.id));
    nav.document.menus.footer=[{id:'footer-policies',label:'Hỗ trợ mua hàng',target:{kind:'path',path:'/huong-dan-mua-hang'},children:[['warranty','Bảo hành','/chinh-sach-bao-hanh'],['returns','Đổi trả','/chinh-sach-doi-tra'],['shipping','Vận chuyển','/chinh-sach-van-chuyen'],['privacy','Bảo mật','/chinh-sach-bao-mat']].map(([id,label,path])=>({id:'footer-'+id,label,target:{kind:'path',path}}))}];
    nav.document.collections=[...nav.document.collections.filter(c=>!c.id.startsWith('local-demo-')),...[['office','Laptop học tập dưới 20 triệu',p=>p.template==='LAPTOP'&&p.price<20000000&&p.categoryId!=='cat-gaming'],['gaming','Gaming trong tầm 30 triệu',p=>p.categoryId==='cat-gaming'&&p.price<=30000000],['accessories','Góc làm việc gọn gàng',p=>p.template==='ACCESSORY']].map(([key,name,filter])=>({id:'local-demo-'+key,name,slug:'goi-y-'+key,description:'Bộ sưu tập theo nhu cầu và ngân sách.',visible:true,mode:'manual',productIds:featured.filter(filter).slice(0,24).map(p=>p.id),image:''}))];
    await api.writeNavigation(env,{expectedRevision:nav.revision,action:'publish',document:nav.document});
    const posts=db.prepare("SELECT postId,revision,draft FROM PostStudio WHERE postId LIKE 'demo-%'").all();
    const guides=[
      ['Chọn laptop 20 triệu: ưu tiên cấu hình nào?', 'Một ngân sách, nhiều nhu cầu: chọn máy bằng công việc thực tế.', [['Bắt đầu từ phần mềm','Ghi lại ba ứng dụng dùng nhiều nhất. Văn phòng và học tập nên ưu tiên đủ RAM, SSD và màn hình dễ đọc. Nếu học dựng hình hoặc chơi game, hãy kiểm tra yêu cầu GPU của phần mềm trước khi chọn.'],['Phân bổ ngân sách','RAM 16GB là điểm khởi đầu đáng cân nhắc cho đa nhiệm. SSD 512GB phù hợp tài liệu và ứng dụng thông thường; dự án video hoặc thư viện game cần thêm dung lượng. Tính cả phụ kiện và chi phí nâng cấp.'],['So sánh đúng phiên bản','Hai máy cùng tên có thể khác màn hình, RAM hàn hoặc số khe SSD. Đối chiếu mã cấu hình, trọng lượng cả sạc và cổng cần dùng. Đừng chỉ nhìn nhãn Core i7 hoặc Ryzen 7.'],['Thử trước khi quyết định','Mang file làm việc hoặc chạy đúng phần mềm bạn dùng. Kiểm tra bàn phím, độ sáng màn hình và độ ồn trong tác vụ thường ngày. Có thể đặt lịch để được tư vấn theo ngân sách.']]],
      ['Checklist kiểm tra laptop đã qua sử dụng','Kiểm tra đúng chiếc máy, từ ngoại hình đến pin và cổng kết nối.', [['Ngoại hình và màn hình','Quan sát bản lề, vỏ, chân ốc và các mép máy. Hiển thị nền trắng, đen, đỏ, xanh để kiểm tra điểm sáng và vùng màu. Ghi nhận trầy xước trước khi nhận hàng.'],['Pin và nguồn','Đọc dung lượng thiết kế, dung lượng sạc đầy và ngày kiểm tra. Sức khỏe pin không đồng nghĩa thời lượng sử dụng; thử với mức sáng và tác vụ cụ thể. Kiểm tra sạc đúng chuẩn công suất.'],['Chức năng và dữ liệu','Thử toàn bộ phím, touchpad, webcam, micro, Wi-Fi và các cổng. Kiểm tra SSD bằng công cụ phù hợp; không suy ra máy nguyên bản chỉ từ số giờ hoạt động.'],['Xác nhận bằng văn bản','Đối chiếu cấu hình, phụ kiện, thời hạn bảo hành và phạm vi đổi lỗi. Với CitiLap, thời hạn bảo hành theo gói sản phẩm; đổi lỗi trong 7 ngày theo điều kiện áp dụng.']]],
      ['Nâng RAM hay chọn GPU mạnh hơn?','Chọn phần cứng theo điểm nghẽn của tác vụ, tránh nâng cấp không cần thiết.', [['Dấu hiệu thiếu RAM','Khi mở nhiều ứng dụng, bộ nhớ gần đầy và hệ thống thường xuyên dùng ổ đĩa để trao đổi dữ liệu, thêm RAM có thể giúp đa nhiệm. Trước tiên kiểm tra ứng dụng nền và dung lượng file.'],['Khi cần GPU','Game, render 3D và một số bộ lọc video cần GPU phù hợp. Kiểm tra yêu cầu VRAM và hỗ trợ tăng tốc của phần mềm; không chỉ so tên card. Công suất và tản nhiệt ảnh hưởng kết quả thực tế.'],['Khả năng nâng cấp','Xác định RAM hàn hay có khe, số khe trống và dung lượng được hỗ trợ. Với SSD, kiểm tra chuẩn giao tiếp, kích thước và số khe. Sao lưu dữ liệu trước khi nâng cấp.'],['Cách ra quyết định','Theo dõi CPU, RAM và GPU khi chạy dự án quen thuộc. Chọn nâng cấp giải quyết điểm nghẽn đo được; nếu phần cứng không thể thay, cân nhắc cấu hình máy phù hợp ngay từ đầu.']]],
    ];
    for(const [i,row] of posts.entries()){
      const d=JSON.parse(row.draft),g=guides[i%guides.length],cover=featured.filter(p=>p.categoryId==='cat-van-phong')[i];
      Object.assign(d,{title:g[0],excerpt:g[1],authorName:'CitiLap',contentHtml:g[2].map(([h,p])=>`<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join('')+'<p><a href="/chon-laptop">Tìm laptop theo nhu cầu</a> · <a href="/lien-he?intent=appointment">Đặt lịch xem máy</a></p>',coverImage:{assetId:cover.media[0].assetId,alt:cover.name},relatedProductIds:featured.filter(p=>p.categoryId==='cat-van-phong'&&p.price<=20000000).slice(0,3).map(p=>p.id),seo:{title:g[0],description:g[1],ogImageAssetId:cover.media[0].assetId}});
      await api.writePost(env,row.postId,{expectedRevision:row.revision,action:'publish',document:d});
    }
    db.prepare("UPDATE PostCategory SET name='Cẩm nang chọn máy' WHERE id='demo-guides'").run();
    const home=await api.getLandingPageDetail(DB,'home');
    const h=home.document;
    h.title='CitiLap | Chọn laptop đúng nhu cầu';h.internalName='Trang chủ demo hoàn chỉnh';h.seo={title:h.title,description:'Laptop gaming, văn phòng, đồ họa và phụ kiện. So sánh cấu hình, chọn theo ngân sách và trải nghiệm đặt hàng.',ogImageAssetId:featured[0].media[0].assetId};
    const groups={'sec-new':['Lựa chọn nổi bật','Những cấu hình đáng cân nhắc cho học tập và công việc',p=>p.price>=15000000&&p.price<=30000000,'/collection/goi-y-office'], 'sec-gaming':['Laptop gaming','Chọn GPU và màn hình theo tựa game bạn chơi',p=>p.categoryId==='cat-gaming','/category/laptop-gaming'],'sec-ultrabook':['Laptop văn phòng','Tập trung vào công việc, học tập và đa nhiệm',p=>p.categoryId==='cat-van-phong','/category/laptop-van-phong'],'sec-accessories':['Phụ kiện cho góc làm việc','Hub kết nối, RAM, SSD và phụ kiện thiết yếu',p=>p.template==='ACCESSORY','/category/linh-kien'],'sec-best-selling':['Dễ chọn trong tầm 20 triệu','So sánh cấu hình trong cùng ngân sách',p=>p.template==='LAPTOP'&&p.price<20000000,'/collection/goi-y-office']};
    for(const s of h.sections){
      if(s.type==='banner')Object.assign(s.data,{title:'CHỌN ĐÚNG LAPTOP',subtitle:'Từ góc học tập đến những dự án lớn — bắt đầu bằng nhu cầu của bạn.',badge:'CitiLap · Gaming & Work',imageUrl:'/brand/marketing-banner-original.png',imageAssetId:null,link:'/chon-laptop',buttonText:'Tìm máy phù hợp',secondaryLink:'/category/laptop-gaming',secondaryButtonText:'Khám phá gaming'});
      if(s.type==='intro')Object.assign(s.data,{title:'Mua sắm rõ ràng, lựa chọn tự tin',subtitle:'Thông tin cần biết trước khi quyết định',features:[{id:'fit',icon:'star',title:'Theo đúng nhu cầu',description:'Tư vấn bằng công việc, phần mềm và ngân sách.'},{id:'warranty',icon:'shield',title:'Bảo hành theo gói',description:'Xem thời hạn và điều kiện trên từng sản phẩm.'},{id:'returns',icon:'refresh',title:'Đổi lỗi 7 ngày',description:'Áp dụng theo điều kiện và kết quả kiểm tra.'},{id:'shipping',icon:'truck',title:'Giao hàng toàn quốc',description:'Phí giao và phương án đồng kiểm xác nhận khi tư vấn.'}]});
      if(s.type==='featured_categories')Object.assign(s.data,{title:'Bạn cần laptop để làm gì?',subtitle:'Khám phá theo nhu cầu sử dụng',categoryIds:['cat-gaming','cat-van-phong','cat-do-hoa','cat-macbook','cat-like-new','cat-phu-kien'],items:[]});
      if(groups[s.id]){const [title,subtitle,filter,link]=groups[s.id];Object.assign(s.data,{title,subtitle,badge:'CitiLap chọn lọc',rankNumbering:false,sourceMode:'manual',manualProductIds:featured.filter(filter).sort((a,b)=>a.price-b.price).slice(0,8).map(p=>p.id),links:[{label:'Xem tất cả',href:link}],viewAllLink:link});}
      if(s.type==='news_reviews')Object.assign(s.data,{title:'Cẩm nang chọn và sử dụng laptop',subtitle:'Thông tin thực tế trước khi chọn cấu hình',postIds:posts.map(p=>p.postId)});
      if(s.type==='cta')Object.assign(s.data,{title:'Cùng chọn chiếc laptop phù hợp',subtitle:'Mang theo nhu cầu và ngân sách, CitiLap giúp bạn đối chiếu từng cấu hình.',primaryText:'Đặt lịch tư vấn',primaryLink:'/lien-he?intent=appointment',phone:'0899.188.186',secondaryText:'Liên hệ CitiLap',secondaryLink:'/lien-he',bgImageUrl:'/brand/store-photo-01.jpg'});
      if(s.type==='featured_brands')Object.assign(s.data,{subtitle:'Khám phá cấu hình theo hãng bạn quan tâm',brandIds:['br-lenovo','br-dell','br-hp','br-asus','br-acer','br-apple']});
    }
    await api.writeLandingPage(env,'home',{expectedRevision:home.revision,action:'publish',document:h});
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    const checks=db.prepare("SELECT count(*) n FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.slug LIKE 'ref-tgs-%' AND p.price>0 AND p.stock>0 AND p.status='ACTIVE' AND json_extract(s.published,'$.availability')='AVAILABLE'").get();
    assert.equal(checks.n,rows.length);
    writeFileSync(marker,JSON.stringify({completedAt:now,products:rows.length,posts:posts.length,example:featured[0].id,variantId:featured[0].variants[0].id,price:featured[0].price},null,2));
    console.log('PASS demo catalog, inventory, CMS and foreign keys:',checks.n);
} finally { if(mf) await mf.dispose(); db.close(); }
