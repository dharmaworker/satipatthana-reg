'use client'
import { useState, useEffect } from 'react'
import { AdminHeader } from '../_components/AdminHeader'

type ScheduleConfig = {
  open_start?: string | null
  open_notify?: string | null
  open_pay_deadline?: string | null
  open_lodging_deadline?: string | null
  open_payment_open?: string | null
  open_lodging_open?: string | null
  open_quicktest_open?: string | null
  late_start?: string | null
  late_end?: string | null
  late_notify?: string | null
  late_pay_deadline?: string | null
  late_lodging_deadline?: string | null
  late_payment_open?: string | null
  late_lodging_open?: string | null
  late_quicktest_open?: string | null
  quicktest_1_deadline?: string | null
  quicktest_2_deadline?: string | null
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

const toLocal = (ms: number | null) => ms ? new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 16) : ''
const fromLocal = (s: string) => s ? new Date(s + '+08:00').getTime() : null

export default function ScheduleConfigPage() {
  const [config, setConfig] = useState<ScheduleConfig>({})
  const [draft, setDraft] = useState<ScheduleConfig>({})
  const [editing, setEditing] = useState<'open' | 'late' | 'quicktest' | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 課前共修公開時間
  const [practiceOpenAt, setPracticeOpenAt] = useState<string | null>(null)
  const [practiceOpenInput, setPracticeOpenInput] = useState('')
  const [practicePubSaving, setPracticePubSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/practice')
      .then(r => r.json())
      .then(d => {
        setPracticeOpenAt(d.config?.open_at ?? null)
        setPracticeOpenInput(toDatetimeLocal(d.config?.open_at))
      }).catch(() => {})
  }, [])

  // 課程時間表公開時間
  const [timetablePublishAt, setTimetablePublishAt] = useState<string | null>(null)
  const [timetablePublishInput, setTimetablePublishInput] = useState('')
  const [timetableSaving, setTimetableSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/timetable')
      .then(r => r.json())
      .then(d => {
        setTimetablePublishAt(d.publish_at ?? null)
        setTimetablePublishInput(toDatetimeLocal(d.publish_at))
      }).catch(() => {})
  }, [])

  // 互動報名時程
  const [intOpenMs, setIntOpenMs] = useState<number | null>(null)
  const [intOpenInput, setIntOpenInput] = useState('')
  const [intDeadlineMs, setIntDeadlineMs] = useState<number | null>(null)
  const [intDeadlineInput, setIntDeadlineInput] = useState('')
  const [intTaskOpenMs, setIntTaskOpenMs] = useState<number | null>(null)
  const [intTaskOpenInput, setIntTaskOpenInput] = useState('')
  const [intTaskDeadlineMs, setIntTaskDeadlineMs] = useState<number | null>(null)
  const [intTaskDeadlineInput, setIntTaskDeadlineInput] = useState('')
  const [intSaving, setIntSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/interactive-config')
      .then(r => r.json())
      .then(d => {
        const oMs = d.open_ms ?? null; setIntOpenMs(oMs); setIntOpenInput(toLocal(oMs))
        const dMs = d.deadline_ms ?? null; setIntDeadlineMs(dMs); setIntDeadlineInput(toLocal(dMs))
        const tOMs = d.task_open_ms ?? null; setIntTaskOpenMs(tOMs); setIntTaskOpenInput(toLocal(tOMs))
        const tDMs = d.task_deadline_ms ?? null; setIntTaskDeadlineMs(tDMs); setIntTaskDeadlineInput(toLocal(tDMs))
      }).catch(() => {})
  }, [])

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
                  ['食宿截止時間', 'open_lodging_deadline'],
                  ['繳費功能公開時間', 'open_payment_open'],
                  ['食宿功能公開時間', 'open_lodging_open'],
                  ['快篩功能公開時間', 'open_quicktest_open'],
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
              <DisplayRow label="食宿截止" value={formatDisplay(config.open_lodging_deadline)} fallback="2026/06/20 晚上 08:00" />
              <DisplayRow label="繳費功能公開" value={formatDisplay(config.open_payment_open)} fallback="同錄取通知時間" />
              <DisplayRow label="食宿功能公開" value={formatDisplay(config.open_lodging_open)} fallback="同錄取通知時間" />
              <DisplayRow label="快篩功能公開" value={formatDisplay(config.open_quicktest_open)} fallback="同錄取通知時間" />
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
                  ['食宿截止時間', 'late_lodging_deadline'],
                  ['繳費功能公開時間', 'late_payment_open'],
                  ['食宿功能公開時間', 'late_lodging_open'],
                  ['快篩功能公開時間', 'late_quicktest_open'],
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
              <DisplayRow label="食宿截止" value={formatDisplay(config.late_lodging_deadline)} fallback="2026/06/20 晚上 08:00" />
              <DisplayRow label="繳費功能公開" value={formatDisplay(config.late_payment_open)} fallback="同錄取通知時間" />
              <DisplayRow label="食宿功能公開" value={formatDisplay(config.late_lodging_open)} fallback="同錄取通知時間" />
              <DisplayRow label="快篩功能公開" value={formatDisplay(config.late_quicktest_open)} fallback="同錄取通知時間" />
            </div>
          )}
        </section>

        {/* 課程時間表公開時間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>課程時間表</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              公開時間（台灣時間）
              <input type="datetime-local" style={inputStyle} value={timetablePublishInput}
                onChange={e => setTimetablePublishInput(e.target.value)} />
              {timetablePublishAt && <span style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>目前：{formatDisplay(timetablePublishAt)}</span>}
            </label>
            <button disabled={timetableSaving} onClick={async () => {
              setTimetableSaving(true)
              const publish_at = timetablePublishInput ? new Date(timetablePublishInput).toISOString() : null
              const res = await fetch('/api/admin/timetable', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publish_at }) })
              setTimetableSaving(false)
              if (res.ok) setTimetablePublishAt(publish_at)
              else alert('儲存失敗')
            }} style={{ padding: '8px 20px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: timetableSaving ? 'not-allowed' : 'pointer' }}>
              {timetableSaving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </section>

        {/* 課前共修公開時間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>課前共修</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              學員公開時間（台灣時間）
              <input type="datetime-local" style={inputStyle} value={practiceOpenInput}
                onChange={e => setPracticeOpenInput(e.target.value)} />
              {practiceOpenAt && <span style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>目前：{formatDisplay(practiceOpenAt)}</span>}
            </label>
            <button disabled={practicePubSaving} onClick={async () => {
              setPracticePubSaving(true)
              const open_at = practiceOpenInput ? new Date(practiceOpenInput).toISOString() : null
              const res = await fetch('/api/admin/practice', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'config', data: { open_at } }) })
              setPracticePubSaving(false)
              if (res.ok) setPracticeOpenAt(open_at)
              else alert('儲存失敗')
            }} style={{ padding: '8px 20px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: practicePubSaving ? 'not-allowed' : 'pointer' }}>
              {practicePubSaving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </section>

        {/* 快篩截止時間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>快篩截止時間</h2>
          {editing === 'quicktest' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                ['8/17 快篩截止時間', 'quicktest_1_deadline'],
                ['8/19 快篩截止時間', 'quicktest_2_deadline'],
              ] as [string, keyof ScheduleConfig][]).map(([label, field]) => (
                <label key={field} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {label}（台灣時間）
                  <input type="datetime-local" style={inputStyle}
                    value={toDatetimeLocal(draft[field])}
                    onChange={e => setDraft({ ...draft, [field]: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
              <DisplayRow label="8/17 快篩" value={formatDisplay(config.quicktest_1_deadline)} fallback="2026/08/17 晚上 08:00" />
              <DisplayRow label="8/19 快篩" value={formatDisplay(config.quicktest_2_deadline)} fallback="2026/08/19 中午 12:00" />
            </div>
          )}
          {editing === 'quicktest' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={save} disabled={saving}
                style={{ padding: '8px 22px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '儲存中…' : '儲存'}
              </button>
              <button onClick={() => { setEditing(null); setMsg('') }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                取消
              </button>
            </div>
          )}
          {editing !== 'quicktest' && (
            <div style={{ marginTop: 12 }}>
              {editBtn('quicktest' as any)}
            </div>
          )}
        </section>

        {/* 互動報名期間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>互動報名期間</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-mute)', margin: '0 0 14px' }}>時間內可填寫送出；區間前 task card 不顯示；區間結束後可查看但不能送出。</p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              ['開始時間', intOpenInput, setIntOpenInput, intOpenMs],
              ['截止時間', intDeadlineInput, setIntDeadlineInput, intDeadlineMs],
            ].map(([label, val, setter, curMs]: any) => (
              <div key={label as string}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 5 }}>{label}（台北）</label>
                <input type="datetime-local" value={val} onChange={e => setter(e.target.value)}
                  style={{ ...inputStyle, width: 210 }} />
                {curMs && <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 3 }}>目前：{new Date(curMs).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>}
              </div>
            ))}
            <button disabled={intSaving} onClick={async () => {
              if (!intOpenInput || !intDeadlineInput) { alert('請填寫開始與截止時間'); return }
              const oMs = fromLocal(intOpenInput)!; const dMs = fromLocal(intDeadlineInput)!
              if (dMs <= oMs) { alert('截止時間必須晚於開始時間'); return }
              setIntSaving(true)
              const res = await fetch('/api/admin/interactive-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ open_ms: oMs, deadline_ms: dMs }) })
              setIntSaving(false)
              if (res.ok) { setIntOpenMs(oMs); setIntDeadlineMs(dMs) } else alert('儲存失敗')
            }} style={{ padding: '8px 20px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: intSaving ? 'not-allowed' : 'pointer' }}>
              {intSaving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </section>

        {/* 互動作業填寫時間 */}
        <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>互動作業填寫時間</h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              ['開放填寫', intTaskOpenInput, setIntTaskOpenInput, intTaskOpenMs],
              ['填寫截止', intTaskDeadlineInput, setIntTaskDeadlineInput, intTaskDeadlineMs],
            ].map(([label, val, setter, curMs]: any) => (
              <div key={label as string}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 5 }}>{label}（台北）</label>
                <input type="datetime-local" value={val} onChange={e => setter(e.target.value)}
                  style={{ ...inputStyle, width: 210 }} />
                {curMs && <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 3 }}>目前：{new Date(curMs).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>}
              </div>
            ))}
            <button disabled={intSaving} onClick={async () => {
              const oMs = fromLocal(intTaskOpenInput); const dMs = fromLocal(intTaskDeadlineInput)
              if (oMs && dMs && oMs >= dMs) { alert('截止時間必須晚於開放時間'); return }
              const body: Record<string, number> = {}
              if (oMs) body.task_open_ms = oMs; if (dMs) body.task_deadline_ms = dMs
              setIntSaving(true)
              const res = await fetch('/api/admin/interactive-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
              setIntSaving(false)
              if (res.ok) { if (oMs) setIntTaskOpenMs(oMs); if (dMs) setIntTaskDeadlineMs(dMs) } else alert('儲存失敗')
            }} style={{ padding: '8px 20px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: intSaving ? 'not-allowed' : 'pointer' }}>
              {intSaving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
