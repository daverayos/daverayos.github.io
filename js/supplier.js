/* supplier.js: the BilMagic supplier workspace (9 pages plus overlays). */

const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
const kpi = (o) => `<${o.href ? `a href="${o.href}"` : 'div'} class="kpi"><div class="top"><span>${o.label}</span><span class="ico ${o.tone || ''}">${icon(o.icon, 18)}</span></div><div class="val">${o.val}</div><div class="sub ${o.warn ? 'warn' : ''}">${o.sub}</div></${o.href ? 'a' : 'div'}>`;
const tabsRow = (key, tabs, cur) => `<div class="tabs" role="tablist">${tabs.map(([v, label, n]) => `<button class="tab ${cur === v ? 'on' : ''}" role="tab" aria-selected="${cur === v}" data-act="set" data-k="${key}" data-v="${v}">${label}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
const rangeSeg = (key, cur) => `<div class="seg" role="group" aria-label="Timeframe">${[7, 30, 90].map(d => `<button class="${cur === d ? 'on' : ''}" data-act="set-num" data-k="${key}" data-v="${d}" aria-pressed="${cur === d}">${d}D</button>`).join('')}</div>`;
ACTS['set-num'] = (d) => { S.ui[d.k] = +d.v; render(); };
const distNeedsRestock = (id) => shopRows(id).filter(r => r.status !== 'in');

/* ============ Dashboard ============ */
PAGES.s.dashboard = () => {
  const c = catalog(), out = c.filter(p => pStatus(p) === 'out').length, low = c.filter(p => pStatus(p) === 'low').length;
  const range = getU('dash_range', 30), st = rangeStats(range);
  const pts = rangeSeries(range).map(d => ({ label: fmtD(d.date), value: d.value }));
  const alerts = c.filter(p => pStatus(p) !== 'in').sort((a, b) => sev[pStatus(a)] - sev[pStatus(b)] || a.stock / (a.rop || 1) - b.stock / (b.rop || 1));
  const open = S.orders.filter(o => ['Processing', 'Shipped'].includes(o.status)).length;
  const needs = DISTRIBUTORS.filter(d => distNeedsRestock(d.id).length).length;
  const cats = categories().map(cat => { const l = c.filter(p => p.category === cat); return { cat, i: l.filter(p => pStatus(p) === 'in').length, l: l.filter(p => pStatus(p) === 'low').length, o: l.filter(p => pStatus(p) === 'out').length, n: l.length }; }).filter(x => x.n);
  const convs = S.threads.filter(t => t.msgs.length).length;
  return `${pageHead('Dashboard', `Overview for ${fmtD(now())}, 2026 · all figures are synthetic sample data`, `<a class="btn" href="#/s/orders">View orders</a><button class="btn primary" data-act="prod-new">${icon('plus')} Add product</button>`)}
  <div class="kpis">
    ${kpi({ label: 'Inventory', icon: 'package', tone: 'bad', val: plural(c.length, 'SKU'), sub: `${out} out of stock · ${low} low stock`, href: '#/s/inventory' })}
    ${kpi({ label: 'Orders', icon: 'list', val: `${newOrderCount()} new`, sub: `${plural(open, 'open order')} in progress`, href: '#/s/orders' })}
    ${kpi({ label: 'Distributors', icon: 'users', val: `${DISTRIBUTORS.length} active`, sub: `${needs} need restock`, href: '#/s/distributors' })}
    ${kpi({ label: 'Returns', icon: 'undo', val: `${reviewCount()} to review`, sub: `${plural(S.returns.length, 'request')} in total`, href: '#/s/returns' })}
    ${kpi({ label: 'Messages', icon: 'chat', tone: 'dk', val: `${unreadChat('supplier')} unread`, sub: `${plural(convs, 'active conversation')}`, href: '#/s/chat' })}
  </div>
  <div class="grid-2">
    <section class="card gold" aria-label="Wholesale order trend">
      <div class="card-head"><div><h2>Wholesale order trend</h2><p>Order value per day, in thousands of pesos</p></div>${rangeSeg('dash_range', range)}</div>
      <div class="row wrap" style="gap:12px"><span class="big-num" title="${peso(st.total)}">${pesoK(st.total)}</span>${st.delta != null ? `<span class="chip-up ${st.delta < 0 ? 'down' : ''}">${st.delta >= 0 ? '+' : ''}${st.delta.toFixed(1)}% vs previous ${range} days</span>` : '<span class="chip-up">No earlier period to compare</span>'}</div>
      ${lineChart(pts)}
    </section>
    <section class="card" aria-label="Low-stock alerts">
      <div class="card-head"><div><h2>Low-stock alerts</h2><p>${plural(alerts.length, 'product')} at or below their reorder point</p></div><button class="link" data-act="inv-needs">View all</button></div>
      ${alerts.length ? alerts.slice(0, 6).map(p => `<div class="list-row"><span class="tile">${catIcon(p.category)}</span><button class="grow" style="background:none;border:0;text-align:left;padding:0;min-width:0" data-act="go" data-to="#/s/inventory/${p.sku}"><span class="title-sm ellipsis" style="display:block">${esc(p.name)}</span><span class="muted small">${p.stock} in stock · reorder at ${p.rop}</span></button>${stockBadge(pStatus(p))}<button class="icon-btn sm" data-act="adj" data-sku="${p.sku}" aria-label="Adjust stock for ${esc(p.name)}" title="Adjust stock">${icon('sliders')}</button></div>`).join('') : empty('check', 'All stocked up', 'Nothing is at or below its reorder point.')}
    </section>
  </div>
  <div class="grid-3">
    <section class="card"><div class="card-head"><div><h2>Stock level by category</h2><p>SKUs by stock status</p></div></div>${legend3()}${cats.map(x => `<div class="bar-row"><span class="nm" title="${esc(x.cat)}">${esc(x.cat)}</span>${stackBar(x.i, x.l, x.o)}<span class="ct">${x.n}</span></div>`).join('')}</section>
    <section class="card"><div class="card-head"><div><h2>Distributor stock counts</h2><p>Tracked items per distributor, by status</p></div><a class="link" href="#/s/distributors">Open</a></div>${legend3()}${DISTRIBUTORS.map(d => { const r = shopRows(d.id); return `<div class="bar-row"><span class="nm">${esc(d.name.split(' ')[0])}</span>${stackBar(r.filter(x => x.status === 'in').length, r.filter(x => x.status === 'low').length, r.filter(x => x.status === 'out').length)}<span class="ct">${r.length}</span></div>`; }).join('')}</section>
    <section class="card"><div class="card-head"><div><h2>Recent orders</h2><p>Latest wholesale order activity</p></div><a class="link" href="#/s/orders">View all</a></div>${[...S.orders].sort((a, b) => b.placed - a.placed).slice(0, 5).map(o => `<button class="list-row" data-act="go" data-to="#/s/orders/${o.id}"><span class="grow" style="min-width:0"><b class="title-sm">${o.id}</b><span class="muted small ellipsis" style="display:block">${esc(dist(o.dist).name.split(' ')[0])} · ${fmtDT(o.placed)}</span></span><span class="right"><b style="display:block">${peso(orderTotal(o))}</b>${orderBadge(o.status)}</span></button>`).join('')}</section>
  </div>`;
};
ACTS['inv-needs'] = () => { S.ui.inv_status = 'needs'; S.ui.inv_q = ''; S.ui.inv_cat = 'All'; go('#/s/inventory'); };

