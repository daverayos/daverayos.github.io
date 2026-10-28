/* store.js: in-memory state and actions. Nothing is saved anywhere; reload or "Reset sample data" restores the CSV values. */

let S = seedState();
const FORM = {};            // values of the form currently open in an overlay or page
const getU = (k, d) => (S.ui[k] === undefined ? d : S.ui[k]);

/* ---------- Lookups ---------- */
const prod = (sku) => S.products.find(p => p.sku === sku);
const dist = (id) => DISTRIBUTORS.find(d => d.id === id);
const orderById = (id) => S.orders.find(o => o.id === id);
const returnById = (id) => S.returns.find(r => r.id === id);
const threadById = (id) => S.threads.find(t => t.id === id);
const catalog = () => S.products.filter(p => !p.archived);
const categories = () => [...new Set(S.products.map(p => p.category))].sort();
const suppliers = () => [...new Set(S.products.map(p => p.supplier))].sort();
const pStatus = (p) => stockStatus(p.stock, p.rop);
const sev = { out: 0, low: 1, in: 2 };

const orderSub = (o) => o.items.reduce((s, i) => s + i.qty * i.price, 0);
const orderVat = (o) => Math.round(orderSub(o) * VAT * 100) / 100;
const orderTotal = (o) => orderSub(o) + orderVat(o);
const orderUnits = (o) => o.items.reduce((s, i) => s + i.qty, 0);

const myOrders = () => S.orders.filter(o => o.dist === ME_DIST);
const myReturns = () => S.returns.filter(r => r.dist === ME_DIST);
const myThreads = () => S.threads.filter(t => t.dist === ME_DIST);
const shopRows = (distId = ME_DIST) => Object.entries(S.shop[distId] || {}).map(([sku, v]) => ({ sku, p: prod(sku), qty: v.qty, rop: v.rop, status: stockStatus(v.qty, v.rop) })).filter(r => r.p);

const unreadChat = (role) => S.threads.reduce((n, t) => {
  if (role === 'distributor' && t.dist !== ME_DIST) return n;
  return n + t.msgs.filter(m => !m.read && m.from === (role === 'supplier' ? 'dist' : 'supplier')).length;
}, 0);
const unreadNotifs = (role) => S.notifs[role].filter(n => !n.read).length;
const newOrderCount = () => S.orders.filter(o => o.status === 'New').length;
const reviewCount = () => S.returns.filter(r => r.status === 'Submitted').length;

function pushNotif(role, kind, title, body, to) {
  S.notifs[role].unshift({ id: 'n' + Math.random().toString(36).slice(2, 8), kind, title, body, at: now(), read: false, to });
}

/* ---------- Inventory (supplier) ---------- */
function alertIfCrossed(p, prev) {
  const cur = pStatus(p);
  if (cur !== prev && cur !== 'in') pushNotif('supplier', 'stock', (cur === 'out' ? 'Out of stock: ' : 'Low stock: ') + p.name, `${p.stock} left, reorder at ${p.rop}.`, '#/s/inventory/' + p.sku);
}
function adjustStock(sku, mode, qty) {
  const p = prod(sku), prev = pStatus(p);
  p.stock = mode === 'add' ? p.stock + qty : mode === 'remove' ? Math.max(0, p.stock - qty) : qty;
  alertIfCrossed(p, prev);
  return p;
}
function saveProduct(d, mode) {
  if (mode === 'edit') { Object.assign(prod(d.sku), d); return prod(d.sku); }
  const p = { ...d, archived: false }; S.products.push(p); return p;
}
const archiveProduct = (sku) => { prod(sku).archived = true; };
const restoreProduct = (sku) => { prod(sku).archived = false; };

