/* ============================================================
   ЛИСТ ПЕРСОНАЖА — логика
   ============================================================ */

const STORAGE_KEY = 'absolute_world_character_v2';
const SLOTS_CONFIG = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4 };

const SKILLS = {
  mind: [
    { key: 'insight', label: 'Проницательность' },
    { key: 'erudition', label: 'Эрудиция' },
    { key: 'charm', label: 'Обаяние' },
    { key: 'cunning', label: 'Хитрость' },
    { key: 'concentration', label: 'Концентрация' }
  ],
  body: [
    { key: 'athletics', label: 'Атлетика' },
    { key: 'endurance', label: 'Стойкость' },
    { key: 'instincts', label: 'Инстинкты' },
    { key: 'reflexes', label: 'Рефлексы' },
    { key: 'rage', label: 'Ярость' }
  ],
  harmony: [
    { key: 'acrobatics', label: 'Акробатика' },
    { key: 'creation', label: 'Созидание' },
    { key: 'dexterity', label: 'Проворство' },
    { key: 'grace', label: 'Грация' },
    { key: 'accuracy', label: 'Точность' }
  ]
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---- НАВЫКИ ---- */
function renderSkills() {
  Object.entries(SKILLS).forEach(([group, list]) => {
    const box = document.querySelector(`[data-group="${group}"]`);
    box.innerHTML = list.map(s => `
      <div class="skill-row">
        <label>${s.label}</label>
        <input type="number" data-skill="${s.key}" placeholder="0">
      </div>
    `).join('');
  });
}

/* ---- УНИВЕРСАЛЬНАЯ КАРТОЧКА СПИСКА ---- */
/* kind: 'spell' | 'effect' | 'active' | 'passive' | 'equip' */
function createListCard(kind, data = {}) {
  const div = document.createElement('div');
  div.className = 'list-card';
  div.dataset.kind = kind;

  const isSpell = kind === 'spell';

  div.innerHTML = `
    <div class="card-img-box" title="Кликни, чтобы загрузить карточку">
      <img style="display:none">
      <span class="ph">${data.img ? '' : 'Кликни,<br>чтобы загрузить<br>карточку'}</span>
    </div>
    <div class="card-fields">
      ${isSpell ? `
        <select class="f-circle">
          <option value="1">1 круг</option>
          <option value="2">2 круг</option>
          <option value="3">3 круг</option>
          <option value="4">4 круг</option>
          <option value="5">5 круг</option>
        </select>
      ` : ''}
      <input type="text" class="f-name" placeholder="Название">
      <textarea class="f-desc" placeholder="Описание"></textarea>
    </div>
    <button class="list-del" title="Удалить">✖</button>
  `;

  const imgBox = div.querySelector('.card-img-box');
  const img = imgBox.querySelector('img');
  const ph = imgBox.querySelector('.ph');
  const nameInput = div.querySelector('.f-name');
  const descInput = div.querySelector('.f-desc');

  if (isSpell && data.circle) div.querySelector('.f-circle').value = data.circle;
  if (data.name) nameInput.value = data.name;
  if (data.desc) descInput.value = data.desc;
  if (data.img) {
    img.src = data.img;
    img.style.display = 'block';
    if (ph) ph.style.display = 'none';
  }

  // загрузка картинки
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  div.appendChild(fileInput);

  imgBox.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      autoSave();
    };
    reader.readAsDataURL(f);
  });

  div.querySelector('.list-del').onclick = () => { div.remove(); autoSave(); };
  div.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', autoSave));

  return div;
}

