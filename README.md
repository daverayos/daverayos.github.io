# BilMagic Inventory System — v3 prototype

A front-end-only, clickable prototype of the BilMagic wholesale inventory system (supplier workspace and distributor portal).
Plain HTML, CSS and JavaScript. No build step, no framework, no back-end. All data is dummy data from `data/billiard_inventory.csv`.

## Open it
Double-click `index.html` (works from the file system), or serve the folder with any static server, e.g. `python3 -m http.server`.

## Sign in
Pick **Supplier** or **Distributor**, enter any email and a password of 6+ characters. (`wrongpass` shows the error state.)
- Supplier: Bilmagic Admin (full catalog, orders, returns, distributors, chat, reports, settings)
- Distributor: Roberto Santos, Santos Cue & Billiards, Quezon City (catalog, cart, orders and returns, my stock, chat, reports, settings)

## Screens
Supplier (`#/s/...`): dashboard, inventory (+ product drawer, adjust stock, add/edit, archive/restore), orders (+ drawer, advance/cancel), distributors, returns (+ process), messages, reports, notifications, settings, more (phone).
Distributor (`#/d/...`): home (+ reorder low items), catalog, product, cart, order placed, orders and returns (+ order detail, cancel, reorder again), new return request, return submitted, my stock, messages, reports, notifications, settings, menu (phone).
Shared: sign-in, forgot password, sign-out dialog.

## Responsive behaviour
- 1024px and wider: full black sidebar, tables, drawers.
- 768–1023px: icon-only sidebar, secondary table columns hidden.
- Under 768px: top bar + bottom tab bar, tables become cards, dialogs become bottom sheets.

## Business rules in the prototype
- Stock status (3 tiers): Out of stock at 0, Low stock at or below the reorder point, otherwise In stock.
- Order total = subtotal + 12% VAT.
- Supplier "Shipped" deducts supplier stock (blocked when short); "Delivered" adds to the distributor's shop stock.
- Returns: submitting never restocks. Processing as Good restocks, Damaged goes to separate handling, Reject to rejected.
- Photos on returns: JPG/PNG/WebP, up to 5 MB, max 3; required when reporting damage.
- State is in memory only. Reload or *Settings > Reset sample data* restores the original data.

## Code map
```
index.html          shell
css/tokens.css      colours, spacing (black + gold)
css/base.css        layout, shell, responsive rules
css/components.css  buttons, cards, tables, overlays, charts
js/csv.js           the CSV embedded as text (so it works from file://)
js/data.js          CSV parsing, seed data
js/store.js         in-memory state + all actions
js/ui.js            helpers, icons, charts, overlay system
js/app.js           router, shell, sign-in, notifications
js/supplier.js      supplier pages
js/distributor.js   distributor pages
js/main.js          boot
```

## Swapping the data
Edit `data/billiard_inventory.csv`, then regenerate `js/csv.js` (one line wraps the file in a template string:
`const CSV_TEXT = \`...\`;`). Required columns are the same as the original file.
