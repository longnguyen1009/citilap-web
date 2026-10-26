import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const brandsOnly = process.argv[3] === '--brand-levels';
const menuCategories = process.argv[3] === '--menu-categories';
assert(process.argv[2] === '--local' && process.argv.length <= 4 && (!process.argv[3] || brandsOnly || menuCategories), 'Usage: node scripts/register-storefront-taxonomy.mjs --local [--brand-levels|--menu-categories]');
const root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files = readdirSync(root).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
  const db = new DatabaseSync(resolve(root,f), {readOnly:true});
  try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='NavigationStudio'").get(); } finally { db.close(); }
});
assert.equal(files.length,1,'Refuse ambiguous local CMS database');
const target = realpathSync(resolve(root,files[0])), rel = relative(root,target);
assert(!rel.startsWith('..') && !isAbsolute(rel));
const sqlite = new DatabaseSync(target);
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');
const DB = {prepare(sql) {
  let args=[];
  return {bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)??null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};
},async batch(statements){
  sqlite.exec('BEGIN IMMEDIATE');
  try {const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}
  catch(error){sqlite.exec('ROLLBACK');throw error;}
}};
let mf;
try {
  const row=sqlite.prepare("SELECT * FROM NavigationStudio WHERE id='site'").get();
  assert(row?.published,'Need existing published navigation');
  assert.equal(row.draft,row.published,'Preserve unpublished navigation draft');
  mkdirSync('.wrangler/backups',{recursive:true});
  const destination=resolve('.wrangler/backups',`before-taxonomy-${Date.now()}.sqlite`);
  await backup(sqlite,destination);
  console.log('Backup:',destination);
  await build({stdin:{contents:`export {writeNavigation} from './src/server/services/navigation.service'; export {writeStudio} from './src/server/services/product-studio.service';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',external:['node:*','cloudflare:workers'],outfile:'scripts/.taxonomy-bundle.mjs',plugins:[{name:'wasm',setup(b){b.onResolve({filter:/\.wasm/},a=>({path:a.path,external:true}));}}]});
  const api=await import('./.taxonomy-bundle.mjs');
  mf=new Miniflare({...convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("local taxonomy")}}',compatibilityDate:'2026-10-01',r2Buckets:{PRODUCT_MEDIA:'citilap-media-dev'}}),resourcePersistencePath:resolve('.wrangler/state/v3')});
  const env={DB,PRODUCT_MEDIA:await mf.getR2Bucket('PRODUCT_MEDIA')};
  const d=JSON.parse(row.published);
  function category(slug,name,parentId=null,existingId) {
    let c=d.categories.find(c=>c.id===existingId||c.slug===slug);
    if(!c){c={id:'taxonomy-'+slug,slug,name,parentId,description:'',visible:true,image:'',assetId:'',alt:name};d.categories.push(c);}
    Object.assign(c,{slug,name,parentId,visible:true});
    return c.id;
  }
  if (menuCategories) {
    const snapshot = () => JSON.stringify(['Product','ProductVariant','OrderItem'].map(table => sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map(({categoryId,updatedAt,...rest}) => table === 'Product' ? rest : {categoryId,updatedAt,...rest})));
    const before = snapshot();
    const collectionsBefore = JSON.stringify(d.collections);
    const groupedFamilies = {
      'dell-xps-latitude':['dell-xps','dell-latitude-inspiron'],
      'asus-zenbook-vivobook':['asus-zenbook','asus-vivobook'],
      'hp-elitebook-omnibook':['hp-elitebook-probook','hp-spectre-envy-omnibook'],
      'acer-swift-aspire':['acer-swift','acer-aspire'],
    };
    const productChanges = new Map();
    let converted = 0;
    for (const menu of d.menus.main) {
      if (menu.target.kind !== 'category') continue;
      const parent = d.categories.find(c => c.id === menu.target.id);
      assert(parent && !parent.parentId, 'Menu parent must be a root category');
      for (const child of menu.children) {
        if (child.target.kind === 'category') {
          const c = d.categories.find(c => c.id === child.target.id);
          assert(c, 'Missing menu category');
          c.parentId = parent.id;
          continue;
        }
        if (child.target.kind !== 'collection') continue;
        const collection = d.collections.find(c => c.id === child.target.id);
        assert(collection, 'Missing menu collection');
        const slug = collection.slug === 'dell-alienware' ? 'dell-gaming-alienware' : collection.slug;
        const id = category(slug,child.label,parent.id);
        const c = d.categories.find(c => c.id === id);
        Object.assign(c,{description:collection.description,image:collection.image || '',alt:child.label});
        for (const family of groupedFamilies[slug] || []) {
          const descendant = d.categories.find(c => c.slug === family);
          assert(descendant, 'Missing grouped family: '+family);
          descendant.parentId = id;
        }
        child.target = {kind:'category',id};
        converted++;
      }
    }
    for (const menu of d.menus.main.filter(m=>m.target.kind==='category')) for (const child of menu.children) {
      const collection = d.collections.find(c=>c.name===child.label);
      if (!collection) continue;
      const descendants = new Set([child.target.id]);
      for (let size=-1;size!==descendants.size;) {
        size=descendants.size;
        for (const c of d.categories) if (descendants.has(c.parentId)) descendants.add(c.id);
      }
      for (const productId of collection.productIds) {
        const product = sqlite.prepare('SELECT p.id,p.categoryId,s.revision,s.draft,s.published FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.id=? AND p.deletedAt IS NULL').get(productId);
        assert(product?.published, 'Missing published menu product: '+productId);
        if (descendants.has(product.categoryId)) continue;
        assert(!productChanges.has(productId), 'Overlapping primary menu categories');
        assert.equal(product.draft,product.published,'Preserve unpublished product draft');
        productChanges.set(productId,{product,categoryId:child.target.id});
      }
    }
    if (JSON.stringify(d)!==row.published) await api.writeNavigation(env,{expectedRevision:row.revision,action:'publish',document:d});
    const statements = [];
    for (const {product,categoryId} of productChanges.values()) {
      const document = JSON.stringify({...JSON.parse(product.published),categoryId});
      statements.push(
        DB.prepare('UPDATE Product SET categoryId=? WHERE id=?').bind(categoryId,product.id),
        DB.prepare('INSERT INTO ProductStudioRevision(productId,revision,document,action) VALUES(?,?,?,?)').bind(product.id,product.revision+1,document,'publish'),
        DB.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=revision+1,publishedRevision=revision+1,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').bind(document,document,product.id),
      );
    }
    if (statements.length) await DB.batch(statements);
    assert.equal(snapshot(),before,'Product fields, variant data or order history changed');
    assert.equal(JSON.stringify(d.collections),collectionsBefore,'Existing collections changed');
    for (const menu of d.menus.main.filter(m=>m.target.kind==='category')) for (const child of menu.children) {
      assert.equal(child.target.kind,'category');
      assert.equal(d.categories.find(c=>c.id===child.target.id)?.parentId,menu.target.id);
    }
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
    console.log(JSON.stringify({convertedMenuCategories:converted,registeredProducts:productChanges.size,result:'PASS: all category menu children are level 2; product prices, variants and orders unchanged'}));
  } else if (brandsOnly) {
    const snapshot = () => JSON.stringify(['Product','ProductVariant','ProductStudio','OrderItem'].map(table => sqlite.prepare(`SELECT * FROM ${table} ORDER BY ${table === 'ProductStudio' ? 'productId' : 'id'}`).all()));
    const before = snapshot();
    const available = new Set(sqlite.prepare("SELECT p.id FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL)").all().map(p=>p.id));
    let removedReferences=0;
    for (const [key, items] of Object.entries(d.menus)) {
      d.menus[key]=items.filter(item=>{const keep=item.target.kind!=='product'||available.has(item.target.id);if(!keep)removedReferences++;return keep;}).map(item=>({...item,children:item.children.filter(child=>{const keep=child.target.kind!=='product'||available.has(child.target.id);if(!keep)removedReferences++;return keep;})}));
    }
    for (const collection of d.collections) collection.productIds=collection.productIds.filter(id=>{const keep=available.has(id);if(!keep)removedReferences++;return keep;});
    console.log('Removed references to products already deleted from local catalog:',removedReferences);
    const gaming = d.categories.find(c => c.slug === 'laptop-gaming');
    assert(gaming, 'Gaming root missing');
    for (const [slug, name, families] of [
      ['lenovo','Lenovo',['lenovo-legion','lenovo-loq']],
      ['asus','Asus',['asus-rog','asus-tuf']],
      ['acer','Acer',['acer-nitro','acer-predator']],
      ['msi','MSI',['msi-gaming']],
      ['hp','HP',['hp-omen-victus']],
      ['dell','Dell',['dell-gaming-alienware']],
      ['gigabyte','Gigabyte',['gigabyte-gaming']],
    ]) {
      const id = category(slug,name,gaming.id);
      for (const family of d.categories.filter(c => families.includes(c.slug))) family.parentId=id;
    }
    if (JSON.stringify(d)!==row.published) await api.writeNavigation(env,{expectedRevision:row.revision,action:'publish',document:d});
    assert.equal(snapshot(),before,'Product data and order history changed');
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
    console.log('PASS local brand levels: /laptop-gaming/lenovo/lenovo-legion; product data/order history unchanged.');
  } else {
  const gaming=category('laptop-gaming','Laptop Gaming',null,'cat-gaming');
  const office=category('laptop-van-phong','Laptop Văn Phòng',null,'cat-van-phong');
  const ultra=category('laptop-ultrabook','Laptop Ultrabook');
  const work=category('laptop-workstation','Laptop Workstation',null,'cat-do-hoa');
  const mac=category('macbook','Apple MacBook',null,'cat-macbook');
  const accessories=category('phu-kien','Phụ kiện',null,'cat-phu-kien');
  const fresh=category('laptop-moi','Laptop Mới');
  const used=category('laptop-likenew','Laptop Like New',null,'cat-like-new');
  const rules=[];
  function line(parent,slug,name,match,existingId){const id=category(slug,name,parent,existingId);rules.push({id,match,accessory:parent===accessories});return id;}
  const legion=line(gaming,'lenovo-legion','Lenovo Legion',/\blegion\b/i);
  line(gaming,'lenovo-loq','Lenovo LOQ',/\bloq\b/i);
  line(gaming,'asus-rog','Asus ROG',/\brog\b/i);
  line(gaming,'asus-tuf','Asus TUF Gaming',/\btuf\b/i);
  line(gaming,'acer-nitro','Acer Nitro',/\bnitro\b/i);
  line(gaming,'acer-predator','Acer Predator',/\bpredator\b/i);
  line(gaming,'msi-gaming','MSI Gaming',/\bmsi\b.*\b(katana|thin|cyborg|sword|raider|titan|stealth|crosshair|pulse|vector)\b/i);
  line(gaming,'hp-omen-victus','HP Omen & Victus',/\b(omen|victus)\b/i);
  line(gaming,'dell-gaming-alienware','Dell Gaming & Alienware',/\balienware\b|\bdell\s+g\d/i);
  line(gaming,'gigabyte-gaming','Gigabyte Gaming',/\b(gigabyte|aorus)\b/i);
  line(office,'lenovo-thinkpad-thinkbook','Lenovo ThinkPad & ThinkBook',/thinkpad(?!\s+p\d)|thinkbook/i);
  line(office,'dell-latitude-inspiron','Dell Latitude & Inspiron',/latitude|inspiron/i);
  line(office,'hp-elitebook-probook','HP EliteBook & ProBook',/elitebook|probook/i);
  line(office,'asus-vivobook','Asus Vivobook',/vivobook/i);
  line(office,'acer-aspire','Acer Aspire',/aspire/i);
  line(office,'msi-modern','MSI Modern',/msi.*modern/i);
  line(ultra,'dell-xps','Dell XPS',/\bxps\b/i);
  line(ultra,'asus-zenbook','Asus Zenbook',/zenbook/i);
  line(ultra,'lenovo-yoga','Lenovo Yoga',/\byoga\b/i);
  line(ultra,'lg-gram','LG Gram',/\blg\b.*\bgram\b/i);
  line(ultra,'acer-swift','Acer Swift',/\bswift\b/i);
  line(ultra,'hp-spectre-envy-omnibook','HP Spectre, Envy & OmniBook',/spectre|\benvy\b|omnibook/i);
  line(ultra,'samsung-galaxy-book','Samsung Galaxy Book',/galaxy\s*book/i);
  line(work,'dell-precision','Dell Precision',/precision/i);
  line(work,'lenovo-thinkpad-p','Lenovo ThinkPad P',/thinkpad\s+p\d/i);
  line(work,'hp-zbook','HP ZBook',/zbook/i);
  line(mac,'macbook-air','MacBook Air',/macbook\s+air/i);
  line(mac,'macbook-pro','MacBook Pro',/macbook\s+pro/i);
  line(accessories,'chuot','Chuột',/chuột|\bmouse\b/i);
  line(accessories,'ban-phim','Bàn phím',/bàn phím|keyboard/i);
  line(accessories,'balo-tui-laptop','Balo & Túi laptop',/balo|túi.*(laptop|chống sốc)/i,'ref-accessory-bag');
  line(accessories,'sac-cap','Sạc & Cáp',/sạc|charger|cáp/i,'ref-accessory-charger');
  line(accessories,'hub-usb-c','Hub USB-C',/\bhub\b/i,'ref-accessory-hub');
  line(accessories,'gia-do-tan-nhiet','Giá đỡ & Tản nhiệt',/giá đỡ|tản nhiệt/i,'ref-accessory-stand');
  line(accessories,'den-man-hinh','Đèn màn hình',/đèn.*màn hình/i,'ref-accessory-screenbar');
  line(accessories,'tai-nghe','Tai nghe & Âm thanh',/tai nghe|headphone/i,'ref-accessory-audio');
  line(accessories,'ram-ssd','RAM & SSD',/^(ram|ssd)\b|ổ cứng/i,'ref-accessory-hardware');
  line(legion,'legion-5-2023','Legion 5 2023',/legion\s+5\b.*(2023|15arp8|15irh8)/i);
  // Match specific model before family; condition groups remain independent projections.
  rules.unshift(rules.pop());
  const products=sqlite.prepare('SELECT p.id,p.name,p.categoryId,s.revision,s.draft,s.published FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL').all();
  const changes=products.flatMap(p=>{
    const document=p.published?JSON.parse(p.published):null;
    const accessory=document?document.template!=='LAPTOP':/^(?:\[[^\]]+\]\s*)*(?:balo|chuột|bàn phím|ram|ssd|hub|cáp|sạc|đế|tai nghe|túi|giá đỡ|đèn|bộ chuyển đổi)(?:\s|$)/i.test(p.name);
    const rule=rules.find(r=>r.accessory===accessory&&r.match.test(p.name));
    return rule&&rule.id!==p.categoryId?[{p,categoryId:rule.id}]:[];
  });
  for(const {p} of changes) if(p.published) assert.equal(p.draft,p.published,'Preserve unpublished product draft: '+p.id);
  const financial=JSON.stringify(sqlite.prepare('SELECT id,price,originalPrice FROM Product ORDER BY id').all());
  if(JSON.stringify(d)!==row.published) await api.writeNavigation(env,{expectedRevision:row.revision,action:'publish',document:d});
  let updated=0, skippedDrafts=0;
  for(const {p,categoryId} of changes){
    if(p.published) {await api.writeStudio(env,p.id,{expectedRevision:p.revision,action:'publish',document:{...JSON.parse(p.published),categoryId}});updated++;}
    else if(!p.draft) {await DB.prepare('UPDATE Product SET categoryId=? WHERE id=?').bind(categoryId,p.id).run();updated++;}
    else skippedDrafts++;
  }
  assert.equal(JSON.stringify(sqlite.prepare('SELECT id,price,originalPrice FROM Product ORDER BY id').all()),financial,'Product prices unchanged');
  assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
  const accessoryIds=new Set([accessories]);
  for(let size=-1;size!==accessoryIds.size;){size=accessoryIds.size;for(const c of d.categories)if(accessoryIds.has(c.parentId))accessoryIds.add(c.id);}
  const published=sqlite.prepare("SELECT p.categoryId,json_extract(s.published,'$.template') template FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL").all();
  for(const p of published)assert.equal(accessoryIds.has(p.categoryId),p.template!=='LAPTOP','Published laptop/accessory classification must match template');
  console.log(JSON.stringify({categories:d.categories.filter(c=>c.visible).length,registeredProductCategories:updated,preservedUnpublishedDrafts:skippedDrafts,example:'/laptop-gaming/lenovo-legion/legion-5-2023'}));
  }
} finally {if(mf)await mf.dispose();sqlite.close();}
