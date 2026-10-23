import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Browser bundle must never pull Worker bindings or server services into editor.
const result = await build({
  entryPoints: ['src/components/admin/builder/SiteBuilderEditor.tsx'],
  outdir: '.wrangler/builder-boundary-check', bundle: true, platform: 'browser', format: 'esm', write: false,
  external: ['next/*'], metafile: true, logLevel: 'silent',
});
const serverInputs = Object.keys(result.metafile.inputs).filter(path => path.includes('src/server/'));
assert.deepEqual(serverInputs, [], 'Editor imports runtime server code');
console.log('PASS: builder browser bundle contains no server modules');

