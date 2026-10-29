/* ============================================================
   ЛИСТ ПЕРСОНАЖА — вся логика v6.1 (С авто-ростом высоты)
   ============================================================ */

const DB_NAME = 'AbsoluteWorldCharacterDB';
const STORE_NAME = 'characterData';
const DB_VERSION = 1;
const SLOTS_CONFIG = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4 };
const FOCUS_SLOTS = 2;

let db = null;
let isAppLoading = true;

// ================= FIREBASE =================
let isCloudLoading = false;
let inventoryDocRef = null;

async function saveSharedToCloud() {
    if (!window.firebaseDB || !inventoryDocRef || isCloudLoading) return;
    try {
        const bagsData = [];
        $$('#sharedBagContainer .bag').forEach(bag => {
            const items = [];
            bag.querySelectorAll('.bag-item').forEach(r => {
                const subs = [];
                r.querySelectorAll('.sub-item').forEach(s => {
                    subs.push({
                        name: s.querySelector('.s-name').value,
                        qty: s.querySelector('.s-qty').value,
                        desc: s.querySelector('.s-desc').value
                    });
                });
                items.push({
                    num: r.querySelector('.i-num').value,
                    name: r.querySelector('.i-name').value,
                    desc: r.querySelector('.i-desc').value,
                    qty: r.querySelector('.i-qty').value,
                    weight: r.querySelector('.i-weight').value,
                    subs
                });
            });
            bagsData.push({ name: bag.querySelector('.bag-name').value, items });
        });

        await window.firebaseSetDoc(inventoryDocRef, { bags: bagsData });
    } catch (error) {
        console.error("Ошибка сохранения в облако: ", error);
    }
}

function renderSharedBags(bags) {
    const container = $('#sharedBagContainer');
    if (!container) return;
    container.innerHTML = '';
    (bags || []).forEach(b => {
        container.appendChild(createBag(b, updateSharedTotalWeight, true));
    });
    updateSharedTotalWeight();
}

window.startFirebaseSync = function() {
    if (!window.firebaseDB) return;
    
    const statusEl = $('#sharedSyncStatus');
    inventoryDocRef = window.firebaseDoc(window.firebaseDB, "inventories", "shared");

    window.firebaseOnSnapshot(inventoryDocRef, (docSnap) => {
        if (statusEl) { statusEl.textContent = "(Онлайн)"; statusEl.style.color = "var(--green)"; }
        
        if (docSnap.exists()) {
            isCloudLoading = true;
            const cloudBags = docSnap.data().bags || [];
            const activeEl = document.activeElement;
            const isTypingInShared = activeEl && activeEl.closest('#sharedBagContainer');

            if (!isTypingInShared) {
                renderSharedBags(cloudBags);
            }
            setTimeout(() => { isCloudLoading = false; }, 100);
        } else {
            window.firebaseSetDoc(inventoryDocRef, { bags: [] });
        }
    }, (error) => {
        console.error("Ошибка подписки на облако:", error);
        if (statusEl) { statusEl.textContent = "(Офлайн)"; statusEl.style.color = "var(--danger)"; }
    });
};


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

const ALL_SKILLS = [
  ...SKILLS.mind.map(s => ({ ...s, group: 'Разум' })),
  ...SKILLS.body.map(s => ({ ...s, group: 'Тело' })),
  ...SKILLS.harmony.map(s => ({ ...s, group: 'Гармония' }))
];

const BONUS_TARGETS = [
  { value: 'defense', label: '🛡 Защита' },
  { value: 'hp', label: '❤ Здоровье' },
  { value: 'speed', label: '👟 Скорость' },
  { value: 'faith', label: '🕯 Вера' },
  { value: '__skills__', label: '── Навыки ──', disabled: true },
  ...ALL_SKILLS.map(s => ({ value: 'skill_' + s.key, label: '  ' + s.label + ' (' + s.group + ')' })),
  { value: '__damage__', label: '── Урон заклинаний ──', disabled: true },
  { value: 'dmg_all', label: '  Урон (все типы)' },
  { value: 'dmg_necro', label: '  Урон (некро)' },
  { value: 'dmg_fire', label: '  Урон (огонь)' },
  { value: 'dmg_cold', label: '  Урон (холод)' },
  { value: 'dmg_phys', label: '  Урон (физический)' }
];

const DAMAGE_CONDITIONS = [
  { value: 'all', label: 'Все типы' },
  { value: 'necro', label: 'Только некро' },
  { value: 'fire', label: 'Только огонь' },
  { value: 'cold', label: 'Только холод' },
  { value: 'phys', label: 'Только физический' }
];

const DEFAULT_FAITH = [
  { min: '-30', dice: '1д4' },
  { min: '-60', dice: '1д8' },
  { min: '-90', dice: '1д12' }
];

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   БАЗА ДАННЫХ (IndexedDB)
   ============================================================ */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = e => reject(e);
    request.onsuccess = e => { db = e.target.result; resolve(db); };
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
  });
}

function saveToDB(data) {
  return new Promise((resolve, reject) => {
    if (!db) return reject("БД не инициализирована");
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put(data, 'character');
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e);
  });
}