/* ============ Inventory ============ */
function invFiltered() {
  const q = getU('inv_q', '').toLowerCase(), cat = getU('inv_cat', 'All'), st = getU('inv_status', 'All'), sup = getU('inv_sup', 'All'), arch = getU('inv_arch', false);
  return S.products.filter(p => !!p.archived === !!arch)
    .filter(p => !q || (p.name + p.sku + p.brand + p.desc).toLowerCase().includes(q))
    .filter(p => cat === 'All' || p.category === cat)
    .filter(p => sup === 'All' || p.supplier === sup)
    .filter(p => st === 'All' || (st === 'needs' ? pStatus(p) !== 'in' : pStatus(p) === st));
}
PAGES.s.inventory = (r) => {
  if (r.arg) AFTER.push(() => { if (prod(r.arg)) openOv(() => productDrawer(r.arg), { kind: 'drawer', back: '#/s/inventory' }); });
  const q = getU('inv_q', ''), cat = getU('inv_cat', 'All'), st = getU('inv_status', 'All'), sup = getU('inv_sup', 'All'), arch = getU('inv_arch', false);
  const rows = invFiltered(), c = catalog();
  const sel = (id, label, opts, cur) => `<select class="input" id="${id}" data-set="${id}" aria-label="${label}"><option value="All">${label}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const body = rows.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th class="hide-t2">SKU</th><th>Product</th><th class="hide-t">Category</th><th class="hide-t">Supplier</th><th class="num">Price</th><th class="num">Stock</th><th class="num hide-t">Reorder at</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>${rows.map(p => { const s = pStatus(p); return `<tr class="click ${s}-row" data-act="go" data-to="#/s/inventory/${p.sku}">
      <td data-label="SKU" class="sku hide-t2">${p.sku}</td>
      <td class="first"><div class="pname">${esc(p.name)}</div><div class="pdesc">${esc(p.brand)} · ${esc(p.desc)}</div></td>
      <td data-label="Category" class="hide-t">${esc(p.category)}</td><td data-label="Supplier" class="hide-t">${esc(p.supplier)}</td>
      <td data-label="Price" class="num">${peso(p.price)}</td><td data-label="Stock" class="num"><span><b>${p.stock}</b> <span class="muted small">${p.unit.toLowerCase()}${p.stock === 1 ? '' : 's'}</span></span></td><td data-label="Reorder at" class="num hide-t">${p.rop}</td>
      <td data-label="Status">${arch ? badge('neutral', 'Archived') : stockBadge(s)}</td>
      <td data-label=""><div class="acts">${arch ? `<button class="btn sm" data-act="restore" data-sku="${p.sku}">Restore</button>` : `<button class="icon-btn sm" data-act="adj" data-sku="${p.sku}" aria-label="Adjust stock for ${esc(p.name)}" title="Adjust stock">${icon('sliders')}</button><button class="icon-btn sm" data-act="prod-edit" data-sku="${p.sku}" aria-label="Edit ${esc(p.name)}" title="Edit">${icon('edit')}</button><button class="icon-btn sm" data-act="arch-ask" data-sku="${p.sku}" aria-label="Archive ${esc(p.name)}" title="Archive">${icon('archive')}</button>`}</div></td></tr>`; }).join('')}</tbody></table></div><div class="tbl-foot">Showing ${rows.length} of ${arch ? S.products.filter(p => p.archived).length : c.length} ${arch ? 'archived ' : ''}products</div>` : empty('search', 'No products match', 'Try a different search or clear the filters.', `<button class="btn" data-act="inv-clear">Clear filters</button>`);
  const out = c.filter(p => pStatus(p) === 'out').length, low = c.filter(p => pStatus(p) === 'low').length;
  return `${pageHead('Inventory', `${plural(c.length, 'SKU')} · ${out} out of stock · ${low} low stock · prices in Philippine peso`, `<button class="btn" data-act="inv-arch">${icon('archive')} ${arch ? 'Back to active' : 'Archived (' + S.products.filter(p => p.archived).length + ')'}</button><button class="btn primary" data-act="prod-new">${icon('plus')} Add product</button>`)}
  <div class="toolbar"><div class="input-wrap"><span class="i-left">${icon('search')}</span><input class="input" id="inv_q" data-set="inv_q" type="search" placeholder="Search name, SKU or brand" value="${esc(q)}" aria-label="Search inventory"></div>
    ${sel('inv_cat', 'All categories', categories().map(x => [x, x]), cat)}
    ${sel('inv_status', 'All statuses', [['in', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock'], ['needs', 'Needs reorder (low or out)']], st)}
    ${sel('inv_sup', 'All suppliers', suppliers().map(x => [x, x]), sup)}</div>
  <div class="card flush">${body}</div>`;
};
Object.assign(ACTS, {
  'inv-clear': () => { Object.assign(S.ui, { inv_q: '', inv_cat: 'All', inv_status: 'All', inv_sup: 'All' }); render(); },
  'inv-arch': () => { S.ui.inv_arch = !getU('inv_arch', false); render(); },
  restore: (d) => { restoreProduct(d.sku); toast(prod(d.sku).name + ' restored to the catalog', 'ok'); render(); },
  'arch-ask': (d) => { const p = prod(d.sku); openOv(() => confirmDlg({ ic: 'archive', tone: 'gold', title: 'Archive this product?', text: `${esc(p.name)} will be hidden from the distributor catalog and from alerts. You can restore it from Archived.`, yes: 'Archive', yesAct: 'arch-do', yesData: `data-sku="${p.sku}"` }), { size: 'sm', back: keepBack() }); },
  'arch-do': (d) => { const p = prod(d.sku); archiveProduct(d.sku); closeOv(); toast(p.name + ' archived', 'ok'); render(); }
});

