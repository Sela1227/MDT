# share.selaginella.io Worker 部署(V5.68.0)

> **⚠️ 順序很重要(審核 N-6)**:先加機密 `SESSION_SECRET`,再貼新程式碼。
> 反過來的話,貼完程式碼到設完機密之間,所有醫師都打不開投影片。
> 另外:新程式一上線,簽章金鑰改變,**所有醫師現有的登入狀態立即失效**,要重新輸入密碼 —— 請事先告知。
> 改 Worker 前先跑 `node cloudflare-share/test.mjs`(23 條)。

## 第零步:先加機密(部署舊程式,無害)
**share** → 設定 → 變數和機密 → 新增 → 類型**機密** → 名稱 `SESSION_SECRET` → 值:32 字以上亂碼 → 部署

> V5.64.0 更新:**檢視密碼**。重貼 `index.js` 部署後,再加一個機密 `VIEW_PWD`。

不用 Node.js,全部在 Cloudflare Dashboard 做。約 5 分鐘。

## 第一步:換程式碼
Workers 和 Pages → **share** → 右上「編輯代碼」→ 全選刪掉 → 貼上 `index.js` 全文 → **部署**

## 第二步:設上傳金鑰
**share** → 設定 → 變數和機密 → 新增
- 類型:**機密**(Secret)
- 名稱:`UPLOAD_KEY`
- 值:一串至少 30 字的亂碼(例如用密碼產生器)
→ **部署**

## 第二步之二:設檢視密碼(V5.64.0)
**share** → 設定 → 變數和機密 → 新增
- 類型:**機密**
- 名稱:`VIEW_PWD`
- 值:用密碼產生器產生 **12 字以上**(不要用可猜的字)
→ **部署**

設了之後,清單頁與每一份投影片都要輸入密碼才能開;**瀏覽器關掉就要重新輸入**。
**不設就不擋**(跟以前一樣)。換密碼 → 所有已開啟的瀏覽器立刻要重新輸入。

## 第二步之三:確認 SESSION_SECRET 已在(第零步做過)
沒設的話登入頁只顯示「分享空間維護中」,原因在 Worker 的 console.error。

## 第二步之四:保存天數(選填)
變數 `RETAIN_DAYS`(類型選**文字**,不是機密),預設 90;填 0 = 永不過期。

## 第二步之五:Rate limiting(建議)
Dashboard → Security → WAF → Rate limiting rules → 新增:`URI Path equals /auth` 且 `Method equals POST`,每 IP 每分鐘 5 次,超過封鎖 10 分鐘。

## 第三步:確認 KV 綁定還在
**share** → 設定 → 綁定 → 應該有一個 KV 命名空間,變數名稱 **HTML**。
(原本就有,不用動;只是確認沒被清掉)

## 第四步:覆蓋本機副本
把這份 `index.js` 覆蓋到電腦上的 `cloudflare-share\src\index.js`,
不然哪天用 wrangler 重新部署會蓋回舊版。

## 第五步:個管師填金鑰
MDT 系統 → 設定 → 系統 → 投影片分享 → 填同一把金鑰 → 儲存。三台電腦各填一次。

## 驗證
1. 個管師產出一份 HTML 投影片 → 按「HTML 分享」→ 應該跳出網址
2. 開 `https://share.selaginella.io/?k=cbshow` → 清單裡有那份
3. Git Pusher 的「管理 Cloudflare」清單也看得到(metadata 同格式)

## 如果金鑰外流
Dashboard 改 `UPLOAD_KEY` 的值 → 部署 → 三台重填。舊的立刻失效。
CF API Token 不再出現在任何網頁裡,不需要換。

## 檢視密碼 vs Cloudflare Access
| | 共用密碼(VIEW_PWD) | Cloudflare Access |
|---|---|---|
| 登入方式 | 一組密碼大家共用 | 各自信箱收驗證碼 |
| 知道誰看過 | ❌ | ✅ 有 log |
| 密碼外流 | 換 VIEW_PWD 重發 | 移除那個信箱 |

共用密碼適合「會議室電腦 + LINE 傳連結」。要更嚴謹再設 Access(Zero Trust → Access → 應用程式 → 自架 → 網域 `share.selaginella.io` → 政策:允許特定信箱)。兩者可並存。
