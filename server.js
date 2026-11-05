// Server sederhana untuk Hotel Bahari Inn. Tanpa library tambahan, cukup Node.js.
// Jalankan:  node server.js
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const PORT = process.env.PORT || 3000, ROOT = __dirname, DB = path.join(ROOT, "data.json");

let data = { b: {}, c: {} };
try { data = Object.assign(data, JSON.parse(fs.readFileSync(DB, "utf8"))); } catch (e) {}
const save = () => fs.writeFile(DB, JSON.stringify(data), () => {});

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const PRIVATE = ["data.json", "server.js"];

http.createServer((req, res) => {
  let url = "/";
  try { url = decodeURIComponent(req.url.split("?")[0]); } catch (e) {}

  // API: ambil semua data
  if (url === "/hotel.json" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(data));
  }
  // API: simpan satu pesanan (b) atau satu panggilan (c)
  const m = url.match(/^\/hotel\/(b|c)\/([\w-]+)\.json$/);
  if (m && req.method === "PUT") {
    let body = "";
    req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      try { data[m[1]][m[2]] = JSON.parse(body); save(); res.writeHead(200); res.end("{}"); }
      catch (e) { res.writeHead(400); res.end(); }
    });
    return;
  }

  // File statis (html, js, foto, dll)
  const rel = url === "/" ? "/index.html" : url;
  const p = path.join(ROOT, path.normalize(rel));
  if (!p.startsWith(ROOT) || PRIVATE.includes(path.basename(p))) { res.writeHead(403); return res.end("Dilarang"); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Tidak ditemukan"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log("\nHotel Bahari Inn berjalan.\n");
  console.log("  Di komputer ini : http://localhost:" + PORT + "/index.html");
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list) if (n.family === "IPv4" && !n.internal)
      console.log("  Dari HP (satu WiFi): http://" + n.address + ":" + PORT + "/index.html");
  console.log("  Resepsionis     : buka /resepsionis.html\n");
});
