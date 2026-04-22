# CLAUDE.md — MDT 會議管理系統開發交接文件
> 專門給 Claude 讀。讀完即可繼續開發，不需要問問題。
> 版本歷史保持在 README.md。

---

## 一、系統是什麼

**彰濱秀傳癌症中心 MDT 會議管理系統**

- 台灣彰濱秀傳醫院癌症中心使用
- 管理多專科團隊（MDT）會議：建立會議、填寫個案討論、產出 PPTX/DOCX/LINE 通知
- 單一 HTML 檔案，無需後端，資料存於 **localStorage**
- 可選共享資料夾同步（File System Access API，Chrome/Edge）

---

## 二、技術棧

```
單一 index.html（無框架）
CDN（jsdelivr.net，院內確認可用）：
  - pptxgenjs@3.12.0（PPTX 產出）
  - docx@7.8.2（DOCX 產出）
Google Fonts：Noto Sans TC + Noto Serif TC
AI API：api.anthropic.com（院內 CORS 已確認）
時間同步：TimeAPI.io → Cloudflare Trace → 本機 fallback
```

---

## 三、UI 規範（必須遵守）

### 絕對禁忌
- ❌ 嚴禁任何 emoji 字元（UI 規範第一條）
- ❌ 嚴禁 onclick 字串拼接（引號衝突）→ 改用 data attribute + event delegation 或 DOM createElement
- ❌ 嚴禁 template literal 含換行後設 innerHTML（產生空白文字節點）→ 改用 DOM 操作

### CSS 變數
```css
--fog-dk: #3A4550   /* 主深色 */
--fog:    #637281   /* 中灰 */
--fog-lt: #9BAAB6   /* 淺灰 */
--fog-xlt:#C8D3DA   /* 極淺灰 */
--white:  #FFFFFF
--surface:#F7F8FA   /* 卡片背景 */
--cream:  #EFF1F4   /* 頁面背景 */
--cream-dk:#E3E6EA
--blt:    #DDE2E7   /* 邊框 */
--border: #C8D0D8   /* 深邊框 */
--text:   #2D3742   /* 主要文字 */
--textmd: #4A5568
--textlt: #8896A5
--ok:     #5A9A78   /* 成功 */
--warn:   #B87D3A   /* 警告 */
--err:    #C0392B   /* 錯誤 */
```

---

## 四、使用者設定

| 個管師 | 分機 | 負責癌別 |
|--------|------|----------|
| 楊靜雯 | 17965 | 血液淋巴癌、消化道癌、婦癌 |
| 郭美伶 | 17379 | 胸腔癌、乳癌 |
| 林伯儒 | — | 頭頸癌、肝膽胰癌、泌尿道癌（聯絡人顯示「暫無」，代理兼任）|

**合併開會**：頭頸癌+血液淋巴癌（林+楊）、消化道癌+肝膽胰癌（楊+林）

---

## 五、癌別設定（DEFAULT_C）

| 癌別 ID | 名稱 | weekday | weeknum | defaultSlot | 合併 |
|---------|------|---------|---------|-------------|------|
| head_neck | 頭頸癌 | 4（四） | 3 | 12:30-13:30 | lymphoma |
| lymphoma | 血液淋巴癌 | 4（四） | 3 | 12:30-13:30 | head_neck |
| thoracic | 胸腔癌 | 4（四） | 3 | 12:30-13:30 | — |
| breast | 乳癌 | 4（四） | 3 | 07:30-08:30 | — |
| digestive | 消化道癌 | 4（四） | 1 | 07:30-08:30 | hepatobiliary |
| hepatobiliary | 肝膽胰癌 | 4（四） | 1 | 07:30-08:30 | digestive |
| urology | 泌尿道癌 | 3（三） | 2 | 07:30-08:30 | — |
| gynecology | 婦癌 | 3（三） | 2 | 12:30-13:30 | — |

---

## 六、醫師清單（DEFAULT_DRS）

