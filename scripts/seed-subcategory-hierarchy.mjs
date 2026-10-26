import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';

const dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const sqliteFile = readdirSync(dir).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite' && !f.startsWith('54d9afe244ff014489b8ca401304ddc6f0048ba97d9ee0891f9955797c2639cd'));

if (!sqliteFile) {
  console.error('No target SQLite database found.');
  process.exit(1);
}

const db = new DatabaseSync(`${dir}/${sqliteFile}`);

const extraCategories = [
  // Lenovo Legion C3
  { id: 'taxonomy-legion-5', name: 'Legion 5', slug: 'legion-5', parentId: 'taxonomy-lenovo-legion', sortOrder: 1 },
  { id: 'taxonomy-legion-5-pro', name: 'Legion 5 Pro', slug: 'legion-5-pro', parentId: 'taxonomy-lenovo-legion', sortOrder: 2 },
  { id: 'taxonomy-legion-7', name: 'Legion 7', slug: 'legion-7', parentId: 'taxonomy-lenovo-legion', sortOrder: 3 },
  { id: 'taxonomy-legion-slim', name: 'Legion Slim 5', slug: 'legion-slim-5', parentId: 'taxonomy-lenovo-legion', sortOrder: 4 },
  { id: 'taxonomy-legion-pro-7i', name: 'Legion Pro 7i', slug: 'legion-pro-7i', parentId: 'taxonomy-lenovo-legion', sortOrder: 5 },

  // Asus ROG C3
  { id: 'taxonomy-rog-strix', name: 'ROG Strix', slug: 'rog-strix', parentId: 'taxonomy-asus-rog', sortOrder: 1 },
  { id: 'taxonomy-rog-zephyrus', name: 'ROG Zephyrus', slug: 'rog-zephyrus', parentId: 'taxonomy-asus-rog', sortOrder: 2 },
  { id: 'taxonomy-rog-flow', name: 'ROG Flow', slug: 'rog-flow', parentId: 'taxonomy-asus-rog', sortOrder: 3 },

  // Acer Nitro C3
  { id: 'taxonomy-nitro-5', name: 'Nitro 5', slug: 'nitro-5', parentId: 'taxonomy-acer-nitro', sortOrder: 1 },
  { id: 'taxonomy-nitro-16', name: 'Nitro 16', slug: 'nitro-16', parentId: 'taxonomy-acer-nitro', sortOrder: 2 },
  { id: 'taxonomy-nitro-v', name: 'Nitro V', slug: 'nitro-v', parentId: 'taxonomy-acer-nitro', sortOrder: 3 },
];

console.log('Adding extra C3 categories to Category table...');
const insertCat = db.prepare(`
  INSERT INTO Category (id, name, slug, description, image, parentId, sortOrder, status, createdAt, updatedAt)
  VALUES (?, ?, ?, '', NULL, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, parentId=excluded.parentId, sortOrder=excluded.sortOrder, status='ACTIVE'
`);

for (const c of extraCategories) {
  insertCat.run(c.id, c.name, c.slug, c.parentId, c.sortOrder);
}

// Update NavigationStudio document
const navRow = db.prepare("SELECT published, draft FROM NavigationStudio WHERE id='site'").get();
if (navRow) {
  for (const field of ['published', 'draft']) {
    if (navRow[field]) {
      const doc = JSON.parse(navRow[field]);
      const existingIds = new Set(doc.categories.map(c => c.id));
      for (const c of extraCategories) {
        if (!existingIds.has(c.id)) {
          doc.categories.push({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: '',
            parentId: c.parentId,
            visible: true,
            image: '',
            assetId: '',
            alt: c.name
          });
        }
      }
      db.prepare(`UPDATE NavigationStudio SET ${field}=? WHERE id='site'`).run(JSON.stringify(doc));
    }
  }
  console.log('NavigationStudio updated successfully.');
}

// Link demo legion products to C3 for demonstration
db.prepare("UPDATE Product SET categoryId='taxonomy-legion-5-pro' WHERE id='p-legion-5-pro'").run();
db.prepare("UPDATE Product SET categoryId='taxonomy-legion-5' WHERE id='demo-legion-5'").run();

// Invalidate search cache revision
db.prepare("UPDATE SearchCatalogRevision SET revision = revision + 1 WHERE id=1").run();
console.log('Done seeding subcategory hierarchy data.');
