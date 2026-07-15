# SELA-handoff.md

> **這份文件是給 SELA Starter Kit 的 Claude 看的,不是給 MDT 的 Claude 看的。**
>
> 目的:讓 SELA 升 Kit 時不用挖 MDT 整份 CLAUDE.md,看這份就能高效升 Kit。

---

## 〇、專案速覽(給 Kit Claude 5 秒了解情境)

- **專案名稱:** MDT 會議管理系統
- **專案類型:** 純靜態網頁(單一 HTML 檔,localStorage 儲存,GitHub Pages 部署)
- **技術棧:** HTML / 原生 JS(無 framework)/ localStorage / File System Access API(NAS 同步)
- **規模:** 1 個 index.html(~628KB / ~8775 行)+ 文件 4 份 + favicon 套組 9 檔(V5.9.0 換 MDT 主 logo + 保留 sela.svg)
- **使用 Kit 版本:** **V1.21.0**(V5.10.5 起;歷程 V4.8.1→V1.6.0、V5.8.8→V1.15.0、V5.10.2→V1.18.0、V5.10.5→V1.21.0)
- **完成版本:** V5.10.5(對齊 Kit V1.21.0 後的版本)
- **完成日期:** 2026-06-22

**特殊背景**:這不是用 Kit 從零做的新專案,是**已存在 4.7 個版本的成熟專案接 Kit 規範**。所以反饋不是「冷啟動體驗」,是「**現有成熟專案接 Kit 的衝突點**」 — 這個視角 Kit 之前沒收過。

---

## ★ V5.10.5 對齊 Kit V1.21.0 報告(從 V1.18.0 跨 3 版)

依坑 #40 四級分類選擇性對齊。Kit V1.19.0~V1.21.0 新增坑 #59~#63 + V1.20.0 版號進位修訂 + references/ 三參考專案。

### 對齊範圍

| Kit V1.21.0 新規範 | 等級 | MDT 處理 |
|---|---|---|
| V1.20.0 版號進位修訂(只有 c 逢十進位,b 可超過 9) | 🟡 建議 | 坑 #14 補澄清:MDT b=10(V5.10.x)合法,不進位 a。消除「第三碼最大 9」被誤讀成「b 也最大 9」歧義 |
| 坑 #63 Python re.sub 注入(用 str.replace) | 🟡 建議 | 坑庫加 #28(給維護者:改 MDT 檔注入資料用 str.replace,不用會解讀 `\u`/`\1` 的 re.sub) |
| 坑 #59 inline SVG gradient id 衝突 | 🟢 不適用 | MDT grep linearGradient=0,無 SVG gradient |
| 坑 #60 GitHub Pages PWA blob manifest | 🟢 已符合 | MDT 用實體 site.webmanifest 檔 + 無 service worker |
| 坑 #61 UI 改名只改顯示文字 | 🟢 已符合 | V5.8.7 討論要點→方向,程式變數 discussion 沒動 |
| 坑 #62 拿欄位前查業務依賴 | 🟢 已符合 | 呼應 MDT「極度謹慎刪除」原則 |
| references/ 三參考專案範本 | ✗ 不做 | MDT 已成熟(V5.10.x),不需要從範本起步 |

