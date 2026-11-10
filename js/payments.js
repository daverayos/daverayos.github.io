/* ============ Payments (simulated) ============
   Three modes: Cash on Delivery, E-wallet, Bank (card or bank transfer).
   Nothing here is real: no card data is stored, only test card numbers are accepted,
   and every transaction is dummy data kept in memory. */
Object.assign(ICONS, {
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  bank: '<path d="M3 21h18M5 21V9M19 21V9M9 21v-8M15 21v-8M2 9l10-6 10 6"/>'
});

const PAY = {
  cod: { label: 'Cash on Delivery', ic: 'truck', desc: 'Pay the courier in cash when your order arrives. Nothing to do now.' },
  ewallet: { label: 'E-wallet', ic: 'wallet', desc: 'Approve the payment in your e-wallet app. You can pay right after placing the order.' },
  bank: { label: 'Bank', ic: 'bank', desc: 'Pay by credit or debit card, or send a bank transfer and enter the reference number.' }
};
const PAY_ST = { unpaid: ['Unpaid', 'low'], submitted: ['Payment submitted', 'processing'], paid: ['Paid', 'delivered'], cod: ['Pay on delivery', 'new'], void: ['No payment', 'neutral'], refund: ['Refund due', 'cancelled'] };
const TXN_CLS = { Success: 'delivered', Pending: 'new', Failed: 'cancelled' };
const WALLETS = ['GCash', 'Maya', 'GrabPay'];
const TEST_CARDS = { '4242424242424242': 'ok', '5555555555554444': 'ok', '4000000000000002': 'decline' };
const BANK_INFO = { bank: 'Sample Bank PH', name: 'BilMagic Supply Inc.', no: '0000 1234 5678' };

