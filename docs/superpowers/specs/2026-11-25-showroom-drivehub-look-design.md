# Showroom 360: Look v4, "dealer site" (Drivehub-style)

**For:** Clark, pitching Showroom 360 to Cebu used-car dealers. Replaces Look v3 ("sticker, turned up") in `2026-11-23-showroom-360-design.md` for the public site **and** the admin.
**References:** two screenshots of the Drivehub Framer template (home page and "Available Vehicles" inventory page), shared by Clark on 2026-11-25.

## Why
Clark (2026-11-25): the current UI "seems to be like not really that kind of a car dealership design of a website". The window-sticker look reads as a stylised concept. A dealer seeing the pitch should recognise a real, modern dealer website: big car photography, clean white sections, quiet black-and-white type.

## Goals
- The public site and the admin follow the Drivehub references: dark full-bleed photo bands, white sections, small "• label" headings over medium-weight tight headings, rounded photo cards, black/white buttons, a near-black footer with the shop name in giant letters.
- Phones first (360–390 px), since most buyers only use mobile. The references are desktop; this doc says how each piece folds down.
- Dark mode keeps working (device default plus toggle) on both sides.

## Non-goals
- No feature, page, field, wording or behaviour changes. Everything the showroom does today stays: carousel timing and swipe, ticker items, filters and URL query, waitlist, lead forms, inquiry bar, loan calculator, reserved overlay, photo viewer and credits, promo wheel, legal pages, EN/CEB, admin roles, History, Autopilot.
- No content from the reference that the dealer never gave: no partner logos, no customer reviews, no trade-in section, no blog. (Anti-goals in the main spec: no fabricated claims; trade-in is a non-goal.)
- No new npm packages and no new fonts.
- Filters stay single-choice (dropdowns), even though Drivehub uses checkbox lists. Checkboxes would let a buyer pick several makes, which is new filter logic.
- No "Browse by vehicle type" tile row (Clark, 2026-11-25: skip it; keep this a pure restyle, can be added later).

## Anti-goals (a failure even if it looks right)
- Something that was on the site is missing or no longer works.
- White text on a photo that's hard to read.
- Phones feel worse than today: cramped cards, a header that hides content, targets under 44 px.
- Dark mode shows white-on-white or black-on-black anywhere.
- A photo appears without its licence credit being reachable (see Photos).

## Constraints
- React 18, CSS modules, lucide-react, browser APIs only (main spec).
- New CSS uses the colour tokens, never raw hex, so dark mode keeps working (memory/spec rule).
- The car drawings (`CarArt.jsx`) stay as they are (Clark, 2026-11-23).
- Sample photos are Wikimedia Commons, credited per photo. Any bundled photo shown anywhere must be one still on a car, so the footer's credit list covers it.
- Commit only when Clark asks.

## Approaches
- **Rewrite both stylesheets, change markup only where the layouts need it (chosen).** `Showroom360.module.css` and `admin/Admin.module.css` are rewritten in the new look. JSX changes are limited to structure the references need: photo hero, label + heading pairs, footer columns, inventory banner, top strip, header states. Tokens keep their names so dark mode and every component keep working.
- Styling only, no markup changes. Rejected: the photo hero, footer columns and label headings can't be made from the current markup, so it wouldn't match the references.
- Keep the sticker look as a second, switchable theme. Rejected: every style twice, for something not asked for.
- Admin scope: **public site and admin both (Clark, 2026-11-25).** Dialogs, forms and buttons are shared, so a public-only restyle would leave the admin half old, half new in front of a dealer.

