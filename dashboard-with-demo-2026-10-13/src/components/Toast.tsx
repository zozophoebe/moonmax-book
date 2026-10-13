import { CircleCheck, Info } from 'lucide-react'

export type ToastMessage = { id: number; tone: 'success' | 'info'; text: string }

export function Toast({ message }: { message: ToastMessage | null }) {
  if (!message) return null
  const Icon = message.tone === 'success' ? CircleCheck : Info
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        key={message.id}
        role="status"
        className="animate-rise flex max-w-md items-start gap-2.5 rounded-[10px] bg-fg px-4 py-3 text-[13.5px] leading-[1.6] text-card shadow-float"
      >
        <Icon className={`mt-[3px] size-4 shrink-0 ${message.tone === 'success' ? 'text-primary' : 'text-border'}`} aria-hidden />
        <span>{message.text}</span>
      </div>
    </div>
  )
}
