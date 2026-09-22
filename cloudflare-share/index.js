/* ════════════════════════════════════════════════════════════
   MDT 投影片分享 Worker — share.selaginella.io
   V5.64.1(2026-09-22,檢視密碼改 session)

   路由:
     GET  /?k=cbshow          清單頁(最近 10 場,只列檔名含 _MDT 的)
     GET  /<name>.html        提供 KV 裡的 HTML
     PUT  /api/upload?name=   上傳(X-Upload-Key 驗證,只有 MDT 系統會打)
     OPTIONS /api/upload      CORS 預檢

   綁定:
     KV   HTML         (Workers 和 Pages → share → 設定 → 綁定)
     機密 UPLOAD_KEY   (設定 → 變數和機密 → 類型選「機密」)
     機密 VIEW_PWD     (V5.64.0:檢視密碼。沒設就不擋,設了清單頁與所有投影片都要輸入;V5.64.1 改瀏覽器關掉就忘)

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
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Key, X-Uploader',
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


/* ════ V5.64.0 檢視密碼 ════
   主任:「有沒有辦法加一道密碼,讓別人有連結也打不開?」
   做法:cookie 存 HMAC(VIEW_PWD, 到期日),Worker 每次驗簽 —— 密碼本身不進 cookie,
   換密碼舊 cookie 全部失效。POST /auth 驗密碼後 Set-Cookie 並導回原網址。
   更嚴謹的做法是 Cloudflare Access(各自信箱、有存取 log),這版先用共用密碼。 */
