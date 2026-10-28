/* app.js: hash router, app shell (sidebar / top bar / bottom tabs), sign-in, notifications and global event handling. */

const PAGES = { s: {}, d: {} };      // filled by supplier.js and distributor.js
const ACTS = {};                      // click actions, looked up by data-act
const QTY = {};                       // quantity stepper handlers by prefix
const HOME = { supplier: '#/s/dashboard', distributor: '#/d/home' };
const AREA = { supplier: 's', distributor: 'd' };
let LASTKEY = '', AFTER = [], LOADING = false, ROUTE_CHANGED = false;
function rewriteHash(h) { history.replaceState(null, '', h); LASTKEY = h; }
const isPhone = () => window.matchMedia('(max-width: 767px)').matches;
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length || parts[0] === 'signin') return { area: 'signin' };
  return { area: parts[0], page: parts[1] || '', arg: parts[2] || '', arg2: parts[3] || '' };
}

/* ---------- Navigation config ---------- */
const NAV = {
  supplier: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', tab: true },
    { id: 'inventory', label: 'Inventory', icon: 'package', tab: true },
    { id: 'orders', label: 'Orders', icon: 'list', tab: true, badge: () => newOrderCount() },
    { id: 'distributors', label: 'Distributors', icon: 'users' },
    { id: 'returns', label: 'Returns', icon: 'undo', badge: () => reviewCount() },
    { id: 'chat', label: 'Messages', icon: 'chat', tab: true, badge: () => unreadChat('supplier') },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ],
  distributor: [
    { id: 'home', label: 'Home', icon: 'home', tab: true },
    { id: 'catalog', label: 'Catalog', icon: 'package', tab: true },
    { id: 'orders', label: 'Orders & Returns', tabLabel: 'Orders', icon: 'list', tab: true },
    { id: 'stock', label: 'My Stock', icon: 'grid' },
    { id: 'chat', label: 'Messages', icon: 'chat', tab: true, badge: () => unreadChat('distributor') },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ]
};
const ALIAS = { s: { }, d: { product: 'catalog', cart: 'catalog', 'order-placed': 'catalog', order: 'orders', return: 'orders', 'return-submitted': 'orders' } };
const TITLES = { s: { more: 'More', notifications: 'Notifications' }, d: { menu: 'Menu', notifications: 'Notifications', product: 'Product', cart: 'Cart', order: 'Order', return: 'Return request', 'order-placed': 'Order placed', 'return-submitted': 'Return submitted' } };

/* ---------- Render ---------- */
function render() {
  const r = parseRoute();
  if (!S.role) { if (r.area !== 'signin') { location.hash = '#/signin'; return; } }
  else if (r.area === 'signin' || r.area !== AREA[S.role]) { location.hash = HOME[S.role]; return; }

  const key = location.hash, changed = key !== LASTKEY;
  const ae = document.activeElement, fid = ae && ae.id && $('#app').contains(ae) ? ae.id : '', fsel = fid && ae.selectionStart != null ? ae.selectionStart : null;
  const y = changed ? 0 : window.scrollY;
  ROUTE_CHANGED = changed;
  if (changed) { LASTKEY = key; if (OV) { OV = null; $('#overlay').innerHTML = ''; } Object.keys(FORM).forEach(k => delete FORM[k]); }
  AFTER = [];
  document.body.classList.toggle('lock', !!OV);

  if (r.area === 'signin') { $('#app').innerHTML = signinPage(); document.title = 'Sign in · BilMagic'; }
  else {
    const reg = PAGES[r.area], page = r.page || ''; const fn = reg[page] || reg[Object.keys(reg)[0]];
    if (changed && S.tools.slow && page !== 'settings') { LOADING = true; setTimeout(() => { LOADING = false; render(); }, 900); }
    let body;
    if (LOADING) body = skeleton();
    else if (S.tools.error && page !== 'settings' && !['more', 'menu'].includes(page)) body = errorCard();
    else body = fn(r);
    $('#app').innerHTML = shell(r, body);
    const title = (NAV[S.role].find(n => n.id === page) || {}).label || (TITLES[r.area] || {})[page] || '';
    document.title = (title ? title + ' · ' : '') + 'BilMagic';
  }
  if (OV) paintOv();
  window.scrollTo(0, y);
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (fsel != null && el.setSelectionRange && !['number', 'email'].includes(el.type)) try { el.setSelectionRange(fsel, fsel); } catch (e) { } } }
  const ms = $('.msgs'); if (ms) ms.scrollTop = ms.scrollHeight;
  if (changed) AFTER.forEach(f => f());
}

