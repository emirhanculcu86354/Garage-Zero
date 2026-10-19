// ================= GARAGE ZERO — ARAÇ MODELLERİ =================
// Yerel eksen: +z = aracın önü, +y = yukarı
const CAR_DIM = {
  mini:   { L: 3.6, W: 1.70, H: 0.62, cH: 0.62, cL: 2.0, cZ: -0.25, r: 0.31, sF: 0.55, sR: 0.25 },
  hatch:  { L: 4.0, W: 1.78, H: 0.60, cH: 0.60, cL: 2.15, cZ: -0.45, r: 0.33, sF: 0.75, sR: 0.35 },
  sedan:  { L: 4.55, W: 1.80, H: 0.58, cH: 0.56, cL: 2.35, cZ: -0.2, r: 0.34, sF: 0.8, sR: 0.65 },
  wagon:  { L: 4.65, W: 1.80, H: 0.60, cH: 0.60, cL: 2.95, cZ: -0.55, r: 0.34, sF: 0.75, sR: 0.12 },
  suv:    { L: 4.65, W: 1.90, H: 0.80, cH: 0.68, cL: 2.75, cZ: -0.45, r: 0.42, sF: 0.6, sR: 0.12 },
  pickup: { L: 5.2, W: 1.90, H: 0.78, cH: 0.70, cL: 1.75, cZ: 0.5,  r: 0.42, sF: 0.5, sR: 0.06, bed: true },
  coupe:  { L: 4.45, W: 1.86, H: 0.50, cH: 0.46, cL: 2.0, cZ: -0.4, r: 0.34, sF: 0.95, sR: 0.8 },
};
const _matCache = {};
function cmat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (o.unique) return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, o, { unique: undefined }));
  if (!_matCache[key]) { _matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, o)); _matCache[key].userData.shared = true; }
  return _matCache[key];
}
function umat(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.2 }, o)); }
function box(w, h, d, m) { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; }
function cyl(r1, r2, h, seg, m) { const x = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); x.castShadow = true; return x; }

let _plateTex = null;
function plateTexture() {
  if (_plateTex) return _plateTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 56;
  const x = c.getContext('2d'); x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, 256, 56);
  x.fillStyle = '#2c5a99'; x.fillRect(0, 0, 30, 56); x.fillStyle = '#fff'; x.font = 'bold 16px sans-serif'; x.fillText('TR', 4, 40);
  x.fillStyle = '#111'; x.font = 'bold 34px "JetBrains Mono", monospace'; x.fillText('34 GZ 0', 42, 41);
  _plateTex = new THREE.CanvasTexture(c); _plateTex.encoding = THREE.sRGBEncoding; return _plateTex;
}

function buildCar(car) {
  const style = (S && S.settings && S.settings.carStyle) || 'modern';
  return style === 'classic' ? buildCarClassic(car) : buildCarModern(car);
}

