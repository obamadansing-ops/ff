/* Plazma Burst 2 - mobile touch layer
 * Adds a joystick, touch aim/fire and configurable on-screen buttons on top of the
 * unmodified game. It works by feeding the game the same keyboard / mouse events a
 * desktop player would produce, so none of the game's own scripts are edited. */
(function () {
  'use strict';
  if (window.__pb2m) return;
  // Only add the touch layer on touch devices (open the page with ?touch=1 to force it on a desktop browser).
  if (!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window || /[?&]touch=1/.test(location.search))) return;
  window.__pb2m = true;

  // Names of a few internal game variables (baked in at build time).
  const IDS = {"hpc": "$HpcIAA", "hudEsc": "$Hc\u0440\u0440\u0440O", "hudP": "$p\u043eI\u041dp", "vTe": "$TeIOl", "vCc": "$\u0441c\u0422A\u0441", "vLi": "$lITeI", "vAlt": "$Te\u0440\u04400"};
  const STORE = 'pb2m.layout.v1';
  // The game replaces the global addEventListener with one that feeds its own stage object,
  // so listen on the window through the browser's native implementation instead.
  const winOn = (type, fn, o) => EventTarget.prototype.addEventListener.call(window, type, fn, o);

  // ------------------------------------------------------------------ keys
  const KEYS = {
    9: ['Tab', 'Tab'], 27: ['Escape', 'Escape'], 65: ['KeyA', 'a'], 67: ['KeyC', 'c'], 68: ['KeyD', 'd'],
    69: ['KeyE', 'e'], 71: ['KeyG', 'g'], 80: ['KeyP', 'p'], 81: ['KeyQ', 'q'], 83: ['KeyS', 's'],
    86: ['KeyV', 'v'], 87: ['KeyW', 'w'], 88: ['KeyX', 'x'], 90: ['KeyZ', 'z'], 116: ['F5', 'F5'], 120: ['F9', 'F9']
  };

  // ------------------------------------------------------------------ controls
  // x / y = centre as a fraction of screen width / height, s = diameter as a fraction of screen height.
  const DEFS = [
    { id: 'joy',     name: 'Joystick',          kind: 'joy',   x: .13,  y: .72, s: .38, on: true },
    { id: 'jump',    name: 'Jump',              kind: 'key', key: 87,  img: 'jump',    x: .915, y: .73, s: .24, on: true },
    { id: 'use',     name: 'Use (E)',           kind: 'key', key: 69,  img: 'use',     x: .815, y: .87, s: .16, on: true },
    { id: 'grenade', name: 'Grenade (G)',       kind: 'key', key: 71,  img: 'grenade', x: .80,  y: .61, s: .16, on: true },
    { id: 'slowmo',  name: 'Slow-mo (Z)',       kind: 'key', key: 90,  img: 'slowmo',  x: .915, y: .47, s: .16, on: true },
    { id: 'ragdoll', name: 'Ragdoll (X)',       kind: 'key', key: 88,  img: 'ragdoll', x: .705, y: .85, s: .15, on: true },
    { id: 'kinetic', name: 'Kinetic (C)',       kind: 'key', key: 67,  img: 'kinetic', x: .69,  y: .62, s: .15, on: true },
    { id: 'prev',    name: 'Previous weapon',   kind: 'wheel', dir: -1, img: 'prev',    x: .05,  y: .46, s: .12, on: true },
    { id: 'next',    name: 'Next weapon',       kind: 'wheel', dir: 1,  img: 'next',    x: .145, y: .46, s: .12, on: true },
    { id: 'swap',    name: 'Quick swap (Q)',    kind: 'key', key: 81,  img: 'swap',    x: .24,  y: .46, s: .12, on: true },
    { id: 'fire',    name: 'Fire button',       kind: 'fire', img: 'fire', x: .80, y: .36, s: .2, on: false },
    { id: 'duck',    name: 'Duck (S)',          kind: 'key', key: 83,  img: 'duck',    x: .60,  y: .78, s: .15, on: false },
    { id: 'hero',    name: 'Switch hero (Tab)', kind: 'key', key: 9,   img: 'hero',    x: .40,  y: .22, s: .12, on: false },
    { id: 'pause',   name: 'Pause (P)',         kind: 'key', key: 80,  txt: 'II',      x: .48,  y: .22, s: .11, on: false },
    { id: 'menu',    name: 'Menu (Esc)',        kind: 'key', key: 27,  txt: 'Menu',    x: .885, y: .165, s: .11, on: true },
    { id: 'nopick',  name: "Don't pick up (V)", kind: 'key', key: 86,  txt: 'V',       x: .34,  y: .46, s: .12, on: false },
    { id: 'qsave',   name: 'Quick save (F5)',   kind: 'key', key: 116, txt: 'Save',    x: .64,  y: .22, s: .11, on: false },
    { id: 'qload',   name: 'Quick load (F9)',   kind: 'key', key: 120, txt: 'Load',    x: .72,  y: .22, s: .11, on: false }
  ];
  const BY = {};
  DEFS.forEach(d => (BY[d.id] = d));

  // ------------------------------------------------------------------ settings
  let cfg = loadCfg();
  function loadCfg() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
    const c = {
      opacity: num(s.opacity, .6, .2, 1), dz: num(s.dz, .28, .1, .6),
      touchFires: s.touchFires !== false, joyDown: s.joyDown !== false,
      vibrate: s.vibrate === true, wake: s.wake !== false, ctl: {}
    };
    for (const d of DEFS) {
      const o = (s.ctl && s.ctl[d.id]) || {};
      c.ctl[d.id] = { x: num(o.x, d.x, 0, 1), y: num(o.y, d.y, 0, 1), s: num(o.s, d.s, .06, .7), on: typeof o.on === 'boolean' ? o.on : d.on };
    }
    return c;
  }
  function num(v, d, lo, hi) { v = typeof v === 'number' && isFinite(v) ? v : d; return Math.max(lo, Math.min(hi, v)); }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {} }

  // ------------------------------------------------------------------ game state probes
  const mk = expr => {
    try { return new Function('try{return !!(' + expr + ')}catch(e){return false}'); } catch (e) { return () => false; }
  };
  const gl = n => 'globalThis[' + JSON.stringify(n) + ']';
  const probe = {
    label: new Function('try{return currentLabel}catch(e){return ""}'),
    overlays: [
      mk('HUD[' + JSON.stringify(IDS.hudEsc) + ']'), mk('HUD[' + JSON.stringify(IDS.hudP) + ']'),
      mk(IDS.vTe + '.visible'), mk(gl(IDS.vCc) + '.visible'), mk(IDS.vLi + '.visible'), mk(gl(IDS.vAlt) + '.visible')
    ]
  };
  const inGame = () => probe.label() === 'gaming';
  const overlayOpen = () => probe.overlays.some(f => f());

  // ------------------------------------------------------------------ bridge into the game
  // The game also shadows KeyboardEvent / MouseEvent with its own constants, so take the real
  // constructors from a pristine iframe whenever the page's own ones have been replaced.
  const NE = (() => {
    const isNat = f => typeof f === 'function' && /\[native code\]/.test(Function.prototype.toString.call(f));
    let frame;
    const get = n => {
      if (isNat(window[n])) return window[n];
      if (!frame) { frame = document.createElement('iframe'); frame.style.cssText = 'display:none'; document.body.appendChild(frame); }
      return frame.contentWindow[n];
    };
    return { Key: get('KeyboardEvent'), Mouse: get('MouseEvent'), Wheel: get('WheelEvent'), Pointer: get('PointerEvent') };
  })();
  const held = new Map(); // keyCode -> count
  function fireKey(type, kc) {
    const k = KEYS[kc] || ['', ''];
    const ev = new NE.Key(type, { key: k[1], code: k[0], keyCode: kc, which: kc, bubbles: true, cancelable: true, view: window });
    if (ev.keyCode !== kc) Object.defineProperty(ev, 'keyCode', { get: () => kc });
    if (ev.which !== kc) Object.defineProperty(ev, 'which', { get: () => kc });
    window.dispatchEvent(ev);
  }
  function keyDown(kc) { const n = held.get(kc) || 0; held.set(kc, n + 1); if (!n) fireKey('keydown', kc); }
  function keyUp(kc) {
    const n = held.get(kc) || 0;
    if (n <= 1) { if (n === 1) { held.delete(kc); fireKey('keyup', kc); } } else held.set(kc, n - 1);
  }
  function wheel(dir) { // dir +1 = next weapon, -1 = previous
    window.dispatchEvent(new NE.Wheel('wheel', { deltaY: dir > 0 ? -100 : 100, deltaMode: 0, bubbles: true, cancelable: true, view: window }));
  }
  const cur = { x: innerWidth / 2, y: innerHeight / 2 };
  function pointer(x, y, sync) {
    cur.x = x; cur.y = y;
    // Dispatch on the element under the finger: the game's HTML menus read offsetX/offsetY from
    // pointermove events sent to them. The event bubbles up to the body listener the game uses for the cursor.
    const ev = new NE.Pointer('pointermove', {
      clientX: x, clientY: y, screenX: x, screenY: y, pointerType: 'mouse', pointerId: 1, isPrimary: true,
      bubbles: true, cancelable: true, view: window
    });
    Object.defineProperty(ev, 'getCoalescedEvents', { value: () => [ev] }); // synthetic events have none of their own
    targetAt(x, y).dispatchEvent(ev);
    if (sync) { try { globalThis[IDS.hpc](); } catch (e) {} } // make the game read the new position right now
  }
  let mouseIsDown = false;
  const isEditable = el => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  function targetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && !root.contains(el) ? el : document.body;
  }
  function mouse(type, x, y) {
    mouseIsDown = type === 'mousedown';
    // Send it to whatever is under the finger (the game's text boxes are real <input> elements).
    const t = targetAt(x, y);
    if (type === 'mousedown') { const a = document.activeElement; if (isEditable(a) && a !== t) a.blur(); }
    t.dispatchEvent(new NE.Mouse(type, {
      clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: mouseIsDown ? 1 : 0,
      bubbles: true, cancelable: true, view: window
    }));
    // A real tap would focus a text box (and open the on-screen keyboard); synthetic events do not.
    if (type === 'mouseup' && isEditable(t)) { try { t.focus({ preventScroll: true }); } catch (e) {} }
    return t;
  }
  // Browsers follow mousedown + mouseup on the same element with a click; the game's HTML menus listen for it.
  function click(t, x, y) {
    t.dispatchEvent(new NE.Mouse('click', { clientX: x, clientY: y, screenX: x, screenY: y, button: 0, bubbles: true, cancelable: true, view: window }));
  }
  function unlockAudio() { try { JSAudio.audioContext.resume(); } catch (e) {} }

  // ------------------------------------------------------------------ DOM
  const root = document.createElement('div');
  root.id = 'pb2m';
  root.innerHTML =
    '<div class="rotate"><div><span class="ph">&#128241;</span>Rotate your device to landscape to play</div></div>' +
    '<button class="ui gear" aria-label="Touch controls settings">&#9881;</button>' +
    '<div class="ui bar" hidden><span>Drag buttons to move them. Tap one to resize or hide it.</span>' +
    '<button class="b primary" data-a="done">Done</button><button class="b" data-a="menu">Settings</button></div>' +
    '<div class="ui sel" hidden><div class="row"><span class="name"></span><span style="flex:1"></span>' +
    '<label class="showrow" style="flex:none">Show</label><input type="checkbox" class="tog showrow" data-s="on"></div>' +
    '<div class="row"><label>Size</label><input type="range" data-s="s" min=".07" max=".5" step=".01"><span class="val"></span></div>' +
    '<div class="row"><button class="b" data-a="resetone">Reset this button</button></div></div>' +
    '<div class="ui panel menu" hidden><h3>Touch controls</h3>' +
    '<div class="row"><label>Touch aims and shoots</label><input type="checkbox" class="tog" data-k="touchFires"></div>' +
    '<div class="row"><label>Joystick down = duck</label><input type="checkbox" class="tog" data-k="joyDown"></div>' +
    '<div class="row"><label>Vibrate on button press</label><input type="checkbox" class="tog" data-k="vibrate"></div>' +
    '<div class="row"><label>Keep screen awake</label><input type="checkbox" class="tog" data-k="wake"></div>' +
    '<div class="row"><label>Button opacity</label><input type="range" data-k="opacity" min=".2" max="1" step=".05"><span class="val"></span></div>' +
    '<div class="row"><label>Joystick dead zone</label><input type="range" data-k="dz" min=".1" max=".6" step=".02"><span class="val"></span></div>' +
    '<div class="btns"><button class="b primary" data-a="edit">Edit layout</button><button class="b" data-a="fs">Fullscreen</button>' +
    '<button class="b warn" data-a="reset">Reset layout</button><button class="b" data-a="close">Close</button></div>' +
    '<div class="note">With "Touch aims and shoots" off, touching only aims and a Fire button is shown instead.</div></div>';
  const els = {};
  const IMG = (() => { // images live next to this script
    const s = document.currentScript && document.currentScript.src;
    return (s ? s.replace(/[^/]*$/, '') : 'mobile/') + 'img/';
  })();
  for (const d of DEFS) {
    const el = document.createElement('div');
    el.className = 'ctl ' + (d.kind === 'joy' ? 'joy' : 'btn');
    el.dataset.id = d.id;
    if (d.kind === 'joy') el.innerHTML = '<div class="knob"></div>';
    else if (d.img) el.innerHTML = '<img alt="" draggable="false" src="' + IMG + d.img + '.png">';
    else el.innerHTML = '<span class="txt">' + d.txt + '</span>';
    if (d.kind !== 'joy') el.insertAdjacentHTML('beforeend', '<span class="cap">' + d.name.replace(/ \(.*/, '') + '</span>');
    root.insertBefore(el, root.querySelector('.gear'));
    els[d.id] = el;
  }
  const ui = {
    gear: root.querySelector('.gear'), bar: root.querySelector('.bar'), sel: root.querySelector('.sel'), menu: root.querySelector('.menu')
  };
  document.body.appendChild(root);

  // ------------------------------------------------------------------ layout
  const geo = id => {
    const c = cfg.ctl[id], H = innerHeight, W = innerWidth;
    return { cx: c.x * W, cy: c.y * H, r: c.s * H / 2 };
  };
  function place(id) {
    const g = geo(id), el = els[id], D = g.r * 2;
    el.style.width = el.style.height = D + 'px';
    el.style.setProperty('--d', D + 'px');
    el.style.setProperty('--tf', 'translate(' + (g.cx - g.r) + 'px,' + (g.cy - g.r) + 'px)');
    el.classList.toggle('off', !cfg.ctl[id].on);
  }
  function layoutAll() {
    root.style.setProperty('--pb2m-op', cfg.opacity);
    DEFS.forEach(d => place(d.id));
    for (const d of DEFS) els[d.id].style.display = (editing || cfg.ctl[d.id].on) ? '' : 'none';
  }

  // ------------------------------------------------------------------ touch routing
  let editing = false, selected = null;
  const touches = new Map(); // touch id -> record
  let screenId = null;
  const joy = { left: false, right: false, down: false };

  function hit(x, y, includeOff) {
    for (let i = DEFS.length - 1; i >= 0; i--) {
      const d = DEFS[i];
      if (!includeOff && !cfg.ctl[d.id].on) continue;
      const g = geo(d.id);
      if (Math.hypot(x - g.cx, y - g.cy) <= g.r * (d.kind === 'joy' ? 1.2 : 1.1)) return d;
    }
    return null;
  }
  const inUI = t => !!(t && t.closest && t.closest('.ui'));
  function buzz() { if (cfg.vibrate && navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} } }
  const firesNow = () => cfg.touchFires || !inGame() || overlayOpen();

  function setJoy(rec, x, y) {
    const g = geo('joy');
    let dx = x - g.cx, dy = y - g.cy;
    const m = Math.hypot(dx, dy), lim = g.r * .8;
    if (m > lim) { dx *= lim / m; dy *= lim / m; }
    els.joy.style.setProperty('--kx', dx + 'px');
    els.joy.style.setProperty('--ky', dy + 'px');
    const nx = dx / lim, ny = dy / lim, dz = cfg.dz;
    const L = joy.left ? -nx > dz * .7 : -nx > dz;
    const R = joy.right ? nx > dz * .7 : nx > dz;
    const D = cfg.joyDown && (joy.down ? ny > .4 : (ny > .6 && ny > Math.abs(nx) * .8));
    if (L !== joy.left) { joy.left = L; L ? keyDown(65) : keyUp(65); }
    if (R !== joy.right) { joy.right = R; R ? keyDown(68) : keyUp(68); }
    if (D !== joy.down) { joy.down = D; D ? keyDown(83) : keyUp(83); }
  }
  function endJoy() {
    if (joy.left) keyUp(65);
    if (joy.right) keyUp(68);
    if (joy.down) keyUp(83);
    joy.left = joy.right = joy.down = false;
    els.joy.style.setProperty('--kx', '0px');
    els.joy.style.setProperty('--ky', '0px');
    els.joy.classList.remove('down');
  }
  function pressBtn(d, on) {
    els[d.id].classList.toggle('down', on);
    if (d.kind === 'key') on ? keyDown(d.key) : keyUp(d.key);
    else if (d.kind === 'wheel') { if (on) wheel(d.dir); }
    else if (d.kind === 'fire') { if (on) { pointer(cur.x, cur.y, true); mouse('mousedown', cur.x, cur.y); } else if (mouseIsDown) mouse('mouseup', cur.x, cur.y); }
    if (on) buzz();
  }

  function onStart(e) {
    if (inUI(e.target)) return;
    e.preventDefault();
    unlockAudio(); wake();
    if (ui.menu.hidden === false) { closeMenu(); return; }
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (editing) { editStart(t); continue; }
      const playing = !root.classList.contains('hide-ctl');
      const d = playing ? hit(x, y, false) : null;
      if (d) {
        if (d.kind === 'joy') { touches.set(t.identifier, { k: 'joy' }); els.joy.classList.add('down'); setJoy(null, x, y); }
        else { touches.set(t.identifier, { k: 'btn', d }); pressBtn(d, true); }
      } else if (screenId === null) {
        screenId = t.identifier; touches.set(t.identifier, { k: 'screen', down: false });
        pointer(x, y, true);
        if (firesNow()) { const rec = touches.get(t.identifier); rec.down = true; rec.target = mouse('mousedown', x, y); }
      } else touches.set(t.identifier, { k: 'ignore' });
    }
  }
  function onMove(e) {
    if (!touches.size && !inUI(e.target)) { e.preventDefault(); return; }
    let handled = false;
    for (const t of e.changedTouches) {
      const r = touches.get(t.identifier);
      if (!r) continue;
      handled = true;
      if (r.k === 'joy') setJoy(r, t.clientX, t.clientY);
      else if (r.k === 'screen') pointer(t.clientX, t.clientY, false);
      else if (r.k === 'drag') editDrag(r, t);
    }
    if (handled || !inUI(e.target)) e.preventDefault();
  }
  function onEnd(e) {
    let handled = false;
    for (const t of e.changedTouches) {
      const r = touches.get(t.identifier);
      if (!r) continue;
      handled = true;
      touches.delete(t.identifier);
      if (r.k === 'joy') endJoy();
      else if (r.k === 'btn') pressBtn(r.d, false);
      else if (r.k === 'screen') {
        screenId = null;
        pointer(t.clientX, t.clientY, true);
        if (r.down) {
          const up = mouse('mouseup', t.clientX, t.clientY);
          if (up === r.target) click(up, t.clientX, t.clientY);
        }
        unlockAudio();
      } else if (r.k === 'drag') { save(); }
    }
    if (handled || !inUI(e.target)) e.preventDefault();
  }
  const opt = { capture: true, passive: false };
  winOn('touchstart', onStart, opt);
  winOn('touchmove', onMove, opt);
  winOn('touchend', onEnd, opt);
  winOn('touchcancel', onEnd, opt);

  // The browser also reports touches as pointer events; the game would take those as the mouse
  // moving, so swallow the real ones (our own synthetic ones are untrusted and pass through).
  const swallow = e => { if (e.isTrusted && e.pointerType !== 'mouse' && !inUI(e.target)) e.stopImmediatePropagation(); };
  winOn('pointermove', swallow, true);
  winOn('contextmenu', e => { if (!inUI(e.target)) e.preventDefault(); }, true);
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => winOn(n, e => e.preventDefault(), true));

  function releaseAll() {
    endJoy();
    for (const [id, r] of touches) if (r.k === 'btn') pressBtn(r.d, false);
    for (const [id, r] of touches) if (r.k === 'screen' && r.down) mouse('mouseup', cur.x, cur.y);
    touches.clear(); screenId = null;
    for (const kc of Array.from(held.keys())) { held.delete(kc); fireKey('keyup', kc); }
    DEFS.forEach(d => els[d.id].classList.remove('down'));
  }
  winOn('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); else wake(); });
  winOn('pagehide', releaseAll);

  // ------------------------------------------------------------------ show controls only while playing
  let wasPlaying = false;
  function tick() {
    const playing = inGame() && !overlayOpen();
    root.classList.toggle('hide-ctl', !(editing || playing));
    if (wasPlaying && !playing && !editing) releaseAll();
    wasPlaying = playing;
  }
  setInterval(tick, 100);

  // ------------------------------------------------------------------ edit mode
  let drag = null;
  function select(id) {
    selected = id;
    DEFS.forEach(d => els[d.id].classList.toggle('sel', d.id === id));
    ui.sel.hidden = !id;
    if (!id) return;
    const c = cfg.ctl[id];
    ui.sel.querySelector('.name').textContent = BY[id].name;
    ui.sel.querySelectorAll('.showrow').forEach(n => (n.style.display = id === 'joy' ? 'none' : ''));
    ui.sel.querySelector('[data-s=on]').checked = c.on;
    const r = ui.sel.querySelector('[data-s=s]');
    r.value = c.s; r.nextElementSibling.textContent = Math.round(c.s * 100);
  }
  function editStart(t) {
    const d = hit(t.clientX, t.clientY, true);
    if (!d) { select(null); touches.set(t.identifier, { k: 'ignore' }); return; }
    select(d.id);
    const g = geo(d.id);
    touches.set(t.identifier, { k: 'drag', id: d.id, ox: t.clientX - g.cx, oy: t.clientY - g.cy });
  }
  function editDrag(r, t) {
    const c = cfg.ctl[r.id];
    c.x = Math.max(.02, Math.min(.98, (t.clientX - r.ox) / innerWidth));
    c.y = Math.max(.03, Math.min(.97, (t.clientY - r.oy) / innerHeight));
    place(r.id);
  }
  function setEditing(on) {
    editing = on;
    releaseAll();
    root.classList.toggle('edit', on);
    ui.bar.hidden = !on;
    if (!on) select(null);
    closeMenu();
    layoutAll(); tick();
  }
  function openMenu() {
    syncMenu(); ui.menu.hidden = false;
  }
  function closeMenu() { ui.menu.hidden = true; }
  function syncMenu() {
    ui.menu.querySelectorAll('[data-k]').forEach(n => {
      const v = cfg[n.dataset.k];
      if (n.type === 'checkbox') n.checked = !!v; else { n.value = v; n.nextElementSibling.textContent = Math.round(v * 100); }
    });
    ui.menu.querySelector('[data-a=reset]').textContent = 'Reset layout';
  }
  function fullscreen() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!rq) return;
    const p = rq.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  }
  let resetArmed = false;
  root.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-a]');
    if (e.target.closest && e.target.closest('.gear')) { openMenu(); return; }
    if (!a) return;
    const act = a.dataset.a;
    if (act === 'close') closeMenu();
    else if (act === 'edit') setEditing(true);
    else if (act === 'done') setEditing(false);
    else if (act === 'menu') openMenu();
    else if (act === 'fs') fullscreen();
    else if (act === 'resetone' && selected) {
      const d = BY[selected]; Object.assign(cfg.ctl[selected], { x: d.x, y: d.y, s: d.s, on: d.on });
      place(selected); layoutAll(); select(selected); save();
    } else if (act === 'reset') {
      if (!resetArmed) { resetArmed = true; a.textContent = 'Tap again to confirm'; setTimeout(() => { resetArmed = false; a.textContent = 'Reset layout'; }, 3000); return; }
      resetArmed = false; a.textContent = 'Reset layout';
      for (const d of DEFS) cfg.ctl[d.id] = { x: d.x, y: d.y, s: d.s, on: d.on };
      cfg.touchFires = true; applyFireMode(); layoutAll(); save(); syncMenu(); if (selected) select(selected);
    }
  });
  root.addEventListener('input', e => {
    const n = e.target;
    if (n.dataset.k) {
      const v = n.type === 'checkbox' ? n.checked : parseFloat(n.value);
      cfg[n.dataset.k] = v;
      if (n.type !== 'checkbox') n.nextElementSibling.textContent = Math.round(v * 100);
      if (n.dataset.k === 'touchFires') applyFireMode();
      layoutAll(); save();
    } else if (n.dataset.s && selected) {
      const c = cfg.ctl[selected];
      if (n.dataset.s === 'on') c.on = n.checked; else { c.s = parseFloat(n.value); n.nextElementSibling.textContent = Math.round(c.s * 100); }
      layoutAll(); save();
    }
  });
  function applyFireMode() { cfg.ctl.fire.on = !cfg.touchFires; }
  applyFireMode();

  // ------------------------------------------------------------------ extras
  let wl = null;
  function wake() {
    if (!cfg.wake || wl || !navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(l => { wl = l; l.addEventListener('release', () => { wl = null; }); }).catch(() => {});
  }
  winOn('resize', layoutAll);
  winOn('orientationchange', () => setTimeout(layoutAll, 200));
  layoutAll(); tick();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.pb2m = { cfg: () => cfg, held: () => Array.from(held.keys()), cursor: cur, setEditing, releaseAll };
})();
