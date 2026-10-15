
const CACHE_NAME = "desafio-cores-v1";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./jogo.js",
  "./manifest.json",
  "./icone-192.png",
  "./icone-512.png"
];

self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();

      await Promise.all(
        nomes
          .filter(nome => nome !== CACHE_NAME)
          .map(nome => caches.delete(nome))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", evento => {
  if (evento.request.method !== "GET") return;

  const url = new URL(evento.request.url);

  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(evento.request).then(arquivo => {
      return arquivo || fetch(evento.request);
    })
  );
});
