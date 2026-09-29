import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PUBLIC_FILES } from './public-files.mjs';
import { ROOT, APPROVED_CONFIG, GUARDED_SCRIPTS, checkDeployment, checkConfiguration, checkArtifact } from './check-deployment.mjs';
import { build } from './build.mjs';
import { wranglerArguments } from './run-wrangler.mjs';

async function fixture(t) {
  const base = await realpath(tmpdir());
  const root = await mkdtemp(join(base, 'traifast-safety-'));
  t.after(async () => {
    // Cleanup is limited to this newly-created, resolved test fixture.
    assert.equal(dirname(resolve(root)), base);
    assert.ok(relative(base, root).startsWith('traifast-safety-'));
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(join(root, 'wrangler.jsonc'), JSON.stringify(APPROVED_CONFIG));
  await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: GUARDED_SCRIPTS, devDependencies: { wrangler: '4.143.1' } }));
  await writeFile(join(root, 'package-lock.json'), await readFile(join(ROOT, 'package-lock.json')));
  for (const name of PUBLIC_FILES) {
    for (const prefix of ['', 'dist']) {
      const path = join(root, prefix, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `fixture:${name}`);
    }
  }
  return root;
}
async function editConfig(root, mutate) {
  const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
  mutate(config);
  await writeFile(join(root, 'wrangler.jsonc'), JSON.stringify(config));
}
test('safe configuration and exact manifest pass', async t => {
  assert.deepEqual(await checkDeployment(await fixture(t)), [...PUBLIC_FILES].sort());
});
for (const directory of ['.', '../outside', '/', 'dist', './dist/../', './other']) {
  test(`reject unsafe assets.directory ${directory}`, async t => {
    const root = await fixture(t);
    await editConfig(root, c => { c.assets.directory = directory; });
    await assert.rejects(checkDeployment(root), /exactly .\/dist/);
    await assert.rejects(build(root), /exactly .\/dist/);
    assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), 'fixture:index.html');
  });
}
test('reject missing configured assets directory', async t => {
  const root = await fixture(t);
  await editConfig(root, c => { delete c.assets.directory; });
  await assert.rejects(checkDeployment(root), /assets.directory/);
});
test('reject missing physical dist', async t => {
  const root = await fixture(t);
  await rm(join(root, 'dist'), { recursive: true });
  await assert.rejects(checkDeployment(root), /dist must exist/);
  await build(root);
  assert.equal((await checkDeployment(root)).length, PUBLIC_FILES.length);
});
test('reject symlink/junction dist without changing its target', async t => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await rm(join(root, 'dist'), { recursive: true });
  await symlink(join(outside, 'dist'), join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(checkDeployment(root), /not a symlink/);
  await assert.rejects(build(root), /not a symlink/);
  assert.equal(await readFile(join(outside, 'dist/index.html'), 'utf8'), 'fixture:index.html');
});
test('reject nested directory symlink/junction', async t => {
  const root = await fixture(t);
  const images = join(root, 'dist/assets/images');
  await rm(images, { recursive: true });
  await symlink(join(root, 'assets/images'), images, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(checkDeployment(root), /Symlink prohibited/);
  await assert.rejects(build(root), /Symlink prohibited/);
});
for (const path of ['.git/HEAD', '.github/workflows/publish.yml', '.env', 'README.md',
  'assets/docs/retired.pdf', 'retired.PDF', 'assets/images/retired.pdf',
  'precommit-review/audit.md', 'source/private.js', 'tools/build.mjs',
  'wrangler.jsonc', 'package.json', 'script.js.map', 'unexpected.html']) {
  test(`reject unexpected or sensitive output ${path}`, async t => {
    const root = await fixture(t);
    const target = join(root, 'dist', path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, 'synthetic test fixture, not sensitive data');
    await assert.rejects(checkDeployment(root), /prohibited|Unexpected/);
    await assert.rejects(build(root), /prohibited|Unexpected/);
    assert.ok(await readFile(target)); // A failed build must not erase unexpected content.
  });
}
test('reject even empty unapproved directory', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'dist/audit'));
  await assert.rejects(checkDeployment(root), /Unexpected directory/);
});
test('reject missing expected output file', async t => {
  const root = await fixture(t);
  await rm(join(root, 'dist/index.html'));
  await assert.rejects(checkDeployment(root), /Missing expected public file/);
});
test('reject altered public output and rebuild reproducibly', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'dist/index.html'), 'tampered');
  await assert.rejects(checkDeployment(root), /differs from reviewed source/);
  await build(root);
  const first = await Promise.all(PUBLIC_FILES.map(p => readFile(join(root, 'dist', p))));
  await build(root);
  const second = await Promise.all(PUBLIC_FILES.map(p => readFile(join(root, 'dist', p))));
  assert.deepEqual(first, second);
});
for (const mutate of [c => { c.env = { production: { assets: { directory: '.' } } }; },
  c => { c.build = { command: 'unsafe-build' }; }, c => { c.main = 'private-worker.js'; },
  c => { c.assets.not_found_handling = 'single-page-application'; }]) {
  test('reject additional deployment settings and overrides', async t => {
    const root = await fixture(t);
    await editConfig(root, mutate);
    await assert.rejects(checkDeployment(root), /Unapproved deployment configuration/);
  });
}
test('reject changed deployment script', async t => {
  const root = await fixture(t);
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  pkg.scripts.deploy = 'wrangler deploy --assets .';
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
  await assert.rejects(checkDeployment(root), /deployment override/);
});
for (const alternative of ['wrangler.toml', 'wrangler.json', '.wrangler/deploy/config.json']) {
  test(`reject alternative configuration ${alternative}`, async t => {
    const root = await fixture(t);
    await mkdir(dirname(join(root, alternative)), { recursive: true });
    await writeFile(join(root, alternative), '{}');
    await assert.rejects(checkDeployment(root), /Alternative/);
  });
}
test('reject command-line and environment overrides before invoking Wrangler', async t => {
  const root = await fixture(t);
  await assert.rejects(checkConfiguration(root, ['--assets', '.']), /overrides/);
  await assert.rejects(checkConfiguration(root, [], { WRANGLER_CONFIG: 'other.json' }), /override/);
  for (const mode of ['local', 'dry-run', 'deploy', 'version']) {
    for (const extra of [['--assets', '.'], ['--config', 'other.json'], ['--env', 'unsafe']]) {
      assert.throws(() => wranglerArguments(mode, extra), /overrides/);
    }
  }
  const result = spawnSync(process.execPath, [join(ROOT, 'tools/run-wrangler.mjs'), 'deploy', '--assets', '.'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /overrides/);
});
test('local modes cannot switch to remote deployment', () => {
  assert.ok(wranglerArguments('local').includes('--local'));
  assert.ok(wranglerArguments('dry-run').includes('--dry-run'));
  assert.throws(() => wranglerArguments('remote'), /Unapproved/);
});
test('reject mismatched dependency lock before deployment', async t => {
  const root = await fixture(t);
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  lock.packages['node_modules/wrangler'].version = '0.0.0';
  await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));
  await assert.rejects(checkDeployment(root), /lockfile/);
});
test('reject source directory links before copying assets', async t => {
  const root = await fixture(t);
  const other = await fixture(t);
  await rm(join(root, 'assets/images'), { recursive: true });
  await symlink(join(other, 'assets/images'), join(root, 'assets/images'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(build(root), /Source symlink/);
});
