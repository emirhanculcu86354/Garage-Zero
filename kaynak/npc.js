// ================= GARAGE ZERO — İNSANLAR =================
const SKIN = [0xe8c3a0, 0xd6a77f, 0xb5835a, 0x8d5a3b, 0xf1d2b6];
const HAIR = [0x2a1d14, 0x4a3020, 0x111111, 0x7a5a3a, 0x9a9a9a, 0xc9a06a];
const SHIRTS = [0x3d6fb0, 0xb8322a, 0x3a7650, 0xd6a01d, 0x6b2f4a, 0xe6e2d8, 0x2a8a8f, 0x8c5a3c, 0x555b64];
const PANTS = [0x2b3a55, 0x23262b, 0x5a4a3a, 0x3b3f46, 0x6e7b8c];

function makePerson(o = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = cmat(o.skin != null ? o.skin : pick(SKIN), { roughness: 0.8 });
  const shirt = cmat(o.shirt != null ? o.shirt : pick(SHIRTS), { roughness: 0.85 });
  const pants = cmat(o.pants != null ? o.pants : pick(PANTS), { roughness: 0.9 });
  const shoe = cmat(0x1a1a1a);
  const legs = [], arms = [];
  [-1, 1].forEach(sx => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.92, 0); body.add(hip);
    const leg = box(0.15, 0.86, 0.17, pants); leg.position.y = -0.43; hip.add(leg);
    const sh = box(0.16, 0.08, 0.26, shoe); sh.position.set(0, -0.88, 0.04); hip.add(sh);
    legs.push(hip);
    const sp = new THREE.Group(); sp.position.set(sx * 0.27, 1.5, 0); body.add(sp);
    const arm = box(0.11, 0.6, 0.13, o.overalls ? shirt : shirt); arm.position.y = -0.3; sp.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin); hand.position.y = -0.63; sp.add(hand);
    arms.push(sp);
  });
  const torso = box(0.44, 0.62, 0.25, shirt); torso.position.y = 1.24; body.add(torso);
  if (o.overalls) { const bib = box(0.3, 0.3, 0.26, pants); bib.position.y = 1.08; body.add(bib); }
  const neck = box(0.1, 0.08, 0.1, skin); neck.position.y = 1.59; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skin); head.position.y = 1.74; head.castShadow = true; body.add(head);
  const hairM = cmat(o.hair != null ? o.hair : pick(HAIR));
  if (o.cap) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cmat(o.cap)); cap.position.y = 1.77; body.add(cap);
    const brim = box(0.2, 0.02, 0.12, cmat(o.cap)); brim.position.set(0, 1.79, 0.15); body.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), hairM); hair.position.y = 1.76; hair.rotation.x = -0.25; body.add(hair);
  }
  let tool = null;
  if (o.tool === 'broom') {
    tool = new THREE.Group();
    const stick = cyl(0.015, 0.015, 1.3, 6, cmat(0x9a6b3c)); stick.position.y = -0.35; tool.add(stick);
    const brush = box(0.35, 0.1, 0.08, cmat(0xd6a01d)); brush.position.y = -1.0; tool.add(brush);
    tool.position.set(0, -0.6, 0.05); tool.rotation.x = 0.5; arms[1].add(tool);
  }
  if (o.tool === 'clip') { tool = box(0.2, 0.26, 0.02, cmat(0xe6e2d8)); tool.position.set(0, -0.62, 0.08); arms[0].add(tool); }
  root.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return { root, body, legs, arms, tool };
}

