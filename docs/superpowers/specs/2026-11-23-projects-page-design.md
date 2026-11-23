# Projects: categories + dedicated /projects page — design

## Why
More projects are coming (next: a secondhand car dealer web app and a car-related web app).
One flat carousel of 9 cards with one-off category labels does not scale and is tiring on phones.

## Goals
- Homepage shows only 4 featured projects, plus a "View all projects" button.
- New `/projects` page lists every project in a grid, filterable by category tabs.
- Each project belongs to exactly one category; adding a project = one data entry.
- Works well on phones (1 column, sideways-scrolling tabs) and computers (3 columns).

## Non-goals
- No new dependencies, no router library, no search box, no sorting.
- Do not change the individual project apps or their "How it works" guides.

## Categories (decided by Clark)
| Category | Projects |
|---|---|
| Productivity & Automation | Auto Scheduler, TeamSync, OnboardBase, ClarkFlow 360 |
| Career Tools | BuhayVA Copilot, Job Tracker |
| Finance | BALANSE |
| Marketplaces | KalakalGG (future: secondhand car dealer, car app) |

Featured on the homepage (decided by Clark): TeamSync, ClarkFlow 360, KalakalGG, BALANSE.

## Approaches considered
- **A. Filter tabs over the homepage carousel.** Compact, but gets crowded past ~12 projects and has no shareable link.
- **B. One carousel row per category on the homepage.** Homepage grows with every category.
- **C. Featured carousel on homepage + dedicated `/projects` page with tabs and a grid (picked).** Homepage stays short; grid scrolls naturally on phones; `/projects` is a shareable link. Costs one extra click to see everything.

## Design
Mirrors the existing Services pattern (`Services.jsx` + `servicesData.js` + `ServicesPage.jsx` at `/services`).

- **`projectsData.js`** (new): the `projects` array and `docs` guides move here. Each project gets
  a `group` (one of the 4 categories above) and a `featured` flag for the homepage. The existing
  per-card `category` label stays as the small subtitle on the card.
  `featured: true` today means "Featured AI Project" ribbon on the Auto Scheduler; that ribbon is
  kept but renamed to its own flag so it doesn't clash with the new homepage flag.
- **`ProjectCard` + `DocsModal`** are exported from `Projects.jsx` and reused by both views.
- **Homepage (`Projects.jsx`)**: carousel shows only the 4 featured projects, then a
  "View all projects →" button that navigates to `/projects` (same pushState approach as "View all services").
  "Coming Soon" card moves to the `/projects` page.
- **`ProjectsPage.jsx`** (new, lazy-loaded like `ServicesPage`): same top bar with logo + "Back to portfolio",
  title, tab row `All · Productivity & Automation · Career Tools · Finance · Marketplaces`
  with a project count per tab, then a card grid (3 / 2 / 1 columns at the existing 900px / 600px breakpoints).
  On phones the tab row scrolls sideways instead of wrapping. Light + dark theme supported.
- **`App.jsx`**: add a `projects` route for paths starting with `/projects`.

## Builder's calls (Claude)
- Selected tab is kept in the URL (`/projects?group=marketplaces`) so a filtered view can be shared; invalid value → All.
- Closing a project app with its "Back to portfolio" button returns to wherever it was opened from
  (`/projects` page or homepage), not always the homepage.
- Coming back from `/projects` to the homepage scrolls to the Projects section (as Services does today).
- The "Coming Soon" card shows only on the All tab.

## Verify
- `npm run build` passes.
- Homepage shows exactly 4 cards; button opens `/projects`.
- Each tab shows the right projects; counts match; URL updates; reload keeps the tab.
- Phone width (375px): 1 column, tabs scroll sideways, nothing overflows. Dark mode looks right.
