/* ============================================================
   ЛИСТ ПЕРСОНАЖА — полная логика (исправлено)
   ============================================================ */

const STORAGE_KEY = 'absolute_world_character';

/* ---- НАВЫКИ ---- */
const SKILLS = {
  mind: [
    { key: 'insight',       label: 'Проницательность' },
    { key: 'erudition',     label: 'Эрудиция' },
    { key: 'charm',         label: 'Обаяние' },
    { key: 'cunning',       label: 'Хитрость' },
    { key: 'concentration', label: 'Концентрация' }
  ],
  body: [
    { key: 'athletics',  label: 'Атлетика' },
    { key: 'endurance',  label: 'Стойкость' },
    { key: 'instincts',  label: 'Инстинкты' },
    { key: 'reflexes',   label: 'Рефлексы' },
    { key: 'rage',       label: 'Ярость' }
  ],
  harmony: [
    { key: 'acrobatics', label: 'Акробатика' },
    { key: 'creation',   label: 'Созидание' },
    { key: 'dexterity',  label: 'Проворство' },
    { key: 'grace',      label: 'Грация' },
    { key: 'accuracy',   label: 'Точность' }
  ]
};

/* ---- ЯЧЕЙКИ ПО КРУГАМ ---- */
const SLOT_COUNTS = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4 };

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function fileToDataURL(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsDataURL(file);
  });
}

let uid = 0;
const nextId = () => `id_${Date.now()}_${uid++}`;

/* ============================================================
   НАВЫКИ
   ============================================================ */
function renderSkills() {
  Object.entries(SKILLS).forEach(([group, list]) => {
    const box = document.querySelector(`[data-group="${group}"]`);
    if (!box) return;
    box.innerHTML = list.map(s => `
      <div class="skill-row">
        <label>${s.label}</label>
        <input type="number" step="1" data-skill="${s.key}" placeholder="0">
      </div>
    `).join('');
  });
}

/* ============================================================
   УНИВЕРСАЛЬНЫЙ СПИСОК
   ============================================================ */
function createListItem(opts) {
  const { container, title = '', desc = '', extra = '' } = opts;
  if (!container) return null;
  const el = document.createElement('div');
  el.className = 'list-item';
  el.dataset.uid = nextId();
  el.innerHTML = `
    <div class="list-head">
      <div>
        <span class="list-title">${title || 'Без названия'}</span>
      </div>
      <button class="list-del" title="Удалить">✖</button>
    </div>
    <div class="list-body">
      <div class="field">
        <label>Название</label>
        <input type="text" class="item-title" value="${title}">
      </div>
      <div class="field">
        <label>Описание</label>
        <textarea class="item-desc" placeholder="Описание...">${desc}</textarea>
      </div>
      ${extra !== '' ? `<div class="field"><label>Доп. инфо</label><input type="text" class="item-extra" value="${extra}"></div>` : ''}
    </div>
  `;
  const head = el.querySelector('.list-head');
  const titleSpan = el.querySelector('.list-title');
  const titleInput = el.querySelector('.item-title');

  head.addEventListener('click', e => {
    if (e.target.closest('.list-del')) return;
    el.classList.toggle('open');
  });

  titleInput.addEventListener('input', () => {
    titleSpan.textContent = titleInput.value || 'Без названия';
    autoSave();
  });

  el.querySelector('.item-desc')?.addEventListener('input', autoSave);
  el.querySelector('.item-extra')?.addEventListener('input', autoSave);

  el.querySelector('.list-del').addEventListener('click', () => {
    el.remove();
    autoSave();
  });

  container.appendChild(el);
  return el;
}

function collectList(containerId) {
  const c = $('#' + containerId);
  if (!c) return [];
  return $$('.list-item', c).map(el => ({
    title: el.querySelector('.item-title')?.value || '',
    desc:  el.querySelector('.item-desc')?.value || '',
    extra: el.querySelector('.item-extra')?.value || ''
  }));
}

function restoreList(containerId, items) {
  const c = $('#' + containerId);
  if (!c) return;
  c.innerHTML = '';
  (items || []).forEach(it => {
    createListItem({
      container: c,
      title: it.title || '',
      desc:  it.desc || '',
      extra: it.extra !== undefined ? it.extra : ''
    });
  });
}

/* ============================================================
   ЗАКЛИНАНИЯ
   ============================================================ */
