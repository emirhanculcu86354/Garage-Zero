// ================= GARAGE ZERO — 3D SAHNE =================
const BAY_X = [-9, -3, 3, 9];
const BAY_Z = -1.2;
const TRUCK_BAYS = [[-45.5, -3.6], [-37.5, -3.6]];
const TRUCK_WAIT = { x: -41.5, z: 7.2 };
function bayPos(i) { return i >= 4 ? { x: TRUCK_BAYS[i - 4][0], z: TRUCK_BAYS[i - 4][1] } : { x: BAY_X[i], z: BAY_Z }; }
const LOT_X = [17.5, 20.5, 23.5, 26.5, 29.5, 32.5, 35.5, 38.5];
const LOT_Z = 4.5;

const G = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null,
  cam: { yaw: 0.35, pitch: 0.8, dist: 34, target: new THREE.Vector3(6, 0, 4), tYaw: 0.35, tPitch: 0.8, tDist: 34, tTarget: new THREE.Vector3(6, 0, 4), minP: 0.2, maxP: 1.35 },
  carMeshes: {}, trucks: [], bays: [], lotMarks: [], ring: null, raycaster: new THREE.Raycaster(), clock: new THREE.Clock(), puffs: [],
};

function mat(color, opts = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, opts)); }

function labelTexture(lines, { w = 512, h = 128, bg = '#1d2127', fg = '#e8e6e1', accent = '#ff8a1f', font = 'Big Shoulders Display' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = accent; x.fillRect(0, h - 10, w, 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((t, i) => {
    const size = i === 0 ? h * 0.52 : h * 0.22;
    x.font = `800 ${size}px "${font}", Impact, sans-serif`;
    x.fillText(t, w / 2, arr.length === 1 ? h * 0.47 : (i === 0 ? h * 0.38 : h * 0.76));
  });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; tex.encoding = THREE.sRGBEncoding; return tex;
}

function initScene() {
  const canvas = document.getElementById('c');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(gfxPixelRatio());
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  G.renderer = r;
  const s = new THREE.Scene(); G.scene = s;
  s.background = new THREE.Color(0xa9c9ea);
  s.fog = new THREE.Fog(0xa9c9ea, 60, 140);
  G.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

  G.hemi = new THREE.HemisphereLight(0xdfe8f5, 0x4a4236, 0.7); s.add(G.hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.0);
  sun.position.set(20, 30, 22); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -38, right: 48, top: 30, bottom: -30, near: 1, far: 120 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(6, 0, 2); s.add(sun.target);
  s.add(sun); G.sun = sun;

  buildCity();
  buildShop();
  BAY_X.forEach((x, i) => G.bays.push(makeBay(x, i)));
  LOT_X.forEach((x, i) => G.lotMarks.push(makeLotSlot(x, i)));

  G.ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 48), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  G.ring.rotation.x = -Math.PI / 2; G.ring.position.y = 0.04; G.ring.visible = false; s.add(G.ring);

  initStaff();
  buildExtras();
  buildCompanyStructures();
  applyGfx();
  spawnPedestrians(window.innerWidth < 800 ? 5 : 9);
  bindCameraInput(canvas);
  window.addEventListener('resize', resize); resize();
  loop();
}

function buildShop() {
  const s = G.scene;
  const wallM = mat(0x8e9499); G.wallM = wallM; const innerM = mat(0xc9ccc8), trimM = mat(0x3b4148), roofM = mat(0x5b6168, { metalness: 0.3 });
  const back = box(26.8, 5.2, 0.3, innerM); back.position.set(0, 2.6, -7.6); back.receiveShadow = true; s.add(back);
  [-13.25, 13.25].forEach(x => { const w = box(0.3, 5.2, 13.4, wallM); w.position.set(x, 2.6, -1); w.receiveShadow = true; s.add(w); });
  // ön cephe kolonları + üst bant (tabela bandı)
  [-12.3, -6, 0, 6, 12.3].forEach(x => { const c = box(0.5, 5.2, 0.5, trimM); c.position.set(x, 2.6, 5.6); s.add(c); });
  const band = box(27, 1.1, 0.6, mat(0x23272c)); band.position.set(0, 4.75, 5.6); s.add(band);
  const hazard = box(27, 0.18, 0.62, new THREE.MeshStandardMaterial({ map: hazardTexture() })); hazard.position.set(0, 4.12, 5.6); s.add(hazard);
  G.signMat = new THREE.MeshBasicMaterial({ map: labelTexture('GARAGE ZERO') });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), G.signMat); sign.position.set(0, 4.75, 5.92); s.add(sign);
  G.backSignMat = new THREE.MeshBasicMaterial({ map: labelTexture('GARAGE ZERO') });
  const bsign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), G.backSignMat); bsign.position.set(0, 3.4, -7.43); s.add(bsign);
  // kepenkler (yukarı sarılmış)
  [-9.15, -3, 3, 9.15].forEach(x => { const sh = box(5.6, 0.7, 0.3, mat(0xa3a9af, { metalness: 0.5, roughness: 0.4 })); sh.position.set(x, 3.85, 5.4); s.add(sh); });
  // çatı: yarım kirişler (iç görünsün diye açık)
  for (let i = 0; i < 6; i++) { const b = box(26.6, 0.18, 0.18, roofM); b.position.set(0, 5.1, -7 + i * 2.4); s.add(b); }
  // floresanlar
  BAY_X.forEach(x => {
    const tube = box(0.25, 0.06, 2.6, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 1.2 })); tube.position.set(x, 4.9, -1.2); s.add(tube);
    const p = new THREE.PointLight(0xeaf2ff, 0.45, 11, 2); p.position.set(x, 4.6, -1.2); s.add(p);
  });
  // raflar
  const shelfM = mat(0x5a6470, { metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const sh = box(4, 0.06, 0.7, shelfM); sh.position.set(-10.3, 0.6 + i * 1.0, -6.9); s.add(sh);
    for (let j = 0; j < 5; j++) { const bx = box(0.5, 0.42, 0.5, mat([0xb8322a, 0x2c5a99, 0xd6a01d, 0x3a7650, 0xe6e2d8][(i + j) % 5])); bx.position.set(-11.9 + j * 0.8, 0.86 + i * 1.0, -6.9); s.add(bx); }
  }
  [-12.25, -8.35].forEach(x => { const up = box(0.06, 3, 0.06, shelfM); up.position.set(x, 1.5, -6.9); s.add(up); });
  const tireM = mat(0x161616, { roughness: 0.95 });
  [[11.6, -6.6], [11.6, -5.3], [10.3, -6.6]].forEach(([x, z]) => {
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.17, 8, 18), tireM); t.rotation.x = Math.PI / 2; t.position.set(x, 0.17 + k * 0.33, z); t.castShadow = true; s.add(t); }
  });
  [[12.4, 3.6, 0x2c5a99], [12.4, 4.5, 0xb8322a], [11.6, 4.1, 0x3a7650]].forEach(([x, z, c]) => { const d = cyl(0.38, 0.38, 1.05, 14, mat(c, { metalness: 0.3 })); d.position.set(x, 0.53, z); s.add(d); });
  // takım dolabı + tezgah + kompresör + kriko
  const cab = box(2.2, 1.15, 0.7, mat(0xb8322a, { metalness: 0.3, roughness: 0.45 })); cab.position.set(5.6, 0.58, -6.95); s.add(cab);
  for (let i = 0; i < 4; i++) { const dr = box(2.0, 0.015, 0.02, mat(0xdddddd)); dr.position.set(5.6, 0.3 + i * 0.24, -6.59); s.add(dr); }
  const pegboard = box(3.4, 1.6, 0.05, mat(0x8a6a4a)); pegboard.position.set(1, 2.1, -7.4); s.add(pegboard);
  for (let i = 0; i < 9; i++) { const tl = box(0.06, rnd(0.25, 0.5), 0.04, mat(0x9aa0a6, { metalness: 0.8 })); tl.position.set(-0.4 + i * 0.35, 2.1, -7.34); s.add(tl); }
  const bench = box(3.2, 0.1, 1, mat(0x7a6048)); bench.position.set(1, 0.95, -6.9); s.add(bench);
  const legs = box(3.0, 0.9, 0.9, mat(0x3d434a)); legs.position.set(1, 0.45, -6.9); s.add(legs);
  const vise = box(0.3, 0.2, 0.2, mat(0x2c5a99)); vise.position.set(2.2, 1.1, -6.7); s.add(vise);
  const comp = cyl(0.3, 0.3, 0.9, 12, mat(0xb8322a)); comp.rotation.z = Math.PI / 2; comp.position.set(-12.3, 0.45, 1.5); s.add(comp);
  const jack = box(0.4, 0.15, 1.2, mat(0xd6a01d)); jack.position.set(12.1, 0.08, 0.5); s.add(jack);
  // yağ lekeleri
  BAY_X.forEach(x => { const sp = new THREE.Mesh(new THREE.CircleGeometry(rnd(0.3, 0.6), 16), new THREE.MeshBasicMaterial({ color: 0x2a2c2e, transparent: true, opacity: 0.45, depthWrite: false })); sp.rotation.x = -Math.PI / 2; sp.position.set(x + rnd(-0.5, 0.5), 0.025, BAY_Z + rnd(-1, 1)); s.add(sp); });
  // galeri: bayraklar + tabela
  const poleM = mat(0x9aa1ab, { metalness: 0.5 });
  [15.6, 39.8].forEach(x => { const p = cyl(0.06, 0.06, 4.4, 6, poleM); p.position.set(x, 2.2, 10.2); s.add(p); });
  const rope = cyl(0.012, 0.012, 24.2, 4, poleM); rope.rotation.z = Math.PI / 2; rope.position.set(27.7, 4.2, 10.2); s.add(rope);
  const flagCols = [0xff8a1f, 0xe6e2d8, 0x2c5a99];
  for (let i = 0; i < 24; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), mat(flagCols[i % 3])); f.rotation.x = Math.PI; f.position.set(16.1 + i, 3.9, 10.2); s.add(f); }
  G.lotSignMat = new THREE.MeshBasicMaterial({ map: labelTexture(['GALERİ', 'ruhsat gerekli']) });
  const ls = new THREE.Mesh(new THREE.BoxGeometry(5, 1.25, 0.12), G.lotSignMat); ls.position.set(27.7, 2.9, 10.25); s.add(ls);
  [25.6, 29.8].forEach(x => { const p = cyl(0.07, 0.07, 2.3, 6, poleM); p.position.set(x, 1.15, 10.25); s.add(p); });
  // boya kabini (Mağaza'dan alınınca görünür)
  const booth = new THREE.Group(); booth.position.set(21.5, 0, -6.8); s.add(booth); G.booth = booth; booth.visible = false;
  const bw = box(8, 3.6, 5, mat(0xe6e2d8)); bw.position.y = 1.8; booth.add(bw);
  const broof = box(8.4, 0.25, 5.4, mat(0x3b4148, { metalness: 0.4 })); broof.position.y = 3.72; booth.add(broof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.9), new THREE.MeshStandardMaterial({ color: 0x9fc4d8, metalness: 0.4, roughness: 0.15, emissive: 0xeaf2ff, emissiveIntensity: 0.35 })); door.position.set(0, 1.5, 2.52); booth.add(door);
  const bsignM = new THREE.MeshBasicMaterial({ map: labelTexture(['BOYA KABİNİ', 'fırınlı']) }); const bs = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), bsignM); bs.position.set(0, 3.15, 2.53); booth.add(bs);
  const duct = cyl(0.35, 0.35, 1.6, 10, mat(0x9aa0a6, { metalness: 0.7 })); duct.position.set(-2.8, 4.5, -1); booth.add(duct);
  // galeri ofisi (küçük cam kabin)
  const office = new THREE.Group(); office.position.set(37.5, 0, -1.5); s.add(office);
  const ob = box(4, 2.8, 3, mat(0xe6e2d8)); ob.position.y = 1.4; office.add(ob);
  const og = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x8fb4c8, metalness: 0.6, roughness: 0.1 })); og.position.set(0, 1.5, 1.51); office.add(og);
  const orf = box(4.4, 0.2, 3.4, mat(0x2c5a99)); orf.position.y = 2.9; office.add(orf);
}
function hazardTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16; const x = c.getContext('2d');
  for (let i = -2; i < 20; i++) { x.fillStyle = i % 2 ? '#1b1d20' : '#ff8a1f'; x.beginPath(); x.moveTo(i * 16, 16); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16 + 32, 0); x.lineTo(i * 16 + 16, 16); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(8, 1); t.encoding = THREE.sRGBEncoding; return t;
}

