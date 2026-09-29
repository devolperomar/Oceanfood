const CACHE = "oceanfood-v1";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-app-compat.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-firestore-compat.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(u => fetch(u, {mode: "no-cors"}).then(r => c.put(u, r)).catch(() => {})));
  }));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
    return;
  }
  if (url.origin !== location.origin) return; // Firestore وباقي الخدمات بتعدّي عادي
  // الصفحة: النسخة الجديدة من النت لو متاح (بمهلة 4 ثواني)، وإلا النسخة المحفوظة
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(req, {signal: ctl.signal}); clearTimeout(t);
      if (r.ok) cache.put(req, r.clone());
      return r;
    } catch (err) {
      return (await cache.match(req, {ignoreSearch: true})) || (req.mode === "navigate" ? await cache.match("./index.html") : Response.error());
    }
  })());
});