| 科別 | 醫師 |
|------|------|
| 一般外科 | 李岳聰、林建華、吳鴻昇、歐金俊 |
| 頭頸外科 | 張建明、王威群 |
| 胸腔外科 | 黃榆涵 |
| 胸腔內科 | 張竣期 |
| 消化內科 | 陳忠宏、王俊偉 |
| 血液腫瘤科 | 張正雄、劉大智（含腫瘤內科移入） |
| 影像診斷科 | 李唯揚、張哲維、葉偉成、蔡秉樺 |
| 核醫科 | 侯柏年 |
| 病理科 | 劉奕祥、賴義雄、鄧呂壕 |
| 放射腫瘤科 | 劉育昌、林伯儒、熊敬業 |
| 婦科 | 林坤沂、吳宏明、陳天惠 |
| 泌尿科 | 吳其翔、楊哲學 |

所有名稱已含「醫師」兩字。系統新增醫師時自動加「醫師」後綴。

---

## 七、localStorage 架構

| key | 內容 |
|-----|------|
| `mdt_cfg` | 癌別設定（JSON object，以 DEFAULT_C 為基礎） |
| `mdt_locs` | 地點清單（JSON array） |
| `mdt_drs` | 醫師清單（JSON array of {dept, name}） |
| `mdt_idx` | 會議索引（最多 30 筆，{id, title, date, cids}） |
| `mdt_m_{id}` | 完整會議物件 |
| `mdt_sec_{cid}_{date}` | 合併開會的單一癌別個案區段 |
| `mdt_ai` | AI 設定（provider/key/model） |

### 會議物件結構
```javascript
{
  id: string,              // "{cids.join('_')}_{uid()}"
  title: string,           // 自動生成
  cids: string[],          // 癌別 ID 陣列
  date: string,            // "YYYY-MM-DD"
  time: string,            // "07:30-08:30" 或 "12:30-13:30"
  loc: string,             // 地點名稱
  zoom: { id, pwd, url }, // 每次開會都不同，新建時空白
  contact: string,         // 自動帶入（不可手填）
  version: number,         // 每次儲存 +1
  savedBy: string,
  savedAt: string,         // ISO datetime
  sections: {
    [cid]: {
      followups: CaseFollowup[],
      cases: CaseDiscussion[],
      special: SpecialItem[]
    }
  }
}
```

---

## 八、頁面流程

```
登入（選個管師）
  └→ 行事曆首頁（本月）
      ├─ 點預排格（淡色）→ 自動建立會議 → 個案編輯
      ├─ 點已有記錄（實色）→ 智慧開啟：有個案→閱覽；空→編輯
      └─ 側欄癌別 → 開會記錄列表 → 點任一筆 → 智慧開啟
           └─ 會議頁
                ├─ 頂部薄條：時間·地點·[修改排程]
                ├─ 個案資料（含影像上傳）
                └─ 產出（閱覽模式才顯示）
```

### 模式規則
| 模式 | CSS class | 顯示 | 隱藏 |
|------|-----------|------|------|
| 修改排程（schedule） | `.mtg-schedule` | 基本資訊表單 | 個案、產出 |
| 查看記錄（record-view） | `.mtg-record.view-mode` | 個案（閱覽）、產出 | 基本資訊 |
| 編輯記錄（record-edit） | `.mtg-record`（無view-mode） | 個案（可編輯） | 基本資訊、產出 |

---

## 九、關鍵函數地圖

| 函數 | 說明 |
|------|------|
| `renderCalendar()` | 主行事曆（getNthWeekday 計算每月一次排程） |
| `openMtgSmart(id)` | 智慧開啟：有個案→view；空→edit |
| `openMtgRecord(id, editMode)` | 開啟記錄模式 |
| `openMtgSchedule(id)` | 開啟排程模式 |
| `calCreateMtg(cid, date)` | 從行事曆建立新會議（直接進個案編輯） |
| `renderEditor()` | 渲染會議頁（同時更新 CSS mode class、back btn、info bar） |
| `saveMeeting()` | 儲存 → version++、本機+共享 → 切換模式 |
| `saveOneSec(cid)` | 儲存合併開會的單一癌別 |
| `renderHistory()` | 歷史記錄（月份分組，預設收合） |
| `renderCancerCfgList()` | 癌別設定（DOM 渲染，避免換行空白行） |
| `renderDrsTab()` | 醫師管理（科別可收合，預設收合） |
| `showDelConfirm(title, fn)` | 四碼確認刪除 |
| `genPPTX()` | 產生 PPTX（含影像頁） |
| `genDOCX()` | 產生 DOCX |
| `addImg(cid, i)` | 上傳圖片（必須先 document.body.appendChild 再 click） |

