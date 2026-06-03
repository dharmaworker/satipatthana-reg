export const MAIL_TYPE_LABEL: Record<string, string> = {
  approval:             '錄取通知',
  student_id:           '學號分配通知',
  timetable_notify:     '課表發佈通知',
  formal_notification:  '正式學員通知',
  attendance_notify:    '出席通知',
  register_confirm:     '報名確認',
  lodging_confirm:      '食宿確認',
  resend_code:          '重寄驗證碼',
  interactive_invite:   '互動報名通知',
  interactive_notify:   '互動結果通知',
  quicktest_confirm:    '快篩確認',
}

export function inferMailTypeFromSubject(subject: string | null | undefined): string | null {
  if (!subject) return null
  if (subject.includes('錄取')) return '錄取通知'
  if (subject.includes('學號分配')) return '學號分配通知'
  if (subject.includes('課程時間表')) return '課表發佈通知'
  if (subject.includes('正式學員')) return '正式學員通知'
  if (subject.includes('打卡')) return '出席通知'
  if (subject.includes('食宿')) return '食宿確認'
  if (subject.includes('專屬代碼')) return '重寄驗證碼'
  if (subject.includes('互動作業') || subject.includes('互動報名結果')) return '互動結果通知'
  if (subject.includes('互動報名')) return '互動報名通知'
  if (subject.includes('快篩')) return '快篩確認'
  if (subject.includes('報名確認')) return '報名確認'
  return null
}

export function fmtMailType(mailType: string | null | undefined, subject: string | null | undefined): string {
  if (mailType && MAIL_TYPE_LABEL[mailType]) return MAIL_TYPE_LABEL[mailType]
  const inferred = inferMailTypeFromSubject(subject)
  if (inferred) return inferred + '?'
  return mailType ?? '—'
}
