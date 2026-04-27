# MDT 會議管理系統

**彰濱秀傳癌症中心 多專科團隊會議管理工具**  
部署網址：https://sela1227.github.io/mdt-system/  
單一 HTML 檔案，無需後端，資料存於 localStorage + 共享資料夾同步

---

## 使用者

| 個管師 | 分機 | 負責癌別 |
|--------|------|----------|
| 楊靜雯 | 17965 | 血液淋巴癌、消化道癌、婦癌 |
| 郭美伶 | 17379 | 胸腔癌、乳癌 |
| 林伯儒 | — | 頭頸癌、肝膽胰癌、泌尿道癌（聯絡人顯示「暫無」）|

**合併開會**：頭頸癌+血液淋巴癌（林+楊）、消化道癌+肝膽胰癌（楊+林）

---

## 主要功能

### 行事曆首頁
- 登入後直接顯示本月行事曆（西元年）
- 依各癌別設定的「第幾個星期幾」顯示預排格（淡色斜線紋）
- 已有記錄：實色帶陰影，點擊直接進入個案資料
- 未有記錄：點擊自動建立新會議並進入個案編輯
- 上個月 / 本月 / 下個月 導覽

### 癌別開會記錄列表
- 點任一場：智慧判斷模式（有個案→閱覽；空的→直接編輯）
- 每筆顯示日期、個案數量（「N筆個案」/ 「待填寫」）

### 排程模式（修改時間地點）
- 日期
- 時間（下拉二選一：07:30–08:30 早會 / 12:30–13:30 午會）
- 地點（下拉，從地點管理選取）
- Zoom ID / 密碼 / 連結（每次不同，新建時預設空白）
- 聯絡人（自動帶入負責個管師，不可修改）

### 記錄模式（個案資料）
頁頂薄條顯示：時間 · 地點 · [修改排程]

個案討論：病歷號、姓名（遮蔽中字）、年齡/性別、主治醫師（三位）、診斷、CC、PH、Exam、治療、討論、討論主題、摘要、決策、影像（最多5張）

前期追蹤：病歷號、姓名、主治、前次日期、說明

### 合併開會
- 各 tab 有各自的「儲存 [癌別名]」按鈕，分開存
- 自己的 tab 可編輯，另一個管師的 tab 為閱覽模式
- PPTX / DOCX 輸出時合併成一份

### 影像
- 每個個案最多 5 張（JPEG/PNG，每張 ≤ 3 MB），Base64 存 localStorage
- 點擊放大（黑底 Lightbox）；閱覽模式只能看不能新增/刪除

### 產出（閱覽模式）
| 類型 | 說明 |
|------|------|
| LINE 通知 | 純文字，前期追蹤排首位 |
| AI 提示詞 | 複製完整個案資料貼到 claude.ai |
| PPTX 簡報 | 封面、癌別分節、個案頁（含討論 chip）、摘要頁、影像頁 |
| DOCX 會議記錄 | 含摘要/決策欄位 |
| AI 生成摘要 | 需設定 API Key |

### 歷史記錄
- 以年月分組，預設收合，顯示場次數
- 雙篩選：癌別 + 個管師
- 每筆可：查看記錄 / 修改排程 / 刪除

### 設定
- **地點管理**：新增/刪除/排序
- **醫師管理**：依科別管理（科別可收合，預設收合），新增科別/醫師（名稱自動加「醫師」）
- **癌別設定**：每個癌別各自儲存，含地點、時間、召集人、核心成員、開會星期/週次、色碼
- **AI 設定**：API Key、模型、測試連線
- **共享資料夾**：File System Access API（Chrome/Edge）

### 刪除保護
所有刪除操作需輸入隨機四碼確認，防止誤觸。

---

## 資料儲存架構

| localStorage key | 內容 |
|-----------------|------|
| `mdt_cfg` | 癌別設定 |
| `mdt_locs` | 地點清單 |
| `mdt_drs` | 醫師清單 |
| `mdt_idx` | 會議索引（最多 30 筆） |
| `mdt_m_{id}` | 完整會議物件 |
| `mdt_sec_{cid}_{date}` | 合併開會的單一癌別個案區段 |
| `mdt_ai` | AI 設定 |

共享資料夾檔名格式：`{cids}_{date}.json`

版本衝突機制：每次儲存 version 整數 +1，開啟時比較本機與共享版本，不同則顯示衝突解決介面。

---

