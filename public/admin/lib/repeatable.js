/**
 * lib/repeatable.js — danh sách row động cho Custom Admin (thêm/xoá/sắp xếp).
 *
 * Triết lý: KHÔNG dùng id cố định theo index (p0_name…) — thay vào đó mỗi field
 * mang `data-field="key"`, và `collect()` đọc lại mảng THEO THỨ TỰ DOM lúc save.
 * Nhờ vậy add/remove/reorder không bao giờ lệch index.
 *
 * Cách dùng trong editor:
 *   const rep = repeatable({
 *     mount: someDiv,
 *     items: arr,
 *     min: 1,
 *     addLabel: '＋ Thêm sản phẩm',
 *     title: (item, i) => `Sản phẩm ${i + 1}`,
 *     renderFields: (item) => rfText('name', 'Tên', item.name) + rfArea('desc','Mô tả',item.desc),
 *     makeNew: () => ({ name: '', desc: '' }),
 *     onChange: markDirty,
 *   });
 *   // lúc save:
 *   obj.products = rep.collect((fields, orig) => ({ ...orig, ...fields }));
 */

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Field builders — đều gắn data-field để collect() đọc lại. */
export function rfText(field, label, value, opts = {}) {
  const { hint = '', placeholder = '', cmsKey = '' } = opts;
  const cms = cmsKey ? ` data-cms-key="${escVal(cmsKey)}"` : '';
  return `
    <div class="form-row">
      <label class="form-label">${label}</label>
      <input class="form-input" type="text" data-field="${field}"${cms}
             value="${escVal(value)}" placeholder="${escVal(placeholder)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
export function rfArea(field, label, value, opts = {}) {
  const { hint = '', rows = 3, cmsKey = '' } = opts;
  const cms = cmsKey ? ` data-cms-key="${escVal(cmsKey)}"` : '';
  return `
    <div class="form-row">
      <label class="form-label">${label}</label>
      <textarea class="form-input form-textarea" data-field="${field}"${cms} rows="${rows}" autocomplete="off">${escTxt(value)}</textarea>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
export function rfSelect(field, label, value, options, opts = {}) {
  const { hint = '' } = opts;
  const cur = String(value ?? '');
  return `
    <div class="form-row">
      <label class="form-label">${label}</label>
      <select class="form-input" data-field="${field}">
        ${options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          return `<option value="${escVal(val)}"${String(val) === cur ? ' selected' : ''}>${escTxt(lab)}</option>`;
        }).join('')}
      </select>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function uniqueSlug(base, taken) {
  let s = base || 'muc';
  if (!taken.includes(s)) return s;
  let n = 2;
  while (taken.includes(`${s}-${n}`)) n++;
  return `${s}-${n}`;
}

/**
 * repeatable — render danh sách động vào `mount`.
 * @returns {{ collect, getInputs, count, list }}
 */
export function repeatable({
  mount, items = [], renderFields, makeNew, title,
  min = 0, addLabel = '＋ Thêm mục', reorder = true, onChange, onRow,
}) {
  const original = new Map(); // rowId -> object gốc (giữ key không hiển thị)
  let seq = 0;

  const list = document.createElement('div');
  list.className = 'repeat-list';

  function renumber() {
    if (!title) return;
    [...list.querySelectorAll(':scope > .repeat-row')].forEach((row, i) => {
      const t = row.querySelector('.repeat-title');
      if (t) t.textContent = title(original.get(row.dataset.rowId) ?? {}, i);
    });
  }

  function makeRow(item, index) {
    const id = `rr${++seq}`;
    original.set(id, item ?? {});
    const row = document.createElement('div');
    row.className = 'repeat-row';
    row.dataset.rowId = id;
    row.innerHTML = `
      <div class="repeat-head">
        ${title ? `<span class="repeat-title">${escTxt(title(item ?? {}, index))}</span>` : '<span></span>'}
        <span class="repeat-ctrls">
          ${reorder ? `<button type="button" class="repeat-btn" data-act="up" title="Lên" aria-label="Lên">↑</button>
          <button type="button" class="repeat-btn" data-act="down" title="Xuống" aria-label="Xuống">↓</button>` : ''}
          <button type="button" class="repeat-btn repeat-del" data-act="del" title="Xoá" aria-label="Xoá">🗑</button>
        </span>
      </div>
      <div class="repeat-fields">${renderFields(item ?? {})}</div>`;
    return row;
  }

  (items || []).forEach((it, i) => {
    const row = makeRow(it, i);
    list.appendChild(row);
    onRow?.(row, it ?? {});
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-ghost btn-sm repeat-add';
  addBtn.textContent = addLabel;

  mount.appendChild(list);
  mount.appendChild(addBtn);

  addBtn.addEventListener('click', () => {
    const n = list.querySelectorAll(':scope > .repeat-row').length;
    const item = makeNew ? makeNew() : {};
    const row = makeRow(item, n);
    list.appendChild(row);
    onRow?.(row, item);
    renumber();
    onChange?.();
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.repeat-btn');
    if (!btn) return;
    const row = btn.closest('.repeat-row');
    if (row.parentElement !== list) return; // bỏ qua click của repeatable lồng — nested list tự xử lý
    const act = btn.dataset.act;
    if (act === 'del') {
      if (list.querySelectorAll(':scope > .repeat-row').length <= min) return;
      original.delete(row.dataset.rowId);
      row.remove();
    } else if (act === 'up' && row.previousElementSibling) {
      list.insertBefore(row, row.previousElementSibling);
    } else if (act === 'down' && row.nextElementSibling) {
      list.insertBefore(row.nextElementSibling, row);
    }
    renumber();
    onChange?.();
  });

  return {
    list,
    count: () => list.querySelectorAll(':scope > .repeat-row').length,
    getInputs: () => list.querySelectorAll('.repeat-fields input, .repeat-fields textarea, .repeat-fields select'),
    collect(build) {
      return [...list.querySelectorAll(':scope > .repeat-row')].map((row) => {
        const orig = original.get(row.dataset.rowId) ?? {};
        const fields = {};
        row.querySelectorAll('[data-field]').forEach((el) => {
          if (el.closest('.repeat-row') !== row) return; // bỏ qua field của row lồng (tránh ghi đè field cha)
          fields[el.dataset.field] = el.value;
        });
        return build ? build(fields, orig) : { ...orig, ...fields };
      });
    },
  };
}

/**
 * bindDirty — quản lý dirty cho editor có danh sách động.
 * Dùng cờ "đã thay đổi kể từ load/save" thay vì so từng input (số input đổi động).
 */
export function bindDirty({ scope, saveBtn }) {
  let dirty = false;
  const set = (v) => {
    dirty = v;
    saveBtn.disabled = !v;
    window.__adminSetDirty?.(v);
  };
  scope.addEventListener('input', () => set(true));
  scope.addEventListener('change', () => set(true));
  set(false);
  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };
  return { mark: () => set(true), reset: () => set(false) };
}
