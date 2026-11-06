/* Opslag op de TV zelf (localStorage). Blijft bewaard tussen sessies. */
window.Store = (function () {
  'use strict';

  var KEY = 'focusdashboard.v1';

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* opslag vol of geblokkeerd: dan alleen in het geheugen */ }
  }

  return { load: load, save: save };
})();