## 技術規格

- 單一 `index.html`，無外部框架，無後端
- CDN（院內確認可用）：jsdelivr.net — pptxgenjs@3.12.0、docx@7.8.2
- 字型：Noto Sans TC + Noto Serif TC（Google Fonts）
- 時間同步：TimeAPI.io → Cloudflare Trace → 本機 fallback
- AI API：api.anthropic.com（院內 CORS 已確認）
- 瀏覽器要求：Chrome / Edge（File System Access API）

---

## 版本歷程

### V4.3.35
會後填寫功能：產出區新增「會後填寫」按鈕；全螢幕 panel 依癌別分組顯示前期追蹤（結案/繼續追蹤）和個案討論（摘要/結論/不列入下次追蹤）；存檔後寫回 meeting；autoImportPrevFollowups 加 followNext 和 ongoing 過濾

### V4.3.31
DOCX 會議記錄全面改版：定位改為「會議決議確認單」；深藍色個案標題色塊；只保留診斷/治療/討論摘要/決策結論；前期追蹤加結案狀態；移除簽署欄，改為頁尾記錄者+日期；字型統一新細明體 12pt；頁邊距縮小優化手機閱讀

### V4.3.30
【第一批】跨機同步前置：新增 createdBy 欄位至 newMeetingObj；canEditMeeting() 判斷是否為建立者；非建立者的會議顯示「建立者：XXX」badge，編輯按鈕 disabled；enterEditMode() 加權限檢查

### V4.3.29
NAS 備份改為每天首次啟動時觸發（登入後 3 秒背景執行），移除每次存檔觸發；新增 _shouldNasBackupToday / _markNasBackupToday 輔助函數

### V4.3.28
設定頁重整：11個tab → 7個tab（地點/醫師/癌別/檢查項目/影像資料夾/備份/系統）；備份tab整合共享資料夾+NAS+備份還原+空間使用；系統tab整合AI+GitHub+測試資料

### V4.3.27
NAS 自動備份：設定頁新增 NAS tab（選取資料夾/測試/狀態）；每次 saveMeeting 後背景執行 backupToNAS()（含全部圖片 base64）；最多保留 10 份，靜默失敗不中斷操作

### V4.3.26
「病理切片影像集中」checkbox 移至資料夾狀態列同排右側（margin-left:auto），grid 5欄全為按鈕

### V4.3.25
「病理切片影像集中」checkbox 移入 HTML 投影片格內（flex column），grid 維持 5 欄整齊

### V4.3.24
修正放大鏡座標偏移：病理切片投影片使用 object-fit:contain 置中圖片，letterbox 留白導致座標偏移；改為先計算實際渲染區域（offX/offY）再換算像素座標，所有使用 contain 的圖片均修正

### V4.3.23
HTML 投影片新增「病理切片影像集中於各癌別結尾」checkbox：勾選後各癌別所有個案主頁先產出，病理切片影像統一移至該癌別最後；手術/相關/乳攝影像不受影響

### V4.3.22
特殊議程影像補加「清除全部」按鈕（buildSpecialImgArea 補 clearAction + delegation）；選圖對話框補檔名顯示（同 pickimgfolder 格式：baseName + ext badge + hover）

### V4.3.21
整併 buildImgArea / buildPathImgArea / buildSurgicalImgArea / buildSpecialImgArea 四個函數為一個通用 buildGenericImgArea，各原函數保留為薄包裝層，省約 40KB

### V4.3.20
移除死碼 addImg()（直接上傳相關影像，已無任何呼叫點），僅此一函數，其餘不動

### V4.3.19
localStorage 管理三改：①索引上限從 30 提升至 100 筆 ②saveLocal 自動清除孤兒 mdt_m_ key ③設定頁新增儲存空間使用量儀表板（進度條 + 會議筆數 + 圖片佔用）

### V4.3.18
特殊議程 HTML 投影片右上角標籤改為「特殊議程」，不顯示癌別名稱

### V4.3.17
特殊議程閱覽模式加入影像預覽按鈕（fromFolder 走 imgFolderHandle 讀取）

### V4.3.16
前期追蹤帶入後預設收合（_autoImported 標記）；新增前期追蹤時也預設收合；刪除前期追蹤需二次確認；特殊議程圖片選擇器顯示完整檔名

### V4.3.15
類別順序：「其他」移至最後；自動儲存改為 silent 模式（不切回閱覽），只有手動按儲存才切換

