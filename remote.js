// Remote page: connects to the saved TV on load and sends keys.
(function () {
  var statusEl = document.getElementById('status');
  var keys = document.querySelectorAll('.key');

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function setKeysEnabled(on) {
    keys.forEach(function (b) { b.disabled = !on; });
  }

  function onStatus(state, text) {
    if (state === 'ok') {
      setKeysEnabled(true);
      setStatus(text, 'ok');
    } else if (state === 'connecting') {
      setKeysEnabled(false);
      setStatus(text);
    } else {
      setKeysEnabled(false);
      setStatus(text + ' Откройте «Настройки», чтобы поменять ТВ.', 'bad');
    }
  }

  keys.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!TV.sendKey(btn.getAttribute('data-key'))) setStatus('Нет соединения с ТВ', 'bad');
    });
  });

  var saved = TV.saved();
  setKeysEnabled(false);
  if (saved.ip) {
    TV.connect(saved.ip, onStatus);
  } else {
    setStatus('ТВ ещё не настроен. Откройте «Настройки» и введите IP.', 'bad');
  }
})();
