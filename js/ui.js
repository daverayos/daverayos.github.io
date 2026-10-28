/* ui.js: formatting, icons, badges, charts, overlays and toasts shared by every page. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Formatting ---------- */
const peso = (n) => '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoK = (n) => n >= 1e6 ? '₱' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : '₱' + Math.round(n / 1e3) + 'K';
const num = (n) => Number(n).toLocaleString('en-US');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtD = (ms) => { const d = new Date(ms); return MON[d.getMonth()] + ' ' + d.getDate(); };
const fmtT = (ms) => { const d = new Date(ms); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ap}`; };
const fmtDT = (ms) => `${fmtD(ms)}, ${fmtT(ms)}`;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const fmtSmart = (ms) => sameDay(ms, now()) ? fmtT(ms) : sameDay(ms, now() - 864e5) ? 'Yesterday' : fmtD(ms);
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;

/* ---------- Icons (18px line icons, 2px stroke, round caps) ---------- */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  package: '<path d="M16.5 9.4 7.5 4.21"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  cue: '<path d="m4 20 13-13"/><path d="m15 5 4 4M18 2l4 4"/>',
  ball: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  table: '<rect x="3" y="5" width="18" height="10" rx="2"/><path d="M6 15v5M18 15v5"/>',
  triangle: '<path d="M12 3 3 20h18Z"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>'
};
const icon = (n, size) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${size ? ` style="width:${size}px;height:${size}px"` : ''}>${ICONS[n] || ''}</svg>`;
const CAT_ICON = { 'Pool Cues': 'cue', 'Cue Shafts': 'cue', 'Cue Butts': 'cue', 'Cue Tips': 'cue', 'Pool Balls': 'ball', 'Chalk': 'package', 'Cue Cases': 'briefcase', 'Pool Tables': 'table', 'Table Cloth/Felt': 'grid', 'Ball Racks': 'triangle', 'Bridges/Rests': 'cue', 'Gloves': 'user', 'Cleaning Equipment': 'sparkle', 'Table Accessories': 'tag' };
const catIcon = (c, size) => icon(CAT_ICON[c] || 'package', size);
const LOGO = `<svg class="logo" viewBox="0 0 48 48" role="img" aria-label="BilMagic"><circle cx="24" cy="24" r="22" fill="#0b0b0b" stroke="#c9a24b" stroke-width="2.5"/><path d="M10 38 38 10M10 10l28 28" stroke="#c9a24b" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="24" r="9" fill="#fff"/><text x="24" y="27.6" text-anchor="middle" font-family="Inter,Arial" font-weight="800" font-size="9" fill="#0b0b0b">BM</text></svg>`;

/* ---------- Badges (dot plus label, never color alone) ---------- */
const badge = (cls, label) => `<span class="badge b-${cls}">${esc(label)}</span>`;
const stockBadge = (st) => badge(st, STOCK_LABEL[st]);
const ORDER_CLS = { New: 'new', Processing: 'processing', Shipped: 'shipped', Delivered: 'delivered', Cancelled: 'cancelled' };
const orderBadge = (s) => badge(ORDER_CLS[s], s);
const RET_CLS = { Submitted: 'submitted', Restocked: 'restocked', 'Separate handling': 'sep', Rejected: 'rejected' };
const returnBadge = (s) => badge(RET_CLS[s], s);
const condLabel = (c) => c === 'good' ? 'Good condition' : 'Damaged or defective';
const avatar = (name, cls = '') => `<span class="av ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;

/* ---------- Charts ---------- */
const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
function lineChart(pts, { fmt = pesoK } = {}) {
  const n = pts.length, max = niceMax(Math.max(...pts.map(p => p.value)));
  const xs = (i) => n === 1 ? 50 : i / (n - 1) * 100, ys = (v) => (1 - v / max) * 100;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(2)},${ys(p.value).toFixed(2)}`).join(' ');
  const grid = [0, .25, .5, .75, 1].map(t => `<div class="grid" style="top:${(1 - t) * 100}%"><span>${fmt(max * t)}</span></div>`).join('');
  const dots = pts.map((p, i) => (n <= 14 || i === n - 1) ? `<span class="dot" style="left:${xs(i)}%;top:${ys(p.value)}%"></span>` : '').join('');
  const hits = pts.map((p, i) => `<button class="hit" aria-label="${esc(p.label)}: ${peso(p.value)}" title="${esc(p.label)}: ${peso(p.value)}" style="position:absolute;top:0;bottom:0;left:${n === 1 ? 0 : Math.max(0, xs(i) - 50 / Math.max(1, n - 1))}%;width:${100 / n}%;background:transparent;border:0;padding:0"></button>`).join('');
  const every = Math.max(1, Math.ceil(n / 7));
  const labels = pts.map((p, i) => (i % every === 0 || i === n - 1) ? `<span>${esc(p.label)}</span>` : '').join('');
  return `<div class="lc" role="img" aria-label="Line chart of order value, ${pts[0].label} to ${pts[n - 1].label}">${grid}<svg class="plot" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path} L100,100 L0,100 Z" fill="rgba(11,11,11,.12)"/><path d="${path}" fill="none" stroke="#0b0b0b" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>${dots}${hits}</div><div class="lc-x">${labels}</div>`;
}
function stackBar(i, l, o) {
  const t = i + l + o || 1;
  const seg = (c, v, name) => v ? `<i class="${c}" style="flex:${v}" title="${name}: ${v}"></i>` : '';
  return `<div class="sb" role="img" aria-label="${i} in stock, ${l} low, ${o} out of stock">${seg('g', i, 'In stock')}${seg('a', l, 'Low stock')}${seg('r', o, 'Out of stock')}</div>`;
}
const legend3 = () => `<div class="legend"><span style="--c:var(--ok-dot)">In stock</span><span style="--c:var(--warn-dot)">Low stock</span><span style="--c:var(--bad-dot)">Out of stock</span></div>`;
function barChart(items) {
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bars" role="img" aria-label="Monthly spend">${items.map((it, k) => `<div class="col"><em>${it.value ? pesoK(it.value) : '–'}</em><i class="${k === items.length - 1 ? 'hi' : ''}" style="height:${Math.max(3, it.value / max * 120)}px"></i><small>${esc(it.label)}</small></div>`).join('')}</div>`;
}