const COOKIE = 'mdt_view';
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function makeCookie(secret) {
  /* V5.64.1:主任要「每次都要輸入,不要記 30 天」→ session cookie(不設 Max-Age),瀏覽器關掉就忘。
     簽章仍帶到期時間(伺服器端上限 12 小時),防止有人把 cookie 複製出去長期用。 */
  const exp = Date.now() + 12 * 3600000;
  const sig = await hmac(secret, String(exp));
  return COOKIE + '=' + exp + '.' + sig + '; Path=/; HttpOnly; Secure; SameSite=Lax';
}
async function cookieOk(request, secret) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=(\\d+)\\.([0-9a-f]+)'));
  if (!m) return false;
  if (+m[1] < Date.now()) return false;
  return safeEqual(m[2], await hmac(secret, m[1]));
}
function loginPage(next, wrong) {
  return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>MDT 投影片 — 請輸入密碼</title>' +
    '<style>body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;background:#F5F6F8;color:#2C3540;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}' +
    '.b{background:#fff;border-radius:6px;padding:32px 36px;box-shadow:0 1px 4px rgba(0,0,0,.06);width:320px}h1{font-size:18px;margin:0 0 6px;color:#3A4550}' +
    '.s{font-size:12px;color:#9BAAB6;margin-bottom:18px}input{width:100%;box-sizing:border-box;font-size:16px;padding:10px 12px;border:1px solid #C9D1D8;border-radius:4px;margin-bottom:12px}' +
    'button{width:100%;font-size:15px;padding:10px;background:#4A7C8E;color:#fff;border:none;border-radius:4px;cursor:pointer}button:hover{background:#3D6878}' +
    '.e{color:#C0392B;font-size:13px;margin-bottom:10px}</style></head><body><div class="b">' +
    '<h1>MDT 投影片</h1><div class="s">關閉瀏覽器後需重新輸入</div>' +
    (wrong ? '<div class="e">密碼錯誤</div>' : '') +
    '<form method="POST" action="/auth"><input type="hidden" name="next" value="' + esc(next) + '">' +
    '<input type="password" name="pwd" placeholder="檢視密碼" autofocus autocomplete="current-password"><button>開啟</button></form>' +
    '</div></body></html>';
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
      /* V5.63.2:上傳者。網頁端 encodeURIComponent 過,這裡解回來;只留 40 字避免塞垃圾 */
      let uploader = '';
      try { uploader = decodeURIComponent(request.headers.get('X-Uploader') || '').trim().slice(0, 40); } catch (e) {}
      const metadata = { title, size, uploaded: new Date().toISOString().slice(0, 19), uploader };

      await env.HTML.put(name, html, { metadata });
      return json({ ok: true, name, url: url.origin + '/' + encodeURIComponent(name), title, size }, 200, ch);
    }

    /* ── 登入 ── */
    if (path === '/auth' && request.method === 'POST') {
      if (!env.VIEW_PWD) return Response.redirect(url.origin + '/?k=' + LIST_KEY, 302);
      const form = await request.formData();
      const pwd = String(form.get('pwd') || ''), next = String(form.get('next') || '/');
      const safeNext = /^\/[A-Za-z0-9._\-?=&%]*$/.test(next) ? next : '/?k=' + LIST_KEY;
      if (!safeEqual(pwd, env.VIEW_PWD)) {
        return new Response(loginPage(safeNext, true), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
      }
      return new Response(null, { status: 302, headers: { 'Location': url.origin + safeNext, 'Set-Cookie': await makeCookie(env.VIEW_PWD) } });
    }

    /* ── 檢視密碼:設了 VIEW_PWD 就擋清單與所有投影片 ── */
    if (env.VIEW_PWD && request.method === 'GET' && !(await cookieOk(request, env.VIEW_PWD))) {
      const next = url.pathname + url.search;
      return new Response(loginPage(next, false), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }

    /* ── 清單頁 ── */
    if (path === '/' && url.searchParams.get('k') === LIST_KEY) {
      const list = await env.HTML.list({ limit: 1000 });
      const items = (list.keys || [])
        .filter(k => /_MDT\.html$/i.test(k.name))
        .map(k => ({ name: k.name, title: (k.metadata && k.metadata.title) || k.name.replace(/\.html$/, ''), uploaded: (k.metadata && k.metadata.uploaded) || '', uploader: (k.metadata && k.metadata.uploader) || '' }))
        /* V5.63.2:依上傳時間排,最新在上 —— 原本依檔名字串排,新舊格式混用時 20260618 會排在 2026-09-17 前面(0 > -),
           6 月的跑到 9 月上面,個管師找不到剛上傳的。沒 uploaded 的(很舊的)退回檔名排。 */
        .sort((a, b) => (b.uploaded || '').localeCompare(a.uploaded || '') || b.name.localeCompare(a.name))
        .slice(0, 10);
      const rows = items.map(i =>
        '<li><a href="/' + encodeURIComponent(i.name) + '">' + esc(i.title) + '</a>' +
        (i.uploader ? '<span class="u">' + esc(i.uploader) + '</span>' : '') +
        (i.uploaded ? '<span class="t">' + esc(i.uploaded.replace('T', ' ')) + '</span>' : '') + '</li>'
      ).join('');
      const page = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow"><title>MDT 投影片</title>' +
        '<style>body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;background:#F5F6F8;color:#2C3540;margin:0;padding:32px 16px}' +
        '.w{max-width:720px;margin:0 auto;background:#fff;border-radius:6px;padding:24px 28px;box-shadow:0 1px 4px rgba(0,0,0,.06)}' +
        'h1{font-size:20px;margin:0 0 6px;color:#3A4550}.s{font-size:12px;color:#9BAAB6;margin-bottom:18px}' +
        'ul{list-style:none;padding:0;margin:0}li{display:flex;align-items:baseline;gap:12px;padding:12px 4px;border-bottom:1px solid #E2E7EB}' +
        'a{font-size:16px;color:#4A7C8E;text-decoration:none;flex:1}a:hover{text-decoration:underline}.t{font-size:12px;color:#9BAAB6;white-space:nowrap}.u{font-size:12px;color:#637281;background:#EFF1F4;padding:2px 8px;border-radius:3px;white-space:nowrap}' +
        '.e{padding:24px;text-align:center;color:#9BAAB6}</style></head><body><div class="w">' +
        '<h1>MDT 投影片</h1><div class="s">最近上傳的 10 場(最新在上)· 點標題開啟 · 內容含病歷號,請勿轉貼</div>' +
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