---

## 十、已知限制

| 限制 | 說明 |
|------|------|
| File System Access API | 只支援 Chrome/Edge，頁面重整後 handle 失效需重連 |
| localStorage 容量 | 約 5–10 MB，Base64 圖片佔空間大（每張 3MB → 約 4MB） |
| 合併開會衝突 | 版本號只比較整數，同秒儲存可能無法偵測衝突 |
| 時區 | 所有時間以 Asia/Taipei 顯示 |

---

## 十一、打包規則

```bash
# 每次都要做：
# 1. 更新 const VERSION='V2.X.X'; 在 <script> 頂部
# 2. 更新 README.md 版本歷程
# 3. 更新本 CLAUDE.md 的版本號（第十二節）
# 4. 確認 braces 平衡、backtick 偶數
# 5. zip 檔名 = 版本號
# 6. 版本號命名規則（嚴格遵守）：
#    bug fix / hotfix      → +0.01  （如 V4.3.10 → V4.3.10）
#    新功能 / 新欄位       → +0.1   （如 V4.3.10 → V4.3.10）
#    大改版 / 架構重構     → +1.0   （如 V4.3.10 → V4.3.10）

import zipfile
os.chdir('/mnt/user-data/outputs')
with zipfile.ZipFile('MDT_V2.X.X.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.write('index.html')
    z.write('README.md')
    z.write('CLAUDE.md')
```

---

## 十二、版本（當前 V4.3.10）