function loadFromDB() {
  return new Promise((resolve, reject) => {
    if (!db) return reject("БД не инициализирована");
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const request = transaction.objectStore(STORE_NAME).get('character');
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

/* ============================================================
   НАВЫКИ И БОНУСЫ
   ============================================================ */
function renderSkills() {
  Object.entries(SKILLS).forEach(([group, list]) => {
    const box = document.querySelector(`[data-group="${group}"]`);
    if(!box) return;
    box.innerHTML = list.map(s => `
      <div class="skill-row">
        <label>${s.label}</label>
        <input type="number" data-skill="${s.key}" placeholder="0">
        <div class="skill-total" data-skill-total="${s.key}" data-skill-name="${s.label}">0</div>
      </div>
    `).join('');
  });
}

function createBonusRow(data = {}) {
  const div = document.createElement('div');
  div.className = 'bonus-row';

  const targetOptions = BONUS_TARGETS.map(t =>
    `<option value="${t.value}" ${t.disabled ? 'disabled' : ''} ${data.target === t.value ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const condOptions = DAMAGE_CONDITIONS.map(c =>
    `<option value="${c.value}" ${data.condition === c.value ? 'selected' : ''}>${c.label}</option>`
  ).join('');

  div.innerHTML = `
    <select class="bonus-target">${targetOptions}</select>
    <input type="text" class="bonus-value" placeholder="+1д8 / +2" value="${data.value || ''}">
    <select class="bonus-cond">${condOptions}</select>
    <button class="bonus-del" title="Удалить">✖</button>
  `;
  div.querySelector('.bonus-del').onclick = () => { div.remove(); autoSave(); recalcAll(); };
  div.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => { autoSave(); recalcAll(); });
    el.addEventListener('input', () => { autoSave(); recalcAll(); });
  });
  return div;
}

function createBonusBlock(initial = []) {
  const div = document.createElement('div');
  div.className = 'bonuses-block';
  div.innerHTML = `
    <div class="bonuses-title">
      <span>⚡ Бонусы</span>
      <button class="btn-small add-bonus">+ бонус</button>
    </div>
    <div class="bonuses-list"></div>
  `;
  const list = div.querySelector('.bonuses-list');
  (initial || []).forEach(b => list.appendChild(createBonusRow(b)));
  div.querySelector('.add-bonus').onclick = e => {
    e.preventDefault();
    list.appendChild(createBonusRow());
    autoSave();
  };
  return div;
}

/* ============================================================
   ГЛОБАЛЬНЫЕ БОНУСЫ (НОВАЯ ПАНЕЛЬ)
   ============================================================ */
function createGlobalBonusRow(text = '') {
  const div = document.createElement('div');
  div.className = 'global-bonus-row';
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  
  div.innerHTML = `
    <input type="text" class="g-bonus-text" placeholder="Например: Урон огня +1д6" value="${text}" style="flex: 1;">
    <button class="bonus-del" title="Удалить" style="font-size: 18px;">✖</button>
  `;
  
  div.querySelector('.bonus-del').onclick = () => { div.remove(); autoSave(); };
  div.querySelector('input').addEventListener('input', autoSave);
  return div;
}

/* ============================================================
   КАРТОЧКА СПИСКА
   ============================================================ */
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
      <input type="text" class="f-damage" placeholder="Урон (напр. 2д10 некро)" value="${data.damage || ''}">
      <textarea class="f-desc" placeholder="Описание"></textarea>
      <div class="bonus-block-slot"></div>
      ${isSpell ? `<button class="slot-send-btn">→ Положить в ячейку</button>` : ''}
    </div>
    <button class="list-del" title="Удалить">✖</button>
  `;

  const imgBox = div.querySelector('.card-img-box');
  const img = imgBox.querySelector('img');
  const ph = imgBox.querySelector('.ph');

  if (isSpell && data.circle) div.querySelector('.f-circle').value = data.circle;
  if (data.name) div.querySelector('.f-name').value = data.name;
  if (data.desc) div.querySelector('.f-desc').value = data.desc;
  if (data.img) { img.src = data.img; img.style.display = 'block'; if (ph) ph.style.display = 'none'; }

  div.querySelector('.bonus-block-slot').appendChild(createBonusBlock(data.bonuses || []));

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

  if (isSpell) {
    div.querySelector('.slot-send-btn').onclick = e => {
      e.preventDefault();
      openSendToSlotDialog(div);
    };
  }

  div.querySelector('.list-del').onclick = () => { div.remove(); autoSave(); recalcAll(); };
  div.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', autoSave));

  return div;
}

/* ============================================================
   ОТПРАВИТЬ В ЯЧЕЙКУ
   ============================================================ */
function openSendToSlotDialog(spellCard) {
  const img = spellCard.querySelector('img');
  const src = img && img.src && img.src.startsWith('data:') ? img.src : '';
  if (!src) { toast('Сначала загрузи карточку'); return; }

  const circle = prompt('Круг (1-5)?');
  if (!circle || !SLOTS_CONFIG[circle]) { toast('Неверный круг'); return; }
  const idx = prompt(`Номер ячейки (1-${SLOTS_CONFIG[circle]})?`);
  if (!idx || idx < 1 || idx > SLOTS_CONFIG[circle]) { toast('Неверный номер'); return; }

  const slotId = `${circle}-${idx}`;
  const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
  if (!slot) { toast('Ячейка не найдена'); return; }

  const slotImg = slot.querySelector('img');
  const ph = slot.querySelector('.ph');
  const clear = slot.querySelector('.slot-clear');
  const buttons = slot.querySelector('.slot-buttons');
  slotImg.src = src;
  slotImg.style.display = 'block';
  if (ph) ph.style.display = 'none';
  clear.style.display = 'block';
  if (buttons) buttons.style.display = 'flex';
  slot.classList.remove('used');
  autoSave();
  toast(`→ В ячейку ${circle}-${idx}`);
}

/* ============================================================
   ПОДКЛАССЫ
   ============================================================ */
function createSubclass(data = {}) {
  const div = document.createElement('div');
  div.className = 'subclass';
  div.innerHTML = `
    <div class="subclass-head">
      <button class="subclass-toggle">▸</button>
      <input type="text" class="sc-name" placeholder="Название подкласса">
    </div>
    <div class="subclass-body">
      <textarea class="sc-desc" rows="3" placeholder="Описание"></textarea>
      <div class="bonus-block-slot"></div>
    </div>
  `;
  const toggle = div.querySelector('.subclass-toggle');
  const head = div.querySelector('.subclass-head');
  const doToggle = () => {
    div.classList.toggle('open');
    toggle.textContent = div.classList.contains('open') ? '▾' : '▸';
  };
  toggle.onclick = e => { e.stopPropagation(); doToggle(); };
  head.addEventListener('click', e => { if (e.target.tagName === 'INPUT') return; doToggle(); });

  if (data.name) div.querySelector('.sc-name').value = data.name;
  if (data.desc) div.querySelector('.sc-desc').value = data.desc;

  div.querySelector('.bonus-block-slot').appendChild(createBonusBlock(data.bonuses || []));
  div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', autoSave));
  return div;
}

/* ============================================================
   СУМКИ (ИНВЕНТАРЬ)
   ============================================================ */
function createBag(data = {}, onUpdate = () => {}, isCloud = false) {
  const div = document.createElement('div');
  div.className = 'bag';
  div.innerHTML = `
    <div class="bag-header">
      <input type="text" class="bag-name" placeholder="Название сумки">
      <div class="bag-info">
        <span>Ячеек: <b class="bag-count">0</b></span>
        <span>Вес: <b class="bag-weight">0</b></span>
      </div>
      <button class="btn btn-danger bag-del" style="padding:6px 10px">✖</button>
    </div>
    <div class="bag-items"></div>
    <button class="btn btn-add bag-add">+ Добавить предмет</button>
  `;
  const itemsBox = div.querySelector('.bag-items');

  const triggerUpdate = () => {
    onUpdate();
    if (isCloud) saveSharedToCloud();
  };

  function renumberItems() {
    const rows = itemsBox.querySelectorAll('.bag-item');
    rows.forEach((row, index) => {
      const numInput = row.querySelector('.i-num');
      numInput.value = index + 1;
    });
  }

  function addItem(item = {}) {
    const row = document.createElement('div');
    row.className = 'bag-item';
    
    row.innerHTML = `
      <div class="bag-item-main">
        <input type="number" class="i-num" placeholder="#" readonly>
        <input type="text" class="i-name" placeholder="Предмет" value="${item.name || ''}">
        <textarea class="i-desc" placeholder="Описание" rows="1">${item.desc || ''}</textarea>
        <input type="number" class="i-qty" placeholder="Кол-во" value="${item.qty || ''}">
        <input type="number" step="0.1" class="i-weight" placeholder="Вес" value="${item.weight || ''}">
        <button class="bag-item-toggle" title="Раскрыть список">▾</button>
        <button class="item-del">✖</button>
      </div>
      <div class="sub-items" style="display:none"></div>
    `;

    const descInput = row.querySelector('.i-desc');
    
    const autoResize = () => {
      descInput.style.height = '1px';
      requestAnimationFrame(() => {
        descInput.style.height = (descInput.scrollHeight + 2) + 'px';
        if (descInput.scrollHeight <= 36) descInput.style.height = '36px';
      });
    };

    descInput.addEventListener('input', autoResize);
    setTimeout(autoResize, 50);
    setTimeout(autoResize, 250);
    setTimeout(autoResize, 800);

    // === ИЗМЕНЕНИЕ: Принудительный пересчет для всех полей ===
    setTimeout(() => {
        document.querySelectorAll('.i-desc').forEach(el => {
            if (el.scrollHeight > 36) {
                el.style.height = '1px';
                requestAnimationFrame(() => {
                    el.style.height = (el.scrollHeight + 2) + 'px';
                });
            }
        });
    }, 1000);

    const toggle = row.querySelector('.bag-item-toggle');
    const subBox = row.querySelector('.sub-items');

    function addSubItem(si = {}) {
      const s = document.createElement('div');
      s.className = 'sub-item';
      s.innerHTML = `
        <input type="text" class="s-name" placeholder="Название" value="${si.name || ''}">
        <input type="number" class="s-qty" placeholder="Кол-во" value="${si.qty || ''}">
        <input type="text" class="s-desc" placeholder="Описание" value="${si.desc || ''}">
        <button class="sub-item-del">✖</button>
      `;
      s.querySelector('.sub-item-del').onclick = () => { s.remove(); autoSave(); triggerUpdate(); };
      s.querySelectorAll('input').forEach(el => el.addEventListener('input', () => { autoSave(); triggerUpdate(); }));
      subBox.appendChild(s);
    }

    if (item.subs && item.subs.length) item.subs.forEach(addSubItem);

    let addSubBtn = null;
    function ensureAddBtn() {
      if (addSubBtn) return;
      addSubBtn = document.createElement('button');
      addSubBtn.className = 'btn-small';
      addSubBtn.style.alignSelf = 'flex-start';
      addSubBtn.style.marginTop = '4px';
      addSubBtn.textContent = '+ подпункт';
      addSubBtn.onclick = () => { addSubItem(); autoSave(); triggerUpdate(); };
      subBox.appendChild(addSubBtn);
    }

    toggle.onclick = e => {
      e.stopPropagation();
      const open = subBox.style.display === 'none';
      subBox.style.display = open ? 'flex' : 'none';
      toggle.textContent = open ? '▴' : '▾';
      if (open) ensureAddBtn();
    };

    row.querySelector('.item-del').onclick = () => { 
      if(confirm('Удалить предмет?')) {
        row.remove(); renumberItems(); updateBagStats(); autoSave(); triggerUpdate(); 
      }
    };
    row.querySelectorAll('.bag-item-main input').forEach(el => el.addEventListener('input', () => { updateBagStats(); autoSave(); triggerUpdate(); }));

    itemsBox.appendChild(row);
    renumberItems();
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
    onUpdate();
  }

  if (data.name) div.querySelector('.bag-name').value = data.name;
  (data.items || []).forEach(addItem);

  div.querySelector('.bag-add').onclick = () => { addItem(); autoSave(); triggerUpdate(); };
  div.querySelector('.bag-del').onclick = () => { 
    if (confirm('Вы уверены, что хотите удалить ВСЮ сумку?')) { div.remove(); triggerUpdate(); autoSave(); }
  };
  div.querySelector('.bag-name').addEventListener('input', () => { autoSave(); if(isCloud) saveSharedToCloud(); });

  renumberItems();
  updateBagStats();
  return div;
}

function updateTotalWeight() {
  let total = 0;
  $$('#bagContainer .bag').forEach(bag => {
    total += parseFloat(bag.querySelector('.bag-weight').textContent) || 0;
  });
  const el = $('#totalWeight');
  if (el) el.textContent = total.toFixed(2);
}

function updateSharedTotalWeight() {
  let total = 0;
  $$('#sharedBagContainer .bag').forEach(bag => {
    total += parseFloat(bag.querySelector('.bag-weight').textContent) || 0;
  });
  const el = $('#sharedTotalWeight');
  if (el) el.textContent = total.toFixed(2);
}

/* ============================================================
   ЯЧЕЙКИ
   ============================================================ */
function renderSlots() {
  const box = $('#slotsContainer');
  if (!box) return;
  box.innerHTML = '';

  const focusBlock = document.createElement('div');
  focusBlock.className = 'circle-block';
  focusBlock.innerHTML = `
    <div class="circle-title">Фокус — ${FOCUS_SLOTS} ячейки (без отката)</div>
    <div class="slots-strip-wrap">
      <button class="arrow arrow-left">‹</button>
      <div class="slots-strip"></div>
      <button class="arrow arrow-right">›</button>
    </div>
  `;
  const focusStrip = focusBlock.querySelector('.slots-strip');
  for (let i = 1; i <= FOCUS_SLOTS; i++) focusStrip.appendChild(createSlotEl(`focus-${i}`, i, false));
  focusBlock.querySelector('.arrow-left').onclick = () => focusStrip.scrollBy({ left: -470, behavior: 'smooth' });
  focusBlock.querySelector('.arrow-right').onclick = () => focusStrip.scrollBy({ left: 470, behavior: 'smooth' });
  box.appendChild(focusBlock);

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
    for (let i = 1; i <= count; i++) strip.appendChild(createSlotEl(`${circle}-${i}`, i, true));
    block.querySelector('.arrow-left').onclick = () => strip.scrollBy({ left: -470, behavior: 'smooth' });
    block.querySelector('.arrow-right').onclick = () => strip.scrollBy({ left: 470, behavior: 'smooth' });
    box.appendChild(block);
  });
}

function createSlotEl(slotId, num, canUse) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.dataset.slotId = slotId;
  slot.dataset.canUse = canUse ? '1' : '0';
  slot.innerHTML = `
    <span class="slot-num">${num}</span>
    <div class="slot-img-box">
      <img style="display:none">
      <span class="ph">Пусто</span>
    </div>
    <button class="slot-clear" style="display:none">✖</button>
    <div class="slot-buttons" style="display:none">
      <button class="slot-btn roll">🎲 Бросок</button>
      ${canUse ? `<button class="slot-btn use">✓ Использовать</button>` : ''}
    </div>
  `;

  const imgBox = slot.querySelector('.slot-img-box');
  const img = slot.querySelector('img');
  const ph = slot.querySelector('.ph');
  const clear = slot.querySelector('.slot-clear');
  const buttons = slot.querySelector('.slot-buttons');
  const useBtn = slot.querySelector('.slot-btn.use');
  const rollBtn = slot.querySelector('.slot-btn.roll');

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
      img.src = ev.target.result; img.style.display = 'block';
      ph.style.display = 'none'; clear.style.display = 'block';
      buttons.style.display = 'flex'; slot.classList.remove('used');
      autoSave();
    };
    reader.readAsDataURL(f);
  });

  clear.addEventListener('click', e => {
    e.stopPropagation();
    img.src = ''; img.style.display = 'none'; ph.style.display = 'block';
    clear.style.display = 'none'; buttons.style.display = 'none';
    slot.classList.remove('used'); autoSave();
  });

  if (useBtn) useBtn.addEventListener('click', e => {
    e.stopPropagation();
    slot.classList.toggle('used');
    useBtn.textContent = slot.classList.contains('used') ? '↺ Откат' : '✓ Использовать';
    toast(slot.classList.contains('used') ? '✓ Использовано' : '↺ Откат');
    autoSave();
  });

  rollBtn.addEventListener('click', e => { e.stopPropagation(); quickRoll(); });

  return slot;
}

