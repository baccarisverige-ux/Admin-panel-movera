# Later job

Everything the owner decided that still has to be built or wired later: admin panel, server (backend),
payments, driver app and rider app. Tick a box when it is done.

To continue in a new chat, say: **"Read LATER_JOB.md in admin-panel-movera and do the next part."**

Rule: whenever the owner says **"add to later job"**, Claude adds the item here as a checkbox, commits and pushes it.

---

## 1. Admin panel — new settings to add

### Ride categories screen (rider app "Choose your ride")
- [ ] **Badges per city / zone**
  - FASTER: on/off, and only shown when it saves at least X minutes (admin sets X).
  - RECOMMENDED: Auto (best mix of price and wait time) or Fixed (admin picks the car). Changeable any time.
- [ ] **Category order per city / zone**: recommended car shown 1st or 2nd; order of the other cars.
- [ ] **Preview** of which car gets which badge, before saving.
- [ ] No "Busy" / greyed cars in the rider app (decided). Rider app only shows what admin sets.

### Ride categories from the server
- [ ] Endpoint `GET /api/v1/ride-types` (or in the quotes response): id, name, icon, seats, description, badge, base price, order, enabled, per country/zone. The rider app loads it at start and on the categories screen and caches the last list (rider side built).
- [ ] The category ids used in promotions and pricing must be the same ids the rider app receives, so "Comfort" in a promotion matches "Comfort" in the list.
- [ ] Admin: adding, renaming, hiding or reordering a category updates the rider list without an app release (rider side built: PR #299, 14 categories with pictures).

### Payments
- [ ] **Payment methods on/off per country**: Pay in car (default for every rider), Movera Wallet,
      Apple Pay (iOS), Google Pay (Android), Card.
- [ ] Removed methods stay off everywhere: **PayPal**, **Swish as its own method** (it is inside "Pay in car"), **Klarna**.
- [ ] Refunds to card or wallet visible in Finance (payments + wallet ledger).

### Wallet used first (split payment)
- [ ] Minimum wallet balance to use on a ride (for example 10 kr), so tiny balances do not create a split charge.
- [ ] Order of deductions: promotion first, then wallet, then card / Apple Pay / Google Pay / Pay in car (editable).
- [ ] Wallet may cover the tip yes/no.
- [ ] "Use wallet balance first" default on/off for new riders.
- [ ] Price increases after booking (waiting time, route change) go to the card method only, never beyond the wallet balance; price decreases refund the wallet part first.
- [ ] Reports and receipts show the wallet part and the card part as two lines totalling the real fare.

### Promotions
- [ ] Rider promotion ticket ("30% off your next 5 rides") reads rides left + end date from the admin promotion (rider side built: PR #296)
      (shown on rider home, categories screen and "Pay with → Vouchers").
- [ ] Driver side: admin-written promotion shown to drivers on their map (asked earlier — confirm it is wired).

### Route changes and stops (during search, waiting and trip)
- [ ] Max stops per ride; waiting price per minute per stop; extra fee per stop.
- [ ] Max destination changes per ride.
- [ ] Allowed during trip yes/no; driver may accept/decline a new destination or stop yes/no.
- [ ] Default refund when the new price is lower: back to card or to Movera Wallet (rider can still choose).
- [ ] Refund wording per payment method: wallet credit is immediate; card, Apple Pay and Google Pay refunds say "within 2 to 3 business days" (editable text).
- [ ] Admin panel buttons: every confirm / continue button black, not blue (done in the rider app).
- [ ] Log of every change, new price, difference charged or refunded.

### From earlier admin-panel work (said "later")
- [ ] **Commission** settings: adjust in their own section.
- [ ] **Fleet owner vs driver documents**: they are not exactly the same — adjust each list.
- [ ] **Google Maps**: switch the admin maps to Google Maps.
- [ ] Every rule built in the admin frontend (dispatch, radar/exclusive, alerts, surge, zones, schedule rules,
      driver rest hours, offers per radar/popup, auto-offline) must be **saved and enforced by the server** (see 2).

---

## 2. Server (backend)

- [ ] Serve the ride categories (`GET /api/v1/ride-types`) from the admin's list; the rider app already reads it.
- [ ] Category pictures uploaded from the admin: the ride-types response carries an image URL per category; the rider app downloads and caches it, falling back to its built-in picture (today the 14 pictures ship inside the app, so changing one needs an app update).

- [ ] Save and enforce all admin rules (dispatch, radar/exclusive, alerts, pricing/surge per zone, promotions,
      payment methods per country, badges, category order, stop/change rules).
- [ ] **Stops end to end**: multi-stop quote, route, booking, ride snapshot, finding, waiting and driver app.
      Today stops are dropped (`_stopsSupported = false` in rider app). Rider "+ Add stop" is shown already but not real yet.
- [ ] **Change destination / add stop** during search, waiting and trip: new quote, then charge the difference
      or refund it (card 3–5 days, or wallet instantly — rider chooses).
- [ ] **Real address search**: instant suggestions from the first letter, typo tolerant ("drottn 5" → Drottninggatan 5),
      nearest first, area + postcode, distance in km, "Show more results".
- [ ] **Pickup spots per address**: entrances, parking spot, previously used, "Near Home". (rider side built with a mock: PR #298)
- [ ] **Live times for map pins**: pickup = time until driver arrives (estimate while searching, live once a driver is found);
      destination = "Arrive by HH:MM" (estimate, then live, also during the trip).
- [ ] **Badges + category order** sent with the quotes (from admin rules).
- [ ] **Bags** (No / 1–2 / 3+) saved on the booking. Rider app sends `notes.bags` + `notes.bagsCount` ("1-2" / "3+").
- [ ] **Quote from the exact pickup point**: quotes are priced from addresses today; when the rider moves the pin on
      Set pickup the price should be re-quoted from the new coordinates (server re-checks the price at booking). (rider side built with a mock: PR #297)
- [ ] **Saved cards list** for the rider (after the payment provider): until then Card always opens Add card first.
- [ ] **Movera Wallet**: balance, "use wallet first" then rest from the chosen method; wallet shown only when balance > 0.
- [ ] **Promotion**: rides left, end date, discounted price + original price per category in the quote.

---

## 3. Payment provider (for example Stripe)

- [ ] Connect a real card provider. The old "Add card" screen was removed (Phase 76) because nothing secure was connected.
- [ ] **Add card** screen (new design) + saved cards.
- [ ] **Card verification (3D Secure / BankID)** is the bank's own screen. Do it **once when the card is added**;
      rider app only shows "Verifying with your bank…" and success / failure.
- [ ] **Apple Pay / Google Pay**: the system pay window shows once, on top of the search screen, when the search starts.
- [ ] **Saved card**: silent hold when search starts, charge at the end of the ride.
- [ ] **Pay in car**: no payment window at all.

---

## 4. Driver app

- [ ] Show **bags** on the ride request.
- [ ] Receive a **new destination or stop live** during the ride (and accept/decline if admin allows).
- [ ] Show the **pickup spot name** (for example "Klockarvägen 37 – entrance").
- [ ] Driver app buttons: every confirm / continue button black, not blue (done in the rider app).
- [ ] Wallet used first: the driver sees only the amount to collect in cash ("Collect 150 kr"), never the wallet part; the trip summary shows "Wallet 50 kr · Cash 150 kr".
- [ ] Driver earnings are computed on the full fare, not on the cash part.

---

## 5. Rider app — decided design changes

- [x] Menu screen redesign (rider side built, branch rider/menu-redesign): full-screen page with name/photo, Wallet, picture tiles, six illustrated cards, account rows. Still to build behind the cards:
  - [ ] Movera Family: family members on one account, book for them, trip visible to the booker (server + rider screens).
  - [ ] Movera Business: business profile, work rides separated, monthly receipts for expensing (server + rider screens).
  - [ ] Greener rides: CO₂ saved per trip and per year on receipts (server calculation + rider display).
  - [ ] Safety checkup: real step count (trusted contact, preferences, …) from the server; the card shows "1 of 4 done" once it exists.
  - [ ] Invite friends: referral amounts (give kr 50 / get kr 50) from admin settings, not hard-coded.
  - [ ] Rider rating under the name (★ 5.00) once drivers' ratings are stored server-side.
  - [ ] Promotions NEW badge: mark an offer as new only until the rider has opened it (needs a "seen" flag).
- [ ] Wallet used first: full price stays on the categories list; under the selected ride "50 kr from your wallet · you pay 150 kr" (green "Paid by wallet" tag when it covers all); Set location Total shows "Movera Wallet −50 kr" and the rest on the chosen method; Pay with has "Use wallet balance first" (on by default); receipt shows two lines.

Built and merged (13 Oct): Home, Where to, Categories, Set pickup, Payments + Pay with + Add card (design only),
route colours, Driver on the way sheet, booking-lifecycle fixes. Ticked below. Unticked = still to build.

Book for later (built 13 Oct, PR #282)
- [x] **Same screens as Book now, up to Set pickup.** Home "Later" → new Where to (full screen, suggestions while
      typing, Home/Work/recent) → date & time → categories (scheduled: rows and pins show "Pickup 07:05 · Arrive 08:19")
      → "Schedule [car]" → the new Set pickup sheet (current location preselected, bags, price, payment) with the
      button "Confirm and schedule" → "Your ride is scheduled".
- [x] Drop the old "Plan your ride" and old "Confirm pickup spot" from that path. Keep them only for editing an
      existing reservation until that flow is moved too.
- [x] Switching Book now → Book for later on the categories screen asks only for the time; the pickup is set once,
      on Set pickup at the end.

Ride in progress (built 13 Oct, PR #281)
- [x] Headline = the live arrival time, "Arrive by 08:19", destination under it; "ON TRIP" stays as the small chip.
      The destination pin shows the same "Arrive by 08:19", updated live.
- [x] Same three sheet stops and motion as Driver on the way: low = one row ("Arrive by 08:19" + driver photo,
      name, plate); middle = driver card with Message/Call; full = ends where the content ends; stagger, haptic,
      gentle map reframe, recenter button rides on the sheet.
- [x] Under the headline, one slim line "Movera · Pay in car · 259 kr" instead of the destination card
      (the destination was shown twice). Driver card sits higher.
- [x] "Driver has arrived" popup stays as it is.

Setup
- [x] **Google Maps on the live web app**: already done — the deploy (`publish-web-live.yml`) injects the Maps key
      from the `MAPS1` secret into `index.html`. Only local and CI builds have no map (grey surface, no crash).
- [ ] Owner tests the rider app from the **live web link in Safari** (bookmark), not a native build. Keep that in
      mind: web-only paths (Safari, no camera padding, DOM map) must be tested on the live site after each deploy.

Home
- [x] Keep current design and colours; sheet background pure white.
- [x] Promotion ticket back on top of the sheet when down, no X, tap opens details; update the architecture guard test that forbids promotions.
- [x] Favourites: tap empty Home / Work / Add opens "Set your address" popup.
- [x] Sheet: slide up stops at middle; slide down from top goes all the way down; smooth staggered content, soft stop, haptic,
      gentle map move, rubber stretch at ends, handle reacts.

"Where to?" screen
- [x] Full screen, one move, keyboard ready; pickup shows exact address.
- [x] Real suggestions while typing, typed letters coloured, distance; no Next button (tap a real address to continue).
- [x] "+" Add stop shown now, "⇅" swap; current map-pin icon on the right of the field → "Choose on map".
- [x] Before typing: Home, Work, 5 recent; unset Home/Work opens the same popup as home.

Categories screen
- [x] Drag from anywhere; 3 positions (low, middle, full); opens at middle; filters only at full.
- [x] Map moves a little to keep the route visible.
- [x] Rows: "6 min · Arrive 23:43"; discounted price + crossed old price; promotion ticket on top.
- [x] Payment as one thin separate block; "Anything we should know?" deleted.
- [x] After Book: (Card with none saved → Add card) → **Set pickup every time** (current location preselected, spots, bags,
      price, payment, "Confirm and search") → search starts.
- [x] Set pickup map never moves by itself; pin lifts on touch and drops with a small bounce on release.
- [x] "Pay with" full screen only when tapping the payment line.

All screens
- [x] Route colour green → blue (was purple); green pickup pin, blue destination pin.
- [x] Pins always show times (pickup time, "Arrive by"): Categories and Set pickup (estimates), Search (chosen
      ride's estimate), Driver on the way (live "N min"), Trip ("Arrive by", live). Built 13 Oct, PR #281.
- [x] Search screen ("Finding your driver"): keep as it is now.

Menu → Wallet & Payments
- [x] Same payment list as booking; remove PayPal, separate Swish and **Klarna everywhere**; new Add card screen.

---
- [x] Set location: when the sheet is short (down), add a Bags option at the top right of the sheet; keep the full-sheet Bags row as well.
- [x] Change the route while searching, waiting for the driver and on trip: change pickup (until the driver arrives), change destination, add a stop; new price shown before confirming; driver notified. (Rider screens; admin rules are in section 1.)

## Still to discuss
- [x] Rider app: "Driver is on the way" screen (built) and the trip screen (decided, see section 5).
- [ ] Rider app: "Driver has arrived" popup — keep as is (decided). Trip complete / rating screen — not discussed yet.
