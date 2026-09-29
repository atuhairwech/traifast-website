import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const pages = readdirSync(root).filter(f => f.endsWith('.html'));
for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  test(`${page}: public contacts, links, semantics and metadata`, () => {
    if (page === 'resources.html') {
      assert.ok(html.includes('content="0;url=about.html"'));
      assert.ok(html.includes('content="noindex"'));
      assert.ok(html.includes('href="about.html"'));
      assert.ok(existsSync(resolve(root, 'about.html')));
      return;
    }
    for (const value of ['tel:+256393104343', 'mailto:info@traifast.com', 'https://wa.me/message/AM7373FBMU3MD1', 'https://www.linkedin.com/company/144939088/', 'https://www.facebook.com/share/1FMt4EcJSY/']) assert.ok(html.includes(value), value);
    assert.doesNotMatch(html, /YouTube|linkedin\.com\/[^"\s]*\/admin\/|href="#"|assets\/docs\//i);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.ok(html.includes('name="description"'));
    assert.ok(html.includes('strict-origin-when-cross-origin'));
    assert.ok(html.includes(page === '404.html' ? 'content="noindex"' : 'rel="canonical"'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'IDs are unique');
    for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:)/.test(link)) continue;
      if (link.startsWith('#')) assert.ok(ids.includes(link.slice(1)), link);
      else assert.ok(existsSync(resolve(root, link.replace(/^\//, '').split('#')[0])), link);
    }
    for (const [, id] of html.matchAll(/<label for="([^"]+)"/g)) assert.ok(ids.includes(id));
  });
}
// Frozen styles.css from approved pre-cleanup commit
// 746b99437b4e3256e40307fa8bbb5c63fc5eafc4. Never regenerate from current CSS.
// Test-only fixture: intentionally excluded from the public-file manifest.
const originalBrandCSS = readFileSync(resolve(root, 'tools/fixtures/original-brand.css'));
function assertOriginalBrandCSS(current) {
  assert.ok(originalBrandCSS.length > 0, 'Original brand CSS fixture must not be empty');
  assert.ok(current.subarray(0, originalBrandCSS.length).equals(originalBrandCSS),
    'Original brand CSS must remain unchanged; only append reviewed enhancements');
}
test('all original brand CSS is preserved verbatim', () => {
  assertOriginalBrandCSS(readFileSync(resolve(root, 'styles.css')));
});
test('brand CSS preservation rejects color changes and removed rules', () => {
  assert.throws(() => assertOriginalBrandCSS(Buffer.from(originalBrandCSS.toString('utf8').replace('#0b2745', '#000000'))),
    /Original brand CSS must remain unchanged/);
  assert.throws(() => assertOriginalBrandCSS(originalBrandCSS.slice(0, -1)),
    /Original brand CSS must remain unchanged/);
});
test('brand CSS preservation rejects byte changes but allows appended enhancements', () => {
  assert.throws(() => assertOriginalBrandCSS(Buffer.from(originalBrandCSS.toString('utf8').replace(/\n/g, '\r\n'))),
    /Original brand CSS must remain unchanged/);
  assert.throws(() => assertOriginalBrandCSS(Buffer.from(originalBrandCSS.toString('utf8').trimEnd())),
    /Original brand CSS must remain unchanged/);
  assertOriginalBrandCSS(Buffer.concat([originalBrandCSS, Buffer.from('\n/* reviewed additions */')]));
});
test('production artifact excludes documents and implementation files', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')));
  for (const file of ['.git', '.env', 'assets/docs', 'tools', 'README.md', 'package.json']) assert.ok(!existsSync(resolve(root, 'dist', file)), file);
});
