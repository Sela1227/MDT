/* ════════════════════════════════════════════════════════════════
   V5.75.2 投影片版面檢查(審核 P-1)
   ────────────────────────────────────────────────────────────────
   content-equiv 只比文字,jsdom 不排版 —— 「內容超出畫面、看不到也捲不到」它抓不到。
   這支用虛構的「真實份量」會議(前期追蹤 10 位、上次決議多行)產出投影片,
   在真的 Chromium 裡用投影(1920×1080)與筆電(1366×768)兩種大小逐頁檢查:
     ① 每一頁:內容沒超出,或者那一頁可以捲動
     ② 前期追蹤表:捲到底之後,最後一列完整出現在導覽列上方
   需要 jsdom 與 playwright(Chromium)。沒有 playwright 時 preflight 會 🔴,
   可用 --no-layout 明確略過(不會假裝通過)。病歷號一律 9000 開頭。
   ════════════════════════════════════════════════════════════════ */
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{chromium=require('playwright').chromium;}
catch(e){try{chromium=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright')).chromium;}catch(e2){}}
if(!chromium){console.log('NO_PLAYWRIGHT');console.log('結果 -2');process.exit(0);}

/* V5.76.0 F:測試會議改用共用的 test-meeting.js(前期追蹤 10 位、長內容個案/小組/事件都在裡面) */
const TM=require('./test-meeting.js');
(async()=>{
  let browser=null;
  try{
    const html=(await TM.generate({file:path.join(__dirname,'index.html')})).html;
    const tmp=path.join(os.tmpdir(),'mdt-layout-'+process.pid+'.html');
    fs.writeFileSync(tmp,html);
    browser=await chromium.launch();
    const bad=[];
    for(const vp of [{width:1920,height:1080},{width:1366,height:768}]){
      const p=await browser.newPage({viewport:vp});
      await p.goto('file://'+tmp);await p.waitForTimeout(300);
      const r=await p.evaluate(function(){
        var out=[],sl=document.querySelectorAll('.slide');
        for(var i=0;i<sl.length;i++){
          go(i);var s=sl[i],cs=getComputedStyle(s);
          var scrollable=/auto|scroll/.test(cs.overflowY);
          /* 頁面本身或頁內某個可捲動區塊能容納內容即可(個案頁是雙欄各自捲動) */
          var over=s.scrollHeight>s.clientHeight+2&&!scrollable;
          if(over)out.push((i+1)+' 頁('+s.className+')超出 '+(s.scrollHeight-s.clientHeight)+'px 且不能捲');
          /* V5.76.0 審核 Q-4:逐段文字往上找第一個會裁切的祖先;超出它、而且沿途沒有可捲區塊 → 被切掉 */
          var tw=document.createTreeWalker(s,NodeFilter.SHOW_TEXT),t,cut=0,ex='';
          while((t=tw.nextNode())){
            if(!t.data.trim()||t.parentElement.closest('svg'))continue;
            var rg=document.createRange();rg.selectNodeContents(t);var bb=rg.getBoundingClientRect();if(!bb.height)continue;
            var a=t.parentElement,ok=true,sc=false;
            while(a&&a!==document.body){var cs2=getComputedStyle(a);
              if(/auto|scroll/.test(cs2.overflowY)){sc=true;break;}
              if(/hidden|clip/.test(cs2.overflowY)&&bb.bottom>a.getBoundingClientRect().bottom+2){ok=false;break;}
              a=a.parentElement;}
            if(!sc&&ok&&bb.bottom>innerHeight+2)ok=false;
            if(!ok){cut++;if(!ex)ex=t.data.trim().slice(0,16);}
          }
          if(cut)out.push((i+1)+' 頁('+s.className+')有 '+cut+' 段文字被切掉,例如「'+ex+'」');
          if(s.classList.contains('tbl')){
            s.scrollTop=s.scrollHeight;
            var rows=s.querySelectorAll('tbody tr'),last=rows[rows.length-1],pill=document.getElementById('navpill');
            var lb=last?last.getBoundingClientRect().bottom:0,pt=pill?pill.getBoundingClientRect().top:innerHeight;
            if(last&&lb>Math.min(innerHeight,pt)+1)out.push((i+1)+' 頁前期追蹤表捲到底,最後一列仍被遮住('+Math.round(lb)+' > '+Math.round(Math.min(innerHeight,pt))+')');
            var th=s.querySelector('thead th');
            if(th&&th.getBoundingClientRect().top<-1)out.push((i+1)+' 頁表頭沒有固定');
            s.scrollTop=0;
          }
        }
        return out;
      });
      r.forEach(x=>bad.push(vp.width+'×'+vp.height+' '+x));
      /* V5.76.0 審核 Q-1:簡報筆(PageDown)—— 封面要能換頁;前期追蹤表先捲到底才換頁 */
      if(vp.height===768){
        await p.evaluate(function(){go(0);});await p.keyboard.press('PageDown');await p.waitForTimeout(150);
        if(await p.evaluate(function(){return c;})!==1)bad.push('1366×768 封面按 PageDown 沒有換頁');
        const ti=await p.evaluate(function(){var s=[].slice.call(document.querySelectorAll('.slide'));var i=s.findIndex(function(x){return x.classList.contains('tbl');});go(i);s[i].scrollTop=0;return i;});
        let k=0,stay=true;
        for(;k<15;k++){
          const st=await p.evaluate(function(){var s=document.querySelectorAll('.slide')[c];return {c:c,end:s.scrollTop+s.clientHeight>=s.scrollHeight-2};});
          if(st.c!==ti){stay=false;break;}
          if(st.end)break;
          await p.keyboard.press('PageDown');await p.waitForTimeout(700);
        }
        if(!stay)bad.push('1366×768 前期追蹤表還沒捲到底就換頁了');
        else if(k===0)bad.push('1366×768 前期追蹤表不需要捲(測試資料不夠長)');
        else{
          await p.keyboard.press('PageDown');await p.waitForTimeout(200);
          if(await p.evaluate(function(){return c;})!==ti+1)bad.push('1366×768 前期追蹤表捲到底後按 PageDown 沒有換頁');
          await p.evaluate(function(i){go(i);var s=document.querySelectorAll('.slide')[i];s.scrollTop=s.scrollHeight;},ti);
          await p.keyboard.press('PageUp');await p.waitForTimeout(700);
          if(await p.evaluate(function(){return c;})!==ti)bad.push('1366×768 前期追蹤表 PageUp 沒有先往上捲');
        }
      }
      await p.close();
    }
    fs.unlinkSync(tmp);
    console.log('2 種視窗 × 全部頁面'+(bad.length?'':' ✅'));
    bad.slice(0,6).forEach(x=>console.log('  🔴 '+x));
    console.log('結果 '+bad.length);
  }catch(e){console.log('⚠ 例外:',e.message);console.log('結果 -1');}
  finally{if(browser)await browser.close();process.exit(0);}
})();