function createSpell(data = {}) {
  const el = document.createElement('div');
  el.className = 'spell';
  el.dataset.uid = nextId();
  el.innerHTML = `
    <div class="spell-top">
      <select class="spell-circle">
        ${[1,2,3,4,5].map(n => `<option value="${n}">${n} круг</option>`).join('')}
      </select>
      <input type="text" class="spell-name" placeholder="Название заклинания">
      <button class="list-del" title="Удалить">✖</button>
    </div>
    <div class="spell-body">
      <label class="spell-img-box ${data.image ? 'has-image' : ''}">
        ${data.image
          ? `<img src="${data.image}" alt="">`
          : `<span class="placeholder">Кликни<br>чтобы загрузить<br>карточку</span>`}
        <input type="file" accept="image/*" class="spell-img-input">
      </label>
      <div class="spell-info">
        <div class="field">
          <label>Описание</label>
          <textarea class="spell-desc" placeholder="Описание...">${data.desc || ''}</textarea>
        </div>
      </div>
    </div>
  `;

  el.querySelector('.spell-circle').value = data.circle || '1';
  el.querySelector('.spell-name').value = data.name || '';

  const imgBox = el.querySelector('.spell-img-box');
  const imgInput = el.querySelector('.spell-img-input');

  imgBox.addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT') imgInput.click();
  });

  imgInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    imgBox.innerHTML = `<img src="${url}" alt="">`;
    imgBox.classList.add('has-image');
    autoSave();
  });

  el.querySelector('.list-del').addEventListener('click', () => {
    el.remove();
    autoSave();
  });

  el.querySelectorAll('textarea, select, .spell-name').forEach(x => {
    x.addEventListener('input', autoSave);
  });

  return el;
}

function collectSpells() {
  const c = $('#spellContainer');
  if (!c) return [];
  return $$('.spell', c).map(el => {
    const img = el.querySelector('.spell-img-box img');
    return {
      circle: el.querySelector('.spell-circle').value,
      name:   el.querySelector('.spell-name').value,
      desc:   el.querySelector('.spell-desc').value,
      image:  img ? img.src : ''
    };
  });
}

function restoreSpells(list) {
  const c = $('#spellContainer');
  if (!c) return;
  c.innerHTML = '';
  (list || []).forEach(sp => c.appendChild(createSpell(sp)));
}

/* ============================================================
   ЯЧЕЙКИ ЗАКЛИНАНИЙ
   ============================================================ */
let slotsData = {};

function renderSlots() {
  const body = $('#slotsBody');
  if (!body) return;
  body.innerHTML = '';
  Object.entries(SLOT_COUNTS).forEach(([circle, count]) => {
    const section = document.createElement('div');
    section.className = 'slot-circle';
    section.innerHTML = `<h3>${circle} круг — ${count} ячеек</h3>`;
    const row = document.createElement('div');
    row.className = 'slot-row';
    for (let i = 0; i < count; i++) {
      const id = `${circle}-${i}`;
      const data = slotsData[id] || {};
      const card = document.createElement('div');
      card.className = 'slot-card' + (data.image ? ' has-image' : '');
      card.dataset.slot = id;
      card.innerHTML = `
        <span class="slot-label">${i + 1}</span>
        ${data.image
          ? `<img src="${data.image}" alt="">`
          : `<span class="slot-empty">Пусто</span>`}
        ${data.image ? `<button class="slot-clear" title="Очистить">✖</button>` : ''}
        <input type="file" accept="image/*" hidden>
      `;
      const input = card.querySelector('input[type="file"]');
      card.addEventListener('click', e => {
        if (e.target.classList.contains('slot-clear')) return;
        input.click();
      });
      input.addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        const url = await fileToDataURL(f);
        slotsData[id] = { image: url };
        renderSlots();
        autoSave();
      });
      card.querySelector('.slot-clear')?.addEventListener('click', e => {
        e.stopPropagation();
        delete slotsData[id];
        renderSlots();
        autoSave();
      });
      row.appendChild(card);
    }
    section.appendChild(row);
    body.appendChild(section);
  });
}

/* ============================================================
   ИНВЕНТАРЬ — СУМКИ
   ============================================================ */
