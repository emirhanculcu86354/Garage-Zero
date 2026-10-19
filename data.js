// ================= GARAGE ZERO — VERİ =================
const YEAR = 2026;
const DAY_MIN = 600;            // 08:00 – 18:00
const LABOR_RATE = 2500;        // ₺ / saat (müşteriye)
const PART_MARKUP = 1.30;
const SAVE_KEY = 'garagezero_save_v3';

const MODELS = {
  lumo:  { name: 'Lumo Mini',    type: 'mini',   base: 520000,  lvl: 1 },
  nova:  { name: 'Nova Hatch',   type: 'hatch',  base: 680000,  lvl: 1 },
  orkan: { name: 'Orkan Sedan',  type: 'sedan',  base: 840000,  lvl: 1 },
  vega:  { name: 'Vega Kombi',   type: 'wagon',  base: 960000,  lvl: 2 },
  atlas: { name: 'Atlas Pikap',  type: 'pickup', base: 1180000, lvl: 2 },
  bora:  { name: 'Bora SUV',     type: 'suv',    base: 1450000, lvl: 3 },
  zefir: { name: 'Zefir Coupe',  type: 'coupe',  base: 1900000, lvl: 4 },
};
const CAR_COLORS = [0xb8322a, 0x2c5a99, 0xe6e2d8, 0x23272c, 0x8c939b, 0x3a7650, 0xd6a01d, 0x6b2f4a, 0x2a8a8f, 0xb85c1e, 0x4b5f7a, 0xc9c2b0];

const SYM = {
  hard_start:   'Sabahları zor çalışıyor.',
  dim_lights:   'Farlar sönük yanıyor.',
  click_start:  'Kontağı çevirince sadece "tık" sesi geliyor.',
  battery_light:'Göstergede akü ışığı yanıyor.',
  dead_battery: 'Akü birkaç günde bir bitiyor.',
  rough_idle:   'Rölantide motor titriyor.',
  power_loss:   'Araç çekişten düştü.',
  fuel_up:      'Yakıt tüketimi arttı.',
  check_engine: 'Motor arıza lambası yanıyor.',
  overheat:     'Hararet göstergesi yükseliyor.',
  white_smoke:  'Egzozdan beyaz duman çıkıyor.',
  coolant_loss: 'Sürekli antifriz eksiltiyor.',
  fan_always:   'Fan durmadan çalışıyor.',
  whine:        'Motordan ıslık gibi bir ses geliyor.',
  squeal_brake: 'Fren yaparken cızırtı var.',
  long_brake:   'Fren mesafesi uzadı.',
  pulse_brake:  'Frene basınca direksiyon titriyor.',
  bouncy:       'Araç tümseklerde çok yaylanıyor.',
  clunk_bump:   'Kasisten geçerken vuruntu sesi var.',
  steering_play:'Direksiyonda boşluk var.',
  clunk_front:  'Ön taraftan tıkırtı geliyor.',
  clutch_slip:  'Gaza basınca devir yükseliyor ama araç hızlanmıyor.',
  gear_hard:    'Vitesler zor geçiyor.',
  stall_accel:  'Gaza yüklenince tekliyor.',
  engine_noise: 'Motordan tıkırtı / hışırtı sesi geliyor.',
  rotten_smell: 'Egzozdan çürük yumurta kokusu geliyor.',
  oil_spots:    'Park ettiğim yerde yağ lekesi kalıyor.',
  oil_low:      'Yağ seviyesi sürekli düşüyor.',
  ac_warm:      'Klima soğutmuyor.',
  service_due:  'Periyodik bakım zamanı geldi.',
  tire_worn:    'Lastikler aşınmış, değiştirilmesini istiyorum.',
  no_start:     'Araç hiç çalışmıyor, çekiciyle getirttim.',
  came_back:    'Geçen sefer yaptırdım ama sorun devam ediyor!',
  tire_slip:    'Yağmurda araç kayıyor.',
};

