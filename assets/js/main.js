/* ============================================================
   HAVERHILL PEAKS — moteur du site
   Défilement, animations, composants, formulaire.
   ============================================================ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Image de secours ---------- */
  const placeholder = (label = 'HAVERHILL PEAKS', w = 900, h = 1100) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0a1122"/><stop offset="1" stop-color="#04070f"/></linearGradient>
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
        <feColorMatrix type="saturate" values="0"/></filter></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" filter="url(#n)" opacity="0.14"/>
      <g stroke="#1e6bff" stroke-width="1.5" opacity=".5" fill="none">
        <rect x="${w*0.08}" y="${h*0.08}" width="${w*0.84}" height="${h*0.84}"/></g>
      <text x="50%" y="${h*0.47}" fill="#55d6ff" font-family="monospace"
        font-size="${Math.round(Math.min(w,h)*0.07)}" text-anchor="middle" letter-spacing="8">NO SIGNAL</text>
      <text x="50%" y="${h*0.55}" fill="#5d7391" font-family="monospace"
        font-size="${Math.round(Math.min(w,h)*0.032)}" text-anchor="middle" letter-spacing="6">${label}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  window.HPplaceholder = placeholder;

  const guard = (img, label, w, h) => {
    img.addEventListener('error', () => {
      if (img.dataset.fb) return;
      img.dataset.fb = '1';
      img.src = placeholder(label, w, h);
    }, { once: true });
  };
  window.HPguard = guard;

  /* ---------- Défilement fluide ---------- */
  let lenis = null;
  const initScroll = () => {
    if (reduced || typeof Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 1, lerp: .11, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.HPlenis = lenis;
  };

  /* ---------- Navigation ---------- */
  const initNav = () => {
    $$('.nav-links a').forEach(a => a.dataset.txt = a.textContent.trim());
    const nav = $('.nav');
    if (nav) ScrollTrigger.create({ start: 50, onUpdate: s => nav.classList.toggle('is-stuck', s.scroll() > 50) });

    const burger = $('.burger'), drawer = $('.drawer');
    if (burger && drawer) {
      burger.addEventListener('click', () => {
        const open = drawer.classList.toggle('is-open');
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
        lenis && (open ? lenis.stop() : lenis.start());
      });
    }

    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(t, { offset: -70 }) : t.scrollIntoView({ behavior: 'smooth' });
    }));
  };

  /* ---------- Animations ---------- */
  const splitChars = el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, wi) => {
      const wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
      [...w].forEach(c => {
        const s = document.createElement('span');
        s.className = 'char'; s.textContent = c; wrap.appendChild(s);
      });
      el.appendChild(wrap);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  };

  const initAnim = () => {
    if (reduced) return;

    // titres : apparition saccadée, comme une image qui s'accroche
    $$('[data-split]').forEach(el => {
      splitChars(el);
      gsap.from($$('.char', el), {
        yPercent: 110, opacity: 0, duration: .5, ease: 'steps(4)', stagger: .015,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    $$('[data-reveal]').forEach(el => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .8, ease: 'power3.out',
        delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });

    $$('[data-stagger]').forEach(grp => {
      gsap.to($$(':scope > *', grp), {
        opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .07,
        scrollTrigger: { trigger: grp, start: 'top 90%' }
      });
    });

    const hero = $('.hero');
    if (hero) {
      gsap.timeline({ delay: .05 })
        .from($$('.hero-title .line > span'), { yPercent: 105, duration: .7, ease: 'steps(5)', stagger: .07 })
        .from($$('.hero-sub, .hero-socials > *, .hero-actions > *'), { opacity: 0, y: 16, duration: .5, ease: 'power2.out', stagger: .06 }, '-=.35');
      const bg = $('.hero-bg img');
      if (bg) gsap.to(bg, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // bandeaux défilants
    $$('.strip-track').forEach(track => {
      const dir = track.dataset.dir === 'right' ? 1 : -1;
      track.innerHTML = track.innerHTML + track.innerHTML + track.innerHTML;
      const w = track.scrollWidth / 3;
      gsap.set(track, { x: dir < 0 ? 0 : -w });
      gsap.to(track, { x: dir < 0 ? -w : 0, duration: parseFloat(track.dataset.speed) || 20, ease: 'none', repeat: -1 });
    });
  };

  /* ---------- Composants ---------- */
  const MOIS = ['JAN','FEV','MAR','AVR','MAI','JUN','JUL','AOU','SEP','OCT','NOV','DEC'];
  const parseDate = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    return { d: String(d).padStart(2, '0'), m: MOIS[m - 1], y, ts: new Date(y, m - 1, d).getTime() };
  };

  const renderDates = root => {
    if (!root) return;
    const limit = parseInt(root.dataset.dates || 0, 10);
    const now = Date.now() - 864e5;
    let list = [...(window.DATES || [])].sort((a, b) => a.date.localeCompare(b.date));
    list = list.filter(x => parseDate(x.date).ts >= now);
    if (limit) list = list.slice(0, limit);
    if (!list.length) {
      root.innerHTML = `<p class="mono muted" style="padding:1.5rem 0">AUCUNE DATE — ÉCRIS-NOUS POUR EN PROGRAMMER UNE</p>`;
      return;
    }
    root.innerHTML = list.map(x => {
      const f = parseDate(x.date);
      const badge = x.status === 'free' ? '<span class="pill free">Entrée libre</span>'
                  : x.status === 'soldout' ? '<span class="pill soldout">Complet</span>' : '';
      const act = x.ticket && x.status !== 'soldout'
        ? `<a class="btn" href="${x.ticket}" target="_blank" rel="noopener">Info</a>`
        : (badge || '<span class="pill">No info</span>');
      return `<div class="date-row" data-reveal>
          <div class="date-box">${f.d}.${f.m}<br>${f.y}</div>
          <div><div class="date-venue">${x.venue}</div><div class="date-city">${x.city}</div></div>
          <div class="date-time">${x.time}</div>
          <div>${act}</div>
        </div>`;
    }).join('');
  };

  const renderVideos = root => {
    if (!root) return;
    root.innerHTML = (window.VIDEOS || []).map(v => `
      <div class="video-card" data-yt="${v.id}" data-reveal>
        <img src="https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg" alt="${v.title}" loading="lazy">
        <div class="osd-play">▶ PLAY</div>
        <div class="cap">${v.title} · ${v.year}</div>
      </div>`).join('');
    root.addEventListener('click', e => {
      const c = e.target.closest('.video-card'); if (!c || c.dataset.on) return;
      c.dataset.on = '1';
      window.VHS && window.VHS.glitch(false);
      c.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${c.dataset.yt}?autoplay=1&rel=0"
        title="Clip" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    });
    $$('img', root).forEach(img => guard(img, 'CLIP', 1280, 720));
  };

  const renderGallery = root => {
    if (!root) return;
    const photos = window.PHOTOS || [];
    // crédit du cliché : celui de la photo, sinon celui du site
    const credit = p => p.credit || (window.BAND && window.BAND.photoCredit) || '';
    root.innerHTML = photos.map((p, i) => `
      <figure class="shot frame" data-i="${i}">
        <img src="${p.src}" alt="${p.caption}" loading="lazy">
        <figcaption class="stamp">
          <span class="stamp-t">${String(i + 1).padStart(2, '0')} · ${p.caption}</span>
          ${credit(p) ? `<span class="stamp-c">${credit(p)}</span>` : ''}
        </figcaption>
      </figure>`).join('');
    $$('img', root).forEach((img, i) => guard(img, 'PHOTO ' + String(i + 1).padStart(2, '0'), 900, 1050 + (i % 3) * 200));

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<button class="icon-btn lb-close" aria-label="Fermer">✕</button>
      <button class="icon-btn lb-nav lb-prev" aria-label="Précédent">‹</button>
      <button class="icon-btn lb-nav lb-next" aria-label="Suivant">›</button>
      <img alt=""><div class="lb-cap"></div>`;
    document.body.appendChild(lb);
    const img = $('img', lb), cap = $('.lb-cap', lb);
    let i = 0;
    const show = k => {
      i = (k + photos.length) % photos.length;
      img.src = photos[i].src;
      guard(img, 'PHOTO ' + String(i + 1).padStart(2, '0'), 1400, 950);
      const c = credit(photos[i]);
      cap.innerHTML = `${String(i + 1).padStart(2, '0')} · ${photos[i].caption}`
        + (c ? ` <span class="lb-credit">${c}</span>` : '');
      window.VHS && window.VHS.glitch(false);
    };
    const close = () => { lb.classList.remove('is-open'); lenis && lenis.start(); document.body.style.overflow = ''; };
    root.addEventListener('click', e => {
      const f = e.target.closest('.shot'); if (!f) return;
      show(+f.dataset.i); lb.classList.add('is-open'); lenis && lenis.stop(); document.body.style.overflow = 'hidden';
    });
    $('.lb-close', lb).onclick = close;
    $('.lb-prev', lb).onclick = e => { e.stopPropagation(); show(i - 1); };
    $('.lb-next', lb).onclick = e => { e.stopPropagation(); show(i + 1); };
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft')  show(i - 1);
    });
  };

  const renderSocials = () => {
    $$('[data-socials]').forEach(r => {
      r.innerHTML = (window.BAND.socials || []).map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join('');
    });
  };

  /* ---------- Formulaire ---------- */
  const initForm = () => {
    const form = $('#booking-form');
    if (!form) return;
    const status = $('.form-status', form);
    const key = $('input[name="access_key"]', form);
    if (key) key.value = window.BAND.formAccessKey;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', form);
      const notSet = !window.BAND.formAccessKey || window.BAND.formAccessKey.startsWith('REMPLACE');

      if (notSet) {
        const d = Object.fromEntries(new FormData(form));
        const body = `Nom : ${d.name}\nEmail : ${d.email}\nLieu : ${d.venue || '-'}\nVille : ${d.city || '-'}\n`
          + `Date souhaitée : ${d.eventdate || '-'}\nType : ${d.type || '-'}\n\n${d.message || ''}`;
        window.location.href = `mailto:${window.BAND.bookingEmail}?subject=${encodeURIComponent('Demande de concert — Haverhill Peaks')}&body=${encodeURIComponent(body)}`;
        status.className = 'form-status ok';
        status.textContent = '▶ TA MESSAGERIE S\'OUVRE';
        return;
      }

      btn.disabled = true;
      status.className = 'form-status'; status.textContent = '▶ ENVOI…';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        status.className = 'form-status ok';
        status.textContent = '▶ REÇU — RÉPONSE SOUS 72 H';
        form.reset();
        window.VHS && window.VHS.glitch();
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = '■ ÉCHEC — ÉCRIS À ' + window.BAND.bookingEmail;
      } finally { btn.disabled = false; }
    });
  };

  /* ---------- Démarrage ---------- */
  const fillBand = () => {
    $$('[data-band="email"]').forEach(e => { e.textContent = window.BAND.bookingEmail; if (e.tagName === 'A') e.href = 'mailto:' + window.BAND.bookingEmail; });
    $$('[data-band="phone"]').forEach(e => { e.textContent = window.BAND.bookingPhone; if (e.tagName === 'A') e.href = 'tel:' + window.BAND.bookingPhone.replace(/\s/g, ''); });
    $$('[data-band="contact"]').forEach(e => e.textContent = window.BAND.bookingContact);
    $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.VHS && window.VHS.init();

    if (typeof gsap === 'undefined') {
      $$('[data-reveal], [data-stagger] > *').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      try { fillBand(); renderSocials(); } catch (e) {}
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    fillBand();
    renderSocials();
    renderVideos($('[data-videos]'));
    renderGallery($('[data-gallery]'));
    renderDates($('[data-dates]'));
    $$('.hero-bg img, [data-guard]').forEach(img => guard(img, 'HAVERHILL PEAKS', 1800, 1200));

    initScroll();
    initNav();
    initForm();
    if (window.HPPlayer) window.HPPlayer.init();

    initAnim();
    ScrollTrigger.refresh();
  });
})();