// ---------- yeni model: yan profil ekstrüzyonu ----------
function extrudeSide(shape, width, mat, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.rotateY(-Math.PI / 2);                // şekil-x → araç z, ekstrüzyon → araç -x
  g.translate((width - bevel * 2) / 2, 0, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

function buildCarModern(car) {
  const d = CAR_DIM[MODELS[car.model].type];
  const g = new THREE.Group();
  const q = car.paint / 100;
  const paint = umat(car.color, { metalness: 0.45, roughness: 0.62 - q * 0.38 });
  const dark = cmat(0x15181b, { roughness: 0.8 });
  const trim = cmat(0x2a2e33, { roughness: 0.5, metalness: 0.4 });
  const mods = car.mods || [];
  const glass = mods.includes('tint') ? cmat(0x07090c, { metalness: 0.8, roughness: 0.05 }) : cmat(0x1c2836, { metalness: 0.7, roughness: 0.08 });
  const chrome = cmat(0xd5d9de, { metalness: 0.9, roughness: 0.2 });
  const yb = d.r * 0.55, yT = yb + d.H, L = d.L, W = d.W;
  const wz = L / 2 - (L > 4.8 ? 0.98 : 0.8), ar = d.r + 0.07, by = yb + 0.06;

  // gövde profili
  const s = new THREE.Shape();
  s.moveTo(-L / 2, by + 0.05);
  s.lineTo(-L / 2, yT - 0.12);
  s.quadraticCurveTo(-L / 2, yT, -L / 2 + 0.16, yT);
  s.lineTo(L / 2 - 0.42, yT - (d.bed ? 0 : 0.03));
  s.quadraticCurveTo(L / 2 - 0.02, yT - 0.06, L / 2, yT - 0.28);
  s.lineTo(L / 2, by + 0.05);
  s.quadraticCurveTo(L / 2, by, L / 2 - 0.08, by);
  s.lineTo(wz + ar, by); s.lineTo(wz + ar, d.r); s.absarc(wz, d.r, ar, 0, Math.PI, false); s.lineTo(wz - ar, by);
  s.lineTo(-wz + ar, by); s.lineTo(-wz + ar, d.r); s.absarc(-wz, d.r, ar, 0, Math.PI, false); s.lineTo(-wz - ar, by);
  s.lineTo(-L / 2 + 0.08, by);
  s.quadraticCurveTo(-L / 2, by, -L / 2, by + 0.05);
  g.add(extrudeSide(s, W, paint, 0.06));

  // kabin (cam ev)
  const r0 = d.cZ - d.cL / 2, f0 = d.cZ + d.cL / 2, top = yT + d.cH;
  const cs = new THREE.Shape();
  cs.moveTo(r0, yT); cs.lineTo(r0 + d.sR, top - 0.04); cs.quadraticCurveTo(r0 + d.sR + 0.04, top, r0 + d.sR + 0.12, top);
  cs.lineTo(f0 - d.sF - 0.12, top); cs.quadraticCurveTo(f0 - d.sF + 0.02, top, f0 - d.sF + 0.06, top - 0.05); cs.lineTo(f0, yT); cs.lineTo(r0, yT);
  g.add(extrudeSide(cs, W * 0.86, glass, 0.04));
  // tavan, direkler
  const roofL = d.cL - d.sF - d.sR - 0.1;
  const roof = box(W * 0.82, 0.05, roofL, paint); roof.position.set(0, top + 0.02, (r0 + d.sR + f0 - d.sF) / 2); g.add(roof);
  [-1, 1].forEach(sx => {
    const bpil = box(0.06, d.cH * 0.95, 0.12, paint); bpil.position.set(sx * W * 0.43, yT + d.cH * 0.48, (r0 + f0) / 2 + (d.sR - d.sF) * 0.2); g.add(bpil);
    const mir = box(0.16, 0.09, 0.12, paint); mir.position.set(sx * (W / 2 + 0.06), yT + 0.1, f0 - 0.15); g.add(mir);
    const sill = box(0.04, 0.08, L * 0.5, trim); sill.position.set(sx * (W / 2 + 0.01), by + 0.12, (r0 + f0) / 2); g.add(sill);
    const handle = box(0.03, 0.03, 0.14, chrome); handle.position.set(sx * (W / 2 + 0.02), yT - 0.12, d.cZ + 0.2); g.add(handle);
    const line = box(0.012, d.H * 0.6, 0.012, dark); line.position.set(sx * (W / 2 + 0.005), yb + d.H * 0.55, d.cZ - (d.bed ? 0.2 : 0.05)); g.add(line);
  });
  // pikap kasası
  if (d.bed) {
    const bedL = L / 2 + r0 - 0.15;
    const floor = box(W * 0.84, 0.04, bedL, dark); floor.position.set(0, yT + 0.02, -L / 2 + bedL / 2 + 0.08); g.add(floor);
    [-1, 1].forEach(sx => { const w = box(0.07, 0.34, bedL, paint); w.position.set(sx * (W / 2 - 0.04), yT + 0.17, -L / 2 + bedL / 2 + 0.08); g.add(w); });
    const tg = box(W - 0.02, 0.34, 0.07, paint); tg.position.set(0, yT + 0.17, -L / 2 + 0.06); g.add(tg);
  }
  // ızgara, tamponlar, plaka, farlar
  const grille = box(W * 0.5, 0.14, 0.04, trim); grille.position.set(0, yb + d.H * 0.55, L / 2 + 0.005); g.add(grille);
  const dmg = car.faults || [], hitB = dmg.includes('bumper'), hitL = dmg.includes('headlight');
  const fb = box(W + 0.04, 0.16, 0.14, umat(0x15181b, { roughness: 0.8 })); fb.position.set(0, by + 0.14, L / 2 - 0.02); g.add(fb);
  if (hitB) { fb.rotation.z = 0.09; fb.rotation.y = 0.05; fb.position.y -= 0.04; addScratches(g, W, L, yb, d.H); }
  const rb = box(W + 0.04, 0.16, 0.14, dark); rb.position.set(0, by + 0.14, -L / 2 + 0.02); g.add(rb);
  const plateM = new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.6 });
  [L / 2 + 0.08, -L / 2 - 0.08].forEach(z => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.1), plateM); p.position.set(0, by + 0.16, z); if (z < 0) p.rotation.y = Math.PI; g.add(p); });
  const hl = mods.includes('led') ? new THREE.MeshStandardMaterial({ color: 0xeaf4ff, emissive: 0xcfe6ff, emissiveIntensity: 1.2, roughness: 0.1 }) : new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0.5, roughness: 0.2 });
  const tl = new THREE.MeshStandardMaterial({ color: 0xc21d1d, emissive: 0x900f0f, emissiveIntensity: 0.7 });
  [-1, 1].forEach(sx => {
    const h = box(W * 0.2, 0.09, 0.06, hitL && sx < 0 ? cmat(0x3a3e44, { roughness: 0.9 }) : hl); h.position.set(sx * W * 0.34, yT - 0.16, L / 2 - 0.01); if (hitL && sx < 0) h.rotation.z = 0.15; g.add(h);
    const t = box(W * 0.18, 0.1, 0.06, tl); t.position.set(sx * W * 0.36, yT - 0.14, -L / 2 + 0.01); g.add(t);
  });
  // kaput (ayrı, menteşeli)
  const hoodLen = Math.max(0.6, L / 2 - f0 - 0.08);
  const hoodPivot = new THREE.Group(); hoodPivot.position.set(0, yT + 0.005, f0 + 0.02); g.add(hoodPivot);
  const hood = box(W * 0.9, 0.04, hoodLen, paint); hood.position.set(0, 0.02, hoodLen / 2); hoodPivot.add(hood);
  const ridge = box(W * 0.3, 0.02, hoodLen * 0.8, paint); ridge.position.set(0, 0.045, hoodLen * 0.45); hoodPivot.add(ridge);
  // motor bölmesi boşluğu (koyu taban)
  const bayFloor = box(W * 0.86, 0.02, hoodLen - 0.04, dark); bayFloor.position.set(0, yT - 0.005, f0 + hoodLen / 2 + 0.02); bayFloor.castShadow = false; g.add(bayFloor);

  const wheels = addWheels(g, d, W, wz, mods.includes('rims') ? cmat(0x1a1a1a, { metalness: 0.9, roughness: 0.25 }) : chrome);
  if (mods.includes('rims')) wheels.forEach(w => { const lip = cyl(d.r * 0.66, d.r * 0.66, 0.02, 18, cmat(0xd6a01d, { metalness: 0.9, roughness: 0.2 })); lip.rotation.z = Math.PI / 2; lip.position.x = Math.sign(w.position.x) * 0.142; w.add(lip); });
  if (mods.includes('spoiler') && !d.bed) {
    const sp = box(W * 0.8, 0.04, 0.28, paint); sp.position.set(0, top - (d.sR > 0.3 ? 0.25 : 0.02) + 0.12, -L / 2 + (d.sR > 0.3 ? 0.25 : 0.55)); sp.rotation.x = -0.12; g.add(sp);
    [-1, 1].forEach(sx => { const st = box(0.04, 0.12, 0.08, trim); st.position.set(sx * W * 0.3, sp.position.y - 0.07, sp.position.z); g.add(st); });
  }
  if (mods.includes('exhaust')) [-1, 1].forEach(sx => { const tip = cyl(0.055, 0.055, 0.18, 12, chrome); tip.rotation.x = Math.PI / 2; tip.position.set(sx * W * 0.28, by + 0.08, -L / 2 - 0.05); g.add(tip); });
  const info = { L, W, yb, yT, wz, f0, hoodLen, r: d.r };
  const comps = addEngineBay(g, info);
  Object.assign(comps, addUnderbody(g, info));
  comps.tires = wheels[0]; wheels.forEach(w => w.traverse(o => o.userData.comp = 'tires'));
  comps.body = fb; fb.userData.comp = 'body';
  return finishCar(g, car, { hoodPivot, wheels, comps, h: top, info });
}