// Araç üzerindeki tıklanabilir bölgeler
// view: hood (kaput açık) | under (lift kalkık)
const COMPS = {
  battery:   { name: 'Akü',                  view: 'hood',  tool: 'battery',     look: 'Kutuplar temiz, gövde sağlam.',                       meas: 'Akü 12.6 V · marşta 10.4 V — normal.' },
  alternator:{ name: 'Alternatör',           view: 'hood',  tool: 'battery',     look: 'Kayış gergin, gövde temiz.',                          meas: 'Şarj çıkışı 14.2 V — normal.' },
  starter:   { name: 'Marş Motoru',          view: 'hood',  tool: 'battery',     look: 'Kablo bağlantıları sıkı.',                            meas: 'Marşta 160 A çekiyor — normal.' },
  ignition:  { name: 'Bujiler & Bobinler',   view: 'hood',  tool: 'compression', look: 'Buji soketleri ve bobinler yerinde, iz yok.',         meas: 'Kompresyon 12.5 / 12.4 / 12.6 / 12.5 bar — dengeli.' },
  oilcap:    { name: 'Yağ Kapağı & Filtre',  view: 'hood',  tool: null,          look: 'Yağ temiz ve seviyede, filtreler iyi.' },
  timing:    { name: 'Triger Kapağı',        view: 'hood',  tool: null,          look: 'Kapak altındaki kayış sağlam, gergin.' },
  cooling:   { name: 'Radyatör & Termostat', view: 'hood',  tool: 'cooling',     look: 'Radyatör petekleri temiz, hortumlar sağlam.',         meas: 'Basınç sabit, kaçak yok. Termostat 88 °C’de açıyor.' },
  water_pump:{ name: 'Su Pompası',           view: 'hood',  tool: null,          look: 'Pompa gövdesi kuru, kasnak boşluksuz.' },
  fuelrail:  { name: 'Yakıt Rampası',        view: 'hood',  tool: 'fuel',        look: 'Enjektör bağlantıları sızdırmıyor.',                  meas: 'Yakıt basıncı 3.5 bar, sabit — normal.' },
  ac:        { name: 'Klima Kompresörü',     view: 'hood',  tool: 'ac',          look: 'Kompresör ve hatlar temiz.',                          meas: 'Klima basınçları normal, çıkış 6 °C.' },
  brake:     { name: 'Ön Frenler',           view: 'under', tool: 'brake',       look: 'Balata ve disk yüzeyi düzgün.',                       meas: 'Balata 8 mm · disk salgısı 0.02 mm — normal.' },
  shock:     { name: 'Ön Amortisörler',      view: 'under', tool: null,          look: 'Amortisör gövdeleri kuru, yaylar sağlam.' },
  steering:  { name: 'Rot & Rot Başları',    view: 'under', tool: null,          look: 'Tekerlek sallanınca boşluk yok.' },
  mount:     { name: 'Motor Takozu',         view: 'under', tool: null,          look: 'Takoz kauçukları sağlam.' },
  oilpan:    { name: 'Karter',               view: 'under', tool: null,          look: 'Karter ve conta kuru.' },
  gearbox:   { name: 'Şanzıman & Debriyaj',  view: 'under', tool: null,          look: 'Şanzıman gövdesi kuru, sızıntı yok.' },
  exhaust:   { name: 'Katalizör & Egzoz',    view: 'under', tool: null,          look: 'Egzoz hattı sağlam, vurunca ses yok.' },
  tank:      { name: 'Yakıt Deposu & Pompa', view: 'under', tool: null,          look: 'Depo ve hatlar sağlam, koku yok.' },
  tires:     { name: 'Lastikler',            view: 'under', tool: null,          look: 'Diş derinliği 6 mm, yanaklar sağlam.' },
};

// Aracın tamamına yapılan testler
const GLOBAL_TESTS = {
  start: { name: 'Kontağı Çevir',      min: 5,  tool: null,  ok: 'Motor ilk marşta çalıştı, rölanti düzgün.' },
  drive: { name: 'Test Sürüşü',        min: 25, tool: null,  ok: 'Sürüş sırasında olağan dışı bir davranış hissedilmedi.' },
  obd:   { name: 'OBD Arıza Tarama',   min: 10, tool: 'obd', ok: 'Kayıtlı arıza kodu yok.' },
};
const LOOK_MIN = 5, MEAS_MIN = 12;

