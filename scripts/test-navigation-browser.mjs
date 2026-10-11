// Isolated local UI QA. No account/password is created; session secret is temporary.
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile, writeFile, mkdir, unlink, access } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const modulePath = process.env.MEDIA_PLAYWRIGHT_MODULE || path.join(tmpdir(), 'citilap-media-qa/node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);
try { await access('.dev.vars'); throw new Error('Refusing to overwrite existing .dev.vars; run QA in an isolated worktree.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const token = randomBytes(32).toString('hex');
await writeFile('.dev.vars', `ADMIN_API_TOKEN=${token}\n`, 'utf8');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '3014', '--strictPort'], { cwd: process.cwd(), env: { ...process.env, ADMIN_API_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let log = '';
server.stdout.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
server.stderr.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
let browser;
let passed = 0;
const check = (name) => { passed++; console.log(`PASS ${name}`); };
try {
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { const res = await fetch('http://localhost:3014/api/admin/media'); if (res.status === 401) { up = true; break; } } catch { /* Wait for local server. */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!up) throw new Error(`Local server unavailable:\n${log.replaceAll(token, '[redacted]')}`);
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const expires = String(Math.floor(Date.now() / 1000) + 3600);
  const signature = createHmac('sha256', token).update(expires).digest('base64url');
  await context.addCookies([{ name: 'admin_session', value: `${expires}.${signature}`, url: 'http://localhost:3014', httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = 'http://localhost:3014';

  const stamp=Date.now(),headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const before=await (await fetch(base+'/api/catalog/navigation')).json();
  const initial=(await (await fetch(base+'/api/admin/navigation',{headers})).json()).data;
  const categoryId=initial.document.categories.find(c=>c.visible).id;
  const form=new FormData();form.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')],`nav-${stamp}.png`,{type:'image/png'}));
  const image=(await (await fetch(base+'/api/admin/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form})).json()).data.asset;
  const productName=`Phụ kiện QA ${stamp}`;
  const product={schemaVersion:1,name:productName,slug:`nav-product-${stamp}`,categoryId,brand:'',template:'ACCESSORY',description:'',contentHtml:'',price:200000,originalPrice:null,availability:'AVAILABLE',seoTitle:'',seoDescription:'',specs:[],variants:[],warranties:[],media:[{assetId:image.id,alt:'QA',variantId:''}]};
  const created=await fetch(base+'/api/admin/product-studio',{method:'POST',headers,body:JSON.stringify({expectedRevision:0,action:'publish',document:product})});assert.equal(created.status,200,await created.clone().text());const productId=(await created.json()).data.id;
  await page.goto(base+'/admin/navigation');await page.getByRole('button',{name:'Xuất bản',exact:true}).waitFor();
  await page.getByRole('button',{name:'Danh mục',exact:true}).click();
  await page.getByRole('button',{name:'+ Thêm danh mục',exact:true}).click();
  const cat=page.locator('.nav-card').last(),categoryName=`Phụ kiện ${stamp}`;
  await cat.getByLabel('Tên danh mục',{exact:true}).fill(categoryName);
  await cat.getByLabel('Slug danh mục',{exact:true}).fill(`phu-kien-${stamp}`);
  await cat.getByRole('button',{name:'Chọn ảnh danh mục',exact:true}).click();
  await page.getByLabel('Tìm ảnh và video').fill(`nav-${stamp}`);await page.getByRole('button',{name:new RegExp(`nav-${stamp}`)}).click();
  await page.getByRole('button',{name:'Bộ sưu tập',exact:true}).click();
  await page.getByRole('button',{name:'+ Thêm bộ sưu tập',exact:true}).click();
  const col=page.locator('.nav-card').last(),collectionName=`Góc làm việc ${stamp}`;
  await col.getByLabel('Tên bộ sưu tập').fill(collectionName);await col.getByLabel('Slug bộ sưu tập').fill(`goc-lam-viec-${stamp}`);
  await col.getByRole('button',{name:'+ Chọn sản phẩm',exact:true}).click();
  await page.getByLabel('Tìm sản phẩm',{exact:true}).fill(productName);await page.locator('.nav-picker').getByRole('button',{name:new RegExp(productName)}).click();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.getByRole('button',{name:'+ Thêm mục menu',exact:true}).click();
  let menu=page.locator('.nav-card').last();
  await menu.getByLabel('Nhãn menu',{exact:true}).fill(`Phụ kiện ${stamp}`);
  await menu.getByLabel('Loại liên kết').selectOption('category');await menu.getByLabel('Đích đến').selectOption({label:categoryName});
  await menu.getByRole('button',{name:'+ Thêm mục con',exact:true}).click();
  const child=menu.locator('.nav-child').last();await child.getByLabel('Nhãn menu',{exact:true}).fill(collectionName);await child.getByLabel('Loại liên kết').selectOption('collection');await child.getByLabel('Đích đến').selectOption({label:collectionName});
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByText('Đã lưu nháp.',{exact:true}).waitFor();
  assert.deepEqual(await (await fetch(base+'/api/catalog/navigation')).json(),before);check('draft categories, nested menu and collection stay private');
  await page.reload();await page.getByRole('button',{name:'Xuất bản',exact:true}).waitFor();
  menu=page.locator('.nav-card').last();assert.equal(await menu.getByLabel('Nhãn menu',{exact:true}).first().inputValue(),`Phụ kiện ${stamp}`);
  await page.getByRole('button',{name:'Bộ sưu tập',exact:true}).click();await page.getByText(productName,{exact:true}).waitFor();check('D1 reload preserves menu, collection selection and product names');
  await page.getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByText('Đã xuất bản điều hướng.',{exact:true}).waitFor();
  const pub=(await (await fetch(base+'/api/catalog/navigation')).json()).data;
  assert.equal(pub.menus.main.at(-1).href,`/category/phu-kien-${stamp}`);assert.equal(pub.menus.main.at(-1).children[0].href,`/collection/goc-lam-viec-${stamp}`);
  const collection=(await (await fetch(base+`/api/catalog/collections/goc-lam-viec-${stamp}`)).json()).data;assert.equal(collection.products[0].id,productId);
  const categories=(await (await fetch(base+'/api/categories')).json()).data;assert.equal(categories.at(-1).name,categoryName);assert.equal((await fetch(base+categories.at(-1).image)).status,200);check('published HTTP DTO, legacy categories and R2 image resolve');
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();await page.getByRole('button',{name:'Mobile',exact:true}).click();assert.equal(await page.locator('.nav-preview.is-mobile').count(),1);await page.keyboard.press('Escape');check('desktop/mobile preview uses the same resolved menu');
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.locator('.nav-card').last().getByLabel('Nhãn menu',{exact:true}).first().fill('Nháp chưa xuất bản');
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByText('Đã lưu nháp.',{exact:true}).waitFor();assert.equal((await (await fetch(base+'/api/catalog/navigation')).json()).data.menus.main.at(-1).label,`Phụ kiện ${stamp}`);check('editing published navigation leaves public snapshot unchanged');
  await page.locator('.nav-card').last().getByLabel('Nhãn menu',{exact:true}).first().fill('Unsaved');await page.getByRole('button',{name:'Tải lại từ máy chủ',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục sửa',exact:true}).click();assert.equal(await page.locator('.nav-card').last().getByLabel('Nhãn menu',{exact:true}).first().inputValue(),'Unsaved');check('unsaved reload guard preserves edits');
  await mkdir('docs/screenshots/admin04',{recursive:true});
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});for(const tab of ['Menu','Danh mục','Bộ sưu tập']){await page.getByRole('button',{name:tab,exact:true}).click();await page.locator('main').first().evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:`docs/screenshots/admin04/${tab==='Menu'?'menu':tab==='Danh m?c'?'categories':'collections'}-${width}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);}await page.getByRole('button',{name:'Menu',exact:true}).click();await page.locator('main').first().evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:`docs/screenshots/admin04/navigation-${width}.png`,fullPage:true});}check('1440/768/390 layouts have no horizontal overflow');
  assert.equal((await fetch(base+'/api/admin/navigation')).status,401);
  assert.equal((await context.request.put(base+'/api/admin/navigation',{headers:{Origin:'https://untrusted.example'},data:{}})).status(),403);
  assert.equal((await context.request.post(base+'/api/categories',{headers:{Origin:'https://untrusted.example'},data:{}})).status(),403);
  assert.equal((await fetch(base+'/api/categories',{method:'POST',headers,body:'{}'})).status,409);check('admin auth, CSRF and legacy category writer protection');
  assert.deepEqual(errors,[]);check('no browser JavaScript errors');
  await writeFile('docs/screenshots/admin04/verification.json',JSON.stringify({passed,viewports:[1440,768,390],runtime:'Cloudflare Vite local D1/R2',errors},null,2));console.log(`Navigation browser: ${passed}/${passed} PASS`);
} catch (e) {
  console.error('Vite diagnostics:', log.replaceAll(token, '[redacted]').slice(-2500));
  throw e;
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null) {
    if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* Already exited. */ } }
    else server.kill();
  }
  await unlink('.dev.vars');
}