### 升版判定
只動 CLAUDE.md(坑 #14 澄清 + 坑 #28 + 九之三對應表)+ SELA-handoff,不動 index.html → c+1。V5.10.4 → V5.10.5。

### 回流建議給 Kit(沿用 V1.18.0 報告的 2 條,持續有效)
1. §8 HTML 分享子資料夾 `Share` → 應更正為 `slides`(MDT 實際用 slides)
2. 坑 #42 N 處真相清單可補「多套 JS 色票」案例(MDT 有 PPTX+DOCX 兩套,共 5 處)

**V5.10.5 新增第 3 條回流建議**:
3. 坑 #63(re.sub 注入)可在「做法」補一句「**用 str_replace 編輯工具改檔時等同 str.replace,本身安全;風險在自己寫 Python 腳本批次替換時誤用 re.sub**」— 釐清工具 vs 手寫腳本的差異,避免維護者以為用了 str_replace 工具還要擔心 re.sub 問題。

---

## ★ V5.10.2 對齊 Kit V1.18.0 報告(從 V1.15.0 跨 3 版)

依坑 #40「鐵律 🔴 / 建議 🟡 / 順便 🟢 / 不做 ✗」四級分類做選擇性對齊。**MDT 是坑 #40 列名的第一個踩過此情境的專案**。

### 對齊範圍(四級分類)

| Kit V1.18.0 規範 | 等級 | MDT 處理 |
|---|---|---|
| 鐵律 #0 handoff 評估流程(V1.8.1) | 🟡 建議 | CLAUDE.md 九之三加「handoff 評估紀律」一列;這版本身就是 Kit 對齊版,符合「Kit 對齊→產 handoff」觸發條件,故有產這份報告 |
| 坑 #42 theme-color「N 處真相清單」(V1.15.0 補強) | 🟡 建議 | CLAUDE.md 九之三新增「N 處真相清單」表 — MDT 共 **5 處**(CSS :root、PPTX 的 JS 色票 L5228、DOCX 的 JS 色票 L5463、HTML theme-color、webmanifest)。比 Kit 範例 4 處多一處,因 PPTX/DOCX 各有獨立配色系統 |
| 坑 #57 解壓別人 zip 不限 find 深度(V1.16.0) | 🟢 已符合 | 這次解壓 Kit zip 用 `find . -type f`(不限深度)✓ |
| Kit 對齊紀錄版本標記 | 🟢 順便 | 九之三從「V1.15.0」更新到「V1.18.0」,對齊歷程補完整 |
| HTML 分享子資料夾(Kit §8 寫 `Share`) | ✗ 不做 | **MDT 實際用 `slides`**(GH_SLIDES_PATH,L4391),已上線運作。改 `Share` 會讓所有已分享的舊投影片連結失效。屬坑 #40「✗ 不做 = 已成熟業務命名」級。**回流建議見下方** |
| 醫療章 #51(NCCN vs 健保給付雙軌)、#52(健保條文版本日期) | ✗ 不適用 | **MDT 是「會議管理工具」,不涉藥物給付決策**(不像 Cancer Navigation 要標 NCCN/健保)。MDT 只管會議流程、個案討論記錄、產出文件,沒有藥物推薦/給付判斷功能。明確記錄不適用,避免未來誤對齊 |
| main + develop 雙分支(第 0 章 #5) | ✗ 不做 | MDT 用 Git Pusher 部署單 main 已穩定運作,不需要 develop 分支;這是 MDT 部署模式的既定選擇 |
| Kit #53/#54(Railway 部署) | ✗ 不適用 | MDT 用 GitHub Pages,非 Railway |

### 升版判定

依坑 #40 升版門檻表:本次**只動 2 個文件檔**(CLAUDE.md + SELA-handoff.md),不動 index.html 程式 → 「動 1-2 檔 = 純細節補強 → **c+1**」。故 V5.10.1 → V5.10.2。

### ⚠️ 回流建議給 Kit(請 SELA 升 Kit 時參考)

1. **§8「HTML 分享 repo」子資料夾 `Share` → 應更正為 `slides`**
   - Kit V1.18.0 CLAUDE.md L288 寫:「HTML 分享 repo:`github.com/Sela1227/MDT-slides`(子資料夾 `Share`)」
   - 但 MDT 系統實際用的是 **`slides`**(`const GH_SLIDES_PATH='slides'`,index.html L4391)
   - 兩者不一致。MDT 已上線用 slides,不改(改了舊連結失效)
   - **建議 Kit 把 §8 的 `Share` 更正為 `slides`**,以免下次別的 Claude 照 Kit 把 MDT 改成 Share 而弄壞

2. **坑 #42 的「N 處真相清單」可補一個「多套 JS 色票」案例**
   - Kit 範例是 4 處(CSS + 1 套 JS + HTML + manifest)
   - MDT 有 **2 套 JS 色票**(PPTX 一套、DOCX 一套),所以是 5 處
   - 「同一專案有多個產出格式、各有獨立配色系統」是個值得補進 Kit 的變體 — 提醒「JS 色票可能不只一套」



### V5.9.0 自製 MDT 主 logo 紀錄(雙軌品牌實戰)

MDT 第一個套用 Kit V1.15.0 §14.3 範本 B(醫療專業型)生圖工作流的子 app。完整流程紀錄:

| 步驟 | 內容 |
|---|---|
| 1. 範本選 | §14.3 範本 B 醫療專業型(MDT 是癌症中心多專科會議,完全符合)|
| 2. 主體設計 | 圍桌俯視 + 6 個身影 + 中心個案焦點(自訂,非範本 B 列舉的「path/shield/book/compass」)|
| 3. 背景色 | #5A7A8B 北歐霧藍(範本 B 預設)|
| 4. App 名稱 | MDT(3 字母無襯線粗體)|
| 5. 壁虎繼承 | NO(範本 B 規定)|
| 6. 生圖工具 | Gemini(Sela 自選)|
| 7. 生圖結果 | 一次到位,無需 §10.6「不滿意」處理 |
| 8. 程式整合 | favicon 套組(5 PNG + ico + 1024)+ 右下角微標改引用 sela.svg + `<head>` 移除 sela.svg icon link |
| 9. 雙軌共存 | favicon = MDT 主身分;右下角 sela.svg = SELA 平台微標 |
| 10. 設計檢核(§15) | 13 項 11 ✓ / 1 需測試(16×16 favicon)/ 1 不適用(DNA 2 字形呼應對 MDT 縮寫不適用)|

**回流給 SELA Kit 的建議**(這次發現,可供 Kit 升 V1.16 參考):

1. **§14 範本 B 可補一個 MDT/會議型範例**:Cancer Navigation / CCM Manual / Slip 都是「個體」工具,但 MDT 是「**團隊會議**」型醫療工具,主體該設計成「圍桌」這種「**多對一**」概念。範本 B 列舉的 subject 沒涵蓋這類。
2. **§9 雙軌共存**:當 favicon-32x32.png 換成子 app logo,**`sela-credit` 微標必須改引用獨立的 SELA 圖檔**(MDT V5.9.0 改引用 `sela.svg`)。Kit §9 該明寫這個陷阱 — 若不分開,微標也會變成子 app logo,違反雙軌規則。
3. **`<head>` SVG icon link**:V5.8.8 加的 `<link rel="icon" type="image/svg+xml" href="favicon/sela.svg">` 在 V5.9.0 必須移除(因為 favicon 已不是 SELA 而是 MDT,SVG/PNG 不一致會讓現代瀏覽器混亂)。Kit §4.1 該補充:「當你有自己的子 app logo 時,SVG icon link 該指向自己 logo 的 SVG 而非 SELA;若沒做子 app SVG,直接拿掉這 line」。

### V1.15.0 對齊紀錄(V5.8.8)

從 V1.7.1 → V1.15.0 跨 8 個小版本,Kit 新增了若干規範。**MDT 對齊範圍 + 不對齊範圍**:

| Kit 規範 | MDT V5.9.0 對齊狀態 |
|---|---|
| V1.8.1 品牌色 vs 介面色分離(`theme-color` 依 app 主題,不要永遠用 SELA 橘) | ✅ 已對齊 — theme-color 從 `#F36825` 改 `#5A7A8B`(北歐霧藍,V1.15.0 §14.3 醫療型預設) |
| V1.8.1 `site.webmanifest` 客製化 `theme_color` | ✅ 已對齊 — manifest 同步 `#5A7A8B` |
| V1.6.0+ `<head>` 加 SVG icon link(現代瀏覽器優先) | ⚠️ V5.8.8 加,V5.9.0 拿掉(因 favicon 換成 MDT 後 SVG/PNG 不一致) |
| V1.13.0+ §14 子 app logo prompt 範本庫(5 種類型) | ✅ V5.9.0 實戰套用範本 B 為 MDT 自製主 logo(雙軌共存 §9 規則) |
| V1.14.0+ §15 共通檢核清單 | ✅ V5.9.0 設計檢核 13 項 11 ✓ |
| V1.8.0 favicon 用相對路徑(坑 #39) | ✅ MDT 從 V4.8.x 就一直用相對路徑(`favicon/...` 而非 `/favicon/...`),本來就對 |

**logo 雙軌**(V5.9.0 起):
- **主 logo** = MDT 圍桌(favicon、PWA、apple-touch、android-chrome)
- **平台微標** = SELA 壁虎(右下角 `sela-credit`,引用 `favicon/sela.svg`)

### 提案前檢查紀錄(回應 V1.7.0 加的兩個檢查)

- **檢查 1(grep Kit 避免重複)**:已做。本案 6 條反饋都跟 Kit V1.7.1 既有坑庫(到 #38)做過比對 — 沒有重複既有坑。對照印證見「一、整體感受」結尾「Kit 跨專案坑與 MDT 坑互相印證」段落:Kit #20 ↔ MDT 坑 #16、Kit #23 ↔ MDT 坑 #5/#13、Kit #1 ↔ MDT 坑 #17、Kit #7 ↔ MDT 打包驗證腳本 — **這 4 對是「概念對應」不是「重複」**(Kit 是抽象規則,MDT 是具體實例)
- **檢查 2(踩坑 vs 跨平台知識)**:已做。本案分類:
  - **進坑庫(症狀→原因→做法)**:坑 #A(webmanifest GitHub Pages 子路徑)、坑 #B(套既有專案 SOP)
  - **進設計模式(會改決策方式)**:模式 #1(USER_GUIDE 判斷)、模式 #2(規範對齊型 b+1)
  - **進 Kit 結構修改**:webmanifest 預設值、logo 對照表加類型、CLAUDE-template 加 USER_GUIDE 章節
  - **不進 Kit(留 MDT)**:NAS tombstone、ECOG/CFS、彰濱主檔 — 全是業務邏輯
- **V1.7.0 新增的 #37/#38 與 MDT 無關**:#37 外部 API 時區、#38 雲部署 schema migration — MDT 都不沾。確認後沒加進「不要回流」段(因為根本不會搞混)。

---

## 一、用 Kit 的整體感受(給 Kit Claude 校準)

### 預期外的順利

- **CLAUDE.md 章法手冊與 MDT 既有章法幾乎完全相同**,證明章法已穩定成熟。MDT 從 V1.x 累積到 V4.7 的踩坑寫作模式(編號累積、三段式症狀/原因/做法)跟 Kit `conventions/CLAUDE-MD-章法.md` 內容幾乎逐條對應 — 表示這套章法在不同 stack(Web/HTML vs Flet/Python)都收斂到同一個寫法,值得相信。

- **Kit 的「跨專案坑」與 MDT 17 條坑互相印證,沒衝突**:
  - Kit #20(中文檔名亂碼) ↔ MDT 坑 #16
  - Kit #23(JS 大括號)↔ MDT 坑 #5、#13(JS 漏到 `</html>` 後、重複函數覆蓋)
  - Kit #1(三方對齊)↔ MDT 坑 #17(DEFAULT_C ↔ DEFAULT_DRS 不一致)
  - Kit #7(打包前驗證)↔ MDT 打包驗證腳本

- **logo/CLAUDE.md 的「直接執行不要反問」原則很受用**:對齊時我沒問尺寸/格式,直接照表查到「網頁專案 → svg + favicon 套組」就動手,省下對話往返。

### 預期外的卡住

#### 卡 1:Kit 的 site.webmanifest 預設絕對路徑,GitHub Pages 子路徑會壞

Kit 預設:
```json
"src": "/android-chrome-192x192.png"
```

MDT 部署到 `https://sela1227.github.io/mdt-system/` 子路徑,絕對路徑 `/` 會解析到 `https://sela1227.github.io/android-chrome-192x192.png`(根),圖檔找不到。

我改成相對路徑 `favicon/android-chrome-192x192.png` 才正確。

#### 卡 2:Kit logo 整合對照表的 14 種專案類型沒對應到「單一 HTML 檔系統」

對照表第 1 行寫「Web / Next.js / React / Vue → 用 svg + favicon 整套,放 `public/` 或 `static/`」。

但 MDT 是**純單一 HTML**(localStorage 儲存,沒有 build step、沒有 `public/`、沒有 framework),最接近的選項是「靜態網頁」 — 但 Kit 寫「放網站根目錄」也不直接適用(MDT 根目錄就一個 index.html,沒有「目錄」概念)。

我最後做法:在同一層加 `favicon/` 子目錄 — 但這要自己判斷,Kit 沒明寫。

#### 卡 3:Kit 沒明文要求「使用說明書(USER_GUIDE.md)」

MDT 從 V4.6.3 起加了 `USER_GUIDE.md` 給三位個管師看,事後證明對「**非開發者使用者**」的成熟系統很有價值(尤其是版本變動時告訴使用者「我不用做什麼」)。Kit V1.6.0 沒列為必含,但 MDT 自然演化出來 — 表示這個習慣應該回流。

但對純開發者工具(CLI、Flet 桌面)可能多餘。建議 Kit 加判斷準則。

### 對 Kit 的整體評價

- ✓ **章法部分非常成熟**,直接拿來用沒摩擦
- ✓ **logo 整合對照表 + 程式碼片段**節省了大量決策時間
- ✓ **跨專案坑庫 32 條**對「現有 Web 專案」也適用,沒有 stack-specific 過度
- ✗ **webmanifest 路徑陷阱**:GitHub Pages 子路徑情境沒覆蓋
- ✗ **單一 HTML 檔系統**:logo 整合對照表沒此類型
- ✗ **使用說明書習慣**:有非開發者受眾的專案需要,Kit 沒提

---

## 二、發現的「跨專案通用坑」(建議進 Kit)

### 強烈建議加坑

#### 坑 #A. site.webmanifest 在 GitHub Pages 子路徑用絕對路徑會壞

- **症狀**:部署到 `username.github.io/project-name/` 子路徑後,manifest 裡的 icon 路徑 `/foo.png` 解析到 `username.github.io/foo.png`(根),Chrome devtools 報 404,PWA「加到主畫面」無圖示
- **原因**:zip 內的預設 webmanifest 用絕對路徑(GitHub user/organization site `username.github.io/` 是 OK 的,但 project site `/project/` 子路徑會壞)
- **做法**:webmanifest 內所有 icon `src` 改相對路徑(`favicon/foo.png` 而非 `/foo.png`),適用所有 GitHub Pages 部署情境
- **影響範圍**:**所有用 GitHub Pages 部署的專案**(Sela 多個 repo 都這樣部署),特別是 PWA / 任何用 webmanifest 的網頁
- **證據**:MDT V4.8.0 對齊時實際踩到,改相對路徑後正常

#### 坑 #B. 修改既有專案 vs 開新專案 — Kit 套路不完全適用

- **症狀**:對「已有 4.7 個版本的成熟專案」套 Kit 時,某些 Kit 步驟不適用(如「從零建立檔案」、「用 templates/CLAUDE-template 起手」)
- **原因**:Kit 預設情境是「開新專案」,沒明文區分「套到既有專案」的差別
- **做法**:Kit 加一節「套到既有專案的對齊清單」 — 跳過從零建立、保留既有 CLAUDE.md 章節結構,只對齊以下 6 項:
  1. zip 命名格式(空格)
  2. 必含 `.gitignore`
  3. 必含 SELA logo + favicon
  4. 必含 `CLAUDE.md`(已有則不動)
  5. 必含 `README.md`(已有則不動)
  6. 三位版本號規則(已不符則保留歷史 + 從下版開始嚴格)
- **影響範圍**:Sela 任何「Kit 出來前就做的舊專案」都會踩
- **證據**:MDT V4.8.0 升級對齊就是這個情境,原本沒明確流程

### 可加但等更多證據確認

- **「規範對齊」型 b+1 的版本號歸屬**:V4.8.0 沒改任何功能,只加品牌資產 + 部署規範,但檔案數量增加(8 個新檔)、新章節進 CLAUDE.md → 是 b+1 還是 c+1?Kit 沒明寫。建議多 1-2 個專案踩到再決定是否寫進 SPEC.md 第 11 章。

---

## 三、發現的「跨專案設計模式」(建議進 sela-philosophy / 規範)

### 模式 #1. 「使用者是誰」決定要不要 USER_GUIDE.md

- **本案發生情境**:MDT 給三位**非開發者**個管師用,V4.6.3 起加 `USER_GUIDE.md` 後,每次升版她們看「九、本版新功能」就知道我不用做什麼、什麼自動修。沒這份檔的話三人會反覆問同樣問題。
- **可推廣的原則**:**有非開發者受眾的專案應有 USER_GUIDE.md**,純開發者工具可省略。判斷準則:
  - **要 USER_GUIDE.md** — 醫療系統、企業內部工具、有「使用者 ≠ 開發者」的專案、要交接給接班人的專案
  - **不需要** — CLI 工具(README 已含 usage)、開發者工具(target 是工程師)、雛型階段
- **代價/取捨**:USER_GUIDE 要每版同步維護(Kit 應加同步規則,類似 Kit 已有的「版號標記三處」鐵律)。維護成本中等,對非開發者價值極高。
- **建議寫入**:`templates/CLAUDE-template.md`(加可選章節)+ `start-project-decisions.md`(加判斷準則)

### 模式 #2. 「規範對齊」是專案的合法 b+1 變更

- **本案發生情境**:V4.8.0 沒改任何使用者體驗的程式邏輯,但 favicon、theme-color、右下角 logo、.gitignore、CLAUDE.md 章節結構全動了 — 一般語境會說「這版『沒做什麼』」,但實際上 deliverable 結構大改。
- **可推廣的原則**:**「外部規範對齊」是 b+1 的合法理由**(等同 Kit 升級到新版時,所有專案逐一對齊)。判斷準則:
  - 改了**檔案結構** / **必含檔清單** / **打包格式** → b+1
  - 改了**內部實作但 deliverable 不變** → c+1
- **代價/取捨**:無代價,只是名詞釐清。
- **建議寫入**:`deployment/SPEC.md` 第 11 章版本號規則加註

---

## 四、Kit 該瘦身或調整的地方

### Kit 規範修改建議

#### 1. `logo/favicon/site.webmanifest` 改用相對路徑

- **現狀**:`"src": "/android-chrome-192x192.png"`(絕對路徑)
- **建議改成**:`"src": "favicon/android-chrome-192x192.png"`(相對路徑) + 在 `logo/CLAUDE.md` 加註解「絕對路徑 `/` 在 GitHub Pages 子路徑會壞,預設用相對路徑」
- **理由**:Sela 多個 repo 是 GitHub Pages 部署,絕對路徑會踩坑;相對路徑兩種情境都通

#### 2. `logo/CLAUDE.md` 第 1 章對照表加「單一 HTML 檔」類型

- **現狀**:14 個專案類型沒涵蓋「單一 HTML 檔(localStorage)」
- **建議改成**:在「靜態網頁」之下加一行
  ```
  | **單一 HTML 檔(localStorage)** | `svg/sela.svg` + 整個 `favicon/` | 同層 `favicon/` 子目錄 + `<head>` 引用 |
  ```
- **理由**:這個型態在醫院內部工具特別常見(沒 build step、沒 framework、檔案要好搬)

#### 3. `templates/CLAUDE-template.md` 加可選章節「USER_GUIDE 同步規則」

- **現狀**:Kit V1.6.0 沒提 USER_GUIDE
- **建議改成**:加章節說明何時需要 USER_GUIDE.md(判斷準則見模式 #1)+ 同步規則(類似既有「使用說明書同步規則」鐵律,版號標記三處)
- **理由**:這個習慣對非開發者受眾的專案價值極大(MDT 用了 5 個版本實證),回流 Kit 後其他類似專案直接受益

### Kit 結構性建議

#### A. 加「套到既有專案的對齊清單」章節

放 `deployment/SPEC.md` 或 `templates/claude-init.md`。理由見坑 #B。

---

## 五、留在 MDT 專案、**不要回流 Kit** 的東西

> 這節極重要。沒有這節 Kit Claude 容易把醫療業務邏輯誤收進 Kit。

- **MDT 17 條坑全部留在專案** — 醫療領域邏輯,跟 Kit 跨專案抽象不衝突。例如坑 #4「DEFAULT 變更後 localStorage 不自動更新」是 MDT 特定 schema 演進問題,不該推廣到所有專案。
- **ECOG / CFS 量表的中文說明文字** — 純醫療業務知識
- **NAS 跨機同步「軟刪除 tombstone」實作** — 軟刪除概念雖可推廣,但 MDT 用 NAS 共享資料夾的場景太特殊(三台醫院機器透過共用磁碟同步,不是用網路 API 服務)
- **`migrateCFGConv` 等 schema 演進函數** — 純 MDT 業務遷移
- **彰濱秀傳的科別/醫師清單、癌別配置** — 業務資料
- **三位個管師(楊靜雯、郭美伶、林伯儒)的個人化機制** — 業務角色

---

## 六、Kit Claude 的建議行動清單

### 建議升 Kit 版本

**V1.7.0**(b+1,新內容,結構性新增)

理由:加 1 條坑(#A webmanifest 路徑) + 加 1 條坑(#B 套既有專案) + 結構新增(USER_GUIDE 章節) + 修 1 個檔案(webmanifest 預設值) + 修 1 個對照表(logo 對照加單一 HTML)

### 必做

- [ ] **`logo/favicon/site.webmanifest` 改用相對路徑**(2 行 src 改寫)
- [ ] **`logo/CLAUDE.md` 第 1 章對照表加「單一 HTML 檔」類型**
- [ ] **`conventions/cross-project-pitfalls.md` 加坑 #37「webmanifest 在 GitHub Pages 子路徑路徑陷阱」**(用 MDT V4.8.0 為證據)
- [ ] **`conventions/cross-project-pitfalls.md` 加坑 #38「修現有專案 vs 開新專案 — 套既有專案的對齊清單」**(用 MDT V4.8.0 為證據)
- [ ] **`templates/CLAUDE-template.md` 加 USER_GUIDE.md 章節說明**(可選章節 + 何時需要 + 同步規則)
- [ ] **`conventions/start-project-decisions.md` 加 #5.6「使用者是誰?」判斷有沒有非開發者受眾**

### 暫緩

> 還不夠成熟、或需要更多證據才能決定的。

- [ ] **「規範對齊」型 b+1 的版本號歸屬寫進 SPEC.md** — 等再 1-2 個專案踩到再寫,單一證據不夠
- [ ] **使用說明書要不要變必含** — V1.7.0 先標可選 + 加判斷準則,等再 2-3 個有非開發者受眾的專案實證後再決定升必含

### 不做

> 明確不該做的,免得 Kit Claude 誤判。

- [ ] **MDT 的 NAS 同步邏輯進 Kit** — 太具體業務情境,不通用(雖然「軟刪除 tombstone」概念可推廣,但 Kit 跨專案坑庫已有更通用的 schema 演進坑,不需要)
- [ ] **MDT 的醫療領域坑進 Kit** — 17 條全是 MDT 專屬
- [ ] **MDT 的 caseDemo 工具函數模式進 Kit** — 太具體,只是「用單一函數統一輸出格式」這個小技巧

---

## 七、給 Kit Claude 的最後備註

**這是 Kit V1.6.0 第一個「成熟專案套 Kit」的反饋**,跟「新專案用 Kit 從零做」的反饋本質不同。前者衝突點在「既有結構 vs Kit 規範」,後者在「冷啟動效率」。建議 Kit V1.7.0 之後再收 1-2 個成熟專案 handoff,如果都提到「**現有專案套 Kit 沒明確流程**」這條,就升優先度。

MDT 是醫療系統 + 給 3 位個管師用 + GitHub Pages 部署 + 單一 HTML 檔 + localStorage 儲存,**這個組合 Kit 之前沒看過**(reference 都是 Flet/CLI/multi-file Web)。所以本案反饋偏重「Web 端極簡情境」,Kit Claude 可以參考但別當成普遍真理 — 等下個 Web 專案再交叉驗證。

---

*文件版本:V4.8.2 · 2026/05*
*產出對象:SELA Starter Kit V1.7.1 → V1.7.2/V1.8.0 升級規劃*
