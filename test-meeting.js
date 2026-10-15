/* ════════════════════════════════════════════════════════════════
   V5.76.0 共用測試會議(審核流程建議 F)
   ────────────────────────────────────────────────────────────────
   content-equiv.js 與 layout-check.js 原本各寫一份測試會議 —— 違反原則 A,
   而 V5.75.0~V5.75.2 三版都是「測試資料不夠真」才漏掉問題(欄位名錯、只有 1 位前期追蹤、只有前期追蹤是長的)。
   這裡只有一份「真實份量」的虛構會議,兩支檢查都 require 它:
     個案 3(含長病史、時序、內嵌影像)、醫療小組 1(長)、必要事件 1(含改善方案)、
     前期追蹤 10(含續追與必要提報、上次決議多行)、特殊議程 3(完治率、純文字、含影像)
   建立方式一律走 createItem + 編輯畫面實際寫入的欄位;MUST 自我檢查確保資料真的進到投影片。
   病歷號一律 9000 開頭(虛構)。
   ════════════════════════════════════════════════════════════════ */
const {JSDOM}=require('jsdom');
const fs=require('fs'),path=require('path');

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const LONG=function(head,n){var a=[];for(var i=1;i<=n;i++)a.push(head+'第'+i+'段:病程中各項檢查與治療反應的描述,包含影像、病理與臨床症狀的變化。');return a.join('\n');};

const FUPS=[];
for(let i=0;i<10;i++){
  FUPS.push({chartNo:'90003'+String(i).padStart(2,'0'),name:'測試'+'甲乙丙丁戊己庚辛壬癸'[i],prevDate:'2026-09-17',
    prevDecision:i%3===0?'【必要提報】已討論待改善　需改善\n改善方案：建立術後肺炎早期警示流程並追蹤三個月\n檢討照護流程'
      :'建議同步化放療,放療科評估後安排\n上次結果(2026-09-17)：已安排放療科門診',
    followFocus:'確認治療進度與副作用',note:i%2?'RT Fx 8,無明顯副作用':''});
}
/* V5.79.1 審核 V-3:真實流程的前期追蹤幾乎都是上一場自動帶入的 —— 前 8 位標 _autoImported,後 2 位當手動新增 */
FUPS.forEach(function(f,i){if(i<8)f._extra={_autoImported:true};});
FUPS[0].note='目前追蹤中';FUPS[0].followFocus='確認回診結果';FUPS[0].prevDecision='三個月後回診';

const DATA={
  cases:[
    {chartNo:'9000101',name:'測試甲',age:'61',gender:'M',ecog:'1',diagnosis:'Oral cancer, cT4aN2bM0, stage IVA',
     cc:'右側頰黏膜腫塊三個月',ph:'高血壓',phChips:['DM'],familyHistory:'父親肺癌',
     pathologies:[{date:'2026-09-01',content:'Squamous cell carcinoma, moderately differentiated'}],
     exams:[{name:'MRI',date:'2026-09-05',content:'4.2 cm mass with bone invasion'}],
     treatments:[{name:'手術',date:'2026-09-20',content:'Wide excision + MND'}],
     markers:[{name:'SCC',content:'2.1'}],
     genomics:[{name:'PD-L1',content:'CPS 20'}],showGenomics:true,
     discussion:'術後是否需同步化放療',summary:'切緣陰性,ENE 陽性',decision:'建議 CCRT',
     timeline:[{type:'dx',date:'2026-09-01',label:'診斷'},{type:'surgery',date:'2026-09-20',label:'手術'}],
     pathologyImages:[{name:'he.png',caption:'H&E',dataUrl:PNG}],
     showTimeline:true,embed:{timeline:true,patho:true}},
    {chartNo:'9000102',name:'測試乙',age:'55',gender:'F',diagnosis:'Nasopharyngeal carcinoma, stage III',
     cc:'頸部腫塊',discussion:'誘導化療後評估',summary:'',decision:''},
    /* 長內容個案:雙欄要能各自捲動(審核 Q-4) */
    {chartNo:'9000106',name:'測試己',age:'70',gender:'M',diagnosis:'Buccal cancer, recurrent',
     cc:LONG('長病史',10),ph:'慢性腎病',discussion:LONG('長討論',8)}
  ],
  team:[{chartNo:'9000103',name:'測試丙',diagnosis:'Hypopharyngeal cancer',cc:'吞嚥困難\n'+LONG('小組病史',8),
     discussion:'耳鼻喉科建議手術',summary:'PET 無遠端轉移',decision:'維持原方向'}],
  events:[{chartNo:'9000104',name:'測試丁',diagnosis:'Laryngeal cancer',cc:'治療中肺炎\n'+LONG('事件經過',8),
     summary:'敗血性休克',decision:'檢討照護流程',deathDate:'2026-09-30',causeDirect:'肺炎',
     improveNeeded:'需改善',improvePlan:'建立術後肺炎早期警示流程'}],
  followups:FUPS,
  /* createSpecial 只收 title/topicType/note/images,完治率欄位由編輯畫面另外寫入 → 用 _extra 照真實路徑補上 */
  special:[{topicType:'完治率',_extra:{period:'2026 Q3',numerator:8,denominator:10,definition:'測試定義',remarks:'測試備註'}},
    {title:'純文字議程',topicType:'其他',note:'只有說明、沒有影像的特殊議程'},
    {title:'影像討論',topicType:'影像討論',images:[{name:'a.png',caption:'影像一',dataUrl:PNG}]}]
};

