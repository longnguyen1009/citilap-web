import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = 'https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev';
const profile = await mkdtemp(resolve('.wrangler/turnstile-browser-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let socket, sequence = 0;
const calls = new Map();
async function until(fn) { for (let i = 0; i < 150; i++) { const r = await fn(); if (r) return r; await sleep(200); } throw Error('Browser timeout'); }
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); reject(Error(method + ' timeout')); }, 15000);
    calls.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
  return r.result.value;
}
try {
  const port = await until(async () => { try { return (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; } catch { return null; } });
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(r => r.json());
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await once(socket, 'open');
  socket.addEventListener('message', e => { const m = JSON.parse(e.data), call = calls.get(m.id); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('Browser error:', m.params.args.map(a=>a.value).filter(v=>typeof v==='string' && /turnstile|cloudflare/i.test(v))); if (!call) return; calls.delete(m.id); clearTimeout(call.timer); m.error ? call.reject(Error(m.error.message)) : call.resolve(m.result); });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__challengeErrors=[];window.addEventListener('message',e=>{if(e.origin==='https://challenges.cloudflare.com' && e.data?.event==='fail')window.__challengeErrors.push({code:e.data.code});});` });
  await cdp('Page.navigate', { url: base + '/lien-he' });
  await until(() => js("typeof window.turnstile==='object' && !!document.querySelector('input[name=\"cf-turnstile-response\"]')"));
  await sleep(10000);
  const state = await js("({widget:!!document.querySelector('input[name=\"cf-turnstile-response\"]'),submitDisabled:document.querySelector('input[name=\"cf-turnstile-response\"]')?.closest('form')?.querySelector('button[type=submit]')?.disabled,hasToken:!!document.querySelector('input[name=\"cf-turnstile-response\"]')?.value})");
  assert.ok(state.widget, 'real Turnstile widget mounted');
  assert.equal(state.submitDisabled, !state.hasToken, 'form waits for challenge');
  const response = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'missing-input-response', 'server configured and rejects missing challenge');
  const challengeError = await js("document.querySelector('[role=alert]')?.textContent || null");
  const challengeErrors = await js('window.__challengeErrors');
  console.log('Turnstile error codes:', challengeErrors);
  await writeFile('docs/admin/evidence/r09b-turnstile.json', JSON.stringify({ recordedAt: new Date().toISOString(), base, widgetMounted: true, submitWaitsForChallenge: true, missingTokenStatus: response.status, missingTokenCode: body.error.code, challengeError, challengeErrors, scope: 'Widget mount and fail-closed API only; human challenge and submitted order/contact remain unverified' }, null, 2) + '\n');
  console.log('Widget mount, submit guard, missing-token rejection PASS; human challenge NOT VERIFIED', challengeError || '');
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) console.log(await js("({url:location.href,turnstile:typeof window.turnstile,forms:document.forms.length,scripts:[...document.scripts].map(s=>s.src).filter(s=>s.includes('challenges')),alert:document.querySelector('[role=alert]')?.textContent,widget:!!document.querySelector('input[name=\"cf-turnstile-response\"]')})"));
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await cdp('Browser.close').catch(() => {}); socket.close(); }
  chrome.kill(); await sleep(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
