/* main.js: start the prototype. A signed-in role survives a page reload (sessionStorage); all other data resets. */
(function boot() {
  try { const r = sessionStorage.getItem('bm_role'); if (r === 'supplier' || r === 'distributor') S.role = r; } catch (e) { }
  render();
})();