## Phones first (Clark, 2026-11-25: "make this as mobile-friendly as possible")
Every piece is built at 360 px first, then widened. These rules apply everywhere, public and admin:
- **No sideways scrolling** at any width from 320 px. Long labels (Bisaya too) wrap instead of pushing the page wider.
- **Touch targets at least 44 × 44 px**, with at least 8 px between neighbouring targets. Hover effects only under `(hover: hover)`, so nothing sticks on a tap.
- **Thumb reach:** the main actions sit low on the screen. The bottom nav, the car page's fixed inquiry bar and the filter sheet's "Show n cars" bar stay at the bottom, clear of the phone's home bar (`env(safe-area-inset-bottom)`).
- **Readable sizes:** body text 16 px, small print never under 12 px, inputs 16 px so iPhones don't zoom in on focus.
- **Screen height:** full-height pieces use `svh`/`dvh`, so they don't jump when the browser's address bar slides away. The hero sets a *minimum* height and grows to fit its text, so landscape phones (about 360 px tall) never clip it.
- **Hero on phones:** text sits at the bottom of the photo; "View this car" is a full-width white button with "See all cars" under it; prev/next and progress are 44 px targets; swipe still changes the car.
- **Header on phones:** 56 px, transparent over the hero, solid once scrolled. The top strip shows the ticker on home, and elsewhere only the phone number as a tap-to-call link.
- **Cards on phones:** two per row from 340 px (one below that). The title clamps to 2 lines, the price is the biggest thing on the card, and the icon facts wrap to a second line rather than shrinking under 12 px.
- **Car page on phones:** the gallery runs edge to edge (no side margin), swipe works, and the page leaves room at the bottom so the fixed inquiry bar never covers content.
- **Sideways rows** (recently sold): swipe with scroll-snap and a peek of the next card. The ← → buttons show only with a mouse.
- **Dialogs and the filter sheet** are bottom sheets on phones (at most 92dvh, scrolling inside). Their action buttons are pinned to the bottom of the sheet, not lost at the end of a long form.
- **Footer on phones:** the shop block on top, Pages and Legal side by side, Contact below, and the big shop name scaled to the screen width.
- **Admin on phones:** the bottom tabs and the sticky save bar (above the tabs) stay, forms are one column, and list rows stack their details under the title instead of squeezing columns.
- **Mobile data:** only the hero's first photo loads eagerly; everything else is lazy. Photo fades are CSS gradients, not blur filters, and no `background-attachment: fixed`.
- **Checked on real phone sizes:** 360 × 740, 390 × 844 and 414 × 896 portrait, plus 740 × 360 landscape, for every page in the Testing list, light and dark.

## The look

### Tokens (names kept, values changed)
| Token | Light | Dark |
|---|---|---|
| `--paper` (page) | #ffffff | #0b0b0c |
| `--paper-2` (media wells, hover) | #f4f4f5 | #1c1c1f |
| `--surface` (cards, inputs, dialogs) | #ffffff | #141416 |
| `--ink` (text, primary button fill) | #0a0a0a | #f4f4f5 |
| `--ink-2` (secondary text) | #5f5f66 (≈6.3:1 on white) | #a1a1aa |
| `--rule` / `--rule-2` | ink at 9% / 18% | ink at 12% / 24% |
| `--band` (hero, footer, sidebar, photo bands) | #0a0a0a | #050506 |
| `--red` / `--red-text` | #cb2525 / #cb2525 | #cb2525 / #ff7b72 |
| `--radius` | 6px | 6px |

Remove `--lift` (block shadow) and `--shade`; add `--shadow` for overlays only (a soft single-layer shadow). `--display` and `--body` both become Inter. The note colours (`--note-*`), `--yes` and the drawing tokens (`--art-*`) stay.

### Type
- Inter only (the portfolio already loads 300–900). Remove the Barlow Condensed loader from `Showroom360.jsx`.
- Headings: weight 500–600, letter-spacing about -0.03em, sentence case (no uppercase), line height 1.05–1.15. Sizes roughly: hero title clamp(2.1rem, 7vw, 3.6rem); section heading clamp(1.6rem, 4.5vw, 2.4rem); card title 1rem.
- The "• label" over a section heading: 0.8rem, `--ink-2`, a 4px dot before it. Labels only reuse existing strings (see Wording).
- Prices: Inter 600, tabular figures.

### Colour use
- Black and white do the work. **Primary buttons are black (white text) on light sections and white (black text) on dark bands.** Secondary buttons are outlined.
- Brand red is only for sales and alerts: sale price, sale/event chips, the live-sale dot in the top strip, the promo gift button, the new-leads badge, admin danger buttons, form errors.
- Focus ring: 2px solid `--ink` with 2px offset on light, white on dark bands.

