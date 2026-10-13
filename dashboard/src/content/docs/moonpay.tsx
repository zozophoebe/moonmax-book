import { internal, Note, Step } from './parts'

const EMBED_ZH = `<script type="module" src="https://embed.hel.io/assets/index-v1.js"></script>
<div id="checkout"></div>
<script type="module">
  window.helioCheckout(document.getElementById('checkout'), {
    paylinkId: '你的PayLinkID',
    display: 'inline',
    onSuccess: () => { location.href = '/thanks' },
  })
</script>`

const EMBED_EN = EMBED_ZH.replace('你的PayLinkID', 'YOUR_PAYLINK_ID')

export function MoonpayZh() {
  return (
    <>
      <p>
        MoonPay Commerce（以前叫 Helio）負責「收款」這一段：幫你產生付款連結或結帳視窗，買家付的錢直接進你的錢包。這篇照順序走一遍，大約 20 分鐘可以設好，驗證審核另計。
      </p>
      <Note title="你會需要">
        <ul className="list-disc pl-5">
          <li>一個 Email</li>
          <li>身分證件（做身分驗證）</li>
          <li>要賣的東西，和放購買按鈕的網站</li>
        </ul>
      </Note>

      <h2>MoonPay 是怎麼排的</h2>
      <p>先看懂這幾層，後面每一步在設定什麼就清楚了：</p>
      <table>
        <thead>
          <tr>
            <th>層級</th>
            <th>是什麼</th>
            <th>MoonMax Book 怎麼用它</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>商家帳號</td>
            <td>你登入的那個帳號。一個帳號底下可以有很多 Pay Link。</td>
            <td>讀公開的帳號名稱和驗證狀態。</td>
          </tr>
          <tr>
            <td>收款錢包</td>
            <td>每條鏈各設一個（例如 Solana、Base）。買家的錢直接進這裡，MoonPay 不保管。</td>
            <td>
              直接從公開的區塊鏈讀這個錢包收了哪些錢。<strong>不需要 API 金鑰。</strong>
            </td>
          </tr>
          <tr>
            <td>Pay Link</td>
            <td>一個商品或網站一個。各自有名稱、價格，並指定錢要進哪個錢包。後台放在 Payments 裡。</td>
            <td>你貼上它的網址，MoonMax Book 就知道它賣多少、錢會進哪個錢包。</td>
          </tr>
          <tr>
            <td>交易</td>
            <td>每筆付款都記得是哪個 Pay Link 付的。後台 Transactions 可以看、可以匯出 CSV。</td>
            <td>區塊鏈上看得到金額，但看不到是哪個 Pay Link，所以要靠下面的通知。</td>
          </tr>
          <tr>
            <td>Webhook（通知）</td>
            <td>每收一筆，MoonPay 就主動通知你指定的網址。後台叫 Endpoint，選 All Pay Links 就涵蓋所有 Pay Link。</td>
            <td>從通知裡知道這筆屬於哪個 Pay Link，收款紀錄就能依網站分開。</td>
          </tr>
        </tbody>
      </table>
      <Note title="有好幾個網站在收錢？每個網站各建一個 Pay Link">
        <p>好幾個網站共用同一個 Pay Link，MoonPay 自己也分不出錢是從哪個網站來的。各建一個，帳本才能分開列；它們可以進同一個錢包。</p>
      </Note>

      <Step n={1} title="註冊並登入">
        <p>
          到{' '}
          <a href="https://moonpay.hel.io" target="_blank" rel="noreferrer">
            moonpay.hel.io
          </a>{' '}
          用 Email 登入。<strong>建議用 Email 而不是連錢包</strong>：用 Email 註冊會自動建立一個內嵌錢包，不用裝瀏覽器擴充、不用保管助記詞。
        </p>
        <p>
          登入後到 <strong>Settings</strong> 補完個人資料，這裡也能管理錢包和邀請隊友。
        </p>
      </Step>

      <Step n={2} title="完成身分驗證">
        <p>照後台指示完成個人身分驗證（KYC）。如果後台也要求商家驗證（KYB），依指示補件；能不能用個人身分完成、沒完成會限制哪些功能，以後台說明為準。</p>
      </Step>

      <Step n={3} title="建立付款連結（Pay Link）">
        <p>
          在後台左邊的 <strong>Payments</strong> 按 <strong>Create Payment</strong>，依序設定：
        </p>
        <table>
          <thead>
            <tr>
              <th>設定</th>
              <th>建議</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>名稱、價格</td>
              <td>
                <strong>價格一定要跟網站上的標價一樣</strong>，用 USDC 計價（1 USDC 約等於 1 美元）。選 USDT 計價只是換個價格單位，買家實際付什麼幣看下一列。
              </td>
            </tr>
            <tr>
              <td>收款幣（Allows customers to pay with）</td>
              <td>
                Solana 錢包<strong>只留 USDC</strong>。MAX 公告的 Solana 鏈入金只有 USDC，沒有 USDT；如果勾了 USDT、買家又剛好付 USDT，你收到的錢很可能沒辦法直接轉進 MAX。
              </td>
            </tr>
            <tr>
              <td>收款錢包</td>
              <td>預設是你的主錢包（內嵌錢包）。要改到自己的錢包（例如 Phantom），到 Settings → Wallets 新增 Payout Wallet。不管哪一個，MoonMax Book 都是從區塊鏈直接讀。</td>
            </tr>
            <tr>
              <td>Token Swap</td>
              <td>建議開。買家可以用其他幣（USDT、SOL…）付款，MoonPay 換成 USDC 再給你（另收 0.25%）。</td>
            </tr>
            <tr>
              <td>要求 Email</td>
              <td>賣數位商品一定要開，不然你寄不出檔案。</td>
            </tr>
            <tr>
              <td>卡片付款</td>
              <td>想讓沒有錢包的買家也能付，可以研究這個選項（要先 connect MoonPay）；條件與費率以後台為準。</td>
            </tr>
            <tr>
              <td>成功導向網址</td>
              <td>
                填你的感謝頁，例如 <code>https://你的網站/thanks</code>。
              </td>
            </tr>
          </tbody>
        </table>
      </Step>

      <Step n={4} title="放到網站上">
        <p>兩種做法，擇一：</p>
        <p>
          <strong>A. 直接連結</strong>：購買按鈕連到 <code>https://moonpay.hel.io/pay/你的PayLinkID</code>，買家會跳到 MoonPay 的付款頁。
        </p>
        <p>
          <strong>B. 嵌入結帳視窗</strong>：買家留在你的網站付款。載入 MoonPay 的腳本後呼叫 <code>helioCheckout</code>：
        </p>
        <pre>{EMBED_ZH}</pre>
        <p>建議兩個都做：用 B，載入失敗時退回 A 的連結。</p>
        <p>
          最後把 Pay Link 的網址貼到 MoonMax Book <a href={internal('#/')}>開始使用</a>的第 1 步，取個你認得的名字。有好幾個網站，就每個各貼一次。
        </p>
      </Step>

      <Step n={5} title="上線前檢查">
        <ul>
          <li>網站標價和 Pay Link 價格一致。</li>
          <li>自己用小額實際付一次，確認感謝頁、Email、MoonPay 後台的交易紀錄都正常。</li>
          <li>
            打開 MoonMax Book 的<a href={internal('#/receipts')}>收款紀錄</a>，確認那筆測試付款有出現。
          </li>
        </ul>
        <Note tone="warn" title="常見錯誤：測試價格忘記改回來">
          <p>開發時常把 Pay Link 改成 1、2 USDC 方便測試。上線前一定要改回正式價格，不然買家看到 US$19、實際只付 2 USDC。</p>
        </Note>
      </Step>

      <Step n={6} title="設定通知（webhook），讓帳本分得出是哪個網站">
        <p>
          到後台左邊的 <strong>Developer</strong>，停在 <strong>Endpoints</strong> 分頁，按 <strong>Add Endpoint</strong>：
        </p>
        <table>
          <thead>
            <tr>
              <th>欄位</th>
              <th>填什麼</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name</td>
              <td>隨便取，例如 MoonMax Book。</td>
            </tr>
            <tr>
              <td>Secret</td>
              <td>
                已經幫你產生好。按右邊的複製鈕，<strong>先貼到 MoonMax Book「開始使用」第 3 步存起來</strong>，畫面上的 ***** 是遮住的部分，要用複製鈕才拿得到完整的。
              </td>
            </tr>
            <tr>
              <td>Endpoint URL</td>
              <td>MoonMax Book「開始使用」第 3 步顯示的 Webhook 網址。</td>
            </tr>
            <tr>
              <td>Webhook</td>
              <td>選 Pay Link。</td>
            </tr>
            <tr>
              <td>Pay Link</td>
              <td>選 All Pay Links，之後新增的 Pay Link 也會涵蓋。</td>
            </tr>
          </tbody>
        </table>
        <p>
          建好之後，<strong>Events</strong> 分頁會列出每則通知有沒有送成功。（MoonPay 官方文件寫的是 Developers → Webhooks、sharedToken，跟現在的後台畫面用詞不同，指的是同一件事。）
        </p>
        <Note title="不需要 API 金鑰">
          <p>
            MoonMax Book 不跟你要 MoonPay 的 API 金鑰。收款金額直接從公開的區塊鏈讀，「是哪個 Pay Link」靠通知分辨。這個 Secret 只能驗證通知，不能動你的帳戶或錢；通知裡的買家 Email、姓名、地址，MoonMax
            Book 收到就丟掉。
          </p>
        </Note>
        <p>只有一個 Pay Link 的話可以先跳過：錢包只有它在用，帳本會直接推測是它。設定通知之前收的款，只能用錢包和金額推測；可以從後台 Transactions 匯出 CSV 補對（匯入功能還在做）。</p>
      </Step>

      <h2>收到錢之後</h2>
      <p>
        所有交易會出現在後台的 <strong>Transactions</strong> 分頁，可以退款，也能匯出 CSV；MoonMax Book 的<a href={internal('#/receipts')}>收款紀錄</a>會依 Pay Link 分開列。錢會留在你的收款錢包裡，要換成台幣請看
        <a href={internal('#/docs/cashout')}>出金教學</a>。
      </p>
    </>
  )
}

