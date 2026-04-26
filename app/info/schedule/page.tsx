export default function SchedulePage() {
  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <a href="/member/dashboard" className="nav-back">← 返回學員專區</a>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Course Schedule &amp; Venue</p>
          <h1 className="page-title">課程時間與地點</h1>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: 60, position: 'relative', zIndex: 1 }}>
        <div className="card with-line">
          <h2 style={{
            fontFamily: 'var(--font-noto-serif-tc), serif',
            fontSize: 20, fontWeight: 700,
            color: 'var(--green-deep)', letterSpacing: '0.08em',
            marginBottom: 18,
          }}>課程資訊</h2>

          <div style={{ display: 'grid', gap: 0 }}>
            <ScheduleRow k="課程時間" v="2026年8月20日（四）至8月24日（一），共5天" />
            <ScheduleRow k="報到時間" v="2026年8月19日上午10點（台北時間）" />
            <ScheduleRow k="結束時間" v="8月24日下午5點30分（可選擇當日離營或25日上午9點30分前離營）" />
            <ScheduleRow k="課程地點" v={<>日月潭湖畔會館<br />南投縣魚池鄉日月村中正路101號</>} />
            <ScheduleRow k="課程名額" v="250名（額滿為止）" />
            <ScheduleRow k="課程費用" v="課程免費，食宿場地交通費用自理" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="/member/dashboard" className="btn btn-ghost">← 返回學員專區</a>
        </div>
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

function ScheduleRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 16,
      padding: '14px 0',
      borderBottom: '1px dotted var(--line)',
    }}>
      <span style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontStyle: 'italic',
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        fontWeight: 600,
        paddingTop: 2,
      }}>{k}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500, lineHeight: 1.85 }}>{v}</span>
    </div>
  )
}
