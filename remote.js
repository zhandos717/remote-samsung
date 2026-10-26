// Remote page: connects to the saved TV on load, sends keys,
// and turns touchpad gestures into D-pad presses (swipe) and OK (tap).
(function () {
  var statusEl = document.getElementById('status');
  var updateBtn = document.getElementById('updateBtn');

  Updater.onState(function (state) {
    if (state === 'ready') updateBtn.hidden = false;
  });
  updateBtn.addEventListener('click', function () { Updater.apply(); });
  var touchpad = document.getElementById('touchpad');
  var touchHint = document.getElementById('touchHint');
  var keys = document.querySelectorAll('.key');

  var STEP = 60;          // px of movement per directional press (less jumpy than 36)
  var TAP_MOVE = 10;      // px; less than this counts as a tap
  var TAP_TIME = 300;     // ms; shorter than this counts as a tap

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function setEnabled(on) {
    keys.forEach(function (b) { b.disabled = !on; });
    touchpad.classList.toggle('disabled', !on);
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
    if (!TV.sendKey(key)) setStatus('Нет соединения с ТВ', 'bad');
    buzz(8);
  }

  function buzz(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // Buttons
  keys.forEach(function (btn) {
    btn.addEventListener('click', function () {
      press(btn.getAttribute('data-key'));
    });
  });

  // Touchpad: swipe moves focus step by step, short tap presses OK
  var start = null;
  var acc = { x: 0, y: 0 };

  function flash() {
    touchpad.classList.add('active');
    clearTimeout(flash.t);
    flash.t = setTimeout(function () { touchpad.classList.remove('active'); }, 160);
  }

  touchpad.addEventListener('pointerdown', function (e) {
    if (touchpad.classList.contains('disabled')) return;
    touchpad.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    acc = { x: 0, y: 0 };
    if (touchHint) touchHint.style.opacity = '0';
  });

  touchpad.addEventListener('pointermove', function (e) {
    if (!start) return;
    var dx = e.clientX - start.x;
    var dy = e.clientY - start.y;
    if (Math.abs(dx) > TAP_MOVE || Math.abs(dy) > TAP_MOVE) start.moved = true;

    // Emit one press per STEP px along the dominant axis, then re-anchor
    var ddx = e.clientX - (start.lx !== undefined ? start.lx : start.x);
    var ddy = e.clientY - (start.ly !== undefined ? start.ly : start.y);
    acc.x += ddx;
    acc.y += ddy;
    start.lx = e.clientX;
    start.ly = e.clientY;

    if (Math.abs(acc.x) >= STEP && Math.abs(acc.x) >= Math.abs(acc.y)) {
      press(acc.x > 0 ? 'KEY_RIGHT' : 'KEY_LEFT');
      acc = { x: 0, y: 0 };
      flash();
    } else if (Math.abs(acc.y) >= STEP && Math.abs(acc.y) > Math.abs(acc.x)) {
      press(acc.y > 0 ? 'KEY_DOWN' : 'KEY_UP');
      acc = { x: 0, y: 0 };
      flash();
    }
  });

  function endGesture(e) {
    if (!start) return;
    var quick = Date.now() - start.t < TAP_TIME;
    var tap = quick && !start.moved;
    start = null;
    if (touchHint) touchHint.style.opacity = '';
    if (tap) {
      press('KEY_ENTER');
      flash();
    }
  }

  touchpad.addEventListener('pointerup', endGesture);
  touchpad.addEventListener('pointercancel', function () { start = null; });

  // Prevent the page from scrolling or zooming while the finger is on the pad
  touchpad.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  // Keyboard fallback for desktop testing
  document.addEventListener('keydown', function (e) {
    var map = { ArrowLeft: 'KEY_LEFT', ArrowRight: 'KEY_RIGHT', ArrowUp: 'KEY_UP', ArrowDown: 'KEY_DOWN', Enter: 'KEY_ENTER', Backspace: 'KEY_RETURN' };
    if (map[e.key]) {
      e.preventDefault();
      press(map[e.key]);
    }
  });

  // Block pinch and double-tap zoom on the remote (iOS fires gesture* events, others use multi-touch)
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