/* ---- ПОДКЛАССЫ ---- */
function createSubclass(data = {}) {
  const div = document.createElement('div');
  div.className = 'subclass';
  div.innerHTML = `
    <div class="subclass-head">
      <button class="subclass-toggle">▸</button>
      <input type="text" class="sc-name" placeholder="Название подкласса">
    </div>
    <div class="subclass-desc">
      <textarea class="sc-desc" rows="3" placeholder="Описание"></textarea>
    </div>
  `;
  const toggle = div.querySelector('.subclass-toggle');
  const head = div.querySelector('.subclass-head');
  toggle.onclick = e => {
    e.stopPropagation();
    div.classList.toggle('open');
    toggle.textContent = div.classList.contains('open') ? '▾' : '▸';
  };
  head.addEventListener('click', e => {
    if (e.target.tagName === 'INPUT') return;
    div.classList.toggle('open');
    toggle.textContent = div.classList.contains('open') ? '▾' : '▸';
  });
  if (data.name) div.querySelector('.sc-name').value = data.name;
  if (data.desc) div.querySelector('.sc-desc').value = data.desc;
  div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', autoSave));
  return div;
}

/* ---- СУМКИ ---- */
function createBag(data = {}) {
  const div = document.createElement('div');
  div.className = 'bag';
  div.innerHTML = `
    <div class="bag-header">
      <input type="text" class="bag-name" placeholder="Название сумки">
      <span class="bag-info">Ячеек: <b class="bag-count">0</b> · Вес: <b class="bag-weight">0</b></span>
      <button class="btn btn-danger bag-del" style="padding:6px 10px">✖</button>
    </div>
    <div class="bag-items"></div>
    <button class="btn btn-add bag-add">+ Добавить предмет</button>
  `;
  const itemsBox = div.querySelector('.bag-items');

  function addItem(item = {}) {
    const row = document.createElement('div');
    row.className = 'bag-item';
    row.innerHTML = `
      <input type="number" class="i-num" placeholder="#" value="${item.num || ''}">
      <input type="text" class="i-name" placeholder="Предмет" value="${item.name || ''}">
      <input type="text" class="i-desc" placeholder="Описание" value="${item.desc || ''}">
      <input type="number" class="i-qty" placeholder="Кол-во" value="${item.qty || ''}">
      <input type="number" step="0.1" class="i-weight" placeholder="Вес" value="${item.weight || ''}">
      <button class="item-del">✖</button>
    `;
    row.querySelector('.item-del').onclick = () => { row.remove(); updateBagStats(); autoSave(); };
    row.querySelectorAll('input').forEach(el => el.addEventListener('input', () => {
      updateBagStats();
      autoSave();
    }));
    itemsBox.appendChild(row);
  }

  function updateBagStats() {
    const rows = itemsBox.querySelectorAll('.bag-item');
    let totalWeight = 0;
    rows.forEach(r => {
      const w = parseFloat(r.querySelector('.i-weight').value) || 0;
      const q = parseFloat(r.querySelector('.i-qty').value) || 1;
      totalWeight += w * q;
    });
    div.querySelector('.bag-count').textContent = rows.length;
    div.querySelector('.bag-weight').textContent = totalWeight.toFixed(2);
    updateTotalWeight();
  }

  if (data.name) div.querySelector('.bag-name').value = data.name;
  (data.items || []).forEach(addItem);

  div.querySelector('.bag-add').onclick = () => { addItem(); autoSave(); };
  div.querySelector('.bag-del').onclick = () => { div.remove(); updateTotalWeight(); autoSave(); };
  div.querySelector('.bag-name').addEventListener('input', autoSave);

  div._updateStats = updateBagStats;
  updateBagStats();
  return div;
}

function updateTotalWeight() {
  let total = 0;
  $$('.bag').forEach(bag => {
    const w = parseFloat(bag.querySelector('.bag-weight').textContent) || 0;
    total += w;
  });
  // вес снаряжения
  $$('#equipList .list-card').forEach(card => {
    const w = parseFloat(card.querySelector('.f-desc')?.dataset.weight) || 0;
    total += w;
  });
  const el = $('#totalWeight');
  if (el) el.textContent = total.toFixed(2);
}