| 版本 | 關鍵變更 |
|------|---------|
| V4.3.10 | 影像投影片 CSS Grid 自動填滿（1/2/4張）+ 邊距 2vh 2.5vw |
| V4.2.23 | 乳攝 HTML 比例 2:4:4；相關影像/手術照片每頁張數控制（imgsPerSlide/surgImgsPerSlide）|
| V4.2.22 | addmammoimg/delmammoimg 改 replaceWith；caption input 樣式加框|
| V4.2.21 | 修正 buildImgArea/buildMammoImgArea 缺 const cap=（打包遺漏）|
| V4.2.20 | _pathImgCache 擴充讀入所有 fromFolder 影像（病理/手術/相關/乳攝）|
| V4.2.19 | HTML 投影片檔名加「多專科會議」後綴 |
| V4.2.18 | 四種影像加入可編輯 caption input；data-action=updimgcaption change delegation |
| V4.2.17 | caseViewHTML 加入手術照片區塊；data-action=previewsurgimg delegation |
| V4.2.16 | 修正相關影像預覽失效：改 data-action=previewrelatedimg，確認手術影像在閱覽模式不顯示（無此問題）|
| V4.2.15 | 修正乳攝預覽失效：改 data-action=previewmammoimg，與 previewpathimg 相同模式 |
| V4.2.14 | 修正儲存後未返回閱覽模式（saveMeeting 改 S.viewMode=true + renderEditor）|
| V4.2.13 | 修正乳攝照片跑到相關影像（elOk 先查 imgs- 的 bug）；加入圖片壓縮防卡頓 |
| V4.2.12 | HTML 投影片檔名改為「日期_癌別.html」（日期在前，不加投影片後綴）|
| V4.2.11 | 還原至 V4.2.5，僅修正 extraJs 中誤植的 Ctrl+S handler（S.meeting 引用白屏 bug）|
| V4.2.5 | 影像資料夾雙層：根目錄+自動子目錄（日期+癌別）；自訂覆蓋；設定頁選根目錄 |
| V4.2.4 | 影像資料夾改每場會議各自設定（key=imgFolder_{meetingId}）；自動恢復授權；清除/更換各自獨立 |
| V4.2.3 | imgFolderHandle 改 IndexedDB 持久化；pickUser 時自動恢復授權；設定頁加影像資料夾 tab |
| V4.2.2 | 修正 JSON 匯入後病人消失：繞過 renderCasesInner 改直接 DOM append，避免 loadMergedSections 蓋掉未儲存新個案 |
| V4.2.1 | caseHTML 預設 cc-collapsed；addItem 新卡展開其他收合；doImportCase 匯入後展開最後一筆 |
| V4.2.0 | renderEditor 初始化 activeCid；getOutputCid 驗證 activeCid 在 S.cids；autoImportPrevFollowups 加 try/catch |
| V4.1.9 | addItem 新增個案時自動收合同區塊其他個案；JSON 匯入後展開並捲動到最後匯入個案 |
| V4.1.8 | 修正 HTML 投影片/分享：cases.forEach 結尾括號錯置，導致 surgical images 引用 c is not defined |
| V4.1.7 | 修正 HTML 分享上傳失敗：shareHTMLSlides 缺 async；移除 existUrl/token 未定義死碼 |
| V4.1.6 | 合併開會各癌別獨立產出（LINE/HTML/PPTX/DOCX/Excel/JSON 均依目前 tab）；產出區顯示目前癌別並可切換 |
| V4.1.5 | 標籤「前次醫療小組日期」改名為「上次多專科日期」；新建會議自動帶入：個案討論 + 醫療小組同時帶入前期追蹤 |
| V4.1.4 | 前期追蹤卡片加入 ▶/▼ 收合圖示；產出第三排按鈕統一為 grid repeat(5,1fr) |
| V4.1.3 | followupHTML 加入收合/展開；自動帶入的前期追蹤預設收合（cc-collapsed） |
| V4.1.2 | 新建會議自動帶入上次同癌別個案至前期追蹤 |
| V4.1.1 | 修正 JSON.stringify(all) 在 onclick 造成字串外洩；改用全域變數 _fupImportCid/_fupImportAll |
| V4.1.0 | 週備份提醒；個案標記（首次/複雜/緊急）可複選；歷史決策側欄；本月統計摘要 |
| V4.0.2 | 產出末排 AI 按鈕改 flex；前期追蹤帶入清單改固定欄位寬度 |
| V4.0.1 | 「從歷史帶入」改至前期追蹤；openFollowupImport 以勾選帶入 |
| V4.0.0 | 自動儲存每 2 分鐘；離開提醒 beforeunload；個案↑↓排序；跨會議個案搜尋；從歷史帶入前期追蹤 |
| V3.9.6 | 產出按鈕改 CSS Grid repeat(5,1fr)，三排等寬填滿 |
| V3.9.5 | 新增 Breast SONO；影像檢查選「其他」可自填 |
| V3.9.4 | AI 匯入 prompt 更新：exams/markers/familyHistory/topics 說明精確化 |
| V3.9.3 | 個案輸入頁面 UI 整理：年齡/性別合併、診斷3行、過去病史副標籤、癌指數移臨床資料、影像檢查改名、會議記錄用 fsec |
| V3.9.2 | 還原：會議日期與結構欄位不預填今天 |
| V3.9.1 | 病理/檢查/治療/癌指數新增日期不預填（還原）；儲存後保持編輯模式 |
| V3.9.0 | 首頁「+ 新建」按鈕；openNewModal 預填癌別日期；新個案預設展開；Ctrl+S 儲存；選科別自動帶入醫師 |
| V3.8.8 | 所有影像資料夾選取按鈕標籤統一；乳攝選取按鈕永遠顯示 |
| V3.8.7 | 移除列印/PDF；產出按鈕重新排列；資料夾授權提示移頂部 |
| V3.8.6 | pathImgFolderHandle 與 imgFolderHandle 合併為單一資料夾授權 |
| V3.8.5 | for await 改用 _folderEntries() helper，修正 Chrome SyntaxError |
| V3.8.0 | LINE 通知 tag() 改依 ca.id 分組查找，修正癌別誤判 |
| V3.7.0 | GitHub 分享已分享清單（複製連結/開啟/刪除） |
| V3.6.0 | extraJs 獨立 script block 修正多層跳脫；合併會議 bug 修正 |
| V3.5.0 | GitHub Pages 投影片分享功能（HTML 分享按鈕） |
| V3.4.0 | HTML 投影片手術照片區；病理染色影像資料夾模式 |
| V3.3.0 | JSON 批次匯入/匯出；AI 匯入提示詞；per-key merge loadAll |
| V3.2.0 | 乳攝欄位（mammo）；家族史欄位；phChips 結構統一 |
| V3.1.0 | highlight toolbar（五色）；病理染色影像欄位 |
| V3.0.9 | 修復 genLine tag is not a function；HTML 投影片改左右兩欄 |
| V3.0.8 | addStruct/delStruct 改局部 DOM，不跳頁 |
| V3.0.7 | 編輯模式預設展開；LINE 通知顯示子癌別 |
| V3.0.6 | 新增個案依癌別預選第一主治科別 |
| V3.0.5 | 診斷/現病史多行；Bone scan；癌指數區塊；HTML 投影片圖片頁 |
| V3.0.4 | HTML 投影片：診斷移入深色標題列 |
| V3.0.3 | HTML 投影片：依診斷自動子分組（膀胱/攝護腺/腎臟等） |
| V3.0.2 | HTML 投影片病理渲染重寫；Excel 匯入功能 |
| V3.0.1 | 移除 isOwn 編輯限制，任何登入者可編輯所有癌別 |
| V3.0.0 | 個案卡片預設收合；閱覽模式單獨編輯按鈕 |
| V2.9.9 | HTML 投影片：病歷號/姓名加粗放大、&nbsp; 亂碼修正、膠囊型導覽 |
| V2.9.8 | HTML 投影片：字體放大、topics chip 加大、側邊導覽列 |
| V2.9.7 | HTML 投影片全面改版：表格式佈局、癌別色彩、字體放大 |
| V2.9.6 | HTML 投影片全版 flex 佈局；修正 </script> 洩漏 bug |
| V2.9.5 | （跳過，版本含嚴重 bug） |
| V2.9.4 | 個案可收合；新增個案選擇對話框；列印 CSS 修正 |
| V2.9.3 | 列印改 A4 橫向 |
| V2.9.2 | 列印/PDF 改善：會議標題頁、隱藏 UI、每案獨頁 |
| V2.9.1 | 新增匯入個案 JSON 功能（+ 附匯入用 prompt） |
| V2.9.0 | 新增列印/PDF 功能（@media print + window.print） |
| V2.8.7 | 修正 PPTX/Excel 下載：明確 appendChild+click |
| V2.8.6 | PPTX 標題列簡化；診斷移入內容列 |
| V2.8.5 | 修正 PPTX/Excel 下載權限問題（arraybuffer→Blob） |
| V2.8.4 | 檢查/治療兩行版面；PPTX 個案自動多頁 |
| V2.8.3 | 修正新增條目日期消失；PPTX 行高更保守 |
| V2.8.2 | 病理/檢查/治療欄位排版改善 |
| V2.8.1 | 修正 V2.8.0 SyntaxError：PPTX split 換行符 |
| V2.8.0 | 病理改多筆條列；PPTX addRow 動態行高修正重疊 |
| V2.7.7 | LINE 通知每位病人加癌別標籤【癌別名】 |
| V2.7.6 | LINE 通知格式全面重寫：統一縮排，顯示癌別 |
| V2.7.5 | DOCX 補齊所有欄位；DOCX/LINE 加入醫療小組/必要事件 |
| V2.7.4 | 修正醫療小組/必要事件 addItem/delItem/upd 的 cid 傳遞 |
| V2.7.3 | LINE 通知個案列加入診斷 |
| V2.7.2 | 修正 genLine 個案醫師：c.doctor→getDoctorStr(c) |
| V2.7.1 | Excel 去遮蔽；JSON 全量備份/還原（含影像），可跨裝置合併 |
| V2.7.0 | 新增 Excel 匯出（5 個 sheet：個案/檢查/治療/前期追蹤/會議資訊） |
| V2.6.7 | 所有輸出函數醫師欄位改用 getDoctorStr()，相容新舊格式 |
| V2.6.6 | 醫師名稱去 dept 前綴；新增必要事件區塊 |
| V2.6.5 | 醫療小組移到特殊議程前；按鈕文字修正 |
| V2.6.4 | 新增醫療小組區塊；消化/乳/肝膽地點→一樓人文；migrateCFG |
| V2.6.3 | migrateCFG()：修正頭頸/血淋地點（localStorage 覆蓋 DEFAULT 問題） |
| V2.6.2 | 林伯儒不列聯絡人；合併顯示多個管師；新地點；migrateLOCS |
| V2.6.1 | 聯絡人合併所有癌別負責人 |
| V2.6.0 | 檢查下拉選單+設定管理；術語統一（現病史/過去病史/檢查） |
| V2.5.6 | 儲存後隱藏放棄編輯按鈕；PPTX 補齊 PH/病理/Exam/治療欄位 |
| V2.5.5 | 討論項目 chips 修 BUG-001；delegation 區塊重寫；PH 顯示 HTN(+) 格式 |
| V2.5.4 | PPTX 前期追蹤動態行高；PH chips 顯示在閱覽/LINE |
| V2.5.3 | Exam/治療 textarea 多行；特殊議程類別 chips |
| V2.5.2 | PH chips delegation 修正；Exam/治療欄位比例調整 |
| V2.5.1 | 修正 drSelect2→drSelDept；新增 toggleTopic()；更新 genTestData |
| V2.5.0 | 個案表單大改版：PHchips、病理欄、Exam/治療條列、M/F 性別 |
| V2.4.2 | 影像說明欄（上傳時可填說明）；閱覽模式顯示影像清單+說明+預覽按鈕 |
| V2.4.1 | BUG-001 修正：buildImgArea 改用 data-action+事件委派，影像按鈕真正可用 |
| V2.4.0 | 追蹤說明/討論要點改 textarea；addImg 加 setTimeout+addEventListener |
| V2.3.1 | PPTX 前期追蹤加說明列；DOCX 個案討論聚焦摘要/結論 |
| V2.3.0 | 手機底部 tab 導覽 + 頂部列 + 使用者切換 Sheet |
| V2.2.4 | 日曆格子四邊框；renderCalendar 改 DOM 操作 |
| V2.2.3 | 手機日曆縮短癌別名；歷史記錄 flex-wrap |
| V2.2.2 | 手機 UI 全面優化（底部 tab + 設定 tab 縮短 + 行事曆標題） |
| V2.2.1 | 歷史記錄視覺優化：癌別標籤去色、按鈕層次、月份標頭色調 |
| V2.2.0 | 歷史記錄/開會列表移除版本號，單行顯示 |
| V2.1.9 | migrateDRS() + migrateCFGConv()：自動修正 localStorage 舊資料 |
| V2.1.8 | conv 欄位補 dept:: 前綴；breast/lymphoma/hepatobiliary 補 defaultSlot |
| V2.1.7 | 腫瘤內科→消化內科；張正雄/劉大智移血液腫瘤科；侯柏年移出影像診斷科 |
| V2.1.6 | 腫瘤外科→一般外科；王威群移頭頸外科；歐金俊移一般外科；召集人下拉修正 |
| V2.1.5 | 醫師清單合併重複科別；時間改下拉（早會/午會）；聯絡人唯讀；README 重整 |
| V2.1.4 | 癌別設定改 DOM 渲染（修正空白行）；醫師科別預設收合；預載資料重設計 |
| V2.1.3 | 癌別設定：每個癌別各自有「儲存」按鈕 |
| V2.1.2 | 聯絡人自動帶入；新建會議 Zoom 預設空白；癌別設定新增 defaultSlot |
| V2.1.1 | 修正 deleteMtg 漏到 </html> 之後導致程式碼顯示在頁面 |
| V2.1.0 | 刪除四碼確認；修正影像上傳（需先 appendChild 再 click） |
| V2.0.5 | 移除 17 重複函數、36 廢棄 CSS |
| V2.0.x | 影像支援；PPTX 全新排版；智慧開啟模式；前期追蹤卡片樣式；歷史記錄 |
| V1.9.x | 行事曆首頁、weeknum 每月一次、月份歷史分組；V1.9.1–V1.9.4：行事曆 bug 修正 |
| V1.8.x | 行事曆首頁上線；V1.8.1–V1.8.2：語法 bug 修正 |
| V1.7.0 | 合併開會分 tab 編輯；地點/時間/召集人改下拉；醫師管理可新增科別 |
| V1.6.0 | Noto Sans TC 字型；合併開會分開存（mdt_sec） |
| V1.5.x | 排程/記錄模式分離；登入頁版本號；編輯流程修正 |
| V1.4.0 | 基礎功能：閱覽/編輯、設定、AI、LINE、PPTX/DOCX |

