import { Users, ArrowRight, Zap, Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import styles from './LandingPage.module.css';

const features = [
  { icon: <Users size={22} />, title: 'Room-Based Workspaces', desc: 'Create or join rooms with a unique 8-character code. Built for teams of any size.' },
  { icon: <Zap size={22} />, title: 'Real-time Notifications', desc: 'Instant in-app and email alerts when tasks are assigned, submitted, reviewed or nearing their deadline.' },
  { icon: <Shield size={22} />, title: 'Role-Based Access', desc: 'Owners assign, review and manage the team. Employees complete and submit their work. Clear boundaries, zero confusion.' },
  { icon: <CheckCircle size={22} />, title: 'Task Review System', desc: 'Owners assign tasks with briefs, files and deadlines; employees submit; owners approve or request a revision with notes.' },
];

export default function LandingPage({ onSignIn, onSignUp, onBackToPortfolio }) {
  return (
    <div className={styles.landing}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <button className={styles.backBtn} onClick={onBackToPortfolio}>
          <ArrowLeft size={16} /> Portfolio
        </button>
        <div className={styles.navLogo}>
          <img src="/images/teamsync/teamsync-logo.png" alt="TeamSync Workspace" className={styles.logoImg} />
        </div>
        <div className={styles.navActions}>
          <button className={styles.signInBtn} onClick={onSignIn}>Sign In</button>
          <button className={styles.signUpBtn} onClick={onSignUp}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Zap size={13} /> Real-time Team Collaboration
        </div>
        <h1 className={styles.heroTitle}>
          Where Teams <span className={styles.accent}>Sync</span><br />& Work Gets Done
        </h1>
        <p className={styles.heroDesc}>
          TeamSync Workspace brings owners and employees together in organised rooms.
          Assign tasks, review submissions, and manage your team — all in one place.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.ctaPrimary} onClick={onSignUp}>
            Create Your Room <ArrowRight size={18} />
          </button>
          <button className={styles.ctaSecondary} onClick={onSignIn}>
            Sign In
          </button>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.stat}><strong>Room-based</strong><span>Team Spaces</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><strong>Real-time</strong><span>Notifications</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><strong>2 Roles</strong><span>Owner & Employee</span></div>
        </div>
      </section>

      {/* Dashboard preview mockup */}
      <section className={styles.previewSection}>
        <div className={styles.previewCard}>
          <div className={styles.previewSidebar}>
            <img src="/images/teamsync/teamsync-logo-light.png" alt="" className={styles.previewSidebarLogo} />
            {['Overview', 'Review', 'Members'].map((item, i) => (
              <div key={item} className={`${styles.previewNavItem} ${i === 0 ? styles.previewNavActive : ''}`}>
                <div className={styles.previewNavDot} />
                {item}
              </div>
            ))}
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewTopBar}>
              <span>Overview</span>
              <div className={styles.previewAvatar}>DC</div>
            </div>
            <div className={styles.previewStatRow}>
              {[['12', 'Employees'], ['48', 'Tasks'], ['36', 'Approved'], ['12', 'Pending']].map(([n, l]) => (
                <div key={l} className={styles.previewStatCard}>
                  <strong>{n}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <div className={styles.previewChartBar}>
              <div className={styles.previewChartLabel}>Task Activity</div>
              <div className={styles.previewChartLines}>
                {[30, 50, 40, 65, 55, 70, 60].map((h, i) => (
                  <div key={i} className={styles.previewBar} style={{ height: h + '%' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything your team needs</h2>
        <p className={styles.sectionDesc}>Designed for small teams and growing businesses that need structure without complexity.</p>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          {[
            { n: '01', title: 'Sign Up', desc: 'Create your account with your email and a strong password, then verify with a 6-digit code.' },
            { n: '02', title: 'Create or Join', desc: 'Owners create a room and get a unique Room ID. Employees use it to request access.' },
            { n: '03', title: 'Collaborate', desc: 'Owners assign tasks; employees complete and submit them; owners approve or request a revision — in real time.' },
          ].map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2>Ready to sync your team?</h2>
        <p>Sign up today and launch your first workspace in minutes.</p>
        <button className={styles.ctaPrimary} onClick={onSignUp}>
          Get Started Free <ArrowRight size={18} />
        </button>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 TeamSync Workspace — Built by <strong>Clark VA 360</strong></p>
        <button className={styles.footerBack} onClick={onBackToPortfolio}>
          ← Back to Portfolio
        </button>
      </footer>
    </div>
  );
}