/* ---- ЯЧЕЙКИ ЗАКЛИНАНИЙ ---- */
function renderSlots() {
  const box = $('#slotsContainer');
  box.innerHTML = '';

  Object.entries(SLOTS_CONFIG).forEach(([circle, count]) => {
    const block = document.createElement('div');
    block.className = 'circle-block';
    block.innerHTML = `
      <div class="circle-title">${circle} круг — ${count} ячеек</div>
      <div class="slots-strip-wrap">
        <button class="arrow arrow-left">‹</button>
        <div class="slots-strip"></div>
        <button class="arrow arrow-right">›</button>
      </div>
    `;
    const strip = block.querySelector('.slots-strip');
    for (let i = 1; i <= count; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.slotId = `${circle}-${i}`;
      slot.innerHTML = `
        <span class="slot-num">${i}</span>
        <div class="slot-img-box">
          <img style="display:none">
          <span class="ph">Пусто</span>
        </div>
        <button class="slot-clear" style="display:none">✖</button>
      `;
      const imgBox = slot.querySelector('.slot-img-box');
      const img = slot.querySelector('img');
      const ph = slot.querySelector('.ph');
      const clear = slot.querySelector('.slot-clear');

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      slot.appendChild(fileInput);

      imgBox.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => {
          img.src = ev.target.result;
          img.style.display = 'block';
          ph.style.display = 'none';
          clear.style.display = 'block';
          autoSave();
        };
        reader.readAsDataURL(f);
      });
      clear.addEventListener('click', e => {
        e.stopPropagation();
        img.src = '';
        img.style.display = 'none';
        ph.style.display = 'block';
        clear.style.display = 'none';
        autoSave();
      });

      strip.appendChild(slot);
    }
    block.querySelector('.arrow-left').onclick = () => strip.scrollBy({ left: -460, behavior: 'smooth' });
    block.querySelector('.arrow-right').onclick = () => strip.scrollBy({ left: 460, behavior: 'smooth' });
    box.appendChild(block);
  });
}

/* ---- СБОР ДАННЫХ ---- */
function collectData() {
  const data = { fields: {}, skills: {}, subclasses: [], spells: [], effects: [], actives: [], passives: [], bags: [], equip: [], slots: {} };

  $$('[data-key]').forEach(el => data.fields[el.dataset.key] = el.value);
  $$('[data-skill]').forEach(el => data.skills[el.dataset.skill] = el.value);

  // подклассы
  $$('#subclassList .subclass').forEach(sc => {
    data.subclasses.push({
      name: sc.querySelector('.sc-name').value,
      desc: sc.querySelector('.sc-desc').value
    });
  });

  // списки-карточки
  const collectList = (containerId, kind) => {
    $$(`#${containerId} .list-card`).forEach(card => {
      const img = card.querySelector('img');
      data[kind].push({
        circle: card.querySelector('.f-circle')?.value,
        name: card.querySelector('.f-name').value,
        desc: card.querySelector('.f-desc').value,
        img: img && img.src && img.src.startsWith('data:') ? img.src : ''
      });
    });
  };
  collectList('spellContainer', 'spells');
  collectList('effectList', 'effects');
  collectList('activeList', 'actives');
  collectList('passiveList', 'passives');
  collectList('equipList', 'equip');

  // сумки
  $$('#bagContainer .bag').forEach(bag => {
    const items = [];
    bag.querySelectorAll('.bag-item').forEach(r => {
      items.push({
        num: r.querySelector('.i-num').value,
        name: r.querySelector('.i-name').value,
        desc: r.querySelector('.i-desc').value,
        qty: r.querySelector('.i-qty').value,
        weight: r.querySelector('.i-weight').value
      });
    });
    data.bags.push({ name: bag.querySelector('.bag-name').value, items });
  });

  // ячейки
  $$('.slot').forEach(slot => {
    const img = slot.querySelector('img');
    if (img && img.src && img.src.startsWith('data:')) {
      data.slots[slot.dataset.slotId] = img.src;
    }
  });

  return data;
}