/* ---------- Orders ---------- */
const NEXT = { New: 'Processing', Processing: 'Shipped', Shipped: 'Delivered' };
function advanceOrder(id) {
  const o = orderById(id), next = NEXT[o.status];
  if (!next) return { ok: false, msg: 'This order cannot move forward.' };
  if (next === 'Shipped') {
    const short = o.items.find(i => prod(i.sku).stock < i.qty);
    if (short) { const p = prod(short.sku); return { ok: false, msg: `Not enough stock for ${p.name}: ${p.stock} on hand, ${short.qty} needed. Adjust stock first.` }; }
    o.items.forEach(i => { const p = prod(i.sku), prev = pStatus(p); p.stock -= i.qty; alertIfCrossed(p, prev); });
  }
  if (next === 'Delivered') {
    const m = S.shop[o.dist];
    o.items.forEach(i => { if (m[i.sku]) m[i.sku].qty += i.qty; else m[i.sku] = { qty: i.qty, rop: Math.max(2, Math.round(prod(i.sku).rop * 0.7)) }; });
  }
  o.status = next; o.history.push({ status: next, at: now() });
  if (o.dist === ME_DIST) pushNotif('distributor', 'order', `Order ${o.id} ${next === 'Processing' ? 'is being processed' : next.toLowerCase()}`, next === 'Shipped' ? 'Expected delivery in 1 to 2 days.' : next === 'Delivered' ? 'Your shop stock was updated.' : 'We are preparing your items.', '#/d/order/' + o.id);
  return { ok: true, msg: `${o.id} is now ${next}.` };
}
function cancelOrder(id, reason, by) {
  const o = orderById(id);
  o.status = 'Cancelled'; o.reason = reason; o.history.push({ status: 'Cancelled', at: now() });
  if (by === 'supplier' && o.dist === ME_DIST) pushNotif('distributor', 'order', `Order ${o.id} was cancelled`, reason, '#/d/order/' + o.id);
  if (by === 'distributor') pushNotif('supplier', 'order', `Order ${o.id} was cancelled`, `${dist(o.dist).name}: ${reason}`, '#/s/orders/' + o.id);
}
function nextOrderId() {
  const d = new Date(now()), yymm = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  const seq = Math.max(...S.orders.map(o => parseInt(o.id.slice(-4), 10))) + 1;
  return `BM-${yymm}-${String(seq).padStart(4, '0')}`;
}
function placeOrder(items) {
  const o = { id: nextOrderId(), dist: ME_DIST, placed: now(), status: 'New', items: items.map(i => ({ sku: i.sku, qty: i.qty, price: prod(i.sku).price })), history: [{ status: 'New', at: now() }] };
  S.orders.unshift(o);
  pushNotif('supplier', 'order', 'New order ' + o.id, `${dist(ME_DIST).name} placed an order for ${o.items.length} product${o.items.length > 1 ? 's' : ''}.`, '#/s/orders/' + o.id);
  return o;
}

/* ---------- Cart (distributor) ---------- */
const maxQty = (sku) => Math.max(0, prod(sku).stock);
function cartAdd(sku, qty) {
  const max = maxQty(sku); if (max <= 0) return { ok: false, msg: 'This item is out of stock.' };
  const l = S.cart.find(c => c.sku === sku);
  const want = (l ? l.qty : 0) + qty;
  const q = Math.min(want, max);
  if (l) l.qty = q; else S.cart.push({ sku, qty: q });
  return { ok: true, capped: want > max, qty: q };
}
function cartSet(sku, qty) {
  const l = S.cart.find(c => c.sku === sku); if (!l) return;
  l.qty = Math.max(1, Math.min(qty || 1, maxQty(sku)));
}
const cartRemove = (sku) => { S.cart = S.cart.filter(c => c.sku !== sku); };
const cartCount = () => S.cart.reduce((n, c) => n + c.qty, 0);
function cartTotals(lines = S.cart) {
  const sub = lines.reduce((s, c) => s + c.qty * prod(c.sku).price, 0);
  const vat = Math.round(sub * VAT * 100) / 100;
  return { sub, vat, total: sub + vat };
}
function suggestQty(sku) {
  const r = (S.shop[ME_DIST] || {})[sku];
  const need = r ? Math.max(1, r.rop * 2 - r.qty) : 1;
  return Math.max(1, Math.min(need, maxQty(sku) || 1));
}

/* ---------- Returns ---------- */
function submitReturn(d) {
  const seq = Math.max(...S.returns.map(r => parseInt(r.id.slice(4), 10))) + 1;
  const r = { id: 'RMA-' + String(seq).padStart(3, '0'), dist: ME_DIST, order: d.order, sku: d.sku, qty: d.qty, cond: d.cond, status: 'Submitted', at: now(), reason: d.reason, note: '', photos: d.photos };
  S.returns.unshift(r);
  pushNotif('supplier', 'return', `Return ${r.id} submitted`, `${dist(ME_DIST).name} wants to return ${r.qty} × ${prod(r.sku).name}.`, '#/s/returns/' + r.id);
  return r;
}
function processReturn(id, decision, note) {
  const r = returnById(id), p = prod(r.sku);
  if (decision === 'good') { p.stock += r.qty; r.status = 'Restocked'; }
  else if (decision === 'damaged') r.status = 'Separate handling';
  else r.status = 'Rejected';
  r.note = note || ''; r.done = now();
  if (r.dist === ME_DIST) pushNotif('distributor', 'return', `Return ${r.id} ${r.status === 'Restocked' ? 'was restocked' : r.status === 'Rejected' ? 'was rejected' : 'is handled separately'}`, r.note || 'See the return for details.', '#/d/orders/returns');
  return r;
}

