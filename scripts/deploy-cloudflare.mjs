import { spawnSync } from 'node:child_process';

const envIndex = process.argv.indexOf('--env');
const target = envIndex >= 0 ? process.argv[envIndex + 1] : 'production';

if (!target || !/^[a-z0-9_-]+$/i.test(target)) {
  throw new Error(`Invalid Cloudflare environment: ${target ?? ''}`);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { ...process.env, CLOUDFLARE_ENV: target });
run(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'dist/server/wrangler.json']);
