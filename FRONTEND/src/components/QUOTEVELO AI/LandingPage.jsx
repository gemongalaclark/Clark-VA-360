import { ArrowRight, Zap, LayoutDashboard, Inbox, Sparkles, FileText, Send, Timer, Copy, ShieldCheck, Filter, LogIn } from 'lucide-react';
import styles from './QuoteVelo.module.css';

const FLOW = [
  { icon: Inbox, title: 'Prospect submits', text: 'A 3-step quote form saves the lead to Supabase the moment it is sent.' },
  { icon: Zap, title: 'Webhook fires', text: 'A Supabase database webhook hands the new row to an Activepieces flow.' },
  { icon: Sparkles, title: 'Gemini triages', text: 'Scores 1-100, tags it, writes a 3-bullet brief, drafts the proposal and reply.' },
  { icon: FileText, title: 'Doc + dashboard', text: 'A Google Doc is built from your template, and the board updates live.' },
  { icon: Send, title: 'You approve', text: 'One click sends the email through Gmail. Nothing goes out without you.' },
];

const IMPACT = [
  { icon: Timer, title: 'Speed-to-lead', text: 'Reply in minutes, not days, while the prospect is still comparing quotes.' },
  { icon: Filter, title: 'Filters the noise', text: 'Low-budget and vague inquiries are tagged so you spend time where it pays.' },
  { icon: Copy, title: 'No copy-pasting', text: 'Every proposal is drafted from the prospect\'s own words, then polished by you.' },
  { icon: ShieldCheck, title: 'You stay in control', text: 'Human-in-the-loop approval before any client ever sees a draft.' },
];

export default function LandingPage({ onRequest, onAdmin, onAdminDemo, demoPublic, showOwner }) {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrowLight}><Zap size={13} /> Smart inquiry triage</p>
          <h1>Quotes in 30 seconds, <span>not 48 hours.</span></h1>
          <p className={styles.heroLead}>
            QuoteVelo scores every inbound inquiry, filters out the time-wasters and drafts a custom
            proposal and reply for you to approve. The lead gets answered before a competitor opens their inbox.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.btnHero} onClick={onRequest}>Request a project quote <ArrowRight size={16} /></button>
            {onAdminDemo && <button className={styles.btnHeroGhost} onClick={onAdminDemo}><LayoutDashboard size={16} /> See the owner dashboard</button>}
          </div>
          <p className={styles.heroNote}>
            {demoPublic
              ? 'Try it: send a sample inquiry, then open the dashboard and watch it get scored and drafted. Demo data stays in your browser.'
              : 'Tell us about your project and you will get a tailored proposal by email.'}
          </p>
        </div>

        {/* Decorative mini-pipeline, purely illustrative */}
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.artCard}>
            <div className={styles.artRow}><span className={styles.artDot} /> New inquiry · Harbor &amp; Finch Law</div>
            <div className={styles.artBar}><span style={{ width: '100%' }} /></div>
          </div>
          <div className={`${styles.artCard} ${styles.artCardMid}`}>
            <div className={styles.artScore}>92</div>
            <div>
              <strong>High Priority</strong>
              <small>Budget healthy · urgent start · clear scope</small>
            </div>
          </div>
          <div className={`${styles.artCard} ${styles.artCardEnd}`}>
            <div className={styles.artRow}><Send size={14} /> Proposal ready for approval</div>
            <div className={styles.artBtn}>Approve &amp; Send</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>How a lead moves through QuoteVelo</h2>
        <ol className={styles.flow}>
          {FLOW.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={styles.flowStep}>
              <span className={styles.flowNum}>{i + 1}</span>
              <span className={styles.flowIcon}><Icon size={18} /></span>
              <strong>{title}</strong>
              {text}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Why business owners want it</h2>
        <div className={styles.impactGrid}>
          {IMPACT.map(({ icon: Icon, title, text }) => (
            <div key={title} className={styles.card}>
              <span className={styles.flowIcon}><Icon size={18} /></span>
              <h3>{title}</h3>
              <p className={styles.muted}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {showOwner && (
        <section className={`${styles.card} ${styles.ownerStrip}`}>
          <div>
            <h2>Business owner?</h2>
            <p className={styles.muted}>Sign in to review AI-drafted proposals and approve them with one click.</p>
          </div>
          <button className={styles.btnGhost} onClick={onAdmin}><LogIn size={16} /> Owner sign in</button>
        </section>
      )}
    </div>
  );
}
