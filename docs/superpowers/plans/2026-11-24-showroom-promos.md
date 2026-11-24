# Showroom 360 Promos (prize wheel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The superadmin creates prize-wheel promos with set odds and dates, then attaches one to an event by its promo code. Buyers spin once in a once-per-visit pop-up and claim a unique voucher with their name and email. Staff redeem vouchers.

**Architecture:**
- The rules are pure functions in a new `promoRules.js`.
- Promos and claims are two lists in the existing IndexedDB `kv` store (`promos`, `claims`), so there's no version bump. `normalizeData` repairs them.
- Store actions save through `commit` with history entries, the same way as cars and events.
- The buyer's pop-up is mounted once in `PublicShell`. Spin and seen-state live in this browser's localStorage and sessionStorage.

**Tech Stack:** Vite + React 18, CSS modules, lucide-react, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-24-showroom-promos-design.md`

## Global Constraints

- No new npm dependencies. No IndexedDB version bump.
- Phones first (360–390 px). Look v3 tokens only. Must work in dark mode. With reduced motion, the result shows without the spin.
- Every new public string needs EN and CEB. The CEB is Claude's, for Clark to proofread.
- Only the superadmin creates, edits, deletes or attaches promos. Both roles can view promos and redeem vouchers.
- History logs admin actions only. A buyer's spin or claim is never logged, and PIN digits never appear.
- Commit only when Clark asks. Never link `/admin` publicly.
- Test command, run from FRONTEND: `node --test "src/components/SHOWROOM 360/showroomRules.test.js" "src/components/SHOWROOM 360/historyRules.test.js" "src/components/SHOWROOM 360/autoRules.test.js" "src/components/SHOWROOM 360/promoRules.test.js" "src/components/CARMARK 360/"`

## Review Focus

1. A saved demo from before promos (no `promos` or `claims` key, events without `promoId`) loads without crashing and gets the sample promo exactly once.
2. A promo attached to an event that later ends, or a promo whose dates have passed, never shows the pop-up.
3. Chances that don't add up to 100, or a prize at 0%, can't be saved. `pickPrize` never returns a 0% prize.
4. The same email (case and spaces ignored) can't claim the same promo twice, and voucher codes never repeat.
5. The pop-up shows at most once per visit and never on admin pages. After a spin, closing and reopening offers "Claim" instead of a second spin.

---

### Task 1: Promo rules

**Files:**
- Create: `promoRules.js` and `promoRules.test.js`.

**Interfaces (Produces):**
- `CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'` (no 0/O, 1/I/L).
- `VOUCHER_DAYS = 30`, `MAX_PRIZES = 8`, `MIN_PRIZES = 2`.
- `pickPrize(prizes, rand) -> prize`. It walks the cumulative `chance` %; `rand` is in [0, 1).
- `newCode(prefix, taken, rand = Math.random) -> string`:
  - `SPIN-XXXX` for promo codes;
  - `DM-XXXX-XXXX` for vouchers, using the prefix from the shop's initials;
  - it tries again while the code is in `taken`.
- `validatePromo(promo) -> errors`, with errors on `name`, `endsAt` and `prizes`.
- `promoStatus(promo, now) -> 'upcoming' | 'live' | 'ended'`.
- `activePromo(events, promos, now) -> { promo, event } | null`: the first live event whose `promoId` names a live promo.
- `findPromoByCode(promos, code) -> promo | null`. It ignores case and spaces.
- `normEmail(s)`, `isEmail(s)`.
- `claimFor(promoId, email, claims) -> claim | null`.
- `voucherStatus(claim, now) -> 'unused' | 'redeemed' | 'expired'`. A claim expires `VOUCHER_DAYS` after `claimedAt`.
- `voucherPrefix(shopName)`: the initials of the first 2 words, falling back to `DM`.

**Steps:**
- [ ] Write the tests:
  - **pickPrize:** with `[{chance:40},{chance:30},{chance:25},{chance:5}]`, rand 0 gives the first, 0.3999 the first, 0.4 the second, 0.9499 the third, and 0.95 and 0.9999 the fourth. A 0% prize is never returned.
  - **newCode:** a fixed rand gives a fixed code. A clash with `taken` gives a different code. Codes only use `CODE_CHARS`.
  - **validatePromo:** chances totalling 99 fail; 1 prize fails; 9 prizes fail; a blank label fails; the end before the start fails.
  - **activePromo:** null when the event or the promo has ended or is upcoming.
  - **claimFor:** finds `' Ana@Mail.com '` against `'ana@mail.com'`.
  - **voucherStatus:** expired on day 30, unused on day 29, redeemed whenever `redeemedAt` is set.
