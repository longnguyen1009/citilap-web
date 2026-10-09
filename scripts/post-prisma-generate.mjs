import fs from 'node:fs';
import path from 'node:path';

const classFilePath = path.resolve('generated/prisma/internal/class.ts');

if (!fs.existsSync(classFilePath)) {
  console.log('[post-prisma-generate] generated/prisma/internal/class.ts does not exist yet.');
  process.exit(0);
}

let content = fs.readFileSync(classFilePath, 'utf8');

const targetOriginal = `  getQueryCompilerWasmModule: async () => {
    const { default: module } = await import("./query_compiler_fast_bg.wasm?module")
    return module
  },`;

const targetReplacement = `  getQueryCompilerWasmModule: async () => {
    try {
      const { default: module } = await import("./query_compiler_fast_bg.wasm?module")
      if (module) return module
    } catch {}
    try {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const wasmPath = resolve(process.cwd(), "scripts/query_compiler_fast_bg.wasm");
      const bytes = readFileSync(wasmPath);
      return new WebAssembly.Module(bytes);
    } catch {}
    return null
  },`;

if (content.includes('scripts/query_compiler_fast_bg.wasm')) {
  console.log('[post-prisma-generate] class.ts already has dual Node & Cloudflare WASM compiler fallback.');
} else if (content.includes(targetOriginal)) {
  content = content.replace(targetOriginal, targetReplacement);
  fs.writeFileSync(classFilePath, content, 'utf8');
  console.log('[post-prisma-generate] Successfully applied dual WASM compiler fallback to class.ts.');
} else {
  // Regex fallback in case whitespace differs
  const regex = /getQueryCompilerWasmModule:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?return\s+module[\s\S]*?\},/;
  if (regex.test(content)) {
    content = content.replace(regex, targetReplacement);
    fs.writeFileSync(classFilePath, content, 'utf8');
    console.log('[post-prisma-generate] Successfully applied dual WASM compiler fallback via regex.');
  } else {
    console.warn('[post-prisma-generate] Warning: getQueryCompilerWasmModule pattern not matched in class.ts.');
  }
}