function createBag(data = {}) {
  const bag = document.createElement('div');
  bag.className = 'bag';
  bag.dataset.uid = nextId();
  bag.innerHTML = `
    <div class="bag-header">
      <input type="text" class="bag-name" placeholder="Название сумки" value="${data.name || 'Сумка'}">
      <input type="text" class="bag-cells" placeholder="Ячеек" value="${data.cells || ''}">
      <div class="bag-weight">Вес: <span>0</span></div>
      <button class="btn btn-mini btn-add-item">+ предмет</button>
      <button class="list-del bag-del" title="Удалить сумку">✖</button>
    </div>
    <div class="bag-body">
      <div class="bag-items"></div>
    </div>
  `;

  const items = bag.querySelector('.bag-items');
  const weightEl = bag.querySelector('.bag-weight span');

  bag.querySelector('.bag-name').addEventListener('input', autoSave);
  bag.querySelector('.bag-cells').addEventListener('input', autoSave);

  bag.querySelector('.bag-del').addEventListener('click', () => {
    bag.remove();
    recalcWeights();
    autoSave();
  });

  bag.querySelector('.btn-add-item').addEventListener('click', () => {
    addBagItem(items, {});
    recalcWeights();
    autoSave();
  });

  (data.items || []).forEach(it => addBagItem(items, it));

  bag._recalc = () => {
    let sum = 0;
    items.querySelectorAll('.bag-item').forEach(row => {
      const qty = parseFloat(row.querySelector('[data-f="qty"]').value) || 0;
      const w   = parseFloat(row.querySelector('[data-f="weight"]').value) || 0;
      sum += qty * w;
    });
    weightEl.textContent = sum.toFixed(2);
    return sum;
  };

  return bag;
}

function addBagItem(container, data = {}) {
  const row = document.createElement('div');
  row.className = 'bag-item';
  row.innerHTML = `
    <input type="number" data-f="num"    placeholder="#" value="${data.num || ''}">
    <input type="text"   data-f="name"   placeholder="Название" value="${data.name || ''}">
    <input type="text"   data-f="desc"   placeholder="Описание" value="${data.desc || ''}">
    <input type="number" data-f="qty"    placeholder="Кол-во" value="${data.qty || ''}">
    <input type="number" step="0.1" data-f="weight" placeholder="Вес" value="${data.weight || ''}">
    <button class="list-del item-del" title="Удалить">✖</button>
  `;
  row.querySelector('.item-del').addEventListener('click', () => {
    row.remove();
    recalcWeights();
    autoSave();
  });
  row.querySelectorAll('input').forEach(i => {
    i.addEventListener('input', () => {
      recalcWeights();
      autoSave();
    });
  });
  container.appendChild(row);
}

function collectBags() {
  const c = $('#bagContainer');
  if (!c) return [];
  return $$('.bag', c).map(bag => ({
    name:  bag.querySelector('.bag-name').value,
    cells: bag.querySelector('.bag-cells').value,
    items: $$('.bag-item', bag).map(row => ({
      num:    row.querySelector('[data-f="num"]').value,
      name:   row.querySelector('[data-f="name"]').value,
      desc:   row.querySelector('[data-f="desc"]').value,
      qty:    row.querySelector('[data-f="qty"]').value,
      weight: row.querySelector('[data-f="weight"]').value
    }))
  }));
}

function restoreBags(list) {
  const c = $('#bagContainer');
  if (!c) return;
  c.innerHTML = '';
  (list || []).forEach(b => c.appendChild(createBag(b)));
  recalcWeights();
}

function recalcWeights() {
  let total = 0;
  $$('#bagContainer .bag').forEach(bag => {
    if (bag._recalc) total += bag._recalc();
  });
  $$('#equipList .list-item').forEach(it => {
    const extra = it.querySelector('.item-extra');
    if (extra) {
      const n = parseFloat((extra.value || '').replace(/[^\d.\-]/g, ''));
      if (!isNaN(n)) total += n;
    }
  });
  const tw = $('#totalWeight');
  if (tw) tw.textContent = total.toFixed(2);
}

/* ============================================================
   СБОР ДАННЫХ
   ============================================================ */
function collectData() {
  const data = { fields: {}, skills: {}, spells: [], slots: slotsData };

  $$('[data-key]').forEach(el => data.fields[el.dataset.key] = el.value);
  $$('[data-skill]').forEach(el => data.skills[el.dataset.skill] = el.value);

  data.spells = collectSpells();

  data.subclasses = collectList('subclassList');
  data.effects    = collectList('effectList');
  data.actives    = collectList('activeList');
  data.passives   = collectList('passiveList');
  data.equipment  = collectList('equipList');

  data.bags = collectBags();

  return data;
}

