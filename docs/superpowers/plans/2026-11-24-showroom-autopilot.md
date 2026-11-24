# Showroom 360 Autopilot (+ photo zoom) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four browser-only automations (waitlist, follow-up tasks, price-drop rules, week report) plus tap-to-zoom photos on the car page.

**Architecture:** All rules are pure functions. The autopilot rules live in a new `autoRules.js`; price-drop display and zoom maths go in `showroomRules.js`. The React pages only call those functions and save through the existing store actions (`saveLead`, `saveCar`, `saveSettings`), so History keeps logging. There's no new IndexedDB store: wishes are leads with `type: 'wish'`.

**Tech Stack:** Vite + React 18, CSS modules, lucide-react, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-24-showroom-autopilot-design.md`. Photo zoom: Clark's request of 2026-11-24, "every image will be clickable and zoomable" on the car page. No separate spec.

## Global Constraints

- No new npm dependencies. No IndexedDB version bump.
- Phones first (360–390 px). Look v3 tokens only: no raw hex in new CSS, and it must work in dark mode.
- Every new public string needs EN and CEB. The CEB is Claude's, so flag it for Clark to proofread.
- PIN digits never appear in History. Buyer requests are never logged.
- Don't write to `dealerList.js`. Never link `/admin` publicly.
- Commit only when Clark asks.
- Test command, run from FRONTEND: `node --test "src/components/SHOWROOM 360/showroomRules.test.js" "src/components/SHOWROOM 360/historyRules.test.js" "src/components/SHOWROOM 360/autoRules.test.js" "src/components/CARMARK 360/"`

## Review Focus

1. A lead saved before this change (no `contactedAt`, `lang` or `notifiedCarIds`) must still get the right task and must not crash. Fall back to `createdAt` and `'en'`.
2. A car in a live **or upcoming** event must never get a price-drop suggestion, because the drop could push its sale price above the new price.
3. A wish with no filters (the empty state shown with zero stock) matches any available car. Its label reads "Any car".
4. Week boundaries use local time (Cebu), with Monday 00:00 as the start, not UTC.
5. Zoom: when an image is panned past its edge it snaps back inside, and swiping only changes photo when the image is not zoomed.

---

### Task 1: Tap-to-zoom photo viewer

**Files:**
- Modify: `showroomRules.js`, adding a `── photo viewer ──` section.
- Modify: `public/CarPage.jsx`.
- Modify: `Showroom360.module.css` and `i18n.js`.
- Test: `showroomRules.test.js`.

**Interfaces:**
- Produces `ZOOM_MAX = 4`.
- Produces `clampView(view, box) -> view`:
  - `view` is `{ s, x, y }`; `box` is `{ imgW, imgH, boxW, boxH }`.
  - `s` is clamped to the range 1 to `ZOOM_MAX`.
  - `x` is limited to ±`max(0, (imgW*s - boxW)/2)`, and `y` the same way using the heights.
  - When `s` is 1, `x` and `y` are 0.
- Produces `zoomAt(view, s2, fx, fy) -> view`, which zooms about a focal point `(fx, fy)` measured from the box centre:
  - `x' = fx - (fx - x) * s2/s`
  - `y' = fy - (fy - y) * s2/s`
  - The result is not clamped.

- [ ] Write the tests. Test "zoom stays inside the photo":
  - `clampView({s:9,x:0,y:0},box).s === 4`
  - `clampView({s:0.5,x:30,y:30},box)` deep-equals `{s:1,x:0,y:0}`
  - with `box={imgW:400,imgH:250,boxW:400,boxH:500}` and `s=2`, `x` is clamped to ±200 and `y` to 0, because 250·2 = 500 is not wider than 500.
- [ ] Write the test "zooming at a point keeps that point still": `zoomAt({s:1,x:0,y:0},2,100,0)` gives `x === -100`.
- [ ] Run the tests and watch them fail. Expected: FAIL, because the exports are missing.
- [ ] Implement both functions.
- [ ] Viewer UI in `CarPage.jsx`:
  - The main photo becomes a `<button>` (only when the car has photos), labelled `t('car.zoomOpen',{n,total})`, with a small zoom-icon badge.
  - The button opens a full-screen `<dialog>` with:
    - the photo, shown with `object-fit` contain;
    - prev and next buttons, and a "n / total" counter;
    - zoom in and zoom out buttons (+/−) and a close button;
    - the photo credit, if there is one;
    - the hint `t('car.zoomHint')`.
  - Input handling:
    - Pointer events with `touch-action: none` give two-finger pinch, one-finger pan while zoomed, and double-tap or double-click to toggle 2.5× at the tapped point.
    - The mouse wheel zooms.
    - The arrow keys change photo; Esc closes.
    - A horizontal swipe of more than 50 px changes photo, but only when `s === 1`.
    - Changing photo resets the zoom.
  - Thumbnails still pick the main photo.
  - Silhouette cars (no photos) are not clickable.
  - `prefers-reduced-motion` turns off the transform transition.
