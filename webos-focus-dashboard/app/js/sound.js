/* Zachte geluidssignalen, opgewekt met Web Audio (geen audiobestanden nodig). */
window.Sound = (function () {
  'use strict';

  var ctx = null;

  function enabled() {
    return !window.APP_CONFIG || window.APP_CONFIG.sound !== false;
  }

  /* Moet één keer na een toetsdruk gebeuren, anders blijft audio geblokkeerd. */
  function unlock() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return null; }
        ctx = new AC();
      }
      if (ctx.state === 'suspended') { ctx.resume(); }
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, start, dur, gain) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function play(notes) {
    if (!enabled() || !unlock()) { return; }
    try {
      var t0 = ctx.currentTime + 0.02;
      notes.forEach(function (n) { tone(n[0], t0 + n[1], n[2], n[3]); });
    } catch (e) { /* geen geluid mogelijk */ }
  }

  return {
    unlock: unlock,
    /* kort tikje bij afvinken */
    blip: function () { play([[880, 0, 0.25, 0.12]]); },
    /* drie tonen: tijd is om */
    chime: function () { play([[659.25, 0, 1.4, 0.18], [987.77, 0.22, 1.4, 0.16], [1318.51, 0.44, 1.8, 0.14]]); },
    /* opgaand akkoord: sessie voltooid */
    success: function () { play([[523.25, 0, 0.9, 0.16], [659.25, 0.14, 0.9, 0.15], [783.99, 0.28, 1.0, 0.15], [1046.5, 0.42, 1.6, 0.14]]); }
  };
})();