/* ---------- Chat ---------- */
function ensureThread(distId, ctx) {
  let t = S.threads.find(x => x.dist === distId && x.ctx === ctx);
  if (!t) { t = { id: 't' + (S.threads.length + 1) + Math.random().toString(36).slice(2, 4), dist: distId, ctx, msgs: [] }; S.threads.push(t); }
  return t;
}
function markThreadRead(t, role) {
  t.msgs.forEach(m => { if (m.from === (role === 'supplier' ? 'dist' : 'supplier')) m.read = true; });
}
const lastMsg = (t) => t.msgs[t.msgs.length - 1];
const threadTime = (t) => (lastMsg(t) ? lastMsg(t).at : 0);
function sendMessage(tid, from, text, onReply) {
  const t = threadById(tid);
  t.msgs.push({ from, at: now(), text, read: false });
  // simulated reply so the prototype feels alive
  const other = from === 'supplier' ? 'dist' : 'supplier';
  setTimeout(() => {
    const reply = other === 'dist' ? 'Thanks for the update. We will check and get back to you.' : 'Thanks for your message. Our team will look into this and reply shortly.';
    t.msgs.push({ from: other, at: now(), text: reply, read: false });
    if (other === 'dist') pushNotif('supplier', 'chat', `New message from ${dist(t.dist).name}`, reply, '#/s/chat/' + t.id);
    else if (t.dist === ME_DIST) pushNotif('distributor', 'chat', 'New message from BilMagic Supply', reply, '#/d/chat/' + t.id);
    if (onReply) onReply(t);
  }, 1600);
}

/* ---------- Notifications and misc ---------- */
const markAllRead = (role) => S.notifs[role].forEach(n => { n.read = true; });
function setShopCount(sku, qty) { S.shop[ME_DIST][sku].qty = Math.max(0, qty); }
function addToShop(sku) { if (!S.shop[ME_DIST][sku]) S.shop[ME_DIST][sku] = { qty: 0, rop: Math.max(2, Math.round(prod(sku).rop * 0.7)) }; }
function resetData() { const role = S.role; S = seedState(); S.role = role; }

/* ---------- Report maths ---------- */
const rangeSeries = (days) => S.sales.daily.slice(-days);
const sum = (a) => a.reduce((s, x) => s + x.value, 0);
function rangeStats(days) {
  const cur = sum(rangeSeries(days));
  const prevArr = S.sales.daily.slice(-days * 2, -days);
  const prev = prevArr.length === days ? sum(prevArr) : null;
  return { total: cur, prev, delta: prev ? (cur - prev) / prev * 100 : null };
}
function topSellers(days, n = 5) {
  const total = sum(rangeSeries(days));
  return S.products.map(p => { const units = Math.max(1, Math.round(S.sales.sold30[p.sku] * total / S.sales.rev30)); return { p, units, value: units * p.price }; })
    .sort((a, b) => b.value - a.value).slice(0, n);
}
function stockValue() {
  const c = catalog();
  const cost = c.reduce((s, p) => s + p.stock * p.cost, 0), retail = c.reduce((s, p) => s + p.stock * p.price, 0);
  return { cost, retail, margin: retail ? (retail - cost) / retail * 100 : 0 };
}
function myReport(days) {
  const from = now() - days * 864e5;
  const os = myOrders().filter(o => o.placed >= from && o.status !== 'Cancelled');
  const rs = myReturns().filter(r => r.at >= from);
  const units = {};
  os.forEach(o => o.items.forEach(i => { units[i.sku] = (units[i.sku] || 0) + i.qty; }));
  const top = Object.entries(units).map(([sku, q]) => ({ p: prod(sku), q, value: q * prod(sku).price })).sort((a, b) => b.value - a.value).slice(0, 5);
  return { spend: os.reduce((s, o) => s + orderTotal(o), 0), orders: os.length, units: Object.values(units).reduce((a, b) => a + b, 0), returns: rs.length, top };
}
const ME_SPEND_HISTORY = { '2026-05': 41800, '2026-06': 52650, '2026-07': 60220 };   // sample months before the dummy orders start
function monthlySpend() {
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now()); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const fromOrders = myOrders().filter(o => o.status !== 'Cancelled' && new Date(o.placed).getFullYear() === d.getFullYear() && new Date(o.placed).getMonth() === d.getMonth()).reduce((s, o) => s + orderTotal(o), 0);
    out.push({ label: d.toLocaleString('en-US', { month: 'short' }), value: Math.round(fromOrders || ME_SPEND_HISTORY[key] || 0) });
  }
  return out;
}
