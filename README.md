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

### V5.9.3
**產出區分組分層 — 功能不刪只重排**

個管師回報產出區 11 個按鈕平鋪太擠。分析後確認**每個功能都不同、沒有真正重複**,問題是「沒有分層」。改成兩組:

**主力產出**(4 個常用,每場會議必用):
LINE 通知、HTML 投影片、PPTX 簡報、DOCX 記錄

**資料交換與分享**(加分組標題,預設展開,跟舊版一樣都看得到):
HTML 分享、Excel 匯出、Excel 匯入、JSON 批次匯入、JSON 個案匯出、JSON 完整匯出、AI 匯入提示詞(收在最底,個管師少用)

**重排原則**:
- HTML 分享(需 GitHub token,進階)從主力移到資料區
- AI 匯入提示詞(只有開發者 Sela 用)收到資料區最底
- 11 個按鈕全保留,onclick/id 一個沒動,純視覺重排
- 加兩個分組標題 + 一條分隔線,讓「主力」跟「資料交換」一眼分得開

**按鈕用途分析**(確認非重複):
- HTML 投影片 vs HTML 分享:下載本機 vs 上傳 GitHub 產連結(共用核心)
- JSON 完整匯出 vs 個案匯出:整場會議備份 vs 個案臨床資料交換
- Excel vs JSON 匯出:同資料不同格式,個管師依習慣選

### V5.9.2
**修 logo 白邊 — favicon 套組改透明圓角**

個管師回報 V5.9.1 後 sidebar/登入頁的 MDT logo「圖示不是透明邊角,會有很醜的白邊」。

**根因**:Gemini 生圖輸出的 PNG 是 **RGB 模式(無 alpha 透明通道)**,圓角方形 logo 的**四個角是白色**(生圖時的白背景)。在深色 sidebar 上,方形圖的四個白角露出來 = 白邊。

**修法**:用 Pillow 重新產 favicon 套組,加 18%(app icon 標準)圓角遮罩,**圓角外切成透明**:
- favicon-16x16 / 32x32 / android-chrome 192/512 → RGBA 透明圓角
- favicon.ico(multi-res 16/32/48)→ 透明圓角
- **apple-touch-icon 特例**:iOS 會自己加圓角遮罩,所以做成「**霧藍底滿版不透明**」(避免 iOS 加圓角時透明區變黑)

**關鍵知識**:
- 不能簡單「白色 → 透明」去背,因為 logo 主體(身影/桌面/MDT 字)也是白色,會被誤刪
- 正解是「圓角遮罩」:只把圓角**外**變透明,圓角**內**全部內容保留
- apple-touch-icon 用霧藍底不透明(iOS app icon 規範)

**坑 #27 新增**:AI 生圖的 logo PNG 常是 RGB 白底,當 app icon 用在深色背景會露白角。要嘛用圓角遮罩切透明,要嘛在生圖 prompt 就要求透明背景。

### V5.9.1
**修 V5.9.0 出貨後個管師回報的 2 個 bug**

**Bug 1: 頁面左上角浮出一個 `>` 字元**
- 截圖頂端有個明顯的 `>` 飄在頁面外
- 根因:L609 `</style>>` — `</style>` 後**多打了一個 `>`**(V5.8.8 加 `<meta name="theme-color">` 時 str_replace 編輯意外加進去)
- 修法:`</style>>` → `</style>`

**Bug 2: 系統內 UI 仍顯示 SELA logo 而非 MDT logo**
- 個管師回報「最新版沒有出現子程式的 logo」— 截圖左上角 sidebar 還是 SELA 橘色框
- 根因:V5.9.0 換 favicon 套組但**漏改兩處 inline base64 SELA JPEG**:
  - L616:登入頁 `sh-login` 的 logo(56×56,margin-bottom:28px)
  - L655:sidebar `.sb-logo` 的 logo(26×26,gap:9px)
- 這兩處用 `<img src="data:image/png;base64,/9j/4AAQ...">` 寫死,**不引用 favicon/ 內任何檔案**,所以 V5.9.0 換 favicon 完全沒影響
- 修法:兩處 `src` 改成 `favicon/android-chrome-192x192.png`(MDT logo PNG),style 保留(56×56 跟 26×26 不變)
- **附加效果**:檔案瘦身 ~10KB(兩個 5.4KB base64 拿掉)

**坑 #26 新增**:**換主 logo 時不能只換 favicon/ 套組**,必須 grep 整個 index.html 找出**所有 inline base64 圖片**跟 **內嵌 SVG**,逐處改到。V5.9.0 漏改這兩處,個管師看到「外面分頁圖是 MDT,但開系統還是 SELA」的不一致狀態。

### V5.9.0
**換 MDT 主 logo — 雙軌品牌**(MDT 主身分 + SELA 平台微標)

依 Starter Kit V1.15.0 §14.3 範本 B(醫療專業型)為 MDT 設計專屬 logo,個管師用 Gemini 生圖完成:**俯視圓桌 + 6 個身影圍坐 + 中心個案焦點 + MDT 字**,#5A7A8B 北歐霧藍背景。

**整合範圍(V1.15.0 §9 雙軌共存規則)**:

| 用途 | V5.8.x 之前 | V5.9.0 |
|---|---|---|
| favicon.ico / 16x16 / 32x32 | SELA 橘壁虎 | **MDT logo**(圍桌 + 個案焦點)|
| apple-touch-icon 180px | SELA | **MDT** |
| android-chrome 192/512 | SELA | **MDT** |
| 右下角微標(`sela-credit`)| `favicon-32x32.png` | **改引用 `favicon/sela.svg`**(SELA 品牌仍存在)|
| `<head>` SVG icon link | `sela.svg` | **移除**(避免 SVG/PNG 不一致;PNG 套組已足夠)|
| theme-color | `#5A7A8B` | 不動 |
| `mdt-1024.png` | — | **新增**(高解析備用)|

**安全網**:`favicon-sela-backup/` 目錄保留原 SELA favicon 套組(萬一需要回退)。

**設計理念**:
- 主體「圍桌 + 中心焦點」直接譬喻 MDT(Multi-Disciplinary Team)精神:**個案在中心、多專科環繞**
- 跟 SELA 主 logo「壁虎守護」的「守護一個對象」精神同源(DNA 繼承)
- 不繼承壁虎(醫療型不適合,V1.15.0 §14.3 規定)
- 16×16 favicon 仍可辨識「圍著一個圓」的輪廓

**設計檢核**(V1.15.0 §15):13 項中 11 ✓ / 1 需測試 / 1 不適用 — 設計優秀

### V5.8.8
**對齊 SELA Starter Kit V1.15.0**(從 V1.7.1 跳 8 個小版本):個管師交付新版 Starter Kit,主要對齊三件事。