function productDrawer(sku) {
  const p = prod(sku), st = pStatus(p), margin = p.price ? (p.price - p.cost) / p.price * 100 : 0;
  const holders = DISTRIBUTORS.map(d => ({ d, q: (S.shop[d.id][sku] || {}).qty })).filter(x => x.q != null);
  return `${panelHead(esc(p.name), `${p.sku} · ${esc(p.category)}`)}<div class="panel-body">
    <div class="row wrap" style="margin-bottom:10px">${p.archived ? badge('neutral', 'Archived') : stockBadge(st)}</div>
    <p style="margin-bottom:6px">${esc(p.desc)}</p>
    <dl style="margin:0"><div class="kv"><dt>Brand</dt><dd>${esc(p.brand)}</dd></div><div class="kv"><dt>Supplier</dt><dd>${esc(p.supplier)}</dd></div><div class="kv"><dt>Unit price</dt><dd>${peso(p.price)} per ${p.unit.toLowerCase()}</dd></div><div class="kv"><dt>Cost price</dt><dd>${peso(p.cost)}</dd></div><div class="kv"><dt>Margin</dt><dd>${margin.toFixed(1)}% (${peso(p.price - p.cost)} per ${p.unit.toLowerCase()})</dd></div><div class="kv"><dt>In stock</dt><dd>${p.stock} ${p.unit.toLowerCase()}${p.stock === 1 ? '' : 's'}</dd></div><div class="kv"><dt>Reorder point</dt><dd>${p.rop}</dd></div><div class="kv"><dt>Stock value</dt><dd>${peso(p.stock * p.cost)} at cost · ${peso(p.stock * p.price)} at price</dd></div></dl>
    <div class="sec-title">Held by distributors</div>${holders.length ? holders.map(h => `<div class="list-row">${avatar(h.d.name, 'sm')}<span class="grow">${esc(h.d.name)}<span class="muted small" style="display:block">${esc(h.d.shop)}</span></span><b>${h.q}</b></div>`).join('') : '<p class="muted">No distributor tracks this product yet.</p>'}
  </div><div class="panel-foot">${p.archived ? `<button class="btn" data-act="restore-close" data-sku="${sku}">Restore</button>` : `<button class="btn" data-act="arch-ask" data-sku="${sku}">${icon('archive')} Archive</button><button class="btn" data-act="adj" data-sku="${sku}">${icon('sliders')} Adjust stock</button><button class="btn primary" data-act="prod-edit" data-sku="${sku}">${icon('edit')} Edit</button>`}</div>`;
}
ACTS['restore-close'] = (d) => { ACTS.restore(d); ACTS['ov-close'](); };

/* ---- Adjust stock ---- */
let ADJ_ERR = '';
function adjustHtml(sku) {
  const p = prod(sku), mode = FORM.mode || 'add', qty = parseInt(FORM.qty, 10);
  const next = isNaN(qty) ? p.stock : mode === 'add' ? p.stock + qty : mode === 'remove' ? Math.max(0, p.stock - qty) : qty;
  return `${panelHead('Adjust stock', `${esc(p.name)} · ${p.sku}`)}<div class="panel-body">
    <div class="alert info">${icon('info')}<span>Currently <b>${p.stock}</b> ${p.unit.toLowerCase()}${p.stock === 1 ? '' : 's'} in stock, reorder at ${p.rop}.</span></div>
    <div class="lbl">Adjustment</div><div class="seg block" style="margin-bottom:14px">${[['add', 'Add'], ['remove', 'Remove'], ['set', 'Set to']].map(([v, l]) => `<button type="button" class="${mode === v ? 'on' : ''}" data-act="fset" data-k="mode" data-v="${v}">${l}</button>`).join('')}</div>
    ${field('Quantity', fi('qty', { type: 'number', min: 0, ph: '0' }), { err: ADJ_ERR })}
    ${field('Reason', fs('reason', ['Received shipment', 'Cycle count correction', 'Damaged or lost', 'Other']))}
    <div class="alert ${stockStatus(next, p.rop) === 'in' ? 'ok' : stockStatus(next, p.rop) === 'low' ? 'warn' : 'err'}">${icon('info')}<span>New stock: <b>${next}</b> · ${STOCK_LABEL[stockStatus(next, p.rop)]}</span></div>
  </div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="adj-save" data-sku="${sku}">Save adjustment</button></div>`;
}
Object.assign(ACTS, {
  adj: (d) => { ADJ_ERR = ''; Object.assign(FORM, { mode: 'add', qty: '', reason: 'Received shipment' }); openOv(() => adjustHtml(d.sku), { size: 'sm', back: keepBack() }); },
  'adj-save': (d) => {
    const q = parseInt(FORM.qty, 10); if (isNaN(q) || q < 0) { ADJ_ERR = 'Enter a quantity of 0 or more.'; paintOv(); return; }
    const p = prod(d.sku); adjustStock(d.sku, FORM.mode || 'add', q); ADJ_ERR = '';
    closeOv();
    toast(`${p.name}: now ${p.stock} in stock`, 'ok'); render();
  }
});

