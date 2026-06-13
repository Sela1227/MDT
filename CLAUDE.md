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
- 預防:打包前看版本號,第三碼 ≥ 10 立即警告

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

## 九之三、SELA Starter Kit 對齊狀態(V4.8.0 起;V5.8.8 升至 V1.15.0)

本專案已對齊 **SELA Starter Kit V1.15.0**(原於 V4.8.0 對齊 V1.6.0,V4.8.2 升 V1.7.1,V5.8.8 升 V1.15.0)。每次升版都應檢查是否仍符合:

| 規範 | 對齊方式 | 注意 |
|------|---------|------|
| zip 檔名格式 | `MDT V<x.y.z>.zip`(空格,非底線) | 打包時直接用 `zip MDT\ V4.8.0.zip ...` |
| 必含 `.gitignore` | 已加,擋 `.DS_Store` / 機密 / 暫存區 | 新加目錄時記得評估是否需要忽略 |
| **雙軌品牌 logo**(V1.15.0 §9 共存規則,V5.9.0 起)| favicon / PWA / apple-touch / android-chrome = MDT 主 logo;右下角 `sela-credit` 微標 = SELA logo(`favicon/sela.svg`)| favicon-32x32.png 已是 MDT 不是 SELA — 右下角微標**必須**改引用 sela.svg 才能保留 SELA 品牌存在 |
| favicon/ 套組 | 9 檔:5 PNG + favicon.ico + mdt-1024.png + sela.svg + site.webmanifest | 備份 `favicon-sela-backup/` 保留原 SELA 套組,萬一需要回退 |
| 介面色選擇(V1.8.1+) | `theme-color` 跟 `theme_color` in manifest 同步用 `#5A7A8B`(醫療型) | **不是** SELA 橘!Kit V1.8.1 起的分離鐵律;醫療型避免橘色警示聯想 |
| 系統 UI logo | 右下角 fixed `<a id="sela-credit">` 引用 `favicon/sela.svg` | 樣式 `opacity:.42`,hover 放大;不擋 UI |
| **回流通道**(V4.8.1 起) | `SELA-handoff.md` 在專案根目錄,跟 zip 一起交付 | 重大版本完成後更新內容,讓 SELA 升 Kit 用 |
| 三位版本號逢十進位 | 同 #14 規則 | 已對齊 |
| CLAUDE.md 必含五章 | 踩坑 / 業務對映 / 版本歷程 / 下版優先 / 一句話總結 | 已對齊 |
| USER_GUIDE.md 必含 | 我們有,Kit 沒明文要求(MDT 超越) | — |

**Kit 內 32 條跨專案坑與 MDT 17 條坑互不衝突,可以互相印證**:
- Kit #20(中文檔名亂碼) ↔ MDT 坑 #16
- Kit #23(JS 大括號) ↔ MDT 坑 #5、#13
- Kit #1(三方對齊) ↔ MDT 坑 #17
- Kit #7(打包前驗證) ↔ MDT 打包驗證腳本(節九)

**未來新對齊項目放這裡**(例如:Kit 升 V1.7.0 時新增的規範要對應檢查)

---

## 十、下版優先清單

**按優先序：**

1. **「(8-其他特殊複雜個案)」討論原因快速標籤系統** — 個管師有時要標個案因(如「治療中死亡」「必要提報」),用快速標籤而非每次手動打字
2. NAS 同步觀察期:跑 1-2 週後看是否有 tombstone 累積異常 / 衝突情境沒被想到
3. DOCX 微調觀察期:V5.8.5 治療欄樣式 + V5.8.7 改名後,個管師實際用幾場會議後可能還有微調(如灰底色階、縮排幅度)
4. 開會後模式:產出區顯示「今天有 N 場會議」快速入口
5. 設定頁新增「同步狀態」面板:NAS 上有幾筆 tombstone、上次同步時間、衝突歷史

---

## 十一、一句話總結

V5.9.1 修 V5.9.0 出貨後個管師回報的 2 個 bug。**Bug 1**:左上角浮出一個 `>` 字元 — L609 `</style>>` 多打了一個 `>`(V5.8.8 加 theme-color 時 str_replace 意外加進)。修法:刪除多餘 `>`。**Bug 2**:系統內 UI 還是 SELA logo — 不是 favicon 沒換,而是 UI 內**兩處 inline base64 SELA JPEG 漏改**:L616 登入頁(56×56)+ L655 sidebar(26×26)。兩處都用 `<img src="data:image/png;base64,/9j/4AAQ...">` 寫死,跟 favicon/ 無關。修法:src 改 `favicon/android-chrome-192x192.png`,style 保留。附加效果:檔案瘦身 ~10KB(2 個 5.4KB base64 拿掉)。**新增坑 #26**:換主 logo 必須 grep 整個 index.html 找出所有 inline base64 圖片跟內嵌 SVG,逐處改到 — V5.9.0 漏改造成「外面分頁圖是 MDT,但開系統還是 SELA」的不一致狀態,個管師立刻發現。下版優先:「(8-其他特殊複雜個案)」討論原因快速標籤系統。
