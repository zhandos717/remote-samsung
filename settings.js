// Settings page: enter the TV's IP, test the connection, save it.
(function () {
  var ipInput = document.getElementById('ipInput');
  var connectBtn = document.getElementById('connectBtn');
  var forgetBtn = document.getElementById('forgetBtn');
  var statusEl = document.getElementById('status');

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function onStatus(state, text) {
    if (state === 'ok') setStatus(text + '. Вернитесь к пульту.', 'ok');
    else if (state === 'connecting') setStatus(text);
    else setStatus(text, 'bad');
  }

  // Put the caret at the end so the user only types the last part of the address
  ipInput.addEventListener('focus', function () {
    var v = ipInput.value;
    setTimeout(function () { ipInput.setSelectionRange(v.length, v.length); }, 0);
  });

  connectBtn.addEventListener('click', function () {
    var host = ipInput.value.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      setStatus('Введите IP полностью, например 192.168.1.50', 'bad');
      return;
    }
    TV.connect(host, onStatus);
  });

  ipInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') connectBtn.click();
  });

  forgetBtn.addEventListener('click', function () {
    TV.forget();
    ipInput.value = TV.DEFAULT_IP_PREFIX;
    setStatus('Данные ТВ забыты');
  });

  var saved = TV.saved();
  if (saved.ip) {
    ipInput.value = saved.ip;
    setStatus('Сохранён ТВ: ' + saved.ip);
  } else {
    ipInput.value = TV.DEFAULT_IP_PREFIX;
  }
  // App updates
  var checkUpdateBtn = document.getElementById('checkUpdateBtn');
  var applyUpdateBtn = document.getElementById('applyUpdateBtn');
  var updateStatus = document.getElementById('updateStatus');

  Updater.onState(function (state) {
    if (state === 'ready') {
      updateStatus.textContent = 'Есть новая версия приложения';
      updateStatus.className = 'status ok';
      applyUpdateBtn.hidden = false;
    } else {
      updateStatus.textContent = 'Новых версий нет';
      updateStatus.className = 'status';
    }
    checkUpdateBtn.disabled = false;
  });

  checkUpdateBtn.addEventListener('click', function () {
    checkUpdateBtn.disabled = true;
    updateStatus.textContent = 'Проверяю…';
    updateStatus.className = 'status';
    Updater.check();
  });

  applyUpdateBtn.addEventListener('click', function () {
    updateStatus.textContent = 'Устанавливаю…';
    Updater.apply();
  });
})();
