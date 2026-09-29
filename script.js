document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu-btn');
  const links = document.querySelector('.nav-links');
  const setMenu = open => {
    if (!menu || !links) return;
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.textContent = open ? '×' : '☰';
  };
  if (menu && links) {
    menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && links.classList.contains('open')) {
        setMenu(false);
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (links.classList.contains('open') && !menu.contains(event.target) && !links.contains(event.target)) setMenu(false);
    });
  }
  document.querySelectorAll('[data-year]').forEach(e => { e.textContent = new Date().getFullYear(); });
  document.querySelectorAll('form[data-quote]').forEach(form => {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('[type="submit"]');
    const label = button.textContent;
    const fields = [...form.querySelectorAll('input:not([name="_gotcha"]), textarea')];
    const validateField = field => {
      const value = field.value.trim();
      let message = '';
      if (field.required && field.value && !value) message = 'Please enter a value, not just spaces.';
      if (field.type === 'tel' && value) {
        const digits = value.replace(/\D/g, '');
        if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
          message = 'Enter a phone number with 7–15 digits. You may use +, spaces, parentheses or hyphens.';
        }
      }
      field.setCustomValidity(message);
    };
    fields.forEach(field => field.addEventListener('input', () => validateField(field)));
    let sending = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      fields.forEach(validateField);
      if (sending || !form.reportValidity() || form.elements._gotcha.value) return;
      if (form.action !== 'https://formspree.io/f/xoeqazlg') return;
      sending = true;
      status.hidden = true;
      form.classList.add('is-submitting');
      form.setAttribute('aria-busy', 'true');
      button.disabled = true;
      button.textContent = 'Sending…';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(form.action, {
          method: 'POST', body: new FormData(form),
          headers: { Accept: 'application/json' }, signal: controller.signal,
          credentials: 'omit'
        });
        if (!response.ok) throw new Error('Submission unavailable');
        form.reset();
        status.textContent = 'Thank you. Your enquiry has been sent to Traifast.';
        status.className = 'form-status success';
      } catch {
        status.textContent = 'We could not confirm that your enquiry was sent. Your details are still here. Please try again or contact info@traifast.com or +256 393 104 343.';
        status.className = 'form-status error';
      } finally {
        clearTimeout(timeout);
        sending = false;
        status.hidden = false;
        form.classList.remove('is-submitting');
        form.removeAttribute('aria-busy');
        button.disabled = false;
        button.textContent = label;
      }
    });
  });
});
