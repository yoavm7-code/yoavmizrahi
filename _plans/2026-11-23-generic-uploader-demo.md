# Mega Uploader demo: generic content

Status: approved 2026-11-23 (option A). Follows `2026-11-23-real-work-demos.md`.

## Goal

The replica is a generic multi-platform campaign launcher with invented content. Visitors get the full experience: the grid, auto-fill, the link step, Run live with the streaming log, Run history with drill-down, the dashboard and the Ask drawer. Nothing in it describes a real business, partner or account.

## Decisions

| Area | In the demo |
|---|---|
| Campaign name | `GEO · Vertical · 23 Nov · #7`, readable, no codes |
| Clients | Brands (invented). "Create tracking links" fills two columns: Link ID and Tracked link (a short link) |
| Columns | Product ID, Landing page, Image, Notes, plus the creative and targeting columns |
| Platforms | 8 mainstream: Facebook, Google Ads, TikTok, Pinterest, Snapchat, LinkedIn, Microsoft Ads, X |
| Verticals | Consumer categories. Credit Cards is there so one row fails on the financial-claims policy |
| Strategies | Lowest cost, Target CPA, Target ROAS, Manual CPC |
| Accounts | Regions: North America 1, Europe 1... chosen by geo |
| Dashboard | Campaigns launched, live, success rate, launches per platform, creatives by brand. No money |
| Errors | Short generic messages |
| Sidebar | A short generic set; pages outside the demo say so |
| Notifications | Account billing notes, team activity |
| Trace and IDs | tracking_link, campaign, creatives, summary. 12-character IDs |
| Workspace tabs | Spring launch, Retargeting... |

## Rejected

- B, a different kind of product altogether: hides the interesting part and is a much bigger rewrite.
- C, fewer screens: fastest, but loses most of the demo.

## Guards

- `tests/unit/replica-privacy.test.mjs`: hashed list of terms that must never appear.
- `tests/unit/replica-logic.test.mjs` and `tests/browser/replica.spec.mjs` cover the names and columns above.
- Video and poster re-recorded with `cd tests && npm run record:demos`.

## Deploy

Branch `generic-uploader-demo`, PR into `main`, `checks.yml` green before merge.
