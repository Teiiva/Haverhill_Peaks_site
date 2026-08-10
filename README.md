# Haverhill Peaks — site vitrine

Direction artistique **caméscope bleu / VHS glitch**. Site statique (HTML / CSS / JS), aucune installation, aucun build.

## Lancer en local

```bash
cd haverhill-peaks
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Un double-clic sur `index.html` fonctionne aussi, mais la lecture des MP3 et le visualiseur audio ont besoin d'un vrai serveur.

## Les 3 pages

| Page | Contenu |
|---|---|
| `index.html` | Hero, bio courte, lecteur avec téléchargement, prochaines dates |
| `media.html` | Clips YouTube + galerie photo avec visionneuse |
| `booking.html` | Formulaire court + contact + fiche technique condensée |

## Ce qu'il faut remplir

Tout se passe dans **`assets/js/site-data.js`**, seul fichier à éditer au quotidien.

### Les MP3 → `assets/audio/`

Garder les noms attendus : `dark-passenger.mp3`, `nightcall.mp3`, `after-8.mp3`, `haverhill-peaks.mp3`.
Les 4 fichiers actuellement présents sont des **sons de démonstration** générés pour que le lecteur soit testable — à écraser.

### Les images → `assets/img/`

- `hero.jpg` — grande photo live, paysage, 2000 px de large minimum
- `duo.jpg` — les deux frères, format paysage
- `gallery/01.jpg` à `09.jpg` — la galerie

Le traitement caméscope (virage bleu, contraste, franges chromatiques, grain) est appliqué par le site. Inutile de retoucher en amont. Tant qu'une image manque, une mire **NO SIGNAL** s'affiche.

### Le formulaire

Récupérer une clé gratuite sur **https://web3forms.com** (30 secondes, pas de compte) et la coller dans `formAccessKey`. Sans clé, le formulaire ouvre le logiciel de mail avec le message pré-rempli — le site reste fonctionnel dès la première minute.

### Les dates

```js
{ date: "2026-09-12", time: "21:00", venue: "Le Valhalla", city: "Caen (14)", status: "on", ticket: "https://…" }
```

Tri automatique, les dates passées disparaissent toutes seules. `status` : `"on"` · `"free"` (entrée libre) · `"soldout"` (complet).

### Les clips

`window.VIDEOS` — seulement l'identifiant YouTube (ce qui suit `?v=`). Vignette récupérée automatiquement, iframe chargée au clic uniquement, domaine `youtube-nocookie`.

## L'identité caméscope

**À l'image** — neige animée à 14 images/s, lignes de balayage, bande de synchro qui descend en boucle, courbure et vignettage d'écran cathodique, virage bleu, franges rouge/cyan sur les titres et les photos. Habillage OSD permanent : témoin REC clignotant, timecode qui tourne, indicateur de batterie, numéro de canal, compteur de bande indexé sur le défilement, date et heure réelles en bas à droite.

**Décrochages** — toutes les 8 à 17 secondes, l'image se déchire brièvement (déplacement, biais, virage de teinte), avec grésillement une fois sur deux. Même effet au changement de photo dans la visionneuse et à l'envoi du formulaire.

**Réaction au son** — pendant la lecture, un analyseur temps réel pilote le petit égaliseur à côté du logo et fait respirer les gros titres sur les basses. Pas de barres de spectre en arrière-plan : la waveform de la barre de lecture reste le seul repère visuel de la piste.

**Au son** — cinq sons synthétisés dans `assets/sfx/` : clac de touche mécanique au clic, tick discret au survol, grésillement sur les décrochages et les changements de page, moteur de bande au démarrage, bip de confirmation.

Les sons sont **actifs par défaut**, avec un bouton `SON ■ / □` dans la barre du haut ; le choix est mémorisé d'une visite à l'autre. Les navigateurs interdisant le son avant toute interaction, ils s'arment au premier clic, appui clavier ou molette — c'est aussi ce qui déclenche le bruit de bande d'ouverture.

**Transition entre les pages** — un balayage de barres blanches et un grésillement, comme un changement de piste sur une cassette.

## Mettre en ligne

| Hébergeur | Comment |
|---|---|
| **Netlify** | Glisser-déposer le dossier sur app.netlify.com/drop |
| **Vercel** | `vercel` dans le dossier, ou import depuis GitHub |
| **GitHub Pages** | Pousser le dossier, activer Pages dans les réglages |
| **OVH / o2switch** | Envoyer le contenu en FTP dans `www/` |

Tous gratuits pour ce type de site. Nom de domaine ≈ 12 €/an.

## Structure

```
haverhill-peaks/
├─ index.html · media.html · booking.html
└─ assets/
   ├─ css/style.css     DA complète
   ├─ js/site-data.js   ← LE FICHIER À ÉDITER
   ├─ js/vhs.js         neige, décrochages, OSD, sons, transitions
   ├─ js/player.js      lecteur audio + visualiseur
   ├─ js/main.js        défilement, animations, composants, formulaire
   ├─ audio/            les MP3
   ├─ sfx/              les sons d'interface
   └─ img/              hero.jpg, duo.jpg, gallery/
```

Librairies : **GSAP + ScrollTrigger** (animations) et **Lenis** (défilement inertiel), chargées par CDN. Rien à installer.

## Accessibilité

- `prefers-reduced-motion` respecté : neige, bande de synchro, décrochages, transitions et sons se désactivent entièrement.
- Sons coupables en un clic, choix mémorisé.
- Clavier : `Espace` = lecture / pause, `Maj + ← →` = piste précédente / suivante, `Échap` ferme la visionneuse.
- Les iframes YouTube ne se chargent qu'au clic.