// Arızalar — comp: parçanın bulunduğu bölge
// look/meas: { comp: bulgu } — o bölgede gözle/ölçümle görülen anormallik
const FAULTS = {
  maintenance: { part: 'Periyodik Bakım Kiti', cost: 3500, labor: 45, comp: 'oilcap', lvl: 1, sym: ['service_due'],
    look: { oilcap: 'Yağ koyu ve seviye alt çizgide; hava filtresi kirli.' } },
  battery_weak:{ part: 'Akü', cost: 4500, labor: 20, comp: 'battery', lvl: 1, sym: ['hard_start', 'dim_lights'],
    look: { battery: 'Kutuplarda beyaz oksit, gövde hafif şişmiş.' }, meas: { battery: 'Akü 11.4 V · marşta 8.6 V’a düşüyor — akü zayıf!' },
    start: 'Marş ağır dönüyor, motor zorlukla çalıştı.' },
  starter:     { part: 'Marş Motoru', cost: 9000, labor: 90, comp: 'starter', lvl: 1, sym: ['click_start', 'hard_start'],
    meas: { starter: 'Marşa basınca akım çekmiyor, yalnızca solenoid tıklıyor!' }, start: 'Sadece "tık" sesi geliyor, motor dönmüyor.', drive: 'Araç ancak takviye ile çalıştırılabildi.' },
  alternator:  { part: 'Alternatör', cost: 12000, labor: 80, comp: 'alternator', lvl: 2, sym: ['battery_light', 'dead_battery', 'dim_lights'],
    meas: { alternator: 'Şarj çıkışı 12.1 V — alternatör şarj etmiyor!', battery: 'Akü 12.3 V, yarı boş.' }, obd: 'P0562 — Sistem voltajı düşük.', start: 'Çalıştı ama akü ışığı sönmedi.' },
  spark_plug:  { part: 'Buji Takımı', cost: 2500, labor: 40, comp: 'ignition', lvl: 1, sym: ['rough_idle', 'power_loss', 'fuel_up'],
    look: { ignition: 'Sökülen bujilerde kurum ve elektrot aşınması!' }, obd: 'P0300 — Rastgele / çoklu silindir ateşleme hatası.', start: 'Rölantide düzensiz, tekliyor.' },
  coil:        { part: 'Ateşleme Bobini', cost: 3800, labor: 30, comp: 'ignition', lvl: 2, sym: ['rough_idle', 'check_engine', 'power_loss'],
    obd: 'P0302 — Silindir 2 ateşleme hatası.', drive: 'Hızlanırken belirgin sarsıntı.', start: 'Rölantide bir silindir eksik çalışıyor gibi.' },
  head_gasket: { part: 'Silindir Kapak Contası', cost: 18000, labor: 360, comp: 'ignition', lvl: 3, sym: ['overheat', 'white_smoke', 'coolant_loss'],
    meas: { ignition: 'Kompresyon 12.4 / 8.1 / 8.3 / 12.5 bar — 2 ve 3 düşük!', cooling: 'Basınç düşüyor, genleşme kabında kabarcık!' },
    look: { oilcap: 'Yağ kapağında mayonez kıvamında tortu!' }, obd: 'P0217 — Motor aşırı ısınma.', start: 'Egzozdan beyaz, tatlı kokulu duman.' },
  thermostat:  { part: 'Termostat', cost: 1800, labor: 60, comp: 'cooling', lvl: 1, sym: ['overheat', 'fan_always'],
    meas: { cooling: 'Kaçak yok ama termostat 105 °C’ye kadar açmıyor!' }, obd: 'P0217 — Motor aşırı ısınma.', drive: '10 dakikada hararet yükseldi, fan sürekli döndü.' },
  water_pump:  { part: 'Su Pompası', cost: 6500, labor: 150, comp: 'water_pump', lvl: 2, sym: ['overheat', 'coolant_loss', 'whine'],
    look: { water_pump: 'Tahliye deliğinde kuru antifriz izi, kasnakta boşluk!' }, meas: { cooling: 'Pompa gövdesinden damlama var.' }, start: 'Motor çalışınca ıslık gibi uğultu.' },
  brake_pads:  { part: 'Ön Fren Balatası', cost: 3200, labor: 45, comp: 'brake', lvl: 1, sym: ['squeal_brake', 'long_brake'],
    look: { brake: 'Balatalar çok ince, diskte parlak çizikler.' }, meas: { brake: 'Ön balata 2 mm — sınırın altında!' }, drive: 'Frenlemede metalik cızırtı.' },
  brake_disc:  { part: 'Ön Fren Diski', cost: 7000, labor: 70, comp: 'brake', lvl: 2, sym: ['pulse_brake', 'squeal_brake'],
    look: { brake: 'Disk yüzeyinde mavi ısı lekeleri.' }, meas: { brake: 'Disk salgısı 0.12 mm — disk eğri!' }, drive: 'Frenlerken direksiyonda ritmik titreşim.' },
  shock:       { part: 'Ön Amortisör', cost: 8000, labor: 90, comp: 'shock', lvl: 1, sym: ['bouncy', 'clunk_bump'],
    look: { shock: 'Sağ ön amortisör gövdesinde yağ sızıntısı!' }, drive: 'Tümsekten sonra araç 3-4 kez yaylanıyor.' },
  tie_rod:     { part: 'Rot Başı', cost: 2200, labor: 50, comp: 'steering', lvl: 1, sym: ['steering_play', 'clunk_front'],
    look: { steering: 'Tekerleği sallayınca sol rot başında boşluk!' }, drive: 'Direksiyon merkezde boşluklu, araç yol tutmuyor.' },
  engine_mount:{ part: 'Motor Takozu', cost: 3500, labor: 80, comp: 'mount', lvl: 2, sym: ['rough_idle', 'clunk_front'],
    look: { mount: 'Ön motor takozu kauçuğu yırtılmış!' }, start: 'Kontakta motor sert sarsılıyor.' },
  clutch:      { part: 'Debriyaj Seti', cost: 16000, labor: 300, comp: 'gearbox', lvl: 2, sym: ['clutch_slip', 'gear_hard', 'power_loss'],
    drive: 'Yokuşta devir yükseliyor, araç hızlanmıyor — debriyaj kaçırıyor!' },
  o2_sensor:   { part: 'Lambda Sensörü', cost: 5000, labor: 30, comp: 'exhaust', lvl: 2, sym: ['fuel_up', 'check_engine'],
    obd: 'P0133 — Oksijen sensörü yavaş tepki.' },
  fuel_pump:   { part: 'Yakıt Pompası', cost: 9500, labor: 120, comp: 'tank', lvl: 2, sym: ['hard_start', 'stall_accel', 'power_loss'],
    meas: { fuelrail: 'Yakıt basıncı 1.9 bar — düşük, yükte daha da düşüyor!' }, start: 'Uzun marş sonrası çalıştı.', drive: 'Ani gazda motor boğuluyor.' },
  timing_belt: { part: 'Triger Seti', cost: 11000, labor: 240, comp: 'timing', lvl: 3, sym: ['engine_noise', 'whine'],
    look: { timing: 'Triger kayışında çatlaklar ve diş aşınması!' }, start: 'Motordan hışırtı / tıkırtı geliyor.' },
  catalyst:    { part: 'Katalitik Konvertör', cost: 25000, labor: 90, comp: 'exhaust', lvl: 3, sym: ['power_loss', 'check_engine', 'rotten_smell'],
    look: { exhaust: 'Katalizöre vurunca içeriden çakıl sesi!' }, obd: 'P0420 — Katalizör verimi eşik altında.', drive: 'Yokuşta güçsüz, çürük yumurta kokusu.' },
  oil_pan:     { part: 'Karter Contası', cost: 1500, labor: 90, comp: 'oilpan', lvl: 1, sym: ['oil_spots', 'oil_low'],
    look: { oilpan: 'Karter contası çevresinde taze yağ!' } },
  ac_gas:      { part: 'Klima Gazı Dolumu', cost: 1500, labor: 30, comp: 'ac', lvl: 1, sym: ['ac_warm'],
    meas: { ac: 'Alçak basınç hattı 1.1 bar — gaz eksik!' } },
  tires:       { part: 'Lastik Takımı (4 adet)', cost: 12000, labor: 50, comp: 'tires', lvl: 1, sym: ['tire_worn', 'tire_slip'],
    look: { tires: 'Diş derinliği 1.4 mm — lastikler kel, yanaklarda çatlak!' }, drive: 'Virajda kayma, frenlemede tutunma zayıf.' },
  ac_comp:     { part: 'Klima Kompresörü', cost: 14000, labor: 120, comp: 'ac', lvl: 3, sym: ['ac_warm', 'whine'],
    meas: { ac: 'Basınçlar dengede; kompresör kavraması devreye girmiyor!' }, look: { ac: 'Kompresör kasnağından sürtünme sesi.' } },
};