function addWheels(g, d, W, wz, rimMat) {
  const tireM = umat(0x131313, { roughness: 0.92, metalness: 0 });
  const hubM = cmat(0x3a3e43, { metalness: 0.6, roughness: 0.4 });
  const wheels = [];
  [[-1, wz], [1, wz], [-1, -wz], [1, -wz]].forEach(([sx, z]) => {
    const w = new THREE.Group();
    const tire = cyl(d.r, d.r, 0.26, 20, tireM); tire.rotation.z = Math.PI / 2; w.add(tire);
    const side = cyl(d.r * 0.92, d.r * 0.92, 0.27, 20, cmat(0x1d1d1d, { roughness: 0.85 })); side.rotation.z = Math.PI / 2; w.add(side);
    const rim = cyl(d.r * 0.62, d.r * 0.62, 0.28, 16, rimMat); rim.rotation.z = Math.PI / 2; w.add(rim);
    const hub = cyl(d.r * 0.18, d.r * 0.18, 0.3, 8, hubM); hub.rotation.z = Math.PI / 2; w.add(hub);
    for (let i = 0; i < 5; i++) {
      const sp = box(0.02, d.r * 1.1, 0.06, hubM); sp.rotation.x = i * Math.PI / 5; sp.position.x = sx * 0.145; w.add(sp);
    }
    w.position.set(sx * (W / 2 - 0.1), d.r, z); g.add(w); wheels.push(w);
  });
  return wheels;
}