/* ============================================================
   ПАРСЕР КУБИКОВ И РАСЧЕТЫ
   ============================================================ */
function parseDice(str) {
  if (!str) return null;
  const clean = String(str).trim().replace(/д/g, 'd').replace(/\s/g, '');
  const parts = clean.split(/(?=[+-])/).filter(Boolean);
  const result = { dice: [], flat: 0 };
  for (let p of parts) {
    if (!p) continue;
    const sign = p.startsWith('-') ? -1 : 1;
    const body = p.replace(/^[+-]/, '');
    const m = body.match(/^(\d+)d(\d+)$/);
    if (m) result.dice.push({ count: parseInt(m[1]) * sign, sides: parseInt(m[2]) });
    else {
      const num = parseFloat(body);
      if (!isNaN(num)) result.flat += num * sign;
    }
  }
  return result;
}

function gatherBonuses() {
  const all = [];
  $$('.bonus-row').forEach(row => {
    const target = row.querySelector('.bonus-target').value;
    const value = row.querySelector('.bonus-value').value;
    if (!value) return;
    let source = 'Неизвестно';
    const listCard = row.closest('.list-card');
    if (listCard) {
      const name = listCard.querySelector('.f-name')?.value;
      const kind = listCard.dataset.kind;
      const kinds = { spell: 'Заклинание', effect: 'Эффект', active: 'Активный', passive: 'Пассивный', equip: 'Снаряжение' };
      source = `${kinds[kind] || 'Карточка'}: ${name || '(без имени)'}`;
    }
    const subclass = row.closest('.subclass');
    if (subclass) source = `Подкласс: ${subclass.querySelector('.sc-name')?.value || '(без имени)'}`;
    all.push({ target, value, source });
  });
  return all;
}

