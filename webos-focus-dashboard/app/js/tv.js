/*
 * Koppeling met de TV (webOS Luna-services) via LG's webOSTV.js.
 * In een gewone browser (voorbeeldmodus) geven alle calls een nette fout terug.
 */
window.TV = (function () {
  'use strict';

  var AM = 'luna://com.webos.applicationManager';
  var isWebOS = typeof window.PalmServiceBridge !== 'undefined' || typeof window.PalmSystem !== 'undefined';

  function request(uri, method, parameters) {
    return new Promise(function (resolve, reject) {
      if (!isWebOS || !window.webOS || !window.webOS.service) {
        var e = new Error('Niet op webOS');
        e.notWebOS = true;
        reject(e);
        return;
      }
      window.webOS.service.request(uri, {
        method: method,
        parameters: parameters || {},
        onSuccess: function (res) { resolve(res || {}); },
        onFailure: function (err) {
          var e = new Error((err && err.errorText) || 'Luna-fout');
          e.errorCode = err && err.errorCode;
          reject(e);
        }
      });
    });
  }

  /* Start een geïnstalleerde app, bijv. launch('netflix'). */
  function launch(id, params) {
    var p = { id: id };
    if (params) { p.params = params; }
    return request(AM, 'launch', p);
  }

  /* Bestaat de app op deze TV? (webOS TV 4.0+) */
  function appExists(id) {
    return request(AM, 'getAppLoadStatus', { appId: id }).then(function (res) { return !!res.exist; });
  }

  /* Lijst met apps op het thuisscherm. Niet elke TV staat dit toe voor eigen apps. */
  function listLaunchPoints() {
    return request(AM, 'listLaunchPoints', {}).then(function (res) { return res.launchPoints || []; });
  }

  /* Terug naar het systeem (sluit het dashboard netjes af). */
  function back() {
    try {
      if (window.webOS && typeof window.webOS.platformBack === 'function') { window.webOS.platformBack(); }
      else if (window.PalmSystem && typeof window.PalmSystem.platformBack === 'function') { window.PalmSystem.platformBack(); }
    } catch (e) { /* niets te doen */ }
  }

  /*
   * Screensaver tegenhouden zolang er een timer loopt (best effort).
   * De TV kondigt de screensaver aan; wij antwoorden met ack:false om hem uit te stellen.
   * Niet elke TV/firmware staat dit toe; dan verschijnt de screensaver gewoon
   * en klinkt het signaal nog steeds als de tijd om is.
   */
  var screenSaverSub = null;
  function guardScreenSaver(shouldBlock) {
    if (!isWebOS || !window.webOS || !window.webOS.service || screenSaverSub) { return; }
    var POWER = 'luna://com.webos.service.tvpower';
    var clientName = (window.webOS.fetchAppId && window.webOS.fetchAppId()) || 'com.boukaria.focusdashboard';
    try {
      screenSaverSub = window.webOS.service.request(POWER, {
        method: 'power/registerScreenSaverRequest',
        parameters: { subscribe: true, clientName: clientName },
        subscribe: true,
        resubscribe: true,
        onSuccess: function (res) {
          if (!res || res.state !== 'Active' || res.timestamp == null) { return; }
          window.webOS.service.request(POWER, {
            method: 'power/responseScreenSaverRequest',
            parameters: { clientName: clientName, ack: !shouldBlock(), timestamp: res.timestamp }
          });
        },
        onFailure: function () { screenSaverSub = null; }
      });
    } catch (e) {
      screenSaverSub = null;
    }
  }

  return {
    isWebOS: isWebOS, request: request, launch: launch, appExists: appExists,
    listLaunchPoints: listLaunchPoints, back: back, guardScreenSaver: guardScreenSaver
  };
})();