function makeBay(x, i) {
  const s = G.scene, grp = new THREE.Group(); grp.position.set(x, 0, BAY_Z); s.add(grp);
  const lineM = new THREE.MeshBasicMaterial({ color: 0xf2c14e });
  const lines = [];
  [[-2.6, 0, 0.12, 6.6], [2.6, 0, 0.12, 6.6], [0, -3.3, 5.3, 0.12], [0, 3.3, 5.3, 0.12]].forEach(([lx, lz, w, d]) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineM); l.rotation.x = -Math.PI / 2; l.position.set(lx, 0.03, lz); grp.add(l); lines.push(l);
  });
  const postM = mat(0xff8a1f, { metalness: 0.3, roughness: 0.45 });
  const posts = [];
  [-1.95, 1.95].forEach(px => {
    const p = box(0.32, 3.5, 0.32, postM); p.position.set(px, 1.75, 0); grp.add(p); posts.push(p);
    const base = box(0.6, 0.06, 0.6, mat(0x3b4148)); base.position.set(px, 0.03, 0); grp.add(base); posts.push(base);
  });
  const top = box(4.2, 0.2, 0.28, postM); top.position.set(0, 3.55, 0); grp.add(top); posts.push(top);
  const arms = new THREE.Group(); grp.add(arms);
  const armM = mat(0x3d434a, { metalness: 0.5 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const a = box(1.1, 0.09, 0.16, armM); a.position.set(sx * 1.35, 0.12, sz * 0.75); a.rotation.y = sz * sx * -0.55; arms.add(a);
    const pad = cyl(0.14, 0.14, 0.08, 10, mat(0x161616)); pad.position.set(sx * 0.82, 0.18, sz * 1.25); arms.add(pad);
  });
  const lockMat = new THREE.MeshBasicMaterial({ map: labelTexture(['LİFT ' + (i + 1), 'kilitli — Mağaza'], { bg: '#4b5055', fg: '#c9ccc8', accent: '#6b7076' }), transparent: true });
  const lock = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), lockMat); lock.rotation.x = -Math.PI / 2; lock.position.set(0, 0.04, 0); grp.add(lock);
  return { grp, arms, posts, lines, lock, postM, liftY: 0, tLiftY: 0 };
}
function makeLotSlot(x, i) {
  const grp = new THREE.Group(); grp.position.set(x, 0, LOT_Z); G.scene.add(grp);
  const m = new THREE.MeshBasicMaterial({ color: 0xe9e4d4 });
  [-1.45, 1.45].forEach(lx => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 5.4), m); l.rotation.x = -Math.PI / 2; l.position.set(lx, 0.03, 0); grp.add(l); });
  const num = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.45), new THREE.MeshBasicMaterial({ map: labelTexture('P' + (i + 1), { w: 256, h: 96, bg: '#34383c', accent: '#34383c', fg: '#e9e4d4' }) }));
  num.rotation.x = -Math.PI / 2; num.position.set(0, 0.035, -2.4); grp.add(num);
  return grp;
}

