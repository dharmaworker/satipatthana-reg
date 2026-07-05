'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { copyForRegistration, buildPhaseDefsFromConfig, getLodgingDeadlineMs, getQuicktestDeadline1Ms, getQuicktestDeadline2Ms, getFeatureOpenMs, payDeadlineForWithConfig, msToDayLabel, msToDotLabel, msToTimeLabel } from '@/lib/registration-period'

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
  registration_phase: string | null
  lodging_status: 'none' | 'submitted_editable' | 'locked'
  tests_uploaded: number
  tests_total: number
  interactive_open: boolean
  interactive_accepting: boolean
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

// 課程形式轉換（實體↔線上）自助功能：暫時隱藏，改 true 即可重新開放
const SHOW_FORMAT_CONVERSION = false

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  approved: { label: '已錄取', cls: 'accepted' },
  pending: { label: '審核中', cls: 'pending' },
  waitlist: { label: '候補', cls: 'waitlist' },
  rejected: { label: '未錄取', cls: 'rejected' },
  withdrawn: { label: '棄權', cls: 'rejected' },
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
  const [interactiveDeadlineMs, setInteractiveDeadlineMs] = useState<number | null>(null)
  const [practicePeriodLabel, setPracticePeriodLabel] = useState('')
  const [practiceEnabled, setPracticeEnabled] = useState(false)
  const [practiceOpenAt, setPracticeOpenAt] = useState<string | null>(null)
  const [schedCfg, setSchedCfg] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch('/api/phase-config').then(r => r.json()).then(d => setSchedCfg(d)).catch(() => {})
  }, [])

  type ProfileData = {
    remaining: number
    chinese_name: string; id_number: string | null; passport_name: string
    dharma_name: string | null; gender: string; age: number
    passport_country: string | null; residence: string; phone: string
    line_id: string | null; wechat_id: string | null
    line_qr_url: string | null; wechat_qr_url: string | null
  }
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<ProfileData | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertSaving, setConvertSaving] = useState(false)
  const [convertMsg, setConvertMsg] = useState('')
  const [convForm, setConvForm] = useState({ pay_confirm: '', health_confirm: '', mental_health_note: '' })
  const [uploadingQr, setUploadingQr] = useState(false)
  const [pwForm, setPwForm] = useState({ newPw: '', confirmPw: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

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
        if (d.deadline_ms) setInteractiveDeadlineMs(d.deadline_ms)
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
      .then(d => {
        if (d.config?.period_label) setPracticePeriodLabel(d.config.period_label)
        const openAt: string | null = d.config?.open_at ?? null
        setPracticeOpenAt(openAt)
        setPracticeEnabled(openAt != null && Date.now() >= new Date(openAt).getTime())
      })
      .catch(() => {})
    fetch(`/api/member/profile?id=${id}&code=${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfileData(d) })
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
  // 錄取通知日後才開放繳費/食宿/快篩
  const phaseDefs = buildPhaseDefsFromConfig(schedCfg)
  const memberPhase = member.registration_phase === 'late' ? 'late' : 'open'
  const paymentOpen = Date.now() >= getFeatureOpenMs(schedCfg, memberPhase, 'payment')
  const lodgingOpen = Date.now() >= getFeatureOpenMs(schedCfg, memberPhase, 'lodging')
  const quicktestOpen = Date.now() >= getFeatureOpenMs(schedCfg, memberPhase, 'quicktest')
  const lodgingDeadlineMs = getLodgingDeadlineMs(schedCfg, memberPhase)
  const lodgingDeadlineLabel = `${msToDayLabel(lodgingDeadlineMs)} ${msToTimeLabel(lodgingDeadlineMs)}前`
  const payDeadline = payDeadlineForWithConfig(schedCfg, memberPhase)
  const payTimeLabel = payDeadline.ms ? msToTimeLabel(payDeadline.ms) : '晚上 8 時'
  const qt1Ms = getQuicktestDeadline1Ms(schedCfg)
  const qt2Ms = getQuicktestDeadline2Ms(schedCfg)
  const interactiveDeadlineLabel = interactiveDeadlineMs ? `${msToDayLabel(interactiveDeadlineMs)} ${msToTimeLabel(interactiveDeadlineMs)}前` : '07/15 晚上 8 點前'

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
  const memberCopy = copyForRegistration(member, schedCfg)

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
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(216,194,154,0.15)', borderRadius: 8, border: '1px solid var(--gold)', fontSize: 13, overflowWrap: 'break-word' }}>
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

        {/* 個人資料修改（所有狀態皆可） */}
        {profileData && (
          <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '18px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingProfile ? 16 : 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 2 }}>Personal Info</p>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>個人資料</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: profileData.remaining > 0 ? 'var(--ink-mute)' : 'var(--red, #c0392b)' }}>
                  還有 {profileData.remaining} 次修改機會
                </span>
                {!editingProfile && profileData.remaining > 0 && (
                  <button onClick={() => { setProfileDraft({ ...profileData }); setEditingProfile(true); setProfileMsg('') }}
                    style={{ padding: '6px 18px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    修改
                  </button>
                )}
              </div>
            </div>

            {editingProfile && profileDraft ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {profileMsg && <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: profileMsg.startsWith('✓') ? 'rgba(73,85,52,0.08)' : 'rgba(192,57,43,0.08)', color: profileMsg.startsWith('✓') ? 'var(--green)' : '#c0392b', fontSize: 13 }}>{profileMsg}</p>}
                <div className="profile-2col">
                  {([
                    ['中文姓名', 'chinese_name', 'text', true],
                    ['護照英文姓名', 'passport_name', 'text', true],
                    ['身分證／護照號碼', 'id_number', 'text', false],
                    ['法名', 'dharma_name', 'text', false],
                    ['手機號碼', 'phone', 'text', true],
                    ['年齡', 'age', 'number', true],
                  ] as [string, keyof typeof profileDraft, string, boolean][]).map(([label, field, type, required]) => (
                    <label key={field} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {label}{required && <span style={{ color: 'var(--red,#c0392b)' }}> *</span>}
                      <input type={type} value={(profileDraft[field] as any) ?? ''}
                        onChange={e => setProfileDraft({ ...profileDraft, [field]: type === 'number' ? Number(e.target.value) : (e.target.value || null) })}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }} />
                    </label>
                  ))}
                </div>
                <div className="profile-2col">
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    性別 <span style={{ color: 'var(--red,#c0392b)' }}>*</span>
                    <select value={profileDraft.gender} onChange={e => setProfileDraft({ ...profileDraft, gender: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }}>
                      <option value="male">男</option>
                      <option value="female">女</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    居住地 <span style={{ color: 'var(--red,#c0392b)' }}>*</span>
                    <select value={profileDraft.residence} onChange={e => setProfileDraft({ ...profileDraft, residence: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }}>
                      {['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    護照頒發地（選填）
                    <select value={profileDraft.passport_country ?? ''} onChange={e => setProfileDraft({ ...profileDraft, passport_country: e.target.value || null })}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }}>
                      <option value="">—</option>
                      {['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {/* 通訊軟體：依原報名選擇只顯示一個 */}
                {(() => {
                  const contactApp = profileDraft.line_id != null ? 'line' : profileDraft.wechat_id != null ? 'wechat' : null
                  if (!contactApp) return null
                  const isLine = contactApp === 'line'
                  const idField = isLine ? 'line_id' : 'wechat_id'
                  const qrField = isLine ? 'line_qr_url' : 'wechat_qr_url'
                  const label = isLine ? 'LINE ID' : 'WeChat 微信號'
                  const qrLabel = isLine ? 'LINE QR Code' : '微信 QR Code'
                  const currentQr = profileDraft[qrField] as string | null
                  return (
                    <div className="profile-2col">
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {label}
                        <input type="text" value={(profileDraft[idField] as any) ?? ''}
                          onChange={e => setProfileDraft({ ...profileDraft, [idField]: e.target.value || null })}
                          style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }} />
                      </label>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {qrLabel}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {currentQr && <img src={currentQr} alt="QR" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />}
                          <label style={{ cursor: 'pointer', padding: '6px 14px', background: 'rgba(73,85,52,0.08)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                            {uploadingQr ? '上傳中…' : currentQr ? '重新上傳' : '上傳圖片'}
                            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                              disabled={uploadingQr}
                              onChange={async e => {
                                const file = e.target.files?.[0]; if (!file) return
                                setUploadingQr(true); setProfileMsg('')
                                const fd = new FormData(); fd.append('file', file); fd.append('kind', contactApp)
                                const res = await fetch('/api/upload-qr', { method: 'POST', body: fd })
                                const d = await res.json()
                                setUploadingQr(false)
                                if (res.ok) setProfileDraft({ ...profileDraft, [qrField]: d.url })
                                else setProfileMsg(d.error || '圖片上傳失敗')
                              }} />
                          </label>
                        </div>
                      </label>
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button disabled={profileSaving} onClick={async () => {
                    setProfileSaving(true); setProfileMsg('')
                    const res = await fetch(`/api/member/profile?id=${id}&code=${encodeURIComponent(code)}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(profileDraft),
                    })
                    const d = await res.json()
                    setProfileSaving(false)
                    if (res.ok) {
                      setProfileData({ ...profileDraft, remaining: d.remaining })
                      setEditingProfile(false)
                      setProfileMsg('')
                    } else {
                      setProfileMsg(d.error || '儲存失敗')
                    }
                  }}
                    style={{ padding: '9px 24px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: profileSaving ? 'not-allowed' : 'pointer' }}>
                    {profileSaving ? '儲存中…' : '確認修改'}
                  </button>
                  <button onClick={() => { setEditingProfile(false); setProfileMsg(''); setPwMsg(''); setPwForm({ newPw: '', confirmPw: '' }) }}
                    style={{ padding: '9px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    取消
                  </button>
                </div>

                {/* 修改密碼（不消耗修改次數） */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 10 }}>修改登入密碼</p>
                  {pwMsg && <p style={{ margin: '0 0 10px', padding: '8px 12px', borderRadius: 8, background: pwMsg.startsWith('✓') ? 'rgba(73,85,52,0.08)' : 'rgba(192,57,43,0.08)', color: pwMsg.startsWith('✓') ? 'var(--green)' : '#c0392b', fontSize: 13 }}>{pwMsg}</p>}
                  <div className="profile-2col" style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      新密碼
                      <input type="password" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                        placeholder="留空則回復手機末4碼預設"
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }} />
                    </label>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      確認新密碼
                      <input type="password" value={pwForm.confirmPw} onChange={e => setPwForm(f => ({ ...f, confirmPw: e.target.value }))}
                        placeholder="再輸入一次"
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }} />
                    </label>
                  </div>
                  <button disabled={pwSaving} onClick={async () => {
                    if (pwForm.newPw && pwForm.newPw !== pwForm.confirmPw) { setPwMsg('兩次密碼不一致'); return }
                    setPwSaving(true); setPwMsg('')
                    const res = await fetch(`/api/member/password?id=${id}&code=${encodeURIComponent(code)}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: pwForm.newPw }),
                    })
                    const d = await res.json()
                    setPwSaving(false)
                    if (res.ok) {
                      setPwMsg(pwForm.newPw ? '✓ 密碼已更新' : '✓ 已清除自訂密碼，回復手機末4碼預設')
                      setPwForm({ newPw: '', confirmPw: '' })
                    } else {
                      setPwMsg(d.error || '儲存失敗')
                    }
                  }}
                    style={{ padding: '8px 20px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pwSaving ? 'not-allowed' : 'pointer' }}>
                    {pwSaving ? '儲存中…' : '更新密碼'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginLeft: 10 }}>不消耗修改次數</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 課程形式轉換（所有狀態皆可自助切換）— 由 SHOW_FORMAT_CONVERSION 控制顯示，目前隱藏 */}
        {SHOW_FORMAT_CONVERSION && (
        <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '18px 22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: convertOpen ? 16 : 0 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 2 }}>Course Format</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>課程形式</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>目前為 <strong>{isOnline ? '線上 Zoom' : '實體課程'}</strong></p>
            </div>
            {!convertOpen && (
              <button onClick={() => { setConvertOpen(true); setConvertMsg(''); setConvForm({ pay_confirm: '', health_confirm: '', mental_health_note: '' }) }}
                style={{ padding: '6px 18px', background: 'var(--gold-deep)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                轉為{isOnline ? '實體' : '線上'}課程
              </button>
            )}
          </div>

          {convertOpen && (
            <div style={{ display: 'grid', gap: 12 }}>
              {convertMsg && <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: convertMsg.startsWith('✓') ? 'rgba(73,85,52,0.08)' : 'rgba(192,57,43,0.08)', color: convertMsg.startsWith('✓') ? 'var(--green)' : '#c0392b', fontSize: 13 }}>{convertMsg}</p>}
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.85, background: 'rgba(216,194,154,0.14)', borderRadius: 8, padding: '10px 14px' }}>
                您將把課程形式從 <strong>{isOnline ? '線上 Zoom' : '實體課程'}</strong> 轉換為 <strong>{isOnline ? '實體課程' : '線上 Zoom'}</strong>。轉換後<strong>報名序號會重新編配</strong>
                {isOnline
                  ? '，實體學號將由學會另行編配；食宿、繳費及互動報名等事項需另行完成（繳費將由學會人員與您聯繫）。'
                  : '；實體相關的食宿／繳費／互動報名將不再適用，網頁待辦以線上為準。'}
              </div>

              {/* 線 → 實：強制補填 Q16 / Q17 / Q18 */}
              {isOnline && (
                <>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    16. 實體課程之食宿、場地及交通費用需由學員自行負擔，並請於期限內完成繳費。您是否可於期限內完成付款？ <span style={{ color: 'var(--red,#c0392b)' }}>*</span>
                    <select value={convForm.pay_confirm} onChange={e => setConvForm(f => ({ ...f, pay_confirm: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }}>
                      <option value="">請選擇</option>
                      <option value="yes">是，我願意按時全額支付</option>
                      <option value="no">否，我不願意支付</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    17. 您是否身體健康，能夠全程獨立參與實體禪修課程？ <span style={{ color: 'var(--red,#c0392b)' }}>*</span>
                    <select value={convForm.health_confirm} onChange={e => setConvForm(f => ({ ...f, health_confirm: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)' }}>
                      <option value="">請選擇</option>
                      <option value="yes">是</option>
                      <option value="no">否</option>
                    </select>
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    18. 您是否有心理或精神疾病史？ <span style={{ color: 'var(--red,#c0392b)' }}>*</span>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="conv_mental" checked={convForm.mental_health_note === 'no'}
                          onChange={() => setConvForm(f => ({ ...f, mental_health_note: 'no' }))} />
                        否，無心理或精神疾病史
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="conv_mental" checked={convForm.mental_health_note.startsWith('yes')}
                          onChange={() => setConvForm(f => ({ ...f, mental_health_note: 'yes:' }))} />
                        是，請詳細說明
                      </label>
                    </div>
                    {convForm.mental_health_note.startsWith('yes') && (
                      <textarea rows={3} placeholder="請詳細說明您的狀況"
                        value={convForm.mental_health_note.replace('yes:', '')}
                        onChange={e => setConvForm(f => ({ ...f, mental_health_note: 'yes:' + e.target.value }))}
                        style={{ marginTop: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)', fontSize: 14, background: 'var(--bg-pure)', color: 'var(--ink)', fontFamily: 'inherit' }} />
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button disabled={convertSaving} onClick={async () => {
                  setConvertSaving(true); setConvertMsg('')
                  const res = await fetch(`/api/member/convert-format?id=${id}&code=${encodeURIComponent(code)}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(isOnline ? convForm : {}),
                  })
                  const d = await res.json()
                  setConvertSaving(false)
                  if (res.ok) {
                    setConvertMsg('✓ 轉換成功，頁面即將更新…')
                    setTimeout(() => window.location.reload(), 1400)
                  } else {
                    setConvertMsg(d.error || '轉換失敗，請稍後再試')
                  }
                }}
                  style={{ padding: '9px 24px', background: 'var(--green)', color: '#f8f2e8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: convertSaving ? 'not-allowed' : 'pointer' }}>
                  {convertSaving ? '轉換中…' : '確認轉換'}
                </button>
                <button onClick={() => { setConvertOpen(false); setConvertMsg('') }}
                  style={{ padding: '9px 16px', background: 'transparent', border: '1.5px solid var(--line-strong)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
        )}

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
                  錄取通知已發送，請於 <strong>{payDeadline.short} {payTimeLabel}前</strong>完成{' '}
                  <a href={withAuth('/pay')}>繳費</a>，並於 <strong>{lodgingDeadlineLabel}</strong>完成{' '}
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
                  deadline={`${payDeadline.short} ${payTimeLabel}前`} urgent={!paymentDone}
                  rows={[
                    ['方案', member.payment_plan || '尚未選擇'],
                    ['狀態', paymentDone ? '繳費已確認' : paymentPending ? '已回報，待確認' : '尚未繳費'],
                  ]}
                  actionHref={paymentOpen ? withAuth('/pay') : undefined}
                  actionText={paymentDone ? '查看' : paymentOpen ? '前往繳費 →' : '尚未開放'}
                  actionDisabled={!paymentOpen && !paymentDone}
                />

                {/* 食宿登記 */}
                <TaskCard
                  idLabel="食" label="Lodging" title="食宿登記"
                  state={lodgingDone ? (lodgingLocked ? 'done' : 'done') : 'todo'}
                  statusBadge={lodgingLocked ? '已鎖定' : lodgingDone ? '可改 1 次' : '待填寫'}
                  badgeKind={lodgingDone ? 'done' : 'todo'}
                  deadline={lodgingDeadlineLabel} urgent={!lodgingDone}
                  rows={[
                    ['狀態', lodgingLocked ? '已修改過 1 次（鎖定）' : lodgingDone ? '已送出（還能修改 1 次）' : '尚未送出'],
                  ]}
                  actionHref={lodgingOpen ? withAuth('/lodging') : undefined}
                  actionText={lodgingLocked ? '查看' : lodgingDone ? '修改一次' : lodgingOpen ? '前往登記 →' : '尚未開放'}
                  actionDisabled={!lodgingOpen && !lodgingDone}
                />

                {/* 快篩 */}
                <TaskCard
                  idLabel="篩" label="Quick Test" title="快篩上傳"
                  state={testsDone ? 'done' : 'todo'}
                  statusBadge={`${member.tests_uploaded}／${member.tests_total}`}
                  badgeKind={testsDone ? 'done' : 'todo'}
                  deadline={`${msToDayLabel(qt1Ms)} ${msToTimeLabel(qt1Ms)} ／ ${msToDayLabel(qt2Ms)} ${msToTimeLabel(qt2Ms)}前`} urgent={false}
                  rows={[
                    ['8/17 快篩', member.tests_uploaded >= 1 ? '✅ 已上傳' : '⏳ 未上傳'],
                    ['8/19 快篩', member.tests_uploaded >= 2 ? '✅ 已上傳' : '⏳ 未上傳'],
                  ]}
                  actionHref={quicktestOpen ? withAuth('/quicktests') : undefined}
                  actionText={testsDone ? '查看' : quicktestOpen ? '前往上傳 →' : '尚未開放'}
                  actionDisabled={!quicktestOpen && !testsDone}
                />

                {/* 互動報名（開始時間到才顯示；截止後可查看但不能送出） */}
                {member.interactive_open && (
                  <TaskCard
                    idLabel="互" label="Interactive" title="互動報名"
                    state={member.interactive_submitted ? 'done' : 'todo'}
                    statusBadge={member.interactive_submitted ? '已送出' : member.interactive_accepting ? '待填寫' : '已截止'}
                    badgeKind={member.interactive_submitted ? 'done' : member.interactive_accepting ? 'todo' : 'done'}
                    deadline={interactiveDeadlineLabel}
                    urgent={!member.interactive_submitted && member.interactive_accepting}
                    rows={[
                      ['集體互動', member.interactive_group_status === 'won' ? '✓ 中簽' : member.interactive_group_status === 'waitlist' ? '✦ 候補' : member.interactive_group_status === 'lost' ? '✗ 沒中簽' : member.interactive_group_status === 'abstain' ? '— 棄權' : '⏳ 未定'],
                      ['分組互動', member.interactive_small_status === 'won' ? '✓ 中簽' : member.interactive_small_status === 'waitlist' ? '✦ 候補' : member.interactive_small_status === 'lost' ? '✗ 沒中簽' : member.interactive_small_status === 'abstain' ? '— 棄權' : '⏳ 未定'],
                    ]}
                    actionHref={member.interactive_accepting || member.interactive_submitted ? withAuth('/member/interactive') : undefined}
                    actionText={member.interactive_submitted ? '查看／修改' : member.interactive_accepting ? '前往報名 →' : '尚未開始'}
                    actionDisabled={!member.interactive_accepting && !member.interactive_submitted}
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
              {practiceEnabled
                ? <a href={withAuth('/member/practice')}
                    style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--green)', color: '#f8f2e8', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
                    前往共修＆打卡 →
                  </a>
                : <span style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--line-strong)', color: 'var(--ink-mute)', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', cursor: 'not-allowed' }}>
                    尚未開始
                  </span>
              }
            </div>

            {/* 課程時間表入口（線上學員：時間表與打卡已整合於同一頁） */}
            <div style={{
              background: 'rgba(180,147,88,0.07)', border: '1px solid rgba(180,147,88,0.25)',
              borderRadius: 14, padding: '18px 22px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold-deep)', textTransform: 'uppercase', marginBottom: 4 }}>Schedule{isOnline ? ' & Attendance' : ''}</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>課程時間表{isOnline ? '與打卡' : ''}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>
                  {isOnline ? '8/20 至 8/24・完整課程安排，並於各場次直接打卡' : '8/20 至 8/24・五日禪修完整課程安排'}
                </p>
              </div>
              {member.timetable_published
                ? <a href={withAuth('/info/schedule')}
                    style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--gold-deep)', color: '#f8f2e8', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
                    {isOnline ? '查看時間表與打卡 →' : '查看時間表 →'}
                  </a>
                : <span style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--line-strong)', color: 'var(--ink-mute)', borderRadius: 999, fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', cursor: 'not-allowed' }}>
                    尚未開始
                  </span>
              }
            </div>

            {/* 重要時程 — period/notify dates derive from DB schedule config + applicant's batch */}
            {(() => {
              const sched = copyForRegistration(member, schedCfg)
              return (
                <div className="schedule-strip">
                  <h3>重要時程 <small>Schedule</small></h3>
                  <div className="schedule-grid">
                    <div className="schedule-cell done"><div className="date">{sched.periodStartDot}–{sched.sidebarDeadlineDate}</div><div className="label">{sched.phase === 'late' ? '補報名期間' : '報名期間'}</div></div>
                    <div className="schedule-cell done"><div className="date">{sched.sidebarNotifyDate}</div><div className="label">錄取通知</div></div>
                    {!isOnline && <div className={`schedule-cell ${paymentDone ? 'done' : 'urgent'}`}><div className="date">{payDeadline.dot}</div><div className="label">繳費截止</div></div>}
                    {!isOnline && <div className={`schedule-cell ${lodgingDone ? 'done' : 'urgent'}`}><div className="date">{msToDotLabel(lodgingDeadlineMs)}</div><div className="label">食宿登記</div></div>}
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
            <p>您已報名{isOnline ? '線上課程（Zoom）' : '實體課程'}，資料已收到，學會正在審核。<br />錄取通知將於 <strong>{memberCopy.notifyShort}</strong> 以 Email 發送，請留意收件匣與垃圾信箱。</p>
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
        {member.status === 'withdrawn' && (
          <div className="pending-card">
            <div className="icon">✗</div>
            <h3>已棄權本次禪修</h3>
            <p>感謝您的報名。若日後有意參加禪修課程，歡迎重新報名。如有任何疑問，歡迎聯絡學會。</p>
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
  idLabel, label, title, state, statusBadge, badgeKind, deadline, urgent, rows, actionHref, actionText, actionDownload, actionDisabled,
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
  actionHref?: string
  actionText: string
  actionDownload?: boolean
  actionDisabled?: boolean
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
        {actionDisabled
          ? <span style={{ flex: 1, fontSize: 13, padding: '10px 16px', display: 'inline-block', textAlign: 'center', borderRadius: 999, background: 'var(--line-strong)', color: 'var(--ink-mute)', cursor: 'not-allowed' }}>{actionText}</span>
          : <a href={actionHref} className="btn btn-primary"
              {...(actionDownload ? { download: '承諾書.docx' } : {})}
              style={{ flex: 1, fontSize: 13, padding: '10px 16px' }}>{actionText}</a>
        }
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
