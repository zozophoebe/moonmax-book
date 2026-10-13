import { useState } from 'react'
import { Check, Copy, ExternalLink, Plus, ShieldAlert } from 'lucide-react'
import type { DepositAddress, HeldBalance } from '../types/ledger'
import { CHAIN_LABEL, formatTokenAmount, isZero } from '../lib/format'
import { Button, ChainBadge, Eyebrow } from './atoms'

const MAX_URL = 'https://max.maicoin.com/'

export function DepositAddressPanel({
  addresses,
  held,
  onCopy,
  onAddAddress,
}: {
  addresses: DepositAddress[]
  held: HeldBalance[] | 'loading' | 'unavailable'
  onCopy: (address: DepositAddress) => void
  onAddAddress: () => void
}) {
  return (
    <div className="px-5 py-5">
      <Eyebrow>出金到 MAX</Eyebrow>
      <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">入金地址對照表</h2>
      <p className="mt-1 text-[13px] leading-[1.7] text-fg-2">錢在哪條網路上，就只能轉到同一條網路的 MAX 地址。</p>

      {addresses.length === 0 ? (
        <div className="mt-4 rounded-[10px] border border-dashed border-border-strong px-4 py-5 text-center">
          <p className="text-[14px] font-medium">還沒有設定入金地址</p>
          <p className="mt-1 text-[12.5px] text-fg-2">在 MAX 開好帳戶後，把各網路的 USDC 入金地址貼到這裡。</p>
          <Button size="sm" className="mt-3" onClick={onAddAddress}>
            <Plus className="size-[14px]" aria-hidden />
            新增入金地址
          </Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {addresses.map((a) => (
            <AddressCard
              key={`${a.chain}-${a.token}`}
              address={a}
              held={Array.isArray(held) ? (held.find((h) => h.chain === a.chain && h.token === a.token)?.amountToken ?? '0') : held}
              onCopy={() => onCopy(a)}
            />
          ))}
        </ul>
      )}

      {addresses.length === 0 ? null : (
      <a
        href={MAX_URL}
        target="_blank"
        rel="noreferrer"
        className="focus-ring mt-4 flex h-10 items-center justify-center gap-2 rounded-[8px] border border-border bg-card text-[14px] font-medium text-fg shadow-sheet transition-transform duration-150 hover:bg-muted active:scale-[0.97]"
      >
        前往 MAX 賣出並提領
        <ExternalLink className="size-4" aria-hidden />
      </a>
      )}
      <p className="mt-3 text-[12px] leading-[1.7] text-fg-3">
        MoonMax Book 不會替你操作 MAX，也碰不到你的資金。{addresses.length === 0 ? '' : '這些地址是你在 MAX 開戶後自己貼上的。'}
      </p>
    </div>
  )
}

function AddressCard({
  address,
  held,
  onCopy,
}: {
  address: DepositAddress
  held: string | 'loading' | 'unavailable'
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)
  const chain = CHAIN_LABEL[address.chain]

  const copy = () => {
    void navigator.clipboard?.writeText(address.address)
    setCopied(true)
    onCopy()
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <li className="rounded-[10px] border border-border bg-muted">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
        <span className="flex items-center gap-2">
          <ChainBadge chain={address.chain} />
          <span className="num text-[12px] text-fg-3">{address.token}</span>
        </span>
        <span className="text-right text-[12px] text-fg-2">
          {held === 'loading' ? (
            <span className="text-fg-3">餘額讀取中…</span>
          ) : held === 'unavailable' ? (
            <span className="text-fg-3">餘額暫時讀不到</span>
          ) : isZero(held) ? (
            <span className="text-fg-3">目前沒有餘額</span>
          ) : (
            <>
              這條網路還有 <span className="num font-medium text-fg">{formatTokenAmount(held)}</span> {address.token}
            </>
          )}
        </span>
      </div>

      <div className="mt-2.5 flex items-start gap-2 px-3.5">
        <code className="font-mono min-w-0 flex-1 break-all rounded-[6px] border border-border bg-card px-2.5 py-2 text-[12.5px] leading-[1.6] text-fg">
          {address.address}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`複製 ${chain} 入金地址`}
          className="focus-ring grid size-9 shrink-0 place-items-center rounded-[6px] border border-border-strong bg-card text-fg-2 transition-transform duration-150 hover:border-fg-3 hover:text-fg active:scale-[0.92]"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 rounded-b-[10px] border-t border-border px-3.5 py-2.5 text-[12px] leading-[1.6] text-fg-2">
        <ShieldAlert className="mt-[2px] size-[14px] shrink-0 text-danger" aria-hidden />
        <span>
          只能轉入 <strong className="font-medium text-fg">{chain} 網路</strong>的 {address.token}。轉錯網路的資產無法找回。
        </span>
      </p>
    </li>
  )
}