/* ---- Add / edit product ---- */
let PF_ERR = {}, PF_MODE = 'add';
const UNITS = ['Piece', 'Set', 'Box', 'Pack', 'Roll', 'Unit'];
function productFormHtml() {
  const e = PF_ERR, edit = PF_MODE === 'edit';
  return `${panelHead(edit ? 'Edit product' : 'Add product', edit ? 'SKU cannot be changed.' : 'Fill in the details. New products start in stock.')}<div class="panel-body"><div class="form-grid">
    ${field('SKU', fi('sku', { ph: 'BIL-CUE-004', dis: edit }), { err: e.sku, hint: 'Format BIL-XXX-000' })}
    ${field('Product name', fi('name'), { err: e.name })}
    ${field('Category', fs('category', categories()))}
    ${field('Brand', fi('brand'), { err: e.brand })}
    ${field('Description', `<textarea class="input" id="f_desc" data-form="desc" rows="2">${esc(FORM.desc || '')}</textarea>`, { cls: 'full' })}
    ${field('Unit price (₱)', fi('price', { type: 'number', step: '0.01', min: 0 }), { err: e.price })}
    ${field('Cost price (₱)', fi('cost', { type: 'number', step: '0.01', min: 0 }), { err: e.cost })}
    ${field('Current stock', fi('stock', { type: 'number', min: 0 }), { err: e.stock })}
    ${field('Reorder point', fi('rop', { type: 'number', min: 0 }), { err: e.rop })}
    ${field('Supplier', fs('supplier', suppliers()))}
    ${field('Unit', fs('unit', UNITS))}
  </div></div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="prod-save">${edit ? 'Save changes' : 'Add product'}</button></div>`;
}
Object.assign(ACTS, {
  'prod-new': () => { PF_ERR = {}; PF_MODE = 'add'; Object.assign(FORM, { sku: '', name: '', category: categories()[0], brand: '', desc: '', price: '', cost: '', stock: '', rop: '', supplier: suppliers()[0], unit: 'Piece' }); openOv(productFormHtml, { size: 'wide' }); },
  'prod-edit': (d) => { const p = prod(d.sku); PF_ERR = {}; PF_MODE = 'edit'; const bk = keepBack(); closeOv(); Object.assign(FORM, { sku: p.sku, name: p.name, category: p.category, brand: p.brand, desc: p.desc, price: p.price, cost: p.cost, stock: p.stock, rop: p.rop, supplier: p.supplier, unit: p.unit }); openOv(productFormHtml, { size: 'wide', back: bk }); },
  'prod-save': () => {
    const f = FORM, e = {}, edit = PF_MODE === 'edit';
    if (!edit) { if (!/^[A-Z]{3}-[A-Z]{3}-\d{3}$/.test((f.sku || '').trim())) e.sku = 'Use the format BIL-CUE-004.'; else if (prod(f.sku.trim())) e.sku = 'This SKU already exists.'; }
    if (!(f.name || '').trim()) e.name = 'Product name is required.';
    if (!(f.brand || '').trim()) e.brand = 'Brand is required.';
    const price = parseFloat(f.price), cost = parseFloat(f.cost), stock = parseInt(f.stock, 10), rop = parseInt(f.rop, 10);
    if (!(price > 0)) e.price = 'Enter a price above 0.';
    if (isNaN(cost) || cost < 0) e.cost = 'Enter a cost of 0 or more.'; else if (cost > price) e.cost = 'Cost is higher than the price.';
    if (isNaN(stock) || stock < 0) e.stock = 'Enter 0 or more.';
    if (isNaN(rop) || rop < 0) e.rop = 'Enter 0 or more.';
    PF_ERR = e; if (Object.keys(e).length) { paintOv(); return; }
    const p = saveProduct({ sku: f.sku.trim(), name: f.name.trim(), category: f.category, brand: f.brand.trim(), desc: (f.desc || '').trim(), price, cost, stock, rop, supplier: f.supplier, unit: f.unit, csvStatus: '' }, PF_MODE);
    closeOv(); toast(`${p.name} ${edit ? 'updated' : 'added'}`, 'ok'); render();
  }
});