const TOOLS = {
  battery:     { name: 'Akü / Şarj Test Cihazı',   cost: 6000,  desc: 'Akü, marş ve alternatörü ölçer.' },
  brake:       { name: 'Fren Ölçüm Seti',          cost: 9000,  desc: 'Balata kalınlığı ve disk salgısını ölçer.' },
  obd:         { name: 'OBD Tarayıcı',             cost: 25000, desc: 'Motor beyninden arıza kodlarını okur.' },
  cooling:     { name: 'Soğutma Basınç Seti',      cost: 14000, desc: 'Kaçak ve termostat açılmasını test eder.' },
  fuel:        { name: 'Yakıt Basınç Manometresi', cost: 12000, desc: 'Yakıt pompası ve hat basıncını ölçer.' },
  compression: { name: 'Kompresyon Ölçer',         cost: 15000, desc: 'Silindir sızdırmazlığını ölçer, conta arızasını yakalar.' },
  ac:          { name: 'Klima Manifold Seti',      cost: 18000, desc: 'Klima gaz basıncını ve kompresörü test eder.' },
};
const UPGRADES = {
  impact: { name: 'Havalı Tabanca Seti', cost: 40000, desc: 'Tüm söküm-takma süreleri %30 kısalır.' },
  paint:  { name: 'Boya Kabini',          cost: 150000, desc: 'Kaporta/boya yenileme yapabilirsin (araç değeri artar).' },
};
const BAY_COST = [0, 90000, 150000, 250000];
const LOT_COST = 60000;
const LICENSE = {
  galeri: { name: 'Galeri Ruhsatı', cost: 200000, desc: 'Araç alıp satabilirsin. 2 park yeri dahil.' },
  servis: { name: 'Servis Ruhsatı', cost: 150000, desc: '1 lift ve akü test cihazı dahil. Müşteri işleri gelir.' },
};
const START_MODES = {
  servis: { name: 'Servis', cash: 150000, bays: 2, lot: 0, tools: ['battery'], lic: { servis: true, galeri: false },
    desc: 'Tamir atölyesi. Müşteri araçlarını teşhis edip onarırsın. Güvenli, istikrarlı gelir.' },
  galeri: { name: 'Galeri', cash: 1300000, bays: 0, lot: 4, tools: [], lic: { servis: false, galeri: true },
    desc: 'Araç alım-satım. Pazardan ucuz araç bul, değerinde sat. Büyük kâr, büyük risk.' },
  karma:  { name: 'Karma', cash: 700000, bays: 1, lot: 2, tools: ['battery'], lic: { servis: true, galeri: true },
    desc: 'Bozuk araç al, kendin tamir et, kârla sat. Her iki yol da açık ama küçük başlarsın.' },
};
const NAMES = ['Ahmet K.', 'Elif Y.', 'Mehmet D.', 'Zeynep A.', 'Mustafa Ç.', 'Ayşe T.', 'Emre S.', 'Fatma Ö.', 'Burak E.', 'Selin G.',
  'Hakan B.', 'Derya M.', 'Onur P.', 'Gizem U.', 'Serkan İ.', 'Büşra N.', 'Kemal R.', 'Ece H.', 'Tolga V.', 'Merve Ş.', 'Cem L.', 'Hülya F.'];
