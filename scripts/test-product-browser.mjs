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
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '3013', '--strictPort'], { cwd: process.cwd(), env: { ...process.env, ADMIN_API_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let log = '';
server.stdout.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
server.stderr.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
let browser;
let passed = 0;
const check = (name) => { passed++; console.log(`PASS ${name}`); };
try {
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { const res = await fetch('http://localhost:3013/api/admin/media'); if (res.status === 401) { up = true; break; } } catch { /* Wait for local server. */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!up) throw new Error(`Local server unavailable:\n${log.replaceAll(token, '[redacted]')}`);
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const expires = String(Math.floor(Date.now() / 1000) + 3600);
  const signature = createHmac('sha256', token).update(expires).digest('base64url');
  await context.addCookies([{ name: 'admin_session', value: `${expires}.${signature}`, url: 'http://localhost:3013', httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = 'http://localhost:3013';
  const stamp = Date.now();
  const name = `Laptop QA ${stamp}`, slug = `laptop-qa-${stamp}`;
  const form = new FormData();
  form.set('file', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')],`studio-${stamp}.png`,{type:'image/png'}));
  const upload = await fetch(base+'/api/admin/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
  assert.equal(upload.status,200,await upload.text().then(t => { try { return JSON.parse(t).error || 'upload'; } catch { return t.slice(0,200); } }));
  console.log('HTTP media upload ready');
  await page.goto(base+'/admin/product-studio');
  console.log('Product Studio page ready');
  await page.getByRole('button',{name:'Tạo bản nháp',exact:true}).click();
  await page.getByLabel('Tên sản phẩm',{exact:true}).fill(name);
  await page.getByLabel('Slug',{exact:true}).fill(slug);
  await page.getByLabel('Danh mục',{exact:true}).selectOption('admin03-qa');
  await page.getByLabel('Giá bán (VND)',{exact:true}).fill('32990000');
  await page.getByLabel('Trạng thái trên web').selectOption('AVAILABLE');
  await page.getByLabel('CPU',{exact:true}).fill('AMD Ryzen 7 7845HX');
  await page.getByRole('button',{name:'Chọn từ thư viện'}).click();
  await page.getByLabel('Tìm ảnh và video').fill(`studio-${stamp}`);
  await page.getByRole('button',{name:new RegExp(`studio-${stamp}`)}).click();
  await page.getByRole('button',{name:'+ Thêm cấu hình',exact:true}).click();
  await page.getByLabel('Tên cấu hình').fill('16GB RAM / 512GB SSD');
  await page.getByLabel('SKU',{exact:true}).fill(`QA-${stamp}`);
  await page.getByLabel('RAM',{exact:true}).last().fill('16GB DDR5');
  await page.getByLabel('SSD',{exact:true}).last().fill('512GB');
  await page.getByRole('button',{name:'+ Thêm gói bảo hành',exact:true}).click();
  await page.getByLabel('Tên gói',{exact:true}).fill('Bảo hành 12 tháng');
  await page.getByLabel('Khuyên dùng').check();
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();
  await page.getByText('Đã lưu nháp.',{exact:true}).waitFor();
  check('create laptop draft with library image, configuration and warranty');
  assert.equal((await fetch(base+'/api/catalog/studio/'+slug)).status,404);
  check('draft absent from public HTTP endpoint');
  await page.reload();
  await page.getByRole('button',{name:new RegExp(name)}).click();
  assert.equal(await page.getByLabel('Tên sản phẩm',{exact:true}).inputValue(),name);
  assert.equal(await page.getByLabel('Tên gói',{exact:true}).inputValue(),'Bảo hành 12 tháng');
  check('D1 content persists after browser reload');
  await page.getByRole('button',{name:'Xuất bản',exact:true}).click();
  await page.getByText('Đã xuất bản sản phẩm.',{exact:true}).waitFor();
  let pub=await (await fetch(base+'/api/catalog/studio/'+slug)).json();
  assert.equal(pub.data.price,32990000); assert.equal(pub.data.canOrder,true);
  assert.equal((await fetch(base+pub.data.media[0].url)).status,200);
  check('publish real D1 and R2 public image with price and availability');
  await page.getByLabel('Giá bán (VND)',{exact:true}).fill('33990000');
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();
  await page.getByText('Đã lưu nháp.',{exact:true}).waitFor();
  pub=await (await fetch(base+'/api/catalog/studio/'+slug)).json();assert.equal(pub.data.price,32990000);
  check('saved price draft leaves published revision unchanged');
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();
  await page.getByRole('dialog').getByText('33.990.000đ',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  check('admin preview and Escape close');
  await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Chưa lưu');
  await page.getByRole('button',{name:'+ Tạo sản phẩm',exact:true}).click();
  await page.getByRole('dialog',{name:'Có thay đổi chưa lưu'}).waitFor();
  await page.getByRole('button',{name:'Tiếp tục sửa',exact:true}).click();
  await page.getByLabel('Tên sản phẩm',{exact:true}).fill(name);
  check('unsaved changes protected when changing product');
  await mkdir('docs/screenshots/admin03',{recursive:true});
  await page.locator('.studio-media-item .media-thumb img').first().waitFor({state:'visible'});
  for(const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if (width <= 1050) {
      const opener = page.getByRole('button',{name:'Chọn sản phẩm',exact:true});
      assert.equal(await opener.getAttribute('aria-expanded'),'false');
      await opener.click();
      assert.equal(await page.getByRole('button',{name:'Đóng danh sách',exact:true}).getAttribute('aria-expanded'),'true');
      await page.getByLabel('Tìm sản phẩm',{exact:true}).fill(name);
      assert.equal(await page.getByRole('button',{name:new RegExp(name)}).count(),1);
      await page.getByRole('button',{name:'Đóng danh sách',exact:true}).click();
    }
    await page.screenshot({path:`docs/screenshots/admin03/studio-${width}.png`,fullPage:true});
    const mediaCard = page.locator('.studio-media-item').first();
    assert.equal(await mediaCard.locator('.media-thumb img').evaluate(img => img.complete && img.naturalWidth > 0),true);
    assert.equal(await mediaCard.locator('input').first().inputValue().then(Boolean),true);
    await mediaCard.screenshot({path:`docs/screenshots/admin03/media-${width}.png`});
  }
  check('desktop tablet mobile without horizontal overflow');
  await page.getByRole('button',{name:'+ Tạo sản phẩm',exact:true}).click();
  await page.getByLabel('Tên sản phẩm',{exact:true}).fill(`Chuột QA ${stamp}`);
  await page.getByLabel('Slug',{exact:true}).fill(`chuot-qa-${stamp}`);
  await page.getByLabel('Danh mục',{exact:true}).selectOption('admin03-qa');
  await page.getByLabel('Mẫu thông số').selectOption('MOUSE');
  await page.getByLabel('DPI',{exact:true}).fill('26000');
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();
  await page.getByText('Đã lưu nháp.',{exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Chọn sản phẩm',exact:true}).click();
  await page.getByRole('button',{name:new RegExp(`Chuột QA ${stamp}`)}).click();
  assert.equal(await page.getByLabel('DPI',{exact:true}).inputValue(),'26000');
  check('mouse attribute template saves and reloads');
  const authHeaders={Authorization:`Bearer ${token}`};
  const items=await (await fetch(base+'/api/admin/product-studio',{headers:authHeaders})).json();
  const id=items.data.items.find(p=>p.name===name).id;
  assert.equal((await fetch(base+'/api/products/'+id)).status,200);
  assert.equal((await fetch(base+'/api/products')).status,200);
  assert.equal((await fetch(base+'/api/admin/product-studio/'+id)).status,401);
  const csrf=await context.request.put(base+'/api/admin/product-studio/'+id,{headers:{Origin:'https://untrusted.example'},data:{}});assert.equal(csrf.status(),403);
  check('legacy public D1 routes, admin authorization and CSRF');
  assert.deepEqual(errors,[]);check('no browser JavaScript errors');
  await writeFile('docs/screenshots/admin03/verification.json',JSON.stringify({passed,viewports:[1440,768,390],runtime:'Cloudflare Vite local D1/R2',errors},null,2));
  console.log(`Browser: ${passed}/${passed} PASS`);
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
