'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type MemberData = {
  id: string
  chinese_name: string
  member_id: string | null
  student_id: string | null
  random_code: string
  status: string
  payment_status: string
  payment_plan: string | null
  residence: string | null
  lodging_status: 'none' | 'submitted_editable' | 'locked'
  tests_uploaded: number
  tests_total: number
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  approved: { label: '已錄取', cls: 'accepted' },
  pending: { label: '審核中', cls: 'pending' },
  rejected: { label: '未錄取', cls: 'rejected' },
}

function MemberDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !code) {
      router.push('/member')
      return
    }
    fetch(`/api/member/me?id=${id}&code=${encodeURIComponent(code)}`)
      .then(res => {
        if (!res.ok) { router.push('/member'); return }
        return res.json()
      })
      .then(data => { if (data) setMember(data); setLoading(false) })
  }, [id, code])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    )
  }
  if (!member) return null

  const withAuth = (path: string) => `${path}?id=${member.id}&code=${member.random_code}`

  // 任務狀態
  const paymentDone = member.payment_status === 'verified'
  const paymentPending = member.payment_status === 'paid'
  const lodgingDone = member.lodging_status !== 'none'
  const lodgingLocked = member.lodging_status === 'locked'
  const testsDone = member.tests_uploaded >= member.tests_total
  const checks = [
    { label: '繳費', done: paymentDone },
    { label: '食宿登記', done: lodgingDone },
    { label: '快篩 8/17', done: member.tests_uploaded >= 1 },
    { label: '快篩 8/19', done: member.tests_uploaded >= 2 },
  ]
  const completedCount = checks.filter(c => c.done).length
  const progressPct = Math.round((completedCount / checks.length) * 100)

  const sInfo = STATUS_INFO[member.status] || STATUS_INFO.pending
  const initial = member.chinese_name.charAt(0)

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
        <div className="page-blob b4" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/member/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href="/" className="nav-back">← 主站</a>
            <button className="nav-logout" onClick={() => router.push('/member')}>登出</button>
          </div>
        </div>
      </header>

      <main className="container portal-main">

        {/* 歡迎卡 */}
        <div className="welcome-card">
          <div className="welcome-avatar">{initial}</div>
          <div className="welcome-text">
            <h2>
              <span className="greeting">Welcome Back · 歡迎回來</span>
              {member.chinese_name}
            </h2>
            <p>
              {member.status === 'approved'
                ? '您已通過資格審核，請依下方狀態完成各項待辦。'
                : '感謝您的報名，您的資料正在審核中。'}
            </p>
          </div>
          <div className="welcome-status">
            <div className="ref">
              <span className="k">序號</span>
              <strong>{member.member_id || '待編號'}</strong>
            </div>
            {member.student_id && (
              <div className="ref" style={{ marginTop: 4 }}>
                <span className="k">學號</span>
                <strong>{member.student_id}</strong>
              </div>
            )}
            <span className={`status-badge ${sInfo.cls}`} style={{ marginTop: 8 }}>
              <span className="dot" />{sInfo.label}
            </span>
          </div>
        </div>

        {member.status === 'approved' && (
          <>
            {/* 公告 */}
            <div className="announce-card">
              <div className="announce-card-title">最新公告</div>
              <p>
                錄取通知已發送，請於 <strong>6/15 晚上 8 時前</strong>完成{' '}
                <a href={withAuth('/pay')}>繳費</a>，並於 <strong>6/20 晚上 8 時前</strong>完成{' '}
                <a href={withAuth('/lodging')}>食宿登記</a>，才算正式錄取。
              </p>
            </div>

            {/* 完成度進度 */}
            <div className="progress-section">
              <div className="progress-head">
                <h3>完成度進度 <small>Completion</small></h3>
                <div className="progress-percent">{progressPct}<span className="pct">%</span></div>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-checklist">
                {checks.map(c => (
                  <div key={c.label} className={`progress-item ${c.done ? 'done' : ''}`}>
                    <div className="icon" />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 任務卡 */}
            <div className="task-grid">
              {/* 繳費 */}
              <TaskCard
                idLabel="$" label="Payment" title="繳費"
                state={paymentDone ? 'done' : paymentPending ? 'todo' : 'todo'}
                statusBadge={paymentDone ? '已完成' : paymentPending ? '待確認' : '待繳費'}
                badgeKind={paymentDone ? 'done' : paymentPending ? 'todo' : 'urgent'}
                deadline="06/15 晚上 8 時前" urgent={!paymentDone}
                rows={[
                  ['方案', member.payment_plan || '尚未選擇'],
                  ['狀態', paymentDone ? '繳費已確認' : paymentPending ? '已回報，待確認' : '尚未繳費'],
                ]}
                actionHref={withAuth('/pay')}
                actionText={paymentDone ? '查看' : '前往繳費 →'}
              />

              {/* 食宿登記 */}
              <TaskCard
                idLabel="食" label="Lodging" title="食宿登記"
                state={lodgingDone ? (lodgingLocked ? 'done' : 'done') : 'todo'}
                statusBadge={lodgingLocked ? '已鎖定' : lodgingDone ? '可改 1 次' : '待填寫'}
                badgeKind={lodgingDone ? 'done' : 'todo'}
                deadline="06/20 晚上 8 時前" urgent={!lodgingDone}
                rows={[
                  ['狀態', lodgingLocked ? '已修改過 1 次（鎖定）' : lodgingDone ? '已送出（還能修改 1 次）' : '尚未送出'],
                ]}
                actionHref={withAuth('/lodging')}
                actionText={lodgingLocked ? '查看' : lodgingDone ? '修改一次' : '前往登記 →'}
              />

              {/* 快篩 */}
              <TaskCard
                idLabel="篩" label="Quick Test" title="快篩上傳"
                state={testsDone ? 'done' : 'todo'}
                statusBadge={`${member.tests_uploaded}／${member.tests_total}`}
                badgeKind={testsDone ? 'done' : 'todo'}
                deadline="8/17 晚上 8 點 ／ 8/19 中午 12 點前" urgent={false}
                rows={[
                  ['8/17 快篩', member.tests_uploaded >= 1 ? '✅ 已上傳' : '⏳ 未上傳'],
                  ['8/19 快篩', member.tests_uploaded >= 2 ? '✅ 已上傳' : '⏳ 未上傳'],
                ]}
                actionHref={withAuth('/quicktests')}
                actionText={testsDone ? '查看' : '前往上傳 →'}
              />
            </div>

            {/* 重要時程 */}
            <div className="schedule-strip">
              <h3>重要時程 <small>Schedule</small></h3>
              <div className="schedule-grid">
                <div className="schedule-cell done"><div className="date">05.11–05.25</div><div className="label">報名期間</div></div>
                <div className="schedule-cell done"><div className="date">06.06</div><div className="label">錄取通知</div></div>
                <div className={`schedule-cell ${paymentDone ? 'done' : 'urgent'}`}><div className="date">06.15</div><div className="label">繳費截止</div></div>
                <div className={`schedule-cell ${lodgingDone ? 'done' : 'urgent'}`}><div className="date">06.20</div><div className="label">食宿登記</div></div>
                <div className="schedule-cell"><div className="date">08.20–08.24</div><div className="label">禪修課程</div></div>
              </div>
            </div>

            {/* 資源 */}
            <div className="resources-grid">
              <a href="/info/schedule" className="resource-link">
                <div className="icon">📋</div>
                <div className="text"><h4>課程時間表</h4><p>五日完整課程安排</p></div>
                <div className="arrow">→</div>
              </a>
              <a href="/info/payment" className="resource-link">
                <div className="icon">💰</div>
                <div className="text"><h4>費用說明</h4><p>方案與支付方式</p></div>
                <div className="arrow">→</div>
              </a>
              <a href="/#teachers" className="resource-link">
                <div className="icon">🌿</div>
                <div className="text"><h4>指導老師</h4><p>師資介紹</p></div>
                <div className="arrow">→</div>
              </a>
              <a href="mailto:satipatthana.tw@gmail.com" className="resource-link">
                <div className="icon">✉</div>
                <div className="text"><h4>聯絡學會</h4><p>satipatthana.tw@gmail.com</p></div>
                <div className="arrow">→</div>
              </a>
            </div>
          </>
        )}

        {member.status === 'pending' && (
          <div className="pending-card">
            <div className="icon">⏳</div>
            <h3>報名審核中</h3>
            <p>您的報名資料已收到，學會正在審核。<br />錄取通知將於 <strong>06/06</strong> 以 Email 發送，請留意收件匣與垃圾信箱。</p>
            <p>在錄取確認前，請勿購買機票或安排行程。</p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:satipatthana.tw@gmail.com" className="btn btn-primary">聯絡學會</a>
              <a href="/" className="btn btn-ghost">返回主站</a>
            </div>
          </div>
        )}
        {member.status === 'rejected' && (
          <div className="pending-card">
            <div className="icon">✗</div>
            <h3>未錄取本次禪修</h3>
            <p>感謝您的報名意願。本次禪修因名額限制，您未能錄取。<br />歡迎下次再報名，或先參加每月 ZOOM 線上指導老師互動。</p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:satipatthana.tw@gmail.com" className="btn btn-primary">聯絡學會</a>
              <a href="/" className="btn btn-ghost">返回主站</a>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
        </div>
      </footer>
    </>
  )
}

function TaskCard({
  idLabel, label, title, state, statusBadge, badgeKind, deadline, urgent, rows, actionHref, actionText,
}: {
  idLabel: string
  label: string
  title: string
  state: 'done' | 'todo' | 'locked'
  statusBadge: string
  badgeKind: 'done' | 'todo' | 'locked' | 'urgent'
  deadline: string
  urgent?: boolean
  rows: [string, string][]
  actionHref: string
  actionText: string
}) {
  return (
    <div className={`task-card ${state}`}>
      <div className="task-head">
        <div className="task-head-left">
          <div className="task-icon">{idLabel}</div>
          <div className="task-info">
            <h3>{title}</h3>
            <span className="label">{label}</span>
          </div>
        </div>
        <span className={`task-status ${badgeKind}`}>{statusBadge}</span>
      </div>
      <div className="task-summary">
        {rows.map(([k, v]) => (
          <div key={k} className="row">
            <span className="k">{k}</span>
            <span className="v">{v || '—'}</span>
          </div>
        ))}
      </div>
      <div className={`task-deadline ${urgent ? 'urgent' : ''}`}>
        截止：<span className="due">{deadline}</span>
      </div>
      <div className="task-action">
        <a href={actionHref} className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: '10px 16px' }}>{actionText}</a>
      </div>
    </div>
  )
}

export default function MemberDashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <MemberDashboardContent />
    </Suspense>
  )
}