// ---------- motor bölmesi (kaput altı) ----------
function addEngineBay(g, I) {
  const { W, yT, f0, hoodLen: hl } = I;
  const bay = new THREE.Group(); bay.position.set(0, yT, f0); g.add(bay);
  const z = t => t * hl, comps = {};
  const metal = cmat(0x6a6f75, { metalness: 0.7, roughness: 0.35 });
  const block = box(W * 0.42, 0.16, hl * 0.5, metal); block.position.set(0, 0.08, z(0.45)); bay.add(block);
  const head = box(W * 0.38, 0.06, hl * 0.46, cmat(0x2b2f34, { metalness: 0.4 })); head.position.set(0, 0.19, z(0.45)); bay.add(head);
  const add = (id, obj) => { obj.userData.comp = id; obj.traverse(o => o.userData.comp = id); bay.add(obj); comps[id] = obj; return obj; };
  // bujiler & bobinler
  const ign = new THREE.Group(); ign.position.set(-0.06, 0.24, z(0.45));
  for (let i = 0; i < 4; i++) { const c = cyl(0.035, 0.035, 0.08, 8, umat(0x1b1d20)); c.position.z = (i - 1.5) * hl * 0.1; ign.add(c); const t = box(0.07, 0.03, 0.05, umat(0x8a2a22)); t.position.set(0, 0.05, (i - 1.5) * hl * 0.1); ign.add(t); }
  add('ignition', ign);
  const fr = box(0.04, 0.03, hl * 0.42, umat(0xb9bec4, { metalness: 0.8 })); fr.position.set(0.1, 0.24, z(0.45)); add('fuelrail', fr);
  const oc = cyl(0.045, 0.045, 0.05, 12, umat(0xe0b020)); oc.position.set(W * 0.12, 0.25, z(0.62)); add('oilcap', oc);
  const tm = box(0.04, 0.2, hl * 0.4, umat(0x1d2024)); tm.position.set(-W * 0.24, 0.1, z(0.45)); add('timing', tm);
  // akü
  const bat = new THREE.Group(); bat.position.set(W * 0.31, 0.09, z(0.25));
  bat.add(box(0.26, 0.16, 0.2, umat(0x22262b)));
  const tp = cyl(0.02, 0.02, 0.04, 6, umat(0xc0392b)); tp.position.set(0.07, 0.09, 0.05); bat.add(tp);
  const tn = cyl(0.02, 0.02, 0.04, 6, umat(0x1b1d20)); tn.position.set(-0.07, 0.09, 0.05); bat.add(tn);
  add('battery', bat);
  const alt = cyl(0.07, 0.07, 0.1, 12, umat(0xaeb3b8, { metalness: 0.7 })); alt.rotation.z = Math.PI / 2; alt.position.set(-W * 0.32, 0.08, z(0.72)); add('alternator', alt);
  const st = cyl(0.045, 0.045, 0.16, 10, umat(0x3c4046, { metalness: 0.5 })); st.rotation.x = Math.PI / 2; st.position.set(W * 0.2, 0.03, z(0.1)); add('starter', st);
  const wp = cyl(0.055, 0.055, 0.05, 10, umat(0x7d8288, { metalness: 0.6 })); wp.rotation.z = Math.PI / 2; wp.position.set(-W * 0.2, 0.06, z(0.82)); add('water_pump', wp);
  const ac = cyl(0.06, 0.06, 0.12, 12, umat(0x9aa0a6, { metalness: 0.7 })); ac.rotation.z = Math.PI / 2; ac.position.set(W * 0.28, 0.05, z(0.75)); add('ac', ac);
  // radyatör + genleşme kabı
  const cool = new THREE.Group();
  const rad = box(W * 0.72, 0.22, 0.05, umat(0x2f3338, { metalness: 0.3 })); rad.position.set(0, 0.06, z(0.95)); cool.add(rad);
  const res = cyl(0.06, 0.06, 0.12, 10, umat(0xe8f0f2, { transparent: true, opacity: 0.85 })); res.position.set(-W * 0.3, 0.1, z(0.3)); cool.add(res);
  const cap = cyl(0.04, 0.04, 0.02, 10, umat(0x2c5a99)); cap.position.set(-W * 0.3, 0.17, z(0.3)); cool.add(cap);
  add('cooling', cool);
  bay.visible = false;
  g.userData.engineBay = bay;
  return comps;
}

