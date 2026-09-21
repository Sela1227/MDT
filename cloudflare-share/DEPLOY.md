# share.selaginella.io Worker 部署(V5.62.0)

不用 Node.js,全部在 Cloudflare Dashboard 做。約 5 分鐘。

## 第一步:換程式碼
Workers 和 Pages → **share** → 右上「編輯代碼」→ 全選刪掉 → 貼上 `index.js` 全文 → **部署**

## 第二步:設上傳金鑰
**share** → 設定 → 變數和機密 → 新增
- 類型:**機密**(Secret)
- 名稱:`UPLOAD_KEY`
- 值:一串至少 30 字的亂碼(例如用密碼產生器)
→ **部署**

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

## ⚠️ 尚未處理:分享網址不需登入
任何人拿到 `share.selaginella.io/xxx.html` 就能開,檔名格式 `日期_癌別_MDT.html` 很好猜,
內容含病歷號。建議加 **Cloudflare Access**(Zero Trust → Access → 應用程式 → 自架 →
網域填 `share.selaginella.io` → 政策:允許特定信箱)。免費方案 50 人內。
