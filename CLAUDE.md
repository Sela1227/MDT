# CLAUDE.md — MDT 會議管理系統

> 給 Claude 讀，讀完直接動手。版本細節在 README.md。

---

## 零、開工必讀

**打包清單、版號一致、所有檢查 —— 以 `python3 preflight.py` 為準。** 本檔不再自己列清單(原則 A:一件事一份)。全 ✅ 才能打包,它會印出 zip 指令。

| 檔案 | 給誰 | 內容 |
|---|---|---|
| `CLAUDE.md` | 接手的 Claude(每次全讀) | 本檔:章法、資料架構、九條原則、**決策紀錄**、最近 5 版、系統現況 |
| `CHANGELOG.md` | 查歷史 | **版本歷程唯一來源**(V5.71.0 起),新版在上 |
| `PITFALLS.md` | 查某條坑的細節 | 89 條坑原文 |
| `README.md` | 開發者 | 系統現況說明(不含歷程) |
| `USER_GUIDE.md` | 三位個管師 | 操作說明 |
| `SELA-handoff.md` | Kit 的 Claude | **凍結於 V5.10.5**,數字不是現況 |
| `content-equiv.js` + `content-baseline.json` | preflight | 投影片內容等價測試(V5.75.0)。**投影片上的字變了就 🔴**;主任同意改內容後才 `node content-equiv.js --update` |
| `test-meeting.js` | content-equiv / layout-check | 共用的真實份量虛構會議(V5.76.0),含 `MUST` 自我檢查;改它會讓 content-baseline 變,要 `--update` 並在 CHANGELOG 寫明「只換測試資料」 |
| `preview-check.js` | preflight | 預覽與畫重點端到端(V5.76.0):真 Chromium、系統分頁 + 預覽分頁 + postMessage |
| `layout-check.js` | preflight | 投影片版面檢查(V5.75.2):真 Chromium、1920×1080 與 1366×768,每頁看得到或捲得到。需要 playwright,沒有就 🔴 或 `--no-layout` |

**版號**:三段式 `V主.次.修`(新功能 +0.1、修正 +0.01)。**每版要更新**:`index.html` 的 `VERSION`、`CHANGELOG.md` 新增一節、本檔第七節(最近 5 版)、`USER_GUIDE.md` 第九節;改到資料架構/產出規則/同步機制時**同一版改 README 與本檔第五節**。

**範例病歷號一律用明顯虛構的**:`0000001 測○試`、`9000001`~。V5.71.0 清掉了文件與程式裡疑似真實的 14 組病歷號與 12 個姓名。

**使用說明書的寫作原則**:
- **對象是個管師**,不是工程師——沒有「localStorage」「version」「函數」這種詞
- **以工作情境組織**,不是按功能列表(例如「開會前要做什麼」「會後要填什麼」,不是「會議模組/個案模組/產出模組」)
- **每個功能配截圖位置描述**(「設定 → 醫師 → 科別標頭右側 ▲▼ 按鈕」這種)
- **新版本只更新「本版新功能」段落**,舊功能說明保留
- **長度**:5-15 頁可印出。不要寫成 50 頁手冊

### ⚠️ V5.12.0 起:`AudioSplitter.html` 是必帶的伴隨檔

錄音切割台用 **iframe 整合**(`<iframe src="AudioSplitter.html">`),所以 `AudioSplitter.html` **必須跟 index.html 放在同一層目錄**,否則「錄音切割」按鈕會開出空白。



**為什麼用 iframe 不直接內嵌**(整合時的衝突盤點):
| 項目 | 衝突 |
|---|---|
| 全域 `VERSION` | 🔴 AudioSplitter 有 `const VERSION="V3.3.0"`,直接內嵌會蓋掉 MDT 版號 |
| CSS class | ⚠️ 12 個撞名,且是 `row`/`meta`/`primary`/`left`/`bar` 這種通用名 → 樣式互相污染 |
| 函式名 / HTML id / localStorage | ✅ 0 撞名 |

iframe 是**同源沙盒**:變數與樣式完全隔離,但功能不受限(檔案上傳 / AudioContext / 下載都正常),而且 AudioSplitter 可獨立升版不用改一行。

