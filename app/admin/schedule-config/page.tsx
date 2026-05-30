'use client'
import { useState, useEffect } from 'react'
import { AdminHeader } from '../_components/AdminHeader'

type ScheduleConfig = {
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

export default function ScheduleConfigPage() {
  const [config, setConfig] = useState<ScheduleConfig>({})
  const [draft, setDraft] = useState<ScheduleConfig>({})
  const [editing, setEditing] = useState(false)
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
    if (res.ok) { setConfig(draft); setEditing(false); setMsg('✓ 已儲存') }
    else { const d = await res.json(); setMsg(d.error || '儲存失敗') }
  }

  return (
    <>
      <AdminHeader />
      <div className="admin-main" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>時程設定</h1>

        {msg && <p style={{ marginBottom: 16, fontSize: 13, color: msg.startsWith('✓') ? 'var(--green)' : '#c0392b' }}>{msg}</p>}

        {/* 補報名期間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>補報名期間</h2>
            {!editing && (
              <button onClick={() => { setDraft({ ...config }); setEditing(true); setMsg('') }}
                style={{ padding: '6px 16px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                編輯
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['開始時間', 'late_start'],
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={saving}
                  style={{ padding: '8px 22px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? '儲存中…' : '儲存'}
                </button>
                <button onClick={() => { setEditing(false); setMsg('') }}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
              {[
                ['開始時間', formatDisplay(config.late_start)],
                ['結束時間', formatDisplay(config.late_end)],
                ['錄取通知', formatDisplay(config.late_notify)],
                ['繳費截止', formatDisplay(config.late_pay_deadline)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--ink-mute)', minWidth: 80 }}>{k}</span>
                  <strong style={{ color: 'var(--ink)' }}>{v}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