function activeId(r) {
  const id = ALIAS[r.area][r.page] || r.page;
  return id;
}

function shell(r, body) {
  const role = S.role, items = NAV[role], act = activeId(r), me = role === 'supplier' ? S.profile.supplier : S.profile.distributor;
  const meName = role === 'supplier' ? me.name : me.name, meSub = role === 'supplier' ? 'Supplier role (prototype)' : me.shop;
  const side = items.map(n => { const b = n.badge ? n.badge() : 0; return `<a href="#/${AREA[role]}/${n.id}" class="${act === n.id ? 'on' : ''}" ${act === n.id ? 'aria-current="page"' : ''}>${icon(n.icon, 20)}<span class="lbl">${n.label}</span>${b ? `<span class="badge-n">${b}</span><i class="dot-n"></i>` : ''}</a>`; }).join('');
  const tabs = items.filter(n => n.tab).map(n => { const b = n.badge ? n.badge() : 0; return `<a href="#/${AREA[role]}/${n.id}" class="${act === n.id ? 'on' : ''}">${icon(n.icon, 22)}<span>${n.tabLabel || n.label}</span>${b ? `<span class="badge-n">${b}</span>` : ''}</a>`; }).join('');
  const moreId = role === 'supplier' ? 'more' : 'menu';
  const moreOn = r.page === moreId || (!items.filter(n => n.tab).some(n => n.id === act) && r.page !== 'notifications');
  const crumb = (items.find(n => n.id === act) || {}).label || (TITLES[r.area] || {})[r.page] || '';
  const nUn = unreadNotifs(role);
  return `<div class="shell">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="brand">${LOGO}<div><b>BilMagic</b><small>${role === 'supplier' ? 'Supplier workspace' : 'Distributor portal'}</small></div></div>
      <nav class="nav">${side}</nav>
      <div class="nav-bottom"><div class="usercard">${avatar(meName, 'gold')}<div><b>${esc(meName)}</b><small>${esc(meSub)}</small></div><button class="icon-btn sm" data-act="logout-confirm" aria-label="Log out" title="Log out">${icon('logout')}</button></div></div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <div class="top-logo">${LOGO}<span>BilMagic</span></div>
        <div class="crumbs">${role === 'supplier' ? 'Supplier workspace' : 'Distributor portal'} <b>/ ${esc(crumb)}</b></div>
        <div class="top-search"><span class="i-left">${icon('search')}</span><input id="gsearch" type="search" placeholder="Search products or SKU" aria-label="Search products" data-act-enter="gsearch"></div>
        <div class="top-actions">
          <span class="pill-sample">Sample data · simulated</span>
          ${role === 'distributor' ? `<a class="icon-btn" href="#/d/cart" aria-label="Cart">${icon('cart')}${cartCount() ? `<span class="badge-n">${cartCount()}</span>` : ''}</a>` : ''}
          <button class="icon-btn" data-act="bell" aria-label="Notifications">${icon('bell')}${nUn ? `<span class="badge-n">${nUn}</span>` : ''}</button>
          <button class="av" data-act="user-menu" aria-label="Account menu" style="border:0">${esc(initials(meName))}</button>
        </div>
      </header>
      <main class="content" id="view">${body}</main>
    </div>
    <nav class="tabbar" aria-label="Tabs">${tabs}<a href="#/${AREA[role]}/${moreId}" class="${moreOn ? 'on' : ''}">${icon(role === 'supplier' ? 'more' : 'menu', 22)}<span>${role === 'supplier' ? 'More' : 'Menu'}</span></a></nav>
  </div>`;
}

