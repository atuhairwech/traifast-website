import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
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
test('all original brand CSS is preserved verbatim', () => {
  const original = execFileSync('git', ['show', 'origin/main:styles.css'], { cwd: root, encoding: 'utf8' });
  const current = readFileSync(resolve(root, 'styles.css'), 'utf8');
  assert.ok(current.replace(/\r\n/g, '\n').startsWith(original.replace(/\r\n/g, '\n').trimEnd()));
});
test('production artifact excludes documents and implementation files', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')));
  for (const file of ['.git', '.env', 'assets/docs', 'tools', 'README.md', 'package.json']) assert.ok(!existsSync(resolve(root, 'dist', file)), file);
});