/* 每種頁面至少一個「應該印在投影片上」的值;找不到 = 測試資料沒進投影片 */
const MUST=['9000101','Squamous cell','4.2 cm mass','Wide excision','CPS 20','術後是否需同步化放療',/* 個案 */
  '長病史第10段',/* 長內容個案 */'之前現病史','PET 無遠端轉移',/* 醫療小組 */'病程經過','敗血性休克','建立術後肺炎早期警示流程',/* 必要事件 */
  '9000300','目前追蹤中','三個月後回診','確認回診結果','上次決議','9000309',/* 前期追蹤 10 位 */'完治率','80.0%',/* 完治率 */'影像一'/* 特殊議程影像 */];
const KINDS=['tl-slide','img-slide','tbl','cover','sec'];

/* 產出投影片 HTML。opts.mutate(window) 可在產出前改資料;回傳 {html, window} */
function generate(opts){
  opts=opts||{};
  const FILE=opts.file||path.join(__dirname,'index.html');
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',url:'https://localhost/',
    beforeParse(w){w.scrollTo=()=>{};w.indexedDB=undefined;w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
      w.fetch=()=>Promise.reject(new Error('offline'));}});
  return new Promise(function(res,rej){
    setTimeout(async function(){
      try{
        const w=dom.window,run=c=>w.eval(c);
        w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
        w.__DATA=JSON.parse(JSON.stringify(DATA));
        run("S.user=USERS[0];S.cids=['head_neck'];S.meeting=newMeetingObj(S.user.id,['head_neck']);"
          +"S.meeting.date='2026-10-15';var _fd=document.getElementById('f-date');if(_fd)_fd.value='2026-10-15';ensureSec('head_neck');"
          +"var s=S.meeting.sections['head_neck'];"
          +"['cases','team','events','followups','special'].forEach(function(t){s[t]=(__DATA[t]||[]).map(function(d){var it=createItem('head_neck',t,d,{});if(d._extra)Object.assign(it,d._extra);return it;});});"
          +"S.meeting.version=1;saveLocal(S.meeting);_dirty=false;");
        if(opts.mutate)opts.mutate(w);
        const html=String(await run("genHTMLSlides()")||'');
        if(!html)throw new Error('genHTMLSlides 沒有回傳內容');
        res({html:html,window:w});
      }catch(e){rej(e);}
    },1500);
  });
}
/* 自我檢查:回傳缺少的項目(空陣列 = 測試資料都有進投影片) */
function selfCheck(slides){
  const all=slides.map(s=>s.text).join('\n'),kinds=slides.map(s=>s.kind).join(' ').split(' ');
  const lost=MUST.filter(x=>all.indexOf(x)<0);
  KINDS.forEach(k=>{if(kinds.indexOf(k)<0)lost.push('頁面種類 '+k);});
  if(slides.reduce((a,s)=>a+(s.dataImgs||0),0)<2)lost.push('內嵌影像(應至少 2 張)');
  return lost;
}
module.exports={DATA,MUST,KINDS,generate,selfCheck};