/* ============ Orders ============ */
const ORDER_TABS = ['All', 'New', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
PAGES.s.orders = (r) => {
  if (r.arg) AFTER.push(() => { if (orderById(r.arg)) openOv(() => orderDrawer(r.arg), { kind: 'drawer', back: '#/s/orders' }); });
  const tab = getU('ord_tab', 'All'), dId = getU('ord_dist', '');
  const base = S.orders.filter(o => !dId || o.dist === dId);
  const list = base.filter(o => tab === 'All' || o.status === tab).sort((a, b) => b.placed - a.placed);
  const tabs = ORDER_TABS.map(t => [t, t, t === 'All' ? base.length : base.filter(o => o.status === t).length]);
  return `${pageHead('Orders', 'Wholesale orders from distributors. Status moves New, Processing, Shipped, Delivered.')}
  ${dId ? `<div class="row" style="margin-bottom:12px"><span class="badge b-neutral">Distributor: ${esc(dist(dId).name)}</span><button class="link small" data-act="ord-clear">Clear</button></div>` : ''}
  ${tabsRow('ord_tab', tabs, tab)}
  <div class="card flush">${list.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Order ID</th><th>Distributor</th><th class="num">Items</th><th class="num">Total</th><th>Status</th><th>Placed</th><th class="right">Action</th></tr></thead><tbody>${list.map(o => `<tr class="click" data-act="go" data-to="#/s/orders/${o.id}"><td class="first"><b>${o.id}</b></td><td data-label="Distributor"><b>${esc(dist(o.dist).name)}</b><div class="muted small">${esc(dist(o.dist).shop)}</div></td><td data-label="Items" class="num">${o.items.length}</td><td data-label="Total" class="num"><b>${peso(orderTotal(o))}</b></td><td data-label="Status">${orderBadge(o.status)}</td><td data-label="Placed">${fmtDT(o.placed)}</td><td data-label=""><div class="acts"><button class="btn sm">View</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('list', 'No orders here', 'There are no orders with this status yet.')}</div>`;
};
ACTS['ord-clear'] = () => { S.ui.ord_dist = ''; render(); };
function orderDrawer(id) {
  const o = orderById(id), d = dist(o.dist), nxt = NEXT[o.status];
  const NEXT_LABEL = { New: 'Accept and start processing', Processing: 'Mark as shipped', Shipped: 'Mark as delivered' };
  const steps = ['New', 'Processing', 'Shipped', 'Delivered'], idx = steps.indexOf(o.status);
  return `${panelHead(o.id, `Placed ${fmtDT(o.placed)}`)}<div class="panel-body">
    <div class="row wrap" style="margin-bottom:8px">${orderBadge(o.status)}${o.reason ? `<span class="muted small">${esc(o.reason)}</span>` : ''}</div>
    <div class="steps" aria-hidden="true">${steps.map((s, i) => `<div class="s ${o.status === 'Cancelled' ? 'cancel' : i <= idx ? 'done' : ''}"><i></i>${s}</div>`).join('')}</div>
    <div class="sec-title">Distributor</div>
    <div class="row">${avatar(d.name)}<div class="grow"><b>${esc(d.name)}</b><div class="muted small">${esc(d.shop)} · ${esc(d.city)}</div></div><button class="btn sm" data-act="chat-order" data-id="${o.id}">${icon('chat', 15)} Message</button></div>
    <div class="sec-title">Products</div><div class="line-items">${o.items.map(i => { const p = prod(i.sku), short = ['New', 'Processing'].includes(o.status) && p.stock < i.qty; return `<div class="li"><div class="grow"><b class="title-sm">${esc(p.name)}</b><div class="muted small">${i.qty} × ${peso(i.price)}${['New', 'Processing'].includes(o.status) ? ` · ${short ? `<span style="color:var(--bad);font-weight:700">Short: only ${p.stock} on hand</span>` : `${p.stock} on hand`}` : ''}</div></div><b>${peso(i.qty * i.price)}</b></div>`; }).join('')}</div>
    <div class="totals"><div><span>Subtotal</span><span>${peso(orderSub(o))}</span></div><div><span>VAT (12%)</span><span>${peso(orderVat(o))}</span></div><div class="t"><span>Total</span><span>${peso(orderTotal(o))}</span></div></div>
    <div class="sec-title">Status history</div><ul class="timeline">${[...o.history].reverse().map(h => `<li><b>${h.status}</b><span class="muted small">${fmtDT(h.at)}</span></li>`).join('')}</ul>
  </div>${nxt || ['New', 'Processing'].includes(o.status) ? `<div class="panel-foot">${['New', 'Processing'].includes(o.status) ? `<button class="btn" data-act="ord-cancel-ask" data-id="${o.id}">Cancel order</button>` : ''}${nxt ? `<button class="btn primary" data-act="ord-adv" data-id="${o.id}">${NEXT_LABEL[o.status]}</button>` : ''}</div>` : ''}`;
}
Object.assign(ACTS, {
  'ord-adv': (d) => { const res = advanceOrder(d.id); toast(res.msg, res.ok ? 'ok' : 'err'); render(); },
  'ord-cancel-ask': (d) => { FORM.reason = 'Out of stock'; const back = keepBack(); openOv(() => `${panelHead('Cancel order ' + d.id, 'The distributor will be notified.')}<div class="panel-body">${field('Reason', fs('reason', ['Out of stock', 'Distributor request', 'Payment issue', 'Other']))}<div class="alert warn">${icon('alert')}<span>This cannot be undone. The order moves to Cancelled.</span></div></div><div class="panel-foot"><button class="btn" data-act="ov-close">Keep order</button><button class="btn danger" data-act="ord-cancel-do" data-id="${d.id}">Cancel order</button></div>`, { size: 'sm', back }); },
  'ord-cancel-do': (d) => { cancelOrder(d.id, FORM.reason || 'Other', 'supplier'); ACTS['ov-close'](); toast(d.id + ' cancelled', 'ok'); render(); },
  'chat-order': (d) => { const o = orderById(d.id), t = ensureThread(o.dist, o.id); closeOv(); S.ui.chat_open = true; go('#/s/chat/' + t.id); }
});

/* ============ Distributors ============ */
PAGES.s.distributors = () => {
  const tab = getU('dist_tab', 'All'), q = getU('dist_q', '').toLowerCase();
  let list = DISTRIBUTORS.filter(d => !q || (d.name + d.shop + d.city).toLowerCase().includes(q));
  const needN = list.filter(d => distNeedsRestock(d.id).length).length;
  if (tab === 'Needs restock') list = list.filter(d => distNeedsRestock(d.id).length);
  return `${pageHead('Distributors', 'Stock held by each distributor. Items at or below their reorder level are flagged.')}
  ${tabsRow('dist_tab', [['All', 'All', DISTRIBUTORS.length], ['Needs restock', 'Needs restock', needN]], tab)}
  <div class="toolbar"><div class="input-wrap"><span class="i-left">${icon('search')}</span><input class="input" id="dist_q" data-set="dist_q" type="search" placeholder="Search distributor, shop or city" value="${esc(getU('dist_q', ''))}" aria-label="Search distributors"></div></div>
  ${list.length ? `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${list.map(d => { const rows = shopRows(d.id), need = rows.filter(x => x.status !== 'in'); return `<article class="card dist-card"><div class="row">${avatar(d.name, 'gold')}<div class="grow"><b>${esc(d.name)}</b><div class="muted small">${esc(d.shop)} · ${esc(d.city)}</div></div>${need.length ? badge('low', `${need.length} to restock`) : badge('in', 'Healthy')}</div><div>${rows.sort((a, b) => sev[a.status] - sev[b.status]).slice(0, 6).map(x => `<div class="stock-line"><span class="ellipsis">${esc(x.p.name)}</span><span class="nowrap"><b style="color:${x.status === 'in' ? 'inherit' : x.status === 'low' ? 'var(--warn)' : 'var(--bad)'}">${x.qty}</b> <span class="muted">/ ${x.rop}</span></span></div>`).join('')}${rows.length > 6 ? `<div class="muted small" style="padding-top:6px">+ ${rows.length - 6} more tracked items</div>` : ''}</div><div class="row"><button class="btn sm grow" data-act="dist-chat" data-id="${d.id}">${icon('chat', 15)} Message</button><button class="btn sm grow" data-act="dist-orders" data-id="${d.id}">${icon('list', 15)} Orders</button></div></article>`; }).join('')}</div>` : `<div class="card">${empty('users', 'No distributors found', 'Try another search.')}</div>`}`;
};
Object.assign(ACTS, {
  'dist-chat': (d) => { const orders = S.orders.filter(o => o.dist === d.id).sort((a, b) => b.placed - a.placed); const t = ensureThread(d.id, orders.length ? orders[0].id : 'General'); S.ui.chat_open = true; go('#/s/chat/' + t.id); },
  'dist-orders': (d) => { S.ui.ord_dist = d.id; S.ui.ord_tab = 'All'; go('#/s/orders'); }
});

/* ============ Returns ============ */
const RET_TABS = ['All', 'Submitted', 'Restocked', 'Separate handling', 'Rejected'];
PAGES.s.returns = (r) => {
  if (r.arg) AFTER.push(() => { if (returnById(r.arg)) openReturn(r.arg, '#/s/returns'); });
  const tab = getU('ret_tab', 'All');
  const list = S.returns.filter(x => tab === 'All' || x.status === tab);
  return `${pageHead('Returns', 'Review return requests. Submitting a request never restocks items. Restocking happens only when you process a request as good condition.')}
  ${tabsRow('ret_tab', RET_TABS.map(t => [t, t, t === 'All' ? S.returns.length : S.returns.filter(x => x.status === t).length]), tab)}
  <div class="card flush">${list.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Request</th><th>Distributor</th><th>Order</th><th>Product</th><th class="num">Qty</th><th>Reported condition</th><th>Status</th><th>Submitted</th><th class="right">Action</th></tr></thead><tbody>${list.map(x => `<tr class="click" data-act="go" data-to="#/s/returns/${x.id}"><td class="first"><b>${x.id}</b></td><td data-label="Distributor">${esc(dist(x.dist).name)}</td><td data-label="Order" class="sku">${x.order}</td><td data-label="Product">${esc(prod(x.sku).name)}</td><td data-label="Qty" class="num">${x.qty}</td><td data-label="Condition">${condLabel(x.cond)}</td><td data-label="Status">${returnBadge(x.status)}</td><td data-label="Submitted">${fmtDT(x.at)}</td><td data-label=""><div class="acts"><button class="btn sm ${x.status === 'Submitted' ? 'primary' : ''}">${x.status === 'Submitted' ? 'Review' : 'Open'}</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('undo', 'No returns here', 'No return requests match this status.')}</div>`;
};
function openReturn(id, back) {
  const r = returnById(id); FORM.dec = r.cond === 'good' ? 'good' : 'damaged'; FORM.note = r.note || '';
  openOv(() => returnHtml(id), { size: 'wide', back });
}
function returnHtml(id) {
  const r = returnById(id), p = prod(r.sku), d = dist(r.dist), isS = S.role === 'supplier', open = r.status === 'Submitted' && isS;
  const opt = (v, t, s) => `<div class="radio-card ${FORM.dec === v ? 'on' : ''}" role="radio" aria-checked="${FORM.dec === v}" tabindex="0" data-act="fset" data-k="dec" data-v="${v}"><span>${icon(FORM.dec === v ? 'check' : 'plus', 18)}</span><div><b>${t}</b><span>${s}</span></div></div>`;
  return `${panelHead((isS ? 'Process return ' : 'Return ') + id, isS ? `${esc(d.name)} · order ${r.order}` : `Order ${r.order}`)}<div class="panel-body">
    <div class="row wrap" style="margin-bottom:8px">${returnBadge(r.status)}<span class="muted small">Submitted ${fmtDT(r.at)}</span></div>
    <div class="list-row"><span class="tile">${catIcon(p.category)}</span><span class="grow"><b class="title-sm">${esc(p.name)}</b><span class="muted small" style="display:block">${r.qty} × ${peso(p.price)} · reported as ${condLabel(r.cond).toLowerCase()}</span></span></div>
    <div class="sec-title">Reason for return</div><p>${esc(r.reason)}</p>
    ${r.photos ? `<div class="sec-title">Photos from distributor</div><div class="photos">${Array.from({ length: r.photos }, (_, i) => `<div class="photo" title="Simulated photo ${i + 1}">${icon('image', 26)}</div>`).join('')}</div>` : ''}
    ${open ? `<div class="sec-title">Decision</div>${opt('good', 'Good condition: restock', `Adds ${r.qty} back to ${esc(p.name)} stock (now ${p.stock}).`)}${opt('damaged', 'Damaged or defective: handle separately', 'Not restocked. Tracked for warranty or disposal.')}${opt('reject', 'Reject request', 'Items stay with the distributor.')}${field('Processing note', `<textarea class="input" id="f_note" data-form="note" rows="2" placeholder="Optional note for the distributor">${esc(FORM.note || '')}</textarea>`)}` : (r.status === 'Submitted' ? `<div class="alert info" style="margin-top:14px">${icon('info')}<span>Waiting for BilMagic to inspect the items. Submitting a return never restocks them.</span></div>` : `<div class="sec-title">Processing note</div><p>${esc(r.note || 'No note added.')}</p>`)}
  </div>${open ? `<div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="ret-do" data-id="${id}">Confirm decision</button></div>` : ''}`;
}
ACTS['ret-do'] = (d) => { const r = processReturn(d.id, FORM.dec, (FORM.note || '').trim()); ACTS['ov-close'](); toast(`${r.id}: ${r.status}`, 'ok'); render(); };

/* ============ Messages (shared by both roles) ============ */
function chatPage(role, r) {
  const mine = role === 'supplier' ? S.threads : myThreads();
  const sorted = [...mine].sort((a, b) => (threadTime(b) ? 1 : 0) - (threadTime(a) ? 1 : 0) || threadTime(b) - threadTime(a));
  if (r.arg && threadById(r.arg)) { S.ui.chat_t = r.arg; S.ui.chat_open = true; } else if (ROUTE_CHANGED) S.ui.chat_open = false;
  const selId = getU('chat_t', sorted[0] && sorted[0].id), t = threadById(selId) && mine.includes(threadById(selId)) ? threadById(selId) : sorted[0];
  if (t) S.ui.chat_t = t.id;
  const inConv = !!getU('chat_open', false) && !!t;
  if (t && (inConv || !isPhone())) markThreadRead(t, role);
  const other = (th) => role === 'supplier' ? dist(th.dist).name : 'BilMagic Supply';
  const list = sorted.map(th => { const lm = lastMsg(th), un = th.msgs.filter(m => !m.read && m.from === (role === 'supplier' ? 'dist' : 'supplier')).length; return `<button class="thread ${t && th.id === t.id ? 'on' : ''}" data-act="open-thread" data-id="${th.id}">${avatar(other(th), 'sm')}<span class="grow"><span class="meta"><b>${esc(other(th))}</b><span class="muted small">${lm ? fmtSmart(lm.at) : ''}</span></span><span class="prev">${lm ? (lm.from === (role === 'supplier' ? 'supplier' : 'dist') ? 'You: ' : '') + esc(lm.text) : 'No messages yet'}</span><span class="ctx">${th.ctx === 'General' ? 'General' : 'Order ' + th.ctx}</span></span>${un ? `<span class="badge-n">${un}</span>` : ''}</button>`; }).join('');
  let conv = `<div class="empty-conv">${icon('chat', 32)}<p>Select a conversation</p></div>`;
  if (t) {
    const o = t.ctx !== 'General' ? orderById(t.ctx) : null;
    const viewRoute = role === 'supplier' ? '#/s/orders/' : '#/d/order/';
    conv = `<div class="conv-head"><button class="icon-btn sm show-m" data-act="chat-back" aria-label="Back to conversations">${icon('left')}</button>${avatar(other(t), 'sm')}<div class="grow"><b>${esc(other(t))}</b><div class="muted small">${role === 'supplier' ? esc(dist(t.dist).shop) : 'Supplier'}</div></div></div>
      ${o ? `<div class="pinned"><span class="lbl">Order</span><b>${o.id}</b>${orderBadge(o.status)}<span class="small muted">${peso(orderTotal(o))}</span><a class="btn sm" style="margin-left:auto" href="${viewRoute}${o.id}">View order</a></div>` : `<div class="pinned"><span class="lbl">General conversation</span><span class="small muted">Not linked to an order</span></div>`}
      <div class="msgs" aria-live="polite">${t.msgs.length ? t.msgs.map(m => `<div class="bubble ${m.from === (role === 'supplier' ? 'supplier' : 'dist') ? 'me' : ''}">${esc(m.text)}<time>${fmtDT(m.at)}</time></div>`).join('') : `<div class="empty-conv">No messages yet. Say hello.</div>`}</div>
      <form class="composer" data-submit="chat" novalidate><input id="f_msg" data-form="msg" value="${esc(FORM.msg || '')}" placeholder="Write a message" aria-label="Message" autocomplete="off"><button class="btn primary" type="submit">${icon('send', 16)} <span class="hide-m">Send</span></button></form>`;
  }
  return `${pageHead('Messages', role === 'supplier' ? 'Supplier and distributor conversations, linked to orders.' : 'Chat with BilMagic Supply about your orders.')}
  <div class="alert info hide-m">${icon('info')}<span>Simulated chat. The spec describes WebSocket delivery and push notifications, which are not connected in this prototype. The other side auto-replies after a moment.</span></div>
  <div class="split ${inConv ? 'in-conv' : ''}"><div class="thread-list" role="list">${list}</div><div class="conv">${conv}</div></div>`;
}
PAGES.s.chat = (r) => chatPage('supplier', r);
Object.assign(ACTS, {
  'open-thread': (d) => { S.ui.chat_t = d.id; S.ui.chat_open = true; render(); },
  'chat-back': () => { S.ui.chat_open = false; render(); }
});
SUBMIT.chat = () => {
  const text = (FORM.msg || '').trim(); if (!text) return;
  const t = threadById(getU('chat_t')); if (!t) return;
  sendMessage(t.id, S.role === 'supplier' ? 'supplier' : 'dist', text, () => { if (/\/chat/.test(location.hash)) render(); });
  FORM.msg = ''; render(); const i = $('#f_msg'); if (i) i.focus();
};

/* ============ Reports ============ */
PAGES.s.reports = () => {
  const range = getU('rep_range', 30), st = rangeStats(range), val = stockValue();
  const pts = rangeSeries(range).map(d => ({ label: fmtD(d.date), value: d.value }));
  const top = topSellers(range, 5), c = catalog();
  const crit = c.filter(p => pStatus(p) !== 'in').sort((a, b) => sev[pStatus(a)] - sev[pStatus(b)]).slice(0, 8);
  const byCat = categories().map(cat => ({ cat, v: c.filter(p => p.category === cat).reduce((s, p) => s + p.stock * p.cost, 0) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const maxV = Math.max(...byCat.map(x => x.v), 1);
  const orders = S.orders.filter(o => o.status !== 'Cancelled' && o.placed >= now() - range * 864e5);
  return `${pageHead('Reports', 'Sales and stock health. All figures are synthetic sample data.', rangeSeg('rep_range', range))}
  <div class="kpis four">
    ${kpi({ label: `Revenue · ${range} days`, icon: 'trend', val: pesoK(st.total), sub: st.delta != null ? `${st.delta >= 0 ? '+' : ''}${st.delta.toFixed(1)}% vs previous period` : 'No earlier period to compare' })}
    ${kpi({ label: 'Average order', icon: 'list', val: orders.length ? peso(orders.reduce((s, o) => s + orderTotal(o), 0) / orders.length) : '–', sub: `${plural(orders.length, 'order')} in this period` })}
    ${kpi({ label: 'Inventory value', icon: 'package', val: pesoK(val.cost), sub: `at cost · ${pesoK(val.retail)} at price` })}
    ${kpi({ label: 'Gross margin on stock', icon: 'chart', tone: 'ok', val: val.margin.toFixed(1) + '%', sub: `${c.filter(p => pStatus(p) === 'in').length} in stock · ${c.filter(p => pStatus(p) === 'low').length} low · ${c.filter(p => pStatus(p) === 'out').length} out` })}
  </div>
  <div class="grid-2">
    <section class="card gold"><div class="card-head"><div><h2>Total sales · ${range} days</h2><p>Order value per day</p></div></div><div class="row wrap" style="gap:12px"><span class="big-num">${peso(st.total)}</span>${st.delta != null ? `<span class="chip-up ${st.delta < 0 ? 'down' : ''}">${st.delta >= 0 ? '+' : ''}${st.delta.toFixed(1)}%</span>` : ''}</div>${lineChart(pts)}</section>
    <section class="card"><div class="card-head"><div><h2>Top sellers</h2><p>By sales value, ${range} days</p></div></div>${top.map((t, i) => `<div class="list-row"><span class="rank">${i + 1}</span><span class="grow" style="min-width:0"><b class="title-sm ellipsis" style="display:block">${esc(t.p.name)}</b><span class="muted small">${t.p.sku} · ${plural(t.units, 'unit')}</span></span><b>${peso(t.value)}</b></div>`).join('')}</section>
  </div>
  <div class="grid-eq">
    <section class="card"><div class="card-head"><div><h2>Stock value by category</h2><p>At cost price</p></div></div>${byCat.map(x => `<div class="bar-row" style="grid-template-columns:130px 1fr 64px"><span class="nm" title="${esc(x.cat)}">${esc(x.cat)}</span><div class="sb"><i style="flex:${x.v};background:var(--black);max-width:${x.v / maxV * 100}%"></i></div><span class="ct">${pesoK(x.v)}</span></div>`).join('')}</section>
    <section class="card flush"><div style="padding:20px 20px 4px" class="card-head"><div><h2>Critical stock</h2><p>Low or out of stock, most urgent first</p></div></div><div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Product</th><th>SKU</th><th class="num">Stock</th><th class="num">Reorder at</th><th>Status</th></tr></thead><tbody>${crit.map(p => `<tr class="click" data-act="go" data-to="#/s/inventory/${p.sku}"><td class="first"><b>${esc(p.name)}</b></td><td data-label="SKU" class="sku">${p.sku}</td><td data-label="Stock" class="num">${p.stock}</td><td data-label="Reorder at" class="num">${p.rop}</td><td data-label="Status">${stockBadge(pStatus(p))}</td></tr>`).join('')}</tbody></table></div></section>
  </div>`;
};

/* ============ Settings ============ */
function settingsPage(role) {
  const pr = S.profile[role], isS = role === 'supplier';
  if (FORM.sname === undefined) Object.assign(FORM, { sname: pr.name, semail: pr.email, scompany: isS ? pr.company : pr.shop });
  const prefs = S.prefs[role], e = S.ui.set_err || {};
  const prefRows = isS ? [['stock', 'Low-stock alerts', 'When a product reaches its reorder point'], ['orders', 'New orders', 'When a distributor places an order'], ['status', 'Order status changes', 'When an order moves to a new status'], ['returns', 'Return updates', 'When a return is submitted or processed'], ['chat', 'New messages', 'When a distributor writes to you']] : [['orders', 'Order updates', 'When an order changes status'], ['stock', 'Low stock alerts', 'When an item hits its reorder point'], ['chat', 'Chat messages', 'When BilMagic Supply writes to you']];
  return `${pageHead('Account and settings', 'Profile, notification preferences and prototype tools.')}
  <div class="grid-eq">
    <section class="card"><div class="card-head"><div><h2>Profile</h2></div></div>
      ${field('Full name', fi('sname'), { err: e.name })}${field('Email', fi('semail', { type: 'email' }), { err: e.email })}${field(isS ? 'Company' : 'Shop', fi('scompany'))}
      ${field('Role', `<input class="input" value="${isS ? 'Supplier (prototype role, set at sign-in)' : 'Distributor (prototype role, set at sign-in)'}" disabled>`)}
      ${!isS ? `${field('Delivery address', `<textarea class="input" id="f_saddr" data-form="saddr" rows="2">${esc(FORM.saddr === undefined ? (FORM.saddr = pr.address) : FORM.saddr)}</textarea>`)}${field('Language', fs('slang', ['English', 'Filipino']))}` : ''}
      <button class="btn primary" data-act="save-profile">Save changes</button></section>
    <div class="stack">
      <section class="card"><div class="card-head"><div><h2>Notification preferences</h2></div></div>${prefRows.map(([k, l, d]) => sw(role + '.' + k, prefs[k], l, d)).join('')}</section>
      ${!isS ? `<section class="card"><div class="card-head"><div><h2>Password and security</h2></div></div><p class="muted" style="margin-bottom:12px">Change your password. Prototype only: nothing is stored.</p><button class="btn" data-act="pw-open">${icon('lock', 16)} Change password</button></section>` : ''}
      <section class="card"><div class="card-head"><div><h2>Prototype tools</h2><p>Simulated states for design review. Nothing here touches a real backend.</p></div></div>
        <div class="pref"><div><b>Simulate a network error</b><span>Pages show an error state with retry.</span></div><label class="switch"><input type="checkbox" data-tool="error" ${S.tools.error ? 'checked' : ''} aria-label="Simulate a network error"><i></i></label></div>
        <div class="pref"><div><b>Simulate slow loading</b><span>Pages show a loading skeleton for a moment.</span></div><label class="switch"><input type="checkbox" data-tool="slow" ${S.tools.slow ? 'checked' : ''} aria-label="Simulate slow loading"><i></i></label></div>
        <div class="row wrap" style="margin-top:14px"><button class="btn" data-act="reset-data">${icon('refresh', 16)} Reset sample data</button><button class="btn" data-act="logout-confirm">${icon('logout', 16)} Log out</button></div></section>
    </div>
  </div>`;
}
PAGES.s.settings = () => settingsPage('supplier');
Object.assign(ACTS, {
  'save-profile': () => {
    const role = S.role, e = {};
    if (!(FORM.sname || '').trim()) e.name = 'Name is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((FORM.semail || '').trim())) e.email = 'Enter a valid email address.';
    S.ui.set_err = e; if (Object.keys(e).length) { render(); return; }
    const pr = S.profile[role]; pr.name = FORM.sname.trim(); pr.email = FORM.semail.trim();
    if (role === 'supplier') pr.company = FORM.scompany; else { pr.shop = FORM.scompany; pr.address = FORM.saddr || pr.address; pr.language = FORM.slang || pr.language; }
    toast('Profile saved', 'ok'); render();
  },
  'reset-data': () => openOv(() => confirmDlg({ ic: 'refresh', tone: 'gold', title: 'Reset sample data?', text: 'Orders, stock changes, returns, messages and your cart go back to the original CSV values.', yes: 'Reset', yesAct: 'reset-do' }), { size: 'sm' }),
  'reset-do': () => { closeOv(); resetData(); toast('Sample data reset', 'ok'); render(); }
});
