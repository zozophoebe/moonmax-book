// Real-platform check. Runs in the Vite dev server (Node), never in the browser.
// Everything it reads is public: MoonPay's public Pay Link data, your live sites,
// and whether a webhook token exists (never its value).

import type { CheckStatus, PlatformCheck, PlatformStatus } from '../src/types/platform'
import type { PaylinkEntry } from '../src/types/setup'
import type { PlatformConfig } from './config'
import { fetchWithTimeout } from './http'
import { loadPaylinkEntries, walletsFrom } from './ledger'
import { bpsPct, toUnits, unitsToDecimal } from './money'
import { fetchPublicPaylink } from './moonpay'
import { loadWebhookEvents, loadWebhookSecret } from './store'

const FEES = { standardBps: 200n, helioXBps: 100n, swapBps: 25n, offrampBps: 50n }
const FEE_SOURCE = 'docs.hel.io/docs/pricing-fees'
const FEE_AS_OF = '2026-10-08'
const HOME = '#/'

type PageScan = { paylinkIds: string[]; prices: string[]; hasWidget: boolean }

function scanHtml(html: string): PageScan {
  const ids = new Set<string>()
  for (const re of [/paylinkId:\s*['"]([a-f0-9]{24})['"]/g, /PAYLINK_ID\s*=\s*['"]([a-f0-9]{24})['"]/g, /hel\.io\/pay\/([a-f0-9]{24})/g]) {
    for (const m of html.matchAll(re)) if (m[1]) ids.add(m[1])
  }
  const prices = new Set<string>()
  for (const re of [/class="[^"]*\bprice\b[^"]*"[^>]*>\s*(?:US)?\$\s?([\d,]+(?:\.\d+)?)/g, /US\$\s?([\d,]+(?:\.\d+)?)/g]) {
    for (const m of html.matchAll(re)) if (m[1]) prices.add(m[1].replace(/,/g, ''))
  }
  return { paylinkIds: [...ids], prices: [...prices], hasWidget: html.includes('embed.hel.io/assets/index-v1.js') && html.includes('helioCheckout(') }
}

const nameOf = (e: PaylinkEntry) => e.label ?? e.preview?.name ?? e.id

async function checkPaylink(e: PaylinkEntry, add: (c: PlatformCheck) => void) {
  const who = `「${nameOf(e)}」`
  const p = e.preview
  if (!p) {
    add({ id: `pl-${e.id}-live`, group: 'paylink', status: 'fail', title: `${who}讀不到 MoonPay 上的付款連結`, detail: e.error ?? '未知錯誤', fix: '確認網路連線，或到 MoonPay Commerce 後台確認這個 Pay Link 還在。', facts: [{ label: 'Pay Link ID', value: e.id, mono: true }] })
    return
  }
  add({
    id: `pl-${e.id}-live`,
    group: 'paylink',
    status: p.active ? 'ok' : 'fail',
    title: `${who}${p.active ? '啟用中' : '已停用'}`,
    detail: p.active ? '買家現在可以付款。' : '買家打開會無法付款。',
    fix: p.active ? undefined : '到 MoonPay Commerce 後台重新啟用這個 Pay Link。',
    facts: [
      { label: '名稱', value: p.name },
      { label: '售價', value: `${p.priceToken} ${p.token}`, mono: true },
      ...p.recipients.map((r) => ({ label: `收款錢包（${r.chain} ${r.token}）`, value: r.address, mono: true })),
    ],
  })
  add({
    id: `pl-${e.id}-pay`,
    group: 'paylink',
    status: 'info',
    title: `${who}買家可以怎麼付`,
    detail: [
      p.canSwapTokens ? `可用其他幣付款，系統自動換成 ${p.token}（另收 ${bpsPct(FEES.swapBps)}%）` : `只收 ${p.token}`,
      p.canPayWithCard ? '可刷卡' : '沒開刷卡，沒有錢包的買家會卡住',
    ].join('；') + '。',
  })
  if (!p.requireEmail) {
    add({ id: `pl-${e.id}-email`, group: 'paylink', status: 'warn', title: `${who}結帳時沒有收買家 Email`, detail: '賣數位商品的話，沒有 Email 你會寄不出檔案。', fix: '在 Pay Link 設定開啟「Require email」。' })
  }
  if (p.redirectUrl) {
    let status: number | null = null
    try {
      status = (await fetchWithTimeout(p.redirectUrl)).status
    } catch {
      status = null
    }
    add({
      id: `pl-${e.id}-redirect`,
      group: 'paylink',
      status: status === 200 ? 'ok' : 'warn',
      title: `${who}付款後的導向網址${status === 200 ? '可以開' : '打不開'}`,
      detail: status === 200 ? '付款成功後會把買家帶回你的感謝頁。' : `導向網址回應 ${status ?? '連線失敗'}。`,
      facts: [{ label: '導向網址', value: p.redirectUrl, mono: true }],
    })
  }

  if (!e.siteUrl) return
  let live: PageScan | null = null
  try {
    const res = await fetchWithTimeout(e.siteUrl)
    live = scanHtml(await res.text())
    if (!res.ok) add({ id: `site-${e.id}-live`, group: 'site', status: 'fail', title: `${who}的網站打不開`, detail: `網站回應 HTTP ${res.status}。`, facts: [{ label: '網址', value: e.siteUrl, mono: true }] })
  } catch (err) {
    add({ id: `site-${e.id}-live`, group: 'site', status: 'fail', title: `連不到${who}的網站`, detail: err instanceof Error ? err.message : String(err), facts: [{ label: '網址', value: e.siteUrl, mono: true }] })
  }
  if (!live) return
  const usesThis = live.paylinkIds.includes(e.id)
  add({
    id: `site-${e.id}-paylink`,
    group: 'site',
    status: live.paylinkIds.length === 0 ? 'warn' : usesThis ? 'ok' : 'fail',
    title: live.paylinkIds.length === 0 ? `${who}的網站上找不到 MoonPay 付款連結` : usesThis ? `${who}的網站用的就是這個 Pay Link` : `${who}的網站用的是別的 Pay Link`,
    detail:
      live.paylinkIds.length === 0
        ? '沒看到 hel.io/pay 連結或 paylinkId，可能是用 JavaScript 動態載入，或還沒放上去。'
        : usesThis
          ? `網站${live.hasWidget ? '用嵌入式結帳視窗' : '連到 MoonPay 付款頁'}，指向這個 Pay Link。`
          : '網站上的付款連結和這裡設定的不同。錢會進那個 Pay Link，帳本會把它歸到錯的來源。',
    facts: [{ label: '網址', value: e.siteUrl, mono: true }, ...live.paylinkIds.map((x) => ({ label: '網站上的 Pay Link', value: x, mono: true }))],
  })
  if (usesThis && live.prices.length) {
    const priceUnits = toUnits(p.priceToken, 6)
    const mismatched = live.prices.filter((x) => toUnits(x, 6) !== priceUnits)
    add({
      id: `site-${e.id}-price`,
      group: 'site',
      status: mismatched.length ? 'fail' : 'ok',
      title: mismatched.length ? `${who}網頁標價和實際收費不一樣` : `${who}網頁標價和實際收費一致`,
      detail: mismatched.length
        ? `網頁上寫 US$${live.prices.join('、US$')}，但付款連結實際收 ${p.priceToken} ${p.token}。`
        : `網頁與付款連結都是 ${p.priceToken} ${p.token}。`,
      fix: mismatched.length ? '到 MoonPay Commerce 後台改這個 Pay Link 的價格，或改網頁標價。如果是故意設低價測試，上線前記得改回來。' : undefined,
    })
  }
}

export async function detectPlatform(root: string, config: PlatformConfig): Promise<PlatformStatus> {
  const checks: PlatformCheck[] = []
  const add = (c: PlatformCheck) => checks.push(c)
  const entries = await loadPaylinkEntries(config)

  if (!entries.length) {
    add({
      id: 'paylink-missing',
      group: 'paylink',
      status: 'fail',
      title: '還沒加入任何 Pay Link',
      detail: '沒有 Pay Link，MoonMax Book 不知道你的錢會進哪個錢包。',
      fix: '回「開始使用」第 1 步，貼上你在 MoonPay Commerce 後台找到的 Pay Link 付款網址。',
      docHref: HOME,
    })
  }
  for (const e of entries) await checkPaylink(e, add)

  const firstLive = entries.find((e) => e.preview)
  if (firstLive) {
    const c = (await fetchPublicPaylink(firstLive.id)).company
    const kyb = c?.kybVerified ?? false
    add({
      id: 'account-verify',
      group: 'account',
      status: kyb || !c?.isVerificationRequired ? 'ok' : 'warn',
      title: kyb ? '帳號驗證完成' : '商家驗證（KYB）還沒通過',
      detail: kyb ? '個人與商家驗證都已通過。' : `個人身分驗證（KYC）${c?.kycVerified ? '已通過' : '未通過'}，商家驗證（KYB）還沒過。`,
      fix: kyb ? undefined : '登入 MoonPay Commerce 後台看驗證頁面需要補什麼；會限制哪些功能，以後台說明為準。',
      facts: [{ label: '商家名稱', value: c?.name ?? '—' }],
    })
  }

  // --- where the ledger's data comes from: chain (C) + webhook (B) ---
  const wallets = walletsFrom(entries)
  const readable = wallets.filter((w) => w.readable)
  if (entries.length) {
    add({
      id: 'data-chain',
      group: 'data',
      status: readable.length ? 'ok' : 'warn',
      title: readable.length ? `從區塊鏈讀收款：${readable.length} 個 Solana 錢包` : '沒有可以從區塊鏈讀取的錢包',
      detail: readable.length
        ? '不需要 API 金鑰。錢包地址和交易本來就是公開的，MoonMax Book 直接讀，金額和時間都以鏈上為準。'
        : '目前只能讀 Solana 上的 USDC。到 MoonPay 後台確認 Pay Link 有設定 Solana USDC 收款錢包。',
      facts: wallets.map((w) => ({ label: `${w.chain} 收款錢包${w.readable ? '' : '（先靠 webhook）'}`, value: w.address, mono: true })),
    })
  }
  const secret = await loadWebhookSecret(root)
  const events = await loadWebhookEvents(root)
  add({
    id: 'data-webhook',
    group: 'data',
    status: !secret ? 'warn' : events.length ? 'ok' : 'info',
    title: !secret ? '還沒設定 MoonPay webhook（建議）' : events.length ? `已收到 ${events.length} 則 MoonPay 通知` : 'Webhook 已設定，還沒收到通知',
    detail: !secret
      ? '沒有 webhook 也能記帳，但只有一個 Pay Link 時才分得清錢是從哪來的。好幾個網站共用同一個錢包時，要靠 MoonPay 的通知才知道每筆錢屬於哪個 Pay Link。'
      : events.length
        ? '通知裡的交易編號會跟鏈上紀錄對起來；只有通知、鏈上還查不到的會標成「未核對」。'
        : '在你電腦上跑時，MoonPay 送不到 localhost。要在本機測試，得先用通道工具開一個公開網址（見「開始使用」第 3 步）。',
    fix: secret ? undefined : '到 MoonPay 後台 Developer → Endpoints → Add Endpoint，Webhook 選 Pay Link、Pay Link 選 All Pay Links，再把表單裡的 Secret 貼到「開始使用」第 3 步。',
    docHref: secret ? undefined : HOME,
  })

  // --- cashout readiness ---
  const max = config.maxDepositAddresses.filter((a) => a.chain === 'solana')
  add({
    id: 'cashout-address',
    group: 'cashout',
    status: max.length ? 'ok' : 'warn',
    title: max.length ? '已設定 MAX 的 Solana 入金地址' : '還沒設定 MAX 的 Solana 入金地址',
    detail: max.length ? '轉到這個地址的 USDC 會在收款紀錄標成「轉到 MAX」。' : '收款在哪條網路，就要用 MAX 同一條網路的地址。轉錯網路的資產無法找回。',
    fix: max.length ? undefined : '回「開始使用」第 4 步，貼上 MAX 的 Solana USDC 入金地址。',
    docHref: max.length ? undefined : HOME,
    facts: max.map((a) => ({ label: 'MAX 入金地址（Solana）', value: a.address, mono: true })),
  })
  add({ id: 'cashout-max-csv', group: 'cashout', status: 'info', title: '還沒有 MAX 出金紀錄', detail: 'MAX 沒有開放給第三方的 API，賣成台幣的紀錄要從 MAX 匯出 CSV 再匯入（匯入功能還在做）。' })

  const counts: Record<CheckStatus, number> = { ok: 0, warn: 0, fail: 0, info: 0 }
  for (const c of checks) counts[c.status] += 1

  return {
    checkedAt: new Date().toISOString(),
    paylinks: entries.flatMap((e) => {
      const p = e.preview
      if (!p) return []
      return [
        {
          id: e.id,
          label: nameOf(e),
          name: p.name,
          hostedUrl: p.hostedUrl,
          siteUrl: e.siteUrl,
          priceToken: p.priceToken,
          token: p.token,
          active: p.active,
          netPerSaleToken: unitsToDecimal((toUnits(p.priceToken, 6) * (10_000n - FEES.standardBps)) / 10_000n, 6),
        },
      ]
    }),
    fees: {
      standardPct: bpsPct(FEES.standardBps),
      helioXPct: bpsPct(FEES.helioXBps),
      swapPct: bpsPct(FEES.swapBps),
      offrampPct: bpsPct(FEES.offrampBps),
      source: FEE_SOURCE,
      asOf: FEE_AS_OF,
    },
    checks,
    counts,
  }
}
