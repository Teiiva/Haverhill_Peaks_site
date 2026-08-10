/* ============================================================
   HAVERHILL PEAKS — lecteur audio, façade magnétoscope
   Playlist, waveform, spectre temps réel, téléchargement.
   ============================================================ */

window.HPPlayer = (() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ICON = {
    play:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    prev:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 6h2v12H7zm10 0v12l-8-6z"/></svg>',
    next:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 6h-2v12h2zM7 6v12l8-6z"/></svg>',
    dl:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LK = () => window.HPLikes;

  const audio = new Audio();
  audio.preload = 'metadata';

  let tracks = [], current = -1, peaks = {}, playbar, listRoot = null;
  let waveCv, waveCx;
  let actx = null, analyser = null, freq = null, running = false;

  const fmt = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--');
  const setVar = (k, v) => document.documentElement.style.setProperty(k, v);

  /* ---------- analyse temps réel ---------- */
  const ensureAnalyser = () => {
    if (actx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .72;
      src.connect(analyser);
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { analyser = null; }
  };

  const loop = () => {
    requestAnimationFrame(loop);
    if (!analyser || audio.paused) return;
    analyser.getByteFrequencyData(freq);
    let sum = 0, bass = 0;
    for (let i = 0; i < freq.length; i++) sum += freq[i];
    for (let i = 0; i < 6; i++) bass += freq[i];
    setVar('--level', ((sum / freq.length) / 255).toFixed(3));
    setVar('--bass', ((bass / 6) / 255).toFixed(3));
    $$('.nav-eq i').forEach((b, i) => b.style.height = Math.max(18, (freq[4 + i * 9] / 255) * 100) + '%');
  };

  const clearVisuals = () => { setVar('--level', 0); setVar('--bass', 0); };

  /* ---------- waveform ---------- */
  const fakePeaks = (seed, n = 200) => {
    let x = seed * 9301 + 49297; const out = [];
    for (let i = 0; i < n; i++) {
      x = (x * 9301 + 49297) % 233280;
      const env = .4 + .6 * Math.sin((i / n) * Math.PI * 3.1) ** 2;
      out.push(Math.max(.12, Math.min(1, (.35 + (x / 233280) * .65) * env)));
    }
    return out;
  };

  const realPeaks = async (url, n = 200) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const buf = await (await fetch(url)).arrayBuffer();
    const tmp = new AC();
    const ab = await tmp.decodeAudioData(buf);
    tmp.close && tmp.close();
    const data = ab.getChannelData(0), step = Math.floor(data.length / n), out = [];
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = 0; j < step; j += 8) m = Math.max(m, Math.abs(data[i * step + j] || 0));
      out.push(m);
    }
    const mx = Math.max(...out) || 1;
    return out.map(v => Math.max(.08, v / mx));
  };

  const drawWave = () => {
    if (!waveCv || current < 0) return;
    const p = peaks[current] || fakePeaks(current + 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = waveCv.clientWidth, h = waveCv.clientHeight;
    if (!w || !h) return;
    waveCv.width = w * dpr; waveCv.height = h * dpr;
    waveCx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waveCx.clearRect(0, 0, w, h);
    const n = p.length, gap = 1.5, bw = Math.max(1.2, w / n - gap);
    const prog = audio.duration ? audio.currentTime / audio.duration : 0;
    for (let i = 0; i < n; i++) {
      const bh = Math.max(2, p[i] * h * .88);
      waveCx.fillStyle = (i / n) <= prog ? '#55d6ff' : 'rgba(140,168,200,.55)';
      waveCx.fillRect(i * (bw + gap), (h - bh) / 2, bw, bh);
    }
  };

  const loadPeaks = async i => {
    if (peaks[i]) return drawWave();
    peaks[i] = fakePeaks(i + 1);
    drawWave();
    try { peaks[i] = await realPeaks(tracks[i].src); drawWave(); } catch (e) {}
  };

  /* ---------- lecture ----------
     Attention : la bande se reclasse selon les votes, donc la position
     d'une ligne dans le DOM ne vaut plus son numéro de piste.
     Tout passe par data-i, jamais par l'ordre d'affichage. */
  const setActive = i => {
    $$('.track').forEach(el => {
      const k = +el.dataset.i;
      el.classList.toggle('is-active', k === i);
      const b = $('[data-role=play]', el);
      if (b) b.innerHTML = (k === i && !audio.paused) ? ICON.pause : ICON.play;
    });
    document.body.classList.toggle('is-playing', !audio.paused);
    const st = $('[data-deck-state]');
    if (st) st.textContent = audio.paused ? '❚❚ PAUSE' : '▶ PLAY';

    const t = tracks[i]; if (!t || !playbar) return;
    playbar.classList.add('is-visible');
    // réserve la place occupée par la barre, en bas de page et sous les indications OSD
    document.body.classList.add('has-playbar');
    setVar('--playbar-h', playbar.offsetHeight + 'px');
    $('.playbar-now .t', playbar).textContent = t.title;
    $('.playbar-now .s', playbar).textContent = t.release;
    $('#pb-toggle').innerHTML = audio.paused ? ICON.play : ICON.pause;
    const dl = $('#pb-dl', playbar);
    if (dl) { dl.style.display = t.download === false ? 'none' : ''; dl.href = t.src; }
  };

  const play = i => {
    if (i !== current) { current = i; audio.src = tracks[i].src; loadPeaks(i); }
    ensureAnalyser();
    if (actx && actx.state === 'suspended') actx.resume();
    if (!running) { running = true; loop(); }
    window.VHS && window.VHS.setMusic && window.VHS.setMusic(true);
    audio.play().catch(() => {
      window.VHS && window.VHS.setMusic && window.VHS.setMusic(false);
      const e = $('.player-error');
      if (e) e.textContent = `■ FICHIER INTROUVABLE : ${tracks[i].src}`;
    });
    setActive(i);
  };

  const toggle = () => { audio.paused ? play(current < 0 ? first() : current) : audio.pause(); };

  /* piste suivante / précédente dans l'ordre AFFICHÉ, pas dans l'ordre du fichier */
  const shown = () => $$('.track', listRoot || document).map(el => +el.dataset.i);
  const first = () => (shown()[0] ?? 0);
  const step = d => {
    const o = shown();
    if (!o.length) return (current + d + tracks.length) % tracks.length;
    const k = o.indexOf(current);
    return k < 0 ? o[0] : o[(k + d + o.length) % o.length];
  };

  /* ---------- votes ---------- */
  const likeCount = el => LK() ? LK().get(el.dataset.slug) : 0;

  const syncLike = row => {
    const b = $('[data-role=like]', row); if (!b || !LK()) return;
    const s = row.dataset.slug, on = LK().liked(s);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.like-n', b).textContent = LK().get(s);
  };

  /* Reclassement « FLIP » : on note les positions, on réordonne, on remet
     visuellement chaque ligne à son ancienne place, puis on relâche. */
  const sortList = (animate = true) => {
    if (!listRoot || !LK()) return;
    const rows = $$('.track', listRoot);
    if (rows.length < 2) return;

    const before = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
    const sorted = rows.slice().sort((a, b) =>
      (likeCount(b) - likeCount(a)) || (+a.dataset.i - +b.dataset.i));
    if (sorted.every((r, k) => r === rows[k])) return;

    sorted.forEach(r => listRoot.appendChild(r));
    if (!animate || reducedMotion) return;

    sorted.forEach(r => {
      const d = before.get(r) - r.getBoundingClientRect().top;
      r.style.transition = 'none';
      r.style.transform = d ? `translateY(${d}px)` : '';
    });
    void listRoot.offsetHeight;                    // on force le recalcul
    sorted.forEach(r => {
      r.style.transition = 'transform .5s cubic-bezier(0.2,0.9,0.25,1)';
      r.style.transform = '';
    });
    setTimeout(() => sorted.forEach(r => { r.style.transition = ''; r.style.transform = ''; }), 560);
  };

  const onLike = async btn => {
    if (!LK() || btn.dataset.busy) return;
    const row = btn.closest('.track');
    btn.dataset.busy = '1';
    const res = await LK().toggle(row.dataset.slug);
    btn.classList.toggle('is-on', res.liked);
    btn.setAttribute('aria-pressed', res.liked ? 'true' : 'false');
    $('.like-n', btn).textContent = res.count;
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 440);
    delete btn.dataset.busy;
    sortList(true);
  };

  /* ---------- rendu ---------- */
  const renderList = root => {
    listRoot = root;
    root.innerHTML = tracks.map((t, i) => `
      <div class="track" data-i="${i}" data-slug="${t.slug}">
        <div class="track-n">${String(i + 1).padStart(2, '0')}</div>
        <div class="track-info">
          <div class="track-title">${t.title}</div>
          <div class="track-sub">${t.release}</div>
        </div>
        <div class="track-eq" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="track-dur" data-dur="${i}">--:--</div>
        <button class="like" data-role="like" aria-pressed="false" aria-label="J'aime ${t.title}">
          ${ICON.heart}<span class="like-n">0</span>
        </button>
        <div class="track-act">
          <button class="icon-btn" data-role="play" aria-label="Lire ${t.title}">${ICON.play}</button>
          ${t.download === false ? '' : `<a class="icon-btn" href="${t.src}" download aria-label="Télécharger ${t.title}" data-role="dl">${ICON.dl}</a>`}
        </div>
      </div>`).join('');

    tracks.forEach((t, i) => {
      const p = new Audio(); p.preload = 'metadata'; p.src = t.src;
      p.addEventListener('loadedmetadata', () => {
        const c = root.querySelector(`[data-dur="${i}"]`);
        if (c) c.textContent = fmt(p.duration);
      });
    });

    root.addEventListener('click', e => {
      if (e.target.closest('[data-role=dl]')) return;
      const lk = e.target.closest('[data-role=like]');
      if (lk) { e.stopPropagation(); onLike(lk); return; }
      const row = e.target.closest('.track'); if (!row) return;
      const i = +row.dataset.i;
      (i === current && !audio.paused) ? audio.pause() : play(i);
    });
  };

  const buildPlaybar = () => {
    playbar = document.createElement('div');
    playbar.className = 'playbar';
    playbar.innerHTML = `
      <div class="playbar-inner">
        <div class="playbar-now">
          <div class="reel"></div>
          <div style="min-width:0"><div class="t"></div><div class="s"></div></div>
        </div>
        <div class="wave-wrap"><canvas class="wave"></canvas></div>
        <div class="playbar-ctrl">
          <span class="tc"><b id="pb-cur">0:00</b> / <span id="pb-dur">0:00</span></span>
          <button class="icon-btn" id="pb-prev" aria-label="Précédent">${ICON.prev}</button>
          <button class="icon-btn" id="pb-toggle" aria-label="Lecture / pause">${ICON.play}</button>
          <button class="icon-btn" id="pb-next" aria-label="Suivant">${ICON.next}</button>
          <a class="icon-btn" id="pb-dl" href="#" download aria-label="Télécharger">${ICON.dl}</a>
        </div>
      </div>`;
    document.body.appendChild(playbar);

    waveCv = $('canvas.wave', playbar); waveCx = waveCv.getContext('2d');

    $('#pb-toggle').onclick = toggle;
    $('#pb-prev').onclick = () => play(step(-1));
    $('#pb-next').onclick = () => play(step(1));
    $('.wave-wrap', playbar).addEventListener('click', e => {
      if (!audio.duration) return;
      const r = waveCv.getBoundingClientRect();
      audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
      drawWave();
    });
    window.addEventListener('resize', drawWave);
  };

  const init = () => {
    tracks = window.TRACKS || [];
    if (!tracks.length) return;
    // identifiant de vote : figé sur le titre, il survit à un changement de fichier
    tracks.forEach(t => { t.slug = t.slug || (LK() ? LK().slugify(t.title) : ''); });

    const list = $('[data-tracklist]');
    if (list) renderList(list);
    buildPlaybar();

    if (LK()) {
      LK().load(tracks.map(t => t.slug)).then(() => {
        $$('.track', list || document).forEach(syncLike);
        sortList(false);          // premier classement, sans animation
      });
    }

    audio.addEventListener('timeupdate', () => { drawWave(); $('#pb-cur').textContent = fmt(audio.currentTime); });
    audio.addEventListener('loadedmetadata', () => $('#pb-dur').textContent = fmt(audio.duration));
    // la musique a la priorité : les sons du site se coupent pendant la lecture
    const tellVHS = on => { window.VHS && window.VHS.setMusic && window.VHS.setMusic(on); };
    audio.addEventListener('play',  () => { tellVHS(true);  setActive(current); });
    audio.addEventListener('playing', () => tellVHS(true));
    audio.addEventListener('pause', () => { tellVHS(false); setActive(current); clearVisuals(); });
    audio.addEventListener('ended', () => play(step(1)));
    audio.addEventListener('error', () => tellVHS(false));

    document.addEventListener('keydown', e => {
      // ni dans un champ, ni sur un bouton déjà au clavier (sinon Espace fait deux choses)
      if (/input|textarea|select|button|a/i.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.shiftKey && e.code === 'ArrowRight') $('#pb-next').click();
      if (e.shiftKey && e.code === 'ArrowLeft')  $('#pb-prev').click();
    });

    $$('[data-play-first]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); play(first()); }));
  };

  return { init, play, toggle };
})();