function recalcAll() {
  const bonuses = gatherBonuses();
  const bases = {
    hp: parseFloat($('[data-key="hp"]')?.value) || 0,
    defense: parseFloat($('[data-key="defense"]')?.value) || 0,
    speed: parseFloat($('[data-key="speed"]')?.value) || 0
  };
  const totals = { hp: bases.hp, defense: bases.defense, speed: bases.speed };
  const skillTotals = {};
  ALL_SKILLS.forEach(s => skillTotals[s.key] = parseFloat($(`[data-skill="${s.key}"]`)?.value) || 0);

  bonuses.forEach(b => {
    if (['hp', 'defense', 'speed'].includes(b.target)) {
      const p = parseDice(b.value);
      if (p) totals[b.target] += p.flat;
    }
    if (b.target.startsWith('skill_')) {
      const key = b.target.replace('skill_', '');
      const p = parseDice(b.value);
      if (p) skillTotals[key] += p.flat;
    }
  });

  $$('[data-total]').forEach(el => {
    const key = el.dataset.total;
    if (totals[key] !== undefined) el.textContent = totals[key];
  });
  $$('[data-skill-total]').forEach(el => {
    const key = el.dataset.skillTotal;
    if (skillTotals[key] !== undefined) el.textContent = skillTotals[key];
  });
}