---

## 十三、待辦事項

- [ ] 行事曆：點格子後顯示更多資訊（今日幾場、哪個個管師）
- [ ] 癌別設定：可調整 weekday/weeknum（第幾個星期幾）
- [ ] 設定：可新增癌別
- [ ] 輸出：LINE 通知可自訂範本
- [ ] 共享資料夾：頁面重整後自動重連（requestPermission API）

---

## 十四、手機 UI（V2.3.0+）

≤768px 時側欄完全隱藏，改為：

```
[MOB-TOPBAR] fixed top 48px  → MDT | 頁面標題 | [使用者頭像按鈕]
[CONTENT]    padding-top:48px, padding-bottom:56px
[MOBILE-NAV] fixed bottom 56px → 行事曆 | 癌別 | 記錄 | 設定
```

| 元素 | ID | 說明 |
|------|----|----|
| 頂部列 | `#mob-topbar` | 固定，顯示頁面標題 + 使用者按鈕 |
| 使用者 Sheet | `#mobile-user-sheet` | 底部滑出，切換個管師 |
| 底部導覽 | `#mobile-nav` | 4個 tab，含癌別 Sheet |
| 癌別 Sheet | `#mobile-cancer-sheet` | 底部滑出，選擇癌別 |

函數：`openUserSheet()`, `closeUserSheet()`, `openCancerSheet()`, `closeCancerSheet()`, `setMNav(id, title)`

