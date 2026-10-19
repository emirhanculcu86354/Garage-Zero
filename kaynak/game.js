// ================= GARAGE ZERO — OYUN MANTIĞI =================
let S = null;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const round1k = v => Math.round(v / 1000) * 1000;
const fmt = n => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('tr-TR') + ' ₺';
const clock = m => { const t = 8 * 60 + Math.floor(m); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

function lvl() { return Math.min(10, 1 + Math.floor(S.xp / 400)); }
function cfg(k) { const v = S && S.cfg && S.cfg[k]; return v == null ? (k === 'dayLen' ? 10 : 1) : v; }
function dayMinutes() { return Math.round(cfg('dayLen') * 60); }
function partPrice(f) { return Math.round(FAULTS[f].cost * cfg('parts')); }
function minutesLeft() { return Math.max(0, Math.floor(dayMinutes() - S.minute)); }
function laborTime(f) { return Math.round(FAULTS[f].labor * (S.up.impact ? 0.7 : 1) * (f === 'tires' && S.up.tireMachine ? 0.5 : 1) * (FAULTS[f].comp === 'body' && S.up.bodyShop ? 0.6 : 1)); }
function repairCost(f) { return FAULTS[f].cost + FAULTS[f].labor / 60 * LABOR_RATE; }
function carById(id) { return S.cars.find(c => c.id === id); }
function jobById(id) { return S.jobs.find(c => c.id === id); }
function staffById(id) { return S.staff.find(w => w.id === id); }
function uid() { return 'c' + (S.idc++); }
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function wname(w) { if (w.id === 'me') return 'Sen'; return w.role === 'usta' ? `${w.name} Usta` : `Çırak ${w.name}`; }

function carValue(c, withFaults = true) {
  const m = MODELS[c.model], age = YEAR - c.year;
  let v = m.base * Math.pow(0.95, age) * Math.max(0.6, 1 - c.km / 900000);
  v *= 0.82 + 0.18 * c.paint / 100;
  if (!c.clean) v *= 0.97;
  v *= carModValue(c);
  if (POPULAR_COLORS.includes(c.color)) v *= 1.03; else if ([0xd6a01d, 0x6b2f4a, 0xb85c1e].includes(c.color)) v *= 0.97;
  if (withFaults) v -= c.faults.reduce((s, f) => s + repairCost(f) * 1.4, 0);
  return Math.max(m.base * 0.12, v);
}
function addMoney(n, label, inv) {
  S.cash += n;
  if (inv) S.today.inv = (S.today.inv || 0) - n;
  else if (n >= 0) S.today.inc += n; else S.today.exp += -n;
  if (label) S.today.ev.push({ t: label, n });
}
function log(t, kind = '') { S.log.unshift({ d: S.day, m: Math.floor(S.minute), t, kind }); S.log.length = Math.min(S.log.length, 80); }
function addXP(n) { const b = lvl(); S.xp += n; if (lvl() > b) { UI.toast(`Seviye ${lvl()}! Daha zor arızalar ve pahalı araçlar açıldı.`, 'ok'); log(`Seviye ${lvl()} oldun.`, 'ok'); } }
function addRep(n) { S.rep = Math.max(0, Math.min(100, S.rep + n)); }
function pay(n) { if (S.cash < n) { UI.toast(`Yeterli paran yok (${fmt(n)} gerekli).`, 'bad'); return false; } return true; }

// ---------- araç üretimi ----------
function genCar(L, nFaults, truck) {
  const models = Object.keys(MODELS).filter(k => MODELS[k].lvl <= Math.max(1, L) && !!MODELS[k].truck === !!truck);
  const age = ri(2, 17);
  const c = {
    id: uid(), model: pick(models), color: pick(CAR_COLORS), year: YEAR - age, km: round1k(age * ri(9000, 24000)),
    paint: ri(40, 100), clean: Math.random() < 0.45, faults: [], fixed: [], wasted: [], sym: [], hints: [],
    owner: 'me', bay: null, lot: null, apron: null, lifted: false, hoodOpen: false, findings: {}, known: null,
    buy: 0, spent: 0, listed: null, out: null,
  };
  const pool = shuffle(Object.keys(FAULTS).filter(f => f !== 'maintenance' && FAULTS[f].lvl <= L));
  const used = new Set();
  for (const f of pool) { if (c.faults.length >= nFaults) break; if (used.has(FAULTS[f].comp)) continue; used.add(FAULTS[f].comp); c.faults.push(f); }
  return c;
}
function symptomsOf(c) {
  const s = new Set();
  c.faults.forEach(f => { const l = shuffle(FAULTS[f].sym.slice()); s.add(l[0]); if (l[1] && Math.random() < 0.55) s.add(l[1]); });
  return [...s];
}
function genJob(truck) {
  const L = lvl(); let c;
  if (truck) { c = genCar(Math.max(2, L), Math.random() < 0.5 ? 1 : 2, true); c.truck = true; c.owner = 'customer'; c.mods = []; c.modReq = []; c.sym = symptomsOf(c); c.clean = Math.random() < 0.3; c.cust = { name: pick(['Mehmet Şoför', 'Kaya Nakliyat', 'Demir Lojistik', 'Ali Kaptan', 'Güney Taşımacılık']), deadline: S.day + ri(0, 1) }; return c; }
  const r = Math.random();
  if (r < 0.2) { c = genCar(L, 0); c.faults = ['maintenance']; if (Math.random() < 0.3) { const x = genCar(L, 1); if (x.faults[0] && FAULTS[x.faults[0]].comp !== 'oilcap') c.faults.push(x.faults[0]); } }
  else if (r < 0.3) { c = genCar(L, 0); c.faults = ['tires']; }
  else if (r < 0.38 + (S.up.bodyShop ? 0.08 : 0)) { c = genCar(L, 0); c.faults = [Math.random() < 0.6 ? 'bumper' : 'headlight']; if (Math.random() < 0.3) c.faults = ['bumper', 'headlight']; }
  else c = genCar(L, Math.random() < Math.max(0.15, 1 - 0.4 * cfg('faults')) ? 1 : ri(1, Math.min(4, (L >= 4 ? 3 : L >= 2 ? 2 : 1) + (cfg('faults') >= 1.5 ? 1 : 0))));
  const Wx = WEATHER[S.weather || 'sunny'];
  if (Wx.boost.length && Math.random() < 0.45) { const bf = pick(Wx.boost.filter(f => FAULTS[f].lvl <= L)); if (bf && !c.faults.some(f => FAULTS[f].comp === FAULTS[bf].comp)) c.faults[0] = bf; }
  // modifiye talebi
  c.modReq = []; c.mods = c.mods || [];
  if (Math.random() < 0.12) { c.faults = []; c.modReq = shuffle(Object.keys(MODS)).slice(0, ri(1, 2)); }
  else if (Math.random() < 0.08) c.modReq = [pick(Object.keys(MODS))];
  c.owner = 'customer'; c.sym = symptomsOf(c).concat(c.modReq.map(k => 'mod_' + k)); c.clean = Math.random() < 0.5;
  c.cust = { name: pick(NAMES), deadline: S.day + ri(0, 2) };
  // sadık müşteri geri dönüyor
  const regs = (S.regulars || []).filter(r => r.lastDay < S.day - 1);
  if (regs.length && Math.random() < Math.min(0.35, 0.08 * regs.length)) { const r = pick(regs); c.cust.name = r.name; c.model = r.model; c.color = r.color; c.year = r.year; c.regular = true; }
  if (c.faults.some(f => TOW_FAULTS.includes(f)) && Math.random() < 0.55) { c.tow = true; c.sym.unshift('no_start'); }
  if (S.dayEvent === 'fleet' && !S.fleetSent && Math.random() < 0.5) { c.fleet = true; S.fleetSent = true; c.cust.name = pick(['Kargo A.Ş.', 'Yıldız Lojistik', 'Belediye Filo', 'Taksi Durağı']); }
  return c;
}
function genListing() {
  const r = Math.random(), n = r < 0.22 ? 0 : r < 0.62 ? 1 : r < 0.88 ? 2 : 3;
  const c = genCar(Math.min(4, lvl() + 1), n);
  c.owner = 'market';
  const lie = n > 0 && Math.random() < 0.4;
  c.sym = symptomsOf(c);
  if (n === 0) c.note = Math.random() < 0.5 ? 'Bakımlı, masrafsız araç.' : pick(SELLER_LIES);
  else if (lie) c.note = pick(SELLER_LIES);
  else c.note = c.sym.slice(0, Math.max(1, c.sym.length - 1)).map(k => SYM[k]).join(' ');
  c.ask = round1k(lie ? carValue(c, false) * rnd(0.86, 1.0) : carValue(c, true) * rnd(0.84, 1.06));
  c.listedDay = S.day; c.haggled = false;
  return c;
}
function genWorker(role, maxSkill) {
  const skill = Math.max(1, Math.min(maxSkill, ri(1, maxSkill)));
  const spec = role === 'usta' ? (Math.random() < 0.3 ? 'genel' : pick(['motor', 'elektrik', 'alt', 'kaporta', 'motor', 'alt'])) : null;
  return { id: 'w' + (S.idc++), name: pick(STAFF_NAMES), role, skill, spec, wage: wageFor(role, skill), xp: 0, jobs: 0, bay: null, queue: [], errand: null, energy: 100, morale: 70, todayJobs: 0 };
}
function refreshCandidates() {
  const top = Math.min(5, 2 + Math.floor(lvl() / 2) + Math.floor(S.rep / 40) + ((S.tier || 0) >= 3 ? 1 : 0));
  S.cands = [genWorker('usta', top), genWorker('usta', Math.max(1, top - 1)), genWorker('cirak', 3)];
}

// ---------- yeni oyun / kayıt ----------
function newGame(mode, name, conf) {
  const m = START_MODES[mode];
  conf = conf || Object.assign({}, DIFFICULTY.normal);
  S = {
    v: 3, cfg: conf, custom: Object.assign({}, DEFAULT_CUSTOM), name: (name || 'Garage Zero').trim().slice(0, 24) || 'Garage Zero', mode, cash: Math.round(m.cash * (conf.cash || 1) / 1000) * 1000, day: 1, minute: 0, rep: 30, xp: 0, speed: 1,
    bays: m.bays, lot: m.lot, tools: {}, up: {}, lic: Object.assign({}, m.lic), cars: [], jobs: [], market: [], log: [], events: [],
    staff: [], cands: [], stock: {}, errands: [], orders: [], appReq: [], appts: [],
    reviews: [], pendingReviews: [], goals: [], history: [], laborRate: 2500, adUntil: 0, warranty: [], loans: [], ach: {}, weather: 'sunny', forecast: pick(WEATHER_ORDER),
    settings: { carStyle: 'modern' }, today: { inc: 0, exp: 0, inv: 0, ev: [] }, stats: { jobs: 0, sold: 0, bought: 0, profit: 0, earned: 0 }, idc: 1,
  };
  m.tools.forEach(t => S.tools[t] = true);
  if (m.lic.servis) {
    Object.assign(S.stock, START_STOCK);
    for (let i = 0; i < m.bays; i++) { const w = genWorker('usta', 2); w.skill = i === 0 ? 2 : 1; w.wage = wageFor('usta', w.skill); w.bay = i; S.staff.push(w); }
    const c = genWorker('cirak', 1); c.bay = 0; S.staff.push(c);
  }
  [[4, 'Eski sahibi döneminden beri buraya geliyorum, iyi iş çıkarırlar.'], [4, 'Fiyatlar makul.'], [3, 'Biraz bekletiyorlar ama iş temiz.']].forEach(([st, t], i) => S.reviews.push({ id: 'v' + i, name: pick(NAMES), stars: st, text: t, day: 0, kind: 'servis', reply: null }));
  refreshCandidates(); refreshMarket(true); genGoals(); scheduleDay(true);
  log(`${S.name} kuruldu — ${m.name} olarak başladın.`, 'ok');
  save();
}
let SLOT = 1;
const slotKey = n => 'garagezero_v3_slot' + n;
function save() { try { localStorage.setItem(slotKey(SLOT), JSON.stringify(S, (k, v) => k === '_rt' ? undefined : v)); } catch (e) { } }
function loadSave(n = SLOT) { try { const r = localStorage.getItem(slotKey(n)); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function wipeSave(n = SLOT) { try { localStorage.removeItem(slotKey(n)); } catch (e) { } }
(function migrate() { try { const old = localStorage.getItem(SAVE_KEY); if (old && !localStorage.getItem(slotKey(1))) { localStorage.setItem(slotKey(1), old); } if (old) localStorage.removeItem(SAVE_KEY); } catch (e) { } })();

function refreshMarket(full) {
  S.market = full ? [] : S.market.filter(c => S.day - c.listedDay < 3);
  while (S.market.length < 4 + Math.ceil(S.lot / 2)) S.market.push(genListing());
}
function addEvent(e) { S.events.push(e); S.events.sort((a, b) => a.at - b.at); }
function scheduleDay(first) {
  S.events = [];
  if (S.lic.servis) {
    const R = rating() || 3.5, ad = S.adUntil >= S.day ? 2 : 0, cheap = S.laborRate <= 2000 ? 1 : S.laborRate >= 3500 ? -1 : 0;
    const walk = Math.max(1, Math.min(9, 1 + Math.floor(S.rep / 30) + Math.max(0, S.bays - 1) + (R >= 4.5 ? 1 : R < 3 ? -1 : 0) + ad + cheap + (WEATHER[S.weather || 'sunny'].cust || 0)));
    const walkN = Math.max(1, Math.round(walk * cfg('freq')));
    for (let i = 0; i < walkN; i++) S.events.push({ at: first && i === 0 ? 3 : ri(10, 480), type: 'cust' });
    const calls = Math.max(1, Math.min(7, 2 + Math.floor(S.rep / 30) + (ad ? 1 : 0) + (R < 3 ? -1 : 0)));
    const callN = Math.max(0, Math.round(calls * cfg('freq')));
    for (let i = 0; i < callN; i++) S.events.push({ at: first && i === 0 ? 20 : ri(5, 470), type: 'call' });
    S.appts.filter(a => a.day === S.day).forEach(a => S.events.push({ at: a.at, type: 'appt', id: a.id }));
    if (S.dayEvent === 'fleet') S.events.push({ at: ri(20, 200), type: 'cust' });
    if ((S.tier || 0) >= 1) S.events.push({ at: ri(30, 400), type: 'cust' });
    if (S.truckHall) for (let i = 0; i < ri(1, 2 + ((S.tier || 0) >= 3 ? 1 : 0)); i++) S.events.push({ at: ri(30, 420), type: 'truck' });
    (S.contracts || []).forEach(k => { if (Math.random() < k.perDay) S.events.push({ at: ri(20, 400), type: 'contract', id: k.id }); });
    (S.warranty || []).filter(w => w.day === S.day).forEach(w => S.events.push({ at: ri(15, 300), type: 'warranty', id: w.id }));
  }
  S.cars.filter(c => c.listed).forEach(c => scheduleBuyers(c));
  S.events.sort((a, b) => a.at - b.at);
}
function scheduleBuyers(c, soon) {
  const n = (Math.random() < 0.5 + S.rep / 200 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0) + (soon ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const at = soon && i === 0 ? S.minute + ri(15, 60) : ri(Math.ceil(S.minute) + 10, dayMinutes() - 30);
    if (at < dayMinutes() - 20) S.events.push({ at, type: 'buyer', car: c.id });
  }
  S.events.sort((a, b) => a.at - b.at);
}

// ---------- zaman ----------
function gameTick(dt) {
  if (UI.paused()) return;
  const dm = dt * S.speed;
  S.minute = Math.min(dayMinutes(), S.minute + dm);
  S.staff.forEach(w => processWorker(w, dm));
  processErrands(dm);
  while (S.events.length && S.events[0].at <= S.minute) fireEvent(S.events.shift());
  S.jobs.slice().forEach(j => { if (j.apron != null && j.leaveAt && S.minute > j.leaveAt) { if (Math.random() < 0.6) addReview(j.cust.name, 2, REVIEW_TXT[2][1]); jobLeaves(j, 'Beklemekten sıkılıp gitti.', j.appt ? -2 : 0); } });
  S.appReq = S.appReq.filter(r => { if (S.minute > r.expires) { log(`${r.job.cust.name} randevu talebine cevap alamadı.`); return false; } return true; });
  if (S.minute >= dayMinutes() && !UI.haggle) endDay();
  UI.hud();
}

function freeApron() { const used = new Set(S.jobs.filter(j => j.apron != null).map(j => j.apron)); return [0, 1, 2, 3].find(i => !used.has(i)); }
function arrive(j, patience) {
  const slot = j.truck ? (S.jobs.some(x => x.apron === 10) ? null : 10) : freeApron(); if (slot == null) return false;
  j.apron = slot; j.leaveAt = S.minute + patience * (S.up.lounge ? 1.5 : 1) * cfg('patience');
  S.jobs.push(j); syncScene(); UI.render();
  return true;
}
function fireEvent(e) {
  if (e.type === 'cust') {
    const j = genJob();
    if (!arrive(j, ri(110, 200))) { if (e.at + 30 < dayMinutes() - 60) addEvent(Object.assign(e, { at: e.at + 30 })); return; }
    autoPause();
    UI.toast(j.tow ? `Çekici geliyor: ${j.cust.name} — ${MODELS[j.model].name} çalışmıyor` : `Kapıya müşteri geldi: ${j.cust.name} — ${MODELS[j.model].name}`, 'info');
    log(`${j.cust.name} ${MODELS[j.model].name} ile kapıya geldi.`);
  }
  if (e.type === 'call') {
    const j = genJob();
    let day = S.day + (Math.random() < 0.45 ? 0 : ri(1, 2)), at = Math.round(ri(20, 470) / 15) * 15;
    if (day === S.day && at < S.minute + 45) { at = Math.round((S.minute + ri(60, 150)) / 15) * 15; if (at > 480) { day++; at = ri(2, 20) * 15; } }
    S.appReq.push({ id: 'r' + (S.idc++), job: j, day, at, expires: S.minute + 90 }); SFX.ring(); autoPause();
    UI.toast(`Telefon: ${j.cust.name} ${day === S.day ? 'bugün' : day === S.day + 1 ? 'yarın' : 'öbür gün'} ${clock(at)} için randevu istiyor.`, 'info');
    UI.render();
  }
  if (e.type === 'appt') {
    const a = S.appts.find(x => x.id === e.id); if (!a) return;
    if (!arrive(a.job, ri(200, 260))) { addEvent(Object.assign(e, { at: e.at + 15 })); return; }
    a.job.appt = true;
    S.appts = S.appts.filter(x => x !== a);
    UI.toast(`Randevulu müşteri geldi: ${a.job.cust.name}`, 'ok');
    log(`${a.job.cust.name} randevusuna zamanında geldi.`);
  }
  if (e.type === 'truck' || e.type === 'contract') {
    const K = e.type === 'contract' ? (S.contracts || []).find(k => k.id === e.id) : null;
    if (e.type === 'contract' && !K) return;
    const truck = e.type === 'truck' || (K && K.truck);
    if (truck && !S.truckHall) return;
    const j = genJob(truck);
    if (K) { j.contract = K.id; j.cust.name = K.company; j.cust.deadline = S.day + 1; j.regular = false; }
    if (!arrive(j, ri(180, 260))) { if (e.at + 30 < dayMinutes() - 60) addEvent(Object.assign(e, { at: e.at + 30 })); return; }
    UI.toast(truck ? `Tır geldi: ${j.cust.name} — ${MODELS[j.model].name}` : `Sözleşmeli araç geldi: ${j.cust.name}`, 'info'); SFX.horn();
    log(`${j.cust.name} ${MODELS[j.model].name} ile geldi${K ? ' (sözleşme)' : ''}.`);
  }
  if (e.type === 'warranty') {
    const w = (S.warranty || []).find(x => x.id === e.id); if (!w) return;
    if (!arrive(w.job, ri(150, 220))) { addEvent(Object.assign(e, { at: e.at + 20 })); return; }
    S.warranty = S.warranty.filter(x => x !== w);
    UI.toast(`${w.job.cust.name} geri geldi: “Sorun devam ediyor!” (garanti)`, 'bad'); SFX.bad();
    log(`${w.job.cust.name} garanti için geri geldi.`, 'bad');
  }
  if (e.type === 'buyer') {
    const c = carById(e.car);
    if (!c || !c.listed || c.lot == null || c.out || UI.haggle) return;
    Life.buyerVisit(c);
  }
}
function acceptAppt(id) {
  const r = S.appReq.find(x => x.id === id); if (!r) return;
  S.appReq = S.appReq.filter(x => x !== r);
  const a = { id: r.id, job: r.job, day: r.day, at: r.at };
  S.appts.push(a);
  if (a.day === S.day) addEvent({ at: a.at, type: 'appt', id: a.id });
  log(`Randevu verildi: ${r.job.cust.name}, Gün ${a.day} ${clock(a.at)}.`, 'ok'); goal('appt');
  UI.toast('Randevu takvime eklendi.', 'ok'); UI.render(); save();
}
function declineAppt(id) { S.appReq = S.appReq.filter(x => x.id !== id); UI.render(); }

// ---------- personel & görevler ----------
function workerFor(c) {
  if (c.bay != null) return S.staff.find(w => w.role === 'usta' && w.bay === c.bay && !away(w)) || null;
  return S.staff.filter(w => w.role === 'usta' && !away(w)).sort((a, b) => (a.bay == null ? 0 : 1) - (b.bay == null ? 0 : 1) || a.queue.length - b.queue.length)[0] || null;
}
function helperFor(w) { return w.bay != null && S.staff.some(x => x.role === 'cirak' && x.bay === w.bay && !x.errand); }
function away(w) { return w.trainDay === S.day || w.sickDay === S.day; }
function powerOut() { return S.dayEvent === 'power' && S.minute >= 300 && S.minute < 420; }
function moodRate(w) { return (w.energy != null && w.energy < 30 ? 0.8 : 1) * (w.morale > 80 ? 1.06 : w.morale < 30 ? 0.9 : 1) * (powerOut() ? 0.4 : 1); }
function taskComp(t) { return t.comp || (t.part && FAULTS[t.part].comp) || null; }
function specMatch(w, comp) { return !!(w.spec && comp && SPECS[w.spec] && SPECS[w.spec].comps.includes(comp)); }
function workRate(w, t) { return (t.type === 'part' || t.type === 'overview' || t.type === 'paint' ? skillSpeed(w.skill) * (helperFor(w) ? 1.2 : 1) : 1) * moodRate(w) * (specMatch(w, taskComp(t)) ? 1.25 : 1); }
function mistakeChance(w) { return Math.max(0, 3 - w.skill) * 0.04 + (w.energy < 25 ? 0.08 : 0) + (w.morale < 30 ? 0.05 : 0); }
function tasksFor(carId) { return S.staff.flatMap(w => w.queue.filter(t => t.car === carId).map(t => ({ w, t }))); }
const TASK_NAMES = { look: 'gözle kontrol', meas: 'ölçüm', part: 'parça değişimi', overview: 'genel kontrol', clean: 'temizlik', paint: 'boya' };
function taskLabel(t) {
  if (t.type === 'gtest') return GLOBAL_TESTS[t.test].name;
  if (t.type === 'mod') return MODS[t.mod].name;
  if (t.type === 'part') return `${FAULTS[t.part].part} değişimi`;
  if (t.comp) return `${COMPS[t.comp].name} — ${TASK_NAMES[t.type]}`;
  return TASK_NAMES[t.type];
}
function enqueue(c, t) {
  if (typeof FPS !== 'undefined' && FPS.claim) return FPS.startWork(c, t);
  const w = workerFor(c);
  if (!w) { UI.toast(c.bay != null ? `Lift ${c.bay + 1}’de usta yok. Personel’den usta ata.` : 'Boşta usta yok. Personel’den usta işe al.', 'bad'); return false; }
  if (c.out) { UI.toast('Araç dış serviste.', 'bad'); return false; }
  t.id = 't' + (S.idc++); t.car = c.id; t.left = t.min;
  w.queue.push(t);
  if (!UI.inspect || UI.inspect.id !== c.id) UI.toast(`${wname(w)}: ${taskLabel(t)} sıraya alındı.`, 'info');
  if (UI.inspect) UI.renderInspect();
  return true;
}
function cancelTask(wid, tid) {
  const w = staffById(wid); if (!w) return;
  const i = w.queue.findIndex(t => t.id === tid); if (i < 0) return;
  const t = w.queue[i];
  if (t.type === 'part') S.stock[t.part] = (S.stock[t.part] || 0) + (t.qty || 1);
  w.queue.splice(i, 1);
  if (i === 0) { const n = WNPC[w.id]; if (n) { n.root.visible = true; } workerGoHome(w); }
  UI.render(); if (UI.inspect) UI.renderInspect();
}
function spotFor(c, t) {
  if (t.type === 'gtest' || t.type === 'clean' || t.type === 'paint' || t.type === 'mod') return ustaSpot(c, t.type === 'mod' && ['rims', 'exhaust'].includes(t.mod) && c.bay != null ? 'under' : 'door');
  if (t.type === 'overview') return ustaSpot(c, 'hood');
  const comp = t.comp || FAULTS[t.part].comp;
  return ustaSpot(c, COMPS[comp].view);
}
function processWorker(w, dm) {
  if (away(w)) { const n = WNPC[w.id]; if (n && n.root.visible) n.root.visible = false; return; }
  const t = w.queue[0]; if (!t) return;
  const c = carById(t.car), n = WNPC[w.id];
  if (!c) { w.queue.shift(); if (!w.queue.length) workerGoHome(w); return; }
  t._rt = t._rt || {};
  if (!t._rt.started) {
    if (!carParked(c.id) || !n) return;
    const view = t.comp ? COMPS[t.comp].view : t.part ? COMPS[FAULTS[t.part].comp].view : (t.type === 'overview' ? 'hood' : null);
    if (view === 'under') { if (c.bay == null) { UI.toast('Alt takım işi için araç liftte olmalı.', 'bad'); w.queue.shift(); return; } if (!c.truck) c.lifted = true; }
    if (view === 'hood') c.hoodOpen = true;
    if (t.type === 'gtest' && t.test === 'drive') { c.lifted = false; c.hoodOpen = false; }
    syncScene();
    const sp = spotFor(c, t);
    t._rt.started = true;
    n.root.visible = true; n.speed = 2.6;
    n.go(walkPath(n.root.position, sp.pos), () => {
      t._rt.arrived = true; n.face(sp.look[0], sp.look[1]); n.state = t.type === 'clean' ? 'sweep' : sp.pose;
      const h = S.staff.find(x => x.role === 'cirak' && x.bay != null && x.bay === w.bay && !x.errand), hn = h && WNPC[h.id];
      if (hn && t.type !== 'gtest') { const hp = ustaSpot(c, 'door'); hn.root.visible = true; hn.speed = 2.4; hn.go(walkPath(hn.root.position, hp.pos), () => { hn.face(hp.look[0], hp.look[1]); hn.state = 'work'; }); }
      if (t.type === 'gtest' && t.test === 'drive') { SFX.engine(false); n.root.visible = false; testDriveCar(c.id, () => { t._rt.driveDone = true; }); }
    });
    return;
  }
  if (!t._rt.arrived) return;
  if (dm > 0) { const now = performance.now(); if (now - (t._rt.snd || 0) > (t.type === 'part' ? 1400 : 2200)) { t._rt.snd = now; if (t.type === 'part') (S.up.impact && Math.random() < 0.5 ? SFX.impact() : SFX.ratchet()); else if (t.type === 'look' || t.type === 'meas' || t.type === 'overview') SFX.clink(); } }
  t.left -= dm * workRate(w, t);
  w.energy = Math.max(0, (w.energy == null ? 100 : w.energy) - dm * 0.1);
  if (t.left > 0) return;
  if (t.type === 'gtest' && t.test === 'drive' && !t._rt.driveDone) return;
  w.queue.shift();
  w.jobs++; w.todayJobs = (w.todayJobs || 0) + 1; w.xp += t.min;
  if (w.skill < 5 && w.xp >= 500 * w.skill) { w.skill++; w.xp = 0; w.wage = wageFor(w.role, w.skill); UI.toast(`${wname(w)} ustalaştı: ${stars(w.skill)} (maaş ${fmt(w.wage)})`, 'ok'); log(`${wname(w)} bir kademe yükseldi.`, 'ok'); }
  if (n) n.root.visible = true;
  completeTask(w, t, c);
  if (!w.queue.length) setTimeout(() => { if (!w.queue.length) { workerGoHome(w); S.staff.filter(x => x.role === 'cirak' && x.bay === w.bay && !x.errand).forEach(workerGoHome); } }, 1800);
  UI.render(); if (UI.inspect) UI.renderInspect(); save();
}
function completeTask(w, t, c) {
  const who = wname(w);
  if (t.type === 'look' || t.type === 'meas') {
    const r = compResult(c, t.comp, t.type);
    c.findings[t.type + ':' + t.comp] = { res: r.res, ab: r.ab, day: S.day };
    addXP(1); flashComp(c.id, t.comp, r.ab ? 0xf2c14e : 0x4cc38a);
    UI.toast(`${who} · ${COMPS[t.comp].name}: ${r.res[0]}`, r.ab ? 'warn' : 'ok');
  }
  if (t.type === 'gtest') {
    const r = globalResult(c, t.test);
    c.findings[t.test] = { res: r.res, ab: r.ab, day: S.day }; addXP(2);
    UI.toast(`${who} · ${GLOBAL_TESTS[t.test].name}: ${r.res[0]}`, r.ab ? 'warn' : 'ok');
    if (t.test === 'obd') SFX.beep();
    if (t.test === 'start') {
      if (c.faults.includes('starter')) SFX.click(); else SFX.engine(c.faults.some(f => ['spark_plug', 'coil', 'engine_mount', 'battery_weak', 'fuel_pump', 'timing_belt'].includes(f)));
      const smoke = c.faults.includes('head_gasket');
      if (!c.faults.includes('starter')) puff(c.id, smoke ? 0xf4f4f4 : 0x8d9399, smoke ? 12 : 4);
      const m = G.carMeshes[c.id]; if (m) { let k = 0; const iv = setInterval(() => { m.rotation.z = (Math.random() - 0.5) * (c.faults.includes('engine_mount') ? 0.03 : 0.008); if (++k > 20) { clearInterval(iv); m.rotation.z = 0; } }, 50); }
    }
  }
  if (t.type === 'overview') {
    const hits = new Set(), lines = [];
    c.faults.forEach(f => { if (Math.random() < 0.3 + w.skill * 0.14 + (specMatch(w, FAULTS[f].comp) ? 0.15 : 0)) hits.add(FAULTS[f].comp); });
    if (Math.random() < (5 - w.skill) * 0.12) { const others = Object.keys(COMPS).filter(k => !hits.has(k) && !c.faults.some(f => FAULTS[f].comp === k)); hits.add(pick(others)); }
    hits.forEach(k => lines.push(`${COMPS[k].name} bölgesinden şüpheleniyorum.`));
    if (!lines.length) lines.push('Gözüme belirgin bir şey çarpmadı.');
    c.hints = [...new Set((c.hints || []).concat([...hits]))];
    c.findings.overview = { res: [`${who} (${stars(w.skill)}):`, ...lines], ab: hits.size > 0, day: S.day };
    addXP(2); goal('overview'); UI.toast(`${who} genel kontrolü bitirdi: ${hits.size ? hits.size + ' şüpheli bölge' : 'belirgin bir şey yok'}.`, hits.size ? 'warn' : 'ok');
  }
  if (t.type === 'part') {
    const f = t.part;
    if (c.faults.includes(f) && Math.random() < mistakeChance(w)) { c.botched = (c.botched || 0) + 1; log(`${who} ${FAULTS[f].part} montajında aceleye getirdi.`, 'bad'); }
    else if (c.faults.includes(f)) { c.faults = c.faults.filter(x => x !== f); c.fixed.push(f); addXP(15); }
    else c.wasted.push(f);
    c.spent += partPrice(f);
    Object.values(c.findings).forEach(x => x.stale = true);
    flashComp(c.id, FAULTS[f].comp, 0x6cb4ff);
    log(`${MODELS[c.model].name}: ${FAULTS[f].part} değiştirildi (${who}).`);
    UI.toast(`${who}: ${FAULTS[f].part} takıldı. Doğrulamak için tekrar kontrol et.`, 'info');
  }
  if (t.type === 'clean') { c.clean = true; syncScene(); }
  if (t.type === 'paint') { c.paint = 100; if (t.color != null) c.color = t.color; addXP(8); syncScene(); }
  if (t.type === 'mod') { c.mods = c.mods || []; if (!c.mods.includes(t.mod)) c.mods.push(t.mod); addXP(5); syncScene(); UI.toast(`${who}: ${MODS[t.mod].name} tamam.`, 'ok'); }
}

// kullanıcı eylemleri → göreve çevir
function inspectComp(id, comp, kind) {
  const c = carById(id), C = COMPS[comp];
  if (C.view === 'under' && c.bay == null) return UI.toast('Alt takıma bakmak için araç liftte olmalı.', 'bad');
  if (kind === 'meas' && !S.tools[C.tool]) return UI.toast(`${TOOLS[C.tool].name} gerekli (Mağaza).`, 'bad');
  enqueue(c, { type: kind, comp, min: kind === 'meas' ? MEAS_MIN : LOOK_MIN });
}
function globalTest(id, t) {
  const c = carById(id), T = GLOBAL_TESTS[t];
  if (T.tool && !S.tools[T.tool]) return UI.toast(`${TOOLS[T.tool].name} gerekli (Mağaza).`, 'bad');
  enqueue(c, { type: 'gtest', test: t, min: T.min });
}
function overview(id) { enqueue(carById(id), { type: 'overview', min: OVERVIEW_MIN }); }
function replacePart(id, f) {
  const c = carById(id);
  if (c.bay == null) return UI.toast('Parça değişimi için araç liftte olmalı.', 'bad');
  if (c.fixed.includes(f) || c.wasted.includes(f) || tasksFor(id).some(x => x.t.part === f)) return UI.toast('Bu parça zaten yenilendi ya da sırada.', 'bad');
  const need = c.truck ? TRUCK_STOCK : 1;
  if (!((S.stock[f] || 0) >= need)) { if (c.truck) UI.toast(`Tır için ${need} adet ${FAULTS[f].part} gerekir.`, 'bad'); return UI.partMissing(f); }
  if (enqueue(c, { type: 'part', part: f, min: Math.round(laborTime(f) * (c.truck ? TRUCK_LABOR_MUL : 1)), qty: need })) S.stock[f] -= need;
}
function cleanCar(id) {
  const c = carById(id); if (c.clean) return;
  if (!pay(1500)) return;
  if (enqueue(c, { type: 'clean', min: 30 })) { addMoney(-1500, 'Temizlik malzemesi'); if (c.owner === 'me') c.spent += 1500; }
}
function paintCost(c, color) { return Math.round((100 - c.paint) * 220 + 4000 + (color != null && color !== c.color ? 9000 : 0)); }
function paintCar(id, color) {
  const c = carById(id);
  if (!S.up.paint) return UI.toast('Boya Kabini gerekli.', 'bad');
  const cost = paintCost(c, color);
  if (!pay(cost)) return;
  if (enqueue(c, { type: 'paint', min: color != null && color !== c.color ? 210 : 150, color })) { addMoney(-cost, 'Boya / kaporta'); if (c.owner === 'me') c.spent += cost; }
}

// personel yönetimi
function hire(id) {
  const k = S.cands.find(x => x.id === id); if (!k) return;
  if (!S.lic.servis) return UI.toast('Personel için Servis Ruhsatı gerekli.', 'bad');
  S.cands = S.cands.filter(x => x !== k);
  const taken = new Set(S.staff.filter(w => w.role === k.role && w.bay != null).map(w => w.bay));
  for (let i = 0; i < S.bays; i++) if (!taken.has(i)) { k.bay = i; break; }
  S.staff.push(k);
  log(`${wname(k)} işe başladı (${stars(k.skill)}, günlük ${fmt(k.wage)}).`, 'ok');
  syncWorkers(); workerGoHome(k); UI.render(); save();
}
function fire(id) {
  const w = staffById(id); if (!w) return;
  w.queue.forEach(t => { if (t.type === 'part') S.stock[t.part] = (S.stock[t.part] || 0) + (t.qty || 1); });
  if (w.errand) return UI.toast('Parça almaya gitti; dönünce çıkarabilirsin.', 'bad');
  S.staff = S.staff.filter(x => x !== w);
  addMoney(-w.wage, `${wname(w)} — tazminat`);
  log(`${wname(w)} işten çıkarıldı.`);
  syncWorkers(); UI.render(); save();
}
function assignWorker(id, bay) {
  const w = staffById(id); if (!w) return;
  if (w.queue.length) return UI.toast('Elindeki işler bitmeden yeri değişmez.', 'bad');
  if (bay != null) { const other = S.staff.find(x => x !== w && x.role === w.role && x.bay === bay); if (other) other.bay = w.bay; }
  w.bay = bay;
  S.staff.forEach(workerGoHome); UI.render(); save();
}

// ---------- parça & depo ----------
function bestRunner() { return S.staff.filter(w => w.role === 'cirak' && !w.errand && !w.queue.length)[0] || null; }
function sendErrand(part, qty, storeKey, viaCourier) {
  const st = STORES[storeKey], cost = Math.round(partPrice(part) * st.mult * qty);
  const runner = viaCourier ? null : bestRunner();
  const fee = runner ? 0 : COURIER_FEE;
  if (!pay(cost + fee)) return false;
  addMoney(-(cost + fee), `${FAULTS[part].part} ×${qty} (${st.name})${fee ? ' + kurye' : ''}`);
  const e = { id: 'e' + (S.idc++), part, qty, store: storeKey, who: runner ? runner.id : 'kurye', left: Math.round(st.min * (runner ? 1 : 0.8) * (runner ? 1.15 - runner.skill * 0.05 : 1)), total: 0, cost };
  e.total = e.left;
  S.errands.push(e);
  if (runner) {
    runner.errand = e.id;
    const n = WNPC[runner.id];
    if (n) { n.speed = 2.2; n.root.visible = true; n.go(walkPath(n.root.position, [n.root.position.x > 0 ? 9 : -9, 11.2]).concat([[70, 11.2]]), () => { n.root.visible = false; }); }
    UI.toast(`${wname(runner)} ${st.name}’ya gidiyor (~${e.left} dk).`, 'info');
  } else UI.toast(`Kurye ${st.name}’ya gönderildi (~${e.left} dk).`, 'info');
  UI.render(); save();
  return true;
}
function processErrands(dm) {
  S.errands.slice().forEach(e => {
    if (e.status) return;
    e.left -= dm;
    if (e.left > 0) return;
    const st = STORES[e.store], ok = Math.random() < st.avail;
    const runner = staffById(e.who), name = runner ? wname(runner) : 'Kurye';
    if (ok) {
      S.stock[e.part] = (S.stock[e.part] || 0) + e.qty;
      S.errands = S.errands.filter(x => x !== e);
      UI.toast(`${name} döndü: ${FAULTS[e.part].part} ×${e.qty} depoda.`, 'ok'); goal('errand'); SFX.ding();
      log(`${name} ${st.name}’dan ${FAULTS[e.part].part} getirdi.`, 'ok');
    } else {
      addMoney(Math.round(e.cost), `${FAULTS[e.part].part} iade (bulunamadı)`);
      e.status = 'fail';
      UI.toast(`${name}: “${st.name}’da ${FAULTS[e.part].part} yokmuş!” Başka yere gönder.`, 'bad'); SFX.bad();
      log(`${st.name}’da ${FAULTS[e.part].part} bulunamadı.`, 'bad');
    }
    if (runner) {
      runner.errand = null;
      const n = WNPC[runner.id];
      if (n) { n.root.position.set(70, 0, 11.2); n.root.visible = true; n.speed = 2.2; const h = workerHome(runner); n.go([[h[0] > 0 ? 9 : -9, 11.2]].concat(walkPath({ x: h[0] > 0 ? 9 : -9, z: 11.2 }, h)), () => { n.face(h[0], -8); n.state = 'idle'; }); }
    }
    UI.render(); if (UI.inspect) UI.renderInspect(); save();
  });
}
function retryErrand(id, storeKey, viaCourier) {
  const e = S.errands.find(x => x.id === id); if (!e) return;
  S.errands = S.errands.filter(x => x !== e);
  sendErrand(e.part, e.qty, storeKey, viaCourier);
}
function dropErrand(id) { S.errands = S.errands.filter(x => x.id !== id); UI.render(); }
function orderWholesale(part, qty) {
  const cost = Math.round(partPrice(part) * WHOLESALE_MULT * qty * (S.dayEvent === 'sale' ? 0.75 : 1));
  if (!pay(cost)) return;
  addMoney(-cost, `Toptancı: ${FAULTS[part].part} ×${qty}`);
  const o = S.orders.find(x => x.part === part); if (o) o.qty += qty; else S.orders.push({ part, qty });
  UI.toast(`${FAULTS[part].part} ×${qty} sipariş edildi — yarın sabah depoda.`, 'ok'); UI.render(); save();
}

// ---------- canlı karakterler (müşteri / alıcı) ----------
const Life = {
  cust: {}, bench: [],
  customerArrived(car) {
    if (this.cust[car.id]) return;
    car._custSpawned = true;
    const m = G.carMeshes[car.id]; if (!m) return;
    if (!car.tow) SFX.horn();
    const n = new NPC({ x: m.position.x - 1.2, z: m.position.z + 0.3 });
    n.go([[m.position.x + 1.5, APRON_Z + 1.5], [m.position.x + 0.3, APRON_Z + 3.4]], () => { n.face(0, APRON_Z + 3.4); n.state = 'talk'; });
    this.cust[car.id] = n;
  },
  toBench(id) {
    const n = this.cust[id]; if (!n) return;
    let seat = [0, 1, 2, 3].find(i => !this.bench[i]); if (seat == null) seat = 0;
    this.bench[seat] = id; n.seat = seat;
    const z = [7.4, 6.2, 5.2, 4.0][seat];
    n.go([[-12.6, 9.6], [-14.1, z]], () => { n.root.rotation.y = Math.PI / 2; n.faceTo = Math.PI / 2; n.state = 'sit'; n.root.position.x = -14.45; });
  },
  board(id, cb) {
    const m = G.carMeshes[id], n = this.cust[id];
    delete this.cust[id];
    if (n && n.seat != null) this.bench[n.seat] = null;
    if (!m) { n && n.remove(); return cb && cb(); }
    m.userData.hold = true; m.userData.tY = 0; m.userData.tHood = 0;
    if (!n) return cb && cb();
    const door = m.localToWorld(new THREE.Vector3(-(m.userData.info.W / 2 + 0.6), 0, 0.3));
    const p0 = n.root.position, path = p0.z > 6 || door.z > 6 ? [[p0.x, Math.max(p0.z, 9.6)], ...walkPath({ x: p0.x, z: Math.max(p0.z, 9.6) }, [door.x, door.z])] : walkPath(p0, [door.x, door.z]);
    n.speed = 1.8; n.state = 'walk';
    n.go(path, () => { n.remove(); cb && cb(); });
  },
  restore() {
    S.jobs.filter(j => j.apron != null).forEach(j => { j._custSpawned = false; setTimeout(() => this.customerArrived(j), 300); });
    S.cars.filter(c => c.owner === 'customer').forEach(c => { const n = new NPC({ x: -12.6, z: 9.6 }); this.cust[c.id] = n; this.toBench(c.id); });
  },
  buyerVisit(c) {
    const m = G.carMeshes[c.id]; if (!m || m.userData.path) return;
    const name = pick(NAMES);
    const n = new NPC({ x: m.position.x + rnd(-4, 4), z: 11.2, tool: Math.random() < 0.3 ? 'clip' : null });
    const p = m.position, W = m.userData.info.W, L = m.userData.info.L;
    UI.toast(`${name} galeriye geldi, ${MODELS[c.model].name} aracına bakıyor.`, 'info');
    n.go([[p.x + W / 2 + 0.8, p.z + L / 2 + 0.6], [p.x + W / 2 + 0.8, p.z - L / 2 - 0.4], [p.x - W / 2 - 0.8, p.z - L / 2 - 0.4], [p.x - W / 2 - 0.8, p.z + 0.4]], () => {
      n.face(p.x, p.z); n.state = 'inspect';
      setTimeout(() => {
        if (!carById(c.id) || !c.listed || UI.haggle) { n.go([[p.x, 11.2], [p.x + 40, 11.2]], () => n.remove()); return; }
        n.state = 'talk'; startHaggle(c, n, name);
      }, 2200);
    });
  },
};

// ---------- alıcı pazarlığı ----------
function startHaggle(c, npc, name) {
  const bv = carValue(c, true) * rnd(0.92, 1.08) * (0.96 + S.rep / 1000);
  const H = { carId: c.id, npc, name, bv, patience: ri(2, 3), lines: [] };
  if (c.listed <= bv) { H.offer = c.listed; H.lines.push({ who: 'b', t: `${pick(BUYER_LINES.open)}İlan fiyatı uygun, ${fmt(c.listed)} veriyorum.` }); }
  else if (c.listed > bv * 1.4) { H.lines.push({ who: 'b', t: 'Bu fiyat piyasanın çok üstünde. Kolay gelsin.' }); H.done = 'leave'; }
  else { H.offer = round1k(Math.min(c.listed * 0.93, bv * rnd(0.8, 0.9))); H.lines.push({ who: 'b', t: pick(BUYER_LINES.open) + pick(BUYER_LINES.low).replace('{p}', fmt(H.offer)) }); }
  if (c.faults.length && !H.done) H.lines.push({ who: 'b', t: `Ekspertizde ${c.faults.length} sorun çıkar diye düşünüyorum, ona göre konuşuyorum.` });
  UI.haggle = H; focusCar(c.id, 'side'); UI.showHaggle();
}
function haggleCounter(x) {
  const H = UI.haggle, c = carById(H.carId); if (!H || !c) return;
  x = round1k(+x || 0); if (x <= 0) return;
  H.lines.push({ who: 'me', t: `${fmt(x)} olursa veririm.` });
  if (x <= H.offer) return haggleAccept(x);
  if (x <= H.bv) { H.lines.push({ who: 'b', t: pick(BUYER_LINES.accept) }); return haggleAccept(x, true); }
  H.patience -= x > H.bv * 1.15 ? 2 : 1;
  if (H.patience <= 0) { H.lines.push({ who: 'b', t: pick(BUYER_LINES.leave) }); H.done = 'leave'; UI.showHaggle(); return; }
  H.offer = round1k(H.offer + (Math.min(x, H.bv) - H.offer) * rnd(0.45, 0.75));
  H.lines.push({ who: 'b', t: pick(BUYER_LINES.raise).replace('{p}', fmt(H.offer)) });
  UI.showHaggle();
}
function haggleAccept(amount, said) {
  const H = UI.haggle, c = carById(H.carId);
  if (!said) H.lines.push({ who: 'b', t: pick(BUYER_LINES.accept) });
  H.done = 'sold'; H.amount = amount || H.offer;
  H.profit = sellCar(c, H.amount, H.name, H.npc); UI.showHaggle();
}
function haggleEnd() {
  const H = UI.haggle; if (!H) return;
  if (H.done !== 'sold' && H.npc && !H.npc.dead) { const p = H.npc.root.position; H.npc.go([[p.x, 11.2], [p.x + 50, 11.2]], () => H.npc.remove()); }
  UI.haggle = null; UI.closeModal(); focusHome(); UI.render();
}

// ---------- iş kabul ----------
function acceptJob(id) {
  const j = jobById(id); if (!j) return;
  const b = j.truck ? freeTruckBay() : freeBay(); if (b < 0) return UI.toast(j.truck ? 'Tır servisinde boş kanal yok.' : 'Boş lift yok. Bir aracı teslim et ya da lift al.', 'bad');
  S.jobs = S.jobs.filter(x => x !== j);
  j.waitedLong = j.leaveAt && j.leaveAt - S.minute < 40;
  j.apron = null; j.bay = b; j.accepted = S.day; j.leaveAt = null; S.cars.push(j);
  if (j.appt) addRep(1);
  log(`${j.cust.name} — ${MODELS[j.model].name} ${bayName(b)}’e alındı.`);
  if (!S.staff.some(w => w.role === 'usta' && w.bay === b)) UI.toast(`${bayName(b)}’de usta yok — Personel’den ata.`, 'bad');
  Life.toBench(j.id);
  UI.selected = j.id; syncScene(); if (!(typeof FPS !== 'undefined' && FPS.on)) UI.openCar(j.id, 'info'); else UI.toast(`${j.cust.name}: aracı ${bayName(b)}’e alındı.`, 'ok'); save();
}
function rejectJob(id) { const j = jobById(id); if (!j) return; if (j.warranty) { addRep(-5); addReview(j.cust.name, 1, 'Garanti kapsamındaki aracımı geri çevirdiler. Rezalet.'); } else if (j.appt && Math.random() < 0.7) addReview(j.cust.name, 1, REVIEW_TXT[1][1]); jobLeaves(j, null, j.appt ? -3 : 0); UI.render(); }
function jobLeaves(j, why, rep) {
  S.jobs = S.jobs.filter(x => x !== j);
  if (rep) addRep(rep);
  if (why) log(`${j.cust.name}: ${why}`);
  Life.board(j.id, () => departCar(j.id));
  syncScene(); UI.render();
}
function freeBay() { for (let i = 0; i < S.bays; i++) if (!S.cars.some(c => c.bay === i)) return i; return -1; }
function freeTruckBay() { if (!S.truckHall) return -1; for (let i = 4; i < 6; i++) if (!S.cars.some(c => c.bay === i)) return i; return -1; }
function bayName(b) { return b >= 4 ? `Tır kanalı ${b - 3}` : `Lift ${b + 1}`; }
function allBays() { const a = [...Array(S.bays).keys()]; if (S.truckHall) a.push(4, 5); return a; }
function freeLot() { for (let i = 0; i < S.lot; i++) if (!S.cars.some(c => c.lot === i)) return i; return -1; }
function moveToBay(id) {
  const c = carById(id), b = freeBay();
  if (!S.lic.servis || S.bays === 0) return UI.toast('Liftin yok. Mağazadan servis ruhsatı / lift al.', 'bad');
  if (b < 0) return UI.toast('Tüm liftler dolu.', 'bad');
  if (tasksFor(id).length) return UI.toast('Araç üzerinde iş var, bitmesini bekle.', 'bad');
  c.lot = null; c.bay = b; c.lifted = false; c.hoodOpen = false; syncScene(); UI.render(); save();
}
function moveToLot(id) {
  const c = carById(id), l = freeLot();
  if (l < 0) return UI.toast('Galeride boş park yeri yok.', 'bad');
  if (tasksFor(id).length) return UI.toast('Araç üzerinde iş var, bitmesini bekle.', 'bad');
  c.bay = null; c.lot = l; c.lifted = false; c.hoodOpen = false; syncScene(); UI.render(); save();
}

// ---------- teşhis sonuçları ----------
function compResult(c, comp, kind) {
  const hits = c.faults.map(f => (FAULTS[f][kind] || {})[comp]).filter(Boolean);
  return hits.length ? { res: hits, ab: true } : { res: [COMPS[comp][kind]], ab: false };
}
function globalResult(c, t) {
  const hits = c.faults.map(f => FAULTS[f][t]).filter(Boolean);
  return hits.length ? { res: hits, ab: true } : { res: [GLOBAL_TESTS[t].ok], ab: false };
}
function ustaSpot(c, view) {
  const m = G.carMeshes[c.id], I = m.userData.info;
  if (view === 'under' && I.truck) { const p = m.localToWorld(new THREE.Vector3(I.W / 2 + 0.7, 0, 0.8)); return { pos: [p.x, p.z], look: [m.position.x, m.position.z], pose: 'inspect' }; }
  if (view === 'under') { const p = m.localToWorld(new THREE.Vector3(0.35, 0, 0.6)); return { pos: [p.x, p.z], look: [m.position.x, m.position.z + 1], pose: 'workUp' }; }
  if (view === 'door') { const p = m.localToWorld(new THREE.Vector3(-(I.W / 2 + 0.45), 0, 0.25)); return { pos: [p.x, p.z], look: [m.position.x, m.position.z], pose: 'work' }; }
  const p = m.localToWorld(new THREE.Vector3(0, 0, I.L / 2 + 0.5)), e = m.localToWorld(new THREE.Vector3(0, 0, I.f0 + I.hoodLen / 2));
  return { pos: [p.x, p.z], look: [e.x, e.z], pose: 'work' };
}

function deliver(id) {
  const c = carById(id); if (!c || c.owner !== 'customer') return;
  if (tasksFor(id).length) return UI.toast('Araç üzerinde süren iş var. Bitmesini bekle ya da iptal et.', 'bad');
  const correct = c.fixed, remaining = c.faults, wasted = c.wasted;
  const parts = correct.reduce((s, f) => s + partPrice(f), 0) * (S.partMarkup || PART_MARKUP) * (c.truck ? TRUCK_PART_MUL : 1);
  const labor = correct.reduce((s, f) => s + FAULTS[f].labor, 0) / 60 * S.laborRate * (c.truck ? TRUCK_LABOR_MUL : 1);
  const tested = Object.keys(c.findings).length;
  const modsDone = (c.modReq || []).filter(k => (c.mods || []).includes(k)), modsMissing = (c.modReq || []).filter(k => !(c.mods || []).includes(k));
  const modBill = modsDone.reduce((s, k) => s + MODS[k].cost * MOD_MARKUP + MODS[k].labor / 60 * S.laborRate, 0);
  let payN = Math.round(parts + labor + modBill + (c.tow ? TOW_FEE : 0)), lines = [], repD = 0;
  if (modsDone.length) lines.push(`Modifiye: ${modsDone.map(k => MODS[k].name).join(', ')} — ${fmt(modBill)}`);
  if (modsMissing.length) { lines.push(`Yapılmayan istek: ${modsMissing.map(k => MODS[k].name).join(', ')}`); repD -= 2 * modsMissing.length; }
  if (c.fleet) { payN = Math.round(payN * 1.5); lines.push('Filo müşterisi: fatura %50 fazla ödendi.'); }
  if (c.contract) { const K = (S.contracts || []).find(k => k.id === c.contract); if (K) { payN = Math.round(payN * K.payMul); K.done++; lines.push(`${K.company} sözleşmesi: fatura ×${K.payMul.toFixed(2).replace('.', ',')}`); if (remaining.length) { K.strikes++; lines.push('Sözleşme ihlali: arıza çözülmedi.'); } } }
  if (c.regular) lines.push('Sadık müşterin tekrar seni tercih etti.');
  if (c.tow) lines.push(`Çekici ücreti faturaya eklendi: ${fmt(TOW_FEE)}`);
  if (c.warranty) { payN = 0; lines.push('Garanti işi — ücret alınmadı.'); }
  if (correct.length) lines.push(`Doğru onarım: ${correct.map(f => FAULTS[f].part).join(', ')}`);
  if (wasted.length) { lines.push(`Gereksiz değişen parça: ${wasted.map(f => FAULTS[f].part).join(', ')} — müşteri ödemedi.`); repD -= wasted.length; }
  if (remaining.length) {
    lines.push(`Müşteri ${remaining.length} sorunun devam ettiğini fark etti.`); repD -= 6 * remaining.length;
    if (!correct.length && tested) { payN = 1000; lines.push('Yalnızca teşhis ücreti alındı.'); }
  } else {
    repD += 3 + (wasted.length ? 0 : 2) + (c.appt ? 1 : 0);
    if (S.rep > 60) { const tip = Math.round(payN * 0.05); payN += tip; lines.push(`Memnun müşteri bahşiş bıraktı: ${fmt(tip)}`); }
    addXP(10); S.stats.jobs++;
  }
  if (c.warranty) { if (remaining.length) { repD -= 4; lines.push('Garantiye rağmen sorun çözülmedi!'); } else { repD += 4; lines.push('Garanti işi düzgün kapandı, müşteri gönlü alındı.'); } }
  else if (remaining.length) {
    const back = JSON.parse(JSON.stringify(c));
    Object.assign(back, { id: uid(), fixed: [], wasted: [], findings: {}, hints: [], bay: null, lot: null, apron: null, lifted: false, hoodOpen: false, warranty: true, appt: false, tow: false, waitedLong: false, _custSpawned: false });
    back.sym = ['came_back'].concat(symptomsOf(back)); back.cust = { name: c.cust.name, deadline: 0 };
    const day = S.day + ri(1, 2); back.cust.deadline = day + 1;
    S.warranty = S.warranty || []; S.warranty.push({ id: 'g' + (S.idc++), day, job: back });
    lines.push(`${c.cust.name} sorun sürerse garanti için geri gelecek.`);
  }
  if (payN > 0) addMoney(payN, `${c.cust.name} — ${MODELS[c.model].name}`); S.stats.earned += payN; addRep(repD);
  if (remaining.length) SFX.bad(); else SFX.cash();
  checkAch();
  goal('income', payN); if (!remaining.length) goal('deliver');
  { // müşteri yorumu
    let st = 5, txt;
    if (c.warranty) { st = remaining.length ? 1 : 4; txt = remaining.length ? 'İki kez getirdim, hâlâ düzelmedi!' : 'İlk seferde olmadı ama garanti kapsamında ücretsiz düzelttiler.'; }
    else if (remaining.length) { st = correct.length ? 2 : 1; txt = st === 2 ? REVIEW_TXT[2][0] : REVIEW_TXT[1][0]; }
    else {
      st -= wasted.length; if (c.waitedLong) st -= 1;
      if (S.laborRate >= 3500 && Math.random() < 0.6) { st -= 1; txt = REVIEW_TXT[3][0]; } else if (S.laborRate >= 3000 && Math.random() < 0.3) { st -= 1; txt = REVIEW_TXT[3][0]; }
      if (wasted.length) txt = REVIEW_TXT[3][1];
      if (S.laborRate <= 2000 && st < 5 && Math.random() < 0.4) st++;
      if ((S.partMarkup || 1.3) >= 1.5 && correct.length && Math.random() < 0.4) { st--; txt = 'Parçalara fahiş fiyat yazdılar.'; }
      if ((S.partMarkup || 1.3) <= 1.1 && st < 5 && Math.random() < 0.25) st++;
      if (S.up.lounge && st < 5 && Math.random() < 0.25) { st++; txt = 'Beklerken çay ikram ettiler, işleri de temiz.'; }
    }
    if (modsMissing.length) st -= 1;
    st = Math.max(1, Math.min(5, st));
    if (Math.random() < (st <= 2 ? 0.9 : 0.65)) { addReview(c.cust.name, st, txt || pick(REVIEW_TXT[st])); lines.push(`${c.cust.name} işletmene ${st}★ yorum bıraktı.`); }
    // müşteri kaydı / sadakat
    S.customers = S.customers || {};
    const rec = S.customers[c.cust.name] || (S.customers[c.cust.name] = { name: c.cust.name, visits: 0, spent: 0, stars: [] });
    rec.visits++; rec.spent += payN; rec.stars.push(st); rec.model = c.model; rec.lastDay = S.day;
    S.regulars = S.regulars || [];
    if (st >= 4 && !c.fleet && !S.regulars.some(r => r.name === c.cust.name)) { S.regulars.push({ name: c.cust.name, model: c.model, color: c.color, year: c.year, lastDay: S.day }); lines.push(`${c.cust.name} artık sadık müşterin; ileride yine gelir.`); }
    else if (st <= 2) S.regulars = S.regulars.filter(r => r.name !== c.cust.name);
    else S.regulars.forEach(r => { if (r.name === c.cust.name) r.lastDay = S.day; });
    if (S.regulars.length > 25) S.regulars.shift();
  }
  S.cars = S.cars.filter(x => x !== c);
  if (UI.selected === id) UI.selected = null;
  if (UI.inspect) UI.exitInspect();
  log(`${c.cust.name} aracını teslim aldı: ${fmt(payN)} (itibar ${repD >= 0 ? '+' : ''}${repD}).`, remaining.length ? 'bad' : 'ok');
  Life.board(id, () => departCar(id));
  syncScene(); focusHome();
  UI.modal(remaining.length ? 'Müşteri memnun değil' : 'Araç teslim edildi', `
    <p class="big ${remaining.length ? 'bad' : 'ok'}">${fmt(payN)}</p>
    <ul class="plain">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
    <p class="muted">İtibar ${repD >= 0 ? '+' : ''}${repD} · Fatura: parça ${fmt(parts)} + işçilik ${fmt(labor)}</p>`);
  save(); UI.render();
}

// ---------- galeri ----------
function buyListing(id) {
  if (!S.lic.galeri) return UI.toast('Araç alıp satmak için Galeri Ruhsatı gerekli.', 'bad');
  const c = S.market.find(x => x.id === id); if (!c) return;
  let l = freeLot(), b = -1;
  if (l < 0) { b = freeBay(); if (b < 0) return UI.toast('Aracı koyacak boş park yeri ya da lift yok.', 'bad'); }
  if (!pay(c.ask)) return;
  addMoney(-c.ask, `${MODELS[c.model].name} alındı`, true);
  S.market = S.market.filter(x => x !== c);
  Object.assign(c, { owner: 'me', buy: c.ask, spent: 0, lot: l >= 0 ? l : null, bay: b >= 0 ? b : null, boughtDay: S.day, hints: [] });
  S.cars.push(c); S.stats.bought++;
  log(`${MODELS[c.model].name} (${c.year}) ${fmt(c.ask)} karşılığında alındı. Satıcı aracı getiriyor.`);
  UI.selected = c.id; syncScene(); UI.openCar(c.id, 'info'); save();
}
function haggleSeller(id) {
  const c = S.market.find(x => x.id === id); if (!c || c.haggled) return;
  c.haggled = true;
  if (Math.random() + S.rep / 400 > 0.45) { const old = c.ask; c.ask = round1k(c.ask * (1 - rnd(0.04, 0.12))); UI.toast(`Satıcı ${fmt(old - c.ask)} indirdi.`, 'ok'); }
  else UI.toast('Satıcı fiyatta direndi.', 'bad');
  UI.render();
}
function expertise(id, fromMarket) {
  const c = fromMarket ? S.market.find(x => x.id === id) : carById(id); if (!c) return;
  if (!pay(2500)) return;
  addMoney(-2500, 'Ekspertiz raporu'); c.known = c.faults.slice(); UI.render();
}
function listForSale(id, price) {
  const c = carById(id); if (!c) return;
  if (!S.lic.galeri) return UI.toast('Satış için Galeri Ruhsatı gerekli.', 'bad');
  if (c.lot == null) return UI.toast('Satışa çıkarmak için aracı galeriye çek.', 'bad');
  price = round1k(+price || 0); if (price <= 0) return;
  c.listed = price; log(`${MODELS[c.model].name} ${fmt(price)} fiyatla satışa çıktı.`);
  scheduleBuyers(c, true);
  UI.toast('İlana konuldu. Alıcılar gün içinde gelip araca bakacak.', 'ok'); UI.render(); save();
}
function unlist(id) { const c = carById(id); c.listed = null; S.events = S.events.filter(e => e.car !== id); UI.render(); }
function sellCar(c, amount, buyer, npc) {
  addMoney(amount, `${MODELS[c.model].name} satıldı`, true);
  const profit = amount - c.buy - c.spent;
  S.stats.sold++; S.stats.profit += profit; goal('sell'); SFX.cash(); setTimeout(checkAch, 50);
  if (c.faults.length) S.pendingReviews.push({ day: S.day + ri(1, 2), name: buyer, stars: 2, text: `Aldığım ${MODELS[c.model].name} aracından ${FAULTS[c.faults[0]].part.toLowerCase()} arızası çıktı. Galeri söylemedi.`, kind: 'galeri', rep: -3 });
  else if (Math.random() < 0.45) S.pendingReviews.push({ day: S.day + 1, name: buyer, stars: 5, text: `${MODELS[c.model].name} aldım, tertemiz çıktı. Dürüst galeri.`, kind: 'galeri', rep: 2 });
  addXP(25 + Math.max(0, Math.round(profit / 8000))); if (profit > 0) addRep(2);
  const m = G.carMeshes[c.id]; if (m) m.userData.hold = true;
  S.cars = S.cars.filter(x => x !== c);
  if (UI.selected === c.id) UI.selected = null;
  log(`${buyer} ${MODELS[c.model].name} aracını ${fmt(amount)}’ye aldı. Kâr: ${fmt(profit)}`, profit >= 0 ? 'ok' : 'bad');
  if (npc && m) {
    const door = m.localToWorld(new THREE.Vector3(-(m.userData.info.W / 2 + 0.6), 0, 0.3));
    npc.go([[door.x, door.z]], () => { npc.remove(); departCar(c.id); });
  } else departCar(c.id);
  syncScene(); UI.render(); save();
  return profit;
}
function outsideService(id) {
  const c = carById(id); if (!c || c.owner !== 'me') return;
  if (tasksFor(id).length) return UI.toast('Araç üzerinde iş var.', 'bad');
  c.out = S.day + 1; c.lifted = false; c.hoodOpen = false;
  log(`${MODELS[c.model].name} dış servise gönderildi.`);
  syncScene(); UI.render(); save();
}

// ---------- mağaza ----------
function buy(kind, key) {
  if (kind === 'tool') { const t = TOOLS[key]; if (!S.lic.servis) return UI.toast('Cihazlar için Servis Ruhsatı gerekli.', 'bad'); if (S.tools[key] || !pay(t.cost)) return; addMoney(-t.cost, t.name, true); S.tools[key] = true; log(`${t.name} alındı.`); }
  if (kind === 'up') { const u = UPGRADES[key]; if (!S.lic.servis) return UI.toast('Önce Servis Ruhsatı gerekli.', 'bad'); if (S.up[key] || !pay(u.cost)) return; addMoney(-u.cost, u.name, true); S.up[key] = true; log(`${u.name} tamam.`); }
  if (kind === 'bay') { if (!S.lic.servis) return UI.toast('Önce Servis Ruhsatı gerekli.', 'bad'); const cost = BAY_COST[S.bays]; if (S.bays >= 4 || !pay(cost)) return; addMoney(-cost, `Lift ${S.bays + 1}`, true); S.bays++; log(`Lift ${S.bays} kuruldu. Personel’den usta atamayı unutma.`); }
  if (kind === 'lot') { if (!S.lic.galeri) return UI.toast('Önce Galeri Ruhsatı gerekli.', 'bad'); if (S.lot >= 8 || !pay(LOT_COST)) return; addMoney(-LOT_COST, 'Galeri park yeri', true); S.lot++; }
  if (kind === 'lic') {
    const L = LICENSE[key]; if (S.lic[key] || !pay(L.cost)) return; addMoney(-L.cost, L.name, true); S.lic[key] = true;
    if (key === 'galeri') S.lot = Math.max(S.lot, 2);
    if (key === 'servis') { S.bays = Math.max(S.bays, 1); S.tools.battery = true; addEvent({ at: S.minute + 15, type: 'cust' }); addEvent({ at: S.minute + 25, type: 'call' }); refreshCandidates(); }
    log(`${L.name} alındı — yeni yol açıldı!`, 'ok');
  }
  UI.toast('Satın alındı.', 'ok'); syncScene(); UI.render(); save();
}

// ---------- gün sonu ----------
function endDay() {
  if (UI.inspect) UI.exitInspect();
  const ev = [];
  if (S.dayEvent === 'inspect') {
    const late = S.cars.some(c => c.owner === 'customer' && c.cust.deadline <= S.day), noUsta = [...Array(S.bays).keys()].some(i => !S.staff.some(w => w.role === 'usta' && w.bay === i));
    if (late || noUsta || (rating() || 4) < 3.5) { addMoney(-7500, 'Belediye denetim cezası'); addRep(-2); ev.push('Denetimde eksik bulundu: 7.500 ₺ ceza.'); }
    else { addMoney(5000, 'Denetim ödülü'); addRep(2); ev.push('Denetimden tam not: 5.000 ₺ teşvik ve itibar.'); }
  }
  const rent = Math.round((2500 + S.bays * 1200 + S.lot * 700) * cfg('costs'));
  addMoney(-rent, 'Kira, elektrik, vergi');
  const wages = Math.round(S.staff.filter(w => w.trainDay !== S.day).reduce((s, w) => s + w.wage, 0) * cfg('costs'));
  if (wages) addMoney(-wages, `Personel maaşları (${S.staff.length} kişi)`);
  S.jobs.slice().forEach(j => jobLeaves(j));
  S.cars.filter(c => c.owner === 'customer' && c.cust.deadline <= S.day && c.contract).forEach(c => { const K = (S.contracts || []).find(k => k.id === c.contract); if (K) { K.strikes++; addMoney(-5000, `${K.company} sözleşme cezası`); ev.push(`${K.company}: araç zamanında teslim edilmedi, 5.000 ₺ ceza.`); } });
  S.cars.filter(c => c.owner === 'customer' && c.cust.deadline <= S.day).forEach(c => {
    addRep(-6); ev.push(`${c.cust.name} beklemekten sıkıldı ve aracını aldı (itibar −6).`); addReview(c.cust.name, 1, REVIEW_TXT[1][2]);
    S.staff.forEach(w => { w.queue = w.queue.filter(t => { if (t.car === c.id && t.type === 'part') S.stock[t.part] = (S.stock[t.part] || 0) + 1; return t.car !== c.id; }); });
    S.cars = S.cars.filter(x => x !== c); Life.board(c.id, () => departCar(c.id));
  });
  S.cars.filter(c => c.out && c.out <= S.day + 1).forEach(c => {
    const cost = Math.round(c.faults.reduce((s, f) => s + repairCost(f) * 1.35, 0) + 2500);
    addMoney(-cost, `Dış servis — ${MODELS[c.model].name}`); c.spent += cost;
    ev.push(`Dış servis ${MODELS[c.model].name} aracında ${c.faults.length} arıza onardı: ${fmt(cost)}.`);
    c.fixed.push(...c.faults); c.faults = []; c.known = []; c.out = null;
  });
  S.orders.forEach(o => { S.stock[o.part] = (S.stock[o.part] || 0) + o.qty; ev.push(`Toptancı teslim etti: ${FAULTS[o.part].part} ×${o.qty}.`); });
  Object.entries(S.autoOrder || {}).forEach(([p, min]) => {
    const need = min - (S.stock[p] || 0); if (need <= 0 || !FAULTS[p]) return;
    const cost = Math.round(partPrice(p) * WHOLESALE_MULT * need);
    if (S.cash < cost) { ev.push(`Otomatik sipariş yapılamadı (kasa yetersiz): ${FAULTS[p].part}.`); return; }
    addMoney(-cost, `Otomatik toptan: ${FAULTS[p].part} ×${need}`); S.stock[p] = (S.stock[p] || 0) + need;
    ev.push(`Otomatik sipariş: ${FAULTS[p].part} ×${need} depoya geldi.`);
  });
  S.orders = [];
  (S.loans || []).forEach(l => { addMoney(-l.daily, 'Kredi taksiti'); l.left--; if (l.left <= 0) { ev.push(`Kredi borcu bitti (${fmt(l.amount)}).`); S.stats.loansPaid = (S.stats.loansPaid || 0) + 1; } });
  S.loans = (S.loans || []).filter(l => l.left > 0);
  if (S.cash < 0) { const i = Math.round(-S.cash * 0.02); addMoney(-i, 'Kredi faizi'); ev.push('Kasa ekside — banka %2 faiz kesti.'); }
  S.staff.slice().forEach(w => {
    let d = (w.todayJobs ? 2 : -1) + (w.energy < 20 ? -6 : 0) + (w.wage >= wageFor(w.role, w.skill) * 1.1 ? 3 : w.wage < wageFor(w.role, w.skill) ? -4 : 0) + ri(-2, 2);
    w.morale = Math.max(0, Math.min(100, (w.morale == null ? 70 : w.morale) + d));
    if (w.morale < 20 && !w.errand && Math.random() < 0.4) { S.staff = S.staff.filter(x => x !== w); ev.push(`${wname(w)} moralsizdi, işi bıraktı!`); w.queue.forEach(t => { if (t.type === 'part') S.stock[t.part] = (S.stock[t.part] || 0) + (t.qty || 1); }); }
    else if (w.morale < 30) ev.push(`${wname(w)} mutsuz (moral ${Math.round(w.morale)}). Prim ya da zam düşünebilirsin.`);
    if (w.trainDay === S.day) { if (w.trainKind === 'skill') { w.skill = Math.min(5, w.skill + 1); w.wage = wageFor(w.role, w.skill); } else { w.spec = w.trainKind; } ev.push(`${wname(w)} eğitimi tamamladı: ${w.trainKind === 'skill' ? stars(w.skill) : SPECS[w.spec].name}.`); w.trainDay = null; w.trainKind = null; }
    w.energy = 100; w.todayJobs = 0; w.bonusDay = 0;
  });
  S.history.push({ day: S.day, inc: S.today.inc, exp: S.today.exp, inv: S.today.inv || 0, wages, rent, rating: rating() });
  if (S.history.length > 30) S.history.shift();
  if (S.adUntil === S.day) ev.push('Reklam kampanyası bitti.');
  const sum = { inc: S.today.inc, exp: S.today.exp, inv: S.today.inv || 0, ev: S.today.ev.slice(), notes: ev, day: S.day, wages, rent };
  S.day++; S.minute = 0; S.today = { inc: 0, exp: 0, inv: 0, ev: [] };
  S.appReq = [];
  S.cars.forEach(c => { c.lifted = false; c.hoodOpen = false; });
  S.staff.forEach(w => { w.queue.forEach(t => { delete t._rt; }); });
  S.pendingReviews = S.pendingReviews.filter(p => { if (p.day > S.day) return true; addReview(p.name, p.stars, p.text, p.kind); addRep(p.rep); ev.push(`${p.name} galeri için ${p.stars}★ yorum yazdı.`); return false; });
  S.weather = S.forecast || 'sunny'; S.forecast = pick(WEATHER_ORDER);
  ev.push(`Bugün hava: ${WEATHER[S.weather].name}. Yarın: ${WEATHER[S.forecast].name}.`);
  rollDayEvent(ev);
  companyDay(ev);
  if (S.lic.galeri && S.day % 4 === 0) { S.auction = { day: S.day, lots: [genListing(), genListing(), genListing()].map(c => (c.note = 'İhale aracı — ekspertiz yok, olduğu gibi satılır.', c.ask = round1k(carValue(c, true) * 0.55), c)), done: {} }; ev.push('Bugün oto ihalesi var! Galeri → İhale sekmesine bak.'); }
  refreshMarket(false); refreshCandidates(); genGoals(); scheduleDay(false); checkAch(); applyWeather();
  ev.forEach(e => log(e));
  save(); syncScene(); S.staff.forEach(workerGoHome); UI.daySummary(sum); UI.render();
}

// ---------- işletme profili, hedefler ----------
function rating() { const r = S.reviews; return r.length ? r.reduce((s, x) => s + x.stars, 0) / r.length : null; }
function addReview(name, stars, text, kind = 'servis') {
  S.reviews.unshift({ id: 'v' + (S.idc++), name, stars, text, day: S.day, kind, reply: null });
  if (S.reviews.length > 120) S.reviews.pop();
  if (stars === 5) goal('five');
  UI.toast(`Yeni yorum: ${'★'.repeat(stars)} — ${name}`, stars >= 4 ? 'ok' : stars <= 2 ? 'bad' : 'info');
}
function replyReview(id, k) {
  const r = S.reviews.find(x => x.id === id); if (!r || r.reply) return;
  r.reply = REPLY_TPL[k].t;
  if (r.stars <= 2) { addRep(REPLY_TPL[k].fix ? 2 : 1); UI.toast('Yanıtın görüldü, itibarın biraz toparlandı.', 'ok'); }
  UI.render(); save();
}
function runAd() {
  if (S.adUntil >= S.day) return UI.toast('Kampanya zaten sürüyor.', 'bad');
  if (!pay(AD_COST)) return;
  addMoney(-AD_COST, 'İnternet reklamı'); S.adUntil = S.day + AD_DAYS - 1;
  addEvent({ at: Math.min(dayMinutes() - 60, S.minute + 20), type: 'cust' }); addEvent({ at: Math.min(dayMinutes() - 60, S.minute + 40), type: 'call' });
  log(`Reklam kampanyası başladı (${AD_DAYS} gün).`, 'ok'); UI.toast('Reklam yayında: daha çok müşteri ve telefon gelecek.', 'ok'); UI.render(); save();
}
function setLaborRate(v) { S.laborRate = v; log(`Saatlik işçilik ücreti ${fmt(v)} oldu.`); UI.render(); save(); }
function genGoals() {
  const pool = shuffle(GOAL_POOL.filter(g => (!g.galeri || S.lic.galeri) && (S.lic.servis || g.type === 'sell')));
  S.goals = pool.slice(0, 3).map(g => { const n = g.n[0] === g.n[1] ? g.n[0] : g.type === 'income' ? round1k(rnd(g.n[0], g.n[1])) : ri(g.n[0], g.n[1]); return { type: g.type, n, p: 0, txt: g.txt(n), reward: g.reward(n), done: false }; });
}
function goal(type, amt = 1) {
  (S.goals || []).forEach(g => {
    if (g.done || g.type !== type) return;
    g.p = Math.min(g.n, g.p + amt);
    if (g.p >= g.n) { g.done = true; SFX.ding(); addMoney(g.reward, `Günlük hedef: ${g.txt}`); addXP(20); UI.toast(`Hedef tamam: ${g.txt} (+${fmt(g.reward)})`, 'ok'); log(`Günlük hedef tamamlandı: ${g.txt}.`, 'ok'); }
  });
}

// ---------- v7 ----------
function checkAch() {
  S.ach = S.ach || {};
  ACH.forEach(a => { if (!S.ach[a.id] && a.test()) { S.ach[a.id] = S.day; UI.toast(`Başarım: ${a.name}!`, 'ok'); SFX.ding(); log(`Başarım açıldı: ${a.name}.`, 'ok'); addXP(30); } });
}
function takeLoan(i) {
  const L = LOANS[i], debt = (S.loans || []).reduce((s, l) => s + l.daily * l.left, 0);
  if (debt + L.amount * LOAN_RATE > 1600000) return UI.toast('Banka daha fazla kredi vermiyor.', 'bad');
  S.loans = S.loans || [];
  S.loans.push({ amount: L.amount, daily: Math.round(L.amount * LOAN_RATE / L.days), left: L.days });
  addMoney(L.amount, `Banka kredisi`, true);
  log(`${fmt(L.amount)} kredi çekildi (${L.days} gün taksit).`); SFX.cash(); UI.render(); save();
}
function bonusWorker(id) {
  const w = staffById(id); if (!w || w.bonusDay) return;
  if (!pay(w.wage)) return;
  addMoney(-w.wage, `${wname(w)} — prim`); w.morale = Math.min(100, (w.morale || 70) + 20); w.bonusDay = 1;
  UI.toast(`${wname(w)} primi aldı, morali yükseldi.`, 'ok'); UI.render(); save();
}
function raiseWorker(id) {
  const w = staffById(id); if (!w) return;
  w.wage = Math.round(w.wage * 1.15 / 50) * 50; w.morale = Math.min(100, (w.morale || 70) + 15);
  UI.toast(`${wname(w)} zam aldı: ${fmt(w.wage)}/gün.`, 'ok'); UI.render(); save();
}
function applyWeather() { if (typeof setWeatherFx === 'function') setWeatherFx(S.weather); }

// ---------- v8 ----------
function trainWorker(id, kind) {
  const w = staffById(id); if (!w || w.role !== 'usta') return;
  if (w.trainDay) return UI.toast('Zaten eğitime kayıtlı.', 'bad');
  if (kind === 'skill' && w.skill >= 5) return UI.toast('Zaten en üst seviyede.', 'bad');
  const cost = kind === 'skill' ? TRAIN_COST * w.skill : TRAIN_COST;
  if (!pay(cost)) return;
  addMoney(-cost, `${wname(w)} — eğitim`, true);
  w.trainDay = S.day + 1; w.trainKind = kind;
  UI.toast(`${wname(w)} yarın kursta olacak; akşam ${kind === 'skill' ? 'bir yıldız' : SPECS[kind].name + ' uzmanlığı'} kazanır.`, 'ok'); UI.render(); save();
}
function modCar(id, k) {
  const c = carById(id), M = MODS[k]; if (!c) return;
  if ((c.mods || []).includes(k) || tasksFor(id).some(x => x.t.type === 'mod' && x.t.mod === k)) return UI.toast('Bu modifiye zaten yapıldı ya da sırada.', 'bad');
  if (!pay(Math.round(M.cost * cfg('parts')))) return;
  if (enqueue(c, { type: 'mod', mod: k, min: M.labor })) { const cost = Math.round(M.cost * cfg('parts')); addMoney(-cost, `${M.name} malzemesi`); if (c.owner === 'me') c.spent += cost; }
}
function rollDayEvent(ev) {
  S.dayEvent = null; S.fleetSent = false;
  if (S.day < 3) return;
  const r = Math.random(); let acc = 0;
  for (const [k, e] of Object.entries(DAY_EVENTS)) { acc += e.p; if (r < acc) { S.dayEvent = k; break; } }
  if (!S.dayEvent) return;
  if (S.dayEvent === 'sick') { const us = S.staff.filter(w => w.role === 'usta' && !w.trainDay); if (!us.length) { S.dayEvent = null; return; } const w = pick(us); w.sickDay = S.day; ev.push(`${wname(w)} bugün hasta, işe gelmeyecek.`); }
  ev.push(`Günün olayı: ${DAY_EVENTS[S.dayEvent].name} — ${DAY_EVENTS[S.dayEvent].desc}`);
}
function carModValue(c) { return 1 + (c.mods || []).reduce((s, k) => s + MODS[k].value, 0); }
function autoPause() { if (PREFS.autoPause && S.speed) { S.speed = 0; UI.toast('Oyun duraklatıldı — yeni müşteri/telefon.', 'info'); } }

// ---------- v10: ihale ----------
function bidAuction(id, bid) {
  const A = S.auction; if (!A || A.day !== S.day) return UI.toast('Bugün ihale yok.', 'bad');
  const c = A.lots.find(x => x.id === id); if (!c || A.done[id]) return;
  bid = round1k(+bid || 0); if (bid < c.ask) return UI.toast(`Açılış fiyatı ${fmt(c.ask)}.`, 'bad');
  if (!S.lic.galeri) return UI.toast('Galeri ruhsatı gerekli.', 'bad');
  let l = freeLot(); if (l < 0) return UI.toast('Galeride boş park yeri yok.', 'bad');
  const rival = round1k(carValue(c, true) * rnd(0.7, 0.98)), rivalName = pick(['Kara Galeri', 'Öz Otomotiv', 'Yıldız Motor', 'Sanayi Ahmet']);
  if (bid <= rival) { A.done[id] = { lost: true, price: rival, by: rivalName }; UI.toast(`${rivalName} ${fmt(rival)} ile kazandı.`, 'bad'); UI.render(); save(); return; }
  const price = Math.max(c.ask, rival + 1000);
  if (!pay(price)) return;
  addMoney(-price, `İhale: ${MODELS[c.model].name}`, true);
  A.done[id] = { won: true, price };
  Object.assign(c, { owner: 'me', buy: price, spent: 0, lot: l, bay: null, boughtDay: S.day, hints: [] });
  S.cars.push(c); S.stats.bought++;
  log(`İhaleden ${MODELS[c.model].name} ${fmt(price)}’ye alındı (en yüksek rakip ${fmt(rival)}).`, 'ok'); SFX.cash();
  UI.toast(`İhaleyi kazandın: ${fmt(price)} (ikinci fiyat ihalesi).`, 'ok');
  syncScene(); UI.render(); save();
}

// ---------- v12: şirket ----------
function tierReqs(i) {
  const T = TIERS[i]; if (!T || !T.req) return [];
  const r = T.req, out = [];
  if (r.jobs) out.push({ t: `${r.jobs} başarılı tamir`, ok: S.stats.jobs >= r.jobs, v: S.stats.jobs });
  if (r.rep) out.push({ t: `İtibar ${r.rep}`, ok: S.rep >= r.rep, v: S.rep });
  if (r.rating) out.push({ t: `Puan ${r.rating.toFixed(1).replace('.', ',')}+`, ok: (rating() || 0) >= r.rating, v: (rating() || 0).toFixed(1) });
  if (r.branches) out.push({ t: `${r.branches} şube`, ok: (S.branches || []).length >= r.branches, v: (S.branches || []).length });
  if (r.cash) out.push({ t: `${fmt(r.cash)} yatırım`, ok: S.cash >= r.cash, v: fmt(S.cash) });
  return out;
}
function upgradeTier() {
  const n = (S.tier || 0) + 1, T = TIERS[n]; if (!T) return;
  const reqs = tierReqs(n); if (!reqs.every(r => r.ok)) return UI.toast('Koşullar henüz tamam değil.', 'bad');
  addMoney(-T.req.cash, `Şirket büyümesi: ${T.name}`, true);
  S.tier = n; addRep(3); addXP(100);
  log(`Şirket büyüdü: ${T.name}!`, 'ok'); SFX.cash(); setTimeout(() => SFX.ding(), 400);
  UI.modal(`${T.name}`, `<div class="brand" style="gap:14px"><svg class="emb" viewBox="0 0 200 200" style="width:90px"><use href="#gzEmblem"/></svg><p class="big ok" style="font-size:30px">Yeni kademe!</p></div><ul class="plain">${T.perks.map(p => `<li>${p}</li>`).join('')}</ul>`, [{ t: 'Harika', cls: 'pri' }]);
  if (n >= 1) genContractOffers();
  syncScene(); UI.render(); save();
}
function buyTruckHall() {
  if ((S.tier || 0) < 2) return UI.toast('Tır servisi için “Profesyonel Servis” kademesi gerekli.', 'bad');
  if (S.truckHall || !pay(TRUCK_HALL_COST)) return;
  addMoney(-TRUCK_HALL_COST, 'Tır servisi binası', true); S.truckHall = true;
  log('Tır servisi açıldı! Personel’den tır kanallarına usta ata.', 'ok'); SFX.cash();
  addEvent({ at: Math.min(dayMinutes() - 60, S.minute + 20), type: 'truck' });
  syncScene(); UI.render(); save();
}
function buyBranch(di) {
  const D = DISTRICTS[di], lim = BRANCH_LIMIT[S.tier || 0];
  S.branches = S.branches || [];
  if (S.branches.length >= lim) return UI.toast(lim ? `Bu kademede en fazla ${lim} şube.` : 'Şube için “Profesyonel Servis” kademesi gerekli.', 'bad');
  if (S.branches.some(b => b.district === D.name)) return;
  if (!pay(D.cost)) return;
  const used = new Set(S.branches.map(b => b.bld)), free = CITY.shopFronts.map((_, i) => i).filter(i => !used.has(i));
  addMoney(-D.cost, `Şube: ${D.name}`, true);
  S.branches.push({ id: 'b' + (S.idc++), district: D.name, di, level: 1, mgr: ri(1, 3), bld: free.length ? pick(free) : -1, total: 0, last: 0, day: S.day });
  log(`${D.name} şubesi açıldı.`, 'ok'); SFX.cash(); syncScene(); UI.render(); save();
}
function upgradeBranch(id) {
  const b = (S.branches || []).find(x => x.id === id); if (!b || b.level >= 3) return;
  const cost = BRANCH_UPGRADE[b.level]; if (!pay(cost)) return;
  addMoney(-cost, `Şube büyütme: ${b.district}`, true); b.level++; UI.toast(`${b.district} şubesi seviye ${b.level} oldu.`, 'ok'); UI.render(); save();
}
function trainBranchMgr(id) {
  const b = (S.branches || []).find(x => x.id === id); if (!b || b.mgr >= 5) return;
  const cost = 40000 * b.mgr; if (!pay(cost)) return;
  addMoney(-cost, `Şube müdürü eğitimi: ${b.district}`, true); b.mgr++; UI.render(); save();
}
function sellBranch(id) {
  const b = (S.branches || []).find(x => x.id === id); if (!b) return;
  const D = DISTRICTS[b.di], val = Math.round(D.cost * 0.7 + BRANCH_UPGRADE.slice(1, b.level).reduce((a, c) => a + c, 0) * 0.6);
  S.branches = S.branches.filter(x => x !== b); addMoney(val, `Şube satıldı: ${b.district}`, true);
  log(`${b.district} şubesi ${fmt(val)}’ye satıldı.`); syncScene(); UI.render(); save();
}
function genContractOffers() {
  S.contractOffers = [];
  const pool = CONTRACT_COMPANIES.filter(c => !c.truck || ((S.tier || 0) >= 3 && S.truckHall)).filter(c => !(S.contracts || []).some(k => k.company === c.name));
  shuffle(pool).slice(0, 2).forEach(c => S.contractOffers.push({ id: 'k' + (S.idc++), company: c.name, truck: c.truck, perDay: +rnd(0.45, 0.9).toFixed(2), payMul: +rnd(1.2, 1.5).toFixed(2), days: ri(8, 15) }));
}
function acceptContract(id) {
  const o = (S.contractOffers || []).find(x => x.id === id); if (!o) return;
  if (o.truck && !S.truckHall) return UI.toast('Bu sözleşme için tır servisi gerekli.', 'bad');
  S.contractOffers = S.contractOffers.filter(x => x !== o);
  S.contracts = S.contracts || [];
  S.contracts.push(Object.assign({}, o, { until: S.day + o.days, strikes: 0, done: 0 }));
  log(`${o.company} ile ${o.days} günlük sözleşme imzalandı.`, 'ok'); SFX.ding(); UI.render(); save();
}
function companyDay(ev) {
  (S.branches || []).forEach(b => {
    const D = DISTRICTS[b.di];
    let p = D.base * [1, 1, 1.35, 1.75][b.level] * rnd(0.55, 1.35) * (0.85 + b.mgr * 0.06) * (0.9 + S.rep / 500) * ((S.tier || 0) >= 4 ? 1.2 : 1);
    if (Math.random() < 0.08) p = -D.base * rnd(0.2, 0.5);
    p = Math.round(p / 100) * 100; b.last = p; b.total += p;
    addMoney(p, `Şube ${b.district}`, false);
  });
  if ((S.branches || []).length) ev.push(`Şubelerden net: ${fmt(S.branches.reduce((s, b) => s + b.last, 0))}.`);
  (S.contracts || []).slice().forEach(k => {
    if (k.strikes >= 3) { S.contracts = S.contracts.filter(x => x !== k); addRep(-5); ev.push(`${k.company} sözleşmeyi feshetti (3 ihlal).`); }
    else if (S.day >= k.until) { S.contracts = S.contracts.filter(x => x !== k); if (!k.strikes) { const bon = 15000 + k.done * 3000; addMoney(bon, `${k.company} sözleşme primi`); addRep(3); ev.push(`${k.company} sözleşmesi kusursuz bitti: ${fmt(bon)} prim.`); } else ev.push(`${k.company} sözleşmesi sona erdi.`); }
  });
  if ((S.tier || 0) >= 1 && (S.day % 5 === 0 || !(S.contractOffers || []).length)) genContractOffers();
}
