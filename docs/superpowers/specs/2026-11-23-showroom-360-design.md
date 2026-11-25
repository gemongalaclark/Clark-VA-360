# Showroom 360: design

**For:** Clark, to pitch to second-hand car dealers in Cebu who have no website yet. The dealer should see their own shop running as a finished site, both the buyer side and the admin side, on Clark's screen.
**Lives at:** `clarkva360.site/showroom` (public) and `/showroom/admin` (hidden), inside the portfolio. One more card in the **Cars** group on /projects.

## Why
Most Cebu dealers sell through Facebook posts and walk-ins. A working demo that shows their cars, their phone number and their map pin is far more persuasive than a slide deck. It also has to beat what bigger dealer sites (e.g. goldacescars.ph) offer, using features built for how Cebu buyers actually shop: downpayment and monthly first, Messenger first, and worried about flood cars after Typhoon Tino (Nov 2025).

**What goldacescars.ph (a Cebu dealer with branches in Talisay and Mandaue) has, read 2026-11-23:** a featured/newest row, browsing by body type and make, a lowest-price row, a separate "Car Loan Calculator" page, branches, reviews, a sell/trade-in form, FAQs and phone numbers only.

**What it lacks:** a per-car condition report, Messenger/Viber inquiry, test-drive booking, reservation, Cebuano and a recently-sold section. Its car pages weren't readable because the site rate-limited the request. So our monthly payment is set apart by living *on every car and card*, not by existing at all.

## Goals
- The public site works on a phone: rotating featured cars (including event-sale cars), shop details and location, and a full inventory with search, filters and car pages.
- A hidden admin where a dealer adds, edits and sells cars, runs time-boxed sale events, reads leads and rebrands the whole site.
- The 8 differentiators below, all included (Clark, 2026-11-23).
- Clark's brand: red #cb2525, Poppins and Inter. Cool but minimal.

## Non-goals
Real logins, data shared across devices, online payments or reservation fees, SEO, multiple branches, a car comparison tool (CarMark 360 already does that), trade-in or "sell your car" forms, pasalo or assume-balance listings, per-car links that work on other devices.

## Anti-goals (a failure even if it works)
- It looks like a template or wireframe in front of a dealer.
- A button does nothing, or errors, mid-pitch.
- A real business, person or phone number appears in the sample data.
- The site claims something the dealer never said. "Not stated" must never show as "No". This is the same lesson as CarMark's Avanza.
- Saved data disappears without warning. Reset always asks first.

## Constraints
- No new npm packages. Use React 18, CSS modules, lucide-react and browser APIs (IndexedDB, canvas, BroadcastChannel, clipboard).
- Follow the CarMark pattern: `FRONTEND/src/components/SHOWROOM 360/`, lazy-loaded from `App.jsx` `PROJECT_APPS`, pushState navigation, `onBackToPortfolio` prop.
- No backend and no Supabase.
- Commit only when Clark asks.

