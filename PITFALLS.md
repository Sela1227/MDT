# MDT 踩坑全紀錄(89 條)

> 這是 CLAUDE.md 第八章的**完整歷史版本**。日常只看 CLAUDE.md 第八章的九條原則;
> 要查某條坑的來龍去脈、當時的實測數字、錯誤訊息,再來這裡找。
> **不要刪任何一條** —— 坑號在程式碼註解與 preflight.py 裡被引用。
>
> 自 V5.70.0 起,原本散在本章的「打包檢查 Python 片段」已全部收進 `preflight.py`。

## 原第八章全文

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

**#89 「單台電腦的狀態」放進「會跨機器同步的物件」—— 推送紀錄跟著推上 NAS,別台誤判成自己有未推送(V5.69.0 M-1,P0)** 🔴
- V5.68.0 N-10 為了「本機有未推送修改時不被覆蓋」,把 `_pushedRev` 寫進會議物件 → 存檔時整個物件推上 NAS → B 同步拉到「A 的推送紀錄」→ B 的 `local.rev !== local._pushedRev` → 視為有未推送 → **從此不再拉這場會議**
- 實測:A 存兩次後 B 收不到第三次,同步只說「1 場衝突」,開啟時又不會問;側欄/行事曆/前期追蹤帶入全部拿舊資料
- 第二形狀:B 從 NAS 拉下來後 rev 變成 NAS 的,但 B 的推送紀錄還是自己上次推的 → 一樣誤判。**拉下來 = 本機沒有未推送**,pushed 要對齊
- 修法:推送狀態改獨立 key `mdt_pushed_<id>`(加進 `_NEVER_BACKUP`、刪會議時一併刪);`saveLocal(m,{fromSync:true})` 時對齊;讀進來的舊物件剝掉 `_pushedRev`
- **教訓**:每個欄位都要問「這是這份資料的屬性,還是這台電腦對這份資料的狀態」。後者絕不能放進會被同步的物件裡
- 同版 **M-2**:V5.68.0 N-7 在 `_loadMtg` 開啟時 `return null` 彈衝突視窗,呼叫端沒跑 `renderEditor`/`showView`,畫面還是上一場;選「本機」時 `readForm()` 從畫面讀日期 → **10/15 那場變成 11/19**。而且 Esc 可關視窗,關了 S.meeting 與畫面對不上,打字寫進錯的會議。修法:開啟時不彈窗,照常開本機版標 `_pendingNasMerge`,存檔前的分區合併本來就會處理;`cf-modal` 排除 Esc
- **M-3**:N-10 的保護只在同步函式,`_loadMtg` 仍直接覆蓋未推送的修改。而且離線修改**已存進本機**,跟快照比看不出來 → 合併時「我負責但沒改 → 取 NAS」丟掉。加 `_keepMine` 旗標,unpushed 時我負責的癌別一律保留;同號不同 rev 且 unpushed 也要設。第一版把清旗標放 `_resetEditState`,但它在 `_loadMtg` **之後**才跑,剛設好就清掉 —— 改在 `_loadMtg` 開頭清

