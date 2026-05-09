'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const TEACHER_LABEL: Record<string, string> = { prasan: '阿姜巴山', nat: '阿姜納', nitiya: '阿姜妮', napatpol: '阿姜松' }
const SESSION_LABEL: Record<string, string> = {
  s1: '8/21 巴山', s2: '8/21 納',
  s3: '8/22 妮',  s4: '8/22 松',
  s5: '8/23 巴山', s6: '8/23 妮',
}

type Row = {
  task: any
  registration: any
  interactive: any
}

const PAGE_SIZE = 50

export default function InteractiveTasksAdminPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'group' | 'small' | 'both'>('all')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Row | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/interactive-tasks')
    if (res.status === 401 || res.status === 403) { router.push('/admin'); return }
    const d = await res.json()
    setRows(d.data || [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtered = rows.filter(r => {
    const reg = r.registration
    const it = r.interactive
    if (search) {
      const q = search.toLowerCase()
      if (!(
        (reg?.chinese_name || '').toLowerCase().includes(q) ||
        (reg?.member_id || '').toLowerCase().includes(q) ||
        (reg?.student_id || '').toLowerCase().includes(q)
      )) return false
    }
    const won_g = it?.group_status === 'won'
    const won_s = it?.small_status === 'won'
    if (filter === 'group' && !won_g) return false
    if (filter === 'small' && !won_s) return false
    if (filter === 'both' && !(won_g && won_s)) return false
    return true
  })

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        <div className="admin-info-strip" style={{ background: 'rgba(73, 85, 52, 0.05)', borderLeftColor: 'var(--green)' }}>
          <p>📝 顯示已送出互動作業的學員。基本資料、近期實修、希望請教的問題都可在此檢閱。</p>
          <p>🔍 點「檢視」開啟詳細內容。本頁僅供瀏覽，無編輯功能。</p>
        </div>

        <div className="admin-toolbar">
          <input type="text" placeholder="搜尋姓名 / 報名序號 / 學號"
            value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          <select value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1) }}>
            <option value="all">全部</option>
            <option value="group">集體中簽</option>
            <option value="small">分組中簽</option>
            <option value="both">兩個都中</option>
          </select>
          <button onClick={fetchData} className="admin-btn-sm">重新整理</button>
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>報名序號</th>
                <th>學號</th>
                <th>集體場次</th>
                <th>分組</th>
                <th>修習年資</th>
                <th>送出時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無互動作業</td></tr>
              ) : pagedRows.map(r => {
                const it = r.interactive
                return (
                  <tr key={r.task.registration_id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.registration?.chinese_name}</td>
                    <td className="mono">{r.registration?.member_id || '—'}</td>
                    <td className="mono">{r.registration?.student_id || '—'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.group_status === 'won'
                        ? (it.assigned_session ? SESSION_LABEL[it.assigned_session] : '中簽')
                        : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.small_status === 'won'
                        ? (it.assigned_group ? `${TEACHER_LABEL[it.assigned_group]} 組（${it.assigned_date || ''}）` : '中簽')
                        : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12.5, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.task.learning_duration || '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {r.task.submitted_at ? new Date(r.task.submitted_at).toLocaleDateString('zh-TW') : '—'}
                    </td>
                    <td>
                      <button onClick={() => setDetail(r)} className="admin-btn-sm">檢視</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)', fontSize: 13.5, color: 'var(--ink-soft)' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="admin-btn-sm">← 上一頁</button>
              <span>第 <strong style={{ color: 'var(--ink)' }}>{page}</strong> / {totalPages} 頁　共 {totalCount} 筆</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="admin-btn-sm">下一頁 →</button>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="admin-modal-overlay" onClick={() => setDetail(null)}>
          <div className="admin-modal-card lg" onClick={e => e.stopPropagation()}>
            <h3>
              <span>{detail.registration?.chinese_name}（{detail.registration?.member_id || '—'}）　互動作業</span>
              <button onClick={() => setDetail(null)} className="admin-btn-sm">✕</button>
            </h3>

            <DetailSection title="基本資料">
              <DetailRow label="性別" value={detail.registration?.gender === 'male' ? '男' : detail.registration?.gender === 'female' ? '女' : '—'} />
              <DetailRow label="身份" value={detail.registration?.identity === 'lay' ? '在家居士' : detail.registration?.identity === 'monastic' ? '出家眾' : '—'} />
              <DetailRow label="Email" value={detail.registration?.email} />
              <DetailRow label="修習年資" value={detail.task.learning_duration} fullWidth />
              <DetailRow label="固定形式練習" value={detail.task.formal_practice} fullWidth multiline />
              <DetailRow label="日常練習" value={detail.task.daily_practice} fullWidth multiline />
            </DetailSection>

            {detail.interactive?.group_status === 'won' && (
              <DetailSection title="集體互動">
                <DetailRow label="場次" value={detail.interactive.assigned_session ? SESSION_LABEL[detail.interactive.assigned_session] : '—'} />
                <DetailRow label="曾互動過" value={detail.task.group_prior_interaction === 'yes' ? '是' : detail.task.group_prior_interaction === 'no' ? '否' : '—'} />
                <DetailRow label="互動問題" value={detail.task.group_question} fullWidth multiline />
              </DetailSection>
            )}

            {detail.interactive?.small_status === 'won' && (
              <DetailSection title="分組互動">
                <DetailRow label="分組" value={detail.interactive.assigned_group ? `${TEACHER_LABEL[detail.interactive.assigned_group]} 組` : '—'} />
                <DetailRow label="日期" value={detail.interactive.assigned_date} />
                <DetailRow label="曾互動過" value={detail.task.small_prior_interaction === 'yes' ? '是' : detail.task.small_prior_interaction === 'no' ? '否' : '—'} />
                <DetailRow label="互動問題" value={detail.task.small_question} fullWidth multiline />
              </DetailSection>
            )}

            <p style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-mute)' }}>
              送出時間：{detail.task.submitted_at ? new Date(detail.task.submitted_at).toLocaleString('zh-TW') : '—'}
              {detail.task.updated_at && detail.task.updated_at !== detail.task.submitted_at && (
                <>　最後修改：{new Date(detail.task.updated_at).toLocaleString('zh-TW')}</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h4 style={{
        fontFamily: 'var(--font-noto-serif-tc), serif',
        fontSize: 14, fontWeight: 700,
        color: 'var(--green-deep)', letterSpacing: '0.08em',
        marginTop: 18, marginBottom: 10,
        paddingBottom: 6, borderBottom: '1px dotted var(--line-strong)',
      }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
        {children}
      </div>
    </>
  )
}

function DetailRow({ label, value, fullWidth, multiline }: { label: string; value: any; fullWidth?: boolean; multiline?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? 'span 2' : undefined }}>
      <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        color: 'var(--ink)', marginTop: 4,
        whiteSpace: multiline ? 'pre-wrap' : undefined,
        background: multiline ? 'var(--bg-pure)' : undefined,
        border: multiline ? '1px solid var(--line)' : undefined,
        borderRadius: multiline ? 8 : undefined,
        padding: multiline ? 10 : undefined,
        lineHeight: multiline ? 1.85 : undefined,
      }}>{value || '—'}</div>
    </div>
  )
}
