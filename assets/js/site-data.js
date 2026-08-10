/* ============================================================
   HAVERHILL PEAKS — FICHIER DE CONTENU
   ------------------------------------------------------------
   C'EST LE SEUL FICHIER À MODIFIER AU QUOTIDIEN.
   ============================================================ */

/* ---------- 1. IDENTITÉ & LIENS ---------- */
window.BAND = {
  name: "Haverhill Peaks",
  tagline: "Garage folk · Vannes",
  bookingEmail: "diffusion@pypoproduction.com",
  bookingPhone: "+33 6 02 07 65 60",
  bookingContact: "Solène — PYPO Production",

  /* Clé Web3Forms pour le formulaire de booking (gratuit, https://web3forms.com).
     Sans clé, le formulaire ouvre le logiciel de mail avec le message pré-rempli. */
  formAccessKey: "99d8799b-d12f-48b5-9aaa-883cf4c5ba96",

  socials: [
    { label: "Bandcamp",  url: "https://haverhillpeaks.bandcamp.com/" },
    { label: "Spotify",   url: "https://open.spotify.com/album/6znrihZcKt16riH6OydlaJ" },
    { label: "YouTube",   url: "https://www.youtube.com/@haverhillpeaks1384" },
    { label: "Instagram", url: "https://www.instagram.com/haverhillpeaks/" },
    { label: "Facebook",  url: "https://www.facebook.com/haverhillpeaks/" }
  ]
};

/* ---------- 2. MUSIQUE ----------
   MP3 dans  assets/audio/
   download: false  →  écoute seule, pas de bouton téléchargement
------------------------------------------------ */
window.TRACKS = [
  { title: "Tsar Wars",  release: "Single · 2025", src: "assets/audio/Tsar_wars.mp3",   download: true },
  { title: "Devil",       release: "EP · 2020", src: "assets/audio/Devil.mp3",             download: true },
  { title: "Stranger",         release: "EP · 2020",     src: "assets/audio/Stranger.mp3",                 download: true },
  { title: "Dinosaur", release: "EP · 2020",     src: "assets/audio/Dinosaur.wav", download: true },
  { title: "Something Wrong", release: "EP · 2020",     src: "assets/audio/Something_wrong.mp3", download: true },
  { title: "Liar Liar", release: "EP · 2020",     src: "assets/audio/Liar_liar.mp3", download: true },
  { title: "Hardcorona", release: "EP · 2020",     src: "assets/audio/Hardcorona.mp3", download: true },

];

/* ---------- 3. CLIPS ----------
   id = identifiant YouTube (la partie après ?v= dans l'URL)
------------------------------------------------ */
window.VIDEOS = [
  { title: "STEREO EYED / LIVE", id: "4QZffg0sTpE", year: "2026" },
  { title: "EVELYN", id: "qCvW1RmnXxQ", year: "2025" },
  { title: "GEN DOE (SCHLAGS SESSION)", id: "DMhfmMwqedA", year: "2025" },
  { title: "I'M A BELIEVER / Cover (SCHLAGS SESSION)", id: "O42bgY-GSn0", year: "2025" },
  { title: "MAGIC POWERS (SCHLAGS SESSION)", id: "dHwENH9w4uw", year: "2025" },
  { title: "GEN DOE", id: "gslbJ2o-1i0", year: "2025" },
  { title: "DARK PASSENGER (Live au Ferrailleur)", id: "UerCN4jvjsg", year: "2025" },
  { title: "NIGHTCALL (SCHLAGS SESSION)", id: "TFgADnk1Dl0", year: "2024" },
  { title: "STEREO EYED (SCHLAGS SESSION)", id: "zjgC8vQuQbc", year: "2023" },
  { title: "NIGHTCALL",    id: "lAarLoDGON8", year: "2023" },
  { title: "DON'T LOOK UP (ACOUSTIC LIVE SESSION)", id: "Cyn_uvX8w4A", year: "2022" },
  { title: "STRANGER (LIVE SESSION)", id: "Nh7nOwNVUJM", year: "2022" },
  { title: "DEVIL (LIVE SESSION)", id: "CPERcm2igxo", year: "2022" },
];

/* ---------- 4. PHOTOS ----------
   Fichiers dans assets/img/gallery/
------------------------------------------------ */
window.PHOTOS = [
  { src: "assets/img/gallery/01.png", caption: "Live" },
  { src: "assets/img/gallery/02.png", caption: "Vannes" },
  { src: "assets/img/gallery/03.png", caption: "L'Échonova" },
  { src: "assets/img/gallery/04.png", caption: "Backstage" },
  { src: "assets/img/gallery/05.png", caption: "Le Valhalla" },
  { src: "assets/img/gallery/06.png", caption: "Studio" },
  { src: "assets/img/gallery/07.png", caption: "La Corde Raide" },
  { src: "assets/img/gallery/08.png", caption: "Hugo & Sylvain" },
  { src: "assets/img/gallery/09.png", caption: "Sur la route" }
];

/* ---------- 5. DATES ----------
   date : AAAA-MM-JJ  ·  status : "on" | "free" | "soldout"
   ticket : lien billetterie, ou "" pour masquer le bouton
------------------------------------------------ */
window.DATES = [
  { date: "2026-09-12", time: "21:00", venue: "Le Valhalla",             city: "Caen (14)",      status: "on",      ticket: "https://levalhalla.fr/" },
  { date: "2026-09-27", time: "20:30", venue: "White Shelter",           city: "Nantes (44)",    status: "on",      ticket: "https://www.white-shelter.fr/" },
  { date: "2026-10-10", time: "19:00", venue: "Festival La Corde Raide", city: "Saumur (49)",    status: "free",    ticket: "https://www.festival-lacorderaide.fr/" },
  { date: "2026-10-24", time: "21:30", venue: "La Raskette",             city: "Vannes (56)",    status: "soldout", ticket: "" },
  { date: "2026-11-08", time: "20:00", venue: "L'Échonova",              city: "Saint-Avé (56)", status: "on",      ticket: "" }
];
