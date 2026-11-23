# Mega Uploader demo: make it generic

Status: approved 2026-11-23 (option A). Follows `2026-11-23-real-work-demos.md`.

## Problem

The replica's names and numbers were invented, but its structure copied the real tool closely enough that anyone who knows the product or the business would recognize it: the campaign naming convention, the search-feed partner model (RSOC, "via Northwind", the partner link columns and tracking parameters), the ad network mix, profit per network, real-sounding error messages, the internal sidebar pages, upload trace step names and campaign ID formats.

## Goal

Visitors get the same experience (grid, auto-fill, link step, Run live with the streaming log, Run history with drill-down, dashboard, Ask drawer). Someone who knows the real tool sees a generic multi-platform campaign launcher, not their tool.

## Decisions

| Area | Before | After |
|---|---|---|
| Campaign name | prefix-geo-vertical-partnerId-mmdd-platform-strategy | `GEO · Vertical · 23 Nov · #7`, readable, no codes |
| Partner model | Feeds (Northwind RSOC...), "Resolve Northwind Links", Northwind ID / Website From Northwind / Dest ID / Tracking Code | Brands (invented clients). "Create tracking links" fills two columns: Link ID and Tracked link (a short link) |
| Columns | Prefix, Country + Vertical, Offer ID, Website URL, Asset 1 URL, Open Comments | Prefix and Country + Vertical removed. Product ID, Landing page, Image, Notes |
| Platforms | 12, mostly native networks | 8 mainstream: Facebook, Google Ads, TikTok, Pinterest, Snapchat, LinkedIn, Microsoft Ads, X |
| Verticals | Arbitrage-style (dental implants, senior living...) | Consumer categories. Credit Cards stays so one row fails on the financial-claims policy |
| Strategies | Semi · CPC, Smart · CPA... | Lowest cost, Target CPA, Target ROAS, Manual CPC |
| Accounts | Northwind EN 3... | Regions: North America 1, Europe 1... chosen by geo |
| Dashboard | Spend, revenue, profit, ROAS, profit per platform, articles by feed | Campaigns launched, live, success rate, launches per platform, creatives by brand. No money |
| Errors | Shaped like real platform logs (site 'nw', Site_1..3) | Short generic messages |
| Sidebar | Real internal pages (Bulk World tasks, Buyer prefixes, Self Heal, Source Check...) | A short generic set |
| Notifications | Account verification sheet, internal bug tracker | Account billing notes, team activity |
| Trace and IDs | northwind_create, `<platform>_platform_campaign`, 16-digit IDs | tracking_link, campaign, creatives, summary. 12-character IDs |
| Articles | Library, "Create articles", article picker | Removed or renamed to landing page |
| Stale rows | "Rebuild for today" for links dated an earlier day | Removed |
| Workspace tabs | Wave 0, Wave 1... | Spring launch, Retargeting... |

## Rejected

- B, change the business entirely: leaks least but hides the clever part and is a bigger rewrite.
- C, cut screens: fastest, but loses most of the demo.

## Not changed (flagged to Yoav)

- The visual look still follows the real product's tokens and layout. Someone who has used the real tool could still recognize the shell.
- The product name "Mega Uploader" stays, since the work is listed under that name.

## Guards

- `tests/unit/replica-privacy.test.mjs`: add hashes for any real terms Yoav names.
- `tests/unit/replica-logic.test.mjs` and `tests/browser/replica.spec.mjs` updated for the new names and columns.
- Video and poster re-recorded with `cd tests && npm run record:demos`.

## Deploy

Branch `generic-uploader-demo`, PR into `main`, `checks.yml` green before merge.
