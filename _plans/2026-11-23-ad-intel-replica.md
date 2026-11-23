# Ad Intel replica

## Goal

Add Ad Intel as the fifth work: a clickable copy of the dashboard on its project page, a recorded video, a desk object and a work card, editable in the admin like the other works. It shows the full loop from a competitor's long-running ad to our own article.

## Decisions (Yoav, 2026-11-23)

- **Creatives:** drawn ad cards made in code (a background scene shape plus the headline in bold type). No real competitor ads or photos.
- **Business side:** kept as it is (revenue, RPC, policy chips, feeds, Client Kits columns), with every number, domain, feed, person and ID invented from the fake key in the tour spec.
- **Scope, core:** Fresh Finds (filters, sort, Our Domain plus HAVE / MISSING gap filter, landing page filter, search), the 3-pane ad detail with a working Workflow (status, brand, owner, linked URL, notes, star, Draft article, J/K), Trends, Pipeline with drag and drop, and Control Room with a fake Run now and Stop. Competitors, Client Kits, Review, Filtered, Rejected, Users and the command palette show a short note that they aren't in this demo.
- **Name:** Ad Intel, with the ADINTEL diamond logo.

## Alternatives rejected

- Text-only placeholders for creatives: safe, but the dense table and detail panel would look empty.
- Toning down or renaming the product: hides the depth that makes it a good portfolio piece. Fake data already removes any real information.
- Every tab: roughly double the work for screens a visitor rarely opens.

## Approach

- `demos/ad-intel/`, a desktop window, 1440 x 900, same split as the other replicas: `js/data.js` (all invented), `js/logic.js` (pure, unit tested: filters, sort, gap matching, trends, pipeline moves, scrape due times), `js/dom.js`, one module per screen, `app.css`.
- Data: about 40 ads across a dozen fake competitor domains, 10 verticals, 8 languages, three of our fake domains with a few matching articles so the gap filter has both HAVE and MISSING.
- All state lives in memory. Nothing is sent anywhere. Screens switch in memory so the portfolio's Back button still works.
- Desk object: a `screen` (small monitor) showing the replica's poster. The desk layout gets adjusted so nothing overlaps.
- Video: `tests/record-demos.mjs` flow following the spec's best moments (gap filter, ad detail and Workflow, Trends to Pipeline).

## Privacy

- No real competitor domains, our domains, feeds, people, emails, IDs or figures. The privacy test gets hashes of the real ones seen in the tour screenshots.
- The tour spec and screenshots stay out of git (already covered by `.gitignore`).
- Fixes the spec raised (vertical pollution, raw `####` markup) are simply not reproduced: the replica uses a clean vertical list and clean article text.

## Security

- Static files only, no network calls besides Google Fonts. Text goes in through `textContent`.

## Open questions

- None blocking. The work's one-line description and year come from Yoav later through the admin; placeholders until then.