/* ---------- Sign in ---------- */
function signinPage() {
  const u = S.ui.signin || (S.ui.signin = { role: 'supplier', view: 'signin', err: '', loading: false, show: false });
  const supplier = u.role === 'supplier';
  const hero = `<section class="auth-hero"><div class="brand">${LOGO}<div><b>BilMagic</b><small>Inventory System</small></div></div>
    <h2>Know what is in stock. <em>Reorder in one tap.</em></h2>
    <div class="feat"><span class="ic">${icon('trend')}</span>Stock levels with low and out-of-stock alerts</div>
    <div class="feat"><span class="ic">${icon('refresh')}</span>Wholesale reorders for distributors</div>
    <div class="feat"><span class="ic">${icon('chat')}</span>B2B chat and returns in one place</div>
    <div class="auth-foot">Prototype v3.0 · Sample data only · No live authentication or backend</div></section>`;
  let form;
  if (u.view === 'signin') {
    form = `<form class="auth-form" data-submit="signin" novalidate>
      <h1>Sign in</h1><p>${supplier ? 'Manage inventory, orders, distributors, returns and messages.' : 'Check your shop stock, reorder from BilMagic and track returns.'}</p>
      <div class="lbl">Sign in as</div>
      <div class="seg block" role="group" aria-label="Role">${['supplier', 'distributor'].map(r => `<button type="button" class="${u.role === r ? 'on' : ''}" data-act="role" data-v="${r}" aria-pressed="${u.role === r}">${r === 'supplier' ? 'Supplier' : 'Distributor'}</button>`).join('')}</div>
      <p class="small muted" style="margin:8px 0 16px">Prototype only: choosing a role here does not grant access in a real system.</p>
      ${u.err ? `<div class="alert err" role="alert">${icon('alert')}<span>${esc(u.err)}</span></div>` : ''}
      ${field('Email address', fi('email', { type: 'email', ph: supplier ? 'supplier@bilmagic.com' : 'roberto@santoscue.ph', auto: 'email' }), { err: u.errs && u.errs.email })}
      ${field('Password', `<div class="input-wrap"><input class="input ${u.errs && u.errs.pw ? 'bad' : ''}" id="f_pw" data-form="pw" type="${u.show ? 'text' : 'password'}" value="${esc(FORM.pw || '')}" placeholder="Enter your password" autocomplete="current-password" style="padding-left:12px;padding-right:48px"><button type="button" class="icon-btn sm i-right" style="border:0" data-act="pw-eye" aria-label="${u.show ? 'Hide' : 'Show'} password">${icon(u.show ? 'eyeoff' : 'eye')}</button></div>`, { err: u.errs && u.errs.pw })}
      <div class="row" style="justify-content:space-between;margin:4px 0 18px"><label class="check"><input type="checkbox" checked> Remember me</label><button type="button" class="link" data-act="forgot">Forgot password?</button></div>
      <button class="btn primary lg block" type="submit" ${u.loading ? 'disabled' : ''}>${u.loading ? 'Signing in…' : 'Sign in'}</button>
      <p class="auth-note">Prototype sign-in: use any email address and a password of 6+ characters. Try the password <b>wrongpass</b> to preview the error state.</p></form>`;
  } else if (u.view === 'forgot') {
    form = `<form class="auth-form" data-submit="forgot" novalidate><button type="button" class="back" data-act="to-signin">${icon('left')} Back to sign in</button><h1>Reset your password</h1><p>Enter your email and we will show you what the reset flow looks like.</p>
      ${field('Email address', fi('email', { type: 'email', ph: 'you@company.com' }), { err: u.errs && u.errs.email })}
      <button class="btn primary lg block" type="submit">Send reset link</button></form>`;
  } else {
    form = `<div class="auth-form"><div class="confirm-ic ok">${icon('check', 24)}</div><h1>Check your inbox</h1><p>In a real system a reset link would be sent to <b>${esc(u.sentTo)}</b>. Nothing was sent in this prototype.</p><button class="btn primary lg block" data-act="to-signin">Back to sign in</button></div>`;
  }
  return `<div class="auth">${hero}<div class="auth-form-wrap">${form}</div></div>`;
}
Object.assign(ACTS, {
  role: (d) => { const u = S.ui.signin; u.role = d.v; u.err = ''; u.errs = null; render(); },
  'pw-eye': () => { S.ui.signin.show = !S.ui.signin.show; render(); },
  forgot: () => { Object.assign(S.ui.signin, { view: 'forgot', err: '', errs: null }); render(); },
  'to-signin': () => { Object.assign(S.ui.signin, { view: 'signin', err: '', errs: null }); render(); }
});
const SUBMIT = {
  signin() {
    const u = S.ui.signin, email = (FORM.email || '').trim(), pw = FORM.pw || '';
    const errs = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email address, like name@company.com.';
    if (pw.length < 6) errs.pw = 'Password must be at least 6 characters.';
    u.errs = Object.keys(errs).length ? errs : null; u.err = '';
    if (u.errs) { render(); return; }
    if (pw === 'wrongpass') { u.err = 'Incorrect email or password. Please try again.'; render(); return; }
    u.loading = true; render();
    setTimeout(() => {
      u.loading = false; S.role = u.role; try { sessionStorage.setItem('bm_role', u.role); } catch (e) { }
      location.hash = HOME[u.role]; if (location.hash === HOME[u.role]) render();
    }, 650);
  },
  forgot() {
    const u = S.ui.signin, email = (FORM.email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { u.errs = { email: 'Enter a valid email address.' }; render(); return; }
    u.errs = null; u.view = 'sent'; u.sentTo = email; render();
  }
};

/* ---------- Logout, menus, notifications (shared) ---------- */
function doLogout() {
  closeOv(); S.role = null; S.cart = []; S.ui.signin = { role: 'supplier', view: 'signin', err: '', loading: false, show: false };
  try { sessionStorage.removeItem('bm_role'); } catch (e) { }
  location.hash = '#/signin'; render();
}
const NOTIF_ICON = { order: 'list', stock: 'alert', return: 'undo', chat: 'chat' };
function notifItems(role) {
  const list = [...S.notifs[role]].sort((a, b) => b.at - a.at);
  if (!list.length) return empty('bell', 'You are all caught up', 'New orders, stock alerts, returns and messages will show up here.');
  const today = list.filter(n => sameDay(n.at, now())), earlier = list.filter(n => !sameDay(n.at, now()));
  const grp = (t, arr) => arr.length ? `<div class="sec-title">${t}</div>${arr.map(n => `<button class="notif ${n.read ? '' : 'unread'}" data-act="notif" data-id="${n.id}"><span class="ud ${n.read ? 'read' : ''}" aria-label="${n.read ? 'Read' : 'Unread'}"></span><span class="tile">${icon(NOTIF_ICON[n.kind], 18)}</span><span class="grow"><span class="t" style="display:block">${esc(n.title)}</span><span class="muted small" style="display:block">${esc(n.body)}</span></span><span class="muted small nowrap">${fmtSmart(n.at)}</span></button>`).join('')}` : '';
  return grp('Today', today) + grp('Earlier', earlier);
}
const notifDrawer = () => `${panelHead('Notifications', `${unreadNotifs(S.role)} unread`)}<div class="panel-body">${notifItems(S.role)}</div><div class="panel-foot"><button class="btn" data-act="mark-all">${icon('check')} Mark all as read</button><a class="btn primary" href="#/${AREA[S.role]}/notifications" data-act="ov-close">Open full page</a></div>`;
function notificationsPage() {
  return `<div class="page-head"><div><h1>Notifications</h1><p>${unreadNotifs(S.role)} unread</p></div><div class="actions"><button class="btn" data-act="mark-all">${icon('check')} Mark all as read</button></div></div><div class="card">${notifItems(S.role)}</div>`;
}
PAGES.s.notifications = notificationsPage; PAGES.d.notifications = notificationsPage;

function morePage() {
  const role = S.role, items = NAV[role].filter(n => !n.tab);
  const me = role === 'supplier' ? S.profile.supplier : S.profile.distributor;
  const row = (href, ic, label, extra = '') => `<a class="list-row" href="${href}"><span class="tile">${icon(ic)}</span><span class="grow title-sm">${label}</span>${extra}${icon('right')}</a>`;
  return `<div class="page-head"><div><h1>${role === 'supplier' ? 'More' : 'Menu'}</h1></div></div>
    <div class="card" style="display:flex;gap:14px;align-items:center;margin-bottom:16px">${avatar(me.name, 'lg gold')}<div><b style="font-size:16px">${esc(me.name)}</b><div class="muted">${role === 'supplier' ? 'BilMagic Supply Inc. · Supplier' : esc(me.shop) + ' · ' + esc(me.city)}</div></div></div>
    <div class="card" style="padding:4px 16px">${items.map(n => row(`#/${AREA[role]}/${n.id}`, n.icon, n.label, n.badge && n.badge() ? `<span class="badge-n">${n.badge()}</span>` : '')).join('')}${row(`#/${AREA[role]}/notifications`, 'bell', 'Notifications', unreadNotifs(role) ? `<span class="badge-n">${unreadNotifs(role)}</span>` : '')}
    <button class="list-row" data-act="logout-confirm"><span class="tile">${icon('logout')}</span><span class="grow title-sm">Log out</span></button></div>`;
}
PAGES.s.more = morePage; PAGES.d.menu = morePage;

/* ---------- Global actions ---------- */
Object.assign(ACTS, {
  go: (d) => go(d.to),
  'ov-close': () => closeOv(),
  'ov-bg': (d, el, e) => { if (e.target === el) ACTS['ov-close'](); },
  'logout-confirm': () => openOv(() => confirmDlg({ ic: 'logout', tone: 'gold', title: 'Log out of BilMagic?', text: 'You will return to the sign-in screen. Prototype data stays in this browser tab until you reload.', yes: 'Log out', yesAct: 'logout' }), { size: 'sm' }),
  logout: doLogout,
  bell: () => { if (isPhone()) go(`#/${AREA[S.role]}/notifications`); else openOv(notifDrawer, { kind: 'drawer' }); },
  'user-menu': () => openOv(() => `${panelHead('Account')}<div class="panel-body"><div class="row" style="margin-bottom:12px">${avatar(S.role === 'supplier' ? S.profile.supplier.name : S.profile.distributor.name, 'lg gold')}<div><b>${esc(S.role === 'supplier' ? S.profile.supplier.name : S.profile.distributor.name)}</b><div class="muted small">${S.role === 'supplier' ? 'Supplier role (prototype)' : esc(S.profile.distributor.shop)}</div></div></div><a class="list-row" href="#/${AREA[S.role]}/settings" data-act="ov-close"><span class="tile">${icon('settings')}</span><span class="grow title-sm">Settings</span>${icon('right')}</a><button class="list-row" data-act="logout-confirm"><span class="tile">${icon('logout')}</span><span class="grow title-sm">Log out</span></button></div>`, { size: 'sm' }),
  notif: (d) => { const n = S.notifs[S.role].find(x => x.id === d.id); n.read = true; closeOv(); if (n.to) go(n.to); else render(); },
  'mark-all': () => { markAllRead(S.role); toast('All notifications marked as read', 'ok'); render(); },
  retry: () => { S.tools.error = false; toast('Back online', 'ok'); render(); },
  set: (d) => { S.ui[d.k] = d.v; render(); },
  fset: (d) => { FORM[d.k] = d.v; paintOv(); if (!OV) render(); },
  'qty-inc': (d, el) => qtyStep(d.key, el, 1),
  'qty-dec': (d, el) => qtyStep(d.key, el, -1)
});
function qtyStep(key, el, delta) {
  const inp = el.closest('.stepper').querySelector('input'), v = (parseInt(inp.value, 10) || 1) + delta;
  qtyApply(key, v);
}
function qtyApply(key, v) { const [pre, ...rest] = key.split(':'); if (QTY[pre]) QTY[pre](rest.join(':'), v); }

