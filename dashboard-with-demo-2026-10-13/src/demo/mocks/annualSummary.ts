// Generated fixture — shaped like backend output (FRONTEND_FIRST.md §5). Do not compute in the UI.
import type { AnnualSummary } from '../../types/ledger'

export const annualSummary2026: AnnualSummary = {
  "year": 2026,
  "asOf": "2026-10-08T06:20:00Z",
  "matchingMethod": "FIFO",
  "fxRateSource": "中央銀行每日參考匯率",
  "incomeEventCount": 14,
  "cashoutEventCount": 6,
  "totalIncomeTwd": "690074",
  "totalRealizedGainTwd": "1536",
  "totalRealizedLossTwd": "-3845",
  "totalCashoutTwd": "545710",
  "stillHeld": [
    {
      "chain": "solana",
      "token": "USDC",
      "amountToken": "3650.00"
    },
    {
      "chain": "base",
      "token": "USDC",
      "amountToken": "1180.00"
    }
  ],
  "unreconciledCashoutIds": [
    "out_02"
  ]
}