### V4.3.14
特殊議程（非四率）新增影像上傳：📂 從共用資料夾選取、每頁張數（1/2/4）、img-slide 頁產出（支援放大縮小、放大鏡）

### V4.3.13
修正四率 chips 無法點選：data-action 誤植在 class attribute 內，造成 delegation 找不到目標

### V4.3.12
四率 HTML 投影片產出：完治率（統計摘要 + 未完治病人分頁 + 佐証圖片）；失聯率/留治率/訪視率（多癌別統計表 + 病人清單 + 佐証圖片）；達標綠色/未達標紅色

### V4.3.11
乳攝投影片加 img-slide class；滾輪縮放改追蹤 _zoomTarget（多圖頁每張獨立縮放）；放大鏡改 elementFromPoint；四率 chips 加入所有類別供切換

### V4.3.10
事件軸視覺優化：節點按日期比例分佈（A）+ 節點大小依類型分級（dx/surgery=14, chemo/rt=9, follow/imaging=7）+ 線條 2px

### V4.3.9
三率編輯模式（失聯率/留治率/訪視率）：多癌別行輸入、失聯率額外欄（總收案數/死亡個案）、即時達標顏色、指標定義預設文字可儲存；完治率重建並加達標顏色；全面改 data-action delegation

### V4.3.2（穩定基準）
刪除有資料的個案需二次確認；事件軸新增時改為逐筆 append（不重渲染所有列）

### V4.3.1
修正治療事件軸無法手動新增（addStruct/delStruct/updStruct 加入 timeline 處理）；每頁張數選單移至標籤旁

### V4.3.0
新功能：治療事件軸（蛇形 SVG Timeline）—編輯模式含「從治療記錄帶入」；閱覽模式 SVG；HTML 投影片最後頁深色背景
### V4.2.24
HTML 投影片影像區塊改為自動填滿：依每頁張數（1/2/4）以 CSS Grid 均分滿版，保留 2vh 2.5vw 邊距；病理影像同步加入邊距

### V4.2.23
乳攝 HTML 分頁比例改 2:4:4（說明20%，影像各40%）；相關影像/手術照片編輯欄新增每頁張數選擇（1/2/4）

### V4.2.22
修正乳攝清除後無法新增：addmammoimg / delmammoimg 改用 replaceWith（避免 innerHTML 嵌套 mammo-imgs 容器）；caption 欄位樣式加框線加深色，明顯度提升

### V4.2.21
修正 buildImgArea / buildMammoImgArea 缺少 const cap= 定義，導致編輯模式 cap is not defined 錯誤

### V4.2.20
修正 HTML 投影片 _pathImgCache 只讀病理影像：擴充為同時讀入手術/相關/乳攝三種 fromFolder 影像

### V4.2.19
HTML 投影片檔名改為「日期_癌別多專科會議.html」（如 2026-04-20_乳癌多專科會議.html）

### V4.2.18
四種影像（病理/手術/相關/乳攝）加入可編輯說明欄：預設顯示檔名，點擊可輸入自訂描述，存檔後保留

### V4.2.17
閱覽模式加入手術照片區塊（previewsurgimg），補齊與病理影像、乳攝、相關影像相同的預覽功能

### V4.2.16
修正相關影像預覽失效：改用 data-action="previewrelatedimg" + event delegation（同乳攝修正模式）

### V4.2.15
修正乳攝預覽失效：閱覽模式乳攝按鈕改用 data-action="previewmammoimg" + event delegation，不再用 onclick 內嵌 base64

### V4.2.14
修正儲存後未返回閱覽模式：saveMeeting setTimeout 改為儲存後切換 S.viewMode=true 並呼叫 renderEditor

### V4.2.13
修正乳攝照片跑到相關影像：elOk/elR 改依 type 選擇正確 DOM 元素；addmammoimg 加入壓縮（最長邊 1200px，JPEG 0.75）解決卡頓

### V4.2.12
HTML 投影片下載/分享檔名改為「日期_癌別.html」（如 2026-04-20_乳癌.html）

### V4.2.11
還原至 V4.2.5 基礎，只移除 extraJs 中誤植的 Ctrl+S handler（S.meeting 引用），暫不刪除重覆碼

### V4.2.5
影像資料夾雙層架構：設定根目錄後自動按日期+癌別建立子目錄（如 20260416 乳癌）；亦可手動為每場會議自訂資料夾；優先順序：自訂 > 根目錄子目錄 > 根目錄