function showBreakdown(target, targetLabel) {
  const bonuses = gatherBonuses();
  const modal = $('#breakdownModal');
  const title = $('#breakdownTitle');
  const body = $('#breakdownBody');

  title.textContent = 'Расшифровка: ' + targetLabel;
  let base = 0;
  if (target === 'hp') base = parseFloat($('[data-key="hp"]')?.value) || 0;
  if (target === 'defense') base = parseFloat($('[data-key="defense"]')?.value) || 0;
  if (target === 'speed') base = parseFloat($('[data-key="speed"]')?.value) || 0;
  if (target.startsWith('skill_')) base = parseFloat($(`[data-skill="${target.replace('skill_', '')}"]`)?.value) || 0;

  const rows = [{ label: 'База', value: base, isBase: true }];
  let total = base;

  bonuses.forEach(b => {
    if (b.target === target) {
      const p = parseDice(b.value);
      if (p) { total += p.flat; rows.push({ label: b.source, value: p.flat }); }
    }
  });

  if (rows.length === 1) {
    body.innerHTML = `<div class="breakdown-empty">Нет бонусов</div>`;
  } else {
    body.innerHTML = rows.map(r => `
      <div class="breakdown-row ${r.isBase ? 'base' : ''}">
        <span>${r.label}</span>
        <span>${r.value > 0 && !r.isBase ? '+' : ''}${r.value}</span>
      </div>
    `).join('') + `<div class="breakdown-row"><span>ИТОГО</span><span>${total}</span></div>`;
  }
  modal.classList.add('open');
}

function createFaithRow(data = {}) {
  const div = document.createElement('div');
  div.className = 'faith-row';
  div.innerHTML = `
    <input type="text" class="f-min" placeholder="Вера от -30" value="${data.min || ''}">
    <input type="text" class="f-dice" placeholder="+1д4" value="${data.dice || ''}">
    <button class="bonus-del">✖</button>
  `;
  div.querySelector('.bonus-del').onclick = () => { div.remove(); autoSave(); recalcAll(); };
  div.querySelectorAll('input').forEach(el => el.addEventListener('input', autoSave));
  return div;
}

function renderFaithThresholds(initial) {
  const box = $('#faithThresholds');
  if (!box) return;
  box.innerHTML = '';
  (initial || DEFAULT_FAITH).forEach(t => box.appendChild(createFaithRow(t)));
}

function getFaithBonus(faith) {
  const rows = $$('#faithThresholds .faith-row').map(r => ({
    min: parseFloat(r.querySelector('.f-min').value) || 0,
    dice: r.querySelector('.f-dice').value
  })).sort((a, b) => b.min - a.min);
  for (const r of rows) if (faith >= r.min) return r.dice;
  return '';
}

