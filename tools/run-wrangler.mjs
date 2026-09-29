import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, checkDeployment } from './check-deployment.mjs';

export function wranglerArguments(mode, extra = []) {
  if (extra.length) throw new Error('Wrangler argument overrides are not permitted');
  const commands = {
    local: ['dev', '--local', '--ip', '127.0.0.1', '--port', '8788'],
    'dry-run': ['deploy', '--dry-run', '--outdir', '.wrangler/dry-run'],
    deploy: ['deploy'],
    version: ['versions', 'upload'],
  };
  if (!Object.hasOwn(commands, mode)) throw new Error('Unapproved Wrangler mode');
  return [...commands[mode], '--config', 'wrangler.jsonc'];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = wranglerArguments(process.argv[2], process.argv.slice(3));
    await checkDeployment();
    const installed = JSON.parse(await readFile(join(ROOT, 'node_modules/wrangler/package.json'), 'utf8'));
    if (installed.version !== '4.143.1') throw new Error('Installed Wrangler differs from tested pin; run npm ci');
    const result = spawnSync(process.execPath, [join(ROOT, 'node_modules/wrangler/bin/wrangler.js'), ...args], {
      cwd: ROOT, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