/* ---------- Event wiring ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACTS[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act === 'ov-close') { fn(el.dataset, el, e); return; }
  e.preventDefault(); fn(el.dataset, el, e);
});
document.addEventListener('submit', (e) => { const f = e.target.closest('[data-submit]'); if (!f) return; e.preventDefault(); const fn = SUBMIT[f.dataset.submit]; if (fn) fn(); });
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.form) { FORM[t.dataset.form] = t.type === 'checkbox' ? t.checked : t.value; return; }
  if (t.dataset.set) { S.ui[t.dataset.set] = t.value; render(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.form && t.tagName === 'SELECT') { FORM[t.dataset.form] = t.value; if (OV) paintOv(); else render(); return; }
  if (t.dataset.qty) { qtyApply(t.dataset.qty, parseInt(t.value, 10) || 1); return; }
  if (t.dataset.pref) { const [role, k] = t.dataset.pref.split('.'); S.prefs[role][k] = t.checked; toast('Preference saved', 'ok'); }
  if (t.dataset.tool) { S.tools[t.dataset.tool] = t.checked; toast(t.checked ? 'Simulation on' : 'Simulation off'); render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && OV) { ACTS['ov-close'](); return; }
  if (e.key === 'Tab' && OV) {
    const f = $$('#overlay a[href], #overlay button:not([disabled]), #overlay input:not([disabled]), #overlay select, #overlay textarea, #overlay [tabindex="0"]').filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'radio') { e.preventDefault(); e.target.click(); }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.actEnter === 'gsearch') {
    const v = e.target.value.trim(); S.ui[S.role === 'supplier' ? 'inv_q' : 'cat_q'] = v; go(S.role === 'supplier' ? '#/s/inventory' : '#/d/catalog');
  }
});
window.addEventListener('hashchange', render);