/* ============================================================
   БРОСОК И БОЙ
   ============================================================ */
function rollDice(count, sides) {
  let total = 0; const rolls = [];
  for (let i = 0; i < count; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); total += r; }
  return { total, rolls };
}

function quickRoll() {
  const formula = prompt('Бросок — введи формулу (напр. 2д10)');
  if (!formula) return;
  const p = parseDice(formula);
  if (!p) { toast('Не понял формулу'); return; }
  let total = p.flat; let allRolls = [];
  p.dice.forEach(d => {
    const r = rollDice(Math.abs(d.count), d.sides);
    total += r.total * Math.sign(d.count);
    allRolls.push(`${d.count}д${d.sides}: [${r.rolls.join(', ')}]`);
  });
  alert(`🎲 ${formula}\n\n${allRolls.join('\n')}\n\nИтог: ${total}`);
}

function openCombat() {
  const modal = $('#combatModal'); modal.classList.add('open');
  const body = $('#combatBody');
  body.innerHTML = `
    <div class="combat-grid">
      <div><h3 style="color:var(--green);margin-bottom:12px;">Твои атаки</h3><div class="combat-list" id="combatList"></div></div>
      <div><div class="combat-result" id="combatResult"><div class="combat-empty">Выбери атаку слева</div></div></div>
    </div>
  `;
  const list = $('#combatList'); const items = [];

  $$('.slot').forEach(slot => {
    const img = slot.querySelector('img');
    if (img && img.src && img.src.startsWith('data:')) items.push({ type: 'spell', slotId: slot.dataset.slotId, name: `Ячейка ${slot.dataset.slotId}`, damage: '' });
  });
  $$('#equipList .list-card').forEach(card => {
    const dmg = card.querySelector('.f-damage')?.value; const name = card.querySelector('.f-name')?.value;
    if (dmg) items.push({ type: 'equip', name: name || 'Снаряжение', damage: dmg });
  });
  $$('#spellContainer .list-card').forEach(card => {
    const dmg = card.querySelector('.f-damage')?.value; const name = card.querySelector('.f-name')?.value;
    if (dmg) items.push({ type: 'spell-list', name: name || 'Заклинание', damage: dmg });
  });

  if (!items.length) { list.innerHTML = `<div class="combat-empty">Нет атак</div>`; return; }

  items.forEach(it => {
    const div = document.createElement('div'); div.className = 'combat-item';
    div.innerHTML = `<div class="combat-item-name">${it.type === 'equip' ? '⚔ ' : '🔮 '}${it.name}</div><div class="combat-item-sub">${it.damage || '— урон не указан —'}</div>`;
    div.onclick = () => {
      $$('.combat-item').forEach(x => x.classList.remove('active')); div.classList.add('active'); selectCombatItem(it);
    };
    list.appendChild(div);
  });
}

function selectCombatItem(item) {
  const result = $('#combatResult');
  let damageFormula = item.damage;
  if (!damageFormula) {
    damageFormula = prompt('Укажи урон (напр. 2д10 некро)') || '';
    if (!damageFormula) { result.innerHTML = `<div class="combat-empty">Урон не указан</div>`; return; }
    item.damage = damageFormula;
  }
  const dmgType = detectDamageType(damageFormula);
  const bonuses = gatherBonuses(); const mods = [];

  bonuses.forEach(b => {
    if (b.target === 'dmg_all') mods.push({ name: 'Бонус', value: b.value });
    if (b.target === 'dmg_necro' && dmgType === 'necro') mods.push({ name: 'Бонус (некро)', value: b.value });
    if (b.target === 'dmg_fire' && dmgType === 'fire') mods.push({ name: 'Бонус (огонь)', value: b.value });
    if (b.target === 'dmg_cold' && dmgType === 'cold') mods.push({ name: 'Бонус (холод)', value: b.value });
    if (b.target === 'dmg_phys' && dmgType === 'phys') mods.push({ name: 'Бонус (физ)', value: b.value });
  });

  if (dmgType === 'necro') {
    const faith = parseFloat($('[data-key="faith"]')?.value) || 0;
    const faithBonus = getFaithBonus(faith);
    if (faithBonus) mods.push({ name: 'Вера (некро)', value: faithBonus });
  }

  const baseDice = parseDice(damageFormula);
  let formulaText = `<span class="dice">${damageFormula}</span>`;
  mods.forEach(m => formulaText += ` + <span class="mod">${m.value} (${m.name})</span>`);

  result.innerHTML = `
    <h3>${item.name}</h3><div class="combat-formula">${formulaText}</div>
    <div class="combat-total" id="combatTotal">0<small>нажми кнопку, чтобы бросить</small></div>
    <button class="combat-roll-btn" id="combatRollBtn">🎲 БРОСИТЬ</button>
  `;

  $('#combatRollBtn').onclick = () => {
    let total = 0;
    if (baseDice) {
      baseDice.dice.forEach(d => { const r = rollDice(Math.abs(d.count), d.sides); total += r.total * Math.sign(d.count); });
      total += baseDice.flat;
    }
    mods.forEach(m => {
      const p = parseDice(m.value); if (!p) return;
      p.dice.forEach(d => { const r = rollDice(Math.abs(d.count), d.sides); total += r.total * Math.sign(d.count); });
      if (p.flat) total += p.flat;
    });
    $('#combatTotal').innerHTML = `${total}<small>итого урона</small>`; toast(`🎲 ${total} урона`);
  };
}

