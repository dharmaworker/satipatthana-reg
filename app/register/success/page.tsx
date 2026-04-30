'use client'
export default function SuccessPage() {
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
          <a href="/" className="nav-back">← 返回首頁</a>
        </div>
      </header>

      <main className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="success-card">
          <h1 className="success-title">報名成功</h1>
          <p className="success-desc">
            感謝您報名「第二屆台灣四念處禪修」。<br />
            系統已將報名資訊發送至您的電子信箱，請注意查收（包括垃圾郵件）。
          </p>

          <div className="success-next">
            <h5>接下來</h5>
            <ol>
              <li>錄取通知將於 <strong>2026/06/06</strong> 透過 E-mail 發送</li>
              <li>錄取者請於 <strong>2026/06/15 晚上 8 點前</strong>完成繳費</li>
              <li>課程日期：<strong>2026/08/20 ～ 08/24</strong>（南投・日月潭）</li>
              <li>可隨時至 <a href="/member" style={{ color: 'var(--green)', fontWeight: 700 }}>學員專區</a> 查詢審核狀態</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/member" className="btn btn-primary">前往學員專區 <span className="arrow">→</span></a>
            <a href="/" className="btn btn-ghost">返回首頁</a>
          </div>

          <p style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-mute)' }}>
            台灣四念處學會 合十
          </p>
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
