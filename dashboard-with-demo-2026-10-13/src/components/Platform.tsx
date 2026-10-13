import { ArrowRight, CircleCheck, CircleX, ExternalLink, Info, TriangleAlert } from 'lucide-react'
import type { CheckGroup, CheckStatus, PlatformCheck, PlatformStatus } from '../types/platform'
import { formatDateTime } from '../lib/format'
import { Card, Eyebrow } from './atoms'

const STATUS: Record<CheckStatus, { label: string; Icon: typeof CircleCheck; icon: string; badge: string }> = {
  fail: { label: '問題', Icon: CircleX, icon: 'text-danger', badge: 'bg-danger-soft text-danger-deep border-danger/20' },
  warn: { label: '提醒', Icon: TriangleAlert, icon: 'text-warn', badge: 'bg-warn-soft text-warn border-warn/20' },
  ok: { label: '正常', Icon: CircleCheck, icon: 'text-success', badge: 'bg-success-soft text-success border-success/20' },
  info: { label: '資訊', Icon: Info, icon: 'text-fg-3', badge: 'bg-muted text-fg-3 border-border' },
}
const ORDER: CheckStatus[] = ['fail', 'warn', 'ok', 'info']

const GROUPS: { key: CheckGroup; label: string; hint: string }[] = [
  { key: 'paylink', label: 'MoonPay 付款連結', hint: '讀 MoonPay 公開的付款連結設定' },
  { key: 'site', label: '你的網站', hint: '讀每個 Pay Link 填的上線網站' },
  { key: 'data', label: '帳本資料從哪來', hint: '區塊鏈＋MoonPay 通知，不用 API 金鑰' },
  { key: 'account', label: '帳號與驗證', hint: 'MoonPay Commerce 帳號狀態' },
  { key: 'cashout', label: '出金準備', hint: '收到的錢怎麼變成台幣' },
]

export function CountsStrip({ counts }: { counts: PlatformStatus['counts'] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ORDER.map((s) => {
        const { label, Icon, icon } = STATUS[s]
        return (
          <div key={s} className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sheet">
            <dt className="flex items-center gap-1.5 text-[12.5px] text-fg-3">
              <Icon className={`size-4 ${icon}`} aria-hidden />
              {label}
            </dt>
            <dd className="num mt-1 text-[26px] font-semibold tracking-[-0.03em]">{counts[s]}</dd>
          </div>
        )
      })}
    </dl>
  )
}

export function CheckGroups({ checks }: { checks: PlatformCheck[] }) {
  return (
    <div className="space-y-6">
      {GROUPS.map((g, gi) => {
        const items = checks
          .filter((c) => c.group === g.key)
          .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
        if (items.length === 0) return null
        return (
          <Card key={g.key} delay={gi * 50}>
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">{g.label}</h2>
              <span className="text-[12px] text-fg-3">{g.hint}</span>
            </div>
            <ul className="divide-y divide-border">
              {items.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

function CheckRow({ check }: { check: PlatformCheck }) {
  const { label, Icon, icon, badge } = STATUS[check.status]
  const loud = check.status === 'fail' || check.status === 'warn'
  return (
    <li id={`check-${check.id}`} className="flex gap-3 px-5 py-4">
      <Icon className={`mt-[3px] size-[18px] shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className={`text-[14.5px] ${loud ? 'font-semibold' : 'font-medium'}`}>{check.title}</p>
          <span className={`rounded-md border px-1.5 text-[11.5px] leading-5 ${badge}`}>{label}</span>
        </div>
        <p className="mt-0.5 text-[13.5px] leading-[1.7] text-fg-2">{check.detail}</p>

        {check.facts?.length ? (
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-[12.5px]">
            {check.facts.map((f, i) => (
              <div key={`${f.label}-${i}`} className="contents">
                <dt className="text-fg-3">{f.label}</dt>
                <dd className={`min-w-0 break-all text-fg ${f.mono ? 'font-mono' : ''}`}>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {check.fix ? (
          <div className={`mt-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-[1.7] ${check.status === 'fail' ? 'border-danger/20 bg-danger-soft/60' : 'border-border bg-card'}`}>
            <span className="font-medium text-fg">怎麼處理：</span>
            <span className="text-fg-2">{check.fix}</span>
          </div>
        ) : null}

        {check.docHref ? (
          <a
            href={`${window.location.search}${check.docHref}`}
            className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-fg"
          >
            看說明文件
            <ArrowRight className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </li>
  )
}

export function PaylinkSummary({ status }: { status: PlatformStatus }) {
  const { paylinks, fees } = status
  return (
    <div className="space-y-6">
      <Card delay={40}>
        <div className="px-5 py-5">
          <Eyebrow>你的收款來源</Eyebrow>
          {paylinks.length ? (
            <ul className="mt-2 divide-y divide-border">
              {paylinks.map((p) => (
                <li key={p.id} className="py-3 first:pt-1.5 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[14.5px] font-semibold leading-snug">{p.label}</p>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 text-[11.5px] leading-5 ${p.active ? 'border-success/20 bg-success-soft text-success' : 'border-danger/20 bg-danger-soft text-danger-deep'}`}
                    >
                      {p.active ? '啟用中' : '已停用'}
                    </span>
                  </div>
                  {p.label !== p.name ? <p className="text-[12.5px] text-fg-3">{p.name}</p> : null}
                  <p className="num mt-1.5 text-[20px] font-semibold tracking-[-0.02em]">
                    {p.priceToken} <span className="text-[13px] font-medium text-fg-3">{p.token}</span>
                  </p>
                  <p className="text-[12px] text-fg-3">
                    扣 {fees.standardPct}% 手續費後每筆實收約 <span className="num text-fg-2">{p.netPerSaleToken}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
                    <a href={p.hostedUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded text-fg-2 hover:text-fg">
                      付款頁
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                    {p.siteUrl ? (
                      <a href={p.siteUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded text-fg-2 hover:text-fg">
                        網站
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-fg-2">還沒加入付款連結。</p>
          )}
        </div>
      </Card>

      <Card delay={90}>
        <div className="px-5 py-5">
          <Eyebrow>MoonPay Commerce 費用</Eyebrow>
          <dl className="mt-3 divide-y divide-border text-[13.5px]">
            {[
              ['交易手續費（標準）', `${fees.standardPct}%`],
              ['交易手續費（HelioX 會員）', `${fees.helioXPct}%`],
              ['買家用其他幣付款（Swap）', `+${fees.swapPct}%`],
              ['自動換成法幣（Auto-offramp）', `+${fees.offrampPct}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-fg-2">{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] leading-[1.7] text-fg-3">
            來源：{fees.source}（{fees.asOf} 查詢）。費率以 MoonPay Commerce 官方為準；自動換成法幣是否支援台幣，要在後台確認。
          </p>
        </div>
      </Card>

      <p className="px-1 text-[12px] leading-[1.7] text-fg-3">檢查時間 {formatDateTime(status.checkedAt)}</p>
    </div>
  )
}
