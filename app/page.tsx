'use client'
import { useState } from 'react'
import { SITE_ASSETS } from '@/lib/site-assets'

const TEACHERS = {
  'luangpu-pramote': {
    photo: SITE_ASSETS.teacher('luangpu-pramote.webp'),
    name: '隆波帕默尊者',
    nameEn: 'Luangpu Pramote Pamojjo',
    tagline: '廣受尊崇的禪修導師，其教法尤其契合現代都市人。',
    bio: [
      '隆波帕默尊者是一位廣受尊崇的禪修導師，其教法尤其契合現代都市人的需求，幫助人們在繁忙的日常生活中，依然能夠成為具足正念、通達觀智的修行者。',
      '尊者於 1952 年出生於曼谷，先後在泰國頂尖學府朱拉隆功大學取得學士及碩士學位。七歲時，他開始跟隨泰國著名禪修大師隆波李尊者修習觀呼吸法門，之後又得到隆布敦長老、隆波蒲尊者、隆布特長老等多位上座部禪修大師的指導。',
      '2001 年，隆波帕默尊者在泰國蘇里府菩提寺出家。2006 年至 2025 年 10 月間，他擔任春武里府是拉查市解脫園寺（Wat Sanamnai）的住持，其後退居僧團主席，專心指導僧眾及在家禪修者。',
      '自 2014 年起，尊者每年在解脫園寺為來自世界各國的學員指導禪修，其清晰親切的教導深受中國及各地學人的敬愛。',
      '隆波帕默尊者的中文著作包括：《解苦心鑰》《禪修入門》《唯一路》《當疾病來臨時》《當死亡降臨時》《最好的心，是平常心》《微法談》等。',
    ],
  },
  'somchai': {
    photo: SITE_ASSETS.teacher('somchai.webp'),
    name: '阿姜宋彩尊者',
    nameEn: 'Phra Ajahn Somchai Kittiyano',
    tagline: '解脫園寺代理住持，多年擔任隆波帕默尊者的侍者。',
    bio: [
      '阿姜宋彩尊者，法號 Venerable Phra Ajahn Somchai Kittiyano，是泰國當代南傳佛教僧人。',
      '多年來，他一直擔任隆波帕默尊者的侍者，其精進實修與為法奉獻的精神深得隆波帕默尊者的認可與悉心指導。2025 年 10 月 26 日，尊者正式受任為解脫園寺代理住持。',
      '尊者時常在泰國各地禪修中心帶領禪修，並通過遠程課程等方式，指導僧眾與在家弟子修習四念處法門。',
    ],
  },
  'oranuch': {
    photo: SITE_ASSETS.teacher('oranuch.webp'),
    name: '麥琪奧蘭努',
    nameEn: 'Ajahn Khun Mae Oranuch Santayakorn',
    tagline: '資深女性傳法者，由尊者親自指定為資深助理禪師。',
    bio: [
      '麥琪·奧蘭努（Ajahn Khun Mae Oranuch Santayakorn）是泰國著名的南傳佛教女性修行者。',
      '她長期追隨隆波帕默尊者修行，是其法脈下極具代表性的女性傳法者，並被尊者親自指定為資深助理禪師之一。',
      '她常駐於泰國解脫園寺，在隆波帕默尊者法脈的禪修營中擔任指導老師，並協助尊者接引來自世界各地的修習者。',
    ],
  },
  'nat': {
    photo: SITE_ASSETS.teacher('nat.jpeg'),
    name: '阿姜納',
    nameEn: 'Ajahn Nat Sriwachirawat',
    tagline: '退休前曾為牙科醫生，以深厚的禪定修證而聞名。',
    bio: [
      '阿姜納（Ajahn Nat Sriwichirawat），退休前曾為牙科醫生。他長年追隨隆波帕默尊者修行，是其法脈中備受重視的禪修指導老師，並以深厚的禪定修證而聞名。',
      '其教導風格簡明直接，法談平實生動、輕鬆自在，善於結合日常事例引導學人覺察自心，幫助現代人在生活中培育正念與智慧。',
      '他強調修行應保持自然放鬆的心態，避免過度緊繃或勉強用力。其貼近生活、親切易懂的教法，在泰國及華語地區廣受喜愛與歡迎。',
    ],
  },
  'prasan': {
    photo: SITE_ASSETS.teacher('prasan.webp'),
    name: '阿姜巴山',
    nameEn: 'Ajahn Prasan Bhuddhakulsomsiri',
    tagline: '教學風格直率而活潑，足跡遍及華語禪修群體。',
    bio: [
      '阿姜巴山（Ajahn Prasan Bhuddhakulsomsiri），1968 年生於泰國春武里府，1991 年畢業於易三倉大學工商管理系，現任多家公司董事長。',
      '自幼喜愛閱讀佛教典籍與佛陀傳記，大學時期開始實修，曾隨佛使比丘學習，先後修習「稱念佛陀」、隆波田動中禪及觀照腹部起伏等禪法。自 2006 年起，長期跟隨隆波帕默尊者修行。',
      '2012 年，阿姜巴山在生活中親證「法」，深刻體悟「一切生起之法必會滅去」，從此內心徹底轉化，不再執著於「我」的苦樂感受。此後，隆波帕默尊者授權他指導大眾實修。',
      '教學風格直率而活潑，善於針對不同修行者的實際情況給予具體指導。其弘法足跡遍及泰國、中國大陸、台灣、新加坡、馬來西亞、老撾等地，以慈悲願力推動正法傳播，深受華語禪修群體的尊敬。',
      '已出版並譯成中文的著作包括《法談一》與《今天，我們就是那只龜》。',
    ],
  },
  'nitiya': {
    photo: SITE_ASSETS.teacher('nitiya.webp'),
    name: '阿姜妮',
    nameEn: 'Ajahn Nitiya Petchpaiboon',
    tagline: '化工碩士，2017 年獲尊者指派為助理老師。',
    bio: [
      '阿姜妮（Ajahn Nitiya Petchpaiboon）畢業於宋卡王子大學理學院化學系，獲二等榮譽學士學位，其後於朱拉隆功大學理學院化學工程與技術化學系取得碩士學位。',
      '她曾長期任職於泰國電力局生產部門，從事發電廠開發與相關工作，現已退休。',
      '2007 年開始跟隨隆波帕默尊者系統學習佛法，此前並未在其他地方修學。經過多年專心實修與深入學法，於 2017 年 9 月獲隆波帕默尊者指派為助理老師，協助弘法並指導禪修。',
      '其弘法足跡已遍及泰國、中國大陸、台灣、新加坡、馬來西亞及老撾等地。',
    ],
  },
  'napatpol': {
    photo: SITE_ASSETS.teacher('napatpol.webp'),
    name: '阿姜松',
    nameEn: 'Ajahn Napatpol Kunatanasate',
    tagline: '「心要想能夠明白法，一定要靠自己去領悟。」',
    bio: ['更多介紹資料整理中。'],
  },
} as const

