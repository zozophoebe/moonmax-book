import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, PartyPopper } from 'lucide-react'
import type { SetupState } from '../../types/setup'
import { useResource } from '../../lib/useResource'
import { addPaylink, clearMaxAddress, clearWebhookToken, getSetup, removePaylink, saveMaxAddress, saveWebhookToken, updatePaylink } from '../../services/setup'
import { Card, SectionError, SkeletonBar } from '../../components/atoms'
import { FlowMap } from '../../components/setup/FlowMap'
import { StepShell, type StepTone } from '../../components/setup/StepShell'
import { MaxAddressStep, MaxImportStep, PaylinksStep, WalletsStep, WebhookStep } from '../../components/setup/Steps'
import { DontsCard, FeesCard, MoonPayMapCard, PrivacyCard, WhereThingsAre } from '../../components/setup/SideCards'
import { href } from '../router'
import { useT, type T } from '../../i18n'

type StepKey = 'paylinks' | 'wallets' | 'webhook' | 'max' | 'csv'
const REQUIRED: StepKey[] = ['paylinks', 'wallets', 'max']

function doneMap(s: SetupState): Record<StepKey, boolean> {
  return {
    paylinks: s.paylinks.some((p) => p.preview),
    wallets: s.wallets.some((w) => w.readable),
    webhook: s.webhook.configured,
    max: s.maxDepositAddresses.some((a) => a.chain === 'solana'),
    csv: s.maxImport.records > 0,
  }
}

function paylinkSummary(t: T, s: SetupState): string {
  const names = s.paylinks.map((p) => p.label ?? p.preview?.name ?? p.id)
  if (!names.length) return t('在 MoonPay Commerce 後台複製付款連結，貼回這裡。有幾個網站在收錢就加幾個。', 'Copy a payment link from MoonPay Commerce and paste it here — one for every site that takes payments.')
  return t(`${names.length} 個：${names.join('、')}`, `${names.length}: ${names.join(', ')}`)
}

function walletSummary(t: T, s: SetupState): string {
  if (!s.wallets.length) return t('加入 Pay Link 後，會自動找出錢會進哪個錢包，直接從區塊鏈讀。', 'Once a Pay Link is added, its receiving wallet is found automatically and read from the blockchain.')
  return s.wallets.map((w) => `${w.chain} ${w.address.slice(0, 4)}…${w.address.slice(-4)}${w.readable ? '' : t('（先靠 webhook）', ' (webhook for now)')}`).join(t('、', ', '))
}

