// Servidor local sin dependencias (no se usa en Vercel): sirve /public y la API (lib/handler.js).
// Guarda en data/db.json, o en Upstash Redis si están definidas KV_REST_API_URL y KV_REST_API_TOKEN.
// Uso: node dev-server.js   (PORT=4321 y HOST=127.0.0.1 por defecto; HOST=0.0.0.0 para abrirlo en tu red local)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./lib/handler');
const { fileStore, redisStore } = require('./lib/stores');

// Cargar .env.local si existe para facilitar desarrollo local con Redis
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach((l) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const store = process.env.KV_REST_API_URL
  ? redisStore(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN)
  : fileStore(process.env.DATA_DIR || path.join(__dirname, 'data'));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, pathname);
  }
  let out;
  try {
    const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
    out = await handle(req.method, pathname.slice(5).split('/').filter(Boolean), body, store);
  } catch (e) {
    console.error(e);
    out = { status: 500, body: { error: 'Error del servidor.' } };
  }
  res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(out.body));
}).listen(PORT, HOST, () => {
  console.log(`Lewis Quiz en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
