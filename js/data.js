/* data.js: products come from the CSV; everything else is small dummy data that points at CSV SKUs. */

const T0 = Date.now();
const BASE_NOW = new Date('2026-10-28T17:30:00').getTime();   // prototype "today"
const now = () => BASE_NOW + (Date.now() - T0);                // simulated clock keeps ticking
const ts = (s) => new Date(s).getTime();
const VAT = 0.12;

/* ---------- CSV ---------- */
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const money = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;
function loadProducts() {
  const rows = parseCSV(CSV_TEXT.trim()).slice(1).filter(r => r.length >= 12);
  return rows.map(r => ({
    sku: r[0], name: r[1], category: r[2], brand: r[3], desc: r[4],
    price: money(r[5]), cost: money(r[6]), stock: parseInt(r[7], 10) || 0, rop: parseInt(r[8], 10) || 0,
    supplier: r[9], csvStatus: r[10], unit: r[11], archived: false
  }));
}

/* The CSV's three statuses: out at 0, low at or below the reorder point, otherwise in stock. */
const stockStatus = (stock, rop) => stock <= 0 ? 'out' : stock <= rop ? 'low' : 'in';
const STOCK_LABEL = { in: 'In stock', low: 'Low stock', out: 'Out of stock' };

/* ---------- Deterministic pseudo-random for dummy numbers ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- People ---------- */
const DISTRIBUTORS = [
  { id: 'roberto', name: 'Roberto Santos', shop: 'Santos Cue & Billiards', city: 'Quezon City', email: 'roberto@santoscue.ph', phone: '+63 917 555 0148', address: '45 Timog Avenue, Quezon City, Metro Manila' },
  { id: 'victoria', name: 'Victoria Reyes', shop: 'Victory Billiards Supply', city: 'Makati', email: 'victoria@victorybilliards.ph', phone: '+63 918 555 0147', address: '12 Pasong Tamo, Makati City' },
  { id: 'leonardo', name: 'Leonardo Cruz', shop: 'Cruz Sports Hub', city: 'Pasig', email: 'leo@cruzsports.ph', phone: '+63 917 555 0149', address: '88 Shaw Boulevard, Pasig City' },
  { id: 'georgia', name: 'Georgia Mendoza', shop: 'GM Pool Depot', city: 'Mandaluyong', email: 'georgia@gmpool.ph', phone: '+63 919 555 0147', address: '9 Boni Avenue, Mandaluyong City' },
  { id: 'olivia', name: 'Olivia Bautista', shop: "Olivia's Billiard Mart", city: 'Cebu City', email: 'olivia@oliviamart.ph', phone: '+63 932 555 0150', address: '21 Colon Street, Cebu City' },
  { id: 'darren', name: 'Darren Lim', shop: 'Lim Table Sports', city: 'Davao City', email: 'darren@limtables.ph', phone: '+63 917 555 0145', address: '5 Claveria Street, Davao City' },
  { id: 'jimmy', name: 'Jimmy Aguilar', shop: 'Aguilar Billiards', city: 'Taguig', email: 'jimmy@aguilarbilliards.ph', phone: '+63 920 555 0144', address: '30 29th Street, BGC, Taguig City' },
  { id: 'denmark', name: 'Denmark Villanueva', shop: 'Denmark Cue Works', city: 'Caloocan', email: 'denmark@cueworks.ph', phone: '+63 917 555 0143', address: '16 Rizal Avenue, Caloocan City' }
];
const ME_DIST = 'roberto';   // the signed-in distributor persona
const initials = (n) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* Roberto's shop levels (sku, on hand, reorder at). Other distributors are generated. */
const ROBERTO_STOCK = [
  ['BIL-CUE-001', 5, 6], ['BIL-CUE-002', 1, 4], ['BIL-CUE-003', 4, 6], ['BIL-TIP-001', 40, 15], ['BIL-CHK-001', 14, 10],
  ['BIL-CHK-002', 0, 5], ['BIL-RCK-001', 8, 5], ['BIL-GLV-001', 12, 6], ['BIL-BAL-001', 3, 3], ['BIL-CLN-002', 3, 6],
  ['BIL-BRG-002', 6, 4], ['BIL-ACC-003', 2, 2]
];
function buildShopStock(products) {
  const out = {};
  DISTRIBUTORS.forEach((d, di) => {
    const m = {};
    if (d.id === ME_DIST) ROBERTO_STOCK.forEach(([sku, q, r]) => { m[sku] = { qty: q, rop: r }; });
    else {
      const r = rng(100 + di);
      for (let k = 0; k < 8; k++) {
        const p = products[(di * 3 + k * 5) % products.length];
        const rop = Math.max(2, Math.round(p.rop * 0.7));
        m[p.sku] = { qty: Math.floor(r() * rop * 2.2), rop };
      }
    }
    out[d.id] = m;
  });
  return out;
}

