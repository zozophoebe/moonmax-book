# 更新紀錄

這個 repo 從 2026-10-13 開始用 git。之前的開發沒有版本紀錄，下面「之前」的幾段是依開發過程整理的里程碑；之後每個大功能各自一個 commit。

## 2026-10-13

- **分頁小圖示換成新 logo**：加上 PNG 版（Safari 不吃 SVG 圖示）和 apple-touch-icon，網址加 `?v=2` 讓瀏覽器丟掉舊快取。
- **新 logo**：像素月亮——白色滿月的右半溶解成棋盤格。
- **中英切換**：所有畫面、說明文件、伺服器錯誤訊息都有中文與英文，選擇會記住。
- **說明文件重寫**：「誰適合用」改成大圖卡片＋icon、抽成比較（US$19 的外掛在 MoonPay／Patreon／Gumroad 各拿到多少）、用 Frame → Lottie 當實例的 7 步流程；每篇自動產生目錄。
- **拿掉串接檢查頁**。
- **只用 Google 登入**：部署版只能用擁有者的 Google 帳號登入，第一個登入的帳號綁成擁有者；沒設 Google 金鑰時整站關閉。
- **部署到 Vercel**：同一份 API 在本機跑在 Vite、部署時是 Vercel Function；資料存在私人 Vercel Blob。
- **拿掉示範帳本**：nav、`/demo/`、假資料全部移除；完整副本保留在 `dashboard-with-demo-2026-10-13/`。
- **收款來源判斷修正**：只有一個 Pay Link 時的「推測」也要金額對得上售價，避免把別的 Pay Link 的收款算錯。
- **讀取 USDT**：Solana 上的 USDC 和 USDT 都讀；收到 USDT 會標「MAX 可能不收」。

## 之前：2026-10-12

- **不拿 API 金鑰（B＋C）**：收款從公開的區塊鏈讀收款錢包，MoonPay webhook 只用來標出 Pay Link；webhook 驗證 Bearer＋HMAC，買家個資收到就丟。
- **多網站收款紀錄**：一個網站一個 Pay Link，收款紀錄依來源分頁、各自小計，台幣價值依收到當天匯率。
- **改名 MoonMax Book**、第一版 logo；開始使用改成從空狀態一步一步串接；示範帳本分到 `/demo/`。

## 之前：2026-10-11

- 白灰色 shadcn 風格＋黃色主色重新設計；偵測真實的 MoonPay 付款連結；說明文件三篇。

## 之前：2026-10-08

- 產品規格（`SPEC.md`、`ledger/`、`FRONTEND_FIRST.md`）；前端先行的對帳本畫面，後端先用假資料。
