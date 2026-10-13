import type { ReceiptsView } from '../types/receipts'
import { getJson } from './http'

// Read from the public chain and labelled by MoonPay webhooks.
export const getReceipts = () => getJson<ReceiptsView>('/api/real/receipts')
