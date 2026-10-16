/* ════════════════════════════════════════════════════════════════
   V5.76.0 預覽與畫重點 —— 端到端檢查(真的 Chromium:系統分頁 + 預覽分頁 + postMessage)
   ────────────────────────────────────────────────────────────────
   jsdom 開不了新分頁、postMessage 也不像瀏覽器,所以這條路一定要在真的瀏覽器跑:
     ① 系統按「預覽與畫重點」→ 新分頁打開
     ② 在預覽畫標記 → 按「存標記」→ 系統存進會議 → 預覽按鈕變「✓ 已存(系統)」
     ③ 再預覽一次,標記自己回來;下載用的產出也帶著標記
     ④ 系統有未儲存的修改 → 不存,告訴她原因
     ⑤ 改了某位病人的內容 → 那一頁的標記不套用,其他頁照常
   需要 playwright。病歷號一律 9000 開頭。
   ════════════════════════════════════════════════════════════════ */
const path=require('path');
let chromium;
try{chromium=require('playwright').chromium;}
catch(e){try{chromium=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright')).chromium;}catch(e2){}}
if(!chromium){console.log('NO_PLAYWRIGHT');console.log('結果 -2');process.exit(0);}

(async()=>{
  let browser=null;const bad=[];
  try{
    browser=await chromium.launch();
    const ctx=await browser.newContext({viewport:{width:1366,height:768}});
    /* 離線:時間同步與字型等外部連線一律擋掉,不讓儲存卡在等網路 */
    await ctx.route(/^https?:/,r=>r.abort());
    const p=await ctx.newPage();
    const dialogs=[];
    p.on('dialog',d=>{dialogs.push(d.message());d.accept();});
    await p.goto('file://'+path.join(__dirname,'index.html'));
    await p.waitForTimeout(800);
    await p.evaluate(function(){
      S.user=USERS[0];S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);
      S.meeting.date='2026-10-15';var fd=document.getElementById('f-date');if(fd)fd.value='2026-10-15';ensureSec('head_neck');
      var s=S.meeting.sections.head_neck;
      s.cases=[createItem('head_neck','cases',{chartNo:'9000501',name:'測試一',diagnosis:'第一位診斷文字',discussion:'第一位討論',cc:'第一位病史'},{}),
               createItem('head_neck','cases',{chartNo:'9000502',name:'測試二',diagnosis:'第二位診斷文字',discussion:'第二位討論',cc:'第二位病史'},{})];
      S.meeting.version=1;saveLocal(S.meeting);_dirty=false;
    });
    /* 照真實流程存一次(儲存會補「過去病史 Nil」等,不存的話第一次存標記時內容就變了) */
    await p.evaluate(async function(){markDirty();await saveMeeting({silent:true});});
    const openPreview=async function(){
      const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:15000}),p.evaluate(function(){previewSlides();})]);
      pop.on('dialog',d=>{dialogs.push(d.message());d.accept();});
      await pop.waitForLoadState();await pop.waitForTimeout(400);
      return pop;
    };
    const sel=function(pop,word,fn){return pop.evaluate(function(a){
      var s=document.querySelectorAll('.slide');
      for(var i=0;i<s.length;i++){var w=document.createTreeWalker(s[i],NodeFilter.SHOW_TEXT),t;
        while((t=w.nextNode())){var k=t.data.indexOf(a[0]);if(k>=0){go(i);var r=document.createRange();r.setStart(t,k);r.setEnd(t,k+a[0].length);_hlSel=r;window[a[1]](a[2]);return i;}}}
      return -1;},[word,fn[0],fn[1]]);};
    const btn=pop=>pop.evaluate(function(){var b=document.getElementById('nb-save');return {show:b.style.display!=='none',txt:b.textContent};});
    const marks=pop=>pop.evaluate(function(){return document.querySelectorAll('.slide mark, .slide span.fc').length;});

    /* ① ② */
    let pop=await openPreview();
    await sel(pop,'第一位診斷',['hlApply','#FFE066']);
    await sel(pop,'第二位討論',['fcApply','#D32F2F']);
    await pop.click('#nb-save');await pop.waitForTimeout(1500);
    const b1=await btn(pop);
    if(!/已存\(系統\)/.test(b1.txt))bad.push('存標記後按鈕不是「✓ 已存(系統)」:'+b1.txt+' '+dialogs.slice(-1));
    const sys=await p.evaluate(function(){var h=S.meeting.sections.head_neck.hlMarks;var st=JSON.parse(localStorage.getItem('mdt_m_'+S.meeting.id)||'{}');
      return {n:h&&h.marks?Object.keys(h.marks).length:0,saved:!!(st.sections&&st.sections.head_neck&&st.sections.head_neck.hlMarks),dirty:_dirty,
        status:(document.getElementById('hl-sys-status')||{}).textContent||''};});
    if(sys.n!==2)bad.push('系統裡的標記頁數應為 2,實際 '+sys.n);
    if(!sys.saved)bad.push('標記沒有存進本機的會議資料');
    if(sys.dirty)bad.push('存完標記系統仍顯示有未儲存的修改');
    if(!/投影片標記:2 頁/.test(sys.status))bad.push('產出區沒有顯示「投影片標記:2 頁」:'+sys.status);
    const unload=await pop.evaluate(function(){var e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
    if(unload)bad.push('存好後關頁仍會被提醒');
    await pop.close();

    /* ③ 再預覽一次 → 標記自己回來;下載用的產出也帶著 */
    pop=await openPreview();
    const m2=await marks(pop),b2=await btn(pop);
    if(m2!==2)bad.push('再次預覽時標記沒有回來(應 2 個,實際 '+m2+')');
    if(!/已存/.test(b2.txt))bad.push('再次預覽時按鈕應顯示已存:'+b2.txt);
    await pop.close();
    const dl=await p.evaluate(async function(){return await genHTMLSlides({download:false,silent:true});});
    if(!/id="hl-sys"[^>]*>[^<]*第|"preview":false/.test(dl)||dl.indexOf('"marks":{}')>=0)bad.push('下載用的投影片沒有帶上系統標記');

    /* ④ 系統有未儲存的修改 → 不存 */
    pop=await openPreview();
    await p.evaluate(function(){markDirty();});
    const nd=dialogs.length;
    await sel(pop,'第一位討論',['hlApply','#7FE87F']);
    await pop.click('#nb-save');await pop.waitForTimeout(1500);
    const b4=await btn(pop);
    if(!/存標記/.test(b4.txt)||!dialogs.slice(nd).some(x=>/未儲存/.test(x)))bad.push('系統有未儲存修改時應拒存並說明;按鈕:'+b4.txt+' 訊息:'+dialogs.slice(nd).join('|').slice(0,60));
    const n4=await p.evaluate(function(){return Object.keys(S.meeting.sections.head_neck.hlMarks.marks).length;});
    if(n4!==2)bad.push('拒存時系統標記不應改變');
    await p.evaluate(function(){_dirty=false;});
    await pop.close();

    /* ⑤ V5.77.0 病人+文字對位:
       a 改了第一位「沒畫線的」內容 → 兩個標記都保留,不提示
       b 改了第一位「被畫線的那段文字」→ 只有那一條不套用,提示列出那段文字
       c 前面插入一位新病人、而且他也有同樣的字 → 標記仍在原來那位病人的頁 */
    await p.evaluate(function(){S.meeting.sections.head_neck.cases[0].discussion='第一位討論(已修改)';S.meeting.sections.head_neck.cases[0].cc='第一位病史,補充一句';S.meeting.version++;saveLocal(S.meeting);_dirty=false;});
    let nd5=dialogs.length;
    pop=await openPreview();await pop.waitForTimeout(500);
    const m5a=await marks(pop);
    if(m5a!==2)bad.push('⑤a 改了同一頁其他內容,標記應全部保留(2 個),實際 '+m5a);
    if(dialogs.slice(nd5).some(x=>/已經改掉/.test(x)))bad.push('⑤a 不該出現「已經改掉」提示');
    await pop.close();
    await p.evaluate(function(){S.meeting.sections.head_neck.cases[0].diagnosis='首位診斷文字';S.meeting.version++;saveLocal(S.meeting);_dirty=false;});
    nd5=dialogs.length;
    pop=await openPreview();await pop.waitForTimeout(500);
    const m5b=await marks(pop);
    if(m5b!==1)bad.push('⑤b 被畫線的文字改掉後應只剩 1 個標記,實際 '+m5b);
    if(!dialogs.slice(nd5).some(x=>/已經改掉/.test(x)&&/第一位診斷/.test(x)))bad.push('⑤b 沒有提示是哪一段文字改掉:'+dialogs.slice(nd5).join('|').slice(0,60));
    await pop.close();
    await p.evaluate(function(){var s=S.meeting.sections.head_neck;s.cases.unshift(createItem('head_neck','cases',{chartNo:'9000500',name:'測試零',diagnosis:'插入的病人',discussion:'第二位討論',cc:'x',ph:'無'},{}));S.meeting.version++;saveLocal(S.meeting);_dirty=false;});
    pop=await openPreview();await pop.waitForTimeout(500);
    const where=await pop.evaluate(function(){return [].map.call(document.querySelectorAll('.slide mark, .slide span.fc'),function(m){var h=m.closest('.slide').querySelector('.ch');return (h&&h.textContent.match(/\d{7}/)||[''])[0];});});
    if(JSON.stringify(where)!=='["9000502"]')bad.push('⑤c 插入同樣文字的新病人後,標記應仍在 9000502 的頁:'+JSON.stringify(where));
    await pop.close();
    await p.evaluate(async function(){S.meeting.sections.head_neck.cases.shift();S.meeting.version++;saveLocal(S.meeting);_dirty=false;});

    /* ⑤d V5.76 舊格式(整頁指紋)存的標記照舊讀取 */
    pop=await openPreview();await pop.waitForTimeout(300);
    const v1=await pop.evaluate(function(){var o={};document.querySelectorAll('.slide').forEach(function(s){var r=_hlRanges(s);if(r.length)o[_hlTxt(s)]=r;});return o;});
    await pop.close();
    await p.evaluate(function(v1){S.meeting.sections.head_neck.hlMarks={marks:v1,at:'',by:''};S.meeting.version++;saveLocal(S.meeting);_dirty=false;},v1);
    pop=await openPreview();await pop.waitForTimeout(400);
    if(await marks(pop)!==1)bad.push('⑤d V5.76 舊格式標記應照舊讀取(1 個),實際 '+(await marks(pop)));
    await pop.close();

    /* ⑤e V5.79.1 審核 V-1:同一頁有兩個「陽性」,畫第一個(ER)——
       後面補字仍在 ER;把 ER 改成陰性後,標記不可以跳到 PR 的「陽性」,要提示「陽性」改掉了 */
    await p.evaluate(async function(){delete S.meeting.sections.head_neck.hlMarks;S.meeting.sections.head_neck.cases[0].diagnosis='Breast IDC, ER 陽性, PR 陽性, HER2 陰性';markDirty();await saveMeeting({silent:true});});
    pop=await openPreview();
    await sel(pop,'陽性',['fcApply','#D32F2F']);
    await pop.click('#nb-save');await pop.waitForTimeout(1500);
    await pop.close();
    const where5e=async function(){const pp=await openPreview();await pp.waitForTimeout(300);
      const w=await pp.evaluate(function(){return [].map.call(document.querySelectorAll('.slide span.fc'),function(m){var t=m.previousSibling;return (t&&t.textContent||'').slice(-3)+'['+m.textContent+']';});});
      await pp.close();return w;};
    await p.evaluate(async function(){S.meeting.sections.head_neck.cases[0].diagnosis='Breast IDC (left), ER 陽性, PR 陽性(10%), HER2 陰性';S.meeting.version++;saveLocal(S.meeting);_dirty=false;});
    const w5e1=await where5e();
    if(JSON.stringify(w5e1)!=='["ER ['+'陽性]"]')bad.push('⑤e 前後補字後標記應仍在 ER 陽性:'+JSON.stringify(w5e1));
    await p.evaluate(async function(){S.meeting.sections.head_neck.cases[0].diagnosis='Breast IDC (left), ER 陰性, PR 陽性(10%), HER2 陰性';S.meeting.version++;saveLocal(S.meeting);_dirty=false;});
    const nd5e=dialogs.length;
    const w5e2=await where5e();
    if(w5e2.length)bad.push('⑤e ER 改成陰性後標記不應跳到別處:'+JSON.stringify(w5e2));
    if(!dialogs.slice(nd5e).some(x=>/已經改掉/.test(x)&&/陽性/.test(x)))bad.push('⑤e 沒有提示「陽性」改掉了');
    await p.evaluate(function(){S.meeting.sections.head_neck.cases[0].diagnosis='第一位診斷文字';S.meeting.version++;saveLocal(S.meeting);_dirty=false;});

    /* ⑥ R-2:同時開兩份預覽,從第一份存也要成功 */
    await p.evaluate(async function(){delete S.meeting.sections.head_neck.hlMarks;markDirty();await saveMeeting({silent:true});});
    const pa=await openPreview(),pb=await openPreview();
    await sel(pa,'第二位病史',['hlApply','#80C8FF']);
    await pa.click('#nb-save');await pa.waitForTimeout(1500);
    if(!/已存\(系統\)/.test((await btn(pa)).txt))bad.push('R-2 開了兩份預覽,從第一份存標記失敗:'+(await btn(pa)).txt+' '+dialogs.slice(-1));
    await pa.close();await pb.close();

    /* ⑦ R-3:系統存檔慢(5.5 秒)→ 4 秒時說「還在儲存」,存好後自動變已存 */
    await p.evaluate(function(){window.__origSave=saveMeeting;saveMeeting=function(o){return new Promise(function(r){setTimeout(r,5500);}).then(function(){return window.__origSave(o);});};});
    pop=await openPreview();
    await sel(pop,'第一位病史',['hlApply','#FFE066']);
    await pop.click('#nb-save');await pop.waitForTimeout(4600);
    const slowMsg=await pop.evaluate(function(){var d=document.getElementById('hl-dlg');return d?d.textContent:'';});
    if(!/還在儲存/.test(slowMsg))bad.push('R-3 存檔慢時 4 秒應顯示「還在儲存」:'+slowMsg.slice(0,30));
    await pop.waitForTimeout(3500);
    const b7=await btn(pop),dlg7=await pop.evaluate(function(){return !!document.getElementById('hl-dlg');});
    if(!/已存\(系統\)/.test(b7.txt)||dlg7)bad.push('R-3 慢存檔完成後應自動變「已存(系統)」並關掉提示:'+b7.txt+(dlg7?' (提示還在)':''));
    await p.evaluate(function(){saveMeeting=window.__origSave;});
    await pop.close();

    /* ⑧ R-1:登入者不負責頭頸癌,NAS 上有負責人較新的版本 → 個案內容取 NAS,標記保留這台的,而且真的存進去才說已存 */
    await p.evaluate(async function(){
      var other=USERS.find(function(u){return (u.cancers||[]).indexOf('head_neck')<0;}),owner=USERS.find(function(u){return (u.cancers||[]).indexOf('head_neck')>=0;});
      S.user=other;
      var nas=JSON.parse(JSON.stringify(S.meeting));nas.rev='nas-owner-rev';nas.version=(S.meeting.version||1)+5;nas.savedById=owner.id;nas.savedBy=owner.name;
      delete nas.sections.head_neck.hlMarks;nas.sections.head_neck.cases[1].discussion='第二位討論(負責人更新)';
      window.__nas=nas;nasHandle={};_readNasMtg=async function(){return window.__nas;};writeMtgToNAS=async function(){return true;};
    });
    pop=await openPreview();
    await sel(pop,'第一位診斷',['fcApply','#1976D2']);
    await pop.click('#nb-save');await pop.waitForTimeout(2000);
    const r1=await p.evaluate(function(){var sc=S.meeting.sections.head_neck;return {hl:!!(sc.hlMarks&&Object.keys(sc.hlMarks.marks||{}).length),disc:sc.cases[1].discussion};});
    const b8=await btn(pop);
    if(!/已存\(系統\)/.test(b8.txt)||!r1.hl)bad.push('R-1 代班畫的標記應保留並顯示已存:按鈕 '+b8.txt+' 標記 '+r1.hl);
    if(r1.disc!=='第二位討論(負責人更新)')bad.push('R-1 個案內容應以負責人(NAS)為準:'+r1.disc);
    await pop.close();

    /* ⑧b V5.79.0 審核 S-1:反方向 —— 負責人改了個案內容再存,NAS 上是代班者較新、多了標記的版本 → 標記要留著,個案內容是負責人的 */
    const s1=await p.evaluate(async function(){
      var owner=USERS.find(function(u){return (u.cancers||[]).indexOf('head_neck')>=0;}),other=S.user;
      var nas=JSON.parse(JSON.stringify(S.meeting));nas.rev='nas-helper-rev';nas.version=(S.meeting.version||1)+9;nas.savedById=other.id;nas.savedBy=other.name;
      if(!nas.sections.head_neck.hlMarks)return {err:'前一步沒有標記'};
      window.__nas=nas;
      S.user=owner;delete S.meeting.sections.head_neck.hlMarks;S._snapshot=JSON.stringify(S.meeting);S._baseRev='owner-base';S._baseVer=1;
      S.meeting.sections.head_neck.cases[0].diagnosis='負責人修改的診斷';markDirty();
      await saveMeeting({silent:true});
      var sc=S.meeting.sections.head_neck;
      return {hl:!!(sc.hlMarks&&(sc.hlMarks.marks||[]).length),dx:sc.cases[0].diagnosis};
    });
    if(s1.err||!s1.hl)bad.push('S-1 負責人改個案後存檔,代班者畫的標記被蓋掉'+(s1.err?'('+s1.err+')':''));
    if(s1.dx!=='負責人修改的診斷')bad.push('S-1 個案內容應是負責人修改的:'+s1.dx);
    await p.evaluate(function(){nasHandle=null;});

    /* ⑨ R-4:複製會議不帶標記(原始碼) */
    const src=require('fs').readFileSync(path.join(__dirname,'index.html'),'utf8');
    const cp=src.slice(src.indexOf('function confirmCopyMtg('),src.indexOf('function confirmCopyMtg(')+1500);
    if(cp.indexOf('delete copy.sections[k].hlMarks')<0)bad.push('R-4 複製會議沒有清掉投影片標記');

    /* ⑩ V5.80.0 註記:預覽裡加註記 → 存進會議(n)→ 再預覽還在 → 小抄印出 → 下載/分享的投影片沒有註記 */
    await p.evaluate(async function(){S.user=USERS.find(function(u){return (u.cancers||[]).indexOf('head_neck')>=0;});delete S.meeting.sections.head_neck.hlMarks;markDirty();await saveMeeting({silent:true});});
    pop=await openPreview();
    const pv=await pop.evaluate(function(){return document.body.classList.contains('hl-pv')&&getComputedStyle(document.querySelector('#hl-toolbar .hl-note')).display!=='none';});
    if(!pv)bad.push('⑩ 預覽裡看不到「✎ 註記」按鈕');
    await pop.evaluate(function(){window.prompt=function(){return 'TNM stages 待確認';};});
    await sel(pop,'第二位病史',['hlNote']);
    await pop.evaluate(function(){window.prompt=function(){return '問放射腫瘤科';};});
    await sel(pop,'第一位討論',['fcApply','#D32F2F']);
    const n10=await pop.evaluate(function(){var m=[].filter.call(document.querySelectorAll('.slide span.fc'),function(x){return /第一位討論/.test(x.textContent);})[0];_hlRmTarget=m;hlNoteOne();
      return [].map.call(document.querySelectorAll('.slide [data-n]'),function(x){return x.textContent+'='+x.getAttribute('data-n');});});
    if(n10.join('|')!=='第一位討論=問放射腫瘤科|第二位病史=TNM stages 待確認'&&n10.join('|')!=='第二位病史=TNM stages 待確認|第一位討論=問放射腫瘤科')bad.push('⑩ 註記沒有加上:'+JSON.stringify(n10));
    await pop.click('#nb-save');await pop.waitForTimeout(1500);
    if(!/已存\(系統\)/.test((await btn(pop)).txt))bad.push('⑩ 加註記後存標記失敗:'+(await btn(pop)).txt);
    await pop.close();
    const sys10=await p.evaluate(function(){return (S.meeting.sections.head_neck.hlMarks.marks||[]).filter(function(e){return e.n;}).map(function(e){return e.n;}).sort().join('|');});
    if(sys10!==['問放射腫瘤科','TNM stages 待確認'].sort().join('|'))bad.push('⑩ 系統裡的註記不對:'+sys10);
    pop=await openPreview();
    const back=await pop.evaluate(function(){return document.querySelectorAll('.slide [data-n]').length;});
    if(back!==2)bad.push('⑩ 再預覽註記沒有回來:'+back);
    await pop.close();
    const out10=await p.evaluate(async function(){
      var dl=await genHTMLSlides({download:false,silent:true});
      var got='',ow=window.open;window.open=function(){return {document:{open:function(){},write:function(h){got+=h;},close:function(){}}};};
      try{genPrintSheet();}finally{window.open=ow;}
      return {dlHasNote:/TNM stages 待確認|問放射腫瘤科/.test(dl),dlHasMark:/第二位病史/.test(dl),sheet:got};});
    if(out10.dlHasNote)bad.push('⑩ 下載/分享的投影片不應帶註記');
    if(!/第二位病史[\s\S]{0,120}TNM stages 待確認/.test(out10.sheet)||!/第一位討論[\s\S]{0,120}問放射腫瘤科/.test(out10.sheet))bad.push('⑩ 會議小抄沒有印出重點與註記');

    console.log('預覽與畫重點 15 個情境'+(bad.length?'':' ✅'));
    bad.slice(0,6).forEach(x=>console.log('  🔴 '+x));
    console.log('結果 '+bad.length);
  }catch(e){console.log('⚠ 例外:',e.message.slice(0,200));console.log('結果 -1');}
  finally{if(browser)await browser.close();process.exit(0);}
})();
