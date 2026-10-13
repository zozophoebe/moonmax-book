import type { SourceStatus } from '../../types/ledger'

export const mockSourceStatus: SourceStatus = {
  moonpayCommerce: { connected: true, lastSyncedAt: '2026-10-08T06:20:00Z' },
  max: { method: 'csv', lastImportedAt: '2026-10-05T12:31:00Z', fileName: 'MAX_交易紀錄_2026-10-05.csv' },
}

export const mockSourceStatusEmpty: SourceStatus = {
  moonpayCommerce: { connected: false, lastSyncedAt: null },
  max: { method: 'none', lastImportedAt: null, fileName: null },
}
