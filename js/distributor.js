/* distributor.js: the distributor portal for Roberto Santos (Santos Cue & Billiards). Pages, 1-tap reorder, cart, returns. */

const me = () => S.profile.distributor;
const availLabel = (p) => { const s = pStatus(p); return s === 'out' ? badge('out', 'Out of stock') : s === 'low' ? badge('low', `Only ${p.stock} left`) : badge('in', 'In stock'); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(isNaN(v) ? lo : v, hi));
const greeting = () => { const h = new Date(now()).getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const backLink = (to, label) => `<button class="back" data-act="go" data-to="${to}">${icon('left')} ${label}</button>`;

/* ============ Home ============ */
PAGES.d.home = () => {
  const rows = shopRows(), need = rows.filter(r => r.status !== 'in').sort((a, b) => sev[a.status] - sev[b.status] || a.qty - b.qty);
  const out = rows.filter(r => r.status === 'out').length;
  const open = myOrders().filter(o => ['New', 'Processing', 'Shipped'].includes(o.status)).sort((a, b) => b.placed - a.placed);
  const inReview = myReturns().filter(r => r.status === 'Submitted').length;
  const top = topSellers(30, 3), fresh = S.products.filter(p => !p.archived).slice(-3);
  return `<div class="page-head"><div><h1>${greeting()}, ${esc(me().name.split(' ')[0])}</h1><p>${esc(me().shop)} · ${esc(me().city)}</p></div><div class="actions"><a class="btn" href="#/d/catalog">Browse catalog</a></div></div>
  ${need.length ? `<div class="banner" role="alert"><span class="ic">${icon('alert', 20)}</span><div class="grow"><b>${plural(need.length, 'item')} running low at your shop</b><span>${out} out of stock. Reorder in one tap and we will add them to your cart.</span></div><button class="btn gold" data-act="reorder-all">${icon('refresh', 16)} Reorder all low items</button></div>` : ''}
  <div class="kpis four">
    ${kpi({ label: 'Open orders', icon: 'list', val: open.length, sub: `${myOrders().filter(o => o.status === 'New').length} new`, href: '#/d/orders' })}
    ${kpi({ label: 'Low-stock items', icon: 'alert', tone: 'bad', val: need.length, sub: `${out} out of stock`, href: '#/d/stock', warn: need.length > 0 })}
    ${kpi({ label: 'Returns in review', icon: 'undo', val: inReview, sub: `${plural(myReturns().length, 'request')} total`, href: '#/d/orders/returns' })}
    ${kpi({ label: 'Unread replies', icon: 'chat', tone: 'dk', val: unreadChat('distributor'), sub: 'from BilMagic', href: '#/d/chat' })}
  </div>
  <div class="grid-2">
    <section class="card flush"><div style="padding:20px 20px 0" class="card-head"><div><h2>Reorder suggestions</h2><p>Items at or below your reorder level</p></div><a class="link" href="#/d/stock">My stock</a></div>
      ${need.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Product</th><th class="num">On hand</th><th class="num">Reorder at</th><th>Status</th><th class="right">Action</th></tr></thead><tbody>${need.slice(0, 6).map(r => `<tr><td class="first"><b>${esc(r.p.name)}</b><div class="muted small sku">${r.sku}</div></td><td data-label="On hand" class="num">${r.qty}</td><td data-label="Reorder at" class="num">${r.rop}</td><td data-label="Status">${stockBadge(r.status)}</td><td data-label=""><div class="acts"><button class="btn sm gold" data-act="reorder" data-sku="${r.sku}" ${r.p.stock <= 0 ? 'disabled' : ''}>${r.p.stock <= 0 ? 'Unavailable' : 'Reorder'}</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('check', 'Everything is stocked', 'No items are at or below their reorder level.')}</section>
    <section class="card"><div class="card-head"><div><h2>New and open orders</h2></div><a class="link" href="#/d/orders">See all</a></div>${open.length ? open.slice(0, 3).map(o => `<button class="list-row" data-act="go" data-to="#/d/order/${o.id}"><span class="grow"><b class="title-sm">${o.id}</b><span class="muted small" style="display:block">${fmtDT(o.placed)} · ${plural(orderUnits(o), 'item')} · ${plural(o.items.length, 'product')}</span></span><span class="right"><b style="display:block">${peso(orderTotal(o))}</b>${orderBadge(o.status)}</span></button>`).join('') : empty('list', 'No open orders', 'Place an order from the catalog.')}</section>
  </div>
  <div class="grid-eq">
    <section class="card"><div class="card-head"><div><h2>Top 3 sold items</h2><p>Sample sales for the last 30 days across all distributors</p></div></div>${top.map((t, i) => `<button class="list-row" data-act="go" data-to="#/d/product/${t.p.sku}"><span class="rank">${i + 1}</span><span class="grow"><b class="title-sm">${esc(t.p.name)}</b></span><span class="muted">${t.units} sold</span></button>`).join('')}</section>
    <section class="card"><div class="card-head"><div><h2>New arrivals</h2></div><a class="link" href="#/d/catalog">Catalog</a></div>${fresh.map(p => `<button class="list-row" data-act="go" data-to="#/d/product/${p.sku}"><span class="tile">${catIcon(p.category)}</span><span class="grow"><b class="title-sm">${esc(p.name)}</b><span class="muted small" style="display:block">${esc(p.brand)}</span></span><b>${peso(p.price)}</b></button>`).join('')}</section>
  </div>`;
};
ACTS['reorder-all'] = () => {
  const need = shopRows().filter(r => r.status !== 'in' && r.p.stock > 0); let n = 0;
  need.forEach(r => { const res = cartAdd(r.sku, suggestQty(r.sku) - ((S.cart.find(c => c.sku === r.sku) || {}).qty || 0)); if (res.ok) n++; });
  toast(`${plural(n, 'item')} added to your cart`, 'ok'); go('#/d/cart');
};

/* ============ Reorder sheet (1-tap) ============ */
function reorderHtml(sku) {
  const p = prod(sku), r = (S.shop[ME_DIST] || {})[sku], q = clamp(parseInt(FORM.rq, 10), 1, maxQty(sku) || 1);
  const t = cartTotals([{ sku, qty: q }]);
  return `${panelHead('Reorder', 'Review the quantity and order in one tap.')}<div class="panel-body">
    <div class="list-row"><span class="tile lg">${catIcon(p.category)}</span><span class="grow"><b>${esc(p.name)}</b><span class="muted small" style="display:block">${p.sku} · ${peso(p.price)} per ${p.unit.toLowerCase()}</span>${availLabel(p)}</span></div>
    ${r ? `<div class="alert ${r.qty <= 0 ? 'err' : 'warn'}" style="margin-top:12px">${icon('alert')}<span>At your shop: <b>${r.qty}</b> on hand, reorder at ${r.rop}.</span></div>` : ''}
    <div class="row" style="justify-content:space-between;margin:14px 0"><span class="lbl" style="margin:0">Quantity</span>${qtyStepper('ro:' + sku, q, maxQty(sku), false)}</div>
    ${q >= maxQty(sku) ? `<p class="small muted" style="margin:-6px 0 10px">Maximum available from BilMagic: ${maxQty(sku)}.</p>` : ''}
    <div class="totals"><div><span>Subtotal</span><span>${peso(t.sub)}</span></div><div><span>VAT (12%)</span><span>${peso(t.vat)}</span></div><div class="t"><span>Total</span><span>${peso(t.total)}</span></div></div>
  </div><div class="panel-foot"><button class="btn" data-act="ro-cart" data-sku="${sku}">${icon('cart', 16)} Add to cart</button><button class="btn gold" data-act="ro-place" data-sku="${sku}">Place order now</button></div>`;
}
QTY.ro = (sku, v) => { FORM.rq = clamp(v, 1, maxQty(sku) || 1); paintOv(); };
Object.assign(ACTS, {
  reorder: (d) => { FORM.rq = suggestQty(d.sku); openOv(() => reorderHtml(d.sku), { size: 'sm' }); },
  'ro-cart': (d) => { const res = cartAdd(d.sku, clamp(parseInt(FORM.rq, 10), 1, maxQty(d.sku) || 1)); closeOv(); toast(res.ok ? `${prod(d.sku).name} added to cart` : res.msg, res.ok ? 'ok' : 'err'); render(); },
  'ro-place': (d) => { const q = clamp(parseInt(FORM.rq, 10), 1, maxQty(d.sku) || 1); const o = placeOrder([{ sku: d.sku, qty: q }]); closeOv(); go('#/d/order-placed/' + o.id); }
});

/* ============ Catalog ============ */
PAGES.d.catalog = () => {
  const q = getU('cat_q', '').toLowerCase(), cat = getU('cat_cat', 'All');
  const all = catalog(), list = all.filter(p => (cat === 'All' || p.category === cat) && (!q || (p.name + p.sku + p.brand).toLowerCase().includes(q)));
  return `${pageHead('Products catalog', 'Wholesale prices in PHP. Sample data.', `<a class="btn" href="#/d/cart">${icon('cart', 16)} Cart${cartCount() ? ` (${cartCount()})` : ''}</a>`)}
  <div class="toolbar"><div class="input-wrap"><span class="i-left">${icon('search')}</span><input class="input" id="cat_q" data-set="cat_q" type="search" placeholder="Search products, brands or SKU" value="${esc(getU('cat_q', ''))}" aria-label="Search catalog"></div></div>
  ${tabsRow('cat_cat', [['All', 'All'], ...categories().filter(c => all.some(p => p.category === c)).map(c => [c, c])], cat)}
  <p class="muted" style="margin-bottom:12px">${plural(list.length, 'product')}</p>
  ${list.length ? `<div class="cards">${list.map(p => `<article class="pcard clickable" data-act="go" data-to="#/d/product/${p.sku}"><div class="tile pimg">${catIcon(p.category)}<span style="position:absolute;top:8px;left:8px">${availLabel(p)}</span></div><div><h3>${esc(p.name)}</h3><div class="muted small">${p.sku} · ${esc(p.category)}</div><div class="muted small">${esc(p.brand)}</div></div><div class="acts"><span class="price">${peso(p.price)}</span><button class="btn sm gold" data-act="cart-add" data-sku="${p.sku}" ${p.stock <= 0 ? 'disabled' : ''} aria-label="Add ${esc(p.name)} to cart">${icon('plus', 14)} Add</button></div></article>`).join('')}</div>` : `<div class="card">${empty('search', 'No products found', 'Try another search or category.', `<button class="btn" data-act="cat-clear">Clear filters</button>`)}</div>`}`;
};
Object.assign(ACTS, {
  'cat-clear': () => { S.ui.cat_q = ''; S.ui.cat_cat = 'All'; render(); },
  'cart-add': (d) => { const res = cartAdd(d.sku, 1); toast(res.ok ? (res.capped ? `Only ${res.qty} available. Cart updated.` : `${prod(d.sku).name} added to cart`) : res.msg, res.ok ? 'ok' : 'err'); render(); }
});

/* ============ Product detail ============ */
PAGES.d.product = (r) => {
  const p = prod(r.arg); if (!p) return `<div class="card">${empty('search', 'Product not found', 'It may have been archived.', `<a class="btn" href="#/d/catalog">Back to catalog</a>`)}</div>`;
  const shop = (S.shop[ME_DIST] || {})[p.sku], q = FORM.pdq = clamp(parseInt(FORM.pdq, 10) || 1, 1, maxQty(p.sku) || 1);
  return `${backLink('#/d/catalog', 'Catalog')}
  <div class="grid-2"><section class="card"><div class="tile xl">${catIcon(p.category)}</div></section>
  <section class="card"><div class="row wrap" style="margin-bottom:8px">${availLabel(p)}<span class="muted small">${p.sku}</span></div><h1 style="font-size:24px;font-weight:800;letter-spacing:-.02em">${esc(p.name)}</h1><p class="muted" style="margin:6px 0 14px">${esc(p.brand)} · ${esc(p.category)}</p><p>${esc(p.desc)}</p>
    <div class="big-num" style="margin:16px 0 4px">${peso(p.price)}</div><div class="muted small">per ${p.unit.toLowerCase()} · wholesale · VAT added at checkout</div>
    <dl style="margin:16px 0 0"><div class="kv"><dt>Supplier</dt><dd>${esc(p.supplier)}</dd></div><div class="kv"><dt>Available</dt><dd>${p.stock} ${p.unit.toLowerCase()}${p.stock === 1 ? '' : 's'} at BilMagic</dd></div><div class="kv"><dt>At your shop</dt><dd>${shop ? `${shop.qty} on hand · reorder at ${shop.rop} ${stockBadge(stockStatus(shop.qty, shop.rop))}` : 'Not tracked yet'}</dd></div></dl>
    ${p.stock > 0 ? `<div class="row wrap" style="margin-top:18px">${qtyStepper('pd:' + p.sku, q, maxQty(p.sku), false)}<button class="btn gold lg grow" data-act="pd-add" data-sku="${p.sku}">${icon('cart', 18)} Add to cart · ${peso(p.price * q)}</button></div><button class="btn block" style="margin-top:10px" data-act="reorder" data-sku="${p.sku}">Reorder now</button>` : `<div class="alert err" style="margin-top:18px">${icon('alert')}<span>This item is out of stock at BilMagic. Message the supplier to ask about restock.</span></div><button class="btn block" data-act="ask-restock" data-sku="${p.sku}">${icon('chat', 16)} Ask about restock</button>`}
  </section></div>`;
};
QTY.pd = (sku, v) => { FORM.pdq = clamp(v, 1, maxQty(sku) || 1); render(); };
Object.assign(ACTS, {
  'pd-add': (d) => { const res = cartAdd(d.sku, clamp(parseInt(FORM.pdq, 10) || 1, 1, maxQty(d.sku))); toast(res.ok ? `${prod(d.sku).name} added to cart` : res.msg, res.ok ? 'ok' : 'err'); render(); },
  'ask-restock': (d) => { const t = ensureThread(ME_DIST, 'General'); S.ui.chat_open = true; FORM.msg = `Hi BilMagic, when will ${prod(d.sku).name} (${d.sku}) be back in stock?`; go('#/d/chat/' + t.id); }
});

/* ============ Cart and order placed ============ */
PAGES.d.cart = () => {
  const lines = S.cart.filter(c => prod(c.sku)), t = cartTotals();
  if (!lines.length) return `${backLink('#/d/catalog', 'Catalog')}<div class="card">${empty('cart', 'Your cart is empty', 'Add products from the catalog or reorder low-stock items.', `<a class="btn gold" href="#/d/catalog">Browse catalog</a>`)}</div>`;
  return `${pageHead('Cart', `${plural(cartCount(), 'item')} · ${plural(lines.length, 'product')}`, `<button class="btn" data-act="cart-clear">Clear cart</button>`)}
  <div class="grid-2"><section class="card">${lines.map(c => { const p = prod(c.sku); return `<div class="list-row" style="align-items:flex-start;flex-wrap:wrap"><span class="tile">${catIcon(p.category)}</span><span class="grow" style="min-width:160px"><b class="title-sm">${esc(p.name)}</b><span class="muted small" style="display:block">${p.sku} · ${peso(p.price)} each</span>${c.qty >= maxQty(c.sku) ? `<span class="small" style="color:var(--warn);font-weight:600">Maximum available: ${maxQty(c.sku)}</span>` : ''}</span>${qtyStepper('cart:' + c.sku, c.qty, maxQty(c.sku))}<b style="min-width:100px;text-align:right">${peso(c.qty * p.price)}</b><button class="icon-btn sm" data-act="cart-rm" data-sku="${c.sku}" aria-label="Remove ${esc(p.name)}" title="Remove">${icon('trash')}</button></div>`; }).join('')}</section>
  <aside class="card sticky-foot"><div class="card-head"><div><h2>Order summary</h2></div></div>
    <div class="totals"><div><span>Subtotal</span><span>${peso(t.sub)}</span></div><div><span>VAT (12%)</span><span>${peso(t.vat)}</span></div><div class="t"><span>Total</span><span>${peso(t.total)}</span></div></div>
    <div class="sec-title">Deliver to</div><p>${esc(me().shop)}<br><span class="muted">${esc(me().address)}</span></p>
    <button class="btn gold lg block" style="margin-top:16px" data-act="cart-place">Place order · ${peso(t.total)}</button><p class="small muted" style="margin-top:10px">Prototype only: no payment is taken. Your order goes to BilMagic as New.</p></aside></div>`;
};
QTY.cart = (sku, v) => { cartSet(sku, v); render(); };
Object.assign(ACTS, {
  'cart-rm': (d) => { cartRemove(d.sku); toast('Removed from cart'); render(); },
  'cart-clear': () => { S.cart = []; render(); },
  'cart-place': () => { const o = placeOrder(S.cart); S.cart = []; go('#/d/order-placed/' + o.id); }
});
PAGES.d['order-placed'] = (r) => {
  const o = orderById(r.arg); if (!o) return `<div class="card">${empty('list', 'Order not found', '', `<a class="btn" href="#/d/orders">My orders</a>`)}</div>`;
  return `<section class="card success"><div class="big">${icon('check')}</div><h1>Order placed</h1><p class="muted" style="margin-top:6px">BilMagic received your order. We will confirm it and start processing shortly.</p><div class="code">${o.id}</div><div class="totals" style="max-width:280px;margin:0 auto 18px"><div><span>${plural(orderUnits(o), 'item')}</span><span></span></div><div class="t"><span>Total</span><span>${peso(orderTotal(o))}</span></div></div>
    <div class="stack" style="max-width:320px;margin:0 auto"><a class="btn primary lg" href="#/d/order/${o.id}">Track this order</a><button class="btn" data-act="chat-order-d" data-id="${o.id}">${icon('chat', 16)} Message supplier</button><a class="btn ghost" href="#/d/catalog">Continue shopping</a></div></section>`;
};

/* ============ Orders and returns ============ */
const returnable = (o, sku) => { const it = o.items.find(i => i.sku === sku); if (!it) return 0; return it.qty - S.returns.filter(r => r.order === o.id && r.sku === sku && r.status !== 'Rejected').reduce((s, r) => s + r.qty, 0); };
PAGES.d.orders = (r) => {
  if (r.arg === 'returns') S.ui.or_tab = 'returns'; else if (ROUTE_CHANGED) S.ui.or_tab = 'orders';
  const tab = getU('or_tab', 'orders'), os = myOrders().sort((a, b) => b.placed - a.placed), rs = myReturns().sort((a, b) => b.at - a.at), f = getU('d_ord_tab', 'All');
  const seg = `<div class="seg block" style="margin-bottom:16px;max-width:420px"><button class="${tab === 'orders' ? 'on' : ''}" data-act="set" data-k="or_tab" data-v="orders">Orders (${os.length})</button><button class="${tab === 'returns' ? 'on' : ''}" data-act="set" data-k="or_tab" data-v="returns">Returns (${rs.length})</button></div>`;
  let body;
  if (tab === 'orders') {
    const list = os.filter(o => f === 'All' || o.status === f);
    body = tabsRow('d_ord_tab', ORDER_TABS.map(t => [t, t, t === 'All' ? os.length : os.filter(o => o.status === t).length]), f) + (list.length ? `<div class="stack">${list.map(o => `<button class="card" style="text-align:left;cursor:pointer" data-act="go" data-to="#/d/order/${o.id}"><div class="row wrap"><b>${o.id}</b>${orderBadge(o.status)}<span class="grow"></span><b>${peso(orderTotal(o))}</b></div><div class="muted small" style="margin-top:6px">${fmtDT(o.placed)} · ${plural(orderUnits(o), 'item')} · ${plural(o.items.length, 'product')}</div><div class="link small" style="margin-top:8px;display:inline-block">View details</div></button>`).join('')}</div>` : `<div class="card">${empty('list', 'No orders here', 'No orders with this status.')}</div>`);
  } else {
    body = rs.length ? `<div class="stack">${rs.map(x => `<button class="card" style="text-align:left;cursor:pointer" data-act="open-return" data-id="${x.id}"><div class="row wrap"><b>${x.id}</b>${returnBadge(x.status)}<span class="grow"></span><span class="muted small">${fmtDT(x.at)}</span></div><div style="margin-top:6px">${x.qty} × ${esc(prod(x.sku).name)}</div><div class="muted small">Order ${x.order} · ${condLabel(x.cond)}</div></button>`).join('')}</div>` : `<div class="card">${empty('undo', 'No returns yet', 'Open a delivered order to request a return.')}</div>`;
  }
  return `${pageHead('Orders and returns', 'Track your wholesale orders and return requests.')}${seg}${body}`;
};
ACTS['open-return'] = (d) => openReturn(d.id);

PAGES.d.order = (r) => {
  const o = orderById(r.arg); if (!o || o.dist !== ME_DIST) return `${backLink('#/d/orders', 'Orders')}<div class="card">${empty('list', 'Order not found', '')}</div>`;
  const steps = ['New', 'Processing', 'Shipped', 'Delivered'], idx = steps.indexOf(o.status);
  const retOf = S.returns.filter(x => x.order === o.id);
  return `${backLink('#/d/orders', 'Orders and returns')}
  ${pageHead(o.id, `Placed ${fmtDT(o.placed)}`, orderBadge(o.status))}
  <div class="grid-2"><div class="stack"><section class="card"><div class="steps">${steps.map((s, i) => `<div class="s ${o.status === 'Cancelled' ? 'cancel' : i <= idx ? 'done' : ''}"><i></i>${s}</div>`).join('')}</div>${o.status === 'Cancelled' ? `<p class="muted small">Cancelled${o.reason ? ': ' + esc(o.reason) : ''}</p>` : ''}</section>
    <section class="card"><div class="card-head"><div><h2>Items</h2></div></div><div class="line-items">${o.items.map(i => { const p = prod(i.sku); return `<div class="li"><span class="tile">${catIcon(p.category)}</span><div class="grow"><b class="title-sm">${esc(p.name)}</b><div class="muted small">${i.qty} × ${peso(i.price)}</div></div><b>${peso(i.qty * i.price)}</b></div>`; }).join('')}</div>
    <div class="totals"><div><span>Subtotal</span><span>${peso(orderSub(o))}</span></div><div><span>VAT (12%)</span><span>${peso(orderVat(o))}</span></div><div class="t"><span>Total</span><span>${peso(orderTotal(o))}</span></div></div></section></div>
  <div class="stack"><section class="card"><div class="card-head"><div><h2>Status history</h2></div></div><ul class="timeline">${[...o.history].reverse().map(h => `<li><b>${h.status}</b><span class="muted small">${fmtDT(h.at)}</span></li>`).join('')}</ul></section>
    <section class="card"><div class="stack">${o.status === 'Delivered' ? `<a class="btn gold" href="#/d/return/new/${o.id}">${icon('undo', 16)} Request a return</a>` : ''}${o.status === 'New' ? `<button class="btn" data-act="d-cancel-ask" data-id="${o.id}">Cancel order</button>` : ''}<button class="btn" data-act="chat-order-d" data-id="${o.id}">${icon('chat', 16)} Message supplier</button><button class="btn" data-act="reorder-order" data-id="${o.id}">${icon('refresh', 16)} Order these items again</button></div>
      ${retOf.length ? `<div class="sec-title">Returns on this order</div>${retOf.map(x => `<button class="list-row" data-act="open-return" data-id="${x.id}"><span class="grow"><b class="title-sm">${x.id}</b><span class="muted small" style="display:block">${x.qty} × ${esc(prod(x.sku).name)}</span></span>${returnBadge(x.status)}</button>`).join('')}` : ''}</section></div></div>`;
};
Object.assign(ACTS, {
  'chat-order-d': (d) => { const t = ensureThread(ME_DIST, d.id); S.ui.chat_open = true; go('#/d/chat/' + t.id); },
  'd-cancel-ask': (d) => { FORM.reason = 'Ordered by mistake'; openOv(() => `${panelHead('Cancel order ' + d.id, 'Only new orders can be cancelled.')}<div class="panel-body">${field('Reason', fs('reason', ['Ordered by mistake', 'Found a better price', 'No longer needed', 'Other']))}</div><div class="panel-foot"><button class="btn" data-act="ov-close">Keep order</button><button class="btn danger" data-act="d-cancel-do" data-id="${d.id}">Cancel order</button></div>`, { size: 'sm' }); },
  'd-cancel-do': (d) => { cancelOrder(d.id, FORM.reason || 'Other', 'distributor'); closeOv(); toast(d.id + ' cancelled', 'ok'); render(); },
  'reorder-order': (d) => { const o = orderById(d.id); let n = 0; o.items.forEach(i => { if (cartAdd(i.sku, i.qty).ok) n++; }); toast(`${plural(n, 'product')} added to your cart`, 'ok'); go('#/d/cart'); }
});

/* ============ Return request ============ */
let PHOTOS = [], PH_ERR = '', RET_ERR = {};
PAGES.d.return = (r) => {
  const o = orderById(r.arg2); if (!o || o.dist !== ME_DIST || o.status !== 'Delivered') return `${backLink('#/d/orders', 'Orders')}<div class="card">${empty('undo', 'Returns are for delivered orders', 'Open a delivered order and choose Request a return.')}</div>`;
  if (ROUTE_CHANGED) { PHOTOS = []; PH_ERR = ''; RET_ERR = {}; }
  const elig = o.items.filter(i => returnable(o, i.sku) > 0);
  if (!elig.length) return `${backLink('#/d/order/' + o.id, 'Order')}<div class="card">${empty('check', 'Nothing left to return', 'All items on this order already have return requests.')}</div>`;
  if (!FORM.rsku || !elig.some(i => i.sku === FORM.rsku)) Object.assign(FORM, { rsku: elig[0].sku, rqty: 1, rcond: 'good', rreason: 'Ordered too many', rnote: '' });
  const max = returnable(o, FORM.rsku), e = RET_ERR, dmg = FORM.rcond === 'damaged';
  const opt = (v, t, s) => `<div class="radio-card ${FORM.rcond === v ? 'on' : ''}" role="radio" aria-checked="${FORM.rcond === v}" tabindex="0" data-act="fset" data-k="rcond" data-v="${v}"><span>${icon(FORM.rcond === v ? 'check' : 'plus', 18)}</span><div><b>${t}</b><span>${s}</span></div></div>`;
  return `${backLink('#/d/order/' + o.id, 'Order ' + o.id)}${pageHead('New return request', `For order ${o.id}. Submitting never restocks items; BilMagic inspects them first.`)}
  <div class="grid-2"><section class="card">
    ${field('Product', fs('rsku', elig.map(i => [i.sku, `${prod(i.sku).name} (up to ${returnable(o, i.sku)})`])))}
    ${field('Quantity', `<div>${qtyStepper('rq:x', clamp(parseInt(FORM.rqty, 10) || 1, 1, max), max, false)}</div>`, { err: e.qty, hint: `You can return up to ${max}.` })}
    <div class="field"><label>Return condition</label>${opt('good', 'Good condition', 'May be restocked after review.')}${opt('damaged', 'Damaged or defective', 'Handled separately. Not restocked. Photos are required.')}</div>
    ${field('Reason', fs('rreason', ['Ordered too many', 'Wrong item received', 'Arrived damaged', 'Defective item', 'Other']))}
    ${field('Details', `<textarea class="input ${e.note ? 'bad' : ''}" id="f_rnote" data-form="rnote" rows="3" placeholder="Describe what happened">${esc(FORM.rnote || '')}</textarea>`, { err: e.note })}
  </section>
  <section class="card"><div class="card-head"><div><h2>Photos ${dmg ? '<span style="color:var(--bad)">(required)</span>' : '(optional)'}</h2><p>JPG, PNG or WebP, up to 5 MB each, max 3 photos.</p></div></div>
    <div class="photos" style="margin-bottom:12px">${PHOTOS.map((p, i) => `<div class="photo"><img src="${p.url}" alt="${esc(p.name)}"><button class="rm" data-act="photo-rm" data-i="${i}" aria-label="Remove photo">${icon('x')}</button></div>`).join('')}${PHOTOS.length < 3 ? `<label class="photo" style="cursor:pointer" title="Add photo">${icon('plus', 22)}<input class="sr" type="file" accept="image/jpeg,image/png,image/webp" multiple data-photos aria-label="Add photos"></label>` : ''}</div>
    ${PH_ERR || e.photos ? `<div class="alert err">${icon('alert')}<span>${esc(PH_ERR || e.photos)}</span></div>` : ''}
    <div class="alert info">${icon('info')}<span>Photos stay in your browser in this prototype and are not uploaded.</span></div>
    <button class="btn gold lg block" data-act="ret-submit" data-order="${o.id}">Submit return request</button></section></div>`;
};
QTY.rq = (id, v) => { FORM.rqty = v; render(); };
Object.assign(ACTS, {
  'photo-rm': (d) => { PHOTOS.splice(+d.i, 1); render(); },
  'ret-submit': (d) => {
    const o = orderById(d.order), max = returnable(o, FORM.rsku), qty = clamp(parseInt(FORM.rqty, 10) || 1, 1, max), e = {};
    if (!(qty >= 1 && qty <= max)) e.qty = `Enter a quantity between 1 and ${max}.`;
    if ((FORM.rnote || '').trim().length < 10) e.note = 'Add a few details (at least 10 characters).';
    if (FORM.rcond === 'damaged' && !PHOTOS.length) e.photos = 'Add at least one photo of the damage.';
    RET_ERR = e; if (Object.keys(e).length) { render(); return; }
    const r = submitReturn({ order: o.id, sku: FORM.rsku, qty, cond: FORM.rcond, reason: `${FORM.rreason}. ${FORM.rnote.trim()}`, photos: PHOTOS.length });
    PHOTOS = []; go('#/d/return-submitted/' + r.id);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.photos !== undefined) {
    PH_ERR = '';
    [...e.target.files].forEach(f => {
      if (PHOTOS.length >= 3) { PH_ERR = 'You can add up to 3 photos.'; return; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { PH_ERR = `${f.name}: only JPG, PNG or WebP images are allowed.`; return; }
      if (f.size > 5 * 1024 * 1024) { PH_ERR = `${f.name} is larger than 5 MB.`; return; }
      PHOTOS.push({ name: f.name, url: URL.createObjectURL(f) });
    });
    render();
  }
  if (e.target.id === 'f_rsku') { FORM.rqty = 1; render(); }
});
PAGES.d['return-submitted'] = (r) => {
  const x = returnById(r.arg); if (!x) return `<div class="card">${empty('undo', 'Return not found', '', `<a class="btn" href="#/d/orders">My orders</a>`)}</div>`;
  return `<section class="card success"><div class="big">${icon('check')}</div><h1>Return submitted</h1><p class="muted" style="margin-top:6px">BilMagic will inspect ${x.qty} × ${esc(prod(x.sku).name)}. Items are only restocked if they pass inspection as good condition.</p><div class="code">${x.id}</div><div style="margin-bottom:18px">${returnBadge(x.status)}</div>
    <div class="stack" style="max-width:320px;margin:0 auto"><a class="btn primary lg" href="#/d/orders/returns">View my returns</a><a class="btn ghost" href="#/d/home">Back to home</a></div></section>`;
};

/* ============ My Stock ============ */
PAGES.d.stock = () => {
  const f = getU('stock_f', 'All'), q = getU('stock_q', '').toLowerCase();
  const all = shopRows(), rows = all.filter(r => (f === 'All' || (f === 'needs' ? r.status !== 'in' : r.status === f)) && (!q || (r.p.name + r.sku).toLowerCase().includes(q))).sort((a, b) => sev[a.status] - sev[b.status] || a.p.name.localeCompare(b.p.name));
  const c = (s) => all.filter(r => r.status === s).length;
  return `${pageHead('My stock', `${plural(all.length, 'product')} tracked at ${esc(me().shop)}. Update your counts so reorder alerts stay accurate.`)}
  <section class="card" style="margin-bottom:16px"><div class="card-head"><div><h2>Your shop levels</h2></div></div>${stackBar(c('in'), c('low'), c('out'))}<div class="legend" style="margin-bottom:0"><span style="--c:var(--ok-dot)">In stock ${c('in')}</span><span style="--c:var(--warn-dot)">Low stock ${c('low')}</span><span style="--c:var(--bad-dot)">Out of stock ${c('out')}</span></div></section>
  ${tabsRow('stock_f', [['All', 'All', all.length], ['needs', 'Needs reorder', c('low') + c('out')], ['in', 'In stock', c('in')], ['low', 'Low', c('low')], ['out', 'Out', c('out')]], f)}
  <div class="toolbar"><div class="input-wrap"><span class="i-left">${icon('search')}</span><input class="input" id="stock_q" data-set="stock_q" type="search" placeholder="Search your stock" value="${esc(getU('stock_q', ''))}" aria-label="Search my stock"></div></div>
  <div class="card flush">${rows.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Product</th><th>Category</th><th class="num">On hand</th><th class="num">Reorder at</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.status}-row"><td class="first"><b>${esc(r.p.name)}</b><div class="muted small sku">${r.sku}</div></td><td data-label="Category">${esc(r.p.category)}</td><td data-label="On hand" class="num"><b>${r.qty}</b></td><td data-label="Reorder at" class="num">${r.rop}</td><td data-label="Status">${stockBadge(r.status)}</td><td data-label=""><div class="acts"><button class="btn sm" data-act="sc-edit" data-sku="${r.sku}">${icon('edit', 14)} Edit count</button><button class="btn sm ${r.status !== 'in' ? 'gold' : ''}" data-act="reorder" data-sku="${r.sku}" ${r.p.stock <= 0 ? 'disabled' : ''}>Reorder</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('search', 'Nothing here', 'No tracked items match.')}</div>`;
};
function scHtml(sku) {
  const p = prod(sku), r = S.shop[ME_DIST][sku], q = clamp(parseInt(FORM.sc, 10), 0, 9999), st = stockStatus(q, r.rop);
  return `${panelHead('Update count', esc(p.name))}<div class="panel-body"><div class="row" style="justify-content:space-between;margin-bottom:14px"><span class="lbl" style="margin:0">On hand at your shop</span>${qtyStepper('sc:' + sku, q, 9999, false)}</div><div class="alert ${st === 'in' ? 'ok' : st === 'low' ? 'warn' : 'err'}">${icon('info')}<span>${STOCK_LABEL[st]} · reorder at ${r.rop}</span></div></div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="sc-save" data-sku="${sku}">Save count</button></div>`;
}
QTY.sc = (sku, v) => { FORM.sc = clamp(v, 0, 9999); paintOv(); };
Object.assign(ACTS, {
  'sc-edit': (d) => { FORM.sc = S.shop[ME_DIST][d.sku].qty; openOv(() => scHtml(d.sku), { size: 'sm' }); },
  'sc-save': (d) => { setShopCount(d.sku, clamp(parseInt(FORM.sc, 10), 0, 9999)); closeOv(); toast('Count updated', 'ok'); render(); }
});

