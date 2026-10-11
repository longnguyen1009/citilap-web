const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [];

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
    } else {
      files.push({ path: full, mtime: fs.statSync(full).mtimeMs });
    }
  }
}

scan(root);

console.log('Watching ' + files.length + ' files for 5 seconds...');
const start = Date.now();
const interval = setInterval(() => {
  for (const f of files) {
    try {
      const current = fs.statSync(f.path).mtimeMs;
      if (current !== f.mtime) {
        console.log('FILE CHANGED:', path.relative(root, f.path), 'diff:', current - f.mtime);
        f.mtime = current;
      }
    } catch (e) {}
  }
  if (Date.now() - start > 6000) {
    clearInterval(interval);
    console.log('Done scanning.');
  }
}, 200);
