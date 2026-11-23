# Projects Categories + /projects Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Homepage shows 4 featured projects + "View all projects"; a new `/projects` page shows every project in a grid filtered by category tabs.

**Architecture:** Mirror the Services pattern. Project data moves to `projectsData.js`; `Projects.jsx` keeps the card/modal components and the homepage carousel; new lazy-loaded `ProjectsPage.jsx` renders tabs + grid. `App.jsx` gets a `projects` route and remembers whether an app was opened from `/projects`.

**Tech Stack:** React 18 + Vite, CSS modules, lucide-react. No router library.

**Spec:** `docs/superpowers/specs/2026-11-23-projects-page-design.md`

## Global Constraints

- No new dependencies (no test runner, no router). Verification is `npm run build`, `npm run lint`, and checking in the browser.
- Groups, exact labels and ids: `productivity` "Productivity & Automation", `career` "Career Tools", `finance` "Finance", `marketplaces` "Marketplaces".
- Group membership: productivity = Auto Scheduler (1), TeamSync (2), OnboardBase (3), ClarkFlow 360 (8); career = BuhayVA Copilot (4), Job Tracker (7); finance = BALANSE (5); marketplaces = KalakalGG (6).
- Homepage featured, in this order: TeamSync (2), ClarkFlow 360 (8), KalakalGG (6), BALANSE (5).
- Light and dark theme must both work (`html[data-theme='dark']` overrides, as in the existing CSS modules).
- Commit message prefix: `PORTFOLIO:`.

## Review Focus

- `/projects?group=garbage` or `?group=` → shows All, no crash, no empty grid.
- Reloading `/projects?group=career` (Vercel rewrite → index.html) lands on the Career tab.
- Opening an app from `/projects`, then pressing that app's "Back to portfolio" → returns to `/projects` (same tab), not the homepage. From the homepage it still returns to the homepage Projects section.
- Pressing "Back to portfolio" on the `/projects` page itself → homepage, scrolled to the Projects section.
- 375px phone width: tab row scrolls sideways without making the page scroll sideways; cards are 1 column.

---

### Task 1: Move data out, group it, slim the homepage carousel

**Files:**
- Create: `FRONTEND/src/components/projectsData.js`
- Modify: `FRONTEND/src/components/Projects.jsx` (lines 1–336 data/helpers; 558–648 `Projects()`)
- Modify: `FRONTEND/src/components/Projects.module.css` (add `.moreRow`)

**Interfaces:**
- Produces (from `projectsData.js`):
  - `export const GROUPS: { id: string, label: string }[]` — the 4 groups, in the order above.
  - `export const projects` — the existing array, each real project gains `group: <group id>`; the placeholder (id 9) gets `group: null`. Rename the existing `featured` flag to `spotlight` (it only drives the "Featured AI Project" ribbon/graphic on Auto Scheduler).
  - `export const HOME_FEATURED_IDS = [2, 8, 6, 5]`.
  - `export const docs` — moved unchanged.
  - `export const openProject(url: string): void` — moved unchanged.
- Produces (from `Projects.jsx`): `export function ProjectCard({ project, onDocs })` and `export function DocsModal({ project, onClose })` (existing components, now exported; update `project.featured` → `project.spotlight`).

- [ ] **Step 1:** Create `projectsData.js` with the exports above; delete the moved code from `Projects.jsx` and import it back.
- [ ] **Step 2:** In `Projects()`, carousel items become `HOME_FEATURED_IDS.map(id => projects.find(p => p.id === id))`. Remove the "Tip: open the Auto Scheduler…" hint (Auto Scheduler is no longer on the homepage; the hint moves to the `/projects` page in Task 2). Add below the pager, copying `Services.jsx:105-119`:
  `<div className={styles.moreRow}><a href="/projects" className="btn-secondary" …>View all projects <ArrowRight size={16} aria-hidden="true" /></a></div>`, navigating with `openProject('/projects')`. Add `.moreRow { display: flex; justify-content: center; margin-top: 40px; }`.
- [ ] **Step 3:** Run `npm run build` and `npm run lint` in `FRONTEND`. Expected: both succeed, no new lint errors in the touched files.
- [ ] **Step 4:** `npm run dev`, open `/`. Expected: carousel shows TeamSync, ClarkFlow 360, KalakalGG, BALANSE in that order; 2 pages of dots on desktop; "How it works" still opens; button is visible (it goes nowhere useful until Task 2).
- [ ] **Step 5: Commit** — `PORTFOLIO: Projects data grouped by category, homepage shows 4 featured`

### Task 2: `/projects` page with category tabs and grid

