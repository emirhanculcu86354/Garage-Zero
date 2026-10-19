// ================= GARAGE ZERO — ŞEHİR =================
// Yerleşim: dükkân x∈[-13,13] z∈[-7.6,5.6] · bekleme alanı z≈8 · kaldırım z≈11 · yol z 12–18 (şerit 13.5 doğu, 16.5 batı)
// karşı kaldırım z≈19.5 · karşı binalar z>21 · galeri x∈[15.5,40] z∈[-2,10]
const LANE_E = 13.5, LANE_W = 16.5, APRON_Z = 3, CURB_Z = 10.6;
const WAIT_X = [-26, -23, -20, -17];

function windowTexture(base, lit) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const on = Math.random() < lit;
    x.fillStyle = on ? '#ffd98a' : '#26323d'; x.fillRect(10 + k * 30, 12 + r * 30, 18, 20);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(10 + k * 30, 12 + r * 30, 18, 3);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}
function shopSignTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 256, 64);
  x.fillStyle = fg; x.font = '800 36px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

const CITY = { lamps: [], lampLights: [], windowsMats: [], traffic: [], shopFronts: [] };

function buildCity() {
  const s = G.scene;
  const flat = (w, d, color, x, z, y = 0.01, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cmat(color, Object.assign({ roughness: 0.95 }, o))); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; s.add(m); return m; };
  flat(260, 260, 0x3d4a3a, 0, 0, 0);                     // çim / zemin
  flat(160, 6, 0x24272b, 0, 15, 0.012);                 // ana yol
  flat(6, 160, 0x24272b, -30, 0, 0.011);                // ara sokak
  flat(160, 1.8, 0x8d8a83, 0, 11.3, 0.03);              // kaldırım kuzey
  flat(160, 2.6, 0x8d8a83, 0, 19.3, 0.03);              // kaldırım güney
  flat(29, 5.2, 0x5b5f63, 0, 8.0, 0.02);                // bekleme alanı (beton)
  CITY.shopFloor = flat(27, 13.2, 0x55595d, 0, -1, 0.02, { roughness: 0.5 }); // atölye zemini
  flat(26, 12.5, 0x34383c, 27.7, 4, 0.02);              // galeri asfaltı
  flat(12, 14, 0x34383c, -21, 2, 0.02);                 // sol otopark
  // yol çizgileri
  for (let i = -16; i <= 16; i++) flat(2.4, 0.16, 0xe9e4d4, i * 5, 15, 0.025);
  flat(160, 0.1, 0xe9e4d4, 0, 12.2, 0.025); flat(160, 0.1, 0xe9e4d4, 0, 17.8, 0.025);
  for (let i = 0; i < 7; i++) flat(0.5, 5.6, 0xe9e4d4, -6 + i * 1, 15, 0.026);     // yaya geçidi
  // kaldırım bordürleri
  [[0, 12.15], [0, 17.85]].forEach(([x, z]) => { const b = box(160, 0.12, 0.2, cmat(0xb7b2a7)); b.position.set(x, 0.06, z); b.castShadow = false; s.add(b); });

  // karşı sıra binalar
  const palettes = ['#c9b79c', '#a8b4b8', '#d8cfc0', '#b9a089', '#9fa8a0', '#c4a69a', '#8f9aa6'];
  const shops = [['FIRIN', '#b8322a', '#fff'], ['MARKET', '#2c5a99', '#fff'], ['ECZANE', '#3a7650', '#fff'], ['LASTİKÇİ', '#23272c', '#ff8a1f'], ['KAFE', '#6b2f4a', '#f6e7c8'], ['BERBER', '#e6e2d8', '#23272c'], ['YEDEK PARÇA', '#d6a01d', '#1a1206'], ['KIRTASİYE', '#2a8a8f', '#fff']];
  let x = -64, si = 0;
  while (x < 64) {
    const w = rnd(7, 11), h = rnd(3.6, 4.6), d = rnd(7, 10);
    const bg = addBuilding(x + w / 2, 21.5 + d / 2, w, h, d, pick(palettes), shops[si++ % shops.length], 0);
    if (Math.abs(x + w / 2) < 45) CITY.shopFronts.push(bg);
    x += w + rnd(0.3, 1.2);
  }
  // arka sıra (dükkân arkası)
  x = -64;
  while (x < 64) {
    const w = rnd(8, 12), h = rnd(8, 20), d = rnd(8, 12);
    if (x + w > -15 && x < 42) { x += w + 1; continue; }
    addBuilding(x + w / 2, -12 - d / 2, w, h, d, pick(palettes), null, Math.PI);
    x += w + rnd(0.5, 1.5);
  }
  for (let i = 0; i < 5; i++) addBuilding(-15 + i * 12, -24, 11, rnd(14, 26), 10, pick(palettes), null, Math.PI);
  CITY.sideBld = addBuilding(-40, -6.5, 10, 12, 14, '#b9a089', null, Math.PI / 2);
  CITY.washBld = addBuilding(-44, 5.5, 10, 4.2, 8, '#a8b4b8', ['OTO YIKAMA', '#2c5a99', '#fff'], Math.PI / 2);
  addBuilding(48, 2, 10, 10, 16, '#d8cfc0', ['SİGORTA', '#23272c', '#fff'], -Math.PI / 2);

  // ağaçlar & lambalar
  const trunkM = cmat(0x6b4a2e), leafM = [cmat(0x3f6b3a), cmat(0x4f7d3f), cmat(0x5b8a46)];
  const tree = (tx, tz, sc = 1) => {
    const t = cyl(0.12 * sc, 0.16 * sc, 1.6 * sc, 6, trunkM); t.position.set(tx, 0.8 * sc, tz); s.add(t);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * sc, 0), pick(leafM)); c1.position.set(tx, 2.4 * sc, tz); c1.castShadow = true; s.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 * sc, 0), pick(leafM)); c2.position.set(tx + 0.4 * sc, 3.1 * sc, tz - 0.2); c2.castShadow = true; s.add(c2);
  };
  for (let i = -60; i <= 60; i += 9) { if (Math.abs(i) > 3) tree(i + 2, 20.1, rnd(0.8, 1.1)); }
  [[-15.6, -6.5], [41.5, 9], [41.5, -1], [14.5, -8], [-28.6, -7], [-28.6, 9.5]].forEach(([a, b]) => tree(a, b, rnd(0.9, 1.3)));
  const poleM = cmat(0x3b3f46, { metalness: 0.6 });
  for (let i = -55; i <= 55; i += 14) {
    [[i, 11.9, 1], [i + 7, 18.4, -1]].forEach(([lx, lz, dir]) => {
      const p = cyl(0.06, 0.08, 5, 6, poleM); p.position.set(lx, 2.5, lz); s.add(p);
      const arm = box(0.08, 0.08, 1.2, poleM); arm.position.set(lx, 4.95, lz + dir * 0.6); s.add(arm);
      const bulb = box(0.4, 0.1, 0.25, new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd27a, emissiveIntensity: 0 }));
      bulb.position.set(lx, 4.88, lz + dir * 1.15); s.add(bulb); CITY.lamps.push(bulb.material);
    });
  }
  // birkaç gerçek ışık (akşam)
  [[-8, 12], [8, 12], [28, 12], [-24, 12]].forEach(([lx, lz]) => { const L = new THREE.PointLight(0xffc77a, 0, 16, 2); L.position.set(lx, 4.6, lz); s.add(L); CITY.lampLights.push(L); });

  // müşteri bekleme köşesi + otobüs durağı
  const bench = (bx, bz, rot) => { const g = new THREE.Group(); const seat = box(1.6, 0.08, 0.45, cmat(0x9a6b3c)); seat.position.y = 0.45; g.add(seat); const back = box(1.6, 0.4, 0.06, cmat(0x9a6b3c)); back.position.set(0, 0.7, -0.2); g.add(back); [-0.7, 0.7].forEach(lx => { const l = box(0.06, 0.45, 0.4, poleM); l.position.set(lx, 0.22, 0); g.add(l); }); g.position.set(bx, 0, bz); g.rotation.y = rot; s.add(g); };
  bench(-14.6, 6.8, Math.PI / 2); bench(-14.6, 4.6, Math.PI / 2);
  const shelter = new THREE.Group(); const roof = box(3.2, 0.08, 1.4, cmat(0x2c5a99)); roof.position.y = 2.4; shelter.add(roof);
  const glassP = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshStandardMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.35 })); glassP.position.set(0, 1.25, -0.6); shelter.add(glassP);
  shelter.position.set(-6, 0, 20.3); s.add(shelter); bench(-6, 20.1, 0);
  // çöp kutusu, yangın musluğu, saksı
  const bin = cyl(0.25, 0.22, 0.8, 10, cmat(0x3a7650)); bin.position.set(13.8, 0.4, 10.6); s.add(bin);
  const hyd = cyl(0.12, 0.14, 0.6, 8, cmat(0xb8322a)); hyd.position.set(-13.8, 0.3, 11.5); s.add(hyd);
  [-13.6, 13.6].forEach(px => { const pot = cyl(0.35, 0.28, 0.5, 10, cmat(0x8c5a3c)); pot.position.set(px, 0.25, 6.1); s.add(pot); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), cmat(0x4f7d3f)); pl.position.set(px, 0.8, 6.1); s.add(pl); });
  // müşteri otoparkı: çizgiler, numaralar, tabela + iki park etmiş araç
  const lineM = new THREE.MeshBasicMaterial({ color: 0xe9e4d4 });
  WAIT_X.forEach((x, i) => {
    [-1.45, 1.45].forEach(lx => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 5.2), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x + lx, 0.03, APRON_Z); s.add(l); });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.45), new THREE.MeshBasicMaterial({ map: shopSignTexture('M' + (i + 1), '#34383c', '#e9e4d4') }));
    tag.rotation.x = -Math.PI / 2; tag.position.set(x, 0.035, APRON_Z - 2.2); s.add(tag);
  });
  const wsign = box(4.4, 1, 0.1, new THREE.MeshBasicMaterial({ map: shopSignTexture('MÜŞTERİ PARKI', '#2c5a99', '#fff') })); wsign.position.set(-21.5, 2.5, 9.8); s.add(wsign);
  [-23.4, -19.6].forEach(px => { const p = cyl(0.06, 0.06, 2.4, 6, poleM); p.position.set(px, 1.2, 9.8); s.add(p); });
  [[-24.5, -3.6], [-18.5, -3.6]].forEach(([x, z], i) => {
    const fake = { id: 'p' + i, model: pick(Object.keys(MODELS).filter(k => !MODELS[k].truck)), color: pick(CAR_COLORS), paint: 80, clean: true };
    const m = buildCar(fake); m.position.set(x, 0, z); m.rotation.y = Math.PI / 2; s.add(m);
  });
  // trafik
  for (let i = 0; i < 5; i++) {
    const fake = { id: 't' + i, model: pick(Object.keys(MODELS)), color: pick(CAR_COLORS), paint: 85, clean: true };
    const m = buildCar(fake); const east = i % 2 === 0;
    m.position.set(rnd(-70, 70), 0, east ? LANE_E : LANE_W); m.rotation.y = east ? Math.PI / 2 : -Math.PI / 2;
    m.userData.traffic = { dir: east ? 1 : -1, v: rnd(7, 11) }; s.add(m); CITY.traffic.push(m);
  }
}

