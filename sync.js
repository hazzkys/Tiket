// ============================================================
// Data disimpan di server.js (jalankan: node server.js).
// Kalau web dibuka lewat http(s) -> otomatis memakai server.
// Kalau dibuka langsung dari file (file://) -> mode lokal, satu browser saja.
// SERVER_URL boleh dikosongkan. Isi hanya kalau server ada di alamat lain.
// ============================================================
const SERVER_URL = "";

const K = "hotel_v1";
let cache = { b: [], c: [] }, synced = { b: {}, c: {} }, bcc = null, busy = false;
const pending = new Set();
try { bcc = new BroadcastChannel("hotel"); } catch (e) {}
const online = () => SERVER_URL.trim() !== "" || location.protocol.startsWith("http");
const base = () => SERVER_URL.trim().replace(/\/$/, "");

function load() { return cache; }

function save(d) {
  cache = d;
  if (!online()) {
    try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {}
    try { bcc && bcc.postMessage(1); } catch (e) {}
    return;
  }
  ["b", "c"].forEach(k => d[k].forEach(it => {
    const s = JSON.stringify(it);
    if (synced[k][it.id] === s) return;
    synced[k][it.id] = s;
    const key = k + ":" + it.id;
    pending.add(key);
    fetch(`${base()}/hotel/${k}/${it.id}.json`, { method: "PUT", body: s })
      .catch(() => { delete synced[k][it.id]; })
      .finally(() => pending.delete(key));
  }));
}

async function pull(cb) {
  if (busy) return;
  busy = true;
  try {
    const r = await fetch(base() + "/hotel.json");
    const j = (await r.json()) || {};
    ["b", "c"].forEach(k => {
      const arr = Object.values(j[k] || {});
      pending.forEach(key => {           // pertahankan data lokal yang belum selesai terkirim
        const [kk, id] = key.split(":");
        if (kk !== k) return;
        const loc = cache[k].find(x => x.id === id);
        if (!loc) return;
        const i = arr.findIndex(x => x.id === id);
        i >= 0 ? (arr[i] = loc) : arr.push(loc);
      });
      arr.sort((a, b) => (a.t || 0) - (b.t || 0));
      synced[k] = {};
      arr.forEach(x => synced[k][x.id] = JSON.stringify(x));
      cache[k] = arr;
    });
  } catch (e) { /* offline: pakai data terakhir */ }
  busy = false;
  cb();
}

function startSync(cb) {
  if (!online()) {
    const rd = () => {
      try { cache = JSON.parse(localStorage.getItem(K)) || { b: [], c: [] }; } catch (e) { cache = { b: [], c: [] }; }
      cb();
    };
    if (bcc) bcc.onmessage = rd;
    addEventListener("storage", e => { if (e.key === K) rd(); });
    setInterval(rd, 1500);
    rd();
    return;
  }
  const go = () => pull(cb);
  go();
  setInterval(go, 2000);
}
