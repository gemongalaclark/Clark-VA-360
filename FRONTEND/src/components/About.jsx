import styles from './About.module.css';

export default function About() {
  return (
    <section id="about" className={`section ${styles.about}`}>
      <div className="container">
        <h2 className="section-title">About <span>Me</span></h2>
        <div className="section-divider" />

        <div className={styles.content}>
          <div className={styles.textBlock}>
            <p className={styles.intro}>
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
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            {[
              { value: '4', label: 'Years of IT Study', icon: '🎓' },
              { value: '1+', label: 'Year Internship', icon: '💼' },
              { value: '15+', label: 'VA Tools Mastered', icon: '🛠️' },
              { value: '100%', label: 'Dedication', icon: '🎯' },
            ].map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