- 切換使用者呼叫 `pickUser(id)` → 自動更新頂部列
- 導覽 tab 切換自動更新頁面標題

---

## 十五、重要 Bug 記錄（避免重犯）

### BUG-001：innerHTML 注入後事件消失
**症狀**：按鈕按下無反應（addImg、delImg、影像預覽）  
**根本原因**：`buildImgArea()` 回傳 `outerHTML` 字串，再用 `innerHTML` 插入 DOM。`innerHTML` 序列化時，JS 事件屬性（`onclick=()=>fn()`）完全不存在於 HTML 字串，注入後就消失。  
**正確做法**：改用 `data-action="addimg"` 等 data attributes，在 `document` 層級做事件委派：
```javascript
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="addimg"]');
  if(el) addImg(el.dataset.cid, el.dataset.idx);
});
```
**教訓**：只要函數回傳 HTML 字串（outerHTML / innerHTML string），任何 `.onclick=` 都會失效。一律改用 data attributes + 事件委派。

---

### BUG-002：onclick 字串拼接引號衝突
**症狀**：`Uncaught SyntaxError: Unexpected string`  
**原因**：在字串內用 `''` 夾住變數（`onclick="fn(''+id+'')"`）  
**正確做法**：
- 用 data attribute + event delegation（最佳）
- 或用 `\\'` 轉義：`onclick="fn(\\''+id+'\\')"` 
- 或用 DOM `createElement` + `.onclick = () => fn(id)`  
**教訓**：凡是 onclick 字串裡有變數，一律改成 data attribute。