function addBuilding(x, z, w, h, d, color, sign, rot) {
  const s = G.scene;
  const tex = windowTexture(color, 0.25); tex.repeat.set(Math.max(1, Math.round(w / 3.2)), Math.max(1, Math.round(h / 3.2)));
  const wallM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 });
  CITY.windowsMats.push(wallM);
  const plain = cmat(new THREE.Color(color).getHex(), { roughness: 0.9 });
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; s.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plain, plain, cmat(0x5b5f63), plain, wallM, plain]);
  b.position.y = h / 2; b.castShadow = true; b.receiveShadow = true; g.add(b);
  const cornice = box(w + 0.3, 0.3, d + 0.3, cmat(0x6e6a63)); cornice.position.y = h + 0.15; g.add(cornice);
  // ön yüz +z (yerel) yola bakar: rot=0 için z− tarafı yol → döndür
  b.rotation.y = Math.PI;
  if (sign) {
    const st = box(w * 0.9, 0.9, 0.12, new THREE.MeshBasicMaterial({ map: shopSignTexture(sign[0], sign[1], sign[2]) }));
    st.position.set(0, Math.min(3.2, h - 0.7), -d / 2 - 0.08); st.rotation.y = Math.PI; g.add(st);
    const awn = box(w * 0.85, 0.08, 1.4, cmat(new THREE.Color(sign[1]).getHex())); awn.position.set(0, 2.6, -d / 2 - 0.7); awn.rotation.x = -0.25; g.add(awn);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 1.8), new THREE.MeshStandardMaterial({ color: 0x9fbfd0, metalness: 0.5, roughness: 0.1, emissive: 0xffd98a, emissiveIntensity: 0 }));
    win.position.set(0, 1.2, -d / 2 - 0.02); win.rotation.y = Math.PI; g.add(win); CITY.windowsMats.push(win.material);
    g.userData.sign = st; g.userData.awn = awn; g.userData.signDef = sign; g.userData.w = w;
  }
  return g;
}

