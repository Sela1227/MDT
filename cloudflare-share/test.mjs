/* Worker 測試(V5.65.0)。執行:node cloudflare-share/test.mjs。每次改 Worker 必跑。 */
import worker from './index.js';
const mk=(over={})=>{const store=new Map();return{store,env:Object.assign({UPLOAD_KEY:'k'.repeat(32),VIEW_PWD:'testpwd',SESSION_SECRET:'s'.repeat(40),HTML:{
  put:async(k,v,o)=>store.set(k,{v,m:o&&o.metadata,ttl:o&&o.expirationTtl}),get:async k=>store.has(k)?store.get(k).v:null,
  list:async({limit=1000,cursor}={})=>{const keys=[...store.keys()].sort();const start=cursor?parseInt(cursor):0;const page=keys.slice(start,start+limit);const done=start+limit>=keys.length;return{keys:page.map(n=>({name:n,metadata:store.get(n).m})),list_complete:done,cursor:done?undefined:String(start+limit)};}}},over)};};
const R=(env,u,i)=>worker.fetch(new Request('https://share.selaginella.io'+u,i),env);
let pass=0,total=0;const T=(n,ok,x)=>{total++;if(ok)pass++;console.log((ok?'✅':'🔴')+' '+n+(x?'  '+x:''));};
const login=async(env,pwd='testpwd',next='/?k=cbshow')=>{const r=await R(env,'/auth',{method:'POST',body:new URLSearchParams({pwd,next})});return{r,ck:(r.headers.get('Set-Cookie')||'').split(';')[0]};};

{ const {env}=mk();
  T('W-6 殘缺網址 400 不拋',(await R(env,'/%E0%A4%A')).status===400);
  let r=await R(env,'/api/upload',{method:'OPTIONS',headers:{Origin:'null'}});
  T('W-7 Origin null 不送 ACAO',r.headers.get('Access-Control-Allow-Origin')===null);
  r=await R(env,'/api/upload',{method:'OPTIONS',headers:{Origin:'https://sela1227.github.io'}});
  T('W-7 白名單仍放行',r.headers.get('Access-Control-Allow-Origin')==='https://sela1227.github.io');
  r=await R(env,'/auth',{method:'POST',body:'{}',headers:{'content-type':'application/json'}});
  T('W-6 非表單 POST /auth 400 不拋',r.status===400);
}
{ const {env,store}=mk();
  const t0=Date.now();const {r}=await login(env,'wrong');
  T('W-1 錯密碼 401 且 ≥800ms',r.status===401&&Date.now()-t0>=750,(Date.now()-t0)+'ms');
  const {ck}=await login(env);
  T('登入 Set-Cookie session(無 Max-Age)',ck.startsWith('mdt_view=')&&!/Max-Age/.test(ck));
  const parts=ck.split('=')[1].split('.');
  T('W-2 換 SESSION_SECRET 舊 cookie 失效',(await R(mk({SESSION_SECRET:'other'}).env,'/?k=cbshow',{headers:{Cookie:ck}})).status===401);
  T('W-2 換 VIEW_PWD 舊 cookie 失效',(await R(mk({VIEW_PWD:'other'}).env,'/?k=cbshow',{headers:{Cookie:ck}})).status===401);
  T('偽造 cookie 401',(await R(env,'/?k=cbshow',{headers:{Cookie:'mdt_view=9999999999999.deadbeef'}})).status===401);
  const noSec=mk({SESSION_SECRET:undefined}).env;
  const noSecPage=await(await R(noSec,'/?k=cbshow')).text();
  T('N-6 未設 SESSION_SECRET 對外不洩露設定名',noSecPage.indexOf('SESSION_SECRET')<0&&noSecPage.indexOf('維護中')>=0);
  T('N-6 未設時 /auth 回 503 非 500',(await R(noSec,'/auth',{method:'POST',body:new URLSearchParams({pwd:'testpwd',next:'/'})})).status===503);
  await store.set('x_MDT.html',{v:'<title>x</title>PHI',m:{title:'x',uploaded:'2026-09-24T00:00:00'}});
  let r2=await R(env,'/x_MDT.html',{headers:{Cookie:ck}});
  T('W-4 設密碼時投影片 no-store',r2.headers.get('Cache-Control')==='no-store');
  r2=await R(env,'/?k=cbshow',{headers:{Cookie:ck}});
  T('W-4 清單 no-store',r2.headers.get('Cache-Control')==='no-store');
  const open=mk({VIEW_PWD:undefined}).env;await open.HTML.put('y_MDT.html','<title>y</title>',{metadata:{title:'y'}});
  T('沒設 VIEW_PWD 不擋且可快取',(await R(open,'/y_MDT.html')).headers.get('Cache-Control').indexOf('max-age')>=0);
}
{ const {env,store}=mk();
  const r=await R(env,'/api/upload?name=a_MDT.html',{method:'PUT',headers:{'X-Upload-Key':'k'.repeat(32),'Origin':'https://sela1227.github.io','X-Uploader':encodeURIComponent('楊')},body:'<title>A</title>'});
  T('上傳 200 不受密碼影響',r.status===200);
  T('W-5 預設 90 天 expirationTtl',store.get('a_MDT.html').ttl===90*86400);
  const e0=mk({RETAIN_DAYS:'0'});await R(e0.env,'/api/upload?name=b_MDT.html',{method:'PUT',headers:{'X-Upload-Key':'k'.repeat(32)},body:'<title>B</title>'});
  T('W-5 RETAIN_DAYS=0 不過期',e0.store.get('b_MDT.html').ttl===undefined);
  T('上傳者 metadata',store.get('a_MDT.html').m.uploader==='楊');
  const big=await R(env,'/api/upload?name=c_MDT.html',{method:'PUT',headers:{'X-Upload-Key':'k'.repeat(32),'Content-Length':String(30*1024*1024)},body:'x'});
  T('W-9 Content-Length 超過先 413',big.status===413);
  T('錯金鑰 401',(await R(env,'/api/upload?name=d_MDT.html',{method:'PUT',headers:{'X-Upload-Key':'bad'},body:'x'})).status===401);
  T('檔名 ../ 400',(await R(env,'/api/upload?name=../e.html',{method:'PUT',headers:{'X-Upload-Key':'k'.repeat(32)},body:'x'})).status===400);
}
{ const {env,store}=mk();
  for(let i=0;i<995;i++)store.set('2026-01-'+String(i).padStart(4,'0')+'_X_MDT.html',{v:'x',m:{title:'old'+i,uploaded:'2026-01-01T00:00:00'}});
  for(let d=1;d<=10;d++)store.set('202609'+String(d).padStart(2,'0')+'-HN_MDT.html',{v:'x',m:{title:'new'+d,uploaded:'2026-09-'+String(d).padStart(2,'0')+'T00:00:00'}});
  const {ck}=await login(env);const t=await(await R(env,'/?k=cbshow',{headers:{Cookie:ck}})).text();
  const n=(t.match(/new\d+/g)||[]).length;
  T('W-3 超過 1000 筆仍列出最新 10 筆',n===10,n+'/10');
  T('W-3 順序:new10 在最上',t.indexOf('new10')<t.indexOf('new9'));
}
console.log('\n'+pass+'/'+total);process.exit(pass===total?0:1);
