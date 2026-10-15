import { readFile, readdir } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import esbuild from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const bundle = await esbuild.build({
  stdin: {
    contents: `
      export * from './src/lib/prisma';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/search.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['cloudflare:workers', 'node:*'],
  plugins: [
    {
      name: 'wasm-external',
      setup(build) {
        build.onResolve({ filter: /\.wasm/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
  outfile: 'scripts/.tmp-bundle.mjs',
});

const mod = await import('./.tmp-bundle.mjs');
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
  })
);
const DB = await mf.getD1Database('DB');
const migrationFiles = (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort();
for (const f of migrationFiles) {
  const sql = await readFile(`d1-migrations/${f}`, 'utf8');
  const stmts = unstable_splitSqlQuery(sql);
  await DB.batch(stmts.map(s => DB.prepare(s)));
}

const prisma = mod.getPrismaClient(DB);
const cats = await prisma.category.findMany();
console.log('SUCCESS! Categories count from real D1 migrations:', cats.length);
await mf.dispose();
