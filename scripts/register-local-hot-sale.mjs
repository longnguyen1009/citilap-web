import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

assert(process.argv[2] === '--local' && process.argv.length <= 4 && (!process.argv[3] || process.argv[3] === '--preview'), 'Usage: node scripts/register-local-hot-sale.mjs --local [--preview]');
const root = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files = readdirSync(root).filter(f => f.endsWith('.sqlite')).filter(f => {
  const db = new DatabaseSync(resolve(root, f), { readOnly: true });
  try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get(); } finally { db.close(); }
});
assert.equal(files.length, 1, 'Expected exactly one modern local catalog');
mkdirSync('.wrangler/backups', { recursive: true });
const source = new DatabaseSync(resolve(root, files[0]));
const destination = resolve('.wrangler/backups', `${process.argv[3] ? 'preview' : 'before'}-hot-sale-${Date.now()}.sqlite`);
await backup(source, destination);
console.log('Backup:', destination);
const db = process.argv[3] ? new DatabaseSync(destination) : source;
const now = Date.now(), iso = offset => new Date(now + offset * 3600000).toISOString();
const history = () => JSON.stringify(db.prepare('SELECT * FROM OrderItem ORDER BY id').all());
const originalHistory = history();
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; BEGIN IMMEDIATE');
try {
  // ponytail: local demo registration only; real campaigns use admin validation and audit flow.
  const existing = db.prepare("SELECT id FROM PromotionCampaign WHERE status='PUBLISHED' AND endAt>? ORDER BY startAt LIMIT 1").get(iso(0));
  const campaigns = [
    ...(existing ? [{ id: existing.id }] : [{ id: 'local-hot-sale-flash', name: 'FLASH SALE', start: 3, end: 9 }]),
    { id: 'local-hot-sale-weekend', name: 'HOT SALE CUỐI TUẦN', start: -1, end: 48 },
    { id: 'local-hot-sale-school', name: 'SALE MỪNG NHẬP HỌC', start: 24, end: 96 },
  ];
  for (const campaign of campaigns) {
    if (!db.prepare('SELECT id FROM PromotionCampaign WHERE id=?').get(campaign.id)) {
      db.prepare("INSERT INTO PromotionCampaign(id,name,description,status,startAt,endAt,createdAt,updatedAt,revision) VALUES(?,?,?,'PUBLISHED',?,?,?,?,1)")
        .run(campaign.id, campaign.name, 'Chiến dịch mẫu local CitiLap', iso(campaign.start), iso(campaign.end), iso(0), iso(0));
    }
    const count = db.prepare('SELECT count(*) n FROM PromotionCampaignItem WHERE campaignId=?').get(campaign.id).n;
    if (count >= 10) continue;
    const targets = db.prepare(`SELECT p.id productId,v.id variantId,v.price FROM Product p
      JOIN ProductStudio s ON s.productId=p.id JOIN ProductVariant v ON v.productId=p.id
      WHERE p.status='ACTIVE' AND p.deletedAt IS NULL AND v.status='ACTIVE' AND v.price>15000000
      AND json_extract(s.published,'$.availability')='AVAILABLE'
      AND json_extract(s.published,'$.template')='LAPTOP'
      AND NOT EXISTS (SELECT 1 FROM PromotionCampaignItem i WHERE i.productId=p.id)
      AND v.id=(SELECT v2.id FROM ProductVariant v2 WHERE v2.productId=p.id AND v2.status='ACTIVE' ORDER BY v2.price,v2.id LIMIT 1)
      AND EXISTS (SELECT 1 FROM InventoryBalance b WHERE b.variantId=v.id AND b.onHand>b.reserved)
      ORDER BY p.id LIMIT ?`).all(10 - count);
    assert.equal(targets.length, 10 - count, 'Not enough distinct stocked laptop targets');
    for (const target of targets) {
      db.prepare('INSERT INTO PromotionCampaignItem(id,campaignId,productId,variantId,salePrice,regularPrice,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)')
        .run(`${campaign.id}-${target.variantId}`, campaign.id, target.productId, target.variantId, Math.max(15000000, target.price - 500000), target.price, iso(0), iso(0));
    }
    db.prepare('UPDATE PromotionCampaign SET revision=revision+1,updatedAt=? WHERE id=?').run(iso(0), campaign.id);
    assert.equal(db.prepare('SELECT count(*) n FROM PromotionCampaignItem WHERE campaignId=?').get(campaign.id).n, 10);
  }
  assert.equal(history(), originalHistory, 'Order history changed');
  assert.equal(db.prepare('SELECT count(*) n FROM Product').get().n, 150);
  assert.equal(db.prepare('SELECT count(*) n FROM ProductVariant').get().n, 450);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.exec('COMMIT');
  console.log(db.prepare('SELECT c.id,c.name,c.status,c.startAt,c.endAt,count(i.id) products FROM PromotionCampaign c LEFT JOIN PromotionCampaignItem i ON i.campaignId=c.id GROUP BY c.id').all());
  console.log('PASS: local campaigns registered; 150 products, 450 variants, order history and foreign keys preserved.');
} catch (error) { db.exec('ROLLBACK'); throw error; }
finally { if (db !== source) db.close(); source.close(); }