type TeacherId = keyof typeof TEACHERS

const ONLINE_TEACHERS: TeacherId[] = ['luangpu-pramote', 'somchai', 'oranuch']
const IN_PERSON_TEACHERS: TeacherId[] = ['nat', 'prasan', 'nitiya', 'napatpol']

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<TeacherId | null>(null)
  const t = modal ? TEACHERS[modal] : null

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a href="#top" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <nav className={`menu ${menuOpen ? 'open' : ''}`}>
            <a href="#about" onClick={() => setMenuOpen(false)}>活動緣起</a>
            <a href="#teachers" onClick={() => setMenuOpen(false)}>師資</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>常見問題</a>
            <a href="/register" onClick={() => setMenuOpen(false)}>立即報名</a>
            <a href="/member" onClick={() => setMenuOpen(false)}>查詢報名狀態｜學員專區</a>
          </nav>
          <button className="nav-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="選單">
            <span></span>
          </button>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="hero">
          <div className="hero-bg" style={{ backgroundImage: `url(${SITE_ASSETS.sunsetBg})` }} />
          <div className="hero-overlay" />
          <div className="hero-ink" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">第二屆・台灣四念處禪修之旅 · 2026</p>
              <h1>唯一路</h1>
              <p className="hero-subtitle">邁向 · 離苦之道</p>

              <div className="hero-meta">
                <span><span className="icon">📅</span>日期：8/20 — 24（五天）</span>
                <span><span className="icon">📍</span>地點：南投・日月潭</span>
                <span className="reg-period"><span className="icon">📝</span>報名期間：2026/05/11 — 05/25</span>
              </div>

              <div className="hero-quote">
                <p>人類渴望自由。而事實卻是，人類淪為了慾望的奴隸。</p>
                <p>人類及所有眾生趨樂避苦的方法有三種：</p>
                <ol>
                  <li>尋找快樂的境界或所緣，同時躲避痛苦的境界或所緣</li>
                  <li>在任何情形下呵護心，令其寧靜與舒適</li>
                  <li>躲避與境界或所緣接觸</li>
                </ol>
                <p>人類以及所有眾生，以各式各樣的方式來趨樂避苦，卻始終未能如願。那是因為，苦與蘊是如影隨形的。惟有佛陀才能找到真正導向離苦的唯一路。</p>
                <p>這條離苦的唯一路，就是毗缽舍那（Vipassanā）的修行。</p>
                <p>依照佛陀的教導步入毗缽舍那的修行——如實照見名色（身心），直至最終體證道、果、涅槃，徹底抵達苦的止息。</p>
                <span className="author">隆波帕默尊者</span>
              </div>

              <div className="hero-actions">
                <a className="btn btn-primary" href="/register">立即報名 <span className="arrow">→</span></a>
                <a className="btn btn-secondary" href="/member">查詢報名狀態｜學員專區 →</a>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="section" id="about">
          <div className="container intro-grid">
            <div className="intro-poster">
              <img src={SITE_ASSETS.poster} alt="活動海報" />
            </div>
            <div className="intro-content">
              <p className="section-kicker">About the Retreat</p>
              <h2>唯一路</h2>
              <p>離苦的唯一路，<br />即是毗缽舍那（Vipassanā）的修行。<br />修習四念處，<br />本身就是通往覺醒之道。</p>
              <p>承蒙 隆波帕默尊者 體系助教老師指導，<br />於水月之間，共修四念處覺醒之道。<br />本次禪修將於 2026 年 8 月 20 日至 8 月 24 日，<br />於南投日月潭湖畔會館展開，為期五日四夜。</p>
              <p>誠摯邀請您，走入日月潭的山水之間，<br />在助教老師引領下，親自踏上四念處的覺醒之路。<br />修行，從此時此刻的「看見」開始。</p>
            </div>
          </div>
        </section>

        {/* At a glance */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="section-kicker">At a Glance</p>
              <h2>活動資訊</h2>
            </div>
            <div className="key-info">
              <div className="key-item">
                <div className="key-label">Date <span className="cn">日期</span></div>
                <div className="key-value">
                  <span className="big">08.20—24</span>
                  <span className="sub">2026 · 共五日</span>
                </div>
              </div>
              <div className="key-item">
                <div className="key-label">Venue <span className="cn">地點</span></div>
                <div className="key-value">南投・日月潭<span className="sub">Sun Moon Lake, Taiwan</span></div>
              </div>
              <div className="key-item">
                <div className="key-label">Host <span className="cn">主辦</span></div>
                <div className="key-value">四念處禪修學會<span className="sub">Satipaṭṭhāna Society</span></div>
              </div>
              <div className="key-item">
                <div className="key-label">Capacity <span className="cn">名額</span></div>
                <div className="key-value">
                  <span className="big">250</span>
                  <span className="sub">名額有限，額滿為止</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Teachers */}
        <section className="section muted teachers-section" id="teachers">
          <div className="container">
            <div className="section-head">
              <p className="section-kicker">Teachers &amp; Mentors</p>
              <h2>指導老師團隊</h2>
              <p>承蒙隆波帕默尊者慈悲教導，由弟子助教老師團隊親臨授課。</p>
            </div>

            <div className="teacher-group">
              <div className="teacher-group-header">
                <h3>泰國連線授課</h3>
                <span className="label">Online · Thailand</span>
              </div>
              <div className="teachers-grid three-col">
                {ONLINE_TEACHERS.map(id => (
                  <TeacherCard key={id} id={id} onClick={() => setModal(id)} />
                ))}
              </div>
            </div>

            <div className="teacher-group">
              <div className="teacher-group-header">
                <h3>親臨授課</h3>
                <span className="label">In Person · Taiwan</span>
              </div>
              <div className="teachers-grid">
                {IN_PERSON_TEACHERS.map(id => (
                  <TeacherCard key={id} id={id} onClick={() => setModal(id)} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="section-kicker">Important Dates</p>
              <h2>重要時程</h2>
              <p>請留意以下關鍵日期。</p>
            </div>
            <div className="timeline">
              <TimelineItem side="left" date="05.11 — 05.25" title="報名期間" desc="線上填寫報名表，提交個人資料與修學背景。" />
              <TimelineItem side="right" date="06.06　錄取通知" title="錄取通知發送" desc="錄取者將於 6 月 6 日收到 E-mail 通知。提交報名表單不代表已錄取。" />
              <TimelineItem side="left" date="06.15　繳費截止" title="完成繳費以正式錄取" desc="錄取者須於 6 月 15 日台北時間晚上 8 時前完成繳費，才算正式錄取。" />
              <TimelineItem side="right" date="08.20 — 08.24" title="禪修正式開始" desc="報到、安單、開始為期五日四夜的四念處禪修。" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section muted" id="faq">
          <div className="container">
            <div className="section-head">
              <p className="section-kicker">FAQ</p>
              <h2>常見問題</h2>
            </div>
            <div className="faq-list">
              <details open>
                <summary>需要具備什麼條件才能報名？</summary>
                <p>需<strong>同時滿足以下三項條件</strong>：<br />
                一、<strong>聞法條件</strong>（任一即可）：曾參加過任意一屆隆波帕默尊者體系的線下實體或線上網路課程／參加過每月 ZOOM 指導老師線上互動／完整觀看 3 屆泰國禪修之旅課程錄影／聆聽隆波帕默尊者法談開示 30 篇以上。<br />
                二、<strong>持守五戒</strong>。<br />
                三、<strong>堅持做固定形式的練習</strong>（如經行、靜坐）。</p>
              </details>
              <details>
                <summary>錄取流程是怎樣的？</summary>
                <p>提交報名表單<strong>不代表已錄取</strong>。錄取通知將於 <strong>6 月 6 日</strong>以 Email 發送，請留意收件匣與垃圾信箱。<br />
                收到錄取通知後，須於 <strong>6 月 15 日台北時間晚上 8 時前</strong>匯款／刷卡繳交食宿、場地及交通等費用，並至學員專區填寫繳費資料，才算完成正式錄取。<br />
                正式錄取者將建立 LINE 及微信群組聯繫。<strong style={{ color: 'var(--gold-deep)' }}>請勿在錄取確認前購買機票或安排行程。</strong></p>
              </details>
              <details>
                <summary>禪修期間需要全程禁語嗎？</summary>
                <p>是的，禪修期間全程禁語（除與助教老師小參時間外），這是維持禪修品質的重要規範。</p>
              </details>
              <details>
                <summary>住宿安排是怎樣的？</summary>
                <p>於日月潭湖畔會館，提供雙人房、多人房等多種房型，含床具、棉被、毛巾等基本備品。詳細房型與費用於錄取後通知，並由學員專區完成登記。</p>
              </details>
              <details>
                <summary>飲食有什麼安排？</summary>
                <p>每日提供早、午二餐素食，過午不食。飲食以清淡為主，禁五辛、酒類。如有特殊飲食需求（過敏、無麩質等），請於食宿登記時註明。</p>
              </details>
              <details>
                <summary>交通如何前往？</summary>
                <p>可自行前往日月潭禪修場地，亦可選擇主辦單位之台中／台北接駁服務。詳細路線、接駁集合時間與費用於錄取後於學員專區提供。</p>
              </details>
              <details>
                <summary>費用大約多少？</summary>
                <p>禪修課程本身免費。食宿、場地及交通等費用依房型由參加者自理，具體金額會在錄取通知中載明，並由學員專區完成登記繳費。</p>
              </details>
              <details>
                <summary>需要自備什麼物品？</summary>
                <p>建議準備寬鬆舒適的禪修服、個人盥洗用品、保暖衣物等。詳細打包清單會於錄取後一併提供。</p>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* Teacher modal */}
      {modal && t && (
        <div className="teacher-modal open" onClick={() => setModal(null)}>
          <div className="teacher-modal-card" onClick={e => e.stopPropagation()}>
            <button className="teacher-modal-close" onClick={() => setModal(null)} aria-label="關閉">✕</button>
            <div className="teacher-modal-photo">
              <img src={t.photo} alt={t.name} />
              <div className="photo-name">{t.name}<small>{t.nameEn}</small></div>
            </div>
            <div className="teacher-modal-body">
              <h2 className="teacher-modal-name">{t.name}</h2>
              <p className="teacher-modal-name-en">{t.nameEn}</p>
              <div className="teacher-modal-bio">
                {t.bio.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-txt">台灣四念處禪修學會</div>
              <div className="footer-brand-en">Satipaṭṭhāna Society Taiwan</div>
              <p className="footer-about">護持佛法四念處，推廣隆波帕默尊者教導的禪修法門，邀請大眾一起踏上覺醒之路。</p>
            </div>
            <div>
              <h5>快速連結</h5>
              <ul>
                <li><a href="#about">活動緣起</a></li>
                <li><a href="#teachers">指導老師</a></li>
                <li><a href="#faq">常見問題</a></li>
              </ul>
            </div>
            <div>
              <h5>報名相關</h5>
              <ul>
                <li><a href="/register">禪修報名</a></li>
                <li><a href="/member">查詢報名狀態｜學員專區</a></li>
              </ul>
            </div>
            <div>
              <h5>聯絡我們</h5>
              <ul>
                <li><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
            <div>唯一路 · 從如實知開始</div>
          </div>
        </div>
      </footer>
    </>
  )
}

function TeacherCard({ id, onClick }: { id: TeacherId; onClick: () => void }) {
  const t = TEACHERS[id]
  return (
    <article className="teacher-card" onClick={onClick}>
      <div className="teacher-photo"><img src={t.photo} alt={t.name} /></div>
      <h4 className="teacher-name">{t.name}</h4>
      <p className="teacher-name-en">{t.nameEn}</p>
      <p className="teacher-tagline">{t.tagline}</p>
      <span className="teacher-more">View Profile →</span>
    </article>
  )
}

function TimelineItem({ side, date, title, desc }: { side: 'left' | 'right'; date: string; title: string; desc: string }) {
  return (
    <div className="timeline-item">
      {side === 'left' ? (
        <>
          <div className="timeline-card">
            <div className="date">{date}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
          <div className="timeline-dot" />
          <div />
        </>
      ) : (
        <>
          <div />
          <div className="timeline-dot" />
          <div className="timeline-card">
            <div className="date">{date}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        </>
      )}
    </div>
  )
}