// ---------- alt takım ----------
function addUnderbody(g, I) {
  const { W, yb, f0, hoodLen: hl, L, wz, r } = I;
  const comps = {}, ub = new THREE.Group(); g.add(ub);
  const add = (id, obj) => { obj.traverse(o => o.userData.comp = id); ub.add(obj); comps[id] = obj; return obj; };
  const floor = box(W * 0.9, 0.03, L * 0.86, cmat(0x24272b, { roughness: 0.9 })); floor.position.set(0, yb + 0.02, 0); ub.add(floor);
  const op = box(W * 0.32, 0.1, 0.42, umat(0x3a3e44, { metalness: 0.5 })); op.position.set(0, yb - 0.04, f0 + hl * 0.45); add('oilpan', op);
  const gb = box(0.34, 0.2, 0.55, umat(0x6c7178, { metalness: 0.6 })); gb.position.set(W * 0.13, yb - 0.02, f0 - 0.1); add('gearbox', gb);
  const mt = box(0.14, 0.1, 0.14, umat(0x111214)); mt.position.set(-W * 0.24, yb - 0.02, f0 + hl * 0.5); add('mount', mt);
  const ex = new THREE.Group();
  const pipe = cyl(0.035, 0.035, L * 0.75, 8, umat(0x8a8f95, { metalness: 0.8 })); pipe.rotation.x = Math.PI / 2; pipe.position.set(-W * 0.2, yb - 0.04, -L * 0.1); ex.add(pipe);
  const cat = cyl(0.08, 0.08, 0.38, 10, umat(0xb4b8bd, { metalness: 0.8 })); cat.rotation.x = Math.PI / 2; cat.position.set(-W * 0.2, yb - 0.05, f0 - 0.55); ex.add(cat);
  const muff = cyl(0.11, 0.11, 0.45, 10, umat(0x7a7f85, { metalness: 0.7 })); muff.rotation.x = Math.PI / 2; muff.position.set(-W * 0.2, yb - 0.05, -L / 2 + 0.5); ex.add(muff);
  add('exhaust', ex);
  const tk = box(W * 0.55, 0.12, 0.55, umat(0x2b2f35)); tk.position.set(W * 0.05, yb - 0.03, -wz + 0.55); add('tank', tk);
  const br = new THREE.Group(), sh = new THREE.Group(), stg = new THREE.Group();
  [-1, 1].forEach(sx => {
    const disc = cyl(r * 0.72, r * 0.72, 0.03, 18, umat(0x9da2a8, { metalness: 0.8, roughness: 0.3 })); disc.rotation.z = Math.PI / 2; disc.position.set(sx * (W / 2 - 0.26), r, wz); br.add(disc);
    const cal = box(0.07, 0.12, 0.16, umat(0xb8322a)); cal.position.set(sx * (W / 2 - 0.27), r + r * 0.5, wz - 0.05); br.add(cal);
    const shock = cyl(0.04, 0.04, 0.42, 8, umat(0xe08a20)); shock.position.set(sx * (W / 2 - 0.38), r + 0.12, wz - 0.12); shock.rotation.z = sx * 0.15; sh.add(shock);
    const spring = cyl(0.075, 0.075, 0.2, 10, umat(0x2c5a99, { wireframe: true })); spring.position.set(sx * (W / 2 - 0.39), r + 0.2, wz - 0.12); sh.add(spring);
    const rod = cyl(0.018, 0.018, W * 0.36, 6, umat(0x55595e, { metalness: 0.7 })); rod.rotation.z = Math.PI / 2; rod.position.set(sx * W * 0.2, r * 0.85, wz + 0.16); stg.add(rod);
  });
  const rack = cyl(0.03, 0.03, W * 0.3, 8, umat(0x3c4046)); rack.rotation.z = Math.PI / 2; rack.position.set(0, r * 0.85, wz + 0.16); stg.add(rack);
  add('brake', br); add('shock', sh); add('steering', stg);
  return comps;
}