### Removed sticker decorations (all information stays)
Ink-tab section heads, block shadows, the tear lines and notches on price stickers, barcode stripes (the stock no. stays as text), the outline model name behind drawings, rotated rubber stamps (SOLD and RESERVED stay as words, as clean labels), the numbered 01/02 detail heads, dotted leaders in spec rows.

### Shapes and motion
- Radius 6px on cards, photos, inputs and buttons; 12px on dialogs (top corners only for phone bottom sheets).
- Cards: 1px `--rule` border, no shadow; on hover (mouse only) the photo zooms 3%.
- Keep scroll-reveal (`rise`), carousel fades and all reduced-motion handling.

## Shared pieces

### Top strip (public, above the header)
A slim `--band` strip, 36px, small white text.
- **Home:** the existing ticker runs here, with the same items, behaviour and screen-reader copy, but as a quiet strip instead of a red band. A live sale's item gets a red dot.
- **Cars, car page, legal pages:** static phone · hours · address from Settings, with icons (Phone, Clock, MapPin). Phones show only the phone number; the strip hides if Settings has none of the three.

### Header
- Desktop: shop logo + name on the left; Home and Cars in the middle; on the right EN | CEB, the theme toggle and **Contact as a white button** (same click and `aria-current` behaviour as today's Contact link).
- Over a photo hero (home, Cars page) the header is transparent with white text. Once the hero scrolls away it turns solid `--band`. Pages without a hero (car page, legal, not found) get the solid `--band` header from the start. It stays sticky, as today.
- Phones: logo + name, EN | CEB, theme toggle; the bottom nav stays, restyled (white bar, hairline top, current item black and bold, the rest `--ink-2`).

### Buttons, forms, dialogs, toast
- `btnPrimary`: `--ink` fill, `--paper` text, radius 6, 48px tall, Inter 500. `btnGhost`: 1px `--ink` border. On dark bands a modifier flips them to white.
- Inputs, selects and the search box: 1px border (`--field`), radius 6, focus ring in ink. Checkbox and range accent: ink. The price range and loan sliders get round ink thumbs and an ink fill between them (red goes).
- Segmented buttons (loan term, admin): the current one is ink-filled.
- Dialogs and sheets: `--surface`, radius 12 (bottom sheet on phones), a white header row with the title in Inter 600 and a hairline under it (not an ink bar), soft shadow, backdrop black at 55%.
- Toast: ink background, radius 8, soft shadow.

### Car cards (home rows and the Cars page)
- White card, 1px border, radius 6. Photo 4:3 on top (drawing on `--paper-2` when there is no photo).
- Badges top-left on the photo: sale (red), price dropped (red), reserved (white with black text). Stock no. as a small translucent chip bottom-right.
- Body: title, then price. When the card is wide enough (container query, about 260px), title left and price right on one line, like Drivehub; on phone two-ups they stack.
- Facts row with small icons: Gauge (km), Cog (transmission), Fuel (fuel), in `--ink-2`.
- Footer line, separated by a hairline: "from ₱X/mo" or "Cash only", and an arrow.
- Phones keep two cars per row from 340px (main spec).

## Public pages

### Home
1. **Top strip** with the ticker (above).
2. **Hero = the featured carousel** (Clark, 2026-11-25: the car's name is the headline, not the shop slogan). Full-bleed dark band, the current featured car's photo filling it, with a dark fade from the left (and from the bottom on phones) so white text stays at 4.5:1 or better. Text in white: "• Featured cars" label (the existing `h1`), the car's name as the big heading, the facts line, the price (sale: red chip with the event name, old price struck), the monthly or "Cash only", and buttons "View this car" (white) and "See all cars" (outlined white). Stock no. and body type stay as small translucent chips. Controls at the bottom: prev/next square buttons, the segmented progress (white) and the 01 / 03 count. Timing, swipe, hold-on-hover and reduced motion are unchanged. Height: about 78svh on phones (text at the bottom), about 88vh capped at 860px on desktop (text left, vertically centred). The header sits over it. A featured car with no photo shows its drawing on a light rounded panel inside the band (right side on desktop, top on phones).
3. **Cars in stock** (today's "All cars" row of 4): label "• {n} cars in stock" (existing `ticker.stock` string), heading "All cars", the "See all cars (n) →" link on the right. Cards as above, 2-up on phones, 4-up on desktop.
4. **About / contact** (`#contact`): white section, two columns on desktop. Left: label "• About the shop", the tagline as the heading, the about text, contact rows (Call, Open, Find us) with icons and hairlines, buttons Call (black) and Open in Google Maps (outlined). Right: the map in a rounded frame, still greyscale.
5. **Recently sold:** label "• Recently sold", heading = the existing hint sentence, and on desktop square ← → buttons top-right that scroll the row (reusing the `home.prev` / `home.next` labels). Cards with a greyscale photo and a black "SOLD" label top-left.
6. **Waitlist band** (today's "Can't find your car?"): Drivehub's "Ready to find your next vehicle?" band. Full-bleed `--band` with a dimmed photo of a car in stock, the heading and text in white, and a white "Tell me when one arrives" button. No photo in stock: plain `--band`.
7. **Footer** (all public pages, below).

### Cars page
1. **Top strip** (static contact) and the transparent header over:
2. **Banner:** a dark photo band (kept short on phones, about 190px, so the first cars stay near the top; about 420px on desktop) with "All cars" as the big white heading at the bottom-left, like Drivehub's "Available Vehicles". Photo: a car in stock (see Photos); none: plain band.
3. Below, on white: the search box (full width, rounded) with the Filters button beside it on phones.
4. **Desktop:** filter panel on the left in a white rounded box with a 1px border (today's dropdowns, price boxes, range slider, year pair, "On sale only", Clear filters), sticky as today. Results on the right: count + sort bar, then cards **2 per row** beside the filters (bigger photos, like the reference), 3 per row from about 1400px if the container allows. **Phones:** unchanged flow (Filters sheet, two cards per row).
5. Waitlist line under the results: a light `--paper-2` rounded box with the text and an outlined button. Empty state unchanged in content, restyled.

### Car page (no reference; same language)
- Solid dark header and static strip. "← All cars" crumb.
- Gallery: radius 6, white square arrow buttons, a dark translucent count chip, a zoom icon chip; thumbnails radius 4 with an ink border on the current one; the credit line under the photo stays.
- Side: title (Inter 600, about 2rem), then year / km / transmission / fuel as four small `--paper-2` tiles with icons (2 × 2 in a narrow column, one row from 400px as today).
- **Price card** (replaces the window sticker): white, 1px border, radius 8. Top line: "Price", or a red chip with the sale name, or "Price dropped", plus a "Negotiable" chip. The big price, the monthly line, the inquiry bar (Messenger black, Viber and Call outlined), Test drive / Reserve outlined, the waitlist button when sold or reserved, and "Stock no. X" as small text.
- Loan calculator: its own bordered card with the same parts.
- Details (condition, specs, about, known issues): plain sections with an Inter 600 heading and hairlines; condition rows show label left, value right; spec list as a 2/3-column grid of label over value.
- Phone inquiry bar: fixed at the bottom as today, white with a hairline top.
- **Sold banner:** a black rounded bar. **Reserved overlay:** same dialog and behaviour; the stamp becomes large white "RESERVED" text in a 3px white rounded frame, not rotated.

### Legal pages, not found, crash screen
Restyled with the new type; the sample-notice box stays.

### Promo wheel, photo viewer
- Gift button: stays red and round (it's a sale), soft shadow instead of the block shadow; its label chip is black.
- Promo dialog: radius 12; the dark top with the wheel stays (it already matches the dark bands); the sale-name chip stays red but not tilted. The voucher keeps its ticket shape (dashed tear and notches, since it is a ticket) with 1px borders and no block shadow. The wheel's colours and odds list are unchanged.
- Photo viewer: already full-screen dark; only fonts and buttons change.

### Footer
Near-black `--band`, white text. Columns on desktop, stacked on phones:
1. Shop logo + name, the demo note (`footer.note`), "© {year} {shop name}".
2. "Pages" (`nav.menu`): Home, Cars, Contact.
3. "Legal" (`legal.nav`): Privacy Policy, Terms and Conditions.
4. "Contact" (`nav.contact`): phone, hours, address.

Under the columns: the "Photo credits" fold-out (unchanged) and "Made by Clark VA 360". At the very bottom, the shop name in giant letters in a faint grey (decorative, `aria-hidden`), sized to the width by its length.

## Admin
Same tokens, type and buttons as the public site.
- **Phone top bar:** white, hairline bottom, logo + shop name (Inter 600) + role tag (small chip: outlined for Admin, red for Superadmin). Bottom tabs styled like the public bottom nav, with the red new-leads badge.
- **Desktop sidebar:** `--band` (matches the footer). Items in white at 70%; hover brightens; **the current page is a white rounded block with black text** (Drivehub's white button), counts in grey. Sidebar foot (View site, Dark mode, Lock admin) as today, restyled.
- **PIN gate:** the page is the dark band; the form is a white rounded card (radius 12) with the logo, shop name, PIN field and a black Unlock button.
- **Page heads:** Inter 600 title (about 1.75rem) with the actions on the right and a hairline under. **Block heads:** Inter 600 about 1.1rem, link on the right, no ink tabs.
- **Dashboard stats:** separate white bordered cards (radius 8) in a 2-column grid on phones, 5 across on desktop; the new-leads stat shows its number in red.
- **Lists** (cars, events, leads, promos, history, to-do): ruled rows with hairlines; thumbnails radius 4; status chips as small rounded labels.
- **Forms** (car, event, promo, settings): fieldset legends as Inter 600 headings with a hairline; inputs as on the public site; the sticky save bar white with a hairline top; delete buttons red.
- Every admin page keeps its content and behaviour.

## Photos
- Hero slides use each featured car's first photo (as today).
- The Cars banner and the home waitlist band each use the first photo of a car that's for sale, chosen deterministically (e.g. the newest-listed car with a photo for the banner, the second for the band), never a random pick, so nothing flickers between renders. Because these are photos on cars, the footer's credit list already covers them.
- With no photos anywhere (a dealer who deleted them all), the bands are plain `--band`.
- The hero's first slide image should load eagerly (not `loading="lazy"`), since it's the first thing on screen.

## Wording
No new strings. Labels reuse existing ones: `home.featured`, `ticker.stock` / `ticker.stock1`, `home.about`, `home.sold` / `home.soldHint`, `home.prev` / `home.next`, `nav.menu`, `legal.nav`, `nav.contact`, `cars.title`. The copyright line is the © sign, the year and the shop name.

## Claude's calls (Clark to check)
- Primary buttons go black/white; red stays only for sales and alerts.
- The red ticker band becomes the slim dark top strip (same items) on the home page.
- Contact becomes a white button at the right of the desktop header.
- Cars page: 2 cards per row beside the filters on desktop (was 3).
- The sticker decorations listed above go; all the information they carried stays.
- The voucher keeps its ticket shape.
- The PIN page goes dark with a white card.

## Left to the builder
- Exact spacing, sizes and breakpoints within the ranges above, checked at 360, 390, 768, 1280 and 1440 px.
- How the header detects the hero leaving (IntersectionObserver on the hero is suggested).
- Fade strengths over photos, as long as white text meets 4.5:1 on the brightest sample photo.
- Which lucide icons fit best where the doc names none.

## Testing
- The existing node tests must still pass (logic is untouched): `node --test` over the Showroom test files listed in the main spec.
- Screenshots of home, Cars, a car page (photo, no photo, sale, reserved, sold), legal, the promo dialog, the lead form, and the admin (PIN, dashboard, cars list, car form, settings) at the phone sizes in "Phones first" and at 1440 px, in light and dark.
- At each phone size, check that the page is no wider than the screen (`document.documentElement.scrollWidth <= innerWidth`).
- Keyboard pass: focus visible everywhere, including on the dark bands.