function detectDamageType(str) {
  const s = str.toLowerCase();
  if (/некро/.test(s)) return 'necro';
  if (/огон|огн/.test(s)) return 'fire';
  if (/холод|лёд|лед/.test(s)) return 'cold';
  if (/физ|удар|руб|кол|реза/.test(s)) return 'phys';
  return 'all';
}

/* ============================================================
   СБОР И ЗАГРУЗКА ДАННЫХ
   ============================================================ */
function collectBonuses(container) {
  const bonuses = [];
  container.querySelectorAll('.bonus-row').forEach(row => {
    bonuses.push({ target: row.querySelector('.bonus-target').value, value: row.querySelector('.bonus-value').value, condition: row.querySelector('.bonus-cond').value });
  });
  return bonuses;
}

function collectData() {
  const data = {
    fields: {}, skills: {}, subclasses: [], spells: [], effects: [], actives: [], passives: [], equip: [],
    bags: [], slots: {}, faith: [], globalBonuses: [],
    photo: $('#photoImg') && $('#photoImg').src && $('#photoImg').src.startsWith('data:') ? $('#photoImg').src : ''
  };
  $$('[data-key]').forEach(el => data.fields[el.dataset.key] = el.value);
  $$('[data-skill]').forEach(el => data.skills[el.dataset.skill] = el.value);

  $$('#globalBonusesList input').forEach(el => {
    if (el.value.trim()) data.globalBonuses.push(el.value);
  });

  $$('#subclassList .subclass').forEach(sc => {
    data.subclasses.push({ name: sc.querySelector('.sc-name').value, desc: sc.querySelector('.sc-desc').value, bonuses: collectBonuses(sc) });
  });

  const collectList = (id, kind) => {
    $$(`#${id} .list-card`).forEach(card => {
      const img = card.querySelector('img');
      data[kind].push({
        circle: card.querySelector('.f-circle')?.value, name: card.querySelector('.f-name').value,
        damage: card.querySelector('.f-damage')?.value || '', desc: card.querySelector('.f-desc').value,
        img: img && img.src && img.src.startsWith('data:') ? img.src : '', bonuses: collectBonuses(card)
      });
    });
  };
  collectList('spellContainer', 'spells'); collectList('effectList', 'effects');
  collectList('activeList', 'actives'); collectList('passiveList', 'passives'); collectList('equipList', 'equip');

  $$('#bagContainer .bag').forEach(bag => {
    const items = [];
    bag.querySelectorAll('.bag-item').forEach(r => {
      const subs = [];
      r.querySelectorAll('.sub-item').forEach(s => {
        subs.push({ name: s.querySelector('.s-name').value, qty: s.querySelector('.s-qty').value, desc: s.querySelector('.s-desc').value });
      });
      items.push({ num: r.querySelector('.i-num').value, name: r.querySelector('.i-name').value, desc: r.querySelector('.i-desc').value, qty: r.querySelector('.i-qty').value, weight: r.querySelector('.i-weight').value, subs });
    });
    data.bags.push({ name: bag.querySelector('.bag-name').value, items });
  });

  $$('.slot').forEach(slot => {
    const img = slot.querySelector('img');
    if (img && img.src && img.src.startsWith('data:')) data.slots[slot.dataset.slotId] = img.src;
  });

  $$('#faithThresholds .faith-row').forEach(r => {
    data.faith.push({ min: r.querySelector('.f-min').value, dice: r.querySelector('.f-dice').value });
  });

  return data;
}

function applyData(d) {
  if (!d) return;
  if (d.fields) $$('[data-key]').forEach(el => { if (d.fields[el.dataset.key] !== undefined) el.value = d.fields[el.dataset.key]; });
  if (d.skills) $$('[data-skill]').forEach(el => { if (d.skills[el.dataset.skill] !== undefined) el.value = d.skills[el.dataset.skill]; });

  if (d.photo) {
    const img = $('#photoImg'); img.src = d.photo; img.style.display = 'block';
    const ph = $('#photoBox .photo-ph'); if (ph) ph.style.display = 'none';
  }

  $('#globalBonusesList').innerHTML = '';
  (d.globalBonuses || []).forEach(text => $('#globalBonusesList').appendChild(createGlobalBonusRow(text)));

  $('#subclassList').innerHTML = '';
  (d.subclasses || []).forEach(sc => $('#subclassList').appendChild(createSubclass(sc)));

  const fill = (id, kind, items) => {
    $(`#${id}`).innerHTML = '';
    (items || []).forEach(it => $(`#${id}`).appendChild(createListCard(kind, it)));
  };
  fill('spellContainer', 'spell', d.spells); fill('effectList', 'effect', d.effects);
  fill('activeList', 'active', d.actives); fill('passiveList', 'passive', d.passives); fill('equipList', 'equip', d.equip);

  $('#bagContainer').innerHTML = '';
  (d.bags || []).forEach(b => $('#bagContainer').appendChild(createBag(b, updateTotalWeight, false)));

  if (d.slots) {
    Object.entries(d.slots).forEach(([slotId, src]) => {
      const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
      if (slot) {
        const img = slot.querySelector('img'); const ph = slot.querySelector('.ph');
        const clear = slot.querySelector('.slot-clear'); const buttons = slot.querySelector('.slot-buttons');
        img.src = src; img.style.display = 'block';
        if (ph) ph.style.display = 'none';
        clear.style.display = 'block'; if (buttons) buttons.style.display = 'flex';
      }
    });
  }

  renderFaithThresholds(d.faith); updateTotalWeight(); updateSharedTotalWeight(); recalcAll();
}

/* ============================================================
   СОХРАНЕНИЕ И ЭКСПОРТ/ИМПОРТ
   ============================================================ */