export function HomePage() {
  const t = useT()
  const [initial, reload] = useResource(getSetup, [])
  const [override, setOverride] = useState<SetupState | null>(null)
  const setup = override ?? (initial.status === 'ready' ? initial.data : null)
  const [busy, setBusy] = useState<StepKey | null>(null)
  const [errors, setErrors] = useState<Partial<Record<StepKey, string>>>({})
  const [openSteps, setOpenSteps] = useState<Set<StepKey> | null>(null)

  const done = setup ? doneMap(setup) : null
  const current: StepKey | null = done ? (REQUIRED.find((k) => !done[k]) ?? null) : null
  const finished = done ? REQUIRED.filter((k) => done[k]).length : 0

  // Open the current step by default; after that the creator controls what is open.
  const lastCurrent = useRef<StepKey | null>(null)
  useEffect(() => {
    if (!setup || current === lastCurrent.current) return
    lastCurrent.current = current
    setOpenSteps((prev) => {
      const next = new Set(prev ?? [])
      if (current) next.add(current)
      return next
    })
  }, [setup, current])

  const toggle = (k: StepKey) =>
    setOpenSteps((prev) => {
      const next = new Set(prev ?? [])
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const run = useCallback(async (key: StepKey, fn: () => Promise<SetupState>) => {
    setBusy(key)
    setErrors((e) => ({ ...e, [key]: undefined }))
    try {
      setOverride(await fn())
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : String(err) }))
    } finally {
      setBusy(null)
    }
  }, [])

  const tone = (k: StepKey): StepTone => {
    if (!done) return 'todo'
    if (done[k]) return 'done'
    if (k === 'csv') return 'optional'
    if (k === 'webhook') return 'recommended'
    return k === current ? 'current' : 'todo'
  }
  const isOpen = (k: StepKey) => Boolean(openSteps?.has(k))
  const sharedWallet = setup?.wallets.some((w) => w.paylinkIds.length > 1) ?? false

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-32 pt-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-[640px]">
          <p className="text-[12.5px] font-medium tracking-[0.06em] text-primary-ink">{t('開始使用', 'Get started')}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] md:text-[30px]">
            {t('把國外收到的 USDC，變成一本能交給會計師的帳', 'Turn the USDC you earn abroad into books your accountant can use')}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.7] text-fg-3">
            {t(
              '照下面的步驟把 MoonPay 收款和 MAX 出金接起來，大約 15 分鐘。不需要 API 金鑰：收款從公開的區塊鏈讀，每筆屬於哪個網站靠 MoonPay 的通知分辨。',
              'Connect MoonPay payments and MAX cash-outs in about 15 minutes. No API keys: payments are read from the public blockchain, and MoonPay’s notifications say which site each one came from.',
            )}
          </p>
        </div>
        <ProgressCard finished={finished} total={REQUIRED.length} ready={Boolean(setup)} />
      </header>

      <div className="mt-6">
        <FlowMap setup={setup} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-3">
          {initial.status === 'loading' && !override ? (
            Array.from({ length: 4 }, (_, i) => <SkeletonBar key={i} className="h-[76px] rounded-xl" />)
          ) : initial.status === 'error' && !override ? (
            <Card>
              <SectionError title={t('讀不到設定', 'Couldn’t load your setup')} error={initial.error} onRetry={reload} />
            </Card>
          ) : setup && done ? (
            <>
              <StepShell n={1} title={t('加入你的 Pay Link', 'Add your Pay Links')} summary={paylinkSummary(t, setup)} tone={tone('paylinks')} minutes={3} open={isOpen('paylinks')} onToggle={() => toggle('paylinks')}>
                <PaylinksStep
                  setup={setup}
                  busy={busy === 'paylinks'}
                  error={errors.paylinks ?? null}
                  onAdd={(input, label) => run('paylinks', () => addPaylink(input, label))}
                  onUpdate={(id, patch) => run('paylinks', () => updatePaylink(id, patch))}
                  onRemove={(id) => run('paylinks', () => removePaylink(id))}
                />
              </StepShell>

              <StepShell n={2} title={t('確認收款錢包', 'Check your receiving wallets')} summary={walletSummary(t, setup)} tone={tone('wallets')} minutes={1} open={isOpen('wallets')} onToggle={() => toggle('wallets')}>
                <WalletsStep setup={setup} open={isOpen('wallets')} />
              </StepShell>

              <StepShell
                n={3}
                title={t('設定 MoonPay 通知（webhook）', 'Set up MoonPay notifications (webhook)')}
                summary={
                  setup.webhook.configured
                    ? t(`已設定 · 收到 ${setup.webhook.eventCount} 則通知`, `Set up · ${setup.webhook.eventCount} notification${setup.webhook.eventCount === 1 ? '' : 's'} received`)
                    : sharedWallet
                      ? t('你有幾個 Pay Link 共用同一個錢包，要靠通知才分得出錢是從哪個網站來的。', 'Several of your Pay Links share a wallet — only notifications can tell which site each payment came from.')
                      : t('讓每筆收款自動標上是哪個 Pay Link。只有一個 Pay Link 可以先跳過。', 'Tags every payment with its Pay Link. With only one Pay Link you can skip this for now.')
                }
                tone={tone('webhook')}
                minutes={5}
                open={isOpen('webhook')}
                onToggle={() => toggle('webhook')}
              >
                <WebhookStep setup={setup} busy={busy === 'webhook'} error={errors.webhook ?? null} onSave={(t) => run('webhook', () => saveWebhookToken(t))} onClear={() => run('webhook', clearWebhookToken)} />
              </StepShell>

              <StepShell n={4} title={t('設定 MAX 出金地址', 'Set your MAX deposit address')} summary={done.max ? t('已設定 Solana USDC 入金地址。', 'Solana USDC deposit address set.') : t('出金時要用 MAX 上「同一條網路」的地址。', 'Cash out to the MAX address on the same network.')} tone={tone('max')} minutes={5} open={isOpen('max')} onToggle={() => toggle('max')}>
                <MaxAddressStep setup={setup} busy={busy === 'max'} error={errors.max ?? null} onSave={(v) => run('max', () => saveMaxAddress(v))} onClear={() => run('max', clearMaxAddress)} />
              </StepShell>

              <StepShell
                n={5}
                title={t('匯入 MAX 紀錄，開始對帳', 'Import MAX records and reconcile')}
                summary={
                  setup.maxImport.records
                    ? t(`已匯入 ${setup.maxImport.records} 筆 MAX 紀錄`, `${setup.maxImport.records} MAX record${setup.maxImport.records > 1 ? 's' : ''} imported`)
                    : t('把 MAX 匯出的 CSV 放進來：對到你的收款、算匯率差，你另外轉進去的也會標出來。', 'Drop in MAX’s CSV: deposits are matched to your income with the exchange-rate difference, and anything extra you sent is marked.')
                }
                tone={tone('csv')}
                minutes={3}
                open={isOpen('csv')}
                onToggle={() => toggle('csv')}
              >
                <MaxImportStep setup={setup} onChanged={() => run('csv', getSetup)} onUseAddress={(a) => run('max', () => saveMaxAddress(a))} />
              </StepShell>

              {!current ? (
                <div className="animate-rise flex items-start gap-3 rounded-xl border border-success/25 bg-success-soft/60 px-5 py-4">
                  <PartyPopper className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                  <div>
                    <p className="text-[14.5px] font-semibold">{t('必要的步驟都接好了', 'The required steps are done')}</p>
                    <p className="mt-0.5 text-[13px] leading-[1.7] text-fg-2">
                      {t(
                        '收款紀錄已經從區塊鏈讀進來，依 Pay Link 分開列。MAX 出金的 CSV 匯入完成後，年度帳本和 FIFO 對帳會接在後面。',
                        'Your receipts are read from the blockchain and listed by Pay Link. Once MAX CSV import is ready, the yearly ledger and FIFO matching follow.',
                      )}
                    </p>
                    <a href={href('#/receipts')} className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
                      {t('看收款紀錄', 'See receipts')}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </a>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <MoonPayMapCard />
          <WhereThingsAre />
          <FeesCard />
          <DontsCard />
          <PrivacyCard />
        </aside>
      </div>
    </div>
  )
}

function ProgressCard({ finished, total, ready }: { finished: number; total: number; ready: boolean }) {
  const t = useT()
  return (
    <div className="animate-rise w-full rounded-xl border border-border bg-card px-4 py-3.5 shadow-sheet md:max-w-[280px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] text-fg-3">{t('必要步驟', 'Required steps')}</p>
        <p className="num text-[13px] text-fg-2">
          {ready ? (
            <>
              <span className="text-[20px] font-semibold text-fg">{finished}</span> / {total}
            </>
          ) : (
            '—'
          )}
        </p>
      </div>
      <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full ${i < finished ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-fg-3">{ready && finished === total ? t('全部完成', 'All done') : t('第 3、5 步建議做，不算在必要步驟裡', 'Steps 3 and 5 are recommended but not required')}</p>
    </div>
  )
}
