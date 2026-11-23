# Real work demos (draft, not approved yet)

Status: gathering input. No site code is written until the UI tours are in and Yoav approves the approach.

## Goal

Each work on the site gets:

1. An interactive replica that looks and behaves like the real product. Visitors can click through it. Nothing real happens: no uploads, no network calls, no real data.
2. A short example video of the product in use, shown on the work's page.

Real names, accounts, client details and real numbers never appear. Everything is replaced with believable fake data.

## How we collect what the real product looks like

Yoav opens each product in Chrome and gives the Claude Chrome extension the brief below. The extension walks the UI in read-only mode and writes a structured report. Yoav pastes the report back here (and drops a few screenshots into a local folder that is never committed, so the look can be matched). The replica is built from the report.

Order: Mega Uploader first, then Toto Mundial, then Memesh.

## Video: open decision

- Option A (recommended): record the video from the replica itself, scripted with Playwright. No real data can leak, it matches the replica exactly, and it can be re-recorded whenever the replica changes.
- Option B: Yoav screen-records the real product with fake data loaded. Most authentic, but every frame has to be checked for real names and numbers.

## Open questions

- Which flows matter most per product (the extension report will suggest some).
- Video length and whether it autoplays muted on the work page.
- Whether the replica replaces the small desk object, or the desk keeps the small version and the work page gets the full replica.

## Security, observability, settings, testing, deploy

To be filled in once the approach is approved. Known now: replicas make no network calls and hold only fake data; screenshots with real data stay local and out of git; changes ship through this branch's PR (`real-work-demos` into `main`), checks must be green before merge.

## Brief for the Claude Chrome extension (Mega Uploader)

Reused for the other products by changing the product name.

```text
You are helping me rebuild a FAKE, interactive replica of this web app (Mega Uploader) for my portfolio site. Another AI agent will build the replica only from what you write, so it must be precise enough to rebuild the screens without seeing them.

SAFETY RULES (most important):
- Read-only tour. You may navigate, scroll, hover, open menus, tabs, dropdowns and dialogs, and close them with Cancel / X / Escape.
- Never press anything that does a real action: upload, publish, launch, save, submit, send, delete, duplicate, connect, pay, or anything that changes data or spends money. If you are not sure what a button does, do not press it. Describe it and mark it "not pressed".
- Do not type into fields that auto-save.

PRIVACY RULES:
- Never write real names, client or brand names, account or ad IDs, emails, URLs, campaign names, file names or real numbers (budgets, spend, counts, dates) in your report.
- Replace each with a believable fake of the same shape, and mark it, for example: campaign name -> "Spring Sale - Video A" [fake], budget -> "$1,250.00/day" [fake], 7-digit account ID -> "1234567" [fake].
- Do keep the exact UI wording of buttons, labels, headings, tabs, placeholders, tooltips and messages. Those are the product's own text, not private data.

WHAT TO DOCUMENT, FOR EVERY SCREEN, TAB, DIALOG AND PANEL:
1. Name and purpose in one line.
2. Layout: the regions top to bottom and left to right (header, sidebar, main area, footer), approximate widths and heights at your current window size, and what is fixed vs scrolling.
3. Every control: exact label, type (button, toggle, dropdown, checkbox, input, drag-and-drop zone, table row action, etc.), its current state, the options inside dropdowns, and what it does or would do.
4. States you can see or trigger safely: empty, loading, error, success, disabled, hover, selected, validation messages. Quote the exact text.
5. Data shown: tables and lists with their column names, one or two example rows with fake values, and how many rows are typical.
6. Look and feel: colors (read hex values from the page styles if you can), fonts and sizes, corner radius, borders, shadows, icon style, light or dark, spacing feel. Note any animation (progress bars, spinners, transitions) and how long it takes.
7. How you get here and where each control leads.

THEN WRITE:
A. A site map: every screen and how they connect.
B. The main flow a user goes through to do the core job, step by step, from first screen to "done", including what the screen shows at each step (for steps you could not press, describe what the button suggests will happen).
C. Your pick of the 2 or 3 moments that best show off the product in a 60-second demo, and why.
D. Anything you could not see or were not sure about, listed as questions for me.

Format: Markdown, one heading per screen, short bullet points, no screenshots embedded. Take screenshots for yourself as you go so your descriptions are accurate.
```
