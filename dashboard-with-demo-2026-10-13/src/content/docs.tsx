import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import type { DocSlug } from '../app/router'

export const DOCS_UPDATED = '2026-10-11'

export type DocMeta = { slug: DocSlug; title: string; summary: string; minutes: number }

export const DOCS: DocMeta[] = [
  { slug: 'who', title: '誰適合用這個流程', summary: '沒有公司行號、收國外客戶加密貨幣的台灣創作者，先看這篇判斷適不適合。', minutes: 5 },
  { slug: 'moonpay', title: 'MoonPay Commerce 帳號與設定', summary: 'MoonPay 是怎麼排的、從註冊到放上網站，以及設定通知（webhook）。', minutes: 8 },
  { slug: 'cashout', title: '出金教學：從 USDC 到台灣銀行帳戶', summary: '把 MoonPay 收到的 USDC 轉到 MAX、賣成台幣、提領到自己的帳戶。', minutes: 6 },
]

function Note({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title: string; children: ReactNode }) {
  const warn = tone === 'warn'
  const Icon = warn ? TriangleAlert : Info
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 ${warn ? 'border-warn/25 bg-warn-soft' : 'border-border bg-muted/60'}`}>
      <Icon className={`mt-[3px] size-[18px] shrink-0 ${warn ? 'text-warn' : 'text-fg-3'}`} aria-hidden />
      <div className="text-[14px] leading-[1.8] text-fg-2">
        <p className="font-semibold text-fg">{title}</p>
        <div className="mt-0.5 space-y-2">{children}</div>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 grid grid-cols-[2rem_1fr] gap-x-3">
      <span className="num mt-0.5 grid size-7 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-fg">{n}</span>
      <div className="min-w-0">
        <h3 className="mt-0 text-[16.5px] font-semibold tracking-[-0.01em] text-fg">{title}</h3>
        <div className="doc mt-2">{children}</div>
      </div>
    </section>
  )
}

const internal = (hash: string) => `${window.location.search}${hash}`

// ---------------------------------------------------------------------------

export function WhoArticle() {
  return (
    <>
      <p>
        這個流程是：<strong>海外買家用加密貨幣付款 → 錢進到 MoonPay Commerce → 轉到台灣的 MAX 交易所換成台幣 → 提領到你自己的銀行帳戶</strong>
        。MoonMax Book 負責把兩邊的紀錄對起來，年底交給會計師。它不是唯一的收款方式，先確認你真的需要它。
      </p>

      <h2>這條路長什麼樣子</h2>
      <ol>
        <li>
          <strong>買家付款</strong>：在你的網站按購買，用 USDC 或其他幣付款（MoonPay 會自動換成 USDC 給你）。
        </li>
        <li>
          <strong>MoonPay Commerce 收款</strong>：錢進到 MoonPay 幫你建的錢包，交易紀錄在 MoonPay 後台。
        </li>
        <li>
          <strong>轉到 MAX、賣成台幣</strong>：把 USDC 轉到 MAX 的入金地址，在 MAX 賣出。
        </li>
        <li>
          <strong>提領到銀行</strong>：新台幣提領到你本人名下的台灣銀行帳戶。
        </li>
      </ol>

      <h2>適合你，如果……</h2>
      <ul>
        <li>你在台灣，<strong>沒有公司行號</strong>，以個人身分接案或賣數位商品（例如 Figma plugin、模板、筆刷、課程）。</li>
        <li>你的買家或客戶<strong>主要在國外</strong>，跨國收款對你來說手續費高、流程卡。</li>
        <li>你的買家本來就有加密貨幣錢包，或願意用加密貨幣付款。</li>
        <li>你最後要的是<strong>台幣</strong>，而且需要一份能交給會計師的收入紀錄。</li>
      </ul>

      <h2>先不要用，如果……</h2>
      <table>
        <thead>
          <tr>
            <th>你的情況</th>
            <th>比較適合的做法</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>買家幾乎都在台灣</td>
            <td>用台灣的行動支付或轉帳，加密貨幣在這裡沒有優勢。</td>
          </tr>
          <tr>
            <td>你只是想收國外信用卡</td>
            <td>PayPal 商業帳戶不需要公司登記，個人聲明商業用途就能開，買家也能直接刷卡。</td>
          </tr>
          <tr>
            <td>你不想處理跨國稅務（VAT 等）</td>
            <td>Gumroad、Lemon Squeezy 這類平台是 Merchant of Record，代你處理；Gumroad 抽 10% + US$0.50。</td>
          </tr>
          <tr>
            <td>你完全不想碰錢包和轉帳</td>
            <td>這個流程每一步都要你自己確認網路和地址，不適合完全不想學的人。</td>
          </tr>
        </tbody>
      </table>
      <Note title="為什麼不是 Stripe 或 Figma 的付費功能？">
        <p>以台灣身分開不了 Stripe 帳號（要先設美國公司）；Figma Community 的付費資源，創作者收款名單也不包含台灣。這兩條路對台灣個人創作者目前是關著的。</p>
      </Note>

      <h2>MoonPay 已經有交易紀錄了，為什麼還需要 MoonMax Book？</h2>
      <p>如果你只想知道「誰付了錢」，MoonPay Commerce 後台就夠了，還能匯出 CSV。MoonMax Book 補的是 MoonPay 不知道、也不會做的事：</p>
      <ul>
        <li>
          <strong>MoonPay 不知道 MAX</strong>：它只看得到收款，不知道你哪天把多少 USDC 轉去 MAX、換回多少台幣。
        </li>
        <li>
          <strong>換算成收到當下的台幣價值</strong>：用台灣的參考匯率換算，這才是收入的金額。
        </li>
        <li>
          <strong>出金時賺賠多少</strong>：收到後幣價有變，出金時會多出或少掉一些，要用先進先出法對到每一筆收入才算得出來。
        </li>
        <li>
          <strong>避免轉錯網路</strong>：告訴你錢在哪條鏈上、該用 MAX 哪個地址。
        </li>
      </ul>
      <p>如果你從來不出金，或不需要台灣的收入紀錄，可以不用 MoonMax Book。</p>

      <h2>要先知道的成本</h2>
      <table>
        <thead>
          <tr>
            <th>項目</th>
            <th>費用</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MoonPay Commerce 交易手續費</td>
            <td>2%（HelioX 會員 1%）</td>
          </tr>
          <tr>
            <td>買家用其他幣付款，自動換成 USDC</td>
            <td>另加 0.25%</td>
          </tr>
          <tr>
            <td>MAX 交易手續費</td>
            <td>掛單 0.08%、吃單 0.16%（第三方整理，以 MAX 公告為準）</td>
          </tr>
          <tr>
            <td>MAX 新台幣提領、鏈上轉帳網路費</td>
            <td>以 MAX 與後台顯示為準</td>
          </tr>
        </tbody>
      </table>

      <h2>稅務與法規，先講清楚</h2>
      <ul>
        <li>
          <strong>收到加密貨幣也是收入</strong>。要不要辦稅籍登記，看的是你是不是「持續性營利」，不是看你用什麼幣收錢。
        </li>
        <li>
          <strong>新台幣 50 萬不是免稅額</strong>，是銀行對單筆現金交易的申報門檻。刻意把金額拆成略低於 50 萬，本身就是可疑交易指標。
        </li>
        <li>台灣《虛擬資產服務法》已三讀通過，子法還在訂。MoonMax Book 只讀紀錄、不經手資金。</li>
      </ul>
      <Note tone="warn" title="這不是稅務或法律建議">
        <p>台灣對「加密貨幣當作收入」的申報方式還不夠成熟。開始收款前，找處理過加密貨幣案件的會計師或記帳士確認一次。</p>
      </Note>
    </>
  )
}

// ---------------------------------------------------------------------------

export function MoonpayArticle() {
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
      <p>先看懂這四層，後面每一步在設定什麼就清楚了：</p>
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
            <td>直接從公開的區塊鏈讀這個錢包收了哪些錢。<strong>不需要 API 金鑰。</strong></td>
          </tr>
          <tr>
            <td>Pay Link</td>
            <td>一個商品或網站一個。各自有名稱、價格，並指定錢要進哪個錢包。</td>
            <td>你貼上它的網址，MoonMax Book 就知道它賣多少、錢會進哪個錢包。</td>
          </tr>
          <tr>
            <td>交易</td>
            <td>每筆付款都記得是哪個 Pay Link 付的。後台可以看、可以匯出 CSV。</td>
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
          到 <a href="https://moonpay.hel.io" target="_blank" rel="noreferrer">moonpay.hel.io</a> 用 Email 登入。
          <strong>建議用 Email 而不是連錢包</strong>：用 Email 註冊會自動建立一個內嵌錢包，不用裝瀏覽器擴充、不用保管助記詞。
        </p>
        <p>登入後到 <strong>Settings</strong> 補完個人資料，這裡也能管理錢包和邀請隊友。</p>
      </Step>

      <Step n={2} title="完成身分驗證">
        <p>
          照後台指示完成個人身分驗證（KYC）。如果後台也要求商家驗證（KYB），依指示補件；能不能用個人身分完成、沒完成會限制哪些功能，以後台說明為準。
        </p>
        <p>
          <a href={internal('#/platform')}>串接檢查</a>會顯示你目前 KYC、KYB 的狀態。
        </p>
      </Step>

      <Step n={3} title="建立付款連結（Pay Link）">
        <p>在後台建立 Pay Link，依序設定：</p>
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
                <strong>價格一定要跟網站上的標價一樣</strong>，用 USDC 計價（1 USDC 約等於 1 美元）。
              </td>
            </tr>
            <tr>
              <td>收款錢包</td>
              <td>預設是你的主錢包（內嵌錢包）。要改到自己的錢包（例如 Phantom），到 Settings → Wallets 新增 Payout Wallet。不管哪一個，MoonMax Book 都是從區塊鏈直接讀。</td>
            </tr>
            <tr>
              <td>Token Swap</td>
              <td>建議開。買家可以用其他幣付款，你一樣收到 USDC（另收 0.25%）。</td>
            </tr>
            <tr>
              <td>結算方式</td>
              <td>
                建議選<strong>只收 Solana 上的 USDC</strong>。另一個選項會把 EVM 鏈的付款換成 Base 上的 USDC，出金時你就得多管一條鏈；而 MAX 支不支援 Base 的
                USDC 入金，要先在 MAX 確認。
              </td>
            </tr>
            <tr>
              <td>要求 Email</td>
              <td>賣數位商品一定要開，不然你寄不出檔案。</td>
            </tr>
            <tr>
              <td>卡片付款</td>
              <td>想讓沒有錢包的買家也能付，可以研究這個選項；條件與費率以後台為準。</td>
            </tr>
            <tr>
              <td>成功導向網址</td>
              <td>填你的感謝頁，例如 <code>https://你的網站/thanks</code>。</td>
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
        <pre>{`<script type="module" src="https://embed.hel.io/assets/index-v1.js"></script>
<div id="checkout"></div>
<script type="module">
  window.helioCheckout(document.getElementById('checkout'), {
    paylinkId: '你的PayLinkID',
    display: 'inline',
    onSuccess: () => { location.href = '/thanks' },
  })
</script>`}</pre>
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
            打開<a href={internal('#/platform')}>串接檢查</a>，它會比對你本機網站、MoonPay 設定和上線網站。
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
        <p>建好之後，<strong>Events</strong> 分頁會列出每則通知有沒有送成功。（MoonPay 官方文件寫的是 Developers → Webhooks、sharedToken，跟現在的後台畫面用詞不同，指的是同一件事。）</p>
        <Note title="不需要 API 金鑰">
          <p>
            MoonMax Book 不跟你要 MoonPay 的 API 金鑰。收款金額直接從公開的區塊鏈讀，「是哪個 Pay Link」靠通知分辨。這個 Secret 只能驗證通知，不能動你的帳戶或錢；通知裡的買家
            Email、姓名、地址，MoonMax Book 收到就丟掉。
          </p>
        </Note>
        <p>
          只有一個 Pay Link 的話可以先跳過：錢包只有它在用，帳本會直接推測是它。設定通知之前收的款，只能用錢包和金額推測；可以從後台 Transactions 匯出 CSV 補對（匯入功能還在做）。
        </p>
      </Step>

      <h2>收到錢之後</h2>
      <p>
        所有交易會出現在後台的 <strong>Transactions</strong> 分頁，可以退款，也能匯出 CSV；MoonMax Book 的<a href={internal('#/receipts')}>收款紀錄</a>會依 Pay Link 分開列。錢會留在你的收款錢包裡，要換成台幣請看
        <a href={internal('#/docs/cashout')}>出金教學</a>。
      </p>
    </>
  )
}

// ---------------------------------------------------------------------------

export function CashoutArticle() {
  return (
    <>
      <p>
        收到的 USDC 要變成能花的台幣，路徑是：<strong>MoonPay 錢包 → MAX 的 Solana USDC 入金地址 → 在 MAX 賣成台幣 → 提領到你本人的銀行帳戶</strong>
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
        <p>
          把這個地址貼到 MoonMax Book「開始使用」的第 4 步。之後從收款錢包轉到這個地址的錢，收款紀錄會標成「轉到 MAX」。
        </p>
      </Step>

      <Step n={3} title="從 MoonPay 轉出 USDC 到 MAX">
        <p>
          在 MoonPay Commerce 後台找到你的錢包餘額，使用轉出功能（按鈕名稱以後台為準），貼上 MAX 的 Solana 地址。
        </p>
        <ul>
          <li>
            <strong>第一次先轉一小筆測試</strong>，例如 1–2 USDC，確認 MAX 有入帳再轉剩下的。
          </li>
          <li>轉出前核對地址開頭和結尾幾個字。</li>
        </ul>
        <Note title="另一種做法">
          <p>
            也可以在 MoonPay 的 Settings → Wallets 把收款改到你自己的錢包（例如 Phantom），再從那裡轉到 MAX。不建議直接把 MAX 入金地址設成收款地址：買家的錢會從很多不同錢包直接進交易所，中間少了一層你能掌控的緩衝。
          </p>
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

export const ARTICLE: Record<DocSlug, () => ReactNode> = {
  who: WhoArticle,
  moonpay: MoonpayArticle,
  cashout: CashoutArticle,
}
