# Phase Gate A · Admin frontend against the typed simulation

## Phase and task
P0–P19 · frontend simulation (one branch, work already built in the preview)

## Findings addressed
Dead buttons, no command result, no publish/rollback, no zone scope, no second-person refund, login wall on the preview.

## What changed
- Stockholm / SEK demo opens as super admin Nora Lind.
- Menu from the v1.2 brief: overview, operations, people, finance, places, support, content, platform.
- Dispatch values (offer 8.5s, radar 30 km, impossible travel 55 m/s) editable per zone.
- Publish flow: draft, second person approves, publish, rollback.
- Refunds of 200 kr or more need a second agent.
- Reservation policy texts in English and Swedish.
- Live map is a Stockholm zone schematic, not a GPS feed.
- Driver and rider pages cover the brief tabs that the apps show.
- Trip cancel and reassign are refused on a finished trip.
- Inbox count is the real open queue. CSV export blocks formula injection.

## ActionSpecs added
- admin.config.draft, admin.config.approve, admin.config.publish, admin.config.rollback
- admin.trip.cancel, admin.trip.reassign, admin.trip.adjust
- admin.refund.decide (second person at 200 kr)
- admin.message.test, admin.message.publish
- admin.review.hide, admin.wallet.credit

## How to test
1. Open the preview. It signs in as Nora Lind.
2. Switch to Lena Berg and approve a draft saved by Nora.
3. Open a finished trip and confirm Cancel is off.
4. Open Refunds and approve RF-2 (250 kr) with a second agent.

## Checks
- [x] Typecheck and production build of the preview app
- [x] SEK, Europe/Stockholm, Movera names
- [x] Simulation banner. Apps are not connected.
- [ ] Live site cutover (P19) is a later PR. This branch does not replace the current Pages files.

## Follow-up
Real map geometry, HttpAdminApi, and app sync stay out of this PR (chapter 15).
