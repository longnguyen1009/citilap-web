import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function updateProductNeedsAndYears(dbPath) {
  if (!existsSync(dbPath)) return;
  console.log(`Processing database: ${dbPath}`);
  const db = new DatabaseSync(dbPath);

  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Product'").get();
    if (!tableCheck) {
      console.log(`Skipping ${dbPath} (no Product table)`);
      db.close();
      return;
    }

    const products = db.prepare(`
      SELECT p.id, p.name, p.tags, p.model, p.cpu, p.cpuSeries, p.gpu, p.gpuSeries, p.ramGb, c.slug as categorySlug, c.name as categoryName
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.id
    `).all();

    console.log(`Found ${products.length} products to evaluate.`);

    const updateStmt = db.prepare(`
      UPDATE Product
      SET tags = ?, model = ?
      WHERE id = ?
    `);

    let updatedCount = 0;

    db.exec('BEGIN TRANSACTION');

    for (const p of products) {
      let existingTags = [];
      try {
        existingTags = p.tags ? JSON.parse(p.tags) : [];
      } catch {
        existingTags = p.tags ? p.tags.split(',') : [];
      }

      const nameLower = (p.name || '').toLowerCase();
      const catSlug = (p.categorySlug || '').toLowerCase();
      const cpuLower = ((p.cpu || '') + ' ' + (p.cpuSeries || '')).toLowerCase();
      const gpuLower = ((p.gpu || '') + ' ' + (p.gpuSeries || '')).toLowerCase();

      const newTags = new Set(existingTags.map(t => String(t).trim()));

      // 1. Phân loại Gaming
      const isGaming = catSlug.includes('gaming') || 
        /legion|loq|rog|tuf|predator|nitro|alienware|victus|omen|aorus/.test(nameLower) ||
        /rtx\s*40|rtx\s*30|gtx|rx\s*6|rx\s*7/.test(gpuLower);
      if (isGaming) {
        newTags.add('gaming');
      }

      // 2. Phân loại Đồ họa – Kỹ thuật
      const isWorkstation = catSlug.includes('workstation') || catSlug.includes('creator') ||
        /precision|zbook|thinkpad p|proart|aero|creator|quadro|rtx a/.test(nameLower) ||
        (/rtx\s*40|rtx\s*30/.test(gpuLower) && (p.ramGb >= 16 || /i7|i9|ryzen 7|ryzen 9|m2 pro|m3 pro|m3 max/.test(nameLower + ' ' + cpuLower)));
      if (isWorkstation) {
        newTags.add('do-hoa');
      }

      // 3. Phân loại Mỏng nhẹ (Ultrabook)
      const isSlim = /gram|zenbook|swift|xps|macbook air|spectre|envy|yoga slim|carbon|slim|surface/.test(nameLower) ||
        catSlug.includes('ultrabook') || catSlug.includes('macbook-air');
      if (isSlim) {
        newTags.add('mong-nhe');
      }

      // 4. Phân loại Văn phòng
      const isOffice = catSlug.includes('van-phong') || catSlug.includes('office') ||
        /thinkpad|thinkbook|latitude|inspiron|elitebook|probook|vivobook|aspire|modern|galaxy book|macbook/.test(nameLower) ||
        isSlim;
      if (isOffice) {
        newTags.add('van-phong');
      }

      // 5. Phân loại Doanh nhân
      const isBusiness = /thinkpad x1|thinkpad t|latitude 7|latitude 9|elitebook|spectre|xps|dragonfly/.test(nameLower);
      if (isBusiness) {
        newTags.add('doanh-nhan');
      }

      // 6. Phân loại Sinh viên
      const isStudent = /swift|aspire|vivobook|ideapad|modern|loq|nitro|tuf|macbook air|latitude 3|latitude 5|inspiron/.test(nameLower) ||
        (p.ramGb && p.ramGb <= 16 && !isWorkstation);
      if (isStudent && !catSlug.includes('phu-kien')) {
        newTags.add('sinh-vien');
      }

      // 7. Phân loại Cảm ứng / Xoay gập
      const isTouch = /touch|x360|yoga|flip|fold|2-in-1|duo/.test(nameLower);
      if (isTouch) {
        newTags.add('cam-ung');
      }

      // 8. Phân loại Laptop AI
      const isAI = /core ultra|ryzen ai|snapdragon x|rtx 40|copilot|m3|m4|npu/.test(nameLower + ' ' + cpuLower + ' ' + gpuLower);
      if (isAI && !catSlug.includes('phu-kien')) {
        newTags.add('laptop-ai');
      }

      // 9. Xác định Năm sản xuất (2021-2026)
      let resolvedModel = p.model || '';
      const yearMatch = nameLower.match(/\b(202[1-6])\b/);
      if (yearMatch) {
        if (!resolvedModel.includes(yearMatch[1])) {
          resolvedModel = resolvedModel ? `${resolvedModel} (${yearMatch[1]})` : yearMatch[1];
        }
      } else {
        // Fallback đoán năm từ thế hệ chip
        if (/ultra|14th|7845hx|7940hs|8845hs|rtx 40/.test(cpuLower + ' ' + gpuLower)) {
          if (!resolvedModel) resolvedModel = '2024';
        } else if (/13th|13700|13500|13650|7735hs|7840hs|m3/.test(cpuLower + ' ' + nameLower)) {
          if (!resolvedModel) resolvedModel = '2023';
        } else if (/12th|12700|12500|6800h|m2/.test(cpuLower + ' ' + nameLower)) {
          if (!resolvedModel) resolvedModel = '2022';
        }
      }

      // Giữ lại local150, demo nếu có
      const finalTagsArray = Array.from(newTags);
      updateStmt.run(JSON.stringify(finalTagsArray), resolvedModel, p.id);
      updatedCount++;
    }

    db.exec('COMMIT');
    console.log(`Successfully updated ${updatedCount} products in ${dbPath}`);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error(`Error updating ${dbPath}:`, err);
  } finally {
    try { db.close(); } catch {}
  }
}

// 1. Cập nhật D1 Miniflare DB
const d1Dir = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
if (existsSync(d1Dir)) {
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.startsWith('metadata'));
  for (const f of files) {
    updateProductNeedsAndYears(resolve(d1Dir, f));
  }
}

// 2. Cập nhật dev.db
if (existsSync('dev.db')) {
  updateProductNeedsAndYears(resolve('dev.db'));
}
