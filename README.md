# MoonMax Book

給台灣創作者的加密貨幣收款對帳本。海外買家用 MoonPay Commerce 付 USDC → 錢直接進你的錢包 → 轉到 MAX 換成台幣 → MoonMax Book 把每筆收款換算成收到當天的台幣、依網站分開列，年底交給會計師。

Bookkeeping for Taiwanese creators paid in crypto: payments through MoonPay Commerce, cash-outs through the MAX exchange, every receipt valued in TWD on the day it arrived.

**線上版：** https://moonmax-book.vercel.app （只有擁有者的 Google 帳號能登入）

## 主要功能

| | |
|---|---|
| **不需要 API 金鑰** | 收款直接從公開的區塊鏈讀收款錢包（Solana USDC／USDT）；MoonPay 的 webhook 只用來標出每筆屬於哪個 Pay Link。不存任何人的 MoonPay Secret Key 或 MAX 帳密。 |
| **多網站分開列** | 一個網站／商品一個 Pay Link，收款紀錄依來源分頁，各自有筆數、手續費、實收、台幣小計。 |
| **開始使用 5 步** | 加入 Pay Link → 確認收款錢包 → 設定 webhook → MAX 入金地址 → 匯入 MAX CSV。每一步寫清楚去 MoonPay／MAX 哪裡找。 |
| **MAX 出金對帳** | 上傳 MAX 的資金紀錄 CSV，每筆入金用交易編號回鏈上核對：從收款錢包轉進去的 USDC 用先進先出對到 MoonPay 收入，列出收到時與入金當天的台幣和匯率差；自己另外轉進去的（SOL、別的錢包、比收入多的部分）標成「額外轉入」。 |
| **台幣價值** | 買家付的金額 × 收到當天的 USD/TWD；手續費另列。 |
| **Google 登入** | 部署版只用 Google 登入；第一個登入的帳號成為擁有者。沒設 Google 金鑰時整站關閉。 |
| **中英切換** | 介面、說明文件、伺服器訊息都有中文與英文。 |
| **說明文件** | 誰適合用（含 Frame → Lottie 實例與抽成比較）、MoonPay 設定、出金教學。 |

## 結構

```
SPEC.md               產品與技術規格（§4 收款資料來源、§9 待決事項）
FRONTEND_FIRST.md     前端先行的分層與合約
ledger/               收款、估值、對帳、報表、資料模型的細部規格
dashboard/            MoonMax Book 本體（Vite + React 19 + TypeScript + Tailwind 4）
  server/             API：本機跑在 Vite dev server，部署時打包成 Vercel Function
  api/index.js        由 npm run build:api 產生的 Vercel Function（要一起 commit）
  src/                前端
dashboard-with-demo-2026-10-13/   拿掉示範帳本之前的完整副本（含假資料與 /demo/）
```

## 本機開發

```bash
cd dashboard
npm install
npm run dev          # http://localhost:5173 ，本機不用登入，資料存在 platform.config.json 和 data/
```

## 部署（Vercel）

```bash
cd dashboard
npm run build        # 型別檢查 + 網站 + api/index.js
npx vercel deploy --prod
```

需要的環境變數（都設成 Sensitive）：`MOONMAX_SESSION_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，以及連接私人 Blob store 後自動產生的 `BLOB_READ_WRITE_TOKEN`。

> 為什麼 `api/index.js` 要先打包：TypeScript 7 已經沒有 Vercel 編譯 `.ts` Function 用的 JS API，所以先用 `vite.api.config.ts` 打包成純 JavaScript。

## 這不是稅務或法律建議

MoonMax Book 只整理紀錄。怎麼申報，請和處理過加密貨幣案件的會計師或記帳士確認。

更新紀錄見 [CHANGELOG.md](CHANGELOG.md)。
