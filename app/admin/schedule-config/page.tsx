'use client'
import { useState, useEffect } from 'react'
import { AdminHeader } from '../_components/AdminHeader'

type ScheduleConfig = {
  open_start?: string | null
  open_notify?: string | null
  open_pay_deadline?: string | null
  late_start?: string | null
  late_end?: string | null
  late_notify?: string | null
  late_pay_deadline?: string | null
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid var(--line-strong)', fontSize: 14,
  background: 'var(--bg-pure)', color: 'var(--ink)', fontFamily: 'inherit',
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplay(iso: string | null | undefined): string {
  if (!iso) return '（未設定）'
  return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function DisplayRow({ label, value, fallback }: { label: string; value: string; fallback?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span style={{ color: 'var(--ink-mute)', minWidth: 80 }}>{label}</span>
      <span>
        <strong style={{ color: 'var(--ink)' }}>{value}</strong>
        {fallback && value === '（未設定）' && (
          <span style={{ color: 'var(--ink-mute)', fontSize: 12, marginLeft: 6 }}>fallback: {fallback}</span>
        )}
      </span>
    </div>
  )
}

export default function ScheduleConfigPage() {
  const [config, setConfig] = useState<ScheduleConfig>({})
  const [draft, setDraft] = useState<ScheduleConfig>({})
  const [editing, setEditing] = useState<'open' | 'late' | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/schedule-config')
      .then(r => r.json())
      .then(d => { setConfig(d); setDraft(d) })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    const res = await fetch('/api/admin/schedule-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    setSaving(false)
    if (res.ok) { setConfig({ ...draft }); setEditing(null); setMsg('✓ 已儲存') }
    else { const d = await res.json(); setMsg(d.error || '儲存失敗') }
  }

  const editBtn = (section: 'open' | 'late') => (
    <button onClick={() => { setDraft({ ...config }); setEditing(section); setMsg('') }}
      disabled={editing !== null && editing !== section}
      style={{ padding: '6px 16px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: editing !== null && editing !== section ? 0.4 : 1 }}>
      編輯
    </button>
  )

  const saveCancel = (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button onClick={save} disabled={saving}
        style={{ padding: '8px 22px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? '儲存中…' : '儲存'}
      </button>
      <button onClick={() => { setEditing(null); setMsg('') }}
        style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
        取消
      </button>
    </div>
  )

  return (
    <>
      <AdminHeader />
      <div className="admin-main" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>時程設定</h1>

        {msg && <p style={{ marginBottom: 16, fontSize: 13, color: msg.startsWith('✓') ? 'var(--green)' : '#c0392b' }}>{msg}</p>}

        {/* 主報名期間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px' }}>主報名期間</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-mute)', margin: 0 }}>主報名結束時間 = 補報名開始時間，修改補報名開始時間即可。</p>
            </div>
            {editing !== 'open' && editBtn('open')}
          </div>

          {editing === 'open' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['開始時間', 'open_start'],
                  ['錄取通知時間', 'open_notify'],
                  ['繳費截止時間', 'open_pay_deadline'],
                ] as [string, keyof ScheduleConfig][]).map(([label, field]) => (
                  <label key={field} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {label}（台灣時間）
                    <input type="datetime-local" style={inputStyle}
                      value={toDatetimeLocal(draft[field])}
                      onChange={e => setDraft({ ...draft, [field]: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </label>
                ))}
              </div>
              {saveCancel}
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
              <DisplayRow label="開始時間" value={formatDisplay(config.open_start)} fallback="2026/05/11 上午 10:00" />
              <DisplayRow label="結束時間" value="= 補報名開始時間" />
              <DisplayRow label="錄取通知" value={formatDisplay(config.open_notify)} fallback="2026/06/06 中午 12:00" />
              <DisplayRow label="繳費截止" value={formatDisplay(config.open_pay_deadline)} fallback="2026/06/15 晚上 08:00" />
            </div>
          )}
        </section>

        {/* 補報名期間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>補報名期間</h2>
            {editing !== 'late' && editBtn('late')}
          </div>

          {editing === 'late' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['開始時間（同主報名結束）', 'late_start'],
                  ['結束時間', 'late_end'],
                  ['錄取通知時間', 'late_notify'],
                  ['繳費截止時間', 'late_pay_deadline'],
                ] as [string, keyof ScheduleConfig][]).map(([label, field]) => (
                  <label key={field} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {label}（台灣時間）
                    <input type="datetime-local" style={inputStyle}
                      value={toDatetimeLocal(draft[field])}
                      onChange={e => setDraft({ ...draft, [field]: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </label>
                ))}
              </div>
              {saveCancel}
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
              <DisplayRow label="開始時間" value={formatDisplay(config.late_start)} fallback="2026/06/01 上午 08:00" />
              <DisplayRow label="結束時間" value={formatDisplay(config.late_end)} fallback="2026/06/07 晚上 24:00" />
              <DisplayRow label="錄取通知" value={formatDisplay(config.late_notify)} fallback="2026/06/10 中午 12:00" />
              <DisplayRow label="繳費截止" value={formatDisplay(config.late_pay_deadline)} fallback="2026/06/20 晚上 08:00" />
            </div>
          )}
        </section>
      </div>
    </>
  )
}
