import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Calendar, ArrowUpRight, ArrowRight, Zap, Rocket, ClipboardCheck, ShieldCheck, BookOpen, X, Briefcase, Wallet, Target } from 'lucide-react';
import styles from './Projects.module.css';

/* Projects data */
const projects = [
  {
    id: 1,
    category: 'AI Automation',
    title: "Google Calendar AUTO Scheduler",
    description: "Gemini AI-powered schedule scanner that automatically extracts shift rotas, PDF timetables, and spreadsheets to sync directly into Google Calendar.",
    tags: ['Gemini AI', 'Google Calendar API', 'Multimodal OCR', 'React'],
    image: null,
    liveUrl: '/auto-scheduler',
    githubUrl: null,
    placeholder: false,
    featured: true,
  },
  {
    id: 2,
    category: 'Team Collaboration',
    title: 'TeamSync Workspace',
    description: 'Real-time team collaboration platform with room-based workspaces, role-separated dashboards for owners and employees, task assignment and review, and instant notifications.',
    tags: ['React', 'Supabase', 'Realtime', 'Role-based Auth'],
    image: null,
    liveUrl: '/teamsync-workspace',
    githubUrl: null,
    placeholder: false,
    featured: false,
    inDevelopment: false,
    badge: 'Full-System Project',
  },
  {
    id: 3,
    category: 'Client Operations',
    title: 'OnboardBase',
    description: 'Secure client onboarding portal with magic-link login, a progress tracker, a save-and-resume intake form, brand-asset uploads, and an admin pipeline that flags stalled clients.',
    tags: ['React', 'Supabase', 'Row Level Security', 'Edge Functions'],
    image: null,
    liveUrl: '/onboardbase',
    githubUrl: null,
    placeholder: false,
    featured: false,
  },
  {
    id: 4,
    category: 'AI Career Tools',
    title: 'BuhayVA Copilot',
    description: '1-click job analyzer for Upwork and OnlineJobs.ph: Gemini scores your fit, catches hidden attention checks and red flags, drafts a tailored pitch, and tracks every application.',
    tags: ['Gemini AI', 'Make.com', 'Supabase', 'React'],
    image: null,
    liveUrl: '/buhayva-copilot',
    githubUrl: null,
    placeholder: false,
    featured: false,
  },
  {
    id: 5,
    category: 'Personal Finance',
    title: 'BALANSE',
    description: 'Personal finance dashboard with a money overview, a debt tracker that shows each loan getting paid down, and savings goals that work out how much to set aside every month.',
    tags: ['React', 'Supabase', 'PostgreSQL RPC', 'Custom Auth'],
    image: null,
    liveUrl: '/balanse',
    githubUrl: null,
    placeholder: false,
    featured: false,
  },
  {
    id: 6,
    category: 'In the pipeline',
    title: 'Coming Soon',
    description: 'Building out my portfolio one project at a time.',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
];

/* Plain-language guides for the "How it works" popup, written so anyone (even a 12-year-old) can follow. */
const docs = {
  1: {
    what: 'The Auto Scheduler is a helper that reads your work schedule and puts it on your Google Calendar for you. Your schedule might be a photo, a PDF, or a spreadsheet. Instead of typing every shift in by hand, the app reads it and does the typing.',
    use: [
      'Open the app and sign in with your Google account.',
      'Upload your schedule: a photo, a PDF, or a spreadsheet.',
      'The AI (Google Gemini) reads it and finds your shifts, dates and times.',
      'Look at the preview. If something looks wrong, fix it before saving.',
      'Press the button to send everything to Google Calendar. Done!',
    ],
    purpose: 'Work rotas (the lists that say who works when) are often messy. People copy them into their calendar one line at a time, and mistakes happen. This app makes that boring job fast and accurate.',
    help: [
      'Saves time: dozens of shifts added in seconds, not an afternoon.',
      'Fewer mistakes: you check a preview before anything is saved.',
      'Never miss a shift: it all shows up on your phone calendar.',
      'Works with the files you already have, so there is nothing new to learn.',
    ],
  },
  2: {
    what: 'TeamSync is a shared online office for a small team. The boss (the “owner”) creates a room. The team members (the “employees”) join it. Inside, the owner hands out tasks, and employees send their finished work back to be checked.',
    use: [
      'Sign up and log in. A code is sent to your email to prove it is really you.',
      'The owner creates a room and shares its room code with the team.',
      'Employees enter the code and wait for the owner to let them in.',
      'The owner assigns a task and can set a deadline.',
      'The employee finishes the work and submits it.',
      'The owner reviews it and either approves it or asks for changes. Everyone is notified right away.',
    ],
    purpose: 'Teams often lose track of who is doing what, because tasks get buried in chats and emails. TeamSync keeps every task, deadline and answer in one tidy place and updates live, without refreshing the page.',
    help: [
      'Everyone knows what to do next, and by when.',
      'Owners can see what is waiting for review at a glance.',
      'Owners and employees each see only the screens they need.',
      'Less chasing people with “did you finish that yet?” messages.',
    ],
  },
  3: {
    what: 'OnboardBase is a private website where a new customer gets set up with a business. “Onboarding” just means the getting-started stage: signing the agreement, sharing files and answering questions. OnboardBase puts all of it in one place with a progress bar, like a checklist in a video game.',
    use: [
      'The business owner clicks “New Client” and types the customer’s email and company name.',
      'The customer gets an email with a magic link. One click and they are in, with no password.',
      'They follow 5 steps: sign the contract, upload logos, fill in the form, book a kickoff call, then wait for the final review.',
      'The form saves as they go, so they can stop and come back later.',
      'When every step is done, the page turns into a “your project is live” page with contacts, a meeting link and finished work.',
    ],
    purpose: 'Starting with a new customer usually means weeks of emails, lost links and forgotten files. OnboardBase replaces that mess with one organized page, and shows the owner who is stuck and on which step.',
    help: [
      'Customers can finish setup in about 20 minutes instead of weeks.',
      'No more “where is that link?”, because everything lives on one page.',
      'Private and safe: each customer can only ever see their own stuff.',
      'The owner sees a board of all customers and spots anyone who has gone quiet.',
      'You can try it with the demo buttons. No account needed.',
    ],
  },
  4: {
    what: 'BuhayVA Copilot is a helper for freelancers who apply to jobs on Upwork and OnlineJobs.ph. You give it a job post, and it tells you how well you match, warns you about anything fishy, and writes a proposal for you based on your own resume.',
    use: [
      'Save your resume, your skills and your minimum rate once in “Master profile”.',
      'Paste a job post, or click the “Send to Copilot” bookmark while you are looking at the job.',
      'The AI (Google Gemini) gives the job a fit score from 0 to 100 and lists the skills you share.',
      'It points out secret code words the client asked for, like “put BANANA in the subject”, plus red flags like very low pay.',
      'Copy the ready-made proposal, send it, then move the job along: Applied, Interviewing, Offer.',
    ],
    purpose: 'Applying for online jobs takes a long time: reading every post, deciding if it is worth it, and writing a fresh proposal each time. Clients also hide little tests in their posts to see who actually read them. Copilot does the reading and the first draft, so you can apply faster and smarter.',
    help: [
      'Spend your time on jobs you can actually win.',
      'Never miss a hidden code word again.',
      'Proposals that mention your real projects, not generic filler.',
      'One board shows every job you applied to and where it stands.',
      'Try it with the demo button. No account needed.',
    ],
  },
  5: {
    what: 'BALANSE is a money notebook that does the math for you. It shows how much you still owe, how much you have saved, and how close you are to the things you want to buy, like a new car.',
    use: [
      'Sign up with just a username and password. No email needed.',
      'Open the Debt tracker and add each debt: what it is, the total, and how much you have already paid.',
      'Each time you pay, press “Record payment” and watch the bar fill up.',
      'Open Goals and add what you are saving for, like a Montero Sport for ₱600,000, plus a target date if you have one.',
      'Check the Overview to see everything at once: what you owe, what you saved, and what is due next.',
    ],
    purpose: 'It is easy to lose track of money when debts and savings live in different apps, notebooks and chats. BALANSE puts them side by side, so you always know where you stand.',
    help: [
      'See every debt shrink as you pay it down.',
      'Know exactly how much to save each month to hit a goal on time.',
      'Never miss a payment: upcoming due dates show on the Overview.',
      'Private: each account only ever sees its own numbers.',
    ],
  },
};

function DocsModal({ project, onClose }) {
  const doc = docs[project.id];
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.docsBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.docsModal} role="dialog" aria-modal="true" aria-labelledby="docs-title">
        <button ref={closeRef} className={styles.docsClose} onClick={onClose} aria-label="Close guide"><X size={18} /></button>
        <span className={styles.cardCategory}>{project.category} · Project guide</span>
        <h3 id="docs-title" className={styles.docsTitle}>{project.title}</h3>

        <h4>What is it?</h4>
        <p>{doc.what}</p>

        <h4>How do I use it?</h4>
        <ol>{doc.use.map(t => <li key={t}>{t}</li>)}</ol>

        <h4>What is it for?</h4>
        <p>{doc.purpose}</p>

        <h4>How can it help?</h4>
        <ul>{doc.help.map(t => <li key={t}>{t}</li>)}</ul>

        <div className={styles.docsActions}>
          <a
            href={project.liveUrl}
            className={styles.docsOpen}
            onClick={(e) => { e.preventDefault(); onClose(); openProject(project.liveUrl); }}
          >
            Open {project.title} <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* Cards visible at once — mirrors the CSS breakpoints (--n) */
function usePerView() {
  const get = () => (window.matchMedia('(max-width: 600px)').matches ? 1
    : window.matchMedia('(max-width: 900px)').matches ? 2 : 3);
  const [n, setN] = useState(get);
  useEffect(() => {
    const onChange = () => setN(get());
    const mqs = ['(max-width: 600px)', '(max-width: 900px)'].map(q => window.matchMedia(q));
    mqs.forEach(m => m.addEventListener('change', onChange));
    return () => mqs.forEach(m => m.removeEventListener('change', onChange));
  }, []);
  return n;
}

const openProject = (url) => {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function ProjectCard({ project, onDocs }) {
  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    if (!project.liveUrl) return;
    /* Internal routes use pushState; external links open in new tab */
    if (project.liveUrl.startsWith('/')) openProject(project.liveUrl);
    else window.open(project.liveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className={`${styles.card} ${project.featured ? styles.featuredCard : ''} ${project.placeholder ? styles.placeholderCard : ''}`}
      id={`project-${project.id}`}
      onClick={handleCardClick}
      style={{ cursor: project.liveUrl ? 'pointer' : 'default' }}
    >
      {project.featured && (
        <div className={styles.featuredRibbon}>
          <Sparkles size={12} />
          <span>Featured AI Project</span>
        </div>
      )}
      {project.badge && !project.featured && (
        <div className={`${styles.featuredRibbon} ${styles.liveRibbon}`}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>{project.badge}</span>
        </div>
      )}

      {/* Graphic preview */}
      <div className={styles.cardImage}>
        {project.featured ? (
          <div className={styles.featuredGraphic}>
            <div className={styles.featuredGlow} />
            <div className={styles.featuredGraphicInner}>
              <div className={styles.graphicLogoWrap}>
                <img src="/images/logo.png" alt="Clark VA 360 Logo" className={styles.graphicLogoImg} />
              </div>
              <div className={styles.graphicCalWrap}>
                <Calendar size={26} className={styles.graphicCalIcon} />
                <span className={styles.graphicCalText}>Auto Scheduler</span>
              </div>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Sparkles size={11} /> Gemini AI</span>
                <span className={styles.graphicSyncPill}>Google Sync</span>
              </div>
            </div>
          </div>
        ) : project.id === 2 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <img src="/images/teamsync/teamsync-logo.png" alt="TeamSync Workspace" className={styles.teamsyncLogoImg} />
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Zap size={11} /> Real-time</span>
                <span className={styles.teamsyncRolePill}>Role-based</span>
              </div>
            </div>
          </div>
        ) : project.id === 3 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <ClipboardCheck size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>OnboardBase</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><ShieldCheck size={11} /> RLS secured</span>
                <span className={styles.teamsyncRolePill}>Client portal</span>
              </div>
            </div>
          </div>
        ) : project.id === 4 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Briefcase size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>BuhayVA Copilot</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Sparkles size={11} /> Gemini AI</span>
                <span className={styles.teamsyncRolePill}>Fit score + CRM</span>
              </div>
            </div>
          </div>
        ) : project.id === 5 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Wallet size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>BALANSE</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Target size={11} /> Goals</span>
                <span className={styles.teamsyncRolePill}>Debt tracker</span>
              </div>
            </div>
          </div>
        ) : project.image ? (
          <img src={project.image} alt={project.title} />
        ) : (
          <div className={styles.placeholderImg}>
            <span className={styles.placeholderIconWrap}><Rocket size={26} /></span>
            <span className={styles.placeholderText}>Project preview</span>
          </div>
        )}

        {!project.placeholder && project.liveUrl && (
          <div className={styles.cardOverlay}>
            <a
              href={project.liveUrl}
              className={styles.overlayBtn}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); openProject(project.liveUrl); }}
            >
              <ExternalLink size={16} /> Open Web App
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <span className={styles.cardCategory}>{project.category}</span>
        <div className={styles.cardHeaderRow}>
          <h3 className={styles.cardTitle}>{project.title}</h3>
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardArrowLink}
              title={`Open ${project.title} in a new tab`}
              aria-label={`Open ${project.title} in a new tab`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
        <p className={styles.cardDesc}>{project.description}</p>
        {project.tags.length > 0 && (
          <div className={styles.tagRow}>
            {project.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.cardFooter}>
          {docs[project.id] && (
            <button
              type="button"
              className={styles.docsBtn}
              onClick={(e) => { e.stopPropagation(); onDocs(project); }}
            >
              <BookOpen size={15} /> How it works
            </button>
          )}
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              className={styles.viewBtn}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openProject(project.liveUrl); }}
            >
              View project <ArrowRight size={15} />
            </a>
          ) : (
            <span className={styles.soonChip}><span className={styles.soonDot} /> In planning</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [docsProject, setDocsProject] = useState(null);
  const perView = usePerView();
  const maxIndex = Math.max(0, projects.length - perView);
  const index = Math.min(currentIndex, maxIndex);

  const goTo = (i) => setCurrentIndex(Math.max(0, Math.min(i, maxIndex)));
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  /* Touch/swipe support */
  const [touchStart, setTouchStart] = useState(null);
  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) (diff > 0 ? next() : prev());
    setTouchStart(null);
  };

  return (
    <section id="projects" className={`section ${styles.projects}`}>
      <div className="container">
        <h2 className="section-title">My <span>Projects</span></h2>
        <div className="section-divider" />
        <p className={styles.sectionSubtitle}>
          Real tools I've designed and built. Click a card to try it live.
        </p>

        <div className={styles.carouselWrapper}>
          <button
            id="carousel-prev"
            className={`${styles.navBtn} ${index === 0 ? styles.disabled : ''}`}
            onClick={prev}
            aria-label="Previous project"
            disabled={index === 0}
          >
            <ChevronLeft size={22} />
          </button>

          <div className={styles.trackOuter} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className={styles.track} style={{ '--i': index }}>
              {projects.map(project => (
                <div key={project.id} className={styles.slide}>
                  <ProjectCard project={project} onDocs={setDocsProject} />
                </div>
              ))}
            </div>
          </div>

          <button
            id="carousel-next"
            className={`${styles.navBtn} ${index >= maxIndex ? styles.disabled : ''}`}
            onClick={next}
            aria-label="Next project"
            disabled={index >= maxIndex}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Pager */}
        {maxIndex > 0 && (
          <div className={styles.pager}>
            <div className={styles.dots}>
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Show projects from ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
            <span className={styles.counter}>
              {String(index + 1).padStart(2, '0')} / {String(maxIndex + 1).padStart(2, '0')}
            </span>
          </div>
        )}

        {docsProject && <DocsModal project={docsProject} onClose={() => setDocsProject(null)} />}

        <p className={styles.hint}>
          <Sparkles size={14} /> Tip: open the Auto Scheduler to test drive the Gemini AI schedule scanner.
        </p>
      </div>
    </section>
  );
}
