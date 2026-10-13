import http from 'node:http';
import { build } from 'esbuild';

const PORT = 3088;

console.log('Building SettingsPage client bundle and defaults...');
const bundle = await build({
  stdin: {
    contents: `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import SettingsPage from './src/app/admin/settings/page';
      import { DEFAULT_ADMIN_SETTINGS } from './src/contracts/cms/settings';
      
      // Expose defaults for server
      if (typeof window !== 'undefined') {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(SettingsPage));
      }
      export { DEFAULT_ADMIN_SETTINGS };
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  write: false,
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env': '{}',
  },
});
const clientJs = bundle.outputFiles[0].text;

const serverBundle = await import(
  `data:text/javascript;base64,${Buffer.from(clientJs).toString('base64')}`
);
const DEFAULT_SETTINGS = serverBundle.DEFAULT_ADMIN_SETTINGS;

// In-memory state simulating isolated D1
let currentRevision = 0;
let currentDocument = { ...DEFAULT_SETTINGS };
let simulateMode = null; // 'load_error' | 'save_error' | 'conflict' | 'unauthorized' | 'csrf'

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Settings - CitiLap Browser Test</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-4 md:p-8">
  <div class="max-w-6xl mx-auto mb-4 p-3 bg-slate-800 text-white rounded-xl text-xs flex flex-wrap gap-2 items-center justify-between shadow-sm">
    <div class="font-bold flex items-center gap-2">
      <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
      CitiLap Isolated Test Harness (Port ${PORT})
    </div>
    <div class="flex flex-wrap gap-2">
      <button id="btn-mode-normal" onclick="setSimulate(null)" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer">Bình thường</button>
      <button id="btn-mode-load-error" onclick="setSimulate('load_error')" class="px-2.5 py-1 bg-red-900 hover:bg-red-800 rounded cursor-pointer">Lỗi tải (503)</button>
      <button id="btn-mode-save-error" onclick="setSimulate('save_error')" class="px-2.5 py-1 bg-amber-900 hover:bg-amber-800 rounded cursor-pointer">Lỗi lưu (500)</button>
      <button id="btn-mode-conflict" onclick="setSimulate('conflict')" class="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 rounded cursor-pointer">Xung đột (409)</button>
      <button id="btn-mode-unauthorized" onclick="setSimulate('unauthorized')" class="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 rounded cursor-pointer">Hết phiên (401)</button>
    </div>
  </div>
  <div id="root"></div>
  <script>
    function setSimulate(mode) {
      fetch('/api/test/simulate?mode=' + (mode || ''), { method: 'POST' })
        .then(() => window.location.reload());
    }
  </script>
  <script type="module" src="/bundle.js"></script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/test/simulate' && req.method === 'POST') {
    simulateMode = url.searchParams.get('mode') || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, simulateMode }));
    return;
  }

  // GET /api/admin/settings
  if (url.pathname === '/api/admin/settings' && req.method === 'GET') {
    if (simulateMode === 'load_error') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Mất kết nối tới cơ sở dữ liệu D1 (mô phỏng sự cố mạng).' }));
      return;
    }
    if (simulateMode === 'unauthorized') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Chưa đăng nhập quản trị hoặc phiên làm việc đã hết hạn (401).' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        revision: currentRevision,
        document: currentDocument,
      },
    }));
    return;
  }

  // POST /api/admin/settings
  if (url.pathname === '/api/admin/settings' && req.method === 'POST') {
    let bodyText = '';
    req.on('data', (chunk) => { bodyText += chunk; });
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Dữ liệu JSON không hợp lệ.' }));
        return;
      }

      if (simulateMode === 'save_error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Lỗi máy chủ D1 khi lưu cài đặt (mô phỏng).' }));
        return;
      }
      if (simulateMode === 'unauthorized') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Phiên đăng nhập đã hết hạn (401).' }));
        return;
      }
      if (simulateMode === 'csrf') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Lỗi kiểm tra bảo mật CSRF (403).' }));
        return;
      }

      if (simulateMode === 'conflict' || body.expectedRevision !== currentRevision) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Xung đột phiên bản (409): Cài đặt đã được người khác chỉnh sửa (server: rev #${currentRevision}, bạn gửi: rev #${body.expectedRevision}). Giữ nguyên nội dung bạn đang sửa và không tự động ghi đè.`,
        }));
        return;
      }

      // Successful save
      currentRevision++;
      currentDocument = { ...currentDocument, ...body.document };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Đã cập nhật cấu hình Storefront thành công!',
        data: {
          revision: currentRevision,
          document: currentDocument,
        },
      }));
    });
    return;
  }

  if (url.pathname === '/bundle.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(clientJs);
    return;
  }

  if (url.pathname === '/' || url.pathname === '/admin/settings') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Settings Browser Harness Server running at http://localhost:${PORT}`);
});