### V4.2.4
影像資料夾改為每場會議各自設定，以 meeting.id 為 key 存 IndexedDB；進入會議自動恢復，有記錄但未授權時顯示「點此恢復授權」

### V4.2.3
影像資料夾改用 IndexedDB 持久化：設定一次，重新開啟 App 自動恢復授權；設定頁新增「影像資料夾」tab 集中管理

### V4.2.2
修正 JSON 匯入病人消失：renderCasesInner 在合併會議時呼叫 loadMergedSections 覆蓋尚未儲存的新個案；改為直接 DOM 操作 append

### V4.2.1
caseHTML 預設收合（cc-collapsed）；addItem 新卡片先移除 cc-collapsed 再收合其他；doImportCase 匯入後展開最後一筆

### V4.2.0
renderEditor 初始化 S.activeCid；getOutputCid 驗證 activeCid 在 S.cids 內；autoImportPrevFollowups 加 try/catch 防止新建會議失敗

### V4.1.9
新增個案時自動收合其他個案（accordion 恢復）；JSON 匯入後自動展開並捲動到最後匯入的個案

### V4.1.8
修正 HTML 投影片 / HTML 分享失敗：cases.forEach 結尾括號錯置於 surgical images forEach 之前，導致 c is not defined

### V4.1.7
修正 HTML 分享上傳失敗：shareHTMLSlides 缺少 async 關鍵字導致 await 語法錯誤；移除殘留的 existUrl/token 未定義死碼

### V4.1.6
合併開會各癌別獨立產出（LINE/HTML/PPTX/DOCX/Excel/JSON 均依目前 tab 產出）；產出區顯示目前產出癌別並可一鍵切換

### V4.1.5
標籤「前次醫療小組日期」改名為「上次多專科日期」；新建會議自動帶入：個案討論 + 醫療小組同時帶入前期追蹤

### V4.1.4
前期追蹤卡片加入 ▶/▼ 收合圖示；產出第三排按鈕統一為 grid repeat(5,1fr)

### V4.1.3
followupHTML 加入收合/展開；自動帶入的前期追蹤預設收合（cc-collapsed）

### V4.1.2
新建會議自動帶入上次同癌別個案至前期追蹤

### V4.1.1
修正 JSON.stringify(all) 在 onclick 造成字串外洩；改用全域變數 _fupImportCid/_fupImportAll

### V4.1.0
週備份提醒；個案標記（首次/複雜/緊急）可複選；歷史決策側欄；本月統計摘要

### V4.0.2
產出末排 AI 按鈕改 flex；前期追蹤帶入清單改固定欄位寬度

### V4.0.1
「從歷史帶入」改至前期追蹤；openFollowupImport 以勾選帶入

### V4.0.0
自動儲存每 2 分鐘；離開提醒 beforeunload；個案↑↓排序；跨會議個案搜尋；從歷史帶入前期追蹤

### V3.9.6
產出按鈕改 CSS Grid repeat(5,1fr)，三排等寬填滿

### V3.9.5
新增 Breast SONO；影像檢查選「其他」可自填

### V3.9.4
AI 匯入 prompt 更新：exams/markers/familyHistory/topics 說明精確化

### V3.9.3
個案輸入頁面 UI 整理：年齡/性別合併、診斷3行、過去病史副標籤、癌指數移臨床資料、影像檢查改名、會議記錄用 fsec

### V3.9.2
還原：會議日期與結構欄位不預填今天

### V3.9.1
病理/檢查/治療/癌指數新增日期不預填（還原）；儲存後保持編輯模式

### V3.9.0
首頁「+ 新建」按鈕；openNewModal 預填癌別日期；新個案預設展開；Ctrl+S 儲存；選科別自動帶入醫師

### V3.8.8
所有影像資料夾選取按鈕標籤統一；乳攝選取按鈕永遠顯示

### V3.8.7
移除列印/PDF；產出按鈕重新排列；資料夾授權提示移頂部

### V3.8.6
pathImgFolderHandle 與 imgFolderHandle 合併為單一資料夾授權

### V3.8.5
for await 改用 _folderEntries() helper，修正 Chrome SyntaxError

### V3.8.0
LINE 通知 tag() 改依 ca.id 分組查找，修正癌別誤判

### V3.7.0
GitHub 分享已分享清單（複製連結/開啟/刪除）

