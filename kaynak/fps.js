// ================= GARAGE ZERO — SAHAYA İN (FPS) =================
const FPS = {
  on: false, ready: false, pos: { x: 0, z: 8 }, yaw: Math.PI, pitch: -0.08, eyeCur: 1.68, crouch: false, run: false,
  keys: new Set(), joy: null, look: null, locked: false, dragLook: false,
  target: null, menu: null, menuSel: 0, work: null, ride: null, claim: false,
  bobPh: 0, stepD: 0, _rc: 0, _sc: 0, statics: [], hands: null, dir: null,

  // ---------- kurulum ----------
  setup() {
    if (FPS.ready) return; FPS.ready = true;
    FPS.dir = new THREE.Vector3();
    const cv = G.renderer.domElement;
    cv.addEventListener('pointerdown', FPS.pDown); cv.addEventListener('pointermove', FPS.pMove);
    cv.addEventListener('pointerup', FPS.pUp); cv.addEventListener('pointercancel', FPS.pUp);
    cv.addEventListener('wheel', e => { if (FPS.on && FPS.menu) { e.preventDefault(); FPS.moveSel(Math.sign(e.deltaY)); } }, { passive: false });
    document.addEventListener('pointerlockchange', () => { FPS.locked = document.pointerLockElement === cv; document.body.classList.toggle('fpslocked', FPS.locked); });
    document.addEventListener('pointerlockerror', () => { FPS.dragLook = true; if (FPS.on) UI.toast('Fare kilidi kullanılamıyor: bakmak için sürükle, tıklayarak etkileşime gir.', 'info'); });
    document.addEventListener('mousemove', e => { if (FPS.on && FPS.locked && !FPS.menu) FPS.rotate(e.movementX, e.movementY, 0.0024); });
    document.addEventListener('mousedown', e => {
      if (!FPS.on || !FPS.locked) return;
      if (e.button === 0) FPS.primary(); else if (e.button === 2) FPS.closeMenu();
    });
    $('#fpsBtns').addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-f]'); if (!b) return; e.preventDefault(); e.stopPropagation();
      const f = b.dataset.f;
      if (f === 'use') FPS.primary();
      if (FPS.drive && f === 'run') { SFX.horn(); return; }
      if (FPS.drive && f === 'crouch') { FPS.drive.far = !FPS.drive.far; return; }
      if (f === 'run') { FPS.run = !FPS.run; b.setAttribute('aria-pressed', FPS.run); }
      if (f === 'crouch') { FPS.crouch = !FPS.crouch; b.setAttribute('aria-pressed', FPS.crouch); }
      if (f === 'menu') FPS.mainMenu();
      if (f === 'light') { FPS.flash(); b.setAttribute('aria-pressed', FPS.lampOn); }
    });
    $('#fpsMenu').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) FPS.choose(+b.dataset.i); if (e.target.closest('[data-x]')) FPS.closeMenu(); });
    FPS.buildDesk(); FPS.buildHands();
    // el feneri (kameraya bağlı, başta kapalı)
    const lamp = new THREE.SpotLight(0xfff1d6, 0, 24, 0.5, 0.55, 1.4); lamp.position.set(0.15, -0.1, 0); G.camera.add(lamp);
    const lt = new THREE.Object3D(); lt.position.set(0, -0.2, -5); G.camera.add(lt); lamp.target = lt; FPS.lamp = lamp;
  },
  buildDesk() {
    // resepsiyon / bilgisayar masası (İşletme paneli)
    const g = new THREE.Group(); g.position.set(12.55, 0, -3); G.scene.add(g);
    const top = box(0.8, 0.06, 1.7, cmat(0x7a6048)); top.position.y = 0.78; g.add(top);
    const body = box(0.7, 0.75, 1.6, cmat(0x3d434a)); body.position.y = 0.38; g.add(body);
    const mon = box(0.06, 0.42, 0.62, cmat(0x15181b)); mon.position.set(0.12, 1.08, 0); g.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.36), new THREE.MeshBasicMaterial({ color: 0x3987e5 })); scr.rotation.y = -Math.PI / 2; scr.position.set(0.08, 1.08, 0); g.add(scr);
    const st = box(0.05, 0.22, 0.05, cmat(0x15181b)); st.position.set(0.14, 0.88, 0); g.add(st);
    const kb = box(0.18, 0.02, 0.45, cmat(0x23272c)); kb.position.set(-0.15, 0.82, 0); g.add(kb);
    const chair = box(0.5, 0.08, 0.5, cmat(0x23272c)); chair.position.set(-0.75, 0.48, 0); g.add(chair);
    const back = box(0.06, 0.55, 0.5, cmat(0x23272c)); back.position.set(-1.0, 0.78, 0); g.add(back);
    G.desk = g;
  },
  buildHands() {
    const h = new THREE.Group();
    const sleeve = new THREE.MeshStandardMaterial({ color: 0xff8a1f, roughness: 0.7 }), skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.8 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.34), sleeve); arm.position.set(0, 0, 0.12); h.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), skin); hand.position.set(0, 0, -0.08); h.add(hand);
    const tool = new THREE.Group(); tool.position.set(0, 0.03, -0.1); h.add(tool);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.012), new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.3 })); shaft.position.y = 0.08; tool.add(shaft);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.009, 6, 10, Math.PI * 1.5), shaft.material); head.position.y = 0.19; head.rotation.z = Math.PI * 0.75; tool.add(head);
    h.traverse(o => { if (o.isMesh) { o.renderOrder = 10; o.material.depthTest = true; } });
    h.position.set(0.24, -0.24, -0.42); h.rotation.set(0.1, 0.18, 0);
    h.visible = false; G.camera.add(h); if (!G.camera.parent) G.scene.add(G.camera);
    FPS.hands = h; FPS.tool = tool;
  },

  // ---------- aç / kapat ----------
  toggle() { FPS.on ? FPS.exit() : FPS.enter(); },
  enter() {
    if (!S || !UI.started || !G.renderer) return;
    FPS.setup();
    if (UI.inspect) UI.exitInspect();
    UI.closePanel(); if (!$('#modal').hidden && !UI.haggle) UI.closeModal();
    FPS.on = true; FPS.menu = null; FPS.target = null; FPS.keys.clear();
    // seçili aracın yanına ya da atölye girişine in
    const sel = UI._lastCar && G.carMeshes[UI._lastCar];
    if (sel && Math.hypot(sel.position.x, sel.position.z - 3) < 45) { FPS.pos = { x: sel.position.x + 3.2, z: sel.position.z + 2.6 }; FPS.yaw = Math.atan2(sel.position.x - FPS.pos.x, sel.position.z - FPS.pos.z); }
    else { FPS.pos = { x: 0, z: 8.2 }; FPS.yaw = Math.PI; }
    FPS.pitch = -0.12; FPS.eyeCur = 1.68;
    FPS.rebuildStatics(); FPS.resolve(FPS.pos, 0.32);
    G.camera.near = 0.05; G.camera.fov = 70; G.camera.clearViewOffset(); G.camera.updateProjectionMatrix();
    FPS.hands.visible = true;
    document.body.classList.add('fps'); $('#fpsUi').hidden = false;
    $('#fpsBtn').setAttribute('aria-pressed', 'true'); $('#fpsBtn span').textContent = 'SAHADAN ÇIK';
    if (S.speed === 0) { S.speed = 1; UI.hud(); }
    S.me = S.me || { skill: 2, xp: 0, jobs: 0 };
    const hint = $('#fpsHint');
    hint.innerHTML = FPS.isTouch() ? 'Sol taraf: yürü · Sağ taraf: etrafa bak · Ortadaki hedefe <b>dokun</b> ya da <b>E</b> ile etkileşime gir'
      : '<b>Tıkla</b>: fareyi kilitle · <b>WASD</b> yürü · <b>Shift</b> koş · <b>C</b> çömel · <b>E</b>/sol tık etkileşim · <b>Tab</b> menü · <b>L</b> fener · <b>H</b> etiketler · <b>V</b> çık';
    hint.classList.remove('fade'); clearTimeout(FPS._ht); FPS._ht = setTimeout(() => hint.classList.add('fade'), 7000);
    UI.render();
  },
  exit() {
    if (!FPS.on) return;
    if (FPS.drive) FPS.endDrive(true);
    if (FPS.work) FPS.cancelWork('Sahadan çıktın, iş yarım kaldı.');
    FPS.clearHots(); if (FPS.lamp) { FPS.lamp.intensity = 0; FPS.lampOn = false; }
    FPS.on = false; FPS.closeMenu(true); FPS.joy = null; FPS.look = null; FPS.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    G.camera.near = 0.1; G.camera.fov = 42; G.camera.updateProjectionMatrix(); applyViewOffset();
    FPS.hands.visible = false;
    document.body.classList.remove('fps', 'fpslocked'); $('#fpsUi').hidden = true; $('#dock').hidden = false; $('#joy').hidden = true;
    $('#fpsBtn').setAttribute('aria-pressed', 'false'); $('#fpsBtn span').textContent = 'SAHAYA İN';
    const c = G.cam; c.target.set(FPS.pos.x, 0, FPS.pos.z); c.tTarget.set(FPS.pos.x, 0, FPS.pos.z); c.yaw = c.tYaw = FPS.yaw + Math.PI; c.dist = 3; c.tDist = 16; c.pitch = 0.2; c.tPitch = 0.7; c.minP = 0.15; c.maxP = 1.35;
    UI.render();
  },
  isTouch() { return !(window.matchMedia && matchMedia('(pointer:fine)').matches); },
  overlay() { return !!UI.panel || !$('#modal').hidden || !!UI.haggle; },

  // ---------- giriş ----------
  rotate(dx, dy, k) {
    const s = k * ((typeof PREFS !== 'undefined' && PREFS.camSens) || 1);
    if (FPS.drive) { FPS.drive.dyaw = THREE.MathUtils.clamp(FPS.drive.dyaw - dx * s, -2.6, 2.6); FPS.drive.look = performance.now(); return; }
    FPS.yaw -= dx * s; FPS.pitch = THREE.MathUtils.clamp(FPS.pitch - dy * s, -1.45, 1.45);
  },
  pDown(e) {
    if (!FPS.on) return;
    const cv = G.renderer.domElement;
    if (e.pointerType === 'mouse') {
      if (FPS.locked) return;          // kilitliyken document mousedown çalışır
      if (UI.panel) UI.closePanel();
      if (!FPS.dragLook && cv.requestPointerLock) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { FPS.dragLook = true; }); } catch (err) { FPS.dragLook = true; } }
      FPS.look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), mouse: true, btn: e.button };
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    if (!FPS.joy && !FPS.menu && e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.3) {
      FPS.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      const j = $('#joy'); j.hidden = false; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; $('#joyK').style.transform = 'translate(-50%,-50%)';
    } else if (!FPS.look) FPS.look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
  },
  pMove(e) {
    if (!FPS.on) return;
    const J = FPS.joy;
    if (J && J.id === e.pointerId) {
      let dx = e.clientX - J.ox, dy = e.clientY - J.oy; const d = Math.hypot(dx, dy), R = 55;
      if (d > R) { dx *= R / d; dy *= R / d; }
      J.x = dx / R; J.y = dy / R; $('#joyK').style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      return;
    }
    const L = FPS.look;
    if (L && L.id === e.pointerId) {
      const dx = e.clientX - L.x, dy = e.clientY - L.y; L.x = e.clientX; L.y = e.clientY; L.moved += Math.abs(dx) + Math.abs(dy);
      if (!FPS.locked && !FPS.menu) FPS.rotate(dx, dy, L.mouse ? 0.0042 : 0.0062);
    }
  },
  pUp(e) {
    if (!FPS.on) return;
    if (FPS.joy && FPS.joy.id === e.pointerId) { FPS.joy = null; $('#joy').hidden = true; return; }
    const L = FPS.look;
    if (L && L.id === e.pointerId) {
      FPS.look = null;
      const tap = L.moved < 10 && performance.now() - L.t < 380;
      if (tap && !FPS.locked && (!L.mouse || FPS.dragLook)) { if (FPS.menu || L.btn === 2) FPS.closeMenu(); else FPS.primary(); }
    }
  },
  key(e, down) {
    if (!S || !UI.started) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (down && k === 'v' && !e.repeat && !FPS.overlay()) { e.preventDefault(); FPS.toggle(); return; }
    if (!FPS.on) return;
    if (FPS.drive && !FPS.overlay()) {
      if (k === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (down) FPS.keys.add('space'); else FPS.keys.delete('space'); return; }
      if (down && !e.repeat && (k === 'e' || k === 'f' || k === 'escape')) { e.preventDefault(); e.stopImmediatePropagation(); FPS.endDrive(); return; }
      if (down && !e.repeat && k === 'c') { FPS.drive.far = !FPS.drive.far; return; }
      if (down && !e.repeat && k === 'h') { SFX.horn(); return; }
    }
    if (down && !e.repeat && k === 'l' && !FPS.overlay()) { FPS.flash(); return; }
    if (down && !e.repeat && k === 'h' && !FPS.overlay() && !FPS.drive) { PREFS.fpsLabels = PREFS.fpsLabels === false; savePrefs(); UI.toast(`Parça etiketleri ${PREFS.fpsLabels === false ? 'kapalı' : 'açık'} (H).`, 'info'); return; }
    if (down && e.key === 'Tab') { e.preventDefault(); FPS.menu && FPS.menu.main ? FPS.closeMenu() : FPS.mainMenu(); return; }
    if (FPS.menu && down) {
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); FPS.choose(+e.key - 1); return; }
      if (k === 'arrowdown' || k === 's') { e.preventDefault(); FPS.moveSel(1); return; }
      if (k === 'arrowup' || k === 'w') { e.preventDefault(); FPS.moveSel(-1); return; }
      if (k === 'enter' || k === 'e' || k === 'f') { e.preventDefault(); FPS.choose(FPS.menuSel); return; }
      if (k === 'escape' || k === 'q' || k === 'backspace') { e.preventDefault(); e.stopImmediatePropagation(); FPS.closeMenu(); return; }
    }
    if (down && (k === 'e' || k === 'f') && !e.repeat && !FPS.overlay()) { e.preventDefault(); FPS.primary(); return; }
    if (down && k === 'c' && !e.repeat) { FPS.crouch = !FPS.crouch; return; }
    if (down && k === 'escape' && FPS.work && !FPS.overlay()) { FPS.cancelWork('İş iptal edildi.'); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { if (down) FPS.keys.add(k); else FPS.keys.delete(k); if (k.startsWith('arrow')) e.preventDefault(); }
  },

  // ---------- çarpışma ----------
  rebuildStatics() {
    const A = [];
    const add = (x0, x1, z0, z1) => A.push([x0, x1, z0, z1]);
    add(-13.4, 13.4, -7.85, -7.42);                      // arka duvar
    add(-13.45, -13.05, -7.7, 5.75); add(13.05, 13.45, -7.7, 5.75);
    [-12.3, -6, 0, 6, 12.3].forEach(x => add(x - 0.3, x + 0.3, 5.3, 5.9));
    add(-12.4, -8.2, -7.3, -6.5); add(-0.6, 2.6, -7.4, -6.4); add(4.5, 6.7, -7.35, -6.55);
    add(9.9, 12.1, -7.1, -4.8); add(11.1, 12.9, 3.1, 5.0); add(-12.8, -11.8, 1.2, 1.8); add(12.15, 12.95, -3.9, -2.1);
    BAY_X.forEach((x, i) => { if (i < S.bays) [-1.95, 1.95].forEach(o => add(x + o - 0.2, x + o + 0.2, BAY_Z - 0.2, BAY_Z + 0.2)); });
    add(-15, -14.2, 3.7, 7.7);
    add(-26.9, -22.1, -4.6, -2.6); add(-20.9, -16.1, -4.6, -2.6);   // park etmiş süs araçlar
    if (G.booth && G.booth.visible) add(17.4, 25.6, -9.4, -4.2);
    if (G.truckHall && G.truckHall.visible) {
      add(-50.7, -32.3, -11.3, -10.7); add(-50.7, -50.3, -11, 3); add(-32.7, -32.3, -11, 3);
      [-50.5, -41.5, -32.5].forEach(x => add(x - 0.35, x + 0.35, 2.65, 3.35));
    }
    (CITY.blds || []).forEach(b => {
      if (!b.g.visible) return;
      const sw = Math.abs(Math.sin(b.rot)) > 0.5, w = sw ? b.d : b.w, d = sw ? b.w : b.d;
      add(b.x - w / 2 - 0.1, b.x + w / 2 + 0.1, b.z - d / 2 - 0.1, b.z + d / 2 + 0.1);
    });
    FPS.statics = A;
  },
  pushBox(p, b, r) {
    const cx = Math.max(b[0], Math.min(p.x, b[1])), cz = Math.max(b[2], Math.min(p.z, b[3]));
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); return; }
    const pen = [p.x - b[0] + r, b[1] - p.x + r, p.z - b[2] + r, b[3] - p.z + r], m = Math.min(...pen), i = pen.indexOf(m);
    if (i === 0) p.x -= m; else if (i === 1) p.x += m; else if (i === 2) p.z -= m; else p.z += m;
  },
  pushCar(p, m, r) {
    const u = m.userData, I = u.info; if (!I || u.y > 1.0) return;
    const th = m.rotation.y, c = Math.cos(th), s = Math.sin(th);
    const wx = p.x - m.position.x, wz = p.z - m.position.z;
    const q = { x: wx * c - wz * s, z: wx * s + wz * c };
    FPS.pushBox(q, [-I.W / 2, I.W / 2, -I.L / 2, I.L / 2], r);
    p.x = m.position.x + q.x * c + q.z * s; p.z = m.position.z - q.x * s + q.z * c;
  },
  resolve(p, r) {
    for (let it = 0; it < 2; it++) {
      FPS.statics.forEach(b => FPS.pushBox(p, b, r));
      Object.values(G.carMeshes).forEach(m => FPS.pushCar(p, m, r));
      CITY.traffic.forEach(m => FPS.pushCar(p, m, r));
    }
    p.x = Math.max(-70, Math.min(70, p.x)); p.z = Math.max(-34, Math.min(30, p.z));
  },

  // ---------- her kare ----------
  update(dt) {
    const cam = G.camera;
    if (FPS.overlay() && FPS.locked) document.exitPointerLock();
    if (performance.now() - FPS._sc > 2000) { FPS._sc = performance.now(); FPS.rebuildStatics(); }
    if (FPS.drive) return FPS.updateDrive(dt);
    // test sürüşü: takip kamerası
    if (FPS.ride) {
      const m = G.carMeshes[FPS.ride.id];
      if (m) {
        const back = new THREE.Vector3(0, 2.3, -6.2); m.localToWorld(back);
        cam.position.lerp(back, 1 - Math.pow(0.001, dt));
        _v.set(0, 1.1, 4); m.localToWorld(_v); cam.lookAt(_v);
        FPS.hands.visible = false;
      }
      FPS.updateWork(dt); FPS.drawUi();
      return;
    }
    FPS.hands.visible = true;
    // hareket
    let ix = 0, iz = 0;
    const K = FPS.keys;
    if (!FPS.menu && !FPS.overlay()) {
      if (K.has('w') || K.has('arrowup')) iz += 1; if (K.has('s') || K.has('arrowdown')) iz -= 1;
      if (K.has('d') || K.has('arrowright')) ix += 1; if (K.has('a') || K.has('arrowleft')) ix -= 1;
      if (FPS.joy) { ix += FPS.joy.x; iz -= FPS.joy.y; }
    }
    if (FPS.overlay() && FPS.joy) { FPS.joy = null; $('#joy').hidden = true; }
    let mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
    const running = (FPS.run || K.has('shift') || (FPS.joy && mag > 0.95)) && !FPS.crouch;
    const sp = (FPS.crouch ? 1.5 : running ? 5.8 : 3.1) * (FPS.work ? 0 : 1);
    const sy = Math.sin(FPS.yaw), cy = Math.cos(FPS.yaw);
    const mvx = (sy * iz - cy * ix) * sp * dt, mvz = (cy * iz + sy * ix) * sp * dt;
    const before = { x: FPS.pos.x, z: FPS.pos.z };
    FPS.pos.x += mvx; FPS.pos.z += mvz;
    FPS.resolve(FPS.pos, 0.32);
    const moved = Math.hypot(FPS.pos.x - before.x, FPS.pos.z - before.z);
    // bakış + yürüme sallantısı
    const eyeT = FPS.crouch ? 1.05 : 1.68;
    FPS.eyeCur += (eyeT - FPS.eyeCur) * Math.min(1, dt * 10);
    if (moved > 0.0005) { FPS.bobPh += moved * (running ? 2.4 : 3.2); FPS.stepD += moved; if (FPS.stepD > (running ? 1.05 : 0.78)) { FPS.stepD = 0; SFX.step && SFX.step(); } }
    const bob = Math.sin(FPS.bobPh * 2) * 0.035 * Math.min(1, moved / dt / 3);
    cam.position.set(FPS.pos.x, FPS.eyeCur + bob, FPS.pos.z);
    const cp = Math.cos(FPS.pitch);
    FPS.dir.set(sy * cp, Math.sin(FPS.pitch), cy * cp);
    _v.copy(cam.position).add(FPS.dir); cam.lookAt(_v);
    // eller
    const h = FPS.hands, t = G.clock.elapsedTime;
    h.position.set(0.24 + Math.cos(FPS.bobPh) * 0.012, -0.24 + Math.abs(Math.sin(FPS.bobPh)) * 0.012 - (FPS.menu ? 0.08 : 0), -0.42);
    if (FPS.work) { h.position.y += Math.sin(t * 9) * 0.015; FPS.tool.rotation.z = Math.sin(t * 7) * 0.5; h.position.z = -0.38 + Math.sin(t * 9) * 0.02; }
    else FPS.tool.rotation.z *= 0.9;
    // hedef
    if (performance.now() - FPS._rc > 90) { FPS._rc = performance.now(); FPS.target = FPS.menu || FPS.overlay() ? FPS.target : FPS.pick(); }
    FPS.updateWork(dt);
    FPS.updateHots();
    FPS.drawUi();
  },

  // ---------- nişan / hedef ----------
  shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; },
  pick() {
    const rc = G.raycaster, cam = G.camera;
    rc.set(cam.position, FPS.dir); rc.far = 4.2;
    let best = null;
    const consider = t => { if (t && (!best || t.dist < best.dist)) best = t; };
    // araçlar
    const hits = rc.intersectObjects(Object.values(G.carMeshes), true);
    for (const hh of hits) {
      if (!FPS.shown(hh.object)) continue;
      let o = hh.object, id = o.userData.carId; while (!id && o.parent) { o = o.parent; id = o.userData.carId; }
      if (!id) continue;
      const c = carById(id), j = !c && jobById(id);
      if (!c && !j) break;
      const comp = hh.object.userData.comp;
      if (c && comp && COMPS[comp]) consider({ kind: 'comp', id, comp, dist: hh.distance });
      else consider({ kind: c ? 'car' : 'job', id, dist: hh.distance });
      break;
    }
    // insanlar
    const people = [];
    Object.entries(Life.cust).forEach(([cid, n]) => people.push([n, 'cust', cid]));
    Object.entries(WNPC).forEach(([wid, n]) => people.push([n, 'worker', wid]));
    if (UI.haggle && UI.haggle.npc) people.push([UI.haggle.npc, 'buyer', null]);
    people.forEach(([n, kind, ref]) => {
      if (!n || n.dead || !n.root.visible) return;
      const h = rc.intersectObject(n.root, true)[0];
      if (h) consider({ kind: 'npc', who: kind, ref, dist: h.distance });
    });
    // sabit noktalar
    FPS.spots().forEach(sp => {
      if (sp.hide) return;
      const vx = sp.x - cam.position.x, vy = sp.y - cam.position.y, vz = sp.z - cam.position.z, D = FPS.dir;
      const along = vx * D.x + vy * D.y + vz * D.z; if (along < 0 || along > (sp.reach || 3.2)) return;
      const off = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - along * along));
      if (off < sp.r) consider({ kind: 'spot', spot: sp, dist: along + 0.3 });
    });
    rc.far = Infinity;
    return best;
  },
  spots() {
    const L = [
      { x: -10.3, y: 1.4, z: -6.9, r: 1.2, label: 'Parça rafı', sub: 'Depo · stok ve siparişler', fn: () => FPS.panel('depot') },
      { x: 5.6, y: 0.9, z: -6.95, r: 0.9, label: 'Takım dolabı', sub: 'Mağaza · cihaz ve yükseltmeler', fn: () => FPS.panel('shop') },
      { x: 1, y: 1.6, z: -7.1, r: 1.3, label: 'Tezgah & iş panosu', sub: 'İşler · kapı, randevu, liftler', fn: () => FPS.panel('jobs') },
      { x: 12.55, y: 1.0, z: -3, r: 0.8, label: 'Ofis bilgisayarı', sub: 'İşletme · yorumlar, gelir-gider, hedefler', fn: () => FPS.panel('biz') },
      { x: 0, y: 3.2, z: -7.4, r: 1.7, reach: 5, label: 'Şirket panosu', sub: 'Şirket · büyüme, şubeler, sözleşmeler', fn: () => FPS.panel('corp') },
      { x: 27.7, y: 2.6, z: 10.25, r: 1.6, reach: 5, label: 'Galeri tabelası', sub: 'Galeri · stok, piyasa, açık artırma', fn: () => FPS.panel('gallery') },
    ];
    BAY_X.forEach((x, i) => {
      if (i >= S.bays) return;
      const c = S.cars.find(k => k.bay === i);
      [-1.95, 1.95].forEach(o => L.push({ x: x + o, y: 1.2, z: BAY_Z, r: 0.45, label: `Lift ${i + 1} kumandası`, sub: c ? (c.lifted ? 'İndir' : 'Kaldır') + ' · ' + MODELS[c.model].name : 'Lift boş', fn: () => c && FPS.liftToggle(c) }));
    });
    return L;
  },
  describe(T) {
    if (!T) return null;
    if (T.kind === 'comp') {
      const c = carById(T.id), C = COMPS[T.comp], st = UI.compState(c, T.comp);
      return { t: C.name, s: `${MODELS[c.model].name} · ${st.label}` };
    }
    if (T.kind === 'car') { const c = carById(T.id); return { t: MODELS[c.model].name, s: c.owner === 'customer' ? `${c.cust.name} · ${c.bay != null ? bayName(c.bay) : 'park'}` : c.listed ? 'Satışta · ' + fmt(c.listed) : 'Senin araban' }; }
    if (T.kind === 'job') { const j = jobById(T.id); return { t: `${j.cust.name} · ${MODELS[j.model].name}`, s: 'Yeni iş · konuş, kabul et ya da reddet' }; }
    if (T.kind === 'npc') {
      if (T.who === 'cust') { const c = carById(T.ref) || jobById(T.ref); return c ? { t: c.cust.name, s: 'Müşteri · konuş' } : null; }
      if (T.who === 'worker') { const w = staffById(T.ref); if (!w) return null; const q = w.queue[0]; return { t: wname(w), s: away(w) ? 'bugün yok' : w.errand ? 'parça almaya gitti' : q ? taskLabel(q) : 'boşta · konuş' }; }
      if (T.who === 'buyer') return { t: UI.haggle.name, s: 'Alıcı · pazarlık' };
    }
    if (T.kind === 'spot') return { t: T.spot.label, s: T.spot.sub };
    return null;
  },

  // ---------- etkileşim ----------
  primary() {
    if (!FPS.on) return;
    if (FPS.menu) return FPS.choose(FPS.menuSel);
    if (FPS.drive) return FPS.endDrive();
    if (FPS.ride) return;
    if (FPS.work) return UI.toast('Elindeki iş bitince devam edebilirsin. (Esc: iptal)', 'info');
    const T = FPS.target;
    if (!T) return;
    SFX.tick();
    if (T.kind === 'comp') return FPS.compMenu(carById(T.id), T.comp);
    if (T.kind === 'car') return FPS.carMenu(carById(T.id));
    if (T.kind === 'job') return FPS.jobMenu(jobById(T.id));
    if (T.kind === 'spot') return T.spot.fn();
    if (T.kind === 'npc') {
      if (T.who === 'cust') { const j = jobById(T.ref), c = carById(T.ref); if (j) return FPS.jobMenu(j); if (c) return FPS.custMenu(c); }
      if (T.who === 'worker') return FPS.workerMenu(staffById(T.ref));
      if (T.who === 'buyer') return UI.showHaggle && UI.showHaggle();
    }
  },
  panel(p) { if (document.pointerLockElement) document.exitPointerLock(); FPS.closeMenu(true); UI.openPanel(p); },
  card(id) { if (document.pointerLockElement) document.exitPointerLock(); FPS.closeMenu(true); UI.openCar(id); },
  self(fn) { FPS.claim = true; let r; try { r = fn(); } finally { FPS.claim = false; } FPS.closeMenu(true); return r; },

  openMenu(title, sub, items, info, main) {
    FPS.menu = { title, sub, items, info, main }; FPS.menuSel = Math.max(0, items.findIndex(i => !i.dis));
    FPS.keys.clear(); FPS.renderMenu();
  },
  renderMenu() {
    const M = FPS.menu, el = $('#fpsMenu');
    if (!M) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<div class="fmh"><div><b>${esc(M.title)}</b>${M.sub ? `<span>${esc(M.sub)}</span>` : ''}</div><button class="x" data-x="1" aria-label="Kapat">✕</button></div>
      ${M.info ? `<div class="fmi">${M.info}</div>` : ''}
      <div class="fml">${M.items.map((it, i) => `<button class="fmo${i === FPS.menuSel ? ' sel' : ''}${it.cls ? ' ' + it.cls : ''}" data-i="${i}" ${it.dis ? 'disabled' : ''}><kbd>${i < 9 ? i + 1 : ''}</kbd><span class="fmt">${esc(it.t)}</span>${it.s ? `<small>${esc(it.s)}</small>` : ''}</button>`).join('')}</div>
      <div class="fmk">${FPS.isTouch() ? 'Seçmek için dokun' : '1–9 / tekerlek + E · Esc kapat'}</div>`;
  },
  moveSel(d) {
    const M = FPS.menu; if (!M) return;
    let i = FPS.menuSel;
    for (let k = 0; k < M.items.length; k++) { i = (i + d + M.items.length) % M.items.length; if (!M.items[i].dis) break; }
    FPS.menuSel = i; FPS.renderMenu();
  },
  choose(i) {
    const M = FPS.menu; if (!M) return; const it = M.items[i]; if (!it || it.dis) return;
    FPS.menuSel = i;
    const keep = it.keep;
    if (!keep) FPS.closeMenu(true);
    it.fn && it.fn();
    if (keep && FPS.menu) M.reopen && M.reopen();
  },
  closeMenu(silent) { FPS.menu = null; const el = $('#fpsMenu'); if (el) el.hidden = true; },

  findings(c, keys) {
    const rows = keys.filter(k => c.findings[k[0]]).map(([k, n]) => { const f = c.findings[k]; return `<div class="${f.ab ? 'warn' : 'ok'}"><b>${n}:</b> ${esc(f.res.join(' '))}${f.stale ? ' <i class="muted">(eski)</i>' : ''}</div>`; });
    return rows.join('');
  },
  compMenu(c, k) {
    if (!c) return;
    const C = COMPS[k], under = C.view === 'under', m = G.carMeshes[c.id];
    const reachable = !under || k === 'tires' || c.truck || (c.lifted && m && m.userData.y > 1.2);
    const items = [], noTool = C.tool && !S.tools[C.tool];
    const q = tasksFor(c.id), qOf = p => q.some(x => p(x.t));
    if (!reachable) items.push({ t: c.bay != null && c.bay < 4 ? 'Lifti kaldır' : 'Alt takım için araç liftte olmalı', s: c.bay != null ? 'sonra altına gir' : '', dis: !(c.bay != null && c.bay < 4), fn: () => FPS.liftToggle(c) });
    items.push({ t: 'Gözle kontrol et', s: `kendin · ${LOOK_MIN} dk`, dis: !reachable, fn: () => FPS.self(() => inspectComp(c.id, k, 'look')) });
    if (C.tool) items.push({ t: `Ölç — ${TOOLS[C.tool].name}`, s: noTool ? 'cihaz yok (Mağaza)' : `kendin · ${MEAS_MIN} dk`, dis: !reachable || noTool, fn: () => FPS.self(() => inspectComp(c.id, k, 'meas')) });
    Object.entries(FAULTS).filter(([, F]) => F.comp === k && F.lvl <= lvl() + 1).forEach(([f, F]) => {
      const done = c.fixed.includes(f) || c.wasted.includes(f), n = S.stock[f] || 0, need = c.truck ? TRUCK_STOCK : 1, qd = qOf(t => t.part === f);
      const mins = Math.round(laborTime(f) * (c.truck ? TRUCK_LABOR_MUL : 1));
      if (done) items.push({ t: `Değiştir: ${F.part}`, s: 'yenilendi', dis: true });
      else if (qd) items.push({ t: `Değiştir: ${F.part}`, s: 'ustada sırada', dis: true });
      else if (n >= need) items.push({ t: `Değiştir: ${F.part}`, s: `kendin · ${mins} dk · depo ${n}`, dis: !reachable || c.bay == null, fn: () => FPS.self(() => replacePart(c.id, f)) });
      else items.push({ t: `Temin et: ${F.part}`, s: 'depoda yok', fn: () => { if (document.pointerLockElement) document.exitPointerLock(); UI.partMissing(f); } });
    });
    const w = workerFor(c);
    items.push({ t: 'Ustaya bırak: gözle kontrol', s: w ? wname(w) : 'usta yok', dis: !w || qOf(t => t.type === 'look' && t.comp === k), fn: () => inspectComp(c.id, k, 'look') });
    const info = ((c.hints || []).includes(k) ? '<div class="note">Usta bu bölgeden şüpheleniyor.</div>' : '') + FPS.findings(c, [['look:' + k, 'Göz'], ['meas:' + k, 'Ölçüm']]);
    FPS.openMenu(C.name, `${MODELS[c.model].name} · ${under ? 'Alt takım' : 'Kaput altı'}`, items, info);
  },
  carMenu(c) {
    if (!c) return;
    const items = [], q = tasksFor(c.id), busy = p => q.some(x => p(x.t)), m = G.carMeshes[c.id];
    const service = c.owner === 'customer' || c.bay != null || c.owner === 'me';
    items.push({ t: c.hoodOpen ? 'Kaputu kapat' : 'Kaputu aç', s: c.truck ? 'kabini devir' : '', fn: () => { c.hoodOpen = !c.hoodOpen; syncScene(); SFX.clink(); } });
    if (c.bay != null && c.bay < 4) items.push({ t: c.lifted ? 'Lifti indir' : 'Lifti kaldır', s: bayName(c.bay), fn: () => FPS.liftToggle(c) });
    if (c.bay == null && service) items.push({ t: 'Lifte al', s: 'boş lift varsa', fn: () => { moveToBay(c.id); UI.render(); } });
    items.push({ t: 'Kontağı çevir', s: 'kendin · 5 dk', dis: busy(t => t.type === 'gtest' && t.test === 'start'), fn: () => FPS.self(() => globalTest(c.id, 'start')) });
    items.push({ t: 'OBD arıza tarama', s: S.tools.obd ? 'kendin · 10 dk' : 'OBD cihazı yok', dis: !S.tools.obd, fn: () => FPS.self(() => globalTest(c.id, 'obd')) });
    const needTest = !c.findings.drive || c.findings.drive.stale;
    items.push({ t: 'Direksiyona geç', s: needTest ? `kendin sür · ${FPS.TEST_M} m = test sürüşü` : 'kendin sür', dis: !!(m && m.userData.path) || !!c.out, fn: () => FPS.startDrive(c) });
    items.push({ t: 'Ustaya test sürüşü yaptır', s: workerFor(c) ? wname(workerFor(c)) : 'usta yok', dis: !workerFor(c) || busy(t => t.type === 'gtest' && t.test === 'drive'), fn: () => globalTest(c.id, 'drive') });
    items.push({ t: 'Genel kontrol yap', s: `kendin · ${OVERVIEW_MIN} dk · ${stars(S.me.skill)}`, dis: busy(t => t.type === 'overview'), fn: () => FPS.self(() => overview(c.id)) });
    if (!c.clean) items.push({ t: 'Aracı temizle', s: 'kendin · 1.500 ₺', fn: () => FPS.self(() => cleanCar(c.id)) });
    if (c.owner === 'customer') items.push({ t: 'Aracı teslim et', s: c.cust.name, cls: 'good', fn: () => { deliver(c.id); UI.render(); } });
    items.push({ t: 'Araç kartını aç', s: 'tüm seçenekler', fn: () => FPS.card(c.id) });
    const info = (c.owner === 'customer' ? `<ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>` : '') +
      FPS.findings(c, [['overview', 'Genel'], ['start', 'Kontak'], ['obd', 'OBD'], ['drive', 'Sürüş']]);
    FPS.openMenu(MODELS[c.model].name, c.owner === 'customer' ? `${c.cust.name} · teslim ${c.cust.deadline - S.day <= 0 ? 'bugün' : (c.cust.deadline - S.day) + ' gün'}` : (c.listed ? 'Satışta · ' + fmt(c.listed) : 'Senin araban'), items, info);
  },
  jobMenu(j) {
    if (!j) return;
    const items = [
      { t: 'Kabul et', s: j.truck ? 'tır kanalına' : 'boş lifte / parka', cls: 'good', fn: () => { acceptJob(j.id); UI.render(); } },
      { t: 'Reddet', s: 'müşteri gider', cls: 'bad', fn: () => { rejectJob(j.id); } },
      { t: 'Ayrıntılı iş kartı', s: 'fiyat, şikâyet, işçilik', fn: () => FPS.card(j.id) },
    ];
    const info = `<ul class="complaint">${(j.sym || []).map(s => `<li>${SYM[s]}</li>`).join('')}</ul>${j.warranty ? '<div class="note">Garanti işi — reddetmek itibar kaybettirir.</div>' : ''}`;
    FPS.openMenu(`${j.cust.name}`, `${MODELS[j.model].name}${j.appt ? ' · randevulu' : ''}${j.tow ? ' · çekiciyle geldi' : ''}`, items, info);
  },
  custMenu(c) {
    const items = [{ t: 'Aracına bak', s: MODELS[c.model].name, fn: () => FPS.carMenu(c) }];
    if (c.owner === 'customer') items.push({ t: 'Aracı teslim et', s: 'hesabı kes', cls: 'good', fn: () => { deliver(c.id); UI.render(); } });
    items.push({ t: 'Araç kartını aç', fn: () => FPS.card(c.id) });
    FPS.openMenu(c.cust.name, `Müşteri · teslim ${c.cust.deadline - S.day <= 0 ? 'bugün' : (c.cust.deadline - S.day) + ' gün'}`, items, `<ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>`);
  },
  workerMenu(w) {
    if (!w) return;
    const q = w.queue.map(t => { const c = carById(t.car); return `<li>${esc(taskLabel(t))}${c ? ' · ' + MODELS[c.model].name : ''}</li>`; }).join('');
    const items = [
      { t: 'Prim ver', s: 'moral artar', fn: () => { bonusWorker(w.id); } },
      { t: 'Personel paneli', s: 'ata, eğit, maaş', fn: () => FPS.panel('staff') },
    ];
    if (w.queue.length) items.unshift({ t: 'İş sırasını boşalt', s: `${w.queue.length} görev`, cls: 'bad', fn: () => { w.queue.slice().forEach(t => cancelTask(w.id, t.id)); UI.render(); } });
    FPS.openMenu(wname(w), `${stars(w.skill)} · enerji %${Math.round(w.energy == null ? 100 : w.energy)} · moral %${Math.round(w.morale == null ? 70 : w.morale)}`, items, q ? `<ul class="complaint">${q}</ul>` : '<div class="muted">Şu an boşta.</div>');
  },
  mainMenu() {
    const tp = (x, z, yaw) => () => { FPS.pos = { x, z }; FPS.yaw = yaw; FPS.resolve(FPS.pos, 0.32); };
    const items = [
      { t: 'İşler', s: 'kapı · randevu · liftler', fn: () => FPS.panel('jobs') },
      { t: 'Personel', fn: () => FPS.panel('staff') },
      { t: 'Depo', fn: () => FPS.panel('depot') },
      { t: 'Galeri', fn: () => FPS.panel('gallery') },
      { t: 'Şirket', fn: () => FPS.panel('corp') },
      { t: 'Mağaza', fn: () => FPS.panel('shop') },
      { t: 'İşletme', fn: () => FPS.panel('biz') },
      { t: 'Işınlan: Atölye girişi', fn: tp(0, 8.2, Math.PI) },
      { t: 'Işınlan: Müşteri parkı', fn: tp(-21.5, 7.6, Math.PI) },
      { t: 'Işınlan: Galeri', fn: tp(27.7, 9, Math.PI) },
    ];
    if (S.truckHall) items.push({ t: 'Işınlan: Tır servisi', fn: tp(-41.5, 5.5, Math.PI) });
    items.push({ t: 'Sahadan çık (yönetici görünümü)', cls: 'bad', fn: () => FPS.exit() });
    FPS.openMenu('Menü', `Sen · ustalık ${stars(S.me.skill)}`, items, null, true);
  },
  liftToggle(c) {
    if (c.bay == null || c.bay >= 4) return UI.toast('Bu aracın lifti yok.', 'bad');
    if (!c.lifted) {
      const m = G.carMeshes[c.id];
      if (m && Math.hypot(FPS.pos.x - m.position.x, FPS.pos.z - m.position.z) < Math.min(m.userData.info.W, m.userData.info.L) / 2) return UI.toast('Aracın altından çık, sonra kaldır.', 'bad');
    }
    c.lifted = !c.lifted;
    syncScene(); SFX.hum(c.lifted);
    UI.toast(`${bayName(c.bay)} ${c.lifted ? 'kalkıyor' : 'iniyor'}.`, 'info');
  },

  // ---------- kendin çalış ----------
  me() { S.me = S.me || { skill: 2, xp: 0, jobs: 0 }; return { id: 'me', name: 'Sen', role: 'usta', skill: S.me.skill, energy: 100, morale: 75, queue: [], spec: null }; },
  startWork(c, t) {
    if (FPS.work) { UI.toast('Önce elindeki işi bitir.', 'bad'); return false; }
    if (c.out) { UI.toast('Araç dış serviste.', 'bad'); return false; }
    const m = G.carMeshes[c.id]; if (!m || m.userData.path) { UI.toast('Araç yerine yerleşsin.', 'bad'); return false; }
    const comp = t.comp || (t.part && FAULTS[t.part].comp);
    if (comp && COMPS[comp].view === 'hood' && !c.hoodOpen) { c.hoodOpen = true; syncScene(); }
    if (comp && COMPS[comp].view === 'under' && comp !== 'tires' && !c.truck && !c.lifted) { UI.toast('Önce lifti kaldır.', 'bad'); return false; }
    t.id = 't' + (S.idc++); t.car = c.id; t.left = t.min;
    FPS.work = { cid: c.id, t, snd: 0 };
    if (t.type === 'gtest' && t.test === 'drive') {
      c.lifted = false; c.hoodOpen = false; syncScene(); SFX.engine(false);
      FPS.ride = { id: c.id }; FPS.closeMenu(true);
      const go = () => { if (!G.carMeshes[c.id]) return FPS.cancelWork(); if (G.carMeshes[c.id].userData.y > 0.05 || G.carMeshes[c.id].userData.path) return setTimeout(go, 300); testDriveCar(c.id, () => { if (FPS.work && FPS.work.t === t) FPS.work.driveDone = true; }); };
      go();
      UI.toast('Direksiyondasın: aracın davranışını dinle…', 'info');
    } else UI.toast(`Başladın: ${taskLabel(t)}`, 'info');
    return true;
  },
  cancelWork(msg) {
    const W = FPS.work; if (!W) return;
    if (W.t.type === 'part') S.stock[W.t.part] = (S.stock[W.t.part] || 0) + (W.t.qty || 1);
    if (FPS.ride) { const m = G.carMeshes[FPS.ride.id]; FPS.ride = null; if (m) { FPS.pos = { x: m.position.x + 2.5, z: m.position.z + 2 }; } }
    FPS.work = null; if (msg) UI.toast(msg, 'bad'); UI.render();
  },
  updateWork(dt) {
    const W = FPS.work; if (!W) return;
    const c = carById(W.cid), m = G.carMeshes[W.cid];
    if (!c || !m) return FPS.cancelWork('Araç ortada yok, iş iptal.');
    const t = W.t;
    if (FPS.ride) {
      if (!W.driveDone) { t.left = Math.max(0.01, t.left - dt * S.speed * 0.4); return; }
      FPS.ride = null; FPS.pos = { x: m.position.x + (m.userData.info.W / 2 + 0.8), z: m.position.z + 1 }; FPS.yaw = Math.atan2(m.position.x - FPS.pos.x, m.position.z - FPS.pos.z); FPS.resolve(FPS.pos, 0.32);
      return FPS.finishWork(c, t);
    }
    const reach = Math.max(m.userData.info.W, m.userData.info.L) / 2 + 2.2;
    if (Math.hypot(FPS.pos.x - m.position.x, FPS.pos.z - m.position.z) > reach) return FPS.cancelWork('Araçtan uzaklaştın, iş yarım kaldı.');
    if (UI.paused()) return;
    const rate = 1.25 + 0.15 * S.me.skill + (t.type === 'part' && S.up.impact ? 0.2 : 0);
    t.left -= dt * S.speed * rate;
    const now = performance.now();
    if (now - W.snd > (t.type === 'part' ? 1100 : 1800)) { W.snd = now; if (t.type === 'part') (S.up.impact && Math.random() < 0.5 ? SFX.impact() : SFX.ratchet()); else if (t.type === 'clean') SFX.scrub(); else SFX.clink(); }
    if (t.left <= 0) FPS.finishWork(c, t);
  },
  finishWork(c, t) {
    FPS.work = null;
    const me = FPS.me();
    completeTask(me, t, c);
    S.me.jobs++; S.me.xp += t.min;
    if (S.me.skill < 5 && S.me.xp >= 350 * S.me.skill) { S.me.xp = 0; S.me.skill++; UI.toast(`Ustalığın arttı: ${stars(S.me.skill)} — daha hızlı ve hatasız çalışırsın.`, 'ok'); SFX.ding(); }
    UI.render(); save();
  },

  // ---------- kendin sür ----------
  TEST_M: 300,
  startDrive(c) {
    const m = G.carMeshes[c.id];
    if (!m || m.userData.path || m.userData.testDrive) return UI.toast('Araç şu an hareket ediyor.', 'bad');
    if (FPS.work) return UI.toast('Önce elindeki işi bitir.', 'bad');
    if (tasksFor(c.id).some(x => x.w.queue[0] === x.t && x.t._rt && x.t._rt.arrived)) return UI.toast('Usta şu an bu araçta çalışıyor.', 'bad');
    if (c.lifted || c.hoodOpen) { c.lifted = false; c.hoodOpen = false; syncScene(); }
    if (m.userData.y > 0.05) { UI.toast('Lift iniyor… birazdan tekrar dene.', 'info'); return; }
    m.userData.manual = true; m.userData.hold = true;
    const needTest = !c.findings.drive || c.findings.drive.stale;
    FPS.drive = { id: c.id, v: 0, steer: 0, dist: 0, test: needTest, done: false, clue: false, dyaw: 0, look: 0, far: false, hit: 0, slotKey: m.userData.slotKey };
    FPS.closeMenu(true); FPS.hands.visible = false; FPS.clearHots();
    SFX.engine(c.faults.some(f => ['spark_plug', 'coil', 'engine_mount', 'battery_weak', 'fuel_pump', 'timing_belt'].includes(f)));
    if (c.faults.includes('starter')) UI.toast('Marş zorlandı ama takviyeyle çalıştı.', 'warn');
    UI.toast(needTest ? `Direksiyondasın. ${FPS.TEST_M} m sürersen test sürüşü kaydedilir.` : 'Direksiyondasın.', 'info');
  },
  updateDrive(dt) {
    const D = FPS.drive, m = G.carMeshes[D.id], c = carById(D.id), cam = G.camera;
    if (!m || !c) { FPS.drive = null; return; }
    const u = m.userData, I = u.info, K = FPS.keys, live = !FPS.menu && !FPS.overlay();
    let thr = 0, st = 0;
    if (live) {
      if (K.has('w') || K.has('arrowup')) thr += 1; if (K.has('s') || K.has('arrowdown')) thr -= 1;
      if (K.has('d') || K.has('arrowright')) st += 1; if (K.has('a') || K.has('arrowleft')) st -= 1;
      if (FPS.joy) { thr -= FPS.joy.y; st += FPS.joy.x; }
    }
    thr = THREE.MathUtils.clamp(thr, -1, 1); st = THREE.MathUtils.clamp(st, -1, 1);
    const vmax = c.truck ? 15 : 24, acc = c.truck ? 3.5 : 7;
    if (thr > 0.05) D.v += thr * acc * Math.max(0.15, 1 - Math.max(0, D.v) / vmax) * dt * (D.v < 0 ? 3 : 1);
    else if (thr < -0.05) { if (D.v > 0.4) D.v += thr * 14 * dt; else D.v = Math.max(-5, D.v + thr * 4 * dt); }
    else { const dec = (0.9 + Math.abs(D.v) * 0.12) * dt; D.v = Math.abs(D.v) <= dec ? 0 : D.v - Math.sign(D.v) * dec; }
    if (K.has('space')) { const dec = 16 * dt; D.v = Math.abs(D.v) <= dec ? 0 : D.v - Math.sign(D.v) * dec; }
    if (c.faults.some(f => FAULTS[f].comp === 'brake') && thr < 0 && Math.random() < 0.02) SFX.noise && SFX.ok('screech', 1) && SFX.noise(0.4, { vol: 0.04, freq: 4200, q: 6 });
    const steerT = -st * 0.55 / (1 + Math.abs(D.v) / 14);
    D.steer += (steerT - D.steer) * Math.min(1, dt * 6);
    const wb = I.L * 0.62;
    m.rotation.y += D.v * Math.tan(D.steer) / wb * dt;
    const h = m.rotation.y, fx = Math.sin(h), fz = Math.cos(h);
    m.position.x += fx * D.v * dt; m.position.z += fz * D.v * dt;
    // çarpışma: ön ve arka daire
    const r = I.W / 2 * 0.95, off = Math.max(0, I.L / 2 - r);
    let dx = 0, dz = 0;
    [-1, 1].forEach(sgn => {
      const p = { x: m.position.x + fx * off * sgn, z: m.position.z + fz * off * sgn }, p0 = { x: p.x, z: p.z };
      FPS.statics.forEach(b => FPS.pushBox(p, b, r));
      Object.values(G.carMeshes).forEach(o => { if (o !== m) FPS.pushCar(p, o, r); });
      CITY.traffic.forEach(o => FPS.pushCar(p, o, r));
      dx += p.x - p0.x; dz += p.z - p0.z;
    });
    if (Math.abs(dx) + Math.abs(dz) > 0.002) {
      m.position.x += dx / 2; m.position.z += dz / 2;
      const imp = Math.abs(D.v);
      if (imp > 2.5 && performance.now() - D.hit > 700) {
        D.hit = performance.now(); SFX.impact();
        if (imp > 6) { const dmg = Math.round(imp * 0.9); c.paint = Math.max(0, c.paint - dmg); if (c.owner === 'customer') { addRep(-1); UI.toast(`Müşterinin aracını vurdun! Boya −%${dmg}, itibar −1.`, 'bad'); } else UI.toast(`Çarptın: boya −%${dmg}.`, 'bad'); }
      }
      D.v *= -0.15;
    }
    m.position.x = Math.max(-70, Math.min(70, m.position.x)); m.position.z = Math.max(-34, Math.min(30, m.position.z));
    (u.wheels || []).forEach(w => w.rotation.x += D.v * dt / (I.r || 0.32));
    m.rotation.z = THREE.MathUtils.clamp(-D.steer * D.v * 0.004, -0.04, 0.04);
    if (SFX.motor) SFX.motor(D.v, thr);
    // test
    D.dist += Math.abs(D.v) * dt;
    if (D.test && !D.clue && D.dist > FPS.TEST_M * 0.45) {
      D.clue = true; const r2 = globalResult(c, 'drive');
      UI.toast(r2.ab ? 'Hissediyorsun: ' + r2.res[0] : 'Araç şimdilik düzgün gidiyor…', r2.ab ? 'warn' : 'info');
    }
    if (D.test && D.dist >= FPS.TEST_M) {
      D.test = false; D.done = true; const r2 = globalResult(c, 'drive');
      c.findings.drive = { res: r2.res, ab: r2.ab, day: S.day }; addXP(3); S.me.xp += 15;
      UI.toast(`Test sürüşü tamam: ${r2.res[0]}`, r2.ab ? 'warn' : 'ok'); SFX.ding(); save();
    }
    // kamera
    if (performance.now() - D.look > 1500) D.dyaw *= Math.max(0, 1 - dt * 2.5);
    const dist = D.far ? 9.5 : 6, hh = D.far ? 3.6 : 2.4, a = h + D.dyaw;
    _v.set(m.position.x - Math.sin(a) * dist, hh + (c.truck ? 1.2 : 0), m.position.z - Math.cos(a) * dist);
    cam.position.lerp(_v, 1 - Math.pow(0.0005, dt));
    _v.set(m.position.x + fx * 3, 1.1 + (c.truck ? 0.8 : 0), m.position.z + fz * 3); cam.lookAt(_v);
    FPS.drawUi();
  },
  endDrive(force) {
    const D = FPS.drive; if (!D) return;
    if (!force && Math.abs(D.v) > 1.5) return UI.toast(FPS.isTouch() ? 'Önce dur (joystick’i geri çek), sonra in.' : 'Önce dur (S / boşluk), sonra in.', 'info');
    const m = G.carMeshes[D.id], c = carById(D.id);
    FPS.drive = null; if (SFX.motor) SFX.motor(null);
    if (!m) return;
    const u = m.userData; u.manual = false; u.hold = false; m.rotation.z = 0;
    const I = u.info;
    _v.set(I.W / 2 + 0.75, 0, 0.3); m.localToWorld(_v);
    FPS.pos = { x: _v.x, z: _v.z }; FPS.resolve(FPS.pos, 0.32);
    FPS.yaw = Math.atan2(m.position.x - FPS.pos.x, m.position.z - FPS.pos.z); FPS.pitch = -0.1;
    if (c) {
      const sl = carSlot(c);
      if (sl && Math.hypot(m.position.x - sl.x, m.position.z - sl.z) < 3.5) { m.position.set(sl.x, 0, sl.z); m.rotation.y = Math.PI; u.slotKey = sl.key; UI.toast('Aracı yerine park ettin.', 'ok'); }
      else { u.slotKey = null; syncScene(); UI.toast('Araç yerine çekiliyor.', 'info'); }
    }
    FPS.rebuildStatics();
  },

  // ---------- el feneri ----------
  flash() {
    if (!FPS.lamp) return;
    FPS.lampOn = !FPS.lampOn; FPS.lamp.intensity = FPS.lampOn ? 1.8 : 0; SFX.tick();
    const b = document.querySelector('#fpsBtns [data-f="light"]'); if (b) b.setAttribute('aria-pressed', FPS.lampOn);
  },

  // ---------- parça etiketleri ----------
  hotEls: {},
  clearHots() { const w = $('#fpsHots'); if (w) w.innerHTML = ''; FPS.hotEls = {}; },
  updateHots() {
    const wrap = $('#fpsHots');
    if (PREFS.fpsLabels === false || FPS.menu || FPS.overlay()) { if (wrap.childElementCount) FPS.clearHots(); return; }
    const now = performance.now(); if (now - (FPS._hu || 0) < 50) return; FPS._hu = now;
    let best = null, bd = 5;
    S.cars.forEach(c => { const m = G.carMeshes[c.id]; if (!m || m.userData.path) return; const d = Math.hypot(m.position.x - FPS.pos.x, m.position.z - FPS.pos.z); if (d < bd) { bd = d; best = c; } });
    const seen = {};
    if (best) {
      const m = G.carMeshes[best.id], u = m.userData, cam = G.camera, W = window.innerWidth, H = window.innerHeight;
      const hoodOk = u.hoodT > 0.7, underOk = u.y > 1.2 || (u.info && u.info.truck);
      FPS._p = FPS._p || new THREE.Vector3();
      Object.entries(COMPS).forEach(([k, C]) => {
        if (C.view === 'hood' ? !hoodOk : !(underOk || k === 'tires')) return;
        if (k === 'tires' && !underOk && best.bay == null) return;
        const p = compWorld(best.id, k, FPS._p); if (!p) return;
        const dd = Math.hypot(p.x - cam.position.x, p.y - cam.position.y, p.z - cam.position.z); if (dd > 3.6) return;
        p.project(cam); if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return;
        const key = best.id + k; seen[key] = 1;
        let el = FPS.hotEls[key];
        if (!el) { el = document.createElement('div'); el.className = 'fh'; el.innerHTML = `<i></i><span>${esc(C.name)}</span>`; wrap.appendChild(el); FPS.hotEls[key] = el; }
        const st = UI.compState(best, k), cls = 'fh ' + st.cls + (FPS.target && FPS.target.comp === k ? ' on' : '');
        if (el.className !== cls) el.className = cls;
        el.style.transform = `translate(${(p.x * 0.5 + 0.5) * W}px,${(-p.y * 0.5 + 0.5) * H}px)`;
        el.style.opacity = String(Math.max(0.35, 1 - (dd - 1.2) / 3));
      });
    }
    Object.keys(FPS.hotEls).forEach(k => { if (!seen[k]) { FPS.hotEls[k].remove(); delete FPS.hotEls[k]; } });
  },

  btnLabels(a, b) { const r = document.querySelector('#fpsBtns [data-f="run"]'), c = document.querySelector('#fpsBtns [data-f="crouch"]'); if (r.textContent !== a) { r.textContent = a; c.textContent = b; } },

  // ---------- arayüz ----------
  drawUi() {
    const T = FPS.ride || FPS.drive ? null : FPS.target, d = FPS.describe(T);
    const cross = $('#fpsCross'), pr = $('#fpsPrompt');
    cross.className = d ? 'hit' : '';
    const key = FPS.isTouch() ? 'Dokun' : 'E';
    const html = d && !FPS.menu ? `<span><kbd>${key}</kbd> ${esc(d.t)}</span><small>${esc(d.s || '')}</small>` : '';
    if (pr._h !== html) { pr.innerHTML = html; pr._h = html; pr.hidden = !html; }
    const W = FPS.work, wk = $('#fpsWork');
    if (W) {
      const t = W.t, p = FPS.ride ? (W.driveDone ? 1 : 0.5) : Math.min(1, 1 - t.left / t.min);
      wk.hidden = false;
      $('#fpsWorkT').textContent = FPS.ride ? 'Test sürüşü' : `${taskLabel(t)} · ${Math.max(0, Math.ceil(t.left / (1.25 + 0.15 * S.me.skill)))} dk`;
      $('#fpsRing').style.strokeDashoffset = String(113 * (1 - p));
    } else wk.hidden = true;
    const D = FPS.drive, dv = $('#fpsDrive');
    if (D) {
      dv.hidden = false;
      const kmh = Math.round(Math.abs(D.v) * 3.6), gear = D.v < -0.3 ? 'R' : Math.abs(D.v) < 0.3 ? 'N' : 'D';
      const tx = D.test ? `<div class="dtest"><span>Test sürüşü</span><b class="mono">${Math.min(FPS.TEST_M, Math.round(D.dist))}/${FPS.TEST_M} m</b><i style="width:${Math.min(100, D.dist / FPS.TEST_M * 100)}%"></i></div>` : (D.done ? '<div class="dtest ok">Test sürüşü kaydedildi</div>' : '');
      const h = `<div class="dspd"><b class="mono">${kmh}</b><span>km/s</span><em>${gear}</em></div>${tx}<div class="dkeys">${FPS.isTouch() ? 'Joystick: gaz/fren + direksiyon · <b>İN</b>: araçtan in' : '<b>W/S</b> gaz/fren · <b>A/D</b> direksiyon · <b>Boşluk</b> el freni · <b>C</b> kamera · <b>H</b> korna · <b>E</b> in'}</div>`;
      if (dv._h !== h) { dv.innerHTML = h; dv._h = h; }
      $('#fpsUse').textContent = 'İN'; FPS.btnLabels('KORNA', 'KAMERA');
    } else { dv.hidden = true; if ($('#fpsUse').textContent !== 'E') { $('#fpsUse').textContent = 'E'; FPS.btnLabels('KOŞ', 'ÇÖMEL'); } }
    $('#fpsCross').style.display = FPS.drive ? 'none' : '';
    const lk = $('#fpsLock'); lk.hidden = FPS.locked || FPS.dragLook || FPS.isTouch() || FPS.overlay() || !!FPS.menu;
    $('#fpsUse').classList.toggle('on', !!d);
  },
};
document.addEventListener('keydown', e => FPS.key(e, true), true);
document.addEventListener('keyup', e => FPS.key(e, false), true);
window.addEventListener('blur', () => FPS.keys.clear());