let saveTimer = null;
function autoSave() {
  if (isAppLoading) return; 
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await saveToDB(collectData()); } catch (e) { console.error(e); }
  }, 500);
}

async function saveNow() {
  if (isAppLoading) return;
  try { await saveToDB(collectData()); toast('💾 Сохранено'); } catch (e) { toast('⚠️ Ошибка'); }
}

async function loadFromStorage() {
  try {
    const data = await loadFromDB();
    if (data) applyData(data); 
  } catch (e) {
    console.warn("Данных нет:", e);
  } finally {
    setTimeout(() => { isAppLoading = false; }, 500);
  }
}

function exportJSON() {
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${(data.fields.name || 'character').replace(/\s+/g, '_')}.json`; a.click();
  URL.revokeObjectURL(url); toast('⬇ Экспортировано');
}

async function importJSON(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      isAppLoading = true;
      applyData(JSON.parse(e.target.result));
      await saveToDB(collectData());
      toast('⬆ Импортировано');
      setTimeout(() => { isAppLoading = false; }, 500);
    } catch (err) { isAppLoading = false; toast('✖ Ошибка файла'); }
  };
  reader.readAsText(file);
}

async function resetAll() {
  if (!confirm('Удалить все данные персонажа?')) return;
  try { if (db) db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).delete('character'); } catch(e) {}
  $$('[data-key], [data-skill]').forEach(el => el.value = '');
  ['globalBonusesList', 'subclassList','spellContainer','effectList','activeList','passiveList','bagContainer','equipList','faithThresholds'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  const img = $('#photoImg'); img.src = ''; img.style.display = 'none';
  const ph = $('#photoBox .photo-ph'); if (ph) ph.style.display = 'block';
  renderSlots(); renderFaithThresholds(); updateTotalWeight(); recalcAll(); toast('✖ Сброшено');
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  await initDB();
  renderSkills(); renderSlots(); renderFaithThresholds();
  await loadFromStorage();
  
  if (typeof window.startFirebaseSync === 'function') window.startFirebaseSync();

  document.addEventListener('input', () => { autoSave(); recalcAll(); });
  document.addEventListener('change', () => { autoSave(); recalcAll(); });

  setTimeout(() => {
    $$('.btn-toggle').forEach(btn => {
      const target = document.getElementById(btn.dataset.target);
      if (target) { target.classList.add('collapsed'); btn.textContent = '▸ Показать'; }
    });
  }, 100);

  $('#saveBtn').onclick   = saveNow;
  $('#exportBtn').onclick = exportJSON;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#resetBtn').onclick  = resetAll;
  $('#importFile').onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };

  $('#combatBtn').onclick = openCombat;
  $('#closeCombatBtn').onclick = () => $('#combatModal').classList.remove('open');
  $('#closeBreakdownBtn').onclick = () => $('#breakdownModal').classList.remove('open');

  $('#addGlobalBonusBtn').onclick = () => { $('#globalBonusesList').appendChild(createGlobalBonusRow()); autoSave(); };
  $('#addSubclassBtn').onclick = () => { $('#subclassList').appendChild(createSubclass()); autoSave(); };
  $('#addSpellBtn').onclick    = () => { $('#spellContainer').appendChild(createListCard('spell')); autoSave(); };
  $('#addEffectBtn').onclick   = () => { $('#effectList').appendChild(createListCard('effect')); autoSave(); };
  $('#addActiveBtn').onclick   = () => { $('#activeList').appendChild(createListCard('active')); autoSave(); };
  $('#addPassiveBtn').onclick  = () => { $('#passiveList').appendChild(createListCard('passive')); autoSave(); };
  
  $('#addBagBtn').onclick      = () => { $('#bagContainer').appendChild(createBag({}, updateTotalWeight, false)); autoSave(); };
  $('#addSharedBagBtn').onclick = () => { 
      const newBag = createBag({}, updateSharedTotalWeight, true); 
      $('#sharedBagContainer').appendChild(newBag); saveSharedToCloud(); 
  };

  $('#addEquipBtn').onclick    = () => { $('#equipList').appendChild(createListCard('equip')); autoSave(); };
  $('#addFaithBtn').onclick    = () => { $('#faithThresholds').appendChild(createFaithRow()); autoSave(); };

  initPhoto(); initBreakdownClicks(); initToggles(); initTabs();
  toast('☠ Лист персонажа загружен');
}

function initPhoto() {
  const box = $('#photoBox'); const img = $('#photoImg'); const ph = box.querySelector('.photo-ph');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none'; document.body.appendChild(fileInput);
  box.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { img.src = ev.target.result; img.style.display = 'block'; ph.style.display = 'none'; autoSave(); };
    reader.readAsDataURL(f);
  });
}

function initBreakdownClicks() {
  document.addEventListener('click', e => {
    const totalEl = e.target.closest('[data-total-btn]');
    if (totalEl) {
      const target = totalEl.dataset.totalBtn;
      const labels = { hp: 'Здоровье', defense: 'Защита', speed: 'Скорость' };
      showBreakdown(target, labels[target] || target); return;
    }
    const skillTotal = e.target.closest('[data-skill-total]');
    if (skillTotal) showBreakdown('skill_' + skillTotal.dataset.skillTotal, skillTotal.dataset.skillName);
  });
}

function initToggles() {
  $$('.btn-toggle').forEach(btn => {
    btn.onclick = () => {
      const target = document.getElementById(btn.dataset.target); if (!target) return;
      target.classList.toggle('collapsed');
      btn.textContent
