/* ============================================================
   HAVERHILL PEAKS — compteurs de votes
   ------------------------------------------------------------
   Deux modes, choisis tout seuls :
   · Supabase renseigné dans site-data.js  →  compteurs partagés
     par tous les visiteurs.
   · Rien de renseigné  →  repli sur le navigateur du visiteur,
     le site fonctionne, mais chacun a son propre classement.
   Le vote d'un visiteur est mémorisé en local : un vote par piste.
   ============================================================ */

window.HPLikes = (() => {
  'use strict';

  const cfg = (window.BAND && window.BAND.supabase) || {};
  const online = !!(cfg.url && cfg.anonKey && !/REMPLACE/i.test(cfg.url + cfg.anonKey));

  const K_MINE  = 'hp-liked';        // ce que CE visiteur a voté
  const K_CACHE = 'hp-likes-cache';  // dernier état connu des compteurs

  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let counts = {};
  let mine = readJSON(K_MINE, []);

  /* identifiant stable d'une piste, insensible aux accents et à la casse */
  const slugify = s => String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const headers = () => ({
    apikey: cfg.anonKey,
    Authorization: 'Bearer ' + cfg.anonKey,
    'Content-Type': 'application/json'
  });

  const load = async (slugs = []) => {
    counts = readJSON(K_CACHE, {});
    if (online) {
      try {
        const r = await fetch(`${cfg.url}/rest/v1/track_likes?select=slug,likes`, { headers: headers() });
        if (r.ok) {
          const fresh = {};
          (await r.json()).forEach(row => { fresh[row.slug] = row.likes | 0; });
          counts = fresh;
          writeJSON(K_CACHE, counts);
        }
      } catch (e) { /* hors ligne : on garde le cache */ }
    }
    slugs.forEach(s => { if (typeof counts[s] !== 'number') counts[s] = 0; });
    return counts;
  };

  const get   = s => counts[s] | 0;
  const liked = s => mine.indexOf(s) !== -1;

  const toggle = async s => {
    const on = !liked(s);
    const delta = on ? 1 : -1;

    // on met à jour tout de suite : l'interface ne doit pas attendre le réseau
    counts[s] = Math.max(0, get(s) + delta);
    mine = on ? mine.concat(s) : mine.filter(x => x !== s);
    writeJSON(K_MINE, mine);
    writeJSON(K_CACHE, counts);

    if (online) {
      try {
        const r = await fetch(`${cfg.url}/rest/v1/rpc/bump_like`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ p_slug: s, p_delta: delta })
        });
        if (r.ok) {
          const v = await r.json();
          if (typeof v === 'number') { counts[s] = v; writeJSON(K_CACHE, counts); }
        }
      } catch (e) { /* le compteur local fait foi jusqu'au prochain chargement */ }
    }
    return { count: get(s), liked: on };
  };

  return { load, get, liked, toggle, slugify, get online() { return online; } };
})();