**1. theme-color 改北歐霧藍 `#5A7A8B`**(V1.8.1 起的新規範)
- Kit V1.8.1 起區分「**品牌色**」(SELA 橘 #F36825,logo 用,不變)vs「**介面色**」(theme-color、PWA 啟動畫面,依 app 主題)
- 醫療型 app 預設 `#5A7A8B` 北歐霧藍(V1.15.0 §14.3),避免橘色帶來的「警示/警告」聯想
- `<head>` 的 `<meta name="theme-color">` 跟 `site.webmanifest` 的 `theme_color` 同步改

**2. 加 `favicon/sela.svg` + `<head>` SVG icon link**
- 從 Starter Kit `logo/svg/sela.svg` 拷貝進 `favicon/`
- `<head>` 加 `<link rel="icon" type="image/svg+xml" href="favicon/sela.svg">` 放在 ico/png 之前 — 現代瀏覽器優先 SVG,任何大小都銳利
- favicon/ 從 7 個檔案 → 8 個

**3. SELA-handoff.md 更新 Kit 版本標記 + 加 V1.15.0 對齊紀錄**
- Kit 版本標記從 V1.7.1 → V1.15.0
- 加對齊表:已對齊的 3 項 + 不複製進 MDT 的 2 項(子 app logo prompt 範本、共通檢核清單,需要時去 Starter Kit 取)
- 理由:MDT 的 CLAUDE.md 章法第十條「上下文密度檢查 — 不會被下次 Claude 引用的段落要砍」 → 子 app prompt 對 MDT 後續會議無用,留指引即可

**logo 本身不變**(品牌色鐵律):仍是 SELA 橘 + 白壁虎。**只變介面色**。
**系統 UI 不變**:MDT UI 是霧藍 / 灰色系(`--fog-*`),原本就跟 SELA 橘無關,改 theme-color 不會造成 UI 不一致。

### V5.8.7
**「討論要點」全系統一律改名「討論方向」**:V5.8.6 個管師回報「醫療小組三欄(討論要點/摘要/決策)名稱容易搞混」,建議改成更明確的命名:

| 舊 | 新 | 角色定位 |
|---|---|---|
| 討論要點 | **討論方向** | 會議要討論什麼方向(會前填,提醒個管師跟進什麼) |
| 摘要 | 摘要 | 會議當下/會後的摘要 |
| 決策 | 決策 | 結論(會後填) |

**改名範圍** — 全系統 7 處 + placeholder:
- L3325:個案討論編輯介面 label
- L3362:醫療小組/必要事件編輯介面 label + placeholder(`本次MDT討論的主要議題` → `本次MDT要討論的方向`)
- L3376:teamViewHTML(view 模式)顯示
- L6208:HTML 投影片 sections 標籤
- L6800:**CSV 匯入向後相容**:`r['討論方向']||r['討論要點']||r['討論']` 三層 fallback
- L6912:CSV 匯出欄位名稱
- L7093:AI prompt 說明

**程式變數 `discussion` 完全不動**,只改顯示文字。**舊 CSV 匯入仍能正確讀取**(`r['討論要點']` fallback)。

**DOCX 不加 discussion 欄**(個管師決定):「討論方向」是個管師提醒自己「會議要討論什麼」的會前筆記,不需要在會議記錄出現。DOCX 醫療小組 / 必要事件仍維持兩欄(討論摘要 + 決策)。

### V5.8.6
**修坑 #19(累積 10+ 版未修的歷史坑) — 前期追蹤改名同步寫到個案討論**:V5.8.5 後個管師回報「改前期追蹤的名字,實際上同步改到個案討論,而且 DOCX 上前期追蹤完全沒名字沒病歷號」。

**根因(坑 #19,V5.0.0 發現)**:`followupHTML(cid, i, d, type='followups')` 函數內 5 處 `upd` 呼叫都**寫死 `'cases'`** 而不是用 `${type}`。`upd(cid, type, i, field, value)` 是動態派發到 `S.meeting.sections[cid][type][i]`,收到 `'cases'` 就去 cases 陣列存取。導致:
- `cases[i]` 不存在 → 編輯靜默失敗(個管師以為有存)
- `cases[i]` 存在 → **改到個案討論第 i 個的同欄位,資料污染**
- followups[i] 從沒被更新 → DOCX 內 f.chartNo / f.name 取出空值

**修法**:L3336 + L3340 兩行內 5 處 `upd('${cid}','cases',${i},...)` → `upd('${cid}','${type}',${i},...)`。涉及欄位:chartNo(2 處)、name、prevDate、note。Cases editor 內的 13 處 `'cases'` 維持不動(那是正確的寫死)。

**驗證**:Node syntax check + 桌面演練(改前期追蹤名字 → 寫到 sec.followups[0].name,cases 不受影響)。坑 #19 標記為 ✅ V5.8.6 修。

### V5.8.5
**DOCX 治療欄樣式升級 — 標題行灰底粗體 + 移除編號 + 詳細內容縮排**:V5.8.4 後個管師上傳截圖,手動標記想要的治療樣式 — 治療標題行(日期 + 治療名稱 + `:`)灰底粗體,後面詳細內容**不要前置編號**(`[1] [2] [3]` 多餘)。

**設計細節**:
- 治療標題行樣式:`(date) name :` 整行 → 灰底(`C.bg #F5F7F8`)+ 粗體
- 詳細內容:縮排 8pt(twip 160)讓視覺層次清楚
- **去掉編號**:從 `[1] (date) name : content` → `(date) name :\n    content`(2 行)
- 灰底選 `C.bg` 而非 `C.dark`,**避免跟決策結論的深色標籤搶眼球**(決策結論才是最高優先級)

**`mkBlock` 函式擴充**:加 `opts.lines`(array of `{text, shaded, bold, indent}`)— 如果有給就走「每行獨立樣式」邏輯,否則走舊的「content 字串 + `\n` 分割,每行同樣式」邏輯。**非破壞性,舊呼叫不影響**。

**舊資料相容**:`c.treatment`(舊版單一字串欄位)走原邏輯,只有 `c.treatments`(陣列)走新樣式。

XML 驗證:3 個治療標題灰底 + 3 個詳細內容縮排 160 twips ✓

### V5.8.4
**DOCX 視覺微調 × 3(個管師回報 V5.8.3 後可優化點)**:V5.8.3 正確修好 layout 後,個管師回報 3 個優化點:

**1. mkCaseHdr 標題列右側凸出 → 跟 mkBlock 寬度對齊**
- V5.8.3 mkCaseHdr 仍用 `WidthType.PERCENTAGE` 100%,跟 mkBlock 的 DXA 9000 twips 不對齊,視覺上標題列右邊凸出一小段
- 修法:mkCaseHdr 也改用 `WidthType.DXA` 9000 twips + `columnWidths` + `layout=FIXED`,跟 mkBlock 完全對齊

**2. mkBlock cell 加垂直置中**
- 之前標籤跟內容預設靠頂部對齊,內容多行時標籤頂在最上面,視覺感不對等
- 修法:兩個 cell 加 `verticalAlign: VerticalAlign.CENTER`,標籤跟內容垂直置中對齊

**3. 標籤欄 12% → 14%**
- 12% 太窄,「決策結論」「討論摘要」4 字標籤會擠成兩行
- 14% 剛好可單行容納 4 個中文字,易讀性提升
- 對應 twip:1080 → 1260,右欄 7920 → 7740(差 180 twip 內容欄,影響極小)

需要 import 加 `VerticalAlign`。XML 驗證:每個 mkBlock 兩個 vAlign=center、Tables 全有 tblLayout=fixed。

### V5.8.3
**V5.8.2 沒真正修好,V5.8.3 才是完整修法**:個管師回報 V5.8.2 出貨後**仍然格式跑掉**(標籤欄超寬、內容欄超窄)。

**根因**:V5.8.2 雖把 width 改成 DXA(絕對 twip),但**沒指定 `layout=fixed`** → Word 端仍會 autofit,把 DXA 當「建議值」。XML 內缺 `<w:tblLayout w:type="fixed"/>`。

**正確修法**:在 mkBlock 的 Table 加 `layout: TableLayoutType.FIXED`,搭配 V5.8.2 的 DXA + columnWidths 才完整。三件套缺一不可:
1. `width: DXA` 絕對 twip
2. `columnWidths: [1080, 7920]` 陣列
3. `layout: TableLayoutType.FIXED` ← V5.8.3 補上

更新坑 #25:「docx Table 嚴格控制欄寬三件套」+ 加教訓「真實內容測試 vs 預覽」。

### V5.8.2
**修 V5.8.1 引入的 layout 跑掉 regression**:個管師回報 V5.8.1 出貨後「**整個 DOCX 格式跑掉了**」— 左欄被擠到 ~50%、右欄變超窄一條、本來 1-2 頁變 3 頁。

**根因(坑 #25)**:V5.8.1 把診斷從純 Paragraph 改用 mkBlock,但 diagnosis 內容常 200+ 字一行。docx Table 在沒指定 `layout=fixed` 也沒指定 `columnWidths` 時,Word 用 auto layout algorithm 重算欄寬,**無視 cell 的 `width:PERCENTAGE`,根據內容字數猜算**。長 diagnosis 觸發 Word 把標籤欄擠寬到 50%。

**修法**:`mkBlock` 寬度從 `WidthType.PERCENTAGE` 改成 `WidthType.DXA`(絕對 twip)+ 加 `columnWidths` 陣列。A4 可用寬度約 9000 twips(扣邊距),12% ≈ 1080(標籤),88% ≈ 7920(內容)。Word 100% 服從 DXA。

新增坑 #25 — 「docx Table 要嚴格控制欄寬時用 DXA,別用 PERCENTAGE」。

### V5.8.1
**DOCX 個案討論視覺一致性兩項微調**:V5.8.0 出貨後個管師回報:

**1. 診斷欄位沒外框 — 跟其他欄位視覺不一致**
- V5.8.0 結構:**標題列 → 純 Paragraph 診斷 + 細線 → mkBlock 治療 → mkBlock 討論摘要 → mkBlock 決策結論**
- 個管師看到「**有 4 個有外框、診斷單獨沒外框**」覺得不一致
- 修法:**診斷也改用 `mkBlock`,左欄加「診斷」標籤**,跟其他四個欄位一致;同時刪除診斷下方那條多餘細線(V5.6.1 加邊框之前留下的視覺分隔線,現在 mkBlock 自身有邊框,線多餘)
- 套用範圍:個案討論 / 醫療小組 / 必要事件 三處診斷(前期追蹤本來就沒 diagnosis 欄位)

**2. 預設字體改成黑體(微軟正黑體)**
- 全 DOCX 內 27 處 `font:'新細明體'`(serif 明體)→ `font:'微軟正黑體'`(sans-serif 黑體)
- 黑體比明體在數位螢幕跟列印筆畫均勻,可讀性更高
- 跨平台保護:Word 在 Mac 自動 fallback 到 PingFang TC,Linux fallback 到 Noto Sans CJK(docx 7.8.2 的 `font` 參數只接受單一字串,但 Word 自動替代機制可靠)

### V5.8.0
**DOCX 個案討論視覺優化 — 三項合併**:個管師回報 V5.7.1 出貨的 DOCX 雖然格式正確,但「**治療欄資訊混亂、決策結論不夠突出**」,本版做三項視覺優化:

**1. 治療欄日期前置 + 編號**
- 舊:`Laparoscopic S8 hepatectomy(2020-06-11) : Initial HCC treatment...`
- 新:`[1] (2020-06-11) Laparoscopic S8 hepatectomy : Initial HCC treatment...`
- 編號 `[1] [2] [3]` 讓多個治療事件視覺上明確分隔
- 日期前置讓眼睛快速掃過時序

**2. 治療欄字級縮小(12 → 10)**
- 治療是「資訊性」內容,不該跟摘要/決策同字級搶眼球
- 字級縮小後,治療框視覺重量降低,決策結論才能「跳出來」

**3. 決策結論加強(emphasis 深色標籤)**
- mkBlock 加 `opts.emphasis=true` 參數
- 標籤背景:淺灰 `C.bg` → 深灰 `C.dark`
- 標籤文字:`C.mid`(暗灰) → 白色
- 視覺效果類似「個案標題列」風格,讓「決策結論」一眼看見「這個是重點」
- 個案討論 / 醫療小組 / 必要事件 / 前期追蹤 四處的決策結論**全部一致加 emphasis**

### 副改動:`mkBlock` 函式擴充

**舊**:`mkBlock(label, content, isEmpty)`
**新**:`mkBlock(label, content, isEmpty, opts)`,opts 支援:
- `opts.emphasis=true` → 標籤深色背景 + 白色文字
- `opts.contentSize=N` → 自訂內容字級(預設 12)

擴充非破壞性(opts 預設 `{}`,舊呼叫不受影響)。

### V5.7.1
**修 V5.7.0 引入的 regression — 前期追蹤會後填寫面板「繼續追蹤/結案」按鈕視覺異常**:個管師回報「點繼續追蹤/結案沒反應」。

**根因**:V5.7.0 加 `postfup-summary` / `postfup-decision` 兩個 textarea 後,event handler 內的 `[data-action^="postfup-"]` **prefix match selector 變得太寬**,把新加的兩個 textarea 也誤匹配進去,當成按鈕處理:加上 `btn` className、改 `style.opacity='0.5'`,讓 textarea 視覺上半透明、像被禁用。

**修法**:把 prefix match 改成**精確匹配兩個 toggle 按鈕**:
```js
// 修前
.querySelectorAll('[data-action^="postfup-"]')
// 修後
.querySelectorAll('[data-action="postfup-ongoing"],[data-action="postfup-closed"]')
```

新增坑 #24 記錄此類「新增元素時忘記檢查既有 prefix selector 是否會誤匹配」陷阱。

### V5.7.0
**會後填寫面板擴充 + DOCX 同步加區段**:個管師回報「會後填寫面板只能填個案討論的摘要決策,前期追蹤 / 醫療小組 / 必要事件 都無法填寫結論」。本版兩大改動:

**1. 會後填寫面板擴充**

- **前期追蹤**:在原有「繼續追蹤 / 結案」按鈕下方,加上**討論摘要 + 決策結論**兩個 textarea(舊版完全沒有,V5.7.0 新增 `f.summary` / `f.decision` 欄位)
- **醫療小組**(新增整個區段):每位成員加**討論摘要 + 決策結論**(資料欄位 V5.2.0 早已存在,只是會後填寫面板沒呈現)
- **必要事件**(新增整個區段):同上
- 共用卡片產生器 `_mkTeamCard(cid, arr, arrType, t, ti)`,`arrType='team'/'events'` 區分,避免重複 code
- 資料寫入 `savePostMtg` 加 4 個新 selector:`postfup-summary` / `postfup-decision` / `postteam-summary` / `postteam-decision`(後兩者用 `arrtype` 區分 team/events)

**2. DOCX 同步擴充**

V5.6.x 之前 DOCX 只有「前期追蹤 → 個案討論 → 特殊議程」,**完全沒有醫療小組 / 必要事件**。本版補上:
- 前期追蹤:在原有狀態 badge 之後加 `if(f.summary) mkBlock` + `if(f.decision) mkBlock`
- 醫療小組:在個案討論之後、特殊議程之前新增整個區段(`mkSecHdr('醫療小組')` + 每位成員 `mkCaseHdr` + diagnosis + summary + decision)
- 必要事件:同上,獨立區段(`mkSecHdr('必要事件')`)
- 醫療小組 / 必要事件 DOCX 區段沿用 V5.6.2 的 mkBlock 邊框 + 12% 左欄樣式

**舊資料相容**:沒填過 summary/decision 的舊資料,面板 textarea 為空、DOCX 內 `if(f.summary)` 為 false 不 push,完全不影響舊行為。

### V5.6.2
**DOCX `mkBlock` 兩個視覺微調**:V5.6.1 加邊框後個管師回饋兩點:
- **左欄太寬**:`16% → 12%`,右欄相應 `84% → 88%`,內容空間多 4%,個管師寫長文時換行頻率降低
- **項與項中間留白太多**:cell 內 paragraph `spacing` 從 `{before:pt(0), after:pt(2)}` 改 `{before:0, after:0}`,移除每個 cell 內 paragraph 預設的「下方 2pt 空白」,讓多行內容更緊湊;表格之間原本就無顯式空白段,間距收緊後框與框視覺上更貼近(像截圖那樣連續排列)
- 邊框樣式不動(沿用 V5.6.1 細灰 SINGLE size:4 color:'CFD8DC')

### V5.6.1
**DOCX 個案討論區塊 mkBlock 加細灰邊框**:個管師上傳了希望的會議記錄格式截圖(左標籤右內容、有清楚灰色邊框)。對比現行 DOCX 發現結構已經是「左 16% 標籤欄(淺灰底)+ 右 84% 內容欄」的表格,**只是 `borders` 全設 `BorderStyle.NONE`**,看起來像沒有框。本版改成 `BorderStyle.SINGLE size:4 color:C.divider`(沿用現行 `'CFD8DC'` 淺灰常數),讓每個 mkBlock 都有清楚的細灰邊框。多欄位結構保留(現病史 / 過去病史 / 病理 / 治療 / 討論摘要 / 決策結論 各自一個 mkBlock,各自加邊框),跟個管師需求一致。

### V5.6.0
**JSON 個案匯出可選打包圖片成 zip**:個管師回報「匯出個案 JSON 後想連帶把圖片一起打包帶走」。本版實作:
- **inline JSZip 3.10.1**(MIT License,壓縮後 ~96KB)— 內網醫院能用,不靠 CDN
- **產出區加勾選框**「☐ 附圖片打包 zip」(預設不勾,**舊行為完全保留**)
- 勾選後,點「JSON 個案匯出」→ 走 `_exportCaseJSONWithImagesZip` 分支
- **zip 結構**(對齊 V5.3.0 子資料夾規則):
  ```
  頭頸癌_2026-05-21_個案.zip
  ├── cases.json                  (跟舊版 JSON 格式 100% 一樣,無 dataUrl)
  └── images/
      ├── 5176721/                (病歷號子資料夾)
      │   ├── pathology_HE.jpg
      │   ├── pathology_IHC.jpg
      │   ├── surgical_OP1.jpg
      │   ├── related_CT.jpg
      │   └── mammo_R-CC.jpg       (乳癌才有)
      └── _no_chartno_1/          (沒填病歷號的 fallback)
  ```
- **三種圖片來源全支援**:
  - `dataUrl` 已存 → `fetch(dataUrl) → blob → zip.file()`
  - `fromFolder` + handle 在 → 從資料夾讀(支援 V5.3.0 subFolder 兩層)
  - `fromFolder` + handle 沒授權 → 跳 `confirm` 請使用者選資料夾
- **錯誤穩健**:單張讀檔失敗不中斷,累積到 `failedImgs[]`,結尾 toast + alert 列出失敗清單
- 壓縮:DEFLATE level 6(平衡速度跟大小)
- 影響 index.html 大小:530KB → 627KB(+97KB),GitHub Pages gzip 後實際傳輸 ~30KB,可接受

### V5.5.0
**兩項新功能合併**:

**1. HTML 投影片檔名語言切換(中文 / 英文)**

過去 HTML 檔名固定中文(`2026-05-21_頭頸癌多專科會議.html`),個管師回報「外院分享或存 NAS 時想要英文檔名」。本版實作:
- **8 個癌別 cancer code 對映表**(`CANCER_EN_CODES`):
  - `head_neck → HeadNeck` / `blood_lymph → BloodLymph` / `chest → Chest` / `breast → Breast`
  - `gi → GI` / `hbp → HBP` / `gu → GU` / `gynecology → Gyn`
- **設定頁配色 bar 加「檔名 中 / EN」切換**(沿用 V4.6.2 theme-strip 風格)
- 偏好存 `localStorage.mdt_html_fname_lang_<userId>`,**每個個管師獨立記憶**
- 多癌別合開時用底線串接:`2026-05-21_HeadNeck_BloodLymph_MDT.html`
- 中文預設不變:`2026-05-21_頭頸癌+血液淋巴癌多專科會議.html`

**2. 個案大欄位多行輸入支援**

過去 textarea 內按 Enter 換行,但 HTML 投影片產出時換行被擠掉變成一行。本版修法:**5 個欄位**渲染時加 `.replace(/\n/g,'<br>')` 讓換行轉成 HTML `<br>`:
- 診斷 diagnosis(case + team 投影片兩處)
- 家族史 familyHistory
- 討論 discussion
- 現病史 cc(原本已支援,保留)
- 過去病史 ph(原本已支援,保留)

**舊資料完全相容**:沒換行的字串 replace 後結果不變,行為跟舊版一致。

### V5.4.0
**記住上次登入者**:個管師基本上都各自有自己的電腦,共用情況少見 — 但每次打開系統還要點一次「選擇使用者」摩擦感累積。本版實作:
- **`pickUser` 寫入** `localStorage.setItem('mdt_last_user', uid_)`
- **`renderLogin` 讀取**:有 lastUser → 該按鈕加橘色邊框 + 右上「上次」標籤;觸發 1.5 秒倒數 toast「1.5 秒後自動以 [姓名] 登入」+ 取消按鈕
- **共用電腦 fallback**:若另一位個管師想用同台電腦,點 toast「取消」→ timer 清除,正常選人
- **safe 機制**:lastUser 在 USERS 已不存在(主檔變更)→ 不啟動 toast,正常選人邏輯;`pickUser` 內先 `_cancelAutoLogin` 避免快過倒數時雙觸發
- 改動小(~30 行),風險低(純前端 localStorage,不動資料結構)

### V5.3.0
**兩項改動合併出貨**:

**1. 子資料夾匯入支援(主要新功能)**

個管師回報「整個會議用到的圖片太多,混在一個資料夾很難找」。經討論決定:**個管師願意手動建一個病人一個資料夾,以病歷號為名**。本版實作:
- **4 個選圖入口**(病理 / 手術 / 相關影像 / 乳攝)進入時,先試 `_resolveSubFolder(imgFolderHandle, c.chartNo)`,找到該病歷號子資料夾就用,找不到 fallback 到根目錄(向後相容)
- **特殊議程佐證圖**(失聯率病人)先試 `p.chartNo` 子資料夾,再試 `_特殊議程`,最後 fallback 到根目錄
- **圖檔儲存格式**新增 `subFolder` 欄位,讀檔時 `imgFolderHandle.getDirectoryHandle(subFolder).getFileHandle(name)` 兩層查找
- **modal 標題**顯示子資料夾路徑:「📂 20260521 頭頸癌 / **5176721**」讓個管師知道當前位置
- **`_pathImgCache` cache key 改用 `subFolder/name`** 避免不同子資料夾同名檔(`HE.jpg`)互相覆蓋
- 共用工具函式 `_resolveSubFolder(rootHandle, subName)` 試讀子資料夾、失敗回 null 讓呼叫端 fallback
- **舊資料完全相容**:沒 `subFolder` 欄位的圖檔(`undefined`)走平面 `getFileHandle`,跟 V5.2.x 行為一致

**2. 修 V5.2.1 引入的 regression — 病理新分頁放大鏡功能消失**

個管師回報「病理影像獨立到新分頁後,主投影片有的放大鏡(L 鍵)新分頁沒有了」。根因:`openPathoWindow` 開的新分頁用 `.ps` class,但放大鏡跟滾輪 zoom 邏輯只綁定在 `.img-slide`,新分頁不繼承。修法:**完整搬移**主投影片的放大鏡 + 滾輪 zoom + 雙擊重設邏輯到新分頁 inline JS,改用 `.ps` selector;新增 `🔍` 按鈕、L 鍵快捷、Esc 雙態(放大鏡開 → 先關放大鏡,再 Esc 才關視窗)。新分頁的 inline JS 透過真實產出後跑 Node syntax check 確認語法 OK。

### V5.2.1
**HTML 投影片病理影像改「按鈕觸發新分頁」**:個管師回報「病理影像插在報告裡讓整份投影片變很冗長」(例如一個個案有 5 張染色,變成個案投影片後緊接 5 張染色投影片,連續播 6 頁才到下一個案,翻頁很煩)。本版調整:
- **HTML 投影片產出時,病理影像不再 push 成獨立 slides**(原本一張影像一張投影片的邏輯移除)
- **個案主投影片標題列加按鈕**「🔬 病理影像(N)」— `N` 是該個案的影像數量;沒影像則不顯示
- **點按鈕** → JS 用 `window.open('','_blank')` 開新分頁,即時組裝完整 HTML 投影片格式(含病歷號姓名、染色標題、進度條、上下切換)
- **新分頁** 完全獨立,可用鍵盤左右切換、Esc 關閉;不影響原投影片
- **「病理切片影像集中」勾選框移除**(原本「勾了= 病理影像統一放最後」的選項,在新行為下沒意義)
- 技術:`_pathoData` 全域物件儲存每個個案的影像 base64,按鈕點擊時呼叫 `openPathoWindow(caseId)`;HTML 大小不變(影像 base64 一樣只存一次,只是從 slides 字串移到 `__casePathos` 變數);手術照片邏輯不動

### V5.2.0
**醫療小組 / 必要事件欄位擴充**:個管師回報需求 — 醫療小組的人員除了病歷號姓名外,還需要看到年齡與性別(快速判斷)+ 家族史(乳癌、消化道癌等遺傳相關病史的會議常用)。本版三處同步擴充:
- **編輯介面 `teamHTML`**:抬頭區加「年齡 / 性別」欄(複用 `caseHTML` 一樣的 input+select 配置);現病史下面新增「**家族史(選填)**」textarea
- **閱覽介面 `teamViewHTML`**:抬頭顯示 caseDemo(性別/年齡)— 只在有填時顯示;rows 加家族史(只在有填時 push)
- **HTML 投影片 `_trackSlide`**:標題列加 `.cd` 顯示 caseDemo;sections 加家族史(在現病史之後);兩者都只在有填時才出現

**舊資料完全相容**:沒有 `age/gender/familyHistory` 欄位的舊個案會自動忽略這些新欄位(`undefined` 邏輯運算為 falsy,跳過渲染)— 顯示跟 V5.1.x 一模一樣,個管師打開不會看到任何變化。

### V5.1.4
**HTML 投影片標記工具加「字色變更」**:除了原本的 5 色螢光筆(背景色),新增 **5 色字色按鈕**(A 樣式),讓使用者在投影片現場標記時有兩種獨立工具。字色用對比強烈的飽和暗色:紅 `#D32F2F` / 藍 `#1976D2` / 綠 `#388E3C` / 橘 `#F57C00` / 紫 `#7B1FA2`。字色變更時 wrapper 是 `<span class="fc">` 加 `color` + `font-weight:600`(略加粗增加辨識),跟螢光筆的 `<mark>` 分開。Toolbar 結構:5 螢光圓 → 分隔線 → 5 字色 A → 分隔線 → ✕ 清除。「✕ 清除」同時清螢光筆 `<mark>` + 字色 `<span class="fc">` 兩種標記(無論精準或全清)。Toolbar 寬度估算更新(舊 200px → 新 320px,避免靠視窗邊緣時超出)。

### V5.1.3
**HTML 投影片兩個 bug fix**:
- **螢光筆「清除」改成精確清除**:過去 `hlClear()` 用 `document.querySelectorAll('mark').forEach(...)` **無條件清掉本頁所有 mark**,個管師回報「畫了五個標記想清掉一個結果全沒了」。改成「**選取範圍內精確清除**」:有 `_hlSel`(剛選取的範圍)→ 用 `Range.intersectsNode()` 找與範圍重疊的 mark,只清這些;沒選取 → 加 `confirm` 二次確認後才清全頁(保留原行為作為「清全頁」入口,避免誤觸)
- **個案投影片年齡字級加大**:`.cd`(caseDemo:性別/年齡/ECOG/CFS)桌面字級 `clamp(14px,1.5vw,22px)` → `clamp(16px,1.8vw,26px)`(1080p 從 22 → 26px,+4px),Mobile media query 同步加大 `clamp(13px,3.5vw,20px)` → `clamp(15px,4vw,24px)`。個管師回報「年紀字型略小」,跟旁邊「.cdr 主治醫師 23px」、「.cdx 診斷 28px」對比明顯偏小,本版調整後跟主治醫師字級接近,跟診斷的層級也合理

### V5.1.2
**AI 匯入提示詞 markers 段落改寫 — 序列 marker 不填 date 欄**:個管師回報 AI 匯入後序列 marker(像 AFP `1.64(2023-05-15)→134(2026-05-04)`)被 AI 自動填入「最早一筆日期」到 date 欄,造成日期欄顯示一個日期,但其實趨勢有 2 個日期都已寫在 content 字串內,date 欄那個日期反而是冗餘 + 誤導(個管師要手動刪)。修法:改 prompt 明確區分序列 vs 單筆 — **序列(content 含「→」符號)→ date 一律填空字串**;單筆(content 無「→」)→ date 填那個時間點。加錯誤示範 + 正確示範雙範例,讓 AI 對齊。只改 prompt 文字,系統解析邏輯不動。

### V5.1.1
**HTML 投影片特殊議程 inline display:flex 蓋掉 CSS 顯示控制 bug 修正**:個管師回報「填失聯率後,HTML 投影片產出時 7 頁都只剩失聯率,個案投影片消失」。透過比對使用者實機產出的兩份 HTML 檔(填失聯率前 / 填失聯率後)精準定位:`slides` 陣列正確產出 7 個 section,個案投影片**並沒有消失** — 真正原因是**特殊議程投影片的 inline style 含 `display:flex`**,CSS 優先級「inline > class」,結果 `display:flex` 覆蓋了 `.slide { display:none }`,讓特殊議程投影片**永遠顯示**;加上 `.slide { position:absolute; inset:0 }`(絕對定位填滿視窗),失聯率投影片**疊在所有其他投影片之上,蓋掉個案內容**。

**影響範圍**:不只失聯率 — **完治率 / 失聯率 / 留治率 / 訪視率 4 個特殊議程主表 + 病人清單共 4 處 inline style** 都有同樣 bug。任何個管師按「特殊議程」+「HTML 投影片」都會踩到。

**修法**:4 處 inline style 移除 `display:flex;`(保留 `flex-direction:column`)。讓 `display` 完全由 `.slide`/`.slide.on` CSS class 控制 — `.slide.on { display:flex }` 已存在,切換時會正常套用。新坑 #23 入帳:CSS 優先級 inline > class,不該在 inline style 寫 `display:xxx` 跟 class 競爭。

### V5.1.0
**姓名遮蔽 bug + 7 癌別 defaultDept 補齊(兩個獨立修正)**:
- **姓名遮蔽兩字 bug**:個管師回報「林一」遮蔽後變成「林0一」三字。根因:`maskName` 兩字邏輯 `n[0]+'0'+n[1]` 沒拿掉末字。修法 `n[0]+'○'`(只留首字 + 圓圈)。**順便把遮蔽符號從數字 `0` 改成 `○`(U+25CB WHITE CIRCLE)** — 正體中文媒體標準遮蔽符號,視覺更清楚不會混淆數字。三字邏輯同步改:「陳0明」→「陳○明」。8 種姓名情境壓測全過(兩字/三字/四字/單字/空值/null)
- **7 癌別補齊 defaultDept**:過去只有「乳癌」設了 `defaultDept:'一般外科'`,其他 7 個癌別在新增個案時第一主治欄留空,個管師要每次手選。本版補齊:頭頸癌→口腔外科、血液淋巴癌→血液腫瘤科、胸腔癌→胸腔外科、消化道癌→一般外科、肝膽胰癌→一般外科、泌尿道癌→泌尿科、婦癌→婦產科。設定依據:該癌別第一個 memberKey 科別(代表主治流向最常見的科別)
- **舊資料相容**:已存的歷史會議個案不受影響(maskName 是顯示時動態調用,不存進 localStorage);defaultDept 只影響「新增空白個案」的初值,不動既有個案

### V5.0.3
**AI 匯入 JSON 容錯解析**:個管師回報「**Unexpected token '`', "```json [ "...**」JSON 格式錯誤。根因:AI(claude.ai)即使 prompt 寫「不要加 markdown 符號」,仍經常在 JSON 前後加 ```json ... ``` markdown 圍籬,系統直接 `JSON.parse` 炸開。雙管齊下解決:**(1) 系統端容錯** — 新工具函式 `_parseAIJSON(raw)` 自動剝除 markdown 圍籬(```json / ```)、處理 UTF-8 BOM、智慧引號(curly quotes)→ 直引號、容錯 AI 加的前言/結語(抓第一個 `[` 到最後一個 `]` 的合法 JSON 區塊),文字框匯入(L5542)和檔案匯入(L6741)兩處入口都改用;**(2) prompt 加強** — 開頭加「【輸出格式絕對規則】」區塊,含錯誤示範跟正確示範,要求 AI「第一個字必須是 `[`,最後一個字必須是 `]`」。10 種真實 AI 輸出情境壓測全過。

### V5.0.2
**AI 匯入提示詞精準化(genImportPrompt)**:從一筆真實 AI 產出的 JSON 反饋發現兩個常見偏差,在 prompt 加明文修正:
- **markers**:加「值與括號間不可有空格」明文 + 單時間點範例 `{"name":"AFP","content":"8.96(2026-04-02)"}`(過去 AI 常產出 `"8.96 (2026-04-02)"` 多了空格);加「同一 marker name 在陣列中只能出現一次」明文(避免 AI 把多時間點寫成多筆,系統會自動去重但格式應由 AI 一次到位);marker 範例增列 HCC 常用的 PIVKA-II
- **topics**:加智慧勾選原則 — exams 有內容→勾影像、pathologies 有內容→勾病理、diagnosis 含 cTNM/pTNM/分期→勾分期、treatments 有內容或診斷提及 RT/Chemo/標靶→勾治療策略;加註「通常 MDT 個案 3-4 項都會勾」(過去 AI 常偷懶只勾 2 項,跟個案實際資料豐富度不匹配)
- 本版**只改 prompt 文字**,系統解析邏輯不動。下次個管師按「AI 匯入提示詞」複製到 claude.ai,生成的 JSON 會更貼齊規範

### V5.0.1
**HTML 投影片視覺修正(配合 V5.0.0 新加的 team/events 投影片)**:
- **字級調大**:V5.0.0 加的 `_trackSlide` 沒設響應式字級,在 1080p 投影機現場字看起來只有 ~16px 太小。改用 `clamp()` 響應式 — label `clamp(15px,1.5vw,22px)`、內文 `clamp(17px,1.8vw,26px)`,1080p 投影現場 ≈ 22 / 26px,跟個案討論主投影片的 `.cdx` 字級一致
- **「尚未填寫」白字 bug**:V5.0.0 寫 `rgba(255,255,255,.5)` 白字,但投影片背景是白的 → 看不到。修成 `rgba(0,0,0,.4)` 黑字
- **HTML 投影片字型 fallback chain 優化**:過去 `'Noto Sans TC','Microsoft JhengHei',Helvetica,sans-serif` 中英文混排英文 fallback 結果不一致(視作業系統而定)。改成 `-apple-system,BlinkMacSystemFont,'Helvetica Neue','Noto Sans TC','PingFang TC','Microsoft JhengHei',Helvetica,Arial,sans-serif` — 英文 sans-serif 字型在前(SF Pro / Helvetica Neue 等)、中文字型在後(Noto Sans TC / PingFang TC / 微軟正黑),跨 macOS / Windows / iPad 視覺都是「中英文都無襯線、調性一致」

### V5.0.0
**醫療小組 / 必要事件 加入 5 個討論欄位**:過去這兩個區塊只能填病歷號+姓名+主治+備註(共用 `followupHTML`),本版讓它們**達到接近個案討論的核心欄位**:診斷、現病史、討論要點、摘要、決策(5 個 textarea)。設計取捨:不做 100% 等同個案討論(否則涉及影像/病理/治療列表/marker/timeline 等 struct 操作,牽涉 100+ 處 `cases` 寫死的程式碼,風險過大且超出實際使用需求)。新增獨立 `teamHTML(cid,i,d,type)` 與 `teamViewHTML(cid,i,d,type)` 兩個函數,team/events 共用;`upd` 用 `${type}` 動態派發,正確指向各自陣列(避免 followupHTML 既有的「`upd` 寫死 `'cases'`」歷史 bug — 那個 bug 不順便修,留待下版單獨處理)。HTML 投影片產出:過去 team/events 合併成「**1 張 5 欄表格**」,本版改成**每筆獨立投影片**(類似個案討論版面),含病歷號+姓名+主治+診斷標題列 + 已填欄位內容區。舊資料(V4.9.0 之前無新欄位)完全相容 — 顯示「(尚未填寫討論內容)」不會 crash。

**版本號跳到 V5.0.0**:不是因為大改版,而是因為 V4.9.0 已到 y=9,按章法手冊「**每碼最大 9 逢十進位**」規則,y+1 自動進位 x+1。

### V4.9.0
**LINE 通知多癌別自動合併**:過去發 LINE 通知只能取「目前 active 癌別」,多癌別合開的會議要逐個切換產出兩份訊息,使用者要手動合併或重複發送。本版改成**取所有勾選癌別自動合併產出一份 LINE 訊息**,只改一行 `cids=[getOutputCid()||S.cids[0]]` → `S.cids`(若有則全取)。會議名稱在多癌別時自動合成「**X、Y多專科團隊會議**」(會議名稱欄位輸入會被覆蓋),單癌別仍用個管師輸入的標題。出席人員段:各癌別獨立列召集人 + 核心成員(**不去重**,跨癌別共用成員仍會兩段都列,符合既有範例慣例)。會議說明段:依癌別分段「`頭頸癌:`、`血液淋巴癌:`」,個案區塊不變。其他產出 (PPTX/DOCX/HTML/Excel/JSON) 行為不變(各自一個癌別一份)。

### V4.8.2
**Kit 版本標記從 V1.6.0 → V1.7.1**:Kit 升到 V1.7.1(V1.7.0 收 SelaTrip 反饋加坑 #37/#38、V1.7.1 修「handoff 機制執行率」)。`SELA-handoff.md` 加「提案前檢查紀錄」一小段,明寫已執行 V1.7.0 加的兩個檢查(grep Kit 避免重複、踩坑 vs 跨平台知識分類)。本案 6 條反饋未被 Kit V1.7.0/V1.7.1 採納(V1.7.0 收的是 SelaTrip 不是 MDT),仍有效;V1.7.0 新增的 #37/#38 與 MDT 無交集(MDT 不接外部 API、不用雲端 schema migration)。本版無程式變動。

### V4.8.1
**加 `SELA-handoff.md`**(對齊 SELA Starter Kit V1.6.0「回流通道機制」規範):依 `templates/SELA-handoff-template.md` 七節結構產出,給 Kit 升級用 — SELA 升 Kit 時看 handoff 直接判斷哪些經驗值該回流,不用挖整份 CLAUDE.md。本案 handoff 內容包括:6 條跨專案通用觀察(2 條坑、2 條設計模式、2 條結構建議)+ 6 條留在 MDT 不回流的業務邏輯 + 對 Kit V1.7.0 的 6 項必做行動清單。本版無程式變動。

### V4.8.0
**對齊 SELA Starter Kit V1.6.0 規範**:
- 加入 SELA favicon 套組(`favicon/` 目錄,7 個檔案;含 ico、PNG 多尺寸、apple-touch-icon、site.webmanifest)
- index.html `<head>` 加 favicon links 與 `theme-color="#F36825"`(SELA 橘)
- 右下角加 SELA 浮動 logo(fixed 32x32px,不擋 UI;hover 放大 + 不透明度提升)— 連結到 `github.com/Sela1227`
- 加 `.gitignore`(用 Kit 模板,擋 .DS_Store / Thumbs.db / 機密 / 暫存區)
- zip 檔名格式從 `MDT_V*.zip`(底線)改為 `MDT V*.zip`(空格,符合 Git Pusher 慣例)
- site.webmanifest 客製化:name="MDT 會議管理系統"、相對路徑(GitHub Pages 子路徑相容)
- 程式無功能變動;純品牌資產 + 部署規範對齊

### V4.7.1
**CFS 字樣全面中文化為「衰弱量表」**:把 V4.7.0 各處輸出裡的 `CFS` 改成 `衰弱量表`,跟 UI label 用詞一致。共 5 處變動:`caseDemo` 工具函數、閱覽模式 header、`genAI` 與 `genAIInline` 兩個 AI prompt(同時也精簡掉「CFS X(衰弱量表)」這種重複括號)。內部保留:程式碼變數名 `c.cfs`、HTML title tooltip 仍寫 "Clinical Frailty Scale (CFS)"(滑鼠 hover 給專業使用者對照)、`genImportPrompt` 仍同列中英文(讓 AI 從病歷抽取時兩個術語都認得)、Excel 匯入接受英文「CFS」當欄名別名(向後相容)。

### V4.7.0
**新增 ECOG + 衰弱量表(CFS)欄位**:個案編輯區「基本資料」段(年齡/性別下方、主治醫師上方)新增「ECOG / 衰弱量表」一列。ECOG 0–4 五個選項各附中文說明(0=活動正常 / 1=輕症狀可工作 / 2=臥床<50%可自理 / 3=臥床≥50%部分自理 / 4=完全臥床無法自理);CFS 1–9(臨床衰弱量表標準);兩欄都選填、預設留空。資料同步打通到:閱覽模式 header(僅有值才顯示)、PPTX 個案頁標題列、DOCX 表頭、HTML 投影片個案頁、Excel 匯出新增 2 欄、Excel/JSON 匯入接受新欄位、AI 提示詞(`genAI`、`genAIInline`、`genImportPrompt`)欄位定義加 ecog/cfs 並附完整中文說明文字讓 AI 能正確判讀病歷。新工具函數 `caseDemo(c)` 統一格式化(性別/年齡 + ECOG + CFS),共 9 處呼叫。舊資料無 ecog/cfs 欄位完全相容。

### V4.6.6
**影像檢查日期欄被誤刪 bug**:個案編輯區「影像檢查」選了 CT/MRI 等檢查類型後,日期選擇欄整個消失。原因:`onExamTypeChange` 用 `sel.nextElementSibling.tagName === 'INPUT'` 條件刪除「自訂類型輸入欄」,沒區分 type — 而日期欄正好是緊跟 select 的 `<input type="date">`,被一併誤刪。修法:加 `inp.type !== 'date'` 條件,只刪自訂類型(type 非 date)的 INPUT。順便修「其他」分支同類 bug:當 sibling 是日期欄時也會誤判「已有 input」而不插入自訂類型欄。

### V4.6.5
**婦科 → 婦產科**:修兩處資料一致性 bug — `DEFAULT_C.gynecology.conv` 從 `婦科::吳宏明醫師` 改成 `婦產科::吳宏明醫師`(主檔的「婦科」科別不存在,只有「婦產科」);`migrateCFGConv` 的 nameMap 同步修正。順便加自動修補 — 已部署 V4.6.4 之前版本的個管師 localStorage 裡 `CFG.gynecology.conv` 仍有「婦科::」殘留,下次啟動時 `migrateCFGConv` 會自動把任何 `conv` 或 `memberKeys` 開頭的「婦科::」替換為「婦產科::」(冪等,不踩使用者編輯)。歷史會議資料的個案醫師欄不修動(immutable 原則)。

### V4.6.4
使用說明書檔名從中文改英文 — `使用說明書.md` → `USER_GUIDE.md`,避免中文檔名在 Windows 解壓 zip 時變亂碼。CLAUDE.md 內檔名引用同步替換,中文「使用說明書」當作術語保留(自然中文文字仍用)。

### V4.6.3
**章法升級**:從本版起,每次發布都附三份文件 + 一份使用說明書(共 4 份,V4.6.4 改英文檔名為 `USER_GUIDE.md`)。使用說明書是給三位個管師看的快速上手指南,以工作情境組織(開會前→會議當下→會後追蹤→設定維護),不寫技術術語。打包檢查清單:`index.html` + `README.md` + `CLAUDE.md` + `USER_GUIDE.md` 缺一不可。

### V4.6.2
色票條位置微調:從 5 主按鈕之下搬到之上,讓下方的 share link / Excel / JSON / AI 等按鈕區保持視覺連續性,不被中間插入的色票條中斷。功能不變。

### V4.6.1
HTML 配色選擇從「設定→系統」搬到「產出區」:會議畫面產出按鈕 grid 下方一條色票橫條,5 顆迷你色票直接點換色,即時 toast 回饋。設定頁的配色區塊完全移除(不重複)。`renderThemePicker` 改寫為 `renderThemeStrip`,在 `renderEditor` 用 `setTimeout(...,0)` 渲染避免 DOM 競態。使用情境改善:個管師在產出當下能直接調色,不用切到設定頁再回來。

### V4.6.0
HTML 投影片配色模板:設定→系統頁新增「HTML 投影片配色」區塊,5 個風格(彰濱經典/暖陽/森林/薰衣草/高對比)。每位個管師獨立記憶(localStorage `mdt_html_theme_{userid}`),三人可以各自選不同偏好。預設「彰濱經典」色值跟舊版寫死的色完全一致 — 沒主動換配色的使用者沒有任何視覺差異。實作上是把 `:root{--dk:...;--acc:...;--lt:...}` 三個 CSS 變數抽成 `HTML_THEMES` 常數,`genHTMLSlides` 讀當前 user 的 theme 套到 `:root`。

### V4.5.0
科別整組上下排序:設定→醫師分頁,每個科別標頭列新增「▲」「▼」按鈕(放在重命名/刪除前),點擊把該科別所有醫師整組搬到上/下個科別位置;最上方的科別「▲」灰、最下方「▼」灰(跟單醫師排序的邊界處理一致);新函數 `moveDept(dept, dir)` 直接重排 `DRS` 陣列(不另存科別順序,因為 `[...new Set(DRS.map(d=>d.dept))]` 自然反映順序);若歷史 DRS 有同科別交錯排列,移動後會自然合併到一起

### V4.4.0
**版本號規則修正**:從這版開始嚴格進位 — 第三碼最大就是 9,超過 9 直接 y+1, z=0(以前長期容許 V4.3.45 這種第三碼 ≥ 10 是錯誤)。本版原為 V4.3.45,套規則後重新編號為 V4.4.0。

內容(沿用原 V4.3.45):修補 V4.3.43 主檔遷移失效根因——刪除舊版重複定義的 9 個函數(loadAll、migrateLOCS、migrateDRS、migrateCFG、migrateCFGConv、saveAll、mkStr、getMemberStr;舊版 L7812-7921),原本因 JS 後者覆蓋前者導致新版的 `_migrateDrsDepts()` 從未執行;修「耳鼻咙科→耳鼻喉科」typo;設定→醫師分頁新增「重新套用主檔遷移」按鈕,執行完顯示『重命名 N 位、新增 M 位、更新 X 個癌別』統計訊息;按鈕冪等可重複按、保留使用者手動新增的醫師

### V4.3.44
NAS 跨機同步刪除標記傳播：新增 `_canDelete()` 權限工具與 `writeTombstoneToNAS()` — 刪除會議時自動寫 NAS tombstone（{deleted:true, version+1, deletedAt, deletedBy}）；`syncWithNAS` 收到 tombstone 後刪除本地、且不會把已刪會議「升級」回正常檔；tombstone 90 天後自動清理；補修 `deleteCurMtg`（會議內刪除）與 `confirmBatchDelete`（批次刪除）漏掉的 createdBy 權限檢查；批次刪除遇到任一筆無權限即整批擋下並列出哪幾筆

### V4.3.43
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