const SELLER_LIES = ['Bakımları zamanında yapıldı, sorunsuz.', 'Hanım aracı, sadece pazar günleri kullanıldı.', 'Takas düşünülmez, aracın hiçbir sorunu yok.', 'Motor yürür, sıfır gibi.'];
const BUYER_LINES = {
  open: ['Arabaya bir göz attım. ', 'Temiz duruyor, ama… ', 'Şöyle bir baktım. '],
  low: ['Bu araca {p} veririm, nakit.', 'Bana {p}’ye ver, hemen alayım.', '{p} uygun olur bence.'],
  raise: ['Peki, son olarak {p} diyelim.', 'Biraz daha çıkayım: {p}.', 'Tamam, {p} olsun.'],
  accept: ['Anlaştık! Anahtarları alayım.', 'Tamam, el sıkıştık.', 'Olur, hayırlı olsun.'],
  leave: ['Yok, bu fiyata olmaz. Kolay gelsin.', 'Bu bütçemi aşar, başka bakarım.', 'Fazla bu, ben vazgeçtim.'],
};

// ---------- personel ----------
const STAFF_NAMES = ['Ahmet', 'Hasan', 'Mehmet', 'Kadir', 'Yusuf', 'Recep', 'Murat', 'Osman', 'İsmail', 'Cemal', 'Sinan', 'Erkan', 'Volkan', 'Ramazan', 'Bayram', 'Selim', 'Zeki', 'Nuri', 'Arda', 'Berk', 'Kaan', 'Eymen', 'Deniz', 'Furkan'];
function wageFor(role, skill) { return role === 'usta' ? 1400 + skill * 900 : 700 + skill * 250; }
function skillSpeed(skill) { return 0.75 + skill * 0.1; }            // 1★ 0.85× · 3★ 1.05× · 5★ 1.25×
const OVERVIEW_MIN = 30;

// ---------- yedek parça ----------
const STORES = {
  kose:   { name: 'Köşe Yedek Parça',   min: 40,  mult: 1.0,  avail: 0.65, desc: 'Yakın, ucuz ama her şey bulunmaz.' },
  sanayi: { name: 'Sanayi Oto Market',  min: 85,  mult: 1.08, avail: 0.85, desc: 'Sanayi sitesinde, çeşit fazla.' },
  bayi:   { name: 'Yetkili Bayi',       min: 140, mult: 1.45, avail: 1.0,  desc: 'Uzak ve pahalı, ama parça kesin var.' },
};
const WHOLESALE_MULT = 0.9;         // toptancı: ertesi sabah teslim
const COURIER_FEE = 600;
const START_STOCK = { maintenance: 2, brake_pads: 1, spark_plug: 1, battery_weak: 1, thermostat: 1, oil_pan: 1 };