function finishCar(g, car, ud) {
  if (!car.clean) {
    const I = ud.info;
    [-1, 1].forEach(sx => { const dirt = new THREE.Mesh(new THREE.PlaneGeometry(I.L * 0.9, 0.22), new THREE.MeshBasicMaterial({ color: 0x5c4a35, transparent: true, opacity: 0.45, depthWrite: false }));
      dirt.rotation.y = sx * Math.PI / 2; dirt.position.set(sx * (I.W / 2 + 0.07), I.yb + 0.16, 0); g.add(dirt); });
  }
  g.traverse(o => { o.userData.carId = car.id; });
  Object.assign(g.userData, ud, { carId: car.id, hoodT: 0, y: 0, tY: 0 });
  return g;
}

// ---------- klasik (ilk sürüm) kutu model ----------
function buildCarClassic(car) {
  const d = CAR_DIM[MODELS[car.model].type];
  const g = new THREE.Group();
  const body = umat(car.color, { metalness: 0.35, roughness: 0.55 - car.paint / 400, flatShading: true });
  const glass = cmat(0x2a3a4a, { metalness: 0.6, roughness: 0.15, flatShading: true });
  const dark = cmat(0x16191c);
  const yb = d.r * 0.55, yT = yb + d.H, L = d.L, W = d.W;
  const b = box(W, d.H, L, body); b.position.y = yb + d.H / 2; g.add(b);
  let fb;
  [L / 2, -L / 2].forEach(z => { const bp = box(W + 0.04, 0.18, 0.12, umat(0x16191c)); bp.position.set(0, yb + 0.12, z); g.add(bp); if (z > 0) fb = bp; });
  if ((car.faults || []).includes('bumper')) { fb.rotation.z = 0.09; fb.position.y -= 0.04; }
  const cg = new THREE.BoxGeometry(W * 0.92, d.cH, d.cL);
  const pos = cg.attributes.position;
  for (let k = 0; k < pos.count; k++) if (pos.getY(k) > 0) { pos.setX(k, pos.getX(k) * 0.86); pos.setZ(k, pos.getZ(k) * (d.bed ? 0.85 : 0.72) + (d.bed ? -0.05 : -0.08)); }
  cg.computeVertexNormals();
  const cab = new THREE.Mesh(cg, glass); cab.position.set(0, yT + d.cH / 2, d.cZ); cab.castShadow = true; g.add(cab);
  const f0 = d.cZ + d.cL / 2;
  const hoodLen = Math.max(0.6, L / 2 - f0 - 0.05);
  const hoodPivot = new THREE.Group(); hoodPivot.position.set(0, yT + 0.01, f0 + 0.02); g.add(hoodPivot);
  const hood = box(W * 0.96, 0.05, hoodLen, body); hood.position.z = hoodLen / 2; hoodPivot.add(hood);
  const hl = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.5 });
  const tl = new THREE.MeshStandardMaterial({ color: 0xc81e1e, emissive: 0x8a0f0f, emissiveIntensity: 0.6 });
  [-1, 1].forEach(sx => {
    const h = box(0.34, 0.12, 0.05, hl); h.position.set(sx * (W / 2 - 0.25), yb + d.H * 0.7, L / 2 + 0.01); g.add(h);
    const t = box(0.3, 0.12, 0.05, tl); t.position.set(sx * (W / 2 - 0.22), yb + d.H * 0.7, -L / 2 - 0.01); g.add(t);
  });
  const wz = L / 2 - (L > 4.8 ? 0.95 : 0.78);
  const wheels = addWheels(g, d, W, wz, cmat(0xb9bec4, { metalness: 0.7, roughness: 0.3 }));
  const info = { L, W, yb, yT, wz, f0, hoodLen, r: d.r };
  const comps = addEngineBay(g, info);
  Object.assign(comps, addUnderbody(g, info));
  comps.tires = wheels[0]; wheels.forEach(w => w.traverse(o => o.userData.comp = 'tires'));
  comps.body = fb; fb.userData.comp = 'body';
  return finishCar(g, car, { hoodPivot, wheels, comps, h: yT + d.cH, info });
}

function addScratches(g, W, L, yb, H) {
  const m = new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + Math.random() * 0.4, 0.025), m);
    s.position.set(-(W / 2 + 0.071), yb + H * (0.3 + Math.random() * 0.4), L / 2 - 0.4 - Math.random() * 0.5);
    s.rotation.set(0, -Math.PI / 2, (Math.random() - 0.5) * 0.4); g.add(s);
  }
  const dent = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  dent.position.set(-(W / 2 + 0.072), yb + H * 0.55, L / 2 - 0.6); dent.rotation.y = -Math.PI / 2; dent.scale.set(1, 0.6, 1); g.add(dent);
}
