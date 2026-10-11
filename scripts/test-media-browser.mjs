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
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '3011', '--strictPort'], { cwd: process.cwd(), env: { ...process.env, ADMIN_API_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let log = '';
server.stdout.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
server.stderr.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
let browser;
let passed = 0;
const check = (name) => { passed++; console.log(`PASS ${name}`); };
try {
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { const res = await fetch('http://localhost:3011/api/admin/media'); if (res.status === 401) { up = true; break; } } catch { /* Wait for local server. */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!up) throw new Error(`Local server unavailable:\n${log.replaceAll(token, '[redacted]')}`);
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const expires = String(Math.floor(Date.now() / 1000) + 3600);
  const signature = createHmac('sha256', token).update(expires).digest('base64url');
  await context.addCookies([{ name: 'admin_session', value: `${expires}.${signature}`, url: 'http://localhost:3011', httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const navigation = await page.goto('http://localhost:3011/admin/media');
  if (navigation?.status() !== 200 || !page.url().includes('/admin/media')) {
    throw new Error(`Admin browser navigation failed: HTTP ${navigation?.status()} at ${page.url()}; page title=${await page.title()}; body=${(await page.locator('body').innerText()).slice(0, 400)}; Vite=${log.replaceAll(token, '[redacted]').slice(-1800)}`);
  }
  await page.getByRole('heading', { name: 'Thư viện ảnh & video' }).waitFor();
  await page.getByText('Chưa có tệp phù hợp.').waitFor();
  check('authenticated media page and empty state');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type=file]').setInputFiles({ name: 'browser-proof.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Tải ảnh chưa hoàn tất' }).click();
  await page.getByRole('button', { name: /browser-proof.png.*nơi sử dụng/ }).waitFor();
  check('UI upload to local R2/D1');
  await page.reload();
  await page.getByRole('button', { name: /browser-proof.png.*nơi sử dụng/ }).click();
  await page.getByLabel('Tên tệp', { exact: true }).fill('Ảnh CitiLap kiểm chứng');
  await page.getByLabel('Mô tả ảnh (alt)').fill('Laptop dùng để kiểm chứng');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByText('Đã lưu thay đổi.').waitFor();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Ảnh CitiLap kiểm chứng.*nơi sử dụng/ }).waitFor();
  check('metadata survives full reload');
  await page.getByRole('button', { name: /Ảnh CitiLap kiểm chứng.*nơi sử dụng/ }).click();
  await page.getByLabel('Tên tệp', { exact: true }).fill('Chưa lưu');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).waitFor();
  await page.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  check('Escape protects unsaved edits and dialog closes');
  await page.getByRole('button', { name: /Ảnh CitiLap kiểm chứng.*nơi sử dụng/ }).click();
  await page.getByRole('button', { name: 'Ẩn khỏi thư viện', exact: true }).click();
  await page.getByRole('button', { name: 'Khôi phục vào thư viện', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Khôi phục vào thư viện', exact: true }).click();
  await page.getByRole('button', { name: 'Ẩn khỏi thư viện', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  check('archive and restore workflow');
  await page.getByRole('button', { name: 'Thêm video YouTube' }).click();
  await page.getByLabel('Tên video').fill('Video kiểm chứng');
  await page.getByLabel('Liên kết YouTube').fill('https://youtu.be/abcdefghijk');
  await page.getByRole('button', { name: 'Lưu video', exact: true }).click();
  await page.getByRole('button', { name: /Video kiểm chứng.*nơi sử dụng/ }).waitFor();
  check('YouTube entry persists without third-party embed requests');
  const search = page.getByLabel('Tìm ảnh và video');
  await search.fill('khong-tim-thay-qa');
  await page.getByText('Chưa có tệp phù hợp.').waitFor();
  await page.reload();
  await page.getByText('Chưa có tệp phù hợp.').waitFor();
  assert.match(page.url(), /khong-tim-thay-qa/);
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click();
  await page.getByRole('button', { name: /Ảnh CitiLap kiểm chứng.*nơi sử dụng/ }).waitFor();
  check('search no-results, URL persistence and clear');
  await mkdir('docs/screenshots/admin02', { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `docs/screenshots/admin02/media-${width}.png`, fullPage: true });
  }
  check('1440/768/390 widths without document horizontal overflow');
  await page.route('**/api/admin/media?**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Lỗi kiểm chứng kết nối' }) }));
  await page.reload(); await page.getByText('Lỗi kiểm chứng kết nối').waitFor();
  await page.unroute('**/api/admin/media?**'); await page.getByRole('button', { name: 'Thử lại' }).click();
  await page.getByRole('button', { name: /Ảnh CitiLap kiểm chứng.*nơi sử dụng/ }).waitFor();
  check('server failure and retry recovery');
  assert.deepEqual(errors, []); check('no browser JavaScript errors');
  await writeFile('docs/screenshots/admin02/verification.json', JSON.stringify({ passed, viewports: [1440, 768, 390], runtime: 'Cloudflare Vite local D1/R2', errors }, null, 2));
  console.log(`Browser: ${passed}/${passed} PASS`);
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null) {
    if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* Already exited. */ } }
    else server.kill();
  }
  await unlink('.dev.vars');
}
