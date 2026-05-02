import { SITE_ASSETS } from '@/lib/site-assets'
export default function PaymentPage() {
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
          <p className="page-kicker">Payment Plans &amp; Methods</p>
          <h1 className="page-title">費用說明與支付方式</h1>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: 60, position: 'relative', zIndex: 1 }}>
        <div className="card with-line" style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-noto-serif-tc), serif',
            fontSize: 20, fontWeight: 700,
            color: 'var(--green-deep)', letterSpacing: '0.08em',
            marginBottom: 18,
          }}>費用方案</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(73, 85, 52, 0.08)' }}>
                  <th style={cellHeadStyle}>方案</th>
                  <th style={cellHeadStyle}>說明</th>
                  <th style={{ ...cellHeadStyle, textAlign: 'right' }}>金額(NT$)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['A(1)', '8/20-8/24 食宿等費用（匯款）', '18,600'],
                  ['A(2)', '8/20-8/24 食宿等費用（刷卡）', '19,300'],
                  ['B(1)', '8/19-8/24 食宿費用（匯款）', '20,350'],
                  ['B(2)', '8/19-8/24 食宿費用（刷卡）', '21,050'],
                  ['C(1)', '8/19 — 8/25 食宿等費用（匯款）', '22,590'],
                  ['C(2)', '8/19 — 8/25 食宿等費用（刷卡）', '23,290'],
                  ['D(1)', '8/20-8/25 食宿等費用（匯款）', '20,840'],
                  ['D(2)', '8/20-8/25 食宿等費用（刷卡）', '21,540'],
                ].map(([plan, desc, amount]) => (
                  <tr key={plan} style={{ borderBottom: '1px dotted var(--line)' }}>
                    <td style={{ ...cellStyle, fontWeight: 700, fontFamily: 'var(--font-cormorant), serif', color: 'var(--gold-deep)', letterSpacing: '0.05em' }}>{plan}</td>
                    <td style={cellStyle}>{desc}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-cormorant), serif', color: 'var(--green-deep)', letterSpacing: '0.04em' }}>{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-noto-serif-tc), serif',
            fontSize: 20, fontWeight: 700,
            color: 'var(--green-deep)', letterSpacing: '0.08em',
            marginBottom: 18,
          }}>支付方式</h2>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="info-card" style={{ marginBottom: 0 }}>
              <h4><span className="icon">🇹🇼</span>匯款（台灣法友）</h4>
              <div className="info-row"><span className="k">戶名</span><span className="v">台灣四念處學會</span></div>
              <div className="info-row"><span className="k">銀行</span><span className="v">第一銀行 仁和分行</span></div>
              <div className="info-row"><span className="k">代號</span><span className="v">007</span></div>
              <div className="info-row">
                <span className="k">帳號</span>
                <span className="v" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 17, letterSpacing: '0.08em', color: 'var(--green-deep)' }}>16510068750</span>
              </div>
            </div>

            <div className="info-card" style={{ marginBottom: 0 }}>
              <h4><span className="icon">🌏</span>匯款（國外法友）</h4>
              <div className="info-row"><span className="k">戶名</span><span className="v">台灣四念處學會</span></div>
              <div className="info-row"><span className="k">銀行</span><span className="v">第一銀行 仁和分行</span></div>
              <div className="info-row"><span className="k">代號</span><span className="v">007</span></div>
              <div className="info-row">
                <span className="k">帳號</span>
                <span className="v" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 17, letterSpacing: '0.08em', color: 'var(--green-deep)' }}>16540016022</span>
              </div>
            </div>

            <div className="info-card" style={{ marginBottom: 0 }}>
              <h4><span className="icon">💳</span>信用卡刷卡</h4>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.85 }}>
                收到錄取通知後，點擊信件中的「前往繳費」按鈕，選擇刷卡方案即可線上刷卡。
              </p>
            </div>
          </div>
        </div>

        <div className="alert-card">
          <div className="alert-card-title">繳費注意事項</div>
          <ul>
            <li>請於 <strong>2026 年 6 月 15 日晚上 8 時前</strong>完成繳費</li>
            <li>一旦繳費後取消報名，<strong>已付費用恕無法退款或轉讓</strong></li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="/member/dashboard" className="btn btn-ghost">← 返回學員專區</a>
        </div>
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

const cellHeadStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  fontFamily: 'var(--font-noto-serif-tc), serif',
  fontSize: 13, fontWeight: 700,
  color: 'var(--ink)',
  letterSpacing: '0.08em',
  borderBottom: '1px solid var(--line-strong)',
}

const cellStyle: React.CSSProperties = {
  padding: '14px 16px',
  color: 'var(--ink-soft)',
  fontSize: 14,
}
