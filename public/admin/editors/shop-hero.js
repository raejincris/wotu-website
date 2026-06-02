/**
 * editors/shop-hero.js — Shop trang chủ (src/data/shop-home.yml)
 * Fields: hero (pill/eyebrow/title/sub/cta/stats/sticker)
 *         sections headings (combos/bestsellers/inspo/whyUs/reviews/cta)
 *         whyUs items (4 cam kết: title + desc)
 */

import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, rfSelect, bindDirty } from '../lib/repeatable.js';
import { imageSlot, attachAllImages, uploadPendingImages } from '../lib/imagefield.js';
import { connectBody } from '../lib/preview-bus.js';

const FILE = 'src/data/shop-home.yml';
const BODY = 'editor-shop-hero-body';
const FOOTER = 'editor-shop-hero-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function field(id, label, value, type = 'text', hint = '', cmsKey = '') {
  const isTextarea = type === 'textarea';
  const cms = cmsKey ? ` data-cms-key="${escVal(cmsKey)}"` : '';
  const ctrl = isTextarea
    ? `<textarea class="form-input form-textarea" id="${id}"${cms} rows="3"
                 autocomplete="off">${String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>`
    : `<input class="form-input" id="${id}" type="text"${cms} value="${escVal(value)}" autocomplete="off" />`;
  return `<div class="form-row">
    <label class="form-label" for="${id}">${label}</label>
    ${ctrl}
    ${hint ? `<p class="form-hint">${hint}</p>` : ''}
  </div>`;
}

function sectionFields(prefix, s, showDesc = true, extraFields = '') {
  return `
    ${field(`${prefix}_eyebrow`, 'Eyebrow', s?.eyebrow)}
    ${field(`${prefix}_heading`, 'Tiêu đề', s?.heading, 'text', 'Dùng &lt;em&gt; để in nghiêng')}
    ${showDesc ? field(`${prefix}_desc`, 'Mô tả', s?.desc, 'textarea') : ''}
    ${extraFields}`;
}

