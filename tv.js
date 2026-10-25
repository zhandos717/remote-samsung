// Connection core shared by the remote and settings pages.
// Samsung TV websocket on port 8002 (TLS). Port 8001 answers ms.channel.unauthorized on newer TVs.
// Keys are sent as {"method":"ms.remote.control","params":{...}}.
var TV = (function () {
  var APP_NAME = 'TV Remote';
  var STORE_KEY = 'tvRemote.v1';
  var DEFAULT_IP_PREFIX = '192.168.0.';  // most home networks; the user types only the last number

  var ws = null;
  var connectedIp = '';

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  function buildUrl(host, token) {
    var name = btoa(unescape(encodeURIComponent(APP_NAME)));
    var url = 'wss://' + host + ':8002/api/v2/channels/samsung.remote.control?name=' + encodeURIComponent(name);
    if (token) url += '&token=' + encodeURIComponent(token);
    return url;
  }

  // onStatus(state, text): state is 'connecting' | 'ok' | 'bad' | 'closed'
  function connect(host, onStatus) {
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } ws = null; }
    connectedIp = '';
    var token = (load().ip === host) ? (load().token || '') : '';
    onStatus('connecting', 'Подключаюсь к ' + host + '…');

    var socket;
    try {
      socket = new WebSocket(buildUrl(host, token));
    } catch (e) {
      onStatus('bad', 'Не удалось открыть соединение: ' + e.message);
      return;
    }
    ws = socket;

    var opened = false;
    var timer = setTimeout(function () {
      if (!opened) {
        onStatus('bad', 'ТВ не отвечает на ' + host + ':8002. Проверьте IP и что ТВ включён.');
        try { socket.close(); } catch (e) { /* ignore */ }
      }
    }, 8000);

    socket.onopen = function () {
      opened = true;
      clearTimeout(timer);
      onStatus('connecting', 'Жду подтверждения от ТВ…');
    };

    socket.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.event === 'ms.channel.connect') {
        // The TV issues a token the first time it accepts this app; keep it for next time
        var data = load();
        data.ip = host;
        if (msg.data && msg.data.token) data.token = String(msg.data.token);
        save(data);
        connectedIp = host;
        onStatus('ok', 'Подключено к ' + host);
      } else if (msg.event === 'ms.channel.unauthorized') {
        onStatus('bad', 'ТВ не разрешил подключение. Нажмите «Разрешить» на экране ТВ и повторите.');
      }
    };

    socket.onerror = function () {
      onStatus('bad', 'Ошибка соединения с ' + host + '. Откройте https://' + host + ':8002/api/v2/ в этом браузере, примите сертификат ТВ и повторите.');
    };

    socket.onclose = function () {
      clearTimeout(timer);
      if (ws === socket) {
        ws = null;
        connectedIp = '';
        if (opened) onStatus('closed', 'Соединение закрыто.');
      }
    };
  }

  function isConnected() {
    return !!(ws && ws.readyState === WebSocket.OPEN && connectedIp);
  }

  function sendKey(key) {
    if (!isConnected()) return false;
    ws.send(JSON.stringify({
      method: 'ms.remote.control',
      params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' }
    }));
    return true;
  }

  function forget() {
    save({});
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } }
    ws = null;
    connectedIp = '';
  }

  return {
    connect: connect,
    sendKey: sendKey,
    isConnected: isConnected,
    forget: forget,
    saved: load,
    DEFAULT_IP_PREFIX: DEFAULT_IP_PREFIX
  };
})();