## Approaches
- **Storage A, data saved in this browser (chosen by Clark).** Every visitor gets their own copy seeded with sample cars, so a prospect can play in admin without breaking anyone else's demo. Cost: a car added on one device doesn't show on another.
- Storage B, shared Supabase tables. Rejected: every portfolio visitor would edit one inventory, so it would need real auth, storage buckets and an auto-reset. Roughly double the work for a pitch that happens on one screen.
- **Inside the portfolio as a lazy-loaded app (Claude's call).** This is how every other project works, needs no new tooling and goes live on push. A separate Vite app per dealer, or a static HTML template, would duplicate tooling, and a static template can't hold admin state.
- **IndexedDB over localStorage (Claude's call).** localStorage caps at about 5 MB of strings, and a few car photos fill it. IndexedDB stores image blobs natively.

## Public site
Top bar: shop logo and name, links (Home, Cars, Contact) and an EN/CEB switch. A small "Clark VA 360" back control sits in the footer, as in CarMark. Mobile first.

1. **Home `/showroom`**
   - **Featured carousel.** A dark band with large photos, title, price (sale price with the original crossed out) and a "See all cars" button. When an event is live, its name and countdown sit above the slides ("Christmas Sale · ends in 5 days").
   - **About the shop:** tagline, short story, phone, hours, address, a small map and an "Open in Google Maps" button.
   - **Recently sold:** a row of the last 6 sold cars (photo, title, "Sold Nov 2026").
2. **Cars `/showroom/cars`**
   - Search box covering make, model, variant, year, color and stock no.
   - Filters: make, body type, transmission, fuel, price, year min/max, "On sale". On phones they sit in a bottom sheet.
   - Price (Clark, 2026-11-23): two boxes to type an amount plus a two-handle slider. The range runs from the cheapest to the dearest car on sale (sale prices count), so neither end can go past the stock; an end left at its bound means "no limit".
   - Sort: newest listed, price ↑/↓, lowest km, newest year.
   - Filter state lives in the URL query (deep-linkable, and Back works).
   - The page shows a result count, plus an empty state with "Clear filters".
   - Sold cars are hidden from this page.
3. **Car page `/showroom/cars/<id>`**
   - Photo gallery (swipe and thumbnails).
   - Price block.
   - Key facts row: year, km, transmission, fuel.
   - **Condition & papers card.**
   - Specs table and the dealer's description.
   - **Monthly payment calculator.**
   - **Inquiry bar**, sticky on phones: Messenger, Viber, Call.
   - "Book a test drive" and "Reserve this car" buttons, which open short forms.
   - A sold car still opens, with a "Sold" banner and no inquiry or forms.

**Featured slides:** live-event cars that are still available come first, then cars flagged Featured, with duplicates removed. Maximum 8. If none qualify, show the 5 newest available cars.

**Carousel behaviour** (ui-ux-pro-max, Auto-Rotating Content Controls):
- Auto-advances every 4 s (Clark asked for a bit faster than the first 5 s).
- Pauses on hover, on focus and on touch.
- Previous/next, one progress segment per car, and swipe on touch. Clark asked to drop the pause button; the hold on hover, focus and touch plus reduced motion stand in for it.
- No auto-advance under `prefers-reduced-motion`.

## Admin `/showroom/admin`
Not linked from anywhere public.
- **PIN gate.** The demo PIN defaults to `0360` and can be changed in Settings. Unlocking lasts until the tab closes (sessionStorage).
- **Honest framing:** this is a demo lock, not security, because the code ships to every visitor. A real dealer version needs real logins. Neither the public docs nor the project card mention /admin.
- **Layout:** sidebar on desktop, bottom bar on phones.

1. **Dashboard:** available, reserved and sold this month; average days in stock; new leads; the live event with its countdown.
2. **Cars**
   - The list shows photo, title, price, status, Featured toggle, **days in stock** (60 or more is flagged "Aging"), and Edit / "Copy Facebook post" / Delete.
   - Add/Edit is one form in sections (fields below) with inline validation.
   - Make and model fields suggest names from CarMark's `MODELS` but accept anything.
3. **Events**
   - Create, edit or delete. An event has a name, tagline, start and end (date and time), and cars with a sale price each.
   - The sale price must be lower than the cash price.
   - A car can't be in two events whose dates overlap.
   - Status is computed: Upcoming, Live or Ended.
   - Only Live events appear on the public side.
4. **Leads:** the inbox for test-drive and reservation requests.
   - Filter by type and status (New / Contacted / Closed). Tap to call.
   - A new-lead count shows on the nav.
   - A reservation request does not change the car's status; the dealer does that.
5. **Settings (pitch mode)**
   - Shop name, logo upload, tagline, about text, phone, Messenger page username, Viber number, address, Google Maps link and/or coordinates, and hours. Changing these rebrands the public site immediately.
   - Financing: minimum downpayment %, the **total add-on %** for each term (12/24/36/48/60 months; this is how PH banks quote it), and the estimated all-in fees %.
   - Change PIN.
   - **Reset demo data**, with confirmation: reseeds everything.

When admin and the public site are open in two tabs, changes appear in the other tab without a refresh (BroadcastChannel).

## Admin History (added 2026-11-23)
Clark's ask: a page that lists every change the admin makes (editing a car, settings, events, marking a car sold) with the time. Clark picked field-by-field detail, History in the phone top bar plus a Dashboard box, and "build straight away".
- **Logged:**
  - Car added, edited or deleted. Status and Featured changes made from the Cars list count, and so do photos.
  - Event created, edited or deleted.
  - Settings saved.
  - A lead's status changed by the admin.
  - Demo data reset.
- **Not logged:**
  - New requests from buyers (they're under Leads).
  - Saves that change nothing.
  - Photo clean-up done in the background.
- **Each entry:**
  - The time, the kind (car, event, settings, lead, demo), the action and the item's name.
  - The changed fields as "old → new".
  - Long text (description, known issues, about) only says it changed.
  - The PIN only ever says "changed", never the digits.
  - Photos say how many were added or removed, a new cover, or reordered.
  - An event lists cars added, cars removed and sale-price changes.
  - A deleted car notes which events it was taken out of.
- **Stored:** in the same browser storage as everything else, written in the same step as the change it describes. The newest 500 are kept. "Reset demo data" clears it and leaves a single "Demo data reset" entry.
- **Page:**
  - `/showroom/admin/history`, newest first, grouped by day (Today, Yesterday, then the date).
  - Filter tabs for All, Cars, Events, Settings and Leads, with 50 entries at a time and "Show more".
  - An entry links to its car or event while that still exists.
- **Navigation:**
  - Desktop: in the sidebar between Leads and Settings.
  - Phones: a clock icon in the top bar, because the bottom bar keeps its 5 tabs.
  - Dashboard: a "Recent changes" box with the last 5 entries and "All history".
- **Who made it:** each entry is stamped "by Admin" or "by Superadmin" (see Admin roles below). This was Claude's call once the roles arrived.
- **Non-goals:**
  - Undo or restore from history.
  - Syncing history across devices.

## Admin roles (added 2026-11-23)
Clark's ask: a superadmin on the same admin site with passcode 0361. The superadmin can do everything; the admin can't see Settings or History.
- **Sign-in:** one PIN page. The PIN that matches decides the role: superadmin 0361, admin 0360. Both PINs are in Settings and must differ. The role lasts for the browser tab, and Lock signs out.
- **Admin:** Dashboard, Cars, Events and Leads. Settings and History are hidden from the sidebar, bottom tabs, top bar and Dashboard. Opening their URL directly shows "Superadmin only".
- **Events (added 2026-11-24, Clark's ask):** only the superadmin can add an event. The admin can still open, edit and delete events. The "New event" button (Events page and Dashboard) and the Dashboard's "Create one" link are hidden from the admin, and opening `/showroom/admin/events/new` as the admin shows "Superadmin only". Rule: `canAddEvent(role)` in showroomRules.js.
- **Superadmin:**
  - Everything above, plus Settings (with Reset) and History.
  - The role name shows under the shop name in the top bar and sidebar.
- **Data:**
  - `settings.superPin`, default '0361'. Older saved data gets the default.
  - History never stores either PIN's digits.
- **Still a demo lock:** the PINs ship with the page and the data is in the browser. A real dealer version needs real accounts.

## Reserved car screen (added 2026-11-23)
Clark's ask: opening a reserved car greys out the whole screen with a big "ALREADY RESERVED" in the middle.
- A native modal dialog over a greyed and blurred page shows a tilted white stamp, "ALREADY RESERVED" / "NA-RESERVE NA".
- Below the stamp: one line, "See other cars" (goes to the inventory) and "View details anyway" (closes the screen; Esc does the same). These were Claude's call so a buyer isn't trapped on the page.
- Behind it (Clark, 2026-11-23): on a reserved car, Messenger, Viber, Call and Book a test drive are disabled, with one line saying inquiries are closed. The loan calculator still works.
- It shows each time a reserved car's page opens. Sold cars keep their existing banner.

## Car listing fields
These are from Claude's knowledge of Cebu/PH dealer listings and still need checking against real listings (see Open items).

- **Basics**
  - Stock no., auto-generated (`SR-0001`).
  - Year, make, model, variant (e.g. "1.3 E").
  - Body type: Sedan / Hatchback / SUV / Crossover / MPV / Pickup / Van.
  - Transmission: Automatic / Manual / CVT.
  - Fuel: Gasoline / Diesel / Hybrid / Electric.
  - Engine (e.g. "1.5L").
  - Drive: 4x2 / 4x4 / AWD.
  - Seats.
  - Odometer in km.
  - Color.
- **Price:** cash price ₱, negotiable yes/no, financing available yes/no.
- **Papers:**
  - OR/CR: Complete & original / With open deed of sale / In process / Not stated.
  - Registered until (month and year).
  - Owners: 1st / 2nd / 3rd+ / Not stated.
  - Plate ending, optional.
- **Condition** (each Yes / No / Not stated): flood-free, accident-free, casa maintained (with records).
- **Known issues**, free text. Honest listings build trust.
- **Listing**
  - Status: Available / Reserved / Sold. Sold date is set automatically.
  - Featured.
  - Description.
  - Up to 12 photos, the first is the cover; reorder and delete.
  - Date listed.
- **Required:** year, make, model, transmission, fuel, odometer, cash price. Photos are optional; without them a body-type silhouette is shown.

## The 8 differentiators
1. **Pitch mode.** Settings rebrands the site in about a minute. Before a meeting Clark can type in the prospect's real cars, and their actual shop then appears on his screen.
2. **Monthly payment on every car.**
   - The buyer picks a downpayment % (from the minimum up to 60%) and a term.
   - Shows: downpayment, amount financed and monthly. The monthly uses the PH add-on method: `financed × (1 + totalAddOn%) ÷ months`, rounded up to the peso.
   - Shows an "All-in downpayment ≈" line: downpayment plus fees % × price.
   - Labelled "Estimate only, subject to bank approval".
   - The cheapest monthly also shows on cards ("from ₱12,345/mo").
3. **Condition & papers card.** Each item shows as ✓ Yes, ✗ No or "Not stated", each a different style and never merged. Flood-free sits first.
4. **One-tap inquiry.** The message is prefilled in the current language, e.g. "Hi! Interested ko sa 2019 Toyota Vios 1.3 E AT (SR-0012, ₱548,000). Available pa ni?"
   - Messenger: copy the message, then open `m.me/<page>`, with a toast saying "Message copied, paste it in Messenger".
   - Viber: `viber://chat?number=…&draft=…`.
   - Call: `tel:`.
   - If the shop hasn't set a channel, the button explains where to set it, instead of opening a stranger's page.
5. **Copy Facebook post.**
   - Generates an editable caption in EN or CEB: title, price, sale price, monthly-from, key facts, condition highlights, shop name, phone, area, hashtags.
   - Copy button, plus "Save photos" (downloads the car's photos).
   - Leaves out the per-car link, since with browser storage it wouldn't open on other devices.
6. **Leads inbox.**
   - Test-drive form: name, PH mobile (`09XXXXXXXXX` or `+639XXXXXXXXX`), preferred date (today or later), morning or afternoon, note.
   - Reserve form: name, mobile, note.
   - Both show a confirmation; the lead lands in admin.
7. **EN / CEB switch.**
   - All public UI text is in a dictionary, with English as the default and the choice remembered.
   - Text the dealer types is not translated.
   - Clark proofreads the Cebuano.
8. **Recently sold row on Home + days in stock in admin**, as described above.

## Look (ui-ux-pro-max)
- **Data match:** "Automotive/Car Dealership", with palette "Premium dark + action red". Its must-haves are a financing calculator (included) and vehicle comparison (left out, see Non-goals). Its default style is motion/3D; Clark asked for minimal, so the style is Minimalism with low variance and modest motion.
- **Palette**
  - Ink #0F172A (headings, dark featured band).
  - Slate #1E293B (secondary dark).
  - Page #F8FAFC, surface #FFFFFF, border #E2E8F0, muted text #475569.
  - **Brand red #cb2525** for primary buttons, sale tags and the active state. Hover #ea4343.
  - Red is the only accent. Green and grey appear only on condition marks and status chips, always with an icon and a word, never color alone.
- **Type:** Poppins 600/700 for headings, Inter for body at 16 px with line height 1.5. Prices and km use tabular figures.
- **Shape and icons:** radius 12–16 px, soft single-layer shadows, generous whitespace, lucide icons at stroke 1.75, no emoji in the UI.
- **Theme:** light only (as CarMark), with the dark featured band as the "cool" moment.
- **Motion:** 150–250 ms for UI, about 400 ms for slide transitions, and all of it honours reduced motion.
- **Accessibility:** contrast 4.5:1 or better (#cb2525 on white is 5.6:1), touch targets 44 px or larger, visible focus rings, labels on every icon button, form errors next to the field.

## Look v2: "window sticker" (redesign, replaces Look above)
Clark's ask: "greatly enhance the UI/UX design for the whole webpage, not making it look like AI slop". Clark picked this direction, the fonts and "build straight away".
- **Why it read as AI-made:**
  - White rounded cards everywhere, sometimes nested.
  - A navy gradient hero with a glow.
  - Pills everywhere.
  - Red uppercase eyebrow labels over every heading.
  - Poppins on slate.
  - The same cartoon car on every grey tile.
- **Idea:** the price sticker and spec sheet on a car at a real lot. Paper, ink, one red.
- **Palette:**
  - Paper #F5F4EF for the page.
  - Ink #1A1A2E (brand text) for text, rules and primary dark buttons.
  - Secondary text #55555F.
  - Hairlines are ink at 14%.
  - Brand red #cb2525 only for prices on sale, the sale sticker, the main call to action and the active marker.
  - No gradients, no glows, no shadows except on overlays (sheet, toast).
- **Type:**
  - Barlow Condensed 600/700 for headings, car names, prices and numbers. It's loaded only by the Showroom chunk.
  - Inter for body text at 16 px.
  - Headings are condensed uppercase with no eyebrow labels.
- **Shape:**
  - Radius 2–4 px, and 8 px on the bottom sheet's top corners.
  - Sections are split by a 2 px ink rule with a condensed heading, not by cards.
  - Spec, condition and loan rows read like a spec sheet: label, dotted leader, value.
- **Signature pieces:**
  - The price sticker: a red block on sale, an ink-outlined block otherwise.
  - Line-drawn cars (an ink outline with a hint of the car's paint) instead of filled cartoons.
  - A rubber-stamp SOLD.
  - A segmented progress bar instead of carousel dots.
  - A greyscale map.
- **Phones:**
  - Two cars per row in the inventory from 340 px (more cars per scroll, like FB Marketplace).
  - Every touch target stays 44 px.
  - The bottom nav marks the active item with a red bar.
- **Admin:**
  - Same paper and ink.
  - A light sidebar on desktop with an ink active item.
  - Dashboard numbers in one ruled strip.
  - Lists as ruled rows, not cards.
- **Kept:** all behaviour, copy, i18n, accessibility rules and reduced-motion handling. This is a visual change, not a feature change.

### Dark mode (added 2026-11-23)
Clark's ask: a dark mode toggle for the whole showroom (public site and admin) that starts from the device's setting.
- **Default:** follows the device's light/dark setting, live.
- **Toggle:** a sun/moon icon button next to EN | CEB in the public header and in the admin top bar on phones. On desktop the admin shows it as "Dark mode / Light mode" in the sidebar footer. The button is named for what it switches to ("Switch to dark mode").
- **Remembered:** the choice is saved in this browser (`showroom360:theme`). Flipping back to match the device forgets it, so the site follows the device again. This was Claude's call.
- **Look:** the same sticker at night. It's tonal, not inverted: warm paper-white ink on a blue-black lot.
  - Red fills stay #cb2525, because white on them is still 5.5:1.
  - Red text uses a lighter red, because #cb2525 is only 3.3:1 on the dark paper.
  - Car drawings swap to light outlines and dark tyres.
  - Native controls and dialogs follow the theme. The Google map stays light.
- **How:** `useTheme` sets `<html data-sr-theme>` while the showroom is open and removes it on leaving, so the portfolio is untouched. Only colour tokens change, so new UI must use the tokens and never raw colours.

## Look v3: "sticker, turned up" (added 2026-11-23; replaced by Look v4 on 2026-11-25)
Clark's ask: "greatly enhance the UI/UX design… cool and unique but professional", leaving the car drawings as they are. From three directions (this one, "inspection report" and "race program"), Clark picked this one and "build straight away". It's a visual change only: behaviour, copy rules, accessibility and dark mode are kept.
- **Section heads:** ink tabs sitting on a 2px rule, like the black bars on a real window sticker. One element does both: the heading's own background is the tab, and its `::after` paints paper over the rest of the line and draws the rule. The same goes for admin block heads, form legends and History days.
- **Block shadow:** `--lift` (4px solid, no blur) under the price stickers, the hero frame, the map, the admin stats strip and the PIN card. Main buttons sit on a 3px shadow and press into it. In dark mode the shadow is black, so the light borders carry the shape.
- **Home:**
  - A red ticker under the header. It shows live sales, then facts from the shop's own data only: cars in stock, bank financing if any car has it, hours and address. It holds under a finger or mouse and stays still with reduced motion. Like the carousel, it has no pause button (Clark dropped that earlier). Screen readers get the items once.
  - The hero car sits in an ink frame, with the stock no. and body type in its corners and the model name in giant outline letters behind the drawing.
  - The price sticker shows the sale name or "Price", the price, and a tear-off line with the monthly (or "Cash only").
  - The carousel's current segment fills over the 4 s. It shows full while the carousel is held.
- **Cards:** tags with an ink edge, the stock no. in the corner, the model name behind the drawing, and a dashed tear line with the monthly and an arrow. With a mouse, they lift onto the block shadow on hover.
- **Car page:**
  - Year, km, transmission and fuel sit in a ruled strip: 2 × 2 in a narrow column, one row from 400 px.
  - Price, monthly, the inquiry and lead buttons and a barcode with the stock no. sit in one window sticker. Its header bar is ink, or red with the sale name. The sale badge above the title was dropped as a repeat.
  - The details are numbered 01, 02… by a CSS counter.
- **Footer and admin sidebar:** a dark band (`--band`) in both themes.
- **Dialogs:** an ink title bar.
- **Motion:** cars and sections rise in as they scroll into view. This is CSS scroll-driven only (`animation-timeline: view()`), so browsers without it just show everything. Reduced motion turns it off. It's kept off the car page's side column, so the phone inquiry bar stays fixed.
- **Small phones:** under 380 px the shop name in the header is smaller, so "Demo Motors Cebu" fits whole next to EN | CEB. It was already cut off at 360 px before this change.
- **New wording:** `ticker.*` and `sticker.price`. `home.endsIn` was removed, because the ticker carries the sale now. The Cebuano strings are Claude's; Clark should proofread them.

## Look v4: "dealer site" (added 2026-11-25, replaces v2 and v3)
Clark's ask: the sticker look "seems to be like not really that kind of a car dealership design", so restyle the public site and the admin after two Drivehub template screenshots, keeping every feature and piece of content, as mobile-friendly as possible. Full design: `docs/superpowers/specs/2026-11-25-showroom-drivehub-look-design.md`; plan: `docs/superpowers/plans/2026-11-25-showroom-drivehub-look.md`.
- **In short:** dark full-bleed photo bands (home hero = the featured carousel, Cars banner, waitlist band), white sections with "• label" headings, rounded photo cards, black/white buttons, Inter only (Barlow Condensed removed), a near-black footer with columns and the shop name in giant letters. Red only for sales and alerts.
- **Shell:** a slim dark top strip (the ticker on home; phone, hours and address elsewhere) and a dark header that is see-through over a photo hero (`useOverHero` watches `[data-sr-hero]`). Contact is a white button on desktop.
- **Admin:** same tokens; a dark sidebar with the current page as a white block, a dark PIN page with a white card, bordered stat cards, pills for tabs and chips.
- **Kept:** all behaviour, copy, i18n (no new strings), accessibility, reduced motion and dark mode (same token names). The car drawings are untouched; the outline model name behind them is gone.

Clark's ask: hardcode photos for the sample cars, showing front, back, left side and right side.
- **Source (Clark's pick):** free-licence photos from Wikimedia Commons: CC BY-SA, CC BY, CC0 or public domain. Official brand photos were turned down because they're copyrighted. Dealer listing photos were ruled out because they're copyrighted and would show real dealers and plates.
- **Always four (Clark's pick):** where no single car has all four angles, the gallery mixes cars of the same model (and roughly the same generation). Colour, wheels or facelift can therefore change between photos. True side profiles are rare on Commons, so "left" and "right" are often three-quarter views where that side dominates.
- **Files:** 48 WebPs at 1280 px (about 7 MB), with camera metadata stripped, in `FRONTEND/public/images/showroom/<car>-<angle>.webp`. Sample cars use the photo ids `sample:<car>-<angle>`. `samplePhotos.js` maps those ids to files and credits.
- **Store:** `photoUrl` resolves sample ids. `photoBlob` fetches them for the Facebook post download. Removing a sample photo only drops the reference, because there's no saved blob to delete.
- **Credits** (required by the licences):
  - Under each sample photo on the car page: photographer (linked to the Commons file) and licence.
  - A fold-out "Photo credits" list in the footer covering every sample photo still on a car.
- **Colours:** sample car colours were changed to match each car's front photo.
- **Old saved data (Clark: "apply these photos"):** a demo saved before the photos shipped gets them automatically on its next load, once. `applySamplePhotos` gives each sample car its set only if the car still has no photos and is the same make and model. Its colour moves to the new sample colour only if it's still the old one, so a dealer's own photos and colour changes are kept. `settings.samplePhotos: 1` marks it done, so photos a dealer removes later stay removed; fresh and reset demos are born with the marker. It isn't logged in History.
- **Tests:**
  - Every seed car has four sample photos in front/back/left/right order, each with a credit and a file in `public`.
  - Only `sample:` ids resolve to bundled files.

## Sample data (Claude's calls)
- **Shop:** "Demo Motors Cebu" (obviously fictional), Mandaue City area, phone `0900 000 0000`. Messenger and Viber are left empty, so a click explains where to set them.
- **Cars:** 12 cars from CarMark's models (Vios, Wigo, Fortuner, Montero Sport, Xpander, Innova-class MPVs, City, Civic, BR-V…). Their prices fall inside CarMark's used-price ranges for the same generation. 3 are Featured, 2 are Sold, 1 is Reserved, and their listing dates are spread so a few show as "Aging".
- **Photos:** a clean SVG silhouette for each body type, tinted with the car's color. This avoids photo licensing and mismatched photos. Real photos come from admin uploads, resized in the browser to at most 1600 px on the long edge as JPEG.
- **Event:** "Christmas Sale" with 3 cars on sale. Its dates are set relative to the moment of seeding (started 3 days earlier, ends 30 days later), so the demo always has a live event. Reset reseeds it.
- **Financing defaults, all editable and labelled "sample":**
  - **Minimum downpayment 30%.** Most banks ask 30% for used cars (Security Bank, BDO, RCBC); a few go to 15–20% (BPI, Maybank, EastWest). Source: expressway.ph, read 2026-11-23.
  - **Total add-on by term:** 12 → 8.86%, 24 → 17.72%, 36 → 26.59%, 48 → 35.45%, 60 → 44.32%. These scale BPI's published 60-month used-car rate of 44.32% evenly per year. That's an approximation; banks don't publish the shorter terms.
  - **60-month term:** offered, though only BPI and Maybank go that long on used cars. Most stop at 48.
  - **All-in fees 5% of price:** unsourced. No bank page defines "all-in". Listings say it covers insurance, transfer and processing. Known pieces: CTPL ₱560/yr, encumbrance ₱380–500, doc stamp ₱1.50 per ₱200 financed, Visayas facilitation fee about ₱5,000, plus first-year comprehensive insurance. The dealer sets their own figure.

## Portfolio entry
- `App.jsx`: `/showroom` maps to the lazy `SHOWROOM 360/Showroom360`.
- `projectsData.js`: new id 11, `group: 'cars'`, plus a docs guide that doesn't mention /admin.
- `Projects.jsx`: a card graphic.
- Not added to the homepage picks unless Clark asks.

## Testing
- **Pure logic** goes in `showroomRules.js`, tested with `node --test`, in the same style as `carmarkRules.test.js`:
  - event status and overlap
  - effective price
  - featured slides
  - monthly and all-in maths
  - search, filter and sort
  - days in stock
  - Facebook caption
  - car, lead and event validation
  - PH mobile check
- **UI check:** the dev server, with viewport screenshots at 390 px and 1280px, covering the whole pitch flow: add a car with a photo, see it featured, run an event, send a test-drive request, see it in Leads, rebrand in Settings, then Reset.

## Open items
- **Research done 2026-11-23:**
  - goldacescars.ph homepage (above).
  - PH used-car loan terms (above).
  - Real listings confirmed the vocabulary: mileage, "casa maintained", "100% not flooded", and "all-in downpayment" covering insurance, transfer and processing.
- **Still open:**
  - goldacescars.ph car-detail field labels (rate-limited).
  - Check during the build that the `m.me` and `viber://` links behave as described, on a phone.
- **Reviewer questions, settled as Claude's calls (2026-11-23):**
  - **Fields and rates:** build on the fields above now. Rates are a total add-on % per term, as PH banks quote them.
  - **Cash-only cars** (`financing` = no) show no calculator and no "from ₱X/mo" anywhere, including the Facebook caption. "From ₱X/mo" means the minimum downpayment over the longest term.
  - **Overlapping events** are allowed if they use different cars. Each live event shows as its own chip (name · countdown) above the carousel and on the Dashboard, and each sale tag names its event.
  - **Viber and Call on a desktop:** the link is tried *and* a toast shows the number with a Copy button, so the click never does nothing.
  - **Storage:** ask the browser for persistent storage (`navigator.storage.persist()`). Safari can still clear site data after about 7 days without a visit; that's noted in the docs guide, and there's no export feature.
  - **Phones first (Clark, 2026-11-23):** most buyers will only ever see the store on a phone. 360–390 px is the primary layout for the public site *and* the admin, and every screen gets checked there first. 1280 px (Clark's laptop) comes second.
- **Left to the builder:** component split, carousel internals, IndexedDB helper shape, CSS details, exact Cebuano wording (Clark proofreads) and sample car details.

## Sample Privacy Policy and Terms (added 2026-11-24)
Clark's ask: samples of a privacy policy and terms in the footer.
- **Pages:** `/showroom/privacy` and `/showroom/terms`, linked from the footer on every public page, with a link to the other one at the bottom. The tab title names the page.
- **Wording:** plain English for a Cebu used-car shop, in `legalText.js`. They name the shop, address and phone from Settings, so a pitched dealer sees their own name. The privacy policy follows the Data Privacy Act of 2012 (RA 10173): what is collected, why, who it is shared with (bank, insurer, LTO, PNP-HPG), how long it is kept, the data subject's rights and the National Privacy Commission. The terms cover prices, condition ("as is" unless a written warranty, with Consumer Act rights kept), loan estimates, test drives, reservations, papers and transfer, and Philippine law with Cebu courts. The ₱10,000 / 7-day reservation fee and one-year retention are sample values.
- **Marked as samples:** a note at the top says a real shop should have its own version checked by a lawyer before going live.
- **Language:** the page title, date and note follow EN/CEB; the body stays English in both (the CEB page says so). Real PH shops usually publish these in English, and a legal text in Claude's Bisaya would need a careful check.
- **Never mentions the admin** (a test checks this).

## Admin navigation, enhanced (added 2026-11-24)
Clark's ask: enhance the admin navigation bar. Same look, sharper wayfinding.
- **Desktop sidebar (from 900px):**
  - The current page is a paper tab pulled out of the dark band and joined to the page, with a red edge. This is the reverse of the ink tabs that head each section.
  - Links use condensed uppercase, like the public menu.
  - Day-to-day pages (Dashboard, Cars, Events, Leads) come first. The superadmin's Settings and History sit under a rule.
  - Counts show beside links: "10 in stock" by Cars, "1 live" by Events while a sale runs, and the red new-leads badge.
  - The role shows as a sticker tag under the shop name, red for the superadmin.
  - Lock is its own outlined "Lock admin" button at the very bottom, apart from View site and Dark mode.
  - Focus rings on the band are paper-coloured (red is too faint there).
  - Hover has no grey block (Clark didn't like it): the text brightens and a thin pale edge shows on the left. Pressing shows the red edge.
- **Phone:**
  - Bottom tabs: condensed uppercase labels, a bolder icon on the current tab, and press feedback.
  - Top bar: the role tag, and a thin divider before Lock. Below 400px the shop name is slightly smaller, so a three-word name fits at 390px with four buttons. At 360px the superadmin's name may still end in "…".

## Autopilot and photo zoom (added 2026-11-24)

Waitlist, follow-up tasks, price-drop rules and a week report, all without a server: see [2026-11-24-showroom-autopilot-design.md](2026-11-24-showroom-autopilot-design.md). Car page photos open full screen with pinch and double-tap zoom.

## Promos: prize wheel (added 2026-11-24)

Superadmin-made prize wheels attached to an event by promo code; buyers spin once and claim a voucher. See [2026-11-24-showroom-promos-design.md](2026-11-24-showroom-promos-design.md).
