// Service worker della demo: mette in cache i file dell'app per l'uso senza rete (Modo sentiero).
// Nella demo non ci sono dati sul server, quindi si mette in cache solo il guscio dell'app.
// Cambiare VERSIONE a ogni pubblicazione, così i telefoni scaricano i file nuovi.
const VERSIONE = "campobase-demo-v10";
const FILE = [
  "./", "./index.html", "./app.css", "./app.js", "./calcoli.js", "./testi.js", "./assistente.js", "./modulo-partecipante.js", "./modulo-uscita.js", "./modulo-profilo.js", "./modulo-contenuti.js", "./modulo-uscita.css", "./modulo-profilo.css", "./modulo-contenuti.css", "./icone/mascotte-enrico.svg", "./manifest.webmanifest",
  "./icone/icon-192.png", "./icone/icon-512.png",
  "./font/outfit-latin.woff2", "./font/outfit-latin-ext.woff2",
  "./font/inter-latin.woff2", "./font/inter-latin-ext.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Prima la rete, poi la cache: con il segnale si vede sempre l'ultima versione pubblicata,
// senza segnale (Modo sentiero) l'app si apre dalla copia salvata.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSIONE).then((c) => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
