import type { MaxImportResult, ReconView } from '../types/max'
import { getJson, sendJson } from './http'

export const getRecon = () => getJson<ReconView>('/api/max/recon')
export const importMaxCsv = (fileName: string, text: string) => sendJson<MaxImportResult>('/api/max/import', 'POST', { fileName, text })
export const clearMaxImport = () => sendJson<{ ok: true }>('/api/max/import', 'DELETE')