/* ---------- Orders, returns, chat ---------- */
const hist = (...a) => a.map(([status, at]) => ({ status, at: ts(at) }));
function buildOrders(P) {
  const price = (sku) => P.find(p => p.sku === sku).price;
  const mk = (id, dist, placed, status, items, history, extra = {}) => ({
    id, dist, placed: ts(placed), status, items: items.map(([sku, qty]) => ({ sku, qty, price: price(sku) })), history, ...extra
  });
  return [
    mk('BM-2610-0152', 'roberto', '2026-10-28T09:12', 'New', [['BIL-CUE-001', 6], ['BIL-TIP-001', 20], ['BIL-CHK-001', 10]], hist(['New', '2026-10-28T09:12'])),
    mk('BM-2610-0151', 'victoria', '2026-10-28T08:40', 'New', [['BIL-BAL-001', 2], ['BIL-FLT-001', 1]], hist(['New', '2026-10-28T08:40'])),
    mk('BM-2610-0150', 'olivia', '2026-10-27T15:10', 'New', [['BIL-TBL-002', 1], ['BIL-BRG-001', 4]], hist(['New', '2026-10-27T15:10'])),
    mk('BM-2610-0149', 'leonardo', '2026-10-27T10:05', 'Processing', [['BIL-CUE-001', 4], ['BIL-SFT-002', 4]], hist(['New', '2026-10-27T10:05'], ['Processing', '2026-10-27T13:30'])),
    mk('BM-2610-0148', 'roberto', '2026-10-26T16:30', 'Shipped', [['BIL-CLN-001', 6], ['BIL-RCK-002', 10], ['BIL-ACC-002', 6]], hist(['New', '2026-10-26T16:30'], ['Processing', '2026-10-26T17:10'], ['Shipped', '2026-10-27T09:00'])),
    mk('BM-2610-0147', 'georgia', '2026-10-26T11:20', 'Shipped', [['BIL-CAS-001', 4], ['BIL-RCK-001', 10], ['BIL-ACC-002', 6]], hist(['New', '2026-10-26T11:20'], ['Processing', '2026-10-26T14:00'], ['Shipped', '2026-10-27T08:20'])),
    mk('BM-2610-0146', 'roberto', '2026-10-24T14:30', 'Delivered', [['BIL-RCK-001', 4], ['BIL-GLV-001', 6], ['BIL-CUE-003', 5]], hist(['New', '2026-10-24T14:30'], ['Processing', '2026-10-24T16:00'], ['Shipped', '2026-10-25T09:30'], ['Delivered', '2026-10-26T13:15'])),
    mk('BM-2610-0145', 'darren', '2026-10-23T15:48', 'Delivered', [['BIL-CHK-002', 6], ['BIL-RCK-002', 10], ['BIL-SFT-001', 2]], hist(['New', '2026-10-23T15:48'], ['Processing', '2026-10-23T17:00'], ['Shipped', '2026-10-24T09:00'], ['Delivered', '2026-10-25T11:40'])),
    mk('BM-2610-0144', 'jimmy', '2026-10-22T09:30', 'Cancelled', [['BIL-BAL-003', 10]], hist(['New', '2026-10-22T09:30'], ['Cancelled', '2026-10-22T11:05']), { reason: 'Distributor changed the quantity' }),
    mk('BM-2610-0143', 'denmark', '2026-10-21T13:15', 'Delivered', [['BIL-FLT-002', 2], ['BIL-CLN-001', 6]], hist(['New', '2026-10-21T13:15'], ['Processing', '2026-10-21T15:00'], ['Shipped', '2026-10-22T10:00'], ['Delivered', '2026-10-23T14:20'])),
    mk('BM-2610-0142', 'roberto', '2026-10-15T10:40', 'Delivered', [['BIL-GLV-002', 4], ['BIL-ACC-002', 8], ['BIL-CHK-001', 20]], hist(['New', '2026-10-15T10:40'], ['Processing', '2026-10-15T13:00'], ['Shipped', '2026-10-16T09:00'], ['Delivered', '2026-10-17T15:10'])),
    mk('BM-2610-0141', 'victoria', '2026-10-09T11:00', 'Delivered', [['BIL-BUT-001', 2], ['BIL-CAS-002', 4]], hist(['New', '2026-10-09T11:00'], ['Processing', '2026-10-09T14:00'], ['Shipped', '2026-10-10T09:00'], ['Delivered', '2026-10-11T12:00'])),
    mk('BM-2609-0140', 'georgia', '2026-09-30T10:20', 'Delivered', [['BIL-TIP-002', 10], ['BIL-CHK-001', 30]], hist(['New', '2026-09-30T10:20'], ['Processing', '2026-09-30T13:00'], ['Shipped', '2026-10-01T09:00'], ['Delivered', '2026-10-02T12:00'])),
    mk('BM-2609-0139', 'roberto', '2026-09-12T09:45', 'Delivered', [['BIL-CUE-002', 1], ['BIL-TIP-001', 30]], hist(['New', '2026-09-12T09:45'], ['Processing', '2026-09-12T11:00'], ['Shipped', '2026-09-13T09:00'], ['Delivered', '2026-09-14T12:00'])),
    mk('BM-2608-0138', 'leonardo', '2026-08-28T14:00', 'Delivered', [['BIL-BAL-001', 1], ['BIL-BRG-001', 4]], hist(['New', '2026-08-28T14:00'], ['Processing', '2026-08-28T15:00'], ['Shipped', '2026-08-29T09:00'], ['Delivered', '2026-08-30T12:00'])),
    mk('BM-2608-0137', 'roberto', '2026-08-05T10:10', 'Delivered', [['BIL-CHK-001', 20], ['BIL-GLV-001', 10], ['BIL-ACC-003', 2]], hist(['New', '2026-08-05T10:10'], ['Processing', '2026-08-05T12:00'], ['Shipped', '2026-08-06T09:00'], ['Delivered', '2026-08-07T12:00']))
  ];
}
function buildReturns() {
  const mk = (id, dist, order, sku, qty, cond, status, at, reason, note) => ({ id, dist, order, sku, qty, cond, status, at: ts(at), reason, note: note || '', photos: cond === 'damaged' ? 2 : 1, video: { name: `unboxing-${id}.mp4`, size: 60e6 + (parseInt(id.slice(4), 10) % 7) * 11e6, len: `1:${String(20 + (parseInt(id.slice(4), 10) % 6) * 7).padStart(2, '0')}` } });
  return [
    mk('RMA-031', 'roberto', 'BM-2610-0146', 'BIL-RCK-001', 2, 'good', 'Submitted', '2026-10-28T07:50', 'Wrong item. We received the wrong triangle rack template size. Items are unused and in the original packaging.'),
    mk('RMA-030', 'darren', 'BM-2610-0145', 'BIL-CHK-002', 3, 'damaged', 'Submitted', '2026-10-27T15:10', 'Damaged. Packaging was crushed in transit and the chalk cubes are broken.'),
    mk('RMA-029', 'roberto', 'BM-2610-0142', 'BIL-GLV-002', 1, 'damaged', 'Separate handling', '2026-10-23T11:05', 'Defective. Palm pad came loose after first use.', 'Defective stitching. Sent to the supplier warranty claim.'),
    mk('RMA-028', 'darren', 'BM-2610-0145', 'BIL-RCK-002', 5, 'good', 'Restocked', '2026-10-26T17:20', 'Wrong item. Received the wrong rack template size.', 'Inspected: sealed packs. Restocked.'),
    mk('RMA-027', 'roberto', 'BM-2610-0146', 'BIL-CUE-003', 1, 'damaged', 'Rejected', '2026-10-26T14:00', 'Damaged. House cue has a slight warp.', 'Photos show normal wear within tolerance. Rejected.')
  ];
}
function buildThreads() {
  const m = (from, at, text, read = true) => ({ from, at: ts(at), text, read });
  return [
    { id: 't1', dist: 'roberto', ctx: 'BM-2610-0152', msgs: [
      m('dist', '2026-10-28T09:20', 'Good morning! We just placed BM-2610-0152. Can you confirm the Apex Pro cues are available?'),
      m('supplier', '2026-10-28T09:31', 'Good morning Roberto! Yes, 25 Apex Pro cues are on hand. Your order is queued for processing.'),
      m('dist', '2026-10-28T09:36', 'Understood, thank you. Please prioritize the Apex Pro cues. We are almost out.', false)] },
    { id: 't2', dist: 'roberto', ctx: 'BM-2610-0146', msgs: [
      m('dist', '2026-10-28T07:52', 'Submitted RMA-031 for 2 triangle racks that arrived in the wrong size.'),
      m('supplier', '2026-10-28T08:20', 'Thanks Roberto. We will review RMA-031 today.', false)] },
    { id: 't3', dist: 'victoria', ctx: 'BM-2610-0151', msgs: [
      m('dist', '2026-10-28T08:55', 'Can we add 10 more boxes of chalk to this order?'),
      m('supplier', '2026-10-28T09:05', 'Order BM-2610-0151 is already in the queue. Please place a separate order for the extra 10.')] },
    { id: 't4', dist: 'georgia', ctx: 'BM-2610-0147', msgs: [
      m('supplier', '2026-10-28T08:10', 'Your order BM-2610-0147 has shipped. Expected delivery on Friday.'),
      m('dist', '2026-10-28T08:30', 'Great, thank you! See you Friday.')] },
    { id: 't5', dist: 'darren', ctx: 'BM-2610-0145', msgs: [
      m('dist', '2026-10-27T15:12', 'Submitted RMA-030 for the Taom chalk. Photos are attached in the request.')] },
    { id: 't6', dist: 'olivia', ctx: 'BM-2610-0150', msgs: [] },
    { id: 't7', dist: 'roberto', ctx: 'General', msgs: [] }
  ];
}
function buildNotifs() {
  const n = (id, kind, title, body, at, read, to) => ({ id, kind, title, body, at: ts(at), read, to });
  return {
    supplier: [
      n('sn1', 'order', 'New order BM-2610-0152', 'Roberto Santos placed an order for 3 products.', '2026-10-28T09:12', false, '#/s/orders/BM-2610-0152'),
      n('sn2', 'order', 'New order BM-2610-0151', 'Victoria Reyes placed an order for 2 products.', '2026-10-28T08:40', false, '#/s/orders/BM-2610-0151'),
      n('sn3', 'stock', 'Low stock: Velocity Carbon Fiber Cue', '4 left, reorder at 5.', '2026-10-28T08:00', false, '#/s/inventory/BIL-CUE-002'),
      n('sn4', 'return', 'Return RMA-031 submitted', 'Roberto Santos wants to return 2 Solid Oak Triangle Ball Racks.', '2026-10-28T07:50', false, '#/s/returns/RMA-031'),
      n('sn5', 'chat', 'New message from Roberto Santos', 'Understood, thank you. Please prioritize the Apex Pro cues...', '2026-10-28T09:36', false, '#/s/chat/t1'),
      n('sn6', 'order', 'New order BM-2610-0150', "Olivia Bautista placed an order for 2 products.", '2026-10-27T15:10', true, '#/s/orders/BM-2610-0150'),
      n('sn8', 'order', 'Payment overdue: BM-2610-0141', 'Victoria Reyes is 10 days past the Pay Later due date. Interest is growing.', '2026-10-28T08:05', false, '#/s/orders/BM-2610-0141'),
      n('sn9', 'order', 'Payment overdue: BM-2610-0142', 'Roberto Santos is 4 days past the Pay Later due date.', '2026-10-28T08:00', false, '#/s/orders/BM-2610-0142'),
      n('sn10', 'order', 'Pay Later due soon: BM-2610-0148', 'Roberto Santos should pay by Oct 30.', '2026-10-28T07:00', true, '#/s/orders/BM-2610-0148'),
      n('sn7', 'stock', 'Out of stock: Dragon Series House Cue 57"', '0 left, reorder at 15.', '2026-10-26T10:00', true, '#/s/inventory/BIL-CUE-003')
    ],
    distributor: [
      n('dn1', 'chat', 'New message from BilMagic Supply', 'Thanks Roberto. We will review RMA-031 today.', '2026-10-28T08:20', false, '#/d/chat/t2'),
      n('dn2', 'stock', 'Low stock at your shop', 'Velocity Carbon Fiber Cue: 1 left, reorder at 4.', '2026-10-28T07:30', false, '#/d/stock'),
      n('dn9', 'order', 'Payment overdue: BM-2610-0142', 'This order was due Oct 24. Interest of 2% per day is being added. Pay now to stop it.', '2026-10-28T08:00', false, '#/d/order/BM-2610-0142'),
      n('dn10', 'order', 'Payment due soon: BM-2610-0148', 'Pay by Oct 30 to avoid late interest.', '2026-10-28T07:00', false, '#/d/order/BM-2610-0148'),
      n('dn3', 'order', 'Order BM-2610-0148 shipped', 'Expected delivery in 1 to 2 days.', '2026-10-27T09:00', false, '#/d/order/BM-2610-0148'),
      n('dn4', 'return', 'Return RMA-029 handled separately', 'Defective item. Not restocked.', '2026-10-25T10:00', true, '#/d/orders/returns'),
      n('dn5', 'order', 'Order BM-2610-0146 delivered', 'Your order was delivered.', '2026-10-26T13:15', true, '#/d/order/BM-2610-0146')
    ]
  };
}

