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

---

## 九、打包驗證(每次必跑)

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

## 十、下版優先清單

**按優先序：**

1. **記住上次登入者** — 上線必備:登入頁預選最近登入的個管師,不用每次都點;localStorage 存 `mdt_last_user`,登入頁渲染時讀出來預選;這個摩擦感最強、改動最小
2. NAS 同步觀察期:跑 1-2 週後看是否有 tombstone 累積異常 / 衝突情境沒被想到
3. 開會後模式:產出區顯示「今天有 N 場會議」快速入口
4. DOCX 繼續微調(依測試回饋)
5. 設定頁新增「同步狀態」面板:NAS 上有幾筆 tombstone、上次同步時間、衝突歷史

---

## 十一、一句話總結

V4.7.0 個案基本資料區新增 ECOG(0-4)+ 衰弱量表 CFS(1-9)兩欄,選項都附中文說明文字。新工具 `caseDemo(c)` 統一格式化「性別/年齡 ECOG X CFS Y」,共 9 處輸出(編輯/閱覽/PPTX/DOCX/HTML 投影片/Excel/JSON/兩個 AI prompt)全打通。AI 匯入提示詞 `genImportPrompt` 也加 ecog/cfs 欄位定義 + 完整中文說明,讓 AI 從病歷文字能正確抽取 PS。舊資料無欄位完全相容(caseDemo 看 falsy 不顯示)。下版第一優先還是「記住上次登入者」。