/* ---- ЗАГРУЗКА ДАННЫХ ---- */
function applyData(d) {
  if (!d) return;

  // поля
  if (d.fields) $$('[data-key]').forEach(el => {
    if (d.fields[el.dataset.key] !== undefined) el.value = d.fields[el.dataset.key];
  });
  if (d.skills) $$('[data-skill]').forEach(el => {
    if (d.skills[el.dataset.skill] !== undefined) el.value = d.skills[el.dataset.skill];
  });

  // подклассы
  $('#subclassList').innerHTML = '';
  (d.subclasses || []).forEach(sc => $('#subclassList').appendChild(createSubclass(sc)));

  // списки
  const fill = (containerId, kind, items) => {
    $(`#${containerId}`).innerHTML = '';
    (items || []).forEach(item => $(`#${containerId}`).appendChild(createListCard(kind, item)));
  };
  fill('spellContainer', 'spell', d.spells);
  fill('effectList', 'effect', d.effects);
  fill('activeList', 'active', d.actives);
  fill('passiveList', 'passive', d.passives);
  fill('equipList', 'equip', d.equip);

  // сумки
  $('#bagContainer').innerHTML = '';
  (d.bags || []).forEach(b => $('#bagContainer').appendChild(createBag(b)));

  // ячейки
  if (d.slots) {
    Object.entries(d.slots).forEach(([slotId, src]) => {
      const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
      if (slot) {
        const img = slot.querySelector('img');
        const ph = slot.querySelector('.ph');
        const clear = slot.querySelector('.slot-clear');
        img.src = src;
        img.style.display = 'block';
        if (ph) ph.style.display = 'none';
        clear.style.display = 'block';
      }
    });
  }

  updateTotalWeight();
}

/* ---- СОХРАНЕНИЕ ---- */
let saveTimer = null;
function autoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
  }, 400);
}
function saveNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
  toast('💾 Сохранено');
}
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { applyData(JSON.parse(raw)); } catch (e) { console.warn(e); } }
}

/* ---- ЭКСПОРТ / ИМПОРТ ---- */
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
      const d = JSON.parse(e.target.result);
      applyData(d);
      saveNow();
      toast('⬆ Импортировано');
    } catch (err) { toast('✖ Ошибка файла'); }
  };
  reader.readAsText(file);
}

/* ---- СБРОС ---- */
function resetAll() {
  if (!confirm('Удалить все данные персонажа?')) return;
  localStorage.removeItem(STORAGE_KEY);
  $$('[data-key], [data-skill]').forEach(el => el.value = '');
  ['subclassList','spellContainer','effectList','activeList','passiveList','bagContainer','equipList'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  renderSlots();
  updateTotalWeight();
  toast('✖ Сброшено');
}

/* ---- СКРЫТИЕ СПИСКОВ ---- */
function initToggles() {
  $$('.btn-toggle').forEach(btn => {
    btn.onclick = () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.classList.toggle('collapsed');
      const hidden = target.classList.contains('collapsed');
      btn.textContent = hidden ? '▸ Показать' : '▾ Скрыть';
    };
  });
}

/* ---- ИНИЦИАЛИЗАЦИЯ ---- */
function init() {
  renderSkills();
  renderSlots();
  loadFromStorage();

  document.addEventListener('input', autoSave);

  $('#saveBtn').onclick   = saveNow;
  $('#exportBtn').onclick = exportJSON;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#resetBtn').onclick  = resetAll;
  $('#importFile').onchange = e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  };

  $('#addSubclassBtn').onclick = () => { $('#subclassList').appendChild(createSubclass()); autoSave(); };
  $('#addSpellBtn').onclick    = () => { $('#spellContainer').appendChild(createListCard('spell')); autoSave(); };
  $('#addEffectBtn').onclick   = () => { $('#effectList').appendChild(createListCard('effect')); autoSave(); };
  $('#addActiveBtn').onclick   = () => { $('#activeList').appendChild(createListCard('active')); autoSave(); };
  $('#addPassiveBtn').onclick  = () => { $('#passiveList').appendChild(createListCard('passive')); autoSave(); };
  $('#addBagBtn').onclick      = () => { $('#bagContainer').appendChild(createBag()); autoSave(); };
  $('#addEquipBtn').onclick    = () => { $('#equipList').appendChild(createListCard('equip')); autoSave(); };

  initToggles();
  toast('☠ Лист персонажа загружен');
}

document.addEventListener('DOMContentLoaded', init);