export function MoonpayEn() {
  return (
    <>
      <p>
        MoonPay Commerce (formerly Helio) handles the “getting paid” part: it gives you a payment link or checkout widget, and the buyer’s money goes straight to your wallet. This guide walks through it in
        order — about 20 minutes, plus however long verification takes.
      </p>
      <Note title="You’ll need">
        <ul className="list-disc pl-5">
          <li>An email address</li>
          <li>An ID document (for identity verification)</li>
          <li>Something to sell, and a site for the Buy button</li>
        </ul>
      </Note>

      <h2>How MoonPay is organised</h2>
      <p>Know these layers and every step below makes sense:</p>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>What it is</th>
            <th>How MoonMax Book uses it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Merchant account</td>
            <td>The account you sign in to. It can hold many Pay Links.</td>
            <td>Reads the public account name and verification status.</td>
          </tr>
          <tr>
            <td>Receiving wallets</td>
            <td>One per chain (e.g. Solana, Base). Buyers’ money lands here directly; MoonPay never holds it.</td>
            <td>
              Reads what this wallet received straight from the public blockchain. <strong>No API keys.</strong>
            </td>
          </tr>
          <tr>
            <td>Pay Link</td>
            <td>One per product or site, with a name, a price and the wallet it pays into. Lives under Payments in the dashboard.</td>
            <td>Paste its address and MoonMax Book knows its price and which wallet it pays into.</td>
          </tr>
          <tr>
            <td>Transactions</td>
            <td>Every payment knows which Pay Link it came through. Viewable and exportable as CSV under Transactions.</td>
            <td>The blockchain shows the amount but not the Pay Link — that’s what notifications are for.</td>
          </tr>
          <tr>
            <td>Webhook (notifications)</td>
            <td>MoonPay calls an address you choose for every payment. The dashboard calls it an Endpoint; All Pay Links covers every Pay Link.</td>
            <td>The notification says which Pay Link a payment belongs to, so receipts can be split by site.</td>
          </tr>
        </tbody>
      </table>
      <Note title="Several sites taking payments? Give each its own Pay Link">
        <p>If sites share one Pay Link, even MoonPay can’t tell which site a payment came from. One each keeps them apart in the ledger — they can still pay into the same wallet.</p>
      </Note>

      <Step n={1} title="Sign up and sign in">
        <p>
          Go to{' '}
          <a href="https://moonpay.hel.io" target="_blank" rel="noreferrer">
            moonpay.hel.io
          </a>{' '}
          and sign in with email. <strong>Email is easier than connecting a wallet</strong>: it creates an embedded wallet for you — no browser extension, no seed phrase to guard.
        </p>
        <p>
          Then finish your profile under <strong>Settings</strong>, where you can also manage wallets and invite teammates.
        </p>
      </Step>

      <Step n={2} title="Verify your identity">
        <p>
          Complete personal identity verification (KYC) as the dashboard asks. If it also asks for business verification (KYB), follow its instructions; whether you can complete it as an individual, and what
          stays limited until you do, is up to the dashboard.
        </p>
      </Step>

      <Step n={3} title="Create a payment link (Pay Link)">
        <p>
          Under <strong>Payments</strong> on the left, click <strong>Create Payment</strong> and set:
        </p>
        <table>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name, price</td>
              <td>
                <strong>The price must match your site.</strong> Price it in USDC (1 USDC ≈ US$1). Pricing in USDT only changes the unit — what buyers actually pay with is the next row.
              </td>
            </tr>
            <tr>
              <td>Coins (Allows customers to pay with)</td>
              <td>
                On the Solana wallet, <strong>keep only USDC</strong>. MAX lists only USDC for Solana deposits, not USDT — if USDT is allowed and a buyer pays with it, you likely can’t send it straight to MAX.
              </td>
            </tr>
            <tr>
              <td>Receiving wallet</td>
              <td>Defaults to your main (embedded) wallet. To use your own wallet (e.g. Phantom), add a Payout Wallet under Settings → Wallets. Either way, MoonMax Book reads it from the blockchain.</td>
            </tr>
            <tr>
              <td>Token Swap</td>
              <td>Turn it on. Buyers can pay with other coins (USDT, SOL…) and MoonPay converts to USDC for you (+0.25%).</td>
            </tr>
            <tr>
              <td>Require email</td>
              <td>Essential for digital goods — otherwise you can’t send the file.</td>
            </tr>
            <tr>
              <td>Card payments</td>
              <td>Worth a look if buyers without wallets should be able to pay (requires connecting MoonPay); terms and fees are in the dashboard.</td>
            </tr>
            <tr>
              <td>Success redirect</td>
              <td>
                Your thank-you page, e.g. <code>https://your-site/thanks</code>.
              </td>
            </tr>
          </tbody>
        </table>
      </Step>

      <Step n={4} title="Put it on your site">
        <p>Two options — pick one:</p>
        <p>
          <strong>A. Direct link</strong>: point the Buy button at <code>https://moonpay.hel.io/pay/YOUR_PAYLINK_ID</code> and buyers go to MoonPay’s payment page.
        </p>
        <p>
          <strong>B. Embedded checkout</strong>: buyers pay without leaving your site. Load MoonPay’s script, then call <code>helioCheckout</code>:
        </p>
        <pre>{EMBED_EN}</pre>
        <p>Doing both is best: use B, falling back to A’s link if the script fails to load.</p>
        <p>
          Finally, paste the Pay Link’s address into step 1 of MoonMax Book’s <a href={internal('#/')}>Get started</a> and give it a name. With several sites, add each one.
        </p>
      </Step>

      <Step n={5} title="Check before going live">
        <ul>
          <li>Your site’s price matches the Pay Link price.</li>
          <li>Make a small real payment yourself and check the thank-you page, the email and the transaction in MoonPay.</li>
          <li>
            Open MoonMax Book’s <a href={internal('#/receipts')}>Receipts</a> and make sure the test payment shows up.
          </li>
        </ul>
        <Note tone="warn" title="Common mistake: leaving a test price in place">
          <p>It’s handy to set a Pay Link to 1–2 USDC while testing. Change it back before launch, or buyers will see US$19 and pay 2 USDC.</p>
        </Note>
      </Step>

      <Step n={6} title="Set up notifications (webhook) so the ledger can tell sites apart">
        <p>
          In the dashboard, click <strong>Developer</strong> on the left, stay on the <strong>Endpoints</strong> tab and click <strong>Add Endpoint</strong>:
        </p>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>What to enter</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name</td>
              <td>Anything, e.g. MoonMax Book.</td>
            </tr>
            <tr>
              <td>Secret</td>
              <td>
                Already generated. Use the copy button and <strong>save it in step 3 of MoonMax Book’s Get started first</strong>. The ***** on screen is hidden — only the copy button gives you the whole
                value.
              </td>
            </tr>
            <tr>
              <td>Endpoint URL</td>
              <td>The webhook address shown in step 3 of Get started.</td>
            </tr>
            <tr>
              <td>Webhook</td>
              <td>Pay Link.</td>
            </tr>
            <tr>
              <td>Pay Link</td>
              <td>All Pay Links — covers ones you add later too.</td>
            </tr>
          </tbody>
        </table>
        <p>
          Afterwards, the <strong>Events</strong> tab lists whether each notification was delivered. (MoonPay’s docs say Developers → Webhooks and sharedToken; the dashboard uses different words for the same
          thing.)
        </p>
        <Note title="No API keys needed">
          <p>
            MoonMax Book never asks for your MoonPay API keys. Amounts are read from the public blockchain; notifications say which Pay Link a payment belongs to. The Secret only verifies notifications — it
            can’t touch your account or money — and buyer email, name and address in notifications are thrown away on arrival.
          </p>
        </Note>
        <p>
          With only one Pay Link you can skip this for now: it’s the only one using the wallet, so the ledger assumes it. Payments from before notifications were set up are inferred from wallet and amount; a CSV
          export from Transactions can fill the gaps (import is still being built).
        </p>
      </Step>

      <h2>After the money arrives</h2>
      <p>
        Every transaction appears under <strong>Transactions</strong> in the dashboard, where you can refund and export CSV; MoonMax Book’s <a href={internal('#/receipts')}>Receipts</a> splits them by Pay
        Link. The money stays in your receiving wallet — to turn it into TWD, see the <a href={internal('#/docs/cashout')}>cash-out guide</a>.
      </p>
    </>
  )
}