// ---------- araç yerleşimi & sürüş ----------
function carSlot(car) {
  if (car.out) return null;
  if (car.bay != null) { const p = bayPos(car.bay); return { key: 'b' + car.bay, x: p.x, z: p.z }; }
  if (car.lot != null) return { key: 'l' + car.lot, x: LOT_X[car.lot], z: LOT_Z };
  if (car.apron === 10) return { key: 'a10', x: TRUCK_WAIT.x, z: TRUCK_WAIT.z };
  if (car.apron != null) return { key: 'a' + car.apron, x: WAIT_X[car.apron], z: APRON_Z };
  return null;
}
function routeTo(from, slot) {
  const pts = [];
  const inShop = z => z < 6.5;
  if (from.z > 12) pts.push([slot.x, LANE_E]);                       // yoldan geliyor
  else if (Math.abs(from.x - slot.x) > 0.3 || (inShop(from.z) && !inShop(slot.z) && slot.key[0] !== 'a')) { pts.push([from.x, CURB_Z]); pts.push([slot.x, CURB_Z]); }
  pts.push([slot.x, slot.z]);
  return pts.map(p => new THREE.Vector3(p[0], 0, p[1]));
}
function driveCar(m, pts, speed = 7, cb) { m.userData.path = pts.map(p => p.isVector3 ? p : new THREE.Vector3(p[0], 0, p[1])); m.userData.speed = speed; m.userData.cb = cb || null; }

