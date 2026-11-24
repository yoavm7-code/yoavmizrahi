# A separate desk order for phones

Approved by Yoav on 2026-11-24: "Separate order per device".

## Goal

In the admin, Yoav sets the order of the desk separately for computers and for phones. Today one list (`desk.order`) drives both:

- on computers, the desk arranges itself from that order;
- on phones, everything stacks top to bottom in that order.

## Requirements

- Two orders: **Computer** (today's `desk.order`, unchanged) and **Phone** (new `desk.phoneOrder`).
- Existing content keeps working. Without a phone order, phones use the computer order, exactly as today, until Yoav changes it.
- Tablets (up to 900px) stack like phones, so they follow the phone order.
- On computers nothing changes: same layout engine, same order.
- Keyboard and screen reader order matches what is on screen on both, so the phone order reorders the page, not just the picture.

## Out of scope

Placing objects at exact spots on computers ("Drag to place"). Yoav chose the order lists instead.

## Approach

### Data (`js/schema.js`)

- `desk.phoneOrder`: a list of desk keys, the same keys as `desk.order` (`note`, `monitor`, `tapes`, `work:<id>`).
- `normalize()` repairs it the same way as `order`: unknown and repeated keys are dropped, and new keys are appended. When it is missing, it starts as a copy of `order`.
- When a work is added or renamed, both orders are updated (`admin/panels.js`).

### Page (`js/render.js` and `js/main.js`)

- The markup stays in the computer order, so the desk layout and its tests are untouched.
- The desk element carries `data-phone-order="note monitor tapes work:a ..."`.
- `main.js`:
  - Up to 900px, it moves the desk's objects into the phone order, with the tapes moving as one group.
  - Wider, it puts them back in the computer order.
  - It runs at start and whenever the screen crosses 900px.

### Admin (`admin/panels.js`)

- The "Order on the desk" section gets a **Computer / Phone** switch, the same `.seg` control the preview uses, above one list.
  - The list shows the chosen order with the existing up and down buttons.
  - Choosing Phone also switches the preview to its phone size, and Computer to desktop, so the change is visible straight away. This needs `preview.setDevice` exported from `admin/preview.js`.
- On Phone, a **Same as computer** button copies the computer order. It is greyed out when the two already match.
- Intro text: "Top of the list comes first. On computers the desk arranges itself left to right, top to bottom. On phones and tablets everything stacks top to bottom."
- `publish.js` names the change: "Changed the order of the desk on phones".

## How, after the council (execution only)

- **Phones follow the computer order until changed.** `phoneOrder` is `null` until Yoav moves something on the phone list. A saved copy would quietly stop following the computer order after the first save, and would confuse the draft merge.
- **The page is written in the phone order, and computers are put back.** The policy forbids inline styles, so a CSS `order` fallback is impossible. Phones therefore get the right order before any script runs. On computers the desk stays hidden until it is laid out, so moving objects there is never seen. The layout packs in a list kept in the computer order, never the live page order. Home layers follow the page order after each move.
- **Admin wording:**
  - The tabs are "On computers" and "On phones and tablets", the same words as the hints.
  - A status line says whether phones follow the computer order or have their own.
  - The button is "Copy computer order".
  - The tab and the preview's size switch move together.
  - On the phone tab the tapes are just "Tapes".
- **Publish** names a change to the phone order. A work added or removed doesn't count as reordering phones.

## Security

- Content only, no new hosts and no CSP change.
- Keys are checked against `deskKeys()` in `normalize()`.
- The attribute is written through the escaping `html` template.
- `main.js` only moves elements it finds by `data-obj` / `data-obj-group`. An unknown key does nothing.

## Observability

- Site, behind `?debug`: `[desk order] { device, keys }` whenever the order is applied.
- Admin, which always logs: `[admin desk] order moved { device, from, to }`, and `[admin desk] phone order reset`.

## Settings

The phone order is itself the new setting, grouped with the computer order in one place. Nothing else is exposed.

## Testing

**Unit (`schema.test.mjs`, `render.test.mjs`):**

- `phoneOrder` defaults to the computer order.
- Unknown and repeated keys are dropped, and new works are added.
- The page writes `data-phone-order`.

**Browser (`site.spec.mjs`):**

- At phone and tablet width, the desk's objects are in the phone order in the page, which also sets the Tab order.
- At laptop width they are in the computer order.
- Crossing 900px swaps between the two.

**Admin (fake GitHub, `admin-*.spec.mjs` pattern):**

- The switch shows each list.
- Moving an item on Phone changes only `phoneOrder`.
- The preview follows the switch.
- "Same as computer" copies the order.
- Publishing writes both orders.

## Deploy

- Branch `phone-order`, then one PR into `main`.
- The checks must pass, then Yoav merges.
- Rollback: revert the PR. Content saved with `phoneOrder` stays valid, because older code ignores the key.
