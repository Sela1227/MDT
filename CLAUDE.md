# CLAUDE.md — MDT 會議管理系統

> 給 Claude 讀，讀完直接動手。版本細節在 README.md。

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

**會議物件重要欄位：**
```js
{
  id, title, cids, date, time, loc, version,
  savedBy, savedAt, createdBy,   // createdBy = 建立者 id（V4.3.30+）
  sections: {
    [cid]: {
      followups: [{..., status:'closed'|'ongoing', _autoImported}],
      cases: [{..., summary, decision, followNext}],  // followNext=false → 不帶入下次
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
| HTML 投影片 | `genHTMLSlides()` + `extraJs`（放大鏡/鍵盤） |
| DOCX | `genDOCX()` |
| 設定頁 | `openSettings()` → `renderLocsTab/DrsTab/CancerCfgList` |
| NAS 備份 | `backupToNAS()`, `pickNasFolder()`, `restoreNasHandle()` |
| 同步（未完成） | 預計 `syncWithNAS()`, `writeMtgToNAS()` |
| 儲存 | `saveMeeting(opts)` — `opts.silent=true` 不跳閱覽模式 |
| 會後填寫 | `openPostMtgPanel()`, `savePostMtg()` |
| 複製會議 | `openCopyMtgDialog()`, `confirmCopyMtg()` |

---

## 七、版本歷程（近期）

| 版本 | 關鍵變更 |
|------|---------|
| V4.3.45 | 修主檔遷移根因:刪舊版 9 個重複函數(後者覆蓋前者導致 _migrateDrsDepts 從未執行);修咙→喉 typo;醫師分頁加手動「重新套用主檔遷移」按鈕 |
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

**#13 同名 function 重複定義導致新版被覆蓋(V4.3.45,代表性大坑)**
- 症狀:V4.3.43 寫了新版 loadAll + _migrateDrsDepts,使用者部署後完全沒生效;科別還是舊的『頭頸外科』『消化內科』『婦科』
- 原因:檔案 L1223 寫了新版 loadAll(含 _migrateDrsDepts() 呼叫),L7812 還留著舊版 loadAll(沒呼叫)。JS function declaration 重複時後者覆蓋前者 — `_migrateDrsDepts` 被宣告了但**從來沒被執行過**
- 一同被覆蓋的還有:migrateLOCS、migrateDRS、migrateCFG、migrateCFGConv、saveAll、mkStr、getMemberStr 共 9 個函數(這次新版內容碰巧跟舊版相同所以沒造成更大災難)
- 做法:修改既有函數時,**全檔搜尋確認只有一份**;Python 一行檢查 `grep -c "^function loadAll" index.html`
- 教訓:大檔案編輯特別容易踩。每次 `node --check` 通過不等於正確 — 重複定義不是語法錯,是邏輯死亡。打包前加例行檢查:`grep -c '^function FNAME' index.html` 對任何重要函數應為 1
- 預防:加在打包驗證腳本裡 — 對所有 `^function (\w+)` 抓出來,>1 的全列警告

---

## 九、打包驗證(每次必跑)

```python
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
# V4.3.45 加:重複函數檢查(坑 #13)
fns={}
for m in re.finditer(r'function (\w+)\s*\(', h):
    fns[m.group(1)]=fns.get(m.group(1),0)+1
dups=[k for k,v in fns.items() if v>1]
print("重複函數:", dups if dups else "無")
print("函數總數:", len(fns))
```

版本號命名:bug fix `+0.01`,新功能 `+0.1`,大改版 `+1.0`

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

V4.3.45 修了一個半月前(V4.3.43)就埋下的隱形地雷:檔案裡有兩份 loadAll,後者覆蓋前者導致主檔遷移從沒執行過。順便修咙→喉 typo,加「重新套用主檔遷移」按鈕讓使用者隨時能手動觸發。坑 #13 進入永久教訓:同檔多份 function 重複定義是 node --check 抓不出來的死亡 bug,打包驗證腳本加了重複函數檢查。下版第一優先還是「記住上次登入者」。
