// Samsung TV remote over the LAN websocket on port 8002 (TLS).
// Protocol: wss://<ip>:8002/api/v2/channels/samsung.remote.control?name=<base64 app name>[&token=<token>]
// Port 8001 (plain ws) answers with ms.channel.unauthorized on newer TVs, so it is not used.
// Keys are sent as {"method":"ms.remote.control","params":{...}}.
(function () {
  var APP_NAME = 'TV Remote';
  var STORE_KEY = 'tvRemote.v1';

  var ipInput = document.getElementById('ipInput');
  var connectBtn = document.getElementById('connectBtn');
  var forgetBtn = document.getElementById('forgetBtn');
  var statusEl = document.getElementById('status');
  var connectPanel = document.getElementById('connectPanel');
  var keys = document.querySelectorAll('.key');

  var ws = null;
  var ip = '';
  var token = '';

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveStore(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function setConnected(on) {
    keys.forEach(function (b) { b.disabled = !on; });
    connectPanel.hidden = false;
  }

  function buildUrl(host, withToken) {
    var name = btoa(unescape(encodeURIComponent(APP_NAME)));
    var url = 'wss://' + host + ':8002/api/v2/channels/samsung.remote.control?name=' + encodeURIComponent(name);
    if (withToken && token) url += '&token=' + encodeURIComponent(token);
    return url;
  }

  function connect(host) {
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } ws = null; }
    ip = host;
    setConnected(false);
    setStatus('Подключаюсь к ' + host + '…');

    var socket;
    try {
      socket = new WebSocket(buildUrl(host, true));
    } catch (e) {
      setStatus('Не удалось открыть соединение: ' + e.message, 'bad');
      return;
    }
    ws = socket;

    var opened = false;
    var timer = setTimeout(function () {
      if (!opened) {
        setStatus('ТВ не отвечает на ' + host + ':8002. Проверьте IP и что ТВ включён.', 'bad');
        try { socket.close(); } catch (e) { /* ignore */ }
      }
    }, 8000);

    socket.onopen = function () {
      opened = true;
      clearTimeout(timer);
      setStatus('Соединение открыто, жду подтверждения от ТВ…');
    };

    socket.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.event === 'ms.channel.connect') {
        // TV gives a token the first time it accepts this app; store it for later
        if (msg.data && msg.data.token) {
          token = String(msg.data.token);
          var store = loadStore();
          store.ip = ip;
          store.token = token;
          saveStore(store);
        }
        setConnected(true);
        setStatus('Подключено к ' + ip, 'ok');
      } else if (msg.event === 'ms.channel.unauthorized') {
        setStatus('ТВ не разрешил подключение. Подтвердите запрос на экране ТВ и нажмите «Подключить» снова.', 'bad');
      }
    };

    socket.onerror = function () {
      setStatus('Ошибка соединения с ' + host + '. Откройте https://' + host + ':8002/api/v2/ в этом браузере, примите сертификат ТВ и повторите.', 'bad');
    };

    socket.onclose = function () {
      clearTimeout(timer);
      if (ws === socket) {
        ws = null;
        setConnected(false);
        if (opened) setStatus('Соединение закрыто. Нажмите «Подключить».', 'bad');
      }
    };
  }

  function sendKey(key) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus('Нет соединения с ТВ', 'bad');
      return;
    }
    ws.send(JSON.stringify({
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: key,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey'
      }
    }));
  }

  keys.forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendKey(btn.getAttribute('data-key'));
    });
  });

  connectBtn.addEventListener('click', function () {
    var host = ipInput.value.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && !/^[\w.-]+$/.test(host)) {
      setStatus('Введите IP телевизора', 'bad');
      return;
    }
    token = (loadStore().ip === host) ? (loadStore().token || '') : '';
    connect(host);
  });

  ipInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') connectBtn.click();
  });

  forgetBtn.addEventListener('click', function () {
    saveStore({});
    token = '';
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } }
    ipInput.value = '';
    setStatus('Данные ТВ забыты');
    setConnected(false);
  });

  // Restore last TV on load
  var saved = loadStore();
  if (saved.ip) {
    ipInput.value = saved.ip;
    token = saved.token || '';
  }
  setConnected(false);
})();
