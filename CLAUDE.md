# CLAUDE.md — MDT 會議管理系統

> 給 Claude 讀，讀完直接動手。版本細節在 README.md。

---

## ⚠️ 章法:每版必出三份檔(V4.6.3+ 強制)

每次版本發布,Sela 期待打包內**永遠有三份檔**:

| 檔名 | 給誰看 | 內容 |
|------|--------|------|
| `index.html` | 系統本身 | 程式碼 |
| `README.md` | 開發者 / Sela 自己 | 版本歷程、技術架構、踩坑 |
| `CLAUDE.md` | 下次接手的 Claude | 本檔(章法、業務對映、優先序) |
| **`USER_GUIDE.md`** | **三位個管師** | **功能怎麼用、什麼時候用、典型情境** |

**使用說明書的寫作原則**:
- **對象是個管師**,不是工程師——沒有「localStorage」「version」「函數」這種詞
- **以工作情境組織**,不是按功能列表(例如「開會前要做什麼」「會後要填什麼」,不是「會議模組/個案模組/產出模組」)
- **每個功能配截圖位置描述**(「設定 → 醫師 → 科別標頭右側 ▲▼ 按鈕」這種)
- **新版本只更新「本版新功能」段落**,舊功能說明保留
- **長度**:5-15 頁可印出。不要寫成 50 頁手冊

**打包檢查**:每次 `zip` 之前確認 4 份檔都在,缺一份就是任務沒完成。

### ⚠️ V5.12.0 起:`AudioSplitter.html` 是必帶的伴隨檔

錄音切割台用 **iframe 整合**(`<iframe src="AudioSplitter.html">`),所以 `AudioSplitter.html` **必須跟 index.html 放在同一層目錄**,否則「錄音切割」按鈕會開出空白。

打包指令(六檔 + favicon):
```bash
zip -q "MDT V<x>.zip" index.html AudioSplitter.html README.md CLAUDE.md USER_GUIDE.md SELA-handoff.md .gitignore favicon/ favicon/*
```

**為什麼用 iframe 不直接內嵌**(整合時的衝突盤點):
| 項目 | 衝突 |
|---|---|
| 全域 `VERSION` | 🔴 AudioSplitter 有 `const VERSION="V3.3.0"`,直接內嵌會蓋掉 MDT 版號 |
| CSS class | ⚠️ 12 個撞名,且是 `row`/`meta`/`primary`/`left`/`bar` 這種通用名 → 樣式互相污染 |
| 函式名 / HTML id / localStorage | ✅ 0 撞名 |

iframe 是**同源沙盒**:變數與樣式完全隔離,但功能不受限(檔案上傳 / AudioContext / 下載都正常),而且 AudioSplitter 可獨立升版不用改一行。

---

## 一、系統是什麼

**彰濱秀傳癌症中心 MDT 多專科團隊會議管理系統**

- 單一 `index.html`，無後端，資料存於 **localStorage**
- 三位個管師（楊靜雯/郭美伶/林伯儒）各管不同癌別
- 功能：建立會議、填個案討論、產出 HTML 投影片/PPTX/DOCX/LINE 通知
- 部署：GitHub Pages，本機開啟 `file://` 也可用
- 圖片：資料夾選取（File System Access API），只存檔名，不存 base64
- NAS 備份：每日首次登入背景完整備份（含圖片）

---

## 二、技術棧

```
單一 index.html（無框架，純 JS）
CDN（jsdelivr.net）：pptxgenjs@3.12.0、docx@7.8.2
Google Fonts：Noto Sans TC + Noto Serif TC
AI：api.anthropic.com / api.openai.com（主動觸發，不背景傳資料）
時間同步：TimeAPI.io → Cloudflare Trace → 本機 fallback
```

---

## 三、絕對禁止（踩過就壞）

| 禁止 | 改法 |
|------|------|
| `onclick="fn('"+id+"')"` 字串拼接 | `data-action` + event delegation |
| template literal 含換行後 innerHTML | `document.createElement` + `appendChild` |
| `</script>` 直接在 JS 字串 | `'</'+'script>'` |
| `for await` 在 inline IIFE | 抽成獨立 `async function` |
| `innerHTML` 裡寫 `onclick=` | 一定消失，改 `data-action` |
| str.replace 修改函數時找到 `</html>` 後的副本 | 修改前確認在 `<script>` 範圍內 |

---

## 四、使用者與癌別

| 個管師 | 分機 | 負責癌別 |
|--------|------|----------|
| 楊靜雯 | 17965 | 血液淋巴癌、消化道癌、婦癌 |
| 郭美伶 | 17379 | 胸腔癌、乳癌 |
| 林伯儒 | — | 頭頸癌、肝膽胰癌、泌尿道癌 |

**合併開會**：頭頸+血淋（林+楊）、消化道+肝膽（楊+林）

| 癌別 ID | 名稱 | weekday | weeknum | defaultSlot |
|---------|------|---------|---------|-------------|
| head_neck | 頭頸癌 | 4 | 3 | 12:30-13:30 |
| lymphoma | 血液淋巴癌 | 4 | 3 | 12:30-13:30 |
| thoracic | 胸腔癌 | 4 | 3 | 12:30-13:30 |
| breast | 乳癌 | 4 | 3 | 07:30-08:30 |
| digestive | 消化道癌 | 4 | 1 | 07:30-08:30 |
| hepatobiliary | 肝膽胰癌 | 4 | 1 | 07:30-08:30 |
| urology | 泌尿道癌 | 3 | 2 | 07:30-08:30 |
| gynecology | 婦癌 | 3 | 2 | 12:30-13:30 |

---

## 五、localStorage 架構

| key | 內容 |
|-----|------|
| `mdt_cfg` | 癌別設定 |
| `mdt_locs` | 地點清單 |
| `mdt_drs` | 醫師清單 |
| `mdt_idx` | 會議索引（最多 100 筆） |
| `mdt_m_{id}` | 完整會議物件 |
| `mdt_ai` | AI 設定 |
| `mdt_nas_last` | NAS 最後備份時間 |
| `mdt_nas_last_date` | NAS 最後備份日期（防重複） |
| `mdt_html_theme_{userid}` | 個管師 HTML 投影片配色偏好（V4.6.0） |

**會議物件重要欄位：**
```js
{
  id, title, cids, date, time, loc, version,
  savedBy, savedAt, createdBy,   // createdBy = 建立者 id（V4.3.30+）
  sections: {
    [cid]: {
      followups: [{..., status:'closed'|'ongoing', _autoImported}],
      cases: [{..., summary, decision, followNext, ecog, cfs}],  // followNext=false → 不帶入下次;ecog/cfs V4.7.0 加
      special: [...]
    }
  }
}
```

**關鍵規則**：DEFAULT 資料變更後，localStorage 舊資料不自動更新。必須寫遷移函數在 `loadAll()` 後執行。

---

## 六、關鍵函數地圖

| 改什麼 | 動哪些函數 |
|--------|-----------|
| 個案編輯/閱覽 | `caseHTML()`, `caseViewHTML()`, `renderCasesInner()` |
| 前期追蹤 | `followupHTML()`, `autoImportPrevFollowups()` |
| 影像區塊 | `buildGenericImgArea(cfg)` → 包裝層：`buildImgArea/PathImgArea/SurgicalImgArea/SpecialImgArea` |
| 乳攝（特殊版面） | `buildMammoImgArea()` |
| HTML 投影片 | `genHTMLSlides()` + `extraJs`（放大鏡/鍵盤）；配色模板 `HTML_THEMES` + `getHtmlTheme()`，產出區色票條 `renderThemeStrip()`（V4.6.1） |
| DOCX | `genDOCX()` |
| 設定頁 | `openSettings()` → `renderLocsTab/DrsTab/CancerCfgList` |
| 醫師/科別管理 | `addDr/editDr/delDr/moveDr`（單醫師）、`addDept/renameDept/delDept/moveDept`（科別整組）；手動遷移 `applyMasterMigrations` |
| NAS 備份 | `backupToNAS()`, `pickNasFolder()`, `restoreNasHandle()` |
| NAS 同步 | `syncWithNAS()`, `writeMtgToNAS()`, `writeTombstoneToNAS()`, `_canDelete()` |
| 儲存 | `saveMeeting(opts)` — `opts.silent=true` 不跳閱覽模式 |
| 會後填寫 | `openPostMtgPanel()`, `savePostMtg()` |
| 複製會議 | `openCopyMtgDialog()`, `confirmCopyMtg()` |

---

## 七、版本歷程（近期）

