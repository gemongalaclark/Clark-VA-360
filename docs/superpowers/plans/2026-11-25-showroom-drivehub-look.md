# Showroom 360 Look v4 ("dealer site") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole of Showroom 360 (public site and admin) to the Drivehub dealer-site look, phones first, without changing any feature, content or behaviour.

**Architecture:** Rewrite `Showroom360.module.css` and `admin/Admin.module.css` section by section on new token values (same token names, so dark mode keeps working). JSX changes only where the new layouts need structure: a top strip, a header that is clear over photo heroes, photo bands, label + heading pairs, footer columns, card and price-card markup. One small pure helper (`bandCars`) is unit-tested; everything visual is checked with a headless-Chrome harness (screenshots + automatic overflow and state checks) at phone and desktop sizes.

**Tech Stack:** React 18, CSS modules, lucide-react, Vite dev server, `node:test`, Chrome headless driven over the DevTools protocol by a Node 20 script (`--experimental-websocket`, no packages).

**Spec:** `docs/superpowers/specs/2026-11-25-showroom-drivehub-look-design.md` (read it first; it is the source for every look decision). Background: `docs/superpowers/specs/2026-11-23-showroom-360-design.md`.

## Global Constraints

- No new npm packages, no new fonts. Inter only; remove the Barlow Condensed loader.
- No feature, page, field, wording or behaviour changes. No new i18n strings (labels reuse existing keys listed in the spec's "Wording").
- New CSS uses tokens, never raw hex, outside the two token blocks (`.app, .toastRegion` and the dark block). Red text uses `--red-text`; see-through bars use `rgba(var(--paper-rgb), a)`.
- Token values exactly as the spec's table: light `--paper #ffffff`, `--paper-2 #f4f4f5`, `--surface #ffffff`, `--ink #0a0a0a`, `--ink-2 #5f5f66`, `--band #0a0a0a`, `--red #cb2525`, `--radius 6px`; dark `--paper #0b0b0c`, `--paper-2 #1c1c1f`, `--surface #141416`, `--ink #f4f4f5`, `--ink-2 #a1a1aa`, `--band #050506`, `--red-text #ff7b72`.
- `CarArt.jsx` is not touched.
- Phones first: build at 360 px; touch targets ≥ 44 px; inputs 16 px; text ≥ 12 px; no sideways scroll from 320 px; `svh`/`dvh` for full-height pieces; hover effects only under `(hover: hover)`; safe-area insets on bottom bars.
- Red only for sales and alerts (sale price and chips, live-sale dot, gift button, new-leads badge, danger buttons, errors). Primary buttons are ink-filled; white inside dark bands.
- Every bundled photo shown must belong to a car (footer credits cover it).
- **No commits.** Clark commits only when he asks (main spec constraint). Each task ends with a checkpoint instead.

## Review Focus

1. **Header after navigation:** going from a hero page (home, Cars) to a page without one (car page, legal) and back with the browser's Back must show a solid header on the car page at once and a clear one over the hero again. Owned by Task 4.
2. **No photos:** a featured car without photos shows its drawing on a light panel in the hero; with no photos in stock, the Cars banner and waitlist band are plain dark; the home page still has its `h1`. Owned by Tasks 5 and 6 (`--nophotos` run).
3. **Narrow and wordy:** 320–360 px with Bisaya (`ceb`) labels, long car titles and seven-digit prices on two-up cards must not scroll sideways or clip buttons. Owned by every task's overflow check, plus the `ceb320` run in Task 10.
4. **Dark mode:** every light section flips; dark bands stay dark; dialogs, inputs and the map frame stay readable. Owned by each task's dark screenshots and Task 10's raw-hex check.
5. **Reserved and sold cars on a phone:** the reserved overlay opens over the page, the inquiry bar reads as switched off, and the sold banner and waitlist button show. Owned by Task 7.

---

### Task 1: Screenshot and check harness (scratchpad, not the repo)

**Files:**
- Create: `C:\Users\clark\AppData\Local\Temp\claude\b0e447081e36c201\56dd029f-8af7-4ef3-b6b1-3c51408f11aa\scratchpad\shoot.mjs`

**Interfaces:**
- Produces: `node --experimental-websocket shoot.mjs --out=<dir> [--base=http://localhost:5173] [--only=<name,...>] [--sizes=360,390,...] [--dark] [--nophotos] [--lang=ceb]`. Prints one line per shot: `OK <name>@<w>x<h>` or `FAIL <name>@<w>x<h> <reason>`; exits 1 if any FAIL. Writes `<dir>/<name>-<w>[-dark].png` (full page).

- [ ] **Step 1: Write `shoot.mjs`.** Launch `C:\Program Files\Google\Chrome\Application\chrome.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<fresh temp dir per run> about:blank`, poll `http://127.0.0.1:9333/json/version`, open a page target and talk CDP over `WebSocket`. Per shot: `Emulation.setDeviceMetricsOverride` (`mobile: w < 900`, `deviceScaleFactor: w < 900 ? 2 : 1`), `Emulation.setTouchEmulationEnabled` (phones), `Emulation.setEmulatedMedia` with `prefers-color-scheme` (`--dark`), navigate, wait for `load` + 1200 ms, run the scenario's `act` then `assert` JS (`Runtime.evaluate`, `awaitPromise`), check `document.documentElement.scrollWidth <= innerWidth` (FAIL "overflow N px"), `Page.captureScreenshot({ captureBeyondViewport: true })`. Default sizes: `360x740, 390x844, 414x896, 740x360, 1440x900`.
- [ ] **Step 2: Profile setup.** `Page.addScriptToEvaluateOnNewDocument`: set `sessionStorage['showroom360:unlocked']='superadmin'` for `admin*` scenarios; `localStorage['showroom360:lang']` from `--lang`. With `--nophotos`: after the first load, open IndexedDB `showroom360` (no version), set `photoIds: []` on every record in `cars`, reload.
- [ ] **Step 3: Scenarios** (CSS-module class names are hashed, so select with `[class*="name"]`):
  - `home` `/showroom`; `cars` `/showroom/cars`; `carSale` `/showroom/cars/car-01`; `carFeatured` `/showroom/cars/car-04`; `carReserved` `/showroom/cars/car-08`; `carSold` `/showroom/cars/car-10`; `privacy` `/showroom/privacy`; `notFound` `/showroom/nope`.
  - `filters` (cars, phone: click `[class*="filterBtn"]`); `leadForm` (car-04: click the first `[class*="leadButtons"] button`); `promo` (home: click `[class*="promoFab"]`); `viewer` (car-04: click `[class*="galleryZoom"]`).
  - `adminPin` `/showroom/admin` with no unlock; `admin`, `adminCars`, `adminCar` (`/showroom/admin/cars/car-04`), `adminEvents`, `adminPromos`, `adminLeads`, `adminSettings`, `adminHistory`.
  - `nav` (Review Focus 1): load `/showroom` and assert `header` class includes `headerClear`; click the first `a[href^="/showroom/cars/car-"]`, wait 600 ms, assert it does not; `history.back()`, `scrollTo(0,0)`, wait 600 ms, assert it does again. (This fails until Task 4. That's expected.)
- [ ] **Step 4: Baseline.** Start `npm run dev` in `FRONTEND` (background) and run `node --experimental-websocket shoot.mjs --out=<scratchpad>\before --sizes=390x844,1440x900`. Expected: a PNG per scenario, `OK` lines (only `nav` FAILs). These are the "before" pictures.
- [ ] **Checkpoint:** no commit (scratchpad only).

### Task 2: `bandCars` helper

**Files:**
- Modify: `FRONTEND/src/components/SHOWROOM 360/showroomRules.js` (next to `featuredCars`)
- Test: `FRONTEND/src/components/SHOWROOM 360/showroomRules.test.js`

**Interfaces:**
- Produces: `bandCars(cars) => Car[]`: cars not sold (`status !== 'sold'`) with at least one photo id, newest `listedAt` first. The Cars banner uses `[0]`; the home waitlist band uses `[1] ?? [0]`.

- [ ] **Step 1: Write the failing test** `bandCars picks unsold cars with photos, newest listed first`: from four cars (sold-with-photo, available-no-photo, reserved-with-photo listed 1 day ago, available-with-photo listed 5 days ago), `assert.deepEqual(bandCars(cars).map(c => c.id), ['reserved', 'older'])`; and `assert.deepEqual(bandCars([]), [])`.
- [ ] **Step 2:** Run `node --test "src/components/SHOWROOM 360/showroomRules.test.js"` from `FRONTEND`. Expected: FAIL, `bandCars` is not exported.
- [ ] **Step 3:** Implement `bandCars` (reuse the file's `byNewest`; don't mutate the input).
- [ ] **Step 4:** Run the same command plus `historyRules.test.js`, `autoRules.test.js`, `promoRules.test.js`. Expected: all pass.
- [ ] **Checkpoint:** no commit.

### Task 3: Tokens, type and shared pieces

**Files:**
- Modify: `Showroom360.module.css` (header comment, both token blocks, base, type, buttons, photos/prices/chips, forms, dialog/sheet, toast)
- Modify: `Showroom360.jsx` (delete the `DISPLAY_FONT` loader)
- Modify: `ui.jsx` (`CarPhoto`, new `PhotoBand`, new `SectionHead`)

**Interfaces:**
- Produces CSS classes: `.label` (small `--ink-2` text with a 4 px dot), `.sectionHead` / `.sectionAside` (label + heading on the left, a link or arrows on the right; wraps on phones), `.h1`/`.h2`/`.h3` (Inter, weight 500–600, `-0.03em`, sentence case), `.band` / `.bandPhoto` / `.bandShade` / `.bandInner` (a full-bleed dark band with a cover photo and a gradient fade), `.onDark` (inside it `.btnPrimary` is white with ink text and `.btnGhost` has a white outline), `.btnPrimary` (ink fill), `.btnGhost` (1 px ink outline). Kept names: `field`, `fieldLabel`, `input`, `select`, `textarea`, `segmented`, `sheet*`, `toast*`, `priceTag`, `priceSale`, `priceWas`, `saleChip`, `reservedChip`, `iconBtn`, `textBtn`, `arrowLink`, `muted`, `lead`, `statement`, `empty`.
- Produces: `CarPhoto({ car, index = 0, label, className, eager = false })`. The `mark` prop and the outline model name are removed; `eager` sets `loading="eager"` and `fetchpriority="high"`. Remove `mark` from every call site (Home, Inventory, CarPage). Delete `.modelMark`.
- Produces: `PhotoBand({ car, index = 0, hero = false, className = '', children, ...rest })` renders `<section className={band + className} data-sr-hero={hero ? '' : undefined} {...rest}>`: the car's photo as `.bandPhoto` (`alt=""`, eager when `hero`) only if `car` is given, then `.bandShade`, then `<div className={bandInner}>` with `children`. It always carries `.onDark`.
- Produces: `SectionHead({ id, label, title, children })` renders `.sectionHead` > div(`p.label`, `h2#id.h2`) + optional `.sectionAside`.

- [ ] **Step 1:** Replace both token blocks with the spec's values. Remove `--lift`/`--shade`; add `--shadow` (one soft layer, for overlays) and `--header-h` (56 px, 64 px from 900 px). Point `--display` and `--body` at Inter.
- [ ] **Step 2:** Rewrite base, type, buttons, forms, sheet and toast per the spec's "Buttons, forms, dialogs, toast". Sheet: bottom sheet on phones (radius 12 top), centred card from 700 px; a white header row with a hairline (no ink bar); `.sheetActions` sticky at the bottom of `.sheetBody` with a `--surface` background and safe-area padding. Focus: 2 px `--ink` outline, white inside `.onDark`.
- [ ] **Step 3:** Update `ui.jsx` (`CarPhoto`, `PhotoBand`, `SectionHead`) and the `mark` call sites; delete the font loader.
- [ ] **Step 4: Verify.** `npx eslint "src/components/SHOWROOM 360"`: no errors. Harness `--only=filters,leadForm --sizes=360x740,390x844,1440x900` light and `--dark`: all `OK`. Look at `filters-390` and `leadForm-390` (light and dark): white sheet, hairline header, the actions bar visible at the bottom without scrolling.
- [ ] **Checkpoint:** no commit.

### Task 4: Shell (top strip, header, bottom nav, footer)

**Files:**
- Create: `FRONTEND/src/components/SHOWROOM 360/public/TopStrip.jsx`
- Modify: `public/Home.jsx` (move `Ticker` and `tickerItems` out, unchanged, into TopStrip.jsx; Home no longer renders the ticker)
- Modify: `Showroom360.jsx` (`PublicShell`: strip, header, footer; new `useOverHero`)
- Modify: `Showroom360.module.css` (header, nav, strip, footer sections)

**Interfaces:**
- Produces: `TopStrip()`, with no props, reading `useShowroom()` / `useNav()`. On `loc.view === 'home'` it renders the existing `Ticker` inside `.strip` (a live-event item gets `.stripLive`, a red dot; `tickerItems` must mark which items are live, e.g. return `{ text, live }`). Elsewhere it renders phone (a `tel:` link via `telHref` from Home.jsx), hours and address with Phone, Clock and MapPin icons, phone only below 900 px. It renders nothing if none are set and there is no ticker.
- Produces: `useOverHero(key)` in Showroom360.jsx, where `key = loc.view + (loc.id || '')`. In a layout effect on `key` it finds `[data-sr-hero]`; with none it returns `false`. Otherwise an `IntersectionObserver` (`rootMargin: -(header height) 0 0 0`) tracks whether the hero is under the header. The header gets `.headerClear` while it is true.
- Produces CSS: `.strip`, `.stripLive`, `.headerClear`, `.contactBtn`, `.footerGrid`, `.footerCol`, `.footerHead`, `.wordmark` (sized by `--len` from the shop name's length, `aria-hidden`).
- Consumes: `.onDark`, `.label` from Task 3.

- [ ] **Step 1:** Build `TopStrip.jsx` and render it above `<header>`. Keep the ticker's screen-reader copy and its hold/reduced-motion rules.
- [ ] **Step 2:** Header markup. Desktop nav shows Home and Cars; Contact renders as `.contactBtn` (white button) on the right after EN | CEB and the theme toggle, with the same `onClick`/`href`/`aria-current`. `navItems(styles.bottomNav)` keeps all three links. The header is sticky with a solid `--band` by default; `.headerClear` makes it transparent. Header text is white in both states.
- [ ] **Step 3:** Footer per the spec's "Footer": four columns (stacked on phones: shop block, then Pages | Legal side by side, then Contact), credits fold-out and "Made by" kept, the © line `© {new Date().getFullYear()} {settings.shopName}`, and the wordmark last.
- [ ] **Step 4:** Bottom nav: `--surface` bar, hairline top, current item ink and bold (no red bar), safe-area padding.
- [ ] **Step 5: Verify.** (The `nav` check needs the home hero's `data-sr-hero`, so Task 5 runs it.) Harness `--only=home,privacy,carFeatured` at all default sizes, light and `--dark`: all `OK`. Look at `privacy-360`, `privacy-1440` and the dark ones: solid dark header, strip with the phone, the footer columns, the wordmark not clipped awkwardly.
- [ ] **Checkpoint:** no commit.

### Task 5: Home page

**Files:**
- Modify: `public/Home.jsx` (`Home`, `Featured`, `WishBand`)
- Modify: `Showroom360.module.css` (featured/hero, about/contact, recently sold, sections)

**Interfaces:**
- Consumes: `PhotoBand`, `SectionHead`, `CarPhoto({ eager })`, `bandCars` (Tasks 2–3); `.headerClear` via `data-sr-hero` (Task 4).
- Produces CSS: `.heroPrice` (a row with the sale chip, the `PriceTag` and `.heroMonthly`), `.heroArt` (the light rounded panel for a drawing), `.rowArrows`. The `sticker*` classes are deleted once the car page (Task 7) no longer uses them.

- [ ] **Step 1: Hero.** `Featured` stays the same component (state, timer, swipe, aria). Its `<section>` gets `data-sr-hero` when `n > 0`, and the `.onDark` and `.band` look with `margin-top: calc(-1 * var(--header-h))`. Each slide's `.slideMedia` fills the band (the photo covers it; the first slide's `CarPhoto` is `eager`). When the car has no photo, the drawing sits in `.heroArt` (right on desktop, top on phones). `.slideText` holds the `.label` h1 ("Featured cars", the existing `h1`), `.slideTitle`, `.slideFacts`, `.heroPrice` (sale chip with the event name, or "Price dropped", `PriceTag`, then monthly or "Cash only"), and the actions ("View this car" as `.btnPrimary`; "See all cars" as `.btnGhost`; full width on phones). The stock and body chips stay. Controls go at the bottom with white progress segments. Height: `min-height: 78svh` on phones (text at the bottom), `min(88vh, 860px)` on desktop (text left, centred). The section grows when its text needs more room. `n === 0`: no `data-sr-hero`, a compact band showing the h1 and the "See all cars" link.
- [ ] **Step 2: Sections.** Cars in stock: `SectionHead` with label `ticker.stock`/`ticker.stock1` (n = `forSale.length`), title `cars.title`, aside = the existing "See all cars (n)" link. About/contact: label `home.about`, `.statement` = tagline as the heading (keep the `id="sr-about"` on the element that is the heading), contact rows with Phone, Clock and MapPin icons, Call (`.btnPrimary`) and Maps (`.btnGhost`), map in a radius-8 frame (still greyscale). Recently sold: label `home.sold`, title `home.soldHint`, and in the aside `.rowArrows`: two `.roundBtn` with `home.prev`/`home.next` labels that `scrollBy` the row by one card. They show only under `(hover: hover) and (min-width: 900px)`. The row uses scroll-snap with a peek of the next card. The SOLD label (`.soldStamp`) becomes a black chip top-left, not rotated.
- [ ] **Step 3: Waitlist band.** `WishBand` renders `PhotoBand` with `car = bandCars(cars)[1] ?? bandCars(cars)[0]` and keeps its heading, text, button and `LeadForm`.
- [ ] **Step 4: Verify.** Harness `--only=home,nav,promo` at all sizes, light and `--dark`: all `OK`. Then the same with `--nophotos --only=home`: `OK`, plus asserts `document.querySelector('[data-sr-hero] svg')` exists, there's no `img` inside `[class*="band"]`, and an `h1` exists (Review Focus 2). Look at `home-390`, `home-740` (landscape: hero text not clipped), `home-1440` and the dark and no-photo ones.
- [ ] **Checkpoint:** no commit.

### Task 6: Car cards and the Cars page

**Files:**
- Modify: `public/Inventory.jsx` (`Inventory` banner and layout, `CarCard`)
- Modify: `Showroom360.module.css` (inventory, cards)

**Interfaces:**
- Consumes: `PhotoBand`, `bandCars`, `.label`.
- Produces: `CarCard` markup, used by Home too: `.cardMedia` (badges and stock chip as now), then `.cardBody` with `.cardHead` (`h3.cardTitle` + `PriceTag.cardPrice`; one line when the card is at least 260 px wide via `container-type: inline-size`, stacked otherwise), `.cardFacts` as three spans with Gauge, Cog and Fuel icons (14 px, `aria-hidden`) that wrap, then `.cardMonthly` as now.

- [ ] **Step 1: Banner.** `Inventory` opens with `PhotoBand hero car={bandCars(cars)[0]}` holding `h1.h1` "All cars" (`cars.title`) at the bottom-left; the existing `h1` moves into it. It is about 190 px tall on phones and 420 px on desktop, pulled under the header like the home hero.
- [ ] **Step 2: Body.** Search row as now (a rounded box, 16 px input), the filter panel on desktop in a `--surface` box (1 px border, radius 8, padding 16, sticky below the header). Results: 2 cards per row beside the filters, 3 from 1400 px. Phones keep the Filters sheet and 2 per row from 340 px. `.wishLine` becomes a `--paper-2` rounded box. The range slider and checkbox use ink (round thumbs).
- [ ] **Step 3: Cards** per the Interfaces above. On hover (mouse only) the photo zooms 3%; no lift or shadow.
- [ ] **Step 4: Verify.** Harness `--only=cars,filters,home` at all sizes, light and `--dark`: all `OK`. With `--nophotos --only=cars`: `OK` and no `img` in the banner. Look at `cars-360` (two-up cards readable, prices whole), `cars-1440` (filters left, 2-up) and the dark ones.
- [ ] **Checkpoint:** no commit.

### Task 7: Car page

**Files:**
- Modify: `public/CarPage.jsx`, `public/LoanCalc.jsx` and `public/ConditionCard.jsx` (class names only, if needed), `public/InquiryBar.jsx` (no change expected)
- Modify: `Showroom360.module.css` (car page, gallery, price card, loan, details, reserved overlay)

**Interfaces:**
- Produces CSS: `.monthlyLine` (replaces `.stickerTear` on the price card), `.stockLine` (replaces `.barcode`: `t(lang,'spec.stock')` + the number as visible small text). Delete `.sticker*`, `.barcode` and the numbered-heads counter.

- [ ] **Step 1: Markup.** The price card keeps every child and its conditions. Swap the barcode `<p>` for `.stockLine` (visible label, no `srOnly`) and the tear `<p>` for `.monthlyLine`. Fact tiles get Calendar, Gauge, Cog and Fuel icons. In `ReservedOverlay` the stamp text stays (and so does the word-wrap split).
- [ ] **Step 2: Styles** per the spec's "Car page". The gallery is edge to edge below 960 px (negative side margin equal to the page padding, no radius), radius 6 from 960 px. The price card has a 1 px border and radius 8; the sale header is a red chip, not a red bar. The loan calculator is its own bordered card. Details have plain headings with hairlines; condition rows have the value on the right; the spec grid is label over value. The phone inquiry bar is `--surface` with a hairline and safe area, and `.carPage` gets bottom padding so it never covers content. The sold banner is an ink rounded bar. The reserved stamp is white 3 px rounded, not rotated.
- [ ] **Step 3: Verify** (Review Focus 5). Harness `--only=carSale,carFeatured,carReserved,carSold,viewer,leadForm` at all sizes, light and `--dark`: all `OK`. Assert `carReserved` has `dialog[open]`, and `carSold` has no `[class*="inquiryBar"]` and has a waitlist button. With `--nophotos --only=carFeatured`: `OK`, and the drawing shows in the gallery. Look at `carReserved-390`, `carSold-390`, `carSale-390` (sale chip, struck price, fixed bar not covering the last content) and `carSale-1440`.
- [ ] **Checkpoint:** no commit.

### Task 8: Remaining public pieces

**Files:**
- Modify: `Showroom360.module.css` (legal, empty states, promo FAB and dialog, ticket, viewer, scroll reveal, reduced motion)
- Modify: `public/PromoPopup.jsx` / `public/PhotoViewer.jsx` / `public/Legal.jsx` (class names only, if needed)

- [ ] **Step 1:** Restyle legal (Inter headings, a red-text number, the sample box kept), empty and not-found states, and the crash screen. Promo per the spec: FAB red and round with a soft shadow and a black label chip; dialog radius 12; dark top kept; sale chip red and upright; ticket shape kept with 1 px borders and no block shadow; odds list unchanged. Viewer: fonts and buttons only.
- [ ] **Step 2:** Rewrite the reduced-motion block to cover the new transitions, and keep the scroll-reveal rule (now on `.cardGrid > .card`, `.soldCard`, the about columns and car details).
- [ ] **Step 3: Verify.** Harness `--only=promo,viewer,privacy,notFound` at all sizes, light and `--dark`: all `OK`. Look at `promo-360` (the wheel fits, the close button reachable) and `promo-1440-dark`.
- [ ] **Checkpoint:** no commit.

### Task 9: Admin

**Files:**
- Modify: `admin/Admin.module.css` (whole file)
- Modify: `admin/*.jsx` only where a class needs new structure (expected: none, or the PIN gate wrapper)

**Interfaces:**
- Consumes: tokens, buttons, forms, sheets from Task 3 (admin imports `Showroom360.module.css` as `s`).
- Keeps every class name the admin JSX uses (grep `a\.` in `admin/*.jsx` before starting; each must still have a rule or be intentionally plain).

- [ ] **Step 1:** Navigation per the spec's "Admin": the phone top bar is white with a hairline; bottom tabs like the public bottom nav, with the red new-leads badge; the desktop sidebar is `--band` and the current page is a white rounded block with ink text. Role tag: outlined for Admin, red for Superadmin.
- [ ] **Step 2:** PIN gate: a dark band page with a white card (radius 12). Page heads and block heads: Inter 600 with hairlines, no ink tabs. Dashboard stats: separate bordered cards (2 columns on phones, 5 from 700 px), the new-leads value in `--red-text`. Lists as ruled rows that stack on phones. Forms: legends as headings with hairlines; the sticky save bar `--surface` with a hairline, above the tabs on phones; delete buttons red.
- [ ] **Step 3: Verify.** Harness `--only=adminPin,admin,adminCars,adminCar,adminEvents,adminPromos,adminLeads,adminSettings,adminHistory` at all sizes, light and `--dark`: all `OK`. Look at `admin-390`, `adminCar-390` (save bar above the tabs, one column), `admin-1440` and `admin-1440-dark` (sidebar current item).
- [ ] **Checkpoint:** no commit.

### Task 10: Whole-site check and notes

**Files:**
- Modify: `docs/superpowers/specs/2026-11-23-showroom-360-design.md` (a short "Look v4" entry pointing to the new spec, and mark v3 replaced)
- Modify: memory `showroom-360-project.md` (the "Look" bullets now describe v4)

- [ ] **Step 1:** Run the full harness at all sizes, light and `--dark`, then `--nophotos`, then `--lang=ceb --sizes=320x640,360x740`. Expected: every line `OK`.
- [ ] **Step 2:** Run `node --test` on the four Showroom test files (all pass), `npx eslint "src/components/SHOWROOM 360"` (no errors) and `npx vite build` (success).
- [ ] **Step 3: Raw colour check.** `grep -nE "#[0-9a-fA-F]{3,6}\b" "src/components/SHOWROOM 360/Showroom360.module.css" "src/components/SHOWROOM 360/admin/Admin.module.css"`: matches only inside the two token blocks, plus `#fff` on red fills and on the photo bands (allowed: both stay dark or red in both themes).
- [ ] **Step 4: Side by side.** Compare `before/home-390`, `before/cars-1440` and `before/admin-1440` with the new ones and check nothing that was there is missing (every section, button, chip and line of text).
- [ ] **Step 5:** Update the main spec and memory.
- [ ] **Checkpoint:** report to Clark with the screenshots worth seeing. Commit only if he asks.