function updateTraffic(dt) {
  CITY.traffic.forEach(m => {
    const t = m.userData.traffic;
    m.position.x += t.dir * t.v * dt;
    if (m.position.x > 80) m.position.x = -80; if (m.position.x < -80) m.position.x = 80;
    m.userData.wheels.forEach(w => w.rotation.x += t.v * dt / 0.34);
  });
}

// gün ışığı: f = 0 (08:00) … 1 (18:00)
const SKY = { morning: new THREE.Color(0xbfd3e6), noon: new THREE.Color(0xa9c9ea), dusk: new THREE.Color(0xe9a36b), night: new THREE.Color(0x1b2638) };
const _sky = new THREE.Color(), _gray = new THREE.Color(0x8a939c), _cold = new THREE.Color(0xc9dcef);
function updateDaylight(f) {
  f = Math.max(0, Math.min(1.05, f));
  if (f < 0.3) _sky.copy(SKY.morning).lerp(SKY.noon, f / 0.3);
  else if (f < 0.75) _sky.copy(SKY.noon);
  else if (f < 0.93) _sky.copy(SKY.noon).lerp(SKY.dusk, (f - 0.75) / 0.18);
  else _sky.copy(SKY.dusk).lerp(SKY.night, Math.min(1, (f - 0.93) / 0.12));
  G.scene.background.copy(_sky); G.scene.fog.color.copy(_sky);
  const ang = -0.3 + f * (Math.PI + 0.6);
  G.sun.position.set(Math.cos(ang) * 40, Math.max(4, Math.sin(ang) * 40), 22);
  G.sun.intensity = 0.25 + Math.max(0, Math.sin(Math.min(Math.PI, ang + 0.2))) * 0.85;
  G.sun.color.setRGB(1, 0.86 + 0.14 * Math.sin(Math.min(Math.PI, ang)), 0.72 + 0.28 * Math.sin(Math.min(Math.PI, ang)));
  G.hemi.intensity = 0.35 + 0.4 * Math.sin(Math.min(Math.PI, Math.max(0, ang + 0.3)));
  const wx = S && S.weather;
  if (wx === 'rain' || wx === 'cloudy') {
    const k = wx === 'rain' ? 0.5 : 0.25;
    G.scene.background.lerp(_gray, k); G.scene.fog.color.copy(G.scene.background);
    G.sun.intensity *= 1 - k * 0.9; G.hemi.intensity *= 1 - k * 0.3;
    G.scene.fog.near = wx === 'rain' ? 30 : 50; G.scene.fog.far = wx === 'rain' ? 95 : 130;
  } else { G.scene.fog.near = 60; G.scene.fog.far = 140; }
  if (wx === 'cold') G.scene.background.lerp(_cold, 0.25);
  if (wx === 'hot') G.sun.intensity *= 1.1;
  const night = Math.max(0, Math.min(1, (f - (wx === 'rain' ? 0.7 : 0.82)) / 0.15));
  CITY.lamps.forEach(m => m.emissiveIntensity = night * 1.6);
  CITY.lampLights.forEach(L => L.intensity = night * 1.2);
  CITY.windowsMats.forEach(m => m.emissiveIntensity = night * 0.55);
}
