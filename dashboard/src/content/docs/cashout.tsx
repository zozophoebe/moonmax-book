import { Note, Step } from './parts'

export function CashoutZh() {
  return (
    <>
      <p>
        收到的 USDC 要變成能花的台幣，路徑是：<strong>你的收款錢包 → MAX 的 Solana USDC 入金地址 → 在 MAX 賣成台幣 → 提領到你本人的銀行帳戶</strong>
        。整段都是你自己操作，MoonMax Book 不會碰你的錢，也拿不到你 MAX 帳號的權限。
      </p>
      <Note tone="warn" title="最重要的一條規則：網路要對">
        <p>錢在 Solana 上，就只能轉到 MAX 的 Solana 入金地址。轉錯網路，資產幾乎一定救不回來。</p>
      </Note>

      <Step n={1} title="開 MAX 帳戶，完成兩級驗證">
        <ul>
          <li>
            <strong>Lv.1 身分驗證</strong>：年滿 18 歲，台灣身分證、居留證或護照擇一。
          </li>
          <li>
            <strong>Lv.2 銀行驗證</strong>：綁定<strong>你本人名下</strong>的台灣銀行帳戶，不能用家人或別人的戶頭。
          </li>
        </ul>
        <p>審核通常 3–5 個工作天，通過後才能新台幣出入金。個人用不需要公司行號。</p>
      </Step>

      <Step n={2} title="找到 MAX 的 USDC 入金地址（選 Solana）">
        <p>
          在 MAX 錢包找 USDC 的入金功能，<strong>網路選 Solana</strong>，複製地址。同一個幣在不同網路會有不同地址，別拿錯。
        </p>
        <p>把這個地址貼到 MoonMax Book「開始使用」的第 4 步。之後從收款錢包轉到這個地址的錢，收款紀錄會標成「轉到 MAX」。</p>
      </Step>

      <Step n={3} title="把 USDC 從收款錢包轉到 MAX">
        <ul>
          <li>
            <strong>收款錢包是 MoonPay 的內嵌錢包</strong>：在 MoonPay Commerce 後台找到錢包餘額，用轉出功能（按鈕名稱以後台為準），貼上 MAX 的 Solana 地址。
          </li>
          <li>
            <strong>收款錢包是你自己的錢包（例如 Phantom）</strong>：在錢包 App 裡選 USDC → 傳送，貼上 MAX 的 Solana 地址。
          </li>
          <li>
            <strong>第一次先轉一小筆測試</strong>，例如 1–2 USDC，確認 MAX 有入帳再轉剩下的。轉出前核對地址開頭和結尾幾個字。
          </li>
        </ul>
        <Note title="不建議直接把 MAX 地址設成收款錢包">
          <p>那樣買家的錢會從很多不同錢包直接進交易所，中間少了一層你能掌控的緩衝，出問題也比較難查。</p>
        </Note>
      </Step>

      <Step n={4} title="在 MAX 賣成新台幣">
        <p>USDC 入帳後，在 USDC/TWD 交易對賣出。手續費掛單 0.08%、吃單 0.16%（第三方整理，以 MAX 公告為準）。</p>
      </Step>

      <Step n={5} title="提領新台幣到你的銀行帳戶">
        <p>
          到錢包選 TWD 提領，輸入金額與雙重驗證碼。款項通常 0–1 個工作天入帳。個人戶<strong>單筆上限新台幣 100 萬</strong>，24 小時另有累積上限。
        </p>
      </Step>

      <Step n={6} title="把 MAX 紀錄匯入 MoonMax Book">
        <p>從 MAX 匯出交易紀錄 CSV，匯入 MoonMax Book（這個功能還在做）。每筆出金會用先進先出法對到你的收入，算出這次出金賺或賠多少。</p>
      </Step>

      <h2>千萬不要這樣做</h2>
      <table>
        <thead>
          <tr>
            <th>做法</th>
            <th>為什麼不要</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>選錯網路轉帳</td>
            <td>資產通常救不回來。</td>
          </tr>
          <tr>
            <td>透過幣安、OKX 出金再匯回台灣</td>
            <td>它們不在台灣洗錢防制登記名單上，P2P 或跨境匯款進台灣帳戶，容易被銀行要求說明資金來源，甚至凍結帳戶。</td>
          </tr>
          <tr>
            <td>把金額拆成小於 50 萬分次提領</td>
            <td>50 萬是銀行申報門檻，不是免稅額。刻意壓在門檻下，反而是可疑交易指標。</td>
          </tr>
          <tr>
            <td>用別人的銀行帳戶收</td>
            <td>MAX 只能提領到你本人名下的帳戶，借帳戶也有法律風險。</td>
          </tr>
          <tr>
            <td>以為加密貨幣收入不用報</td>
            <td>收到當下的台幣價值是收入，出金時的價差可能是另一筆所得。</td>
          </tr>
        </tbody>
      </table>
      <Note tone="warn" title="這不是稅務或法律建議">
        <p>出金之後怎麼申報，請和處理過加密貨幣案件的會計師或記帳士確認。把 MoonMax Book 匯出的紀錄交給他們會快很多。</p>
      </Note>
    </>
  )
}

