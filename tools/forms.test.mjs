import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
function setup({ ok = true, failure = false, valid = true, honeypot = '', pending = false, fieldValues = [] } = {}) {
  let submit, timer, requests = 0, resets = 0, resolveRequest;
  const status = { hidden: true }, button = { textContent: 'Send Quote Request →', disabled: false };
  const classes = new Set(), attributes = {};
  const fields = fieldValues.map(values => ({
    type: 'text', required: true, value: '', message: '', ...values,
    setCustomValidity(message) { this.message = message; }, addEventListener() {}
  }));
  const form = {
    action: 'https://formspree.io/f/xoeqazlg',
    elements: { _gotcha: { value: honeypot } },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    reportValidity: () => valid && fields.every(field => !field.message),
    querySelectorAll: () => fields,
    querySelector: selector => selector === '.form-status' ? status : button,
    addEventListener: (_, callback) => { submit = callback; },
    setAttribute: (key, value) => { attributes[key] = value; },
    removeAttribute: key => { delete attributes[key]; },
    reset: () => { resets++; }
  };
  const document = {
    documentElement: { classList: { add() {} } },
    addEventListener: (_, callback) => callback(),
    querySelector: () => null,
    querySelectorAll: selector => selector === 'form[data-quote]' ? [form] : []
  };
  vm.runInNewContext(code, {
    document, Date, AbortController, FormData: class {},
    setTimeout: callback => { timer = callback; return 1; }, clearTimeout() {},
    fetch: async (url, options) => {
      requests++;
      assert.equal(url, 'https://formspree.io/f/xoeqazlg');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'omit');
      if (failure) throw new Error('Private backend error must not reach the UI');
      if (pending) return await new Promise((resolve, reject) => {
        resolveRequest = () => resolve({ ok });
        options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
      });
      return { ok };
    }
  });
  return { form, status, button, attributes, submit: () => submit({ preventDefault() {} }), timeout: () => timer(), complete: () => resolveRequest(), requests: () => requests, resets: () => resets };
}
test('accepted request reports success and resets the form', async () => {
  const app = setup(); await app.submit();
  assert.equal(app.requests(), 1); assert.equal(app.resets(), 1);
  assert.match(app.status.textContent, /Thank you/);
  assert.equal(app.button.disabled, false); assert.equal(app.status.hidden, false);
});
for (const scenario of [{ ok: false }, { failure: true }]) test(`rejection preserves input and hides internal errors ${JSON.stringify(scenario)}`, async () => {
  const app = setup(scenario); await app.submit();
  assert.equal(app.resets(), 0); assert.match(app.status.textContent, /could not confirm/);
  assert.doesNotMatch(app.status.textContent, /Private backend/); assert.equal(app.button.disabled, false);
});
test('duplicate submissions are suppressed while pending', async () => {
  const app = setup({ pending: true }); const first = app.submit();
  assert.equal(app.button.disabled, true); assert.equal(app.attributes['aria-busy'], 'true');
  await app.submit(); assert.equal(app.requests(), 1);
  app.complete(); await first; assert.equal(app.button.disabled, false);
});
test('timeout preserves fields and allows retry', async () => {
  const app = setup({ pending: true }); const request = app.submit(); app.timeout(); await request;
  assert.equal(app.resets(), 0); assert.equal(app.button.disabled, false);
  assert.match(app.status.textContent, /could not confirm/);
});
for (const scenario of [{ valid: false }, { honeypot: 'spam' }]) test(`invalid or honeypot submission sends nothing ${JSON.stringify(scenario)}`, async () => {
  const app = setup(scenario); await app.submit(); assert.equal(app.requests(), 0);
});
test('unexpected destination never receives form details', async () => {
  const app = setup(); app.form.action = 'https://example.com'; await app.submit(); assert.equal(app.requests(), 0);
});
for (const values of [{ value: '   ' }, { type: 'tel', value: '123' }, { type: 'tel', value: 'not-a-phone' }]) {
  test(`invalid user-entered text sends nothing ${JSON.stringify(values)}`, async () => {
    const app = setup({ fieldValues: [values] }); await app.submit(); assert.equal(app.requests(), 0);
  });
}
test('international phone formatting and empty optional phone remain accepted', async () => {
  const app = setup({ fieldValues: [{ type: 'tel', value: '+256 (393) 104-343' }, { type: 'tel', required: false, value: '' }] });
  await app.submit(); assert.equal(app.requests(), 1);
});
