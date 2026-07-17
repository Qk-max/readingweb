const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const dataFile = path.join(root, 'data', 'records.json');
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD;
const sessions = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.ico':'image/x-icon', '.png':'image/png', '.svg':'image/svg+xml' };

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control':'no-store', ...headers });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function json(res, status, body, headers) { send(res, status, body, { 'Content-Type':'application/json; charset=utf-8', ...headers }); }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(v => v.length === 2)); }
function isAdmin(request) { const token = parseCookies(request).afterimage_session; const expiresAt = token && sessions.get(token); if (!expiresAt || expiresAt < Date.now()) { if (token) sessions.delete(token); return false; } return true; }
function requireAdmin(request, response) { if (!isAdmin(request)) { json(response, 401, { error:'请先登录后台。' }); return false; } return true; }
async function readBody(request) { let result = ''; for await (const chunk of request) { result += chunk; if (result.length > 200000) throw new Error('请求内容过大'); } try { return JSON.parse(result || '{}'); } catch { throw new Error('请求数据格式不正确'); } }
async function readRecords() { return JSON.parse(await fs.readFile(dataFile, 'utf8')); }
async function saveRecords(records) { await fs.writeFile(dataFile, JSON.stringify(records, null, 2) + '\n', 'utf8'); }
function cleanRecord(input, previous = {}) {
  const type = ['film','book','essay'].includes(input.type) ? input.type : previous.type || 'film';
  const typeLabel = { film:'电影', book:'书籍', essay:'随笔' }[type];
  const title = String(input.title || '').trim().slice(0, 80);
  const byline = String(input.byline || '').trim().slice(0, 120);
  const note = String(input.note || '').trim().slice(0, 8000);
  const image = String(input.image || '').trim().slice(0, 1200);
  if (!title || !byline || !note || !image) throw new Error('标题、署名、图片链接和正文均为必填。');
  if (!/^https?:\/\//i.test(image)) throw new Error('图片必须是 http 或 https 链接。');
  const tags = Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(/[,，]/);
  return { ...previous, type, typeLabel, title, byline, note, image, rating:String(input.rating || '').trim().slice(0, 12) || '未评分', tags:tags.map(tag => String(tag).trim().slice(0, 24)).filter(Boolean).slice(0, 8), published:Boolean(input.published), updatedAt:new Date().toISOString() };
}
function safeEqual(a, b) { const aa = Buffer.from(a || ''); const bb = Buffer.from(b || ''); return aa.length === bb.length && crypto.timingSafeEqual(aa, bb); }
async function serveFile(request, response, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname === '/admin' ? 'admin.html' : pathname.slice(1);
  const file = path.resolve(root, requested);
  const publicFiles = new Set(['index.html', 'admin.html', 'app.js', 'admin.js', 'styles.css', 'route.css', 'admin.css']);
  if (!file.startsWith(root) || !publicFiles.has(requested)) return send(response, 404, 'Not found');
  try { const content = await fs.readFile(file); const extension = path.extname(file); const cacheControl = ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=3600'; send(response, 200, content, { 'Content-Type':mime[extension] || 'application/octet-stream', 'Cache-Control':cacheControl }); } catch { send(response, 404, 'Not found'); }
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/records') { const records = await readRecords(); return json(response, 200, records.filter(record => record.published)); }
    if (request.method === 'GET' && url.pathname === '/api/admin/records') { if (!requireAdmin(request, response)) return; return json(response, 200, await readRecords()); }
    if (request.method === 'GET' && url.pathname === '/api/auth/session') return json(response, 200, { authenticated:isAdmin(request) });
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      if (!adminPassword) return json(response, 503, { error:'服务器尚未配置 ADMIN_PASSWORD。' });
      const { password } = await readBody(request);
      if (!safeEqual(String(password), adminPassword)) return json(response, 401, { error:'密码不正确。' });
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, Date.now() + 1000 * 60 * 60 * 12);
      return json(response, 200, { authenticated:true }, { 'Set-Cookie':`afterimage_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` });
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') { const token = parseCookies(request).afterimage_session; sessions.delete(token); return json(response, 200, { authenticated:false }, { 'Set-Cookie':'afterimage_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
    if (request.method === 'POST' && url.pathname === '/api/admin/records') { if (!requireAdmin(request, response)) return; const records = await readRecords(); const record = cleanRecord(await readBody(request)); record.id = crypto.randomUUID(); records.unshift(record); await saveRecords(records); return json(response, 201, record); }
    const match = url.pathname.match(/^\/api\/admin\/records\/([\w-]+)$/);
    if (match && request.method === 'PUT') { if (!requireAdmin(request, response)) return; const records = await readRecords(); const index = records.findIndex(record => record.id === match[1]); if (index < 0) return json(response, 404, { error:'记录不存在。' }); records[index] = cleanRecord(await readBody(request), records[index]); await saveRecords(records); return json(response, 200, records[index]); }
    if (match && request.method === 'DELETE') { if (!requireAdmin(request, response)) return; const records = await readRecords(); const next = records.filter(record => record.id !== match[1]); if (next.length === records.length) return json(response, 404, { error:'记录不存在。' }); await saveRecords(next); return json(response, 200, { deleted:true }); }
    return serveFile(request, response, decodeURIComponent(url.pathname));
  } catch (error) { console.error(error); return json(response, 400, { error:error.message || '服务器发生错误。' }); }
}).listen(port, () => console.log(`绿森林运行于 http://127.0.0.1:${port}`));
