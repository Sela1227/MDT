const {JSDOM}=require('jsdom');
const fs=require('fs');
const errs=[];
const dom=new JSDOM(fs.readFileSync('/home/claude/index.html','utf8'),{
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
setTimeout(()=>{
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
    ["caseHTML(events)","caseHTML('head_neck',0,s.events[0],'events',{noImages:true})"],
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
    console.log('  '+ty+': "'+v+'" '+(v===ty?'✅':'🔴'));
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
      +"var d=document.createElement('div');d.innerHTML=caseHTML('head_neck',0,ev,'events',{noImages:true});"
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
      +"host.innerHTML=caseHTML('head_neck',0,s.events[0],'events',{noImages:true});"
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

  console.log('\n=== 總計錯誤 ===');
  console.log('  ', errs.length, errs.length?'':'✅');
  process.exit(bad?1:0);
},5000);