### V3.6.0
extraJs 獨立 script block 修正多層跳脫；合併會議 bug 修正

### V3.5.0
GitHub Pages 投影片分享功能（HTML 分享按鈕）

### V3.4.0
HTML 投影片手術照片區；病理染色影像資料夾模式

### V3.3.0
JSON 批次匯入/匯出；AI 匯入提示詞；per-key merge loadAll

### V3.2.0
乳攝欄位（mammo）；家族史欄位；phChips 結構統一

### V3.1.0
highlight toolbar（五色）；病理染色影像欄位

### V3.0.9
修復 genLine tag is not a function；HTML 投影片改左右兩欄

### V3.0.8
addStruct/delStruct 改局部 DOM，不跳頁

### V3.0.7
編輯模式預設展開；LINE 通知顯示子癌別

### V3.0.6
新增個案依癌別預選第一主治科別

### V3.0.5
診斷/現病史多行；Bone scan；癌指數區塊；HTML 投影片圖片頁

### V3.0.4
HTML 投影片：診斷移入深色標題列

### V3.0.3
HTML 投影片：依診斷自動子分組（膀胱/攝護腺/腎臟等）

### V3.0.2
HTML 投影片病理渲染重寫；Excel 匯入功能

### V3.0.1
移除 isOwn 編輯限制，任何登入者可編輯所有癌別

### V3.0.0
個案卡片預設收合；閱覽模式單獨編輯按鈕

### V2.9.9
HTML 投影片：病歷號/姓名加粗放大、&nbsp; 亂碼修正、膠囊型導覽

### V2.9.8
HTML 投影片：字體放大、topics chip 加大、側邊導覽列

### V2.9.7
HTML 投影片全面改版：表格式佈局、癌別色彩、字體放大

### V2.9.6
HTML 投影片全版 flex 佈局；修正 </script> 洩漏 bug

### V2.9.5
（跳過，版本含嚴重 bug）

### V2.9.4
個案可收合；新增個案選擇對話框；列印 CSS 修正

### V2.9.3
列印改 A4 橫向

### V2.9.2
列印/PDF 改善：會議標題頁、隱藏 UI、每案獨頁

### V2.9.1
新增匯入個案 JSON 功能（+ 附匯入用 prompt）

### V2.9.0
新增列印/PDF 功能（@media print + window.print）

### V2.8.7
修正 PPTX/Excel 下載：明確 appendChild+click

### V2.8.6
PPTX 標題列簡化；診斷移入內容列

### V2.8.5
修正 PPTX/Excel 下載權限問題（arraybuffer→Blob）

### V2.8.4
檢查/治療兩行版面；PPTX 個案自動多頁

### V2.8.3
修正新增條目日期消失；PPTX 行高更保守

### V2.8.2
病理/檢查/治療欄位排版改善

### V2.8.1
修正 V2.8.0 SyntaxError：PPTX split 換行符

### V2.8.0
病理改多筆條列；PPTX addRow 動態行高修正重疊

### V2.7.7
LINE 通知每位病人加癌別標籤【癌別名】

### V2.7.6
LINE 通知格式全面重寫：統一縮排，顯示癌別

### V2.7.5
DOCX 補齊所有欄位；DOCX/LINE 加入醫療小組/必要事件

### V2.7.4
修正醫療小組/必要事件 addItem/delItem/upd 的 cid 傳遞

### V2.7.3
LINE 通知個案列加入診斷

### V2.7.2
修正 genLine 個案醫師：c.doctor→getDoctorStr(c)

### V2.7.1
Excel 去遮蔽；JSON 全量備份/還原（含影像），可跨裝置合併

### V2.7.0
新增 Excel 匯出（5 個 sheet：個案/檢查/治療/前期追蹤/會議資訊）

### V2.6.7
所有輸出函數醫師欄位改用 getDoctorStr()，相容新舊格式

### V2.6.6
醫師名稱去 dept 前綴；新增必要事件區塊

### V2.6.5
醫療小組移到特殊議程前；按鈕文字修正

### V2.6.4
新增醫療小組區塊；消化/乳/肝膽地點→一樓人文；migrateCFG

### V2.6.3
migrateCFG()：修正頭頸/血淋地點（localStorage 覆蓋 DEFAULT 問題）

### V2.6.2
林伯儒不列聯絡人；合併顯示多個管師；新地點；migrateLOCS

### V2.6.1
聯絡人合併所有癌別負責人

