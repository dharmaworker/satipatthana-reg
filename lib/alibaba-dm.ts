import { createHmac } from 'crypto'

export const STATUS_LABEL: Record<string, string> = {
  '0': 'delivered',
  '2': 'invalid',
  '3': 'spam',
  '4': 'failed',
}

export interface MailRecord {
  ToAddress?: string
  AccountName?: string
  Subject?: string
  Status?: number | string
  Message?: string
  LastUpdateTime?: string
  ErrorClassification?: string
  IpPoolId?: string
  IpPoolName?: string
  ConfigSetId?: string
  ConfigSetName?: string
}

export interface MatchRow {
  sentAt: string  // parseable datetime string, e.g. "2026-06-01 19:49:11"
  email: string
}

export interface MatchOpts {
  windowMs?: number                                         // buffer on fetch range edges, default 1 min
  onChunk?: (start: Date, end: Date) => void
  onMatch: (row: MatchRow, record: MailRecord) => void
  onUnmatched: (row: MatchRow) => void
}

/**
 * Fetches DirectMail statistics for the time range of `rows` (±windowMs buffer),
 * then matches each row to API records by email address.
 * `rows` must be sorted descending by sentAt.
 */
export async function matchRecords(
  client: DirectMailClient,
  rows: MatchRow[],
  opts: MatchOpts,
): Promise<void> {
  const { windowMs = 60 * 1000, onChunk, onMatch, onUnmatched } = opts
  if (rows.length === 0) return

  const times = rows.map(r => new Date(r.sentAt).getTime())
  const rangeStart = new Date(Math.min(...times) - windowMs)
  const rangeEnd   = new Date(Math.max(...times) + windowMs)

  const allRecords = await client.fetchStatistics(rangeStart, rangeEnd, {}, { onChunk })

  const byEmail = new Map<string, MailRecord[]>()
  for (const r of allRecords) {
    const key = (r.ToAddress ?? '').toLowerCase()
    const bucket = byEmail.get(key) ?? []
    bucket.push(r)
    byEmail.set(key, bucket)
  }

  for (const row of rows) {
    const matches = byEmail.get(row.email.toLowerCase()) ?? []
    if (matches.length === 0) {
      onUnmatched(row)
    } else {
      for (const record of matches) onMatch(row, record)
    }
  }
}

export interface SuppressedRecord {
  Mail?: string
  Reason?: string
  CreateTime?: string
}

export interface DirectMailClient {
  call(action: string, params?: Record<string, string>): Promise<unknown>
  fetchStatisticsRange(start: Date, end: Date, extraParams?: Record<string, string>): Promise<MailRecord[]>
  fetchStatistics(start: Date, end: Date, extraParams?: Record<string, string>, opts?: { onChunk?: (start: Date, end: Date) => void }): Promise<MailRecord[]>
  getSuppressedAddress(email: string): Promise<SuppressedRecord[]>
}

function percentEncode(s: string): string {
  return encodeURIComponent(String(s))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function sign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort()
  const qs = sorted.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(qs)}`
  return createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64')
}

export function createDirectMailClient({ keyId, keySecret, region = 'ap-southeast-1' }: {
  keyId: string
  keySecret: string
  region?: string
}): DirectMailClient {
  const endpoint = `https://dm.${region}.aliyuncs.com`

  function buildUrl(action: string, extra: Record<string, string> = {}): string {
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
    const nonce = Math.random().toString(36).slice(2) + Date.now()
    const params: Record<string, string> = {
      Action: action, AccessKeyId: keyId, Format: 'JSON', Version: '2015-11-23',
      SignatureMethod: 'HMAC-SHA1', SignatureVersion: '1.0', SignatureNonce: nonce,
      Timestamp: now, ...extra,
    }
    params.Signature = sign(params, keySecret)
    const qs = Object.keys(params).map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
    return `${endpoint}/?${qs}`
  }

  async function call(action: string, params: Record<string, string> = {}): Promise<unknown> {
    const res = await fetch(buildUrl(action, params))
    const data = await res.json() as { Code?: string; Message?: string }
    if (data.Code) throw new Error(`${data.Code}: ${data.Message}`)
    return data
  }

  // DirectMail API time params are CST (UTC+8)
  const fmt = (d: Date) => new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')

  async function fetchStatisticsRange(start: Date, end: Date, extraParams: Record<string, string> = {}): Promise<MailRecord[]> {
    const records: MailRecord[] = []
    let nextStart = ''
    do {
      const params: Record<string, string> = { StartTime: fmt(start), EndTime: fmt(end), Length: '100', ...extraParams }
      if (nextStart) params.NextStart = nextStart
      const data = await call('SenderStatisticsDetailByParam', params) as { data?: { mailDetail?: MailRecord[]; nextStart?: string } }
      records.push(...(data.data?.mailDetail ?? []))
      nextStart = data.data?.nextStart ?? ''
    } while (nextStart)
    return records
  }

  async function fetchStatistics(
    start: Date, end: Date,
    extraParams: Record<string, string> = {},
    { onChunk }: { onChunk?: (start: Date, end: Date) => void } = {},
  ): Promise<MailRecord[]> {
    const MAX_MS = 30 * 24 * 60 * 60 * 1000
    const records: MailRecord[] = []
    let cursor = start
    while (cursor < end) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + MAX_MS, end.getTime()))
      onChunk?.(cursor, chunkEnd)
      records.push(...await fetchStatisticsRange(cursor, chunkEnd, extraParams))
      cursor = chunkEnd
    }
    return records
  }

  async function getSuppressedAddress(email: string): Promise<SuppressedRecord[]> {
    const data = await call('GetSuppressedAddress', { Mail: email }) as { SuppressedRecords?: { SuppressedRecord?: SuppressedRecord[] } }
    return data.SuppressedRecords?.SuppressedRecord ?? []
  }

  return { call, fetchStatistics, fetchStatisticsRange, getSuppressedAddress }
}