---

### BUG-003：innerHTML template literal 換行產生空白節點
**症狀**：設定頁癌別設定底部出現多餘空白行  
**原因**：template literal 內有真實換行字元（如選項之間的 `\n`），`innerHTML` 解析後成為 Text 節點，flex/grid 中可見  
**正確做法**：改用 `document.createElement` + `appendChild` 建構 DOM，完全避開 innerHTML 換行問題  
**教訓**：用 innerHTML 設定複雜 HTML 時，template literal 換行要特別注意。

---

### BUG-004：loadAll 從 localStorage 讀舊資料，DEFAULT 變更無效
**症狀**：更新 DEFAULT_DRS 科別名稱後，頁面仍顯示舊科別  
**原因**：`DRS = localStorage.getItem('mdt_drs') ? JSON.parse(...) : DEFAULT_DRS`  只在 localStorage 空時才用 DEFAULT  
**正確做法**：`loadAll()` 後執行 `migrateDRS()` 和 `migrateCFGConv()` 遷移函數，自動修正舊資料  
**教訓**：任何資料結構變更（重命名、重組）都必須寫遷移函數。

---

### BUG-005：JS 漏到 `</html>` 之後
**症狀**：JS 程式碼顯示在頁面上（history 列表顯示函數原始碼）  
**原因**：替換舊函數時，搜尋字串找到了文件末尾的副本（之前意外附加），新函數拼接到 `</html>` 後  
**正確做法**：替換前先確認字串在 `<script>` 範圍內；打包前確認 `html.strip().endswith('</html>')`  
**教訓**：每次打包前 `print("HTML ends:", html.strip().endswith('</html>'))`