- [ ] Strings, EN and CEB: `car.zoomOpen`, `car.zoomIn`, `car.zoomOut`, `car.zoomHint`.
- [ ] Run the tests. Expected: PASS, including the existing EN/CEB key-parity test.

### Task 2: Autopilot rules (`autoRules.js`)

**Files:**
- Create: `autoRules.js` and `autoRules.test.js`.
- Modify: `showroomRules.js` and `seedData.js`.

**Interfaces:**
- Produces, in `showroomRules.js`:
  - `DROP_SHOWN_DAYS = 14`.
  - `recentDrop(car, now) -> {from, at} | null`. It returns `car.priceDrop` when `from > price` and the drop is less than 14 days old.
  - `effectivePrice` now returns `{ price, original, event, dropped }`. With no live event and a `recentDrop`, it returns `original = drop.from` and `dropped = true`. Otherwise `dropped` is false. An event still wins.
- Produces, in `seedData.js`:
  - `DEFAULT_PRICE_RULE = { on: true, days: 45, pct: 3 }`.
  - `normalizeData` fills `settings.priceRule` as a field-by-field merge with the default, and gives wish leads `notifiedCarIds: []`.
- Produces, in `autoRules.js`:
  - Constants: `REPLY_AFTER_MIN = 60`, `FOLLOW_UP_DAYS = 3`.
  - `describeQuery(query, lang) -> string`, e.g. "SUV · Toyota · up to ₱900,000". It returns `t(lang,'wish.any')` when the query is empty.
  - `wishMatches(wish, cars, events, now) -> car[]`: available cars that pass `filterCars([car], wish.query, …)`.
  - `waitingFor(car, leads, events, now) -> lead[]`: wishes that are not closed, match the car, and don't have `car.id` in `notifiedCarIds`.
  - `suggestedDropPrice(price, pct) -> number`: `floor(price*(1-pct/100)/1000)*1000`.
  - `priceDropsDue(cars, events, rule, now) -> [{car, price}]`. It returns `[]` when `!rule.on`. A car is due when:
    - it is available;
    - it has no live or upcoming event that includes it;
    - `daysSince(max(listedAt, priceDrop.at, priceDropSkippedAt)) >= rule.days`;
    - `suggestedDropPrice < price`.
  - `todoList({leads, cars, events, settings}, now) -> Task[]`.
    - `Task = { kind, lead?, car?, price?, minutes? }`.
    - `kind` is one of `'reply' | 'remind' | 'wish' | 'dropped' | 'followup' | 'drop'`, sorted in that order. Within each kind, the oldest comes first.
    - The rules are exactly the spec's table. Leads without `contactedAt` or `lastContactAt` use `createdAt`.
  - `taskMessage(task, settings, carUrl, lang) -> string`. It works for EN and CEB, and says nothing about an address that is blank.
  - `recordContact(lead, task, now) -> lead`:
    - sets `lastContactAt`;
    - for a New lead, sets `status: 'contacted'` and `contactedAt`;
    - for `remind`, sets `reminderSentAt`;
    - for `wish`, appends `task.car.id` to `notifiedCarIds`.
  - `applyPriceDrop(car, price, now)` sets `price` and `priceDrop: {from, at}`.
  - `skipPriceDrop(car, now)` sets `priceDropSkippedAt`.

- [ ] Write tests in `autoRules.test.js`, using the `NOW` and `car()` helpers in the same style as `showroomRules.test.js`:
  - **reply:** a New lead at 59 min gives no `reply` task; at 61 min it gives one with `minutes === 61`.
  - **remind:** a Contacted test drive dated tomorrow gives `remind`. With `reminderSentAt` set it doesn't. A test drive dated in 2 days doesn't either.
  - **followup:** a Contacted reservation whose last contact was 3 days ago gives `followup`. At 2 days it doesn't. A Contacted test drive dated in the future gives no `followup`.
  - **dropped:** a lead whose car has `priceDrop.at` after the lead's last contact gives `dropped`. After `recordContact`, it's gone.
  - **wish:**
    - "SUV up to ₱900,000" doesn't match a ₱925,000 SUV, but after `applyPriceDrop(…, 897000)` it does.
    - A reserved car never matches.
    - After `recordContact` the same car doesn't come back.
    - An empty query matches any available car.
  - **drop:**
    - `suggestedDropPrice(925000,3) === 897000`.
    - Day 44 is not due; day 45 is.
    - A car in an upcoming event is not due.
    - With `rule.on === false` the list is empty.
    - After a skip on day 45, nothing is due until day 90.
  - **effectivePrice:**
    - On day 13 after a drop: `dropped: true, original: from`.
    - On day 14: `dropped: false`.
    - A live event beats the drop.
  - **Old lead:** a lead with only `{status:'contacted', createdAt}` doesn't throw and follows the `createdAt` rules.
  - **taskMessage:**
    - With a blank address, the message contains no "undefined", "null" or doubled punctuation.
    - The CEB text differs from the EN text.
  - **Order:** in a mixed list, the kinds come out in the order `reply, remind, wish, dropped, followup, drop`.
