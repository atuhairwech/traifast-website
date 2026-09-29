import { lstat, realpath, readdir, readFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PUBLIC_FILES, PUBLIC_DIRECTORIES } from './public-files.mjs';

export const ROOT = resolve(import.meta.dirname, '..');
export const APPROVED_CONFIG = Object.freeze({
  $schema: './node_modules/wrangler/config-schema.json',
  name: 'traifast-website', compatibility_date: '2026-09-08',
  assets: { directory: './dist', not_found_handling: '404-page' },
});
export const GUARDED_SCRIPTS = Object.freeze({
  build: 'node tools/build.mjs',
  test: 'node --test tools/site.test.mjs tools/forms.test.mjs tools/deployment-safety.test.mjs',
  'check:deployment': 'node tools/check-deployment.mjs',
  'preview:worker': 'node tools/run-wrangler.mjs local',
  'check:wrangler': 'node tools/run-wrangler.mjs dry-run',
  deploy: 'node tools/run-wrangler.mjs deploy',
  'upload:version': 'node tools/run-wrangler.mjs version',
});
function invariant(ok, message) { if (!ok) throw new Error(message); }
async function statOrMissing(path) {
  try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export async function checkConfiguration(root = ROOT, args = [], environment = process.env) {
  invariant(args.length === 0, 'Deployment arguments/overrides are not permitted');
  for (const key of ['WRANGLER_CONFIG', 'WRANGLER_CONFIG_PATH', 'WRANGLER_ENV', 'CLOUDFLARE_ENV']) {
    invariant(!environment[key], `Configuration override ${key} is not permitted`);
  }
  const configPath = join(root, 'wrangler.jsonc');
  invariant(!(await lstat(configPath)).isSymbolicLink(), 'Wrangler configuration must not be a symlink');
  // Keep this JSONC file in the strict JSON subset; reject unreviewed fields and environment overrides.
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  invariant(config.assets?.directory === './dist', 'assets.directory must be exactly ./dist');
  invariant(JSON.stringify(canonical(config)) === JSON.stringify(canonical(APPROVED_CONFIG)), 'Unapproved deployment configuration or override');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  invariant(JSON.stringify(canonical(pkg.scripts)) === JSON.stringify(canonical(GUARDED_SCRIPTS)), 'Unapproved package scripts or deployment override');
  invariant(pkg.devDependencies?.wrangler === '4.143.1', 'Wrangler must be pinned to the tested version');
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  invariant(lock.lockfileVersion === 3 && lock.packages?.['']?.devDependencies?.wrangler === '4.143.1'
    && lock.packages?.['node_modules/wrangler']?.version === '4.143.1'
    && /^sha512-/.test(lock.packages?.['node_modules/wrangler']?.integrity ?? ''), 'Wrangler lockfile must match the tested pin and include integrity');
  for (const alternative of ['wrangler.toml', 'wrangler.json', '.wrangler/deploy/config.json']) {
    invariant(!(await statOrMissing(join(root, alternative))), 'Alternative/generated deployment configuration is not permitted');
  }
  return config;
}
export async function checkArtifact(root = ROOT, { allowMissing = false, compareSource = true } = {}) {
  const dist = resolve(root, 'dist');
  const realRoot = await realpath(root);
  const stat = await statOrMissing(dist);
  if (!stat && allowMissing) return [];
  invariant(stat?.isDirectory() && !stat.isSymbolicLink(), 'dist must exist as a real directory, not a symlink');
  const actual = await realpath(dist);
  invariant(actual === join(realRoot, 'dist'), 'dist must resolve inside the repository to its own directory');
  const found = [];
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory)) {
      const name = prefix ? `${prefix}/${entry}` : entry;
      const path = join(directory, entry);
      const info = await lstat(path);
      invariant(!info.isSymbolicLink(), `Symlink prohibited: ${name}`);
      invariant(!(name.split('/').some(p => p.startsWith('.'))) && !/\.pdf$/i.test(name), `Repository metadata/PDF prohibited: ${name}`);
      if (info.isDirectory()) {
        invariant(PUBLIC_DIRECTORIES.includes(name), `Unexpected directory: ${name}`);
        await walk(path, name);
      } else {
        invariant(info.isFile() && info.nlink === 1, `Not an independent regular file: ${name}`);
        invariant(PUBLIC_FILES.includes(name), `Unexpected public file: ${name}`);
        invariant(relative(actual, await realpath(path)) === name.split('/').join(sep), `Escaped output path: ${name}`);
        if (compareSource) {
          await checkSource(root, name);
          invariant((await readFile(path)).equals(await readFile(join(root, name))), `Output differs from reviewed source: ${name}`);
        }
        found.push(name);
      }
    }
  }
  await walk(dist);
  if (!allowMissing) for (const name of PUBLIC_FILES) invariant(found.includes(name), `Missing expected public file: ${name}`);
  return found.sort();
}
export async function checkSource(root, name) {
  let path = root;
  const components = name.split('/');
  for (let i = 0; i < components.length; i++) {
    path = join(path, components[i]);
    const info = await lstat(path);
    invariant(!info.isSymbolicLink(), `Source symlink prohibited: ${name}`);
    invariant(i === components.length - 1 ? info.isFile() && info.nlink === 1 : info.isDirectory(), `Invalid source: ${name}`);
  }
}
export async function checkDeployment(root = ROOT, args = [], environment = process.env) {
  await checkConfiguration(root, args, environment);
  return checkArtifact(root);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const files = await checkDeployment(ROOT, process.argv.slice(2));
    console.log(`Deployment safety passed: ./dist, ${files.length} exact approved files, no links or repository internals.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
