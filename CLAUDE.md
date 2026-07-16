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

V5.11.2 修 bug:特殊議程輸入了但 HTML 產出不顯示(新坑 #29)。根因不在渲染 — 特殊議程的渲染程式碼(L6316/6362/6425/6514)一直都在,壞的是**上游資料預載**:`buildSlidesHTMLOnly` 的資料夾圖片預載迴圈**寫死只跑 `cases`**,特殊議程存在 `sections[cid].special` 不在 cases 裡 → `sp.images` 從沒進 `_pathImgCache` → `src=img.dataUrl||_pathImgCache[key]||''` 空 → `if(!src)return''` 丟掉 → `filter(Boolean)` 變空 → `if(!_sImgH.length)continue` → **整張投影片不產出且無聲失敗**。而且 `_needsFolder`(要不要跳授權資料夾)**也只檢查 cases**,只有特殊議程有圖時連授權都不會問。修法:(1)載圖抽 `_loadImgsToCache()` 共用函式;(2)迴圈 cases 跑完再跑 `_sec.special`;(3)`_needsFolder` 加 special 檢查。**教訓**:跟坑 #19(followupHTML 寫死 'cases')同源 — **寫死區塊名稱**是本專案慣性錯誤,凡 `sections[cid].xxx` 迭代都要問「該不該也跑 special/team/events/followups?」。加新資料區塊時要 grep 所有「按區塊迭代」處,不能只加渲染。屬 c+1。下版優先:個管師實測特殊議程 HTML 產出 + NAS 同步觀察期。

V5.11.1 會議小抄改一頁 5 案 — 個管師實用 V5.11.0 後回報「一頁 8 個太多」。改 5 案/頁,**多出的空間全拿去加大書寫區**(不是只把行拉長留白):每案 33→52mm、標題列 6→7mm(病歷號/姓名 10→11pt)、**每區書寫 3→5 條線**、行高 7→7.5mm,兩區合計從 6 行變 **10 行**。頁面計算:A4 277mm 可用 − 頁首 12mm = 265mm,5×52=260mm 留 5mm 餘裕不溢頁;`page-break-inside:avoid` 保留,個案不跨頁。8 案時會自動分成 2 頁(5+3)。屬 c+1(既有功能的版面調整)。**教訓**:紙本產出的「一頁幾個」很難用算的定案,要個管師實際印出來手寫過才知道 — V5.11.0 我算過 33mm 理論可行,但實用就是擠。下版優先:個管師再次實印回饋 + NAS 同步觀察期。

V5.11.0 新功能「會議小抄」— 個管師開會要手寫記錄,但每次得自己抄病歷號姓名很煩。做 `genPrintSheet()`:A4 直印一頁 8 案,標題精簡(編號+病歷號+姓名+性別年齡+flags+主治醫師)已印好,下面留書寫格。**版面關鍵**:8 案/頁時每案僅 33mm 高,兩區若上下疊每條線只剩 5mm 難寫 → 改「討論摘要(左60%)/決策結論(右40%)」**左右並排**用到 A4 寬度,每條線維持 7mm。兩區刻意對應系統會後填寫欄位,手寫已分類、會後直接照打。**技術**:走瀏覽器列印(`window.open` 寫入 HTML + onload 自動 `window.print()`,列印對話框可「另存為 PDF」),**不用 jsPDF** — 中文 PDF 要嵌字型(檔案暴增數 MB / 易豆腐字),瀏覽器列印無此問題;彈窗被擋時自動退回下載 HTML(Ctrl+P 一樣可印)。`</script>` 用 `'</scr'+'ipt>'` 拆寫避免提早關閉。CSS 用 mm 單位 + `@page{size:A4 portrait;margin:10mm}` + `page-break-inside:avoid` 確保不跨頁。主力產出 grid 4→5 欄加「會議小抄」按鈕。屬 b+1(新功能,依 Kit V1.20.0 b 可超過 9)。下版優先:NAS 同步觀察期 + 個管師實機列印回饋(紙本手寫空間夠不夠)。

V5.10.5 對齊 SELA Starter Kit V1.21.0(從 V1.18.0 跨 3 版,純文件層 c+1)。詳讀 Kit 全部規範後依坑 #40 四級分類選擇性對齊。**對齊的**:(1)坑 #14 補 V1.20.0 版號進位澄清 — Kit V1.20.0 明定「只有 c 逢十進位,b 可超過 9」,所以 MDT 現在 b=10(V5.10.x)完全合法,不需進位 a,消除坑 #14「第三碼最大 9」被誤讀成「b 也最大 9」的歧義;(2)坑庫加 #28 — Python re.sub 注入資料會解讀 `\u`/`\1` 跳脫(對齊 Kit V1.21.0 坑 #63),改檔注入一律用 str.replace,這是給維護者(我)的陷阱非系統內問題;(3)九之三加 V1.19~1.21 新規範對應。**已符合/不適用的**:坑 #59 inline SVG gradient(MDT 無 gradient)、#60 PWA blob manifest(MDT 用實體 manifest+無 SW)、#61 UI 改名不動變數(V5.8.7 已遵守)、#62 刪欄位查依賴(呼應謹慎刪除)、references 三參考專案(MDT 已成熟不需要)。**不動程式**(CLAUDE.md 1 檔=c+1)。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(flags V5.9.4~5.9.5 已做大部分,可重評) + NAS 同步觀察期。

V5.10.4 HTML 投影片個案標題微調 — 個管師回報易讀性兩點:(1)`M/74 ECOG 1` 改「男性，74 歲　　ECOG 1」(性別中文化 + 年齡加歲 + em space U+2003 ×2 拉開段間);(2)flags 討論原因標籤放大(.5em→.62em + padding 2px9px→3px12px + 圓角加大)。**關鍵**:新增 HTML 專用 `caseDemoHTML(c)`,**不動 caseDemo**(DOCX/PPTX 投影幕/文件空間有限,仍用簡潔 M/74 ECOG 1)。只改主個案標題(L6146-6147),前期追蹤標題/DOCX/PPTX 不受影響。屬 c+1。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(flags V5.9.4~5.9.5 已做大部分,可重評) + NAS 同步觀察期。

V5.10.3 修姓名遮蔽 bug — 個管師回報病人 4 個字時系統只遮中間一個字、強迫顯示成 3 字(王大明華→王○華)。根因:maskName 舊邏輯 `n[0]+'○'+n[n.length-1]` 不管幾字都壓成「首+○+尾」3 字。修法:改 `n[0]+'○'.repeat(n.length-2)+n[n.length-1]` 保留原姓名長度(王○○華、司○○○明)。1~3 字行為向後相容不變。影響所有用 maskName 的地方(HTML 投影片/DOCX/PPTX 個案標題姓名遮蔽)一次到位。屬 c+1 bug fix。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統(註:flags 標籤 V5.9.4~5.9.5 已做大部分,可重新評估) + NAS 同步觀察期。

V5.10.2 對齊 SELA Starter Kit V1.18.0(從 V1.15.0 跨 3 版,純文件層 c+1)。詳讀 Kit 全部規範後依坑 #40「鐵律/建議/順便/不做」四級分類做選擇性對齊。**對齊的**:(1)CLAUDE.md 加 theme-color「N 處真相清單」(依坑 #42,MDT 共 5 處 — CSS :root、PPTX 的 JS 色票、DOCX 的 JS 色票、HTML theme-color、webmanifest;比 Kit 範例多一處因為 PPTX/DOCX 各有獨立配色系統);(2)加 handoff 評估紀律(鐵律 #0 — 完成版本前走評估,符合條件就產出否則明寫跳過理由);(3)Kit 對齊紀錄升 V1.18.0 + 記錄不適用的 Kit 坑(醫療章 #51/#52 藥物給付不適用,因 MDT 是會議管理非藥物決策)。**不做的**:HTML 分享子資料夾保持 `slides`(Kit §8 寫 Share,但 MDT 已用 slides 上線,改了舊連結失效,屬坑 #40「✗ 不做」級,回流建議 Kit 更正)。SELA-handoff 加四級分類對齊報告 + slides/Share 回流建議。**不動程式**(2 文件檔 = c+1)。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統 + NAS 同步觀察期。

V5.10.1 JSON 個案匯入/匯出欄位盤點補齊 — 全面交叉比對「匯出 exportCaseJSON / 匯入 importCaseJSON / AI 提示詞 genImportPrompt」三方欄位對應,找出缺漏:**(1)flags 討論原因標籤(V5.9.4 新增)三方全缺** — 匯出沒帶、匯入沒讀、prompt 沒定義,JSON 交換掉標籤;**(2)doctors/doctor 主治醫師匯出漏帶**(匯入有讀)+ prompt 沒定義,匯出再匯入掉醫師;**(3)pathologyImages/timeline/note 匯出漏帶**(匯入有讀)往返掉資料。修法:匯出補 6 欄、匯入補 flags、prompt 補 doctors(AI 可填)+flags(**固定輸出空陣列不推斷** — 討論原因是個管師主觀臨床判斷,違反「prompt 嚴格不推斷」原則,留手動勾)。往返一致性驗證:匯出 27 個資料欄位匯入全讀,無掉資料。**教訓**:新增個案欄位(如 V5.9.4 flags)時,必須同步檢查匯出/匯入/prompt 三方,否則新欄位無法透過 JSON 交換 — 這是「單一真相 schema」要管三個地方對齊的延伸(類似 CLAUDE.md 章法二的業務對映表)。
