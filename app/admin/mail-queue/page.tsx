'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fmtMailType } from '@/lib/mail-labels'

const POLL_INTERVAL = 30_000

// ─── types ───────────────────────────────────────────────────────────────────

type QueueRow = {
  id: string
  to_email: string
  subject: string | null
  mail_type: string | null
  provider: string
  status: string
  attempt_count: number | null
  created_at: string
  error: string | null
  parent_id: string | null
  batch_id: string | null
}

type BatchRow = {
  id: string
  triggered_from: string | null
  recipient_count: number
  created_at: string
  description: string | null
}

type TreeRow = QueueRow & { children: QueueRow[] }

// ─── helpers ─────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id.slice(0, 8)
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function buildTree(rows: QueueRow[]): TreeRow[] {
  const byId: Record<string, TreeRow> = {}
  const roots: TreeRow[] = []
  const orphanChildren: QueueRow[] = []

  for (const r of rows) {
    byId[r.id] = { ...r, children: [] }
  }

  for (const r of rows) {
    if (!r.parent_id) {
      roots.push(byId[r.id])
    } else if (byId[r.parent_id]) {
      byId[r.parent_id].children.push(r)
    } else {
      orphanChildren.push(r)
    }
  }

  // orphan retries (parent not in result set) appended at end
  for (const r of orphanChildren) {
    roots.push({ ...r, children: [] })
  }

  return roots
}

