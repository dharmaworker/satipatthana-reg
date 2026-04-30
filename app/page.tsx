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
    photo: SITE_ASSETS.teacher('somchai.jpg'),
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
    photo: SITE_ASSETS.teacher('oranuch.jpg'),
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
    photo: SITE_ASSETS.teacher('nat.jpg'),
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
    photo: SITE_ASSETS.teacher('prasan.jpg'),
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
    photo: SITE_ASSETS.teacher('nitiya.jpg'),
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
    photo: SITE_ASSETS.teacher('napatpol.jpg'),
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
            <a href="#faq" onClick={() => setMenuOpen(false)}>報名須知</a>
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
              <h2>【師資團隊】</h2>
              <p>隆波帕默尊者體系助教老師 親臨授課指導</p>
            </div>

            <div className="teacher-group">
              <div className="teacher-group-header">
                <h3>泰國連線授課</h3>
                <span className="label">Online · Thailand</span>
              </div>
              <div className="teachers-grid three-col">
                {ONLINE_TEACHERS.map(id => (
                  <TeacherCard key={id} id={id} />
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
                  <TeacherCard key={id} id={id} />
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
              <TimelineItem side="left" date="06.15　繳費截止" title="完成繳費以正式錄取" desc="錄取者須於 6月15日（台北時間）晚上 8 時前完成繳費，才算正式錄取。" />
              <TimelineItem side="right" date="08.20 — 08.24" title="報到、入住後" desc="展開為期五日四夜的四念處禪修" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section muted" id="faq">
          <div className="container">
            <div className="section-head">
              <p className="section-kicker">FAQ</p>
              <h2>報名須知</h2>
            </div>
            <div className="faq-list">
              <details open>
                <summary>需要具備什麼條件才能報名？</summary>
                <p>需<strong>同時滿足以下三項條件</strong>：<br />
                一、<strong>聞法條件</strong>（任一即可）：曾參加過任一屆隆波帕默尊者體系的線下實體或線上網路課程／參加過每月 ZOOM 指導老師線上互動／完整觀看 3 屆泰國禪修之旅課程錄影／聆聽隆波帕默尊者法談開示 30 篇以上。<br />
                二、<strong>持守五戒</strong>。<br />
                三、<strong>堅持做固定形式的練習</strong>（如經行、靜坐）。</p>
              </details>
              <details>
                <summary>錄取流程是怎樣的？</summary>
                <p>提交報名表單<strong>不代表已錄取</strong>。錄取通知將於 <strong>6 月 6 日</strong>以 Email 發送，請留意收件匣與垃圾信箱。<br />
                收到錄取通知後，須於 <strong>6月15日（台北時間）晚上 8 時前</strong>匯款／刷卡繳交食宿、場地及交通等費用，並至學員專區填寫繳費資料，才算完成正式錄取。<br />
                正式錄取者將建立 LINE 及微信群組聯繫。<strong style={{ color: 'var(--gold-deep)' }}>請勿在錄取確認前購買機票或安排行程。</strong></p>
              </details>
              <details>
                <summary>禪修期間需要全程禁語嗎？</summary>
                <p>是的。為維持禪修品質，禪修期間採全程禁語。<br />除必要事務外，請將覺知帶回自身，時時保持覺知。<br />靜默，是為了讓心更清晰地看見。</p>
              </details>
              <details>
                <summary>住宿安排如何？</summary>
                <p>本次住宿地點為日月潭湖畔會館。<br />提供四人房型，每房皆為單人床，並設有兩套衛浴，<br />配備床具、棉被與毛巾等基本用品。<br />一次性盥洗用品（牙刷、牙膏、洗衣精等）需自行準備，<br />會館未提供亦無販售。<br />另請自備水杯、衣架與戶外拖鞋。</p>
              </details>
              <details>
                <summary>飲食安排？</summary>
                <p>每日提供早餐、午餐、下午茶點與晚餐，<br />提供葷食與素食選擇。<br />不提供飲料與酒類。<br />如有葷素需求或其他飲食習慣，<br />請於報名時填寫，以利安排。</p>
              </details>
              <details>
                <summary>交通方式與接駁安排</summary>
                <p>可自行開車或搭乘大眾運輸前往日月潭禪修場地，<br />或選擇主辦單位提供之台北／台中／桃園機場（供國外學員）專車接送服務。<br />接駁路線、集合地點、時間及費用，<br />將於錄取後於學員專區公布。</p>
              </details>
              <details>
                <summary>禪修需要費用嗎？</summary>
                <p>禪修課程免費。<br />學員需負擔食宿等相關費用</p>
              </details>
              <details>
                <summary>需要自備什麼物品？</summary>
                <p>建議攜帶寬鬆舒適的衣物，請穿著長褲，避免短褲及裙裝，<br />並準備個人盥洗用品、保暖衣物（冷氣房內使用）及傘具。<br />另請自備水杯、衣架、戶外拖鞋及個人常用藥品。<br />如有個人習慣用品，亦可自行攜帶。<br />台灣電壓為 110V，請自備充電器；<br />國外學員建議攜帶電源轉接器。</p>
              </details>
              <details>
                <summary>會館是否有販售部？</summary>
                <p>有，館內設有販售部。<br />提供飲料、餅乾及紀念品等商品。<br />未販售牙膏、牙刷、毛巾等盥洗用品，<br />請自行準備。<br />消費滿 300 元可使用信用卡。</p>
              </details>
            </div>
          </div>
        </section>
      </main>


      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-txt">台灣四念處學會</div>
              <div className="footer-brand-en">Satipaṭṭhāna Society Taiwan</div>
              <p className="footer-about">護持佛陀四念處正法，推廣隆波帕默尊者的禪修法門，邀請大眾共同走向覺醒之路。</p>
            </div>
            <div>
              <h5>快速連結</h5>
              <ul>
                <li><a href="#about">活動緣起</a></li>
                <li><a href="#teachers">指導老師</a></li>
                <li><a href="#faq">報名須知</a></li>
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
              <div style={{ marginTop: 16 }}>
                <img
                  src={SITE_ASSETS.lineOfficial}
                  alt="LINE 官方帳號"
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  請加入學會LINE官方帳號洽詢
                </p>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 台灣四念處學會　All rights reserved.</div>
            <div>唯一路</div>
          </div>
        </div>
      </footer>
    </>
  )
}

function TeacherCard({ id }: { id: TeacherId }) {
  const t = TEACHERS[id]
  return (
    <article className="teacher-card">
      <div className="teacher-photo"><img src={t.photo} alt={t.name} /></div>
      <div className="teacher-card-body">
        <h4 className="teacher-name">{t.name}</h4>
        <p className="teacher-name-en">{t.nameEn}</p>
        <p className="teacher-tagline">{t.tagline}</p>
      </div>
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