function syncScene() {
  if (!G.scene || !S) return;
  const live = new Set();
  const all = S.cars.concat(S.jobs.filter(j => j.apron != null));
  all.forEach(car => {
    const slot = carSlot(car); if (!slot) return;
    live.add(car.id);
    let m = G.carMeshes[car.id];
    const sig = car.color + '|' + car.paint + '|' + car.clean + '|' + ((S.settings || {}).carStyle) + '|' + (car.faults || []).filter(f => FAULTS[f] && FAULTS[f].comp === 'body').join(',') + '|' + (car.mods || []).join(',');
    if (m && m.userData.sig !== sig && !m.userData.path) { const p = m.position.clone(), r = m.rotation.y; G.scene.remove(m); m = buildCar(car); m.position.copy(p); m.rotation.y = r; m.userData.slotKey = slot.key; m.userData.sig = sig; G.scene.add(m); G.carMeshes[car.id] = m; }
    if (!m) {
      m = buildCar(car); m.userData.sig = sig; G.scene.add(m); G.carMeshes[car.id] = m;
      if (car._noAnim) { m.position.set(slot.x, 0, slot.z); m.rotation.y = Math.PI; m.userData.slotKey = slot.key; delete car._noAnim; }
      else if (car.tow && car.apron != null) { towIn(car, m, slot); return; }
      else { m.position.set(-75, 0, LANE_E); m.rotation.y = Math.PI / 2; }
    }
    if (m.userData.towing || m.userData.manual) return;
    if (m.userData.slotKey !== slot.key && !m.userData.testDrive) {
      if (m.userData.y > 0.05) { m.userData.tY = 0; }
      driveCar(m, routeTo(m.position, slot), 7, () => { if (car.apron != null && car.owner === 'customer' && !car._custSpawned) Life.customerArrived(car); });
      m.userData.slotKey = slot.key;
    }
    m.userData.tY = car.bay != null && car.bay < 4 && car.lifted ? 1.55 : 0;
    m.userData.tHood = car.hoodOpen ? 1 : 0;
  });
  Object.keys(G.carMeshes).forEach(id => {
    const m = G.carMeshes[id];
    if (!live.has(id) && !m.userData.leaving && !m.userData.hold) departCar(id);
  });
  G.bays.forEach((b, i) => {
    const owned = i < S.bays;
    b.lock.visible = !owned; b.posts.forEach(p => p.visible = owned); b.arms.visible = owned; b.lines.forEach(l => l.visible = owned);
    const car = S.cars.find(c => c.bay === i);
    b.tLiftY = car && car.lifted ? 1.55 : 0;
  });
  G.lotMarks.forEach((m, i) => { m.visible = i < S.lot; });
  if (G.booth) G.booth.visible = !!S.up.paint;
  syncCompany();
  if (G.lounge) G.lounge.visible = !!S.up.lounge;
  if (G.tireMach) G.tireMach.visible = !!S.up.tireMachine;
  if (G.bodyBench) G.bodyBench.visible = !!S.up.bodyShop;
  const lotTxt = S.lic.galeri ? ['GALERİ', S.name.toUpperCase().slice(0, 22)] : ['GALERİ', 'ruhsat gerekli'];
  if (G.lotSignMat.userData.txt !== lotTxt.join()) { G.lotSignMat.map = labelTexture(lotTxt); G.lotSignMat.needsUpdate = true; G.lotSignMat.userData.txt = lotTxt.join(); }
  const C = S.custom || DEFAULT_CUSTOM, signTxt = S.name.toUpperCase().slice(0, 18), signKey = signTxt + C.accent + C.signSub;
  if (G.signMat.userData.txt !== signKey) {
    G.signMat.map = labelTexture(signTxt, { w: 1024, h: 112, accent: C.accent }); G.signMat.needsUpdate = true; G.signMat.userData.txt = signKey;
    G.backSignMat.map = labelTexture([signTxt, C.signSub || ''], { accent: C.accent }); G.backSignMat.needsUpdate = true;
  }
  syncWorkers();
}
function departCar(id, cb) {
  const m = G.carMeshes[id]; if (!m) return;
  m.userData.leaving = true; m.userData.hold = false; m.userData.tY = 0; m.userData.tHood = 0;
  const p = m.position;
  driveCar(m, [[p.x, CURB_Z], [p.x + 2, LANE_E], [85, LANE_E]], 8, () => { G.scene.remove(m); delete G.carMeshes[id]; cb && cb(); });
}
function testDriveCar(id, cb) {
  const m = G.carMeshes[id]; if (!m) return cb && cb();
  m.userData.testDrive = true; m.userData.tY = 0; m.userData.tHood = 0;
  const p = m.position.clone(), back = new THREE.Vector3(p.x, 0, p.z);
  const x0 = p.x;
  driveCar(m, [[x0, CURB_Z], [x0 + 3, LANE_E], [48, LANE_E], [52, 15], [48, LANE_W], [-40, LANE_W], [-44, 15], [-40, LANE_E], [x0 - 2, LANE_E], [x0, CURB_Z], back], 15, () => { m.userData.testDrive = false; cb && cb(); });
}
function carMeshPos(id) { const m = G.carMeshes[id]; return m ? m.position : null; }
function carParked(id) { const m = G.carMeshes[id]; return m && !m.userData.path; }
function compWorld(id, comp, out) {
  const m = G.carMeshes[id]; if (!m || !m.userData.comps[comp]) return null;
  return m.userData.comps[comp].getWorldPosition(out || new THREE.Vector3());
}
function highlightComp(id, comp, on, color = 0xff8a1f) {
  const m = G.carMeshes[id]; if (!m) return;
  Object.entries(m.userData.comps).forEach(([k, obj]) => obj.traverse(o => { if (o.isMesh && o.material.emissive && !o.material.userData.shared) { const act = on && k === comp; o.material.emissive.setHex(act ? color : 0); o.material.emissiveIntensity = act ? 0.6 : 0; } }));
}
function flashComp(id, comp, color = 0x4cc38a) {
  highlightComp(id, comp, true, color);
  setTimeout(() => highlightComp(id, UI.inspect && UI.inspect.comp, !!(UI.inspect && UI.inspect.comp)), 1200);
}
function puff(id, color = 0x9aa0a6, n = 6) {
  const m = G.carMeshes[id]; if (!m) return;
  const I = m.userData.info;
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
    sp.position.copy(m.localToWorld(new THREE.Vector3(-I.W * 0.2, I.yb, -I.L / 2 - 0.2)));
    sp.userData = { v: new THREE.Vector3(rnd(-0.3, 0.3), rnd(0.4, 0.9), rnd(-0.6, -0.2)).applyAxisAngle(new THREE.Vector3(0, 1, 0), m.rotation.y), life: 0, delay: i * 0.18 };
    sp.visible = false; G.scene.add(sp); G.puffs.push(sp);
  }
}

// ---------- kamera ----------
function focusCar(id, view) {
  const m = G.carMeshes[id]; const car = carById(id) || S.jobs.find(j => j.id === id);
  let p = m ? m.position.clone() : null;
  if (!p && car) { const sl = carSlot(car); if (sl) p = new THREE.Vector3(sl.x, 0, sl.z); }
  if (!p) return;
  const h = m ? m.rotation.y : Math.PI;
  const c = G.cam;
  if (view === 'hood' && m && m.userData.info.truck) {
    const I = m.userData.info;
    c.tTarget.copy(m.localToWorld(new THREE.Vector3(0, I.yT + 0.2, I.f0 + I.hoodLen * 0.5)));
    c.tYaw = h + 0.95; c.tPitch = 0.9; c.tDist = 5.6; c.minP = 0.1; c.maxP = 1.4;
  } else if (view === 'hood' && m) {
    const I = m.userData.info;
    c.tTarget.copy(m.localToWorld(new THREE.Vector3(0, I.yT + 0.15, I.f0 + I.hoodLen * 0.5)));
    c.tYaw = h + 0.25; c.tPitch = 0.8; c.tDist = window.innerWidth <= 760 ? 3.1 : 3.6; c.minP = 0.1; c.maxP = 1.4;
  } else if (view === 'under' && m && m.userData.info.truck) {
    c.tTarget.copy(m.position).add(new THREE.Vector3(0, 0.55, 0));
    c.tYaw = h + Math.PI / 2 + 0.3; c.tPitch = -0.12; c.tDist = 4.6; c.minP = -0.4; c.maxP = 0.8;
  } else if (view === 'under' && m) {
    c.tTarget.copy(m.position).add(new THREE.Vector3(0, 1.45, 0));
    c.tYaw = h + Math.PI / 2 + 0.35; c.tPitch = -0.42; c.tDist = 3.6; c.minP = -0.75; c.maxP = 0.6;
  } else {
    c.tTarget.copy(p).add(new THREE.Vector3(0, 0.8, 0));
    c.tDist = 10.5; c.tPitch = 0.62; c.minP = 0.15; c.maxP = 1.35;
    if (view === 'side') c.tYaw = h + 0.9;
  }
}
function focusHome() { const c = G.cam; c.tTarget.set(6, 0, 4); c.tDist = window.innerWidth < 700 ? 46 : 34; c.tPitch = 0.8; c.tYaw = 0.35; c.minP = 0.2; c.maxP = 1.35; }

