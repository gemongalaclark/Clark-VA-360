# Showroom 360 Promos (prize wheel): design

Date: 2026-11-24. Extends [2026-11-23-showroom-360-design.md](2026-11-23-showroom-360-design.md). Status: approved and built 2026-11-24.

## What Clark asked for (2026-11-24)

- **Creating promos:** a new admin page for promos. Only the superadmin creates them.
- **The wheel:** a promo is a spinning prize wheel, with prizes such as ₱5,000 off, a full tank, ₱10,000 off or freebies.
- **Odds and dates:** the superadmin sets the odds for each prize, and how long the promo runs.
- **Claiming:** a buyer claims a prize with their name and email. Each claim gets a random unique voucher code that is redeemable when buying a unit.
- **Linking to an event:** each promo also gets a random promo code. The superadmin types it on an active event's page to add the promo to that event. Only the superadmin can do this.
- **The pop-up:** while a promo is on an active event, buyers see it like an ad when they first land on the site, once per visit and not on every page. They can choose to claim it or not.

## Constraints

- **No server.**
  - Nothing is emailed; the voucher shows on screen for the buyer to screenshot or copy.
  - Claims reach the admin only in the same browser, the same as leads in this demo.
- **One spin per person**, enforced per browser and per email address.
- **No new npm dependencies, and no IndexedDB version bump.** A version bump fails when another tab of the site is open: that tab falls back to unsaved memory. So promos and claims are kept as two lists under the existing `kv` store (`promos`, `claims`).
- **Look v3, phones first, dark mode tokens.** The wheel is SVG plus CSS. With reduced motion, the result shows without the spin.
- **Philippine law.** A sales promotion with a game of chance needs a DTI permit (Consumer Act, RA 7394). Each promo therefore has a "DTI permit no." field that shows in the pop-up's small print. While it's blank, the pop-up says "Sample promo for this demo."

## Approaches

- **A. Promos and claims as lists in `kv`, with claims shown on the Promos page (picked).** There's no database upgrade, and winners stay next to their promo, with redeeming done in the same place.
- **B. New IndexedDB stores.** This needs a version bump (see Constraints).
- **C. Claims as leads in the Leads inbox.** Rejected, because claims have an email instead of a mobile number, so the Viber and Text buttons wouldn't work. The Promos page links to them instead.

## Admin: Promos page

**The superadmin creates and edits a promo with these fields:**
- name, e.g. "Christmas Spin";
- start and end date and time;
- DTI permit no. (optional);
- 2 to 8 prizes, each a label plus a chance in %. The chances must add up to 100%, and the form shows the running total.

Saving a new promo generates its **promo code**, e.g. `SPIN-7KQ2`, with a Copy button.

**Who can do what:**
- The admin sees the promos and their winners but can't create, edit, delete or attach them.
- Both roles can **look up a voucher code and mark it redeemed**, recording the stock no. of the car bought. Staff at the counter handle sales, so that's Claude's call.

**The winners list** shows the name, email, prize, voucher code, date won, and status (Unused, Redeemed or Expired). Email has a `mailto:` link.

**Where it sits:**
- On desktop, Promos goes in the sidebar under Events.
- On phones it is reached from a "Promos" link at the top of the Events page, because the superadmin already has 5 bottom tabs.

**History logs:** promo created, edited or deleted; promo added to or removed from an event; voucher redeemed. A buyer's spin or claim is not logged, the same as buyer requests.

## Admin: adding a promo to an event

- The superadmin's event form gets a "Promo code" field. Typing a valid code attaches that promo, and the form shows the promo's name and dates.
- Allowed for events that are live or upcoming. The pop-up only runs while both the event and the promo are live.
- One promo per event.
- The admin sees which promo is attached, read-only.

## Buyers: the pop-up

- **When it shows:** on the first public page of a visit (sessionStorage), when a live event has a live promo attached.
- **When it doesn't:** never on admin pages, and never again in that visit after it's closed. Not at all if this browser has already claimed this promo.
- **What it shows:** the event name, the wheel with its prizes, a **Spin** button, a **No thanks** button, and the small print (DTI permit or the sample note, plus "One spin per person. See the Terms.").
- **The spin:**
  - The prize is picked by the superadmin's odds before the wheel turns.
  - The wheel spins about 4 s and lands on it.
  - The result is saved in this browser right away, so closing the pop-up and coming back can't give a second spin. On a later visit the pop-up offers "You won X. Claim it" instead.
- **Claiming:**
  - The buyer enters their name and email.
  - The same email can't claim the same promo twice.
  - They then get the **voucher code** (e.g. `DM-4F7K-9QXH`, unique across all claims), the prize, the expiry date, a Copy button and a "show this when you buy" note.
- **Language:** EN and CEB, with the CEB for Clark to proofread.

## Rules (pure functions, `promoRules.js`, with tests)

- `pickPrize(prizes, rand)`: picks by the chance percentages. Tested with a fixed `rand` at the edges, e.g. 0 and 0.9999.
- `newCode(prefix, taken, rand)`: random code from letters and digits that can't be misread (no 0/O, 1/I/L). It tries again if the code is already taken.
- `validatePromo(promo)`:
  - a name;
  - the end after the start;
  - 2 to 8 prizes, each with a label and a chance above 0;
  - chances adding up to 100.
- `activePromo(events, promos, now)`: the promo to show buyers now, or null.
- `voucherStatus(claim, now)` gives unused, redeemed or expired. `claimFor(promo, email, claims)` finds a duplicate email.

## Claude's calls, for Clark to check

- Vouchers are valid for 30 days from the day they're won.
- Every slice is a prize (there's no "try again" slice).
- The admin can redeem vouchers.
- A promo can be attached to an upcoming event, not only a live one.
- A sample "Christmas Spin" promo (₱5,000 off 40%, full tank 30%, freebies 25%, ₱10,000 off 5%) comes attached to the sample Christmas Sale, so a fresh demo shows the pop-up. Saved demos get it once, using the marker pattern.
- The sample Privacy Policy adds the promo's name, email and prize. The sample Terms get a "Promos" section: one spin per person, vouchers valid 30 days, one voucher per car bought, no cash value, and subject to the DTI permit.

## Not in this version

- Prize quantities, e.g. "only 3 full tanks". Odds limit the cost on average, not exactly.
- Sending the voucher by email; that needs a server.

## Built (2026-11-24)

Code: `promoRules.js` (tested in `promoRules.test.js`), `admin/Promos.jsx`, `admin/PromoForm.jsx`, `public/PromoPopup.jsx`, `public/Wheel.jsx`; the event form's "Promo wheel" section; History kind "Promos". Claude's calls made while building:

- Each slice is as big as its chance, so buyers can see the real odds (a 5% prize is a thin slice). The odds are also listed under "Prizes and chances".
- Labels shrink to fit the whole prize name; labels on the left half turn so none reads upside down. Short prize names read best on a phone.
- The pop-up opens about a second after landing, and waits if another dialog (the reserved-car notice) is open.
- The promo form shows a live preview of the wheel and a running total of the chances.
- A voucher code starts with the shop's initials (Demo Motors Cebu: `DM-XXXX-XXXX`).