// ---------- yorumlar ----------
const REVIEW_TXT = {
  5: ['Arızayı hemen buldular, aracım ilk günkü gibi oldu.', 'Dürüst ve işini bilen bir usta. Gönül rahatlığıyla geliyorum.', 'Gereksiz parça değiştirmediler, fiyat da makuldü.', 'Hızlı ve temiz iş. Teşekkürler!', 'Randevu saatine sadık kaldılar, tavsiye ederim.'],
  4: ['İyi iş çıkardılar, biraz bekledim ama sonuç güzel.', 'Sorun çözüldü, ilgililer.', 'Genel olarak memnunum.'],
  3: ['İş tamam ama fatura beklediğimden yüksek geldi.', 'Değişmesine gerek olmayan bir parça da değişmiş sanki.', 'Fena değil, daha hızlı olabilirdi.'],
  2: ['Aracı aldım, sorun hâlâ devam ediyor.', 'Kapıda uzun süre bekledim, kimse ilgilenmedi.', 'Pahalı ve yavaş.'],
  1: ['Arıza çözülmedi, paramı boşa verdim.', 'Randevu verdiler, gittim, geri çevirdiler!', 'Söz verilen günde araç hazır değildi.'],
};
const REPLY_TPL = [
  { t: 'Özür dileriz, aracınızı tekrar ücretsiz kontrol edelim.', fix: true },
  { t: 'Değerli yorumunuz için teşekkür ederiz, tekrar bekleriz!', fix: false },
  { t: 'Yaşadığınız sorunu telefonla görüşmek isteriz.', fix: true },
];
const AD_COST = 15000, AD_DAYS = 3;
const LABOR_OPTIONS = [2000, 2500, 3000, 3500];
const GOAL_POOL = [
  { type: 'deliver', n: [2, 3], txt: n => `${n} müşteri aracı teslim et`, reward: n => 4000 * n },
  { type: 'income', n: [20000, 40000], txt: n => `${fmt(n)} servis geliri elde et`, reward: n => Math.round(n * 0.15) },
  { type: 'overview', n: [2, 3], txt: n => `${n} araca ustana genel kontrol yaptır`, reward: () => 3000 },
  { type: 'five', n: [1, 1], txt: () => `5 yıldızlı bir yorum al`, reward: () => 6000 },
  { type: 'appt', n: [1, 2], txt: n => `${n} randevu ver`, reward: () => 2500 },
  { type: 'sell', n: [1, 1], txt: () => `Galeriden bir araç sat`, reward: () => 8000, galeri: true },
  { type: 'errand', n: [1, 2], txt: n => `${n} kez parça temin et`, reward: () => 2000 },
];
const TOW_FAULTS = ['starter', 'battery_weak', 'fuel_pump', 'timing_belt'];
const TOW_FEE = 3500;   // müşteri çekici ücretini fatura ile öder (sana kalır)

// ---------- v7: hava, kaporta, yükseltmeler, başarımlar ----------
SYM.accident = 'Küçük bir kaza geçirdim, ön tampon hasarlı.';
SYM.broken_light = 'Farım kırıldı, gece önümü göremiyorum.';
COMPS.body = { name: 'Tampon & Farlar', view: 'hood', tool: null, look: 'Tampon, kaporta ve farlar sağlam.' };
FAULTS.bumper = { part: 'Ön Tampon', cost: 6500, labor: 70, comp: 'body', lvl: 1, sym: ['accident'],
  look: { body: 'Ön tampon çatlamış, bağlantı tırnakları kırık!' }, drive: 'Yüksek hızda ön taraftan rüzgâr ve takırtı sesi.' };
FAULTS.headlight = { part: 'Far Grubu', cost: 4200, labor: 35, comp: 'body', lvl: 1, sym: ['broken_light'],
  look: { body: 'Sol far camı kırık, içine su girmiş!' }, start: 'Kontakta sol far yanmıyor.' };
FAULTS.bumper.comp = 'body'; FAULTS.headlight.comp = 'body';

const WEATHER = {
  sunny:  { name: 'Güneşli',  boost: [],                                                        cust: 0 },
  cloudy: { name: 'Bulutlu',  boost: ['bumper'],                                                cust: 0 },
  rain:   { name: 'Yağmurlu', boost: ['brake_pads', 'brake_disc', 'tires', 'shock', 'bumper'],  cust: 1 },
  cold:   { name: 'Soğuk',    boost: ['battery_weak', 'starter', 'alternator', 'fuel_pump'],    cust: 1 },
  hot:    { name: 'Sıcak',    boost: ['thermostat', 'water_pump', 'ac_gas', 'ac_comp'],         cust: 1 },
};
const WEATHER_ORDER = ['sunny', 'sunny', 'cloudy', 'rain', 'cold', 'hot'];

