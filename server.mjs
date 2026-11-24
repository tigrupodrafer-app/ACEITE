// DRAFER ACEITE: Node 22 adapter for existing Netlify-style handlers.
// Run with: node server.mjs. Do not expose server-only environment variables to Vite.
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(root, 'dist');
const functionsDir = resolve(root, 'netlify/functions');
const prefix = '/.netlify/functions/';
const maxBody = 256 * 1024;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...noStore, ...headers });
  res.end(body);
}
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) {
      const e = new Error('Payload too large'); e.statusCode = 413; throw e;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function api(req, res, url) {
  const name = url.pathname.slice(prefix.length);
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(name)) {
    return send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': 'application/json' });
  }
  let handler;
  try {
    ({ handler } = require(resolve(functionsDir, name + '.cjs')));
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && String(error.message).includes(name + '.cjs')) {
      return send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': 'application/json' });
    }
    console.error('[aceite] Function load failed:', name, error.code || error.name);
    return send(res, 503, JSON.stringify({ error: 'Serviço indisponível' }), { 'Content-Type': 'application/json' });
  }
  if (typeof handler !== 'function') return send(res, 503, '{"error":"Serviço indisponível"}', { 'Content-Type': 'application/json' });
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: url.pathname,
    rawUrl: url.toString(),
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: ['GET', 'HEAD'].includes(req.method) ? null : await readBody(req),
    isBase64Encoded: false,
    requestContext: { identity: null },
  };
  try {
    const result = await handler(event, {});
    if (!result || !Number.isInteger(result.statusCode)) throw new Error('Invalid function result');
    const headers = { ...(result.headers || {}) };
    if (result.isBase64Encoded) {
      send(res, result.statusCode, Buffer.from(result.body || '', 'base64'), headers);
    } else {
      send(res, result.statusCode, result.body ?? '', headers);
    }
  } catch (error) {
    console.error('[aceite] Function execution failed:', name, error.name);
    send(res, error.statusCode === 413 ? 413 : 500, '{"error":"Serviço temporariamente indisponível"}', { 'Content-Type': 'application/json' });
  }
}
async function staticFile(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad path'); }
  if (pathname.includes('\\') || pathname.includes('\0')) return send(res, 400, 'Bad path');
  const target = resolve(dist, '.' + pathname);
  if (target !== dist && !target.startsWith(dist + sep)) return send(res, 403, 'Forbidden');
  let file = target;
  try {
    if (!(await stat(file)).isFile()) file = resolve(dist, 'index.html');
  } catch { file = resolve(dist, 'index.html'); }
  try {
    const data = await readFile(file);
    const type = types[extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type };
    if (file.endsWith('index.html')) headers['Cache-Control'] = 'no-store';
    else if (url.pathname.startsWith('/assets/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    send(res, 200, req.method === 'HEAD' ? '' : data, headers);
  } catch { send(res, 503, 'Frontend unavailable'); }
}
export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    try {
      if (url.pathname === '/healthz') return send(res, 200, '{"status":"ok"}', { 'Content-Type': 'application/json' });
      if (url.pathname.startsWith(prefix)) return await api(req, res, url);
      return await staticFile(req, res, url);
    } catch (error) {
      console.error('[aceite] Request failed:', error.name);
      send(res, error.statusCode === 413 ? 413 : 500, '{"error":"Serviço temporariamente indisponível"}', { 'Content-Type': 'application/json' });
    }
  });
}
const port = Number(process.env.PORT || 3000);

createServer().listen(port, '0.0.0.0', () => {
  console.log('[aceite] Node server listening on configured port');
});