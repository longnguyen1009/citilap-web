// Test all routes on Vinext runtime
const baseUrl = 'http://localhost:3002';
const routes = [
  { path: '/', expectedStatus: 200 },
  { path: '/category', expectedStatus: 200 },
  { path: '/category/laptop-gaming', expectedStatus: 200 },
  { path: '/search?q=legion', expectedStatus: 200 },
  { path: '/product/lenovo-legion-5-pro-16arx8', expectedStatus: 200 },
  { path: '/cart', expectedStatus: 200 },
  { path: '/checkout', expectedStatus: 200 },
  { path: '/gioi-thieu', expectedStatus: 200 },
  { path: '/lien-he', expectedStatus: 200 },
  { path: '/he-thong-cua-hang', expectedStatus: 200 },
  { path: '/sitemap.xml', expectedStatus: [200, 304] },
  { path: '/robots.txt', expectedStatus: 200 },
  { path: '/api/media/products/lenovo-legion-5-pro-front.webp', expectedStatus: [200, 307, 404] },
  { path: '/admin/orders', expectedStatus: [200, 307, 308] }, // redirect to login
  { path: '/admin/contacts', expectedStatus: [200, 307, 308] }, // redirect to login
];

async function run() {
  console.log('Testing routes against Vinext runtime:', baseUrl);
  const results = [];
  for (const r of routes) {
    try {
      const res = await fetch(`${baseUrl}${r.path}`, { redirect: 'manual' });
      const text = await res.text();
      const statusOk = Array.isArray(r.expectedStatus) 
        ? r.expectedStatus.includes(res.status) 
        : res.status === r.expectedStatus;
      results.push({
        path: r.path,
        status: res.status,
        passed: statusOk,
        contentType: res.headers.get('content-type'),
        cacheControl: res.headers.get('cache-control'),
        contentLength: text.length
      });
      console.log(`[${statusOk ? 'PASS' : 'FAIL'}] ${r.path} -> ${res.status} (length: ${text.length})`);
    } catch (err) {
      console.log(`[ERROR] ${r.path} -> ${err.message}`);
      results.push({ path: r.path, status: 'ERROR', passed: false, error: err.message });
    }
  }

  const allPassed = results.every(r => r.passed);
  console.log('\nFinal Verdict:', allPassed ? 'ALL ROUTES PASSED' : 'SOME ROUTES FAILED');
  return { allPassed, results };
}

run();