function bindCameraInput(el) {
  const ptrs = new Map(); let moved = 0, lastPinch = 0, lastMid = null, downAt = 0, btn = 0;
  el.addEventListener('pointerdown', e => { if (FPS.on) return; el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downAt = performance.now(); btn = e.button; lastPinch = 0; lastMid = null; });
  el.addEventListener('pointermove', e => {
    if (FPS.on) return;
    if (!ptrs.has(e.pointerId)) { UI.hoverAt && UI.hoverAt(e.clientX, e.clientY); return; }
    const prev = ptrs.get(e.pointerId); const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy);
    const c = G.cam;
    if (ptrs.size === 1) {
      if (btn === 2 || e.shiftKey) pan(dx, dy);
      else { const k = (typeof PREFS !== 'undefined' && PREFS.camSens) || 1; c.tYaw -= dx * 0.006 * k; c.tPitch = THREE.MathUtils.clamp(c.tPitch + dy * 0.004 * k, c.minP, c.maxP); }
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y); const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (lastPinch) c.tDist = THREE.MathUtils.clamp(c.tDist * (lastPinch / dist), 2.2, 70);
      if (lastMid) pan(mid.x - lastMid.x, mid.y - lastMid.y);
      lastPinch = dist; lastMid = mid;
    }
  });
  const up = e => {
    if (FPS.on) { ptrs.delete(e.pointerId); return; }
    if (ptrs.has(e.pointerId) && ptrs.size === 1 && moved < 8 && performance.now() - downAt < 450) pickAt(e.clientX, e.clientY);
    ptrs.delete(e.pointerId); lastPinch = 0; lastMid = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => ptrs.delete(e.pointerId));
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('wheel', e => { e.preventDefault(); if (FPS.on) return; G.cam.tDist = THREE.MathUtils.clamp(G.cam.tDist * (1 + Math.sign(e.deltaY) * 0.1), 2.2, 70); }, { passive: false });
  function pan(dx, dy) {
    const c = G.cam, k = c.dist * 0.0018;
    const fwd = new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw)), right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    c.tTarget.addScaledVector(right, -dx * k).addScaledVector(fwd, -dy * k);
    c.tTarget.x = THREE.MathUtils.clamp(c.tTarget.x, -40, 45); c.tTarget.z = THREE.MathUtils.clamp(c.tTarget.z, -15, 30);
  }
}
function pickAt(x, y) {
  const r = G.renderer.domElement.getBoundingClientRect();
  const v = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  G.raycaster.setFromCamera(v, G.camera);
  const meshes = Object.values(G.carMeshes);
  const hits = G.raycaster.intersectObjects(meshes, true).filter(h => h.object.visible);
  if (UI.inspect) {
    const h = hits.find(h => h.object.userData.carId === UI.inspect.id && h.object.userData.comp && COMPS[h.object.userData.comp].view === UI.inspect.view);
    if (h) return UI.openComp(h.object.userData.comp);
    return;
  }
  if (hits.length) { const id = hits[0].object.userData.carId; if (id && (carById(id) || S.jobs.some(j => j.id === id))) UI.openCar(id); }
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  G.renderer.setSize(w, h, false); G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
  applyViewOffset();
  if (UI.inspect) UI.renderInspect();
}
// dikey telefonda inceleme sırasında görüntüyü yukarı kaydır (alt panel aracı örtmesin)
function applyViewOffset() {
  if (!G.camera) return;
  const w = window.innerWidth, h = window.innerHeight;
  if (UI.inspect && w <= 760 && h > w) G.camera.setViewOffset(w, h, 0, h * 0.17, w, h);
  else G.camera.clearViewOffset();
}

const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(G.clock.getDelta(), 0.05), t = G.clock.elapsedTime;
  const c = G.cam, k = 1 - Math.pow(0.002, dt);
  if (FPS.on) FPS.update(dt);
  else {
    c.yaw += (c.tYaw - c.yaw) * k; c.pitch += (c.tPitch - c.pitch) * k; c.dist += (c.tDist - c.dist) * k; c.target.lerp(c.tTarget, k);
    G.camera.position.set(c.target.x + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, Math.max(0.25, c.target.y + Math.sin(c.pitch) * c.dist), c.target.z + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist);
    G.camera.lookAt(c.target);
  }

  Object.values(G.carMeshes).forEach(m => {
    const u = m.userData;
    if (u.towing || u.manual) return;
    if (u.path && u.path.length) {
      if (u.y > 0.03) { u.y += (0 - u.y) * k * 0.5; m.position.y = u.y; return; }   // önce lifti indir
      const tgt = u.path[0], dx = tgt.x - m.position.x, dz = tgt.z - m.position.z, dist = Math.hypot(dx, dz);
      const step = u.speed * dt * Math.min(1, 0.35 + dist / 3);
      if (dist <= step) { m.position.x = tgt.x; m.position.z = tgt.z; u.path.shift(); if (!u.path.length) { u.path = null; const cb = u.cb; u.cb = null; cb && cb(); } }
      else {
        m.position.x += dx / dist * step; m.position.z += dz / dist * step;
        let a = Math.atan2(dx, dz), d = a - m.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        m.rotation.y += d * Math.min(1, dt * 5);
      }
      u.wheels.forEach(w => w.rotation.x += step / u.info.r);
    }
    u.y += ((u.tY || 0) - u.y) * k * 0.5; m.position.y = u.y;
    u.hoodT += ((u.tHood || 0) - u.hoodT) * k; u.hoodPivot.rotation.x = (u.hoodAng || -1.15) * u.hoodT;
    if (u.engineBay) u.engineBay.visible = u.hoodT > 0.08;
  });
  G.bays.forEach(b => { b.liftY += (b.tLiftY - b.liftY) * k * 0.5; b.arms.position.y = b.liftY; });
  for (let i = G.puffs.length - 1; i >= 0; i--) {
    const p = G.puffs[i], u = p.userData;
    if (u.delay > 0) { u.delay -= dt; continue; }
    p.visible = true; u.life += dt; p.position.addScaledVector(u.v, dt); p.scale.setScalar(1 + u.life * 2.2); p.material.opacity = Math.max(0, 0.6 - u.life * 0.35);
    if (u.life > 1.8) { G.scene.remove(p); G.puffs.splice(i, 1); }
  }
  const sel = UI.selected && !UI.inspect && G.carMeshes[UI.selected];
  G.ring.visible = !!sel;
  if (sel) { G.ring.position.x = sel.position.x; G.ring.position.z = sel.position.z; G.ring.material.opacity = 0.55 + Math.sin(t * 4) * 0.3; }

  G.trucks.slice().forEach(tr => moveTruck(tr, dt));
  NPCS.slice().forEach(n => n.update(dt));
  updateTraffic(dt);
  updateRain(dt);
  if (S && UI.started) { gameTick(dt); updateDaylight(S.minute / dayMinutes()); }
  G.renderer.render(G.scene, G.camera);
  UI.frame();
}

