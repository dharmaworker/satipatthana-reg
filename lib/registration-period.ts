// ============================================================================
// Registration period — single source of truth (templated)
// ----------------------------------------------------------------------------
// HOW TO CHANGE DATES / COPY:
//   1. Adjust PHASE_STARTS below to shift phase boundaries.
//   2. Edit the matching entry in COPY to change displayed wording.
// Everything else in the codebase derives from this file via getPhaseCopy().
//
// All times are Taipei (UTC+8). `tpeToUtcMs` converts to a UTC millisecond.
// ============================================================================

const TPE_OFFSET_HOURS = 8

function tpeToUtcMs(year: number, monthIdx0: number, day: number, hour: number, minute = 0): number {
  // hour can be 24 for end-of-day; Date.UTC handles the overflow.
  return Date.UTC(year, monthIdx0, day, hour - TPE_OFFSET_HOURS, minute, 0)
}

export type RegPhase = 'not-yet' | 'open' | 'late' | 'closed'

// ─── Phase boundaries (Taipei time) ─────────────────────────────────────────
// A phase starts at its `startMs` and runs until the next phase's startMs.
// To add or remove phases, edit this array and the matching COPY entries.
export const PHASE_STARTS: { key: RegPhase; startMs: number }[] = [
  { key: 'not-yet', startMs: 0 },
  { key: 'open',    startMs: tpeToUtcMs(2026, 4, 11, 10, 0) }, // 2026/05/11 10:00
  { key: 'late',    startMs: tpeToUtcMs(2026, 5, 1,  0,  0) }, // 2026/06/01 00:00
  { key: 'closed',  startMs: tpeToUtcMs(2026, 5, 7, 24, 0) }, // 2026/06/07 24:00
]

export function getRegPhase(atMs: number = Date.now()): RegPhase {
  let current: RegPhase = 'not-yet'
  for (const p of PHASE_STARTS) if (atMs >= p.startMs) current = p.key
  return current
}

// ─── Copy template per phase ────────────────────────────────────────────────
// Each phase has a full copy bundle. Render fields read straight from this
// object — components never branch on phase themselves.
export interface PhaseCopy {
  phase: RegPhase
  isOpen: boolean                       // form is accepting submissions
  badge: string | null                  // chip rendered in header (null = none)
  badgeColor: string                    // CSS color for badge / accent
  periodLabel: string                   // "報名期間：xx — xx（台北時間）"
  notifyShort: string                   // e.g. "6/6"
  notifyLabel: string                   // e.g. "2026/06/06"
  // Closed / not-yet info-card
  closedIcon: string                    // single emoji shown in big circle
  closedHeading: string                 // big title in closed-state card
  closedDetail: string                  // body text in closed-state card
  // Sidebar quick-info
  sidebarDeadlineLabel: string          // "報名截止" / "補報名截止"
  sidebarDeadlineDate: string           // "06.01" / "06.07"
  sidebarNotifyDate: string             // "06.06" / "06.10"
  // Step-3 recruitment flow line 1
  recruitFlowNotifyLine: string         // full sentence
  // Optional attention card (sidebar + homepage hero)
  highlightCard: { title: string; subtitle: string; lines: string[] } | null
}

const NORMAL_PERIOD = '報名期間：2026/05/11 上午 10:00 — 2026/06/01 晚上 24:00（台北時間）'
const LATE_PERIOD   = '補報名期間：2026/06/01 08:00 — 2026/06/07 晚上 24:00（台北時間）'

export const COPY: Record<RegPhase, PhaseCopy> = {
  'not-yet': {
    phase: 'not-yet',
    isOpen: false,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodLabel: NORMAL_PERIOD,
    notifyShort: '6/6',
    notifyLabel: '2026/06/06',
    closedIcon: '⏳',
    closedHeading: '報名尚未開放',
    closedDetail: '報名將於 2026/05/11 上午 10 點（台北時間）開放。感謝您的關注，請屆時再回到本頁。',
    sidebarDeadlineLabel: '報名截止',
    sidebarDeadlineDate: '06.01',
    sidebarNotifyDate: '06.06',
    recruitFlowNotifyLine: '提交報名表後，將於 6/6 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: null,
  },
  open: {
    phase: 'open',
    isOpen: true,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodLabel: NORMAL_PERIOD,
    notifyShort: '6/6',
    notifyLabel: '2026/06/06',
    closedIcon: '',
    closedHeading: '',
    closedDetail: '',
    sidebarDeadlineLabel: '報名截止',
    sidebarDeadlineDate: '06.01',
    sidebarNotifyDate: '06.06',
    recruitFlowNotifyLine: '提交報名表後，將於 6/6 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: null,
  },
  late: {
    phase: 'late',
    isOpen: true,
    badge: '補報名 LATE',
    badgeColor: '#C97B3F',
    periodLabel: LATE_PERIOD,
    notifyShort: '6/10',
    notifyLabel: '2026/06/10',
    closedIcon: '',
    closedHeading: '',
    closedDetail: '',
    sidebarDeadlineLabel: '補報名截止',
    sidebarDeadlineDate: '06.07',
    sidebarNotifyDate: '06.10',
    recruitFlowNotifyLine: '提交補報名表後，將於 6/10 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: {
      title: '🔔 補報名開放中',
      subtitle: 'Late Registration',
      lines: [
        '實體禪修：60 名（額滿後依序列入候補）',
        '線上禪修：名額不限',
        '補報名期間：2026/06/01 08:00 — 2026/06/07 晚上 24:00（台北時間）',
        '錄取通知：2026/06/10 前以 Email 統一通知',
      ],
    },
  },
  closed: {
    phase: 'closed',
    isOpen: false,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodLabel: '',
    notifyShort: '6/10',
    notifyLabel: '2026/06/10',
    closedIcon: '🔒',
    closedHeading: '報名已截止',
    closedDetail: '報名期間已於 2026/06/07 晚上 24 點（台北時間）截止。如有疑問請聯繫學會。',
    sidebarDeadlineLabel: '報名已截止',
    sidebarDeadlineDate: '—',
    sidebarNotifyDate: '06.10',
    recruitFlowNotifyLine: '',
    highlightCard: null,
  },
}

export function getPhaseCopy(atMs: number = Date.now()): PhaseCopy {
  return COPY[getRegPhase(atMs)]
}

// ─── Helpers for stable per-record display ──────────────────────────────────
// Notification date depends on WHEN the applicant submitted, not on `now`.
// Pass the registration's `created_at` so old records still show their
// original notify date even after phase boundaries shift forward.
export function copyForCreatedAt(createdAt: string | number | Date | null | undefined): PhaseCopy {
  if (createdAt == null) return COPY.open
  const ms = typeof createdAt === 'string' ? Date.parse(createdAt)
    : createdAt instanceof Date ? createdAt.getTime()
    : createdAt
  if (!Number.isFinite(ms)) return COPY.open
  return COPY[getRegPhase(ms)]
}
