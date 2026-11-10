/* ============ Undo and redo (supplier side) ============
   Two layers:
   1. Every action that changes data is saved as a before/after snapshot (up to 30). Top bar buttons, toast button, Ctrl+Z / Ctrl+Shift+Z.
   2. Inside a dialog (Edit product, Sold, Stock count ...) Ctrl+Z steps back through your typing and choices, and the dialog has its own Undo/Redo buttons.
   Everything is in memory, so a page refresh clears the history. */
Object.assign(ICONS, { redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>' });

const UNDO = (() => {
  const KEYS = ['products', 'shop', 'orders', 'returns', 'threads', 'notifs', 'sales', 'retail', 'profile', 'prefs'];
  const MAX = 30;
  let undos = [], redos = [], lastToast = '';
  const snap = () => JSON.stringify(KEYS.map(k => S[k]));
  const stable = (j) => j.replace(/"(read|seen)":(true|false|\{[^}]*\})/g, '');   // opening a chat only marks things read: not an undoable move
  const load = (j) => { JSON.parse(j).forEach((v, i) => { S[KEYS[i]] = v; }); };
  const nice = (act) => ({ 'adj-save': 'Stock count change', 'sold-save': 'Sale', 'prod-save': 'Product change', 'arch-do': 'Archive', restore: 'Restore', 'ret-do': 'Return decision', 'pay-confirm': 'Mark as paid', 'waive-do': 'Waive interest', 'order-advance': 'Order update' }[act] || 'Change');
  function syncBar() {
    $$('[data-act=undo]').forEach(b => { b.disabled = !undos.length; b.title = undos.length ? 'Undo: ' + undos[undos.length - 1].label + ' (Ctrl+Z)' : 'Nothing to undo'; });
    $$('[data-act=redo]').forEach(b => { b.disabled = !redos.length; b.title = redos.length ? 'Redo: ' + redos[redos.length - 1].label + ' (Ctrl+Shift+Z)' : 'Nothing to redo'; });
  }
  function toastBtn(act, text) {
    const t = $('#toasts').lastElementChild; if (!t) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-btn'; b.dataset.act = act; b.textContent = text; t.appendChild(b);
  }
  return {
    get canUndo() { return undos.length > 0; }, get canRedo() { return redos.length > 0; },
    setToast(m) { lastToast = m; },
    reset() { undos = []; redos = []; syncBar(); },
    syncBar,
    // run one user action; if it changed data, make it undoable
    run(act, fn) {
      if (S.role !== 'supplier' || /^(undo|redo|hist-undo|hist-redo)$/.test(act)) return fn();
      const before = snap(); lastToast = '';
      const r = fn();
      if (S.role !== 'supplier') return r;
      const after = snap();
      if (stable(after) !== stable(before)) {
        undos.push({ label: lastToast || nice(act), before, after }); if (undos.length > MAX) undos.shift(); redos = [];
        toastBtn('undo', 'Undo');
      }
      syncBar(); return r;
    },
    undo() {
      const e = undos.pop(); if (!e) return;
      load(e.before); redos.push(e); HIST.reset(); toast('Undone: ' + e.label, 'ok'); toastBtn('redo', 'Redo'); UNDO.refresh();
    },
    redo() {
      const e = redos.pop(); if (!e) return;
      load(e.after); undos.push(e); HIST.reset(); toast('Redone: ' + e.label, 'ok'); toastBtn('undo', 'Undo'); UNDO.refresh();
    },
    refresh() { if (OV) paintOv(); render(); syncBar(); }
  };
})();

/* the toast text names the move in the history */
const _toast = toast;
toast = function (msg, kind) { UNDO.setToast(msg); return _toast(msg, kind); };

/* ---------- dialog typing history ---------- */
const HIST = (() => {
  let stack = [], i = 0, at = 0, key = '';
  const copy = () => JSON.parse(JSON.stringify(FORM));
  const put = (snap) => { Object.keys(FORM).forEach(k => delete FORM[k]); Object.assign(FORM, snap); };
  const sync = () => {
    $$('[data-act=hist-undo]').forEach(b => { b.hidden = !(i > 0 || i < stack.length - 1); b.disabled = i <= 0; });
    $$('[data-act=hist-redo]').forEach(b => { b.hidden = !(i > 0 || i < stack.length - 1); b.disabled = i >= stack.length - 1; });
  };
  const api = {
    reset() { stack = [copy()]; i = 0; at = 0; key = ''; sync(); },
    sync,
    record(k) {
      const t = Date.now(), snap = copy();
      if (stack.length && JSON.stringify(stack[i]) === JSON.stringify(snap)) return;
      if (i < stack.length - 1) stack.length = i + 1;
      if (k && k === key && t - at < 800 && i > 0) stack[i] = snap;   // typing in one field: one step
      else { stack.push(snap); i = stack.length - 1; if (stack.length > 100) { stack.shift(); i--; } }
      key = k; at = t; sync();
    },
    can() { return !!OV && (i > 0 || i < stack.length - 1); },
    undo() { if (i <= 0) return false; i--; key = ''; put(stack[i]); paintOv(); sync(); return true; },
    redo() { if (i >= stack.length - 1) return false; i++; key = ''; put(stack[i]); paintOv(); sync(); return true; }
  };
  return api;
})();
const _openOv = openOv;
openOv = function (fn, o) { const r = _openOv(fn, o); HIST.reset(); return r; };

Object.assign(ACTS, {
  undo: () => UNDO.undo(), redo: () => UNDO.redo(),
  'hist-undo': () => HIST.undo(), 'hist-redo': () => HIST.redo()
});
document.addEventListener('input', (e) => {
  const t = e.target; if (!OV || !t.dataset || !t.dataset.form || !t.closest('#overlay')) return;
  HIST.record(t.dataset.form);
  if (t.dataset.live !== undefined) paintOv();
});
document.addEventListener('change', (e) => { const t = e.target; if (OV && t.dataset && t.dataset.form && t.closest('#overlay')) setTimeout(() => HIST.record(''), 0); });
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
  const redo = e.key.toLowerCase() === 'y' || e.shiftKey;
  if (OV) { if (HIST.can() && (redo ? HIST.redo() : HIST.undo())) e.preventDefault(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;   // let text fields undo their own typing
  if (S.role !== 'supplier') return;
  e.preventDefault(); redo ? UNDO.redo() : UNDO.undo();
});
const _resetData = resetData; resetData = function () { _resetData(); UNDO.reset(); };
const _logoutAct = ACTS.logout; ACTS.logout = function (...a) { UNDO.reset(); return _logoutAct.apply(this, a); };
