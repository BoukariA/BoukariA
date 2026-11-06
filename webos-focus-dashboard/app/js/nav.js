/*
 * Ruimtelijke navigatie voor de afstandsbediening (pijltjestoetsen)
 * en de aanwijzer van de Magic Remote.
 *
 * Elk element met class "focusable" is bereikbaar. Bij een pijltje kiezen we
 * het dichtstbijzijnde element in die richting, met voorkeur voor elementen
 * die op dezelfde rij/kolom liggen.
 */
window.Nav = (function () {
  'use strict';

  var root = document.body;
  var memory = {};
  var EPS = 4;

  function setRoot(el) { root = el; }

  function isVisible(el) {
    return !el.disabled && el.getClientRects().length > 0 && !el.closest('[hidden]');
  }

  function focusables() {
    return Array.prototype.filter.call(root.querySelectorAll('.focusable'), isVisible);
  }

  function current() {
    var a = document.activeElement;
    return a && a.classList && a.classList.contains('focusable') && root.contains(a) ? a : null;
  }

  /* Rechthoek zonder de schaal-animatie van de focusstijl. */
  function rectOf(el) {
    var r = el.getBoundingClientRect();
    var t = window.getComputedStyle(el).transform;
    if (t && t !== 'none') {
      var m = t.match(/^matrix\(([^,]+),[^,]+,[^,]+,([^,]+)/);
      if (m) {
        var sx = parseFloat(m[1]) || 1;
        var sy = parseFloat(m[2]) || 1;
        var cx = (r.left + r.right) / 2;
        var cy = (r.top + r.bottom) / 2;
        var w = r.width / sx;
        var h = r.height / sy;
        return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
      }
    }
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }

  function score(a, b, dir) {
    var primary, overlap, ac, bc;
    if (dir === 'left' || dir === 'right') {
      primary = dir === 'left' ? a.left - b.right : b.left - a.right;
      if (primary < -EPS) { return Infinity; }
      overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      ac = (a.top + a.bottom) / 2;
      bc = (b.top + b.bottom) / 2;
    } else {
      primary = dir === 'up' ? a.top - b.bottom : b.top - a.bottom;
      if (primary < -EPS) { return Infinity; }
      overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      ac = (a.left + a.right) / 2;
      bc = (b.left + b.right) / 2;
    }
    var cross = overlap > 0 ? 0 : -overlap;
    return Math.max(primary, 0) + cross * 4 + Math.abs(ac - bc) * 0.1;
  }

  function focus(el) {
    if (!el) { return; }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    if (el.closest('[data-scroll]')) {
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e2) { el.scrollIntoView(false); }
    }
    var stage = document.getElementById('stage');
    if (stage) { stage.scrollTop = 0; stage.scrollLeft = 0; }
    var g = el.closest('[data-group]');
    if (g && g.hasAttribute('data-remember')) { memory[g.getAttribute('data-group')] = el.getAttribute('data-key'); }
  }

  function move(dir) {
    var list = focusables();
    var cur = current();
    if (!cur) { focus(list[0]); return !!list[0]; }
    var a = rectOf(cur);
    var best = null;
    var bestScore = Infinity;
    list.forEach(function (el) {
      if (el === cur) { return; }
      var s = score(a, rectOf(el), dir);
      if (s < bestScore) { bestScore = s; best = el; }
    });
    if (!best) { return false; }

    /* Terug in een lijst? Dan naar het laatst gekozen item daarin. */
    var gTo = best.closest('[data-group][data-remember]');
    var gFrom = cur.closest('[data-group]');
    if (gTo && gTo !== gFrom) {
      var key = memory[gTo.getAttribute('data-group')];
      var remembered = key ? gTo.querySelector('.focusable[data-key="' + window.CSS.escape(key) + '"]') : null;
      if (remembered && isVisible(remembered) && score(a, rectOf(remembered), dir) < Infinity) { best = remembered; }
    }
    focus(best);
    return true;
  }

  /* Magic Remote / muis: wat onder de aanwijzer staat krijgt de focus. */
  document.addEventListener('mouseover', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('.focusable') : null;
    if (el && root.contains(el) && document.activeElement !== el && isVisible(el)) { focus(el); }
  });

  return { setRoot: setRoot, focus: focus, move: move, current: current, focusables: focusables };
})();