// ---------- çekici ----------
function buildTowTruck() {
  const g = new THREE.Group();
  const red = umat(0xd6a01d, { metalness: 0.3, roughness: 0.5 }), dark = cmat(0x1d2024), glass = cmat(0x1c2836, { metalness: 0.7, roughness: 0.1 });
  const chassis = box(2.1, 0.35, 7.4, dark); chassis.position.set(0, 0.75, 0); g.add(chassis);
  const cab = box(2.2, 1.6, 1.9, red); cab.position.set(0, 1.7, 2.55); g.add(cab);
  const ws = box(2.0, 0.7, 0.05, glass); ws.position.set(0, 2.05, 3.51); g.add(ws);
  [-1, 1].forEach(sx => { const sw = box(0.05, 0.6, 1.0, glass); sw.position.set(sx * 1.11, 2.05, 2.7); g.add(sw); });
  const bed = box(2.3, 0.14, 5.0, cmat(0x6a6f75, { metalness: 0.6 })); bed.position.set(0, 1.0, -1.0); g.add(bed);
  [-1, 1].forEach(sx => { const rail = box(0.08, 0.18, 5.0, cmat(0xb8322a)); rail.position.set(sx * 1.12, 1.14, -1.0); g.add(rail); });
  const beacon = box(0.9, 0.14, 0.25, new THREE.MeshStandardMaterial({ color: 0xff8a1f, emissive: 0xff7a00, emissiveIntensity: 1 })); beacon.position.set(0, 2.57, 2.55); g.add(beacon);
  const tireM = cmat(0x131313, { roughness: 0.9 });
  [[2.6], [-1.4], [-2.6]].forEach(([z]) => [-1, 1].forEach(sx => { const w = cyl(0.45, 0.45, 0.35, 16, tireM); w.rotation.z = Math.PI / 2; w.position.set(sx * 1.0, 0.45, z); g.add(w); }));
  g.userData.beacon = beacon;
  return g;
}
function moveTruck(tr, dt) {
  const u = tr.userData;
  u.beacon.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(G.clock.elapsedTime * 6));
  if (!u.path || !u.path.length) return;
  const tgt = u.path[0], dx = tgt[0] - tr.position.x, dz = tgt[1] - tr.position.z, dist = Math.hypot(dx, dz);
  const step = u.speed * dt * Math.min(1, 0.3 + dist / 4);
  if (dist <= step) { tr.position.x = tgt[0]; tr.position.z = tgt[1]; u.path.shift(); if (!u.path.length) { const cb = u.cb; u.cb = null; cb && cb(); } return; }
  tr.position.x += dx / dist * step; tr.position.z += dz / dist * step;
  let a = Math.atan2(dx, dz), d = a - tr.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  tr.rotation.y += d * Math.min(1, dt * 4);
}
function towIn(car, m, slot) {
  const tr = buildTowTruck(); tr.position.set(-80, 0, LANE_E); tr.rotation.y = Math.PI / 2; G.scene.add(tr); G.trucks.push(tr);
  m.userData.towing = true; m.userData.slotKey = slot.key;
  m.position.set(0, 1.07, -1.0); m.rotation.set(0, 0, 0); tr.add(m);
  tr.userData.speed = 9;
  tr.userData.path = [[slot.x + 1, LANE_E]];
  tr.userData.cb = () => {
    SFX.beep();
    setTimeout(() => {
      const wp = new THREE.Vector3(); m.getWorldPosition(wp);
      tr.remove(m); G.scene.add(m); m.position.copy(wp); m.rotation.y = tr.rotation.y;
      m.userData.towing = false; m.userData.y = wp.y; m.userData.tY = 0;
      driveCar(m, [[slot.x, CURB_Z], [slot.x, slot.z]], 3, () => { if (!car._custSpawned && car.apron != null) Life.customerArrived(car); });
      syncScene();
      setTimeout(() => { tr.userData.speed = 10; tr.userData.path = [[95, LANE_E]]; tr.userData.cb = () => { G.scene.remove(tr); G.trucks.splice(G.trucks.indexOf(tr), 1); }; }, 1500);
    }, 900);
  };
}