---

### BUG-006：addImg 無法觸發（file input click 無效）
**症狀**：點新增影像無反應  
**原因 1**：input 在 body.appendChild 之前就 click，部分瀏覽器需要在 DOM 中才能觸發  
**原因 2**（最終根本原因）：是 BUG-001，addImg 按鈕的 onclick 在 innerHTML 後消失  
**正確做法**：
1. 用 document 事件委派（見 BUG-001）
2. addImg 內用 `setTimeout(() => input.click(), 50)` 確保 input 在 DOM 中
3. `input.addEventListener('change', ...)` 而非 `onchange=`

---

### BUG-007：日曆格子全部垂直排列（grid 不生效）
**症狀**：行事曆變成一列一格垂直排列  
**原因**：`.cal-grid` CSS class 設定 `display:grid`，但 HTML 元素只有 `id="cal-grid"` 沒有 `class="cal-grid"`，所以 CSS 從未套用  
**正確做法**：`<div id="cal-grid" class="cal-grid">`  
**教訓**：CSS class 與 HTML 元素的 id/class 必須同步。修改 CSS class 名稱時也要更新 HTML。

---

### BUG-008：braces 不平衡導致 Unexpected end of input
**症狀**：`Uncaught SyntaxError: Unexpected end of input`（通常在最後一行）  
**診斷**：
```python
script = re.search(r'<script[^>]*>(.*?)</script>', html, re.DOTALL).group(1)
print(script.count('{'), script.count('}'))
```
**常見原因**：移除舊函數時只刪了 `{` 那行沒刪對應的 `}`，或 template literal 裡的 `{}` 被算進去  
**教訓**：每次打包前必查 braces 平衡。


---

### BUG-009：event delegation 區塊被截斷（brace mismatch -2）
**症狀**：`Uncaught SyntaxError`，程式無法執行  
**原因**：用 `rstrip('}').rstrip(')')` 嘗試移除 `});` 結尾，結果把 `});` 截成 `})` 失去 `;`，後續追加的程式碼形成懸空語句，造成 brace -2  
**修法**：永遠完整重寫整個 delegation 區塊，不做部分字串剪貼  
**教訓**：修改 event delegation 時，用整塊替換而不是 rstrip 嘗試拼接

---

### BUG-010：tchip `<label>` + checkbox 雙重觸發互相抵消
**症狀**：PH chips、討論項目 chips 按了沒反應  
**原因**：`<label onclick="fn()">` 內有 `<input type="checkbox">`，點擊 label 同時觸發 onclick (1次) 和 checkbox change (1次)，兩次 toggle 淨效果為零  
**修法**：改為 `<span data-action="xxx">` + document 事件委派，完全移除 checkbox  
**教訓**：凡是 chip/toggle 元件，一律用 `<span data-action>` + delegation，絕不用 `<label>+<checkbox>`

---

### BUG-011：info-edit 放棄編輯按鈕儲存後仍可見
**症狀**：儲存後頁面切換到閱覽模式，但「放棄編輯」按鈕還顯示著  
**原因**：`.view-mode .sec-foot{display:none}` 只隱藏了 `.sec-foot`，而「放棄編輯」在 `.info-edit` div 裡  
**修法**：加一條 `.view-mode .info-edit{display:none!important}`  
**教訓**：儲存切換到 viewMode 時，所有編輯控制項（不只 sec-foot）都需要 CSS 隱藏規則

---

### BUG-012：DEFAULT 資料改動對 localStorage 舊資料無效（通用）
**症狀**：改了 `DEFAULT_C`、`DEFAULT_LOCS`、`DEFAULT_DRS` 後，頁面仍顯示舊資料  
**原因**：`loadAll()` 優先讀取 localStorage，只有 localStorage 為空時才用 DEFAULT  
**修法**：每次改動 DEFAULT 資料，必須同步寫遷移函數（`migrateCFG`、`migrateLOCS`、`migrateDRS`），在 `loadAll()` 後自動執行  
**教訓**：任何 DEFAULT 資料的變更（欄位改名、值更新、新增項目），都要問：「localStorage 裡的舊資料會怎樣？」然後寫遷移函數。