- [ ] Run them and watch them fail (`promoRules.js` missing). Implement, then run again and watch them pass.

### Task 2: Data, store and history

**Files:**
- Modify: `seedData.js`, `store.js`, `historyRules.js`, `showroomRules.test.js` and `historyRules.test.js`.

**Interfaces (Produces):**
- `normalizeData` returns `promos` and `claims` (lists repaired). It leaves `event.promoId` as is, or sets it to null.
- `samplePromo(now)` returns the "Christmas Spin" promo, with id `promo-sample` and code `SPIN-XMAS`. Its prizes are the spec's 4 at 40, 30, 25 and 5%. It starts 3 days ago and ends in 30 days.
- `makeSeed` includes `promos: [samplePromo]` and `claims: []`. The Christmas Sale gets `promoId: 'promo-sample'`, and settings get `samplePromo: 1`.
- `applySamplePromo(data, now) -> { data, promo, event }`:
  - It does nothing when `settings.samplePromo` is set.
  - Otherwise it adds the sample promo unless one with that id already exists.
  - It attaches the promo to `event-christmas` only if that event still exists and has no `promoId`.
- Store:
  - `load()` reads `kv.promos` and `kv.claims`; `reset` writes the seed's.
  - Actions:
    - `savePromo(p)` and `deletePromo(id)`. Deleting also clears `promoId` from events.
    - `saveClaim(c)`, for buyers, not logged.
    - `redeemClaim(id, stockNo)`, logged.
  - The one-time sample promo uses the same load block as `sampleLeads`.
- History:
  - `HISTORY_KINDS.promo = 'Promos'`.
  - `promoEntry(before, after, now)`: created or edited, with rows for name, dates, prizes and the DTI permit.
  - `promoDeletedEntry(p, now)`.
  - `redeemEntry(claim, stockNo, now)`: action `'Voucher redeemed'`, rows for voucher, prize and car.
  - `eventEntry(before, after, cars, now, promos = [])` adds a `Promo` row (the name, or `—`) when `promoId` changes.

**Steps:**
- [ ] Write the tests:
  - **Seed:** a new demo comes with the sample promo attached and live.
  - **Old demos:** an old demo gets the sample promo once. It isn't attached when the Christmas Sale was deleted or already has a promo.
  - **Repair:** `normalizeData` repairs `promos` and `claims` that aren't arrays.
  - **History:** the promo history rows; "Voucher redeemed"; the event row "Promo: — → Christmas Spin".
- [ ] Run them and watch them fail. Implement, then run again and watch them pass.

### Task 3: Admin Promos page and promo form

**Files:**
- Create: `admin/Promos.jsx` and `admin/PromoForm.jsx`.
- Modify: `admin/Admin.jsx`, `admin/EventsAdmin.jsx`, `showroomRules.js` (`canManagePromos`), `showroomRules.test.js` and `admin/Admin.module.css`.

**Interfaces:**
- `canManagePromos(role) = role === 'superadmin'`.
- `PAGES` gets `{ id: 'promos', label: 'Promos', Icon: Gift, noTab: true }` after Events.
  - Both roles can open it.
  - On phones it is reached from a "Promos" link in the Events page header.
- Routes:
  - `/showroom/admin/promos` shows the list.
  - `/promos/new` and `/promos/:id` show the form, superadmin only; anyone else gets `SuperadminOnly`.

**Steps:**
- [ ] Write the test "only the superadmin manages promos; both roles open the Promos page". Run it and watch it fail, then implement `canManagePromos` and run it again.
- [ ] Build the Promos page:
  - **Each promo:** its status (Upcoming, Live or Ended), dates, the event it's on, its promo code with **Copy**, its prizes with %, and its winners count.
  - **Superadmin buttons:** New promo, Edit and Delete (Delete asks to confirm in a Sheet).
  - **Voucher lookup:** type a code to see the claim. **Mark redeemed** asks for the car's stock no. (optional).
  - **Winners table:** for each promo, the name, email (`mailto:`), prize, voucher, date won and status.
