# I.M Engineering & Construction replica (im-eng.co.il)

## Goal

Add the I.M website as a work: a clickable copy of the site on its project page, a recorded video, a desk object and a work card. It shows web design work for a real client, in Hebrew, right to left, on desktop and phone.

## Decisions (Yoav, 2026-11-23)

- **Real content:** the real company, owner, contact details, clients and project texts, as the tour spec asks.
- **Photos:** the real photos from im-eng.co.il (hero, portrait, projects, galleries, client logos), compressed for the web.
- **Frame:** a desktop window with a Desktop / Phone switch. The same replica, shown at 390 x 844 in a phone frame when switched. Phones get the phone view directly instead of the video.
- **No "Powered by Kritix.io"** line in the footer.
- **Live-site issues fixed in the replica:** real cities instead of "[עיר]" (from the project pages; if a city isn't given, the city is left out, never guessed), the "ללל" typo, the duplicate law-office project removed, projects without photos left out, project details as a list and "The challenge" as a heading.

## Alternatives rejected

- Placeholder photos: no permission question, but the site's premium feel comes from the photos.
- Desktop only or phone only: the site has a full mobile design worth showing.

## Approach

- `demos/im-eng/`: `index.html`, `app.css` (desktop plus a mobile layout under 768 px), `js/data.js` (all texts), `js/logic.js` (pure: form validation, project lookup), screens in memory (home sections, all projects, a project page), the accessibility panel (all 12 options working), a mocked contact form (800 ms delay, then success; nothing is sent).
- Links that would leave the demo (WhatsApp, phone, email, Instagram) show a short note instead of opening.
- Portfolio: a new `frames` option on a replica (`['desktop', 'phone']`) adds a Desktop / Phone switch to the device bar. Up to 900 px wide, such a replica opens straight in its phone view.

## Privacy and security

- Real names are used with Yoav's say-so, so the privacy test is not changed for this replica.
- The form sends nothing. No third-party scripts; Heebo from Google Fonts only.
- The tour spec and screenshots stay out of git (`.gitignore` already covers them).

## Open questions

- Ido should be fine with his photos and details on the portfolio (Yoav's call).
