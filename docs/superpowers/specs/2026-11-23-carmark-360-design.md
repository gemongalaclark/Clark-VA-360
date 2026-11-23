# CarMark 360 — design

**For:** real secondhand-car buyers in Cebu, mostly on phones. No login.
**Lives at:** `clarkva360.site/carmark`, inside the portfolio (approach A, chosen by Clark). New **Cars** tab on /projects.

## Why
Buyers in Cebu shop Facebook listings and dealer lots without knowing what separates one variant or model year from another, what usually breaks, or what a fair price is. After Typhoon Tino (Nov 2025) flooded half of Cebu City, flood-damaged units are a real risk.

## Pages (bottom tab bar on phones)
1. **Compare** — pick Car A and Car B (model → generation → variant, any model vs any model). Shows what each has that the other doesn't, a side-by-side spec table (differences highlighted, "differences only" toggle), each generation's rough used price and its problems to check. The pair is kept in the URL (`?a=&b=`) so a buyer can share it.
2. **Models** — the readable "doc": each model's generations with years, what changed, variants, rough used price and problems to check.
3. **Dealers** — trusted Cebu dealers Clark enters by hand in `dealerList.js`. Tap a dealer to show it on a Google Maps window; "Open in Google Maps" and "Directions" buttons. Empty state until Clark adds dealers.
4. **Checklist** — before-you-buy checks for any used car: flood signs, mileage/fleet history, papers (OR/CR, encumbrance, HPG clearance, deed of sale), test drive, paying safely. Ticks are saved on the phone.

## Approaches considered
- **A. Inside the portfolio, static data files (chosen).** No backend, nothing new installed, goes live on push. Prices/dealers change by editing a file.
- B. Separate site like KalakalGG — cleaner URL, but a new project, packages, Vercel and DNS for an app with no login or data.
- C. A + Supabase tables for prices/dealers — edit without pushing, but more moving parts than prices that change every few months need.

## Decisions (Claude's calls)
- Name **CarMark 360** (rhymes with Clark). Models: Xpander (+Cross), Fortuner, Montero Sport, Vios, Wigo, HiAce, Avanza, Veloz, Stargazer, Yaris Cross, Honda City, Civic, BR-V, CR-V, Brio. Generations from about 2012 on.
- Map: Google Maps embed (no API key, no new package) showing the selected dealer, not all pins at once.
- Data lives in `carData.js`; variants inherit their generation's base specs/features and add their own, so differences are computed, not typed twice.
- Prices are rough asking-price ranges from Carmudi / Philkotse / Automart listings (Nov 2026), labelled as estimates. Features are the main differences from launch spec sheets; where sources disagreed, the feature was left out rather than guessed.
- Light theme only, own styling, mobile first.

## Update: checklist per generation (2026-11-23)

- **Ask:** the Checklist works only after the buyer picks a specific car (model + generation), with a thorough checklist for every generation.
- **Approaches:** (A) car-specific checks first, then the shared checks every used car needs, or (B) a fully separate list per generation. Clark picked A: the papers and payment checks stay identical and correct, and the research goes where cars differ.
- **Built:**
  - `/carmark/checklist` shows a model picker, `?m=<model>` shows the generation picker, and `?g=<generation>` shows the checklist.
  - Compare's "Going to see the …?" link and every generation on Models open `?g=` directly.
  - Each generation has 8–12 checks in carChecks.js, followed by the 32 shared checks.
  - Ticks are saved per generation (`carmark-checklist:<generation>`), and the Checklist tab reopens the last car during the visit.