// ─── status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  sent:        'background:#d1fae5;color:#065f46',
  delivered:   'background:#d1fae5;color:#065f46',
  pending:          'background:#fef3c7;color:#92400e',
  processing:       'background:#fef3c7;color:#92400e',
  delivery_delayed: 'background:#fef3c7;color:#92400e',
  failed:      'background:#fee2e2;color:#991b1b',
  bounced:     'background:#fee2e2;color:#991b1b',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? 'background:#f3f4f6;color:#374151'
  return (
    <span style={{
      ...Object.fromEntries(style.split(';').map(s => {
        const [k, v] = s.split(':')
        return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()]
      })),
      padding: '1px 7px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

// ─── queue table ─────────────────────────────────────────────────────────────

function QueueTable({
  rows,
  selected,
  onToggle,
  onPreview,
}: {
  rows: TreeRow[]
  selected: Set<string>
  onToggle: (id: string) => void
  onPreview: (id: string) => void
}) {
  if (!rows.length) {
    return <div style={{ color: '#6b7280', padding: '24px 0', textAlign: 'center' }}>無資料</div>
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: '2px solid #e5e7eb',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#6b7280',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontFamily: 'monospace',
    fontSize: 12,
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  }

  const renderRow = (r: QueueRow, indent: 0 | 1 | 2, prefix: string, isOrphan = false) => {
    const isParent = indent === 0
    const bg = indent === 1 ? '#f9fafb' : indent === 2 ? '#f3f4f6' : undefined
    return (
      <tr key={r.id} style={{ background: bg, borderBottom: '1px solid #f3f4f6' }}>
        <td style={{ ...tdStyle, width: 28, textAlign: 'center' }}>
          {isParent && !isOrphan && (
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => onToggle(r.id)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </td>
        <td style={{ ...tdStyle, width: 110 }}>
          {indent > 0 ? (
            <span style={{ color: '#9ca3af', marginRight: 4 }}>{prefix}</span>
          ) : isOrphan ? (
            <span style={{ color: '#f59e0b', marginRight: 4 }}>↳</span>
          ) : null}
          <span style={{ color: isParent && !isOrphan ? '#111827' : '#6b7280' }}>
            {shortId(r.id)}
          </span>
        </td>
        <td style={{ ...tdStyle, width: 160, color: '#6b7280' }}>{fmtDate(r.created_at)}</td>
        <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.to_email}>
          <button
            onClick={() => onPreview(r.id)}
            title="預覽郵件內容"
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: '#f9fafb',
              cursor: 'pointer',
              fontSize: 13,
              padding: '1px 6px',
              color: '#374151',
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          >👁</button>
          {r.to_email}
        </td>
        <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#374151' }} title={r.subject ?? ''}>
          {r.subject ?? '—'}
        </td>
        <td style={{ ...tdStyle, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', color: '#6b7280' }}>
          {fmtMailType(r.mail_type, r.subject)}
        </td>
        <td style={{ ...tdStyle, width: 80, color: '#6b7280' }}>{r.provider}</td>
        <td style={{ ...tdStyle, width: 100 }}>
          <StatusBadge status={r.status} />
        </td>
        <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#ef4444', fontSize: 11 }} title={r.error ?? ''}>
          {r.error ?? ''}
        </td>
      </tr>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 28 }} />
            <th style={thStyle}>id</th>
            <th style={thStyle}>created_at</th>
            <th style={thStyle}>to_email</th>
            <th style={thStyle}>subject</th>
            <th style={thStyle}>mail_type</th>
            <th style={thStyle}>provider</th>
            <th style={thStyle}>status</th>
            <th style={thStyle}>error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(parent => {
            const isOrphan = !!parent.parent_id
            const childRows = parent.children ?? []
            return [
              renderRow(parent, 0, '', isOrphan),
              ...childRows.map((child, i) => {
                const isLast = i === childRows.length - 1
                const prefix = isLast ? '└─' : '├─'
                return renderRow(child, 1, prefix)
              }),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── batch table ─────────────────────────────────────────────────────────────

function BatchTable({ batches, onSelect }: { batches: BatchRow[]; onSelect: (id: string) => void }) {
  if (!batches.length) {
    return <div style={{ color: '#6b7280', padding: '24px 0', textAlign: 'center' }}>無資料</div>
  }
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: '2px solid #e5e7eb',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#6b7280',
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px',
    fontFamily: 'monospace',
    fontSize: 12,
    borderBottom: '1px solid #f3f4f6',
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>id</th>
            <th style={thStyle}>created_at</th>
            <th style={thStyle}>triggered_from</th>
            <th style={{ ...thStyle, width: 60 }}>count</th>
            <th style={thStyle}>description</th>
          </tr>
        </thead>
        <tbody>
          {batches.map(b => (
            <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(b.id)}>
              <td style={{ ...tdStyle, color: '#2563eb', textDecoration: 'underline' }}>{shortId(b.id)}</td>
              <td style={{ ...tdStyle, color: '#6b7280' }}>{fmtDate(b.created_at)}</td>
              <td style={{ ...tdStyle, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.triggered_from ?? '—'}
              </td>
              <td style={tdStyle}>{b.recipient_count}</td>
              <td style={{ ...tdStyle, color: '#374151' }}>{b.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

const HOURS_OPTIONS = [
  { label: '1h', value: '1' },
  { label: '6h', value: '6' },
  { label: '24h', value: '24' },
  { label: '48h', value: '48' },
  { label: '7d', value: '168' },
  { label: 'all', value: 'all' },
]

const STATUS_OPTIONS = ['pending', 'processing', 'sent', 'delivered', 'delivery_delayed', 'failed', 'bounced']

const STATUS_DOT: Record<string, string> = {
  sent:             '#10b981',
  delivered:        '#10b981',
  pending:          '#f59e0b',
  processing:       '#f59e0b',
  delivery_delayed: '#f59e0b',
  failed:           '#ef4444',
  bounced:          '#ef4444',
}

function StatusDropdown({
  selected,
  onChange,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (s: string) => {
    const next = new Set(selected)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    onChange(next)
  }

  const label = selected.size === 0
    ? '全部狀態'
    : selected.size === 1
      ? Array.from(selected)[0]
      : `${selected.size} 個狀態`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          border: '1px solid #d1d5db', borderRadius: 4,
          padding: '4px 10px', fontSize: 13, fontFamily: 'monospace',
          background: '#fff', color: '#111827', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}
      >
        {label}
        <span style={{ fontSize: 10, color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0',
        }}>
          {/* All option */}
          <div
            onClick={() => onChange(new Set())}
            style={{
              padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: 10,
              background: selected.size === 0 ? '#f0f9ff' : 'transparent',
              color: '#374151',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #9ca3af', display: 'inline-block', flexShrink: 0 }} />
            全部狀態
            {selected.size === 0 && <span style={{ marginLeft: 'auto', color: '#2563eb' }}>✓</span>}
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '2px 0' }} />
          {STATUS_OPTIONS.map(s => (
            <div
              key={s}
              onClick={() => toggle(s)}
              style={{
                padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', gap: 10,
                background: selected.has(s) ? '#f0f9ff' : 'transparent',
                color: '#374151',
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: STATUS_DOT[s] ?? '#9ca3af', display: 'inline-block',
              }} />
              {s}
              {selected.has(s) && <span style={{ marginLeft: 'auto', color: '#2563eb' }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
const PROVIDER_OPTIONS = ['all', 'alicloud', 'resend', 'gmail']
const RETRY_PROVIDERS = ['alicloud', 'resend', 'gmail']

export default function MailQueuePage() {
  const router = useRouter()

  // auth
  const [authChecked, setAuthChecked] = useState(false)

  // tab
  const [tab, setTab] = useState<'queue' | 'batches'>('queue')

  // filters
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())
  const [hoursFilter, setHoursFilter] = useState('24')
  const [searchText, setSearchText] = useState('')
  const [soloFilter, setSoloFilter] = useState(false)
  const [batchFilter, setBatchFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [limitFilter, setLimitFilter] = useState('200')

  // data
  const [rows, setRows] = useState<TreeRow[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // retry
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [retryProvider, setRetryProvider] = useState('resend')
  const [retrying, setRetrying] = useState(false)

  // reconcile
  const [reconciling, setReconciling] = useState(false)

  // preview
  const [preview, setPreview] = useState<{ id: string; subject: string | null; to_email: string; html: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // auto-poll
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/admin/me').then(r => {
      if (!r.ok) router.push('/admin/login')
      else setAuthChecked(true)
    })
  }, [router])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setMessage('')
    const params = new URLSearchParams()
    if (statusFilter.size > 0) params.set('status', Array.from(statusFilter).join(','))
    params.set('hours', hoursFilter)
    if (searchText.trim()) params.set('search', searchText.trim())
    if (soloFilter) params.set('solo', 'true')
    if (batchFilter.trim()) params.set('batch', batchFilter.trim())
    if (providerFilter !== 'all') params.set('provider', providerFilter)
    params.set('limit', limitFilter)

    const res = await fetch(`/api/admin/mail-queue/list?${params}`)
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setMessage('錯誤：' + json.error); return }
    if (json.warning) setMessage(json.warning)
    setRows(buildTree(json.rows ?? []))
    setSelected(new Set())
    setLastRefresh(new Date())
  }, [statusFilter, hoursFilter, searchText, soloFilter, batchFilter, providerFilter])

  const loadBatches = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/mail-queue/batches')
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setMessage('錯誤：' + json.error); return }
    setBatches(json.batches ?? [])
  }, [])

  useEffect(() => {
    if (!authChecked) return
    if (tab === 'queue') loadQueue()
    else loadBatches()
  }, [authChecked, tab, loadQueue, loadBatches])

  // auto-poll: only on queue tab
  useEffect(() => {
    if (!authChecked || tab !== 'queue') return
    if (pollRef.current) clearInterval(pollRef.current)
    if (autoRefresh) {
      pollRef.current = setInterval(loadQueue, POLL_INTERVAL)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [authChecked, tab, autoRefresh, loadQueue])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRetry = async () => {
    if (!selected.size) return
    setRetrying(true)
    setMessage('')
    const res = await fetch('/api/admin/mail-queue/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), provider: retryProvider }),
    })
    const json = await res.json()
    setRetrying(false)
    if (!res.ok) { setMessage('重送失敗：' + json.error); return }
    setMessage(`已插入 ${json.inserted} 筆待寄佇列，Cron 一分鐘內處理。`)
    setSelected(new Set())
    loadQueue()
  }

  const handleReconcile = async () => {
    setReconciling(true)
    setMessage('')
    const res = await fetch('/api/admin/mail-queue/reconcile', { method: 'POST' })
    const json = await res.json()
    setReconciling(false)
    if (!res.ok) { setMessage('對帳失敗：' + json.error); return }
    const resendChecked = json.resend?.checked ?? 0
    const resendUpdated = json.resend?.updated ?? 0
    const aliUpdated    = json.alicloud?.updated ?? 0
    const aliUnmatched  = json.alicloud?.unmatched ?? 0
    const totalUpdated  = resendUpdated + aliUpdated
    if (totalUpdated > 0) await loadQueue()
    setMessage(`對帳完成：Resend 檢查 ${resendChecked} 筆，更新 ${resendUpdated} 筆；AliCloud 更新 ${aliUpdated} 筆，未匹配 ${aliUnmatched} 筆。`)
  }

  const handlePreview = async (id: string) => {
    setPreviewLoading(true)
    const res = await fetch(`/api/admin/mail-queue/row/${id}`)
    const json = await res.json()
    setPreviewLoading(false)
    if (!res.ok) { setMessage('預覽失敗：' + json.error); return }
    setPreview({ id, subject: json.row.subject, to_email: json.row.to_email, html: json.row.html ?? '' })
  }

  const handleBatchSelect = (batchId: string) => {
    setBatchFilter(batchId)
    setTab('queue')
  }

  if (!authChecked) return null

  const inputStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    fontFamily: 'monospace',
    background: '#fff',
    color: '#111827',
  }
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid ' + (active ? '#2563eb' : '#d1d5db'),
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#374151',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'monospace',
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px', fontFamily: 'monospace' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>郵件佇列管理</h1>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>developer only · /admin/mail-queue</span>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
        {(['queue', 'batches'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px',
              border: 'none',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              color: tab === t ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              fontFamily: 'monospace',
              fontSize: 14,
              marginBottom: -1,
            }}
          >
            {t === 'queue' ? '郵件佇列' : '批次'}
          </button>
        ))}
      </div>

      {/* queue tab */}
      {tab === 'queue' && (
        <>
          {/* filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            {/* status */}
            <StatusDropdown selected={statusFilter} onChange={setStatusFilter} />

            {/* hours */}
            <div style={{ display: 'flex', gap: 2 }}>
              {HOURS_OPTIONS.map(h => (
                <button key={h.value} onClick={() => setHoursFilter(h.value)} style={btnStyle(hoursFilter === h.value)}>
                  {h.label}
                </button>
              ))}
            </div>

            {/* provider */}
            <select
              value={providerFilter}
              onChange={e => setProviderFilter(e.target.value)}
              style={inputStyle}
            >
              {PROVIDER_OPTIONS.map(p => (
                <option key={p} value={p}>{p === 'all' ? '全部 provider' : p}</option>
              ))}
            </select>

            {/* search */}
            <input
              type="text"
              placeholder="搜尋 email / subject"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadQueue()}
              style={{ ...inputStyle, width: 220 }}
            />

            {/* batch */}
            <input
              type="text"
              placeholder="batch id / prefix"
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadQueue()}
              style={{ ...inputStyle, width: 160 }}
            />

            {/* solo */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={soloFilter}
                onChange={e => setSoloFilter(e.target.checked)}
              />
              solo only
            </label>

            {/* limit */}
            <select
              value={limitFilter}
              onChange={e => setLimitFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="100">100 筆</option>
              <option value="200">200 筆</option>
              <option value="300">300 筆</option>
              <option value="400">400 筆</option>
              <option value="500">500 筆</option>
            </select>

            {/* load */}
            <button
              onClick={loadQueue}
              disabled={loading}
              style={{ ...btnStyle(false), background: '#f3f4f6', fontWeight: 600 }}
            >
              {loading ? '載入中…' : '套用篩選'}
            </button>

            <span style={{ fontSize: 12, color: '#9ca3af' }}>{rows.length} rows</span>

            {/* auto-refresh toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              自動更新 30s
            </label>

            {lastRefresh && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                上次更新 {lastRefresh.toLocaleTimeString()}
              </span>
            )}

            {/* reconcile */}
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              style={{ ...btnStyle(false), background: '#fffbeb', borderColor: '#fbbf24', color: '#92400e' }}
            >
              {reconciling ? '同步中…' : '同步寄送狀態'}
            </button>
          </div>

          {/* retry bar */}
          {selected.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', marginBottom: 10,
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6,
            }}>
              <span style={{ fontSize: 13, color: '#1d4ed8' }}>已選 {selected.size} 筆</span>
              <select
                value={retryProvider}
                onChange={e => setRetryProvider(e.target.value)}
                style={inputStyle}
              >
                {RETRY_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                onClick={handleRetry}
                disabled={retrying}
                style={{ ...btnStyle(true), fontWeight: 700 }}
              >
                {retrying ? '重送中…' : '重送'}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                style={{ ...btnStyle(false), color: '#6b7280' }}
              >
                清除選取
              </button>
            </div>
          )}

          {/* message */}
          {message && (
            <div style={{
              marginBottom: 10, padding: '6px 12px', borderRadius: 4, fontSize: 13,
              background: message.startsWith('錯誤') ? '#fee2e2' : '#d1fae5',
              color: message.startsWith('錯誤') ? '#991b1b' : '#065f46',
            }}>
              {message}
            </div>
          )}

          <QueueTable rows={rows} selected={selected} onToggle={toggleSelect} onPreview={handlePreview} />
        </>
      )}

      {/* batches tab */}
      {tab === 'batches' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button
              onClick={loadBatches}
              disabled={loading}
              style={{ ...btnStyle(false), background: '#f3f4f6', fontWeight: 600 }}
            >
              {loading ? '載入中…' : '重新整理'}
            </button>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{batches.length} batches · 點擊 id 切換至該批次的佇列檢視</span>
          </div>
          {message && (
            <div style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 4, fontSize: 13, background: '#fee2e2', color: '#991b1b' }}>
              {message}
            </div>
          )}
          <BatchTable batches={batches} onSelect={handleBatchSelect} />
        </>
      )}

      {/* preview loading overlay */}
      {previewLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16 }}>載入預覽…</span>
        </div>
      )}

      {/* preview modal */}
      {preview && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
          }}
          onClick={() => setPreview(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8, overflow: 'hidden',
              width: '90vw', maxWidth: 900, height: '85vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* modal header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                  {shortId(preview.id)} · {preview.to_email}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>
                  {preview.subject ?? '（無主旨）'}
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 20, color: '#6b7280', lineHeight: 1, padding: 4, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
            {/* iframe */}
            <iframe
              srcDoc={preview.html}
              style={{ flex: 1, border: 'none', width: '100%' }}
              sandbox="allow-same-origin"
              title="mail preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