export function CashoutEn() {
  return (
    <>
      <p>
        Turning the USDC you receive into TWD you can spend goes: <strong>your receiving wallet → your MAX Solana USDC deposit address → sell for TWD on MAX → withdraw to your own bank account</strong>. You
        do every step yourself; MoonMax Book never touches your money and has no access to your MAX account.
      </p>
      <Note tone="warn" title="The one rule that matters most: the right network">
        <p>Money on Solana can only go to MAX’s Solana deposit address. Send it on the wrong network and it’s almost certainly gone.</p>
      </Note>

      <Step n={1} title="Open a MAX account and pass both verification levels">
        <ul>
          <li>
            <strong>Lv.1 identity</strong>: 18 or older, with a Taiwan ID card, residence permit or passport.
          </li>
          <li>
            <strong>Lv.2 bank</strong>: link a Taiwanese bank account <strong>in your own name</strong> — not a family member’s or anyone else’s.
          </li>
        </ul>
        <p>Review usually takes 3–5 working days; TWD deposits and withdrawals open after that. Personal use needs no company.</p>
      </Step>

      <Step n={2} title="Find your MAX USDC deposit address (pick Solana)">
        <p>
          In your MAX wallet, open USDC deposit, <strong>choose the Solana network</strong> and copy the address. The same coin has a different address on each network — don’t mix them up.
        </p>
        <p>Paste it into step 4 of MoonMax Book’s Get started. Transfers from your receiving wallet to this address then show as “To MAX” in Receipts.</p>
      </Step>

      <Step n={3} title="Send the USDC from your receiving wallet to MAX">
        <ul>
          <li>
            <strong>If it’s MoonPay’s embedded wallet</strong>: find the balance in the MoonPay Commerce dashboard, use its send/withdraw option (the button name may differ) and paste the MAX Solana address.
          </li>
          <li>
            <strong>If it’s your own wallet (e.g. Phantom)</strong>: in the wallet app, choose USDC → Send and paste the MAX Solana address.
          </li>
          <li>
            <strong>Send a small test first</strong>, say 1–2 USDC, and check it arrives on MAX before sending the rest. Check the first and last few characters of the address before sending.
          </li>
        </ul>
        <Note title="Don’t make the MAX address your receiving wallet">
          <p>Buyers’ money would then go straight into the exchange from many different wallets, with no buffer you control in between — and problems get much harder to trace.</p>
        </Note>
      </Step>

      <Step n={4} title="Sell for TWD on MAX">
        <p>Once the USDC arrives, sell on the USDC/TWD market. Fees are 0.08% maker, 0.16% taker (third-party summary; MAX’s announcements win).</p>
      </Step>

      <Step n={5} title="Withdraw TWD to your bank account">
        <p>
          In your wallet, withdraw TWD with the amount and your two-factor code. It usually arrives within 0–1 working days. Personal accounts have a <strong>NT$1,000,000 per-withdrawal limit</strong> and a
          separate 24-hour cap.
        </p>
      </Step>

      <Step n={6} title="Bring your MAX records into MoonMax Book">
        <p>Export your transaction CSV from MAX and import it into MoonMax Book (still being built). Each cash-out is matched to your income first-in-first-out to work out its gain or loss.</p>
      </Step>

      <h2>Never do this</h2>
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Why not</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sending on the wrong network</td>
            <td>The funds usually can’t be recovered.</td>
          </tr>
          <tr>
            <td>Cashing out via Binance or OKX and wiring home</td>
            <td>They aren’t on Taiwan’s anti-money-laundering register; P2P or cross-border transfers into Taiwanese accounts often trigger questions about the source of funds, or a frozen account.</td>
          </tr>
          <tr>
            <td>Splitting withdrawals under NT$500,000</td>
            <td>NT$500,000 is a bank reporting threshold, not a tax-free allowance. Deliberately staying under it is itself a red flag.</td>
          </tr>
          <tr>
            <td>Using someone else’s bank account</td>
            <td>MAX only withdraws to an account in your name, and borrowing one carries legal risk.</td>
          </tr>
          <tr>
            <td>Assuming crypto income needn’t be reported</td>
            <td>Its TWD value when received is income, and the difference when you cash out may be further income.</td>
          </tr>
        </tbody>
      </table>
      <Note tone="warn" title="This isn’t tax or legal advice">
        <p>Check how to report your cash-outs with an accountant who has handled crypto cases. Handing them MoonMax Book’s export makes that much faster.</p>
      </Note>
    </>
  )
}