/* ============================================================
   ЗАГРУЗКА ДАННЫХ
   ============================================================ */
function applyData(data) {
  if (!data) return;

  if (data.fields) $$('[data-key]').forEach(el => {
    if (data.fields[el.dataset.key] !== undefined)
      el.value = data.fields[el.dataset.key];
  });

  if (data.skills) $$('[data-skill]').forEach(el => {
    if (data.skills[el.dataset.skill] !== undefined)
      el.value = data.skills[el.dataset.skill];
  });

  restoreSpells(data.spells);
  restoreList('subclassList', data.subclasses);
  restoreList('effectList',   data.effects);
  restoreList('activeList',   data.actives);
  restoreList('passiveList',  data.passives);
  restoreList('equipList',    data.equipment);
  restoreBags(data.bags);

  slotsData = data.slots || {};
  renderSlots();
}

/* ============================================================
   СОХРАНЕНИЕ
   ============================================================ */
let saveTimer = null;
function autoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    } catch (e) {
      console.warn('Не сохранилось (возможно, много картинок):', e);
    }
  }, 500);
}

function saveNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    toast('💾 Сохранено');
  } catch (e) {
    toast('⚠ Слишком много данных для localStorage');
  }
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try { applyData(JSON.parse(raw)); }
  catch (e) { console.warn('Ошибка чтения', e); }
}

/* ============================================================
   ЭКСПОРТ / ИМПОРТ
   ============================================================ */
function exportJSON() {
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (data.fields.name || 'character').replace(/\s+/g, '_');
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇ Экспортировано');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      applyData(data);
      saveNow();
      toast('⬆ Импортировано');
    } catch { toast('✖ Ошибка файла'); }
  };
  reader.readAsText(file);
}

/* ============================================================
   СБРОС
   ============================================================ */
function resetAll() {
  if (!confirm('Удалить все данные персонажа?')) return;
  localStorage.removeItem(STORAGE_KEY);
  $$('[data-key], [data-skill]').forEach(el => el.value = '');
  const sc = $('#spellContainer'); if (sc) sc.innerHTML = '';
  ['subclassList','effectList','activeList','passiveList','equipList','bagContainer']
    .forEach(id => { const el = $('#' + id); if (el) el.innerHTML = ''; });
  slotsData = {};
  renderSlots();
  recalcWeights();
  toast('✖ Сброшено');
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  renderSkills();
  renderSlots();
  loadFromStorage();

  document.addEventListener('input', autoSave);

  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

  bind('#saveBtn',   saveNow);
  bind('#exportBtn', exportJSON);
  bind('#importBtn', () => { const f = $('#importFile'); if (f) f.click(); });
  bind('#resetBtn',  resetAll);

  const imp = $('#importFile');
  if (imp) imp.onchange = e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  };

  bind('#addSubclassBtn', () => createListItem({ container: $('#subclassList'), title: 'Новый подкласс' }));
  bind('#addEffectBtn',   () => createListItem({ container: $('#effectList'),   title: 'Новый эффект' }));
  bind('#addActiveBtn',   () => createListItem({ container: $('#activeList'),   title: 'Новый активный навык' }));
  bind('#addPassiveBtn',  () => createListItem({ container: $('#passiveList'),  title: 'Новый пассивный навык' }));
  bind('#addEquipBtn',    () => createListItem({ container: $('#equipList'),    title: 'Новое снаряжение', extra: '0' }));

  bind('#addSpellBtn', () => {
    const c = $('#spellContainer');
    if (c) c.appendChild(createSpell());
    autoSave();
  });

  bind('#addBagBtn', () => {
    const c = $('#bagContainer');
    if (c) c.appendChild(createBag({ name: 'Сумка', items: [] }));
    recalcWeights();
    autoSave();
  });

  bind('#openSlotsBtn',  () => { renderSlots(); $('#slotsModal')?.classList.add('show'); });
  bind('#closeSlotsBtn', () => $('#slotsModal')?.classList.remove('show'));

  const modal = $('#slotsModal');
  if (modal) modal.addEventListener('click', e => {
    if (e.target.id === 'slotsModal') modal.classList.remove('show');
  });

  recalcWeights();
  toast('☠ Лист персонажа загружен');
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', init);
