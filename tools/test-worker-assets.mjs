// Run only against the local Wrangler server started by npm run preview:worker.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, checkDeployment } from './check-deployment.mjs';
import { PUBLIC_FILES } from './public-files.mjs';
const base = 'http://127.0.0.1:8788';
await checkDeployment();
const excluded = [
  '/.git/HEAD', '/.git/config', '/.git/index', '/.git/objects/',
  '/.github/workflows/publish.yml', '/README.md', '/source/', '/precommit-review/',
  '/AUDIT.md', '/DEPLOYMENT.md', '/.env', '/.dev.vars', '/wrangler.jsonc',
  '/package.json', '/package-lock.json', '/tools/build.mjs', '/node_modules/wrangler/package.json',
  '/.wrangler/tmp/no-op-worker.js.map', '/script.js.map', '/missing/nested/page',
  '/assets/docs/Traifast_Capability_Statement_v1_0.pdf',
  '/assets/docs/Traifast_Corporate_Profile_v1_0.pdf',
  '/assets/docs/Traifast_Product_Catalogue_v1_0.pdf',
];
for (const path of excluded) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 404, path);
  const body = await response.text();
  assert.ok(body.includes('Page not found'), `Expected generic 404: ${path}`);
}
for (const path of PUBLIC_FILES) {
  const response = await fetch(base + '/' + path, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, path);
  const served = Buffer.from(await response.arrayBuffer());
  assert.ok(served.equals(await readFile(join(ROOT, 'dist', path))), `Served bytes differ: ${path}`);
}
for (const path of ['/resources', '/resources.html']) {
  const response = await fetch(base + path);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.ok(html.includes('content="0;url=about.html"'));
  assert.ok(!html.includes('.pdf'));
}
console.log(`Local Wrangler verification passed: ${excluded.length} excluded URLs return 404; ${PUBLIC_FILES.length} approved assets match dist exactly; both Resources routes contain only the redirect.`);
