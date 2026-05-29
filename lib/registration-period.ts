// ============================================================================
// Registration period — single source of truth (templated)
// ----------------------------------------------------------------------------
// HOW TO CHANGE DATES:
//   Edit PHASE_DEFS below. That is the ONLY place dates live.
//   All displayed date strings (subtitle, sidebar, emails, badges) derive
//   from these constants via formatters + template substitution.
//
// HOW TO CHANGE WORDING:
//   Edit COPY entries. Templates contain {placeholders} resolved from dates.
//   Available placeholders per entry:
//     {periodStart}  → phase start as "YYYY/MM/DD 上午 H:MM"
//     {periodEnd}    → phase end as "...晚上 24:00" or similar
//     {phaseStart}   → same as periodStart, as end-of-prior-day form
//     {notifyShort}  → "M/D"
//     {notifyFull}   → "YYYY/MM/DD"
//     {notifyDot}    → "MM.DD"
//     {deadlineDot}  → next-phase start as "MM.DD" (end-of-prior-day)
//
// All times are Taipei (UTC+8). `tpeToUtcMs` converts to a UTC millisecond.
// ============================================================================

const TPE_OFFSET_HOURS = 8

function tpeToUtcMs(year: number, monthIdx0: number, day: number, hour: number, minute = 0): number {
  // hour can be 24 for end-of-day; Date.UTC handles the overflow.
  return Date.UTC(year, monthIdx0, day, hour - TPE_OFFSET_HOURS, minute, 0)
}

export type RegPhase = 'not-yet' | 'open' | 'late' | 'closed'

// ─── Phase definitions (Taipei time) ────────────────────────────────────────
// A phase starts at `startMs` and runs until the next phase's startMs.
// `notifyMs` = when applicants of this phase will be notified (optional;
// only meaningful for phases that accept submissions).
//
// To shift dates: edit the tpeToUtcMs(...) calls below. Nothing else.
// To add a phase: add an entry here AND a matching COPY block.
export interface PhaseDef {
  key: RegPhase
  startMs: number
  notifyMs?: number
  payDeadlineMs?: number
}
export const PHASE_DEFS: PhaseDef[] = [
  { key: 'not-yet', startMs: 0 },
  { key: 'open',    startMs: tpeToUtcMs(2026, 4, 11, 10, 0), notifyMs: tpeToUtcMs(2026, 5, 6, 12, 0),  payDeadlineMs: tpeToUtcMs(2026, 5, 15, 20, 0) },
  { key: 'late',    startMs: tpeToUtcMs(2026, 5, 1,  8, 0),  notifyMs: tpeToUtcMs(2026, 5, 10, 12, 0), payDeadlineMs: tpeToUtcMs(2026, 5, 20, 20, 0) },
  { key: 'closed',  startMs: tpeToUtcMs(2026, 5, 7, 24, 0) },
]

// Back-compat alias (older imports referenced PHASE_STARTS).
export const PHASE_STARTS = PHASE_DEFS

// ─── Phase span helper (start + end + notify per phase) ─────────────────────
export interface PhaseSpan extends PhaseDef {
  endMs: number   // exclusive; equals next phase's startMs (or +Infinity)
}
function computeSpans(): PhaseSpan[] {
  return PHASE_DEFS.map((p, i) => ({
    ...p,
    endMs: PHASE_DEFS[i + 1]?.startMs ?? Number.POSITIVE_INFINITY,
  }))
}
const SPANS = computeSpans()
function spanOf(key: RegPhase): PhaseSpan {
  return SPANS.find(s => s.key === key)!
}

export function getRegPhase(atMs: number = Date.now()): RegPhase {
  let current: RegPhase = 'not-yet'
  for (const p of PHASE_DEFS) if (atMs >= p.startMs) current = p.key
  return current
}

/** True once late-registration window has begun (still true after it closes). */
export function isLateRegOpen(atMs: number = Date.now()): boolean {
  return atMs >= spanOf('late').startMs
}

// ─── Formatters (Taipei display) ────────────────────────────────────────────
function toTpeParts(ms: number) {
  const d = new Date(ms + TPE_OFFSET_HOURS * 3600_000)
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
  }
}
const pad2 = (n: number) => String(n).padStart(2, '0')

/** "2026/06/06" */
function fmtFullDate(ms: number): string {
  const p = toTpeParts(ms)
  return `${p.y}/${pad2(p.mo)}/${pad2(p.d)}`
}
/** "6/6" */
function fmtShortDate(ms: number): string {
  const p = toTpeParts(ms)
  return `${p.mo}/${p.d}`
}
/** "06.06". When `asEnd`, treats ms as exclusive end-of-day and rolls back. */
function fmtMonthDay(ms: number, asEnd = false): string {
  const p = toTpeParts(asEnd ? ms - 1 : ms)
  return `${pad2(p.mo)}.${pad2(p.d)}`
}
/** "6月15日" */
function fmtMonthDayCN(ms: number): string {
  const p = toTpeParts(ms)
  return `${p.mo}月${p.d}日`
}
/**
 * "2026/06/01 上午 8:00" / "2026/05/11 上午 10:00".
 * When `asEnd=true` and the moment is exactly 00:00 of some day, displays
 * as the prior day "晚上 24:00" — matches Chinese end-of-day convention.
 */