/* ============ Messages, reports, settings ============ */
PAGES.d.chat = (r) => chatPage('distributor', r);
PAGES.d.reports = () => {
  const days = getU('drep', 30), m = myReport(days), months = monthlySpend();
  return `${pageHead('Reports', 'Your spend and purchases from BilMagic.', rangeSeg('drep', days))}
  <div class="kpis four">
    ${kpi({ label: `Spend · ${days} days`, icon: 'trend', val: pesoK(m.spend), sub: 'including 12% VAT' })}
    ${kpi({ label: 'Orders placed', icon: 'list', val: m.orders, sub: `${plural(m.units, 'item')} ordered` })}
    ${kpi({ label: 'Average order', icon: 'chart', val: m.orders ? pesoK(m.spend / m.orders) : '–', sub: 'per order' })}
    ${kpi({ label: 'Return requests', icon: 'undo', tone: 'bad', val: m.returns, sub: m.units ? `${(m.returns / m.units * 100).toFixed(1)}% of items ordered` : 'No items ordered' })}
  </div>
  <div class="grid-eq"><section class="card gold"><div class="card-head"><div><h2>Monthly spend</h2><p>Last 6 months. May to July are sample history.</p></div></div>${barChart(months)}</section>
  <section class="card"><div class="card-head"><div><h2>Top purchased items</h2><p>Last ${days} days</p></div></div>${m.top.length ? m.top.map((t, i) => `<div class="list-row"><span class="rank">${i + 1}</span><span class="grow" style="min-width:0"><b class="title-sm ellipsis" style="display:block">${esc(t.p.name)}</b><span class="muted small">${plural(t.q, 'unit')}</span></span><b>${peso(t.value)}</b></div>`).join('') : empty('chart', 'No purchases in this period', 'Try a longer timeframe.')}</section></div>`;
};
PAGES.d.settings = () => settingsPage('distributor');
Object.assign(ACTS, {
  'pw-open': () => { PW_ERR = {}; Object.assign(FORM, { pw0: '', pw1: '', pw2: '' }); openOv(pwHtml, { size: 'sm' }); },
  'pw-save': () => {
    const e = {}; if ((FORM.pw0 || '').length < 6) e.pw0 = 'Enter your current password.';
    if ((FORM.pw1 || '').length < 8) e.pw1 = 'Use at least 8 characters.';
    if (FORM.pw2 !== FORM.pw1) e.pw2 = 'Passwords do not match.';
    PW_ERR = e; if (Object.keys(e).length) { paintOv(); return; }
    closeOv(); toast('Password changed (prototype only)', 'ok');
  }
});
let PW_ERR = {};
const pwHtml = () => `${panelHead('Change password', 'Prototype only. Nothing is stored.')}<div class="panel-body">${field('Current password', fi('pw0', { type: 'password' }), { err: PW_ERR.pw0 })}${field('New password', fi('pw1', { type: 'password' }), { err: PW_ERR.pw1, hint: 'At least 8 characters' })}${field('Confirm new password', fi('pw2', { type: 'password' }), { err: PW_ERR.pw2 })}</div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="pw-save">Update password</button></div>`;
