/**
 * editors/products.js — Catalog sản phẩm (src/data/shop-products.yml)
 * Gộp 2 mảng products + productsAfterCta thành 1 danh sách động (thêm/xoá/
 * sắp xếp). Mỗi SP chọn "Vị trí" trước/sau banner → tách lại khi lưu.
 * SP mới tự sinh id duy nhất (p-<slug>) vì route /san-pham/[id] phụ thuộc id.
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfSelect, bindDirty, slugify, uniqueSlug } from '../lib/repeatable.js';

const FILE = 'src/data/shop-products.yml';
const BODY = 'editor-products-body';
const FOOTER = 'editor-products-footer';

const yaml = () => window.jsyaml;
function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

const CAT_OPTS = [
  { value: 'sofa', label: 'Sofa' }, { value: 'ban', label: 'Bàn' },
  { value: 'ghe', label: 'Ghế' }, { value: 'giuong', label: 'Giường' },
  { value: 'tu', label: 'Tủ' }, { value: 'ke', label: 'Kệ' },
  { value: 'den', label: 'Đèn' }, { value: 'tham', label: 'Thảm' },
];
const ROOM_OPTS = [
  { value: 'phong-khach', label: 'Phòng khách' }, { value: 'phong-ngu', label: 'Phòng ngủ' },
  { value: 'phong-an', label: 'Phòng ăn & bếp' }, { value: 'lam-viec', label: 'Phòng làm việc' },
  { value: 'tre-em', label: 'Phòng trẻ em' },
];
const STATUS_OPTS = [
  { value: 'in-stock', label: 'Còn hàng' }, { value: 'sale', label: 'Giảm giá' },
  { value: 'new', label: 'Hàng mới' }, { value: 'bestseller', label: 'Bestseller' },
  { value: 'het-hang', label: 'Hết hàng' },
];
const STATUS_KEYS = STATUS_OPTS.map((s) => s.value);
const POS_OPTS = [
  { value: 'before', label: 'Trước banner' },
  { value: 'after', label: 'Sau banner' },
];

function statusOf(tags) {
  return STATUS_OPTS.find((s) => (tags || []).includes(s.value))?.value ?? 'in-stock';
}

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try { ({ yamlString: data, sha } = await getFile(token, FILE)); }
  catch (e) { body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`; return; }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) { body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`; return; }

  const before = (obj.products || []).map((p) => ({ ...p, __pos: 'before' }));
  const after = (obj.productsAfterCta || []).map((p) => ({ ...p, __pos: 'after' }));
  const merged = [...before, ...after];

  body.innerHTML = `
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">Catalog sản phẩm</p>
      <p class="form-hint" style="margin-bottom:14px;">
        Thêm/xoá/sắp xếp sản phẩm. SP mới tự có trang chi tiết <code>/san-pham/&lt;mã&gt;</code>.
        Ảnh, bộ lọc màu/vật liệu chi tiết → dùng <a href="/admin/cms/" target="_blank">Sveltia CMS</a>.
      </p>
      <div id="products-list"></div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật catalog sản phẩm — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-products" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-products">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-products');
  const dirty = bindDirty({ scope: body, saveBtn });

  const rep = repeatable({
    mount: body.querySelector('#products-list'),
    items: merged,
    min: 1,
    addLabel: '＋ Thêm sản phẩm',
    title: (p, i) => `${i + 1}. ${[p.name, p.nameEm, p.nameTail].filter(Boolean).join(' ').trim() || 'Sản phẩm mới'}`,
    onChange: dirty.mark,
    makeNew: () => ({ name: 'Sản phẩm mới', nameEm: '', nameTail: '', cat: '', catKey: 'sofa', room: 'phong-khach', price: '', priceNum: 0, rating: '5.0', ratingNum: 5, reviews: 0, tags: ['in-stock'], __pos: 'before' }),
    renderFields: (p) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên chính', p.name)}
        ${rfText('nameEm', 'Tên nhấn (in nghiêng)', p.nameEm ?? '')}
      </div>
      <div class="form-grid-2">
        ${rfText('nameTail', 'Đuôi tên', p.nameTail ?? '')}
        ${rfText('cat', 'Mô tả ngắn (cat)', p.cat ?? '', { placeholder: 'VD: Sofa · 3 chỗ · gỗ sồi' })}
      </div>
      <div class="form-grid-2">
        ${rfSelect('catKey', 'Danh mục', p.catKey ?? 'sofa', CAT_OPTS)}
        ${rfSelect('room', 'Phòng', p.room ?? 'phong-khach', ROOM_OPTS)}
      </div>
      <div class="form-grid-2">
        ${rfText('priceOld', 'Giá cũ (gạch)', p.priceOld ?? '', { placeholder: '—' })}
        ${rfText('price', 'Giá hiển thị', p.price ?? '', { placeholder: 'VD: 6.900.000đ' })}
      </div>
      <div class="form-grid-2">
        ${rfText('priceNum', 'Giá số (để sắp xếp/SEO)', p.priceNum ?? 0, { hint: 'Chỉ số, VD: 6900000' })}
        ${rfText('badge', 'Badge (tuỳ chọn)', p.badges?.[0]?.label ?? '', { placeholder: 'VD: −25%' })}
      </div>
      <div class="form-grid-2">
        ${rfSelect('status', 'Trạng thái', statusOf(p.tags), STATUS_OPTS)}
        ${rfSelect('__pos', 'Vị trí trong trang', p.__pos ?? 'before', POS_OPTS)}
      </div>`,
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);

      // Thu thập + chuẩn hoá; sinh id duy nhất cho SP mới.
      const taken = [];
      const collected = rep.collect((f, orig) => {
        let id = orig.id;
        if (!id) {
          const base = 'p-' + (slugify([f.name, f.nameEm, f.nameTail].join(' ')) || 'san-pham');
          id = uniqueSlug(base, taken);
        }
        taken.push(id);

        const status = f.status;
        const otherTags = (orig.tags || []).filter((t) => !STATUS_KEYS.includes(t));
        const tags = [...otherTags, status];

        const badgeLabel = f.badge.trim();
        const firstCls = orig.badges?.[0]?.cls ?? 'accent';
        const badges = badgeLabel
          ? [{ label: badgeLabel, cls: firstCls }, ...(orig.badges?.slice(1) ?? [])]
          : (orig.badges?.slice(1) ?? []);

        const slug = String(id).replace(/^p-/, '');
        const href = orig.href && orig.id === id ? orig.href : `/san-pham/${slug}/`;

        const out = {
          ...orig,
          id,
          href,
          name: f.name.trim(),
          nameEm: f.nameEm.trim() || undefined,
          nameTail: f.nameTail || undefined,
          cat: f.cat.trim(),
          catKey: f.catKey,
          room: f.room,
          priceOld: f.priceOld.trim() || undefined,
          price: f.price.trim(),
          priceNum: Number(String(f.priceNum).replace(/[^\d]/g, '')) || 0,
          tags,
          badges: badges.length ? badges : undefined,
          __pos: f.__pos,
        };
        return out;
      });

      // Tách lại 2 mảng theo vị trí, giữ thứ tự.
      const stripPos = (p) => { const { __pos, ...rest } = p; return rest; };
      obj.products = collected.filter((p) => p.__pos !== 'after').map(stripPos);
      obj.productsAfterCta = collected.filter((p) => p.__pos === 'after').map(stripPos);

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-products').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Catalog sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      dirty.reset();
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'File đã được cập nhật bởi người khác. Tải lại trang và thử lại.'
        : `Không thể lưu: ${e.message}`;
      showToast(`❌ ${msg}`, 'error');
      saveBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });
}