**#88 用 `function foo(` 當錨點替換,但原本是 `async function foo(` —— 留下孤立的 `async` 變成 `async /* 註解 */`(V5.68.0)** 🔴
- 坑 #52 的第二種形狀:第一次是「註解插在 async 與 function 之間」,這次是「錨點從 function 開始,async 被留在替換文字前面」
- `node --check` 過(`async;` ASI 後是合法的 identifier statement),jshint 過,**只有 jsdom 載入才 ReferenceError**,而且整個主程式從那行起全部沒定義
- 打包檢查 [坑#52] `grep 'async /*'` 會抓到 —— 但我這輪改完沒跑打包檢查就跑功能測試,測試的 `newMeetingObj` 因 CFG 空而失敗,追了一輪才回頭看
- 做法:替換函式定義時,**錨點要從行首開始**(含 `async `),或改完立刻跑 [坑#52] 檢查
- 同版:N-1 是 S-1 修法的副作用 —— `savedBy` 從姓名改 id,8 處畫面與歷史篩選當姓名用的全壞;改回姓名另存 `savedById`。**改一個欄位的語意時,grep 所有讀它的地方**

**#87 NAS 同步只比 `version` 整數 —— 兩台各自 +1 後同號,後寫者整份覆蓋,之後永遠不再對齊(V5.65.0 S-1,P0)** 🔴
- 三個事實疊在一起:①`syncWithNAS()` 只在登入時跑一次 ②`_loadMtg()` 開會議不讀 NAS `sync/` ③`_doSave()` 無條件 `version+1` 後覆寫 NAS
- 合併會議(頭頸+血淋):林 10:00 改 HN 存 v8;楊 11:00 本機還是 v7、開同一場改 LY 存 v8 → **林的 HN 被蓋掉**;隔天兩台登入 NAS v8 = 本機 v8 → 不動,**兩台內容不同、版號相同,永遠不再對齊**
- 自動存檔每 2 分鐘也推 NAS,實際覆寫頻率比手動更高;單一癌別「同一人診間 A 機 + 辦公室 B 機」也會中
- **從 V4.3.41 就存在**,每次審核都在單機驗證所以沒抓到;V5.46.1 R-2 記下「同號不同內容永遠對不齊」但只修了一個成因
- 修法:①`_readNasMtg(id)` 讀單一會議的 NAS 副本 ②每次存檔 `S.meeting.rev=uid()` 讓「同號不同內容」可辨識 ③`_loadMtg` 開會議先拉 NAS 較新版並記 `S._baseRev/_baseVer` ④`_doSave` 存檔前比對 NAS `rev`,別台改過就**依癌別區段合併**(不是我負責的癌別取 NAS 版;我負責的也被改 → `showConflict`)⑤`syncWithNAS` 同號不同 rev 列入衝突計數 ⑥`visibilitychange` 且 `!_dirty` 時補跑同步
- **實測**(兩個 jsdom 共用一個 mock NAS):林 v8 HN 新 → 楊本機 v7 開會議改 LY 存 → NAS v9 **HN 新 + LY 新**,rev 不同
- 教訓:**`version` 是排序鍵不是內容識別**。任何「誰新誰贏」的同步,都要有一個內容指紋(rev/hash)辨識「同號不同內容」;而且「開啟時拉、存檔前比」缺一不可

**#86 治療一填結束日期就變 bar,而 bar 的渲染路徑沒有帶臨床語意 —— 填得越完整,圖上資訊越少(V5.60.0 M-3/P1-1)** 🔴
- V5.58.0 N-6 修「bar 與節點畫兩次」時,讓 `isBar` 的事件**不進 `nodes`**;但 pivot 環、AI 療效箭頭、basis tooltip 全部只在 `nodes` 的渲染裡
- 後果:同一筆 `{chemo, endDate, pivot:true, _ai:{response:'better'}}`,**填了結束日期就失去轉折環與 ↑**;拿掉結束日期又全部回來
- 而 V5.58.0 才鼓勵使用者填 endDate、AI 療效判讀又**只對治療類事件做** —— 兩者一組合,療效判讀幾乎永遠看不到
- 兩份審核都列第一優先:「使用者越認真補完整療程日期,圖上反而越少 clinical meaning,與 Hybrid 設計目的相反」
- 修法:`bars` 物件帶 `pivot/ai/resp/basis`,`pivots` 也從 bars 收;`tlRender` 在 bar 起點畫轉折環、終點畫療效箭頭(較接近評估時點,TL-5d 過渡)、basis 進 `<title>`
- **教訓**:修「畫兩次」的時候,要問「被拿掉的那一份帶著什麼別的東西」。N-6 只看到「標籤重複」,沒看到節點上還掛著 pivot/AI
- 同版 **M-1 是坑 #68 第五次**:`addStruct` 的 timeline 分支自己手寫一列 HTML,V5.58.0 N-2 只改了 `buildTimelineRows` —— 新增的列沒空白選項、沒 endDate、沒 ★/⚑,「新增」正是空類型最常發生的入口。抽 `_tlRowHTML()` 成唯一產生器
- **P1-3**:`createCase` 白名單漏 `pivot`(V5.58.0 加欄位時沒補進白名單,V5.54.0 showGenomics 同一形狀)
- **P1-4**:提示詞正文要求帶 id,**範例卻沒有** —— LLM 優先模仿範例;`doImportTlAi` 的 `if(!ev)return;` 擋在 `unmatched.push` 前面,同日無 id 的直接 silent skip
- **M-5**:V5.59.0 空窗擴大用 `realSpan<60 天` 二元條件,手術日期差 4 天整張圖翻轉;改連續函數 `share=min(0.45, 0.15+0.3·e^(-realSpan/120d))`,逐日推移 x 最大跳動 2px

**#85 寫了過濾規則,但沒檢查「使用者有沒有辦法讓資料滿足這條規則」(V5.58.0 N-1)** 🔴
- `tlLayout` 的 Summary 過濾寫成 `layer==='treatment'&&e.endDate` —— 而**編輯畫面根本沒有 endDate 欄位**,「從治療記錄帶入」也不產生
- 結果所有既有與新輸入的化療/放療/全身治療,在**預設投影片上全部消失**,頁尾還把它們稱為「例行事件」;Hybrid 三大層之一的 Treatment 永遠是空的,**比舊版更糟**(舊 Event-band 至少會畫治療)
- 而且與決策 3「endDate 選填,**沒填畫單點**」直接衝突 —— 我在 tlLayout 註解寫了決策 3,程式卻寫成「沒填就不畫」
- 兩份審核都列為 P0,實測典型案例 Summary 只剩「診斷、手術、復發」,隱藏 5 筆其中 4 筆是治療
- 修法三件:①過濾改 `layer==='treatment'` 一律顯示 ②列產生器加 endDate 欄(療程類才顯示)與 ★摘要/⚑轉折勾選 ③N-5 把 `key`(列入摘要)與 `pivot`(轉折)分開
- **教訓**:每一條「有 X 才顯示」的規則,要問「使用者在 UI 上填得到 X 嗎」。填不到的條件等於「永遠不顯示」
- 同版:**N-2** TL-3 修一半 —— 資料改 `type:''` 但 select 沒空白選項,瀏覽器預選第一項「診斷確立」,畫面與資料不一致且**改不過來**(選同值不觸發 change);**N-3** 空窗判斷只看相鄰疾病節點,「診斷→一串治療→多年後復發」永遠不壓縮;**N-4** `_ai.sig` 全檔沒人寫入是死碼,AI 對應仍用日期;**N-6** bar 與節點畫兩次;**N-8** `__caseTL` 的 `JSON.stringify` 不跳脫 `<`(B-8 同形狀第二份);**N-9** 新列沒 id

**#84 JS 字串裡的 `\b` 變成了 0x08 backspace 控制字元,語法合法但語意全錯(V5.55.0 TL-4)** 🔴
- `importTimelineFromTreatments` 的 RT 分類 regex `/\brt\b|…|\bgy\b|gray/` —— 檔案裡的 `\b` **是 0x08 控制字元**,不是 regex 字界
- 後果:`RT` → 其他、`Adjuvant RT 60 Gy` → 其他;`SBRT` 靠另一個關鍵字才命中。**「從治療記錄帶入」對放療的判定實際上是壞的**
- 推測來源:某次 `str_replace` 把 `\\b` 寫成 `\b` 送進 JS 字串,Python 的 `'\b'` 就是 backspace
- **`node --check` 過、jshint 過** —— 語法合法,只是 regex 裡多了一個永遠不會匹配的字元
- 修法:改用 `(^|[^a-z])(cc)?rt([^a-z]|$)` 明確寫字界,並補中文/常見寫法(放射、Proton、質子、brachy、`\d\s*c?gy`)
- **已加打包檢查**:`grep -P '[\x00-\x08\x0B\x0C\x0E-\x1F]' index.html` 排除函式庫行後必須為 0
- 同版 **TL-2**:`a.date.localeCompare(b.date)` 在 date 為 null 時拋 TypeError;帶入先 push 再 sort,拋錯後 markDirty/關窗/重繪全沒執行,**每按一次重複一批**;手動新增是 `''` 所以手測永遠測不到。統一 `_tlCmp`(沒日期排最後、不拋錯)取代 3 種寫法共 17 處
- **TL-1**:全檔沒有時序頁產生器,勾了「夾在投影片」時序就從投影片**完全消失**;移除開關、一律出按鈕
- **TL-3**:新增事件預設 `type:'dx'`,忘了改的每一列都變假診斷;改空
- **TL-9**:必要事件投影片的時序文字未排序、無類型

**#83 「列舉所有影像」有六份各自實作,每一份都只看 cases、全部漏 NGS(V5.53.0)** 🔴
- `_needsFolder`、預載迴圈、`_collectAuditRows`、`rebindMeetingImages`、`updateFolderStatusBar`、`backupToNAS` —— **六個地方各寫一遍** `for(const c of sec.cases)`
- 後果一:**個案的 NGS 影像從 V5.30.0 起就沒進投影片**(預載清單漏了 `genomicsImages`),22 個版本沒人發現 —— NGS 影像多半是內嵌上傳所以沒感覺
- 後果二:V5.52.0 開放必要事件影像,**只做了編輯端**;六個列舉迴圈沒一個看 `events` → 選了圖,投影片一張都沒有、檢查影像看不到、NAS 不備份、連「要不要授權資料夾」都不會問
- 後果三:`_trackSlide`(必要事件投影片)**根本沒有影像輸出邏輯** —— 那 87 行在個案 callback 內,外面拿不到
- **這是坑 #29(V5.11.2 只修 cases 漏 special)與坑 #81 的第三次**。坑 #61 說「同一件事的第二份實作要刪掉」—— 這裡有**六份**
- 修法:`_forEachMeetingImg(m,cids,cb)` 成為全系統唯一的影像列舉器(cases+events 五種影像+special),六處全改走它;
  影像組裝抽成 `_buildImgOut(_ck,c,cid,meta,color)`,個案與必要事件都呼叫,key 用 `ci-N`/`ev-N` 區隔
- **已加 `audit-render.js` 檢查**:產出投影片,斷言必要事件四種影像與個案 NGS 的 caption 都在裡面 —— 這條會抓 #29/#81/#83 這一整類
- 教訓:**新增一種資料(影像種類/卡片種類)時,先 grep 所有「列舉這種資料」的地方**,通常不只一處。而且要問「有沒有一個地方是列舉器,其他地方都該呼叫它」

**#82 同一份 HTML 產生器裡混用模板字串與串接字串,批次插入屬性時跳脫層級各不相同(V5.52.0)** 🔴
- `buildGenericImgArea` 是 V5.14.0 把五種影像統一的核心,裡面**三種字串上下文並存**:
  | 上下文 | 正確寫法 |
  |---|---|
  | 反引號模板 | `data-ty="${_ty}"` |
  | 單引號串接 | `data-ty="'+_ty+'"` |
  | 單引號串接內再有一層(`\'+cid+\'`) | `data-ty="\'+_ty+\'"` |
- 我用一支正則對 10 個 `data-action` 批次補 `data-ty`,**寫法統一成 `${_ty}`** —— 4 個串接上下文的變成字面文字 `${_ty}`
- 改成 `'+_ty+'` 之後,又有 3 個在**雙層跳脫**上下文的變成字面文字 `'+_ty+'`
- **前後改了四次才對齊**,每次都是實跑才看到 `imgmove='+_ty+'` 這種渲染結果
- 更糟的是**兩處 `parseInt` 誤植**:正則把 `,xxx.dataset.ty` 插進了 `parseInt(xxx.dataset.idx` 的括號裡 → radix 變成 `'events'` → 索引變 NaN。`node --check` 過、jshint 過,**只有實際按下去才發現刪到 cases**
- **這是坑 #67 的變體**:不只是「單引號裡的 `${}` 不插值」,而是**同一段程式碼裡三種上下文並存,批次替換必定至少錯一種**
- 做法(這次學到的):**批次插入前先對每個插入點印出同行的 `cid` 怎麼寫,插入時逐一複製 `cid` 的跳脫層級** —— `cid` 在那個位置已經是對的,照抄就對
- 另一個檢查:**任何插進函式呼叫參數的正則,替換後要驗證括號配對** —— `parseInt(a,b.dataset.ty)` 這種形狀就是錯位

**#81 為一種資料設計的安全規則,套到另一種沒有那個風險的資料上(V5.51.1)** ✅
- V5.32 的 `verifyImgOwnership` 規定「**絕不退回根目錄**」—— 那是為**病人影像**設計的,避免載到別的病人的同名檔案
- 但**特殊議程的影像本來就從根目錄選**(`pickSpecialImgs` 直接列 `imgFolderHandle` 的檔案),沒有病人子資料夾、沒有病歷號
- 結果:**從 V5.32 起特殊議程的影像就載不了**(`NO_OWNER`),整整 19 個版本沒人發現 —— 因為沒人用特殊議程放影像
- 個管師拿特殊議程當**必要事件的影像替代方案**(V5.42.0 必要事件先關掉影像)才踩到:「0/5 張已載入」
- 修法:特殊議程選圖時標 `_root:true`,驗證加 `opts.allowRoot`;舊資料在 `loadLocal` 時補標(特殊議程只能從根目錄選,所以 `fromFolder` 且無 `subFolder` 的一律是根目錄)
- **病人影像的規則不變** —— `allowRoot` 只在明確傳入時生效,實測 `verifyImgOwnership('a.jpg','','',{})` 仍回 `NO_OWNER`
- 教訓:**加安全規則時,要列出這條規則會影響到的「所有種類的資料」,確認每一種都真的有那個風險**。特殊議程沒有病人,「載到別的病人的檔案」這個風險不存在,規則不該套上去
- **連帶的決策點**:個管師已經在用替代方案,代表**必要事件的影像需求是真的**。要開放的話,影像流程還有 6 個 handler 寫死 `.cases[`(L11791/11867/11892/12105/12219/12233)要先改

**#80 同一份資料有兩個編輯畫面,其中一個寫回後另一個沒跟著更新(V5.51.0 N-1)** 🔴
- 會後填寫面板與個案卡片**編輯的是同一筆 summary/decision/eventStatus**
- 面板「存檔關閉」寫回資料了,**但卡片的 DOM 還是舊值**(textarea 的 value、select 的 selected)
- 個管師之後在卡片上補一個字 → `oninput` 把「舊值 + 一字」寫回 → **面板存的會議結論無聲消失**
- 必要事件的結案狀態也一樣:面板選「已結案」,卡片下拉仍顯示「待討論」,個管師以為沒存
- **這是坑 #73 的畫面版**:資料只有一份是對的,但**畫面有兩份**,一份更新了另一份沒跟上,遲早會回頭蓋掉
- 修法:面板寫回後**重繪有動到的區塊**(cases/events/team/followups 各自容器),不整頁 `renderEditor`(坑 #62)
- 同版 **Q1** 是 B-7 的副作用:面板關閉前的「有未寫回內容」判斷比對 `value` 與 `defaultValue`,但 `savePostMtg` 寫回後**沒更新 defaultValue**,再呼叫 `closePostMtgPanel()` 就被判定為未存 → 每次正常存檔都跳「尚未存檔,確定=放棄」,**內容與事實相反**。存檔路徑用 `force` 跳過確認
- **Q3/Q4 是 EV-11 的安全邊界**:這是本系統第一次會「跨病人搬運臨床資料」的功能 —— 對話框原本只有日期與癌別,少打一碼剛好是另一位病人時無從判斷;改成顯示病歷號/遮蔽姓名/性別年齡/診斷前 40 字,本卡已填姓名且不同就不問改提醒;基本資料只填空白的,年齡/ECOG/衰弱量表不複製(死亡病例通常是數年後)
- **Q2 是 EV-6 的同一形狀**(取「最新」而非「本場之前」),第二次出現 —— 任何「找上一筆」的邏輯都要先過濾日期

**#79 `<script>` 區塊內任何地方出現 `</script` 字面值(含註解),HTML parser 就在那裡切斷(V5.49.0)** 🔴
- 我在 B-8 的註解裡寫了「若含 `</script` 會提前關閉…」—— **這句話本身就讓主 script 在 L9295 提前關閉**,整個系統載不起來
- **`node --check` 全過**:打包檢查用 `<script[^>]*>([\s\S]*?)</script>` 抽 script 內容,要 `</script>` 帶 `>` 才匹配,所以註解裡的 `</script 會` 沒被當成結尾;抽出來的 JS 是完整的,語法當然對
- **HTML parser 不管後面接什麼**:看到 `</script` 就結束 script 元素。瀏覽器與 jsdom 都是這樣
- **這是坑 #67 的第四個形狀**(靜態分析驗證程式碼,驗證不了程式碼在瀏覽器裡怎麼被解析):`</script` 不是 JS 語法問題,是 **HTML 語法問題**,而 JS 檢查工具不看 HTML
- `audit-render.js` 當場抓到(`Unexpected end of input` + `S is not defined`),**如果沒有它,這一版會直接壞在個管師手上**
- 已加打包檢查:全檔 `</script` 出現處,後面不是 `>` 的一律 🔴。**註解、字串、樣板字串都算**
- 原則:**在 `<script>` 裡永遠不要寫 `</script` 這五個字連在一起**,要寫就拆成 `'</scr'+'ipt'` 或用「script 結尾標籤」描述

**#78 inline 屬性裡的列序號,刪除後不會被更新(V5.48.1 DEL-1)** 🔴
- `delStruct` 刪一列後只會把 `data-rowid` 往前遞補,**不會更新 inline 字串裡寫死的 `${ei}`**
- 檢查類型的 `<select>` 同時掛委派(讀 `data-rowid`,對)與 inline `onchange`(讀舊 `ei`,錯)→ 刪列後改類型,**寫到下一列**
- 個案討論:刪過檢查列後每次改類型都連帶改掉下一列;必要事件:錯寫到同序號個案的第 n+1 列,而且錯位隨刪除次數改變,更難追查
- 「AI 匯入後刪掉重複的檢查、再修正類型」正是個管師的日常動線
- **這是坑 #76(EV-1)的延伸**:V5.47.1 加了 `type` 參數修了「寫錯卡片」,但**沒改掉寫死的列序號**,「寫錯列」還在
- 根治:`onExamTypeChange` **不再寫資料**(委派的 `updstruct` 已經會寫),只負責自訂欄的插入/移除;所有座標一律從元素當下的 dataset 讀
- **已加打包檢查**:inline `on*` 屬性裡不得含 `${ei}`/`${pi}`/`${ti}`/`${mi}`/`${rowIdx}`,列序號只能放 `data-rowid`。
  第一次跑抓到我自己註解裡的範例字串,改了措辭
- **原則**:任何會被刪除/重排的列,座標**只能存在 `data-*`**;inline 屬性在渲染時就固定了,之後怎麼改 DOM 都不會跟著變

**#77 排序方向改了,下游的 `find()` 沒跟著改 —— 「上一場」變成「最新一場」(V5.48.0 EV-6)** 🔴
- `autoImportPrevFollowups` 用 `idx.find(...)` 找上一場,依賴 `mdt_idx` 的順序
- **V5.31.0 把 `mdt_idx` 改成依日期由新到舊排序**,此後 `find` 拿到的是「日期最新的那一場」,**不是「本場之前的上一場」**
- 個管師預先建好 11 月的會議(排程模式就是為此設計的),再建 10 月時,**前期追蹤帶入的是 11 月那場的內容,9 月的個案與必要事件全部漏掉**
- **影響全部癌別**,不只必要提報 —— 而且從 V5.31.0 到 V5.47.1 共 17 個版本沒人發現,因為「預先建下個月」跟「回頭補上個月」很少同時發生
- 修法:先 `filter` 出**日期早於本場**的,再排序取最近一場。不再依賴 `idx` 的順序
- **教訓**:改一個資料結構的排序方向時,要 grep 所有用 `find()`/`[0]`/`[length-1]` 取「第一個」或「最後一個」的地方 ——
  它們隱含了一個「第一個就是我要的」的假設,排序一變全錯,而且**不報錯**
- 同版 **EV-7**:必要事件的 JSON 匯入跳過個案分支的整套整理(去空白、性別正規化),而 R-6 改了提示詞但**匯入端沒有正規化** —— AI 不照做時沒有防線;
  `_importWarn` **宣告了、寫了、沒人讀**(坑 T-1 的形狀)。抽 `_normalizeImported()` 兩分支共用,匯入完成後彙整警告顯示並刪掉

**#76 inline `on*` 屬性裡的函式參數,data-ty 覆蓋率檢查看不到(V5.47.1 EV-1)** 🔴
- 檢查類型的 `<select>` 同時掛了兩個處理器:委派的 `data-action="updstruct"`(有 `data-ty`,正確)與
  inline 的 `onchange="onExamTypeChange(this,${i},${ei},'${cid}')"`(**沒有 type 參數**,函式內部寫死 `.cases[caseIdx]`)
- 必要事件卡片上改檢查類型 → **改到同序號個案討論的檢查名稱**;選「其他」時動態插入的自訂欄也沒設 `dataset.ty`,委派再退回 cases
- **V5.42.0 起就存在**,四輪審核沒抓到,因為**個案討論卡片自己剛好寫對**
- 這是坑 #68 的**第四個**漏網點,也是最隱蔽的:前三個(`addStruct`/`buildTimelineRows`/主渲染路徑)都是委派元件,
  `data-ty` 覆蓋率檢查抓得到;**這個是 inline 屬性,參數藏在字串裡,檢查看不到**
- **審核給的檢查更根本**:渲染一張資料齊全的必要事件卡片,**逐一操作每個 input/select/textarea,斷言個案討論的 JSON 不變** ——
  委派、inline、動態插入的全部涵蓋,不用再分類找。已加進 `audit-render.js`(29 個元件、0 個污染)
- 同版:**EV-2** 檢視卡片按「編輯」展開的是 `cc-{cid}-cases-{i}`(同序號個案),個管師會直接在別人的卡片上打字;
  **EV-3** 新增必要事件的卡片是收合的,游標落在看不見的欄位,像按了沒反應;**EV-4** 刪除必要事件不確認;
  **EV-5** `autoImportPrevFollowups` 的 `if(!sources.length)return` 讓「上一場只有必要事件」時 events 帶入**永遠執行不到** —— 正是 E-1 要防的漏追
- **個管師說「必要提報那邊問題多」,四個 P1 就是她感受到的四件事**:改到別人、按編輯開錯卡、按新增像沒反應、下一場沒帶入

**#75 提示詞裡的選項清單手寫,跟程式定義對不上(V5.47.0 R-6)** ✅
- V5.44.0 寫必要提報的提示詞時,時序類型**手寫**成 `dx|op|ct|rt|io|tt|prog|resp|other`
- 系統 `TL_TYPES` 實際是 `dx|biopsy|chemo|surgery|rt|imaging|follow|recurrence|metastasis|other` —— **只有三個重疊**
- AI 依提示詞輸出的手術、化療、**疾病進展**,匯入後全部變成「其他」→ 死亡病例時序圖的疾病主軸缺少進展事件,而那正是要看的轉折;編輯畫面的下拉找不到對應選項,顯示成第一個,看起來像被改掉了
- **不會報錯、不會警告**,要等個管師發現「怎麼全部都是其他」才知道
- 修法:清單改由 `TL_TYPES.map(...)` **程式產生**,`_EVENT_PROMPT` 從 const 改成函式(樣板字串在定義時就求值,const 沒辦法引用執行期的 `TL_TYPES`)
- 同版 **R-10** 是同一類的另一面:提示詞把選項給了 AI,**但匯入端沒驗證** —— AI 若輸出「疾病惡化」或英文,會存進資料、下拉顯示空白、DOCX 照原文印。加白名單 `_pick(v,list)`,不在選項的清空並列進 `_importWarn`
- **原則**:提示詞裡任何「從以下選填」的清單,**一律從程式常數產生**;匯入端**一律白名單驗證**。兩邊都做才閉合

**#74 加了參數卻只改了「修的時候看到的呼叫點」,主路徑沒改(V5.46.1 R-1)** 🔴
- V5.46.0 給 `buildTimelineRows` 加 `type` 參數,**只改了兩個重繪呼叫點**(`addStruct`/`delStruct` 之後)——
  **卡片第一次渲染的主路徑 `caseHTML` L4652 沒改**。會議一開啟,必要事件卡片上每一列時序都帶 `data-ty="cases"`
- 這是坑 #68 的第三個漏網點,而且**這次漏的是主路徑**。前兩次(#68 `addStruct`、#73 `buildTimelineRows` 定義)都是修「發現問題的那一支」,**沒有回頭數「這個函式一共被幾個地方呼叫」**
- **寬容預設是它藏了一版的原因**:`type?type:"cases"` 讓漏傳的呼叫點安靜地走 cases —— 改成 `console.error` + 退回,下次漏傳當場現形
- **審核給的檢查比逐點追更根本**:渲染一張資料齊全的必要事件卡片,**斷言所有 `[data-action][data-cid]` 的 `data-ty` 都等於 events** ——
  這一條可以抓出 #64/#67/#68/#73/#74 **這一整類**,不必再一個個呼叫點地找。已加進 `audit-render.js`(48 個元素、0 個錯)
- 同版的 **R-2** 是 A-4 修法的副作用:快照更新放進了有 gen 檢查的 setTimeout,「存檔後 1.2 秒內繼續打字」就讓快照停在進入編輯那一刻 →
  按「放棄編輯」把**已經存檔的內容也倒回去**,連 version 一起倒退,與別台**同號但內容不同**。快照必須在寫入成功的**當下**更新,與收尾動畫無關
- **R-3**:`renderEditor()` 有 18 個呼叫點,它被當「重繪」用卻同時清 `_dirty` —— `markDirty();renderEditor();` 這種寫法讓修改立刻失去保護。
  拆成 `_resetEditState()`,**只在換了一場會議的 6 個入口呼叫**

**#73 同一份資料存兩個地方,遲早會有一個回頭蓋掉另一個(V5.46.0 根治方案甲)** 🔴
- `mdt_sec_{cid}_{date}` 是合併會議 sections 的**第二份副本** —— 而 `mdt_m_{id}` 本來就含完整 sections
- 那第二份有三個致命性質,各自對應一個 P0:
  | 性質 | 後果 |
  |---|---|
  | **不含會議 ID** | 同日同癌別的兩場會議**共用同一把 key**,雙向混入(A-2) |
  | **不隨 NAS 同步** | 另一台同步進來的新版,**一開啟就被本機舊的蓋掉**(A-1) |
  | **會被重繪重讀** | 任何 `renderEditor()` 都把**未存的修改換成磁碟版**(A-3) |
- **個管師實際回報的就是 A-3**:「刪掉病程時序的一列,存檔重開又出現」——
  刪除確實改了記憶體,但 18 處 `renderEditor()` 任何一處觸發,`loadMergedSections()` 就把磁碟版蓋回來
- **這個形狀在 V5.19.1 被「修」過一次**:當時加了日期衝突偵測與舊 key 清理 ——
  **那是在替第二份副本打補丁,而不是問「為什麼要有第二份」**。補丁本身又製造了 B-2
  (複製會議時 `_loadedDate` 殘留 → 首存刪掉原會議的分區)
- 根治:**停止讀、停止寫、一次性遷移、舊 key 留一版當退路**。`loadMergedSections()` 改空實作
  (6 處呼叫端不動,降低風險),`saveMeeting` 的 saveSec 區段整段移除
- 遷移的判準寫死成「**只有 `mdt_m_` 那一段是空的才採用 sec**」—— 其餘一律以 `mdt_m_` 為準,
  因為它才是含會議 ID、會跟 NAS 同步的那一份;不動 version、不動 touchedAt,避免把舊資料推成「比別台新」
- **教訓**:坑 #61 說「同一件事的第二份實作要刪掉」,但當時只想到**程式碼**的重複。
  **資料也會有第二份,而且更危險** —— 程式碼分歧會報錯,資料分歧只會安靜地蓋掉一邊

**#72 「已儲存」是一個時間點的判斷,不是一個布林值(V5.45.0 A-4/B-1)** 🔴
- 存檔收尾的 1.2 秒 `setTimeout` **無條件**把 `_dirty` 清成 `false`
- 但 **V5.38.0 加 Ctrl+S 的目的就是「連續打字中存檔」** —— 「按完立刻繼續打」不是邊緣情況,**是主流操作**
- 那 1.2 秒內打的字:`beforeunload` 不攔、自動存檔跳過(因為 `_dirty=false`)、底部列顯示「✓ 已儲存」
  —— **使用者完全看不出來那段沒存到**;而且 `_collapseAllCases()` 會把**正在輸入的那張卡片收起來**
- 修法:**修改世代號**取代布林值 —— 存檔前記下 `_editGen`,收尾時比對,期間有新修改就整段跳過
- **同一輪的 B-1 是它的孿生**:存檔成功後 `S._snapshot=null`,「放棄編輯」因此**找不到快照可還原**,
  想放棄的修改留在 `S.meeting`,之後任何儲存都會把它寫進去。改成 `S._snapshot=JSON.stringify(S.meeting)`(剛存好的狀態)
- **實作時踩了坑 #54 的完全相同形狀**:`const _genAtSave` 宣告在 `try{}` 內,而收尾 `setTimeout` 在 try 之後 ——
  **`const` 是區塊作用域,讀不到**。而旁邊那行註解正好寫著「`_lok` 提升到 try 外」,**就在同一個函式裡,我還是踩了**
- 教訓:**在有 try/finally + 延遲收尾的函式裡加變數,一律先看 `_lok` 宣告在哪,跟著它放**

**#71 換了資料結構,但「原本讀它的人」不只一個(V5.44.1 修)** 🔴
- V5.42.0 把必要提報事件從 `createTeamItem`(13 欄)改成 `createEvent`(個案全欄 + 死亡資訊)
- **編輯畫面跟上了**(改用 `caseHTML`)、**DOCX 跟上了**(補了死亡欄位)、**檢視卡片跟上了**(`caseViewHTML`)
- **但 HTML 投影片沒有** —— `events` 仍走 `_trackSlide`,那是 **V5.0.0 為「醫療小組」寫的**,只渲染 5 個文字欄位(cc/familyHistory/discussion/summary/decision)
- 結果:個管師在必要提報卡片上填了**過去病史、病理 4 筆、檢查、治療、癌指數、NGS、病程時序**,
  **投影片上一個都看不到** —— 而那些正是死亡病例討論的核心(事件發生到死亡的過程)
- **為什麼沒被前面幾輪抓到**:V5.42.x 那五輪的實測都聚焦在「**輸入寫到哪裡**」(打字、點擊、新增列),
  **沒有人跑一次「填完 → 產投影片 → 看內容有沒有到齊」**
- **這是坑 #60 的第三種形狀**:
  | 坑 | 形狀 |
  |---|---|
  | #60 | 舊入口刪掉後,原本走它的情況去哪了 |
  | #68 | 改了函式,沒改函式**產生的 HTML** |
  | **#71** | **換了資料結構,但讀它的「下游」不只一個** |
- 已加入原則:**改資料結構時,列出所有讀它的地方 —— 編輯畫面、檢視卡片、列印、DOCX、投影片、LINE、JSON 匯出 —— 逐一確認**。這個系統的下游有七條,漏一條就是「填了看不到」
- 修法:在 `_trackSlide` 補上臨床資料區塊(team 沒有那些欄位,對它是 no-op,不受影響)

**#70 用字串處理「自己所在的那份檔案」時,搜尋字串會匹配到自己的原始碼(V5.43.1 修)** 🔴
- V5.43.0 的 `hlExport` 要把標記 JSON 塞進 HTML,用的是:
  ```js
  if(/<script id="hl-data"[^>]*>[\s\S]*?<\/script>/.test(src)){
    src=src.replace(/<script id="hl-data"[^>]*>[\s\S]*?<\/script>/, tag);
  }
  ```
- **但 `hlExport` 自己就住在那份 HTML 的 `<script>` 區塊裡**,而它的原始碼含有字面上的
  `'<script id="hl-data" type="application/json">'` —— regex 從頭找,**第一個匹配到的是自己**
- 結果:**把 `hlExport` 的函式本體換成了資料** → 整段 JS 語法壞掉 → 匯出的檔案什麼都不會動
- **最麻煩的是壞掉的是「匯出後的檔案」**:按匯出的當下一切正常(下載成功、還跳了成功訊息),要等到**打開那份檔案**才發現壞了。個管師的回報是「新匯出的,在我自己的電腦雙擊也看不到」
- **實測證據**(jsdom):
  ```
  → 替換既有分支          ← 明明沒有 hl-data 標籤,卻走了「替換」
  SyntaxError: Invalid or unexpected token
  hl-data 在 DOM: 🔴
  ```
- 兩道防護:
  ① **搜尋字串用拼接組出來**(`'<scr'+'ipt id="hl'+'-data"'`)—— 原始碼裡不存在可被搜到的字面值
  ② **用 `lastIndexOf` 從後面找** —— 佔位標籤在產出時就固定放在 `extraJs` **之後**
- 連**註解裡**的那個字串也要拆掉 —— 註解一樣會進產出物
- **這是坑 #65/#67 的第三種形狀**:前兩個是「產生出來的東西壞了」,這個是「**產生東西的程式把自己改壞了**」。共同點仍是 —— **真正的產物一直到執行期才存在**
- 已加入原則:**任何「讀取/改寫自己所在檔案」的程式,搜尋用的字串都不可以字面出現在自己的原始碼裡**

**#69 修完之後沒有再按一次 —— 同一個動作可能有多個成因(V5.42.5 修,實測複審 F-1)** ✅
- V5.42.4 發現「必要事件按新增之後行為不對」,追到的原因是**新列缺 `data-ty`** —— **那是真的原因之一**,補上之後從程式碼看是完整的
- **但沒有再按一次確認**。實際按下去會看到:**那一列根本沒有出現在這張卡片上**
- 第二個成因:六個結構列容器 id **只有 `${cid}-${i}`,沒有 `_ty`**
  ```
  個案討論 #0 → id="pathlist-head_neck-0"
  必要事件 #0 → id="pathlist-head_neck-0"   ← 完全相同
  ```
  而 `getElementById` 永遠回傳**文件中第一個**,`casesPane` 的排版是個案討論在前 →
  **必要事件的新列一律被插進個案討論的清單裡**
- 個管師會遇到:**按新增畫面沒反應** + **個案討論憑空多一列** —— 而她很可能把那一列刪掉,**刪掉的其實是必要事件的資料**
- **兩個缺陷在同一個動作上、成因相鄰**(都是 `addStruct` 產生 DOM 時漏了 `_ty`),**但一個在屬性上、一個在容器 id 上**
- 諷刺的是:V5.42.0 在卡片 id 上就做對了(`cc-${cid}-${_ty}-${i}`),註解還寫著「否則與個案討論同索引會撞」—— **這七個列容器是漏網的**
- **已寫進流程**:**修完之後,照著使用者的動作再做一次** —— 尤其「同一個動作、多個成因」的缺陷。F-1 只要在補完 `data-ty` 之後按一次「+新增病理」,當場就會看到畫面沒反應
- **已加入檢查:渲染 `casesPane` 後不得有重複 id**(jsdom 五行)。跑 V5.42.4 會輸出七個,正好是 F-1
- 同版順手修 **E-1(雙重 push)**:`addStruct` 對所有欄位無條件先 push `{name,date,content}`,timeline 分支再 push 一筆 `{type,date,label}` → **一次新增產生兩列**,其中一列是欄位名對不上的空殼(渲染不出來、永遠填不了),而且會進 localStorage、進備份、進產出。改成 timeline 跳過通用 push,並加 `cleanTimelineGhosts()` 在 `loadLocal` 時清舊資料(**只在記憶體清不主動寫回** —— 避免「只是開啟看一下」就改動 localStorage,那會讓 NAS 同步的 version 判斷變複雜)
- **兩者都不拋錯、console 全程安靜** —— 一個是「東西加到別的地方去了」,一個是「多加了一筆」

**#68 改了「函式讀寫哪個陣列」,但沒改「函式產生出來的 HTML」(V5.42.4 修,輸入路徑實測 E-1)** ✅
- V5.42.0 給 `addStruct` 加了 `type` 參數,**函式自己讀寫的陣列對了**;但它**動態產生新列的那段 HTML,23 個 `updstruct`/`delstruct` 全部沒有 `data-ty`**
- 結果:必要事件卡片按「+新增病理/檢查/治療」——
  | 步驟 | 結果 |
  |---|---|
  | 新列加到哪 | ✅ `events[i].treatments`(`addStruct` 的 `_ty` 是對的) |
  | 新列的 `data-ty` | ❌ **沒有** → handler 退回 `'cases'` |
  | **在新列打字** | 🔴 **寫進同索引的個案討論** |
  | **按 × 刪掉** | 🔴 **刪的是個案討論的列** |
- **兩行分開看都正確,合起來才是錯的**(坑 #53 的形狀):
  ```js
  const _ty=type?type:"cases";              // ✅ 這行對
  S.meeting.sections[cid][_ty][i]            // ✅ 這行也對
  '<input data-action="updstruct" data-cid="'+cid+'" …'   // ❌ 少了 data-ty
  ```
- **靜態檢查抓不到的原因**:`caseHTML` 內的 28 個 `data-ty` 我檢查過(#64 那條),**但 `addStruct` 產生的是另一批 HTML,不在那個函式裡**。「改渲染函式時順便檢查同一個函式」的做法,漏掉了「**其他也會產生 HTML 的地方**」
- 已加入原則:**任何會動態產生含 `data-action` 的 HTML 的函式,都要一起檢查 `data-ty` 覆蓋率** —— 全檔目前有 `caseHTML`(28)與 `addStruct`(23)兩處
- 順帶修 **C-1**:`openTlAi`/`tlAiPrompt`/`doImportTlAi` 全部寫死 `'cases'`,必要事件按「🤖 AI 判讀」會讀到同索引個案討論的時序、匯入時也寫回那裡;加 `_tlAiTy` 記住開啟時的卡片種類,連**重繪**都要分流(原本只重繪個案討論,在必要事件套用後畫面看不到新時序,但資料其實已經寫進去了)
- **實跑驗證**(jsdom):`cases` 新列 `data-ty="cases"` → 寫進 cases、不碰 events;`events` 新列 `data-ty="events"` → 寫進 events、**不碰 cases** ✅

**#67 靜態分析驗證「程式碼寫了什麼」,驗證不了「程式碼產生了什麼」(V5.42.3 修,執行期實測 D-1)** ✅
- 全檔有 **28 個 `data-ty="${_ty}"`,27 個正確、1 個錯誤** —— 而**它們在原始碼裡長得一模一樣**
- 差別只在第 28 個所在的那一段是**單引號字串串接**,不是反引號樣板字串:
  ```js
  return'<span data-action="caseflag" data-ty="${_ty}" data-cid="'+cid+'" …'
  //                                  ↑ 單引號字串裡,${_ty} **不會被插值**
  ```
- `dataset.ty` 拿到的是**字面上的 `"${_ty}"`**,而它是**非空字串所以 truthy** → 處理器的 `||'cases'` **完全失效** → `sections[cid]["${_ty}"]` → `undefined[idx]` → **TypeError**
- 後果:`FLAG_LIST` 五個旗標從 V5.42.0 起**全部點不動**,**兩種卡片都中**;下游連帶失效(「首次討論」統計、投影片的討論原因標籤、產出中的旗標區塊)
- **六項靜態檢查全過、人工 review 也看不出來**:
  | 檢查 | 為什麼沒抓到 |
  |---|---|
  | `node --check` | 合法字串 |
  | jshint `undef` | 沒有未定義識別字 |
  | `data-action` 覆蓋率 | `caseflag` 有處理器 |
  | 事件屬性裸插值(#65 加的) | `data-ty` **不是事件屬性**,不在掃描範圍 |
  | 人工 review | **看起來跟其他 27 個一樣** |
- **這是 #65(A-1 缺引號)的同一類**:**產生出來的東西壞了,而產生它的程式碼是合法的**。這個系統的本質是「用 JS 字串產生 HTML 再交給瀏覽器執行」,**真正的產物一直到執行期才存在**
- **已加入 `audit-render.js`(jsdom 實跑,約 5 秒)**,三項斷言:
  1. **載入零錯誤**(刻意把 `indexedDB` 設 undefined、`fetch` 一律 reject,模擬「IndexedDB 不可用 + 完全斷網」)
  2. **渲染後掃描未插值殘留** —— 七個渲染函式產生 DOM 後檢查有沒有屬性值含 `${`
  3. **打字往返** —— dispatch `input` 事件 → 斷言 `S.meeting` 有寫入 → `saveLocal`/`loadLocal` → 斷言還在
- **第 3 項是 #65 那一類缺陷的唯一可靠防線**:十行斷言,涵蓋十三輪裡最嚴重的那個 bug
- 防線本身也改了:`||'cases'` 換成**白名單** —— 前者只擋得住「空值」,擋不住「非空但不存在的鍵」

**#66 「保護」的邊界要用「使用者看得到什麼、點得到什麼」來畫(V5.42.2 修,複審 B-1)** ✅
- `_noImg` 這個旗標,**我在實作時理解成「不要畫影像清單」,但它該是「不要出現影像功能」**
- 結果:四個影像區塊的 `build*ImgArea` 擋住了,**但標題列與「開新分頁/夾在投影片」開關還在**
  ```js
  <div class="fg full"><div class="field-hdr"><label>病理染色影像</label>${embedToggle(...)}</div>
    ${_noImg?"":buildPathImgArea(cid,i,d)}    ← 只有這一行被擋
  </div>
  ```
- 兩個後果:
  1. **畫面殘骸** —— 必要事件卡片出現四個空的影像區塊,個管師看到標題卻沒有選圖按鈕,**會以為壞掉**
  2. **安靜寫錯位置** —— 那個開關的處理器寫死 `'cases'`,按下去會改到**同索引個案討論**的 `embed` 旗標;影響不大但**無聲**,下次產投影片發現某個個案的影像行為變了,查不出原因
- **與第十次審核的 Z-1 是同一個形狀**(`#out-area` 被搬進摺疊區):
  > **保護/搬移的邊界,要用「使用者會看到什麼、點得到什麼」來判定,不是用「程式碼長得像一組」來判定。**
- 做法採雙層(與 A-3 的 `updMammo` 一致):
  ① 四個區塊**整段**納入 `_noImg`(消掉畫面殘骸)
  ② `embedToggle` 加 `type` 參數 + `data-ty`,處理器改 `dataset.ty||'cases'`(即使日後有人拿掉 `_noImg` 也不會寫錯)
- `timeline` 那個 `embedToggle` **刻意不擋** —— 病程時序正是必要事件要用的
- **檢查寫錯兩次的教訓**:第一次漏算長註解占滿了前 420 字元、第二次檢查字串少了冒號(`_noImg?""` vs `_noImg?"":`)。**檢查本身也會錯,而「檢查說有問題」與「真的有問題」要分開確認** —— 兩次都是先看實際程式碼才確定是誤報

**#65 機械替換會連同引號一起換掉,而「字串裡的引號」沒有任何靜態檢查看得到(V5.42.1 修,上線前審核 A-1)** 🔴 最嚴重
- V5.42.0 把 `caseHTML` 參數化時,做的是 `'cases'` → `${_ty}` —— **連同外面那對引號一起換掉了**:
  ```js
  upd('${cid}','cases',${i},…)      // 改前
  upd('${cid}',${_ty},${i},…)       // 改後 ← 引號不見了
  ```
- 產生的屬性是 `upd('head_neck',cases,0,'chartNo',this.value)` —— **`cases` 是裸識別字**,inline handler 的作用域鏈查不到 → **必然 ReferenceError**
- **後果是十二輪來最嚴重的一個**:
  | 動作 | 畫面 | 實際 |
  |---|---|---|
  | 在欄位打字 | **文字正常出現**(`<input>` 自己的行為) | `upd()` 從未執行 |
  | 按儲存 | **顯示「已儲存」** | **存下去的是空的個案** |
  | 重新整理 | **剛才打的全部不見** | — |
  **畫面沒有任何異常、儲存回報成功、資料全部遺失。** 每張卡片 17 個互動元件失效
- **六項打包檢查全過**(`node --check`、jshint `undef`、data-action 覆蓋率、頂層重複定義、靜態/動態事件屬性函式解析)—— 因為那是**合法的模板字串**,而 jshint **看不到字串內容**;事件屬性檢查看的是「函式名存不存在」,**沒有人檢查引數是字串還是變數**
- **不是理解錯誤,是取代操作漏了引號** —— 同一版新寫的必要事件區塊(`'${_ty}'`)引號是對的
- **已加入打包檢查(第七項,輸出必須為空)**:
  ```js
  // 事件屬性內的裸插值:函式引數位置出現 ${...} 且前後是逗號或括號
  const attr=/on(?:click|input|change|blur|keydown|focus)="([^"]{0,300}?)"/g;
  const arg=/[(,]\s*(\$\{[^}]+\})\s*[,)]/g;
  // 排除數值索引 ${i}/${idx}/${si}/${j}… 本來就該是數字
  ```
  跑 V5.42.0 的輸出正是那 12 處,**零誤報**
- **這個形狀十二輪裡出現第四次**(V5.32.0 `o`、V5.32.1 `_row`/`renderCases`/`delDr`、V5.35.0 `_ownerChartNo`),每一次都藏在**字串裡**。差別是:**前三次會報錯或靜默失效,這一次會讓使用者以為存好了**
- 教訓:**批次替換字串時,要把「被替換的東西在語法上扮演什麼角色」一起看** —— `'cases'` 不只是一段文字,它是一個**字串字面值**,引號是它的一部分

**#64 把 A 的元件借給 B 用,要先數清楚 A 裡面有多少東西寫死了自己(V5.42.0)** ✅
- 必要提報事件改用個案討論的卡片。第一次估「15 處 `'cases'` + 2 個 handler」,實際盤出來是:
  | 位置 | 數量 |
  |---|---|
  | `caseHTML` 內寫死 `'cases'` | 15 |
  | `sections[cid].cases[...]` 屬性存取 | **15**(我的字串檢查抓不到) |
  | handler 需要傳 type | **12** |
  | DOM id 會撞(`cc-${cid}-cases-${i}`) | 2 |
- **漏改的後果最麻煩**:不報錯、不當機,只是**在必要事件卡片上打的字寫進同索引的個案討論**,等產投影片才發現內容不見(坑 #55 的形狀)
- 做法:
  1. `caseHTML(cid,i,d,type,opts)`,內部 15 處改 `${_ty}`
  2. **替換順序很重要** —— 先換內容再加簽章,否則我自己寫的 `type||'cases'` 也會被替換掉(第一次就踩到)
  3. 每個 `data-action` 補 `data-ty`,handler 一律 `dataset.ty||'cases'`
  4. **DOM id 帶 `_ty`** —— 否則同癌別的「個案 #0」與「必要事件 #0」id 相同
- **打包檢查新增一條**:`caseHTML` 內不得殘留寫死的 `'cases'`
- **範圍評估錯了一次,而且是對的決定**:盤到影像流程還有 8 處寫死 `.cases[`,而那是前十輪修過最多次的地方(歸屬驗證花了五個版本)。**在第一次真實實測之前不碰它** —— 改成 `opts.noImages`,必要事件先不開放影像;要改的從 27 處降到 7 處
- 教訓:**借用元件前先數,不要先估。** 字串檢查(`'cases'`)與屬性檢查(`.cases[`)要分開數 —— 我第一次只數了前者,少算一半

**#63 搬動區塊時,區塊裡的東西有沒有服務區塊外的人?(V5.37.1 修,第十次審核 Z-1)** ✅
- V5.36.1 的 U-3 把一批低頻按鈕搬進 `<details>` 摺疊區,**但跟著搬進去的還有服務「區外按鈕」的輸出元素**:`#out-area` / `#out-text` / `#copy-ok` 服務的是常用區的「LINE 通知」(`doOutput`),`#lib-status` 服務的是常用區的「Word 簡報」
- `<details>` 未展開時內部內容不會渲染 → `display='block'` 設了也看不到、`scrollIntoView` 也不會捲動 → **按「LINE 通知」完全沒反應**,而那是每場會議都要用的三顆之一
- **為什麼人眼 review 抓不到**:HTML 的「視覺分組」與「功能歸屬」不一定一致 —— `#out-area` 在原始碼裡確實排在匯入匯出按鈕後面,**但它服務的是上面的「LINE 通知」**。靠讀 HTML 縮排看不出來,**要靠追 `getElementById` 的呼叫端**
- 這是第九次審核那一類(合併/搬移的覆蓋不全)的第三種形狀。**三問已集滿**:
  1. 舊入口被刪掉之後,原本會走到它的**每一種情況**現在走哪裡?(#60)
  2. 換掉一個工具之後,舊工具**自帶的行為**有沒有人接手?(#60)
  3. **搬動一個區塊時,區塊裡的東西有沒有服務區塊外的人?**(本項)
- **已加入打包檢查**:抓出摺疊區內的所有 id,再回頭掃「區外按鈕的 onclick 函式」有沒有 `getElementById` 到它們。本輪修完後輸出為空
- 附帶:`#ai-result-area` 服務的是**區內**的「AI 生成摘要」,留在區內才是對的 —— 判準是「誰觸發它」,不是「它長在哪」

**#62 程式上完全正確、九輪審核都沒抓到,但每天讓人多按幾十次(V5.36.1 UI-1)** ✅
- `saveMeeting` 收尾的那個 1.2 秒 `setTimeout`:存完後強制 `S.viewMode=true` 並 `renderEditor()`。**當初寫進去是善意的**(存完給使用者看一眼結果),程式上完全正確,**九輪審核從來沒把它當缺陷**
- 但個管師整理一場 8 個個案的會議,實際動線是:
  ```
  編輯 → 填個案1 → 儲存 → (畫面自己跳檢視) → 編輯 → 填個案2 → 儲存 → …
  ```
  **每場多按 8–15 次「編輯」,而且每次 renderEditor 都讓捲動位置歸零、展開的卡片收合、剛才在看的那張要重新找。** 三位個管師、每週八組會議
- 根本的認知錯誤:**把存檔當成「結束動作」,但它是「中途動作」** —— 尤其會議記錄這種要來回補的工作
- **這類問題靜態檢查抓不到、jshint 抓不到、壓力測試也抓不到** —— 只有真的跟著個管師做一遍完整流程才會浮現
- 審核建議的驗收方式值得固化:**用步數量,不用感覺**
  > 腳本:整理一場有 6 個個案、每個帶 2 張病理影像的會議,直到產出 HTML 投影片。
  > 記錄三個數字:總點擊次數、「編輯」按了幾次、找按鈕的停頓次數。
  > **每次較大改版後找一位個管師實際走一次,旁邊記步數 —— 三十分鐘,比任何審核報告都準。**
- 另一條判準:**UI 減法最容易犯的錯是把「少用」當成「該刪」** —— 一年用兩次的 JSON 批次匯入,用到的那兩次通常是在救火;收進摺疊區是對的,刪掉不是

**#61 同一件事有兩份實作 —— 九輪缺陷的最大宗(V5.36.0 減法 A-1)** ✅
- 內部審核的減法建議統計了九輪累積的缺陷分布:
  | 缺陷類型 | 次數 | 根因 |
  |---|---|---|
  | **同一件事有兩份實作,其中一份漏改** | **8 次以上** | 重複 |
  | 引用了不存在的名字(冷路徑) | 8 次 | 規模 |
  | 舊路徑被關掉、使用者無處可去 | 2 次 | 合併覆蓋不全 |
- **第一類佔最大宗,而它只有一種根治方式:把其中一份刪掉。** 靜默 fallback 三處、`X&&X()` 兩處、`get()` 副作用、`_imgPreview._owner`、`_handleFolderErr` 漏一處 —— 每一個都是「同一套邏輯散在多處,改了 A 忘了 B」
- **Y-2 是最新也最清楚的一例**:`_auditOneImg`(67 行)與 `verifyImgOwnership`(60 行)是**同一套四段驗證的兩份實作**,兩邊對「無 `subFolder`」的分級不一致(一個 risk、一個 warn)→ 修正按鈕被擋掉。**如果只有一份實作,Y-2 不可能發生**
- 做法:`_auditOneImg` 退化成 `verifyImgOwnership` 的**薄包裝** —— 驗證只有一份,稽核只負責「加上診斷資訊」(失敗時去看根目錄有沒有同名檔,把抽象風險講成具體事實);`level` 由 `code` 決定,不另行判斷
- **判準**:減法的對象是「**同一件事的第二份實作**」與「**沒人走的路徑**」,**不是「看起來複雜的防護」** —— 前九輪的缺陷有一半是防護不足造成的,砍防護會直接倒退。審核明確列出不該砍的:`peekImgs` 與 `get()` 並存(語意不同)、`escA` 的六個 replace、匯入的兩階段回滾、`verifyImgOwnership` 的四段、`showPersistentError`
- 另一個判準:**行數不是重點** —— A-1 的價值在於把「兩份會分歧的實作」變成一份;A-2 的價值在於把一個 24 行的功能換成 1 行

**#60 合併與重構時,舊路徑的使用者去哪了?(V5.35.1 修,第九次審核 Y-1/Y-2)** ✅
- V5.34.0 的三項流程合併方向都對,但**兩個 P1 都是同一種形狀:合併時把原本存在的路徑關掉了,而新路徑沒有完全覆蓋舊路徑的使用情境**
- **Y-2(較嚴重)**:把「🔍 檢查」與「🔗 重新綁定」合併時,刪掉了工具列的獨立 rebind 按鈕,新入口的條件寫成 `warn>0` —— 但 `_auditOneImg` 把「**無 `subFolder`**」硬編成 `risk`(**連「現在已經有病歷號資料夾了」都判斷出來了,卻還是回 risk**),而那正是 V5.32.0 嚴格模式上線前的**所有存量影像、最大宗的一批**,且 `rebindMeetingImages` 修得好這一類。結果:報表說「建議重選」,能一鍵修好的按鈕被條件擋住,獨立入口又已拿掉 → 個管師只能一張張回卡片重選,**正是 R-7 當初要消除的工**
- **Y-1**:把 2.2 秒的 toast 換成 `showStickyToast`,但 `close()` 只放在成功路徑 —— `showSaveToast` **自帶自動關閉**所以放哪裡都沒事,`showStickyToast` 沒有,**舊工具自帶的行為沒有人接手**。上傳失敗時 alert 說「上傳失敗」,右下角同時留著「正在產生並上傳,請稍候…」永不消失;**W-5 的初衷正是「不要讓使用者以為還在跑」,放錯位置反而製造了永久的「還在跑」假象**
- Y-3/Y-4 是同一類的輕量版:`readForm` 換了契約但 12 個呼叫端沒跟上;`saveOneSec` 換了實作但 `tab-save-msg` 沒人接手、而且帶進「把使用者踢出編輯模式」這個沒被評估的副作用
- **已加入章法的兩問(補前面幾輪沒涵蓋的一塊)**:
  1. **舊入口被刪掉之後,原本會走到它的「每一種情況」,現在走哪裡?**
  2. **換掉一個工具之後,舊工具「自帶的行為」(自動關閉、自動重繪、自動還原按鈕)有沒有人接手?**
- 前面幾輪談的是「這行寫對了嗎」(#57)、「這條線接上了嗎」(#56)、「這個動作會關掉什麼警報」(#58);**這一輪是「舊路徑被關掉之後,它的使用者去哪了」**
- 另一個具體教訓:**不要從 `level` 反推「有沒有得修」** —— 應該直接問負責修的那支函式(已加 `dryRun` 分支)

**#59 訊息干擾不只看「該不該講」,更要看「時機」與「呈現」(V5.33.0 修,第八次審核訊息專題)** ✅
- 第八次審核專門盤點「是否有持續干擾使用者的不必要訊息」,結論是**訊息分類已經乾淨**(alert 79 處幾乎全是守門或錯誤、confirm 34 處都對應真實決策),**剩下的干擾不在分類,而在時機與呈現**
- **W-1(P1,唯一實際擋住操作的)**:`getNetworkTime()` 兩個外部來源**串行**、各 5 秒 timeout → 院內防火牆擋掉時最壞卡 **10 秒**;而 `saveMeeting` 一進來就禁用所有儲存按鈕 → **每 2 分鐘的自動存檔會把按鈕鎖住十秒,期間個管師按不了儲存**。審核的評語很準:「**這比任何一個彈窗都更干擾——彈窗至少按一下就走,這個是每兩分鐘定期卡十秒,而且不是使用者發起的**」。修法:30 分鐘快取 + 並行 + 2 秒上限(最壞 10 秒→2 秒,且 30 分鐘只發生一次);另外 **silent 存檔不動按鈕** —— 把使用者的按鈕鎖住與 silent 的語意剛好相反
- **W-2**:每個 toast 都新建在 `bottom:20px;right:20px` → **完全疊在一起**。登入時 NAS 同步會連發兩個(一般訊息 + 失敗警告),第二個直接蓋住第一個;**這次剛好是警告蓋住一般訊息(幸運),但那是順序巧合不是設計**。改容器堆疊 + 相同訊息去重
- **W-3**:還原備份最多連按四個對話框,而**容量檢查排在最後** —— 使用者按了三次、下載了還原前備份,才被告知空間可能不夠。**還原備份是在出事的時候做的事**(資料弄丟、換機器),最不該增加認知負擔。合併成「說明+容量」一個對話框,正常路徑 4→2
- **W-4**:NAS 訊息用 `innerHTML+=` 累加,「備份中...」從不移除 → 畫面同時出現「NAS 備份中... ✓ NAS 完成」,失敗時「NAS 備份中... NAS 失敗」。改獨立 span 取代
- **W-5**:長時作業(上傳分享、打包 zip)用 2.2 秒的 toast,但作業動輒十幾秒 → **中間十幾秒完全沒有回饋,使用者以為當掉會重複按**。加 `showStickyToast()`,`finally` 關閉
- **W-6**:兩處相同意義的授權提示用不同措辭 → 統一
- **W-7**:`IDX_MAX` 警告未節流,與 N-3 修好的容量警告是同一個模式 → 套用現成的常駐橫幅 + 30 分鐘節流
- **訊息分類的完整判準(已寫進章法)**:
  | 類型 | 用什麼 | 判準 |
  |---|---|---|
  | 需要使用者做決定 | `confirm` | 按「取消」會導致不同結果 |
  | 錯誤/需接著行動 | `alert` | 不處理就做不下去 |
  | 告知結果 | toast(2.2 秒) | 使用者不做任何事也沒關係 |
  | **週期性/非使用者發起** | **常駐橫幅 + 節流** | **不可用 alert —— 會重複打斷** |
  | **超過 3 秒的作業** | **持久 toast,完成才關** | **中途不可留白,否則使用者會以為當掉** |

**#58 「讓紅燈變綠燈」的工具,最省事的做法永遠是拆掉燈泡(V5.32.4 修,第七次審核 U-1)** ✅
- V5.32.3 的「🔗 重新綁定影像」工具,程式註解寫著**「只改 subFolder / size 兩個欄位,不動任何影像檔案」** —— 這句話**字面上完全正確**
- 問題出在:**「改 size」這個動作本身的語意沒有被審視**。`size` 不是描述性欄位,**它是一個安全斷言**(「這張圖的內容是我當初選的那一張」),改寫它等於**撤銷斷言**
- 實際發生的事:一張「檔案內容已被換掉」的影像(指紋不符),`verifyImgOwnership` 回 `file:null`+risk,工具把它當成「需要重新綁定」→ 重新定位時**不傳 size**(跳過指紋檢查)→ 用新檔案大小覆蓋 `img.size` → **警告就此消失**
- 更糟的是使用者看不出來:因為資料夾其實沒問題,重新定位會找回**同一個資料夾**,預覽清單顯示「0000001 測○試」→「0000001 測○試」(**從到相同**),使用者覺得莫名其妙但多半就按確認了
- 指紋比對是嚴格模式四段驗證裡**唯一能發現「檔案還在、但內容是別人的」的機制** —— 前三段都只驗路徑,驗不出內容
- 做法:`code==='FINGERPRINT'` 一律列入 `fail` 交人工確認,**絕不自動處理**;並給 `verifyImgOwnership` 補上機器可判讀的 `code`(`FINGERPRINT`/`PATIENT_DIR_GONE`/`FILE_GONE`/`RELOCATED`/`NO_OWNER`),**不靠中文訊息正則** —— 訊息文字日後一改,正則會悄悄失效
- **教訓(審核的原話,值得逐字記住)**:
  > 這類問題不會被任何工具抓到,也不會被「這行寫對了嗎」的檢查抓到。要抓它只能問一個問題:**我這個動作會關掉什麼警報?**
  >
  > 日後再寫任何「批次修正」「一鍵整理」「自動清理」類型的工具都適用 —— 這類工具的共同風險就是:**它們的存在目的是讓紅燈變綠燈,而最省事的讓紅燈變綠燈的方法,永遠是把燈泡拆掉。**

**#57 錯名字藏在冷路徑,人眼四輪掃不到、jshint 十秒抓到(V5.32.2 修,第五次審核)** ✅
- 第五次審核實際跑了 `jshint --config '{"undef":true,...}'`,**十秒、6 個名字**,抓到:
  - 人工前一輪找到但未修的 2 個(`o`、`_imgFailNotes`)
  - **人工連續四輪都沒找到的 3 個既有缺陷**(`_row`、`renderCases`、`delDr`)
- **S-1 `_row`**:`genHTMLSlides` 裡 `(c.genomics||[]).length?_row('基因檢測',...)` —— 同 scope 的函式叫 **`mkRow`**,`_row` 全檔只出現這一次。**觸發條件是個案有填 NGS 資料**(肺癌/乳癌/大腸癌 MDT 的常態),而按鈕的 catch 只 `console.error` → **個管師按「HTML 投影片」什麼都沒發生,再按還是沒反應**,沒人會想到是因為某個個案填了基因檢測
- **S-2 `renderCases`**:`renderCases&&renderCases()` —— **`X&&X()` 對未宣告識別字無效**:求值 `&&` 左側時就已拋 `ReferenceError`,短路根本輪不到。存在性檢查必須用 `typeof X==='function'`。後果:資料夾其實換成功了(賦值在拋錯之前),訊息卻說「無法選取資料夾:renderCases is not defined」
- **S-3 `delDr`**:設定頁醫師的四顆按鈕,▲▼編輯都有函式,**只有「刪除」從來沒實作過**(全檔找不到 `DRS.splice`)。38 位醫師一直只能新增不能刪除
- **R-1(P0,我漏修)**:`caseViewHTML(cid,i,d)` 裡卻用 `(o&&o.chartNo)` —— 成因是 V5.32.0 我加 `data-chartno` 時用了**不限次數的 replace**,同樣的按鈕樣板在唯讀檢視也被改到,而那裡的參數叫 `d`
- **流程教訓(審核的重點)**:第四次審核列了七項修復清單,V5.32.1 只對到兩項,**而唯一的 P0 不在其中**。審核說這不是疏忽程度問題,是**缺少一道把「已知待修項目」與「本版實際改動」對起來的檢查**。已固化:**發版前逐列標註 ✅已修 / ⏭本版不修(附原因),不允許留白**
- 已加入打包檢查:**jshint `undef` 掃描,輸出必須為空**。本輪它當場抓到我新寫的 `delDr` 裡兩個不存在的函式名(`renderDrs`、`renderSettings`,正確是 `renderDrsTab`)

**#56 傳值靠「物件上的暫存標記」或「函式屬性當全域」,而不是顯式參數(V5.32.1 修,審核 K-1/K-2)** ✅
- **K-1**:V5.32.0 產出端讀 `img._ownerChartNo` 來做歸屬驗證,但**那個標記從來沒被寫入** —— 原本規劃的 `_tagOwner()` 插入失敗,而**我的驗證只檢查「函式定義字串存在」,沒檢查它有沒有被呼叫**。結果 `chartNo` 永遠 `undefined` → 凡是「`subFolder` 為空」(舊資料從根目錄選的)或「資料夾改過名」的影像**一律 risk、不載入** —— V5.32.0 等於把「用病歷號救回來」這條路完全關掉,只剩「資料夾名一字不差」才過
- **K-2**:`_imgPreview._owner` 用**函式屬性當全域狀態**傳病歷號,但只有四個個案影像 handler 會設定,**特殊議程的預覽不會** → 吃到上一次點過的病人殘值。**驗證結果取決於「上一次點了誰」,沒有穩定重現路徑,是最難追的一類 bug**
- 兩者共同形狀:**用「隱性通道」傳值** —— 一個掛在資料物件上、一個掛在函式物件上。隱性通道的問題是:**漏設時不會報錯,只會安靜地拿到 undefined 或殘值**
- 做法:兩處都改成**顯式參數**(`_loadImgsToCache(imgs,chartNo)`、`_imgPreview(img,label,chartNo)`)。顯式參數漏傳時,至少在呼叫點看得見
- **已加入打包檢查:死碼偵測**(定義了但從未被呼叫的函式)。這個檢查當場抓到另外兩個真死碼 `_cleanImportDates`、`_caseImportIssues` —— 都是 V5.23.0 我寫了函式、但實作改用別的名字,**與 K-1 完全同一種失誤**
- 教訓:**「函式已定義」不等於「函式有被呼叫」** —— 字串存在性檢查對這類問題完全無效,必須檢查呼叫關係

**#55 只在冷路徑執行的程式碼,等於沒被執行過(V5.31.3 修,第三次審核 M-1/M-2)** ✅
- **M-1**:V5.31.2 的稽核工具對 mammo 傳了 `c.mammo` 而非 `c`。但 `IMG_KINDS.*.get(o)` 一律收**個案物件**、自己往下鑽 —— 所以 `get(c.mammo)` 會去找 `c.mammo.mammo`,結果:①**乳攝永遠回 0 張(等於完全沒檢查)**;②在病歷資料裡**長出假的 `c.mammo.mammo` 物件**。**一個宣稱「只診斷、不改資料」的工具在寫髒資料**;而且 `S.meeting` 是活物件,下一次任何儲存都會把它寫進 localStorage → 進備份 → 進 NAS → 進所有機器
- **M-2**:`crPickImages` 裡用了 `c.chartNo`,但該函式的變數叫 `p`,**全域也沒有 `c`** → `ReferenceError`。**觸發條件正好是最該保護的那條路**(找不到病人子資料夾時才求值),而錯誤被外層 catch 接住後顯示「**無法存取資料夾:c is not defined**」—— 中文前綴把人導向「資料夾壞了」,個管師會去重新授權、重選資料夾、甚至重開電腦,**全部沒用**。這是誤診成本極高的一類錯誤訊息。此為 V5.29.0 我加提示時造成的
- **共同形狀**:兩個都是**只在冷路徑才會執行**的程式碼。M-2 要「找不到子資料夾」才求值(開發時資料夾都建好了,永遠跑不到);M-1 要有乳攝資料才跑得到,而且**錯得很安靜**(回空陣列,沒有例外)
- **關鍵**:這兩個都**不會被語法檢查、不會被 data-action 稽核、不會被 `new Function()` 冒煙測試抓到** —— 目前的打包前檢查全是**結構性**檢查,對「邏輯在冷路徑上是錯的」完全無能為力
- 已固化的做法:**每個新增或修改的函式,至少讓它的「失敗分支」跑過一次**。本輪做法:用 node 模擬「有乳攝的個案」與「沒有乳攝的個案」兩種輸入,當場證實舊版回 0 張且污染資料
- 附帶教訓:**有寫入副作用的 getter 不能用在只讀路徑**。已加 `peekImgs()` 純讀版本,並在 `IMG_KINDS` 上方註明 `get()` 的副作用

**#54 修復本身正確,但沒檢查「要保護的狀態,別處會不會又被推翻」(V5.31.1 修,複審 N-1/N-2/N-5)** ✅
- **N-1(最嚴重)**:V5.31.0 為了 P0-4 在儲存失敗時設 `_dirty=true`,但**1.2 秒後的收尾 `setTimeout` 又設回 `false`**,還清掉 `S._snapshot`、切換成檢視模式 —— **失敗後畫面反而長得像「儲存成功」**。新增的保護只活了 1.2 秒,P0-4 等於沒修,**而且比原版更有誤導性**(原版角落至少還有紅字「儲存失敗」)
- **N-2**:V5.31.0 的匯入「回滾」只是 `removeItem`,但備份裡的會議**有很大比例是本機已存在的同一批**(同 id),`setItem` 是覆蓋、`removeItem` 是徹底刪除 → **原值再也回不來**;訊息卻寫「全部回復原狀」= **謊報(坑 #33 重演,而且在資料救援路徑上)**。真回滾必須先快照舊值(`_prev`),失敗時兩階段復原:先全清騰空間,再把舊值放回去
- **N-5**:P0-1 把索引排序改成會議日期(為了讓截斷擠掉最舊的),**但沒檢查誰還在吃這個順序** —— `renderSbRecent()` 直接取前 4 筆,語意從「最近儲存的 4 場」變成「日期最新的 4 場」,個管師預建下個月的會議會永久佔住側欄。加 `touchedAt` 讓兩種順序分開
- **共同形狀**:修復本身寫對了,但**沒追問「我要保護的那個狀態,全檔還有誰會動它?」**
- 做法固化成檢查習慣:**每次改動涉及共享狀態變數,就 grep 一次它的所有寫入點**。以 `_dirty` 為例全檔只有 8 處,逐一看過就會發現 L5875 的問題
- 教訓:**修 bug 修出比原版更有誤導性的行為,是最需要警覺的一類回歸。** 判準不是「我這行寫對了嗎」,而是「這個狀態在時間軸上會不會被別人改掉」

**#53 兩行各自合理的程式碼,合起來是資料毀滅器(V5.31.0 修,內部審核 P0-1)** ✅
- 症狀:**儲存第 101 場會議時,永久刪除第 101 名之後的真實會議** —— 完全無聲,無 confirm、無 toast、無 console 警告
- 程式碼:
  ```js
  const newIdx=idx.slice(0,100);          // ① 索引硬截斷
  const validIds=new Set(newIdx.map(x=>x.id));
  Object.keys(localStorage).forEach(k=>{  // ② 不在索引的本體直接刪除
    if(k.startsWith('mdt_m_')&&!validIds.has(k.slice(6)))localStorage.removeItem(k);
  });
  ```
- **兩行分開看都沒問題**:①「索引只留最近 100 筆」合理;②「清掉不在索引的孤兒」合理(而且註解寫著 `Clean orphan mdt_m_ keys`,看起來是在做好事)。**合起來才是資料毀滅器**
- 更糟的是排序用 `idx.unshift`(**依儲存時間**不是會議日期)—— 編輯一場舊會議會把它推到第 1 名,**被擠出第 100 名的可能是上週剛開的會**
- 觸發時機:8 個癌別每週開會 → **約 3 個月**。而且「會在系統上線半年、大家都已經信任它之後才發作」
- 做法:①上限提到具名常數 `IDX_MAX=2000`;②排序改用**會議日期**;③超過上限明確 alert **絕不靜默丟棄**;④**移除自動孤兒清理**,改成設定頁的 `cleanOrphanKeys()`(先列出要刪什麼再確認);⑤`saveLocal._lastError` 保留錯誤型別供呼叫端判斷
- node 壓力測試 105 場:新版索引 105 筆、本體 105 個、第 1 場仍在;**舊版已永久刪除 5 場**
- 教訓:**「每行都合理」不等於「合起來合理」** —— 審查刪除類程式碼時,要把「決定刪什麼」與「執行刪除」兩段**合起來讀**,問一句「在什麼情況下這會刪到不該刪的?」。單元測試抓不到這類問題(測試資料不到 100 筆),code review 也容易放過(因為每行都對)

**#52 插入註解時把 `async` 與 `function` 拆開 → 整個 script 掛掉(V5.30.3 修)** ✅
- 症狀:**登入畫面的三位個管師完全消失**,系統無法使用
- 根因:V5.30.2 在 `async function restoreRootHandle(){` 前面插入一段註解,結果變成:
  ```
  async /* 註解… */
  function _isStaleHandleErr(e){     ← 新加的函式吃掉了那個 async
  ...
  function restoreRootHandle(){      ← 失去 async,但內部有 await
  ```
- **為什麼語法檢查抓不到**:`async /*註解*/ function` 在語法上**完全合法**(只是把 `_isStaleHandleErr` 變成 async);真正的錯誤是 `restoreRootHandle` 失去 async 卻含 await —— 這在**第一次修正時被抓到了**,我補回 async 就過了。**但第二次修正時我在註解裡用了反引號**,而那段程式在模板字串環境內,反引號提前結束模板 → 又一次語法錯誤
- 兩次都是**同一個根源:在既有程式碼前插入註解時,沒檢查插入點是否切斷了語法單元**
- 教訓:
  1. **插入註解前先看清楚插入點前面是什麼** —— `async`、`export`、`return` 這類修飾詞後面不能插註解再接別的東西
  2. **在模板字串環境裡寫註解不可用反引號**(這是坑 #48 的變體)
  3. **語法檢查通過 ≠ 行為正確** —— `async` 跑到別的函式上是語法合法的邏輯錯誤;應補「執行測試」(用 `new Function(main)` 實際解析整段主 script)
- 已加入打包驗證:`async /*` 樣式偵測 + 主 script 執行測試

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

# ════ V5.42.1 加:事件屬性內的裸插值(坑 #65,輸出必須為空)════
# 為什麼需要它:upd('${cid}',${_ty},…) 產生的是 upd('head_neck',cases,…)
#   —— cases 是**裸識別字**,inline handler 的作用域鏈查不到 → ReferenceError。
# 但那是**合法的模板字串**,前六項檢查(node --check / jshint undef /
#   data-action 覆蓋率 / 頂層重複 / 靜態與動態事件屬性函式解析)**全部看不到**,
#   而後果是「打字正常、儲存回報成功、重新整理全沒」。
_bad=[]
for _m in re.finditer(r'on(?:click|input|change|blur|keydown|focus)="([^"]{0,300}?)"', h):
    for _a in re.finditer(r'[(,]\s*(\$\{[^}]+\})\s*[,)]', _m.group(1)):
        # 排除數值索引(${i}/${idx}/${si}/${j}… 本來就該當數字用)
        if re.match(r'^\$\{\s*(i|idx|si|pi|ci|ti|fi|j|n|rowIdx|\d+)\s*\}$', _a.group(1)):continue
        _bad.append((h[:_m.start()].count('\n')+1, _a.group(1)))
print("事件屬性裸插值:", "✓ 0" if not _bad else f"⚠️ {len(_bad)} 處 {_bad[:5]}")

# ════ V5.42.1 加:caseHTML 內不得殘留寫死的 'cases'(坑 #64)════
# caseHTML 由「個案討論」與「必要提報事件」共用,任何一處殘留都會**安靜地寫錯區塊**。
_i=h.index("function caseHTML(cid,i,d,type,opts){")
_d=0;_st=False;_inb=False
for _j in range(_i,len(h)):
    _c=h[_j]
    if _c=='`':_inb=not _inb
    if _c=='{' and not _inb:_d+=1;_st=True
    elif _c=='}' and not _inb:
        _d-=1
        if _st and _d==0:_b=h[_i:_j+1];break
print("caseHTML 殘留 'cases':", "✓ 0" if _b.count("'cases'")==0 else f"⚠️ {_b.count(chr(39)+'cases'+chr(39))} 處")

# ════ V5.49.0 加:script 內不得有 </script 字面值(坑 #79)════
# node --check 抓不到:它用 regex 抽 script,要 </script> 帶 > 才算結尾;HTML parser 不管後面接什麼。
_bad=[m.start() for m in re.finditer(r'</script', h) if h[m.start():m.start()+9]!='</script>']
print("script 內 </script 字面值:", "✓ 0" if not _bad else f"⚠️ {len(_bad)} 處 L{[h[:b].count(chr(10))+1 for b in _bad]}")

# ════ V5.55.0 加:主程式不得含控制字元(坑 #84)════
# JS 字串裡的 \b 被寫成 0x08,語法合法但 regex 永遠不匹配。node --check 與 jshint 都抓不到。
# 排除壓縮函式庫行(以 !function( 開頭或 >5000 字元),裡面的控制字元是合法字串內容。**不要用行號**,刪一行就漂
import subprocess
_r=subprocess.run(['grep','-n','-P',r'[\x00-\x08\x0B\x0C\x0E-\x1F]','index.html'],capture_output=True,text=True)
_bad=[l for l in _r.stdout.splitlines() if not (re.match(r'^\d+:!function\(',l) or len(l)>5000)]  # V5.62.0:改用內容特徵排除函式庫,行號會漂移
print("主程式控制字元:", "✓ 0" if not _bad else f"⚠️ {len(_bad)} 行 {[l.split(':')[0] for l in _bad]}")
```

版本號命名 V**x.y.z**(嚴格進位,**第二/三碼最大就是 9**):

| 類型 | 規則 | 範例 |
|------|------|------|
| Bug fix | `z+1`,**z 超過 9 → y+1, z=0** | V4.3.5 → V4.3.6;V4.3.9 → V4.4.0 |
| 新功能 | `y+1, z=0`,**y 超過 9 → x+1, y=0, z=0** | V4.3.5 → V4.4.0;V4.9.5 → V5.0.0 |
| 大改版 | `x+1, y=0, z=0` | V4.3.5 → V5.0.0 |

**坑 #14 教訓**:之前長期容許 V4.3.45 這種第三碼超過 9 的寫法,版本號失去語意。從 V4.4.0 開始嚴格進位。看到第三碼 ≥ 10 就是規則錯。

---

