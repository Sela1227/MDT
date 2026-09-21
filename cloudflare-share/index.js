/* ════════════════════════════════════════════════════════════
   MDT 投影片分享 Worker — share.selaginella.io
   V5.62.0(2026-09-21)

   路由:
     GET  /?k=cbshow          清單頁(最近 10 場,只列檔名含 _MDT 的)
     GET  /<name>.html        提供 KV 裡的 HTML
     PUT  /api/upload?name=   上傳(X-Upload-Key 驗證,只有 MDT 系統會打)
     OPTIONS /api/upload      CORS 預檢

   綁定:
     KV   HTML         (Workers 和 Pages → share → 設定 → 綁定)
     機密 UPLOAD_KEY   (設定 → 變數和機密 → 類型選「機密」)

   設計原則:
     - 網頁只帶上傳金鑰,CF API Token 不出現在任何前端(V5.62.0 B-4 根治)
     - 上傳一樣寫 title/size/uploaded metadata,Git Pusher 的「管理 Cloudflare」清單照常顯示
     - 檔名只允許 [A-Za-z0-9._-],擋 ../ 與 %2F 那類路徑
     - 清單頁不需登入(V5.41.0 起的行為);**分享頁面任何人拿到網址就能開**,
       含病歷號的內容建議另加 Cloudflare Access 或上傳前去識別化
   ════════════════════════════════════════════════════════════ */

const ALLOWED_ORIGINS = new Set([
  'https://sela1227.github.io',
  'http://localhost:8000',      /* 本機測試 */
  'http://127.0.0.1:8000',
]);
const LIST_KEY = 'cbshow';
const MAX_BYTES = 25 * 1024 * 1024;  /* KV 單筆上限 */

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.has(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}),
  });
}
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* 常數時間比較,避免計時側通道 */
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const origin = request.headers.get('Origin') || '';

    /* ── CORS 預檢 ── */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    /* ── 上傳 ── */
    if (path === '/api/upload') {
      const ch = corsHeaders(origin);
      if (request.method !== 'PUT') return json({ ok: false, error: 'method not allowed' }, 405, ch);
      if (!env.UPLOAD_KEY) return json({ ok: false, error: 'server not configured (UPLOAD_KEY missing)' }, 500, ch);
      const key = request.headers.get('X-Upload-Key') || '';
      if (!safeEqual(key, env.UPLOAD_KEY)) return json({ ok: false, error: 'unauthorized' }, 401, ch);

      const name = (url.searchParams.get('name') || '').trim();
      if (!name || !/^[A-Za-z0-9._-]+\.html$/.test(name) || name.includes('..')) {
        return json({ ok: false, error: 'invalid name' }, 400, ch);
      }
      const html = await request.text();
      const size = new TextEncoder().encode(html).length;
      if (!html || size === 0) return json({ ok: false, error: 'empty body' }, 400, ch);
      if (size > MAX_BYTES) return json({ ok: false, error: 'too large (' + Math.round(size / 1048576) + ' MB > 25 MB)' }, 413, ch);

      /* 從 <title> 取標題,與 Git Pusher 寫入的 metadata 同格式 */
      let title = name.replace(/\.[^.]+$/, '');
      const tm = html.slice(0, 8192).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (tm && tm[1].trim()) title = tm[1].trim().slice(0, 120);
      const metadata = { title, size, uploaded: new Date().toISOString().slice(0, 19) };

      await env.HTML.put(name, html, { metadata });
      return json({ ok: true, name, url: url.origin + '/' + encodeURIComponent(name), title, size }, 200, ch);
    }

    /* ── 清單頁 ── */
    if (path === '/' && url.searchParams.get('k') === LIST_KEY) {
      const list = await env.HTML.list({ limit: 1000 });
      const items = (list.keys || [])
        .filter(k => /_MDT\.html$/i.test(k.name))
        .map(k => ({ name: k.name, title: (k.metadata && k.metadata.title) || k.name.replace(/\.html$/, ''), uploaded: (k.metadata && k.metadata.uploaded) || '' }))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 10);
      const rows = items.map(i =>
        '<li><a href="/' + encodeURIComponent(i.name) + '">' + esc(i.title) + '</a>' +
        (i.uploaded ? '<span class="t">' + esc(i.uploaded.replace('T', ' ')) + '</span>' : '') + '</li>'
      ).join('');
      const page = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow"><title>MDT 投影片</title>' +
        '<style>body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;background:#F5F6F8;color:#2C3540;margin:0;padding:32px 16px}' +
        '.w{max-width:720px;margin:0 auto;background:#fff;border-radius:6px;padding:24px 28px;box-shadow:0 1px 4px rgba(0,0,0,.06)}' +
        'h1{font-size:20px;margin:0 0 6px;color:#3A4550}.s{font-size:12px;color:#9BAAB6;margin-bottom:18px}' +
        'ul{list-style:none;padding:0;margin:0}li{display:flex;align-items:baseline;gap:12px;padding:12px 4px;border-bottom:1px solid #E2E7EB}' +
        'a{font-size:16px;color:#4A7C8E;text-decoration:none;flex:1}a:hover{text-decoration:underline}.t{font-size:12px;color:#9BAAB6;white-space:nowrap}' +
        '.e{padding:24px;text-align:center;color:#9BAAB6}</style></head><body><div class="w">' +
        '<h1>MDT 投影片</h1><div class="s">最近 10 場 · 點標題開啟 · 內容含病歷號,請勿轉貼</div>' +
        (rows ? '<ul>' + rows + '</ul>' : '<div class="e">目前沒有投影片</div>') +
        '</div></body></html>';
      return new Response(page, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=60', 'X-Robots-Tag': 'noindex' } });
    }

    /* ── 提供檔案 ── */
    if (request.method === 'GET' && path.length > 1) {
      const name = path.slice(1);
      if (!/^[A-Za-z0-9._-]+\.html$/.test(name) || name.includes('..')) return new Response('Not found', { status: 404 });
      const html = await env.HTML.get(name);
      if (html == null) return new Response('Not found', { status: 404 });
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex' } });
    }

    return new Response('Not found', { status: 404 });
  },
};