- [ ] Run the tests and watch them fail. Expected: FAIL, because `autoRules.js` doesn't exist yet.
- [ ] Implement everything. Add the CEB and EN keys `wish.any`, plus the message templates in `i18n.js` under `auto.*`.
- [ ] Run the tests. Expected: PASS.

### Task 3: Sample buyers

**Files:**
- Modify: `seedData.js`, `store.js` and `showroomRules.test.js`.

**Interfaces:**
- Produces `sampleLeads(now, cars) -> lead[]`. These are the 6 buyers in the spec, with times counted back from `now`. Each one that has a car uses the seed car id (`car-04` Fortuner, `car-09` City, `car-06` Xpander GLS, `car-10` Civic). Lead ids are `lead-sample-1`…`6`.
- Produces `applySampleLeads(data, now) -> { data, leads }`. It is a no-op when `settings.sampleLeads` is set. Otherwise it returns the sample buyers whose car still exists with the same make and model; buyers with no car (wishes) are always included.
- Updates `makeSeed`, which now includes `sampleLeads(...)` and `settings.sampleLeads: 1`.

- [ ] Write the test "the sample buyers show every task": `todoList(makeSeed(NOW), NOW)` contains `reply`, `remind`, `followup` and `drop` (Montero at 72 days, BR-V at 95), and does **not** contain `wish`.
- [ ] Write the test "applying the Montero drop wakes Ramon's wish": after `applyPriceDrop(montero, suggested)`, `waitingFor` returns Ramon T.
- [ ] Write the test "old demos get the sample buyers once, skipping cars that are gone":
  - with car-04 deleted, there is no Mark D.;
  - with `sampleLeads: 1` set, the result is `[]`.
- [ ] Write the test "sample phones pass isPhMobile, and names are a first name plus an initial".
- [ ] Run the tests and watch them fail. Expected: FAIL.
- [ ] Implement. In `store.js`, the load does `if (!loaded.settings.sampleLeads)`: put the leads, then `putSettings({...settings, sampleLeads: 1})`. This is not logged, and it uses the same block as `samplePhotos`.
- [ ] Run the tests. Expected: PASS. The existing seed price-range tests still pass.

### Task 4: History lines

**Files:**
- Modify: `historyRules.js` and `historyRules.test.js`.

**Interfaces:**
- `carEntry`: when the only change is Price and `after.priceDrop?.at !== before.priceDrop?.at`, the action is `'Price dropped'`.
- `settingsEntry` adds rows labelled `'Price-drop rule'` (On/Off), `'Price drop after'` (`N days`) and `'Price drop size'` (`N%`).

- [ ] Write the tests:
  - "a price drop reads as Price dropped": the action is `'Price dropped'` and the row goes from `₱925,000` to `₱897,000`.
  - "a skipped drop logs nothing": `carEntry(car, skipPriceDrop(car)) === null`.
  - "the price-drop rule shows in settings history".
- [ ] Run the tests and watch them fail, then implement and run them again. Expected: FAIL, then PASS.

### Task 5: Public site

**Files:**
- Modify: `public/Inventory.jsx`, `public/LeadForm.jsx`, `public/CarPage.jsx`, `ui.jsx` (`PriceTag` and the card tag), `showroomRules.js` (`fbCaption`), `i18n.js` and the CSS.

- [ ] Write the test "the Facebook caption calls out a price drop": with `info.dropped`, the first line starts with `PRICE DROP:` and a line contains `was ₱925,000`. In CEB it says `dati`.
- [ ] Run it and watch it fail, then implement `fbCaption` and run it again. Expected: FAIL, then PASS.
- [ ] The `LeadForm` gets a `type: 'wish'` mode:
  - it shows `describeQuery(query, lang)` instead of a car;
  - it has no date or slot fields;
  - it saves `{ type:'wish', query, carLabel: describeQuery(query,'en'), notifiedCarIds: [] }`;
  - every lead now saves `lang`.