### V2.6.0
檢查下拉選單+設定管理；術語統一（現病史/過去病史/檢查）

### V2.5.6
儲存後隱藏放棄編輯按鈕；PPTX 補齊 PH/病理/Exam/治療欄位

### V2.5.5
討論項目 chips 修 BUG-001；delegation 區塊重寫；PH 顯示 HTN(+) 格式

### V2.5.4
PPTX 前期追蹤動態行高；PH chips 顯示在閱覽/LINE

### V2.5.3
Exam/治療 textarea 多行；特殊議程類別 chips

### V2.5.2
PH chips delegation 修正；Exam/治療欄位比例調整

### V2.5.1
修正 drSelect2→drSelDept；新增 toggleTopic()；更新 genTestData

### V2.5.0
個案表單大改版：PHchips、病理欄、Exam/治療條列、M/F 性別

### V2.4.2
影像說明欄（上傳時可填說明）；閱覽模式顯示影像清單+說明+預覽按鈕

### V2.4.1
BUG-001 修正：buildImgArea 改用 data-action+事件委派，影像按鈕真正可用

### V2.4.0
追蹤說明/討論要點改 textarea；addImg 加 setTimeout+addEventListener

### V2.3.1
PPTX 前期追蹤加說明列；DOCX 個案討論聚焦摘要/結論

### V2.3.0
手機底部 tab 導覽 + 頂部列 + 使用者切換 Sheet

### V2.2.4
日曆格子四邊框；renderCalendar 改 DOM 操作

### V2.2.3
手機日曆縮短癌別名；歷史記錄 flex-wrap

### V2.2.2
手機 UI 全面優化（底部 tab + 設定 tab 縮短 + 行事曆標題）

### V2.2.1
歷史記錄視覺優化：癌別標籤去色、按鈕層次、月份標頭色調

### V2.2.0
歷史記錄/開會列表移除版本號，單行顯示

### V2.1.9
migrateDRS() + migrateCFGConv()：自動修正 localStorage 舊資料

### V2.1.8
conv 欄位補 dept:: 前綴；breast/lymphoma/hepatobiliary 補 defaultSlot

### V2.1.7
腫瘤內科→消化內科；張正雄/劉大智移血液腫瘤科；侯柏年移出影像診斷科

### V2.1.6
腫瘤外科→一般外科；王威群移頭頸外科；歐金俊移一般外科；召集人下拉修正

### V2.1.5
醫師清單合併重複科別；時間改下拉（早會/午會）；聯絡人唯讀；README 重整

### V2.1.4
癌別設定改 DOM 渲染（修正空白行）；醫師科別預設收合；預載資料重設計

### V2.1.3
癌別設定：每個癌別各自有「儲存」按鈕

### V2.1.2
聯絡人自動帶入；新建會議 Zoom 預設空白；癌別設定新增 defaultSlot

### V2.1.1
修正 deleteMtg 漏到 </html> 之後導致程式碼顯示在頁面

### V2.1.0
刪除四碼確認；修正影像上傳（需先 appendChild 再 click）

### V2.0.5
移除 17 重複函數、36 廢棄 CSS

### V2.0.x
影像支援；PPTX 全新排版；智慧開啟模式；前期追蹤卡片樣式；歷史記錄

### V1.9.x
行事曆首頁、weeknum 每月一次、月份歷史分組；V1.9.1–V1.9.4：行事曆 bug 修正

### V1.8.x
行事曆首頁上線；V1.8.1–V1.8.2：語法 bug 修正

### V1.7.0
合併開會分 tab 編輯；地點/時間/召集人改下拉；醫師管理可新增科別

### V1.6.0
Noto Sans TC 字型；合併開會分開存（mdt_sec）

### V1.5.x
排程/記錄模式分離；登入頁版本號；編輯流程修正

### V1.4.0
基礎功能：閱覽/編輯、設定、AI、LINE、PPTX/DOCX


---

## 開發規範

- UI 規範第一條：**嚴格禁止使用任何 emoji 字元**
- 版本命名：新功能 +0.1、Bug fix +0.01、大改版 +1.0，**每次變更都要更新版本號**
- onclick 禁用字串拼接，改用 data attribute + event delegation 或 DOM createElement
- template literal 內嚴禁換行後設 innerHTML，改用 DOM 操作
- 每次打包前確認：括號平衡（`{` = `}`）、backtick 偶數