/* Sample sales numbers for charts: units sold per SKU in the last 30 days, daily order value for 90 days. */
function buildSales(P) {
  const r = rng(7);
  const sold30 = {};
  P.forEach(p => { sold30[p.sku] = Math.max(1, Math.round(22 * Math.pow(p.price / 450, -0.5) * (0.5 + r()))); });
  const rev30 = P.reduce((s, p) => s + sold30[p.sku] * p.price, 0);
  const w = [];
  const base = new Date(BASE_NOW); base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 90; i++) {
    const day = new Date(base.getTime() - (89 - i) * 864e5);
    const wk = day.getDay() === 0 ? 0.55 : day.getDay() === 6 ? 0.7 : 1;
    w.push({ date: day.getTime(), w: (0.7 + 0.6 * r()) * (1 + 0.004 * i) * wk });
  }
  const last30 = w.slice(60).reduce((s, x) => s + x.w, 0);
  const k = rev30 / last30;
  return { sold30, rev30, daily: w.map(x => ({ date: x.date, value: Math.round(x.w * k) })) };
}

/* ---------- Fresh state ---------- */
/* General chats: ordinary supplier-distributor conversation, kept apart from order and return chats */
const GENERAL_CHAT = {
  roberto: [
    ['d', '2026-08-07T15:30', 'Received BM-2608-0137 this afternoon. Everything is complete, thank you!'],
    ['s', '2026-08-08T09:10', 'Glad to hear it, Roberto. Let us know if you need anything ahead of the September rush.'],
    ['d', '2026-09-14T14:20', 'BM-2609-0139 arrived. Quick question: will you restock the Apex Pro cues before the end of the month?'],
    ['s', '2026-09-14T16:05', 'Yes, a new batch is due in the last week of September. I will message you once it lands.'],
    ['s', '2026-10-01T10:00', 'The new Apex Pro cue batch is in. Want us to reserve some for your next order?'],
    ['d', '2026-10-01T10:25', 'Great news. I will include them in my next order.'],
    ['d', '2026-10-17T17:00', 'BM-2610-0142 is here. One of the gloves has a loose palm pad, so I will file a return.'],
    ['s', '2026-10-17T17:20', 'Sorry about that. Please submit it under Orders & Returns with photos and we will inspect it.'],
    ['s', '2026-10-23T15:00', 'We reviewed RMA-029. It is a stitching defect, so we sent it to the supplier warranty claim.'],
    ['d', '2026-10-23T15:12', 'Understood, thank you for the quick turnaround.'],
    ['d', '2026-10-26T14:30', 'BM-2610-0146 arrived. The triangle racks are the wrong template size, so I will send a return request for two.'],
    ['s', '2026-10-26T14:40', 'Noted. Please make sure they are unused and in the original packaging.'],
    ['s', '2026-10-26T17:30', 'About RMA-027: the photos show normal wear, so we could not approve it. Happy to talk it through if you disagree.'],
    ['d', '2026-10-26T17:45', 'Okay, no problem. Thanks for explaining.'],
    ['d', '2026-10-28T14:00', 'Hi! Is there a price list update coming for the November chalk and tips?'],
    ['s', '2026-10-28T15:20', 'The updated price list goes out on November 1. Chalk prices stay the same and tips change slightly.', false]
  ],
  leonardo: [
    ['d', '2026-08-30T16:00', 'BM-2608-0138 arrived, thank you.'],
    ['s', '2026-08-31T09:00', 'You are welcome. Reach out any time you need a quote on tables.'],
    ['d', '2026-10-20T11:00', 'Do you ship tables to Cebu?'],
    ['s', '2026-10-20T11:30', 'Yes, tables ship by freight. Send us the model and we will quote the delivery.']
  ],
  georgia: [
    ['d', '2026-10-02T15:00', 'Received BM-2609-0140. The tips and chalk are all good.'],
    ['s', '2026-10-02T15:40', 'Great. Chalk has been selling fast this month, so order early if you need more.'],
    ['d', '2026-10-24T09:30', 'Planning ahead for a weekend event. Do you offer a bulk discount on chalk?'],
    ['s', '2026-10-24T10:10', 'For 50 boxes or more we can discuss a discount. Send us the quantity you need.']
  ],
  victoria: [
    ['d', '2026-10-11T14:10', 'BM-2610-0141 arrived, thank you!'],
    ['s', '2026-10-11T14:35', 'Great! Let us know how the butterfly cue case sells.'],
    ['d', '2026-10-27T09:00', 'Do you have chalk in the 12-box pack?'],
    ['s', '2026-10-27T09:40', 'We stock the 12-box pack. Place a separate order and we will prepare it.']
  ],
  jimmy: [
    ['d', '2026-10-22T09:50', 'I would like to change the quantity on my order. Is it still possible?'],
    ['s', '2026-10-22T10:20', 'The order is still being prepared, so the easiest way is to cancel it and place a new one.'],
    ['d', '2026-10-22T11:30', 'Done. I will place a new order with 6 instead.'],
    ['s', '2026-10-22T11:45', 'Thanks Jimmy, we will watch for it.']
  ],
  denmark: [
    ['d', '2026-10-23T16:00', 'BM-2610-0143 received. The flat cue tips are perfect.'],
    ['s', '2026-10-23T16:30', 'Glad to hear it.']
  ],
  darren: [
    ['d', '2026-10-25T13:00', 'Got BM-2610-0145 today. The rack template size is wrong. Can I return them?'],
    ['s', '2026-10-25T13:25', 'Yes, please file a return request and we will inspect them.'],
    ['s', '2026-10-26T21:00', 'RMA-028 is approved and restocked. Thanks for sending sealed packs.'],
    ['d', '2026-10-26T21:10', 'Thank you! The chalk in that order was crushed though, so I will send another request.'],
    ['d', '2026-10-28T16:50', 'Photos for the chalk are attached to my return request. Please take a look.', false]
  ],
  olivia: [
    ['d', '2026-10-27T16:00', 'Hi, when will BM-2610-0150 be processed? We are opening a new hall soon.'],
    ['s', '2026-10-28T09:15', 'It is in the queue for today, Olivia. I will update you once it is packed.']
  ]
};
function withGeneralChats(threads) {
  Object.entries(GENERAL_CHAT).forEach(([dist, rows]) => {
    let g = threads.find(x => x.dist === dist && x.ctx === 'General');
    if (!g) { g = { id: 'g-' + dist, dist, ctx: 'General', msgs: [] }; threads.push(g); }
    rows.forEach(([who, at, text, read = true]) => g.msgs.push({ from: who === 'd' ? 'dist' : 'supplier', at: ts(at), text, read }));
  });
  return threads;
}
/* A finished order or return posts a status into its own chat and a one-line entry into the distributor's General chat. */
const isRetCtx = (c) => /^RMA-/.test(c);
function closeChat(threads, distId, ctx, label, at, seen, detail) {
  const t = threads.find(x => x.dist === distId && x.ctx === ctx);
  if (t) { t.msgs.push({ from: 'system', at, text: label, detail, read: true }); t.closed = label; t.seen = { supplier: !!seen, distributor: !!seen }; }
  let g = threads.find(x => x.dist === distId && x.ctx === 'General');
  if (!g) { g = { id: 'g-' + distId, dist: distId, ctx: 'General', msgs: [] }; threads.push(g); }
  g.msgs.push({ from: 'system', kind: 'status', at, label, ctx, detail, text: (isRetCtx(ctx) ? 'Return ' : 'Order ') + ctx + ' \u00b7 ' + label, ref: t ? t.id : null, read: true });
}
/* every return request has its own chat, like every order; finished ones start already closed */
function withClosedChats(threads, returns, orders) {
  returns.forEach(r => threads.push({ id: 'th-' + r.id, dist: r.dist, ctx: r.id, msgs: [] }));
  const items = [];
  orders.forEach(o => { if (o.status === 'Delivered' || o.status === 'Cancelled') items.push([o.dist, o.id, o.status, o.history[o.history.length - 1].at]); });
  returns.forEach(r => { if (r.status !== 'Submitted') items.push([r.dist, r.id, r.status === 'Rejected' ? 'Rejected' : 'Approved', r.at + 3 * 3600e3, r.status === 'Rejected' ? r.note : '']); });
  withGeneralChats(threads);
  items.sort((x, y) => x[3] - y[3]).forEach(([dist, ctx, label, at, detail]) => closeChat(threads, dist, ctx, label, at, true, detail));
  threads.filter(t => t.ctx === 'General').forEach(t => t.msgs.sort((a, b) => a.at - b.at)); // status lines and chat in time order
  return threads;
}
/* Retail sales made outside the B2B system: a small steady daily base plus a few logged sales. */
function buildRetail(P, sales) {
  const r = rng(11);
  const daily = sales.daily.map(d => { const wk = new Date(d.date).getDay(); return { date: d.date, value: Math.round(d.value * (0.18 + 0.12 * r()) * (wk === 0 || wk === 6 ? 1.35 : 1)) }; });
  const pick = [['BIL-CHK-001', 6, '2026-10-26T15:20'], ['BIL-TIP-002', 10, '2026-10-24T11:05'], ['BIL-GLV-001', 2, '2026-10-22T17:40'], ['BIL-CLN-001', 3, '2026-10-19T13:10'], ['BIL-ACC-002', 4, '2026-10-17T10:30'], ['BIL-CHK-002', 5, '2026-10-14T16:15']];
  const log = pick.filter(x => P.find(p => p.sku === x[0])).map((x, i) => ({ id: 'rs-seed' + (i + 1), sku: x[0], qty: x[1], price: P.find(p => p.sku === x[0]).price, at: ts(x[2]) }));
  return { daily, log };
}
/* dummy payment methods, statuses and transactions for the sample orders */
function withPayments(orders) {
  const fixed = { 'BM-2610-0152': ['cod'], 'BM-2610-0151': ['bank'], 'BM-2610-0150': ['cod'], 'BM-2610-0149': ['ewallet'], 'BM-2610-0148': ['later', null, '2026-10-30'], 'BM-2610-0147': ['bank', 'submitted'], 'BM-2610-0146': ['ewallet'], 'BM-2610-0142': ['later', null, '2026-10-24'], 'BM-2610-0141': ['later', null, '2026-10-18'], 'BM-2609-0140': ['later', 'paid', '2026-10-09'], 'BM-2610-0145': ['bank'], 'BM-2609-0139': ['cod'], 'BM-2608-0137': ['ewallet'] };
  const cycle = ['cod', 'ewallet', 'bank'], wallets = ['GCash', 'Maya', 'GrabPay'], ymdOf = (at) => { const x = new Date(at); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0'); };
  let seq = 0;
  [...orders].reverse().forEach((o, i) => {
    const [method = cycle[i % 3], force, dueStr] = fixed[o.id] || [], total = Math.round(o.items.reduce((s, x) => s + x.qty * x.price, 0) * 100) / 100;
    const delivered = o.history.find(h => h.status === 'Delivered'), tx = [];
    const add = (at, detail, status, m = method) => tx.push({ id: 'TXN-' + ymdOf(at) + '-' + String(++seq).padStart(4, '0'), at, method: m, detail, amount: total, status });
    let status, extra = {};
    if (method === 'later') {
      const due = new Date(dueStr + 'T00:00').getTime();
      extra = { due };
      if (force === 'paid') {
        const paidAt = new Date('2026-10-12T14:20').getTime(), late = 3, intr = Math.round(total * 0.02 * late * 100) / 100;
        tx.push({ id: 'TXN-' + ymdOf(paidAt) + '-' + String(++seq).padStart(4, '0'), at: paidAt, method: 'bank', detail: 'Card ending 4242 \u00b7 3 days late', amount: Math.round((total + intr) * 100) / 100, status: 'Success' });
        status = 'paid'; Object.assign(extra, { frozen: true, lateDays: late, interest: intr });
      } else status = 'later';
    } else if (o.status === 'Cancelled') status = 'void';
    else if (o.status === 'Delivered') {
      status = 'paid';
      if (method === 'cod') add(delivered.at, 'Cash on delivery', 'Success');
      else if (method === 'ewallet') add(o.placed + 45 * 60e3, wallets[i % 3] + ' \u00b7 0917 *** ' + (4200 + i * 37), 'Success');
      else { if (o.id === 'BM-2610-0145') add(o.placed + 20 * 60e3, 'Card ending 0002', 'Failed'); add(o.placed + 90 * 60e3, i % 2 ? 'Card ending 4242' : 'Bank transfer \u00b7 ref 77' + (4010 + i) + '3', 'Success'); }
    } else if (force === 'submitted') { status = 'submitted'; add(o.placed + 2 * 3600e3, 'Bank transfer \u00b7 ref 55' + (1200 + i * 7) + '8', 'Pending'); }
    else status = method === 'cod' ? 'cod' : 'unpaid';
    o.pay = { method, status, txns: tx, ...extra };
  });
  return orders;
}
function seedState() {
  const products = loadProducts();
  const orders = withPayments(buildOrders(products)), returns = buildReturns(), sales = buildSales(products);
  return {
    role: null,
    products,
    shop: buildShopStock(products),
    orders,
    returns,
    threads: withClosedChats(buildThreads(), returns, orders),
    notifs: buildNotifs(),
    cart: [],
    sales,
    retail: buildRetail(products, sales),
    profile: {
      supplier: { name: 'BilMagic Admin', email: 'admin@bilmagic.com', company: 'BilMagic Supply Inc.' },
      distributor: { ...DISTRIBUTORS[0], language: 'English' }
    },
    prefs: {
      supplier: { stock: true, orders: true, status: true, returns: true, chat: true },
      distributor: { orders: true, stock: true, chat: false }
    },
    tools: { slow: false, error: false },
    ui: {}
  };
}