// ---------- grafik kalitesi ----------
function gfxLevel() { try { return localStorage.getItem('gz_gfx') || (window.innerWidth < 800 ? 'medium' : 'high'); } catch (e) { return 'high'; } }
function gfxPixelRatio() { const l = gfxLevel(), d = window.devicePixelRatio || 1; return l === 'low' ? 1 : l === 'medium' ? Math.min(d, 1.25) : Math.min(d, 2); }
function setGfx(l) { try { localStorage.setItem('gz_gfx', l); } catch (e) { } applyGfx(); }
function applyGfx() {
  if (!G.renderer) return;
  const l = gfxLevel(), sh = l !== 'low';
  G.renderer.setPixelRatio(gfxPixelRatio()); resize();
  if (G.renderer.shadowMap.enabled !== sh || G.sun.castShadow !== sh) {
    G.renderer.shadowMap.enabled = sh; G.sun.castShadow = sh;
    G.sun.shadow.mapSize.set(l === 'high' ? 2048 : 1024, l === 'high' ? 2048 : 1024);
    if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; }
    G.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  }
  G.rainCount = l === 'low' ? 500 : l === 'medium' ? 1200 : 2200;
}
// ---------- yağmur ----------
function setWeatherFx(w) {
  if (!G.scene) return;
  if (w === 'rain' && !G.rain) {
    const n = G.rainCount || 1500, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = rnd(-45, 55), y = rnd(0, 30), z = rnd(-25, 40); pos.set([x, y, z, x - 0.05, y - 0.6, z], i * 6); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    G.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaec4d6, transparent: true, opacity: 0.45 }));
    G.rain.frustumCulled = false; G.scene.add(G.rain);
  }
  if (G.rain) G.rain.visible = w === 'rain';
  const wet = w === 'rain';
  if (G.wetMats) G.wetMats.forEach(([m, r]) => m.roughness = wet ? r * 0.45 : r);
}
function updateRain(dt) {
  if (!G.rain || !G.rain.visible) return;
  const a = G.rain.geometry.attributes.position, p = a.array, v = 26 * dt;
  for (let i = 0; i < p.length; i += 6) {
    p[i + 1] -= v; p[i + 4] -= v;
    if (p[i + 4] < 0) { const y = 28 + Math.random() * 4; p[i + 1] = y; p[i + 4] = y - 0.6; }
  }
  a.needsUpdate = true;
}
// ---------- yükseltme görselleri ----------
function buildExtras() {
  const s = G.scene;
  // bekleme salonu: gölgelik + çay masası (banklar zaten var)
  const lg = new THREE.Group(); lg.position.set(-14.45, 0, 5.6); s.add(lg); G.lounge = lg; lg.visible = false;
  const roof = box(1.9, 0.08, 5.2, mat(0xb8322a)); roof.position.y = 2.5; lg.add(roof);
  [-2.4, 2.4].forEach(z => { const p = cyl(0.05, 0.05, 2.5, 6, mat(0x3b3f46)); p.position.set(0.75, 1.25, z); lg.add(p); });
  const tbl = cyl(0.35, 0.35, 0.05, 14, mat(0x9a6b3c)); tbl.position.set(0.55, 0.62, 0.6); lg.add(tbl);
  const leg = cyl(0.04, 0.04, 0.6, 6, mat(0x3b3f46)); leg.position.set(0.55, 0.31, 0.6); lg.add(leg);
  for (let i = 0; i < 2; i++) { const gl = cyl(0.03, 0.025, 0.08, 8, new THREE.MeshStandardMaterial({ color: 0xb8322a, transparent: true, opacity: 0.85 })); gl.position.set(0.48 + i * 0.14, 0.69, 0.55); lg.add(gl); }
  const sam = cyl(0.12, 0.14, 0.32, 10, mat(0xd5d9de, { metalness: 0.8, roughness: 0.25 })); sam.position.set(0.62, 0.81, 0.78); lg.add(sam);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: labelTexture('ÇAY OCAĞI', { w: 512, h: 128 }) })); sg.position.set(0.95, 2.25, 0); sg.rotation.y = Math.PI / 2; lg.add(sg);
  // lastik makinesi
  const tm = new THREE.Group(); tm.position.set(11.7, 0, 1.6); s.add(tm); G.tireMach = tm; tm.visible = false;
  const base = box(0.9, 0.9, 0.9, mat(0xb8322a, { metalness: 0.3 })); base.position.y = 0.45; tm.add(base);
  const plate = cyl(0.42, 0.42, 0.06, 18, mat(0x9aa0a6, { metalness: 0.8 })); plate.position.y = 0.94; tm.add(plate);
  const arm = box(0.1, 0.9, 0.1, mat(0x3b3f46)); arm.position.set(-0.35, 1.35, 0); tm.add(arm);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 8, 18), mat(0x161616)); tire.rotation.x = Math.PI / 2; tire.position.y = 1.07; tm.add(tire);
  const bal = box(0.6, 0.6, 0.5, mat(0x2c5a99)); bal.position.set(0, 0.3, 1.0); tm.add(bal);
  // kaporta tezgâhı
  const bb = new THREE.Group(); bb.position.set(-11.6, 0, -2.5); s.add(bb); G.bodyBench = bb; bb.visible = false;
  const top = box(1.0, 0.08, 2.4, mat(0x6e5a44)); top.position.y = 0.9; bb.add(top);
  const legs = box(0.9, 0.86, 2.2, mat(0x3d434a)); legs.position.y = 0.43; bb.add(legs);
  const bumper = box(0.25, 0.18, 1.8, mat(0x23272c)); bumper.position.set(0, 1.04, 0); bumper.rotation.z = 0.1; bb.add(bumper);
  const can = cyl(0.1, 0.1, 0.25, 10, mat(0xd6a01d)); can.position.set(0.25, 1.06, 0.95); bb.add(can);
  // ıslak zemin parlaklığı
  G.wetMats = [];
  s.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.rotation.x !== 0 && o.material && o.material.roughness > 0.7 && !G.wetMats.some(x => x[0] === o.material)) G.wetMats.push([o.material, o.material.roughness]); });
}

// ---------- görünüm özelleştirme ----------
function applyCustom() {
  if (!S) return;
  const C = S.custom = Object.assign({}, DEFAULT_CUSTOM, S.custom || {});
  const root = document.documentElement.style;
  root.setProperty('--accent', C.accent);
  const hx = parseInt(C.accent.slice(1), 16), lum = ((hx >> 16) * 0.299 + ((hx >> 8) & 255) * 0.587 + (hx & 255) * 0.114) / 255;
  root.setProperty('--accent-ink', lum > 0.55 ? '#1a1206' : '#ffffff');
  if (!G.scene) return;
  if (G.wallM) G.wallM.color.setHex(C.wall);
  if (CITY.shopFloor) { if (!CITY.shopFloor.userData.own) { CITY.shopFloor.material = new THREE.MeshStandardMaterial({ roughness: 0.5 }); CITY.shopFloor.userData.own = true; } CITY.shopFloor.material.color.setHex(C.floor); }
  G.bays.forEach(b => b.postM.color.set(C.lift));
  if (G.ring) G.ring.material.color.set(C.accent);
  syncScene();
}

