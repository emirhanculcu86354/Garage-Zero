// ================= GARAGE ZERO — ARAYÜZ =================
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const PREFS = (() => { try { return Object.assign({ autoPause: false, camSens: 1, toasts: 'all' }, JSON.parse(localStorage.getItem('gz_prefs') || '{}')); } catch (e) { return { autoPause: false, camSens: 1, toasts: 'all' }; } })();
function savePrefs() { try { localStorage.setItem('gz_prefs', JSON.stringify(PREFS)); } catch (e) { } }

const UI = {
  selected: null, panel: null, carTab: 'info', tagEls: {}, hotEls: {}, started: false, ptab: { jobs: 'door', gallery: 'stock', biz: 'profile' },
  busy: false, work: null, inspect: null, haggle: null,

  init() {
    document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) UI.act(b.dataset.act, b.dataset, b); });
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !UI.haggle) UI.closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') { if (!$('#modal').hidden && !UI.haggle) UI.closeModal(); else if (UI.inspect) UI.exitInspect(); else UI.closePanel(); }
      if (e.key === ' ' && S && UI.started) { e.preventDefault(); S.speed = S.speed ? 0 : 1; UI.hud(); }
    });
    UI.buildStart();
  },
  paused() { return !UI.started || !$('#modal').hidden || !!UI.haggle || S.speed === 0; },

  // ---------- başlangıç ----------
  buildStart() {
    let chosen = 'karma';
    const box = $('#modes');
    const items = { servis: ['2 lift, 2 usta, 1 çırak', 'Depoda yedek parça', 'Galeri sonradan açılır'], galeri: ['4 park yeri', 'Büyük sermaye', 'Personel yok, servis sonradan'], karma: ['1 lift + 2 park yeri', '1 usta + 1 çırak', 'Al, tamir et, sat'] };
    box.innerHTML = Object.entries(START_MODES).map(([k, m]) => `<button class="mode" data-mode="${k}" aria-pressed="${k === chosen}"><h3>${m.name}</h3><p>${m.desc}</p><ul>${items[k].map(i => `<li>${i}</li>`).join('')}</ul><span class="cash">Başlangıç: ${fmt(m.cash)}</span></button>`).join('');
    box.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => { chosen = b.dataset.mode; box.querySelectorAll('.mode').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
    let diff = 'normal', conf = Object.assign({}, DIFFICULTY.normal);
    const drawDiff = () => {
      $('#diff').innerHTML = `<div class="diffrow">${[...Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name]), ['custom', 'Özel']].map(([k, n]) => `<button class="btn ${diff === k ? 'pri' : ''}" data-diff="${k}">${n}</button>`).join('')}</div>
        ${diff === 'custom' ? `<div class="cfgbox">${CFG_SLIDERS.map(s => `<label class="cfg" for="cf_${s.k}"><span class="row"><span>${s.name}</span><b class="mono" id="cv_${s.k}">${s.fmt(conf[s.k])}</b></span><input type="range" id="cf_${s.k}" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${conf[s.k]}"></label>`).join('')}</div>`
        : `<p class="muted" style="margin:6px 0 0">${diff === 'easy' ? 'Daha çok başlangıç parası, sabırlı müşteri, basit arızalar, düşük gider.' : diff === 'hard' ? 'Az para, sabırsız müşteri, karmaşık çoklu arızalar, pahalı parça ve yüksek gider.' : 'Dengeli başlangıç.'} “Özel” ile her kuralı kendin ayarla.</p>`}`;
      document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { diff = b.dataset.diff; if (diff !== 'custom') conf = Object.assign({}, DIFFICULTY[diff]); drawDiff(); }));
      document.querySelectorAll('.cfg input').forEach(i => i.addEventListener('input', () => { conf[i.dataset.k] = +i.value; const s = CFG_SLIDERS.find(x => x.k === i.dataset.k); $('#cv_' + s.k).textContent = s.fmt(+i.value); }));
    };
    drawDiff();
    let slot = [1, 2, 3].find(n => !loadSave(n)) || 1;
    const drawSlots = () => {
      $('#continueBox').innerHTML = `<div class="sec" style="margin:0 0 8px">Kayıt yuvaları</div><div class="slots">${[1, 2, 3].map(n => {
        const sv = loadSave(n);
        return `<div class="slot ${slot === n ? 'on' : ''}" data-slot="${n}"><div class="row sp"><b>Yuva ${n}</b>${slot === n ? '<span class="chip acc">yeni oyun buraya</span>' : ''}</div>
          ${sv ? `<div class="title">${esc(sv.name)}</div><div class="meta">${START_MODES[sv.mode].name} · Gün ${sv.day} · ${fmt(sv.cash)}</div>
          <div class="btns"><button class="btn sm pri" data-cont="${n}">Devam et</button><button class="btn sm ghost" data-del="${n}">Sil</button></div>` : '<div class="meta">Boş yuva</div>'}</div>`;
      }).join('')}</div>`;
      document.querySelectorAll('.slot').forEach(el => el.addEventListener('click', ev => {
        const n = +el.dataset.slot;
        if (ev.target.dataset.cont) { SLOT = n; S = loadSave(n); UI.enterGame(false); return; }
        if (ev.target.dataset.del) { UI.modal(`Yuva ${n} silinsin mi?`, '<p>Bu kayıt kalıcı olarak silinir.</p>', [{ t: 'Vazgeç' }, { t: 'Sil', cls: 'pri', fn: () => { wipeSave(n); drawSlots(); } }]); return; }
        slot = n; drawSlots();
      }));
    };
    drawSlots();
    $('#startBtn').addEventListener('click', () => {
      const go = () => { SLOT = slot; newGame(chosen, $('#coName').value, Object.assign({}, conf)); UI.enterGame(true); };
      const sv = loadSave(slot);
      if (sv) UI.modal('Yuvanın üzerine yazılsın mı?', `<p>Yuva ${slot}’daki “${esc(sv.name)}” (Gün ${sv.day}) silinip yerine yeni oyun başlayacak. Boş bir yuva seçmek için yukarıdaki kartlara dokun.</p>`, [{ t: 'Vazgeç' }, { t: 'Üzerine yaz', cls: 'pri', fn: () => { wipeSave(slot); go(); } }]); else go();
    });
  },
  enterGame(fresh) {
    Loader.show('Atölye açılıyor…');
    Loader.set(30, G.renderer ? 'Kayıt yükleniyor…' : 'Şehir ve atölye kuruluyor…');
    setTimeout(() => { UI._enter(fresh); Loader.set(100, 'Hazır!'); setTimeout(() => Loader.hide(), 250); }, 60);
  },
  _enter(fresh) {
    S.settings = S.settings || { carStyle: 'modern' }; S.events = S.events || []; if (S.speed == null) S.speed = 1;
    ['reviews', 'pendingReviews', 'goals', 'history', 'loans', 'warranty'].forEach(k => S[k] = S[k] || []); S.laborRate = S.laborRate || 2500; S.adUntil = S.adUntil || 0; if (!S.goals.length) genGoals();
    S.cfg = S.cfg || Object.assign({}, DIFFICULTY.normal); S.custom = Object.assign({}, DEFAULT_CUSTOM, S.custom || {});
    S.staff.forEach(w => { if (w.role === 'usta' && !w.spec) w.spec = 'genel'; });
    S.ach = S.ach || {}; S.weather = S.weather || 'sunny'; S.forecast = S.forecast || 'sunny';
    S.staff.forEach(w => { if (w.energy == null) w.energy = 100; if (w.morale == null) w.morale = 70; });
    S.cars.concat(S.jobs).forEach(c => { c._noAnim = true; c._custSpawned = false; });
    $('#start').hidden = true; $('#hud').hidden = false; $('#dock').hidden = false; $('#camBtn').hidden = false;
    if (!G.renderer) initScene();
    UI.started = true;
    applyCustom(); syncScene(); focusHome(); Life.restore(); applyWeather(); UI.render();
    if (fresh) UI.help();
  },

  // ---------- eylemler ----------
  act(a, d) {
    const id = d.id;
    switch (a) {
      case 'panel': UI.panel === d.p ? UI.closePanel() : UI.openPanel(d.p); break;
      case 'close': UI.closePanel(); break;
      case 'endday': UI.confirmEndDay(); break;
      case 'speed': S.speed = +d.v; break;
      case 'sound': S.settings.sound = S.settings.sound === false; SFX.init(); if (S.settings.sound) SFX.ding(); break;
      case 'accept': acceptJob(id); break;
      case 'reject': rejectJob(id); break;
      case 'open': UI.openCar(id); break;
      case 'tab': UI.carTab = d.t; UI.render(); break;
      case 'inspect': UI.enterInspect(UI.selected, d.v || 'hood'); break;
      case 'iexit': UI.exitInspect(); break;
      case 'iview': UI.setView(d.v); break;
      case 'comp': UI.openComp(d.c); break;
      case 'look': inspectComp(UI.inspect.id, d.c, 'look'); break;
      case 'meas': inspectComp(UI.inspect.id, d.c, 'meas'); break;
      case 'gtest': globalTest(UI.inspect.id, d.t); break;
      case 'part': UI.confirmPart(d.f); break;
      case 'notes': UI.showNotes(); break;
      case 'deliver': UI.confirmDeliver(UI.inspect ? UI.inspect.id : UI.selected); break;
      case 'tobay': moveToBay(UI.selected); break;
      case 'tolot': moveToLot(UI.selected); break;
      case 'list': listForSale(UI.selected, $('#sellPrice').value); break;
      case 'setprice': $('#sellPrice').value = d.v; break;
      case 'unlist': unlist(UI.selected); break;
      case 'out': UI.modal('Dış servis', '<p>Araç anlaşmalı servise gider, yarın tüm arızaları onarılmış döner. Ücret: onarım bedeli × 1,35 + 2.500 ₺ ekspertiz. Bedel araç dönünce kesilir.</p>', [{ t: 'Vazgeç' }, { t: 'Gönder', cls: 'pri', fn: () => outsideService(UI.selected) }]); break;
      case 'clean': cleanCar(UI.selected); break;
      case 'paint': UI.paintDialog(UI.selected); break;
      case 'exp': expertise(UI.selected, false); break;
      case 'buyL': { const c = S.market.find(x => x.id === id); UI.modal(`${MODELS[c.model].name} alınsın mı?`, `<p class="big">${fmt(c.ask)}</p><p class="muted">Satıcı aracı galerine getirecek. Ekspertiz 2.500 ₺.</p>`, [{ t: 'Vazgeç' }, { t: 'Satın al', cls: 'pri', fn: () => buyListing(id) }]); break; }
      case 'haggleL': haggleSeller(id); break;
      case 'expL': expertise(id, true); break;
      case 'buy': buy(d.k, d.key); break;
      case 'focus': focusCar(UI.selected, 'side'); if (window.innerWidth < 760) UI.closePanel(true); break;
      case 'help': UI.help(); break;
      case 'style': S.settings.carStyle = d.v; syncScene(); UI.render(); save(); break;
      case 'newgame': UI.modal('Yeni oyun?', '<p>Mevcut ilerlemen silinir.</p>', [{ t: 'Vazgeç' }, { t: 'Sil ve baştan başla', cls: 'pri', fn: () => { wipeSave(); location.reload(); } }]); break;
      case 'overview': overview(UI.inspect.id); break;
      case 'cancelT': cancelTask(d.w, d.t); break;
      case 'hire': hire(id); break;
      case 'fire': UI.modal('İşten çıkar?', '<p>Bir günlük maaş tazminat ödenir.</p>', [{ t: 'Vazgeç' }, { t: 'Çıkar', cls: 'pri', fn: () => fire(id) }]); break;
      case 'assign': assignWorker(id, d.b === '' ? null : +d.b); break;
      case 'errand': UI.closeModal(); sendErrand(d.f, +(d.q || 1), d.s, d.c === '1'); break;
      case 'retry': retryErrand(id, d.s, d.c === '1'); break;
      case 'drop': dropErrand(id); break;
      case 'whole': UI.closeModal(); orderWholesale(d.f, +(d.q || 1)); break;
      case 'buyPart': UI.partMissing(d.f, true); break;
      case 'apptOk': acceptAppt(id); break;
      case 'apptNo': declineAppt(id); break;
      case 'ptab': UI.ptab[UI.panel] = d.t; UI.render(); break;
      case 'ad': runAd(); break;
      case 'rate': setLaborRate(+d.v); break;
      case 'reply': UI.replyDialog(id); break;
      case 'liftEmpty': UI.ptab.jobs = 'door'; UI.openPanel('jobs'); break;
      case 'loan': UI.modal('Kredi çekilsin mi?', `<p>${fmt(LOANS[+d.i].amount)} hemen kasaya girer. ${LOANS[+d.i].days} gün boyunca günlük ${fmt(Math.round(LOANS[+d.i].amount * LOAN_RATE / LOANS[+d.i].days))} taksit ödersin (toplam %${Math.round((LOAN_RATE - 1) * 100)} faiz).</p>`, [{ t: 'Vazgeç' }, { t: 'Krediyi çek', cls: 'pri', fn: () => takeLoan(+d.i) }]); break;
      case 'bonus': bonusWorker(id); break;
      case 'raise': raiseWorker(id); break;
      case 'gfx': setGfx(d.v); UI.render(); break;
      case 'trainDlg': UI.trainDialog(id); break;
      case 'train': UI.closeModal(); trainWorker(d.w, d.k); break;
      case 'paintGo': UI.closeModal(); paintCar(UI.selected, d.c === '' ? null : +d.c); break;
      case 'cust': UI.setCustom(d.k, d.v); break;
      case 'custName': { const v = $('#cuName').value.trim().slice(0, 24); if (v) { S.name = v; syncScene(); UI.toast('İşletme adı güncellendi.', 'ok'); } const sub = $('#cuSub').value.trim().slice(0, 28); S.custom.signSub = sub; syncScene(); break; }
      case 'pref': PREFS[d.k] = d.k === 'camSens' ? +d.v : d.k === 'autoPause' ? d.v === '1' : d.v; savePrefs(); UI.render(); break;
      case 'mod': modCar(UI.selected, d.k); break;
      case 'markup': S.partMarkup = +d.v; UI.render(); break;
      case 'autoOrd': { S.autoOrder = S.autoOrder || {}; const seq = [0, 1, 2, 3, 5], cur = S.autoOrder[d.f] || 0; const nx = seq[(seq.indexOf(cur) + 1) % seq.length]; if (nx) S.autoOrder[d.f] = nx; else delete S.autoOrder[d.f]; UI.render(); break; }
      case 'bid': bidAuction(id, $('#bid_' + id).value); break;
      case 'cam': UI.camNext(); break;
      case 'mbtn': { const b = UI.mBtns[+d.i]; UI.closeModal(); b && b.fn && b.fn(); break; }
      case 'hAccept': haggleAccept(); break;
      case 'hCounter': haggleCounter($('#hPrice').value); break;
      case 'hSet': $('#hPrice').value = d.v; break;
      case 'hEnd': haggleEnd(); break;
    }
    if (S && UI.started) { UI.hud(); if (UI.inspect) UI.renderInspect(); save(); }
  },

  confirmEndDay() {
    const due = S.cars.filter(c => c.owner === 'customer' && c.cust.deadline <= S.day);
    const rent = Math.round((2500 + S.bays * 1200 + S.lot * 700) * cfg('costs')), wages = Math.round(S.staff.reduce((s, w) => s + w.wage, 0) * cfg('costs'));
    UI.modal(`Dükkânı erken kapat?`, `<p>Saat ${clock(S.minute)}. Mesai 18:00’de kendiliğinden biter.</p><dl class="kv"><dt>Kira ve giderler</dt><dd>${fmt(rent)}</dd><dt>Personel maaşları</dt><dd>${fmt(wages)}</dd></dl>
      ${due.length ? `<p class="bad">Bugün teslim edilmesi gereken ${due.length} müşteri aracı var. Teslim etmezsen araçlarını alıp gider (itibar −6).</p>` : ''}
      ${S.jobs.length ? `<p class="muted">Kapıda bekleyen ${S.jobs.length} müşteri gidecek.</p>` : ''}`,
      [{ t: 'Devam et' }, { t: 'Günü bitir', cls: 'pri', fn: endDay }]);
  },
  confirmDeliver(id) {
    const c = carById(id); if (!c) return;
    const nothing = !c.fixed.length && !c.wasted.length;
    UI.modal('Araç teslim edilsin mi?', `<p>${esc(c.cust.name)} aracını alıp gidecek. Fatura yalnızca <b>gerçekten arızalı olup değiştirdiğin</b> parçaları kapsar.</p>
      ${nothing ? '<p class="warn">Hiç parça değiştirmedin. Sorun devam ederse müşteri memnun kalmaz.</p>' : '<p class="muted">Onarım sonrası testleri tekrarlayıp bulguların normale döndüğünü doğruladın mı?</p>'}`,
      [{ t: 'Bekle' }, { t: 'Teslim et', cls: 'good', fn: () => deliver(id) }]);
  },
  confirmPart(f) {
    const F = FAULTS[f], n = S.stock[f] || 0;
    if (!n) return UI.partMissing(f);
    UI.modal(`${F.part} değiştirilsin mi?`, `<dl class="kv"><dt>Depoda</dt><dd>${n} adet</dd><dt>Parça değeri</dt><dd>${fmt(F.cost)}</dd><dt>İşçilik</dt><dd>${laborTime(f)} dk (ustanın hızına göre)</dd></dl>
      <p class="muted">Depodan 1 adet düşer. Arızalı değilse müşteri bu parçayı ödemez.</p>`, [{ t: 'Vazgeç' }, { t: 'Sök ve tak', cls: 'pri', fn: () => { replacePart(UI.inspect.id, f); UI.renderInspect(); } }]);
  },
  partMissing(f, browse) {
    const F = FAULTS[f], run = bestRunner();
    const opts = Object.entries(STORES).map(([k, st]) => `<div class="card"><div class="row sp"><span class="title">${st.name}</span><span class="price" style="font-size:17px">${fmt(F.cost * st.mult)}</span></div>
      <span class="meta">${st.desc} · ~${st.min} dk · bulunma %${Math.round(st.avail * 100)}</span>
      <div class="btns">${run ? `<button class="btn sm pri" data-act="errand" data-f="${f}" data-s="${k}">${wname(run)}’ı gönder</button>` : ''}<button class="btn sm" data-act="errand" data-f="${f}" data-s="${k}" data-c="1">Kurye (+${fmt(COURIER_FEE)})</button></div></div>`).join('');
    UI.modal(browse ? `${F.part} temin et` : `${F.part} depoda yok`, `<p class="muted">Depoda ${S.stock[f] || 0} adet. ${run ? '' : 'Boşta çırak yok, kurye gönderebilirsin.'}</p><div class="list">${opts}
      <div class="card"><div class="row sp"><span class="title">Toptancı siparişi</span><span class="price" style="font-size:17px">${fmt(F.cost * WHOLESALE_MULT)}</span></div><span class="meta">En ucuzu. Yarın sabah depoda.</span>
      <div class="btns"><button class="btn sm" data-act="whole" data-f="${f}" data-q="1">1 adet</button><button class="btn sm" data-act="whole" data-f="${f}" data-q="3">3 adet</button></div></div></div>`, [{ t: 'Kapat' }]);
  },

  // ---------- panel ----------
  openPanel(p) { if (UI.inspect) UI.exitInspect(); document.body.classList.add('panelopen'); UI.panel = p; if (p !== 'car') UI.selected = null; $('#panel').classList.remove('closed'); UI.render(); },
  closePanel(keepSel) { document.body.classList.remove('panelopen'); UI.panel = null; if (!keepSel) UI.selected = null; $('#panel').classList.add('closed'); UI.render(); },
  openCar(id, tab) {
    if (UI.inspect) return;
    UI.selected = id; UI.panel = 'car';
    if (tab) UI.carTab = tab; else if (UI._lastCar !== id) UI.carTab = 'info';
    UI._lastCar = id; focusCar(id); document.body.classList.add('panelopen'); $('#panel').classList.remove('closed'); UI.render();
  },
  render() {
    if (!S || !UI.started) return;
    UI.hud();
    document.querySelectorAll('.dbtn[data-p]').forEach(b => b.setAttribute('aria-pressed', UI.panel === b.dataset.p));
    if (!UI.panel) return;
    const body = $('#pbody'), tabs = $('#ptabs'), scroll = body.scrollTop;
    tabs.hidden = true;
    let r;
    if (UI.panel === 'car') {
      const c = carById(UI.selected), j = jobById(UI.selected);
      if (!c && !j) { UI.closePanel(); return; }
      r = c ? UI.carView(c) : UI.jobView(j);
    } else r = UI['view_' + UI.panel]();
    $('#ptitle').textContent = r.title; $('#psub').textContent = r.sub || '';
    if (r.tabs) { tabs.hidden = false; tabs.innerHTML = r.tabs; }
    const active = document.activeElement && document.activeElement.id;
    const keepVal = active === 'sellPrice' ? $('#sellPrice').value : null;
    body.innerHTML = r.html;
    if (keepVal != null && $('#sellPrice')) { $('#sellPrice').value = keepVal; $('#sellPrice').focus(); }
    if (UI._keepScroll === UI.panel + UI.carTab) body.scrollTop = scroll;
    UI._keepScroll = UI.panel + UI.carTab;
  },
  hud() {
    if (!S) return;
    $('#hName').textContent = S.name; $('#hMode').textContent = [S.lic.servis && 'Servis', S.lic.galeri && 'Galeri'].filter(Boolean).join(' + ');
    $('#hDay').textContent = 'Gün ' + S.day + ' · ' + WEATHER[S.weather || 'sunny'].name + (S.dayEvent ? ' · ' + DAY_EVENTS[S.dayEvent].name : ''); $('#hClock').textContent = clock(S.minute);
    $('#hBar').style.width = Math.min(100, S.minute / dayMinutes() * 100) + '%';
    $('#hCashV').textContent = fmt(S.cash); $('#hCash').classList.toggle('neg', S.cash < 0);
    const rb = Array.from({ length: 10 }, (_, i) => `<i class="${S.rep >= (i + 1) * 10 - 5 ? 'on' : ''}"></i>`).join('');
    if ($('#hRepBar').innerHTML !== rb) $('#hRepBar').innerHTML = rb;
    $('#hLvlV').textContent = lvl() + ' · ' + (S.xp % 400) + '/400';
    const nj = S.jobs.length + S.appReq.length; $('#bJobs').hidden = !nj; $('#bJobs').textContent = nj;
    const noUsta = S.lic.servis ? [...Array(S.bays).keys()].filter(i => !S.staff.some(w => w.role === 'usta' && w.bay === i)).length : 0;
    $('#bStaff').hidden = !noUsta; $('#bStaff').textContent = '!';
    const fails = S.errands.filter(e => e.status === 'fail').length; $('#bDepot').hidden = !fails; $('#bDepot').textContent = fails;
    $('#dGallery').hidden = !S.lic.galeri && !S.cars.some(c => c.owner === 'me');
    $('#dStaff').hidden = $('#dDepot').hidden = !S.lic.servis;
    document.querySelectorAll('#spd button[data-v]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === S.speed));
    const sb = $('#sndBtn'); if (sb) { const on = S.settings.sound !== false; sb.setAttribute('aria-pressed', 'false'); sb.style.opacity = on ? 1 : 0.45; $('#sndWave').style.display = on ? '' : 'none'; }
    const now = performance.now(); if (now - (UI._lu || 0) > 400) { UI._lu = now; UI.updateLifts(); }
  },
  carMeta(c) {
    const loc = c.out ? 'Dış serviste' : c.bay != null ? `Lift ${c.bay + 1}` : c.lot != null ? `Park P${c.lot + 1}` : c.apron != null ? 'Kapıda bekliyor' : '';
    return `${c.year} · ${c.km.toLocaleString('tr-TR')} km · Boya %${c.paint}${loc ? ' · ' + loc : ''}`;
  },

  // ---------- araç paneli ----------
  jobView(j) {
    const left = j.cust.deadline - S.day;
    const html = `<div class="sec">Müşteri şikayeti</div><div class="card"><div class="row sp"><span class="title">${esc(j.cust.name)}</span><span class="chip ${left <= 0 ? 'bad' : 'warn'}">${left <= 0 ? 'Bugün teslim' : left === 1 ? 'Yarına kadar' : left + ' gün içinde'}</span></div>
      <ul class="complaint">${j.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>
      ${j.warranty ? '<div class="note">Garanti işi: Daha önce teslim ettiğin araç, sorun sürüyor. Ücret alınmaz; reddedersen itibar ve puan kaybedersin.</div>' : ''}${j.tow ? `<div class="note">Araç çalışmıyor, çekiciyle geldi. Çekici ücreti (${fmt(TOW_FEE)}) faturaya eklenir.</div>` : ''}
      <span class="meta">Kapıda bekliyor · ${j.leaveAt ? Math.max(0, Math.round(j.leaveAt - S.minute)) + ' dk sabrı kaldı' : ''}</span></div>
      <div class="btns" style="margin-top:12px"><button class="btn" data-act="reject" data-id="${j.id}">Reddet</button><button class="btn pri" data-act="accept" data-id="${j.id}" ${freeBay() < 0 ? 'disabled' : ''}>${freeBay() < 0 ? 'Boş lift yok' : 'Kabul et, içeri al'}</button></div>`;
    return { title: MODELS[j.model].name, sub: UI.carMeta(j), html };
  },
  carView(c) {
    const isCust = c.owner === 'customer';
    const tabs = [['info', 'Durum']]; if (!isCust) tabs.push(['sale', 'Satış']);
    if (!tabs.some(t => t[0] === UI.carTab)) UI.carTab = 'info';
    const tabHtml = tabs.length > 1 ? tabs.map(([k, n]) => `<button class="tab" data-act="tab" data-t="${k}" aria-selected="${UI.carTab === k}">${n}</button>`).join('') : null;
    return { title: MODELS[c.model].name, sub: UI.carMeta(c), tabs: tabHtml, html: UI.carTab === 'sale' ? UI.carSale(c) : UI.carInfo(c) };
  },
  findingsHtml(c, onlyAb) {
    const rows = Object.entries(c.findings).filter(([, f]) => !onlyAb || f.ab);
    if (!rows.length) return '';
    return rows.map(([k, f]) => {
      const [kind, comp] = k.split(':');
      const label = comp ? `${COMPS[comp].name} · ${kind === 'meas' ? 'ölçüm' : 'gözle'}` : k === 'overview' ? 'Ustanın genel kontrolü' : (GLOBAL_TESTS[k] || { name: k }).name;
      return `<div class="res ${f.ab ? 'ab' : ''}"><span class="lbl">${label}${f.stale ? ' · onarım öncesi' : ''}</span>${f.res.map(esc).join('<br>')}</div>`;
    }).join('');
  },
  carInfo(c) {
    const isCust = c.owner === 'customer';
    let h = '';
    if (isCust) {
      const left = c.cust.deadline - S.day;
      h += `<div class="sec">Müşteri şikayeti</div><div class="card"><div class="row sp"><span class="title">${esc(c.cust.name)}</span><span class="chip ${left <= 0 ? 'bad' : 'warn'}">${left <= 0 ? 'Bugün teslim' : left === 1 ? 'Yarına kadar' : left + ' gün içinde'}</span></div><ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul></div>`;
    } else {
      h += `<div class="sec">Satıcının notu</div><div class="card"><ul class="complaint"><li>${esc(c.note || '—')}</li></ul>
        ${c.known ? `<div class="row">${c.known.length ? c.known.map(f => `<span class="chip ${c.faults.includes(f) ? 'bad' : 'ok'}">${FAULTS[f].part}${c.faults.includes(f) ? '' : ' ✓'}</span>`).join('') : '<span class="chip ok">Ekspertiz temiz</span>'}</div>` : `<div class="row sp"><span class="meta">Gizli arıza olabilir.</span><button class="btn sm" data-act="exp">Ekspertiz · 2.500 ₺</button></div>`}</div>`;
    }
    if (!c.out) h += `<div style="margin-top:12px"><button class="btn pri" style="width:100%;min-height:48px;font-size:15px" data-act="inspect" data-v="hood">Aracı incele — kaput, alt takım, testler</button></div>`;
    const ab = UI.findingsHtml(c, true);
    h += `<div class="sec">Bulgular</div>` + (ab ? `<div class="list">${ab}</div>` : `<div class="note">${Object.keys(c.findings).length ? 'Yapılan kontrollerde anormal bulgu yok.' : 'Henüz kontrol yapılmadı. Kaputu aç, lifte kaldır, parçalara dokun.'}</div>`);
    if (c.fixed.length + c.wasted.length) h += `<div class="sec">Değişen parçalar</div><div class="row">${[...c.fixed, ...c.wasted].map(f => `<span class="chip">${FAULTS[f].part}</span>`).join('')}</div>`;
    if (!c.out && (S.lic.servis)) {
      const req = c.modReq || [], have = c.mods || [];
      h += `<div class="sec">Modifiye${req.length ? ' · müşteri istiyor: ' + req.map(k => MODS[k].name).join(', ') : ''}</div><div class="list">${Object.entries(MODS).map(([k, M]) => {
        const done = have.includes(k), q = tasksFor(c.id).some(x => x.t.type === 'mod' && x.t.mod === k), want = req.includes(k);
        return `<div class="task ${want && !done ? 'now' : ''}"><span style="flex:1">${M.name}<br><span class="muted">${fmt(Math.round(M.cost * cfg('parts')))} · ${M.labor} dk · değer +%${Math.round(M.value * 100)}</span></span>${done ? '<span class="chip ok">Yapıldı</span>' : q ? '<span class="chip">sırada</span>' : `<button class="btn sm ${want ? 'pri' : ''}" data-act="mod" data-k="${k}">Yap</button>`}</div>`;
      }).join('')}</div>`;
    }
    h += `<div class="sec">İşlemler</div><div class="btns"><button class="btn" data-act="focus">Araca bak</button>`;
    if (!c.clean && !c.out) h += `<button class="btn" data-act="clean">Detaylı temizlik · 1.500 ₺ · 30 dk</button>`;
    if (S.up.paint && !c.out) h += `<button class="btn" data-act="paint">Boya / renk değiştir · ${fmt(paintCost(c, null))}’den</button>`;
    if (!isCust && !c.out) {
      if (c.lot != null && S.bays > 0 && S.lic.servis) h += `<button class="btn" data-act="tobay">Lifte al</button>`;
      if (c.bay != null && S.lot > 0) h += `<button class="btn" data-act="tolot">Galeriye çek</button>`;
      h += `<button class="btn" data-act="out">Dış servise gönder</button>`;
    }
    h += `</div>`;
    if (isCust) h += `<div style="margin-top:14px"><button class="btn good" style="width:100%" data-act="deliver">Aracı teslim et</button></div>`;
    return h;
  },
  carSale(c) {
    const clean = carValue(c, false);
    const knownLoss = (c.known || []).filter(f => c.faults.includes(f)).reduce((s, f) => s + repairCost(f) * 1.4, 0);
    const est = Math.max(MODELS[c.model].base * 0.12, clean - knownLoss);
    let h = `<dl class="kv"><dt>Alış fiyatı</dt><dd>${fmt(c.buy)}</dd><dt>Yapılan masraf</dt><dd>${fmt(c.spent)}</dd><dt>Sorunsuz piyasa değeri</dt><dd>${fmt(clean)}</dd><dt>Bilinen arızalara göre</dt><dd>${c.known ? fmt(est) : '<span class="muted">ekspertiz yok</span>'}</dd></dl>
      <div class="note" style="margin-top:10px">Alıcılar gün içinde gelir, araca bakar ve seninle araç başında pazarlık eder. Onarılmamış arızalar teklifleri düşürür.</div>`;
    if (!S.lic.galeri) return h + `<div class="note">Satış için Mağaza’dan Galeri Ruhsatı al.</div>`;
    if (c.out) return h + `<div class="note">Araç dış serviste.</div>`;
    if (c.listed) h += `<div class="sec">İlanda</div><div class="card"><div class="row sp"><span class="price">${fmt(c.listed)}</span><button class="btn sm" data-act="unlist">İlanı kaldır</button></div><span class="meta">Bugün ${S.events.filter(e => e.car === c.id).length} alıcı randevusu var.</span></div>`;
    else if (c.lot == null) h += `<div class="note">Satışa çıkarmak için aracı galeriye çek.</div>`;
    else {
      const base = round1k(c.known ? est : clean);
      h += `<div class="sec">Satışa çıkar</div><div class="card"><label class="meta" for="sellPrice">İlan fiyatı (₺)</label><input type="number" id="sellPrice" step="1000" value="${round1k(base * 1.05)}">
        <div class="btns">${[0.95, 1.0, 1.05, 1.12].map(k => `<button class="btn sm" data-act="setprice" data-v="${round1k(base * k)}">${k === 1 ? 'Tahmini' : (k > 1 ? '+' : '−') + Math.round(Math.abs(k - 1) * 100) + '%'}</button>`).join('')}</div>
        <button class="btn pri" data-act="list">İlana koy</button></div>`;
    }
    return h;
  },

  // ---------- inceleme modu ----------
  enterInspect(id, view) {
    const c = carById(id); if (!c) return;
    UI.closePanel(true); UI.selected = id;
    UI.inspect = { id, view: null, comp: null };
    $('#insp').hidden = false; $('#dock').hidden = true; document.body.classList.add('inspecting'); setTimeout(applyViewOffset, 0);
    UI.setView(view === 'under' && c.bay == null ? 'hood' : view);
  },
  exitInspect() {
    if (!UI.inspect) return;
    const id = UI.inspect.id; highlightComp(id, null, false);
    UI.inspect = null; $('#insp').hidden = true; $('#dock').hidden = false; document.body.classList.remove('inspecting'); applyViewOffset(); $('#hots').innerHTML = ''; UI.hotEls = {};
    if (carById(id)) { focusCar(id); UI.openCar(id); } else focusHome();
  },
  setView(v) {
    const I = UI.inspect, c = carById(I.id); if (!c) return;
    if (v === 'under' && c.bay == null) return UI.toast('Alt takım için araç liftte olmalı. Önce “Lifte al”.', 'bad');
    I.view = v; I.comp = null; highlightComp(I.id, null, false);
    if (v === 'hood') { c.hoodOpen = true; }
    if (v === 'under') { c.lifted = true; }
    if (v === 'general') { c.lifted = false; }
    syncScene(); focusCar(I.id, v === 'general' ? 'side' : v);
    $('#hots').innerHTML = ''; UI.hotEls = {};
    UI.renderInspect();
  },
  openComp(comp) {
    const I = UI.inspect; if (!I) return;
    I.comp = comp; highlightComp(I.id, comp, true); UI.renderInspect();
  },
  isCompact() { return window.innerWidth <= 760 || window.innerHeight <= 520; },
  renderInspect() {
    const I = UI.inspect; if (!I) return;
    const c = carById(I.id); if (!c) return UI.exitInspect();
    if (UI.isCompact()) return UI.renderInspectCompact(I, c);
    $('#iSheet').classList.remove('compact');
    $('#iName').textContent = MODELS[c.model].name;
    const w = workerFor(c);
    $('#iSub').textContent = (c.owner === 'customer' ? c.cust.name + ' · ' : '') + UI.carMeta(c) + (w ? ' · ' + wname(w) : ' · usta yok');
    document.querySelectorAll('#iSeg button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.v === I.view); b.disabled = b.dataset.v === 'under' && c.bay == null; });
    $('#iNotes').textContent = `Notlar · ${Object.keys(c.findings).length}`;
    const queued = tasksFor(c.id);
    const qOf = pred => queued.some(x => pred(x.t));
    let h = '';
    if (!w) h += `<div class="note">${c.bay != null ? `Lift ${c.bay + 1}’e atanmış usta yok.` : 'Boşta usta yok.'} <button class="btn sm" data-act="panel" data-p="staff">Personel</button></div>`;
    if (I.view === 'general') {
      h += `<h3>Genel</h3>${c.owner === 'customer' ? `<ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>` : ''}<div class="acts">`;
      h += `<button class="btn ${c.findings.overview ? '' : 'pri'}" data-act="overview" ${qOf(t => t.type === 'overview') ? 'disabled' : ''}>Ustaya genel kontrol yaptır<span>${OVERVIEW_MIN} dk · ${w ? stars(w.skill) : '—'}</span></button>`;
      if (c.findings.overview) h += UI.resHtml(c, 'overview', 'Ustanın görüşü');
      Object.entries(GLOBAL_TESTS).forEach(([t, T]) => {
        const no = T.tool && !S.tools[T.tool], q = qOf(x => x.type === 'gtest' && x.test === t);
        h += `<button class="btn" data-act="gtest" data-t="${t}" ${no || q ? 'disabled' : ''}>${T.name}<span>${no ? TOOLS[T.tool].name + ' yok' : q ? 'sırada' : T.min + ' dk'}</span></button>`;
        if (c.findings[t]) h += UI.resHtml(c, t, T.name);
      });
      h += `</div>`;
      if (c.owner === 'customer') h += `<button class="btn good" data-act="deliver">Aracı teslim et</button>`;
    } else if (!I.comp) {
      h += `<h3>${I.view === 'hood' ? 'Kaput altı' : 'Alt takım'}</h3><p class="muted" style="margin:0">Parçalara dokun: gözle kontrol, ölçüm ya da değişim. Mor işaretler ustanın şüphelendiği yerler.</p>
        <div class="acts">${Object.entries(COMPS).filter(([, C]) => C.view === I.view).map(([k, C]) => `<button class="btn" data-act="comp" data-c="${k}">${C.name}<span>${UI.compState(c, k).label}</span></button>`).join('')}</div>`;
    } else {
      const C = COMPS[I.comp], noTool = C.tool && !S.tools[C.tool];
      const qL = qOf(t => t.type === 'look' && t.comp === I.comp), qM = qOf(t => t.type === 'meas' && t.comp === I.comp);
      h += `<div class="row sp"><h3>${C.name}</h3><button class="btn sm ghost" data-act="comp" data-c="">Tüm parçalar</button></div>`;
      if ((c.hints || []).includes(I.comp)) h += `<div class="note">Usta bu bölgeden şüpheleniyor.</div>`;
      h += `<div class="acts"><button class="btn" data-act="look" data-c="${I.comp}" ${qL ? 'disabled' : ''}>Gözle kontrol et<span>${qL ? 'sırada' : LOOK_MIN + ' dk'}</span></button>`;
      if (c.findings['look:' + I.comp]) h += UI.resHtml(c, 'look:' + I.comp, 'Gözle kontrol');
      if (C.tool) {
        h += `<button class="btn" data-act="meas" data-c="${I.comp}" ${noTool || qM ? 'disabled' : ''}>Ölç — ${TOOLS[C.tool].name}<span>${noTool ? 'cihaz yok' : qM ? 'sırada' : MEAS_MIN + ' dk'}</span></button>`;
        if (c.findings['meas:' + I.comp]) h += UI.resHtml(c, 'meas:' + I.comp, 'Ölçüm');
      }
      h += `</div>`;
      const parts = Object.entries(FAULTS).filter(([, F]) => F.comp === I.comp && F.lvl <= lvl() + 1);
      if (parts.length) {
        h += `<div class="sec" style="margin:6px 0 0">Parça değiştir</div><div class="acts">`;
        parts.forEach(([f, F]) => {
          const done = c.fixed.includes(f) || c.wasted.includes(f), q = qOf(t => t.part === f), n = S.stock[f] || 0;
          const pend = S.errands.some(e => e.part === f && !e.status) || S.orders.some(o => o.part === f);
          h += done ? `<div class="btn" style="justify-content:space-between">${F.part}<span class="ok">Yenilendi</span></div>`
            : q ? `<div class="btn" style="justify-content:space-between">${F.part}<span>sırada</span></div>`
            : n ? `<button class="btn" data-act="part" data-f="${f}" ${c.bay == null ? 'disabled' : ''}>${F.part}<span>depo ${n} · ${laborTime(f)} dk</span></button>`
            : `<button class="btn" data-act="buyPart" data-f="${f}">${F.part}<span class="${pend ? 'info' : 'bad'}">${pend ? 'yolda' : 'depoda yok — temin et'}</span></button>`;
        });
        h += `</div>${c.bay == null ? '<p class="muted" style="margin:0">Parça değişimi için araç liftte olmalı.</p>' : ''}`;
      }
    }
    if (queued.length) h += `<div class="sec" style="margin:6px 0 0">İş sırası</div><div class="acts">${queued.map(({ w, t }, i) => {
      const now = w.queue[0] === t, pr = now && t._rt && t._rt.arrived ? Math.min(100, (1 - t.left / t.min) * 100) : 0;
      return `<div class="task ${now ? 'now' : ''}"><span>${taskLabel(t)}</span>${now ? `<div class="bar"><i style="width:${pr}%"></i></div>` : '<span class="muted">bekliyor</span>'}${t.type === 'gtest' && now ? '' : `<button class="btn sm ghost" data-act="cancelT" data-w="${w.id}" data-t="${t.id}">İptal</button>`}</div>`;
    }).join('')}</div>`;
    $('#iSheet').innerHTML = h;
  },
  renderInspectCompact(I, c) {
    const w = workerFor(c), sheet = $('#iSheet');
    sheet.classList.add('compact');
    $('#iName').textContent = MODELS[c.model].name;
    $('#iSub').textContent = '';
    document.querySelectorAll('#iSeg button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.v === I.view); b.disabled = b.dataset.v === 'under' && c.bay == null; });
    $('#iNotes').textContent = `Not ${Object.keys(c.findings).length}`;
    const queued = tasksFor(c.id), qOf = pred => queued.some(x => pred(x.t));
    let h = '';
    if (!w) h += `<div class="note">${c.bay != null ? `Lift ${c.bay + 1}’de usta yok.` : 'Boşta usta yok.'} <button class="btn sm" data-act="panel" data-p="staff">Personel</button></div>`;
    if (I.view === 'general') {
      if (c.owner === 'customer') h += `<div class="ctxt">${c.sym.map(s => SYM[s]).join(' · ')}</div>`;
      h += `<div class="gridb">`;
      h += `<button class="btn ${c.findings.overview ? '' : 'pri'}" data-act="overview" ${qOf(t => t.type === 'overview') ? 'disabled' : ''}>Genel kontrol<small>${OVERVIEW_MIN} dk · ${w ? '★'.repeat(w.skill) : '—'}</small></button>`;
      Object.entries(GLOBAL_TESTS).forEach(([t, T]) => {
        const no = T.tool && !S.tools[T.tool], q = qOf(x => x.type === 'gtest' && x.test === t);
        h += `<button class="btn" data-act="gtest" data-t="${t}" ${no || q ? 'disabled' : ''}>${T.name}<small>${no ? 'cihaz yok' : q ? 'sırada' : T.min + ' dk'}</small></button>`;
      });
      h += `</div>`;
      ['overview', ...Object.keys(GLOBAL_TESTS)].forEach(k => { if (c.findings[k]) h += UI.resHtml(c, k, k === 'overview' ? 'Ustanın görüşü' : GLOBAL_TESTS[k].name); });
      if (c.owner === 'customer') h += `<button class="btn good" data-act="deliver">Aracı teslim et</button>`;
    } else {
      const comps = Object.entries(COMPS).filter(([, C]) => C.view === I.view);
      h += `<div class="chips" id="iChips">${comps.map(([k, C]) => { const st = UI.compState(c, k); return `<button class="cchip ${st.cls} ${I.comp === k ? 'sel' : ''}" data-act="comp" data-c="${k}"><i></i>${C.name}</button>`; }).join('')}</div>`;
      if (!I.comp) h += `<p class="muted hint">Araçtaki noktaya ya da yukarıdaki parçaya dokun.${(c.hints || []).length ? ' Mor: ustanın şüphelendiği yer.' : ''}</p>`;
      else {
        const C = COMPS[I.comp], noTool = C.tool && !S.tools[C.tool];
        const qL = qOf(t => t.type === 'look' && t.comp === I.comp), qM = qOf(t => t.type === 'meas' && t.comp === I.comp);
        h += `<div class="row sp"><b class="ctitle">${C.name}</b>${(c.hints || []).includes(I.comp) ? '<span class="chip" style="color:#b98cff;border-color:#b98cff">şüpheli</span>' : ''}</div><div class="gridb">`;
        h += `<button class="btn pri" data-act="look" data-c="${I.comp}" ${qL ? 'disabled' : ''}>Gözle kontrol<small>${qL ? 'sırada' : LOOK_MIN + ' dk'}</small></button>`;
        h += C.tool ? `<button class="btn" data-act="meas" data-c="${I.comp}" ${noTool || qM ? 'disabled' : ''}>Ölç<small>${noTool ? TOOLS[C.tool].name + ' yok' : qM ? 'sırada' : MEAS_MIN + ' dk'}</small></button>` : '<span></span>';
        h += `</div>`;
        ['look', 'meas'].forEach(k => { if (c.findings[k + ':' + I.comp]) h += UI.resHtml(c, k + ':' + I.comp, k === 'look' ? 'Gözle' : 'Ölçüm'); });
        const parts = Object.entries(FAULTS).filter(([, F]) => F.comp === I.comp && F.lvl <= lvl() + 1);
        parts.forEach(([f, F]) => {
          const done = c.fixed.includes(f) || c.wasted.includes(f), q = qOf(t => t.part === f), n = S.stock[f] || 0;
          const pend = S.errands.some(e => e.part === f && !e.status) || S.orders.some(o => o.part === f);
          h += `<div class="prow"><span>${F.part}<small>${done ? 'yenilendi' : q ? 'sırada' : n ? 'depo ' + n + ' · ' + laborTime(f) + ' dk' : pend ? 'yolda' : 'depoda yok'}</small></span>${done || q ? '' : n ? `<button class="btn sm" data-act="part" data-f="${f}" ${c.bay == null ? 'disabled' : ''}>Değiştir</button>` : `<button class="btn sm" data-act="buyPart" data-f="${f}">Temin et</button>`}</div>`;
        });
      }
    }
    if (queued.length) {
      const cur = queued.find(x => x.w.queue[0] === x.t);
      h += `<div class="qline"><span>Sıra: ${queued.length} iş${cur ? ' · şimdi: ' + taskLabel(cur.t) : ''}</span>${queued.filter(x => x !== cur).slice(0, 1).map(({ w, t }) => `<button class="btn sm ghost" data-act="cancelT" data-w="${w.id}" data-t="${t.id}">Sonrakini iptal</button>`).join('')}</div>`;
    }
    const chipsScroll = $('#iChips') ? $('#iChips').scrollLeft : 0, sc = sheet.scrollTop;
    sheet.innerHTML = h;
    if ($('#iChips')) { $('#iChips').scrollLeft = chipsScroll; const sel = $('#iChips .sel'); if (sel && UI._lastChip !== I.comp) { sel.scrollIntoView({ inline: 'center', block: 'nearest' }); UI._lastChip = I.comp; } }
    sheet.scrollTop = sc;
  },
  resHtml(c, key, label) {
    const f = c.findings[key];
    return `<div class="res ${f.ab ? 'ab' : ''}"><span class="lbl">${label}${f.stale ? ' · onarım öncesi' : ''}</span>${f.res.map(esc).join('<br>')}</div>`;
  },
  compState(c, k) {
    const parts = Object.keys(FAULTS).filter(f => FAULTS[f].comp === k);
    if (parts.some(f => c.fixed.includes(f) || c.wasted.includes(f))) return { cls: 'new', label: 'yenilendi' };
    const fs = ['look:' + k, 'meas:' + k].map(x => c.findings[x]).filter(f => f && !f.stale);
    if (fs.some(f => f.ab)) return { cls: 'ab', label: 'sorunlu bulgu' };
    if (fs.length) return { cls: 'ok', label: 'kontrol edildi' };
    if ((c.hints || []).includes(k)) return { cls: 'hint', label: 'usta şüpheleniyor' };
    return { cls: '', label: '' };
  },
  showNotes() {
    const c = carById(UI.inspect.id);
    const all = UI.findingsHtml(c, false);
    UI.modal('Teşhis notları', `${c.owner === 'customer' ? `<ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>` : ''}<div class="list">${all || '<p class="muted">Henüz not yok.</p>'}</div>`);
  },

  // ---------- pazarlık ----------
  showHaggle() {
    const H = UI.haggle, c = carById(H.carId) || { model: 'nova' };
    let foot = '';
    if (H.done === 'sold') foot = `<p class="big ok">${fmt(H.amount)}</p><p class="muted">Kâr: ${fmt(H.profit)} · ${esc(H.name)} anahtarı aldı.</p><div class="btns" style="justify-content:flex-end"><button class="btn pri" data-act="hEnd">Tamam</button></div>`;
    else if (H.done === 'leave') foot = `<div class="btns" style="justify-content:flex-end"><button class="btn" data-act="hEnd">Uğurla</button></div>`;
    else {
      const sug = [1.03, 1.06, 1.1].map(k => round1k(H.offer * k));
      foot = `<div class="offerbox"><span class="muted">Teklif</span><span class="price">${fmt(H.offer)}</span></div>
        <label class="meta" for="hPrice">Karşı teklifin</label><input type="number" id="hPrice" step="1000" value="${round1k(Math.min(c.listed || H.offer, H.offer * 1.08))}">
        <div class="btns">${sug.map(v => `<button class="btn sm" data-act="hSet" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
        <div class="btns" style="justify-content:flex-end"><button class="btn" data-act="hEnd">Reddet</button><button class="btn" data-act="hCounter">Karşı teklif ver</button><button class="btn good" data-act="hAccept">${fmt(H.offer)} kabul</button></div>`;
    }
    UI.mBtns = [];
    $('#mbox').innerHTML = `<div class="who"><div class="avatar">${esc(H.name[0])}</div><div><h3 style="font-size:24px">${esc(H.name)}</h3><span class="muted">${MODELS[c.model].name} · ilan ${c.listed ? fmt(c.listed) : '—'}</span></div></div>
      <div class="chat">${H.lines.map(l => `<div class="msg ${l.who}">${esc(l.t)}</div>`).join('')}</div>${foot}`;
    $('#modal').hidden = false;
    const ch = $('#mbox .chat'); ch.scrollTop = ch.scrollHeight;
  },

  // ---------- diğer paneller ----------
  tabsHtml(p, list) { return list.map(([k, n]) => `<button class="tab" data-act="ptab" data-t="${k}" aria-selected="${UI.ptab[p] === k}">${n}</button>`).join(''); },
  view_jobs() {
    if (!S.lic.servis) return { title: 'İşler', html: `<div class="note">Müşteri işleri için Servis Ruhsatı gerekli. Mağaza’dan alabilirsin.</div>` };
    const tab = UI.ptab.jobs;
    const tabs = UI.tabsHtml('jobs', [['door', `Kapıda · ${S.jobs.length}`], ['appt', `Randevu${S.appReq.length ? ' · ' + S.appReq.length + ' yeni' : ''}`], ['lifts', 'Liftler']]);
    let h = '';
    if (tab === 'door') {
      h += S.jobs.length ? `<div class="list">${S.jobs.map(c => {
        const left = c.cust.deadline - S.day;
        return `<div class="card"><div class="row sp"><span class="title">${MODELS[c.model].name}</span><span class="row">${c.regular ? '<span class="chip ok">Sadık müşteri</span>' : ''}${c.fleet ? '<span class="chip acc">Filo</span>' : ''}${(c.modReq || []).length ? '<span class="chip info">Modifiye</span>' : ''}${c.warranty ? '<span class="chip bad">Garanti</span>' : ''}${c.tow ? '<span class="chip warn">Çekiciyle</span>' : ''}${c.appt ? '<span class="chip ok">Randevulu</span>' : ''}<span class="chip ${left <= 0 ? 'bad' : ''}">${left <= 0 ? 'Bugün teslim' : left === 1 ? 'Yarına kadar' : left + ' gün'}</span></span></div>
          <span class="meta">${esc(c.cust.name)} · ${c.year} · ${c.km.toLocaleString('tr-TR')} km · ${c.leaveAt ? Math.max(0, Math.round(c.leaveAt - S.minute)) + ' dk sabır' : ''}</span>
          <ul class="complaint">${c.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>
          <div class="btns"><button class="btn sm" data-act="reject" data-id="${c.id}">Reddet</button><button class="btn sm pri" data-act="accept" data-id="${c.id}" ${freeBay() < 0 ? 'disabled' : ''}>${freeBay() < 0 ? 'Lift dolu' : 'Kabul et'}</button></div></div>`;
      }).join('')}</div>` : `<div class="note">Şu an kapıda müşteri yok. Gün içinde müşteriler gelir, telefonla randevu da isterler.</div>`;
    }
    if (tab === 'appt') {
      h += `<div class="sec">Telefon talepleri</div>`;
      h += S.appReq.length ? `<div class="list">${S.appReq.map(r => `<div class="card"><div class="row sp"><span class="title">${esc(r.job.cust.name)}</span><span class="chip acc">${r.day === S.day ? 'Bugün' : r.day === S.day + 1 ? 'Yarın' : 'Gün ' + r.day} ${clock(r.at)}</span></div>
        <span class="meta">${MODELS[r.job.model].name} · ${r.job.year} · ${Math.max(0, Math.round(r.expires - S.minute))} dk içinde cevap bekliyor</span>
        <ul class="complaint">${r.job.sym.map(s => `<li>${SYM[s]}</li>`).join('')}</ul>
        <div class="btns"><button class="btn sm" data-act="apptNo" data-id="${r.id}">Uygun değil</button><button class="btn sm pri" data-act="apptOk" data-id="${r.id}">Randevu ver</button></div></div>`).join('')}</div>` : `<div class="note">Bekleyen telefon yok.</div>`;
      h += `<div class="sec">Takvim</div>`;
      const ap = S.appts.slice().sort((a, b) => a.day - b.day || a.at - b.at);
      h += ap.length ? `<div class="list">${ap.map(a => `<div class="task"><span><b>${a.day === S.day ? 'Bugün' : a.day === S.day + 1 ? 'Yarın' : 'Gün ' + a.day} ${clock(a.at)}</b> · ${esc(a.job.cust.name)} — ${MODELS[a.job.model].name}</span></div>`).join('')}</div>` : `<div class="note">Takvim boş.</div>`;
      h += `<p class="muted">Randevulu müşteri daha sabırlıdır ve iyi iş çıkarırsan ekstra itibar verir. Kapıda geri çevirirsen itibar kaybedersin.</p>`;
    }
    if (tab === 'lifts') {
      h += `<div class="list">${[...Array(S.bays).keys()].map(i => {
        const car = S.cars.find(c => c.bay === i), u = S.staff.find(w => w.role === 'usta' && w.bay === i), ci = S.staff.find(w => w.role === 'cirak' && w.bay === i);
        return `<div class="card"><div class="row sp"><span class="title">Lift ${i + 1}</span><span class="meta">${u ? wname(u) + ' ' + stars(u.skill) : '<span class="bad">usta yok</span>'}${ci ? ' · ' + wname(ci) : ''}</span></div>
          ${car ? `<span class="meta">${MODELS[car.model].name}${car.owner === 'customer' ? ' · ' + esc(car.cust.name) + (car.cust.deadline <= S.day ? ' · <span class="bad">bugün teslim</span>' : '') : ' · stok aracı'} · ${Object.keys(car.findings).length} not · ${tasksFor(car.id).length} iş sırada</span><button class="btn sm" data-act="open" data-id="${car.id}">Aç</button>` : '<span class="meta">Boş</span>'}</div>`;
      }).join('')}</div>`;
    }
    return { title: 'İşler', sub: `${S.bays} lift · ${S.bays - S.cars.filter(c => c.bay != null).length} boş`, tabs, html: h };
  },
  view_gallery() {
    const tab = UI.ptab.gallery, own = S.cars.filter(c => c.owner === 'me');
    const auc = S.auction && S.auction.day === S.day;
    const tabs = UI.tabsHtml('gallery', [['stock', `Stok · ${own.length}`], ['market', `Pazar · ${S.market.length}`]].concat(auc ? [['auction', 'İhale · bugün']] : []));
    if (tab === 'auction' && !auc) UI.ptab.gallery = 'stock';
    let h = '';
    if (tab === 'auction' && auc) {
      h = `<div class="note">Kapalı zarf, ikinci fiyat ihalesi: en yüksek teklifi verirsen, rakibin teklifinin 1.000 ₺ fazlasını ödersin. Araçlar ekspertizsiz, olduğu gibi.</div><div class="list">${S.auction.lots.map(c => { const d = S.auction.done[c.id]; return `<div class="card"><div class="row sp"><span class="title">${MODELS[c.model].name}</span><span class="chip">açılış ${fmt(c.ask || 0)}</span></div><span class="meta">${c.year} · ${c.km.toLocaleString('tr-TR')} km · Boya %${c.paint} · sorunsuz değeri ≈ ${fmt(carValue(c, false))}</span>${d ? `<span class="chip ${d.won ? 'ok' : 'bad'}">${d.won ? 'Kazandın · ' + fmt(d.price) : (d.by || 'Rakip') + ' aldı · ' + fmt(d.price)}</span>` : `<div class="row"><input type="number" id="bid_${c.id}" step="1000" value="${round1k((c.ask || 0) * 1.25)}" style="max-width:160px"><button class="btn sm pri" data-act="bid" data-id="${c.id}">Teklif ver</button></div>`}</div>`; }).join('')}</div>`;
    } else if (tab === 'stock') {
      h = own.length ? `<div class="list">${own.map(c => `<div class="card"><div class="row sp"><span class="title">${MODELS[c.model].name}</span>${c.listed ? `<span class="chip acc">İlanda ${fmt(c.listed)}</span>` : '<span class="chip">Stokta</span>'}</div>
        <span class="meta">${UI.carMeta(c)}</span><span class="meta">Alış ${fmt(c.buy)} · Masraf ${fmt(c.spent)}</span><button class="btn sm" data-act="open" data-id="${c.id}">Aç</button></div>`).join('')}</div>`
        : `<div class="note">Stokta araç yok. Pazar sekmesinden araç al.</div>`;
    } else {
      h = S.lic.galeri ? '' : `<div class="note" style="margin-bottom:10px">Satın almak için Galeri Ruhsatı gerekli.</div>`;
      h += `<div class="list">${S.market.map(c => {
        const clean = carValue(c, false), gap = clean - c.ask;
        return `<div class="card"><div class="row sp"><span class="title">${MODELS[c.model].name}</span><span class="price">${fmt(c.ask)}</span></div>
          <span class="meta">${c.year} · ${c.km.toLocaleString('tr-TR')} km · Boya %${c.paint}${c.clean ? '' : ' · kirli'} · ${S.day - c.listedDay === 2 ? 'son gün' : 'ilanda ' + (S.day - c.listedDay + 1) + '. gün'}</span>
          <ul class="complaint"><li>${esc(c.note)}</li></ul>
          <span class="meta">Sorunsuz piyasa değeri ≈ ${fmt(clean)} <span class="${gap > 0 ? 'ok' : 'bad'}">(${gap > 0 ? 'ilan ' + fmt(gap) + ' altında' : 'ilan değerin üstünde'})</span></span>
          ${c.known ? `<div class="row">${c.known.length ? c.known.map(f => `<span class="chip bad">${FAULTS[f].part}</span>`).join('') : '<span class="chip ok">Ekspertiz temiz</span>'}</div>` : ''}
          <div class="btns">${c.known ? '' : `<button class="btn sm" data-act="expL" data-id="${c.id}">Ekspertiz · 2.500 ₺</button>`}
            <button class="btn sm" data-act="haggleL" data-id="${c.id}" ${c.haggled ? 'disabled' : ''}>${c.haggled ? 'Pazarlık yapıldı' : 'Pazarlık'}</button>
            <button class="btn sm pri" data-act="buyL" data-id="${c.id}" ${S.lic.galeri ? '' : 'disabled'}>Satın al</button></div></div>`;
      }).join('')}</div>`;
    }
    return { title: 'Galeri', sub: `${S.lot} park yeri · ${S.lot - S.cars.filter(c => c.lot != null).length} boş`, tabs, html: h };
  },
  view_staff() {
    const wages = S.staff.reduce((s, w) => s + w.wage, 0);
    const bayBtns = w => `<div class="btns">${[...Array(S.bays).keys()].map(i => `<button class="btn sm ${w.bay === i ? 'pri' : ''}" data-act="assign" data-id="${w.id}" data-b="${i}">Lift ${i + 1}</button>`).join('')}<button class="btn sm ${w.bay == null ? 'pri' : ''}" data-act="assign" data-id="${w.id}" data-b="">Serbest</button></div>`;
    let h = `<div class="sec">Ekibin · günlük ${fmt(wages)}</div>`;
    h += S.staff.length ? `<div class="list">${S.staff.map(w => {
      const cur = w.queue[0], er = w.errand && S.errands.find(e => e.id === w.errand);
      return `<div class="card"><div class="row sp"><span class="title">${wname(w)}</span><span class="stars">${stars(w.skill)}</span></div>
        ${w.role === 'usta' ? `<div class="row"><span class="specchip">${SPECS[w.spec || 'genel'].name}</span>${w.trainDay ? `<span class="chip warn">${w.trainDay === S.day ? 'bugün kursta' : 'yarın kursta'}</span>` : ''}</div>` : ''}
        <span class="meta">Günlük ${fmt(w.wage)} · ${w.jobs} iş · deneyim ${Math.round(w.xp)}/${500 * w.skill}${w.role === 'usta' ? ` · hız ${skillSpeed(w.skill).toFixed(2)}×` : ''}</span>
        <span class="meta">${er ? `${STORES[er.store].name}’ya gitti (${Math.max(0, Math.ceil(er.left))} dk)` : cur ? `Çalışıyor: ${taskLabel(cur)}${w.queue.length > 1 ? ` · +${w.queue.length - 1} sırada` : ''}` : 'Boşta'}</span>
        <div class="meters"><span>Enerji</span><div class="hbar"><i style="width:${Math.round(w.energy ?? 100)}%;background:${(w.energy ?? 100) < 30 ? 'var(--bad)' : 'var(--ok)'}"></i></div><span>Moral</span><div class="hbar"><i style="width:${Math.round(w.morale ?? 70)}%;background:${(w.morale ?? 70) < 30 ? 'var(--bad)' : (w.morale ?? 70) > 80 ? 'var(--ok)' : 'var(--warn)'}"></i></div></div>
        ${bayBtns(w)}<div class="btns"><button class="btn sm" data-act="bonus" data-id="${w.id}" ${w.bonusDay ? 'disabled' : ''}>${w.bonusDay ? 'Prim verildi' : 'Prim ver · ' + fmt(w.wage)}</button><button class="btn sm" data-act="raise" data-id="${w.id}">%15 zam</button>${w.role === 'usta' && !w.trainDay ? `<button class="btn sm" data-act="trainDlg" data-id="${w.id}">Eğitime gönder</button>` : ''}<button class="btn sm ghost" data-act="fire" data-id="${w.id}">İşten çıkar</button></div></div>`;
    }).join('')}</div>` : `<div class="note">Henüz personelin yok. Liftlerde iş yapmak için usta işe al.</div>`;
    h += `<div class="sec">İş başvuruları (her gün yenilenir)</div><div class="list">${S.cands.map(k => `<div class="card"><div class="row sp"><span class="title">${k.role === 'usta' ? k.name + ' Usta' : 'Çırak ' + k.name}</span><span class="stars">${stars(k.skill)}</span></div>
      ${k.role === 'usta' ? `<div class="row"><span class="specchip">${SPECS[k.spec || 'genel'].name}</span><span class="meta">${k.spec && k.spec !== 'genel' ? 'uzmanlık alanında %25 hızlı, teşhiste daha isabetli' : 'her işe eşit'}</span></div>` : ''}
      <span class="meta">${k.role === 'usta' ? `Parça değişiminde ${skillSpeed(k.skill).toFixed(2)}× hız · genel kontrolde arızaların ~%${Math.round(Math.min(1, 0.3 + k.skill * 0.14) * 100)}’ini sezer` : 'Ustaya yardım eder (+%20 hız), parça almaya gider'}</span>
      <div class="row sp"><span class="price" style="font-size:18px">${fmt(k.wage)} / gün</span><button class="btn sm pri" data-act="hire" data-id="${k.id}">İşe al</button></div></div>`).join('')}</div>`;
    h += `<p class="muted">Ustalar iş yaptıkça deneyim kazanır ve yıldızı artar. Gün içinde enerjileri düşer; yorgun ya da moralsiz usta yavaşlar ve düşük yıldızlıysa montajı aceleye getirebilir (arıza giderilmez, tekrar kontrol et). Moral çok düşerse işi bırakabilir. Prim ve zam morali yükseltir.</p>`;
    return { title: 'Personel', sub: `${S.staff.length} kişi`, html: h };
  },
  view_depot() {
    const fails = S.errands.filter(e => e.status === 'fail'), going = S.errands.filter(e => !e.status);
    let h = '';
    if (fails.length) h += `<div class="sec">Bulunamayan parçalar</div><div class="list">${fails.map(e => `<div class="card"><div class="row sp"><span class="title">${FAULTS[e.part].part}</span><span class="chip bad">${STORES[e.store].name}’da yok</span></div>
      <div class="btns">${Object.entries(STORES).filter(([k]) => k !== e.store).map(([k, st]) => `<button class="btn sm pri" data-act="retry" data-id="${e.id}" data-s="${k}">${st.name} (~${st.min} dk)</button>`).join('')}<button class="btn sm ghost" data-act="drop" data-id="${e.id}">Vazgeç</button></div></div>`).join('')}</div>`;
    if (going.length || S.orders.length) h += `<div class="sec">Yoldakiler</div><div class="list">${going.map(e => `<div class="task now"><span>${FAULTS[e.part].part} ×${e.qty} · ${STORES[e.store].name} · ${staffById(e.who) ? wname(staffById(e.who)) : 'Kurye'}</span><div class="bar"><i style="width:${Math.min(100, (1 - e.left / e.total) * 100)}%"></i></div><span class="mono">${Math.max(0, Math.ceil(e.left))} dk</span></div>`).join('')}${S.orders.map(o => `<div class="task"><span>${FAULTS[o.part].part} ×${o.qty} · Toptancı</span><span class="muted">yarın sabah</span></div>`).join('')}</div>`;
    h += `<div class="sec">Depo</div><div class="list">`;
    const zones = {};
    Object.entries(FAULTS).forEach(([k, F]) => { if (F.lvl > lvl() + 1) return; const z = COMPS[F.comp].name; (zones[z] = zones[z] || []).push(k); });
    Object.keys(FAULTS).filter(k => FAULTS[k].lvl <= lvl() + 1).sort((a, b) => (S.stock[b] || 0) - (S.stock[a] || 0)).forEach(k => {
      const F = FAULTS[k], n = S.stock[k] || 0;
      const ao = (S.autoOrder || {})[k] || 0;
      h += `<div class="task"><span class="qty ${n ? 'ok' : 'muted'}">${n}</span><span style="flex:1">${F.part}<br><span class="muted">${fmt(partPrice(k))}</span></span><button class="btn sm ${ao ? 'pri' : 'ghost'}" data-act="autoOrd" data-f="${k}" title="Gün sonunda stok bu sayının altına düşerse toptancıdan otomatik tamamla">Oto: ${ao || 'kapalı'}</button><button class="btn sm" data-act="buyPart" data-f="${k}">Temin et</button></div>`;
    });
    h += `</div><p class="muted">“Oto” düğmesi en az stok sayısını ayarlar (0→1→2→3→5): gün sonunda eksik kalan parçalar toptancıdan otomatik tamamlanır. Çırağı ya da kuryeyi yedek parçacıya gönderebilirsin; bazen parça çıkmaz, başka yere yollarsın. Toptancı en ucuzudur ama ertesi sabah gelir.</p>`;
    return { title: 'Depo', sub: `${Object.values(S.stock).reduce((a, b) => a + b, 0)} parça stokta`, html: h };
  },
  view_shop() {
    const item = (name, desc, cost, owned, k, key, lockMsg) => `<div class="card"><div class="row sp"><span class="title">${name}</span>${owned ? '<span class="chip ok">Sahipsin</span>' : `<span class="price" style="font-size:18px">${fmt(cost)}</span>`}</div>
      <span class="meta">${desc}</span>${owned ? '' : `<button class="btn sm ${S.cash >= cost && !lockMsg ? 'pri' : ''}" data-act="buy" data-k="${k}" data-key="${key || ''}" ${lockMsg ? 'disabled' : ''}>${lockMsg || 'Satın al'}</button>`}</div>`;
    let h = `<div class="sec">Ruhsatlar</div><div class="list">`;
    Object.entries(LICENSE).forEach(([k, L]) => h += item(L.name, L.desc, L.cost, S.lic[k], 'lic', k));
    h += `</div><div class="sec">Atölye alanı</div><div class="list">`;
    h += S.bays < 4 ? item(`Lift ${S.bays + 1}`, 'Aynı anda bir araç daha üzerinde çalış; daha çok müşteri gelir.', BAY_COST[S.bays] || 90000, false, 'bay', '', S.lic.servis ? '' : 'Servis ruhsatı gerekli') : item('Lift', '4 liftin hepsi kurulu.', 0, true);
    h += S.lot < 8 ? item(`Galeri park yeri P${S.lot + 1}`, 'Stokta bir araç daha tut.', LOT_COST, false, 'lot', '', S.lic.galeri ? '' : 'Galeri ruhsatı gerekli') : item('Park yeri', '8 park yerinin hepsi açık.', 0, true);
    h += `</div><div class="sec">Teşhis cihazları</div><div class="list">`;
    Object.entries(TOOLS).forEach(([k, T]) => h += item(T.name, T.desc, T.cost, S.tools[k], 'tool', k, S.lic.servis ? '' : 'Servis ruhsatı gerekli'));
    h += `</div><div class="sec">Geliştirmeler</div><div class="list">`;
    Object.entries(UPGRADES).forEach(([k, U]) => h += item(U.name, U.desc, U.cost, S.up[k], 'up', k, !S.lic.servis ? 'Servis ruhsatı gerekli' : ''));
    return { title: 'Mağaza', sub: 'Kasa: ' + fmt(S.cash), html: h + '</div>' };
  },
  view_biz() {
    const tab = UI.ptab.biz || 'profile';
    const tabs = UI.tabsHtml('biz', [['profile', 'Profil'], ['money', 'Gelir-Gider'], ['goals', `Hedefler ${S.goals.filter(g => g.done).length}/${S.goals.length}`], ['ach', `Başarım ${Object.keys(S.ach || {}).length}/${ACH.length}`], ['cust', 'Müşteriler'], ['look', 'Görünüm'], ['log', 'Ayarlar']]);
    let h = '';
    const R = rating(), n = S.reviews.length;
    if (tab === 'profile') {
      const open = S.minute < dayMinutes();
      const hist = [5, 4, 3, 2, 1].map(st => ({ st, c: S.reviews.filter(r => r.stars === st).length }));
      const mx = Math.max(1, ...hist.map(x => x.c));
      h += `<div class="gcard"><div class="gname">${esc(S.name)}</div>
        <div class="grate"><b>${R ? R.toFixed(1).replace('.', ',') : '—'}</b><span class="gst">${UI.starRow(R || 0)}</span><span class="muted">(${n})</span></div>
        <div class="meta">Oto servis${S.lic.galeri ? ' · Oto galeri' : ''} · ${open ? '<span class="ok">Açık</span> · 18:00’de kapanır' : '<span class="bad">Kapalı</span>'}</div>
        <div class="meta">Saatlik işçilik ${fmt(S.laborRate)} · ${S.staff.length} çalışan · ${S.bays} lift</div>
        <div class="ghist">${hist.map(x => `<div class="hrow"><span>${x.st}</span><div class="hbar"><i style="width:${x.c / mx * 100}%" title="${x.st} yıldız: ${x.c} yorum"></i></div><span class="mono muted">${x.c}</span></div>`).join('')}</div>
        <div class="btns">${S.adUntil >= S.day ? `<span class="chip ok">Reklam yayında · Gün ${S.adUntil}’e kadar</span>` : `<button class="btn sm pri" data-act="ad">Reklam ver · ${fmt(AD_COST)} · ${AD_DAYS} gün</button>`}</div></div>`;
      h += `<div class="sec">Yorumlar</div><div class="list">${S.reviews.slice(0, 30).map(r => `<div class="rev"><div class="row sp"><span class="who"><span class="avatar sm">${esc(r.name[0])}</span><b>${esc(r.name)}</b></span><span class="muted">${r.day ? 'Gün ' + r.day : 'eski'}${r.kind === 'galeri' ? ' · galeri' : ''}</span></div>
        <span class="gst">${'★'.repeat(r.stars)}<span class="muted">${'★'.repeat(5 - r.stars)}</span></span><p>${esc(r.text)}</p>
        ${r.reply ? `<div class="reply"><b>İşletme sahibinin yanıtı</b><br>${esc(r.reply)}</div>` : `<button class="btn sm ghost" data-act="reply" data-id="${r.id}">Yanıtla</button>`}</div>`).join('')}</div>`;
    }
    if (tab === 'money') {
      const days = S.history.slice(-10);
      h += `<div class="stat"><div><b>${fmt(S.today.inc).replace(' ₺', '')}</b><span>Bugün gelir ₺</span></div><div><b>${fmt(S.today.exp).replace(' ₺', '')}</b><span>Bugün gider ₺</span></div><div><b>${S.stats.jobs}</b><span>Toplam tamir</span></div></div>`;
      h += `<div class="sec">Günlük işletme kârı</div>${days.length ? UI.netChart(days) : '<div class="note">İlk gün kapanınca burada günlük kâr grafiği çıkacak.</div>'}`;
      if (days.length) h += `<div class="tblwrap"><table class="tbl"><thead><tr><th>Gün</th><th>Gelir</th><th>Gider</th><th>Maaş</th><th>Net</th></tr></thead><tbody>${days.slice().reverse().map(d => `<tr><td>${d.day}</td><td>${fmt(d.inc)}</td><td>${fmt(d.exp)}</td><td>${fmt(d.wages || 0)}</td><td class="${d.inc - d.exp >= 0 ? 'ok' : 'bad'}">${fmt(d.inc - d.exp)}</td></tr>`).join('')}</tbody></table></div>`;
      h += `<div class="sec">Parça kâr marjı</div><div class="btns">${[1.1, 1.3, 1.5, 1.7].map(v => `<button class="btn sm ${(S.partMarkup || 1.3) === v ? 'pri' : ''}" data-act="markup" data-v="${v}">%${Math.round((v - 1) * 100)}</button>`).join('')}</div><p class="muted">Müşteriye faturalanan parça fiyatına eklenen kâr. Yüksek marj kazancı artırır ama “pahalı” yorumları getirir.</p>
        <div class="sec">Saatlik işçilik ücreti</div><div class="btns">${LABOR_OPTIONS.map(v => `<button class="btn sm ${S.laborRate === v ? 'pri' : ''}" data-act="rate" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
        <p class="muted">Ucuz işçilik daha çok müşteri getirir; pahalıya kaçarsan kazanç artar ama yorumlarda “pahalı” şikayeti çıkar ve müşteri azalır.</p>
        <dl class="kv"><dt>Servis geliri (toplam)</dt><dd>${fmt(S.stats.earned)}</dd><dt>Galeri kârı (toplam)</dt><dd class="${S.stats.profit >= 0 ? 'ok' : 'bad'}">${fmt(S.stats.profit)}</dd><dt>Günlük sabit gider</dt><dd>${fmt(2500 + S.bays * 1200 + S.lot * 700 + S.staff.reduce((s, w) => s + w.wage, 0))}</dd></dl>
        <div class="sec">Banka kredisi</div>${(S.loans || []).length ? `<div class="list">${S.loans.map(l => `<div class="task"><span>${fmt(l.amount)} kredi · günlük ${fmt(l.daily)}</span><span class="mono">${l.left} gün</span></div>`).join('')}</div>` : ''}
        <div class="btns">${LOANS.map((L, i) => `<button class="btn sm" data-act="loan" data-i="${i}">${fmt(L.amount)} · ${L.days} gün</button>`).join('')}</div>
        <p class="muted">Kredi taksitleri her gün sonunda kasadan düşer. Büyümek için lift, usta ya da galeri aracı almakta kullanabilirsin.</p>
        <div class="sec">Bugünün hareketleri</div>${S.today.ev.length ? S.today.ev.slice().reverse().map(x => `<div class="logl"><span style="flex:1">${esc(x.t)}</span><span class="mono ${x.n >= 0 ? 'ok' : 'bad'}">${x.n >= 0 ? '+' : ''}${fmt(x.n)}</span></div>`).join('') : '<p class="muted">Henüz hareket yok.</p>'}`;
    }
    if (tab === 'goals') {
      h += `<div class="list">${S.goals.map(g => `<div class="card"><div class="row sp"><span class="title">${g.txt}</span>${g.done ? '<span class="chip ok">Tamam</span>' : `<span class="chip">${fmt(g.reward)}</span>`}</div><div class="task" style="border:0;padding:0;background:none"><div class="bar"><i style="width:${g.p / g.n * 100}%"></i></div><span class="mono">${g.type === 'income' ? fmt(g.p) : g.p}/${g.type === 'income' ? fmt(g.n) : g.n}</span></div></div>`).join('')}</div><p class="muted">Hedefler her sabah yenilenir. Tamamlayınca ödül ve deneyim kazanırsın.</p>`;
    }
    if (tab === 'cust') {
      const list = Object.values(S.customers || {}).sort((a, b) => b.spent - a.spent);
      const regs = new Set((S.regulars || []).map(r => r.name));
      h += `<p class="muted">4–5 yıldız veren müşteriler sadık müşterin olur ve ileride aynı araçla tekrar gelir. Kötü deneyim yaşayan sadık müşteri listeden çıkar.</p>`;
      h += list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Müşteri</th><th>Ziyaret</th><th>Harcama</th><th>Ort. puan</th></tr></thead><tbody>${list.slice(0, 40).map(r => `<tr><td>${esc(r.name)}${regs.has(r.name) ? ' <span class="chip ok">sadık</span>' : ''}</td><td>${r.visits}</td><td>${fmt(r.spent)}</td><td>${(r.stars.reduce((a, b) => a + b, 0) / r.stars.length).toFixed(1).replace('.', ',')}★</td></tr>`).join('')}</tbody></table></div>` : '<div class="note">Henüz kayıtlı müşteri yok. Araç teslim ettikçe burası dolar.</div>';
    }
    if (tab === 'look') {
      const C = S.custom, sw = (k, list) => `<div class="swatches">${list.map(c => `<button style="background:${c}" data-act="cust" data-k="${k}" data-v="${c}" aria-pressed="${String(C[k]).toLowerCase() === c.toLowerCase()}" aria-label="${c}"></button>`).join('')}</div>`;
      const opts = (k, obj) => `<div class="btns">${Object.entries(obj).map(([n, v]) => `<button class="btn sm ${C[k] === v ? 'pri' : ''}" data-act="cust" data-k="${k}" data-v="${v}"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#${v.toString(16).padStart(6, '0')}"></i>${n}</button>`).join('')}</div>`;
      h += `<div class="sec">İşletme adı ve tabela</div><div class="card"><label class="meta" for="cuName">İşletme adı</label><input type="text" id="cuName" maxlength="24" value="${esc(S.name)}">
        <label class="meta" for="cuSub">Tabela alt yazısı</label><input type="text" id="cuSub" maxlength="28" value="${esc(C.signSub || '')}"><button class="btn sm pri" data-act="custName">Kaydet</button></div>
        <div class="sec">Vurgu rengi (tabela, arayüz)</div>${sw('accent', SWATCHES)}
        <div class="sec">Lift rengi</div>${sw('lift', SWATCHES)}
        <div class="sec">Dış duvar</div>${opts('wall', WALL_COLORS)}
        <div class="sec">Atölye zemini</div>${opts('floor', FLOOR_COLORS)}
        <div class="sec">Usta tulumu</div>${sw('ustaSuit', ['#2c4f86', '#23272c', '#b8322a', '#3a7650', '#d6a01d', '#8c939b', '#6b2f4a', '#e6e2d8'])}
        <div class="sec">Usta şapkası</div>${sw('ustaCap', SWATCHES)}
        <div class="sec">Çırak tulumu</div>${sw('cirakSuit', ['#3a7650', '#2c4f86', '#b8322a', '#d6a01d', '#23272c', '#8c939b', '#2a8a8f', '#e6e2d8'])}
        <div class="btns" style="margin-top:12px"><button class="btn sm ghost" data-act="cust" data-k="reset" data-v="1">Varsayılana dön</button></div>`;
    }
    if (tab === 'ach') {
      h += `<div class="list">${ACH.map(a => { const got = (S.ach || {})[a.id]; return `<div class="card ${got ? '' : 'locked'}"><div class="row sp"><span class="title">${a.name}</span>${got ? `<span class="chip ok">Gün ${got}</span>` : '<span class="chip">kilitli</span>'}</div><span class="meta">${a.desc}</span></div>`; }).join('')}</div>`;
    }
    if (tab === 'log') {
      const gl = gfxLevel();
      h += `<div class="sec">Grafik kalitesi</div><div class="btns">${[['high', 'Yüksek'], ['medium', 'Orta'], ['low', 'Düşük (gölgesiz)']].map(([k, n]) => `<button class="btn sm ${gl === k ? 'pri' : ''}" data-act="gfx" data-v="${k}">${n}</button>`).join('')}</div><p class="muted">Telefon ısınır ya da takılırsa Orta veya Düşük seç.</p>
        <div class="sec">Oynanış</div>
        <div class="btns"><button class="btn sm ${PREFS.autoPause ? 'pri' : ''}" data-act="pref" data-k="autoPause" data-v="${PREFS.autoPause ? '0' : '1'}">Yeni müşteride otomatik duraklat: ${PREFS.autoPause ? 'Açık' : 'Kapalı'}</button></div>
        <div class="meta" style="margin-top:8px">Kamera hassasiyeti</div><div class="btns">${[[0.6, 'Yavaş'], [1, 'Normal'], [1.6, 'Hızlı']].map(([v, n]) => `<button class="btn sm ${PREFS.camSens === v ? 'pri' : ''}" data-act="pref" data-k="camSens" data-v="${v}">${n}</button>`).join('')}</div>
        <div class="meta" style="margin-top:8px">Bildirimler</div><div class="btns">${[['all', 'Hepsi'], ['important', 'Sadece önemli']].map(([v, n]) => `<button class="btn sm ${PREFS.toasts === v ? 'pri' : ''}" data-act="pref" data-k="toasts" data-v="${v}">${n}</button>`).join('')}</div>
        <div class="sec">Oyun kuralları</div><dl class="kv">${CFG_SLIDERS.map(s => `<dt>${s.name}</dt><dd>${s.fmt(cfg(s.k))}</dd>`).join('')}</dl>
        <div class="sec">Hava</div><p class="muted">Bugün ${WEATHER[S.weather].name}, yarın ${WEATHER[S.forecast].name}. Yağmurda fren-lastik, soğukta akü-marş, sıcakta hararet-klima arızaları artar.</p>
        <div class="sec">Araç modelleri</div><div class="btns"><button class="btn sm ${S.settings.carStyle !== 'classic' ? 'pri' : ''}" data-act="style" data-v="modern">Yeni modeller</button><button class="btn sm ${S.settings.carStyle === 'classic' ? 'pri' : ''}" data-act="style" data-v="classic">Klasik (ilk sürüm)</button></div>
        <div class="sec">Oyun</div><div class="btns"><button class="btn pri" data-act="endday">Dükkânı erken kapat</button><button class="btn" data-act="help">Nasıl oynanır</button><button class="btn" data-act="newgame">Yeni oyun</button></div>
        <div class="sec">Günlük defter</div>` + S.log.slice(0, 50).map(l => `<div class="logl"><span class="when">G${l.d} ${clock(l.m)}</span><span class="${l.kind}">${esc(l.t)}</span></div>`).join('');
    }
    return { title: 'İşletme', sub: `${R ? R.toFixed(1).replace('.', ',') + ' ★ · ' : ''}${n} yorum · itibar ${S.rep}`, tabs, html: h };
  },
  starRow(r) { return [1, 2, 3, 4, 5].map(i => `<i style="--f:${Math.max(0, Math.min(1, r - i + 1)) * 100}%"></i>`).join(''); },
  netChart(days) {
    const W = 360, H = 150, pad = { l: 54, r: 8, t: 14, b: 22 };
    const vals = days.map(d => d.inc - d.exp), mx = Math.max(1, ...vals.map(Math.abs));
    const nice = (v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p) * p; })(mx);
    const hasNeg = vals.some(v => v < 0), top = nice, bot = hasNeg ? -nice : 0;
    const y = v => pad.t + (top - v) / (top - bot) * (H - pad.t - pad.b);
    const bw = (W - pad.l - pad.r) / days.length, bar = Math.min(26, bw - 6);
    const k = v => Math.abs(v) >= 1000 ? (v < 0 ? '−' : '') + Math.abs(Math.round(v / 1000)) + ' bin' : String(Math.round(v));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Son ${days.length} günün işletme kârı">`;
    [top, 0, bot].filter((v, i, a) => a.indexOf(v) === i).forEach(v => { s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'base' : 'grid'}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${k(v)}</text>`; });
    days.forEach((d, i) => {
      const v = vals[i], x = pad.l + i * bw + (bw - bar) / 2, y0 = y(0), y1 = y(v), hh = Math.max(1, Math.abs(y1 - y0));
      const r = Math.min(4, hh / 2), up = v >= 0, top = up ? y1 : y0, bottom = up ? y0 : y1;
      const path = up ? `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + bar - r}Q${x + bar},${top} ${x + bar},${top + r}V${bottom}Z`
        : `M${x},${top}V${bottom - r}Q${x},${bottom} ${x + r},${bottom}H${x + bar - r}Q${x + bar},${bottom} ${x + bar},${bottom - r}V${top}Z`;
      s += `<g class="bh"><rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" fill="transparent"/><path d="${path}" class="${up ? 'pos' : 'neg'}"/><title>Gün ${d.day}: gelir ${fmt(d.inc)}, gider ${fmt(d.exp)}, net ${fmt(v)}</title>
        <text x="${x + bar / 2}" y="${H - 6}" text-anchor="middle" class="ax">${d.day}</text></g>`;
    });
    const li = vals.length - 1;
    s += `<text x="${pad.l + li * bw + bw / 2}" y="${vals[li] >= 0 ? y(vals[li]) - 4 : y(vals[li]) + 12}" text-anchor="middle" class="lbl">${k(Math.round(vals[li]))}</text></svg>`;
    return `<div class="chartwrap">${s}<div class="legend"><span><i class="pos"></i>Kâr</span><span><i class="neg"></i>Zarar</span><span class="muted">₺ · çubuğa dokun: ayrıntı</span></div></div>`;
  },
  paintDialog(id) {
    const c = carById(id); if (!c) return;
    const cols = CAR_COLORS.map(col => `<button style="background:#${col.toString(16).padStart(6, '0')}" data-act="paintGo" data-c="${col}" aria-pressed="${col === c.color}" title="${COLOR_NAMES[col] || ''}"></button>`).join('');
    UI.modal('Boya kabini', `<p>Aynı renkte yenileme: <b>${fmt(paintCost(c, null))}</b> · 150 dk. Renk değişimi: <b>${fmt(paintCost(c, -1))}</b> · 210 dk.</p>
      <p class="muted">Beyaz, siyah, gümüş ve füme araçlar galeride %3 daha değerli; sarı, mor, turuncu %3 daha ucuz.</p>
      <div class="swatches" style="gap:10px">${cols}</div><div class="btns"><button class="btn pri" data-act="paintGo" data-c="">Aynı renkte yenile</button></div>`, [{ t: 'Vazgeç' }]);
  },
  trainDialog(id) {
    const w = staffById(id); if (!w) return;
    const opts = Object.entries(SPECS).filter(([k]) => k !== 'genel' && k !== w.spec).map(([k, s]) => `<button class="btn" data-act="train" data-w="${w.id}" data-k="${k}">${s.name} uzmanlığı<span>${fmt(TRAIN_COST)}</span></button>`).join('');
    UI.modal(`${wname(w)} — eğitim`, `<p class="muted">Usta yarın bütün gün kursta olur (çalışmaz, maaş almaz), akşam eğitimi biter.</p><div class="acts" style="display:flex;flex-direction:column;gap:6px">
      ${w.skill < 5 ? `<button class="btn pri" data-act="train" data-w="${w.id}" data-k="skill">Ustalık kursu: ${stars(w.skill)} → ${stars(w.skill + 1)}<span>${fmt(TRAIN_COST * w.skill)}</span></button>` : ''}${opts}</div>`, [{ t: 'Vazgeç' }]);
  },
  setCustom(k, v) {
    if (k === 'reset') S.custom = Object.assign({}, DEFAULT_CUSTOM);
    else S.custom[k] = (k === 'wall' || k === 'floor') ? +v : v;
    applyCustom();
    if (k === 'ustaSuit' || k === 'ustaCap' || k === 'cirakSuit' || k === 'reset') rebuildWorkers();
    UI.render(); save();
  },
  replyDialog(id) {
    const r = S.reviews.find(x => x.id === id); if (!r) return;
    UI.mBtns = REPLY_TPL.map((t, i) => ({ t: t.t, fn: () => replyReview(id, i) })).concat([{ t: 'Vazgeç' }]);
    $('#mbox').innerHTML = `<h3>Yoruma yanıt ver</h3><div class="rev"><b>${esc(r.name)}</b> <span class="gst">${'★'.repeat(r.stars)}</span><p>${esc(r.text)}</p></div><div class="acts" style="display:flex;flex-direction:column;gap:6px">${UI.mBtns.map((b, i) => `<button class="btn ${i < 3 ? '' : 'ghost'}" style="text-align:left;justify-content:flex-start" data-act="mbtn" data-i="${i}">${b.t}</button>`).join('')}</div>`;
    $('#modal').hidden = false;
  },
  camIdx: 0,
  camNext() {
    const views = [['Atölye', () => focusHome()], ['Liftler', () => { const c = G.cam; c.tTarget.set(0, 0, -1); c.tDist = 22; c.tPitch = 0.7; c.tYaw = 0; }], ['Galeri', () => { const c = G.cam; c.tTarget.set(28, 0, 4); c.tDist = 26; c.tPitch = 0.75; c.tYaw = 0.2; }], ['Müşteri parkı', () => { const c = G.cam; c.tTarget.set(-21, 0, 3); c.tDist = 20; c.tPitch = 0.7; c.tYaw = -0.3; }], ['Sokak', () => { const c = G.cam; c.tTarget.set(0, 1, 15); c.tDist = 30; c.tPitch = 0.35; c.tYaw = 0.6; }]];
    UI.camIdx = (UI.camIdx + 1) % views.length; const v = views[UI.camIdx]; v[1](); UI.toast('Kamera: ' + v[0], 'ok');
  },
  liftsSig: '',
  updateLifts() {
    const el = $('#lifts'); if (!el) return;
    if (UI.inspect || !S.lic.servis) { el.hidden = true; return; }
    el.hidden = false;
    const chips = [];
    for (let i = 0; i < S.bays; i++) {
      const car = S.cars.find(c => c.bay === i), u = S.staff.find(w => w.role === 'usta' && w.bay === i);
      const q = car ? tasksFor(car.id) : [], cur = q.find(x => x.w.queue[0] === x.t);
      const st = !car ? 'empty' : cur ? 'work' : car.owner === 'customer' && car.cust.deadline <= S.day ? 'due' : 'idle';
      chips.push(`<button class="lift ${st}" data-act="${car ? 'open' : 'liftEmpty'}" data-id="${car ? car.id : ''}"><b>L${i + 1}</b><span>${car ? MODELS[car.model].name : 'Boş lift'}</span><small>${u ? u.name + ' ' + '★'.repeat(u.skill) + (u.spec && u.spec !== 'genel' ? ' · ' + SPECS[u.spec].name : '') : 'usta yok'}${cur ? ' · çalışıyor' : q.length ? ' · ' + q.length + ' iş' : ''}</small></button>`);
    }
    if (S.jobs.length) chips.push(`<button class="lift wait" data-act="panel" data-p="jobs"><b>${S.jobs.length}</b><span>Kapıda bekliyor</span><small>kabul / ret</small></button>`);
    const sig = chips.join('');
    if (sig !== UI.liftsSig) { el.innerHTML = sig; UI.liftsSig = sig; }
  },

  // ---------- her kare ----------
  frame() {
    if (!S || !UI.started) return;
    UI.updateTags(); UI.updateHots();
    const box = $('#iWork');
    if (UI.inspect) {
      const ck = $('#iClock'); if (ck) ck.textContent = clock(S.minute);
      const q = tasksFor(UI.inspect.id), cur = q.find(x => x.w.queue[0] === x.t);
      box.hidden = !cur;
      if (cur) {
        const t = cur.t, arrived = t._rt && t._rt.arrived;
        $('#iWorkT').textContent = `${wname(cur.w)} · ${taskLabel(t)}${arrived ? ` · ${Math.max(0, Math.ceil(t.left / workRate(cur.w, t)))} dk` : ' · araca gidiyor'}`;
        $('#iWorkBar').style.width = (arrived ? Math.min(100, (1 - t.left / t.min) * 100) : 3) + '%';
      }
      const now = performance.now();
      if (q.length && now - (UI._ir || 0) > 1000) { UI._ir = now; const bars = document.querySelectorAll('#iSheet .task.now .bar i'); if (bars.length && cur && cur.t._rt && cur.t._rt.arrived) bars[0].style.width = Math.min(100, (1 - cur.t.left / cur.t.min) * 100) + '%'; }
    }
  },
  updateTags() {
    const wrap = $('#tags'), W = window.innerWidth, H = window.innerHeight, seen = new Set();
    const list = UI.inspect ? [] : S.cars.concat(S.jobs);
    list.forEach(c => {
      const m = G.carMeshes[c.id]; if (!m) return;
      seen.add(c.id);
      let el = UI.tagEls[c.id];
      if (!el) { el = document.createElement('div'); el.className = 'tag'; el.addEventListener('click', () => UI.openCar(c.id)); wrap.appendChild(el); UI.tagEls[c.id] = el; }
      let txt, cls = 'tag';
      if (c.apron != null) { txt = `${c.warranty ? 'Garanti' : c.tow ? 'Çekici' : 'Yeni müşteri'} · ${c.cust.name}`; cls += c.warranty ? ' urgent' : ' offer'; }
      else if (c.owner === 'customer') { const left = c.cust.deadline - S.day; txt = `${c.cust.name} · ${left <= 0 ? 'bugün' : left + 'g'}`; cls += left <= 0 ? ' urgent' : ' cust'; }
      else if (c.listed) { txt = fmt(c.listed); cls += ' sale'; }
      else txt = MODELS[c.model].name;
      if (el.textContent !== txt) el.textContent = txt;
      if (el.className !== cls) el.className = cls;
      _v.set(m.position.x, m.position.y + m.userData.h + 0.6, m.position.z).project(G.camera);
      const vis = _v.z < 1 && G.cam.dist < 60 && !m.userData.testDrive;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${(_v.x * 0.5 + 0.5) * W}px, ${(-_v.y * 0.5 + 0.5) * H}px) translate(-50%,-100%)`;
    });
    Object.keys(UI.tagEls).forEach(id => { if (!seen.has(id)) { UI.tagEls[id].remove(); delete UI.tagEls[id]; } });
  },
  updateHots() {
    const I = UI.inspect, wrap = $('#hots');
    if (!I || I.view === 'general') { if (wrap.childElementCount) { wrap.innerHTML = ''; UI.hotEls = {}; } return; }
    const c = carById(I.id), m = G.carMeshes[I.id]; if (!c || !m) return;
    const ready = I.view === 'hood' ? m.userData.hoodT > 0.7 : m.userData.y > 1.2;
    const W = window.innerWidth, H = window.innerHeight;
    Object.entries(COMPS).forEach(([k, C]) => {
      if (C.view !== I.view) return;
      let el = UI.hotEls[k];
      if (!el) { el = document.createElement('div'); el.className = 'hot'; el.innerHTML = `<i></i><span>${C.name}</span>`; el.addEventListener('click', () => UI.openComp(k)); wrap.appendChild(el); UI.hotEls[k] = el; }
      const p = compWorld(I.id, k, _v); if (!p) return;
      p.project(G.camera);
      const vis = ready && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      el.style.display = vis ? '' : 'none';
      if (!vis) return;
      el.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px';
      const st = UI.compState(c, k), cls = 'hot ' + st.cls + (I.comp === k ? ' sel' : '');
      if (el.className !== cls) el.className = cls;
      el.querySelector('span').style.display = UI.isCompact() && I.comp !== k ? 'none' : '';
    });
  },
  hoverAt(x, y) {
    if (!UI.inspect || UI.inspect.comp || !G.renderer) return;
    const now = performance.now(); if (now - (UI._hv || 0) < 80) return; UI._hv = now;
    const r = G.renderer.domElement.getBoundingClientRect();
    G.raycaster.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), G.camera);
    const hit = G.raycaster.intersectObject(G.carMeshes[UI.inspect.id] || G.scene, true).find(h => h.object.visible && h.object.userData.comp && COMPS[h.object.userData.comp].view === UI.inspect.view);
    highlightComp(UI.inspect.id, hit ? hit.object.userData.comp : null, !!hit, 0x6cb4ff);
    G.renderer.domElement.style.cursor = hit ? 'pointer' : '';
  },

  // ---------- toast / modal ----------
  toast(msg, kind = 'info') {
    if (PREFS.toasts === 'important' && kind === 'info') return;
    const t = document.createElement('div'); t.className = 't ' + kind; t.textContent = msg; $('#toast').appendChild(t);
    setTimeout(() => t.remove(), 3600);
    const max = UI.inspect && UI.isCompact() ? 1 : 3;
    while ($('#toast').children.length > max) $('#toast').firstChild.remove();
  },
  modal(title, html, btns) {
    UI.mBtns = btns || [{ t: 'Tamam', cls: 'pri' }];
    $('#mbox').innerHTML = `<h3>${title}</h3>${html}<div class="btns" style="justify-content:flex-end">${UI.mBtns.map((b, i) => `<button class="btn ${b.cls || ''}" data-act="mbtn" data-i="${i}">${b.t}</button>`).join('')}</div>`;
    $('#modal').hidden = false;
  },
  closeModal() { $('#modal').hidden = true; },
  daySummary(s) {
    const net = s.inc - s.exp;
    UI.modal(`Gün ${s.day} kapandı`, `<p class="muted" style="margin-bottom:-8px">Günlük işletme sonucu</p><p class="big ${net >= 0 ? 'ok' : 'bad'}">${net >= 0 ? '+' : ''}${fmt(net)}</p>
      <dl class="kv"><dt>Servis geliri</dt><dd class="ok">${fmt(s.inc)}</dd><dt>İşletme gideri</dt><dd class="bad">${fmt(s.exp)}</dd>${s.wages ? `<dt class="muted">· personel maaşları</dt><dd class="muted">${fmt(s.wages)}</dd>` : ''}<dt class="muted">· kira ve faturalar</dt><dd class="muted">${fmt(s.rent || 0)}</dd>${s.inv ? `<dt>Araç alım-satım / yatırım</dt><dd class="${s.inv > 0 ? 'warn' : 'ok'}">${s.inv > 0 ? '−' + fmt(s.inv) : '+' + fmt(-s.inv)}</dd>` : ''}<dt>Kasa</dt><dd>${fmt(S.cash)}</dd></dl>
      ${s.notes.length ? `<ul class="plain">${s.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`, [{ t: `Gün ${S.day}’e başla`, cls: 'pri' }]);
  },
  help() {
    UI.modal('Nasıl oynanır', `<ul class="plain">
      <li><b>Saat akıyor</b> (08:00–18:00). Üstten duraklat ya da 3×/8× hızlandır.</li>
      <li><b>Müşteriler</b> kapıya gelir ya da telefonla <b>randevu</b> ister (İşler → Randevu). Kabul ettiğin araç lifte girer.</li>
      <li><b>Personel</b>: Her lifte bir usta ata, istersen bir çırak. Ustanın yıldızı arttıkça işi hızlanır ve “genel kontrol”de arızayı daha iyi sezer. Maaşlar gün sonunda ödenir.</li>
      <li><b>Aracı incele</b>: Kaput ve Alt Takım’da parçalara dokun, ustana kontrol ya da ölçüm yaptır. İşler sıraya girer, usta yürüyüp yapar.</li>
      <li><b>Depo</b>: Parça değişimi depodan düşer. Parça yoksa çırağı ya da kuryeyi yedek parçacıya yolla; bazen parça çıkmaz, başka dükkâna gönderirsin. Toptancı ucuzdur ama ertesi sabah gelir.</li>
      <li><b>Galeri</b>: Pazardan al, toparla, ilana koy. Alıcılar gelip araç başında pazarlık eder.</li>
      <li><b>İşletme</b>: İnternetteki puanın ve müşteri yorumların burada. Yorumlara yanıt ver, reklam ver, saatlik ücretini ayarla, gelir-giderini ve günlük hedeflerini takip et. Arızalı araç satarsan alıcı sonradan kötü yorum yazar.</li>
      <li>Soldaki <b>lift kartları</b> hangi liftte ne olduğunu gösterir; dokununca o araç açılır.</li>
      <li>Telefon yatay da dikey de olur. Kamera: sürükle döndür, iki parmak yakınlaştır.</li></ul>`, [{ t: 'Başlayalım', cls: 'pri' }]);
  },
};

const Loader = {
  tips: [
    'Aynı belirti birden fazla arızadan gelebilir: <b>ölçmeden</b> parça değiştirme.',
    'Ustanın yıldızı arttıkça <b>genel kontrol</b> arızayı daha iyi sezer.',
    'Yağmurlu günlerde <b>fren ve lastik</b> işleri artar.',
    'Satıcılar arızayı saklayabilir. Almadan önce <b>ekspertiz</b> yaptır.',
    'Depoda parça yoksa <b>çırağı</b> yedek parçacıya yolla; bazen “yokmuş” der.',
    '4–5 yıldız veren müşteri <b>sadık müşterin</b> olur ve tekrar gelir.',
    'Arızalı araç satarsan alıcı sonradan <b>kötü yorum</b> yazar.',
    'Yorgun usta yavaşlar. <b>Prim</b> ve <b>zam</b> morali yükseltir.',
    'İşletme → Görünüm’den tabelanı, renklerini ve ustanın tulumunu değiştir.',
    'Her 4 günde bir galeride <b>oto ihalesi</b> açılır.',
  ],
  i: 0, timer: null, shown: 0,
  el(id) { return document.getElementById(id); },
  set(p, txt) { const f = this.el('ldFill'); if (f) f.style.width = Math.max(4, Math.min(100, p)) + '%'; if (txt && this.el('ldStat')) this.el('ldStat').textContent = txt; },
  tip() { const t = this.el('ldTip'); if (t) t.innerHTML = 'İpucu: ' + this.tips[this.i++ % this.tips.length]; },
  show(txt) { const l = this.el('loader'); if (!l) return; l.classList.remove('done'); this.shown = performance.now(); this.set(5, txt); this.i = Math.floor(Math.random() * this.tips.length); this.tip(); clearInterval(this.timer); this.timer = setInterval(() => this.tip(), 2600); },
  hide() { const l = this.el('loader'); if (!l) return; l.classList.add('done'); clearInterval(this.timer); },
  boot() {
    this.show('Kepenkler açılıyor…');
    const t0 = performance.now();
    this.set(35, typeof THREE !== 'undefined' ? '3D motoru hazır' : '3D motoru yüklenemedi — internet bağlantını kontrol et');
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fonts.then(() => {
      this.set(75, 'Yazı tipleri ve tabelalar hazır');
      const wait = Math.max(0, 1500 - (performance.now() - t0));
      setTimeout(() => { this.set(100, 'Hoş geldin!'); setTimeout(() => this.hide(), 350); }, wait);
    });
  },
};
Loader.boot();
UI.init();
(function boot() {
  const hot = window.claude && window.claude.hot;
  const start = data => { if (data && data.S) { S = data.S; UI.enterGame(false); } };
  try { hot && hot.snapshot && hot.snapshot(() => (S ? { S } : {})); } catch (e) { }
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data);
})();
