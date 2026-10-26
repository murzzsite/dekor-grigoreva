(() => {
  // ===== CONFIG =====
  const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/VF9J3WZHEW';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== UTILS =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky header
  const header = document.getElementById('header');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Burger
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  // ===== HERO: тот же зал без декора и с декором =====
  const cmp = document.getElementById('cmp');
  const range = document.getElementById('cmpRange');
  if (cmp && range) {
    const setP = v => { cmp.style.setProperty('--p', v); range.value = v; };
    let raf = 0, touched = false;
    const stop = () => { touched = true; cancelAnimationFrame(raf); };
    range.addEventListener('input', () => { stop(); cmp.style.setProperty('--p', range.value); });
    range.addEventListener('pointerdown', stop);
    range.addEventListener('keydown', stop);

    if (reduce) {
      setP(55);
    } else {
      // шторка стартует над пустым залом и открывает оформление слева направо
      setP(0);
      const from = 0, to = 58, dur = 2600, delay = 650;
      const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      setTimeout(() => {
        if (touched) return;
        const t0 = performance.now();
        const tick = now => {
          const k = Math.min(1, (now - t0) / dur);
          setP(Math.round((from + (to - from) * ease(k)) * 10) / 10);
          if (k < 1 && !touched) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, delay);
    }
  }

  // ===== FAQ: одна карточка открыта (запасной вариант без name) =====
  const cards = [...document.querySelectorAll('.cards details')];
  cards.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) cards.forEach(o => { if (o !== d) o.open = false; });
  }));

  // ===== ДАТЫ → форма =====
  const dateInput = document.getElementById('f-date');
  const eventSel = document.getElementById('f-event');
  document.querySelectorAll('.dt').forEach(btn => btn.addEventListener('click', () => {
    if (dateInput) dateInput.value = btn.dataset.date || '';
    if (eventSel) eventSel.value = 'Свадьба';
    const target = document.getElementById('contact');
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (dateInput) {
      dateInput.classList.remove('flash');
      void dateInput.offsetWidth;
      dateInput.classList.add('flash');
    }
    setTimeout(() => document.getElementById('f-name')?.focus({ preventScroll: true }), 700);
  }));

  // ===== FORM SUBMIT → CLOUDFLARE WORKER → TELEGRAM =====
  const form = document.getElementById('leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;

    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });

    if (payload._gotcha) return;

    if (!payload.name || !payload.contact) {
      btn.textContent = 'Укажите имя и контакт';
      setTimeout(() => { btn.textContent = orig; }, 2200);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      btn.textContent = 'Заявка отправлена';
      form.reset();
    } catch (err) {
      console.error(err);
      btn.textContent = 'Ошибка, попробуйте ещё раз';
    } finally {
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    }
  });

  // ===== Плавный скролл =====
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ===== Появление: занавес для картинок, подъём для текста =====
  const targets = [...document.querySelectorAll('[data-r]')];
  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    // ступенчатая задержка внутри одного родителя
    const byParent = new Map();
    targets.forEach(el => {
      const p = el.parentElement;
      byParent.set(p, (byParent.get(p) || 0) + 1);
      el.style.setProperty('--d', Math.min(byParent.get(p) - 1, 5) * 0.08 + 's');
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(el => io.observe(el));
    // страховка: если что-то не успело сработать, показываем контент
    setTimeout(() => targets.forEach(el => el.classList.add('is-in')), 9000);
  }
})();
