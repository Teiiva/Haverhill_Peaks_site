/* ============================================================
   HAVERHILL PEAKS — moteur caméscope
   Neige, décrochages, habillage OSD, sons d'interface,
   transition de page « changement de piste ».
   ============================================================ */

window.VHS = (() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Sons d'interface ---------- */
  const SFX = {
    click:  'assets/sfx/click.mp3',
    hover:  'assets/sfx/hover.mp3',
    static: 'assets/sfx/static.mp3',
    whir:   'assets/sfx/whir.mp3',
    beep:   'assets/sfx/beep.mp3'
  };
  const VOL = { click: .45, hover: .18, static: .32, whir: .30, beep: .30 };
  const pool = {};
  let soundOn = true, armed = false, musicOn = false;

  /* Le lecteur musical prend la main : tant qu'un morceau tourne,
     les sons d'interface se taisent. */
  const setMusic = on => {
    musicOn = !!on;
    if (musicOn) stopAll();
    const btn = $('.snd');
    if (btn) {
      btn.classList.toggle('is-muted-by-music', musicOn);
      btn.title = musicOn
        ? 'Sons du site en pause pendant la musique'
        : (soundOn ? "Couper les sons d'interface" : "Activer les sons d'interface");
    }
  };

  const stopAll = () => {
    Object.values(pool).forEach(bank => {
      if (!Array.isArray(bank)) return;
      bank.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    });
  };

  const readPref = () => {
    try { const v = localStorage.getItem('hp-sound'); if (v !== null) soundOn = v === '1'; } catch (e) {}
  };
  const writePref = () => { try { localStorage.setItem('hp-sound', soundOn ? '1' : '0'); } catch (e) {} };

  const preload = () => {
    Object.entries(SFX).forEach(([k, src]) => {
      pool[k] = Array.from({ length: k === 'hover' ? 4 : 2 }, () => {
        const a = new Audio(src); a.preload = 'auto'; a.volume = VOL[k] ?? .3; return a;
      });
      pool[k]._i = 0;
    });
  };

  const play = name => {
    if (!soundOn || !armed || reduced || musicOn) return;
    const bank = pool[name]; if (!bank) return;
    const a = bank[bank._i++ % bank.length];
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
  };

  /* Les navigateurs bloquent le son avant toute interaction :
     on « arme » les sons au tout premier geste du visiteur. */
  const arm = () => {
    if (armed) return;
    armed = true;
    if (soundOn) play('whir');
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
    window.removeEventListener('wheel', arm);
  };

  const initSoundToggle = () => {
    const btn = $('.snd');
    const sync = () => {
      if (!btn) return;
      btn.textContent = soundOn ? 'SON ■' : 'SON □';
      btn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      btn.title = musicOn
        ? 'Sons du site en pause pendant la musique'
        : (soundOn ? "Couper les sons d'interface" : "Activer les sons d'interface");
    };
    sync();
    btn && btn.addEventListener('click', () => {
      soundOn = !soundOn; writePref(); sync();
      if (soundOn) { armed = true; play('beep'); }
    });
  };

  /* ---------- 2. Neige animée ---------- */
  const initSnow = () => {
    if (reduced) return;
    const cv = $('#snow'); if (!cv) return;
    const cx = cv.getContext('2d');
    let w = 0, h = 0, frames = [], fi = 0, last = 0;

    const build = () => {
      w = cv.width = Math.ceil(window.innerWidth / 3);
      h = cv.height = Math.ceil(window.innerHeight / 3);
      cv.style.width = '100%'; cv.style.height = '100%';
      frames = [];
      for (let f = 0; f < 4; f++) {                 // 4 trames pré-calculées : léger pour le CPU
        const img = cx.createImageData(w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = v * 0.7; d[i + 1] = v * 0.85; d[i + 2] = v; d[i + 3] = 255;
        }
        frames.push(img);
      }
    };

    const tick = t => {
      requestAnimationFrame(tick);
      if (t - last < 70) return;                     // ~14 images/s, comme une vraie bande
      last = t;
      cx.putImageData(frames[fi++ % frames.length], 0, 0);
    };

    build();
    requestAnimationFrame(tick);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 250); });
  };

  /* ---------- 3. Décrochages aléatoires ---------- */
  const glitch = (withSound = true) => {
    if (reduced) return;
    document.body.classList.add('glitching');
    if (withSound) play('static');
    setTimeout(() => document.body.classList.remove('glitching'), 400);
  };

  const initGlitchLoop = () => {
    if (reduced) return;
    const schedule = () => {
      const wait = 8000 + Math.random() * 9000;
      setTimeout(() => { if (!document.hidden) glitch(Math.random() > .45); schedule(); }, wait);
    };
    schedule();
  };

  /* ---------- 4. Habillage OSD ---------- */
  const two = n => String(n).padStart(2, '0');

  const initOSD = () => {
    const tc = $('[data-timecode]');
    const clock = $('[data-clock]');
    const counter = $('[data-counter]');
    const t0 = Date.now();

    const tickOSD = () => {
      if (tc) {
        const s = Math.floor((Date.now() - t0) / 1000);
        const fr = Math.floor(((Date.now() - t0) % 1000) / 40);
        tc.textContent = `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(fr)}`;
      }
      if (clock) {
        const d = new Date();
        clock.textContent = `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}  ${two(d.getHours())}:${two(d.getMinutes())}`;
      }
      requestAnimationFrame(tickOSD);
    };
    requestAnimationFrame(tickOSD);

    // compteur de bande, indexé sur le défilement
    if (counter) {
      const upd = () => {
        const max = document.body.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        counter.textContent = String(Math.round(p * 999)).padStart(4, '0');
      };
      window.addEventListener('scroll', upd, { passive: true });
      upd();
    }
  };

  /* ---------- 5. Sons + glitch sur l'interface ---------- */
  const initInteractions = () => {
    const clicky = 'a, button, .track, .shot, .video-card, .icon-btn';
    document.addEventListener('pointerdown', e => { if (e.target.closest(clicky)) play('click'); });
    document.addEventListener('pointerover', e => {
      const el = e.target.closest('a, button, .track, .video-card');
      if (el && !el.dataset.hoverLock) {
        el.dataset.hoverLock = '1';
        play('hover');
        setTimeout(() => delete el.dataset.hoverLock, 180);
      }
    });
  };

  /* ---------- 6. Transition entre les pages ---------- */
  const initPageWipe = () => {
    const wipe = $('.wipe');
    if (!wipe || reduced) return;
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const url = a.getAttribute('href');
      // uniquement la navigation entre pages du site : jamais les téléchargements,
      // les ancres, les liens externes ou les mailto.
      if (!url || a.hasAttribute('download') || a.target === '_blank'
          || !/\.html($|[?#])/.test(url) || /^https?:/.test(url)) return;
      e.preventDefault();
      play('static');
      glitch(false);
      wipe.classList.add('on');
      setTimeout(() => { window.location.href = url; }, 320);
    });
  };

  /* ---------- 7. Démarrage ---------- */
  const init = () => {
    readPref();
    preload();
    initSoundToggle();
    initSnow();
    initOSD();
    initGlitchLoop();
    initInteractions();
    initPageWipe();
    window.addEventListener('pointerdown', arm, { once: false });
    window.addEventListener('keydown', arm, { once: false });
    window.addEventListener('wheel', arm, { once: false, passive: true });
  };

  return { init, play, glitch, setMusic, get soundOn() { return soundOn; }, get musicOn() { return musicOn; } };
})();