- [ ] Inventory:
  - The empty state gets the button `t('wish.cta')`.
  - When filters are on and there are results, a line under the list reads `t('wish.line')` with the same button.
- [ ] Cards and the car page show a `t('price.dropped')` tag when `info.dropped`. `PriceTag` already strikes through `original`.
- [ ] Strings, EN and CEB: `wish.cta`, `wish.line`, `wish.title`, `wish.hint`, `wish.sentHint`, `wish.any`, `price.dropped`.

### Task 6: Admin pages

**Files:**
- Create: `admin/TaskList.jsx`, holding the task rows and send buttons that the dashboard and Leads both use.
- Modify: `admin/Dashboard.jsx`, `admin/Leads.jsx`, `admin/CarForm.jsx`, `admin/Settings.jsx` and `admin/Admin.module.css`.

- [ ] **`TaskList`:**
  - Each row shows an icon, who or what, why (for example "waited 3 hrs"), and its actions.
  - Buyer tasks have **Viber** (`viberUrl`), **Text** (`sms:` link with the body), and **Copy** (clipboard plus a toast). Each one then calls `saveLead(recordContact(...))`.
  - `drop` tasks have **Apply ₱897,000**, which calls `saveCar(applyPriceDrop)` and shows a toast, and **Skip**, which calls `saveCar(skipPriceDrop)`.
  - `reply` rows turn red once they're overdue.
  - The empty list reads "All caught up."
- [ ] **Dashboard:**
  - A "To do" block goes first, for both roles.
  - The "Aging stock" block is hidden while `settings.priceRule.on`.
- [ ] **Leads:**
  - A "Waitlist" type tab.
  - Each card shows its own tasks through `TaskList` in compact mode.
  - A wish card shows the search and the cars it matches now.
- [ ] **CarForm:**
  - After a save, when `waitingFor(saved, …)` isn't empty, show the toast "N buyer(s) waiting for a car like this", with a "See" action linking to `/showroom/admin`.
  - The edit page shows the same note.
- [ ] **Settings:** a "Price-drop rule" fieldset with an On toggle, the days (1–365) and the percent (1–20). It uses the existing validation style.
- [ ] Run the tests. Expected: PASS. Then run `npx vite build`. Expected: no errors.

### Task 7: Week report

**Files:**
- Modify: `autoRules.js` and `autoRules.test.js`.
- Create: `admin/WeekReport.jsx`.
- Modify: `admin/Dashboard.jsx`.

**Interfaces:**
- `weekRange(now, which: 'last'|'this') -> {start: Date, end: Date}`. It uses local Monday 00:00. For `'this'`, `end = now`.
- `weekReport({leads, cars}, range, now)` returns `{ requests:{total,testDrive,reserve,wish}, reply:{avgMin|null, overHour}, sold:{count,total,avgDays|null}, added, priceDrops, mostAsked:{label,n}|null, slowest:{car,days}|null }`.
- `reportText(report, settings, range) -> string`. It's plain text with one fact per line.

- [ ] Write the tests:
  - "weeks start Monday in local time": for `now = new Date(2026,10,24,0,30)` (a Tuesday), last week runs from Nov 16 00:00 to Nov 23 00:00.
  - On a Monday at 00:10, 'this' starts that day at 00:00.
- [ ] Write the test "week report counts only that week": a lead or sale one minute before the start is excluded; one at the start is included.
- [ ] Write the test "report text reads cleanly with no sales": it contains no `null`, `NaN` or `undefined`.
- [ ] Run the tests and watch them fail, then implement and run them again. Expected: FAIL, then PASS.
- [ ] `WeekReport.jsx` shows a two-option switch (Last week / This week so far), the facts, and **Copy** and **Share on Viber** (`viber://forward?text=`). On the dashboard it is for the superadmin only.

### Task 8: Check in the browser and update the docs

- [ ] Run headless Chrome with `sr.mjs` at 360, 390 and 1280 px, in light and dark, signed in as admin and as superadmin.
  - Zoom: double-tap, pinch, swipe.
  - Waitlist: send a request, add a matching car, and check the toast and the task.
  - Apply the Montero drop and check Ramon's task appears.
  - Send a reminder and check the lead moves on.
  - Check the week report copy.
  - Check nothing scrolls sideways at 360 px.
- [ ] Run the full test command and `npx vite build`. Expected: everything passes and the build is clean.
- [ ] Add "Built (2026-11-24)" notes to the spec, and add one line to the `showroom-360-project.md` memory.
