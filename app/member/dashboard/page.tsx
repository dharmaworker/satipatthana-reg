'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { copyForCreatedAt } from '@/lib/registration-period'

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
  retreat_format: string | null
  created_at: string
  lodging_status: 'none' | 'submitted_editable' | 'locked'
  tests_uploaded: number
  tests_total: number
  interactive_open: boolean
  interactive_preview?: boolean
  interactive_submitted: boolean
  interactive_group_status: 'pending' | 'won' | 'waitlist' | 'lost' | 'abstain'
  interactive_small_status: 'pending' | 'won' | 'waitlist' | 'lost' | 'abstain'
  interactive_assigned_session: string | null
  interactive_assigned_group: string | null
  interactive_assigned_date: string | null
  interactive_group_serial: number | null
  interactive_small_serial: number | null
  interactive_task_submitted: boolean
  timetable_published: boolean
}

// SESSION_LABEL / TEACHER_LABEL 改從 /api/interactive/config 動態載入（見 useEffect）
type LabelMap = Record<string, string>

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  approved: { label: '已錄取', cls: 'accepted' },
  pending: { label: '審核中', cls: 'pending' },
  waitlist: { label: '候補', cls: 'waitlist' },
  rejected: { label: '未錄取', cls: 'rejected' },
}

function MemberDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionLabel, setSessionLabel] = useState<LabelMap>({})
  const [teacherLabel, setTeacherLabel] = useState<LabelMap>({})
  const [taskOpenMs, setTaskOpenMs] = useState<number | null>(null)
  const [taskDeadlineMs, setTaskDeadlineMs] = useState<number | null>(null)
  const [practicePeriodLabel, setPracticePeriodLabel] = useState('')

  useEffect(() => {
    fetch('/api/interactive/config')
      .then(r => r.json())
      .then(d => {
        const sLabel: LabelMap = {}
        for (const s of (d.sessions || [])) sLabel[s.id] = `${s.date} ${s.time}　${s.teacher}`
        setSessionLabel(sLabel)
        const tLabel: LabelMap = {}
        for (const t of (d.teachers || [])) tLabel[t.key] = t.label
        setTeacherLabel(tLabel)
        if (d.task_open_ms) setTaskOpenMs(d.task_open_ms)
        if (d.task_deadline_ms) setTaskDeadlineMs(d.task_deadline_ms)
      })
      .catch(() => {})
  }, [])

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
    fetch(`/api/member/practice?id=${id}&code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => { if (d.config?.period_label) setPracticePeriodLabel(d.config.period_label) })
      .catch(() => {})
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

  const isOnline = member.retreat_format === 'online'

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
          <a href={`/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`} className="brand">
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
              <span className="k">報名序號</span>
              <strong>{member.member_id || '待編號'}</strong>
            </div>
            {(member.student_id || member.status === 'approved') && (
              <div className="ref" style={{ marginTop: 4 }}>
                <span className="k">學號</span>
                <strong>{member.student_id || '—'}</strong>
              </div>
            )}
            <div className="ref" style={{ marginTop: 4 }}>
              <span className="k">課程形式</span>
              <strong>{isOnline ? '線上 Zoom' : '實體課程'}</strong>
            </div>
            <span className={`status-badge ${sInfo.cls}`} style={{ marginTop: 8 }}>
              <span className="dot" />{sInfo.label}
            </span>
            {(member.interactive_group_status === 'won' || member.interactive_small_status === 'won' ||
              member.interactive_group_status === 'waitlist' || member.interactive_small_status === 'waitlist') && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(216,194,154,0.15)', borderRadius: 8, border: '1px solid var(--gold)', fontSize: 13 }}>
                <div style={{ color: 'var(--gold-deep)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
                  {(member.interactive_group_status === 'won' || member.interactive_small_status === 'won') ? '✦ 互動報名 中簽' : '✦ 互動報名 候補'}
                </div>
                {(member.interactive_group_status === 'won' || member.interactive_group_status === 'waitlist') && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>集體{member.interactive_group_status === 'waitlist' ? '（候補）' : ''}：</span>
                    <strong>{member.interactive_assigned_session ? sessionLabel[member.interactive_assigned_session] ?? member.interactive_assigned_session : '（待指定）'}</strong>
                    <span style={{ color: 'var(--ink-soft)', marginLeft: 8 }}>
                      序號 {member.interactive_group_serial !== null ? member.interactive_group_serial : '—'}
                    </span>
                  </div>
                )}
                {(member.interactive_small_status === 'won' || member.interactive_small_status === 'waitlist') && (
                  <div>
                    <span style={{ color: 'var(--ink-soft)' }}>分組{member.interactive_small_status === 'waitlist' ? '（候補）' : ''}：</span>
                    <strong>{member.interactive_assigned_group ? teacherLabel[member.interactive_assigned_group] ?? member.interactive_assigned_group : '（待指定）'}</strong>
                    <span style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>
                      {member.interactive_assigned_date || '—'}
                    </span>
                    <span style={{ color: 'var(--ink-soft)', marginLeft: 8 }}>
                      序號 {member.interactive_small_serial !== null ? member.interactive_small_serial : '—'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {member.status === 'approved' && (
          <>
            {/* 公告 */}
            {isOnline ? (
              <div className="announce-card">
                <div className="announce-card-title">最新公告</div>
                <p>恭喜您通過線上禪修課程資格審核！課程時間表請點下方連結查看。如有任何疑問請聯絡學會。</p>
              </div>
            ) : (
              <div className="announce-card">
                <div className="announce-card-title">最新公告</div>
                <p>
                  錄取通知已發送，請於 <strong>6/15 晚上 8 時前</strong>完成{' '}
                  <a href={withAuth('/pay')}>繳費</a>，並於 <strong>6/20 晚上 8 時前</strong>完成{' '}
                  <a href={withAuth('/lodging')}>食宿登記</a>，才算正式錄取。
                </p>
              </div>
            )}

            {/* 完成度進度（實體才顯示） */}
            {!isOnline && (
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
            )}

            {/* 任務卡（實體才顯示全部；線上只顯示課程時間表入口） */}
            {!isOnline && (
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

                {/* 互動報名（admin 開啟才顯示；admin preview 模式也會看到，title 加 🔧 提示） */}
                {member.interactive_open && (
                  <TaskCard
                    idLabel="互" label="Interactive" title={member.interactive_preview ? '互動報名 🔧 預覽' : '互動報名'}
                    state={member.interactive_submitted ? 'done' : 'todo'}
                    statusBadge={member.interactive_preview ? '預覽' : member.interactive_submitted ? '已送出' : '待填寫'}
                    badgeKind={member.interactive_submitted ? 'done' : 'todo'}
                    deadline={member.interactive_preview ? '對學員未開放（admin 預覽中）' : '07/15 晚上 8 點前'}
                    urgent={!member.interactive_preview && !member.interactive_submitted}
                    rows={[
                      ['集體互動', member.interactive_group_status === 'won' ? '✓ 中簽' : member.interactive_group_status === 'waitlist' ? '✦ 候補' : member.interactive_group_status === 'lost' ? '✗ 沒中簽' : member.interactive_group_status === 'abstain' ? '— 棄權' : '⏳ 未定'],
                      ['分組互動', member.interactive_small_status === 'won' ? '✓ 中簽' : member.interactive_small_status === 'waitlist' ? '✦ 候補' : member.interactive_small_status === 'lost' ? '✗ 沒中簽' : member.interactive_small_status === 'abstain' ? '— 棄權' : '⏳ 未定'],
                    ]}
                    actionHref={withAuth('/member/interactive')}
                    actionText={member.interactive_submitted ? '查看／修改' : '前往報名 →'}
                  />
                )}

                {/* 互動作業（中簽才顯示） */}
                {(member.interactive_group_status === 'won' || member.interactive_small_status === 'won') && (
                  <TaskCard
                    idLabel="作" label="Interactive Task" title="互動作業"
                    state={member.interactive_task_submitted ? 'done' : 'todo'}
                    statusBadge={member.interactive_task_submitted ? '已送出' : '待填寫'}
                    badgeKind={member.interactive_task_submitted ? 'done' : 'urgent'}
                    deadline={(() => {
                      const fmt = (ms: number) => new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      if (taskOpenMs && taskDeadlineMs) return `${fmt(taskOpenMs)} 起 ～ ${fmt(taskDeadlineMs)} 截止`
                      if (taskDeadlineMs) return `截止：${fmt(taskDeadlineMs)}`
                      return '課程開始前完成'
                    })()}
                    urgent={!member.interactive_task_submitted}
                    rows={[
                      ['集體', member.interactive_group_status === 'won' ? '✓ 已中簽' : '—'],
                      ['分組', member.interactive_small_status === 'won' ? '✓ 已中簽' : '—'],
                    ]}
                    actionHref={withAuth('/member/interactive/task')}
                    actionText={member.interactive_task_submitted ? '查看／修改' : '前往填寫 →'}
                  />
                )}

                {/* 承諾書（不算進度，需下載列印現場繳交；僅錄取學員可下載） */}
                <TaskCard
                  idLabel="諾" label="Pledge" title="承諾書"
                  state="todo"
                  statusBadge="需下載"
                  badgeKind="todo"
                  deadline="現場簽署繳交（不需線上送出）"
                  rows={[
                    ['格式', 'Word 檔（.docx）'],
                    ['繳交方式', '列印簽名後現場交給法工'],
                  ]}
                  actionHref={withAuth('/api/pledge')}
                  actionText="下載承諾書 ↓"
                  actionDownload
                />
              </div>
            )}

            {/* 課前共修入口 */}
            <div style={{
              background: 'rgba(73,85,52,0.06)', border: '1px solid rgba(73,85,52,0.18)',
              borderRadius: 14, padding: '18px 22px', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>Pre-Retreat</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>課前共修</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>{practicePeriodLabel ? `${practicePeriodLabel}・` : ''}線上共修，每次參與後請打卡</p>
              </div>
              <a href={withAuth('/member/practice')}
                style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--green)', color: '#f8f2e8', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
                前往共修＆打卡 →
              </a>
            </div>

            {/* 課程打卡入口（線上且課表已公佈才顯示） */}
            {isOnline && member.timetable_published && (
              <div style={{
                background: 'rgba(73,85,52,0.06)', border: '1px solid rgba(73,85,52,0.18)',
                borderRadius: 14, padding: '18px 22px', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>Course Attendance</p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>課程打卡</h3>
                  <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>8/20 至 8/24・每次課程結束後請打卡</p>
                </div>
                <a href={withAuth('/member/course-checkin')}
                  style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--green)', color: '#f8f2e8', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
                  前往課程打卡 →
                </a>
              </div>
            )}

            {/* 課程時間表入口（課表已公佈才顯示） */}
            {member.timetable_published && <div style={{
              background: 'rgba(180,147,88,0.07)', border: '1px solid rgba(180,147,88,0.25)',
              borderRadius: 14, padding: '18px 22px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold-deep)', textTransform: 'uppercase', marginBottom: 4 }}>Schedule</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>課程時間表</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>8/20 至 8/24・五日禪修完整課程安排</p>
              </div>
              <a href={withAuth('/info/schedule')}
                style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--gold-deep)', color: '#f8f2e8', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
                查看時間表 →
              </a>
            </div>}

            {/* 重要時程 — period/notify dates derive from applicant's batch (created_at) */}
            {(() => {
              const sched = copyForCreatedAt(member.created_at)
              return (
                <div className="schedule-strip">
                  <h3>重要時程 <small>Schedule</small></h3>
                  <div className="schedule-grid">
                    <div className="schedule-cell done"><div className="date">{sched.periodStartDot}–{sched.sidebarDeadlineDate}</div><div className="label">{sched.phase === 'late' ? '補報名期間' : '報名期間'}</div></div>
                    <div className="schedule-cell done"><div className="date">{sched.sidebarNotifyDate}</div><div className="label">錄取通知</div></div>
                    {!isOnline && <div className={`schedule-cell ${paymentDone ? 'done' : 'urgent'}`}><div className="date">06.15</div><div className="label">繳費截止</div></div>}
                    {!isOnline && <div className={`schedule-cell ${lodgingDone ? 'done' : 'urgent'}`}><div className="date">06.20</div><div className="label">食宿登記</div></div>}
                    <div className="schedule-cell"><div className="date">08.20–08.24</div><div className="label">禪修課程</div></div>
                  </div>
                </div>
              )
            })()}

            {/* 資源 */}
            <div className="resources-grid">
              {!isOnline && (
                <a href="/info/payment" className="resource-link">
                  <div className="icon">💰</div>
                  <div className="text"><h4>費用說明</h4><p>方案與支付方式</p></div>
                  <div className="arrow">→</div>
                </a>
              )}
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
            <p>您已報名{isOnline ? '線上課程（Zoom）' : '實體課程'}，資料已收到，學會正在審核。<br />錄取通知將於 <strong>{copyForCreatedAt(member.created_at).notifyShort}</strong> 以 Email 發送，請留意收件匣與垃圾信箱。</p>
            <p>在錄取確認前，請勿購買機票或安排行程。</p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:satipatthana.tw@gmail.com" className="btn btn-primary">聯絡學會</a>
              <a href="/" className="btn btn-ghost">返回主站</a>
            </div>
          </div>
        )}
        {member.status === 'waitlist' && (
          <div className="pending-card">
            <div className="icon">✦</div>
            <h3>您已列入候補名單</h3>
            <p>感謝您的報名。本次禪修名額有限，您目前列為候補學員。<br />若有名額釋出，學會將另行以 Email 通知。請留意收件匣與垃圾信箱。</p>
            <p>在正式錄取確認前，請勿購買機票或安排行程。</p>
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
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'rgba(251,248,242,0.9)', letterSpacing: '0.1em' }}>聯絡我們</h5>
            <div style={{ marginBottom: 12 }}><a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'rgba(251,248,242,0.75)', fontSize: 14 }}>satipatthana.tw@gmail.com</a></div>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </div>
      </footer>

    </>
  )
}

function TaskCard({
  idLabel, label, title, state, statusBadge, badgeKind, deadline, urgent, rows, actionHref, actionText, actionDownload,
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
  actionDownload?: boolean
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
        <a href={actionHref} className="btn btn-primary"
          {...(actionDownload ? { download: '承諾書.docx' } : {})}
          style={{ flex: 1, fontSize: 13, padding: '10px 16px' }}>{actionText}</a>
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
