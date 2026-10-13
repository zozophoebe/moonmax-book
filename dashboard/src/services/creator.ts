import type { Creator } from '../types/ledger'
import { getJson } from './http'

export const getCreator = () => getJson<Creator>('/api/real/creator')
