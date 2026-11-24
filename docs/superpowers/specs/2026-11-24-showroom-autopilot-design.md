# Showroom 360 Autopilot: design

Date: 2026-11-24. Extends [2026-11-23-showroom-360-design.md](2026-11-23-showroom-360-design.md).

## Why

Cebu dealers who sell on Facebook lose buyers to slow or forgotten replies, and to cars that sit on the lot too long. Clark wants the pitch to show a site that does the remembering for them. He picked four features (2026-11-24), to be built without a server:

1. Waitlist: buyers wait for a car that isn't in stock yet.
2. Lead follow-up autopilot.
3. Price-drop rules for slow-selling cars.
4. Weekly owner report.

## Goals

- Opening the admin shows what to do today, worked out from the data, with nothing to set up first.
- Every task has one tap that does it: the message to the buyer is already written.
- A fresh or reset demo shows every automation working, including a chain where a price drop lets a waiting buyer's search match.

## Non-goals

- Sending anything by itself. There's no server, so the admin taps Send. On a phone, Viber or Messages opens with the text already typed.
- Facebook Messenger messages to a buyer. A buyer on the site leaves a mobile number, not a Messenger ID.
- Trade-in estimates (Clark left out #5).

## Anti-goals (a failure even if it works)

- A to-do list so long that the dealer ignores it. Show only things that need doing now, with the most urgent first.
- Changing a price without the dealer tapping to confirm.
- A "was" price that never was the real price.
- Demo leads that look like real people. Use first names with an initial, and 0900 numbers.

## Constraints

- No new npm dependencies, and no IndexedDB version bump. New data rides on the existing `leads`, `cars` and `settings` records, and `normalizeData` fills in the defaults.
- The rules are pure functions in a new `autoRules.js` with `node --test` tests. They don't touch the browser.
- Phones first: check at 360–390 px. Look v3 tokens only, and it must work in dark mode.
- New public strings need EN and CEB. Claude writes the CEB and Clark proofreads it.
- PIN digits never appear in History.

## Approaches

- **A. One "To do" list at the top of the dashboard, fed by all four automations (picked).** Each lead card on the Leads page also shows its own task and send buttons. The dealer has one place to look, and it's the strongest thing to show in a pitch.
- B. Each automation on its own page (task chips on Leads, a price-drop tab under Cars, a separate Report page). This adds pages without adding anything useful, and nothing pulls it together into one view.
- Storing waitlist requests: **as a new kind of lead (`type: 'wish'`) (picked)**, not as a separate store. A separate store would need a database upgrade. As leads, they get the inbox, statuses, the new-leads badge and history for free.

## 1. Waitlist

- **Public, Cars page:** the "no cars match" empty state gets a **"Tell me when one arrives"** button. When filters are on, a quiet line under the results offers the same thing.
- **The form** opens in a Sheet:
  - It shows the search being saved in words, e.g. "SUV · up to ₱900,000".
  - Fields: name, mobile and an optional note. The same checks as test-drive leads apply.
  - On submit it saves a lead `{ type: 'wish', query, carLabel: <the search in words>, lang, status: 'new' }`.
  - The thank-you text says the shop will message them when one arrives.
- **Matching:** a request matches a car when the car is **available** (not reserved or sold) and passes `filterCars` with the saved search, using the car's current price (sale price included). The match is worked out live, so it covers new cars, edited cars and price drops alike.
- **Telling the buyer:** each request keeps `notifiedCarIds`. A matching car not yet on that list becomes a to-do: "Ramon T. is waiting for a car like this: Montero Sport 2017". Sending adds the car to the list.
- **Admin, after saving a car that matches:** a toast says "2 buyers are waiting for a car like this", with a link to the dashboard. The car's edit page shows the same note.
- **Leads page:** a third type tab, "Waitlist". The card shows the search and its current matches.

## 2. Lead follow-up autopilot

**New fields on a lead:**
- `contactedAt`: when it first left New.
- `lastContactAt`: the last message sent from a task.
- `reminderSentAt`.
- `lang`: the public site's language when the request was sent.

Old leads fall back to `createdAt`.

**Tasks, most urgent first:**

| Task | When | Message |
|---|---|---|
| Reply now | Any type, still New, more than 1 hour old. Shows how long they've waited and turns red | Thanks, confirms the request |
| Send reminder | Test drive, Contacted, date is today or tomorrow, no reminder sent yet | Date, morning or afternoon, shop address, "bring your licence" |
| Waiting buyer | Waitlist request not Closed, with a new match (see 1) | The car, its price and a link |
| Price dropped | Test-drive or reservation lead, not Closed, whose car dropped in price after the last contact | Old and new price, and a link |
| Follow up | Test drive or reservation, Contacted, last contact 3+ days ago, and the test drive date isn't still ahead. After a test drive the message asks how it went | A friendly check-in |
| Drop price? | See 3 | — |

**Sending:**
- Each buyer task has **Viber** (opens the chat with the text written), **Text** (SMS with the text) and **Copy**.
- Tapping any of them records the contact. A New lead also moves to Contacted, so the change is logged in History as today.
- A reminder sets `reminderSentAt`.
- Messages are written in the language the buyer used (EN or CEB), and their link opens the car page on this site.

**Where tasks show:**
- On the dashboard, a "To do" block at the top for both roles.
- On the Leads page, each card shows its task and send buttons.

When there are no tasks, the block says "All caught up."

## 3. Price-drop rules

- **The rule** is set in Settings, so only the superadmin can change it:
  - `priceRule: { on: true, days: 45, pct: 3 }`.
  - Plain controls: "After [45] days in stock, suggest [3]% off".
  - Changes are logged in History.
- **Which cars get a suggestion:** a car is due when all of these are true:
  - it's available;
  - it isn't in a live or upcoming event;
  - it has been `days` days since it was listed, last dropped or last skipped (whichever is latest).
- **The suggested price:** the price minus `pct`, rounded **down** to the nearest ₱1,000. Example: ₱925,000 → ₱897,000.
- **On the to-do list:** "Drop to ₱897,000?" with **Apply** and **Skip**.
  - Both the admin and the superadmin can do this, since the admin already edits prices.
  - Apply sets `price` and `priceDrop: { from, at }`, and History logs it as "Price dropped".
  - Skip sets `priceDropSkippedAt` and isn't logged.
  - Nothing changes until someone taps Apply.
- **On the public site, for 14 days after a drop:**
  - the card and car page show the old price crossed out with a "Price dropped" tag;
  - the Facebook caption starts with "PRICE DROP" and gives the old price.

  A live event's sale price still takes priority.
- **Old "Aging stock" block:** the dashboard's 60+ days list goes away while the rule is on, because "Drop price?" replaces it. With the rule off, the list comes back as before.
- **Knock-on effects:** after a drop, buyers who asked about that car get a "Price dropped" task, and any waitlist request that now matches gets a "Waiting buyer" task.

## 4. Weekly owner report

- A **Week report** block on the dashboard, **superadmin only** (it shows sales).
- It has two options: **Last week** (the default) and **This week so far**. Weeks run Monday to Sunday, local time.
- It lists:
  - **New requests:** by type (test drives, reservations, waitlist).
  - **Reply speed:** the average first reply time, and how many buyers waited more than 1 hour.
  - **Sales:** cars sold, their total value, and the average days to sell.
  - **Stock changes:** cars added and price drops.
  - **Most asked about:** the car with the most requests that week.
  - **Slowest:** the car longest in stock.
- **Copy** and **Share on Viber** (`viber://forward`) send it as plain text, ready for the owner's chat.

## Sample data (for the demo)

- **New or reset demos** get these sample buyers, with times counted back from now:
  - Mark D.: test drive, Fortuner, New, 3 hrs ago. Gives a red **Reply now**.
  - Joy R.: test drive, City, Contacted yesterday, booked tomorrow afternoon. Gives **Send reminder**.
  - Liza C.: reservation, Xpander GLS, Contacted 4 days ago. Gives **Follow up**.
  - Ramon T.: waitlist, SUV up to ₱900,000, Contacted. Nothing matches yet. Once the Montero Sport (72 days in stock) drops to ₱897,000, it matches and gives **Waiting buyer**.
  - Ana P.: waitlist, Toyota MPV up to ₱900,000, Contacted. Nothing matches, so Clark can add a car live during a pitch and watch "1 buyer is waiting" appear.
  - Ben S.: test drive, Civic (sold), Closed, last week. Gives the week report something to count.
- **Saved demos** get the sample buyers once, the same way the sample photos were added (`settings.sampleLeads` marker). A sample buyer whose car was deleted or changed to another model is skipped.

## Left to the builder

- Exact wording and layout, in the Look v3 style.
- How the SMS link is formatted on each phone.
- The order of the report lines.

Claude's calls, for Clark to check: the 1-hour, 3-day, 45-day, 3% and 14-day numbers; that wishes reach only available cars; that the Week report is superadmin only; that old demos get the sample buyers.

## Testing

`autoRules.test.js` checks each task rule at its edges, for example 59 vs 61 minutes and day 44 vs 45. It also covers:
- the rounding;
- skipping cars in an event;
- wish matching after a price drop;
- the week's date range across midnight in Cebu;
- message text with a blank shop address;
- the sample buyers skipping deleted cars.

Then a headless Chrome pass at 360/390 px and 1280 px, in light and dark, for both roles.

## Built (2026-11-24)

All four features shipped as designed, plus Clark's photo-zoom request. Code: `autoRules.js` (rules, tested in `autoRules.test.js`), `admin/TaskList.jsx`, `admin/WeekReport.jsx`, `public/PhotoViewer.jsx`. Claude's calls made while building:

- One task per buyer: a waitlist match or a price drop replaces a plain "Reply now" for that buyer, because its message also serves as the first reply.
- A waitlist task lists up to 3 new matching cars in one message, so a broad search doesn't flood the list.
- A test drive's follow-up comes the day after the drive; the 3-day rule applies to reservations.
- Changing a lead's status by hand also records when the buyer was first contacted, so the week report's reply time stays right.
- The waitlist form saves the search without the sort order. The sample Privacy Policy now lists what the waitlist collects.
- Photo zoom: tap the main photo on a car page. Pinch, double-tap, the scroll wheel or the +/− buttons zoom up to 4x, dragging pans, and swipe or the arrow keys change photo. The phone's Back button closes it. Cars with no photos (drawings) don't open it.
- Where buyers join the waitlist (added after Clark couldn't find it): a line under the results on the Cars page (always), an empty-search button, a "Can't find your car?" section at the end of the home page, and "Tell me when a similar one arrives" on sold and reserved car pages (same make and body, up to 10% above its price). The form has its own body type, brand, keyword and budget fields, filled from wherever the buyer came from.
