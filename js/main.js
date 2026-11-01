/* =========================================================
   AMORTIE — interactions
   ========================================================= */
(() => {
  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* =======================================================
     I18N
     ======================================================= */
  const dict = window.I18N;
  $$('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (!(k in dict.en)) dict.en[k] = el.innerHTML.trim();
  });

  let lang = 'en';
  try { lang = localStorage.getItem('amortie-lang') === 'uk' ? 'uk' : 'en'; } catch (e) {}

  const t = key => (dict[lang] && dict[lang][key] !== undefined) ? dict[lang][key] : dict.en[key];

  const PRICES = { starter: 2400, academy: 4900, pro: 9800 };
  let plansPeriod = 'month';
  const fmtUAH = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function renderPlans(animate) {
    $$('[data-plan]').forEach(el => {
      const base = PRICES[el.dataset.plan];
      const to = plansPeriod === 'season' ? Math.round(base * .85 / 10) * 10 : base;
      el.closest('.plan').querySelector('[data-note]').textContent =
        plansPeriod === 'season' ? t('plans.save').replace('{n}', fmtUAH((base - to) * 6)) : '';
      if (!animate) { el.textContent = fmtUAH(to); el.dataset.v = to; return; }
      const o = { v: +el.dataset.v || base };
      el.dataset.v = to;
      gsap.to(o, { v: to, duration: .9, ease: 'expo.out', onUpdate: () => { el.textContent = fmtUAH(Math.round(o.v / 10) * 10); } });
      gsap.fromTo(el, { yPercent: -18, filter: 'blur(4px)' }, { yPercent: 0, filter: 'blur(0px)', duration: .6, ease: 'expo.out' });
    });
  }

  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w"><span class="wi">${escapeHtml(w)}</span></span>`).join(' ');
  }
  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w =>
      `<span class="chw">${[...w].map(c => `<span class="ch">${escapeHtml(c)}</span>`).join('')}</span>`
    ).join(' ');
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function renderText(el) {
    el.innerHTML = t(el.dataset.i18n);
    if (el.hasAttribute('data-split')) splitWords(el);
    if (el.hasAttribute('data-chars')) splitChars(el);
  }

  function applyLang() {
    document.documentElement.lang = lang === 'uk' ? 'uk' : 'en';
    $$('[data-i18n]').forEach(renderText);
    renderPlans(false);
    const sw = $('.lang');
    sw.dataset.active = lang;
    $$('.lang__btn').forEach(b => b.classList.toggle('is-active', b.dataset.lang === lang));
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem('amortie-lang', lang); } catch (e) {}
    $('.lang').dataset.active = lang;
    $$('.lang__btn').forEach(b => b.classList.toggle('is-active', b.dataset.lang === lang));
    document.body.classList.add('is-swapping');
    setTimeout(() => {
      applyLang();
      placePeriodPill();
      if (coachIdx > -1) setCoach(coachIdx, true);
      measureTapes();
      document.body.classList.remove('is-swapping');
      ScrollTrigger.refresh();
    }, 260);
  }
  $$('.lang__btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* =======================================================
     SMOOTH SCROLL
     ======================================================= */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollY = () => lenis ? lenis.scroll : window.scrollY;

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); return; }
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: id === '#top' ? 0 : -10 });
    else target.scrollIntoView({ behavior: 'smooth' });
  }));

  /* =======================================================
     LOADER + INTRO
     ======================================================= */
  applyLang();

  function intro() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    const heroLines = $$('.hero__lines path');
    heroLines.forEach(p => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });

    $('.hero__title').classList.add('is-in');
    tl.from('.hero__img', { scale: 1.3, duration: 2.2 }, 0)
      .from('.header__in', { yPercent: -160, duration: 1.2 }, .3)
      .from('.hero__title .wi', { yPercent: 115, duration: 1.3, stagger: .07 }, .35)
      .to(heroLines, { strokeDashoffset: 0, duration: 2, stagger: .2, ease: 'power3.inOut' }, .4)
      .from('.hero__mbadge, .hero__quote > *, .hero__side > *, .hero__mstats', { y: 30, opacity: 0, duration: 1.1, stagger: .08 }, .6)
      .from('.hero__card', { y: 60, opacity: 0, rotate: 3, duration: 1.3 }, .75)
      .add(() => countUp($('.hero .count')), .8);
  }

  /* The drop shot: the ball bounces twice (knocking up "AM" and "RTIE"),
     dies in the O slot, then the screen splits along the net line. */
  function runLoader() {
    const loader = $('.loader');
    const top = $('.loader__half--top'), bot = $('.loader__half--bot');
    bot.appendChild($('.ld', top).cloneNode(true));

    const heroImg = $('.hero__img');
    const timeout = new Promise(r => setTimeout(r, 7000));
    const ready = Promise.race([timeout, Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve()
    ])]);
    let isReady = false;
    ready.then(() => { isReady = true; });

    let seen = false;
    try { seen = sessionStorage.getItem('amortie-seen') === '1'; sessionStorage.setItem('amortie-seen', '1'); } catch (e) {}

    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();

    const finish = () => {
      loader.remove();
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    };
    if (reduced) { ready.then(() => { finish(); intro(); }); return; }

    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      const ld = $('.ld', top);
      const slot = $('.ld__slot', ld).getBoundingClientRect();
      const wl = $('.ld__w--l', ld).getBoundingClientRect();
      const wr = $('.ld__w--r', ld).getBoundingClientRect();
      const size = slot.width, r = size / 2;
      const cx = slot.left + r, cy = slot.top + r;
      const floor = wl.bottom;
      const H = innerHeight, W = innerWidth;
      const yHit = floor - r - cy;                 // ball resting on the floor line
      const xL = wl.left + wl.width / 2 - cx;
      const xR = wr.left + wr.width / 2 - cx;

      const balls = $$('.ld__ball'), ballSvgs = $$('.ld__ball svg');
      const shadows = $$('.ld__shadow'), floors = $$('.ld__floor');
      const L = $$('.ld__w--l .ld__c'), R = $$('.ld__w--r .ld__c');
      gsap.set(balls, { width: size, height: size, left: cx - r, top: cy - r, y: -cy - size * 2, x: seen ? 0 : xL - W * .22 });
      gsap.set(floors, { top: floor });
      gsap.set([...L, ...R], { y: 0, yPercent: 110 });

      const tl = gsap.timeline();
      const impact = (t, k) => tl
        .to(balls, { scaleX: 1 + .32 * k, scaleY: 1 - .3 * k, transformOrigin: '50% 100%', duration: .07, ease: 'power1.out' }, t)
        .to(balls, { scaleX: 1, scaleY: 1, duration: .45, ease: 'elastic.out(1, .35)' }, t + .07);
      const hop = (t, x, h, d) => tl
        .to(balls, { x, duration: d * 2, ease: 'none' }, t)
        .to(balls, { y: yHit - h, duration: d, ease: 'power2.out' }, t)
        .to(balls, { y: yHit, duration: d, ease: 'power2.in' }, t + d);
      const pop = (els, t) => tl.to(els, { yPercent: 0, duration: .8, stagger: .06, ease: 'back.out(1.7)' }, t);

      tl.to(floors, { scaleX: 1, duration: 1, ease: 'expo.out' }, 0);
      let end;
      if (seen) {
        tl.to(balls, { y: yHit, duration: .5, ease: 'power2.in' }, .1);
        impact(.6, 1); pop([...L, ...R], .6);
        hop(.6, 0, H * .06, .2);
        impact(1, .4);
        end = 1.05;
      } else {
        tl.to(balls, { x: xL, duration: .62, ease: 'none' }, .15)
          .to(balls, { y: yHit, duration: .62, ease: 'power2.in' }, .15);
        impact(.77, 1); pop(L, .77);
        hop(.77, xR, H * .26, .42);
        impact(1.61, .8); pop(R, 1.61);
        hop(1.61, 0, H * .11, .28);
        impact(2.17, .5);
        hop(2.17, 0, H * .035, .14);
        end = 2.45;
      }
      tl.to(ballSvgs, { rotate: seen ? 360 : 1080, duration: end, ease: 'power2.out' }, 0)
        .to(balls, { y: 0, duration: .22, ease: 'power2.inOut' }, end)
        .to(floors, { opacity: 0, duration: .4 }, end)
        .to(balls, { opacity: 0, scale: .82, duration: .35, ease: 'power2.in' }, end + .15)
        .fromTo('.ld__o', { opacity: 0, rotate: -140, scale: .8 }, { opacity: 1, rotate: 0, scale: 1, duration: .8, ease: 'expo.out' }, end + .2);

      const pct = $$('.ld__pct');
      tl.eventCallback('onUpdate', () => {
        // shadow tracks the ball along the floor and shrinks as it rises
        const bx = gsap.getProperty(balls[0], 'x'), by = gsap.getProperty(balls[0], 'y');
        const k = clamp(1 - (yHit - by) / (H * .35), .15, 1);
        const fade = tl.time() > end ? 0 : 1;
        shadows.forEach(s => { s.style.transform = `translate3d(${cx + bx}px, ${floor}px, 0) scale(${k}, ${k})`; s.style.opacity = k * .9 * fade; });
        const p = Math.min(isReady ? 100 : 92, Math.round(tl.progress() * 100));
        pct.forEach(el => { el.textContent = String(p).padStart(2, '0'); });
      });

      const played = new Promise(res => tl.eventCallback('onComplete', res));
      Promise.all([ready, played]).then(() => {
        pct.forEach(el => { el.textContent = '100'; });
        gsap.timeline({ onComplete: finish })
          .to('.ld__split', { scaleX: 1, duration: .5, ease: 'expo.inOut' }, '+=.1')
          .to('.ld__head, .ld__foot', { opacity: 0, duration: .3 }, '<')
          .to(top, { yPercent: -52, duration: 1.15, ease: 'expo.inOut' }, '+=.05')
          .to(bot, { yPercent: 52, duration: 1.15, ease: 'expo.inOut' }, '<')
          .to('.ld__split', { scaleX: 0, opacity: 0, duration: .6, ease: 'power3.in' }, '<.1')
          .add(intro, '-=.8');
      });
    });
  }
  runLoader();

  /* =======================================================
     CURSOR — tennis ball
     ======================================================= */
  if (finePointer) {
    document.documentElement.classList.add('has-cursor');
    const cur = $('.cursor');
    const ball = $('.cursor__ball');
    const svg = ball.querySelector('svg');
    const shadow = $('.cursor__shadow');
    const label = $('.cursor__label');
    const m = { x: innerWidth / 2, y: innerHeight / 2 };
    const p = { x: m.x, y: m.y };
    let roll = 0, mode = '', press = 1;

    addEventListener('mousemove', e => { m.x = e.clientX; m.y = e.clientY; cur.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));

    document.addEventListener('mouseover', e => {
      const lbl = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, summary, input, .coach');
      if (lbl) {
        mode = 'label';
        label.textContent = t('cursor.' + lbl.dataset.cursor);
      } else mode = link ? 'link' : '';
      cur.classList.toggle('is-label', mode === 'label');
      cur.classList.toggle('is-link', mode === 'link');
    });

    addEventListener('mousedown', e => {
      press = .7;
      const mark = document.createElement('span');
      mark.className = 'ball-mark';
      mark.style.left = e.pageX + 'px';
      mark.style.top = (e.pageY + 10) + 'px';
      document.body.appendChild(mark);
      gsap.fromTo(mark, { scale: .3, opacity: 1 }, { scale: 1.2, opacity: 0, duration: 1.6, ease: 'power2.out', onComplete: () => mark.remove() });
    });
    addEventListener('mouseup', () => { press = 1; });

    let sc = 1;
    gsap.ticker.add(() => {
      const dx = m.x - p.x, dy = m.y - p.y;
      p.x += dx * .22; p.y += dy * .22;
      const speed = Math.hypot(dx, dy);
      roll += dx * .9;
      sc = lerp(sc, press, .25);
      const plain = mode === 'label';
      const stretch = plain ? 0 : clamp(speed / 160, 0, .32);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      ball.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${plain ? 0 : ang}deg) scale(${(1 + stretch) * sc}, ${(1 - stretch * .6) * sc})`;
      svg.style.transform = plain ? '' : `rotate(${roll - ang}deg)`;
      shadow.style.transform = `translate3d(${p.x}px, ${p.y + 4}px, 0) scale(${1 - stretch})`;
    });
  }

  /* =======================================================
     COURT LINES — drawn as you scroll, the ball rides the tip
     ======================================================= */
  const court = $('.court');
  const courtBall = $('.court-ball');
  let courtPaths = [];
  // [start, end] of page progress for each line
  const COURT_SEG = [[0, .3], [.18, .42], [.24, .48], [.4, .56], [.52, .68], [.64, .8], [.46, .52], [.82, .92]];

  function buildCourt() {
    const W = innerWidth, H = innerHeight, P = Math.min(24, W * .03);
    const x0 = P, x1 = W - P, y0 = P, y1 = H - P;
    const cw = x1 - x0, ch = y1 - y0;
    const sx = x0 + cw * (137 / 1097), ex = x1 - cw * (137 / 1097);
    const sy1 = y0 + ch * (548 / 2377), sy2 = y0 + ch * (1829 / 2377);
    const mx = W / 2, ny = y0 + ch / 2;
    const d = [
      `M${mx} ${y0}H${x1}V${y1}H${x0}V${y0}H${mx}`,
      `M${sx} ${y0}V${y1}`,
      `M${ex} ${y1}V${y0}`,
      `M${sx} ${sy1}H${ex}`,
      `M${mx} ${sy1}V${sy2}`,
      `M${ex} ${sy2}H${sx}`,
      `M${x0 - 20} ${ny}H${x1 + 20}`,
      `M${mx} ${y1}V${y1 - 26}`
    ];
    court.setAttribute('viewBox', `0 0 ${W} ${H}`);
    court.setAttribute('preserveAspectRatio', 'none');
    courtPaths = $$('.court__lines path').map((el, i) => {
      el.setAttribute('d', d[i]);
      const len = el.getTotalLength();
      if (!el.classList.contains('court__net')) el.style.strokeDasharray = len;
      return { el, len, seg: COURT_SEG[i], net: el.classList.contains('court__net') };
    });
    drawCourt();
  }

  function drawCourt() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const prog = max > 0 ? clamp(scrollY() / max, 0, 1) : 0;
    let tip = null;
    courtPaths.forEach(({ el, len, seg, net }) => {
      const k = clamp((prog - seg[0]) / (seg[1] - seg[0]), 0, 1);
      if (net) { el.style.opacity = k; return; }
      el.style.strokeDashoffset = len * (1 - k);
      if (k > 0 && k < 1) tip = el.getPointAtLength(len * k);
    });
    if (tip) {
      courtBall.style.opacity = 1;
      courtBall.style.transform = `translate3d(${tip.x}px, ${tip.y}px, 0)`;
    } else courtBall.style.opacity = 0;
  }
  buildCourt();
  addEventListener('resize', () => { clearTimeout(buildCourt.t); buildCourt.t = setTimeout(buildCourt, 150); });

  /* =======================================================
     HEADER
     ======================================================= */
  const header = $('.header');
  let lastY = 0;
  function onScroll() {
    const y = scrollY();
    const heroH = $('.hero').offsetHeight;
    header.classList.toggle('is-solid', y > heroH - 90);
    if (!document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > lastY && y > 300);
    lastY = y;
    drawCourt();
    $('.logo__ball').style.transform = `rotate(${y * .25}deg)`;
  }
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });

  // nav hover highlight
  const nav = $('.nav'), hl = $('.nav__hl');
  $$('.nav a').forEach(a => a.addEventListener('mouseenter', () => {
    hl.style.width = a.offsetWidth + 'px';
    hl.style.transform = `translateX(${a.offsetLeft}px)`;
    hl.style.opacity = 1;
  }));
  nav.addEventListener('mouseleave', () => { hl.style.opacity = 0; });

  // mobile menu
  const burger = $('.burger');
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    $('.menu').setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    if (!open) return closeMenu();
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    $('.menu').setAttribute('aria-hidden', 'false');
    header.classList.remove('is-hidden');
    if (lenis) lenis.stop();
    gsap.fromTo('.menu__nav a', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .06, ease: 'expo.out', delay: .25 });
  });

  /* =======================================================
     MAGNETIC BUTTONS
     ======================================================= */
  if (finePointer) $$('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .5, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' }));
  });

  /* =======================================================
     TEXT REVEALS
     ======================================================= */
  $$('[data-split]:not(.hero__title)').forEach(el => ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => {
      el.classList.add('is-in');
      gsap.from(el.querySelectorAll('.wi'), { yPercent: 115, duration: 1.2, stagger: .045, ease: 'expo.out' });
    }
  }));
  $$('[data-chars]').forEach(el => ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => {
      el.classList.add('is-in');
      gsap.from(el.querySelectorAll('.ch'), { yPercent: 105, rotate: 6, duration: 1.3, stagger: .04, ease: 'expo.out' });
    }
  }));

  const revealTargets = '.about__feature, .about__slider, .prog-card, .programs__info > p, .programs__row, .step, .why__card, .coach, .fac__card, .review-card, .qa, .stat, .footer__panel > *, .sec-head, .big-head__num';
  gsap.set(revealTargets, { y: 50, opacity: 0 });
  ScrollTrigger.batch(revealTargets, {
    start: 'top 92%', once: true,
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1.1, stagger: .09, ease: 'expo.out', overwrite: true })
  });

  // big headings drift sideways with scroll
  $$('.big').forEach((el, i) => gsap.fromTo(el, { xPercent: i % 2 ? 4 : -2 }, {
    xPercent: i % 2 ? -2 : 4, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
  }));

  // image parallax
  $$('[data-parallax]').forEach(img => gsap.fromTo(img, { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
  }));

  // hero parallax out
  gsap.to('.hero__media', { yPercent: 14, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__in', { yPercent: 12, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  /* =======================================================
     COUNTERS
     ======================================================= */
  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = 1;
    const o = { v: 0 }, to = +el.dataset.to;
    gsap.to(o, { v: to, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); } });
  }
  $$('.stats .count').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) }));

  /* =======================================================
     MARQUEE TAPES — speed reacts to scroll velocity
     ======================================================= */
  const tapes = $$('.tape__track').map((track, i) => {
    const html = track.innerHTML;
    track.innerHTML = html + html + html + html;
    return { track, x: 0, dir: i ? 1 : -1, w: 0 };
  });
  const measureTapes = () => tapes.forEach(tp => { tp.w = tp.track.scrollWidth / 4; });
  measureTapes();
  addEventListener('resize', measureTapes);
  let tapeDir = 1;
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0;
    if (v > .5) tapeDir = 1; else if (v < -.5) tapeDir = -1;
    tapes.forEach(tp => {
      if (!tp.w) return;
      tp.x += tp.dir * tapeDir * (1 + Math.abs(v) * .35);
      if (tp.x <= -tp.w) tp.x += tp.w;
      if (tp.x > 0) tp.x -= tp.w;
      tp.track.style.transform = `translate3d(${tp.x}px,0,0)`;
    });
  });

  /* =======================================================
     ABOUT — mini slider
     ======================================================= */
  const mini = $$('.mini-slider img');
  let miniIdx = 0, miniTimer;
  function miniGo(dir) {
    const prev = mini[miniIdx];
    miniIdx = (miniIdx + dir + mini.length) % mini.length;
    const next = mini[miniIdx];
    mini.forEach(im => { im.style.zIndex = 0; });
    prev.style.zIndex = 1; next.style.zIndex = 2;
    gsap.fromTo(next, { clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', scale: 1.15 },
      { clipPath: 'inset(0 0 0 0%)', scale: 1, duration: 1.1, ease: 'expo.inOut', onComplete: () => { mini.forEach(im => im.classList.toggle('is-active', im === next)); } });
    gsap.to(prev, { scale: .95, duration: 1.1, ease: 'expo.inOut', onComplete: () => gsap.set(prev, { scale: 1 }) });
    restartMini();
  }
  function restartMini() { clearInterval(miniTimer); miniTimer = setInterval(() => miniGo(1), 4800); }
  $$('[data-mini]').forEach(b => b.addEventListener('click', () => miniGo(+b.dataset.mini)));
  restartMini();

  /* =======================================================
     PROGRAMS slider
     ======================================================= */
  const progImgs = $$('.prog-card__media img');
  const progLevel = [0, 1, 1, 2];
  let progIdx = 0, progBusy = false;
  function progGo(n) {
    n = (n + progImgs.length) % progImgs.length;
    if (n === progIdx || progBusy) return;
    progBusy = true;
    const prev = progImgs[progIdx], next = progImgs[n];
    progImgs.forEach(im => { im.style.zIndex = 0; });
    prev.style.zIndex = 1; next.style.zIndex = 2;
    const fwd = n > progIdx;
    gsap.fromTo(next, { clipPath: fwd ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)', scale: 1.2 },
      { clipPath: 'inset(0% 0 0 0)', scale: 1, duration: 1.1, ease: 'expo.inOut',
        onComplete: () => { progImgs.forEach(im => im.classList.toggle('is-active', im === next)); progBusy = false; } });

    const txt = $$('.prog-card__title, .prog-card__desc');
    gsap.to(txt, { y: -24, opacity: 0, duration: .35, stagger: .05, ease: 'power2.in', onComplete: () => {
      $('.prog-card__title').dataset.i18n = `prog.${n}.t`;
      $('.prog-card__desc').dataset.i18n = `prog.${n}.d`;
      txt.forEach(renderText);
      gsap.fromTo(txt, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .07, ease: 'expo.out' });
    } });
    $('.prog-card__count b').textContent = n + 1;
    $$('.level').forEach((l, i) => l.classList.toggle('is-active', i === progLevel[n]));
    progIdx = n;
  }
  $$('[data-prog]').forEach(b => b.addEventListener('click', () => progGo(progIdx + +b.dataset.prog)));
  $$('.level').forEach(b => b.addEventListener('click', () => progGo(+b.dataset.level)));
  swipe($('.prog-card'), dir => progGo(progIdx + dir));

  function swipe(el, cb) {
    let sx = null;
    el.addEventListener('pointerdown', e => { if (e.target.closest('a, button')) return; sx = e.clientX; });
    el.addEventListener('pointerup', e => {
      if (sx === null) return;
      const d = e.clientX - sx; sx = null;
      if (Math.abs(d) > 50) cb(d < 0 ? 1 : -1);
    });
    el.addEventListener('pointerleave', () => { sx = null; });
  }

  /* =======================================================
     MEMBERSHIP — monthly / season toggle
     ======================================================= */
  const periodPill = $(".period__pill");
  function placePeriodPill() {
    const btn = $(".period__btn.is-active");
    periodPill.style.width = btn.offsetWidth + "px";
    periodPill.style.transform = `translateX(${btn.offsetLeft - 5}px)`;
  }
  $$(".period__btn").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.period === plansPeriod) return;
    plansPeriod = b.dataset.period;
    $$(".period__btn").forEach(x => x.classList.toggle("is-active", x === b));
    placePeriodPill();
    renderPlans(true);
  }));
  placePeriodPill();
  addEventListener("resize", placePeriodPill);
  if (document.fonts) document.fonts.ready.then(placePeriodPill);

  gsap.set(".plan", { y: 70, opacity: 0 });
  ScrollTrigger.batch(".plan", {
    start: "top 90%", once: true,
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1.2, stagger: .12, ease: "expo.out" })
  });

  /* =======================================================
     WHY cards — lime spotlight follows the pointer
     ======================================================= */
  $$('[data-spot]').forEach(card => card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* =======================================================
     COACHES — floating portrait
     ======================================================= */
  if (finePointer) {
    const list = $('.coach-list');
    const float = $('.coach-float');
    const floatIn = $('.coach-float__in');
    const fm = { x: 0, y: 0 }, fp = { x: 0, y: 0 };
    let visible = false, current = null;

    $$('.coach').forEach(li => {
      li.addEventListener('mouseenter', () => {
        if (current === li) return;
        current = li;
        const img = document.createElement('img');
        img.src = li.dataset.img; img.alt = '';
        floatIn.appendChild(img);
        gsap.fromTo(img, { clipPath: 'inset(100% 0 0 0)', scale: 1.3 }, {
          clipPath: 'inset(0% 0 0 0)', scale: 1, duration: .8, ease: 'expo.out',
          onComplete: () => { while (floatIn.children.length > 1) floatIn.firstElementChild.remove(); }
        });
      });
    });
    list.addEventListener('mouseenter', e => {
      fp.x = fm.x = e.clientX; fp.y = fm.y = e.clientY;
      visible = true;
      gsap.to(floatIn, { scale: 1, duration: .7, ease: 'expo.out' });
    });
    list.addEventListener('mouseleave', () => {
      visible = false; current = null;
      gsap.to(floatIn, { scale: 0, duration: .5, ease: 'expo.in' });
    });
    addEventListener('mousemove', e => { fm.x = e.clientX; fm.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      if (!visible && !floatIn.children.length) return;
      const dx = fm.x - fp.x;
      fp.x += dx * .12; fp.y += (fm.y - fp.y) * .12;
      float.style.transform = `translate3d(${fp.x + 170}px, ${fp.y}px, 0) rotate(${clamp(dx * .06, -12, 12)}deg)`;
    });
  }

  /* =======================================================
     COACHES — touch: the name crossing the line under the
     sticky portrait becomes active; a tap selects it too
     ======================================================= */
  const coaches = $$('.coach');
  const stage = $('.coach-stage');
  const stageImgs = $('.coach-stage__imgs');
  let coachIdx = -1;
  function setCoach(i, force) {
    if (i === coachIdx && !force) return;
    const li = coaches[i];
    coaches.forEach(c => c.classList.toggle('is-on', c === li));
    $('.coach-stage__name').textContent = $('.coach__name', li).textContent;
    $('.coach-stage__role').textContent = $('.coach__role', li).textContent;
    $('.coach-stage__yrs b').textContent = $('sup', li).textContent;
    if (i !== coachIdx) {
      const img = document.createElement('img');
      img.src = li.dataset.img; img.alt = '';
      stageImgs.appendChild(img);
      const down = i > coachIdx;
      gsap.fromTo(img, { clipPath: down ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)', scale: 1.25 }, {
        clipPath: 'inset(0% 0 0% 0)', scale: 1, duration: .9, ease: 'expo.out',
        onComplete: () => { while (stageImgs.children.length > 1) stageImgs.firstElementChild.remove(); }
      });
      gsap.fromTo('.coach-stage__cap > *', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'expo.out' });
    }
    coachIdx = i;
  }
  gsap.matchMedia().add('(max-width: 820px), (hover: none)', () => {
    setCoach(0, true);
    const sts = coaches.map((li, i) => ScrollTrigger.create({
      trigger: li, start: 'top 68%', end: 'bottom 68%',
      onToggle: self => { if (self.isActive) { setCoach(i); stage.classList.add('is-used'); } }
    }));
    const tap = e => { const li = e.target.closest('.coach'); if (li) { setCoach(coaches.indexOf(li)); stage.classList.add('is-used'); } };
    $('.coach-list').addEventListener('click', tap);
    return () => {
      sts.forEach(s => s.kill());
      $('.coach-list').removeEventListener('click', tap);
      coaches.forEach(c => c.classList.remove('is-on'));
      coachIdx = -1;
    };
  });

  /* =======================================================
     FACILITIES — section pins, vertical scroll drives the track
     ======================================================= */
  const fac = $(".fac"), facTrack = $(".fac__track"), facBar = $(".fac__bar i"), facNum = $(".fac__count b");
  const facCards = $$(".fac__card");
  const facDist = () => Math.max(0, facTrack.offsetWidth + parseFloat(getComputedStyle(fac).paddingLeft) - document.documentElement.clientWidth);
  const skewSet = gsap.quickSetter(facCards, "skewX", "deg");
  const skew = { v: 0 };
  gsap.to(facTrack, {
    x: () => -facDist(), ease: "none",
    scrollTrigger: {
      trigger: ".fac-sec", start: "top top", end: () => "+=" + facDist(),
      pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
      onUpdate: self => {
        facBar.style.transform = `scaleX(${self.progress})`;
        facNum.textContent = String(Math.min(facCards.length, 1 + Math.round(self.progress * (facCards.length - 1)))).padStart(2, "0");
        const v = clamp(self.getVelocity() / -400, -7, 7);
        if (Math.abs(v) > Math.abs(skew.v)) {
          skew.v = v;
          gsap.to(skew, { v: 0, duration: .8, ease: "power3", overwrite: true, onUpdate: () => skewSet(skew.v) });
        }
      }
    }
  });

  /* =======================================================
     TESTIMONIALS
     ======================================================= */
  const reviews = $$('.review');
  let revIdx = 0;
  reviews[0].classList.add('is-active');
  function revGo(dir) {
    const prev = reviews[revIdx];
    revIdx = (revIdx + dir + reviews.length) % reviews.length;
    const next = reviews[revIdx];
    gsap.to(prev.children, { y: -20 * dir, opacity: 0, duration: .35, stagger: .04, ease: 'power2.in', onComplete: () => {
      prev.classList.remove('is-active');
      next.classList.add('is-active');
      gsap.fromTo(next.children, { y: 26 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .07, ease: 'expo.out' });
      gsap.fromTo(next.querySelector('img'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.out' });
    } });
    $('.review-card__count b').textContent = revIdx + 1;
    const [a, b] = $$('[data-rev]');
    a.classList.toggle('arrow--ink', dir < 0);
    b.classList.toggle('arrow--ink', dir > 0);
  }
  $$('[data-rev]').forEach(b => b.addEventListener('click', () => revGo(+b.dataset.rev)));
  swipe($('.review-card'), revGo);

  /* =======================================================
     FAQ — animated accordion, one open at a time
     ======================================================= */
  const qas = $$('.qa');
  function toggleQa(qa, open) {
    const body = qa.querySelector('.qa__a');
    if (open) {
      qa.open = true;
      gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .6, ease: 'expo.out', onComplete: refreshSoon });
    } else {
      gsap.to(body, { height: 0, opacity: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { qa.open = false; gsap.set(body, { clearProps: 'all' }); refreshSoon(); } });
    }
  }
  qas.forEach(qa => qa.querySelector('summary').addEventListener('click', e => {
    e.preventDefault();
    const willOpen = !qa.open;
    qas.forEach(o => { if (o !== qa && o.open) toggleQa(o, false); });
    toggleQa(qa, willOpen);
  }));
  function refreshSoon() { clearTimeout(refreshSoon.t); refreshSoon.t = setTimeout(() => ScrollTrigger.refresh(), 120); }

  /* =======================================================
     CTA — toggle + bouncing balls
     ======================================================= */
  const canvas = $('.cta__balls');
  const ctx = canvas.getContext('2d');
  let balls = [], raf = null, fade = 1;

  function sizeCanvas() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function burst(n = 34) {
    sizeCanvas();
    const w = canvas.clientWidth;
    for (let i = 0; i < n; i++) balls.push({
      x: w * .15 + Math.random() * w * .7, y: -20 - Math.random() * 300,
      vx: (Math.random() - .5) * 6, vy: Math.random() * 2,
      r: 9 + Math.random() * 12, a: Math.random() * 6, va: 0
    });
    fade = 1;
    if (!raf) raf = requestAnimationFrame(step);
    clearTimeout(burst.t);
    burst.t = setTimeout(() => { fade = .985; }, 4200);
  }
  function step() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, (ctx.globalAlpha || 1) * fade);
    balls.forEach(b => {
      b.vy += .45; b.x += b.vx; b.y += b.vy; b.va = b.vx / b.r; b.a += b.va;
      if (b.y + b.r > h) { b.y = h - b.r; b.vy *= -.62; b.vx *= .985; }
      if (b.x - b.r < 0) { b.x = b.r; b.vx *= -.8; }
      if (b.x + b.r > w) { b.x = w - b.r; b.vx *= -.8; }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fillStyle = '#D3FD40'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-.37 * b.r, -.82 * b.r);
      ctx.bezierCurveTo(-.5 * b.r, 0, .45 * b.r, -.05 * b.r, .3 * b.r, .9 * b.r);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, b.r * .13); ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    });
    if (ctx.globalAlpha < .02) { balls = []; ctx.globalAlpha = 1; ctx.clearRect(0, 0, w, h); raf = null; return; }
    raf = requestAnimationFrame(step);
  }

  const toggle = $('.toggle'), form = $('.cta__form'), msg = $('.cta__msg'), email = $('#email');
  toggle.addEventListener('click', () => {
    const on = !toggle.classList.contains('is-on');
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-pressed', on);
    form.classList.toggle('is-ready', on);
    msg.classList.remove('is-err');
    msg.textContent = on ? t('form.ready') : '';
    if (on) { ctx.globalAlpha = 1; burst(); setTimeout(() => email.focus({ preventScroll: true }), 500); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    msg.classList.toggle('is-err', !ok);
    msg.textContent = ok ? t('form.ok') : t('form.err');
    if (ok) { email.value = ''; ctx.globalAlpha = 1; burst(46); }
    else gsap.fromTo('.cta__row', { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1, .3)' });
  });

  /* =======================================================
     FOOTER wordmark
     ======================================================= */
  gsap.from('.wordmark > span', {
    yPercent: 110, duration: 1.3, stagger: .06, ease: 'expo.out',
    scrollTrigger: { trigger: '.wordmark', start: 'top 95%', once: true }
  });
  gsap.to('.wordmark__o svg', { rotate: 540, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* =======================================================
     COOKIE CONSENT
     ======================================================= */
  const cookie = $('.cookie');
  let consent = null;
  try { consent = localStorage.getItem('amortie-cookie'); } catch (e) {}
  if (!consent) {
    setTimeout(() => {
      document.body.classList.add('cookie-open');
      gsap.fromTo(cookie, { y: cookie.offsetHeight + 40, visibility: 'visible' }, { y: 0, duration: 1, ease: 'expo.out' });
    }, 4200);
  }
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => {
    try { localStorage.setItem('amortie-cookie', b.dataset.cookie); } catch (e) {}
    gsap.to(cookie, {
      y: cookie.offsetHeight + 40, duration: .6, ease: 'expo.in',
      onComplete: () => { cookie.style.visibility = 'hidden'; document.body.classList.remove('cookie-open'); }
    });
  }));

  /* =======================================================
     CONTACT BUTTONS (mobile)
     ======================================================= */
  const fab = $('.fab'), fabMain = $('.fab__main');
  const setFab = open => { fab.classList.toggle('is-open', open); fabMain.setAttribute('aria-expanded', open); };
  fabMain.addEventListener('click', e => { e.stopPropagation(); setFab(!fab.classList.contains('is-open')); });
  $$('.fab__item').forEach(a => a.addEventListener('click', () => setFab(false)));
  document.addEventListener('click', e => { if (!fab.contains(e.target)) setFab(false); });

  addEventListener('load', () => { measureTapes(); ScrollTrigger.refresh(); });
})();
