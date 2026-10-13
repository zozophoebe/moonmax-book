import { Building2, Coins, FileSpreadsheet, Landmark, LayoutTemplate, Link2, MousePointerClick, Percent, ReceiptText, Rocket, Route, Sparkles, Store, Wallet } from 'lucide-react'
import { AvoidList, Figure, internal, KeepBars, Note, PersonaGrid, Pitch, Timeline } from './parts'

const SITE = 'https://frame-to-lottie-site.vercel.app'
const SHOT = '/docs/frame-to-lottie-site.jpg'

export function WhoZh() {
  return (
    <>
      <p>
        這是我自己走過一遍的流程。我做了一個 Figma 外掛 <strong>Frame → Lottie</strong>，想賣給國外的設計師，但我沒有公司行號、也沒有國外銀行帳戶：Stripe 開不了，Gumroad
        一筆抽一成以上。最後我用的是這條路：<strong>網站讓 AI 做、MoonPay 收款、MAX 換台幣</strong>，再用 MoonMax Book 把帳記清楚。
      </p>

      <h2>這個流程適合你，如果……</h2>
      <PersonaGrid
        items={[
          { Icon: Store, title: '沒有公司行號', body: '用個人身分就能開始收款，不用先登記公司。' },
          { Icon: Landmark, title: '沒有國外銀行帳戶', body: '不用美國銀行、也不用 Stripe。錢最後回到你在台灣、本人名下的戶頭。' },
          { Icon: LayoutTemplate, title: '有一頁式網站想賣東西', body: '外掛、模板、筆刷、接案訂金都可以。一個網站或商品一個付款連結。' },
          { Icon: Percent, title: '不想被平台抽一成以上', body: 'Gumroad、Patreon 都從 10% 起跳，MoonPay Commerce 是 2%。' },
        ]}
      />

      <h2>先不要用，如果……</h2>
      <AvoidList
        items={[
          { title: '買家都在台灣', body: '直接轉帳或用台灣的金流就好，不用繞一圈加密貨幣。' },
          { title: '買家不會用加密貨幣錢包', body: '刷卡要另外接 MoonPay 的刷卡服務，條件以後台為準。' },
          { title: '你需要開發票、走公司帳', body: '這條路是個人收款；公司帳要另外處理。' },
          { title: '不想自己核對網路和地址', body: '每一步都要你自己確認，轉錯網路救不回來。' },
        ]}
      />

      <h2>抽成比一比</h2>
      <KeepBars
        caption="賣一個 US$19 的外掛，你大概拿到多少"
        rows={[
          { name: 'MoonPay Commerce', keep: 'US$18.62', pct: 98, best: true, detail: '2% 手續費。之後在 MAX 換台幣，另收約 0.16%。' },
          { name: 'Patreon', keep: '約 US$16', pct: 84, detail: '10% 平台費，另加金流費（依付款方式而定）。' },
          { name: 'Gumroad', keep: '約 US$15.75', pct: 83, detail: '10% + US$0.50，再加刷卡手續費 2.9% + US$0.30。' },
        ]}
      />
      <p>
        費率是 2026 年 10 月查各家官網算的。Gumroad 如果透過它自己的 Discover 市集賣出，抽 30%；Patreon 的 10% 適用 2025 年 8 月之後開的頁面。
      </p>
      <Note tone="warn" title="但要注意">
        <ul className="list-disc pl-5">
          <li>買家要有加密貨幣錢包（Phantom、MetaMask 這類），或你另外開 MoonPay 刷卡。</li>
          <li>加密貨幣付款不能退刷，要退款得你自己轉回去。</li>
          <li>MoonPay 帳號要先通過身分驗證，才能正常收款。</li>
          <li>收到的錢一樣是收入，要自己報稅（最後一段有寫）。</li>
        </ul>
      </Note>

      <h2>實際範例：我的 Frame → Lottie</h2>
      <Figure
        src={SHOT}
        alt="Frame → Lottie 外掛的一頁式網站，右側有 Buy for US$19 按鈕"
        href={SITE}
        caption={
          <>
            frame-to-lottie-site.vercel.app：讓 AI 做的一頁式網站，「Buy for US$19」按鈕連到 MoonPay 的付款連結。
          </>
        }
      />
      <Timeline
        items={[
          { Icon: Sparkles, title: '讓 AI 做好網站', body: '一頁式就夠：商品介紹、價格、一個購買按鈕。我用 AI 生成，再自己調整文字和畫面。' },
          { Icon: Rocket, title: '部署上線', body: '推到 Vercel（免費方案就夠），拿到一個公開網址。' },
          {
            Icon: Link2,
            title: '到 MoonPay Commerce 註冊、建立付款連結',
            body: (
              <>
                用 Email 一般註冊、完成身分驗證，在 Payments 建一個 Pay Link：名稱、價格、要收什麼幣（建議只收 Solana 上的 USDC）、錢要進哪個錢包。細節看
                <a href={internal('#/docs/moonpay')}>MoonPay 設定</a>。
              </>
            ),
          },
          { Icon: MousePointerClick, title: '把付款連結放上網站', body: '購買按鈕連到 moonpay.hel.io/pay/…，或嵌入 MoonPay 的結帳視窗。' },
          { Icon: Wallet, title: '買家付款，錢直接進你的錢包', body: 'MoonPay 收 2%，其餘直接進你設定的錢包。MoonMax Book 不經手。' },
          {
            Icon: Building2,
            title: '轉到 MAX 換台幣',
            body: (
              <>
                把 USDC 轉到 MAX 的 Solana 入金地址，賣成台幣、提領到自己的銀行帳戶。步驟看<a href={internal('#/docs/cashout')}>出金教學</a>。
              </>
            ),
          },
          { Icon: ReceiptText, title: 'MoonMax Book 記帳', body: '每筆收款換算成收到當天的台幣，依網站分開列，報稅時交給會計師。' },
        ]}
      />

      <h2>MoonMax Book 幫你做什麼</h2>
      <Pitch
        title="想賣賣看區塊鏈的世界？"
        points={[
          { Icon: Route, text: '一步一步帶你把 MoonPay 和 MAX 接起來' },
          { Icon: Coins, text: '每筆收款換算成收到當天的台幣價值' },
          { Icon: FileSpreadsheet, text: '依網站分開列，年底給會計師的紀錄' },
        ]}
      >
        <p>
          MoonMax Book 是一個記帳軟體。除了帶你把上面整套流程操作一遍，它還把每筆收款換算成台幣、跟出金對起來，報稅的時候簡單很多。它不碰你的錢，也不需要你的 API 金鑰。
          <a href={internal('#/')}>到「開始使用」設定</a>。
        </p>
      </Pitch>

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

export function WhoEn() {
  return (
    <>
      <p>
        This is a path I walked myself. I built a Figma plugin, <strong>Frame → Lottie</strong>, and wanted to sell it to designers abroad — but I have no registered company and no foreign bank
        account. Stripe was out, and Gumroad takes more than a tenth of every sale. What worked: <strong>an AI-built site, MoonPay for payments, MAX to turn it into TWD</strong>, and MoonMax Book to keep
        the books straight.
      </p>

      <h2>This is for you if…</h2>
      <PersonaGrid
        items={[
          { Icon: Store, title: 'You have no registered company', body: 'You can start taking payments as an individual — no company to set up first.' },
          { Icon: Landmark, title: 'You have no foreign bank account', body: 'No US bank, no Stripe. The money ends up in your own account in Taiwan.' },
          { Icon: LayoutTemplate, title: 'You have a one-page site to sell from', body: 'Plugins, templates, brushes, commission deposits — one payment link per site or product.' },
          { Icon: Percent, title: 'You don’t want to give up 10%+', body: 'Gumroad and Patreon start at 10%. MoonPay Commerce is 2%.' },
        ]}
      />

      <h2>Skip it for now if…</h2>
      <AvoidList
        items={[
          { title: 'Your buyers are all in Taiwan', body: 'Bank transfer or a local payment service is simpler — no detour through crypto.' },
          { title: 'Your buyers don’t use crypto wallets', body: 'Card payments need MoonPay’s card option set up separately; terms are in the dashboard.' },
          { title: 'You need invoices or company books', body: 'This is personal income; company accounting is a separate matter.' },
          { title: 'You don’t want to check networks and addresses', body: 'Every step is yours to verify, and a transfer on the wrong network can’t be recovered.' },
        ]}
      />

      <h2>What each platform takes</h2>
      <KeepBars
        caption="Selling a US$19 plugin — roughly what you keep"
        rows={[
          { name: 'MoonPay Commerce', keep: 'US$18.62', pct: 98, best: true, detail: '2% fee. Converting to TWD on MAX costs about 0.16% more.' },
          { name: 'Patreon', keep: '~US$16', pct: 84, detail: '10% platform fee plus payment processing (depends on how the buyer pays).' },
          { name: 'Gumroad', keep: '~US$15.75', pct: 83, detail: '10% + US$0.50, plus card processing at 2.9% + US$0.30.' },
        ]}
      />
      <p>
        Rates are from each platform’s own pages, checked in October 2026. Gumroad takes 30% on sales through its Discover marketplace; Patreon’s 10% applies to pages published after August 2025.
      </p>
      <Note tone="warn" title="Keep in mind">
        <ul className="list-disc pl-5">
          <li>Buyers need a crypto wallet (Phantom, MetaMask and the like), unless you add MoonPay’s card payments.</li>
          <li>Crypto payments can’t be charged back — refunds mean sending the money back yourself.</li>
          <li>Your MoonPay account needs identity verification before payments work normally.</li>
          <li>It’s still income, and you report it yourself (see the last section).</li>
        </ul>
      </Note>

      <h2>A real example: my Frame → Lottie</h2>
      <Figure
        src={SHOT}
        alt="The Frame → Lottie plugin’s one-page site, with a Buy for US$19 button"
        href={SITE}
        caption={<>frame-to-lottie-site.vercel.app: a one-page site built with AI. The “Buy for US$19” button goes to a MoonPay payment link.</>}
      />
      <Timeline
        items={[
          { Icon: Sparkles, title: 'Have AI build the site', body: 'One page is enough: what it is, the price, one Buy button. I generated it with AI, then tuned the copy and visuals.' },
          { Icon: Rocket, title: 'Deploy it', body: 'Push it to Vercel (the free plan is plenty) and you get a public address.' },
          {
            Icon: Link2,
            title: 'Sign up for MoonPay Commerce and create a payment link',
            body: (
              <>
                Sign up with email, verify your identity, and create a Pay Link under Payments: name, price, which coin to accept (Solana USDC only is simplest) and which wallet it pays into. Details in{' '}
                <a href={internal('#/docs/moonpay')}>MoonPay setup</a>.
              </>
            ),
          },
          { Icon: MousePointerClick, title: 'Put the link on your site', body: 'Point the Buy button at moonpay.hel.io/pay/…, or embed MoonPay’s checkout.' },
          { Icon: Wallet, title: 'The buyer pays; the money lands in your wallet', body: 'MoonPay keeps 2% and sends the rest straight to your wallet. MoonMax Book never touches it.' },
          {
            Icon: Building2,
            title: 'Turn it into TWD on MAX',
            body: (
              <>
                Send the USDC to your MAX Solana deposit address, sell it for TWD and withdraw to your bank. Steps in the <a href={internal('#/docs/cashout')}>cash-out guide</a>.
              </>
            ),
          },
          { Icon: ReceiptText, title: 'MoonMax Book keeps the books', body: 'Every payment is valued in TWD on the day it arrived, listed by site, ready for your accountant at tax time.' },
        ]}
      />

      <h2>What MoonMax Book does for you</h2>
      <Pitch
        title="Want to try selling in the crypto world?"
        points={[
          { Icon: Route, text: 'Walks you through connecting MoonPay and MAX' },
          { Icon: Coins, text: 'Values every payment in TWD on the day it arrived' },
          { Icon: FileSpreadsheet, text: 'Listed by site, with year-end records for your accountant' },
        ]}
      >
        <p>
          MoonMax Book is bookkeeping software. Besides walking you through the whole flow above, it values every payment in TWD and matches it to your cash-outs, which makes tax time much simpler. It never
          touches your money and never asks for API keys. <a href={internal('#/')}>Set it up in Get started</a>.
        </p>
      </Pitch>

      <h2>Tax and regulation, plainly</h2>
      <ul>
        <li>
          <strong>Crypto you receive is income.</strong> Whether you need to register for tax depends on whether you’re earning on an ongoing basis — not on which currency you’re paid in.
        </li>
        <li>
          <strong>NT$500,000 is not a tax-free allowance.</strong> It’s the threshold at which banks report a single cash transaction. Deliberately splitting amounts to stay just under it is itself a red flag.
        </li>
        <li>Taiwan’s Virtual Asset Service Act has passed; its detailed rules are still being written. MoonMax Book only reads records and never handles funds.</li>
      </ul>
      <Note tone="warn" title="This isn’t tax or legal advice">
        <p>How to report crypto as income in Taiwan is still unsettled. Before you start, check once with an accountant who has handled crypto cases.</p>
      </Note>
    </>
  )
}