/* ---------- Shared bits ---------- */
const empty = (ic, title, text, action = '') => `<div class="empty"><div class="ic">${icon(ic, 26)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action ? `<div style="margin-top:14px">${action}</div>` : ''}</div>`;
const skeleton = () => `<div class="stack">${[70, 40, 40, 40, 40, 40].map(h => `<div class="skel" style="height:${h}px"></div>`).join('')}</div>`;
const errorCard = () => `<div class="card">${empty('alert', 'We could not load this page', 'The simulated network error is on. Turn it off in Settings or retry.', `<button class="btn primary" data-act="retry">${icon('refresh')} Retry</button>`)}</div>`;
const qtyStepper = (key, val, max, sm = true) => `<div class="stepper ${sm ? 'sm' : ''}" role="group" aria-label="Quantity"><button type="button" data-act="qty-dec" data-key="${key}" aria-label="Decrease">${icon('minus', 14)}</button><input type="number" inputmode="numeric" min="1" ${max != null ? `max="${max}"` : ''} value="${val}" data-qty="${key}" aria-label="Quantity"><button type="button" data-act="qty-inc" data-key="${key}" aria-label="Increase">${icon('plus', 14)}</button></div>`;
const field = (label, input, { err, hint, cls = '' } = {}) => `<div class="field ${cls}"><label>${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}${err ? `<div class="err">${icon('alert', 14)}${esc(err)}</div>` : ''}</div>`;
const fi = (name, o = {}) => `<input class="input ${o.err ? 'bad' : ''}" id="f_${name}" data-form="${name}" type="${o.type || 'text'}" value="${esc(FORM[name] ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.dis ? 'disabled' : ''} ${o.step ? `step="${o.step}"` : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.auto ? `autocomplete="${o.auto}"` : ''}>`;
const fs = (name, opts, o = {}) => `<select class="input" id="f_${name}" data-form="${name}">${opts.map(v => { const [val, lab] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${String(FORM[name]) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
const sw = (key, on, label, desc) => `<div class="pref"><div><b>${label}</b>${desc ? `<span>${desc}</span>` : ''}</div><label class="switch"><input type="checkbox" data-pref="${key}" ${on ? 'checked' : ''} aria-label="${esc(label)}"><i></i></label></div>`;

/* ---------- Overlays: centered modal on desktop, bottom sheet on phones ---------- */
let OV = null;
const PAGE_FORM_KEYS = /^(rsku|rqty|rcond|rreason|rnote|pdq|sname|semail|scompany|saddr|slang|msg|email|pw)$/;   // page-level form values survive opening and closing an overlay
function openOv(fn, o = {}) { OV = { fn, kind: o.kind || 'modal', size: o.size || '', back: o.back }; paintOv(true); document.body.classList.add('lock'); }
const keepBack = () => (OV ? OV.back : undefined);
function paintOv(first) {
  const el = $('#overlay'); if (!OV) { el.innerHTML = ''; return; }
  const body = $('.panel-body', el), top = body ? body.scrollTop : 0;
  const ae = document.activeElement, aid = ae && el.contains(ae) ? ae.id : '';
  el.innerHTML = `<div class="ov ${OV.kind === 'drawer' ? 'drawer' : ''}" data-act="ov-bg"><div class="panel ${OV.size}" role="dialog" aria-modal="true" tabindex="-1"><div class="grab"></div>${OV.fn()}</div></div>`;
  const nb = $('.panel-body', el); if (nb && !first) nb.scrollTop = top;
  const target = (aid && document.getElementById(aid)) || (first ? ($('.panel [data-autofocus]', el) || $('.panel .input', el) || $('.panel', el)) : null);
  if (target) { target.focus(); if (target.setSelectionRange && aid && target.type !== 'number' && target.type !== 'email') { try { target.setSelectionRange(target.value.length, target.value.length); } catch (e) { } } }
}
function closeOv() { const b = OV && OV.back; OV = null; $('#overlay').innerHTML = ''; document.body.classList.remove('lock'); Object.keys(FORM).forEach(k => { if (!PAGE_FORM_KEYS.test(k)) delete FORM[k]; }); if (b) rewriteHash(b); }
const panelHead = (title, sub) => `<div class="panel-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn sm" data-act="ov-close" aria-label="Close">${icon('x')}</button></div>`;
const confirmDlg = ({ ic = 'alert', tone = 'bad', title, text, yes, yesAct, yesData = '', danger }) => `<div class="panel-body" style="padding-top:26px;text-align:center"><div class="confirm-ic ${tone}">${icon(ic, 24)}</div><h2 style="font-size:20px;font-weight:800">${title}</h2><p class="muted" style="margin-top:6px">${text}</p></div><div class="panel-foot" style="justify-content:center"><button class="btn" data-act="ov-close" data-autofocus>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="${yesAct}" ${yesData}>${yes}</button></div>`;

/* ---------- Toasts ---------- */
function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.setAttribute('role', 'status');
  el.innerHTML = `${icon(kind === 'err' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3600);
}