function fmtDateTime(ms: number, asEnd = false): string {
  let p = toTpeParts(ms)
  if (asEnd && p.h === 0 && p.mi === 0) {
    p = toTpeParts(ms - 1)
    return `${p.y}/${pad2(p.mo)}/${pad2(p.d)} 晚上 24:00`
  }
  const marker = p.h < 12 ? '上午' : p.h < 18 ? '下午' : '晚上'
  return `${p.y}/${pad2(p.mo)}/${pad2(p.d)} ${marker} ${p.h}:${pad2(p.mi)}`
}

// ─── Template substitution ──────────────────────────────────────────────────
function sub(template: string, vars: Record<string, string>): string {
  if (!template) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

// ─── Per-phase copy (raw templates; resolved at read time) ──────────────────
interface PhaseCopyTemplate {
  isOpen: boolean
  badge: string | null
  badgeColor: string
  periodTemplate: string                  // → periodLabel
  closedIcon: string
  closedHeading: string
  closedDetailTemplate: string            // → closedDetail
  sidebarDeadlineLabel: string
  recruitFlowNotifyLineTemplate: string   // → recruitFlowNotifyLine
  highlightCard: {
    title: string
    subtitle: string
    lineTemplates: string[]
  } | null
}

const COPY_TEMPLATES: Record<RegPhase, PhaseCopyTemplate> = {
  'not-yet': {
    isOpen: false,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodTemplate: '報名期間：{periodStart} — {periodEnd}（台北時間）',
    closedIcon: '⏳',
    closedHeading: '報名尚未開放',
    closedDetailTemplate: '報名將於 {periodStart}（台北時間）開放。感謝您的關注，請屆時再回到本頁。',
    sidebarDeadlineLabel: '報名截止',
    recruitFlowNotifyLineTemplate: '提交報名表後，將於 {notifyShort} 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: null,
  },
  open: {
    isOpen: true,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodTemplate: '報名期間：{periodStart} — {periodEnd}（台北時間）',
    closedIcon: '',
    closedHeading: '',
    closedDetailTemplate: '',
    sidebarDeadlineLabel: '報名截止',
    recruitFlowNotifyLineTemplate: '提交報名表後，將於 {notifyShort} 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: null,
  },
  late: {
    isOpen: true,
    badge: '補報名 LATE',
    badgeColor: '#C97B3F',
    periodTemplate: '補報名期間：{periodStart} — {periodEnd}（台北時間）',
    closedIcon: '',
    closedHeading: '',
    closedDetailTemplate: '',
    sidebarDeadlineLabel: '補報名截止',
    recruitFlowNotifyLineTemplate: '提交補報名表後，將於 {notifyShort} 以 Email 發送錄取通知（提交報名表單不代表已錄取）。',
    highlightCard: {
      title: '🔔 補報名開放中',
      subtitle: 'Late Registration',
      lineTemplates: [
        '實體禪修：60 名（額滿後依序列入候補）',
        '線上禪修：名額不限',
        '補報名期間：{periodStart} — {periodEnd}（台北時間）',
        '錄取通知：{notifyFull} 前以 Email 統一通知',
      ],
    },
  },
  closed: {
    isOpen: false,
    badge: null,
    badgeColor: 'var(--gold-deep)',
    periodTemplate: '',
    closedIcon: '🔒',
    closedHeading: '報名已截止',
    closedDetailTemplate: '報名期間已於 {phaseStart}（台北時間）截止。如有疑問請聯繫學會。',
    sidebarDeadlineLabel: '報名已截止',
    recruitFlowNotifyLineTemplate: '',
    highlightCard: null,
  },
}

// ─── Resolved PhaseCopy (what consumers receive) ────────────────────────────
export interface PhaseCopy {
  phase: RegPhase
  isOpen: boolean
  badge: string | null
  badgeColor: string
  periodLabel: string
  notifyShort: string
  notifyLabel: string
  closedIcon: string
  closedHeading: string
  closedDetail: string
  sidebarDeadlineLabel: string
  sidebarDeadlineDate: string           // period END as "MM.DD"
  periodStartDot: string                // period START as "MM.DD"
  sidebarNotifyDate: string
  recruitFlowNotifyLine: string
  highlightCard: { title: string; subtitle: string; lines: string[] } | null
  // ── Payment deadline (per phase) ──
  payDeadlineDot: string                // "06.15"
  payDeadlineShort: string              // "6/15"
  payDeadlineFull: string               // "2026/06/15"
  payDeadlineCN: string                 // "6月15日"
}

function buildVars(phase: RegPhase): Record<string, string> {
  const span = spanOf(phase)

  // For not-yet, "the period" refers to the upcoming open phase, not the
  // not-yet window itself.
  const refSpan = phase === 'not-yet' ? spanOf('open') : span

  // Notification reference:
  //  • open / late: this phase's own notify
  //  • not-yet: upcoming open phase's notify (what a future applicant gets)
  //  • closed: last accepting phase's notify
  const notifyMs = phase === 'not-yet' ? spanOf('open').notifyMs
                 : phase === 'closed'  ? spanOf('late').notifyMs
                 : span.notifyMs

  // Payment deadline reference: same fallback policy as notify.
  const payMs = phase === 'not-yet' ? spanOf('open').payDeadlineMs
              : phase === 'closed'  ? spanOf('late').payDeadlineMs
              : span.payDeadlineMs

  return {
    periodStart: fmtDateTime(refSpan.startMs),
    periodEnd: Number.isFinite(refSpan.endMs) ? fmtDateTime(refSpan.endMs, true) : '',
    phaseStart: fmtDateTime(span.startMs, true),
    notifyShort: notifyMs ? fmtShortDate(notifyMs) : '',
    notifyFull: notifyMs ? fmtFullDate(notifyMs) : '',
    notifyDot: notifyMs ? fmtMonthDay(notifyMs) : '',
    deadlineDot: Number.isFinite(refSpan.endMs) ? fmtMonthDay(refSpan.endMs, true) : '—',
    periodStartDot: fmtMonthDay(refSpan.startMs),
    payDeadlineDot: payMs ? fmtMonthDay(payMs) : '',
    payDeadlineShort: payMs ? fmtShortDate(payMs) : '',
    payDeadlineFull: payMs ? fmtFullDate(payMs) : '',
    payDeadlineCN: payMs ? fmtMonthDayCN(payMs) : '',
  }
}

function resolveCopy(phase: RegPhase): PhaseCopy {
  const tmpl = COPY_TEMPLATES[phase]
  const vars = buildVars(phase)
  return {
    phase,
    isOpen: tmpl.isOpen,
    badge: tmpl.badge,
    badgeColor: tmpl.badgeColor,
    periodLabel: sub(tmpl.periodTemplate, vars),
    notifyShort: vars.notifyShort,
    notifyLabel: vars.notifyFull,
    closedIcon: tmpl.closedIcon,
    closedHeading: tmpl.closedHeading,
    closedDetail: sub(tmpl.closedDetailTemplate, vars),
    sidebarDeadlineLabel: tmpl.sidebarDeadlineLabel,
    sidebarDeadlineDate: phase === 'closed' ? '—' : vars.deadlineDot,
    periodStartDot: vars.periodStartDot,
    sidebarNotifyDate: vars.notifyDot,
    recruitFlowNotifyLine: sub(tmpl.recruitFlowNotifyLineTemplate, vars),
    highlightCard: tmpl.highlightCard ? {
      title: tmpl.highlightCard.title,
      subtitle: tmpl.highlightCard.subtitle,
      lines: tmpl.highlightCard.lineTemplates.map(l => sub(l, vars)),
    } : null,
    payDeadlineDot: vars.payDeadlineDot,
    payDeadlineShort: vars.payDeadlineShort,
    payDeadlineFull: vars.payDeadlineFull,
    payDeadlineCN: vars.payDeadlineCN,
  }
}

export function getPhaseCopy(atMs: number = Date.now()): PhaseCopy {
  return resolveCopy(getRegPhase(atMs))
}

// ─── Per-record stability ───────────────────────────────────────────────────
// Notification date depends on WHEN the applicant submitted, not on `now`.
// Pass the registration's `created_at` so old records still show their
// original notify date even after phase boundaries shift forward.
// ─── Direct payment-deadline lookup (phase-agnostic display) ────────────────
// Used by static UI (homepage timeline, generic info page) that must show
// both the main and late deadlines side-by-side regardless of `now`.
export interface PayDeadlineLabels {
  dot: string        // "06.15"
  short: string      // "6/15"
  full: string       // "2026/06/15"
  cn: string         // "6月15日"
}
export function payDeadlineFor(phase: 'open' | 'late'): PayDeadlineLabels {
  const ms = spanOf(phase).payDeadlineMs
  if (!ms) return { dot: '', short: '', full: '', cn: '' }
  return {
    dot: fmtMonthDay(ms),
    short: fmtShortDate(ms),
    full: fmtFullDate(ms),
    cn: fmtMonthDayCN(ms),
  }
}

export function copyForCreatedAt(createdAt: string | number | Date | null | undefined): PhaseCopy {
  if (createdAt == null) return resolveCopy('open')
  const ms = typeof createdAt === 'string' ? Date.parse(createdAt)
    : createdAt instanceof Date ? createdAt.getTime()
    : createdAt
  if (!Number.isFinite(ms)) return resolveCopy('open')
  return resolveCopy(getRegPhase(ms))
}