const payBadge = (o) => { const [l, c] = PAY_ST[o.pay.status]; return badge(c, l); };
const payTxns = () => S.orders.flatMap(o => (o.pay ? o.pay.txns || [] : []).map(t => ({ ...t, order: o })));
const payOwing = (o) => o.pay && ['unpaid', 'submitted'].includes(o.pay.status) && o.status !== 'Cancelled';
const ymd = (at) => { const d = new Date(at); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
function newTxn(o, method, detail, status) {
  const seq = Math.max(0, ...payTxns().map(t => parseInt(t.id.slice(-4), 10))) + 1;
  const t = { id: 'TXN-' + ymd(now()) + '-' + String(seq).padStart(4, '0'), at: now(), method, detail, amount: orderTotal(o), status };
  o.pay.txns.push(t); return t;
}
function markPaid(o, how) {
  const pending = o.pay.txns.find(t => t.status === 'Pending');
  if (pending) { pending.status = 'Success'; pending.detail += ' · confirmed'; pending.confirmed = now(); }
  else newTxn(o, o.pay.method, how, 'Success');
  o.pay.status = 'paid';
  if (o.dist === ME_DIST) pushNotif('distributor', 'order', 'Payment confirmed for ' + o.id, `${peso(orderTotal(o))} received. Thank you.`, '#/d/order/' + o.id);
}

/* ---------- Distributor: choosing a method in the cart, default method ---------- */
const defaultPay = () => S.profile.distributor.defaultPay || 'cod';
const payChoice = () => FORM.paym || defaultPay();
function payPicker() {
  const cur = payChoice();
  return `<div class="sec-title">Payment method</div><div role="radiogroup" aria-label="Payment method">${Object.entries(PAY).map(([k, m]) => `<div class="radio-card ${cur === k ? 'on' : ''}" role="radio" aria-checked="${cur === k}" tabindex="0" data-act="fset" data-k="paym" data-v="${k}"><span>${icon(m.ic, 18)}</span><div><b>${m.label}</b><span>${m.desc}</span></div></div>`).join('')}</div>`;
}
function defaultPayCard() {
  const cur = defaultPay();
  return `<section class="card"><div class="card-head"><div><h2>Default payment method</h2><p>Pre-selected in your cart. You can change it for each order.</p></div></div>${Object.entries(PAY).map(([k, m]) => `<div class="radio-card ${cur === k ? 'on' : ''}" role="radio" aria-checked="${cur === k}" tabindex="0" data-act="pay-default" data-v="${k}"><span>${icon(cur === k ? 'check' : m.ic, 18)}</span><div><b>${m.label}</b><span>${m.desc}</span></div></div>`).join('')}</section>`;
}
function paymentCard(o, role) {
  const p = o.pay, last = p.txns[p.txns.length - 1], isS = role === 'supplier';
  const act = [];
  if (!isS && p.method !== 'cod' && p.status === 'unpaid' && o.status !== 'Cancelled') act.push(`<button class="btn gold" data-act="pay-open" data-id="${o.id}">${icon('card', 16)} Pay now · ${peso(orderTotal(o))}</button>`);
  if (isS && p.status === 'submitted') act.push(`<button class="btn primary" data-act="pay-confirm" data-id="${o.id}">Confirm payment received</button>`);
  if (isS && p.status === 'unpaid' && o.status !== 'Cancelled') act.push(`<button class="btn" data-act="pay-confirm" data-id="${o.id}">Mark as paid</button>`);
  if (last && last.status === 'Success') act.push(`<button class="btn" data-act="txn-open" data-id="${last.id}">View receipt</button>`);
  const note = p.status === 'cod' ? 'Cash is collected on delivery. This order turns Paid when it is delivered.' : p.status === 'unpaid' ? (isS ? 'Waiting for the distributor to pay.' : 'Your payment is due. Pay now to settle this order.') : p.status === 'submitted' ? (isS ? 'The distributor says they paid. Check your account, then confirm.' : 'Waiting for BilMagic to confirm your payment.') : p.status === 'refund' ? 'The order was cancelled after payment. A refund is due.' : '';
  return `<section class="card"><div class="card-head"><div><h2>Payment</h2></div>${payBadge(o)}</div>
    <div class="list-row"><span class="tile">${icon(PAY[p.method].ic)}</span><span class="grow"><b class="title-sm">${PAY[p.method].label}</b><span class="muted small" style="display:block">Total ${peso(orderTotal(o))}</span></span></div>
    ${note ? `<p class="muted small" style="margin:10px 0">${note}</p>` : ''}
    ${p.txns.length ? `<div class="sec-title">Transactions</div>${p.txns.slice().reverse().map(t => `<button class="list-row" data-act="txn-open" data-id="${t.id}"><span class="grow"><b class="title-sm">${t.id}</b><span class="muted small" style="display:block">${fmtDT(t.at)} · ${esc(t.detail)}</span></span>${badge(TXN_CLS[t.status], t.status)}</button>`).join('')}` : ''}
    ${act.length ? `<div class="stack" style="margin-top:12px">${act.join('')}</div>` : ''}</section>`;
}

/* ---------- Receipt ---------- */
function receiptHtml(t, o) {
  return `${panelHead(t.status === 'Success' ? 'Payment receipt' : 'Transaction', t.id)}<div class="panel-body">
    <div class="receipt-top"><span class="confirm-ic ${t.status === 'Success' ? 'ok' : t.status === 'Failed' ? 'bad' : 'warn'}">${icon(t.status === 'Success' ? 'check' : t.status === 'Failed' ? 'x' : 'clock', 24)}</span><div class="big-num" style="font-size:30px">${peso(t.amount)}</div>${badge(TXN_CLS[t.status], t.status)}</div>
    <div class="kv"><div><span>Transaction ID</span><b>${t.id}</b></div><div><span>Order</span><b>${o.id}</b></div><div><span>Date</span><b>${fmtDT(t.at)}</b></div><div><span>Method</span><b>${PAY[t.method].label}</b></div><div><span>Details</span><b>${esc(t.detail)}</b></div><div><span>Paid by</span><b>${esc(dist(o.dist).shop)}</b></div></div>
    <div class="totals"><div><span>Subtotal</span><span>${peso(orderSub(o))}</span></div><div><span>VAT (12%)</span><span>${peso(orderVat(o))}</span></div><div class="t"><span>Total</span><span>${peso(orderTotal(o))}</span></div></div>
    <div class="alert info" style="margin-top:14px">${icon('info')}<span>Simulated transaction for the prototype. No money was moved.</span></div></div>
    <div class="panel-foot"><button class="btn primary" data-act="ov-close">Done</button></div>`;
}
ACTS['txn-open'] = (d) => { const t = payTxns().find(x => x.id === d.id); if (!t) return; const back = keepBack(); openOv(() => receiptHtml(t, t.order), { size: 'sm', back }); };

/* ---------- Simulated checkout (distributor) ---------- */
let CK = null; // { id, step, tab, err, msg, txn }
const maskPhone = (v) => v.slice(0, 4) + ' *** ' + v.slice(-4);
function checkoutHtml() {
  const o = orderById(CK.id), m = o.pay.method, e = CK.err || {}, total = peso(orderTotal(o));
  const head = panelHead('Pay for ' + o.id, `${total} · ${PAY[m].label}`);
  const test = `<div class="alert warn">${icon('alert')}<span><b>Simulation, test mode.</b> Do not enter real card or account details. Only the test values shown here work.</span></div>`;
  if (CK.step === 'processing') return `${head}<div class="panel-body" style="text-align:center;padding:40px 20px"><div class="spinner" aria-hidden="true"></div><h3 style="margin-top:18px">Processing payment…</h3><p class="muted">Please do not close this window.</p></div>`;
  if (CK.step === 'done') return `${head}<div class="panel-body" style="text-align:center"><span class="confirm-ic ok">${icon('check', 26)}</span><h2 style="font-size:22px;margin-top:10px">Payment successful</h2><p class="muted">${total} paid for ${o.id}.</p><div class="kv" style="text-align:left;margin-top:14px"><div><span>Transaction ID</span><b>${CK.txn.id}</b></div><div><span>Method</span><b>${esc(CK.txn.detail)}</b></div><div><span>Date</span><b>${fmtDT(CK.txn.at)}</b></div></div></div><div class="panel-foot"><button class="btn" data-act="txn-open" data-id="${CK.txn.id}">View receipt</button><button class="btn primary" data-act="ov-close">Done</button></div>`;
  if (CK.step === 'submitted') return `${head}<div class="panel-body" style="text-align:center"><span class="confirm-ic warn">${icon('clock', 26)}</span><h2 style="font-size:22px;margin-top:10px">Payment submitted</h2><p class="muted">BilMagic will confirm once the transfer arrives. You will get a notification.</p><div class="kv" style="text-align:left;margin-top:14px"><div><span>Transaction ID</span><b>${CK.txn.id}</b></div><div><span>Details</span><b>${esc(CK.txn.detail)}</b></div></div></div><div class="panel-foot"><button class="btn primary" data-act="ov-close">Done</button></div>`;
  if (CK.step === 'fail') return `${head}<div class="panel-body" style="text-align:center"><span class="confirm-ic bad">${icon('x', 26)}</span><h2 style="font-size:22px;margin-top:10px">Payment failed</h2><p class="muted">${esc(CK.msg)}</p><p class="small muted">Nothing was charged. The failed attempt is listed under Transactions.</p></div><div class="panel-foot"><button class="btn" data-act="ov-close">Close</button><button class="btn primary" data-act="pay-retry">Try again</button></div>`;
  if (CK.step === 'otp') return `${head}<div class="panel-body"><div class="alert info">${icon('info')}<span>A payment request of ${total} was sent to your ${esc(FORM.paywallet)} account ${maskPhone(FORM.paymobile.replace(/\D/g, ''))}. Open the wallet app and approve it, then enter the 6-digit code.</span></div>${field('Approval code', fi('payotp', { ph: '123456' }), { err: e.otp, hint: 'Simulation: the code is 123456.' })}</div><div class="panel-foot"><button class="btn" data-act="pay-retry">Back</button><button class="btn primary" data-act="pay-otp">Confirm payment</button></div>`;
  if (m === 'ewallet') return `${head}<div class="panel-body">${test}${field('E-wallet', fs('paywallet', WALLETS))}${field('Mobile number', fi('paymobile', { ph: '09XX XXX XXXX' }), { err: e.mobile, hint: 'Simulation: a number ending in 0000 is declined for low balance.' })}</div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="pay-wallet">Send payment request</button></div>`;
  const tab = CK.tab || 'card';
  const seg = `<div class="seg block" style="margin-bottom:14px"><button class="${tab === 'card' ? 'on' : ''}" data-act="pay-tab" data-v="card">Card</button><button class="${tab === 'transfer' ? 'on' : ''}" data-act="pay-tab" data-v="transfer">Bank transfer</button></div>`;
  if (tab === 'card') return `${head}<div class="panel-body">${seg}${test}
    <div class="row wrap" style="margin-bottom:14px"><button class="btn sm" data-act="pay-fill" data-v="ok">Use test card</button><button class="btn sm" data-act="pay-fill" data-v="decline">Use declined test card</button></div>
    ${field('Card number', `<input class="input ${e.num ? 'bad' : ''}" id="f_paynum" data-form="paynum" data-payfmt="card" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" value="${esc(FORM.paynum || '')}">`, { err: e.num })}
    ${field('Name on card', fi('payname', { ph: 'Full name' }), { err: e.name })}
    <div class="grid-eq" style="gap:12px">${field('Expiry', `<input class="input ${e.exp ? 'bad' : ''}" id="f_payexp" data-form="payexp" data-payfmt="exp" inputmode="numeric" autocomplete="off" placeholder="MM/YY" value="${esc(FORM.payexp || '')}">`, { err: e.exp })}${field('CVC', `<input class="input ${e.cvc ? 'bad' : ''}" id="f_paycvc" data-form="paycvc" data-payfmt="cvc" inputmode="numeric" autocomplete="off" placeholder="123" value="${esc(FORM.paycvc || '')}">`, { err: e.cvc })}</div>
  </div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="pay-card">${icon('lock', 15)} Pay ${total}</button></div>`;
  return `${head}<div class="panel-body">${seg}
    <div class="kv"><div><span>Bank</span><b>${BANK_INFO.bank}</b></div><div><span>Account name</span><b>${BANK_INFO.name}</b></div><div><span>Account number</span><b>${BANK_INFO.no}</b></div><div><span>Amount</span><b>${total}</b></div><div><span>Reference to include</span><b>${o.id}</b></div></div>
    <div class="alert info" style="margin:12px 0">${icon('info')}<span>Sample account for the prototype. After sending the transfer, enter the reference number from your bank.</span></div>
    ${field('Your transfer reference number', fi('payref', { ph: 'For example 20261109 884217' }), { err: e.ref })}
    ${field('Proof of transfer (optional)', `<input class="input" id="f_payproof" type="file" accept="image/jpeg,image/png,image/webp" data-payproof>${CK.proof ? `<div class="hint">${esc(CK.proof)}</div>` : ''}`)}
  </div><div class="panel-foot"><button class="btn" data-act="ov-close">Cancel</button><button class="btn primary" data-act="pay-bank">I have sent the payment</button></div>`;
}
function ckOpen(id) {
  CK = { id, step: 'form', tab: 'card', err: {} };
  Object.assign(FORM, { paynum: '', payname: '', payexp: '', paycvc: '', paywallet: WALLETS[0], paymobile: '', payotp: '', payref: '' });
  openOv(() => CK ? checkoutHtml() : '', { size: 'sm', back: keepBack() });
}
const ckOpenNow = () => CK && OV && CK.id;
function ckFinish(id, ok, detail, failMsg, method) {
  const o = orderById(id);
  if (!CK || CK.id !== id || !OV) { return; }
  if (ok) {
    const t = newTxn(o, method, detail, 'Success'); o.pay.status = 'paid'; CK.txn = t; CK.step = 'done';
    pushNotif('supplier', 'order', 'Payment received for ' + o.id, `${dist(o.dist).name} paid ${peso(orderTotal(o))} by ${PAY[method].label}.`, '#/s/orders/' + o.id);
  } else { newTxn(o, method, detail, 'Failed'); CK.step = 'fail'; CK.msg = failMsg; }
  paintOv(); render();
}
function ckProcess(ms, fn) { const id = CK.id; CK.step = 'processing'; paintOv(); setTimeout(() => fn(id), ms); }
const luhn = (n) => { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return s % 10 === 0; };
Object.assign(ACTS, {
  'pay-default': (d) => { S.profile.distributor.defaultPay = d.v; toast('Default payment method saved', 'ok'); render(); },
  'pay-open': (d) => ckOpen(d.id),
  'pay-tab': (d) => { CK.tab = d.v; CK.err = {}; paintOv(); },
  'pay-retry': () => { CK.step = 'form'; CK.err = {}; paintOv(); },
  'pay-fill': (d) => { Object.assign(FORM, { paynum: d.v === 'ok' ? '4242 4242 4242 4242' : '4000 0000 0000 0002', payname: 'Roberto Santos', payexp: '12/30', paycvc: '123' }); CK.err = {}; paintOv(); },
  'pay-card': () => {
    const n = (FORM.paynum || '').replace(/\D/g, ''), e = {}, m = (FORM.payexp || '').match(/^(\d\d)\/(\d\d)$/), nw = new Date(now());
    if (n.length !== 16 || !luhn(n)) e.num = 'Enter a valid 16-digit card number.';
    else if (!TEST_CARDS[n]) e.num = 'This is a simulation. Use one of the test cards (button above).';
    if ((FORM.payname || '').trim().length < 2) e.name = 'Enter the name on the card.';
    if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < nw.getFullYear() * 12 + nw.getMonth() + 1) e.exp = 'Enter a valid, future expiry (MM/YY).';
    if (!/^\d{3}$/.test(FORM.paycvc || '')) e.cvc = 'Enter the 3-digit CVC.';
    CK.err = e; if (Object.keys(e).length) { paintOv(); return; }
    ckProcess(1600, (id) => ckFinish(id, TEST_CARDS[n] === 'ok', `Card ending ${n.slice(-4)}`, 'Your card was declined (test card). Try another card or another method.', 'bank'));
  },
  'pay-wallet': () => {
    const v = (FORM.paymobile || '').replace(/\D/g, '');
    CK.err = /^09\d{9}$/.test(v) ? {} : { mobile: 'Enter an 11-digit mobile number starting with 09.' };
    if (Object.keys(CK.err).length) { paintOv(); return; }
    CK.step = 'otp'; FORM.payotp = ''; paintOv();
  },
  'pay-otp': () => {
    if ((FORM.payotp || '').trim() !== '123456') { CK.err = { otp: 'Wrong code. In this simulation the code is 123456.' }; paintOv(); return; }
    const v = FORM.paymobile.replace(/\D/g, ''), w = FORM.paywallet;
    ckProcess(1300, (id) => ckFinish(id, !v.endsWith('0000'), `${w} · ${maskPhone(v)}`, `${w} reported insufficient balance (test number). Try again with another number.`, 'ewallet'));
  },
  'pay-bank': () => {
    const ref = (FORM.payref || '').trim();
    if (ref.length < 6) { CK.err = { ref: 'Enter the reference number from your bank (at least 6 characters).' }; paintOv(); return; }
    const o = orderById(CK.id), t = newTxn(o, 'bank', 'Bank transfer · ref ' + ref, 'Pending');
    o.pay.status = 'submitted'; CK.txn = t; CK.step = 'submitted';
    pushNotif('supplier', 'order', 'Payment submitted for ' + o.id, `${dist(o.dist).name} reports a ${peso(orderTotal(o))} bank transfer (ref ${ref}). Please confirm.`, '#/s/orders/' + o.id);
    paintOv(); render();
  },
  'pay-confirm': (d) => { const o = orderById(d.id); markPaid(o, 'Marked as paid by supplier'); toast(o.id + ' marked as paid', 'ok'); if (OV) paintOv(); render(); }
});
document.addEventListener('input', (e) => {
  const t = e.target, k = t.dataset && t.dataset.payfmt; if (!k) return;
  let v = t.value.replace(/\D/g, '');
  if (k === 'card') v = v.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  else if (k === 'exp') { v = v.slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); }
  else v = v.slice(0, 3);
  t.value = v; FORM[t.dataset.form] = v;
});
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.payproof !== undefined && CK) { CK.proof = e.target.files[0] ? e.target.files[0].name : ''; paintOv(); } });

/* ---------- Transactions pages (both roles) ---------- */
function txnPage(role) {
  const isS = role === 'supplier', tab = getU('txn_tab', 'All');
  const mine = (isS ? S.orders : S.orders.filter(o => o.dist === ME_DIST));
  const all = mine.flatMap(o => o.pay.txns.map(t => ({ ...t, order: o }))).sort((a, b) => b.at - a.at);
  const list = all.filter(t => tab === 'All' || t.status === tab);
  const sum = (arr) => arr.reduce((s, x) => s + x, 0);
  const paid = sum(all.filter(t => t.status === 'Success').map(t => t.amount));
  const owing = sum(mine.filter(payOwing).map(orderTotal)), cod = sum(mine.filter(o => o.pay.status === 'cod' && o.status !== 'Cancelled').map(orderTotal));
  const fails = all.filter(t => t.status === 'Failed').length;
  const kp = [
    kpi({ label: isS ? 'Collected' : 'Paid', icon: 'check', val: peso(paid), sub: plural(all.filter(t => t.status === 'Success').length, 'successful payment') }),
    kpi({ label: 'Awaiting payment', icon: 'clock', tone: 'bad', val: peso(owing), sub: plural(mine.filter(payOwing).length, 'order') }),
    kpi({ label: 'Pay on delivery', icon: 'truck', val: peso(cod), sub: plural(mine.filter(o => o.pay.status === 'cod' && o.status !== 'Cancelled').length, 'COD order') }),
    kpi({ label: 'Failed attempts', icon: 'alert', tone: 'dk', val: String(fails), sub: 'Declined or incomplete' })
  ].join('');
  const tabs = ['All', 'Success', 'Pending', 'Failed'].map(s => [s, s === 'Success' ? 'Paid' : s, s === 'All' ? all.length : all.filter(t => t.status === s).length]);
  return `${pageHead('Transactions', isS ? 'Dummy payment records from all distributors. Open one to see its receipt.' : 'Your payments for BilMagic orders. All records are dummy data.')}
  <div class="kpis four">${kp}</div>${tabsRow('txn_tab', tabs, tab)}
  <div class="card flush">${list.length ? `<div class="tbl-wrap"><table class="tbl rt"><thead><tr><th>Transaction</th><th>Date</th><th>Order</th>${isS ? '<th>Distributor</th>' : ''}<th>Method</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>${list.map(t => `<tr class="click" data-act="txn-open" data-id="${t.id}"><td class="first"><b>${t.id}</b><div class="muted small">${esc(t.detail)}</div></td><td data-label="Date">${fmtDT(t.at)}</td><td data-label="Order">${t.order.id}</td>${isS ? `<td data-label="Distributor">${esc(dist(t.order.dist).name)}</td>` : ''}<td data-label="Method">${PAY[t.method].label}</td><td data-label="Amount" class="num"><b>${peso(t.amount)}</b></td><td data-label="Status">${badge(TXN_CLS[t.status], t.status)}</td></tr>`).join('')}</tbody></table></div>` : empty('card', 'No transactions here', 'Payments will appear here once they are made.')}</div>`;
}
PAGES.s.transactions = () => txnPage('supplier');
PAGES.d.transactions = () => txnPage('distributor');

/* supplier dashboard card */
function paymentsCard() {
  const o = S.orders, sum = (a) => a.reduce((s, x) => s + orderTotal(x), 0);
  const paid = sum(o.filter(x => x.pay.status === 'paid')), owing = sum(o.filter(payOwing)), cod = sum(o.filter(x => x.pay.status === 'cod' && x.status !== 'Cancelled'));
  const tot = paid + owing + cod || 1, w = (v) => (v / tot * 100).toFixed(1) + '%';
  return `<section class="card" style="margin-bottom:20px" aria-label="Payments"><div class="card-head"><div><h2>Payments</h2><p>Order value by payment status</p></div><a class="btn sm" href="#/s/transactions">View transactions</a></div>
    <div class="paybar" role="img" aria-label="Paid ${peso(paid)}, awaiting ${peso(owing)}, pay on delivery ${peso(cod)}"><i style="width:${w(paid)};background:var(--ok)"></i><i style="width:${w(owing)};background:var(--bad)"></i><i style="width:${w(cod)};background:var(--gold)"></i></div>
    <div class="paylegend"><div><i style="background:var(--ok)"></i><span>Paid</span><b>${peso(paid)}</b></div><div><i style="background:var(--bad)"></i><span>Awaiting payment</span><b>${peso(owing)}</b></div><div><i style="background:var(--gold)"></i><span>Pay on delivery</span><b>${peso(cod)}</b></div></div></section>`;
}