- [ ] Build the PromoForm:
  - the name, start and end (datetime-local, the same helpers as EventForm), and the DTI permit no.;
  - a prize row editor (label plus %) with add and remove, keeping 2 to 8 rows;
  - a running total with "Must add up to 100%";
  - `validatePromo` errors.
  - A new promo gets `code = newCode('SPIN', existing codes)`.
- [ ] Run the tests and `npx vite build`. Expected: PASS, and the build is clean.

### Task 4: Attaching a promo to an event

**Files:**
- Modify: `admin/EventForm.jsx` (it now gets a `role` prop from Admin.jsx) and `admin/Admin.jsx`.

**Steps:**
- [ ] **Superadmin:**
  - The "Promo" fieldset has a code input with an **Add** button, checked by `findPromoByCode`.
  - The errors are "No promo has that code" and "That promo has ended".
  - Once attached, it shows the name, dates and a **Remove** button.
  - It saves `promoId` on the event, and the history row comes from Task 2.
- [ ] **Admin:** a read-only line showing the attached promo's name.
- [ ] The event can be live or upcoming. For an ended event, the field is disabled with "This event has ended."
- [ ] Run the tests and the build. Expected: PASS, and the build is clean.

### Task 5: Buyer pop-up and wheel

**Files:**
- Create: `public/PromoPopup.jsx`.
- Modify: `Showroom360.jsx` (mount it in `PublicShell`), `i18n.js` (`promo.*` EN and CEB) and `Showroom360.module.css`.

**Interfaces:**
- Browser storage keys:
  - sessionStorage `showroom360:promoSeen:<promoId>`;
  - localStorage `showroom360:spin:<promoId>` = `{ prizeId, at }`;
  - localStorage `showroom360:claim:<promoId>` = `{ voucher }`.
- The pop-up opens when `activePromo(...)` is set, nothing has been seen in this session, and there's no saved claim. Opening sets the seen flag.

**Steps:**
- [ ] **The wheel:** an SVG with N slices, alternating `--red` and `--ink` with `--paper` labels. A pointer sits at the top.
  - **Spin** picks the prize with `pickPrize`, saves the spin, then rotates 5 turns plus the slice's angle over 4 s.
  - With reduced motion, it jumps straight to the result.
- [ ] **The claim form:** name and email (checked with `isEmail`, plus a `claimFor` duplicate check).
  - It saves `{ id, promoId, eventId, prizeId, prizeLabel, name, email, voucher, claimedAt, redeemedAt: null, stockNo: '' }` with a voucher from `newCode(voucherPrefix(shop), all vouchers)`.
  - It then shows the voucher card: the code with **Copy**, the prize, "Valid until {date}" and "Show this code when you buy."
- [ ] **No thanks** closes it for this visit. A saved spin without a claim reopens next visit at "You won X. Claim it".
- [ ] **Small print:** "DTI Fair Trade Permit No. {n}" or "Sample promo for this demo.", plus "One spin per person. See the Terms." with a link.
- [ ] Run the tests and the build. Expected: PASS (including the EN/CEB key parity test), and the build is clean.

### Task 6: Legal text

**Files:**
- Modify: `legalText.js` and `showroomRules.test.js`.

**Steps:**
- [ ] Write the tests:
  - The privacy policy names "email" and "promo".
  - The terms have a "Promos" section mentioning "DTI", "30 days" and "one spin".
  - The existing blank-contact test still passes.
- [ ] Run them and watch them fail. Implement, then run again and watch them pass.

### Task 7: Browser check and docs

- [ ] Run headless Chrome at 390 and 360 px, and at 1280, in light and dark:
  - **Fresh demo:** the pop-up shows once; reloading in the same tab doesn't show it again; a new tab does.
  - **Spin:** spin, close and reopen, and get "Claim it".
  - **Claim:** the voucher shows. Claiming again with the same email is refused.
  - **Admin:** sees the winner, can't open New promo, and can redeem.
  - **Superadmin:** creates a promo (with a check that the % add up to 100), attaches it to the event by code, and History shows it.
  - Nothing scrolls sideways at 360 px.
- [ ] Run the full test command and `npx vite build`.
- [ ] Add "Built" notes to the spec and a line to the memory.