---

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
| **新增裝飾性 emoji**(🎉 🚀 👍 之類) | 狀態符號可用:✓ ✗ ⚠ ★ ● ▸ ▼ ↑ → ↓;既有功能圖示(📂 🔍 🎙 🤖 等)保留不清理。2026-09-24 主任定案 |
| 範例/測試用的病歷號用真實號碼,**包括測試字串與審核報告** | 一律 `0000`/`9000` 開頭;preflight 會擋 |

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
## 五、資料架構(localStorage)

依「會不會跨電腦 / 會不會進備份」分五類。**任何新 `mdt_` key 都要先決定屬於哪一類**,並同步本表(preflight 會比對)。

| 類 | key | 內容 | 備份 | NAS 同步 |
|---|---|---|---|---|
| **會議資料** | `mdt_m_{id}` | 完整會議物件 | ✅ | ✅ `sync/mdt_m_{id}.json` |
| | `mdt_idx` | 會議索引(`IDX_MAX=2000`) | ✅ | 重建 |
| **設定** | `mdt_cfg` `mdt_locs` `mdt_drs` `mdt_exam_types` | 癌別/地點/醫師/檢查類型 | ✅ | — |
| **偏好** | `mdt_ai_pref` `mdt_cr_template` | AI 偏好、報告範本(`_PREF_FIXED`) | ✅ | — |
| | `mdt_html_theme_{uid}` `mdt_html_fname_lang_{uid}` `mdt_last_user` | 每人配色、檔名語言、上次登入者 | ✅ | — |
| **單台狀態**(不備份) | `mdt_pushed_{id}` | **這台電腦最後推送成功的 rev** —— 絕不能寫進會議物件(M-1 P0) | ❌ | ❌ |
| | `mdt_conflict_toast` | 衝突提示今天是否已顯示(台北日期) | ❌ | ❌ |
| | `mdt_nas_last` `mdt_nas_last_date` `mdt_last_backup` `mdt_nas_handle` `mdt_fs` | NAS/備份時間、資料夾 handle | — | ❌ |
| **機密**(不備份) | `mdt_ai_key` `mdt_upload_key` `mdt_zoom_pwd` `mdt_cf_token` `mdt_gh_token` | 金鑰(後兩者已淘汰,留著相容) | ❌ `_NEVER_BACKUP` | ❌ |
| **遷移殘留** | `mdt_mig_sec_v*` `mdt_sec_*` `mdt_ai` | V5.46.0 停用的分區資料與遷移旗標;`mdt_ai` 為 V5.37.0 前的合併設定 | — | — |
| **測試** | `mdt_test` | 容量探測 | — | — |

`_NEVER_BACKUP` 現值:`ai_key|cf_token|ai|zoom_pwd|upload_key|pushed_.+|conflict_toast`

**會議物件重要欄位**:
```js
{
  id, title, cids, date, time, loc,
  version,            // 排序鍵,不是內容識別
  rev,                // 每次存檔 uid() —— 同號不同 rev = 兩台內容不同(S-1 同步的基礎)
  savedBy,            // 姓名(畫面、歷史篩選用)
  savedById,          // id(合併判斷用;V5.68.0 N-1)
  savedAt, createdBy,
  sections: {
    [cid]: {
      cases:     [{..., summary, decision, followNext, gender, ecog, cfs, timeline:[{id,type,date,endDate,label,key,pivot,_ai}]}],
      events:    [{... 必要事件 ...}],
      team:      [{... 醫療小組 ...}],
      followups: [{..., status:'closed'|'ongoing', _autoImported}],
      special:   [...],
      hlMarks:   {v:2,marks:[{k:'頁型|病歷號#序',q:畫到的文字,pre,suf,o,t,s,c}],at,by}  // V5.77.0 投影片標記:依病人+文字對位(會議內容的註記,要同步);V5.76 舊格式 {頁面文字指紋:[[起始,長度,…]]} 仍可讀
    }
  }
}
```

**記憶體狀態(不存檔)**:`S._baseRev/_baseVer`(這個畫面包含 NAS 哪一版)、`S._pendingNasMerge`、`S._keepMine` —— **`_loadMtg` 開頭一律清掉**(P-1)。

