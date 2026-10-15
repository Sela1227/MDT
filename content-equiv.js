/* ════════════════════════════════════════════════════════════════
   V5.75.0 內容等價測試(決策紀錄「保護網」)
   ────────────────────────────────────────────────────────────────
   用固定的虛構會議資料產出 HTML 投影片,把「每一頁的種類 + 純文字」存成基準
   (content-baseline.json)。之後任何改動只要讓投影片上的字變了 —— 多一頁、少一頁、
   標籤改名、內容消失 —— 就亮紅燈。

   用法:
     node content-equiv.js            比對(preflight 會跑)
     node content-equiv.js --update   主任同意改投影片內容後,更新基準(要在 CHANGELOG 寫理由)

   只比文字,不比樣式與互動程式 —— 「HTML 產出不要亂動」指的是她們在投影片上看到的內容。
   病歷號一律 9000 開頭(虛構)。
   ════════════════════════════════════════════════════════════════ */
const {JSDOM}=require('jsdom');/* 只用來解析產出(不執行 script) */
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'index.html');
const BASE=path.join(__dirname,'content-baseline.json');
const UPDATE=process.argv.includes('--update');

/* V5.76.0 F:測試會議改用共用的 test-meeting.js(與 layout-check 同一份,原則 A) */
const TM=require('./test-meeting.js');

(async()=>{
  try{
    const html=(await TM.generate({file:FILE})).html;
    const d=new JSDOM(html).window.document;/* 不執行 script:只看產出時就寫進去的內容 */
    const norm=t=>String(t||'').replace(/\s+/g,' ').trim();
    const cur={title:norm(d.title),slides:Array.from(d.querySelectorAll('.slide')).map(s=>({
      kind:Array.from(s.classList).filter(c=>c!=='slide'&&c!=='on').sort().join(' '),
      text:norm(s.textContent),
      /* V5.75.1 N-2:只比文字看不到「圖少一張 / img 沒有 src」 */
      imgs:s.querySelectorAll('img').length,
      dataImgs:Array.from(s.querySelectorAll('img')).filter(im=>/^data:/.test(im.getAttribute('src')||'')).length}))};
    /* V5.75.1 N-2:測試資料自我檢查 —— 每種頁面至少一個值,找不到代表測試本身變空了(基準會把「空的」也鎖進去) */
    const lost=TM.selfCheck(cur.slides);
    if(lost.length){console.log('  🔴 測試資料沒進投影片:'+lost.join('、'));console.log('結果 -1');process.exit(0);}
    if(UPDATE||!fs.existsSync(BASE)){
      fs.writeFileSync(BASE,JSON.stringify(cur,null,1));
      console.log('基準已'+(UPDATE?'更新':'建立')+':'+cur.slides.length+' 頁');
      console.log('結果 0');process.exit(0);
    }
    const base=JSON.parse(fs.readFileSync(BASE,'utf8'));
    const diffs=[];
    if(base.title!==cur.title)diffs.push('標題:「'+base.title+'」→「'+cur.title+'」');
    if(base.slides.length!==cur.slides.length)diffs.push('頁數:'+base.slides.length+' → '+cur.slides.length);
    const n=Math.max(base.slides.length,cur.slides.length);
    for(let i=0;i<n;i++){
      const a=base.slides[i],b=cur.slides[i];
      if(!a||!b){diffs.push('第 '+(i+1)+' 頁'+(a?'消失':'多出來'));continue;}
      if(a.kind!==b.kind)diffs.push('第 '+(i+1)+' 頁種類:'+a.kind+' → '+b.kind);
      if(a.imgs!==b.imgs||a.dataImgs!==b.dataImgs)diffs.push('第 '+(i+1)+' 頁影像:'+a.imgs+' 張('+a.dataImgs+' 張有內容)→ '+b.imgs+' 張('+b.dataImgs+' 張有內容)');
      if(a.text!==b.text){
        let k=0;while(k<a.text.length&&a.text[k]===b.text[k])k++;
        diffs.push('第 '+(i+1)+' 頁文字不同,從「…'+a.text.slice(Math.max(0,k-12),k+20)+'」→「…'+b.text.slice(Math.max(0,k-12),k+20)+'」');
      }
    }
    console.log(cur.slides.length+' 頁比對'+(diffs.length?'':' ✅'));
    diffs.slice(0,8).forEach(x=>console.log('  🔴 '+x));
    console.log('結果 '+diffs.length);
    process.exit(0);
  }catch(e){console.log('⚠ 例外:',e.message);console.log('結果 -1');process.exit(0);}
})();
