/* ============================================================
   ЛИСТ ПЕРСОНАЖА — логика
   Сохранение в localStorage + экспорт/импорт JSON
   ============================================================ */

const STORAGE_KEY = 'absolute_world_character';

/* ---- НАВЫКИ (структура) ---- */
const SKILLS = {
  mind: [
    { key: 'insight',     label: 'Проницательность' },
    { key: 'erudition',   label: 'Эрудиция' },
    { key: 'charm',       label: 'Обаяние' },
    { key: 'cunning',     label: 'Хитрость' },
    { key: 'concentration', label: 'Концентрация' }
  ],
  body: [
    { key: 'athletics',   label: 'Атлетика' },
    { key: 'endurance',   label: 'Стойкость' },
    { key: 'instincts',   label: 'Инстинкты' },
    { key: 'reflexes',    label: 'Рефлексы' },
    { key: 'rage',        label: 'Ярость' }
  ],
  harmony: [
    { key: 'acrobatics',  label: 'Акробатика' },
    { key: 'creation',    label: 'Созидание' },
    { key: 'dexterity',   label: 'Проворство' },
    { key: 'grace',       label: 'Грация' },
    { key: 'accuracy',    label: 'Точность' }
  ]
};

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   РЕНДЕР НАВЫКОВ
   ============================================================ */
function renderSkills() {
  Object.entries(SKILLS).forEach(([group, list]) => {
    const box = document.querySelector(`[data-group="${group}"]`);
    box.innerHTML = list.map(skill => `
      <div class="skill-row">
        <label>${skill.label}</label>
        <input type="number" step="1" data-skill="${skill.key}" placeholder="0">
      </div>
    `).join('');
  });
}

/* ============================================================
   ЗАКЛИНАНИЯ (динамические)
   ============================================================ */
function createSpell(data = {}) {
  const div = document.createElement('div');
  div.className = 'spell';
  div.innerHTML = `
    <select class="spell-circle">
      <option value="1">1 круг</option>
      <option value="2">2 круг</option>
      <option value="3">3 круг</option>
      <option value="4">4 круг</option>
      <option value="5">5 круг</option>
    </select>
    <textarea class="spell-desc" placeholder="Описание заклинания..."></textarea>
    <button class="spell-del" title="Удалить">✖</button>
  `;
  div.querySelector('.spell-circle').value = data.circle || '1';
  div.querySelector('.spell-desc').value = data.desc || '';
  div.querySelector('.spell-del').onclick = () => {
    div.remove();
    autoSave();
  };
  div.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', autoSave);
  });
  return div;
}

function addSpell(data) {
  $('#spellContainer').appendChild(createSpell(data));
}

/* ============================================================
   ИНВЕНТАРЬ (динамический)
   ============================================================ */
function createInvRow(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" data-inv="num"  placeholder="1" value="${data.num || ''}"></td>
    <td><input type="text"   data-inv="name" placeholder="Предмет" value="${data.name || ''}"></td>
    <td><input type="text"   data-inv="desc" placeholder="Описание" value="${data.desc || ''}"></td>
    <td><input type="number" data-inv="qty"  placeholder="1" value="${data.qty || ''}"></td>
    <td><input type="number" step="0.1" data-inv="weight" placeholder="0" value="${data.weight || ''}"></td>
    <td><button class="inv-del" title="Удалить">✖</button></td>
  `;
  tr.querySelector('.inv-del').onclick = () => {
    tr.remove();
    autoSave();
  };
  tr.querySelectorAll('input').forEach(el => el.addEventListener('input', autoSave));
  return tr;
}

function addInvRow(data) {
  $('#invBody').appendChild(createInvRow(data));
}

/* ============================================================
   СБОР ДАННЫХ
   ============================================================ */
function collectData() {
  const data = { fields: {}, skills: {}, spells: [], inventory: [] };

  // обычные поля
  $$('[data-key]').forEach(el => {
    data.fields[el.dataset.key] = el.value;
  });

  // навыки
  $$('[data-skill]').forEach(el => {
    data.skills[el.dataset.skill] = el.value;
  });

  // заклинания
  $$('#spellContainer .spell').forEach(sp => {
    data.spells.push({
      circle: sp.querySelector('.spell-circle').value,
      desc:   sp.querySelector('.spell-desc').value
    });
  });

  // инвентарь
  $$('#invBody tr').forEach(tr => {
    data.inventory.push({
      num:    tr.querySelector('[data-inv="num"]').value,
      name:   tr.querySelector('[data-inv="name"]').value,
      desc:   tr.querySelector('[data-inv="desc"]').value,
      qty:    tr.querySelector('[data-inv="qty"]').value,
      weight: tr.querySelector('[data-inv="weight"]').value
    });
  });

  return data;
}

/* ============================================================
   ЗАГРУЗКА ДАННЫХ
   ============================================================ */
function applyData(data) {
  if (!data) return;

  // обычные поля
  if (data.fields) {
    $$('[data-key]').forEach(el => {
      if (data.fields[el.dataset.key] !== undefined) {
        el.value = data.fields[el.dataset.key];
      }
    });
  }

  // навыки
  if (data.skills) {
    $$('[data-skill]').forEach(el => {
      if (data.skills[el.dataset.skill] !== undefined) {
        el.value = data.skills[el.dataset.skill];
      }
    });
  }

  // заклинания
  $('#spellContainer').innerHTML = '';
  (data.spells || []).forEach(addSpell);

  // инвентарь
  $('#invBody').innerHTML = '';
  (data.inventory || []).forEach(addInvRow);
}

/* ============================================================
   СОХРАНЕНИЕ / ЗАГРУЗКА
   ============================================================ */
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
  if (raw) {
    try { applyData(JSON.parse(raw)); }
    catch (e) { console.warn('Ошибка чтения сохранения', e); }
  }
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
    } catch (err) {
      toast('✖ Ошибка файла');
    }
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
  $('#spellContainer').innerHTML = '';
  $('#invBody').innerHTML = '';
  toast('✖ Сброшено');
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  renderSkills();
  loadFromStorage();

  // автосохранение при вводе
  document.addEventListener('input', autoSave);

  // кнопки
  $('#saveBtn').onclick   = saveNow;
  $('#exportBtn').onclick = exportJSON;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#resetBtn').onclick  = resetAll;
  $('#importFile').onchange = e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  };

  // добавление
  $('#addSpellBtn').onclick = () => { addSpell(); autoSave(); };
  $('#addItemBtn').onclick  = () => { addInvRow(); autoSave(); };

  toast('☠ Лист персонажа загружен');
}

document.addEventListener('DOMContentLoaded', init);