const NPCS = [];
class NPC {
  constructor(opts) {
    Object.assign(this, { speed: 1.5, path: [], state: 'idle', t: Math.random() * 10, phase: 0, cb: null, faceTo: null });
    this.p = makePerson(opts); this.root = this.p.root; this.kind = opts.kind || 'person';
    this.root.position.set(opts.x || 0, 0, opts.z || 0);
    G.scene.add(this.root); NPCS.push(this);
  }
  go(points, cb, speed) { this.path = points.map(p => new THREE.Vector3(p[0], 0, p[1])); this.cb = cb || null; if (speed) this.speed = speed; this.state = 'walk'; this.sitting = false; }
  face(x, z) { this.faceTo = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  remove() { G.scene.remove(this.root); const i = NPCS.indexOf(this); if (i >= 0) NPCS.splice(i, 1); this.dead = true; }
  update(dt) {
    this.t += dt;
    const P = this.p, pos = this.root.position;
    if (this.path.length) {
      const tgt = this.path[0], dx = tgt.x - pos.x, dz = tgt.z - pos.z, dist = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (dist <= step) { pos.x = tgt.x; pos.z = tgt.z; this.path.shift(); if (!this.path.length) { this.state = this.nextState || 'idle'; this.nextState = null; const cb = this.cb; this.cb = null; cb && cb(this); } }
      else { pos.x += dx / dist * step; pos.z += dz / dist * step; this.heading(Math.atan2(dx, dz), dt * 10); }
      this.phase += dt * this.speed * 5.2;
      const sw = Math.sin(this.phase);
      P.legs[0].rotation.x = sw * 0.6; P.legs[1].rotation.x = -sw * 0.6;
      P.arms[0].rotation.x = -sw * 0.5; P.arms[1].rotation.x = this.p.tool && this.kind === 'sweeper' ? 0.2 : sw * 0.5;
      P.arms[0].rotation.z = 0; P.arms[1].rotation.z = 0;
      P.body.position.y = Math.abs(Math.cos(this.phase)) * 0.04; P.body.rotation.x = 0;
      return;
    }
    if (this.faceTo != null) this.heading(this.faceTo, dt * 6);
    const t = this.t;
    P.legs[0].rotation.x *= 0.85; P.legs[1].rotation.x *= 0.85; P.body.position.y *= 0.8;
    switch (this.state) {
      case 'sweep':
        P.arms[0].rotation.x = -0.7 + Math.sin(t * 5) * 0.35; P.arms[1].rotation.x = -0.5 + Math.sin(t * 5) * 0.35;
        P.body.rotation.y = Math.sin(t * 5) * 0.15; P.body.rotation.x = 0.15; break;
      case 'work':
        P.arms[0].rotation.x = -1.1 + Math.sin(t * 9) * 0.2; P.arms[1].rotation.x = -1.0 + Math.cos(t * 7) * 0.25;
        P.body.rotation.x = 0.35; P.body.rotation.y = 0; break;
      case 'workUp':
        P.arms[0].rotation.x = -2.9 + Math.sin(t * 8) * 0.15; P.arms[1].rotation.x = -2.8 + Math.cos(t * 6) * 0.2;
        P.body.rotation.x = -0.1; break;
      case 'talk':
        P.arms[0].rotation.x = -0.2; P.arms[1].rotation.x = -0.7 + Math.sin(t * 3) * 0.3; P.arms[1].rotation.z = -0.2;
        P.body.rotation.x = 0; P.body.rotation.y = Math.sin(t * 1.3) * 0.08; break;
      case 'inspect':
        P.arms[0].rotation.x = -0.3; P.arms[1].rotation.x = -0.3; P.body.rotation.x = 0.45 + Math.sin(t * 1.5) * 0.1; break;
      case 'sit':
        P.legs[0].rotation.x = P.legs[1].rotation.x = -1.5; P.body.position.y = -0.42; P.arms[0].rotation.x = P.arms[1].rotation.x = -0.6; P.body.rotation.x = 0; break;
      default:
        P.arms[0].rotation.x *= 0.85; P.arms[1].rotation.x *= 0.85; P.arms[1].rotation.z *= 0.8; P.body.rotation.x *= 0.8; P.body.rotation.y *= 0.8;
        P.body.scale.y = 1 + Math.sin(t * 2) * 0.006;
    }
  }
  heading(a, k) {
    let cur = this.root.rotation.y, d = a - cur;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y = cur + d * Math.min(1, k);
  }
}

// ---------- dükkân çalışanları (görsel) ----------
const STAFF = { sweeper: null };
const WNPC = {};   // personel id → NPC
const SWEEP_PTS = [[-11, 3.5], [-5, 4], [0, 4.2], [6, 4], [11.5, 3.5], [11.5, -5.8], [4, -5.5], [-4, -5.6], [-11.5, -5.8]];

function initStaff() {
  STAFF.sweeper = new NPC({ x: -11, z: 3.5, shirt: 0x5a6470, pants: 0x3b3f46, overalls: true, tool: 'broom', kind: 'sweeper', speed: 0.8 });
  sweepNext(0);
}
function sweepNext(i) {
  const s = STAFF.sweeper; if (!s || s.dead) return;
  const p = SWEEP_PTS[i % SWEEP_PTS.length];
  s.speed = 0.7;
  s.go([[p[0] + rnd(-0.6, 0.6), p[1] + rnd(-0.4, 0.4)]], () => { s.state = 'sweep'; setTimeout(() => sweepNext(i + 1), 3500 + Math.random() * 3000); });
}
// personel listesindeki herkes için NPC oluştur / kaldır
function syncWorkers() {
  if (!S || !G.scene) return;
  const ids = new Set(S.staff.map(w => w.id));
  Object.keys(WNPC).forEach(id => { if (!ids.has(id)) { WNPC[id].remove(); delete WNPC[id]; } });
  S.staff.forEach(w => {
    if (WNPC[w.id]) return;
    const home = workerHome(w);
    const usta = w.role === 'usta';
    const C = S.custom || DEFAULT_CUSTOM, suit = usta ? C.ustaSuit : C.cirakSuit;
    const n = new NPC({ x: home[0], z: home[1], shirt: suit, pants: suit, overalls: true, cap: usta ? C.ustaCap : C.cirakSuit, kind: w.role });
    n.state = 'idle'; WNPC[w.id] = n;
  });
}
function workerHome(w) {
  if (w.bay != null && (w.bay < S.bays || (w.bay >= 4 && S.truckHall))) { const p = bayPos(w.bay); return [p.x + (w.role === 'usta' ? (w.bay >= 4 ? 2.4 : 2.2) : -2.2), p.z + (w.bay >= 4 ? 4.6 : 2.4)]; }
  const i = S.staff.indexOf(w);
  return [-1 + (i % 5) * 1.1, -5.6];
}
function workerGoHome(w) {
  const n = WNPC[w.id]; if (!n) return;
  n.root.visible = true; n.speed = 1.7;
  const h = workerHome(w);
  n.go(walkPath(n.root.position, h), () => { n.face(h[0], -8); n.state = w.bay != null ? 'idle' : 'work'; });
}

// dükkân duvarlarından geçmeden yürüme yolu (kapılar x = -9,-3,3,9)
function walkPath(cur, pos) {
  const inside = (x, z) => z < 5.4 && x > -13 && x < 13;
  const a = inside(cur.x, cur.z), b = inside(pos[0], pos[1]);
  const door = x => [-9, -3, 3, 9].reduce((p, d) => Math.abs(d - x) < Math.abs(p - x) ? d : p, -9);
  const path = [];
  if (a && !b) {
    const d = door(cur.x); path.push([d, 4.4], [d, 7]);
    if (pos[0] > 13.5 || pos[0] < -13.5) path.push([pos[0] > 0 ? 14.4 : -14.4, 9.8]);
  } else if (!a && b) {
    const d = door(pos[0]);
    if (cur.x > 13.5 || cur.x < -13.5) path.push([cur.x > 0 ? 14.4 : -14.4, 9.8]);
    path.push([d, 7], [d, 4.4]);
  }
  path.push([pos[0], pos[1]]);
  return path;
}

// ---------- şehir yayaları ----------
function spawnPedestrians(n) {
  for (let i = 0; i < n; i++) {
    const p = new NPC({ x: rnd(-60, 60), z: Math.random() < 0.5 ? 19.6 : 11.2, speed: rnd(1.1, 1.6) });
    const loop = () => { const z = p.root.position.z; const tx = p.root.position.x > 0 ? -62 : 62; p.go([[tx, z]], () => { p.root.position.x = -tx; loop(); }); };
    loop();
  }
}

function rebuildWorkers() { Object.keys(WNPC).forEach(id => { WNPC[id].remove(); delete WNPC[id]; }); syncWorkers(); S.staff.forEach(w => { const n = WNPC[w.id], h = workerHome(w); if (n) { n.root.position.set(h[0], 0, h[1]); n.face(h[0], -8); } }); }
