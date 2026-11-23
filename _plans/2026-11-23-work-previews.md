# Work previews: the real product on the Work card and the desk

Status: approved 2026-11-23 (card A + desk B, from a mockup of four options).

## Problem

The Mega Uploader now has a replica, a video and a poster, but the two places most visitors see first don't show any of it. The Work card is a plain title on ink. The desk device runs a made-up "Upload 3 sample files" toy that has nothing to do with the real tool.

## Decisions

| Where | Chosen | Rejected and why |
|---|---|---|
| Work card | The product fills the cover: the poster, zoomed to a readable crop, fading to ink under the title. Hovering (fine pointers only) plays the demo video in the same crop. | A tilted window peeking out of an ink card: fights the title, busier. |
| Desk device | A tiny Run live: five rows from the video (CA · Smart Home, FR · Meal Kits, IT · Language Apps, AU · Credit Cards, NL · Pet Food). Press RUN LIVE, rows upload one by one, Credit Cards fails on policy, a counter reads 4 live · 1 failed, then RUN AGAIN. | The poster on the device screen with play/try buttons: unreadable at desk size, and turns the work into a picture. |

## Details

- A card shows a picture when its work has one: the replica's poster (plus hover video), else the work's own media (image or video, fitted). Otherwise it stays title-only. So Memesh gets a picture as soon as Yoav uploads a screenshot in the admin.
- The card video loads nothing until the first hover (`preload="none"`, src set on hover). Touch screens and reduced motion get the still only.
- The desk toy keeps `data-widget="uploader"` and shared state, like the Toto demo. The old project-page upload queue (unreachable since the replica replaced it) is removed.

## Lazy-user walkthrough

- Work page, laptop: the card already shows the app. Hover and it moves. Click opens the project.
- Work page, phone: the still shows; tap opens the project.
- Desk: the device says RUN LIVE in accent, so it reads as the thing to press. Rows animate; the failure is red with "policy", matching the video. RUN AGAIN resets. Dragging the device still works; the button doesn't start a drag.
- Refresh resets the toy. Nothing is stored.

## Security

No new inputs, no network calls beyond the existing poster and video files. Toy text is fixed strings, set with textContent.

## Testing

- Unit: render puts the poster and a lazy video in a replica work's card, media in a media work's card, nothing in a plain card. Desk keeps one uploader widget. Generated files regenerated.
- Browser: the desk toy runs to 4 live · 1 failed and resets; the card video has no src until hover, then plays; phone/tablet/laptop routes still fit.