export async function init({ token, showToast, setLoading }) {
  const body   = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try { ({ yamlString: data, sha } = await getFile(token, FILE)); }
  catch (e) {
    body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`;
    return;
  }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) {
    body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`;
    return;
  }

  const h = obj.hero || {};
  const sc = obj.sections || {};
  const stats = h.stats || [{}, {}, {}];
  const whyItems = sc.whyUs?.items || [{}, {}, {}, {}];

  body.innerHTML = `
    <!-- ── HERO ── -->
    <div class="form-card">
      <p class="form-card-title">Hero — phần đầu trang Shop</p>
      ${field('hero_pill',   'Badge ưu đãi (pill)',  h.pill,   'text', 'VD: Ưu đãi tháng 5 · giảm đến 35%', 'hero.pill')}
      ${field('hero_eyebrow','Eyebrow',              h.eyebrow,'text', 'VD: Bộ sưu tập 2026', 'hero.eyebrow')}
      ${field('hero_title',  'Tiêu đề h1',           h.title,  'text', 'Dùng &lt;em&gt; / &lt;span class="stroke"&gt; để định dạng', 'hero.title')}
      ${field('hero_sub',    'Mô tả ngắn',           h.sub,    'textarea', '', 'hero.sub')}
      ${field('hero_cta1',   'Nút chính (CTA 1)',    h.cta1,   'text', '', 'hero.cta1')}
      ${field('hero_cta2',   'Nút phụ (CTA 2)',      h.cta2,   'text', '', 'hero.cta2')}
      <div class="form-row">
        <label class="form-label">Số liệu thống kê (3 ô)</label>
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 8px 12px; align-items: center;">
          ${stats.map((s, i) => `
            <input class="form-input" id="stat${i}_num"   value="${escVal(s.num)}"   placeholder="12+" />
            <input class="form-input" id="stat${i}_label" value="${escVal(s.label)}" placeholder="Năm kinh nghiệm" />
          `).join('')}
        </div>
        <p class="form-hint">Trái: số · Phải: nhãn. Dùng ★ cho sao (VD: 5★)</p>
      </div>
      ${field('hero_sticker',    'Sticker số',  h.sticker,    'text', 'VD: −35%')}
      ${field('hero_stickerSub', 'Sticker chú', h.stickerSub, 'text', 'VD: combo tháng 5')}
      ${imageSlot('hero_photo', h.photo ?? '', 'Ảnh combo lớn (ghi đè minh hoạ line-art)')}
      ${field('hero_photoAlt',    'Mô tả ảnh (alt)',     h.photoAlt,    'text', 'Cho SEO & trình đọc màn hình')}
      ${field('hero_tagLabel',    'Thẻ giá — Tên combo', h.tagLabel,    'text', 'VD: Combo Phòng khách · Tổ Ấm')}
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px 12px;">
        ${field('hero_tagPriceOld', 'Giá gốc (gạch)',  h.tagPriceOld, 'text', 'VD: 28.900.000đ')}
        ${field('hero_tagPriceNew', 'Giá khuyến mãi',  h.tagPriceNew, 'text', 'VD: 18.900.000đ')}
      </div>
      ${field('hero_tagHref',     'Link khi bấm thẻ',    h.tagHref,     'text', 'VD: /combo/to-am/')}
    </div>

    <!-- ── SECTION HEADINGS ── -->
    <div class="form-card">
      <p class="form-card-title">Section: Combo nội thất</p>
      ${sectionFields('sec_combos', sc.combos, true,
        field('sec_combos_ctaAll', 'Nút "Xem tất cả"', sc.combos?.ctaAll))}
    </div>
    <div class="form-card">
      <p class="form-card-title">Section: Sản phẩm bán chạy</p>
      ${sectionFields('sec_bestsellers', sc.bestsellers)}
    </div>
    <div class="form-card">
      <p class="form-card-title">Section: Phòng cảm hứng</p>
      ${sectionFields('sec_inspo', sc.inspo)}
    </div>
    <div class="form-card">
      <p class="form-card-title">Section: Cam kết (Why Us)</p>
      ${sectionFields('sec_why', sc.whyUs)}
      <div class="form-row">
        <label class="form-label">4 cam kết</label>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
          ${whyItems.map((it, i) => `
            <div style="border:1px solid var(--line); border-radius:8px; padding:14px 14px 10px; background:var(--bone);">
              <p class="form-hint" style="margin:0 0 8px; font-weight:700; color:var(--ink-soft);">Cam kết ${i + 1}</p>
              ${field(`why${i}_title`, 'Tiêu đề', it.title)}
              ${field(`why${i}_desc`,  'Mô tả',   it.desc, 'textarea')}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="form-card">
      <p class="form-card-title">Section: Đánh giá khách hàng</p>
      ${sectionFields('sec_reviews', sc.reviews)}
    </div>
    <div class="form-card">
      <p class="form-card-title">Section: CTA liên hệ</p>
      ${sectionFields('sec_cta', sc.cta)}
    </div>

    <!-- ── INSPO ── -->
    <div class="form-card">
      <p class="form-card-title">Ảnh cảm hứng (lưới "Phòng cảm hứng")</p>
      <div id="shop-inspo"></div>
    </div>

    <!-- ── REVIEWS ── -->
    <div class="form-card">
      <p class="form-card-title">Đánh giá khách hàng (trang chủ shop)</p>
      <div id="shop-reviews"></div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật shop homepage copy — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-shop-hero" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-shop-hero">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-shop-hero');
  const dirty = bindDirty({ scope: body, saveBtn });

  // Ô ảnh hero (tĩnh trong body) — wire hành vi chọn/xoá ảnh.
  attachAllImages(body, dirty.mark);

  // Xem trước trực tiếp: field có data-cms-key sẽ patch vào iframe khi gõ.
  connectBody(body);

  const repInspo = repeatable({
    mount: body.querySelector('#shop-inspo'),
    items: obj.inspo || [],
    min: 0,
    addLabel: '＋ Thêm ô cảm hứng',
    title: (it, i) => `${i + 1}. ${it.label || 'Ô ảnh'}`,
    onChange: dirty.mark,
    makeNew: () => ({ label: '', href: '/san-pham/', tall: false }),
    renderFields: (it) => `
      ${rfText('label', 'Nhãn ảnh', it.label)}
      <div class="form-grid-2">
        ${rfText('href', 'Đường dẫn khi click', it.href ?? '/san-pham/')}
        ${rfSelect('tall', 'Kích thước ô', it.tall ? 'yes' : 'no', [{ value: 'no', label: 'Thường' }, { value: 'yes', label: 'Ô cao (nổi bật)' }])}
      </div>`,
  });

  const repReviews = repeatable({
    mount: body.querySelector('#shop-reviews'),
    items: obj.reviews || [],
    min: 0,
    addLabel: '＋ Thêm đánh giá',
    title: (r, i) => `${i + 1}. ${r.name || 'Khách'}`,
    onChange: dirty.mark,
    makeNew: () => ({ name: '', role: '', initial: '', quote: '' }),
    renderFields: (r) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên khách', r.name)}
        ${rfText('initial', 'Chữ cái đầu (avatar)', r.initial ?? '')}
      </div>
      ${rfText('role', 'Địa điểm', r.role ?? '', { placeholder: 'VD: Nhơn Bình · Quy Nhơn' })}
      ${rfArea('quote', 'Nội dung', r.quote ?? '')}`,
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const msgUp = footer.querySelector('#commit-msg-shop-hero').value.trim() || defaultMsg;
      await uploadPendingImages({ token, scope: body, area: 'hero', msg: msgUp, onStatus: (s) => showToast(s, 'info', 2500) });

      const { sha: freshSha } = await getFile(token, FILE);

      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      // Hero
      obj.hero = obj.hero || {};
      obj.hero.pill       = g('hero_pill');
      obj.hero.eyebrow    = g('hero_eyebrow');
      obj.hero.title      = g('hero_title');
      obj.hero.sub        = g('hero_sub');
      obj.hero.cta1       = g('hero_cta1');
      obj.hero.cta2       = g('hero_cta2');
      obj.hero.sticker    = g('hero_sticker');
      obj.hero.stickerSub = g('hero_stickerSub');
      // imageSlot tạo input ẩn có data-field nhưng không có id → query trực tiếp.
      obj.hero.photo       = body.querySelector('.img-slot input[data-photo]')?.value.trim() || '';
      obj.hero.photoAlt    = g('hero_photoAlt');
      obj.hero.tagLabel    = g('hero_tagLabel');
      obj.hero.tagPriceOld = g('hero_tagPriceOld');
      obj.hero.tagPriceNew = g('hero_tagPriceNew');
      obj.hero.tagHref     = g('hero_tagHref');
      obj.hero.stats = (obj.hero.stats || [{},{},{}]).map((_s, i) => ({
        num:   g(`stat${i}_num`),
        label: g(`stat${i}_label`),
      }));

      // Sections
      obj.sections = obj.sections || {};
      const setSection = (key, prefix, extra = {}) => {
        obj.sections[key] = {
          ...(obj.sections[key] || {}),
          eyebrow: g(`${prefix}_eyebrow`),
          heading: g(`${prefix}_heading`),
          desc:    g(`${prefix}_desc`),
          ...extra,
        };
      };
      setSection('combos',      'sec_combos',      { ctaAll: g('sec_combos_ctaAll') });
      setSection('bestsellers', 'sec_bestsellers');
      setSection('inspo',       'sec_inspo');
      setSection('whyUs',       'sec_why', {
        items: (obj.sections.whyUs?.items || [{},{},{},{}]).map((it, i) => ({
          icon:  it.icon || 'shield',
          title: g(`why${i}_title`),
          desc:  g(`why${i}_desc`),
        })),
      });
      setSection('reviews', 'sec_reviews');
      setSection('cta',     'sec_cta');

      // Ảnh cảm hứng (inspo)
      obj.inspo = repInspo.collect((f, orig) => {
        const o = { ...orig, label: f.label.trim(), href: f.href.trim() || '/san-pham/' };
        if (f.tall === 'yes') o.tall = true; else delete o.tall;
        return o;
      });

      // Reviews trang chủ
      obj.reviews = repReviews.collect((f, orig) => ({
        ...orig,
        name: f.name.trim(),
        initial: f.initial.trim() || undefined,
        role: f.role.trim(),
        quote: f.quote.trim(),
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-shop-hero').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
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