UPGRADES.lounge = { name: 'Müşteri Bekleme Salonu', cost: 35000, desc: 'Çay ocağı ve gölgelik. Müşteri sabrı %50 artar, yorumlar iyileşir.' };
UPGRADES.tireMachine = { name: 'Lastik Sökme-Balans Makinesi', cost: 28000, desc: 'Lastik değişimi yarı sürede biter.' };
UPGRADES.bodyShop = { name: 'Kaporta Tezgâhı', cost: 45000, desc: 'Tampon ve far işleri %40 hızlanır; kazalı araç müşterisi artar.' };

const LOANS = [{ amount: 100000, days: 15 }, { amount: 300000, days: 20 }, { amount: 1000000, days: 30 }];
const LOAN_RATE = 1.18;

const ACH = [
  { id: 'fix1', name: 'İlk Tamir', desc: 'İlk müşteri aracını onar.', test: () => S.stats.jobs >= 1 },
  { id: 'fix10', name: 'Mahallenin Ustası', desc: '10 aracı eksiksiz onar.', test: () => S.stats.jobs >= 10 },
  { id: 'fix50', name: 'Sanayi Efsanesi', desc: '50 aracı eksiksiz onar.', test: () => S.stats.jobs >= 50 },
  { id: 'earn100k', name: 'İlk 100 Bin', desc: 'Toplam 100.000 ₺ servis geliri.', test: () => S.stats.earned >= 100000 },
  { id: 'earn1m', name: 'Milyoner Atölye', desc: 'Toplam 1.000.000 ₺ servis geliri.', test: () => S.stats.earned >= 1000000 },
  { id: 'sell1', name: 'İlk Satış', desc: 'Galeriden bir araç sat.', test: () => S.stats.sold >= 1 },
  { id: 'sell10', name: 'Galerici', desc: '10 araç sat.', test: () => S.stats.sold >= 10 },
  { id: 'lifts4', name: 'Dört Lift', desc: 'Tüm liftleri kur.', test: () => S.bays >= 4 },
  { id: 'master', name: 'Usta Kadro', desc: '5 yıldızlı bir ustan olsun.', test: () => S.staff.some(w => w.skill >= 5 && w.role === 'usta') },
  { id: 'team6', name: 'Kalabalık Ekip', desc: '6 çalışana ulaş.', test: () => S.staff.length >= 6 },
  { id: 'rating45', name: 'Haritada Parlayan', desc: 'En az 10 yorumla 4,5 puan.', test: () => S.reviews.length >= 10 && rating() >= 4.5 },
  { id: 'tools', name: 'Tam Donanım', desc: 'Tüm teşhis cihazlarını al.', test: () => Object.keys(TOOLS).every(k => S.tools[k]) },
  { id: 'day30', name: 'Bir Ay Ayakta', desc: '30. güne ulaş.', test: () => S.day >= 30 },
  { id: 'lvl5', name: 'Tecrübeli', desc: 'Seviye 5’e ulaş.', test: () => lvl() >= 5 },
  { id: 'debtfree', name: 'Borçsuz', desc: 'Çektiğin bir krediyi tamamen öde.', test: () => (S.stats.loansPaid || 0) >= 1 },
];

