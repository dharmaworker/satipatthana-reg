'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

type PracticeConfig = {
  enabled: boolean
  period_label: string
  zoom_meeting_id: string
  zoom_password: string
  zoom_url: string | null
  notes: string | null
}

type PracticeItem = {
  id: string
  sort_order: number
  session_date: string
  time_label: string
  title: string
  subtitle: string | null
  is_live: boolean
  enabled: boolean
  video_url: string | null
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid var(--line-strong)', fontSize: 14,
  background: 'var(--bg-pure)', color: 'var(--ink)',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5, verticalAlign: 'middle',
}

function weekLabel(date: string) {
  return new Date(date) >= new Date('2026-08-11') ? '第二週' : '第一週'
}

export default function AdminPracticePage() {
  const router = useRouter()
  const [config, setConfig] = useState<PracticeConfig | null>(null)
  const [items, setItems] = useState<PracticeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok')
  const [editingConfig, setEditingConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState<PracticeConfig | null>(null)
  const [editingItem, setEditingItem] = useState<PracticeItem | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState<Partial<PracticeItem>>({
    sort_order: 9, session_date: '', time_label: '', title: '', subtitle: '', is_live: false, enabled: true, video_url: '',
  })
  const [saving, setSaving] = useState(false)

  const flash = (m: string, kind: 'ok' | 'err' = 'ok') => {
    setMsg(m); setMsgKind(kind)
    setTimeout(() => setMsg(''), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/practice')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setConfig(data.config)
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const saveConfig = async () => {
    if (!configDraft) return
    setSaving(true)
    const res = await fetch('/api/admin/practice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'config', data: configDraft }),
    })
    setSaving(false)
    if (res.ok) { setConfig(configDraft); setEditingConfig(false); flash('設定已儲存') }
    else { const d = await res.json(); flash(d.error || '儲存失敗', 'err') }
  }

  const saveItem = async (item: PracticeItem) => {
    setSaving(true)
    const res = await fetch('/api/admin/practice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'item', id: item.id, data: item }),
    })
    setSaving(false)
    if (res.ok) { setEditingItem(null); fetchData(); flash('已儲存') }
    else { const d = await res.json(); flash(d.error || '儲存失敗', 'err') }
  }

  const deleteItem = async (item: PracticeItem) => {
    if (!confirm(`確定刪除「${item.title}」？`)) return
    const res = await fetch('/api/admin/practice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_item', id: item.id }),
    })
    if (res.ok) { fetchData(); flash('已刪除') }
    else flash('刪除失敗', 'err')
  }

  const addItem = async () => {
    if (!newItem.session_date || !newItem.title || !newItem.time_label) {
      flash('請填寫日期、時間、課程名稱', 'err'); return
    }
    setSaving(true)
    const res = await fetch('/api/admin/practice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'add_item', data: newItem }),
    })
    setSaving(false)
    if (res.ok) {
      setAddingItem(false)
      setNewItem({ sort_order: 9, session_date: '', time_label: '', title: '', subtitle: '', is_live: false, enabled: true })
      fetchData(); flash('已新增')
    } else { const d = await res.json(); flash(d.error || '新增失敗', 'err') }
  }

  return (
    <>
      <AdminHeader />
      <main className="container" style={{ maxWidth: 900, paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>課前共修管理</h1>
          </div>
        </div>

        {msg && (
          <div style={{
            background: msgKind === 'ok' ? 'rgba(73,85,52,0.08)' : 'rgba(184,82,58,0.08)',
            border: `1px solid ${msgKind === 'ok' ? 'rgba(73,85,52,0.25)' : 'rgba(184,82,58,0.3)'}`,
            color: msgKind === 'ok' ? 'var(--green-deep)' : '#b8523a',
            borderRadius: 8, padding: '10px 16px', fontSize: 13.5, marginBottom: 18,
          }}>{msg}</div>
        )}

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner-large" /></div>
        ) : (
          <>
            {/* Zoom 設定 — hidden */}
            <section style={{ display: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Zoom / 全域設定</h2>
                {!editingConfig && (
                  <button onClick={() => { setConfigDraft({ ...config! }); setEditingConfig(true) }}
                    style={{ padding: '6px 16px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    編輯
                  </button>
                )}
              </div>
              {editingConfig && configDraft ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      期間標籤
                      <input style={inputStyle} value={configDraft.period_label} onChange={e => setConfigDraft({ ...configDraft, period_label: e.target.value })} />
                    </label>
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    備注說明（學員可見）
                    <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                      value={configDraft.notes || ''}
                      onChange={e => setConfigDraft({ ...configDraft, notes: e.target.value || null })} />
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveConfig} disabled={saving}
                      style={{ padding: '8px 22px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? '儲存中…' : '儲存'}
                    </button>
                    <button onClick={() => setEditingConfig(false)}
                      style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                      取消
                    </button>
                  </div>
                </div>
              ) : config ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
                  {[
                    ['期間標籤', config.period_label],
                    ['備注', config.notes || '（無）'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--ink-mute)', minWidth: 80 }}>{k}</span>
                      <strong style={{ color: 'var(--ink)' }}>{v}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--ink-mute)', fontSize: 14 }}>尚未設定（請先執行 SQL migration）</p>
              )}
            </section>

            {/* 課表 */}
            <section style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>課表項目</h2>
                <button onClick={() => setAddingItem(true)}
                  style={{ padding: '6px 16px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + 新增
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'rgba(73,85,52,0.06)' }}>
                    {['順序', '週次', '日期', '時間', '課程', '直播', '啟用', '操作'].map(h => (
                      <th key={h} style={{ ...tdStyle, fontWeight: 700, color: 'var(--ink)', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      {editingItem?.id === item.id ? (
                        <td colSpan={8} style={{ padding: '14px 16px', background: 'rgba(73,85,52,0.04)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              順序
                              <input type="number" style={inputStyle} value={editingItem.sort_order}
                                onChange={e => setEditingItem({ ...editingItem, sort_order: Number(e.target.value) })} />
                            </label>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              日期
                              <input type="date" style={inputStyle} value={editingItem.session_date}
                                onChange={e => setEditingItem({ ...editingItem, session_date: e.target.value })} />
                            </label>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              時間標籤
                              <input style={inputStyle} value={editingItem.time_label}
                                onChange={e => setEditingItem({ ...editingItem, time_label: e.target.value })} />
                            </label>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                              課程名稱
                              <input style={inputStyle} value={editingItem.title}
                                onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} />
                            </label>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                              副標題（開示日期等）
                              <input style={inputStyle} value={editingItem.subtitle || ''}
                                onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value || null })} />
                            </label>
                            <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                              影片連結（可選，有填則課程名稱變連結）
                              <input style={inputStyle} value={editingItem.video_url || ''}
                                onChange={e => setEditingItem({ ...editingItem, video_url: e.target.value || null })}
                                placeholder="https://..." />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={editingItem.is_live}
                                onChange={e => setEditingItem({ ...editingItem, is_live: e.target.checked })} />
                              現場直播
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={editingItem.enabled}
                                onChange={e => setEditingItem({ ...editingItem, enabled: e.target.checked })} />
                              啟用
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveItem(editingItem)} disabled={saving}
                              style={{ padding: '7px 18px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                              {saving ? '儲存中…' : '儲存'}
                            </button>
                            <button onClick={() => setEditingItem(null)}
                              style={{ padding: '7px 14px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                              取消
                            </button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td style={{ ...tdStyle, opacity: item.enabled ? 1 : 0.45 }}>{item.sort_order}</td>
                          <td style={{ ...tdStyle, color: 'var(--ink-mute)', fontSize: 12.5, opacity: item.enabled ? 1 : 0.45 }}>{weekLabel(item.session_date)}</td>
                          <td style={{ ...tdStyle, opacity: item.enabled ? 1 : 0.45 }}>{item.session_date}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap', opacity: item.enabled ? 1 : 0.45 }}>{item.time_label}</td>
                          <td style={{ ...tdStyle, opacity: item.enabled ? 1 : 0.45 }}>
                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{item.subtitle}</div>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', opacity: item.enabled ? 1 : 0.45 }}>{item.is_live ? '✅' : ''}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', opacity: item.enabled ? 1 : 0.45 }}>{item.enabled ? '✅' : '⏸'}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setEditingItem({ ...item })}
                                style={{ padding: '4px 12px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                                編輯
                              </button>
                              <button onClick={() => deleteItem(item)}
                                style={{ padding: '4px 10px', background: 'rgba(184,82,58,0.1)', color: '#b8523a', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}>
                                刪除
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 新增列 */}
              {addingItem && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', background: 'rgba(73,85,52,0.03)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-deep)', marginBottom: 10 }}>新增項目</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      順序
                      <input type="number" style={inputStyle} value={newItem.sort_order}
                        onChange={e => setNewItem({ ...newItem, sort_order: Number(e.target.value) })} />
                    </label>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      日期
                      <input type="date" style={inputStyle} value={newItem.session_date}
                        onChange={e => setNewItem({ ...newItem, session_date: e.target.value })} />
                    </label>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      時間標籤
                      <input style={inputStyle} value={newItem.time_label || ''}
                        onChange={e => setNewItem({ ...newItem, time_label: e.target.value })} placeholder="晚上 8 時" />
                    </label>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                      課程名稱
                      <input style={inputStyle} value={newItem.title || ''}
                        onChange={e => setNewItem({ ...newItem, title: e.target.value })} placeholder="《課程名稱》" />
                    </label>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                      副標題
                      <input style={inputStyle} value={newItem.subtitle || ''}
                        onChange={e => setNewItem({ ...newItem, subtitle: e.target.value })} placeholder="（隆波帕默尊者開示 …）" />
                    </label>
                    <label style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                      影片連結（可選）
                      <input style={inputStyle} value={newItem.video_url || ''}
                        onChange={e => setNewItem({ ...newItem, video_url: e.target.value || null })} placeholder="https://..." />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!newItem.is_live}
                        onChange={e => setNewItem({ ...newItem, is_live: e.target.checked })} />
                      現場直播
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={newItem.enabled !== false}
                        onChange={e => setNewItem({ ...newItem, enabled: e.target.checked })} />
                      啟用
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addItem} disabled={saving}
                      style={{ padding: '7px 18px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {saving ? '新增中…' : '新增'}
                    </button>
                    <button onClick={() => setAddingItem(false)}
                      style={{ padding: '7px 14px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                      取消
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
