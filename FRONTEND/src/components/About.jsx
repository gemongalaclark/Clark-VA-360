import { GraduationCap, Briefcase, Wrench, Target, BookOpen, ArrowRight, Play } from 'lucide-react';
import styles from './About.module.css';

const stats = [
  { value: '4',    label: 'Years of IT Study',  Icon: GraduationCap },
  { value: '1+',   label: 'Year Internship',    Icon: Briefcase },
  { value: '15+',  label: 'VA Tools Mastered',  Icon: Wrench },
  { value: '100%', label: 'Dedication',         Icon: Target },
];

const journey = [
  { Icon: GraduationCap, title: 'IT Graduate', meta: 'Bachelor of Science in Information Technology' },
  { Icon: Briefcase,     title: 'Web Developer Intern', meta: 'Knowles Training Institute' },
  { Icon: BookOpen,      title: 'VA Training', meta: 'The VA Bar · ongoing' },
];

const INTRO_VIDEO = '/videos/Introductionvideo.mp4';
const PREVIEW_SECONDS = 15;

// Loop only the first few seconds as a silent teaser
function loopPreview(e) {
  if (e.currentTarget.currentTime >= PREVIEW_SECONDS) e.currentTarget.currentTime = 0;
}

export default function About() {
  return (
    <section id="about" className={`section ${styles.about}`}>
      <div className="container">
        <h2 className="section-title">About <span>Me</span></h2>
        <div className="section-divider" />

        <div className={styles.layout}>
          {/* Story */}
          <div className={styles.textBlock}>
            <p className={styles.lead}>
              Hi everyone, I&apos;m Clark! As a recent Information Technology graduate and a former
              Web Developer intern at <strong>Knowles Training Institute</strong>, I am excitingly
              pivoting into the remote world to start my journey as a Virtual Assistant.
            </p>
            <p>
              While I am currently looking for my first official client, I am actively sharpening my
              skill set through intensive practical training at <strong>The VA Bar</strong>. Combining
              my technical IT background with formal VA training, I can quickly master new software,
              seamlessly handle data with accuracy, and efficiently troubleshoot technical issues to
              streamline your daily operations.
            </p>
            <p>
              If you are a business owner looking for a dedicated, tech-savvy assistant to save you
              time and organize your workflows — let&apos;s connect!
            </p>

            <div className={styles.actions}>
              <a href="#contact" className={styles.primaryBtn}>
                Let&apos;s connect <ArrowRight size={16} />
              </a>
              <a href="#skills" className={styles.secondaryBtn}>See my tools</a>
            </div>
          </div>

          {/* At a glance */}
          <aside className={styles.glance} aria-label="Background at a glance">
            <a
              href={INTRO_VIDEO}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.videoPreview}
              aria-label="Watch my full introduction video (opens in a new tab)"
            >
              <video
                src={`${INTRO_VIDEO}#t=0,${PREVIEW_SECONDS}`}
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
                onTimeUpdate={loopPreview}
                aria-hidden="true"
                tabIndex={-1}
              />
              <span className={styles.videoOverlay}>
                <span className={styles.playIcon}><Play size={20} fill="currentColor" /></span>
                Watch full intro
              </span>
            </a>
            <span className={styles.status}>
              <span className={styles.statusDot} /> Open to my first client
            </span>
            <h3 className={styles.glanceTitle}>My journey</h3>
            <ol className={styles.timeline}>
              {journey.map(({ Icon, title, meta }) => (
                <li key={title} className={styles.timelineItem}>
                  <span className={styles.timelineIcon}><Icon size={18} /></span>
                  <div>
                    <p className={styles.timelineTitle}>{title}</p>
                    <p className={styles.timelineMeta}>{meta}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          {stats.map(({ value, label, Icon }) => (
            <div key={label} className={styles.statCard}>
              <span className={styles.statIcon}><Icon size={20} /></span>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