| 版本 | 關鍵變更 |
|------|---------|
| V5.26.3 | 時序圖排版四項 + AI 徽章位置:(⓪)「AI 匯入待確認」徽章原本插在「個案討論」與 flags 之間,它是**狀態標記**不該夾在分類標籤中,移到最後;(①)無疾病事件時疾病軸縮小 126→72px、改淡虛線不畫箭頭、標「尚無疾病事件記錄(建議補上診斷確立)」——**刻意不隱藏**,隱藏會讓「該填沒填」靜靜消失;(②)長標籤用 wrap2 斷成 2 行 + 超出截斷加… + `<title>` 顯示全文,並加 x 下限避免壓到軌名;(③)跨度 ≤2 個月時刻度改「月 日」逐事件標,解決軸線太空 |
| V5.26.2 | 修「勾了病程時序圖但 HTML 沒有按鈕」(坑#51):V5.25.0 改成按鈕模式時,資料累積那段仍留在 slides.push() 之後,但按鈕在 push 之前組裝 → 組按鈕時 _nTl 因變數提升是 undefined,按鈕永不出現(且 var 函式作用域會讓下一個個案拿到殘值錯位)。把該段搬到組按鈕之前。補上「位置順序驗證 + node 端到端模擬」 |
| V5.26.1 | 乳攝檢視恢復「報告+圖同頁」:V5.15.1 我把報告獨立成第一頁是誤解個管師的意思(他選 B 是指「不要動個案頁」,不是「報告要單獨一頁」)——改版前的乳攝投影片本來就是左報告右圖。改成三欄 **2:4:4**(報告 2、兩張圖各 4,橫向並排,適合直式 MLO/CC);報告欄加 word-break/overflow-wrap 自動換行避免擠成直條;只有「完全沒有圖」時報告才單獨成頁。順帶修掉編輯畫面「乳攝影像(最多2張)」過期文字(V5.17.0 已放寬到 6 張) |
| V5.26.0 | 病程時序圖依審稿修 P0+P1(坑#49/#50):(P0-1)移除全身治療相鄰事件自動箭頭 —— 資料無 endDate,箭頭是視覺憑空生出的因果語意;(P0-2/3)**節點回歸真實日期座標**,前版 layout(240) 強制推開導致「圖上距離不代表時間」,改成只移標籤 + 引線連回、且只在真會碰撞時錯開;(P1)移除疾病 Band 背景改用線本身建立權重、supporting lanes 移除自身 baseline、GAP_DAYS 45→90 GAP_W→110、gap 只標一次、時間軸改年份分組。正式版移除底部說明區 |
| V5.25.0 | 病程時序圖(Event-band Timeline)重做:(1)逐案勾選「產出時包含病程時序圖」;(2)不再產獨立投影片,改個案標題列 📈 按鈕 + 新分頁(與四種影像同模式);(3)五軌分法(疾病事件/檢查證據/全身治療/局部治療/追蹤其他),疾病軸畫成紅色帶箭頭主線置頂,其餘軌淡化只作對齊;(4)長空窗壓縮 + 虛線標月數;(5)**AI 判讀**:沿用「AI 整理→JSON→匯入」工作流,判讀轉折點與治療反應,個管零額外填寫,結果標「AI」且只寫入 _ai 命名空間 |
| V5.24.3 | 修影像檢視器版面:導覽鈕(.pnav position:fixed)壓住右下角圖片說明(.pcap)—— 與坑 #6 同源。.pbody/.prep 底部保留導覽鈕高度 calc(2vh+clamp(48px,7vh,78px));導覽鈕縮小;.pcap 從 nowrap+ellipsis 改最多兩行(長檔名原本只看得到前半)。**過程中坑 #48 的固化檢查立刻抓到我把多行註解寫進 CSS 字串**,導致產出的 JS 斷行 —— 註解必須放在字串外 |
| V5.24.2 | 修「影像按鈕有張數但點了沒反應」(坑#48):extraJs 是模板字串,內含的 `\n` 被當跳脫序列變成真換行 → 產出的 JS 出現 regex 斷行與字串跨行 → SyntaxError → 整段 script 不執行 → openImgWindow 從未定義。反查方法:抽出產出檔的每個 script 區塊逐一 node --check。修法:模板字串內反斜線加倍;V5.24.1 診斷用的 alert 也踩同一坑一併修 |
| V5.24.1 | openImgWindow 的失敗改成明確回報(原本 `if(!data)return` 是無聲失敗) |
| V5.24.0 | UI 尺度重整(純視覺,零功能/資料風險):主工作區 820→980px(以個管師 20 吋為準,不衝 1024);主要輸入 12→14px(原本 body 是 14 但工作區小兩級,含 25 處 inline);label 10→12px 並移除對中文無作用的 uppercase 與過大字距;.fsec 10→13px + 加留白(長卡片的定位 landmark);.cg2 gap 6→10/12px;修 V5.23.0 的 .fg-gap>label 填完仍是警告色;struct-row 加淡背景框讓「日期+內容是一組」可辨。字級分布 12px 158→126、14px 17→42 |
| V5.23.0 | 強化「AI 整理→JSON 匯入」主要工作流:(1)匯入自動清理 content 內與 date/name 重複的部分(_stripDupDate/_stripDupName,只清開頭結尾與括號內、不動中間有意義的比較日期);markers 序列型自動清空多餘 date;(2)匯入報告 —— 攤開每筆缺哪些欄位(診斷/現病史/病理/檢查/治療/討論方向)+ 重複病歷號警告;(3)缺漏欄位淡黃底高亮(fg-gap),填了自動消失;(4)prompt 補「content 不要重複名稱與日期」規則。timeline 依個管師指示不納入(下版重點) |
| V5.22.0 | 前期追蹤與醫療小組改版(個管師回報不好用):(1)前期追蹤改三段 — 上次決議(自動帶入上次 decision‖summary,唯讀)/ 本次追蹤重點(新欄位 followFocus)/ 目前結果(沿用 note);修掉 autoImportPrevFollowups 只帶 demographic、把 decision 丟掉的問題;(2)醫療小組改顯示標籤(之前現病史/多專科建議/最新情況/治療決策)+ placeholder 引導,**底層欄位名不動**;(3)三種卡片加色標籤區別(個案討論/醫療小組/前期追蹤) |
| V5.21.0 | 資料層工廠重構(修真 bug,坑#46/#47):實測發現 JSON 匯入建立的 case **缺 flags/pathologyImages/surgicalImages**(V5.10.1 只補了讀取端)。建 createCase/createItem 單一工廠(同時 default + normalize),兩入口統一走工廠且保留各自行為差異(withDeptDefault);加 assertCaseSchema 自我檢查。另建 getSection/getSectionList/getSectionItem 與 ensureArray,**只替換 8 處 mutation path**,渲染與 migration 刻意不動(避免 ensureSec 產生幽靈 section)。實測兩入口 schema 完全一致(31 欄位) |
| V5.20.0 | 依外部架構審稿做第一批重構三項(不改功能行為):(坑#43)圖片找檔統一走 _imgGetFile,刪掉產出端重複的 _getFileByEnum,另抽 _fileToDataUrl —— 這是坑 #31 的成因;(坑#44)imgMove(swap)與 imgReorder(splice)統一成 moveArrayItem + _moveImage,實測 swap 跨多格會錯;(坑#45)拿掉 buildSlidesHTMLOnly 的 monkey patch document.body.appendChild,改 genHTMLSlides(opts) 參數化,順帶淘汰 window._slidesSilent 全域旗標 |
| V5.19.1 | 改會議日期的資料防護(坑#42):合併會議的 section key 是「癌別+日期」無會議 ID,改日期若撞到另一場同癌別會議會覆蓋其資料。加三道防護:記 _loadedDate 判斷日期是否被改、改過就偵測同日同癌別的別場會議並警告(可選擇繼續)、確認新 key 寫入成功後才清舊日期孤兒。刻意不改 key 結構(migration 風險大於收益)。四情境實測:危險情境攔下、日常操作不打擾 |
| V5.19.0 | HTML 投影片三項強化(依外部審稿選做):(#7)產出 QA 預檢 — 全程累計「應有/實載」圖片數,產出前把讀取失敗的影像、沒填討論方向、內容過長、單頁>6張一次攤開,只提醒不阻擋(修「圖片靜默消失」的無聲失敗);(#2)Case Navigator ☰ 目錄 — 產 slides 時建 _slideMeta,目錄依癌別分組、可直接跳頁、目前個案自動高亮;(#9)導覽列閒置 3 秒淡出,滑鼠/鍵盤/觸控喚醒。分享等自動流程以 _slidesSilent 跳過對話框 |
| V5.18.1 | 依外部審稿修 5 項:(坑#39,P1)pageBreak 改「跟位置走」不跟圖片走 — _snapBreaks/_applyBreaks 排序前後轉換,順帶解決 P3(imgMove 缺 normalize);(坑#40,P1)乳攝仍是舊 renderer 沒走 buildGenericImgArea,拿不到新功能,收斂;(坑#41,P2)特殊議程編輯端用 pageBreak、輸出端卻用 imgsPerSlide 的雙真相,統一 pageBreak 並自動換算舊資料;(P2)每頁 >6 張加 soft warning 不阻擋 + 顯示各頁張數 |
| V5.18.0 | 圖片功能強化第二批(檢視器排版 4 項):(4)分頁點 pageBreak —— 卡片「⏎ 換頁」toggle,檢視器依此分組、每頁張數可不同(第1頁2張+第2頁4張),多圖用 grid(1/2/4/6/自動);(6)一鍵套用「每頁1/2/4張」自動設分頁點;(7)拖曳排序 imgReorder(整段搬移非交換,搬完清除首張 pageBreak);(10)頁碼總數改用實際頁數(原用 images.length,含報告頁會算錯)。移除 V5.15.0 後失效的舊「每頁N張」下拉(相關影像/手術),特殊議程的保留 |
| V5.17.0 | 圖片功能強化第一批(編輯畫面 7 項):(1)手動排序 ◀▶(imgMove 走 IMG_KINDS 註冊表,五種圖片一次生效);(2)上限放寬 相關影像 5→20、乳攝 2→6(含 data-max 與兩處硬編碼);(3)乳攝上傳補預載原檔名(原存空字串,匯出 JSON 會掉);(5)特殊議程清除補 confirm(V5.16.0 發現的缺陷);(8)顯示「已選 N/上限」;(9)選超過上限改明確提示(原本 slice 無聲截斷);(11)清除按鈕顯示張數 |
| V5.16.0 | 圖片操作重構(坑#38):建 IMG_KINDS 註冊表 + _imgOwner/_imgRedraw/imgDel/imgClear/imgSetCaption 五個核心,收斂 del×4 + clear×5 + caption×2 + delImg + addpathimg 重繪(約 95 行→約 45 行)。保守方案:HTML action 名稱不變只改 handler 內部。保留三個真實差異(mammo 巢狀 / special 用 innerHTML 且無 confirm / 各自 confirm 訊息)。node 實測 8 種情境含邊界全對 |
| V5.15.1 | 乳攝也改按鈕模式(第 4 顆 📸 乳房攝影),獨立投影片移除。乳攝與前三種的差異是它有「報告文字+圖」兩部分 → _pushImgWin 加選填 report 參數,檢視器把報告當第一頁(個管師選 B:個案頁不動);有報告但圖讀不到時仍可開啟(報告本身有價值)。至此四種圖片全部統一為「標題列按鈕 + 新分頁檢視」 |
| V5.15.0 | 圖片統一階段二:(1)相關影像/手術照片不再產獨立投影片排在個案後面,改成個案標題列三顆按鈕(🔬病理/📷手術/🖼影像)+ 新分頁檢視,與病理一致;openPathoWindow 通用化成 openImgWindow,key 'ci-N::type';(2)修放大鏡模糊 — 乳攝上傳壓縮 1200px/0.75 與病理 2400/0.82 不一致,統一成 2400/0.82,兩個放大鏡加 imageSmoothingQuality='high'。按鈕張數用實際載得到的張數(讀不到檔的自動濾掉,不顯示假數字) |
| V5.14.0 | 圖片統一底層(階段一,外觀不變):抽出 _imgGetFile(統一找檔,含列舉退回+subFolder)與 _imgPreview(統一預覽),5 個 preview handler 全部收斂。**揭露並修坑#37**:坑#31 當時只修到 previewrelatedimg,病理/手術/乳攝/特殊議程 4 處括號檔名仍失敗;且 5 處全不支援 subFolder。HTML 4 處按鈕補 data-subfolder。del/clear 暫不動(無 bug,階段二一起整理) |
| V5.13.6 | 審稿 P1 批三項:(坑#34)UTC 日期→台灣日期,建 todayTaipei() 用 en-CA locale 輸出 ISO 格式,5 處替換(早上開會日期錯一天/被擋);(坑#35)3 處預設會議室與 DEFAULT_LOCS 不一致(雙空格+名稱不符)→ select 存空值;(坑#36)CANCER_EN_CODES 用舊癌別 ID 導致英文檔名 fallback → 更新 5 個。加 _assertConfigConsistency() 啟動自動檢查代碼與會議室一致性 |
| V5.13.5 | 審稿 P0 批(會弄丟/謊報資料):(坑#32)clearTestData 用 cids?.length 判斷把真實會議當測試刪光 + 清空整個 idx → 改成只認 isTestData 標記、逐筆移除、正式會議>0 據實告知不誤刪;(坑#33)NAS writeMtgToNAS/backupToNAS 錯誤被 catch 吞掉謊報成功 → 改回傳真實成敗,失敗不標記今日完成、有失敗顯示警告。node 實測 clearTestData 精準只刪測試 |
| V5.13.4 | 全資料庫備份可靠性補強(大升級前的保命索):(1)補齊 4 個遺漏偏好進 export/import(mdt_ai/mdt_cr_template/mdt_html_theme_*/mdt_html_fname_lang_*,後兩者 per-user 要掃前綴);(2)還原前智慧後悔藥 — 只在「這台已有資料」時才問要不要先備份現狀,空機器直接還原;(3)匯出前完整性檢查,偵測 idx 有列但 mdt_m_ 遺失的孤兒。往返實測從「8 一致 4 遺失」→「13 全一致 0 遺失」。不碰 section 結構(分機作業天然規避撞 key) |
| V5.13.3 | 癌指數也改分組標籤格式(AFP/PIVKA-II 等指數名稱當深色小標籤 + 數值縮排),原本純文字長串換行後分不出哪行屬哪個指數。順便把 _DATEHDR 更名 _GRPHDR(現在日期與指數名稱共用此樣式)。病理/癌指數/檢查/治療四欄視覺完全統一 |
| V5.13.2 | Word 簡報再修兩點:(1)日期標籤底色從 paragraph shading 改 run shading — 只包住文字像膠囊,不再撐滿整行(個管師回報「日期項目的長度太長」);(2)mkBlock 的 TableRow 加 cantSplit,欄位區塊不跨頁 — 原本長欄位跨頁時第二頁沒有左側標籤,看起來像「被截斷顯示不完全」 |
| V5.13.1 | Word 簡報格式優化:(1)mkBlock 的 lines 擴充 fill/gap/color,病理·檢查·治療的日期標題行改「深色底白字 + 組間留白 4pt」讓不同日期一眼可辨(原 shaded 的 F5F7F8 太淡);(2)病理從純文字 \n 串接改成日期分組格式;(3)欄位重排 診斷→現病史→過去病史→病理→癌指數→檢查→治療→討論方向(討論方向殿後、癌指數移到病理與檢查之間)。record 模式外觀完全不動 |
| V5.13.0 | 長官習慣 Word 不用 PPTX → 「PPTX 簡報」按鈕改「Word 簡報」。做法:genDOCX 加 mode 參數('record' 預設 / 'deck' 新增),共用 mkBlock/mkCaseHdr 等 helper 避免複製 200 行。deck = 會前個案簡報(一案一頁 pageBreakBefore,完整臨床欄位 診斷/現病史/過去病史/病理/檢查/治療/討論方向/癌指數,不出會後的討論摘要/決策結論)。genPPTX 保留但無 UI 入口。順修按鈕文字還原不一致 |
| V5.12.0 | 新功能:整合錄音切割台(AudioSplitter V3.3.0)。用 iframe 彈窗載入 AudioSplitter.html(因 VERSION 全域 + 12 個通用 CSS class 撞名,直接內嵌會壞);lamejs CDN 由 cdnjs 改 jsdelivr(對齊 MDT,院內確認可用);主力產出加第 6 顆「錄音切割」按鈕,grid 改 auto-fit 防窄螢幕擠爆;src 延遲載入。**打包規則改六檔**(多帶 AudioSplitter.html) |
| V5.11.4 | 修 bug(新坑 #31):檔名含括號(CT(20250401).jpg)時 getFileHandle 找不到檔 → HTML 影像頁破圖。加 _getFileByEnum() 退回機制:getFileHandle 失敗改列舉資料夾比對 ent.name。預載 + 預覽兩處都修;順手 3 處 alt 加 escA |
| V5.11.3 | 修 bug(新坑 #30):做肝膽胰癌 HTML,HCC 診斷含「adrenal(腎上腺)」被 getSubGroup 的 /renal/ 誤判成腎臟癌標籤。根因 getSubGroup 沒限癌別(對所有癌別跑泌尿子群猜測)+ renal regex 太寬含 adrenal。修法:限 cid==='urology' 才啟用 + renal 排除 adrenal(腎(?!上腺))。regex 實測 adrenal 不誤判、真腎癌仍命中 |
| V5.11.2 | 修 bug(新坑 #29):特殊議程有圖但 HTML 投影片完全不產出。根因 buildSlidesHTMLOnly 的圖片預載迴圈寫死只跑 cases,special 的圖沒進 _pathImgCache → src 空 → 圖被濾掉 → 整張投影片 continue 掉。_needsFolder 也只檢查 cases 導致連授權都不問。修法:載圖抽 _loadImgsToCache() 共用函式 + 迴圈加跑 special + 授權檢查加 special |
| V5.11.1 | 會議小抄改一頁 5 案(V5.11.0 的 8 案個管師回報太擠):每案 33→52mm、標題列 6→7mm、每區書寫 3→5 條線、行高 7→7.5mm。頁面計算 277-12=265mm,5×52=260mm 不溢頁 |
| V5.11.0 | 新功能「會議小抄」genPrintSheet():可列印 A4 一頁 8 案(標題精簡 + 討論摘要左60%/決策結論右40% 各 3 條虛線格,每案 33mm 不跨頁)。走瀏覽器列印(window.open + 自動 print,可另存 PDF),不用 jsPDF 避免中文字型問題;彈窗被擋自動退回下載 HTML。主力產出加第 5 顆按鈕(grid 4→5 欄) |
| V5.10.5 | 對齊 SELA Starter Kit V1.21.0(從 V1.18.0,純文件層 c+1):坑 #14 補 V1.20.0 版號進位澄清(只有 c 逢十進位,b 可超過 9,MDT b=10 合法);坑庫加 #28(Python re.sub 注入用 str.replace,對齊 Kit #63,給維護者);九之三加 V1.19~1.21 新規範對應(#59/#60/#61/#62 已符合或不適用,references 不做)。不動程式 |
| V5.10.4 | HTML 投影片個案標題微調:(1)新增 caseDemoHTML() 性別中文化(男性/女性)+ 年齡加「歲」+ em space 拉開間隔(只 HTML,DOCX/PPTX 仍用 caseDemo 簡潔版);(2)flags 標籤放大 .5em→.62em + padding 加大。只動主個案標題 |
| V5.10.3 | 修姓名遮蔽 bug:maskName 舊邏輯「首+○+尾」把 4 字以上壓成 3 字(王大明華→王○華)。改「首+(中間字數個○)+尾」保留長度(王○○華)。1~3 字向後相容。影響 HTML/DOCX/PPTX 所有姓名遮蔽 |
| V5.10.2 | 對齊 SELA Starter Kit V1.18.0(從 V1.15.0,純文件層 c+1):CLAUDE.md 加 theme-color「N 處真相清單」(依坑 #42,MDT 5 處)+ handoff 評估紀律(鐵律 #0)+ Kit 對齊紀錄升 V1.18.0;SELA-handoff 加四級分類對齊報告 + slides/Share 回流建議。HTML 分享子資料夾保持 slides(坑 #40「不做」級)。不動程式 |
| V5.10.1 | JSON 個案匯入/匯出欄位盤點補齊:匯出補 doctors/doctor/flags/pathologyImages/timeline/note(原本漏帶往返掉資料);匯入補 flags;prompt 補 doctors(AI 可填)+flags(固定留空不推斷)。往返一致性驗證無掉資料 |
| V5.10.0 | PPTX 簡報全面升級:完整重寫 genPPTX,新配色系統(深霧灰藍/霧藍/橄欖綠)+ 版型重做(標題頁深色全幅、章節頁大編號、個案頁白卡片、討論記錄雙色卡)+ 字級放大 + 加討論原因標籤。保留溢位換頁。順修「討論」→「討論方向」+ 治療縮排格式 |
| V5.9.5 | DOCX 會議記錄個案標題列尾端加討論原因標籤（色塊文字 shading,配色跟 HTML 一致）。範圍:HTML+DOCX 都顯示,PPTX 仍不帶 |
| V5.9.4 | 個案討論原因標籤加 2 個（復發轉移/多重共病）共 5 個 + 修 bug（投影片沒讀 c.flags 所以選了不顯示）。統一 FLAG_LIST + flagColor helper,3 處渲染改用。DOCX/PPTX 暫未加 flags（待確認）|
| V5.9.3 | 產出區分組分層:11 按鈕分「主力產出(LINE/HTML投影片/PPTX/DOCX)」+「資料交換與分享(HTML分享/Excel匯出入/JSON匯入出/AI提示詞)」兩組,加分組標題。功能不刪、onclick/id 全保留,純重排 |
| V5.9.2 | 修 logo 白邊:Gemini 生圖 PNG 是 RGB 白底,圓角方形四角露白。用 Pillow 圓角遮罩(18%)切透明重產 favicon 套組;apple-touch-icon 特例做霧藍底滿版(iOS 自加圓角)。新坑 #27 |
| V5.9.1 | 修 V5.9.0 出貨後 2 個 bug:(1)L609 多餘 `>` 字元(V5.8.8 編輯意外打進),(2)兩處 inline base64 SELA JPEG(L616 登入頁 + L655 sidebar)漏改 → 改引用 `favicon/android-chrome-192x192.png`。新坑 #26:換主 logo 必須 grep inline base64 跟 SVG |
| V5.9.0 | 換 MDT 主 logo:Gemini 生圖(圍桌+6 身影+中心焦點),依 Kit V1.15.0 §14.3 範本 B 醫療專業型設計。雙軌共存:favicon/PWA = MDT,右下角微標仍 SELA(改引用 sela.svg)。產出 5 個 PNG 套組 + ico + 1024 備用 |
| V5.8.8 | 對齊 SELA Starter Kit V1.15.0(從 V1.7.1):theme-color `#F36825`→`#5A7A8B`(品牌色 vs 介面色分離,醫療型預設北歐霧藍);加 `favicon/sela.svg` + `<head>` SVG icon link;SELA-handoff 更新對齊紀錄 |
| V5.8.7 | 「討論要點」全系統 7 處改名「討論方向」(個案討論/醫療小組/必要事件/CSV/投影片/AI prompt 一致);CSV 匯入向後相容(舊「討論要點」欄位 fallback);DOCX 不動,仍只出 2 欄(摘要+決策)|
| V5.8.6 | 修坑 #19(累積 10+ 版未修):followupHTML 內 L3336+L3340 五處 `upd('${cid}','cases',${i},...)` 寫死 → 改 `'${type}'`。前期追蹤改名不再污染個案討論,DOCX 名字病歷號正常出現 |
| V5.8.5 | DOCX 治療欄樣式升級:標題行 `(date) name :` 灰底粗體、詳細內容縮排 8pt、去掉 `[i]` 編號;mkBlock 擴充 `opts.lines` 支援每行獨立樣式 |
| V5.8.4 | DOCX 視覺微調 × 3:mkCaseHdr 改用 DXA+layout=FIXED(修右側凸出);mkBlock cell 加垂直置中;標籤欄 12%→14%(讓 4 字標籤單行) |
| V5.8.3 | V5.8.2 沒真正修好(個管師回報仍格式跑掉):mkBlock 加 `layout:TableLayoutType.FIXED`,搭配 V5.8.2 DXA+columnWidths 三件套才完整。更新坑 #25 + 教訓「真實內容測試 vs 預覽」 |
| V5.8.2 | 修 V5.8.1 引入的 DOCX layout 跑掉(坑 #25,但未完整修):mkBlock 寬度從 PERCENTAGE 改 DXA 絕對 twip + columnWidths,解決長 diagnosis 觸發 Word auto layout 把標籤欄擠寬到 50% 的問題 |
| V5.8.1 | DOCX 視覺一致性兩項微調:診斷也用 mkBlock(個案討論/醫療小組/必要事件三處,刪掉診斷下方多餘細線);字體 27 處從「新細明體」改成「微軟正黑體」(跨平台 Word 自動 fallback) |
| V5.8.0 | DOCX 個案討論視覺優化:治療日期前置+編號 `[i] (date) name`、治療字級 12→10、決策結論 emphasis(標籤深色背景+白字);`mkBlock` 擴充 `opts={emphasis, contentSize}` 參數 |
| V5.7.1 | 修 V5.7.0 regression:前期追蹤面板「繼續/結案」按鈕視覺異常,因為新加的 postfup-summary/decision textarea 被 prefix match selector `[data-action^="postfup-"]` 誤匹配當按鈕處理。改精確匹配 ongoing+closed 兩個。新增坑 #24 |
| V5.7.0 | 會後填寫面板擴充:前期追蹤 / 醫療小組 / 必要事件 三區段都加摘要+決策 textarea;DOCX 同步加(讓醫療小組 / 必要事件 出現在會議記錄,且前期追蹤帶摘要決策) |
| V5.6.2 | DOCX mkBlock 左欄 16%→12%、cell paragraph 行距收緊(before:0/after:0),回應 V5.6.1 後個管師「左欄太寬+項與項間距太多」回饋 |
| V5.6.1 | DOCX mkBlock 加細灰邊框(SINGLE size:4 color:C.divider),讓「左標籤右內容」表格樣式更清楚對應個管師會議記錄需求 |
| V5.6.0 | JSON 個案匯出可選打包圖片成 zip(inline JSZip ~96KB);UI 加勾選框「附圖片打包 zip」;zip 結構對齊 V5.3.0 子資料夾(images/[病歷號]/[類型]_[檔名]);三種圖來源全支援(dataUrl/fromFolder 已授權/未授權跳 confirm) |
| V5.5.0 | HTML 投影片檔名中/英可選(`CANCER_EN_CODES` + `getHtmlFnameLang/setHtmlFnameLang`,設定頁切換);5 個個案大欄位渲染加 `\n→<br>` 多行支援 |
| V5.4.0 | 記住上次登入者(localStorage `mdt_last_user`)+ 1.5 秒倒數自動登入 toast(取消按鈕讓共用電腦 fallback) |
| V5.3.0 | 子資料夾匯入支援(以病歷號分,4 入口全改 + 失聯率佐證圖 _特殊議程);修 V5.2.1 引入的病理新分頁放大鏡 regression(完整搬移 zoom + 放大鏡邏輯到新分頁) |
| V5.2.1 | HTML 投影片病理影像改「主投影片按鈕觸發新分頁」 — 不再 push 獨立 slides,window.open + document.write 開新頁;移除「病理切片集中」勾選框 |
| V5.2.0 | 醫療小組/必要事件加「年齡 / 性別」+「家族史」三欄,三介面(編輯/閱覽/HTML 投影片)同步擴充;舊資料相容(沒填不顯示) |
| V5.1.4 | HTML 投影片標記工具加 5 色字色按鈕(<span class="fc">);hlClear 同時清 mark+fc;toolbar 寬度更新 |
| V5.1.3 | HTML 投影片螢光筆「清除」改成精確清除(用 Range.intersectsNode);個案年齡 .cd 字級加大(22→26px) |
| V5.1.2 | AI 匯入 prompt markers 序列 marker date 欄改填空字串(避免冗餘 + 誤導);加序列 vs 單筆雙範例 |
| V5.1.1 | 修「特殊議程 inline display:flex 覆蓋 .slide CSS class」造成 4 率投影片永遠顯示蓋掉個案的 bug;4 處全部修 |
| V5.1.0 | 姓名遮蔽兩字 bug 修(林一→林○);遮蔽符號從 `0` 改 `○`(U+25CB);7 癌別補齊 defaultDept(乳癌已有,其他 7 個新加) |
| V5.0.3 | AI 匯入 JSON 容錯:新 `_parseAIJSON` 工具(剝 markdown 圍籬/BOM/智慧引號/前後綴文字);prompt 加強格式規則(範例展示) |
| V5.0.2 | AI 匯入提示詞 markers 加「不可有空格」明文 + 單時間點範例 + PIVKA-II;topics 加智慧勾選原則(資料對應規則) |
| V5.0.1 | HTML 投影片 _trackSlide 字級改 clamp 響應式;修「尚未填寫」白字 bug;字型 fallback chain 加英文 sans-serif 在前(SF Pro/Helvetica Neue) |
| V5.0.0 | 醫療小組/必要事件加 5 個討論欄位(診斷/現病史/討論要點/摘要/決策);獨立 teamHTML/teamViewHTML 函數;HTML 投影片改每筆獨立(非合併表格);舊資料相容 |
| V4.9.0 | LINE 通知多癌別合開時自動合併(改 genLine cids 來源 + 會議名稱動態合成);其他產出不變 |
| V4.8.2 | Kit 版本標記 V1.6.0 → V1.7.1;handoff 加「提案前檢查紀錄」(回應 V1.7.0 兩個檢查);無程式變動 |
| V4.8.1 | 加 `SELA-handoff.md`(Kit V1.6.0 回流通道機制);無程式變動 |
| V4.8.0 | 對齊 SELA Starter Kit V1.6.0:加 favicon 套組、theme-color、右下角 SELA logo、.gitignore;zip 命名改空格(`MDT V*.zip`);無程式功能變動 |
| V4.7.1 | CFS 字樣全面改成「衰弱量表」(5 處輸出);程式變數 cfs 跟 tooltip/匯入別名/AI 抽取術語保留 |
| V4.7.0 | 個案新增 ECOG + 衰弱量表(CFS)兩欄;caseDemo 工具統一格式;PPTX/DOCX/HTML/Excel/JSON/AI prompt 全打通 |
| V4.6.6 | 修影像檢查選 CT/MRI 後日期欄被誤刪的 bug:onExamTypeChange 加 type='date' 例外 |
| V4.6.5 | 婦癌召集人「婦科::吳宏明醫師」修成「婦產科::」(主檔本來就只有婦產科);migrateCFGConv 加自動修補已部署的 localStorage |
| V4.6.4 | 使用說明書檔名 `使用說明書.md` → `USER_GUIDE.md`(避免中文檔名亂碼) |
| V4.6.3 | 章法升級:每版必附「USER_GUIDE.md」(個管師導向);打包檢查 4 份檔不可缺 |
| V4.6.2 | 色票條從 5 主按鈕之下搬到之上,維持下方 share/Excel/JSON 按鈕區的視覺連續性 |
| V4.6.1 | HTML 配色選擇從設定頁搬到產出區:renderThemeStrip 色票橫條,即時點選即時回饋;設定頁區塊完全移除 |
| V4.6.0 | HTML 投影片配色模板:HTML_THEMES 5 個風格(彰濱經典/暖陽/森林/薰衣草/高對比);設定→系統頁新增配色選擇區;每位個管師獨立記憶 |
| V4.5.0 | 科別整組上下排序:moveDept(dept,dir) 重排 DRS 陣列;科別標頭列加 ▲▼ 按鈕,邊界灰化 |
| V4.4.0 | (原 V4.3.45,因版本號規則修正——第三碼最大 9 超過要進位——重新編號)修主檔遷移根因:刪舊版 9 個重複函數;修咙→喉 typo;醫師分頁加「重新套用主檔遷移」按鈕 |
| V4.3.44 | NAS 同步刪除傳播:_canDelete + writeTombstoneToNAS;補 deleteCurMtg/confirmBatchDelete 權限檢查;tombstone 90 天 TTL |
| V4.3.43 | 移除乳房外科、歐金俊移至大腸直腸外科、DRS 遷移函數 |
| V4.3.42 | 整合主檔：15科、35醫師、頭頸外科拆分、消化/婦科更名 |
| V4.3.41 | NAS 跨機同步：syncWithNAS + writeMtgToNAS，登入同步 + 存檔推送 |
| V4.3.40 | 刪除保護：createdBy 檢查 + 批次刪除 disabled |
| V4.3.39 | 依 CLAUDE.md playbook 重寫 CLAUDE.md；砍舊版本歷程；加下版優先清單 |
| V4.3.43 | DOCX 個案抬頭配色改為 #3A4550（同程式 UI）|
| V4.3.37 | hotfix：_groupPath 未在 genHTMLSlides 宣告導致 HTML 產出失敗 |
| V4.3.36 | DOCX 六修：院名癒→癌、空案過濾、移討論主題行、空欄簡化、診斷治療分隔線 |
| V4.3.35 | DOCX 字型大小修正：pt()=twip 用於間距，sz()=半點 用於字型 |
| V4.3.34 | 複製會議功能（閱覽模式右上角，選目標日期，完整複製） |
| V4.3.33 | 會後填寫按鈕視覺優化（深藍漸層，全寬，加說明副標） |
| V4.3.32 | 會後填寫 panel：摘要/結論/追蹤狀態一次填完；followNext/ongoing 自動帶入 |
| V4.3.31 | DOCX 改版：決議確認單格式，個案標題色塊，12pt，移簽署欄 |

---

## 八、踩過的坑（不得重犯）

**#1 innerHTML 注入後 onclick 消失**
- 症狀：按鈕按下無反應
- 原因：`innerHTML` 序列化時 JS 事件屬性消失
- 做法：一律 `data-action` + document 事件委派

**#2 onclick 字串拼接引號衝突**
- 症狀：`SyntaxError: Unexpected string`
- 原因：`onclick="fn('"+id+"')"` 引號互衝
- 做法：改 `data-action` + delegation 或 `createElement`

**#3 innerHTML template literal 換行產生空白節點**
- 症狀：設定頁底部多餘空白行
- 原因：template literal 真實換行字元在 innerHTML 成 Text 節點
- 做法：`document.createElement` + `appendChild`

**#4 DEFAULT 資料變更 localStorage 舊資料無效**
- 症狀：改了 DEFAULT_DRS 頁面仍顯舊資料
- 原因：`loadAll()` 優先讀 localStorage，空時才用 DEFAULT
- 做法：寫遷移函數，`loadAll()` 後執行

**#5 JS 漏到 `</html>` 之後**
- 症狀：JS 程式碼顯示在頁面上
- 原因：str.replace 找到文末副本，新函數拼到 `</html>` 後
- 做法：修改前確認在 `<script>` 範圍；打包前 `html.rstrip().endswith('</html>')`

**#6 `for await` 在 inline IIFE 的 Chrome SyntaxError**
- 症狀：`Uncaught SyntaxError: Unexpected identifier`
- 原因：Chrome 對 inline IIFE 內的 `for await` 解析有問題
- 做法：抽成獨立 `async function _folderEntries(handle){...}`

**#7 braces 不平衡**
- 症狀：`Unexpected end of input` 或 `Unexpected token '}'`
- 診斷：`js.count('{') - js.count('}')` 必須為 0
- 做法：每次打包前必查；移除函數時確認 `{` 和 `}` 都刪

**#8 label + checkbox 雙重觸發互相抵消**
- 症狀：chip 按了沒反應（toggle 兩次歸零）
- 原因：`<label onclick>` 內有 checkbox，觸發兩次
- 做法：chip 一律 `<span data-action>` + delegation

**#9 panel HTML 插入到 JS 字串裡（新坑，V4.3.32）**
- 症狀：Node --check SyntaxError，genHTMLSlides 產生的 HTML 有 `</body>` 被替換
- 原因：genHTMLSlides 的 extraJs 字串裡有 `</body></html>`，用 `html.replace('\n</body>', panel)` 第一個找到的是 JS 字串裡的，不是真正的 HTML 結尾
- 做法：用 `html.rfind('</body>')` 取最後一個；或檢查位置在 `</script>` 之後

**#10 _groupPath 未在 genHTMLSlides 宣告（V4.3.37）**
- 症狀：`ReferenceError: _groupPath is not defined` at genHTMLSlides
- 原因：`_groupPath` 宣告在另一個函數（`openFromSb`）內，跨函數取不到
- 做法：`genHTMLSlides` 內的 `cids.forEach` 前加獨立宣告

**#11 DOCX 字型大小走鍾(V4.3.35)**
- 症狀:字超大,整份文件版面爆炸
- 原因:`pt(n)=n*20`(twip,用於邊距)誤用在 `size:`(應為半點 `n*2`)
- 做法:新增 `sz(n)=n*2` 用於字型大小,`pt(n)` 只用於間距/邊距

**#12 syncWithNAS 把 tombstone 升級回正常檔(V4.3.44)**
- 症狀:A 機刪除後,B 機同步把 NAS tombstone 蓋回成正常會議,A 下次同步又看到還活著
- 原因:Local→NAS 推送邏輯只看 `localMtg.version > nasMtg.version`,沒檢查 `nasMtg.deleted`。本地 version 比 tombstone 新時就推自己的版本,直接覆蓋掉 tombstone
- 做法:Local→NAS 推送前先檢查 `nasMtg2.deleted`;只有「本地 version 確實比 tombstone version 還大」才推(視為合法復活,例如 B 在不知情下持續編輯到比刪除還新)
- 教訓:多機同步任何「比 version 推送」邏輯,deleted/active 兩種狀態要分開判斷

**#13 同名 function 重複定義導致新版被覆蓋(V4.4.0,代表性大坑)**
- 症狀:V4.3.43 寫了新版 loadAll + _migrateDrsDepts,使用者部署後完全沒生效;科別還是舊的『頭頸外科』『消化內科』『婦科』
- 原因:檔案 L1223 寫了新版 loadAll(含 _migrateDrsDepts() 呼叫),L7812 還留著舊版 loadAll(沒呼叫)。JS function declaration 重複時後者覆蓋前者 — `_migrateDrsDepts` 被宣告了但**從來沒被執行過**
- 一同被覆蓋的還有:migrateLOCS、migrateDRS、migrateCFG、migrateCFGConv、saveAll、mkStr、getMemberStr 共 9 個函數(這次新版內容碰巧跟舊版相同所以沒造成更大災難)
- 做法:修改既有函數時,**全檔搜尋確認只有一份**;Python 一行檢查 `grep -c "^function loadAll" index.html`
- 教訓:大檔案編輯特別容易踩。每次 `node --check` 通過不等於正確 — 重複定義不是語法錯,是邏輯死亡。打包前加例行檢查:`grep -c '^function FNAME' index.html` 對任何重要函數應為 1
- 預防:加在打包驗證腳本裡 — 對所有 `^function (\w+)` 抓出來,>1 的全列警告

**#14 版本號第三碼超過 9 沒進位(V4.4.0 之前長期錯誤)**
- 症狀:版本號跑出 V4.3.45 這種數字,第三碼累積到 45 才被注意到。版本號失去語意 —「45 次 bug fix」聽起來不合理,實際上很多應該是新功能(該進到第二碼)
- 原因:DEV-GUIDELINES 寫了「bug fix +0.01」這種小數寫法,沒寫到「第三碼最大 9,超過要進位」。Claude 每次接手就照數字直接 +1
- 做法:從 V4.4.0 重新開始;CLAUDE.md 第九節版本號規則表寫清楚進位邏輯
- 教訓:版本號規則用「+0.01」這種小數寫法很容易誤導 — 41+1=42 看起來合理,但 V x.y.z 不是小數。要寫成「第幾碼最大 9」才不會被當小數累加
- 預防:打包前看版本號,第三碼(c)≥ 10 立即警告
- **V5.10.5 對齊 Kit V1.20.0 修訂(重要澄清)**:Kit V1.20.0 明定「**只有 c(第三碼)逢十進位**,c 達 10 → b+1 歸零;**b(第二碼)可超過 9**」。所以坑 #14 的「第三碼最大 9」**只適用 c,不適用 b**。MDT 目前 V5.10.x 的 **b=10 是完全合法的**(累積夠多新功能,第二碼自然超過 9),不需要進位到 a。只有當 c 累積到 10(如 V5.10.10)才進位成 V5.11.0。a(大改版)只在技術棧切換/資料結構不相容/主流程重做時才動。**別誤把 b≥10 當成規則錯誤**(這是坑 #14 反過來要避免的過度修正)

**#15 使用說明書版號脫節(V4.6.3)**
- 症狀:`USER_GUIDE.md` 寫 V4.6.3,但 `index.html` 是 V4.6.2;使用者看說明書不確定是不是對應到當前版本
- 原因:CLAUDE.md 沒明文要求「使用說明書版號要跟 index.html 同步」;前一個 session 寫了 V4.6.3 規格但 code 還沒做
- 做法:打包驗證腳本加「4 檔版號一致性檢查」(坑 #14 的延伸);新章節「使用說明書同步規則」明文規定每次發版必更新四檔版號(即使說明書內容沒變也要動標記)
- 教訓:跨檔案的版號一致性靠「人記得」一定會壞,要靠工具強制。**即使這版只改 bug、說明書內容沒變,版本對應標記也要更新** — 這是給使用者的訊號:「這份說明書真的對應當前部署版本」
- 預防:打包驗證腳本失敗(`4 檔版號一致: ⚠️`)就不打包

**#16 中文檔名 zip 解壓亂碼(V4.6.4)**
- 症狀:`使用說明書.md` 在 zip 裡看似正常,但個管師在 Windows 解壓變成 `��������.md`、無法開啟
- 原因:zip 規格對非 ASCII 檔名的編碼處理不一致(macOS 用 UTF-8、Windows 預設 CP950/Big5、Linux 用 UTF-8 但工具可能誤判);跨平台時亂碼很常見
- 做法:重要檔案改用純 ASCII 英文檔名(`USER_GUIDE.md`),中文當作術語在內容裡保留即可
- 教訓:跨平台部署的東西檔名只用 ASCII。檔名是「實體」,中文是「呈現」 — 把實體的歸檔名(英文)、把呈現的歸文件內容(中文)
- 預防:打包腳本的 `required` 清單只有 ASCII 檔名;新建檔案前先想「有沒有中文?有就改英文」

**#17 主檔內部 conv 與 DRS 科別名不一致(V4.6.5)**
- 症狀:婦癌 `conv:'婦科::吳宏明醫師'` 但 DEFAULT_DRS 內吳宏明醫師是「婦產科」,實際 UI 顯示召集人欄會找不到對應醫師、回退到預設值
- 原因:DEFAULT_C 裡的 `conv` 欄位手寫字串,跟 DEFAULT_DRS 的 dept 欄位**沒有任何約束**;歷史上有過「婦科」科別,後來改名為「婦產科」但 DEFAULT_C 的 conv 沒同步改;同類錯誤還有頭頸癌 conv 寫「頭頸外科::張建明」但張建明在 DEFAULT_DRS 是「口腔外科」(V4.4.0 拆科別後的殘留)
- 做法:V4.6.5 修婦癌一處 + 加 `migrateCFGConv` 自動修補已部署 localStorage 的「婦科::」殘留;頭頸癌類似 bug 留待之後處理
- 教訓:跨主檔欄位的引用一致性(這裡是 `DEFAULT_C[*].conv` → `DEFAULT_DRS[*].dept`)沒有約束就會壞,改科別名稱必須**同時搜尋整個 DEFAULT_C** 看誰引用到舊名
- 預防:打包前掃 `DEFAULT_C` 內所有 `conv:'X::Y'`,檢查「X 是否存在於 DEFAULT_DRS 任一筆的 dept」;不存在就警告
- 已知限制:歷史會議 `mdt_m_*` 個案的 `doctors` 欄裡如有「婦科::」殘留**不修**(會議是 immutable 歷史資料)

**#18 nextElementSibling + tagName 條件不夠精準(V4.6.6)**
- 症狀:個案編輯「影像檢查」選 CT/MRI 後,旁邊的日期選擇欄整個消失
- 原因:`onExamTypeChange` 想刪「自訂類型輸入欄」,用 `sel.nextElementSibling.tagName === 'INPUT'` 判斷。但同樣 tagName='INPUT' 的還有日期欄 `<input type="date">`,被一併誤刪
- 做法:加 `inp.type !== 'date'` 例外,只刪 type 非 date 的 INPUT
- 教訓:用 sibling/parent + tagName 定位 DOM 元素時,**只看 tagName 不夠**,有時要加 type、class、placeholder 等屬性確認。混用「動態插入 input」+「靜態 input」的場景特別容易踩
- 預防:有「動態插入/移除 sibling」邏輯時,目標 input 加 dataset.role='custom-type' 之類標記,刪除時用 `[data-role="custom-type"]` 選擇器,比 tagName 嚴謹
- 順便發現的 bug:`__other__` 分支也是 `tagName==='INPUT'` 判斷「已有 input」,使用者從 CT 切到「其他」時看到日期欄(也是 INPUT)就不插自訂類型欄,使用者沒地方輸入。一併修

**#19 followupHTML 內 upd 寫死 `'cases'`(V5.0.0 發現,V5.8.6 修)** ✅
- 症狀:前期追蹤事項(followups)的欄位編輯後**可能不會儲存**;某些情況下會**寫進個案討論(cases)的同 index 物件**,造成資料污染。V5.8.6 個管師回報實機:「改前期追蹤的名字,結果同步改到個案討論;DOCX 上前期追蹤沒名字沒病歷號」
- 根因:`followupHTML(cid,i,d,type='followups')` 函數內所有 `upd` 呼叫都寫死 `upd('${cid}','cases',${i},...)`,沒有用 `${type}`。但 `upd` 函數本身是 `S.meeting.sections[cid][type][i]` 動態派發 — 收到 'cases' 就去 cases 陣列存取
- 兩種壞情境:
  - `cases[i]` 不存在(常見,因追蹤數通常少於個案) → `if(!item)return;` → 編輯靜默失敗,個管師可能以為有存
  - `cases[i]` 存在 → 改到 cases[i] 上,造成資料污染
- 為什麼長期沒人回報:個管師可能很少深度編輯「前期追蹤事項」的所有欄位(主要只看「上次討論」追蹤狀態);加上看起來像「儲存了」,實際只是 UI 暫態
- V5.8.6 修法:L3336 + L3340 兩行內 5 處 `upd('${cid}','cases',${i},...)` → `upd('${cid}','${type}',${i},...)`(改用 followupHTML 第 4 參數 type='followups')。Cases editor 內的 13 處 'cases' 維持不動(那是正確的寫死)
- 教訓:多 type 共用的渲染函數,必須用 `${type}` 動態派發,絕不能寫死任一具體 type 名稱 — 這是「跨 type 共用模板」的鐵律
- 預防:打包前 grep `upd\('\$\{cid\}','cases',` 出現在 `function caseHTML` 以外的位置就警告

**#20 HTML 投影片新區塊字級寫死沒用 clamp(V5.0.1)**
- 症狀:V5.0.0 新加的醫療小組/必要事件投影片,在 1080p 投影機現場字太小(~16px),個管師回報「字略小」
- 根因:寫 `_trackSlide` 時內文沒設 `font-size`(繼承 body 預設 16px),label 用 `font-size:0.85em` 相對值。沒參照個案討論主投影片用 `clamp(min,vw,max)` 響應式的慣例
- 做法:label `clamp(15px,1.5vw,22px)`、內文 `clamp(17px,1.8vw,26px)`,跟 `.cdx` 主投影片字級看齊
- 順便發現:「(尚未填寫討論內容)」用 `rgba(255,255,255,.5)` 白字,但投影片背景是白的 → 看不到。改 `rgba(0,0,0,.4)` 黑字
- 教訓:**新增任何 HTML 投影片元素時,字級必須用 `clamp()`,不能用 px 或 em 寫死** — 投影片要支援筆電預覽(800x600)到 4K 投影(3840x2160),寫死字級會在某些尺寸下太小或太大
- 預防:打包前 grep 新加的投影片相關元素,找 `font-size:\d+px` 或 `font-size:\d+\.\d+em` 警告(`clamp` 或 `vw/vh` 才合格)

**#21 LLM 輸出的「純 JSON」不可信,必須容錯解析(V5.0.3)**
- 症狀:個管師按「AI 匯入提示詞」貼到 claude.ai,生成的 JSON 貼回系統時 `JSON.parse` 炸:「Unexpected token '`', "\`\`\`json [ "...」
- 根因:claude.ai/ChatGPT 等 LLM 即使 prompt 明文寫「不要加 markdown 符號」,仍經常自動加 ```json ... ``` markdown 圍籬。這不是 prompt 寫錯,是 LLM 訓練習慣的頑固偏差,要當作「無法消除的事實」
- 做法:**雙管齊下** — (1) 系統端寫 `_parseAIJSON` 容錯解析(剝 markdown 圍籬、UTF-8 BOM、智慧引號 → 直引號、抓 `[...]` 區塊容錯前後綴),所有 AI 匯入入口必用;(2) prompt 仍加強格式規則(範例展示「錯誤」vs「正確」)讓 AI 提高成功率,但不依賴它
- 教訓:**任何「跟 LLM 互動」的整合,輸出端必須有容錯解析,prompt 絕不能是唯一防線**。LLM 是機率輸出,不是確定行為;當作「外部 API」處理,輸入消毒要做完整
- 預防:任何 `JSON.parse(llm_output)` 都改用 `_parseAIJSON()`;未來其他 LLM 整合(如語音轉文字、影像 OCR)同樣原則 — 對 LLM 輸出做容錯轉換,不假設它一定符合格式
- 容錯機制需覆蓋:① markdown 圍籬(```json / ```)② UTF-8 BOM ③ 智慧引號(\u201C/\u201D) ④ AI 加的前言/結語文字

**#22 maskName 兩字姓名變三字 + 遮蔽符號用數字 0 易混淆(V5.1.0)**
- 症狀:兩字姓名「林一」遮蔽後變成「林0一」(三個字,多了個字);三字「陳建明」變「陳0明」用的也是阿拉伯數字 0,看起來像「陳零明」容易誤讀為人名
- 根因:`maskName` 兩字邏輯 `n[0]+'0'+n[1]` 公式從三字邏輯複製過來但沒拿掉末字。遮蔽符號用 ASCII `'0'`(數字零)是早期方便打字寫的,沒考慮跟「真實姓名含零字輩」混淆
- 做法:兩字改成 `n[0]+'○'`(只留首字 + 圓圈);三字改成 `n[0]+'○'+n[n.length-1]`(首末字 + 圓圈);**遮蔽符號統一用 `○`(U+25CB WHITE CIRCLE)** — 正體中文媒體標準
- 教訓:**遮蔽符號要選一個「絕對不會出現在真實姓名」的字元** — 數字 0 / 字母 O 都可能被誤認;全形中文圓圈 `○` 純視覺符號,無法當人名讀
- 為什麼長期沒被發現:三位個管師可能很少接觸兩字姓名(MDT 個案多是 3-4 字),即使遇到也以為「就是這樣顯示」
- 預防:遮蔽相關的測試應該涵蓋字串長度 1/2/3/4+ 邊界 case

**#23 inline `display:flex` 覆蓋 `.slide { display:none }` CSS class(V5.1.1)**
- 症狀:HTML 投影片產出時,只要有任何特殊議程(完治率/失聯率/留治率/訪視率),所有投影片畫面都被特殊議程內容覆蓋,看起來像「個案投影片消失,每頁都是同一個特殊議程」
- 表象誤導:個管師描述「個案資料消失」,實際 slides 陣列產出完全正確(diff 兩份實機 HTML 檔證實 — `<section>` 數量、class、內容都對),只是視覺被覆蓋
- 根因:HTML 投影片用 `.slide { position:absolute; inset:0; display:none }` + `.slide.on { display:flex }` 雙態邏輯。**4 個特殊議程投影片**(完治率/失聯率/留治率/訪視率,主表 + 病人清單共 4 處)在 inline style 寫了 `display:flex` — **CSS 優先級 inline > class**,導致這 4 張投影片**忽略 `.slide` 跟 `.slide.on` 控制,永遠顯示**;因為絕對定位填滿視窗,蓋住所有其他投影片
- 做法:inline style 移除 `display:flex;`,保留 `flex-direction:column`(這個無 `display:flex` 時不生效,留著無害但無用 — 為了 diff 最小化保留)。`display` 完全交給 CSS class 控制
- 教訓:**`display`(尤其 `none/flex/block` 切換)永遠用 CSS class 控制,絕不寫在 inline style** — inline 蓋 class 是 CSS 優先級鐵律,跟 class 競爭不會贏。Inline style 只該寫「個別實例的色彩、變數」(如 `--ca:#XXX`、`background:#fff`),不該碰會被切換的屬性
- 為什麼長期沒被發現:特殊議程是 V4 後期才加的功能,使用頻率本來就低(每季品質報告才用一次),加上 bug 表現太怪(個管師以為「個案消失」),歸因錯誤難 reproduce
- 為什麼這次 V5.1.1 才修:個管師回報「個案消失」被連續追了 11 個方向都不對,直到拿到實機產出的 HTML 檔做 diff,才從 `<section>` 結構完全正確 + 視覺結果完全錯誤的矛盾找到「視覺問題」這條路,進而發現 inline display 覆蓋 class 的 CSS 優先級陷阱
- 預防:打包前 grep `<section[^>]*style="[^"]*display:` 在 genHTMLSlides 內出現就警告(`.slide` 的 display 永遠該由 class 控制)

**#24 prefix match attribute selector 加新元素後誤匹配(V5.7.0 → V5.7.1)**
- 症狀:個管師回報「前期追蹤的會後填寫面板,繼續追蹤/結案按鈕點了沒反應」(實際是有反應,但視覺異常讓人以為失效)
- 根因:V5.7.0 加 `postfup-summary` / `postfup-decision` 兩個 textarea 後,event handler 內 L8445 `_card.querySelectorAll('[data-action^="postfup-"]')` 的 prefix match selector 變得太寬,連 textarea 也被匹配。handler 把它們當按鈕處理:加 `b.className='btn btn-sm btn-b'`、`b.style.opacity='0.5'`。textarea 被改 className + 半透明,視覺像被禁用
- 做法:把 prefix match 改成**精確匹配 ongoing + closed 兩個 button**:`'[data-action="postfup-ongoing"],[data-action="postfup-closed"]'`
- 教訓:**寫 `[data-action^="prefix-"]` prefix selector 時要小心**,後續加任何 `prefix-*` 命名的新 data-action 都會被誤匹配。新增 data-action 時要 grep 既有 prefix selector 確認不會撞到
- 預防:有 prefix selector 的 handler,旁邊加註解列出「目前匹配的 actions」,以後新增同 prefix 命名前先 grep 確認
- 替代方案:用更明確的命名空間,例如按鈕用 `postfup-toggle-ongoing` / `postfup-toggle-closed`,textarea 用 `postfup-field-summary` / `postfup-field-decision`,selector 就可以用 `[data-action^="postfup-toggle-"]` 而不會誤匹配

---

**#25 docx Table PERCENTAGE 寬度在 auto layout 下被內容覆蓋(V5.8.1 → V5.8.2 → V5.8.3 才真正修好)**
- 症狀:個管師回報 V5.8.1 出貨後「整個 DOCX 格式跑掉了」— 截圖顯示左欄被擠到 ~50%(本來該 12%),右欄被擠成超窄一條,每行 3-5 個字,本來 1-2 頁的會議記錄變 3 頁
- 為何 V5.6.x 沒問題,V5.8.1 才壞:V5.6.x 時診斷是純 Paragraph(沒走 mkBlock),只有 3 個 mkBlock(治療/摘要/決策)+ 內容相對短。V5.8.1 把診斷也改成 mkBlock,但 diagnosis 常 200+ 字一行 wrap,觸發 Word 的 auto layout 算法
- 根因:docx 7.8.2 的 `WidthType.PERCENTAGE` 在 Word 端只是「建議值」。即使改成 `WidthType.DXA` + `columnWidths` 也不夠 — **Table 沒明確指定 `layout=fixed` 時,Word 仍會 autofit、根據內容調整,把 DXA 當建議**
- V5.8.2 失敗的修法:把 width 改成 DXA(`tcW dxa w=1080/7920`),但**沒有 `<w:tblLayout w:type="fixed"/>`** → Word 仍會 autofit,個管師回報仍壞
- V5.8.3 正確修法:加 `layout: TableLayoutType.FIXED`,寫入 `<w:tblLayout w:type="fixed"/>` 後 Word 100% 服從欄寬
- 教訓:**docx Table 要嚴格控制欄寬時三件套缺一不可:DXA 絕對寬度 + columnWidths + layout=FIXED**;PERCENTAGE 在長內容情境根本不可靠
- 預防:打包前 grep `mkBlock`,如果有改動,XML 內必須有 `tblLayout="fixed"`(可用 `unzip -p docx word/document.xml | grep tblLayout` 驗)
- 教訓 #2:**真實內容測試 vs 預覽**:V5.8.2 我自己 mock 的測試 docx 在某些 Word 版本看起來 OK(可能默認服從 DXA),但個管師端 Word 版本不同 → 仍壞。**下次 docx 改動必須請個管師打開實機產出回報,不能只看自己 mock 預覽**

**#26 換主 logo 漏改 inline base64 跟內嵌 SVG(V5.9.0 → V5.9.1 才修)** ✅
- 症狀:V5.9.0 出貨「換 MDT 主 logo」後,個管師回報「沒出現子程式的 logo」— 截圖看 sidebar 跟登入頁仍是 SELA 橘色 logo,跟瀏覽器分頁圖(已換成 MDT)不一致
- 根因:換 logo 時我只想到 `favicon/` 目錄套組 + `<head>` 引用,**忘了 grep 整個 index.html 內的 `<img src="data:image/png;base64,...">` inline base64 圖**
- V5.9.0 漏改兩處(L616 登入頁 56×56 + L655 sidebar 26×26),都用 inline base64 SELA JPEG 寫死
- V5.9.1 修法:src 改 `favicon/android-chrome-192x192.png`,style 保留;附加效果檔案瘦身 ~10KB
- 教訓:換 logo / 換品牌資產時,grep 範圍必須涵蓋:
  - `favicon/` 目錄
  - `<head>` 內的 `<link rel="icon">`
  - **`src="data:image/png;base64,..."` inline base64**(整個 HTML 都要 grep)
  - **`<svg>...</svg>` 內嵌 SVG**
  - JS 字串內的圖片路徑(動態渲染用)
- 預防:打包前 grep `data:image/(png|jpeg);base64` 如果有結果,逐個確認是不是該換的舊品牌資產
- 一般原則:「**改品牌 = 改的不只 favicon**」 — 任何寫死在 HTML / JS 內的圖都要一起改

**#27 AI 生圖 logo 是 RGB 白底,當 app icon 在深色背景露白角(V5.9.2 修)** ✅
- 症狀:V5.9.1 換上 MDT logo 後,個管師回報 sidebar / 登入頁的 logo「圖示不是透明邊角,會有很醜的白邊」
- 根因:Gemini(及多數 AI 生圖)輸出的 PNG 是 **RGB 模式無 alpha**,圓角方形 logo 的四個角是**白色**(生圖時的白背景填充)。深色 sidebar(#3A4550)上,方形圖四個白角露出來
- 為什麼不能簡單去背:logo 主體(身影、桌面、MDT 字)**全是白色**,用「白色→透明」會把主體也挖掉
- 修法:Pillow 圓角遮罩 — `ImageDraw.rounded_rectangle` 畫遮罩,`im.putalpha(mask)`,只把圓角**外**變透明,圓角**內**全保留。18% 圓角 = iOS/Android app icon 標準圓潤度
- **apple-touch-icon 特例**:iOS 會自己在 apple-touch-icon 上加圓角遮罩。若圖已透明圓角,iOS 加遮罩時透明區會變黑/裝置背景色。所以 apple-touch-icon 要做成「**霧藍底滿版不透明**」(填 logo 背景色到四角),讓 iOS 自己切圓角
- 教訓:AI 生圖的 logo 拿來當 app icon 前,先檢查是不是 RGB 白底;是的話用圓角遮罩切透明(深色背景才不露白角),或在生圖 prompt 就要求透明背景
- 預防:換 logo 後 `python3 -c "from PIL import Image; im=Image.open('favicon/android-chrome-192x192.png'); print(im.mode, im.getpixel((1,1)))"` — 若 mode=RGB 或角落 alpha≠0,要處理透明

**#51 資料累積寫在「使用它的地方」之後 → 按鈕永遠不出現(V5.26.2 修)** ✅
- 症狀:個管師勾了「產出時包含病程時序圖」,但產出的 HTML 投影片**沒有 📈 病程時序按鈕**
- 根因:V5.25.0 把時序圖從「產獨立投影片」改成「按鈕 + 新分頁」時,**沒把資料累積那段往前搬**。原本那段寫在 `slides.push()` 之後是對的(它本來就是在產投影片),但改成按鈕後,`_nTl` 必須在**組裝按鈕之前**算好
- 實際行為(比想像更隱蔽):`var _nTl` 有**變數提升**,所以組按鈕時它是 `undefined` → `undefined>0` 為 false → 不出按鈕;而且 `var` 是函式作用域,第 2 個個案會拿到第 1 個個案的殘值 → **錯位**
- 位置驗證(修前):組按鈕 pos 494943 < slides.push 495361 < `_nTl` 賦值 497037
- 做法:把整段搬到 `_pushImgWin` 系列旁邊(組按鈕之前)
- **我在 V5.15.0 為了同樣理由寫過註解「先累積再組按鈕」,這次改時序圖時卻漏掉了**
- 更值得記的是**驗證方式的盲點**:當時的驗證只檢查「字串存在」與「語法正確」,兩者都通過 —— 但**執行順序錯誤既不是語法錯誤,也不會讓字串消失**。凡是「A 要在 B 之前算好」的相依,驗證就必須比對兩者的**位置或實際執行結果**,不能只檢查存在性
- 已補的驗證:比對 `_nTl` 賦值 / 組按鈕 / `slides.push` 三者的位置順序,並用 node 端到端模擬三種個案(沒勾、勾了有事件、勾了無事件)

**#49 視覺演算法補上資料裡沒有的臨床語意(V5.26.0 修,外部審稿 P0)** ✅
- 症狀:病程時序圖把「全身治療軌的相鄰事件」自動用箭頭連起來 —— `Lenvatinib ●────→ HAIC`
- 問題:資料只有 `date`/`type`/`label`,**沒有 `endDate`、沒有療程銜接關係**。但這個箭頭會被醫師讀成「Lenvatinib 持續到 5/22」或「HAIC 是它的後線」→ **臨床誤導**
- **最值得記的是:我在同一個檔案的註解裡寫了「絕不推論疾病狀態、因果、治療反應」,卻用視覺畫出了因果**。我當時只想到「不從 label 自由文字推論」,沒想到「從結構化欄位的相鄰關係推論」也是推論
- 做法:直接移除該段自動連線。只有資料加入 `startDate`/`endDate` 或 `duration` 後,才允許畫真正的 treatment bar
- 教訓:**「不推論」的界線要涵蓋視覺,不只涵蓋文字解析**。判準:這條線/這個形狀,在資料裡有對應欄位嗎?沒有就不能畫

**#50 為了防重疊而移動節點 → 圖上距離不再代表時間(V5.26.0 修,外部審稿 P0)** ✅
- 症狀:timeline 用 `layout(list,240)` 強制相鄰事件至少隔 240px。實際相差 3-4 天的四筆治療(05/22、05/26、05/29、06/02),在圖上被推成等距 240px
- 問題:**這比標籤重疊嚴重得多** —— timeline 的根本性質就是「水平距離 = 時間距離」,推開節點等於毀掉這個性質
- 我當初這麼做,是為了解決個管師說的「標籤一定要清楚」。**但我解錯了層次**:該讓的是標籤,不是節點
- 做法:node 永遠 `xOf(ms(date))`;label 用「上下錯層 + 引線(leader line)連回節點」避讓;而且 **stagger 只在真的會碰撞時啟用**(不是 `qi%2` 的固定樣式)
- 實測驗證:10 個節點全部落在精確日期座標(05/22→1294、05/26→1328 差 34px = 4 天,忠實反映)
- 教訓:**視覺化的「不可協商屬性」要先辨識出來**。timeline 的不可協商屬性是「位置=時間」;長條圖是「長度=數值」。避讓、美化都不能碰這個屬性,只能動其他部分(標籤、顏色、層次)

**#48 模板字串裡寫 JS,`\n` 會被吃掉變成真換行 → 產出的 JS 語法錯誤(V5.24.2 修)** ✅
- 症狀:HTML 投影片的影像按鈕**有顯示張數,但點了完全沒反應**
- 根因:`extraJs` 是**模板字串(反引號)**,裡面寫的 `\n` 會被 JS 當成**跳脫序列 → 變成真的換行字元**,而不是保留成 `\` + `n` 兩個字元。結果產出的 HTML 裡:
  - `.replace(/\n/g,'<br>')` 變成 **regex 中間斷行** → `SyntaxError`
  - `alert('...\n...')` 變成 **字串跨行** → `SyntaxError`
- **一個語法錯誤讓整個 `<script>` 區塊都不執行** → `window.openImgWindow` 從未被定義 → 按鈕的 onclick 找不到函式 → **靜默無反應**
- **反查方法(值得記住)**:拿使用者的實際產出檔,`re.findall(r'<script[^>]*>([\s\S]*?)</script>')` 抽出每個 script 區塊,逐一 `node --check`。這次一次就定位到「產出檔第 78 行、regex 斷行」
- 做法:模板字串內所有要保留成字面量的反斜線都要加倍 —— `/\n/g` 寫成 `/\\n/g`、`'\n'` 寫成 `'\\n'`
- **同一版的診斷程式碼也踩了同一個坑**:V5.24.1 為了診斷加的 alert 訊息也用了 `\n`,一起修掉
- 教訓:**「產生程式碼的程式碼」要多一層跳脫意識**。判斷準則:這段字元最後要出現在**產出檔**裡,就要問「它在中間經過幾層字串?」每經過一層引號/反引號,反斜線就要加倍一次
- 驗證方法(已固化):把 `extraJs` 模板字串抽出來用 node **實際求值**,再對求值結果 `node --check` —— 光檢查 index.html 本身的語法**抓不到這種錯**(index.html 是合法的,錯的是它產出的東西)

**#46 不同入口各自建立同一種物件 → schema 分岔(V5.21.0 修,外部架構審稿①)** ✅
- 症狀(**已實際發生,不是理論風險**):`case` 物件在多處各自用物件字面量建立,實測比對發現
  **JSON 匯入建立的 case 缺 `flags` / `pathologyImages` / `surgicalImages` 三個欄位**
- 更值得記的是:CLAUDE.md 的 **V5.10.1 紀錄寫著「匯入補 flags」** —— 表示當時**只補了讀取端(讀 `d.flags`),沒補建立端**。一個欄位補一半,持續了 11 個版本沒被發現(因為渲染端到處 `||[]` 防禦,不會炸,只會靜靜地少東西)
- 做法:建 `createCase(cid,data,opts)` / `createItem()` 單一工廠,**同時負責 default 與 normalize**(給空物件得到完整空白 case;給匯入資料則補齊缺漏、修正型別)。所有入口改走工廠
- **關鍵:不為統一而抹平行為差異** —— 手動新增會帶癌別預設科別、匯入不帶,用 `opts.withDeptDefault` 區分;markers 去重是匯入專屬的業務邏輯,留在呼叫端不進工廠
- 加 `assertCaseSchema(c)` 自我檢查(匯入後 console 警告缺欄位),把「靠人記得補欄位」變成「程式自己發現」——同 `_assertConfigConsistency`(坑 #36)、QA 預檢(V5.19.0)的思路
- 教訓:**「補欄位」要同時補「建立端」與「讀取端」**;而更根本的解法是讓物件只有一個建立入口。判斷是否該抽工廠的準則(外部審稿的話,值得記住):**「不是看到重複就抽;是看到重複已經造成資料不一致才優先抽」**

**#47 抽 accessor 時,唯讀路徑不能跟著換(V5.21.0 的自我節制)** ⚠️
- 背景:系統有 57 處直接寫 `S.meeting.sections[cid]…`,審稿建議抽 `getSection()` 系列
- **但不能全部替換**:`getSection()` 內含 `ensureSec()`,若把「唯讀渲染」「存在性檢查」「migration」也換成 accessor,會**意外建立原本不存在的 section**,改變語意(原本「不存在就是不存在」變成「一讀就被建出來」)
- 做法:**只替換 mutation / CRUD path**(本版換 8 處),渲染與 migration 維持原樣(剩 55 處刻意保留)
- 教訓:**抽 accessor 時要先分類呼叫端**。有副作用的 accessor(如內含 ensure)只能用在「本來就會寫入」的路徑;唯讀路徑用它會產生幽靈資料

**#43 同一件事兩條 code path → 修一條漏一條(V5.20.0 重構,外部架構審稿①)** ✅
- 症狀:圖片「找檔」有兩份實作 —— 編輯畫面預覽走全域 `_imgGetFile()`,HTML 產出走 `genHTMLSlides()` 內的 `_getFileByEnum()` + 自行處理 subFolder。**同一張圖走兩條路**
- 這正是**坑 #31 的成因**:當時修好含括號檔名的問題,只修到預覽那條,產出那條沒改 → 「預覽看得到、產出卻少一張」
- 做法:產出端刪掉自己那份,統一呼叫全域 `_imgGetFile(name,subFolder)`;另抽 `_fileToDataUrl(file)`(原本兩端各寫一份 FileReader)
- 教訓:**「同一件事有兩個入口」時,要先合併再修 bug**。判斷方法:grep 這件事的關鍵字(如 `getFileHandle`),若出現在兩個以上的函式裡,就是候選

**#44 同一功能兩套演算法(V5.20.0 重構,外部架構審稿③)** ✅
- 症狀:`imgMove`(◀▶ 按鈕)用 **swap** 交換兩元素、`imgReorder`(拖曳)用 **splice** 整段搬移
- **移一格時兩者結果相同,所以不是現行 bug** —— 但概念不一致,而且 swap **跨多格會錯**:`A B C D` 把 D 移到最前,splice 得 `D A B C`(對)、swap 得 `D B C A`(錯)
- 做法:抽 `moveArrayItem(arr,from,to)` 單一搬移原語 + `_moveImage()` 共同核心(含分頁線跟位置走、重繪),`imgMove`/`imgReorder` 各縮成一行
- 教訓:**「現在結果碰巧相同」不代表安全**。兩套演算法只要使用情境擴大(這裡是「拖曳跨多格」)就會分岔;而且維護者會誤以為兩邊等價

**#45 用 monkey patch 繞過「功能與副作用綁死」(V5.20.0 重構,外部架構審稿⑥)** ✅
- 症狀:`buildSlidesHTMLOnly()` 為了「只產生 HTML 不下載」,**把 `document.body.appendChild` 換掉**以攔截下載用的 `<a>`
- 根因:`genHTMLSlides()` 把「產生」與「下載」綁死,想要只做前者只能從 DOM 層攔截。patch 期間**任何**其他 appendChild 都會經過那層,side effect 風險高
- 做法:`genHTMLSlides(opts)` 加 `download`/`silent` 兩個參數;無參數呼叫維持原行為(既有按鈕零影響),`buildSlidesHTMLOnly` 改成 `genHTMLSlides({download:false,silent:true})`。順帶淘汰 V5.19.0 為了同樣目的加的全域旗標 `window._slidesSilent`
- 教訓:**需要 monkey patch 通常是「函式做太多事」的訊號**,正解是把副作用抽成參數,不是從外部攔截

**#42 key 缺少唯一識別 → 改日期會覆蓋另一場會議的資料(V5.19.1 加防護)** ⚠️(未根治,以防護擋住)
- 症狀:合併會議改日期後儲存,若新日期已有「另一場同癌別」的會議,**那場的 section 會被直接覆蓋**
- 根因:section key 是 `mdt_sec_{癌別}_{日期}`,**沒有會議 ID** → 兩場不同會議只要癌別與日期相同就共用同一個 key
- 三種情境實測結果:
  - **單癌別會議**:sections 跟著 `mdt_m_*` 走,不碰 `mdt_sec_*` → 改日期完全安全
  - **合併會議改成空日期**:資料完整,但**舊 key 變孤兒**留在 localStorage
  - **合併會議改成已有同癌別會議的日期**:🔴 **覆蓋對方資料**
- 做法(**刻意不改 key 結構**):(1)`openMtgRecord` 記 `m._loadedDate`,儲存時比對得知日期被改過;(2)改過就查 `getIdx()` 有無「別場、同日、癌別交集」的會議,有就明確警告並讓使用者決定;(3)**確認新 key 全部寫入成功後**才 `delSec` 清舊日期孤兒(順序不可反,否則寫入失敗會兩邊都沒有)
- **為什麼不改 key 結構**:改成 `{meetingId}_{癌別}` 要寫 migration 搬移三台主機上所有歷史會議的 section,**只有一次機會跑對**,而專案沒有自動化測試、也無法在真實資料上預演。防護版擋掉唯一會真正弄丟資料的路徑,成本與風險都低得多
- 教訓:**當 key 由「業務欄位」組成而非唯一 ID 時,任何業務欄位可被編輯就等於 key 可變** —— 要嘛 key 用不可變的 ID,要嘛在編輯該欄位時做衝突偵測。這裡選後者是因為 migration 風險大於收益,但這是**權衡不是最佳解**,若未來真的出現同機同日同癌別多場的需求,還是要回頭改結構

**#39 把「版面結構」存成「元素屬性」→ 排序時結構跟著跑掉(V5.18.1 修,外部審稿 P1)** ✅
- 症狀:設好「第 1 頁 2 張、第 2 頁 4 張」後,只是把某張圖拖到別的位置,**整個版面結構就變了**(2+2 變成 3+1)
- 根因:`pageBreak` 存在**圖片物件**上,排序時圖片物件被搬走,分頁線跟著跑。但分頁線的語意是**版面結構**(這頁幾張),拖曳的語意是**換內容** —— 兩者綁在一起使用者無法預測
- 做法:不動 schema,改在排序前後做轉換 —— `_snapBreaks(list)` 記下分頁線的**位置索引**,排序後 `_applyBreaks(list,idxs)` 把分頁線套回**相同位置**。**換的是圖片,分頁線留原位**
- 附帶解決 P3:`_applyBreaks` 套回時跳過 index 0,`imgMove` 原本缺的 normalize 自動補上(原本只有 `imgReorder` 有做)
- 實測:`A B|C D` 把 D 拖到 B 前 → 舊行為 `A D B|C`(結構亂)、新行為 `A D|B C`(維持 2+2)
- 教訓:**「屬於位置的資訊」不要存在「會被移動的物件」上**。判斷準則:如果這個屬性描述的是「元素之間的關係/版面結構」,它就該跟位置走;只有描述元素本身的才該跟著元素

**#40 資料層統一了但 view layer 留一條舊路徑(V5.18.1 修,外部審稿 P1)** ✅
- 症狀:V5.17/V5.18 加的排序 ◀▶、拖曳、⏎ 分頁點、一鍵排版、已選 N/上限 —— **乳攝全部沒有**
- 根因:`IMG_KINDS.mammo` 早在 V5.16.0 就備妥,但 `buildMammoImgArea()` 仍是**獨立的舊 renderer**,沒走 `buildGenericImgArea()`。其他四種都走了,只有乳攝沒有 → **底層統一了,UI 沒把入口 render 出來**
- 這是**坑 #37 的直接重演**(「四種一起改,乳攝忘了」)—— 而且更隱蔽,因為註冊表已經有 mammo,看起來像已經統一
- 做法:`buildMammoImgArea` 收斂成呼叫 `buildGenericImgArea`,只保留乳攝專屬的 `maxImgs:6` 與資料路徑(由 `IMG_KINDS.mammo.get` 處理)
- 教訓:**「已加進註冊表」≠「已走共用路徑」**。重構後要驗證的不是「註冊表有沒有這一項」,而是「**呼叫端是不是真的走共用函式**」—— 用 grep 確認每個 build*Area 都 return buildGenericImgArea

**#41 新模型上線但舊模型沒拔乾淨 → 雙真相來源(V5.18.1 修,外部審稿 P2)** ✅
- 症狀:特殊議程的編輯畫面可以設 ⏎ 分頁點,但**產出的 HTML 完全不理會**,仍照舊的 `sp.imgsPerSlide` 固定每頁 N 張排版
- 根因:V5.18.0 把個案圖片升級成 pageBreak 模型,但特殊議程的**輸出端**還是舊的 imgsPerSlide;而編輯端因為走了共用 `buildGenericImgArea`,又能產生 pageBreak → 「**畫面看到 A、輸出卻按照 B**」
- 做法:輸出端改用 pageBreak 分組。**舊資料相容**:若圖片都沒有 pageBreak 但有 `sp.imgsPerSlide`,自動依舊值換算成等效分頁線(`j%n===0`),既有排版不變
- pageBreak 是 imgsPerSlide 的**超集合**(能表達 2+4、1+2+4,不只 4+4+4),所以統一到 pageBreak 是正確方向
- 教訓:**升級資料模型時,舊模型要一次拔乾淨**。新舊並存時,只要有任一路徑還讀舊欄位,就會出現「畫面與輸出不一致」;而且這種 bug 不會報錯,只會靜靜地產出錯的東西

**#38 用註冊表收斂平行實作(V5.16.0 重構,坑 #37 的解法)** ✅
- 背景:坑 #37 揭露「同一邏輯複製 5 份 → 修 bug 只修到一份」。V5.14.0 先收斂了 preview,但 del/clear/caption 仍各一套,約 **95 行近乎相同的程式碼**
- 分析:五種圖片的差異其實只有 **6 個變數**(資料路徑 / 容器 / DOM id / 重繪函式 / 索引參數名 / 標籤),其餘 100% 相同(`ensureSec` → 找物件 → 改陣列 → `markDirty` → 重繪)
- 做法:建 `IMG_KINDS` 註冊表(單一真相)+ 5 個核心函式 `_imgOwner` / `_imgRedraw` / `imgDel` / `imgClear` / `imgSetCaption`;11 個 handler 各縮成 1-2 行
- **重構鐵律:不在重構中偷改行為**。保留三個真實差異:(1)mammo 巢狀 `c.mammo.images` 要先確保 `c.mammo` 存在;(2)special 掛 `sections[cid].special`(非 cases)且重繪用 `innerHTML`(其他用 `replaceWith`)→ 用 `mode` 旗標;(3)各自的 confirm 訊息不同,**special 原本就沒有 confirm**(已知缺陷,原樣保留並回報使用者,由他決定要不要補)
- 順帶強健化(非行為改變,是防禦):`imgDel` 加 `if(!list||!list[j])return`(原本 `c.pathologyImages.splice()` 若欄位不存在會拋例外);`_imgKindByField` 查不到回 null 不動作(原本會靜默寫進錯陣列)
- **選保守方案**(HTML 的 `data-action` 名稱不變,只收斂 handler 內部):這專案沒有自動化測試,大範圍改 HTML 產生器風險高;保守方案已拿到 90% 維護價值(邏輯單一、修 bug 不漏改)
- 教訓:**發現「同樣的事做了 N 遍」時,先建註冊表再改邏輯**,不要一份一份修。註冊表的價值不只是省行數,而是「新增類型只要加一列」+「修 bug 只改一處」

**#37 同一邏輯複製 N 份 → 修 bug 只修到其中一份(V5.14.0 揭露並修,坑 #31 的延伸)** ✅
- 症狀:V5.11.4 修好坑 #31(含括號檔名預覽失敗)後,個管師用**病理影像/手術照片/乳攝/特殊議程**的括號檔名**還是預覽不了** — 因為當時只修到「相關影像」那一處
- 根因:系統有 5 種圖片,每種都有自己一套 preview 實作(`previewpathimg`/`previewsurgimg`/`previewrelatedimg`/`previewmammoimg`/`previewspecialimg`),**同一個邏輯複製 5 份**。修 bug 時只改了觸發回報的那一份,其餘 4 份原封不動
- 而且 5 份**全都沒處理 `subFolder`**(子資料夾的圖一律預覽失敗),但產投影片的 `_loadImgsToCache` 有 → 「編輯畫面看不到,但投影片印得出來」的詭異落差
- 做法:抽出統一核心 `_imgGetFile(name,subFolder)`(getFileHandle → 失敗改列舉比對 → 支援子資料夾)+ `_imgPreview(img,label)`,5 個 handler 全部收斂成一行呼叫;HTML 端 4 處按鈕補 `data-subfolder`
- **盤點數據**:圖片相關 `data-action` 共 **23 個**,其中 preview/del/clear **各重複 5 套**
- 教訓:**「複製貼上的平行實作」是 bug 的溫床** — 不是因為寫錯,而是因為**修對了但漏改**。凡是發現「同樣的事做了 N 遍」,修 bug 前要先 grep 有幾份,要嘛全改、要嘛先收斂再改
- 跟坑 #29(寫死區塊名稱)同源:都是「該一起改的地方沒一起改」

**#34 用 UTC 日期當「今天」→ 台灣早上會錯一天(V5.13.6 修,審稿 P1)** ✅
- 症狀:MDT 早上 7:30 開會時,新建會議的預設日期變成**昨天**;而且「只能建今天或未來」的檢查會把今天的會議**擋掉**;行事曆「今天」高亮也標錯格
- 根因:`new Date().toISOString().slice(0,10)` 取的是 **UTC 日期**。台灣 00:00~07:59 對應 UTC 前一天 16:00~23:59 → 算出前一天。MDT 早上 07:30-08:30 那幾場**正好落在錯誤區間**,不是理論問題
- 做法:建 `todayTaipei(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});}` — **en-CA locale 剛好輸出 ISO 格式 YYYY-MM-DD**,可直接跟會議 date 字串比較(不能用 zh-TW,那會輸出 `2026/8/13` 破壞字串比較);5 處全部替換
- 實測:台灣 8/13 07:30 → 舊寫法 `2026-08-12`(錯)、新寫法 `2026-08-13`(對)
- 教訓:**跨時區的「今天」必須明確指定時區**。`toISOString()` 永遠是 UTC,只要使用者在 UTC+N 且早上使用,就會錯一天。系統其他地方(NAS)早就用 Asia/Taipei,只有這幾處漏掉 — **同一個概念要有單一函式**,不要各處自己算

**#35 預設值與選項清單不一致 → select 找不到 option 存成空值(V5.13.6 修,審稿 P1)** ✅
- 症狀:某些癌別新建會議時,地點欄位是空的(明明有預設值)
- 根因:`DEFAULT_C` 的 `loc` 預設值與 `DEFAULT_LOCS` 選項清單**字串不完全相同** — 消化道/肝膽胰寫 `彰濱-1F  人文會議室`(**雙空格 + 名稱不同**),泌尿寫 `彰濱-7F  愛書人會議室`(雙空格)。`<select>` 是 exact match,對不上就沒有選中的 option → 存空值
- 有趣的是:系統早就有 migration 表 `{'彰濱-1F  人文會議室':'彰濱-1F 人文藝術館會議室'}` 要修正舊資料,但 **`DEFAULT_C` 的預設值本身沒跟著改** — 修了資料沒修來源
- 做法:3 處 loc 改成與 DEFAULT_LOCS 完全一致;並加 `_assertConfigConsistency()` 啟動時檢查(每個癌別的 loc 都要在 DEFAULT_LOCS 中)
- 教訓:**改資料的 migration 時,要同時檢查「產生這些資料的預設值」有沒有一起改**,否則新資料會繼續產生舊問題。這跟坑 #29/#31 同源:改一處沒 grep 全部相關處

**#36 對照表與實際 ID 脫節 → 靜默 fallback(V5.13.6 修,審稿 P1)** ✅
- 症狀:部分癌別的英文檔名變成完整中文 ID(如 `digestive` 而非 `GI`)
- 根因:`CANCER_EN_CODES` 還用**舊癌別 ID**(`blood_lymph`/`chest`/`gi`/`hbp`/`gu`),但實際 ID 早已改為 `lymphoma`/`thoracic`/`digestive`/`hepatobiliary`/`urology`。查表 `CANCER_EN_CODES[id]||id` 查不到就 **fallback 成 id 本身,不報錯**
- 做法:更新 5 個舊 ID;加 `_assertConfigConsistency()` 檢查「DEFAULT_C 每個 id 都要有英文代碼」,啟動時 console 警告
- 教訓:**`x[k]||fallback` 這種寫法會讓「表過期」變成靜默降級**,沒人發現。凡是「ID 對照表」都該有自動一致性檢查 — 這是審稿建議中最划算的一項(一個函式擋住未來所有同類問題)

**#32 clearTestData 用「有無 cids」判斷測試資料 → 幾乎刪光全部會議(V5.13.5 修,審稿 P0)** ✅
- 症狀:「清除測試資料」按鈕寫著「真實資料不受影響」,實際上 `idx.filter(m=>m.cids?.length)` 把**所有有癌別的會議**都當測試資料,而真實會議本來就有 cids → 等於刪光;更慘的是接著 `removeItem('mdt_idx')` 直接清空整個索引
- 根因:沒有真正區分 test/production。程式碼註解自己都寫 `fallback: clear all meetings` — 這是「還沒實作標記,先全刪」的半成品,卻掛在正式功能上
- 做法:(1)`generateTestData` 生成時打 `m.isTestData=true`;(2)`saveLocal` 的 idx entry 帶 `isTestData`(一般會議沒這欄=undefined);(3)`clearTestData` 只刪 `isTestData===true`、逐筆從 idx 移除(不清空整個 idx)、加第二道保護「顯示 X 測試/Y 正式,沒測試就不刪」
- 教訓:**破壞性操作(刪除)絕不能用「間接特徵」猜測要刪什麼**(這裡是拿「有無 cids」猜測試/正式)。要有明確標記。「fallback 先全刪」這種半成品不該進正式功能 — 寧可不做也不要做成會誤刪
- 呼應專案「極度謹慎刪除」原則:刪除前要能明確回答「我要刪的是哪幾筆、為什麼」,並顯示給使用者確認

**#33 NAS 寫入/備份失敗被 catch 吞掉、謊報成功(V5.13.5 修,審稿 P0)** ✅
- 症狀:`writeMtgToNAS` 的 `catch(e){console.warn(e)}` 把錯誤吞掉照常 return,呼叫端 `results.pushed++` 不管真假 → 個管師看到「同步成功」但 NAS 其實沒寫進去。`backupToNAS` 同理:失敗也 resolve → 呼叫端 `_markNasBackupToday()` 照標記「今日完成」→ 當天不再重試
- 根因:async 函式把錯誤 catch 掉但**不回傳成敗**,呼叫端無從得知真實結果,只能假設成功
- 做法:(1)`writeMtgToNAS` 回傳 `{ok:boolean,error}`,呼叫端只在 ok 才 `pushed++`,失敗記 `results.failed`;(2)`backupToNAS` 回傳 boolean,呼叫端只在 true 才 `_markNasBackupToday`;(3)`syncWithNAS` 的 results 加 failed 計數,有失敗就 showSaveToast 警告
- 教訓:**「錯誤被 catch 但不回傳」= 靜默謊報成功**,在資料備份場景是資料可靠度問題(比沒功能更危險,因為給假的安全感)。async 操作的成敗必須沿呼叫鏈往上傳,不能在中途吞掉
- 這是坑 #29(無聲失敗)的變體:一個是「條件沒涵蓋 → 無聲不產出」,一個是「錯誤被吞 → 無聲謊報成功」,都是狀態沒誠實回報

**#31 檔名含括號等特殊字元 → getFileHandle 找不到檔 → HTML 影像破圖(V5.11.4 修)** ✅
- 症狀:HTML 投影片影像頁**破圖**(只顯示破圖 icon + alt 文字如 `CT(20250401)`),個管師實測**把檔名括號拿掉就正常**
- 根因:`_scan.getFileHandle(img.name)` 對含 `(` `)` 等特殊字元的檔名(`CT(20250401).jpg`)可能直接比對失敗(不同瀏覽器/OS 對檔名正規化不一致)→ 讀不到檔 → `_pathImgCache` 沒值 → `src=img.dataUrl||_pathImgCache[key]||''` 得到空字串 → 破圖
- 做法:加**退回機制** `_getFileByEnum(dirHandle,fname)` — 先試 `getFileHandle`,失敗就**列舉資料夾** `for await(const ent of dirHandle.values())` 逐一比對 `ent.name===fname`,繞過直接比對
- 兩處都要修:(1)`_loadImgsToCache`(產投影片的預載);(2)`previewrelatedimg`(編輯畫面的「預覽」按鈕,原本也是直接 getFileHandle)
- 順手:3 處 `alt="'+(img.caption||'')+'"` 改用 `escA()`(caption 若含引號會破壞 HTML 屬性)
- 教訓:**File System Access API 的 `getFileHandle(name)` 不是萬能** — 檔名含特殊字元時要有列舉退回。個管師的檔名習慣(日期加括號)是完全合理的,不該要求他們改檔名遷就程式
- 預防:測試檔名含 `()` `[]` 空格 `&` 的情境

**#30 從診斷文字猜癌別子群沒限定癌別 + regex 太寬(adrenal 含 renal)→ 標籤誤判(V5.11.3 修)** ✅
- 症狀:做**肝膽胰癌** HTML 投影片,個案診斷是 HCC(肝細胞癌),但投影片右上角癌別標籤顯示**「腎臟癌」**
- 根因(兩個疊加):
  1. `getSubGroup(c)` 是給**泌尿道癌**分子群(膀胱/攝護腺/腎臟/輸尿管/睪丸)用的,但**沒限定癌別,對所有癌別都跑** → 肝膽胰癌也被拿去猜泌尿子群
  2. `/renal/` regex 太寬 → 診斷含 `right ad**renal** metastasis`(右腎上腺轉移),**adrenal(腎上腺)含 renal 字串** → 命中「腎臟癌」。腎上腺是內分泌器官,不是腎臟
  3. L6175 標籤用 `getSubGroup(c)||ca.name` → 猜到腎臟癌就蓋掉真癌別名(肝膽胰癌)。**即使 useSubGroups=false 不啟用分組頁,這個標籤仍單獨呼叫 getSubGroup** → 顯示錯
- 修法(兩層防護):(1)`getSubGroup` 開頭加 `if(cid!=='urology')return null` — 非泌尿道癌根本不猜;(2)regex 改 `/(^|[^d])renal|.../ ` + `腎(?!上腺)` 排除 adrenal / 腎上腺
- L7610 的 genImportPrompt 子群判斷**本來就包在 `caId==='urology'` 分支內是安全的**,但順手把 renal 也改一致(雙保險)
- 教訓:**「從自由文字猜結構化欄位」很危險** — 醫學縮寫互相包含(adrenal⊃renal、rec⊃...),regex 要加邊界;而且這種猜測要**限定在相關範圍才跑**(只有泌尿道癌才需要猜泌尿子群)
- 呼應 JSON 匯入的鐵律「absent 欄位留空、不推斷」— 能不猜就不猜,要猜就限定範圍 + 嚴格邊界
- 預防:regex 判斷醫學名詞時,測試「包含子字串的更長詞」(adrenal/renal、hepatic/hepatocellular)

**#29 新資料區塊沒同步加進「圖片預載迴圈」→ HTML 投影片整張不產出(V5.11.2 修)** ✅
- 症狀:個管師輸入了「特殊議程」(含影像),按 HTML 投影片產出後**完全不顯示特殊議程**,連錯誤訊息都沒有
- 根因:`buildSlidesHTMLOnly` 的資料夾圖片預載迴圈**寫死只跑 `cases`**:
  `for(const c of (m.sections[cid]?.cases||[]))` — 載 `c.pathologyImages/surgicalImages/images/mammo.images`
  但特殊議程存在 `sections[cid].special`,**不在 cases 裡** → `sp.images` 從沒進 `_pathImgCache`
- 連鎖失效(這是最難查的部分,失敗是**無聲的**):
  1. `src=img.dataUrl||_pathImgCache[key]||''` → 空字串
  2. `if(!src)return''` → 該圖被丟掉
  3. `.filter(Boolean)` → 圖陣列變空
  4. `if(!_sImgH.length)continue` → **整張投影片直接不產出**(不是產出空白,是根本沒有)
- 而且 `_needsFolder`(判斷要不要跳「授權資料夾」對話框)**也只檢查 cases** → 若只有特殊議程有圖,**連授權都不會問**,cache 必空
- 做法:(1)載圖邏輯抽成 `_loadImgsToCache(imgs)` 共用函式;(2)迴圈改成 cases 跑完再跑 `_sec.special`;(3)`_needsFolder` 加 `_hasFolderImg(sp.images)` 檢查
- 教訓:**「加了新資料區塊」時,要 grep 所有「按區塊迭代」的地方**,不能只加渲染邏輯。這次特殊議程的**渲染**程式碼(L6316/6362/6425/6514)一直都在,壞的是**上游的資料預載** — 渲染再完整,資料沒進來就是不產出
- 跟坑 #19(followupHTML 寫死 'cases')同源:**寫死區塊名稱**是這個專案的慣性錯誤。凡是 `sections[cid].xxx` 的迭代,都要問「這裡該不該也跑 special / team / events / followups?」
- 預防:改圖片相關邏輯後,測試**「只有特殊議程有圖」**的情境(不是只測個案討論有圖)

**#28 用 Python re.sub 注入資料會被解讀跳脫(對齊 Kit V1.21.0 坑 #63,給維護者)** ⚠️
- 症狀:用 Python 改 index.html 時,如果用 `re.sub(pattern, 注入字串, 內容)` 且注入字串含 `\u`(中文 unicode 跳脫)、`\\`、`\1`、`\g<name>`,**repl 參數會被 re.sub 解讀**,導致中文變亂碼、跳脫字元被改寫、或整段毀損
- 這條**不是 MDT 系統內的問題**(MDT 是純 JS,不跑 Python),而是**「我(維護者)用 Python 改 index.html 檔時」的陷阱** — MDT 的 prompt 字串、JSON 範例常含中文跟跳脫字元,拿去當 re.sub 的 repl 會壞
- 做法:**注入資料一律用 `str.replace()`**(不解讀任何字元),不要用 `re.sub`。我這邊改 MDT 多半用 str_replace 工具(等同 str.replace,安全);若寫 Python 腳本批次改,務必用 `content.replace('佔位','資料')` 而非 `re.sub`
- 非用 re.sub 不可時,repl 傳 lambda:`re.sub(pat, lambda m: 注入字串, s)`(lambda 回傳值不被解讀)
- 跟坑 #16(中文檔名)、Kit #43(str_replace 大範圍移位)同源:**字串替換優先用不解讀的 str.replace,少用會解讀的 re.sub**
- 適用範圍:任何「Python 把資料字串注入 MDT 模板」的情境 — 改 prompt、改 JSON 範例、批次替換 CSS 色票等

---



```python
import os
h = open('/home/claude/index.html').read()
import re
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', h)
js = max(scripts, key=len)  # 取最大的 script(主程式)
print("{}:", js.count('{')-js.count('}'))        # 必須為 0
import subprocess
with open('/tmp/check.js','w') as f: f.write(js)
r = subprocess.run(['node','--check','/tmp/check.js'],capture_output=True,text=True)
print("Node:", "OK" if r.returncode==0 else r.stderr[:200])
print("ends </html>:", h.rstrip().endswith('</html>'))
# V4.4.0 加:重複函數檢查(坑 #13)
fns={}
for m in re.finditer(r'function (\w+)\s*\(', h):
    fns[m.group(1)]=fns.get(m.group(1),0)+1
dups=[k for k,v in fns.items() if v>1]
print("重複函數:", dups if dups else "無")
print("函數總數:", len(fns))
# V4.4.0 加:當前版本號進位規則(坑 #14;只檢查 const VERSION,不掃歷史記錄)
m=re.search(r"const VERSION='V(\d+)\.(\d+)\.(\d+)'", h)
if m:
    x,y,z=int(m.group(1)),int(m.group(2)),int(m.group(3))
    print("VERSION:", f"V{x}.{y}.{z}", "✓" if (y<=9 and z<=9) else "⚠️ 進位錯!")
# V4.6.3 加:打包必有 4 份檔 + 4 檔版號一致(坑 #15)
import os
required=['index.html','README.md','CLAUDE.md','USER_GUIDE.md']
missing=[f for f in required if not os.path.exists('/home/claude/'+f)]
print("4 份檔:", "齊全" if not missing else f"⚠️ 缺 {missing}")
if not missing:
    cur=re.search(r"const VERSION='(V[\d.]+)'", h).group(1)
    issues=[]
    # README 最新版本(### V開頭)
    rm=re.search(r'### (V[\d.]+)', open('/home/claude/README.md').read())
    if not rm or rm.group(1)!=cur:issues.append(f"README={rm.group(1) if rm else '?'}")
    # CLAUDE.md 表格首行版號
    cm=re.search(r'\| (V[\d.]+) \|', open('/home/claude/CLAUDE.md').read())
    if not cm or cm.group(1)!=cur:issues.append(f"CLAUDE.md={cm.group(1) if cm else '?'}")
    # 使用說明書 三處標記
    um=open('/home/claude/USER_GUIDE.md').read()
    um_versions=set(re.findall(r'V\d+\.\d+\.\d+', um[:300]+um[-300:]))  # 只看頭尾,避免歷史表格
    if cur not in um_versions:issues.append(f"使用說明書頭尾沒有 {cur}")
    print("4 檔版號一致:", "✓" if not issues else f"⚠️ {issues} (應為 {cur})")
```

版本號命名 V**x.y.z**(嚴格進位,**第二/三碼最大就是 9**):

| 類型 | 規則 | 範例 |
|------|------|------|
| Bug fix | `z+1`,**z 超過 9 → y+1, z=0** | V4.3.5 → V4.3.6;V4.3.9 → V4.4.0 |
| 新功能 | `y+1, z=0`,**y 超過 9 → x+1, y=0, z=0** | V4.3.5 → V4.4.0;V4.9.5 → V5.0.0 |
| 大改版 | `x+1, y=0, z=0` | V4.3.5 → V5.0.0 |

**坑 #14 教訓**:之前長期容許 V4.3.45 這種第三碼超過 9 的寫法,版本號失去語意。從 V4.4.0 開始嚴格進位。看到第三碼 ≥ 10 就是規則錯。

---

## 九之二、使用說明書同步規則(V4.6.3 起)

每次打包必含**四檔**:`index.html`、`README.md`、`CLAUDE.md`、`USER_GUIDE.md`

**鐵律 — 即使本版只修 bug、說明書內容沒變,版本標記也要更新**:
- 使用說明書頭部 `> 版本對應:**Vx.y.z**(YYYY/MM)`
- 使用說明書第九節標題 `## 九、本版新功能(Vx.y.z)`
- 使用說明書最後一行 `*文件版本:Vx.y.z · YYYY/MM*`
- 第九節「過去 6 版回顧」表格加新行

**理由**:使用者看到說明書版號 = 實際部署版號,才知道這份是不是最新。三處同步靠人記會壞,靠打包驗證腳本強制(坑 #15)。

**新功能版本怎麼寫第九節**:
- 用使用者語言寫,不要寫「`moveDept(dept,dir)` 重排 DRS」這種程式術語
- 寫「您可以這樣做」「典型情境」「常見問題」
- bug fix 版只更新版本標記、第九節新增一行說明改了什麼;不必動其他章節

---

## 九之三、SELA Starter Kit 對齊狀態(V4.8.0 起;V5.10.5 升至 V1.21.0)

本專案已對齊 **SELA Starter Kit V1.21.0**(對齊歷程:V4.8.0→V1.6.0,V4.8.2→V1.7.1,V5.8.8→V1.15.0,V5.10.2→V1.18.0,V5.10.5→V1.21.0)。每次升版都應檢查是否仍符合:

| 規範 | 對齊方式 | 注意 |
|------|---------|------|
| zip 檔名格式 | `MDT V<x.y.z>.zip`(空格,非底線) | 打包時直接用 `zip MDT\ V4.8.0.zip ...` |
| 必含 `.gitignore` | 已加,擋 `.DS_Store` / 機密 / 暫存區 | 新加目錄時記得評估是否需要忽略 |
| **雙軌品牌 logo**(V1.15.0 §9 共存規則,V5.9.0 起)| favicon / PWA / apple-touch / android-chrome = MDT 主 logo;右下角 `sela-credit` 微標 = SELA logo(`favicon/sela.svg`)| favicon-32x32.png 已是 MDT 不是 SELA — 右下角微標**必須**改引用 sela.svg 才能保留 SELA 品牌存在 |
| favicon/ 套組 | 9 檔:5 PNG + favicon.ico + mdt-1024.png + sela.svg + site.webmanifest | 備份 `favicon-sela-backup/` 保留原 SELA 套組,萬一需要回退 |
| 介面色選擇(V1.8.1+) | `theme-color` 跟 `theme_color` in manifest 同步用 `#5A7A8B`(醫療型) | **不是** SELA 橘!Kit V1.8.1 起的分離鐵律;醫療型避免橘色警示聯想 |
| 系統 UI logo | 右下角 fixed `<a id="sela-credit">` 引用 `favicon/sela.svg` | 樣式 `opacity:.42`,hover 放大;不擋 UI |
| **回流通道**(V4.8.1 起) | `SELA-handoff.md` 在專案根目錄,跟 zip 一起交付 | 重大版本完成後更新內容,讓 SELA 升 Kit 用 |
| **鐵律 #0 handoff 評估**(V1.8.1 起) | 完成版本前走 handoff 評估:符合條件(重大版/≥3 坑/≥2 技術決策/距上次 ≥5 小版/Kit 對齊)就產出,否則最終回報明寫「本版跳過 handoff,因為 X」 | 「默默不做」= 違反鐵律 #0 |
| HTML 分享 repo | `Sela1227/MDT-slides` 子資料夾 **`slides`**(L4389/L4391) | ⚠️ Kit V1.18.0 §8 寫子資料夾是 `Share`,但 **MDT 實際用 `slides`** — 屬坑 #40「✗ 不做」級(改 Share 會讓舊連結失效);已回流建議 Kit 更正 |
| **版號進位(V1.20.0 修訂)** | 只有 c(第三碼)逢十進位;b 可超過 9 | MDT V5.10.x 的 b=10 合法,不進位 a。見坑 #14 的 V5.10.5 澄清 |
| **Python re.sub 注入(V1.21.0 坑 #63)** | 改檔注入資料用 str.replace 不用 re.sub | 見坑 #28(給維護者) |
| **inline SVG gradient id(V1.19.0 坑 #59)** | 多 SVG 共用 id 衝突 | MDT 無 SVG gradient(grep linearGradient=0),不適用 |
| **GitHub Pages PWA(V1.19.0 坑 #60)** | blob manifest 裝不了 | MDT 用實體 site.webmanifest 檔 + 無 SW,已符合 |
| **UI 改名只改顯示(V1.19.0 坑 #61)** | 改名不動程式變數 | MDT 已遵守(V5.8.7 討論要點→方向,變數 discussion 沒動) |
| **拿欄位前查依賴(V1.19.0 坑 #62)** | 刪欄位前查業務邏輯 | 呼應 MDT 極度謹慎刪除原則,已符合 |
| references/ 三參考專案 | flet/cli/static 範本 | MDT 已成熟,不需要(✗ 不做) |
| 三位版本號逢十進位 | 同 #14 規則 | 已對齊 |
| CLAUDE.md 必含五章 | 踩坑 / 業務對映 / 版本歷程 / 下版優先 / 一句話總結 | 已對齊 |
| USER_GUIDE.md 必含 | 我們有,Kit 沒明文要求(MDT 超越) | — |

### ⭐ 主題色「N 處真相清單」(依 Kit 坑 #42,V5.10.2 盤點)

**換主題色時這 5 處要一起改**,否則會像 MapQuiz 那樣「畫面變了但投影片/DOCX 顏色沒變」:

| # | 位置 | 內容 | MDT 實際位置 |
|---|------|------|------|
| 1 | CSS `:root` 變數 | UI 元件色 | `--fog-*` 系列(L25 附近)|
| 2a | **JS 色票:PPTX** | 投影片填色 | `const C={primary:'3A4550',acc:'4A7C8E'...}`(genPPTX,L5228)|
| 2b | **JS 色票:DOCX** | Word 文件填色 | `const C={title:'1E2D3D',dark:'2C3E50'...}`(genDOCX,L5463)|
| 3 | HTML `<meta name="theme-color">` | PWA 啟動色 | `#5A7A8B`(L19)|
| 4 | `site.webmanifest` 的 `theme_color` | PWA 安裝色 | `#5A7A8B`(favicon/site.webmanifest L16)|

> MDT 比 Kit 範例多一處(2a + 2b 兩套 JS 色票),因為投影片跟 Word 各有獨立配色系統。改色時務必兩套都改。

**Kit 內 58 條跨專案坑與 MDT 27 條坑互不衝突,可以互相印證**:
- Kit #20(中文檔名亂碼) ↔ MDT 坑 #16
- Kit #23(JS 大括號) ↔ MDT 坑 #5、#13
- Kit #1(三方對齊) ↔ MDT 坑 #17、V5.10.1 JSON 三方對齊
- Kit #7(打包前驗證) ↔ MDT 打包驗證腳本(節九)
- Kit #42(theme-color N 處真相) ↔ 上方 N 處真相清單
- Kit #57(find 不限深度) ↔ V5.10.2 對齊時解壓 Kit 用 `find -type f` 不限深度 ✓
- Kit #26(script 邊界) ↔ MDT `'</'+'script>'` 寫法

**MDT 不適用的 Kit 坑**(明確記錄,避免未來誤對齊):
- Kit 醫療章 #51(NCCN vs 健保給付雙軌)、#52(健保條文版本日期) — **MDT 是會議管理工具,不涉藥物給付決策**,這兩條不適用
- Kit #53/#54(Railway 部署) — MDT 用 GitHub Pages,不適用
- Kit #44(Vite base) — MDT 是單檔 HTML 無 build,不適用

**未來新對齊項目放這裡**(例如:Kit 升版時新增的規範要對應檢查)


---

## 十、下版優先清單

**按優先序：**

1. **「(8-其他特殊複雜個案)」討論原因快速標籤系統** — 個管師有時要標個案因(如「治療中死亡」「必要提報」),用快速標籤而非每次手動打字
2. **PPTX 升級後個管師回饋觀察期** — V5.10.0 大改版型,個管師實際用幾場會議後可能回報微調(字級、間距、配色、某區塊版型)
3. NAS 同步觀察期:跑 1-2 週後看是否有 tombstone 累積異常 / 衝突情境沒被想到
4. DOCX 微調觀察期:V5.8.5 治療欄樣式 + V5.8.7 改名後,個管師實際用幾場會議後可能還有微調(如灰底色階、縮排幅度)
5. 開會後模式:產出區顯示「今天有 N 場會議」快速入口
6. 設定頁新增「同步狀態」面板:NAS 上有幾筆 tombstone、上次同步時間、衝突歷史

---

## 十一、一句話總結

V5.26.3 時序圖排版四項 + AI 徽章位置修正(個管師提供實際產出截圖,一次暴露四個排版缺陷)。**(⓪ AI 徽章位置)**:V5.23.0 的「AI 匯入待確認」徽章原本插在 `sec-tag-case`(個案討論)與 flags(首次討論等)**中間**,把討論原因標籤推開 —— 它是**狀態標記**不是分類標記,應排在所有分類標籤之後。移到 flags 後。**(① 空疾病軸)**:個管師的頭頸癌個案有病理、手術、PET-CT,但 timeline 裡**沒有任何一筆標成「診斷確立」**,所以疾病軸是空的卻仍佔 126px 並畫一條沒有點的箭頭。**評估後刻意不隱藏** —— 隱藏會讓「該填卻沒填」靜靜消失(同 V5.19.0 QA 預檢、V5.23.0 匯入報告的思路:不讓缺漏消失);改為縮小到 72px、淡虛線不畫箭頭、明確標示「尚無疾病事件記錄(建議補上「診斷確立」等事件)」。**(② 長標籤)**:`Left hypopharynx — moderately differentiated SCC` 被硬切斷 —— SVG text 不會自動換行。加 `wrap2()` 以字元寬估算(中文≈1、英數≈0.55)斷成 2 行、第 2 行超出才截斷加「…」、並用 `<title>` 讓滑鼠移過去看全文。**評估時不選「縮小字級」**,因為那違反 V5.24.0 才剛做的「字級要夠大」。**(② 軌名重疊)**:事件標籤是 `text-anchor="middle"`,第一筆若靠左會往左延伸壓進軌名區 —— 加 x 下限 `Math.max(x,padL+52)`。**(③ 短跨度軸線空)**:個管師那筆跨度只有 1 個月,底部只有 JUL/AUG 兩個孤立刻度;改成跨度 ≤2 個月時逐事件標「月 日」。全部用**個管師截圖的真實資料**驗證通過。屬 c+1。

V5.26.2 修「勾了病程時序圖,但產出的 HTML 沒有 📈 按鈕」(坑 #51)。**根因是順序**:V5.25.0 把時序圖從「產獨立投影片」改成「按鈕 + 新分頁」時,**沒把資料累積那段往前搬** —— 原本寫在 `slides.push()` 之後是對的(它本來就在產投影片),但改成按鈕後 `_nTl` 必須在**組裝按鈕之前**算好。實際行為比想像更隱蔽:`var _nTl` 有**變數提升**,組按鈕時是 `undefined` → `undefined>0` 為 false → 按鈕永不出現;而 `var` 是函式作用域,第 2 個個案還會拿到第 1 個的殘值造成**錯位**。位置驗證(修前):組按鈕 494943 < slides.push 495361 < `_nTl` 賦值 497037。已搬到 `_pushImgWin` 系列旁邊。**我在 V5.15.0 為同樣理由寫過註解「先累積再組按鈕」,這次卻漏掉了。** 最值得記的是**驗證方式的盲點**:當時只檢查「字串存在」與「語法正確」—— 兩者都通過,但**執行順序錯誤既不是語法錯誤,也不會讓字串消失**。凡是「A 要在 B 之前算好」的相依,驗證必須比對兩者的**位置或實際執行結果**。已補:三者位置順序比對 + node 端到端模擬三種個案(沒勾 → 無按鈕、勾了有 2 筆事件 → 顯示「病程時序(2)」、勾了但無事件 → 無按鈕),全部正確。屬 c+1。

V5.26.1 乳攝檢視恢復「報告 + 圖同頁」。**這是修我自己在 V5.15.1 造成的退步** —— 當時問個管師「乳攝報告要放哪」,他選 B(報告也進新分頁、個案頁不動),我理解成「報告獨立成第一頁」,但他的意思是「**不要動個案頁**」;改版前的乳攝投影片本來就是**左報告右圖同一頁**。個管師這次明確指出:「乳攝若只有 2 張,報告頁跟那 2 張要在同一頁,跟以前一樣」。**做法**:有報告時與**第一組圖同頁**左右分欄,只有「完全沒有圖」時報告才單獨成頁;比例依個管師指定改成**三欄 2:4:4**(報告 2、兩張圖各 4),圖片**橫向並排** —— 乳攝 MLO/CC 是直式影像,並排比上下排更能用到畫面高度;超過 2 張時圖區內部自動分格,整體仍維持「報告 2 : 圖區 8」。報告欄只佔 2 會讓長英文字(spiculated/microcalcifications)擠成直條,加 `word-break:break-word` + `overflow-wrap:anywhere` 自然換行。標題改「報告 ・ 乳房攝影(2 張)」。**順帶修掉一個過期文字**:編輯畫面寫「乳攝影像(最多2張)」,但 V5.17.0 已放寬到 6 張,而且與下方 `buildGenericImgArea` 顯示的「已選 N / 6」矛盾 —— 這是坑 #40 的同類問題(底層改了、UI 說明沒跟著改)。屬 c+1。**教訓**:使用者選項的語意要確認到底 —— 「報告也進新分頁」與「報告獨立成一頁」是兩件事,我當時沒追問就實作,結果做出使用者沒要求的版面改變。

V5.26.0 病程時序圖依外部審稿修 P0+P1 —— **這輪審稿抓到我兩個真實錯誤,而且都是我違反自己定的規則**。**(坑#49)視覺補上資料沒有的語意**:我把全身治療軌的相鄰事件自動用箭頭連起來(`Lenvatinib ●────→ HAIC`),但資料只有 `date`/`type`/`label`,**沒有 endDate、沒有療程銜接關係** —— 醫師會讀成「持續到」或「後線銜接」,屬臨床誤導。**最值得記的是我在同一個檔案的註解裡寫了「絕不推論因果、治療反應」,卻用視覺畫出了因果** —— 我當時只想到「不從自由文字推論」,沒想到「從結構化欄位的相鄰關係推論」也是推論。直接移除;要畫 treatment bar 得先有 `endDate`。**(坑#50)為了防重疊而移動節點**:前版 `layout(list,240)` 強制相鄰事件隔 240px,結果相差 3-4 天的四筆治療在圖上等距排開 —— **圖上的水平距離不再代表時間距離**,這比標籤重疊嚴重得多,因為那是 timeline 的根本性質。我當初這麼做是為了解決個管師說的「標籤一定要清楚」,**但解錯了層次:該讓的是標籤,不是節點**。改成 node 永遠用 `xOf(ms(date))`、label 上下錯層 + 引線連回節點、且 stagger 只在真會碰撞時啟用(不是 `qi%2` 固定樣式)。實測 10 個節點全部落在精確日期座標(05/22→1294、05/26→1328,差 34px = 4 天)。**(P1 五項)**:移除疾病 Band 背景改用線本身粗細建立權重(審稿說背景色塊「像被選取的 table row 而不是主軸」,很準 —— 那是「區塊」的視覺語言不是「軸」的);supporting lanes 移除自身 baseline(全圖只有疾病軸是真正的 timeline,其餘只是共用時間座標的事件);GAP_DAYS 45→90、GAP_W→110(45 天太敏感,實測會產生 2 個 gap 讓畫面破碎);gap 只在疾病軸標一次;時間軸改年份分組取代 `2025-10`+`OCT` 的重複。個管師要求正式版移除底部圖表說明區。**兩個教訓進坑庫**:「不推論」的界線要涵蓋視覺不只文字;視覺化的「不可協商屬性」(timeline 是位置=時間、長條圖是長度=數值)不能為了避讓或美化而犧牲。屬 b+1。

V5.25.0 病程時序圖(Event-band Timeline)重做 —— 從「有啟用但畫面很慘」到「醫師一眼看得懂」。**起點**:個管師問時序圖有沒有啟用,查證後發現編輯畫面/檢視模式/HTML 投影片三處都有跑(Word 沒有),但產出的是**蛇行折返 SVG**:標籤重疊、第二列反向讀、大量留白。**設計歷程(值得記)**:先產實圖檢視 → 提三種方案 → 個管師要「有圖的感覺、一頁看完」→ 定 Event-band → 外部審稿三輪修正。**關鍵取捨**:審稿最初提的 Disease Spine/因果鏈/Clinical Storyboard 都需要「疾病狀態、治療反應、第幾線」等語意資訊,但 timeline 只有 `date`/`type`/`label` 三欄 —— 硬猜會重演坑 #30。**個管師提出的解法很好**:沿用既有「AI 整理→JSON→匯入」工作流,讓 AI 讀完整臨床脈絡後判讀「轉折點」與「治療反應」,個管師**零額外填寫負擔**。守住的界線:判讀結果明確標「AI」、只寫進 `_ai` 命名空間不覆蓋原始欄位、匯入時顯示摘要讓個管師選採用範圍(不逐筆確認,避免又變手填)、prompt 明令「判斷不出來給 na,不要猜」「不建議治療方案」。**視覺設計(個管師與審稿共同修正)**:疾病軸畫成紅色帶箭頭主線獨立置頂(不只是「那軌比較亮」)、其餘軌橫線大幅淡化(只是對齊用不是資訊)、長空窗壓縮成固定寬 + 虛線標月數(底部說明明講「橫向距離不等於實際時間比例」以免誤讀)、標題列標「病程 N 個月(M 筆)」、圖例只列本圖用到的類型、拿掉黃色垂直 NOW 線(會與紅色主線競爭焦點)。**位置演算法(踩過一次坑)**:第一版「超出右界就整軌等比拉開」→ 讓相差 7 天的三筆治療橫跨整個 8 個月的軸,嚴重失真;改用標籤佈局的標準解法「前向推開 + 後向回夾」,只壓縮擁擠區段。**修掉審稿示意圖的 bug**:`bandOf()` 回傳第一個匹配,同一事件不會重複畫在兩軌(實測 RT 只出現 1 次)。屬 b+1。

V5.24.3 修影像檢視器版面(個管師截圖回報:多圖頁的左右頁鈕遮住圖片名稱)。**與坑 #6 同源** —— `.pnav` 是 `position:fixed` 不佔文件流,內容會一路排到視窗底,右下角那張圖的說明文字 `.pcap` 就被壓住。修法沿用坑 #6 的解法:`.pbody` 與 `.pbody.prep` 底部保留導覽鈕高度 `calc(2vh + clamp(48px,7vh,78px))`,導覽鈕本身也縮小一階(bottom/right/padding 各降);另外 `.pcap` 原本是 `white-space:nowrap + ellipsis`,長檔名(如 `messageImage_1776818710105_0`)幾乎只看得到前半,改成 `-webkit-line-clamp:2` 最多折兩行 + `word-break:break-all`。**這版最值得記的是過程**:改完第一次跑「坑 #48 固化檢查」(把 extraJs 用 node 實際求值再 `node --check` 求值結果)**立刻抓到 SyntaxError** —— 我把多行中文註解寫進了 CSS 字串裡,產出的 JS 因此斷行。**註解必須放在模板字串外面**。這證明那個檢查值得每次動 extraJs 都跑,因為 index.html 本身永遠是合法的,錯的是它產出的東西。屬 c+1。

V5.24.2 修「影像按鈕有顯示張數但點了完全沒反應」(坑 #48)。**個管師提供實際產出的 HTML 檔,反查一次就定位**:把產出檔的每個 `<script>` 區塊抽出來逐一 `node --check`,發現第二個區塊在**第 78 行語法錯誤** —— `.replace(/\n/g,'<br>')` 在產出檔裡變成 **regex 中間斷行**。**根因**:`extraJs` 是**模板字串(反引號)**,裡面寫的 `\n` 被 JS 當成跳脫序列**變成真的換行字元**,而不是保留成 `\`+`n` 兩個字元。一個語法錯誤讓**整個 script 區塊都不執行** → `window.openImgWindow` 從未定義 → onclick 找不到函式 → **靜默無反應**(症狀完全吻合:翻頁正常因為那在另一個 script 區塊)。**這是 V5.15.1 加乳攝報告頁時留下的**。修法:模板字串內所有要保留成字面量的反斜線加倍(`/\\n/g`)。**同版的診斷程式碼也踩同一坑** —— V5.24.1 為了讓失敗會說話而加的 alert 訊息也用了 `\n`,一起修掉(否則診斷版本身也會壞)。**驗證方法已固化**:把 `extraJs` 抽出來用 node **實際求值**,再對求值結果 `node --check` —— 光檢查 index.html 本身**抓不到這種錯**,因為 index.html 是合法的,錯的是它**產出的東西**。教訓:「產生程式碼的程式碼」要多一層跳脫意識,每經過一層引號/反引號,反斜線就要加倍一次。屬 c+1。

V5.24.0 UI 尺度重整(依外部 UI 審稿,查證後採納核心項目;純視覺,零功能與資料風險)。**查證發現的失衡**:`body` 是 14px,但**每天工作的個案卡片輸入框只有 12px**(比 body 小兩級);`label` 10px 且帶 `text-transform:uppercase`(**對中文完全無作用**)與 `.09em` 字距(讓中文顯得細碎);`.fsec` 區段標題只有 10px,**比內文還小**,失去長卡片裡的定位作用。字級分布佐證:10px 70 處、11px 126 處、**12px 158 處**,而 **14px 只有 16 處**。**做七項**:①主工作區 820→**980px**;②主要 input/textarea 12→14px(含 25 處 inline);③label 10→12px 並移除 uppercase 與過大字距;④`.fsec` 10→13px + 上下留白;⑤`.cg2` gap 6→10/12px;⑥**修 V5.23.0 自己造成的問題** —— `.fg-gap>label{color:#8A5A1F}` 因為 `.fg-gap` 一直存在,**填完後 label 仍是警告色**看起來像永遠沒補,警告改只留在空白輸入框底色;⑦`.struct-row` 加淡背景框(病理/檢查/治療多筆時原本只靠 5px margin,容易看錯哪個日期配哪段文字)。**①的關鍵決策:以個管師的 20 吋螢幕為準,不是開發者的 27 吋** —— 20 吋常見 1440~1600 寬,扣掉 sidebar 248px 後 980 舒適,**刻意不衝 1024** 以免 1440 寬機器邊界太緊。**審稿誤判一項**:第 10 項說個案卡片「↑↓ 與 × 太近」,但查證**個案卡片根本沒有 ↑↓ 排序鈕**(那是圖片卡片的 ◀▶),不需處理。**明確不做**:手機相關全部不動(個管師說明「用手機開的機率極低,因為需要電腦查資料」—— 我原本把 iOS 聚焦自動放大當技術理由,在此情境不成立;改沒人用的路徑只有風險沒有收益)、ECOG/CFS select 簡化(審稿自承是 polishing)、拿掉主治醫師小 label(第二/第三選填,label 有提示作用)、基本資料 asymmetric grid(要實際看畫面調)。字級分布改善:12px 158→126、14px 17→42。屬 b+1。**驗收提醒**:開發者 27 吋、個管師 20 吋,同樣 14px 在 20 吋上看起來更大,**驗收以個管師感受為準**;覺得太鬆可再往回調(純 CSS,成本低)。

V5.23.0 強化「院內 AI 整理 → JSON 匯入」這條**主要輸入工作流**(個管師說明:個案是先用院內 AI 匯整資訊、轉 JSON 後匯入,再逐欄查看修改)。**(1)修最常見的問題 —— 日期重複顯示**:exams/treatments/pathologies 的渲染格式本來就是「名稱（日期）」+ content,但 AI 從病歷抄過來時常把日期也寫進 content → 畫面上出現兩次。**兩層防護**:prompt 加明確規則(治本),匯入時 `_stripDupDate`/`_stripDupName` 自動清理(保底,因為院內 AI 是否遵守 prompt 無法控制)。**清理很保守**:只清「與 date 欄**完全相同**」的日期,而且只清開頭/結尾/括號內 —— node 實測確認「compared with 2025-11-18 study」這類**中間有意義的比較日期完全不動**。markers 另外處理:content 若是序列(含 →)則 date 欄多餘,自動清空(prompt 本來就有此規則,但 AI 不一定遵守)。**(2)匯入報告**:AI 產出常有缺(病歷不全或 AI 漏抓),原本只顯示「已匯入 N 筆」,要逐張打開才知道缺什麼。改成匯入後直接攤開「哪幾筆缺診斷/現病史/病理/檢查/治療/討論方向」+ 重複病歷號警告,並在 toast 顯示自動清理了幾處。**(3)缺漏欄位高亮**:診斷/現病史/討論方向三個關鍵欄位空白時套 `.fg-gap` 淡黃底 + 標籤變色,填了自動消失(靠 `:placeholder-shown`),直接對應「匯入後逐欄查看修改」的動作。**刻意不做**:C「AI 匯入待確認標記」—— 個管師本來就會逐欄看,多一個要點的按鈕反而是負擔;timeline 依個管師指示不納入 prompt(timeline 功能本身還沒調好,是下一版重點)。屬 b+1。

V5.22.0 前期追蹤與醫療小組改版(個管師回報這兩區不好用,外部審稿也指出同樣問題)。**業務釐清是這版的關鍵** —— 審稿以為醫療小組是「短事項」建議砍成兩欄,但個管師說明後才知道它是:**病人初診斷住院時書面請各科給意見,各科基於「當下資料」判斷(病理/影像可能還沒出來),後續檢查結果出來後到 MDT 重新確認治療方向是否正確**。所以欄位不能砍,問題在「欄位名跟實際要填的內容對不上」。個管師定出四段結構:之前現病史 / 多專科建議及已執行之治療 / 目前最新情況 / 之後治療決策(維持‖調整)。**做法:只改顯示標籤與 placeholder,底層欄位名(cc/discussion/summary/decision)完全不動** —— 既有資料、Word/HTML 產出全部不受影響。**(2)前期追蹤改三段**:原本只有一格「追蹤說明」,而 `autoImportPrevFollowups` **只帶姓名/醫師/日期,把上次的 decision 丟掉** —— 等於「系統知道這人要追蹤,卻不告訴個管為什麼要追蹤」,個管得回去翻上一場記錄。改成「上次決議(自動帶 `c.decision||c.summary`,唯讀顯示)/ 本次追蹤重點(新欄位 followFocus)/ 目前結果(沿用 note)」。**舊資料相容**:原本填在「追蹤說明」的內容留在「目前結果」不搬動(個管師確認照此)。**(3)三種卡片加色標籤**(個案討論 #3A4550 / 醫療小組 #7A8C6E / 前期追蹤 #5B8FA8),解決「三種長得太像分不出來」的根本困擾,版型不動。node 實測:decision 優先退 summary ✅、兩者皆空不顯示區塊 ✅、followNext=false 已結案不帶入 ✅、舊 note 留在目前結果 ✅。屬 b+1。**教訓**:外部審稿看得出「欄位重複」但看不出業務語意 —— 砍欄位前一定要先問使用者這區實際在做什麼,否則會砍掉真正需要的東西。

V5.21.0 資料層工廠重構 —— **這輪不是架構潔癖,是修一個已經發生的 bug**(坑 #46)。查證外部審稿①時實測比對兩個 case 建立入口,發現 **JSON 匯入建立的 case 缺 `flags` / `pathologyImages` / `surgicalImages` 三個欄位**;更值得記的是 CLAUDE.md 的 **V5.10.1 寫著「匯入補 flags」—— 當時只補了讀取端沒補建立端**,一個欄位補一半持續 11 個版本沒被發現(渲染端到處 `||[]` 防禦,不會炸只會靜靜少東西)。**做法**:建 `createCase(cid,data,opts)` / `createItem()` 單一工廠,同時負責 default 與 normalize;`addItem` 與 JSON 匯入都改走工廠。**關鍵是不為統一而抹平行為差異** —— 手動新增帶癌別預設科別、匯入不帶,用 `opts.withDeptDefault` 區分;markers 去重是匯入專屬業務邏輯留在呼叫端。加 `assertCaseSchema()` 匯入後自我檢查(同坑 #36 `_assertConfigConsistency`、V5.19.0 QA 預檢的思路:把「靠人記得」變成「程式發現」)。**另做 ②③**:建 `getSection`/`getSectionList`/`getSectionItem` 與 `ensureArray`,但**依審稿的修正意見刻意只替換 8 處 mutation path**(坑 #47)—— `getSection()` 內含 `ensureSec()`,若唯讀渲染或 migration 也換,會**意外建立原本不存在的 section**、改變「不存在就是不存在」的語意,故 55 處保留。node 實測:兩入口 schema **完全一致(31 欄位)**、三個缺漏欄位補齊、行為差異保留(手動 `["一般外科::","",""]` vs 匯入 `["","",""]`)、壞資料 normalize 正確、斷言能抓缺漏。**明確不做**:④Viewer 共用(審稿本輪已接受降級為 "Do not touch until needed",觸發條件是同一 bug 需兩邊修第二次)、⑤genHTMLSlides 三層(審稿本輪也撤回 P1,因 PPTX 已停用、無 PDF 需求,ROI 不足)。屬 b+1。

V5.20.0 依外部架構審稿做第一批重構(審稿提 12 項、列 5 個最值得改;評估後只做風險低且真正減少 bug 源的三項,②④⑤ 明確不做)。**(坑#43)圖片找檔兩條 code path**:編輯畫面預覽走 `_imgGetFile()`、HTML 產出走 `genHTMLSlides()` 內的 `_getFileByEnum()` —— **這正是坑 #31 的成因**(當時修含括號檔名只修到預覽,產出沒改)。產出端刪掉自己那份統一呼叫,另抽 `_fileToDataUrl()`(原本兩端各一份 FileReader)。**(坑#44)同一功能兩套演算法**:`imgMove` 用 swap、`imgReorder` 用 splice。移一格時結果相同**所以不是現行 bug**,但 swap 跨多格會錯 —— node 實測 `A B C D` 把 D 移到最前:splice 得 `D A B C`(對)、swap 得 `D B C A`(錯)。統一成 `moveArrayItem` + `_moveImage` 共同核心。**(坑#45)monkey patch**:`buildSlidesHTMLOnly` 為了「只產生不下載」而替換 `document.body.appendChild` 攔截 `<a>`,patch 期間任何 appendChild 都經過那層。改成 `genHTMLSlides({download,silent})` 參數化,**無參數呼叫維持原行為**(既有按鈕零影響),順帶淘汰 V5.19.0 的全域旗標 `window._slidesSilent`。**明確不做的**:②`createCase` 統一(實測兩處欄位數 30 vs 14 差異大,但需先查證 import 少的欄位是漏還是刻意,查清楚再說);④Viewer 共用引擎(動的是開會當下會用到的東西,產出的 HTML 是離線靜態檔,壞掉會在會議現場才發現 —— 風險不對稱,等真的第三次漏改再做);⑤`genHTMLSlides` 三層架構(實測 **994 行**確實過大,但審稿的動機是「未來 HTML/PDF/PPTX 吃同一 model」,而 PPTX 已於 V5.13.0 停用、也沒有 PDF 需求 —— 為用不到的擴展性做大重構不划算;若要動只做機械式切分不做架構分層)。屬 b+1。**三個教訓進坑庫**:同一件事有兩個入口要先合併再修 bug;「現在結果碰巧相同」不代表兩套演算法安全;需要 monkey patch 通常是「函式做太多事」的訊號。

V5.19.1 改會議日期的資料防護(個管師問「寫入內容後能不能改日期」,查證後發現一個窄但真實的資料遺失路徑,坑 #42)。**查證結果分三種**:(1)**單癌別會議** —— sections 存在 `mdt_m_*` 裡不碰 `mdt_sec_*`,改日期完全安全;(2)**合併會議改成空日期** —— 資料完整但**舊 key 變孤兒**留著佔空間;(3)🔴 **合併會議改成「已有另一場同癌別會議」的日期** —— section key 是 `mdt_sec_{癌別}_{日期}` **沒有會議 ID**,儲存會**直接覆蓋掉那場的資料**。**做法刻意不改 key 結構**:改成 `{meetingId}_{癌別}` 要寫 migration 搬三台主機的所有歷史 section,**只有一次機會跑對**,而專案無自動化測試也無法在真實資料上預演 —— 風險遠大於它解決的窄情境(個管師分機作業,同機不會有同日同癌別兩場;唯一觸發路徑是「延期到一個已建好同癌別會議的日期」)。改為三道防護:`openMtgRecord` 記 `m._loadedDate` → 儲存時比對得知日期被改過 → 查 `getIdx()` 有無「別場、同日、癌別交集」的會議,有就明確警告(說明會被覆蓋、建議改用其他日期)並讓使用者決定 → **確認新 key 全部寫入成功後**才 `delSec` 清舊孤兒(順序不可反,寫入失敗時保留舊資料以免兩邊都沒有)。node 四情境實測:改成空日期不打擾且清孤兒 ✅、撞到同癌別會議會警告且取消後對方資料完好 ✅、同日不同癌別不誤報 ✅(分機作業常見)、沒改日期完全不觸發 ✅。屬 c+1。**教訓進坑庫**:key 由「業務欄位」組成而非唯一 ID 時,任何業務欄位可被編輯就等於 key 可變 —— 要嘛用不可變 ID,要嘛在編輯該欄位時做衝突偵測;這裡選後者是**權衡不是最佳解**,若未來真有同機同日同癌別多場的需求,仍要回頭改結構。

V5.19.0 HTML 投影片三項強化(第二份外部審稿提 10 項,評估後個管師選做 3 項)。**(#7 產出 QA 預檢 — 我評估中最有價值的一項)**:原本 `if(!src)return''` 讀不到的圖**直接靜默略過**,少一張圖使用者完全不會知道 —— 這跟坑 #29(無聲不產出)、坑 #33(NAS 謊報成功)是同一類「無聲失敗」,而且已經害過一次(V5.14 之前括號檔名讀不到,是看到破圖才發現;若被 `return ''` 濾掉連破圖都看不到)。做法:`_qa` 全程累計 `expectImgs/loadedImgs` 與缺漏清單,另檢查「沒填討論方向」「內文過長(>1400 字)」「單頁 >6 張」,產出前用一個對話框攤開,**只提醒不阻擋**(確定=仍然產生 / 取消=回去修正)。`window._slidesSilent` 讓 HTML 分享等自動流程跳過對話框不打斷。**(#2 Case Navigator)**:產 slides 時順手 `_slideMeta.push({idx,cancer,chartNo,name,dx})`,產出的 HTML 內建 ☰ 目錄抽屜 —— 依癌別分組、點擊直接 `go(idx)`、`markNavCur()` 依目前頁自動高亮(用 `m.idx<=c` 找最後一個,所以停在個案的影像頁時仍高亮該個案)。30+ 頁時要回第 7 個病人不用一直翻。**(#9 導覽列閒置淡出)**:靜止 3 秒降到 opacity .18,mousemove/keydown/touchstart 喚醒 —— 更像簡報模式,也降低擋住右下內容的機會。**審稿另外 7 項的評估結論**:反對「影像 Viewer 改 overlay」(個管師在 V5.15.0 明確選過新分頁,理由是**可拉第二螢幕與投影片並列**,overlay 做不到);「自動防溢位拆頁」方向對但產出當下量不到最終渲染高度,先用 QA 的「內容過長」警告代替;「共用 SlideViewer 引擎」診斷正確(主頁 go() 與影像頁 pgo() 兩套重複)但屬大重構、無自動化測試,列觀察等再出一次 bug 再做;「註記持久化」反對(HTML 是獨立檔案,localStorage 不跟著分享走,且「畫線另存變慢」的舊問題還沒查清);「nav safe zone」坑 #6 已修過。屬 b+1。

V5.18.1 依外部程式審稿修 5 項(審稿品質很高,三個 P1/P2 逐一查證全部屬實)。**(坑#39,P1)分頁線跟錯對象**:`pageBreak` 存在圖片物件上,排序時跟著圖片跑 → 拖一張圖整個版面結構變掉(2+2 變 3+1)。分頁線語意是**版面結構**、拖曳語意是**換內容**,不該綁一起。修法不動 schema:`_snapBreaks` 記下分頁線**位置索引**,排序後 `_applyBreaks` 套回**相同位置** —— 換的是圖片、分頁線留原位;套回時跳過 index 0,**順帶解決 P3**(`imgMove` 原本缺 normalize,只有 `imgReorder` 有)。實測 `A B|C D` 拖 D 到 B 前:舊 `A D B|C`(亂)→ 新 `A D|B C`(維持 2+2)。**(坑#40,P1)乳攝拿不到新功能**:`IMG_KINDS.mammo` 早在 V5.16.0 備妥,但 `buildMammoImgArea()` 仍是獨立舊 renderer,其他四種都走 `buildGenericImgArea` 只有它沒走 → 排序/拖曳/分頁點/一鍵排版/數量顯示全都沒有。**這是坑 #37 的直接重演且更隱蔽**(註冊表有 mammo,看起來像已統一)。收斂,只保留 `maxImgs:6`。**(坑#41,P2)雙真相來源**:特殊議程編輯端可設 pageBreak,輸出端卻仍讀 `sp.imgsPerSlide` → 「畫面看到 A、輸出照 B」。統一 pageBreak(它是 imgsPerSlide 的超集合),舊資料若無 pageBreak 則依 imgsPerSlide 自動換算等效分頁線,既有排版不變。**(P2)soft guardrail**:每頁 >6 張不阻擋,只顯示淡黃提示「投影時可能不易辨識」,並在數量列顯示各頁張數(如「共 3 頁(2+4+1)」)。屬 c+1。**三個教訓進坑庫**:位置資訊別存在會移動的物件上;「已加進註冊表」≠「已走共用路徑」;升級資料模型要把舊模型一次拔乾淨。

V5.18.0 圖片功能強化第二批(檢視器排版,11 項需求收尾)。**(4)分頁點**:個管師要「第一頁 2 張、第二頁 4 張」—— 用 `pageBreak` 旗標而非「每頁固定 N 張」,因為前者才能讓每頁張數不同。編輯畫面每張卡片一顆「⏎ 換頁/同頁」toggle(第 0 張永遠是新頁不給設),檢視器 `_pushImgWin` 帶出 `brk`,依此把圖分組;每組依張數自動選格線(1=全幅 / 2=左右 / 3-4=2×2 / 5-6=3×2 / 7+=`ceil(sqrt(n))` 自動),`.pgrid` + `.pcell` CSS,多圖時標題顯示「影像(N 張)」、每張下方帶題字。**(6)一鍵套用**:「每頁 1/2/4 張」快速鈕,`imgApplyLayout` 依 `j%n===0` 批次設分頁點,設完仍可手動微調。**(7)拖曳排序**:`.img-card` 加 `draggable`,document 層事件委派(dragstart/dragend/dragover/drop),`imgReorder` 是**整段搬移非交換**(拖到第 1 位 = D A B C 而非交換);限同一組圖片內排序(比對 cid/imgtype/idx/si);題字 input 設 `draggable=false` 否則選字會觸發拖曳;搬完清除首張 `pageBreak`。**(10)頁碼**:`pn` 原本用 `data.images.length`,加了報告頁與多圖分頁後會算錯,改用 `_pages.length`。**順帶清理**:移除 V5.15.0 之後就失效的舊「每頁 N 張」下拉(相關影像 `imgsPerSlide`、手術 `surgImgsPerSlide`)—— 改按鈕檢視後那個設定完全沒作用但 UI 還在,是個誤導;**特殊議程的保留**(它仍有獨立投影片,設定仍有效)。node 實測:個管師範例 2+4 完全符合、一鍵套用 2張×3頁 與 4+2 正確、格線 1~9 張容量皆足、拖曳搬移與 pageBreak 清除正確。屬 b+1。**11 項需求至此全部完成**。

V5.17.0 圖片功能強化第一批(個管師提 4 項需求,我追加 7 項,共 11 項分兩批做;本版是編輯畫面的 7 項)。**(1)手動排序**:每張圖加 ◀▶ 移動鈕,`imgMove()` 走 V5.16.0 的 `IMG_KINDS` 註冊表 —— **寫一次五種圖片全生效**(這就是上一版重構的回報);越界不動作、只有真正移動才 markDirty。**(2)上限放寬**:相關影像 5→20、乳攝 2→6(三處:data-max 與兩處硬編碼 `images.length>=2`)。**(3)乳攝預載原檔名**:原本 `caption:''`,雖然畫面會 fallback 顯示 name,但**存進資料的是空字串,匯出 JSON 就掉了**;其他四種路徑本來就有預載。**(5)特殊議程清除補 confirm**(V5.16.0 重構時發現原本缺這道保護,當時依「重構不偷改行為」原則保留並回報,本版正式補上)。**(8)數量顯示**「已選 N / 上限」,達上限時轉紅並標註。**(9)上限提示**:原本 `.slice(0,maxN)` 是**無聲截斷** —— 勾 10 張只進 5 張卻無任何提示;改成明確告知「將取前 N 張,略過後面 M 張」。**(11)清除按鈕顯示張數**「✕ 清除全部(7 張)」,誤觸較易察覺。node 實測排序含越界保護全對。**第二批(V5.18.0)預告**:分頁點 + 檢視器多圖排版、一鍵套用排版、拖曳排序、檢視器頁碼。**另發現遺留問題**:V5.15.0 把相關影像/手術改成按鈕後,編輯畫面的「每頁 1/2/4 張」下拉**已失效**(檢視器固定一頁一張),第二批會一併重做。屬 b+1。

V5.16.0 圖片操作統一重構(以資深工程師視角做的技術債清理,坑 #38)。坑 #37 已揭露「同一邏輯複製 5 份 → 修 bug 只修到一份」的代價,V5.14.0 先收斂 preview,本版把剩下的 **del×4 + clear×5 + caption×2 + `delImg()` + `addpathimg` 重繪**(約 **95 行**近乎相同的程式碼)一併收斂。**分析**:五種圖片的差異只有 **6 個變數**(資料路徑/容器/DOM id/重繪函式/索引參數名/標籤),其餘 100% 相同。**做法**:建 `IMG_KINDS` 註冊表(單一真相)+ 5 個核心函式(`_imgOwner`/`_imgRedraw`/`imgDel`/`imgClear`/`imgSetCaption`)+ `_imgKindByField`(HTML 的 data-imgtype 是資料欄位名,要轉 kind),11 個 handler 各縮成 1-2 行,約 45 行。**重構鐵律:不偷改行為** — 保留三個真實差異:mammo 巢狀 `c.mammo.images`、special 掛 `sections[cid].special` 且重繪用 `innerHTML`(以 `mode` 旗標區分)、各自的 confirm 訊息;**`clearspecialimgs` 原本就沒有 confirm(已知缺陷,原樣保留並回報個管師決定)**。順帶強健化(防禦非行為改變):`imgDel` 加索引存在檢查(原本欄位不存在會拋例外)、`_imgKindByField` 查不到回 null 不動作(原本會靜默寫進錯陣列)。**選保守方案**(HTML action 名稱不變):此專案無自動化測試,大改 HTML 產生器風險高,保守方案已拿到 90% 維護價值。node 實測 8 情境(含刪不存在索引/不存在個案/無 mammo 物件等邊界)全部正確。屬 b+1。**未決**:special 清除要不要補 confirm(等個管師決定)。下版優先:個管師實測圖片增刪改 + 錄音切割院內網路測試。

V5.15.1 乳攝比照改為按鈕模式,四種圖片全部統一。個案標題列第 4 顆 📸 乳房攝影,原「左報告右圖」的獨立投影片移除。**乳攝與前三種的結構差異**:它的投影片有「報告文字 + 圖片」兩部分,若整張改按鈕,報告文字會從投影片消失。個管師選 B(報告也進新分頁、個案頁不動)—— `_pushImgWin` 加**選填 report 參數**,檢視器 `_pages` 組裝時把報告當**第一頁**(`.pbody.prep` 可捲動、左對齊、`\n`→`<br>`),圖片接在後面;無報告時維持第一張圖為初始頁(`isFirst=(!data.report&&i===0)`)。**邊界處理**:`if(!list.length&&!report)return 0` —— 有報告但一張圖都載不到時**仍建立檢視器**(報告本身有臨床價值),按鈕數量用 `_nMammo||(_mammoRep?1:0)`。檢視器是獨立產生的 HTML 不能用主程式 `escA`,就地定義 `_esc`。node 實測三情境:報告+2圖→3頁報告在前、只有報告→1頁、無報告3圖→第一張圖為初始頁,初始顯示頁數皆為 1。屬 c+1。下版優先:個管師實測四顆按鈕 + 錄音切割院內網路測試。

V5.15.0 圖片統一階段二(排版與呈現)。**(1)三種圖片呈現統一**:個管師要求「圖片不要放在個案後頁,而是跟病理一樣有個標示按了才顯示」。原本病理是「標題列按鈕 🔬 + 新分頁檢視」(V5.2.1),但相關影像與手術照片各自產**獨立投影片排在個案後面**,造成個案之間被一堆圖片頁隔開。改法:`_pathoData` 通用化成 `_imgWinData`(key `ci-N::type`)+ `_pushImgWin()` 累積函式,三種圖片走同一套;個案標題列產**三顆按鈕**(🔬病理影像 / 📷手術照片 / 🖼影像,有圖才顯示);`openPathoWindow` 通用化成 `openImgWindow`,標題與分類標籤由資料帶入,**沿用原有檢視器的放大鏡與導覽**(重用比重寫安全 — 圖片邏輯已踩過坑 #29/#31/#37)。**關鍵細節**:`_pushImgWin` 回傳「實際載得到的張數」(src 空的自動濾掉),按鈕在它之後才組裝 → 讀不到檔時不會顯示假數字。**視窗形式選新分頁而非同頁 overlay** 的理由:個管師明說「跟病理一樣」、病理檢視器已實戰驗證、可拉第二螢幕與投影片並列、不必新寫檢視器。**保留不動**:乳攝(嵌在個案頁內非後頁)、特殊議程(不屬個案,本身即展示內容)。**(2)修放大鏡模糊**:根源是壓縮參數各做各的 — 資料夾圖不壓縮(最清晰)、病理上傳 2400px/0.82、**乳攝上傳只有 1200px/0.75**(最糊);放大鏡固定放大 3.5 倍,1200px 來源會超過原始像素。修:乳攝統一成 2400/0.82;兩個放大鏡(主投影片 `_magCv` + 檢視器 `_pmCv`)加 `imageSmoothingQuality='high'`。屬 b+1。下版優先:個管師實測三顆按鈕與放大鏡清晰度 + 錄音切割院內網路測試。

V5.14.0 圖片嵌入統一強化(階段一:統一底層,外觀完全不變)。個管師指出「病理跟手術跟影像類似但流程不同」— 盤點後確認系統有 **5 種圖片**(病理/手術/相關影像/乳攝/特殊議程),圖片相關 `data-action` 共 **23 個**,其中 **preview/del/clear 各重複 5 套**。**這次揭露一個重要事實(坑#37)**:V5.11.4 修的坑 #31(含括號檔名 getFileHandle 失敗)**當時只修到 previewrelatedimg 一處**,病理/手術/乳攝/特殊議程 4 處**至今仍有同樣 bug**;而且 5 處預覽**全都沒處理 subFolder**(子資料夾的圖一律預覽失敗),但產投影片的 `_loadImgsToCache` 有 → 造成「編輯畫面看不到、投影片卻印得出來」的落差。**做法**:抽出 `_imgGetFile(name,subFolder)`(getFileHandle → 失敗改列舉比對 → 支援子資料夾)+ `_imgPreview(img,label)`,5 個 handler 收斂成一行呼叫;HTML 端 4 處按鈕補 `data-subfolder`(順便修掉病理 data-name 尾端多餘空格)。node 實測:一般/括號/中文/子資料夾+括號 全部找得到,不存在的正確回 null。**階段一刻意不動 del/clear**(它們純重複但沒 bug,風險收益不划算,留到階段二做排版時一起整理)。**階段二預告**(排版強化,待確認後做):病理與乳攝補上「每頁張數」控制(目前只有相關影像/特殊議程/手術有)、每頁張數增加 3/6 選項、依圖片實際比例自動選版型(解決直式病理切片塞進 2×2 橫向格子造成「圖太小」)。屬 b+1。下版優先:階段二排版強化 + 錄音切割院內網路測試。

V5.13.6 審稿 P1 批三項(P0 的資料安全修完後,處理「會出錯但不會弄丟資料」這層)。**(坑#34)UTC 日期**:`new Date().toISOString().slice(0,10)` 取的是 UTC 日期,台灣 00:00~07:59 會算成前一天 — 而 MDT 早上 07:30-08:30 那幾場**正好落在錯誤區間**,後果是新建會議預設日期變昨天、「只能建今天或未來」把今天擋掉、行事曆今天標錯格。修:建 `todayTaipei()` 用 **en-CA locale**(剛好輸出 ISO 格式 YYYY-MM-DD,可直接跟會議 date 比較;zh-TW 會輸出 `2026/8/13` 破壞字串比較),5 處全換。實測台灣 8/13 07:30 → 舊 `2026-08-12` 錯、新 `2026-08-13` 對。**(坑#35)預設會議室不一致**:消化道/肝膽胰的 loc 寫 `彰濱-1F  人文會議室`(雙空格+名稱不同)、泌尿寫 `彰濱-7F  愛書人會議室`(雙空格),都不在 DEFAULT_LOCS 中 → `<select>` exact match 找不到 option → 存空值。有趣的是系統早有 migration 要把舊值改成「人文藝術館會議室」,但 DEFAULT_C 的預設值沒跟著改(修了資料沒修來源)。個管師確認就是「彰濱-1F 人文藝術館會議室」,3 處改成與清單完全一致。**(坑#36)癌別英文代碼過期**:CANCER_EN_CODES 還用舊 ID(blood_lymph/chest/gi/hbp/gu),實際已是 lymphoma/thoracic/digestive/hepatobiliary/urology → `CANCER_EN_CODES[id]||id` 查不到就靜默 fallback 成中文 ID。更新 5 個。**加自動一致性檢查** `_assertConfigConsistency()`(審稿建議中最划算的一項):啟動時檢查「每個癌別都要有英文代碼」+「每個預設 loc 都要在 DEFAULT_LOCS 中」,console 警告不阻斷 — 一個函式擋住未來所有同類脫節。屬 c+1。下版優先:審稿中期批(versioned migration、輕量版並行編輯衝突偵測)+ 錄音切割院內網路測試。

V5.13.5 審稿 P0 批(備份確認可靠後,先修「會真的弄丟或謊報資料」的兩個最危險項)。**(坑#32)clearTestData 嚴重資料遺失**:「清除測試資料」按鈕寫「真實資料不受影響」,但 `idx.filter(m=>m.cids?.length)` 把所有有癌別的會議都當測試(真實會議本來就有 cids)→ 全刪,還 `removeItem('mdt_idx')` 清空索引。修:generateTestData 打 `isTestData:true` 標記、saveLocal 的 idx entry 帶標記、clearTestData 只刪標記為測試的 + 逐筆移除不清空 idx + 「X 測試/Y 正式、沒測試就不刪」第二道保護。node 實測:2 測試 2 正式 → 只刪 2 測試,正式完整保留。**(坑#33)NAS 謊報成功**:writeMtgToNAS/backupToNAS 的 catch 吞掉錯誤照常 resolve,呼叫端 pushed++ / _markNasBackupToday() 不管真假 → 個管師看到「同步成功」但沒寫進 NAS、每日備份失敗仍標記今日完成(當天不再試)。修:writeMtgToNAS 回 {ok}、backupToNAS 回 boolean,呼叫端只在真成功才計數/標記,失敗記 results.failed 並 showSaveToast 警告。**教訓**:破壞性操作不能用間接特徵猜要刪什麼(要明確標記);錯誤被 catch 但不回傳 = 靜默謊報成功(async 成敗要沿呼叫鏈往上傳)。屬 c+1。下版優先:審稿 P1 批(UTC→Taipei 日期、預設會議室不一致、癌別 en code 過期)+ 錄音切割院內網路測試。

V5.13.4 全資料庫「完整匯出→完全還原」可靠性補強 — 大升級前要有能 100% 救回的備份,所以先確保備份本身完整。**做這版前先做了體檢**:讀 exportAllJSON/importAllJSON + node 往返實測,結論是「核心會議資料(mdt_idx/mdt_m_*/mdt_sec_*/mdt_cfg/mdt_locs/mdt_drs/mdt_exam_types)8 項逐 byte 一致、可靠」,但發現 **4 個偏好 key 沒被備份**(mdt_ai AI提示詞/mdt_cr_template CR範本/mdt_html_theme_* 主題/mdt_html_fname_lang_* 檔名語言;後兩者後綴是 S.user.id per-user)。**三項補強**:(1)export 加 prefs 物件(_collectPrefs 掃固定 key + 前綴 key),import 讀回(舊備份檔無 prefs 欄位就跳過,向後相容);(2)還原前「智慧後悔藥」— 只在 getIdx().length>0(這台已有資料)時才問要不要先下載現狀備份,空機器/新機/重灌不問,避免產生無意義空備份檔;(3)匯出前 _checkBackupIntegrity 偵測孤兒(idx 有列但 mdt_m_ 找不到),警告救不回。**往返實測**:V5.13.3 是「8 一致 + 4 遺失」→ V5.13.4 是「13 全一致 + 0 遺失」。**這版刻意不碰的**:section key 改結構(個管師確認同日不同癌別是分機作業,單機不會有同日同癌別兩場 → key 撞的隱患天然規避,不需大改);idx 合併/slice 上限(屬合併語意,這版只做「完全還原到新機器」不做合併);審稿其他項(clearTestData/NAS 謊報/UTC 日期等)等備份確認可靠後再排。屬 c+1。下版優先:審稿 P0 批(clearTestData 改 isTestData 標記 + NAS 謊報成功修正)+ 錄音切割院內網路測試。

V5.13.3 癌指數也改分組標籤 — 個管師要求「不同的癌指數也做一眼可以看清楚的標示」。原本癌指數是純文字 `AFP： 3.62(2024-12-18)→3.60(2025-02-17)→...` 用 `\n` 串接,**單一指數的數值串很長會自動換行**,AFP 換行後跟 PIVKA-II 黏在一起,分不出哪一行屬於哪個指數。修法:改用跟病理/檢查相同的 `lines` 分組格式 — **指數名稱當深色小標籤(run 層 shading)+ 數值縮排 8pt + 組間留白 4pt**。至此 **病理 / 癌指數 / 檢查 / 治療 四欄視覺完全統一**。順便把 `_DATEHDR` 更名 `_GRPHDR`(group header)— 這個樣式現在不只用在日期,也用在指數名稱,原名語意不準;4 處引用一起改。屬 c+1。下版優先:長官看新版 Word 簡報回饋 + 錄音切割院內網路測試。

V5.13.2 Word 簡報再修個管師回報的兩點。**(1)「病理被截斷顯示不完全」** — 先查證病理 struct 只有 `date`/`content` 兩欄,渲染沒漏欄位,所以**不是資料問題是排版問題**:長欄位(病理/檢查)跨頁時,Word 把表格列切成兩頁,**第二頁只剩內容、左側標籤欄不會重複** → 看起來就像被截斷。修法:`mkBlock` 的 `TableRow` 加 **`cantSplit:true`**,區塊放不下就整塊移到下一頁,標籤與內容永遠在一起(單一區塊若本身超過一整頁,Word 仍會自動切,不會卡死)。**(2)「日期項目的長度太長」** — V5.13.1 的日期底色用 **paragraph shading**,而 paragraph shading **一定是整行寬**,深色長條視覺太重。修法:`ln.fill` 改成套在 **run 層**(`mkRun` 的 `shading`),底色只包住日期文字像膠囊標籤;`ln.shaded`(無 fill)維持 paragraph 層淺灰,**不動 record 模式治療欄的原外觀**。**驗證**:docx 實跑 — run 層日期底色 7 個、paragraph 層 0 個(確認不再整行寬)、cantSplit 14 個。**教訓**:Word 的 paragraph shading 無法只包文字,要做「膠囊標籤」必須用 run 層 shading(跟 V5.9.5 的 DOCX flags 色塊同一個技巧);表格跨頁時標籤欄不重複是 Word 預設行為,長內容區塊要 cantSplit。屬 c+1。下版優先:長官看新版 Word 簡報回饋 + 錄音切割院內網路測試。

V5.13.1 Word 簡報格式優化(個管師看過 V5.13.0 實際產出後的兩點回饋)。**(1)不同日期一眼可辨**:原本 `lines` 的 `shaded` 用 `C.bg=F5F7F8` 太淡,多筆檢查擠在一起分不出組;而**病理更慘 — 是純文字用 `\n` 串接**,完全沒有分組。修法:擴充 `mkBlock` 的 `lines` 支援 `fill`(自訂底色)/`gap`(組間留白 pt)/`color`(文字色),日期標題行統一改 `_DATEHDR = {fill:C.mid, color:'FFFFFF', bold}` 深色底白字 + 非首筆 `gap:4`;病理也改成同樣的日期分組格式(日期當標題行、內容縮排 8pt)。三個欄位(病理/檢查/治療)視覺統一。**(2)欄位重排**:診斷→現病史→過去病史→**病理→癌指數→檢查**→治療→**討論方向**(討論方向殿後當結尾、癌指數移到病理與檢查之間)。**風險控制**:`_TRHDR` 讓治療只在 deck 模式用深色底,**record 模式維持原淺灰**,不動長官已習慣的會議記錄外觀;`lines` 的 `color` 改成「未指定就不設」(原本我一度寫成預設 `C.dark`,會讓現有記錄的治療欄文字從黑變深藍灰 — 自己抓到並修掉)。**驗證**:docx 實跑 — 深色日期標題 7 個、組間留白 2 個、欄位順序 `診斷→現病史→過去病史→病理→癌指數→檢查→治療→討論方向` 完全正確。屬 c+1。下版優先:長官看過新版 Word 簡報的回饋 + 錄音切割院內網路測試。

V5.13.0 長官習慣 Word 不用 PPTX,「PPTX 簡報」按鈕改為「**Word 簡報**」。**關鍵設計決定**:不另寫新函式,而是 **genDOCX 加 `mode` 參數**(`'record'` 預設 = 原 DOCX 記錄 / `'deck'` = 新 Word 簡報),兩者共用 `mkBlock`/`mkCaseHdr`/`mkSecHdr` 等視覺 helper — 避免複製 200 行 helper 造成雙份維護,以後改 Word 樣式只要改一處兩種產出自動一致。`genDOCX()` 無參數呼叫行為完全不變(現有 DOCX 記錄按鈕零風險)。**兩種 Word 的分工**:記錄 = 會後正式文件(診斷/治療/**討論摘要/決策結論**);簡報 = 會前個案資料(**一案一頁** `pageBreakBefore`,完整臨床欄位 診斷/現病史/過去病史/病理/檢查/治療/討論方向/癌指數,**不出**會後才填的摘要決策)。欄位與順序照抄原 PPTX 個案頁,確保長官拿到的內容跟以前一樣只是換格式。**genPPTX 保留程式碼但移除 UI 入口**(依「極度謹慎刪除」原則,加 ⚠️ 停用註記說明可回復;因無人呼叫,PptxGenJS 不會載入無啟動成本)。**順修**:舊版 `btn.textContent='DOCX 會議記錄'` 跟 HTML 上的「DOCX 記錄」不一致 → 產一次後按鈕文字就變了,改用 `_btnLabel` 還原正確文字。**驗證**:用 docx 7.8.2 實跑產出 — `<w:pageBreakBefore/>` 2 案出現 1 次 ✓、8 個欄位全在 ✓、無討論摘要/決策結論 ✓、flags 色塊 3 個 ✓。屬 b+1。下版優先:長官實際看 Word 簡報後的版型回饋 + 錄音切割院內網路測試。

V5.12.0 整合錄音切割台 — 個管師錄下 MDT 會議後要切成小段做逐字稿(檔案太大不能一次上傳),把獨立的 AudioSplitter V3.3.0(1891 行 / 84KB)整合進來。**整合方式選 iframe 彈窗而非直接內嵌**,因為整合前的衝突盤點發現:(1)🔴 AudioSplitter 有 `const VERSION="V3.3.0"`,直接內嵌會**蓋掉 MDT 版號**;(2)⚠️ 12 個 CSS class 撞名且都是 `row`/`meta`/`primary`/`left`/`bar` 這種通用名 → 樣式互相污染;(3)✅ 函式名 / HTML id / localStorage 都 0 撞名。iframe 是**同源沙盒**:變數與樣式完全隔離、功能不受限(檔案上傳/AudioContext/下載都正常)、AudioSplitter 可獨立升版不用改一行。**順手修 CDN 風險**:AudioSplitter 原用 `cdnjs.cloudflare.com` 載 lamejs,但 MDT 檔頭註明「CDN:jsdelivr(院內確認可用)」— 表示院內只驗證過 jsdelivr,cdnjs 不一定通。改成 `cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js`(路徑用 npm pack 驗證過,套件內確實是 `package/lame.min.js`)。**UI**:主力產出加第 6 顆「錄音切割」,grid 從固定 5 欄改 `auto-fit minmax(112px,1fr)` — 固定 6 欄在小視窗會把按鈕文字擠爆。**iframe src 延遲到第一次開啟才設**,避免拖慢 MDT 啟動;關閉不清空 src,讓個管師關掉再開時已載入的錄音與切點還在;不做 ESC/點背景關閉,避免作業中誤觸。**打包規則五檔→六檔**:`AudioSplitter.html` 必須跟 index.html 同層,否則按鈕開出空白。屬 b+1。下版優先:個管師實測錄音切割(院內網路能否載到 jsdelivr 的 lamejs)+ NAS 同步觀察期。

V5.11.4 修 bug:HTML 投影片影像頁破圖(新坑 #31)。個管師實測關鍵線索「**把檔名括號拿掉就正常**」→ 根因是 `getFileHandle(img.name)` 對含 `(` `)` 的檔名(`CT(20250401).jpg`)比對失敗(瀏覽器/OS 檔名正規化差異),讀不到檔 → `_pathImgCache` 空 → `src` 空字串 → 破圖(alt 文字仍在,所以看得到 `CT(20250401)` 但沒圖)。修法:加 `_getFileByEnum(dirHandle,fname)` 退回機制 — 先試 `getFileHandle`,失敗就**列舉資料夾** `dirHandle.values()` 逐一比對 `ent.name===fname`。**兩處都修**:`_loadImgsToCache`(產投影片預載)+ `previewrelatedimg`(編輯畫面預覽按鈕,原本也是直接 getFileHandle)。順手把 3 處 `alt` 改用 `escA()`(caption 含引號會破壞屬性)。**教訓**:File System Access API 的 `getFileHandle` 不是萬能,檔名含特殊字元要有列舉退回;個管師用日期加括號命名完全合理,不該要求他們改檔名遷就程式。屬 c+1。下版優先:錄音切割工具整合(AudioSplitter)+ NAS 同步觀察期。

V5.11.3 修 bug:做肝膽胰癌 HTML,HCC 個案的癌別標籤卻顯示「腎臟癌」(新坑 #30)。根因兩個疊加:(1)`getSubGroup(c)`(泌尿道癌分子群用)**沒限定癌別、對所有癌別都跑**;(2)診斷 `right adrenal metastasis`(右腎上腺轉移)的 **adrenal 含 renal 字串**,被 `/renal/` 命中判成腎臟癌;(3)L6175 標籤 `getSubGroup(c)||ca.name` 猜到就蓋掉真癌別名,且即使 useSubGroups=false 不啟用分組頁,標籤仍單獨呼叫 getSubGroup。修法兩層防護:`getSubGroup` 開頭 `if(cid!=='urology')return null`(非泌尿道癌不猜)+ regex 排除 adrenal(`(^|[^d])renal` 且 `腎(?!上腺)`)。node 實測:right adrenal metastasis→null ✓、真 Renal cell carcinoma/kidney→仍腎臟癌 ✓。教訓:從自由文字猜結構化欄位很危險,醫學縮寫互相包含(adrenal⊃renal),regex 要加邊界且限定範圍才跑。屬 c+1。下版優先:個管師實測各癌別 HTML 標籤正確 + NAS 同步觀察期。

V5.11.2 修 bug:特殊議程輸入了但 HTML 產出不顯示(新坑 #29)。根因不在渲染 — 特殊議程的渲染程式碼(L6316/6362/6425/6514)一直都在,壞的是**上游資料預載**:`buildSlidesHTMLOnly` 的資料夾圖片預載迴圈**寫死只跑 `cases`**,特殊議程存在 `sections[cid].special` 不在 cases 裡 → `sp.images` 從沒進 `_pathImgCache` → `src=img.dataUrl||_pathImgCache[key]||''` 空 → `if(!src)return''` 丟掉 → `filter(Boolean)` 變空 → `if(!_sImgH.length)continue` → **整張投影片不產出且無聲失敗**。而且 `_needsFolder`(要不要跳授權資料夾)**也只檢查 cases**,只有特殊議程有圖時連授權都不會問。修法:(1)載圖抽 `_loadImgsToCache()` 共用函式;(2)迴圈 cases 跑完再跑 `_sec.special`;(3)`_needsFolder` 加 special 檢查。**教訓**:跟坑 #19(followupHTML 寫死 'cases')同源 — **寫死區塊名稱**是本專案慣性錯誤,凡 `sections[cid].xxx` 迭代都要問「該不該也跑 special/team/events/followups?」。加新資料區塊時要 grep 所有「按區塊迭代」處,不能只加渲染。屬 c+1。下版優先:個管師實測特殊議程 HTML 產出 + NAS 同步觀察期。

V5.11.1 會議小抄改一頁 5 案 — 個管師實用 V5.11.0 後回報「一頁 8 個太多」。改 5 案/頁,**多出的空間全拿去加大書寫區**(不是只把行拉長留白):每案 33→52mm、標題列 6→7mm(病歷號/姓名 10→11pt)、**每區書寫 3→5 條線**、行高 7→7.5mm,兩區合計從 6 行變 **10 行**。頁面計算:A4 277mm 可用 − 頁首 12mm = 265mm,5×52=260mm 留 5mm 餘裕不溢頁;`page-break-inside:avoid` 保留,個案不跨頁。8 案時會自動分成 2 頁(5+3)。屬 c+1(既有功能的版面調整)。**教訓**:紙本產出的「一頁幾個」很難用算的定案,要個管師實際印出來手寫過才知道 — V5.11.0 我算過 33mm 理論可行,但實用就是擠。下版優先:個管師再次實印回饋 + NAS 同步觀察期。

V5.11.0 新功能「會議小抄」— 個管師開會要手寫記錄,但每次得自己抄病歷號姓名很煩。做 `genPrintSheet()`:A4 直印一頁 8 案,標題精簡(編號+病歷號+姓名+性別年齡+flags+主治醫師)已印好,下面留書寫格。**版面關鍵**:8 案/頁時每案僅 33mm 高,兩區若上下疊每條線只剩 5mm 難寫 → 改「討論摘要(左60%)/決策結論(右40%)」**左右並排**用到 A4 寬度,每條線維持 7mm。兩區刻意對應系統會後填寫欄位,手寫已分類、會後直接照打。**技術**:走瀏覽器列印(`window.open` 寫入 HTML + onload 自動 `window.print()`,列印對話框可「另存為 PDF」),**不用 jsPDF** — 中文 PDF 要嵌字型(檔案暴增數 MB / 易豆腐字),瀏覽器列印無此問題;彈窗被擋時自動退回下載 HTML(Ctrl+P 一樣可印)。`</script>` 用 `'</scr'+'ipt>'` 拆寫避免提早關閉。CSS 用 mm 單位 + `@page{size:A4 portrait;margin:10mm}` + `page-break-inside:avoid` 確保不跨頁。主力產出 grid 4→5 欄加「會議小抄」按鈕。屬 b+1(新功能,依 Kit V1.20.0 b 可超過 9)。下版優先:NAS 同步觀察期 + 個管師實機列印回饋(紙本手寫空間夠不夠)。

V5.10.5 對齊 SELA Starter Kit V1.21.0(從 V1.18.0 跨 3 版,純文件層 c+1)。詳讀 Kit 全部規範後依坑 #40 四級分類選擇性對齊。**對齊的**:(1)坑 #14 補 V1.20.0 版號進位澄清 — Kit V1.20.0 明定「只有 c 逢十進位,b 可超過 9」,所以 MDT 現在 b=10(V5.10.x)完全合法,不需進位 a,消除坑 #14「第三碼最大 9」被誤讀成「b 也最大 9」的歧義;(2)坑庫加 #28 — Python re.sub 注入資料會解讀 `\u`/`\1` 跳脫(對齊 Kit V1.21.0 坑 #63),改檔注入一律用 str.replace,這是給維護者(我)的陷阱非系統內問題;(3)九之三加 V1.19~1.21 新規範對應。**已符合/不適用的**:坑 #59 inline SVG gradient(MDT 無 gradient)、#60 PWA blob manifest(MDT 用實體 manifest+無 SW)、#61 UI 改名不動變數(V5.8.7 已遵守)、#62 刪欄位查依賴(呼應謹慎刪除)、references 三參考專案(MDT 已成熟不需要)。**不動程式**(CLAUDE.md 1 檔=c+1)。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(flags V5.9.4~5.9.5 已做大部分,可重評) + NAS 同步觀察期。

V5.10.4 HTML 投影片個案標題微調 — 個管師回報易讀性兩點:(1)`M/74 ECOG 1` 改「男性，74 歲　　ECOG 1」(性別中文化 + 年齡加歲 + em space U+2003 ×2 拉開段間);(2)flags 討論原因標籤放大(.5em→.62em + padding 2px9px→3px12px + 圓角加大)。**關鍵**:新增 HTML 專用 `caseDemoHTML(c)`,**不動 caseDemo**(DOCX/PPTX 投影幕/文件空間有限,仍用簡潔 M/74 ECOG 1)。只改主個案標題(L6146-6147),前期追蹤標題/DOCX/PPTX 不受影響。屬 c+1。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(flags V5.9.4~5.9.5 已做大部分,可重評) + NAS 同步觀察期。

V5.10.3 修姓名遮蔽 bug — 個管師回報病人 4 個字時系統只遮中間一個字、強迫顯示成 3 字(王大明華→王○華)。根因:maskName 舊邏輯 `n[0]+'○'+n[n.length-1]` 不管幾字都壓成「首+○+尾」3 字。修法:改 `n[0]+'○'.repeat(n.length-2)+n[n.length-1]` 保留原姓名長度(王○○華、司○○○明)。1~3 字行為向後相容不變。影響所有用 maskName 的地方(HTML 投影片/DOCX/PPTX 個案標題姓名遮蔽)一次到位。屬 c+1 bug fix。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(註:flags 標籤 V5.9.4~5.9.5 已做大部分,可重新評估) + NAS 同步觀察期。

V5.10.2 對齊 SELA Starter Kit V1.18.0(從 V1.15.0 跨 3 版,純文件層 c+1)。詳讀 Kit 全部規範後依坑 #40「鐵律/建議/順便/不做」四級分類做選擇性對齊。**對齊的**:(1)CLAUDE.md 加 theme-color「N 處真相清單」(依坑 #42,MDT 共 5 處 — CSS :root、PPTX 的 JS 色票、DOCX 的 JS 色票、HTML theme-color、webmanifest;比 Kit 範例多一處因為 PPTX/DOCX 各有獨立配色系統);(2)加 handoff 評估紀律(鐵律 #0 — 完成版本前走評估,符合條件就產出否則明寫跳過理由);(3)Kit 對齊紀錄升 V1.18.0 + 記錄不適用的 Kit 坑(醫療章 #51/#52 藥物給付不適用,因 MDT 是會議管理非藥物決策)。**不做的**:HTML 分享子資料夾保持 `slides`(Kit §8 寫 Share,但 MDT 已用 slides 上線,改了舊連結失效,屬坑 #40「✗ 不做」級,回流建議 Kit 更正)。SELA-handoff 加四級分類對齊報告 + slides/Share 回流建議。**不動程式**(2 文件檔 = c+1)。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統 + NAS 同步觀察期。

V5.10.1 JSON 個案匯入/匯出欄位盤點補齊 — 全面交叉比對「匯出 exportCaseJSON / 匯入 importCaseJSON / AI 提示詞 genImportPrompt」三方欄位對應,找出缺漏:**(1)flags 討論原因標籤(V5.9.4 新增)三方全缺** — 匯出沒帶、匯入沒讀、prompt 沒定義,JSON 交換掉標籤;**(2)doctors/doctor 主治醫師匯出漏帶**(匯入有讀)+ prompt 沒定義,匯出再匯入掉醫師;**(3)pathologyImages/timeline/note 匯出漏帶**(匯入有讀)往返掉資料。修法:匯出補 6 欄、匯入補 flags、prompt 補 doctors(AI 可填)+flags(**固定輸出空陣列不推斷** — 討論原因是個管師主觀臨床判斷,違反「prompt 嚴格不推斷」原則,留手動勾)。往返一致性驗證:匯出 27 個資料欄位匯入全讀,無掉資料。**教訓**:新增個案欄位(如 V5.9.4 flags)時,必須同步檢查匯出/匯入/prompt 三方,否則新欄位無法透過 JSON 交換 — 這是「單一真相 schema」要管三個地方對齊的延伸(類似 CLAUDE.md 章法二的業務對映表)。
