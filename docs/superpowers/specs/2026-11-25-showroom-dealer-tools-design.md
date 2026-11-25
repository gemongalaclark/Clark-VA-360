# Showroom 360: dealer tools (2026-11-25)

## Why
Clark asked Claude to think as a Cebu used-car dealer: what problems cost a dealer time or money, how the site could help, and what to build. Claude listed ten problems and a build order; Clark said "Build all".

## Scope
Everything that works in the demo as it is (data in the browser):
1. Reservation end date and reservation terms
2. Inspection report per car
3. HPG clearance date (a paper badge)
4. Photo watermark on uploaded photos
5. Verified dealer details (DTI, Mayor's permit, years in business)
6. Consignment tracking
7. Agent ("ahente") links and commissions
8. After-sale paperwork tracker and registration renewal reminders
9. "What can I afford?" (pre-qualification) and budget on requests
10. Release photos and buyer reviews on Recently sold
11. Compare saved cars

**Not in scope (needs the site to go live, Clark to decide):** a shared database and lead alerts, views per car, loan document uploads (Data Privacy Act), online reservation fee payment, buyer-facing status pages.

## Constraints
- No new packages; no IndexedDB version bump (new lists go in the `kv` store, like promos).
- Public wording in English and Bisaya (Claude's Bisaya; Clark to proofread); admin stays English.
- Look v4: tokens only, red only for sales and alerts; phones first (320–390 px).
- Sample data stays fictional; anything that could read as a real record is marked as a sample.
- Old saved demos get the new sample data once (`settings.sampleTools` marker), like sample photos.

## Design (Claude's calls)

### 1. Reservations
- Settings → Reservations: fee (default ₱5,000), days held (default 7), refund rule: refundable / refundable if the bank loan is denied (default) / non-refundable.
- Car field `reservedUntil` (YYYY-MM-DD). Setting a car to Reserved (car form or the cars list) fills it with today + days held; the car form shows it to edit.
- When the date has passed, the car goes back to Available by itself on the next load (`expireReservations`), logged in History "by the autopilot".
- To-do `reserveEnds` from 2 days before: "Reservation ends Thu" with "Extend N days" and "Open car".
- Public: the Reserve form and the FAQ answer state the terms; a reserved car's note says until when.

### 2. Inspection report
- 20 checks in 5 groups (engine and transmission, underside, body, interior, flood check), each Passed / Needs work (with a note) / not checked. Car field `inspection: { date, by, results: { id: 'pass' | 'fix' }, notes: { id: text } }`.
- Car form: an "Inspection report" section. Car page: a panel after Condition with "18 of 20 checks passed · date · by", the groups, and notes on what needs work. Nothing shows until a date and one result are set.

### 3. HPG clearance
- Car field `hpgCleared` (date). Car form → Papers. Condition card row "HPG clearance": "Done, Nov 18, 2026" or "Not stated".

### 4. Watermark
- Settings → "Watermark new car photos" (on by default): shop name and phone drawn bottom-right on photos added in the car form (not the logo, not the bundled sample photos, which are other people's free-licence photos).

### 5. Verified dealer
- Settings: DTI business name no., Mayor's permit no., in business since (year). Public About section: a "Registered business" list, each line only when filled. Sample values are placeholder zeros.

### 6. Consignment
- Car field `consign: { owner, mobile, net, paidAt }`. Car form: "Consigned (owned by someone else)" with the owner, mobile, agreed net to the owner, and the dealer's margin shown. Cars list: a "Consigned" chip. Sold and not paid: to-do `payout` "Pay {owner} ₱{net}" with "Mark paid". Never shown to buyers.

### 7. Agents
- Superadmin page "Agents": name, mobile, code, commission per sale (₱). Each agent's link is `/showroom?ref=<code>`; copy button. Stats: leads, cars sold, commission owed and paid.
- A visitor arriving with `?ref=` keeps the code for 30 days in their browser (`showroom360:ref`); their requests carry `agentCode`. Leads show "via {agent}".
- Selling a car: "Sold through agent" (defaults to the agent on the latest request for that car) and the commission (defaults to the agent's rate). To-do `commission` until marked paid.
- Stored as the kv list `agents`.

### 8. After-sale and renewals
- Car field `sale: { buyer, mobile, lang, agentId, commission, commissionPaidAt, steps: { deed, hpg, lto, released }, told: { step: iso }, renewToldFor, review }`.
- Car form, when Sold: buyer (filled from the latest request for that car), mobile, language, the four paper steps with dates.
- To-do `papers` when a step has a date the buyer hasn't been told about: a Viber/text message in the buyer's language. To-do `renew` from 30 days before the registration month: a renewal reminder (once per registration date).

### 9. What can I afford?
- `affordablePrice({ income, cash }, financing)`: monthly budget is 30% of take-home pay at the longest term; the cash covers the all-in downpayment (minimum down plus fees). Rounded down to ₱10,000.
- Cars page: a fold-out "What can I afford?" (income, cash) with "Show cars up to ₱X". Test drive and reserve forms: optional income and cash; the lead stores `budget: { income, cash, max }` and admin shows "Can afford up to ₱X" (or "Below this car's price").

### 10. Reviews
- Car `sale.review: { quote, name, photoId, consent, sample }`; shown on Recently sold only with consent. Car form: release photo, the buyer's words, name to show, a consent checkbox. One sample review on a sample car, labelled "Sample review".

### 11. Compare
- `/showroom/compare`: the saved cars (up to 4), side by side: price, monthly, year, km, transmission, fuel, engine, seats, body, condition, OR/CR, inspection summary. Opened from the saved-cars view ("Compare") when 2 or more are saved. Each column can be removed (unsaves). Phones scroll sideways with the labels pinned.

## Testing
- Rules (node:test): reservations, inspection summary, watermark label, consignment and commission tasks, ref codes, paper and renewal tasks and messages, affordable price, compare route.
- Harness: each feature driven like a dealer or buyer, plus the full overflow sweep (320–1440, light, dark, Bisaya).

## Calls made while building
- Agents is superadmin-only (it's about money). Phones reach it from a link at the top of Settings, since the bottom tabs stay at five.
- Release photos count as in use, so the cleanup of unsaved photos never deletes them (a test covers it). A replaced release photo is deleted on save.
- A reservation that ends by itself is logged in History "by the autopilot".
- Marking a car Reserved from the cars list also fills in the end date.
- A paper-step message covers the earlier steps too, so the buyer gets one message, not one per step.
- Messages sent to a buyer don't show in History (they're not edits); payments do ("Owner paid", "Commission paid").
- Owed commission shows in red on the Agents page (money due counts as an alert).
- The inspection report lists all 20 checks on the car page; checks nobody did say "Not checked".
- Compare uses the saved cars (up to 4); removing a column un-saves the car.