// ---------- şirket yapıları ----------
function buildCompanyStructures() {
  const s = G.scene;
  // tır servisi
  const th = new THREE.Group(); th.position.set(-41.5, 0, -4); s.add(th); G.truckHall = th; th.visible = false;
  const wallM = mat(0x5b6168), trimM = mat(0x2b2f34), roofM = mat(0x4b5158, { metalness: 0.4 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), mat(0x4a4f55, { roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.03, 0); fl.receiveShadow = true; th.add(fl);
  const back = box(18.4, 6.5, 0.4, wallM); back.position.set(0, 3.25, -7); th.add(back);
  [-9, 9].forEach(x => { const w = box(0.4, 6.5, 14, wallM); w.position.set(x, 3.25, 0); th.add(w); });
  const band = box(18.6, 1.4, 0.5, trimM); band.position.set(0, 5.9, 7); th.add(band);
  [-9, 0, 9].forEach(x => { const col = box(0.6, 6.5, 0.6, trimM); col.position.set(x, 3.25, 7); th.add(col); });
  for (let i = 0; i < 6; i++) { const b = box(18.2, 0.2, 0.25, roofM); b.position.set(0, 6.4, -6 + i * 2.5); th.add(b); }
  G.truckSignMat = new THREE.MeshBasicMaterial({ map: labelTexture(['TIR SERVİSİ', 'AĞIR VASITA']) });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), G.truckSignMat); sg.position.set(0, 5.9, 7.27); th.add(sg);
  TRUCK_BAYS.forEach(([bx]) => {
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 8.5), new THREE.MeshBasicMaterial({ color: 0x15181b })); pit.rotation.x = -Math.PI / 2; pit.position.set(bx + 41.5, 0.035, 0.4); th.add(pit);
    [-0.85, 0.85].forEach(o => { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 8.5), new THREE.MeshBasicMaterial({ color: 0xf2c14e })); e.rotation.x = -Math.PI / 2; e.position.set(bx + 41.5 + o, 0.04, 0.4); th.add(e); });
    const lamp = box(0.3, 0.06, 6, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 1.1 })); lamp.position.set(bx + 41.5, 6.2, 0); th.add(lamp);
  });
  const rack = box(1, 2.4, 4, mat(0xb8322a, { metalness: 0.3 })); rack.position.set(-8.2, 1.2, -3.5); th.add(rack);
  const tires = []; for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 8, 18), mat(0x161616)); t.position.set(7.8, 0.6 + i * 0.01, -5 + i * 1.3); t.rotation.y = Math.PI / 2; th.add(t); tires.push(t); }
  // ofis katı (kademe 1+)
  const of = new THREE.Group(); of.position.set(0, 5.2, -6.3); s.add(of); G.office = of; of.visible = false;
  const ob = box(14, 2.6, 2.4, mat(0xe6e2d8)); ob.position.y = 1.3; of.add(ob);
  const og = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x8fb4c8, metalness: 0.6, roughness: 0.1, emissive: 0xffd98a, emissiveIntensity: 0.15 })); og.position.set(0, 1.4, 1.21); of.add(og); CITY.windowsMats.push(og.material);
  const orf = box(14.4, 0.2, 2.8, mat(0x3b4148)); orf.position.y = 2.7; of.add(orf);
  // cam vitrin + kanopi (kademe 2+)
  const cp = new THREE.Group(); cp.position.set(0, 0, 6.2); s.add(cp); G.canopy = cp; cp.visible = false;
  G.canopyMat = mat(0xff8a1f, { metalness: 0.3 });
  const cr = box(26.6, 0.18, 1.8, G.canopyMat); cr.position.set(0, 4.05, 0.3); cp.add(cr);
  for (let i = 0; i < 5; i++) { const lt = box(0.8, 0.05, 0.3, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 })); lt.position.set(-10 + i * 5, 3.95, 0.6); cp.add(lt); }
  // merkez plaza kulesi (kademe 4)
  const hq = new THREE.Group(); hq.position.set(4, 0, -16.5); s.add(hq); G.hq = hq; hq.visible = false;
  const tex = windowTexture('#2b3a4a', 0.6); tex.repeat.set(4, 9);
  const hm = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0, metalness: 0.4, roughness: 0.3 }); CITY.windowsMats.push(hm);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(11, 30, 6), [hm, hm, mat(0x3b4148), hm, hm, hm]); tw.position.y = 15; tw.castShadow = true; hq.add(tw);
  G.hqSignMat = new THREE.MeshBasicMaterial({ map: labelTexture('GARAGE ZERO') });
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), G.hqSignMat); hs.position.set(0, 28.5, 3.02); hq.add(hs);
  const crown = box(11.6, 0.6, 6.6, G.canopyMat); crown.position.y = 30.3; hq.add(crown);
}
function syncCompany() {
  if (!G.truckHall || !S) return;
  const C = S.custom || DEFAULT_CUSTOM, tier = S.tier || 0;
  G.truckHall.visible = !!S.truckHall;
  if (CITY.washBld) CITY.washBld.visible = !S.truckHall;
  if (CITY.sideBld) CITY.sideBld.visible = !S.truckHall;
  G.office.visible = tier >= 1; G.canopy.visible = tier >= 2; G.hq.visible = tier >= 4;
  G.canopyMat.color.set(C.accent);
  const nm = S.name.toUpperCase().slice(0, 18), key = nm + C.accent;
  if (G.hqSignMat.userData.k !== key) { G.hqSignMat.map = labelTexture([nm, 'HOLDİNG'], { accent: C.accent }); G.hqSignMat.needsUpdate = true; G.hqSignMat.userData.k = key; G.truckSignMat.map = labelTexture([nm, 'TIR SERVİSİ'], { accent: C.accent }); G.truckSignMat.needsUpdate = true; }
  // şubeler: karşı sıradaki dükkân tabelalarını devral
  CITY.shopFronts.forEach((b, i) => {
    const br = (S.branches || []).find(x => x.bld === i), u = b.userData; if (!u.sign) return;
    const want = br ? 'br' + nm + br.district + C.accent : 'def';
    if (u.signKey === want) return;
    u.signKey = want;
    u.sign.material.map = br ? shopSignTexture(nm.slice(0, 12), C.accent, '#1a1206') : shopSignTexture(u.signDef[0], u.signDef[1], u.signDef[2]);
    u.sign.material.needsUpdate = true;
    u.awn.material = br ? new THREE.MeshStandardMaterial({ color: C.accent }) : cmat(new THREE.Color(u.signDef[1]).getHex());
  });
}