**Files:**
- Create: `FRONTEND/src/components/ProjectsPage.jsx`
- Create: `FRONTEND/src/components/ProjectsPage.module.css`
- Modify: `FRONTEND/src/App.jsx` (`PROJECT_APPS`, `CHAT_ROUTES`, `checkRoute`, `goToPortfolio`)

**Interfaces:**
- Consumes: `GROUPS`, `projects`, `ProjectCard`, `DocsModal` from Task 1. Page bar classes `pageBar`, `pageBarInner`, `pageLogo`, `backBtn` from `Services.module.css` (import it as a second styles object, same as `ServicesPage.jsx:66-77`).
- Produces: `export default function ProjectsPage({ onBackToPortfolio })`; route name `'projects'`.

- [ ] **Step 1: `ProjectsPage.jsx`.** Structure follows `ServicesPage.jsx`: `useTheme()`, `<Cursor />`, the same header bar, then `<main className="section …">` with `<h1 className="section-title">All <span>Projects</span></h1>`, divider, subtitle "Real tools I've designed and built, grouped by what they do. Click a card to try it live."
  - Tabs: `All` + each `GROUPS` entry, each showing its count (All counts real projects only, not the placeholder). Render as `role="tablist"` buttons with `aria-selected`.
  - Selected group comes from `new URLSearchParams(location.search).get('group')`; anything not a `GROUPS` id means All. Clicking a tab does `history.replaceState` to `/projects` (All) or `/projects?group=<id>` and updates state.
  - Grid: projects in the selected group, in data order; on All, every project plus the placeholder last. Each item is `<ProjectCard project onDocs={setDocsProject} />`; render `DocsModal` when set.
  - Hint pill under the grid (moved from homepage): "Tip: open the Auto Scheduler to test drive the Gemini AI schedule scanner." Reuse `styles.hint` look by copying the rule.
- [ ] **Step 2: `ProjectsPage.module.css`.** Grid `repeat(3, 1fr)`, gap 24px; 2 columns at `max-width: 900px`, 1 at `max-width: 600px`. Tabs: pill buttons (active = red filled, like `.dotActive`/`.docsOpen` colours); at `max-width: 600px` the tab row is `flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none` with the buttons `flex-shrink: 0`. Dark-theme overrides for tabs. Section background `var(--white)` / dark `var(--dk-page)`.
- [ ] **Step 3: `App.jsx`.**
  - `PROJECT_APPS.projects = lazy(() => import('./components/ProjectsPage'))`; add `'projects'` to `CHAT_ROUTES`.
  - In `checkRoute`, add `if (path.startsWith('/projects')) return 'projects';` next to the `/services` rule.
  - Remember the last listing page: a `useRef` `cameFrom` set to the full `pathname + search` whenever `route === 'projects'`, and cleared to `null` when `route === 'portfolio'`.
  - `goToPortfolio`: if the current route is a project app (not `'projects'`, not `'services'`) and `cameFrom.current` is set, `pushState` to it and `setRoute('projects')`; otherwise current behaviour (`/`, `'portfolio'`).
  - Scroll effect already scrolls to top for non-portfolio routes and to `#projects` when returning from anything but services — no change needed.
- [ ] **Step 4:** `npm run build` and `npm run lint`. Expected: success; build output lists a separate `ProjectsPage` chunk.
- [ ] **Step 5: Browser check** (`npm run dev`), every Review Focus line, plus:
  - Tab counts: All 8, Productivity & Automation 4, Career Tools 2, Finance 1, Marketplaces 1.
  - Coming Soon card only on All.
  - Desktop 3 columns, ~800px 2 columns, 375px 1 column; dark mode on all three.
- [ ] **Step 6: Commit** — `PORTFOLIO: /projects page with category tabs`

### Task 3: Update the portfolio summary

**Files:**
- Modify: `CLARK_VA_360_PORTFOLIO_SUMMARY.txt` (section 3.9 lines 191–202, 3.16 line 261; add a 3.x entry for `/projects` next to 3.14 `/services`)

- [ ] **Step 1:** 3.9 now describes the homepage carousel of 4 featured projects (TeamSync, ClarkFlow 360, KalakalGG, BALANSE) + "View all projects"; move the Tip line to the new `/projects` entry. New entry describes the page, the 4 groups and their members, `?group=` links, Coming Soon on All. Line 261: back from a project returns to `/projects` if opened from there. Add `/projects` where the chat bot pages are listed (3.13).
- [ ] **Step 2: Commit** — `PORTFOLIO: Summary updated for the /projects page`
