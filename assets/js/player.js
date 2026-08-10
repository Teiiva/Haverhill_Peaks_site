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
    dl:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>'
  };

  const audio = new Audio();
  audio.preload = 'metadata';

  let tracks = [], current = -1, peaks = {}, playbar;
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

  /* ---------- lecture ---------- */
  const setActive = i => {
    $$('.track').forEach((el, k) => el.classList.toggle('is-active', k === i));
    $$('.track .icon-btn[data-role=play]').forEach((b, k) => b.innerHTML = (k === i && !audio.paused) ? ICON.pause : ICON.play);
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

  const toggle = () => { audio.paused ? play(current < 0 ? 0 : current) : audio.pause(); };

  /* ---------- rendu ---------- */
  const renderList = root => {
    root.innerHTML = tracks.map((t, i) => `
      <div class="track" data-i="${i}">
        <div class="track-n">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="track-title">${t.title}</div>
          <div class="track-sub">${t.release}</div>
        </div>
        <div class="track-eq" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="track-dur" data-dur="${i}">--:--</div>
        <div style="display:flex;gap:.4rem">
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
    $('#pb-prev').onclick = () => play((current - 1 + tracks.length) % tracks.length);
    $('#pb-next').onclick = () => play((current + 1) % tracks.length);
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
    const list = $('[data-tracklist]');
    if (list) renderList(list);
    buildPlaybar();

    audio.addEventListener('timeupdate', () => { drawWave(); $('#pb-cur').textContent = fmt(audio.currentTime); });
    audio.addEventListener('loadedmetadata', () => $('#pb-dur').textContent = fmt(audio.duration));
    // la musique a la priorité : les sons du site se coupent pendant la lecture
    const tellVHS = on => { window.VHS && window.VHS.setMusic && window.VHS.setMusic(on); };
    audio.addEventListener('play',  () => { tellVHS(true);  setActive(current); });
    audio.addEventListener('playing', () => tellVHS(true));
    audio.addEventListener('pause', () => { tellVHS(false); setActive(current); clearVisuals(); });
    audio.addEventListener('ended', () => play((current + 1) % tracks.length));
    audio.addEventListener('error', () => tellVHS(false));

    document.addEventListener('keydown', e => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.shiftKey && e.code === 'ArrowRight') $('#pb-next').click();
      if (e.shiftKey && e.code === 'ArrowLeft')  $('#pb-prev').click();
    });

    $$('[data-play-first]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); play(0); }));
  };

  return { init, play, toggle };
})();
