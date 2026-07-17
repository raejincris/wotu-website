/**
 * editors/tuyen-dung.js — Trang tuyển dụng (src/data/tuyen-dung.yml)
 * Sửa: hero · vị trí đang tuyển · vì sao làm ở WOTU · quyền lợi (điền số thật ở đây)
 *      · FAQ · nhãn form. Số lượng mục cố định (thêm/xoá vị trí để phase sau — nếu cần
 *      thêm vị trí mới, báo dev thêm 1 mục vào YAML). Lưu = nháp; "Đăng lên web" mới commit.
 */
import { getFile, putFile } from '../github.js';

const FILE = 'src/data/tuyen-dung.yml';
const BODY = 'editor-tuyen-dung-body';
const FOOTER = 'editor-tuyen-dung-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function field(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="text" value="${escVal(value)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
function textarea(id, label, value, rows = 3, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <textarea class="form-input form-textarea" id="${id}" rows="${rows}" autocomplete="off">${escTxt(value)}</textarea>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
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

  const hero = obj.hero || {};
  const positions = obj.positions || [];
  const culture = obj.culture || [];
  const benefits = obj.benefits || [];
  const faq = obj.faq || [];

  body.innerHTML = `
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">Trang tuyển dụng — <code>/tuyen-dung/</code></p>
      <p class="form-hint">Sửa nội dung tin tuyển dụng. Phần <strong>Quyền lợi</strong> là nơi điền mức lương/thưởng/chế độ thật (đang là chỗ trống chờ điền).</p>
    </div>

    <div class="form-card">
      <p class="form-card-title">SEO</p>
      ${field('meta_title', 'Tiêu đề trang (title)', obj.title)}
      ${textarea('meta_desc', 'Mô tả (meta description)', obj.description, 3, '≤ 160 ký tự lý tưởng.')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Phần mở đầu (Hero)</p>
      ${field('hero_eyebrow', 'Nhãn nhỏ (eyebrow)', hero.eyebrow)}
      ${field('hero_heading', 'Tiêu đề lớn', hero.heading, 'Dùng &lt;em&gt;…&lt;/em&gt; cho chữ in nghiêng nhấn mạnh.')}
      ${textarea('hero_intro', 'Đoạn giới thiệu', hero.intro, 4)}
    </div>

    <div class="form-card">
      <p class="form-card-title">Vị trí đang tuyển</p>
      ${field('positionsHeading', 'Tiêu đề khối', obj.positionsHeading, 'Dùng &lt;em&gt;…&lt;/em&gt; cho chữ nghiêng.')}
      ${positions.map((p, i) => `
        <div class="form-card" style="background:var(--bg-soft,#f7f4ee);">
          <p class="form-card-title">Vị trí ${i + 1}</p>
          ${field(`pos${i}_title`, 'Tên vị trí', p.title)}
          ${textarea(`pos${i}_summary`, 'Mô tả ngắn', p.summary, 2)}
          <p class="form-hint" style="margin-bottom:4px;">Yêu cầu:</p>
          ${(p.requirements || []).map((r, j) => field(`pos${i}_req${j}`, `Yêu cầu ${j + 1}`, r)).join('')}
        </div>`).join('')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Vì sao làm việc ở WOTU</p>
      ${field('cultureHeading', 'Tiêu đề khối', obj.cultureHeading)}
      ${culture.map((c, i) => `
        <div style="display:grid; grid-template-columns:70px 1fr; gap:8px; align-items:start;">
          ${field(`cul${i}_icon`, 'Icon', c.icon, '1 emoji')}
          <div>
            ${field(`cul${i}_heading`, `Mục ${i + 1} — tiêu đề`, c.heading)}
            ${textarea(`cul${i}_text`, 'Mô tả', c.text, 2)}
          </div>
        </div>`).join('')}
    </div>

    <div class="form-card" style="border:2px solid var(--accent,#BD6B4C);">
      <p class="form-card-title">Quyền lợi — ⚠️ điền số thật vào đây</p>
      <p class="form-hint">Mỗi dòng là một quyền lợi. Thay chỗ <code>[anh cập nhật…]</code> bằng con số / chế độ thật của công ty.</p>
      ${field('benefitsHeading', 'Tiêu đề khối', obj.benefitsHeading)}
      ${field('benefitsNote', 'Ghi chú nhỏ dưới tiêu đề', obj.benefitsNote)}
      ${benefits.map((b, i) => textarea(`ben${i}`, `Quyền lợi ${i + 1}`, b, 2)).join('')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Câu hỏi thường gặp (FAQ)</p>
      ${field('faqHeading', 'Tiêu đề khối', obj.faqHeading)}
      ${faq.map((f, i) => `
        ${field(`faq${i}_q`, `Câu hỏi ${i + 1}`, f.q)}
        ${textarea(`faq${i}_a`, 'Trả lời', f.a, 3)}`).join('')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Form ứng tuyển</p>
      ${field('formHeading', 'Tiêu đề form', obj.formHeading)}
      ${textarea('formIntro', 'Câu dẫn trên form', obj.formIntro, 2)}
      ${field('formSuccess', 'Thông báo khi gửi thành công', obj.formSuccess)}
      ${field('positionOther', 'Nhãn "vị trí khác" trong ô chọn', obj.positionOther)}
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật trang tuyển dụng — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-tuyen-dung" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-tuyen-dung">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-tuyen-dung');
  const origValues = new Map();
  inputs.forEach((i) => origValues.set(i, i.value));

  function checkDirty() {
    const dirty = [...inputs].some((i) => i.value !== origValues.get(i));
    saveBtn.disabled = !dirty;
    window.__adminSetDirty?.(dirty);
  }
  inputs.forEach((i) => i.addEventListener('input', checkDirty));
  checkDirty();
  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);
      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      obj.title = g('meta_title');
      obj.description = g('meta_desc');
      obj.hero = { ...hero, eyebrow: g('hero_eyebrow'), heading: g('hero_heading'), intro: g('hero_intro') };
      obj.positionsHeading = g('positionsHeading');
      obj.positions = positions.map((p, i) => ({
        ...p,
        title: g(`pos${i}_title`),
        summary: g(`pos${i}_summary`),
        requirements: (p.requirements || []).map((_, j) => g(`pos${i}_req${j}`)),
      }));
      obj.cultureHeading = g('cultureHeading');
      obj.culture = culture.map((c, i) => ({
        ...c,
        icon: g(`cul${i}_icon`),
        heading: g(`cul${i}_heading`),
        text: g(`cul${i}_text`),
      }));
      obj.benefitsHeading = g('benefitsHeading');
      obj.benefitsNote = g('benefitsNote');
      obj.benefits = benefits.map((_, i) => g(`ben${i}`));
      obj.faqHeading = g('faqHeading');
      obj.faq = faq.map((f, i) => ({ ...f, q: g(`faq${i}_q`), a: g(`faq${i}_a`) }));
      obj.formHeading = g('formHeading');
      obj.formIntro = g('formIntro');
      obj.formSuccess = g('formSuccess');
      obj.positionOther = g('positionOther');

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-tuyen-dung').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      inputs.forEach((i) => origValues.set(i, i.value));
      window.__adminSetDirty?.(false);
      checkDirty();
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
