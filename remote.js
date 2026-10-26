// Remote page: connects to the saved TV on load and sends key presses.
(function () {
  var statusEl = document.getElementById('status');
  var updateBtn = document.getElementById('updateBtn');
  var keys = document.querySelectorAll('.key');

  Updater.onState(function (state) {
    if (state === 'ready') updateBtn.hidden = false;
  });
  updateBtn.addEventListener('click', function () { Updater.apply(); });

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function setEnabled(on) {
    keys.forEach(function (b) { b.disabled = !on; });
  }

  function onStatus(state, text) {
    if (state === 'ok') {
      setEnabled(true);
      setStatus(text, 'ok');
    } else if (state === 'connecting') {
      setEnabled(false);
      setStatus(text);
    } else {
      setEnabled(false);
      setStatus(text + ' Откройте «Настройки», чтобы поменять ТВ.', 'bad');
    }
  }

  function press(key) {
    if (navigator.vibrate) navigator.vibrate(8);
    if (!TV.sendKey(key)) setStatus('Нет соединения с ТВ', 'bad');
  }

  keys.forEach(function (btn) {
    btn.addEventListener('click', function () {
      press(btn.getAttribute('data-key'));
    });
  });

  // Keyboard fallback for desktop testing
  document.addEventListener('keydown', function (e) {
    var map = { ArrowLeft: 'KEY_LEFT', ArrowRight: 'KEY_RIGHT', ArrowUp: 'KEY_UP', ArrowDown: 'KEY_DOWN', Enter: 'KEY_ENTER', Backspace: 'KEY_RETURN' };
    if (map[e.key]) {
      e.preventDefault();
      press(map[e.key]);
    }
  });

  // Block pinch and double-tap zoom on the remote (iOS fires gesture* events)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  var saved = TV.saved();
  setEnabled(false);
  if (saved.ip) {
    TV.connect(saved.ip, onStatus);
  } else {
    setStatus('ТВ ещё не настроен. Откройте «Настройки» и введите IP.', 'bad');
  }
})();