// ---------- v8: özelleştirme ----------
const DIFFICULTY = {
  easy:   { name: 'Kolay',  cash: 1.6, freq: 1.2, patience: 1.4, faults: 0.7, parts: 0.85, costs: 0.7, dayLen: 10 },
  normal: { name: 'Normal', cash: 1.0, freq: 1.0, patience: 1.0, faults: 1.0, parts: 1.0,  costs: 1.0, dayLen: 10 },
  hard:   { name: 'Zor',    cash: 0.6, freq: 0.9, patience: 0.75, faults: 1.4, parts: 1.2,  costs: 1.3, dayLen: 10 },
};
const CFG_SLIDERS = [
  { k: 'cash', name: 'Başlangıç parası', min: 0.3, max: 3, step: 0.1, fmt: v => '×' + v.toFixed(1) },
  { k: 'freq', name: 'Müşteri sıklığı', min: 0.5, max: 2.5, step: 0.1, fmt: v => '×' + v.toFixed(1) },
  { k: 'patience', name: 'Müşteri sabrı', min: 0.5, max: 2, step: 0.1, fmt: v => '×' + v.toFixed(1) },
  { k: 'faults', name: 'Arıza karmaşıklığı', min: 0.5, max: 2, step: 0.1, fmt: v => '×' + v.toFixed(1) },
  { k: 'parts', name: 'Parça fiyatları', min: 0.5, max: 2, step: 0.05, fmt: v => '×' + v.toFixed(2) },
  { k: 'costs', name: 'Kira ve maaşlar', min: 0.3, max: 2, step: 0.1, fmt: v => '×' + v.toFixed(1) },
  { k: 'dayLen', name: 'Mesai süresi', min: 6, max: 14, step: 1, fmt: v => v + ' saat' },
];
const SWATCHES = ['#ff8a1f', '#e0463a', '#f2c14e', '#4cc38a', '#2a8a8f', '#3987e5', '#7a5cff', '#d94f9a', '#e6e2d8', '#8c939b'];
const FLOOR_COLORS = { 'Gri epoksi': 0x55595d, 'Yeşil epoksi': 0x3f6b5a, 'Mavi epoksi': 0x3d5a7a, 'Kırmızı epoksi': 0x7a3d3a, 'Beton': 0x8d8a83, 'Damalı koyu': 0x2b2e33 };
const WALL_COLORS = { 'Çelik gri': 0x8e9499, 'Beyaz': 0xe6e2d8, 'Lacivert': 0x2c3e5c, 'Bordo': 0x6b2f3a, 'Antrasit': 0x3b4148, 'Kum': 0xc9b79c };
const COLOR_NAMES = { 0xb8322a: 'Kırmızı', 0x2c5a99: 'Mavi', 0xe6e2d8: 'Beyaz', 0x23272c: 'Siyah', 0x8c939b: 'Gümüş', 0x3a7650: 'Yeşil', 0xd6a01d: 'Sarı', 0x6b2f4a: 'Mor', 0x2a8a8f: 'Turkuaz', 0xb85c1e: 'Turuncu', 0x4b5f7a: 'Füme', 0xc9c2b0: 'Bej' };
const POPULAR_COLORS = [0xe6e2d8, 0x23272c, 0x8c939b, 0x4b5f7a];
const SPECS = {
  genel:   { name: 'Genel', comps: [] },
  motor:   { name: 'Motorcu', comps: ['ignition', 'oilcap', 'timing', 'cooling', 'water_pump', 'fuelrail', 'mount', 'gearbox'] },
  elektrik:{ name: 'Elektrikçi', comps: ['battery', 'alternator', 'starter', 'ac'] },
  alt:     { name: 'Alt takımcı', comps: ['brake', 'shock', 'steering', 'tires', 'exhaust', 'tank', 'oilpan'] },
  kaporta: { name: 'Kaportacı', comps: ['body'] },
};
const TRAIN_COST = 18000;
const DEFAULT_CUSTOM = { accent: '#ff8a1f', wall: 0x8e9499, floor: 0x55595d, lift: '#ff8a1f', ustaSuit: '#2c4f86', ustaCap: '#ff8a1f', cirakSuit: '#3a7650', signSub: 'OTO SERVİS · GALERİ' };

// ---------- v9: modifiye, sadık müşteri, günlük olaylar ----------
const MODS = {
  tint:    { name: 'Cam Filmi',          cost: 3000,  labor: 60,  value: 0.02 },
  rims:    { name: 'Spor Jant Takımı',   cost: 14000, labor: 50,  value: 0.04 },
  led:     { name: 'LED Far Dönüşümü',   cost: 5500,  labor: 40,  value: 0.02 },
  spoiler: { name: 'Bagaj Spoyleri',     cost: 6000,  labor: 45,  value: 0.02 },
  exhaust: { name: 'Çift Çıkış Egzoz',   cost: 9000,  labor: 90,  value: 0.03 },
  chip:    { name: 'Performans Yazılımı', cost: 8000, labor: 30,  value: 0.04 },
};
Object.entries(MODS).forEach(([k, m]) => { SYM['mod_' + k] = `${m.name} yaptırmak istiyorum.`; });
const MOD_MARKUP = 1.4;
const DAY_EVENTS = {
  power:   { name: 'Elektrik kesintisi', desc: 'Öğleden sonra 2 saat elektrik yok; liftler ve aletler yavaş.', p: 0.07 },
  sick:    { name: 'Hasta usta',         desc: 'Bir ustan bugün rapor aldı, gelmedi.', p: 0.07 },
  sale:    { name: 'Toptancı kampanyası', desc: 'Toptancı siparişleri bugün %25 indirimli.', p: 0.08 },
  fleet:   { name: 'Filo müşterisi',      desc: 'Bir şirket filosundan araç gelecek; teslimde %50 fazla öder.', p: 0.08 },
  inspect: { name: 'Belediye denetimi',   desc: 'Denetim var: atölye temiz ve liftlerde iş düzenliyse ödül, değilse ceza.', p: 0.05 },
};