**關鍵規則**:DEFAULT 資料變更後,localStorage 舊資料不自動更新,必須寫遷移函數在 `loadAll()` 後執行。

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
| LINE 通知(文字 + 圖片) | `_lineData()` 唯一資料來源 → `genLine()` 文字、`renderLineImage()`/`genLineImage()` 圖片;子分類 `_lineSub()`(V5.78.0) |
| 設定頁 | `openSettings()` → `renderLocsTab/DrsTab/CancerCfgList` |
| 醫師/科別管理 | `addDr/editDr/delDr/moveDr`（單醫師）、`addDept/renameDept/delDept/moveDept`（科別整組）；手動遷移 `applyMasterMigrations` |
| NAS 備份 | `backupToNAS()`, `pickNasFolder()`, `restoreNasHandle()` |
| NAS 同步 | `syncWithNAS()`, `writeMtgToNAS()`, `writeTombstoneToNAS()`, `_canDelete()` |
| 儲存 | `saveMeeting(opts)` — `opts.silent=true` 不跳閱覽模式 |
| 會後填寫 | `openPostMtgPanel()`, `savePostMtg()` |
| 複製會議 | `openCopyMtgDialog()`, `confirmCopyMtg()` |

---
## 七、最近 5 版

| 版本 | 一行 |
|---|---|
| V5.78.0 | LINE 通知圖片(`_lineData` 一份資料,文字與圖片共用;layout-check 真 Chromium 畫圖);「預覽與畫重點」移到「HTML 投影片」前;「標誌」統一為「標記」(主任要求) |
| V5.77.0 | 標記改用「病人 + 畫的文字」對位(改資料不再整頁消失,舊格式相容);工具列清除分三顆(主任要求) |
| V5.76.1 | R-1 合併時標記各自保留 + 存完核對才說已存;R-2 多份預覽;R-3 慢存檔不誤報;R-4 複製會議不帶標記(主任同意) |
| V5.76.0 | **A 預覽與畫重點**(標記存進 `sections[cid].hlMarks`,postMessage + ack);Q-1 簡報筆;Q-2 純文字特殊議程提醒;Q-3;F 共用 `test-meeting.js`;Q-4 逐段裁切檢查;E 說明書對齊(主任同意) |
| V5.75.2 | P-1 前期追蹤表可捲(V5.75.1 造成的 P1)+ `layout-check.js` 真 Chromium 版面檢查;P-2 續追只留原始決議+最近一次結果(主任同意) |

**完整歷程見 `CHANGELOG.md`**。

---
## 八、踩過的坑 —— 九條原則(V5.70.0 收斂)

89 條坑其實是**九種形狀**反覆出現。寫程式前先對照這九條;要查某條坑的細節看 `PITFALLS.md`。
**上線前只跑一個指令**:`python3 preflight.py`(全部 ✅ 才能打包;`--quick` 只跑靜態約 5 秒)。

| # | 原則 | 一句話 | preflight 守的項目 | 代表坑 |
|---|---|---|---|---|
| **A** | **一件事只能有一份** | 同一邏輯、同一資料、同一列舉,第二份遲早跟第一份分岔。改一份之前先 grep 還有幾份;有就先收斂成一個函式 | (靠 code review)audit-render 的 data-ty 覆蓋率、影像進投影片 | #13 #37 #43 #61 #73 #80 #83 #68 #71 #74 |
| **B** | **同步與狀態** | `version` 是排序鍵不是內容識別;「這台電腦的狀態」不進會同步的物件;「已儲存」是時間點不是布林;換會議要清掉上一場的狀態 | 推送紀錄不進物件、`_loadMtg` 清 base、savedBy 存姓名、`_NEVER_BACKUP`、**雙機 NAS 模擬 10 條** | #33 #53 #54 #72 #87 #89 P-1 |
| **C** | **字串與跳脫** | `node --check` 只看 JS 語法,看不到 HTML 解析、模板字串吃跳脫、inline 屬性裡的值、控制字元。替換程式碼時錨點要從行首、照抄同行 `cid` 的跳脫層級 | 檔尾、語法、產出物語法、孤立 async、`</script`、控制字元、裸插值、列序號、parseInt 誤植、hl-data 自我匹配 | #48 #52 #65 #70 #78 #79 #82 #84 #88 |
| **D** | **靜態通過 ≠ 執行正確** | 冷路徑等於沒執行過;修完要再按一次;測試用真實資料來源(CFG 的 keys),不要自己編輸入;單機測不到的要雙機測 | jshint 未定義、audit-render(渲染/往返/雙機/斷線/跨會議) | #55 #57 #67 #69 |
| **E** | **對照表與設定一致** | 選單、縮寫表、提示詞選項、版號,凡是「兩處要對得上」的都會對不上。能程式產生就不要手寫 | 4 檔版號、CANCER_SHORT 覆蓋、性別不預設 M、產出不變量 | #4 #15 #35 #36 #75 |
| **F** | **條件與過濾** | 每條「有 X 才顯示」要問使用者填得到 X 嗎;安全規則要確認每種資料真的有那個風險;排序方向改了下游 `find()[0]` 全錯 | (靠 code review) | #30 #77 #81 #85 |
| **G** | **臨床語意** | 視覺演算法不能補資料裡沒有的意思;圖上距離要代表時間;填得越完整資訊不能越少 | audit-render 的 tlLayout 純函式 12 條 | #49 #50 #86 |
| **H** | **使用者看得到的** | 保護邊界用「看得到、點得到」畫;訊息看時機與呈現;程式正確但每天多按幾十次也是缺陷 | (靠實際使用) | #59 #62 #63 #66 |
| **I** | **顯式傳值** | 不用物件上的暫存標記或函式屬性當全域;UTC 不是台北;檔名特殊字元;LLM 的「純 JSON」要容錯 | (靠 code review) | #21 #31 #34 #56 |

