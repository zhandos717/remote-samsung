// App updates: the service worker waits until the user asks to apply a new version.
// Shared by the remote and settings pages.
var Updater = (function () {
  var reg = null;
  var reloading = false;
  var listeners = [];

  function notify(state) {
    listeners.forEach(function (fn) { fn(state); });
  }

  // onState(state): 'ready' when a new version is waiting, 'none' after a check finds nothing
  function onState(fn) { listeners.push(fn); }

  function watch(r) {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) notify('ready');
    r.addEventListener('updatefound', function () {
      var worker = r.installing;
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) notify('ready');
      });
    });
  }

  function init() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;

    navigator.serviceWorker.register('sw.js').then(watch).catch(function () { /* offline install is optional */ });

    // Reload once when the new worker takes control, so the page uses the new files
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  function apply() {
    if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
  }

  // Ask the browser to look for a new sw.js; reports 'ready' or 'none' within a few seconds
  function check() {
    if (!reg) { notify('none'); return; }
    reg.update().then(function () {
      setTimeout(function () {
        if (!reg.waiting && !reg.installing) notify('none');
      }, 3000);
    }).catch(function () { notify('none'); });
  }

  return { init: init, apply: apply, check: check, onState: onState };
})();
