const {JSDOM}=require('jsdom');
const fs=require('fs');
const FILE=require('path').join(__dirname,'index.html');/* V5.70.0:相對路徑,preflight 從任何目錄都能跑 */
const errs=[];
const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{
  runScripts:'dangerously', url:'https://localhost/',
  beforeParse(w){
    w.scrollTo=()=>{}; w.indexedDB=undefined;
    w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>null;
    w.fetch=()=>Promise.reject(new Error('offline'));
    w.onerror=(m)=>{errs.push('onerror: '+m);};
    w.addEventListener('unhandledrejection',e=>errs.push('rejection: '+e.reason));
    const ce=w.console.error; w.console.error=(...a)=>{errs.push('console.error: '+a.join(' '));};
  }
});
setTimeout(async ()=>{
  const w=dom.window, run=c=>w.eval(c);
  console.log('VERSION =', run('typeof VERSION!=="undefined"?VERSION:"?"'));
  console.log('載入期間錯誤:', errs.length);
  errs.slice(0,5).forEach(e=>console.log('   ',e.slice(0,150)));

  try{
    run("S.user=USERS[0];S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);ensureSec('head_neck');"
      +"var s=S.meeting.sections['head_neck'];"
      +"['cases','followups','team','special'].forEach(function(t){s[t].push(createItem('head_neck',t,{},{}));});"
      +"s.events=s.events||[];s.events.push(createItem('head_neck','events',{},{}));");
    console.log('\n[1] 建立會議與卡片: ✅');
  }catch(e){ console.log('\n[1] 🔴', e.message); process.exit(1); }

  // ── 渲染後掃描未插值殘留 ──
  console.log('\n=== 渲染後未插值殘留掃描 ===');
  const targets=[
    ["caseHTML(cases)","caseHTML('head_neck',0,s.cases[0],'cases',undefined)"],
    ["caseHTML(events)","caseHTML('head_neck',0,s.events[0],'events')"],
    ["caseViewHTML(cases)","caseViewHTML('head_neck',0,s.cases[0],'cases')"],
    ["caseViewHTML(events)","caseViewHTML('head_neck',0,s.events[0],'events')"],
    ["followupHTML","followupHTML('head_neck',0,s.followups[0],'followups')"],
    ["teamHTML","teamHTML('head_neck',0,s.team[0],'team',true)"],
    ["specialHTML","specialHTML('head_neck',0,s.special[0])"]
  ];
  let bad=0;
  targets.forEach(([name,expr])=>{
    try{
      const r=run("(function(){var s=S.meeting.sections['head_neck'];var d=document.createElement('div');"
        +"d.innerHTML="+expr+";var out=[];var all=d.querySelectorAll('*');"
        +"for(var k=0;k<all.length;k++){var el=all[k];for(var j=0;j<el.attributes.length;j++){"
        +"var a=el.attributes[j];if(a.value.indexOf('${')>=0)out.push(el.tagName+'['+a.name+'=\"'+a.value.slice(0,20)+'\"]');}}"
        +"return out.slice(0,5).join(', ');})()");
      console.log('  '+(r?'🔴':'✅')+' '+name+(r?' → '+r:''));
      if(r)bad++;
    }catch(e){ console.log('  ⚠ '+name+' 例外: '+e.message.slice(0,90)); }
  });

  // ── caseflag data-ty 實際值 ──
  console.log('\n=== caseflag 的 data-ty 實際值 ===');
  ['cases','events'].forEach(ty=>{
    const v=run("(function(){var s=S.meeting.sections['head_neck'];var d=document.createElement('div');"
      +"d.innerHTML=caseHTML('head_neck',0,s."+ty+"[0],'"+ty+"',"+(ty==='events'?"{noImages:true}":"undefined")+");"
      +"var e=d.querySelector('[data-action=\"caseflag\"]');return e?e.dataset.ty:'(無)';})()");
    /* V5.59.0 N-12:必要事件本來就沒有討論原因旗標(EV-9),期望值是「(無)」;原本永遠紅燈 → 警告疲勞(坑 #59) */
    const _exp={cases:'cases',events:'(無)'}[ty];
    console.log('  '+ty+': "'+v+'" '+(v===_exp?'✅':'🔴'));
  });

  // ── 打字往返測試(A-1 回歸)──
  console.log('\n=== 打字往返測試 ===');
  ['cases','events'].forEach(ty=>{
    try{
      const r=run("(function(){var s=S.meeting.sections['head_neck'];"
        +"var host=document.createElement('div');document.body.appendChild(host);"
        +"host.innerHTML=caseHTML('head_neck',0,s."+ty+"[0],'"+ty+"',"+(ty==='events'?"{noImages:true}":"undefined")+");"
        +"var inputs=host.querySelectorAll('input,textarea');var hit=0;"
        +"for(var k=0;k<inputs.length;k++){var el=inputs[k];"
        +"  if(el.getAttribute('oninput')&&el.getAttribute('oninput').indexOf('upd(')>=0){"
        +"    el.value='測試"+ty+"';el.dispatchEvent(new Event('input',{bubbles:true}));hit++;if(hit>=3)break;}}"
        +"host.remove();"
        +"return JSON.stringify({觸發:hit,寫入:JSON.stringify(s."+ty+"[0]).indexOf('測試"+ty+"')>=0});})()");
      const o=JSON.parse(r);
      console.log('  '+ty+': 觸發 '+o.觸發+' 個欄位,資料寫入 '+(o.寫入?'✅':'🔴'));
    }catch(e){ console.log('  '+ty+' 🔴 '+e.message.slice(0,110)); }
  });

  // ── 點擊 caseflag ──
  console.log('\n=== 點擊 caseflag 旗標 ===');
  ['cases','events'].forEach(ty=>{
    const before=errs.length;
    try{
      const r=run("(function(){var s=S.meeting.sections['head_neck'];"
        +"var host=document.createElement('div');document.body.appendChild(host);"
        +"host.innerHTML=caseHTML('head_neck',0,s."+ty+"[0],'"+ty+"',"+(ty==='events'?"{noImages:true}":"undefined")+");"
        +"var f=host.querySelector('[data-action=\"caseflag\"]');"
        +"if(!f)return 'no-flag';"
        +"f.dispatchEvent(new MouseEvent('click',{bubbles:true}));"
        +"host.remove();return JSON.stringify(s."+ty+"[0].flags||[]);})()");
      const newErr=errs.length-before;
      console.log('  '+ty+': flags='+r+' '+(r&&r!=='[]'?'✅':'🔴')+(newErr?'  ⚠ 新增 '+newErr+' 個錯誤':''));
      if(newErr)errs.slice(before).forEach(e=>console.log('      '+e.slice(0,120)));
    }catch(e){ console.log('  '+ty+' 🔴 '+e.message.slice(0,110)); }
  });

  // ── 儲存/載入往返 ──
  console.log('\n=== 儲存 / 載入往返 ===');
  try{
    const r=run("(function(){var ok=saveLocal(S.meeting);"
      +"var idx=getIdx();var found=idx.some(function(e){return e.id===S.meeting.id;});"
      +"var m2=loadLocal(S.meeting.id);"
      +"var s2=m2&&m2.sections&&m2.sections['head_neck'];"
      +"return JSON.stringify({存檔:!!ok,索引:found,"
      +"cases回讀:!!(s2&&s2.cases&&s2.cases.length),events回讀:!!(s2&&s2.events&&s2.events.length),"
      +"內容還在:JSON.stringify(s2||{}).indexOf('測試cases')>=0});})()");
    const o=JSON.parse(r);
    Object.keys(o).forEach(k=>console.log('  '+k+': '+(o[k]?'✅':'🔴')));
  }catch(e){ console.log('  🔴 '+e.message.slice(0,150)); }

  // ── [V5.46.1] R-1 那一類:整張卡片的 data-ty 覆蓋率 ──
  console.log('\n=== [坑#68/R-1] 必要事件卡片 data-ty 覆蓋率 ===');
  try{
    const r=run("(function(){var s=S.meeting.sections['head_neck'];"
      +"var ev=createItem('head_neck','events',{chartNo:'E9',"
      +"pathologies:[{date:'2026-01-01',content:'p'}],exams:[{name:'CT',date:'2026-01-02',content:'e'}],"
      +"treatments:[{name:'Op',date:'2026-01-03',content:'t'}],markers:[{name:'CEA',content:'5'}],"
      +"genomics:[{name:'EGFR',date:'2026-01-04',content:'g'}],"
      +"timeline:[{type:'dx',date:'2026-01-05',label:'x'}],phChips:['DM']},{});"
      +"var d=document.createElement('div');d.innerHTML=caseHTML('head_neck',0,ev,'events');"
      +"var bad=[];d.querySelectorAll('[data-action][data-cid]').forEach(function(el){"
      +"  if(el.dataset.action==='togglecase')return;"
      +"  if(el.dataset.ty!=='events')bad.push(el.dataset.action+'='+(el.dataset.ty||'(無)'));});"
      +"return JSON.stringify({total:d.querySelectorAll('[data-action][data-cid]').length,bad:bad.slice(0,8)});})()");
    const o=JSON.parse(r);
    console.log('  帶 data-cid 的元素:',o.total,'| data-ty≠events:',o.bad.length,o.bad.length?'🔴 '+o.bad.join(', '):'✅');
    if(o.bad.length)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));}

  // ── [V5.46.1] R-2:存檔 → 立即修改 → 放棄,放棄後應等於磁碟 ──
  console.log('\n=== [R-2] 存檔→立即修改→放棄 往返 ===');
  try{
    const r=run("(function(){var s=S.meeting.sections['head_neck'];"
      +"S.meeting.date='2026-10-01';S.viewMode=false;"
      +"s.cases[0].discussion='A1';_editGen++;"
      +"var json=JSON.stringify(S.meeting);saveLocal(S.meeting);S._snapshot=json;"  /* 模擬 _doSave 成功當下 */
      +"s.cases[0].discussion='A2';markDirty();"                               /* 1.2 秒內再改 */
      +"if(S._snapshot){S.meeting=JSON.parse(S._snapshot);}"                    /* 放棄編輯 */
      +"var mem=S.meeting.sections['head_neck'].cases[0].discussion;"
      +"var disk=loadLocal(S.meeting.id).sections['head_neck'].cases[0].discussion;"
      +"return JSON.stringify({mem:mem,disk:disk});})()");
    const o=JSON.parse(r);
    const ok=o.mem==='A1'&&o.disk==='A1';
    console.log('  放棄後記憶體='+o.mem+' 磁碟='+o.disk+'  '+(ok?'✅ 已存的 A1 保住了':'🔴'));
    if(!ok)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));}

  // ── [V5.47.1] EV-1 那一類:逐一操作必要事件卡片的每個元件,個案討論不得被改到 ──
  //    比 data-ty 覆蓋率更根本 —— 委派、inline on*、動態插入的元素全部涵蓋
  console.log('\n=== [EV-1] 逐一操作必要事件卡片,個案討論不得被改到 ===');
  try{
    const r=run("(function(){"
      +"var s=S.meeting.sections['head_neck'];"
      +"while(s.cases.length)s.cases.pop();while((s.events||[]).length)s.events.pop();"
      +"s.cases.push(createItem('head_neck','cases',{chartNo:'C0',exams:[{name:'CT',date:'2026-01-01',content:'x'}],timeline:[{type:'dx',date:'2026-01-01',label:'c'}]},{}));"
      +"s.events=s.events||[];"
      +"s.events.push(createItem('head_neck','events',{chartNo:'E0',exams:[{name:'MRI',date:'2026-02-01',content:'y'}],timeline:[{type:'dx',date:'2026-02-01',label:'e'}]},{}));"
      +"var host=document.createElement('div');host.id='div-events-head_neck';document.body.appendChild(host);"
      +"host.innerHTML=caseHTML('head_neck',0,s.events[0],'events');"
      +"var snap=JSON.stringify(s.cases[0]);var bad=[];var n=0;"
      +"host.querySelectorAll('input,select,textarea').forEach(function(el){"
      +"  if(el.type==='date'||el.type==='checkbox'||el.type==='file')return;"
      +"  if(el.tagName==='SELECT'){if(el.options.length<2)return;el.selectedIndex=el.selectedIndex===0?1:0;el.dispatchEvent(new Event('change',{bubbles:true}));}"
      +"  else{el.value='probe';el.dispatchEvent(new Event('input',{bubbles:true}));}"
      +"  n++;"
      +"  if(JSON.stringify(s.cases[0])!==snap){bad.push((el.dataset.action||el.tagName)+'/'+(el.dataset.field||el.dataset.key||el.name||''));s.cases[0]=JSON.parse(snap);}"
      +"});"
      +"host.remove();"
      +"return JSON.stringify({操作:n,污染:bad.slice(0,6)});})()");
    const o=JSON.parse(r);
    console.log('  操作了',o.操作,'個元件 | 改到個案討論的:',o.污染.length,o.污染.length?'🔴 '+o.污染.join(', '):'✅');
    if(o.污染.length)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));}

  // ── [V5.53.0] I-1/I-2:必要事件與 NGS 影像必須進投影片 ──
  console.log('\n=== [I-1/I-2] 影像進投影片 ===');
  try{
    const PX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    run("S.meeting.date='2026-10-01';S.viewMode=false;S.meetingMode='record';var fd=document.getElementById('f-date');if(fd)fd.value='2026-10-01';"
      +"var s=S.meeting.sections['head_neck'];"
      +"s.cases=[createItem('head_neck','cases',{chartNo:'C0',name:'甲',diagnosis:'dx',discussion:'d',genomicsImages:[{name:'cg.png',dataUrl:'"+PX+"',caption:'C_NGS'}]},{})];"
      +"s.events=[createItem('head_neck','events',{chartNo:'E0',name:'乙',diagnosis:'dx',cc:'x',"
      +"pathologyImages:[{name:'ep.png',dataUrl:'"+PX+"',caption:'E病理'}],surgicalImages:[{name:'es.png',dataUrl:'"+PX+"',caption:'E手術'}],"
      +"genomicsImages:[{name:'eg.png',dataUrl:'"+PX+"',caption:'E_NGS'}],images:[{name:'er.png',dataUrl:'"+PX+"',caption:'E相關'}]},{})];"
      +"S.meeting.version=1;saveLocal(S.meeting);_dirty=false;");
    w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    const html=String(await run("genHTMLSlides()")||'');
    const chk=[['C_NGS','C_NGS'],['E病理','E病理'],['E手術','E手術'],['E_NGS','E_NGS'],['E相關','E相關']];
    let miss=[];chk.forEach(function(c){if(html.indexOf(c[1])<0)miss.push(c[0]);});
    console.log('  投影片長度',html.length,'| 缺少:',miss.length?'🔴 '+miss.join(','):'✅ 無');
    if(miss.length||!html.length)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));bad++;}

  // ── [V5.72.0] 投影片不得出現重複標籤;前期追蹤標題樣式要在 ──
  console.log('\n=== [V5.72.0] 投影片重複字眼 / .th 樣式 ===');
  try{
    run("var s=S.meeting.sections['head_neck'];"
      +"s.cases=[createItem('head_neck','cases',{chartNo:'9000001',name:'測試一',diagnosis:'dx',discussion:'d',cc:'cc',ph:'ph',"
      +"pathologies:[{date:'2024-01-01',content:'SCC'}],exams:[{name:'CT',date:'2024-01-02',content:'mass'}],treatments:[{name:'手術',date:'2024-02-01',content:'op'}],"
      +"markers:[{name:'SCC',content:'1.2'}],genomics:[{name:'KRAS/NRAS/BRAF',content:'not detected'},{name:'MSI',content:'MSS'}],showGenomics:true},{})];"
      +"s.events=[];s.followups=[createItem('head_neck','followups',{chartNo:'9000002',name:'測試二',summary:'追蹤'},{})];"
      +"S.meeting.version=2;saveLocal(S.meeting);_dirty=false;");
    const html=String(await run("genHTMLSlides()")||'');
    const d2=new JSDOM(html).window.document;
    const dup=[];d2.querySelectorAll('tr').forEach(function(tr){const l=tr.querySelector('.rl'),v=tr.querySelector('.rv');if(!l||!v)return;const lab=l.textContent.trim();if(lab&&v.textContent.indexOf(lab)>=0)dup.push(lab);});
    const thOk=/\.th\{font-size:clamp\(/.test(html)&&html.indexOf('}NaN.')<0;
    console.log('  表格列標籤重複:',dup.length?'🔴 '+dup.join(','):'✅ 無','| .th 樣式:',thOk?'✅':'🔴 遺失(+ + 變 NaN)');
    if(dup.length||!thOk)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));bad++;}

  // ── [V5.72.1 T-1] 醫療小組欄位名:編輯畫面、投影片、閱覽、Word、會後填寫要同一組;必要事件不受影響 ──
  console.log('\n=== [V5.72.1 T-1] 醫療小組欄位名一致 ===');
  try{
    run("var s=S.meeting.sections['head_neck'];"
      +"s.cases=[];s.followups=[];"
      +"s.team=[createItem('head_neck','team',{chartNo:'9000003',name:'測試三',diagnosis:'dx',cc:'CCX',discussion:'DISX',summary:'SUMX',decision:'DECX'},{})];"
      +"s.events=[createItem('head_neck','events',{chartNo:'9000004',name:'測試四',diagnosis:'dx',cc:'EVCC',summary:'EVSUM',decision:'EVDEC'},{})];"
      +"S.meeting.version=3;saveLocal(S.meeting);_dirty=false;");
    const L=JSON.parse(run("JSON.stringify(TEAM_LBL)"));
    const lbls=[L.cc,L.discussion,L.summary,L.decision];
    const html=String(await run("genHTMLSlides()")||'');
    const d3=new JSDOM(html).window.document;
    const lblOf=function(val){let r=null;d3.querySelectorAll('section.slide div').forEach(function(dv){if(dv.textContent.trim()===val&&dv.previousElementSibling)r=dv.previousElementSibling.textContent.trim();});return r;};
    const slideOk=lblOf('CCX')===L.cc&&lblOf('DISX')===L.discussion&&lblOf('SUMX')===L.summary&&lblOf('DECX')===L.decision;
    const evOk=lblOf('EVCC')==='病程經過'&&lblOf('EVSUM')==='摘要'&&lblOf('EVDEC')==='決策';
    const edit=String(run("teamHTML('head_neck',0,S.meeting.sections['head_neck'].team[0],'team')"));
    const view=String(run("teamViewHTML('head_neck',0,S.meeting.sections['head_neck'].team[0],'team')"));
    const editOk=lbls.every(function(x){return edit.indexOf('<label>'+x+'</label>')>=0;});
    const viewOk=lbls.every(function(x){return view.indexOf('>'+x+'<')>=0;});
    /* Word 在 jsdom 產不出 blob,改看原始碼:醫療小組區段四欄都要出、且用同一張表 */
    const src=fs.readFileSync(FILE,'utf8');
    const ds=src.slice(src.indexOf('/* V5.7.0: 醫療小組 DOCX 區段 */'),src.indexOf('/* V5.7.0: 必要事件 DOCX 區段 */'));
    const docxOk=['cc','discussion','summary','decision'].every(function(k){return ds.indexOf('mkBlock(TEAM_LBL.'+k+',t.'+k)>=0;});
    const chk=[['投影片',slideOk],['必要事件不變',evOk],['編輯畫面',editOk],['閱覽模式',viewOk],['Word 四欄',docxOk]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));bad++;}

  // ── [V5.73.0 F-1] 病人資料夾:匯入後自動建、選取時不再改列會議資料夾、產出前檢查按病人合併 ──
  console.log('\n=== [V5.73.0 F-1] 病人資料夾 ===');
  try{
    /* 假的資料夾(File System Access API 在 jsdom 不存在):perm 控制「可修改」權限 */
    run("window.__mkDir=function(name,perm){var ch=new Map();var d={kind:'directory',name:name,perm:perm||'granted',ch:ch,"
      +"getDirectoryHandle:async function(n,o){var x=ch.get(n);if(x&&x.kind==='directory')return x;"
      +"if(o&&o.create){if(d.perm!=='granted'){var e=new Error('denied');e.name='NotAllowedError';throw e;}var s=window.__mkDir(n);ch.set(n,s);return s;}"
      +"var e2=new Error('nf');e2.name='NotFoundError';throw e2;},"
      +"getFileHandle:async function(n){var x=ch.get(n);if(x&&x.kind==='file')return x;var e=new Error('nf');e.name='NotFoundError';throw e;},"
      +"addFile:function(n,size){ch.set(n,{kind:'file',name:n,getFile:async function(){return {name:n,size:size||10};}});},"
      +"values:async function*(){for(var v of ch.values())yield v;},"
      +"queryPermission:async function(o){return o.mode==='read'?'granted':d.perm;},"
      +"requestPermission:async function(o){return d.perm==='prompt'?'denied':d.perm;}};return d;};"
      +"window.__alerts=[];window.alert=function(m){window.__alerts.push(String(m));};");
    const r1=JSON.parse(await run("(async function(){var root=__mkDir('20261015 頭頸癌');root.ch.set('9000001 測○一',__mkDir('9000001 測○一'));"
      +"imgFolderHandle=root;var r=await ensurePatientFolders(['9000001','9000002','9000002',' 9000003 ','A/B'],{ask:true});"
      +"return JSON.stringify({created:r.created,existed:r.existed,bad:r.bad,need:r.need,dirs:[...root.ch.keys()].sort()});})()"));
    const r2=JSON.parse(await run("(async function(){var root=__mkDir('x','prompt');imgFolderHandle=root;"
      +"var r=await ensurePatientFolders(['9000004'],{ask:true});return JSON.stringify({need:r.need,n:root.ch.size,todo:r.todo});})()"));
    const r3=JSON.parse(await run("(async function(){imgFolderHandle=null;var r=await ensurePatientFolders(['9000004'],{});return JSON.stringify({need:r.need});})()"));
    /* 選取:沒有資料夾 → 建好、回 null、有說明;有資料夾 → 回傳它;放進影像後不用重選就能載入(用病歷號定位) */
    const r4=JSON.parse(await run("(async function(){var root=__mkDir('y');imgFolderHandle=root;__alerts=[];"
      +"var a=await _patientDirForPick('9000005');var made=root.ch.has('9000005');"
      +"var b=await _patientDirForPick('9000005');root.ch.get('9000005').addFile('IMG_0001.jpg',10);"
      +"var v=await verifyImgOwnership('IMG_0001.jpg','','9000005',{});"
      +"root.addFile('IMG_0002.jpg',10);var v2=await verifyImgOwnership('IMG_0002.jpg','','9000006',{});"
      +"return JSON.stringify({a:a,made:made,b:b&&b.name,msg:__alerts[0]||'',ok:!!v.file,rootBlocked:!v2.file&&v2.code==='PATIENT_DIR_GONE'});})()"));
    /* 產出前檢查:同一位病人沒資料夾的多張圖合併成一行,並說明怎麼做 */
    const qaMsg=await run("(async function(){var root=__mkDir('z');root.addFile('p1.jpg',10);root.addFile('p2.jpg',10);imgFolderHandle=root;"
      +"var s=S.meeting.sections['head_neck'];s.team=[];s.events=[];s.followups=[];"
      +"s.cases=[createItem('head_neck','cases',{chartNo:'9000007',name:'測試七',diagnosis:'dx',discussion:'d',"
      +"pathologyImages:[{name:'p1.jpg',fromFolder:true,subFolder:''},{name:'p2.jpg',fromFolder:true,subFolder:''}]},{})];"
      +"S.meeting.version=4;saveLocal(S.meeting);_dirty=false;var got='';var oc=window.confirm;window.confirm=function(m){got=String(m);return false;};"
      +"try{await genHTMLSlides();}catch(e){}window.confirm=oc;return got;})()");
    /* V5.75.0 F-1b:沒權限 / 病歷號不能當資料夾名 —— 訊息要對症,不能叫她去新增資料夾 */
    const r5=JSON.parse(await run("(async function(){__alerts=[];imgFolderHandle=__mkDir('w','prompt');await _patientDirForPick('9000010');"
      +"imgFolderHandle=__mkDir('w2');await _patientDirForPick('A/B');return JSON.stringify(__alerts);})()"));
    const f1b=/沒有取得修改/.test(r5[0]||'')&&/不能當資料夾名稱/.test(r5[1]||'');
    /* F-1a:換會議要收掉上一場的提示列 */
    const src0=fs.readFileSync(FILE,'utf8');const lm=src0.slice(src0.indexOf('async function _loadMtg('),src0.indexOf('async function _loadMtg(')+600);
    const f1a=lm.indexOf("pf-bar")>=0;
    /* 原始碼:三個選取入口都改走 _patientDirForPick;三個匯入都會觸發建資料夾 */
    const src=fs.readFileSync(FILE,'utf8');
    const pick3=(src.match(/_patientDirForPick\((c|p)\.chartNo\)/g)||[]).length===4&&src.indexOf('_sub?_sub.handle:imgFolderHandle')<0;
    const fnBody=function(name){const i=src.indexOf('function '+name+'(');return i<0?'':src.slice(i,src.indexOf('\nfunction ',i+10));};
    const imp3=['doImportCase','importXLSX','importCaseJSON'].every(function(n){return fnBody(n).indexOf('_afterImportFolders')>=0;});
    const chk=[
      ['匯入建資料夾',JSON.stringify(r1.created)==='["9000002","9000003"]'&&r1.existed.length===1&&r1.bad[0]==='A/B'&&r1.need===null],
      ['已有姓名資料夾不重建',r1.dirs.length===3],
      ['沒授權不建、等按鈕',r2.need==='perm'&&r2.n===0&&r2.todo[0]==='9000004'],
      ['沒指定資料夾',r3.need==='folder'],
      ['選取:建好並說明',r4.a===null&&r4.made&&/已經幫您建好/.test(r4.msg)],
      ['選取:有資料夾就用',r4.b==='9000005'],
      ['放進去不用重選',r4.ok],
      ['嚴格模式仍在',r4.rootBlocked],
      ['檢查合併成一行',/1 位病人沒有自己的影像資料夾,共 2 張/.test(qaMsg)&&/病歷號 9000007\(2 張\)/.test(qaMsg)&&/不用重新選取/.test(qaMsg)],
      ['四個選取入口',pick3],['三個匯入入口',imp3],['F-1b 訊息對症',f1b],['F-1a 換會議收提示列',f1a]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',JSON.stringify({r1,r2,r3,r4}).slice(0,400),'\n    QA:',String(qaMsg).slice(0,300));}
    run("imgFolderHandle=null;");
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,140));bad++;}

  // ── [V5.74.0/V5.75.0] 投影片標記 —— V5.75.0 依審核 T-1 改成「使用者走得到的操作」,並補重新產出的檔、縮放、換頁、SVG、圖片 ──
  console.log('\n=== [V5.75.0] 投影片標記 ===');
  try{
    const PNG='data:image/png;base64,'+'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='.repeat(1);
    const mkMeeting=function(list){
      run("var s=S.meeting.sections['head_neck'];s.team=[];s.events=[];s.followups=[];"
        +"s.special=[createItem('head_neck','special',{title:'影像討論',topicType:'影像討論',images:[{name:'a.png',caption:'影像一',dataUrl:'"+PNG+"'}]},{})];"
        +"s.cases="+JSON.stringify(list)+".map(function(d){return createItem('head_neck','cases',d,{});});"
        +"imgFolderHandle=null;S.meeting.version++;saveLocal(S.meeting);_dirty=false;");
      return run("genHTMLSlides()");
    };
    const c8={chartNo:'9000008',name:'測試八',diagnosis:'第一位診斷文字',discussion:'第一位討論',cc:'cc'};
    const c9={chartNo:'9000009',name:'測試九',diagnosis:'第二位診斷文字',discussion:'第二位討論',cc:'cc'};
    const c7={chartNo:'9000007',name:'測試七',diagnosis:'新加的病人',discussion:'新討論',cc:'cc'};
    const html=String(await mkMeeting([c8,c9])||'');
    const htmlB=String(await mkMeeting([c7,c8,c9])||'');/* 同一場會議重新產出:前面多一位(審核 H-1) */
    let confirms=0;
    const mk=function(src){const d=new JSDOM(src,{runScripts:'dangerously',url:'https://share.example/x/20261015_HN.html'});
      d.window.alert=function(){d.window.__alerts=(d.window.__alerts||0)+1;};d.window.confirm=function(){confirms++;return true;};return d;};
    const v=mk(html),W=v.window,D=W.document,ev=c=>W.eval(c);
    await new Promise(r=>setTimeout(r,50));
    ev("function __sel(word){var s=document.querySelectorAll('.slide');for(var i=0;i<s.length;i++){var w=document.createTreeWalker(s[i],NodeFilter.SHOW_TEXT);var t;while((t=w.nextNode())){var k=t.data.indexOf(word);if(k>=0){var r=document.createRange();r.setStart(t,k);r.setEnd(t,k+word.length);_hlSel=r;document.getElementById('hl-toolbar').style.display='flex';return i;}}}return -1;}");
    const st=()=>{const b=D.getElementById('nb-save');return {show:b.style.display!=='none',dirty:b.classList.contains('dirty'),txt:b.textContent,marks:D.querySelectorAll('.slide mark, .slide span.fc').length};};
    const s0=st();
    const i1=ev("__sel('第一位診斷')"),i2=ev("__sel('第二位診斷')");
    ev("go("+i1+");__sel('第一位診斷');hlApply('#FFE066');__sel('第一位討論');fcApply('#D32F2F');");
    const s1=st();
    ev("hlUndo()");const s2=st();
    ev("__sel('第一位討論');fcApply('#D32F2F');");
    const fc=D.querySelector('.slide span.fc');fc.dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
    const rmShown=D.getElementById('hl-rm').style.display==='flex';/* V5.80.0:hl-rm 由單顆按鈕改成「移除 + 註記」兩顆的列,顯示時用 flex */
    ev("hlRemoveOne()");const s3=st();
    D.dispatchEvent(new W.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));
    const s4=st();
    /* H-2:實際做法 —— 選一段「沒有標記」的字按清除 → 問要不要清整頁 → 只清這一頁 */
    ev("go("+i2+");__sel('第二位診斷');hlApply('#7FE87F');go("+i1+");");
    /* V5.77.0:「清除標記」只清選到的(選到沒標記的字 → 什麼都不清);「整頁標記清除」才清整頁 */
    const before0=st().marks;ev("__sel('cc');hlClear();");const clearNoop=st().marks===before0;
    confirms=0;ev("hlClearPage();");
    const page2Left=D.querySelectorAll('.slide')[i2].querySelectorAll('mark').length;
    const page1Left=D.querySelectorAll('.slide')[i1].querySelectorAll('mark, span.fc').length;
    const clearAsked=confirms===1;
    ev("hlUndo()");/* 把第一頁的標記拿回來,後面要用 */
    /* H-7:工具列開著時換頁 → 收掉 */
    ev("__sel('第一位討論');go("+i2+");");
    const goHides=D.getElementById('hl-toolbar').style.display==='none'&&ev("_hlSel===null");
    ev("go("+i1+");");
    /* H-9:SVG 上不能畫 */
    ev("(function(){var s=document.querySelectorAll('.slide')["+i1+"];var g=document.createElementNS('http://www.w3.org/2000/svg','svg');var t=document.createElementNS('http://www.w3.org/2000/svg','text');t.textContent='SVG字';g.appendChild(t);s.appendChild(g);})()");
    const mBefore=st().marks;ev("__sel('SVG字');hlApply('#FFE066');");
    const svgBlocked=st().marks===mBefore&&D.querySelector('svg mark')===null;
    ev("(function(){var g=document.querySelectorAll('.slide')["+i1+"].querySelector('svg');g.remove();})()");
    /* H-8:圖片頁畫標記,存的內容不含圖片本體 */
    ev("__sel('影像一');hlApply('#FFE066');");
    const collected=ev("JSON.stringify(_hlCollect())");
    const noImgData=collected.indexOf('data:image')<0;
    /* V5.75.1 N-1:寫進 V5.75.0 以前產出的檔(沒有補圖程式)→ 要存含圖片的完整內容 */
    W.__oldSrc=html.split('function _hlSetHTML').join('function oldNoRefill');
    const oldOut=ev("_hlInject(__oldSrc,_hlCollect()).src");
    const oldHasImg=/hl-data"[^>]*>[^<]*data:image/.test(oldOut);

    /* 線上存:下載 → 顯示「已下載」而不是「已存」(H-5);含 </script> 的標記不會弄壞檔案 */
    /* 標記屬性裡含 </script>(序列化時不會被跳脫),不改頁面文字 —— 原本插入新文字,會被 H-1 的文字對位正確地擋掉 */
    ev("(function(){var m=document.querySelectorAll('.slide')["+i2+"].querySelector('mark');m.setAttribute('title','x</'+'script>y');})()");
    W.fetch=async()=>({ok:true,status:200,text:async()=>html});
    ev("_hlDownload=function(src,f){window.__dl=src;}");
    await ev("hlExport()");const dl=W.__dl;
    const s5=st();
    const unloadBlocked=()=>{const e=new W.Event('beforeunload',{cancelable:true});W.dispatchEvent(e);return e.defaultPrevented;};
    const ub1=unloadBlocked();
    /* H-3:放大圖片(留下 transition)不算「沒存」 */
    D.querySelectorAll('.slide img').forEach(im=>{im.style.transition='transform .15s';im.style.transform='scale(2)';});
    const zoomNotDirty=!unloadBlocked()&&!st().dirty;
    /* 下載的檔重開:標記還在、圖片還在、語法沒壞 */
    const v2=mk(dl||'');await new Promise(r=>setTimeout(r,50));const D2=v2.window.document;
    const reMarks=D2.querySelectorAll('.slide mark').length;
    const imgBack=Array.from(D2.querySelectorAll('.slide img')).every(im=>/^data:/.test(im.getAttribute('src')||''));
    const reOk=reMarks===D.querySelectorAll('.slide mark').length&&reMarks>=3&&imgBack&&D2.querySelectorAll('.slide').length===D.querySelectorAll('.slide').length;
    /* 本機:標題不同 → 不寫;H-1 重新產出的 B → 對位寫入,病人一位不少 */
    let written=null;
    W.showOpenFilePicker=async()=>[{getFile:async()=>({name:'x.html',text:async()=>W.__pickSrc}),createWritable:async()=>({write:async(x)=>{written=x;},close:async()=>{}})}];
    ev("__sel('第一位討論');fcApply('#1976D2');");
    W.__pickSrc=html.replace(/<title>[^<]*<\/title>/,'<title>別場會議</title>');
    await ev("_hlPickLocal(_hlCollect(),1,_hlSig())");const wrongNotWritten=written===null;
    W.__pickSrc=htmlB;await ev("_hlPickLocal(_hlCollect(),1,_hlSig())");
    const v3=mk(written||'');await new Promise(r=>setTimeout(r,50));const D3=v3.window.document;
    const cnos=d=>Array.from(d.querySelectorAll('.slide.case')).map(s=>(s.textContent.match(/900000\d/)||[''])[0]);
    const bCnos=cnos(new JSDOM(htmlB).window.document),wCnos=cnos(D3);
    const p8=Array.from(D3.querySelectorAll('.slide.case')).find(s=>s.textContent.indexOf('9000008')>=0);
    const h1ok=JSON.stringify(wCnos)===JSON.stringify(bCnos)&&bCnos.length===3&&!!p8&&p8.querySelectorAll('mark, span.fc').length>0
      &&D3.body.textContent.indexOf('新加的病人')>=0&&st().txt.indexOf('已存')>=0;
    const tb=D.getElementById('hl-toolbar').textContent;
    const chk=[
      ['沒標記時不顯示',!s0.show],['畫了顯示存標記',s1.show&&s1.dirty&&/存標記 1 頁/.test(s1.txt)],
      ['復原',s2.marks===1],['點標記出現移除',rmShown],['移除單一標記',s3.marks===1],['Ctrl+Z',s4.marks===2],
      ['清除標記不動沒選到的、整頁清除只清本頁',clearNoop&&clearAsked&&page1Left===0&&page2Left===1],
      ['換頁收工具列',goHides],['SVG 不能畫',svgBlocked],['存的內容不含圖片',noImgData],['N-1 寫進舊版檔保留圖片',oldHasImg],
      ['下載顯示已下載',s5.show&&!s5.dirty&&/已下載/.test(s5.txt)],['存了不擋關頁',!ub1],['放大圖片不算沒存',zoomNotDirty],
      ['重開標記與圖片都在',reOk],['選錯檔不寫',wrongNotWritten],['重新產出的檔對位寫入、病人不少',h1ok],
      ['工具列分組標字',/螢光/.test(tb)&&/字色/.test(tb)&&/復原上一步/.test(tb)&&/清除標記/.test(tb)&&/整頁標記清除/.test(tb)&&!/匯出/.test(tb)]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',JSON.stringify({s0,s1,s2,s3,s4,s5,page1Left,page2Left,clearAsked,goHides,svgBlocked,noImgData,ub1,zoomNotDirty,reMarks,imgBack,bCnos,wCnos}).slice(0,600));}
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,160));bad++;}

  // ── [V5.75.1 N-3] 前期追蹤:續追帶入不把上次結果當這次結果;四種產出都印三段 ──
  console.log('\n=== [V5.75.1 N-3] 前期追蹤三段 ===');
  try{
    const r=JSON.parse(run("(function(){var keep=S.meeting;"
      +"var p=newMeetingObj(S.user.id,['head_neck']);p.date='2001-01-02';if(!p.sections.head_neck)p.sections.head_neck={followups:[],cases:[],team:[],events:[],special:[]};"
      +"var f=createFollowup({chartNo:'9000201',name:'測試壬',note:'上次的結果',prevDecision:'原因甲',followFocus:'重點乙'});f.status='ongoing';"
      +"p.sections.head_neck.followups=[f];saveLocal(p);"
      +"S.meeting=newMeetingObj(S.user.id,['head_neck']);S.meeting.date='2001-01-03';S.meeting.sections.head_neck={followups:[],cases:[],team:[],events:[],special:[]};"
      +"autoImportPrevFollowups(['head_neck']);var g=S.meeting.sections.head_neck.followups.filter(function(x){return x.chartNo==='9000201';})[0];"
      +"S.meeting=keep;return JSON.stringify(g||null);})()".replace('ensureSecOf(p);','if(!p.sections.head_neck)p.sections.head_neck={followups:[],cases:[],team:[],events:[],special:[]};')));
    const src=fs.readFileSync(FILE,'utf8');
    const fn=function(name){const i=src.indexOf('function '+name+'(');return i<0?'':src.slice(i,src.indexOf('\nfunction ',i+10)>0?src.indexOf('\nfunction ',i+10):i+20000);};
    const outs=['genPPTX','genDOCX','genHTMLSlides'].every(function(n){return fn(n).indexOf('FUP_KEYS')>=0;})&&src.indexOf("'追蹤說明'")<0&&src.indexOf('<th>追蹤說明</th>')<0;
    /* V5.75.2 P-2:連續三場續追 —— 只留原始決議 + 最近一次結果(標日期),不逐場累積 */
    let r3=JSON.parse(run("(function(){var keep=S.meeting;var mk=function(d){var m=newMeetingObj(S.user.id,['head_neck']);m.date=d;m.sections.head_neck={followups:[],cases:[],team:[],events:[],special:[]};return m;};"
      +"var m1=mk('2001-02-01');var f=createFollowup({chartNo:'9000202',name:'測試癸',note:'第一次結果',prevDecision:'原因丙'});f.status='ongoing';f._fromEvent=true;m1.sections.head_neck.followups=[f];saveLocal(m1);"
      +"S.meeting=mk('2001-02-02');autoImportPrevFollowups(['head_neck']);var g=S.meeting.sections.head_neck.followups.filter(function(x){return x.chartNo==='9000202';})[0];g.note='第二次結果\\n第二行';g.status='ongoing';saveLocal(S.meeting);"
      +"S.meeting=mk('2001-02-03');autoImportPrevFollowups(['head_neck']);var h=S.meeting.sections.head_neck.followups.filter(function(x){return x.chartNo==='9000202';})[0];"
      +"h.note='';h.status='ongoing';saveLocal(S.meeting);S.meeting=mk('2001-02-04');autoImportPrevFollowups(['head_neck']);"
      +"var q=S.meeting.sections.head_neck.followups.filter(function(x){return x.chartNo==='9000202';})[0];"
      +"S.meeting=keep;return JSON.stringify({h:h,q:q});})()"));
    /* V5.76.0 Q-3:第三場沒填結果 → 第四場沿用第二場的結果 */
    const q3=r3&&r3.q&&r3.q.prevDecision==='原因丙\n上次結果(2001-02-02)：第二次結果 / 第二行';
    r3=r3&&r3.h;
    const p2=r3&&r3.prevDecision==='原因丙\n上次結果(2001-02-02)：第二次結果 / 第二行'&&r3._fromEvent===true;
    const css=src.indexOf(".tbl{overflow-y:auto")>=0&&src.indexOf('.tbl thead th{position:sticky')>=0;
    const chk=[['P-2 只留原始決議+最近一次(標日期)、帶 _fromEvent',p2],['Q-3 沒填結果沿用上一次',q3],['P-1 表格頁可捲、表頭固定',css],
      ['有帶入',!!r],['目前結果留空',r&&r.note===''],['上次決議含原因與上次結果',r&&/原因甲/.test(r.prevDecision)&&/上次結果\(2001-01-02\)：上次的結果/.test(r.prevDecision)],
      ['追蹤重點延續',r&&r.followFocus==='重點乙'],['走 createFollowup',r&&'prevDecision' in r&&'followFocus' in r&&r._autoImported===true],
      ['產出不再寫「追蹤說明」、改用 FUP_KEYS',outs]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',JSON.stringify(r),JSON.stringify(r3));}
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,160));bad++;}

  // ── [V5.79.0 審核 UI-1~UI-4、UI-7] 前期追蹤會後填寫與編輯畫面 ──
  console.log('\n=== [V5.79.0 UI] 前期追蹤決議帶入、未選提醒、閱覽、收合、特殊議程類型 ===');
  try{
    const r=JSON.parse(await run("(async function(){var keep=S.meeting,out={};var mk=function(d){var m=newMeetingObj(S.user.id,['head_neck']);m.date=d;m.sections.head_neck={followups:[],cases:[],team:[],events:[],special:[]};return m;};"
      /* UI-1:會後填的決策結論 → 下一場的上次決議(取代原始決議;必要提報保留【必要提報】那一行) */
      +"var m1=mk('2001-03-01');var a=createFollowup({chartNo:'9000301',name:'測試甲',prevDecision:'原始決議甲',note:'結果甲'});a.status='ongoing';a.decision='最新決議甲';"
      +"var b=createFollowup({chartNo:'9000302',name:'測試乙',prevDecision:'【必要提報】已討論待改善　需改善\\n改善方案：流程乙'});b.status='ongoing';b._fromEvent=true;b.decision='最新決議乙';"
      +"var c=createFollowup({chartNo:'9000303',name:'測試丙',prevDecision:'原始決議丙'});c.status='ongoing';"
      +"m1.sections.head_neck.followups=[a,b,c];saveLocal(m1);S.meeting=mk('2001-03-02');autoImportPrevFollowups(['head_neck']);"
      +"var g=function(n){return S.meeting.sections.head_neck.followups.filter(function(x){return x.chartNo===n;})[0]||{};};"
      +"out.a=g('9000301').prevDecision;out.b=g('9000302').prevDecision;out.c=g('9000303').prevDecision;out.schema=('decision' in createFollowup({}))&&('summary' in createFollowup({}));"
      /* UI-3:閱覽卡片 */
      +"var v=followupViewHTML('head_neck',0,{chartNo:'9000301',prevDecision:'上次甲',followFocus:'重點甲',note:'結果甲',decision:'決策甲'},'followups');"
      +"out.view=['上次決議','本次追蹤重點','目前結果','決策結論','上次甲','重點甲','決策甲'].every(function(x){return v.indexOf(x)>=0;})&&v.indexOf('>說明<')<0;"
      /* UI-4:自動帶入的預設收合,收合列有上次決議 */
      +"var e=followupEditHTML('head_neck',0,S.meeting.sections.head_neck.followups[0]);out.col=/cc-collapsed/.test(e)&&/casetop2/.test(e)&&e.indexOf('最新決議甲')>=0&&/fup-note/.test(e);"
      +"out.colManual=!/cc-collapsed/.test(followupEditHTML('head_neck',0,createFollowup({chartNo:'9000304'})));"
      /* UI-2:會後面板 —— 沒選時兩顆都不亮、有提示;「儲存並返回」提醒,中途「儲存」不提醒 */
      +"var _ku0=S.user;S.user=USERS.find(function(u){return u.cancers.indexOf('head_neck')>=0;});/* V5.79.1 V-2:提醒只對負責人 */S.meeting.version=1;S.meeting.sections.head_neck.followups.forEach(function(f){delete f.status;});saveLocal(S.meeting);_dirty=false;S.cids=['head_neck'];"
      +"openPostMtgPanel();var pn=document.getElementById('postmtg-panel');var on=pn.querySelector('[data-action=\"postfup-ongoing\"]'),cl=pn.querySelector('[data-action=\"postfup-closed\"]');"
      +"out.tri=!!on&&!/btn-a/.test(on.className)&&!/btn-a/.test(cl.className)&&!!pn.querySelector('.pf-unset');"
      +"var asked='',oc=window.confirm;window.confirm=function(m){asked=String(m);return false;};await savePostMtg();out.ask=/沒有選/.test(asked)&&/9000301/.test(asked);"
      +"asked='';await savePostMtg(true);out.noAskStay=asked==='';window.confirm=oc;"
      +"pn=document.getElementById('postmtg-panel');on=pn.querySelector('[data-action=\"postfup-ongoing\"]');on.click();var _cd=on.closest('.pf-card');out.clicked=S.meeting.sections.head_neck.followups[0].status==='ongoing'&&/btn-a/.test(on.className)&&_cd&&!_cd.querySelector('.pf-unset');"
      +"var cp=document.getElementById('postmtg-panel');if(cp&&cp.parentNode)cp.style.display='none';S.user=_ku0;"
      /* UI-7:選了類型收成一行,沒選列 8 顆 */
      +"var sp0=specialHTML('head_neck',0,{topicType:'',title:'x'}),sp1=specialHTML('head_neck',0,{topicType:'其他',title:'x'});"
      +"var sp2=specialHTML('head_neck',0,createItem('head_neck','special',{topicType:'失聯率'},{}));"
      +"out.sp=(sp0.match(/data-action=\"specialtype\"/g)||[]).length===8&&sp0.indexOf('<details')<0&&sp1.indexOf('<details')>=0&&/更改/.test(sp1)&&sp2.indexOf('<details')>=0;"
      /* V-2:合開只提醒自己負責的癌別 */
      +"var ku=S.user;S.user=USERS.find(function(u){return u.cancers.indexOf('head_neck')>=0&&u.cancers.indexOf('lymphoma')<0;});S.cids=['head_neck','lymphoma'];ensureSec('lymphoma');"
      +"S.meeting.sections.lymphoma.followups=[createFollowup({chartNo:'9000399',name:'測試夥'})];var un=_postFupUnset();out.v2=un.join().indexOf('9000399')<0&&un.length>0;S.user=ku;S.cids=['head_neck'];"
      +"S.meeting=keep;return JSON.stringify(out);})()"));
    const chk=[['V-2 合開只提醒自己負責的癌別',r.v2],['UI-1 決策結論取代原始決議',r.a==='最新決議甲\n上次結果(2001-03-01)：結果甲'],['UI-1 必要提報保留【必要提報】行',r.b==='【必要提報】已討論待改善　需改善\n最新決議乙'],
      ['UI-1 沒填決策照舊',r.c==='原始決議丙'],['UI-1 createFollowup 有 summary/decision',r.schema],['UI-3 閱覽用 FUP_LBL 且含決策結論',r.view],
      ['UI-4 自動帶入預設收合、收合列有上次決議',r.col],['UI-4 手動新增不收合',r.colManual],['UI-2 沒選時兩顆都不亮且有提示',r.tri],
      ['UI-2 儲存並返回會提醒',r.ask],['UI-2 中途儲存不提醒',r.noAskStay],['UI-2 點選後亮起並拿掉提示',r.clicked],['UI-7 類型收合',r.sp]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',JSON.stringify(r).slice(0,500));}
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,200));bad++;}

  // ── [V5.82.0] AI 回傳的 JSON:複製鈕帶出的 Markdown 跳脫、圍欄、說明文字 → 自動修好且內容一字不差 ──
  console.log('\n=== [V5.82.0] AI JSON 解析修復 ===');
  try{
    /* 原始內容故意塞滿 Markdown 符號、原文本身的反斜線、彎引號(全部虛構) */
    const orig=[{chartNo:'9000801',name:'測試甲',diagnosis:'# 標題? a|b > c *重點* _x_ -> stage IB (半形) (全形)',
      cc:'第一行\n第二行 C:\\temp\\rt 與 \\# 字面反斜線',ph:'他說 “Not mentioned.”',topics:['影像討論']}];
    const good=JSON.stringify(orig,null,2);
    /* 模擬 ChatGPT 訊息「複製」鈕:符號前加反斜線(含字串外的 [ ]),外加說明文字與圍欄 */
    const mdesc=t=>{let o='';for(let i=0;i<t.length;i++){const c=t[i];if(c==='\\'){o+=t.slice(i,i+2);i++;continue;}o+=('#|>*_-()[]`'.indexOf(c)>=0?'\\':'')+c;}return o;};
    const cases={
      clean:good,
      copyBtn:'以下是 JSON:\n\n```json\n'+mdesc(good)+'\n```\n\n需要調整再告訴我。',
      comma:good.replace(/"topics": \[\n\s*"影像討論"\n\s*\]/,'"topics": ["影像討論",]'),
      curlyDelim:'[{“chartNo”:“9000802”}]',
      doubled:JSON.stringify([{cc:'第一行\n第二行'}]).replace(/\\/g,'\\\\'),
      broken:'```json\n[{"chartNo":"9000803" "name":"\\#測試"}]\n```'
    };
    const r=JSON.parse(run("(function(C){var o={};Object.keys(C).forEach(function(k){try{var x=_parseAIJSONx(C[k]);o[k]={data:x.data,fixes:x.fixes,warns:x.warns};}catch(e){o[k]={err:e.message};}});"
      +"var pc=document.getElementById('out-text');genImportPrompt();o.pCase=pc.textContent;genImportPrompt('team');o.pTeam=pc.textContent;genImportPrompt('events');o.pEv=pc.textContent;"
      +"var sc=S.meeting.sections.head_neck;sc.cases[0].timeline=[{id:'t1',type:'dx',date:'2026-01-01',label:'診斷'}];o.pTl=tlAiPrompt('head_neck',0,'cases');"
      +"o.legacy=JSON.stringify(_parseAIJSON(C.copyBtn));return JSON.stringify(o);})("+JSON.stringify(cases)+")"));
    const eq=x=>JSON.stringify(x)===JSON.stringify(orig);
    const rules=t=>/```json 程式碼區塊/.test(t||'')&&!/不要加 markdown 圍籬/.test(t||'')&&/不要為了 Markdown 在符號前加反斜線/.test(t||'');
    const chk=[['原本就合法:不修、內容相同',eq(r.clean.data)&&!r.clean.fixes.length],
      ['複製鈕(跳脫+圍欄+說明文字)修好且一字不差',eq(r.copyBtn.data)&&r.copyBtn.fixes.length===3&&/\\#×/.test(r.copyBtn.fixes.join())],
      ['原文的反斜線、換行、彎引號保留',eq(r.copyBtn.data)&&r.copyBtn.data[0].cc.indexOf('C:\\temp\\rt 與 \\# 字面')>=0&&/“Not mentioned.”/.test(r.copyBtn.data[0].ph)],
      ['多餘逗號',eq(r.comma.data)&&/逗號/.test(r.comma.fixes.join())],
      ['彎引號當 JSON 引號(最後手段)',r.curlyDelim.data&&r.curlyDelim.data[0].chartNo==='9000802'],
      ['反斜線被加倍:可解析但要警告',r.doubled.warns&&r.doubled.warns.length===1],
      ['真的壞掉:說第幾行並提示改按程式碼區塊的複製',/第 \d+ 行/.test(r.broken.err||'')&&/程式碼區塊右上角/.test(r.broken.err||'')],
      ['舊入口 _parseAIJSON 走同一支',r.legacy===JSON.stringify(orig)],
      ['四段提示詞改要求 ```json 程式碼區塊',rules(r.pCase)&&rules(r.pTeam)&&rules(r.pEv)&&rules(r.pTl)&&/原樣照抄/.test(r.pTl)]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',JSON.stringify({copyBtn:r.copyBtn,comma:r.comma,doubled:r.doubled,broken:r.broken}).slice(0,700));}
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,200));bad++;}

  // ── [V5.80.1] 會議小抄:個案、醫療小組、必要事件各一段,重點依頁面種類對到人 ──
  console.log('\n=== [V5.80.1] 會議小抄含醫療小組與必要事件 ===');
  try{
    const r=JSON.parse(run("(function(){var keep=S.meeting,kc=S.cids;S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);S.meeting.date='2001-04-01';"
      +"S.meeting.sections.head_neck={cases:[createItem('head_neck','cases',{chartNo:'9000601',name:'測試甲'},{})],team:[createItem('head_neck','team',{chartNo:'9000602',name:'測試乙'},{})],"
      +"events:[createItem('head_neck','events',{chartNo:'9000603',name:'測試丙'},{})],followups:[],special:[],"
      +"hlMarks:{v:2,marks:[{k:'slide|9000601#1',q:'個案重點',s:'background: rgb(255, 224, 102); color: inherit;',n:'個案註記'},"
      +"{k:'slide|9000602T#1',q:'小組重點',s:'color: rgb(211, 47, 47); font-weight: 600;',n:'小組註記'},{k:'slide|9000603E#1',q:'事件重點',s:''}]}};"
      +"var got='',ow=window.open,oa=window.alert;window.open=function(){return {document:{open:function(){},write:function(h){got+=h;},close:function(){}}};};"
      +"try{genPrintSheet();}finally{window.open=ow;}"
      +"var only=createItem('head_neck','team',{chartNo:'9000604',name:'測試丁'},{});S.meeting.sections.head_neck={cases:[],team:[only],events:[],followups:[],special:[]};var got2='',al='';window.alert=function(m){al=m;};"
      +"window.open=function(){return {document:{open:function(){},write:function(h){got2+=h;},close:function(){}}};};try{genPrintSheet();}finally{window.open=ow;window.alert=oa;}"
      +"S.meeting=keep;S.cids=kc;return JSON.stringify({got:got,got2:got2,al:al});})()"));
    const g=r.got,pos=function(x){return g.indexOf(x);};
    const chk=[['三段都有標題',/class="sec">個案討論/.test(g)&&/class="sec">醫療小組/.test(g)&&/class="sec">必要事件/.test(g)],
      ['順序:個案→小組→事件',pos('9000601')<pos('9000602')&&pos('9000602')<pos('9000603')],
      ['小組重點與註記在小組那位病人下',pos('小組重點')>pos('9000602')&&pos('小組重點')<pos('9000603')&&/小組註記/.test(g)],
      ['個案重點不跑到小組',pos('個案重點')>pos('9000601')&&pos('個案重點')<pos('9000602')],
      ['事件重點在事件病人下',pos('事件重點')>pos('9000603')],
      ['醫療小組手寫欄用填寫畫面名稱',g.indexOf('最新情況')>0&&g.indexOf('治療決策')>0],
      ['頁首列出三類人數',/個案討論 1 · 醫療小組 1 · 必要事件 1/.test(g)],
      ['只有醫療小組也能產出',/9000604/.test(r.got2)&&!r.al]];
    const fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length){bad++;console.log('   ',r.al,g.slice(g.indexOf('<div class="sec"'),g.indexOf('<div class="sec"')+300));}
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,200));bad++;}

  // ── [V5.76.0 Q-2] 沒有影像的特殊議程:產出前檢查要提醒 ──
  console.log('\n=== [V5.76.0 Q-2] 純文字特殊議程提醒 ===');
  try{
    const msg=await run("(async function(){var s=S.meeting.sections['head_neck'];s.cases=[];s.team=[];s.events=[];s.followups=[];"
      +"s.special=[createItem('head_neck','special',{title:'純文字議程甲',topicType:'其他',note:'說明'},{})];"
      +"imgFolderHandle=null;S.meeting.version++;saveLocal(S.meeting);_dirty=false;var got='';var oc=window.confirm;window.confirm=function(m){got=String(m);return false;};"
      +"try{await genHTMLSlides();}catch(e){}window.confirm=oc;return got;})()");
    const ok=/沒有影像,不會出現在投影片上/.test(msg)&&/純文字議程甲/.test(msg);
    console.log('  '+(ok?'1/1 ✅':'0/1 🔴 產出前檢查沒有提醒'));
    if(!ok)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,140));bad++;}

  // ── [V5.56.0] tlLayout 純函式(審核第八節 #7/#8/#11/#12/#13/#14)──
  console.log('\n=== [Hybrid TL] tlLayout 純函式 ===');
  try{
    const r=JSON.parse(run("(function(){"
      +"var ev=[{type:'dx',date:'2023-01-10'},{type:'chemo',date:'2023-04-01',endDate:'2023-08-15',label:'FOLFOX'},{type:'ned',date:'2023-09-01'},"
      +"{type:'follow',date:'2024-09-01'},{type:'recurrence',date:'2026-06-20',_ai:{pivot:true,sig:'recurrence|2026-06-20'}},{type:'other',date:null}];"
      +"var m=tlLayout(ev,{view:'summary',width:700,discussion:'q'});var f=tlLayout(ev,{view:'full',width:700});"
      +"var xs=m.nodes.map(function(n){return n.x;});var mono=xs.every(function(x,i){return i===0||x>=xs[i-1];});"
      +"var noDz=tlLayout([{type:'imaging',date:'2024-01-01'}],{});"
      +"return JSON.stringify({mono:mono,spineOk:m.spine&&m.spine.x0<m.spine.x1,undated:m.undated.length,bars:m.bars.length,gaps:m.gaps.length,"
      +"pivots:m.pivots.length,summaryLess:m.nodes.length<f.nodes.length,noSpine:noDz.spine===null,"
      +"svg:tlRender(m,'compact','#000').length>100});})()"));
    const chk=[['x 單調',r.mono],['spine x0<x1',r.spineOk],['未定日期 1',r.undated===1],['bar 1',r.bars===1],['gap ≥1',r.gaps>=1],['pivot 1',r.pivots===1],['summary<full',r.summaryLess],['無疾病不畫 spine',r.noSpine],['svg 產出',r.svg]];
    /* V5.58.0 N-1/N-3/N-6:典型案例(診斷→手術→化療×2→放療→免疫→CT→復發)Summary 要有 4 個治療、hidden=1;診斷→手術→5年復發要有 gap;bar 不重畫節點 */
    const r2=JSON.parse(run("(function(){"
      +"var ev=[{type:'dx',date:'2024-01-05'},{type:'surgery',date:'2024-02-01'},{type:'chemo',date:'2024-03-01'},{type:'chemo',date:'2024-03-22'},{type:'rt',date:'2024-05-01'},{type:'systemic',date:'2024-07-01'},{type:'imaging',date:'2024-09-01'},{type:'recurrence',date:'2025-06-01'}];"
      +"var m=tlLayout(ev,{view:'summary',width:1200});"
      +"var m3=tlLayout([{type:'dx',date:'2019-01-01'},{type:'surgery',date:'2019-02-01'},{type:'recurrence',date:'2024-06-01'}],{view:'summary',width:1200});"
      +"var m6=tlLayout([{type:'dx',date:'2024-01-01'},{type:'chemo',date:'2024-02-01',endDate:'2024-06-01'}],{view:'summary'});"
      +"return JSON.stringify({tx:m.nodes.filter(function(n){return n.layer==='treatment';}).length,hidden:m.hidden,gaps3:m3.gaps.length,barNodes:m6.nodes.filter(function(n){return n.layer==='treatment';}).length,bars6:m6.bars.length});})()"));
    chk.push(['N-1 療程顯示',r2.tx>=4&&r2.hidden===1],['N-3 空窗啟動',r2.gaps3===1],['N-6 bar 不重畫',r2.barNodes===0&&r2.bars6===1]);
    let fail=chk.filter(c=>!c[1]).map(c=>c[0]);
    console.log('  '+(chk.length-fail.length)+'/'+chk.length,fail.length?'🔴 '+fail.join(','):'✅');
    if(fail.length)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,100));bad++;}

  // ── [V5.69.0] 雙機 NAS 模擬(審核附錄 A)—— 單機永遠測不到 S-1/M-1/M-3 這一類 ──
  console.log('\n=== [雙機 NAS] S-1 / M-1 / M-2 / M-3 ===');
  try{
    const NAS=new Map();let nasDown=false;
    const mkDir=()=>({name:'sync',kind:'directory',async getDirectoryHandle(){return this;},
      async getFileHandle(n,o){if(!NAS.has(n)&&!(o&&o.create)){const e=new Error('nf');e.name='NotFoundError';throw e;}
        return{kind:'file',name:n,async getFile(){return{async text(){return NAS.get(n)||'';}};},async createWritable(){if(nasDown)throw new Error('NAS down');let b='';return{async write(s){b+=s;},async close(){NAS.set(n,b);}};}};},
      async *values(){for(const n of [...NAS.keys()])yield await this.getFileHandle(n);},async removeEntry(n){NAS.delete(n);}});
    const boot2=(uid)=>new Promise(res=>{const dom2=new JSDOM(fs.readFileSync(FILE,"utf8"),{runScripts:"dangerously",url:"https://localhost/",
      beforeParse(w2){w2.scrollTo=()=>{};w2.indexedDB=undefined;w2.alert=()=>{};w2.confirm=()=>true;w2.fetch=()=>Promise.reject(new Error("x"));w2.console.error=()=>{};w2.console.warn=()=>{};w2.console.log=()=>{};w2.HTMLElement.prototype.scrollIntoView=function(){};}});
      setTimeout(()=>{const r2=c=>dom2.window.eval(c);dom2.window.nasHandle=mkDir();r2(`S.user=USERS.find(function(u){return u.id==='${uid}';});S.viewMode=false;S.meetingMode='record';var fd=document.getElementById('f-date');if(fd)fd.value='2026-10-15';`);res(r2);},3500);});
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const A=await boot2('lin'),B=await boot2('yang'),A2=await boot2('lin');
    let ok=0,n=0;const C=(name,cond)=>{n++;if(cond)ok++;else console.log('  🔴 '+name);};
    // S-1:林改 HN、楊改 LY
    const seed=A(`(function(){S.cids=['head_neck','lymphoma'];S.meeting=newMeetingObj(S.user.id,['head_neck','lymphoma']);S.meeting.id='M1';S.meeting.date='2026-10-15';S.meeting.version=1;S.meeting.rev='r1';['head_neck','lymphoma'].forEach(ensureSec);S.meeting.sections.head_neck.cases=[createItem('head_neck','cases',{chartNo:'HN',summary:'HN舊'},{})];S.meeting.sections.lymphoma.cases=[createItem('lymphoma','cases',{chartNo:'LY',summary:'LY舊'},{})];saveLocal(S.meeting);return JSON.stringify(S.meeting);})()`);
    [B,A2].forEach(x=>x(`saveLocal(${seed});`));NAS.set('mdt_m_M1.json',seed);
    await A(`(async()=>{S.cids=['head_neck','lymphoma'];S.meeting=await _loadMtg('M1');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.head_neck.cases[0].summary='HN-by-lin';_dirty=true;await _doSave({});})()`);await wait(250);
    await B(`(async()=>{S.cids=['head_neck','lymphoma'];S.meeting=await _loadMtg('M1');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.lymphoma.cases[0].summary='LY-by-yang';_dirty=true;await _doSave({});})()`);await wait(250);
    const n1=JSON.parse(NAS.get('mdt_m_M1.json'));
    C('S-1 兩區段皆保留',n1.sections.head_neck.cases[0].summary==='HN-by-lin'&&n1.sections.lymphoma.cases[0].summary==='LY-by-yang');
    C('N-1 savedBy 是姓名',n1.savedBy==='楊靜雯'&&n1.savedById==='yang');
    C('M-1 NAS 檔無 _pushedRev',n1._pushedRev===undefined);
    // M-1:A 再存兩次,B 都收得到
    for(const d of ['d2','d3']){await A(`(async()=>{S.meeting=await _loadMtg('M1');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.head_neck.cases[0].summary='${d}';_dirty=true;await _doSave({});})()`);await wait(250);const rs=JSON.parse(await B("(async()=>JSON.stringify(await syncWithNAS()))()"));C('M-1 B 收到 '+d,rs.updated===1&&!rs.conflicts&&B("loadLocal('M1').sections.head_neck.cases[0].summary")===d);}
    // N-2:同一人兩台衝突 → 選本機 → 再存不衝突
    await A2(`(async()=>{S.cids=['head_neck','lymphoma'];S.meeting=await _loadMtg('M1');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.head_neck.cases[0].summary='HN-A2';_dirty=true;await _doSave({});})()`);await wait(250);
    const o2=JSON.parse(await A(`(async()=>{S.meeting.sections.head_neck.cases[0].summary='HN-A';_dirty=true;const r=await _doSave({});return JSON.stringify({r:r,k:S.conflict&&S.conflict.kind});})()`));
    C('N-2 同一人兩台 → NAS 衝突視窗',o2.r===false&&o2.k==='nas');
    await A("resolveConflict('local')");await wait(300);
    C('N-2 選本機 → NAS 更新',JSON.parse(NAS.get('mdt_m_M1.json')).sections.head_neck.cases[0].summary==='HN-A');
    // M-3:離線存檔 → 別台推 → 開啟保留 → 存檔合併
    A(`S.cids=['head_neck','lymphoma'];S.meeting=newMeetingObj(S.user.id,['head_neck','lymphoma']);S.meeting.id='M3';S.meeting.date='2026-10-15';S.meeting.version=1;S.meeting.rev='m1';['head_neck','lymphoma'].forEach(ensureSec);S.meeting.sections.head_neck.cases=[createItem('head_neck','cases',{chartNo:'H',decision:'h0'},{})];S.meeting.sections.lymphoma.cases=[createItem('lymphoma','cases',{chartNo:'L',decision:'l0'},{})];saveLocal(S.meeting);localStorage.setItem('mdt_pushed_M3','m1');`);
    const s3=A("JSON.stringify(S.meeting)");NAS.set('mdt_m_M3.json',s3);B(`saveLocal(${s3});`);
    nasDown=true;await A(`(async()=>{S.meeting=await _loadMtg('M3');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.head_neck.cases[0].decision='hA-off';_dirty=true;await _doSave({});})()`);await wait(250);nasDown=false;
    await B(`(async()=>{S.cids=['head_neck','lymphoma'];S.meeting=await _loadMtg('M3');_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.lymphoma.cases[0].decision='lB';_dirty=true;await _doSave({});})()`);await wait(250);
    await A(`(async()=>{S.meeting=await _loadMtg('M3');S.cids=S.meeting.cids;_resetEditState();S._snapshot=JSON.stringify(S.meeting);_dirty=true;await _doSave({});})()`);await wait(250);
    const n3=JSON.parse(NAS.get('mdt_m_M3.json'));
    C('M-3 離線修改保留 + 別台區段併入',n3.sections.head_neck.cases[0].decision==='hA-off'&&n3.sections.lymphoma.cases[0].decision==='lB');
    // P-1(V5.69.1):先開高版號會議 X 再開同號不同 rev 的合併會議 Y → base 不得殘留 X 的版號
    A(`S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);S.meeting.id='MX';S.meeting.date='2026-11-19';S.meeting.version=21;S.meeting.rev='x21';ensureSec('head_neck');saveLocal(S.meeting);localStorage.setItem('mdt_pushed_MX','x21');`);
    NAS.set('mdt_m_MX.json',A("JSON.stringify(S.meeting)"));
    A(`S.cids=['head_neck','lymphoma'];S.meeting=newMeetingObj(S.user.id,['head_neck','lymphoma']);S.meeting.id='MY';S.meeting.date='2026-10-15';S.meeting.version=3;S.meeting.rev='y3a';['head_neck','lymphoma'].forEach(ensureSec);S.meeting.sections.head_neck.cases=[createItem('head_neck','cases',{chartNo:'H',summary:'orig'},{})];S.meeting.sections.lymphoma.cases=[createItem('lymphoma','cases',{chartNo:'L',summary:'orig'},{})];saveLocal(S.meeting);localStorage.setItem('mdt_pushed_MY','y3a');`);
    const my=JSON.parse(A("JSON.stringify(S.meeting)"));my.rev='y3b';my.savedBy='楊靜雯';my.savedById='yang';my.sections.lymphoma.cases[0].summary='LY-by-yang';NAS.set('mdt_m_MY.json',JSON.stringify(my));
    await A(`(async()=>{S.cids=['head_neck'];S.meeting=await _loadMtg('MX');_resetEditState();})()`);
    const bv=A("S._baseVer");
    await A(`(async()=>{S.cids=['head_neck','lymphoma'];S.meeting=await _loadMtg('MY');_resetEditState();S._snapshot=JSON.stringify(S.meeting);var fd=document.getElementById('f-date');if(fd)fd.value='2026-10-15';S.meeting.sections.head_neck.cases[0].summary='HN-by-lin';_dirty=true;await _doSave({});})()`);await wait(250);
    const ny=JSON.parse(NAS.get('mdt_m_MY.json'));
    C('P-1 開 X(v21) 後開 Y:base 不殘留(X 的 baseVer='+bv+')',A("S._baseVer")!==21);
    C('P-1 存檔後楊的 LY 仍在',ny.sections.head_neck.cases[0].summary==='HN-by-lin'&&ny.sections.lymphoma.cases[0].summary==='LY-by-yang');
    // Q-1(V5.70.1):本機空間滿(本機失敗、NAS 成功)→ 重新開啟要拉回 NAS 的新版,不可拿本機舊版回蓋
    A(`S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);S.meeting.id='MQ';S.meeting.date='2026-10-15';S.meeting.version=1;S.meeting.rev='q1';ensureSec('head_neck');S.meeting.sections.head_neck.cases=[createItem('head_neck','cases',{chartNo:'Q',decision:'v-old'},{})];saveLocal(S.meeting);localStorage.setItem('mdt_pushed_MQ','q1');`);
    NAS.set('mdt_m_MQ.json',A("JSON.stringify(S.meeting)"));
    A(`window.__origSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).indexOf('mdt_m_')===0){const e=new Error('quota');e.name='QuotaExceededError';throw e;}return window.__origSet.call(this,k,v);};window.alert=function(){};`);
    await A(`(async()=>{S.meeting=await _loadMtg('MQ');S.cids=S.meeting.cids;_resetEditState();S._snapshot=JSON.stringify(S.meeting);S.meeting.sections.head_neck.cases[0].decision='NEW-important';_dirty=true;await _doSave({silent:true});})()`);await wait(250);
    A(`Storage.prototype.setItem=window.__origSet;`);
    C('Q-1 本機失敗時 NAS 已有新版',JSON.parse(NAS.get('mdt_m_MQ.json')).sections.head_neck.cases[0].decision==='NEW-important');
    C('Q-1 本機失敗時不記推送紀錄',A("localStorage.getItem('mdt_pushed_MQ')")==='q1');
    const oq=JSON.parse(await A(`(async()=>{const m=await _loadMtg('MQ');S.meeting=m;S.cids=m.cids;_resetEditState();return JSON.stringify({d:m.sections.head_neck.cases[0].decision,keep:!!S._keepMine});})()`));
    C('Q-1 重新開啟拉回 NAS 新版、不設 keepMine',oq.d==='NEW-important'&&!oq.keep);
    // R-1(V5.71.0):本機失敗後「不關頁」清出空間再存 → 不可跳「和自己衝突」
    A(`window.__origSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).indexOf('mdt_m_')===0){const e=new Error('quota');e.name='QuotaExceededError';throw e;}return window.__origSet.call(this,k,v);};`);
    await A(`(async()=>{S.meeting.sections.head_neck.cases[0].decision='R1-first';_dirty=true;await _doSave({silent:true});})()`);await wait(250);
    A(`Storage.prototype.setItem=window.__origSet;document.getElementById('cf-modal').classList.remove('open');S.conflict=null;`);
    const r1=JSON.parse(await A(`(async()=>{S.meeting.sections.head_neck.cases[0].cc='R1-more';_dirty=true;const ok=await _doSave({});return JSON.stringify({ok:ok,modal:document.getElementById('cf-modal').classList.contains('open')});})()`));await wait(250);
    C('R-1 不關頁再存不跳自我衝突',r1.ok!==false&&!r1.modal&&JSON.parse(NAS.get('mdt_m_MQ.json')).sections.head_neck.cases[0].cc==='R1-more');
    console.log('  '+ok+'/'+n+(ok===n?' ✅':' 🔴'));
    if(ok!==n)bad++;
  }catch(e){console.log('  ⚠ 例外:',e.message.slice(0,120));bad++;}

  console.log('\n=== 總計錯誤 ===');
  const _tot=errs.length+bad;console.log('  ', _tot, _tot?'🔴':'✅');
  process.exit(bad?1:0);
},5000);