### 三條不在九類裡、但每次都要記得的
- **改一個欄位的語意,grep 所有讀它的地方**(N-1:`savedBy` 從姓名改 id,8 處壞)
- **每個欄位問一次:這是資料的屬性,還是這台電腦的狀態**(#89)
- **「讓紅燈變綠燈」最省事的做法是拆燈泡**(#58)—— 測試失敗先懷疑程式,再懷疑測試;改測試要寫理由
- **檢查工具本身要確認有在跑**(V5.70.0 發現):過去每版報告的「jshint: (空=通過)」是 `jshint ... | grep "not defined"` —— **jshint 根本沒安裝**,指令失敗、grep 對空輸出,一次都沒真的檢查過。preflight 現在找不到 jshint 會明講「略過」,不會假裝通過;`audit-render.js` 的「總計錯誤」在 V5.69.0 前也只算 `errs.length`,各段的 `bad++` 從未計入。**「沒看到錯誤」和「檢查過沒有錯誤」是兩件事**

## 九、使用說明書同步規則(V4.6.3 起)

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

## 十、SELA Starter Kit 對齊狀態(V4.8.0 起;V5.10.5 升至 V1.21.0)

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

## 十一、決策紀錄

主任定案都在這裡。審核與接手時**先看這節**,避免重複提出已決定的事。

| 日期 | 決定 | 狀態 | 影響範圍 |
|---|---|---|---|
| 2026-09-24 | **合併會議所有文件產出永遠只出目前分頁癌別**,無合併流程(LINE 通知與 LINE 通知圖片例外) | 生效 | `getOutputCid()` 註解為設計不變量;preflight 檢查仍在 |
| 2026-09-24 | **HTML 產出不要亂動,先討論再改**;目錄定位、雙欄功能延後 | 生效 |
| 2026-10-15 | 主任:①名稱統一用「標記」②LINE 通知額外產出圖片(會前通知多一顆,設計自訂,不照紙本)③先預覽才產出正式 HTML(按鈕順序) | 已完成(V5.78.0) | `_lineData`/`genLine`/`renderLineImage`;產出區按鈕;工具列與提示文字 |
| 2026-10-15 | 主任:「畫線儲存後回去改內容,畫線會消失」→ 同意改成「病人 + 文字」對位;工具列改為「復原上一步(多步)/清除標誌/整頁標誌清除」三顆 | 已完成(V5.77.0) | extraJs `_hlPageKeys/_hlSysCollect/_hlFind/_hlApplySys`、`hlClear/hlClearPage` |
| 2026-10-15 | V5.76.0 審核:R-1 選「標記各自保留」(合併時 NAS 換掉非負責癌別的區段,但保留這台改過的 `hlMarks`);R-2~R-4 一起修 | 已完成(V5.76.1) | `_doSave` NAS 合併、message 處理器、extraJs `_hlSendSys`、`confirmCopyMtg` |
| 2026-10-14 | 流程優化:主任說明「標記都在各自電腦畫好存好,會議上報告,當場畫是少數」→ 做 A(預覽與畫重點)、Q-1 簡報筆、不動投影片的一批(E/F/Q-2 提醒/Q-3/Q-4);B-2 影像根目錄待實機確認;C、Q-2 文字頁未做 | 已完成(V5.76.0) | `previewSlides`、`hl-sys`、extraJs 存標記;`test-meeting.js`、`preview-check.js` |
| 2026-10-14 | V5.75.1 審核:P-1 選「A 可捲動」(不分頁);P-2 選「原始決議 + 最近一次結果」 | 已完成(V5.75.2) | `.tbl` 樣式;`autoImportPrevFollowups`;preflight 加版面檢查 |
| 2026-10-14 | V5.75.0 審核:N-1、N-2 一起修;N-3 前期追蹤「三欄全印」、續追「上次結果放上次決議、目前結果留空」 | 已完成(V5.75.1) | 投影片/PPTX/Word/Excel 前期追蹤;`autoImportPrevFollowups`;**content-baseline 依此更新** |
| 2026-10-14 | V5.74.0 審核 H-1~H-11、F-1a/b、T-1:主任「全部一次修」,並**先做內容等價測試** | 已完成(V5.75.0) | 只改投影片互動程式;`content-equiv.js` 確認投影片文字不變 |
| 2026-10-14 | 投影片標記:匯出選「全套」、防誤用選「分組+復原」(顏色維持 5+5) | 已完成(V5.74.0) | `extraJs` 標記段、工具列、導覽列 |
| 2026-10-14 | F-1 影像資料夾:主任「自動建病人病歷號子資料夾(匯入時觸發),說明要清楚」 | 已完成(V5.73.0) | 匯入、四個選取入口、產出前檢查;**嚴格模式不變** |
| 2026-10-14 | T-1 醫療小組欄位名:主任「一起把 bug 改一改」 | 已完成(V5.72.1) | 投影片、閱覽、Word、會後填寫 |
| 2026-10-14 | 投影片基因檢測重複標籤 + Q-3 前期追蹤標題:主任同意修 | 已完成(V5.72.0) | 見下方「會議 HTML 待辦」;jshint 白名單 W007 即 Q-3 |
| 2026-09-24 | 疑似真實病歷號全部換成虛構 | 已完成(V5.71.0) | 範例一律 0000/9000 開頭,preflight 擋 JSON/JS/號碼+遮蔽姓名三種寫法 |
| 2026-09-24 | **git 歷史中的舊病歷號:維持現狀**(不改寫歷史、不開新 repo) | 定案 | 翻 GitHub 歷史仍查得到;不再討論 |
| 2026-09-24 | **emoji 規範**:狀態符號可用,禁止新增裝飾性 emoji;既有 116 處不清理 | 定案 | 見第三節 |
| 2026-09-24 | CHANGELOG「林○麗 + Breast IDC」為測試資料,保留 | 定案 | — |
| 2026-09-19 | 病程時序 Hybrid 五項決策 | 已完成(V5.55–5.61) | 見下方 |
| 2026-09-16 | B-5 Zoom 密碼在公開程式碼:**已知並接受** | 延後 | 見下方 |
| 2026-09-16 | B-4 HTML 分享 | 已完成(V5.62.0) | Worker `/api/upload` |
| — | 個資與法遵待辦(批次 B/C) | 部分延後 | 見下方 |

### 會議 HTML 待辦(2026-09-24)
主任原則:**「HTML 產出不要亂動,先討論再改」**。以下都已確認屬實,但延後:

| # | 問題 | 規模 | 狀態 |
|---|---|---|---|
| Q-3 | 前期追蹤頁 `.th` 標題樣式遺失(CSS 字串 `+ +` → `NaN`),標題從粗體 ~30px 變預設 16px。至少 V5.64.1 起 | 刪一個 `+` | **已修(V5.72.0)**,主任 2026-10-14 同意 |
| 目錄 | `_slideMeta` 只有 `case` 型;小組/事件/特殊議程頁目錄仍亮最後一位個案 | 最小修:非個案頁不亮 | 延後 |
| 雙欄 | 下方內容提示、欄寬切換 50:50/40:60/60:40、同頁放大、討論問題移上、空白鍵防護(外部複審 §四~§六) | 新功能 | 延後 |
| T-1 | 醫療小組欄位名:編輯畫面 V5.22.0 起改為「之前現病史/多專科建議/最新情況/治療決策」(只改顯示,底層 `cc/discussion/summary/decision` 不動),但產出沒跟著改 —— 投影片 `_trackSlide` 仍是「現病史/討論方向/摘要/決策」、閱覽模式 `teamViewHTML` 同、DOCX 醫療小組只出「討論摘要/決策結論」且**漏了之前現病史與多專科建議**。`_trackSlide` 與 events 共用,改時要用 `trackLabel==='醫療小組'` 分流(同 L9441 必要事件「病程經過」的寫法)。個管 2026-10-14 回報,「沒有要現在修」 | 投影片 4 個標籤 + 閱覽模式 + DOCX | **已修(V5.72.1)**,主任 2026-10-14 同意;另發現會後填寫視窗也是舊名,一併改 |
| 保護網 | **內容等價測試**:固定合成資料產出投影片存基準,任何 HTML 改動 preflight 🔴,須明確更新基準 | preflight 新項 | **已做(V5.75.0)**:`content-equiv.js` + `content-baseline.json`;改投影片內容須主任同意後 `--update` |

---

### 病程時序 Hybrid 五項決策(2026-09-19)
依「MDT V5.53.0 內部審核|治療事件軸專項(整合版)」第七節,五題全部採審核建議:

| # | 問題 | 決定 | 實作含意 |
|---|---|---|---|
| 1 | 投影片預設顯示 | **Summary view** | `tlLayout(…,{view:'summary'})` 為投影片預設;只留疾病類 type、有 endDate 的治療、手術/介入、`_ai.pivot`、個管師勾 `key` 五者之一。例行 CT、癌指數、週期細節、追蹤不出現。Full view 由按鈕切換 |
| 2 | 轉折點由誰標 | **兩者皆可** | 個管師勾選 `key`/手動標 pivot,與 AI 判讀 `_ai.pivot`(一律標示「AI」)並存。AI 不改寫原始事件 |
| 3 | endDate 是否必填 | **選填** | 沒填就畫單點,不推估結束日。「帶入」時同 regimen 連續多筆(C1~C6)自動提議合併成 bar,由個管師確認(O-4) |
| 4 | Today's question 來源 | **直接取「討論方向」** | `opts.discussion=c.discussion`,不新增欄位 |
| 5 | chemo 類型 | **保留,新增 systemic 並存** | `TL_TYPES` 加 `systemic`(免疫/標靶/荷爾蒙,regimen 寫 label)、`ned`、`progression`、`death`、`intervention`;chemo 與 systemic 同層(Treatment)。舊資料不遷移 |

**狀態**:五項決策已於 V5.55.0–V5.61.0 全部實作完成(批次 1 止血、2a/2b 引擎與投影片端 deep-equal、驗證與收斂、收尾 TL-5d/TL-10/TL-15)。細節見 `CHANGELOG.md`。

---

### 延後項目(2026-09-16)
| 項目 | 決定 | 現況 | 要處理時 |
|---|---|---|---|
| **B-5** Zoom 密碼在公開程式碼裡 | 「先不要管,但記下來」 | V5.50.1 加了 `_LEGACY_ZOOM` 退路,設定沒填就用舊值。**三組密碼仍在 GitHub Pages 上** | ①三台填「設定→系統→Zoom 會議密碼」②Zoom 後台重新產生三組 ③刪 `_LEGACY_ZOOM` 與 `||_LEGACY_ZOOM.qN` |
| ~~**B-4**~~ | **V5.62.0 結案** | 實機確認 `Failed to fetch`(CORS),V5.50.0 的預測正確。改打 Worker `/api/upload` + `X-Upload-Key`,CF token 從網頁移除 | Worker `cloudflare-share/index.js` 已寫好(mock KV 12/12),部署步驟見 `cloudflare-share/DEPLOY.md`。**未決:分享網址不需登入,病歷號公開** —— 建議 Cloudflare Access 或上傳前去識別化 |
| **A-5 / B-5 人工** | — | AI Key、CF Token、Zoom 密碼三樣都曾出現在備份或公開程式碼 | **換掉**。程式已不再外流,但舊的已流出 |

---

### 個資與法遵(批次 B/C)
> 個管師指示「個資問題先列待辦」,以下四項尚未處理。**建議在取得資安/個資窗口書面同意前,先行關閉功能入口。**

| # | 問題 | 風險 | 建議動作 |
|---|---|---|---|
| **P0-6** | 投影片上傳到**公開** GitHub Pages,檔名 `日期_癌別碼.html` **完全可預測** | 任何人跑迴圈就能抓下整年投影片;內含**完整病歷號**+遮罩姓名 = 可回溯識別 | ①確認 repo 可見性,若 public 先清空 slides 並轉 private;②上傳版**去識別化**(病歷號改流水號「案1」);③檔名加隨機 token;④長期改用院內管道 |
| ~~**P0-7**~~ ✅ V5.41.0 關閉 | ~~刪除不會刪 Git 歷史~~ → **Cloudflare KV 刪除是真刪除,連結立刻失效**;分享清單 `slice(0,30)` 導致第 31 筆後**UI 再也管不到** | 畫面顯示「已刪除」是謊報;管不到的公開病人檔案隨時間累積 | ①刪除時據實告知 Git 歷史;②分享清單移除 30 筆上限;③補「列出 GitHub 上所有檔案」比對功能 |
| ~~**P0-8**~~ ✅ V5.37.0 已修 | ~~AI prompt 含未遮罩的完整姓名與病歷號送往境外 LLM API~~ | 個資境外傳輸,無資料處理協議/IRB | 在 **prompt 組裝層**去識別化(姓名病歷號對 AI 摘要無貢獻),設定頁加固定告示 |
| ~~**P0-9**~~ ✅ V5.37.0 已修 | ~~`mdt_ai`(含 API Key)寫進每份備份 JSON~~ | 備份上 NAS/互傳/外寄 → 金鑰外流 | `_PREF_FIXED` 移除 `mdt_ai`;或拆成 `mdt_ai_pref`(可備份)與 `mdt_ai_key`(永不備份) |

**其餘待辦(批次 C)**:P0-5 NAS 備份檔名未含使用者識別(三台共用 10 份輪替 → 實際只留 3 天)、P1-3 `getNetworkTime` 封網時每次儲存阻塞 10 秒、P1-4 `readForm` 前三欄無 null guard 且允許空日期(空日期會共用同一組 section key 互相覆蓋)、P1-5 NAS 檔名用本地時間(全系統唯一漏網)、P1-6 渲染錯誤靜默吞掉導致個案卡片空白、P2-1 inline onclick 217 處、P2-2 `escA` 不跳脫單引號且 7 處欄位未跳脫(臨床文字常含 `<`)、P2-3 docx 走 CDN 無 SRI(封網即失效)、P2-4 使用者切換非權限控管(需寫入 USER_GUIDE)。

### 舊版下版清單(V5.10 時期,多已過時,保留參考)
**按優先序：**

1. **「(8-其他特殊複雜個案)」討論原因快速標籤系統** — 個管師有時要標個案因(如「治療中死亡」「必要提報」),用快速標籤而非每次手動打字
2. **PPTX 升級後個管師回饋觀察期** — V5.10.0 大改版型,個管師實際用幾場會議後可能回報微調(字級、間距、配色、某區塊版型)
3. NAS 同步觀察期:跑 1-2 週後看是否有 tombstone 累積異常 / 衝突情境沒被想到
4. DOCX 微調觀察期:V5.8.5 治療欄樣式 + V5.8.7 改名後,個管師實際用幾場會議後可能還有微調(如灰底色階、縮排幅度)
5. 開會後模式:產出區顯示「今天有 N 場會議」快速入口
6. 設定頁新增「同步狀態」面板:NAS 上有幾筆 tombstone、上次同步時間、衝突歷史

---

---

## 十二、系統現況(一段話)

MDT 會議管理系統是單一 `index.html`(約 13,000 行,部署於 GitHub Pages),三位個管師在各自電腦用 localStorage 儲存,經院內 NAS `sync/` 資料夾以「版號 + rev 內容指紋 + 依癌別區段合併」同步;合併會議的所有文件產出只出目前分頁癌別;投影片可經 Cloudflare Worker(`share.selaginella.io`,上傳金鑰 + 檢視密碼)分享;病程時序採 Hybrid timeline(`tlLayout`/`tlRender` 主程式與投影片共用同一份原始碼)。上線前以 `preflight.py` 單一入口檢查(字串跳脫、同步狀態、設定一致、jshint、jsdom 單機/雙機/斷線/跨會議/本機失敗、Worker)。會議 HTML 的版面改善(目錄、雙欄)依主任決定延後;投影片文字由內容等價測試(`content-equiv.js`)守住,改內容須主任同意後更新基準。
