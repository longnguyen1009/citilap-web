import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['scripts/verify-cf.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  target: 'es2022',
  external: ['cloudflare:workers', 'node:*', '@prisma/adapter-libsql', 'libsql'],

  plugins: [
    {
      name: 'wasm-external',
      setup(build) {
        build.onResolve({ filter: /\.wasm/ }, (args) => ({
          path: './' + args.path.replace(/^\.\//, ''),
          external: true,
        }));
      },
    },
  ],
  define: {
    'import.meta.url': JSON.stringify('file:///worker.js'),
  },
  outfile: 'scripts/verify-cf.mjs',
});

console.log('Built scripts/verify-cf.mjs successfully!');
