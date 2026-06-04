/**
 * app.js — WOTU Admin SPA
 * Hash router: #dashboard | #site | #sofa | #combo | #shop-home | #home-hero
 * Layout: sidebar nav (desktop persistent, mobile drawer) + content panels
 */

import { getSession, clearSession, openAuthPopup } from './auth.js';
import { getCommits, getFileLastCommit, publishDrafts } from './github.js';
import { draftCount } from './lib/drafts.js';
import * as previewBus from './lib/preview-bus.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function showToast(html, type = 'info', ms = 6000) {
  // Chế độ Lưu nháp: viết lại thông báo "đã lưu → web cập nhật ~1 phút" (cũ của
  // từng editor) thành thông điệp nháp + bỏ link "Xem commit" (chưa có commit).
  // Chỉ áp cho toast lưu của editor (chứa "Đã lưu! Website…"), KHÔNG đụng toast Đăng.
  html = String(html);
  if (/Đã lưu!\s*Website/i.test(html)) {
    html = html
      .replace(/Đã lưu!\s*Website[^<]*/i, 'Đã lưu nháp — bấm “Đăng lên web” để xuất bản. ')
      .replace(/<a\b[^>]*>\s*Xem commit[^<]*<\/a>/i, '');
  }

  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = html;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export function setLoading(on) {
  document.getElementById('loading').hidden = !on;
}

function relTime(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60)    return 'vừa xong';
  if (d < 3600)  return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  return `${Math.floor(d / 86400)} ngày trước`;
}

function ageBadge(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 86400 * 3)  return { cls: 'fresh',  label: 'Mới' };
  if (d < 86400 * 14) return { cls: 'recent', label: 'Gần đây' };
  return { cls: 'old', label: 'Cũ' };
}

// ─── Dirty guard ──────────────────────────────────────────────────────────────

let isDirty = false;
window.__adminSetDirty = (val) => { isDirty = !!val; };
window.__adminSaveFn = null;

function resetEditor() {
  isDirty = false;
  window.__adminSetDirty(false);
  window.__adminSaveFn = null;
  previewBus.disconnect();
  previewOverrideUrl = '';
}

// ─── Live preview pane ──────────────────────────────────────────────────────────

const PREVIEW_KEY = 'wotu-admin-preview-open';
let previewOpen = localStorage.getItem(PREVIEW_KEY) !== '0' && window.innerWidth >= 1100;
let currentPreviewUrl = '';
let previewOverrideUrl = '';

// Editor (vd Bố cục trang) đổi trang đang xem trước.
window.__previewSetUrl = (url) => {
  previewOverrideUrl = url || '';
  updatePreview(currentPanelPreview());
};

function previewEls() {
  return {
    pane:   document.getElementById('preview-pane'),
    iframe: document.getElementById('pv-iframe'),
    wrap:   document.getElementById('pv-wrap'),
    url:    document.getElementById('pv-url'),
    open:   document.getElementById('pv-open'),
    toggle: document.getElementById('btn-preview-toggle'),
  };
}

/** Gọi từ showPanel — bật/tắt pane theo panel hiện tại + nạp iframe ?cms=1. */
function updatePreview(previewUrl) {
  const { pane, iframe, url, open, toggle } = previewEls();
  if (!pane) return;

  const effective = previewOverrideUrl || previewUrl;

  // Nút "Xem trước" chỉ hiện khi panel có URL preview.
  toggle.hidden = !effective;
  toggle.setAttribute('aria-pressed', String(!!effective && previewOpen));

  if (!effective || !previewOpen) {
    pane.hidden = true;
    currentPreviewUrl = '';
    previewBus.setIframe(null);
    return;
  }

  pane.hidden = false;
  previewBus.setIframe(iframe);
  if (effective !== currentPreviewUrl) {
    currentPreviewUrl = effective;
    const sep = effective.includes('?') ? '&' : '?';
    iframe.src = effective + sep + 'cms=1';
    url.textContent = effective.replace(/^https?:\/\//, '');
    url.title = effective;
    open.href = effective;
  }
}

function currentPanelPreview() {
  const hash = location.hash.replace(/^#/, '');
  const panelId = HASH_MAP[hash] ?? 'panel-dashboard';
  return (PANEL_META[panelId] || {}).preview || '';
}

function setupPreview() {
  const { pane, iframe, wrap, toggle } = previewEls();
  if (!pane) return;

  toggle.addEventListener('click', () => {
    previewOpen = !previewOpen;
    localStorage.setItem(PREVIEW_KEY, previewOpen ? '1' : '0');
    updatePreview(currentPanelPreview());
    if (previewOpen) previewBus.resync();
  });

  document.getElementById('pv-close').addEventListener('click', () => {
    previewOpen = false;
    localStorage.setItem(PREVIEW_KEY, '0');
    updatePreview(currentPanelPreview());
  });

  document.getElementById('pv-reload').addEventListener('click', () => {
    if (iframe.src) iframe.src = iframe.src; // reload → cms-ready → resync
  });

  pane.querySelectorAll('.pv-dev').forEach((b) => {
    b.addEventListener('click', () => {
      pane.querySelectorAll('.pv-dev').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      wrap.classList.toggle('mobile', b.dataset.w === 'mobile');
    });
  });
}

// ─── Publish (Đăng lên web) ─────────────────────────────────────────────────────

function updatePublishUI() {
  const btn = document.getElementById('btn-publish');
  if (!btn) return;
  const n = draftCount();
  const badge = document.getElementById('publish-count');
  if (badge) { badge.textContent = String(n); badge.hidden = n === 0; }
  btn.hidden = n === 0;
}

function setupPublish() {
  const btn = document.getElementById('btn-publish');
  if (!btn) return;
  window.addEventListener('wotu-drafts-changed', updatePublishUI);
  updatePublishUI();

  btn.addEventListener('click', async () => {
    const n = draftCount();
    if (!n) return;
    if (!confirm(`Đăng ${n} thay đổi lên website?\nWebsite sẽ tự cập nhật sau ~1–2 phút.`)) return;
    const session = getSession();
    if (!session) return;
    setLoading(true);
    btn.disabled = true;
    try {
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
      const r = await publishDrafts(session.token, `quan-tri: đăng ${n} thay đổi — ${ts}`);
      if (r.none) { showToast('Không có thay đổi nào để đăng.', 'info'); return; }
      showToast(
        `✅ Đã đăng ${r.count} thay đổi! Website cập nhật sau ~1–2 phút. <a href="${r.commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
      updatePublishUI();
      // Tải lại để đọc nội dung đã đăng (nháp đã xoá).
      if (location.hash && location.hash !== '#dashboard' && location.hash !== '#') navigate();
      else loadDashboard(session.token);
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'Có thay đổi mới trên web — tải lại trang rồi Đăng lại.'
        : e.message;
      showToast(`❌ Không thể đăng: ${escHtml(msg)}`, 'error');
    } finally {
      setLoading(false);
      btn.disabled = false;
    }
  });
}

/** Đổi nhãn nút Lưu của editor sang "Lưu nháp" (chế độ draft). */
function relabelSaveButtons() {
  document.querySelectorAll('.editor-footer button[id^="save-"]').forEach((b) => {
    if (/lưu/i.test(b.textContent) && !/nháp/i.test(b.textContent)) {
      b.innerHTML = '💾 Lưu nháp';
    }
  });
}

// ─── Panel map ────────────────────────────────────────────────────────────────

const PANELS = [
  'panel-dashboard',
  'panel-site', 'panel-sofa', 'panel-combo', 'panel-shop-home', 'panel-home-hero',
  'panel-shop-hero', 'panel-products', 'panel-phong-mau', 'panel-footer',
  'panel-studio-home', 'panel-services', 'panel-privacy', 'panel-theme',
  'panel-layout', 'panel-blocks', 'panel-pages',
];

const HASH_MAP = {
  '':            'panel-dashboard',
  'dashboard':   'panel-dashboard',
  'site':        'panel-site',
  'sofa':        'panel-sofa',
  'combo':       'panel-combo',
  'shop-home':   'panel-shop-home',
  'home-hero':   'panel-home-hero',
  'shop-hero':   'panel-shop-hero',
  'products':    'panel-products',
  'phong-mau':   'panel-phong-mau',
  'footer':      'panel-footer',
  'studio-home': 'panel-studio-home',
  'services':    'panel-services',
  'privacy':     'panel-privacy',
  'theme':       'panel-theme',
  'layout':      'panel-layout',
  'blocks':      'panel-blocks',
  'pages':       'panel-pages',
};

const PANEL_META = {
  'panel-dashboard': { title: 'Dashboard',                preview: null },
  'panel-site':      { title: 'Thông tin liên hệ',        preview: 'https://www.wotu.vn/studio/' },
  'panel-sofa':      { title: 'Sofa Mây',                 preview: 'https://www.wotu.vn/san-pham/sofa-may/' },
  'panel-combo':     { title: 'Combo Tổ Ấm',              preview: 'https://www.wotu.vn/combo/to-am/' },
  'panel-shop-home': { title: 'Combo trang chủ',          preview: 'https://www.wotu.vn/' },
  'panel-home-hero': { title: 'Trang chủ Studio',         preview: 'https://www.wotu.vn/studio/' },
  'panel-shop-hero': { title: 'Trang chủ Shop',           preview: 'https://www.wotu.vn/' },
  'panel-products':  { title: 'Catalog sản phẩm',         preview: 'https://www.wotu.vn/san-pham/' },
  'panel-phong-mau': { title: 'Phòng mẫu',                preview: 'https://www.wotu.vn/phong-mau/to-am/' },
  'panel-footer':    { title: 'Footer & Menu',            preview: 'https://www.wotu.vn/studio/' },
  'panel-studio-home': { title: 'Studio — Các section',   preview: 'https://www.wotu.vn/studio/' },
  'panel-services':  { title: 'Trang dịch vụ',            preview: 'https://www.wotu.vn/studio/dich-vu/' },
  'panel-privacy':   { title: 'Chính sách bảo mật',       preview: 'https://www.wotu.vn/bao-mat' },
  'panel-theme':     { title: 'Giao diện (Theme)',        preview: 'https://www.wotu.vn/' },
  'panel-layout':    { title: 'Bố cục trang',             preview: 'https://www.wotu.vn/' },
  'panel-blocks':    { title: 'Khối nội dung',            preview: 'https://www.wotu.vn/' },
  'panel-pages':     { title: 'Trang tuỳ chỉnh',          preview: null },
};

const EDITOR_MAP = {
  'site':       '/admin/editors/site-info.js',
  'sofa':       '/admin/editors/sofa-may.js',
  'combo':      '/admin/editors/combo.js',
  'shop-home':  '/admin/editors/shop-home.js',
  'home-hero':  '/admin/editors/home-hero.js',
  'shop-hero':  '/admin/editors/shop-hero.js',
  'products':   '/admin/editors/products.js',
  'phong-mau':  '/admin/editors/phong-mau.js',
  'footer':     '/admin/editors/footer.js',
  'studio-home': '/admin/editors/studio-home.js',
  'services':   '/admin/editors/services.js',
  'privacy':    '/admin/editors/privacy.js',
  'theme':      '/admin/editors/theme.js',
  'layout':     '/admin/editors/layout.js',
  'blocks':     '/admin/editors/blocks.js',
  'pages':      '/admin/editors/pages.js',
};

const FILE_STATUS_CONFIG = [
  // Shop · Trang bán hàng
  { name: 'Trang chủ Shop',    path: 'src/data/shop-home.yml',       hash: 'shop-hero' },
  { name: 'Combo trang chủ',   path: 'src/data/shop-home.yml',       hash: 'shop-home' },
  { name: 'Catalog sản phẩm',  path: 'src/data/shop-products.yml',   hash: 'products' },
  { name: 'Combo Tổ Ấm',       path: 'src/data/combo-to-am.yml',     hash: 'combo' },
  { name: 'Sofa Mây',          path: 'src/data/shop-sofa-may.yml',   hash: 'sofa' },
  { name: 'Phòng mẫu',         path: 'src/data/phong-mau-to-am.yml', hash: 'phong-mau' },
  // Studio · Trang thiết kế
  { name: 'Trang chủ Studio',  path: 'src/data/home.yml',            hash: 'home-hero' },
  { name: 'Studio — section',  path: 'src/data/home.yml',            hash: 'studio-home' },
  { name: 'Trang dịch vụ',     path: 'src/data/services.yml',        hash: 'services' },
  // Chung · Toàn site
  { name: 'Thông tin liên hệ', path: 'src/data/site.yml',           hash: 'site' },
  { name: 'Footer & Menu',     path: 'src/data/footer.yml',          hash: 'footer' },
  { name: 'Chính sách bảo mật', path: 'src/data/bao-mat.yml',        hash: 'privacy' },
  // Giao diện
  { name: 'Giao diện (Theme)', path: 'src/data/theme.yml',           hash: 'theme' },
];

// ─── Panel switching ──────────────────────────────────────────────────────────

function showPanel(id) {
  PANELS.forEach((p) => {
    const el = document.getElementById(p);
    if (el) {
      const active = p === id;
      el.hidden = !active;
      el.classList.toggle('active', active);
    }
  });

  // Update sidebar active state
  document.querySelectorAll('.sidebar-link[data-panel]').forEach((link) => {
    link.classList.toggle('active', link.dataset.panel === id.replace('panel-', ''));
  });

  // Update header title + preview button
  const meta = PANEL_META[id] || {};
  document.getElementById('header-title').textContent = meta.title || '';

  const previewBtn = document.getElementById('header-preview');
  if (meta.preview) {
    previewBtn.href = meta.preview;
    previewBtn.hidden = false;
  } else {
    previewBtn.hidden = true;
  }

  // Khung xem trước trực tiếp
  updatePreview(meta.preview || '');
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

let dashInitialized = false;

function setupDashboard(session) {
  document.getElementById('user-avatar').src = session.avatar_url;
  document.getElementById('user-avatar').alt = session.login;
  document.getElementById('user-name').textContent = session.login;

  if (dashInitialized) return;
  dashInitialized = true;

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    dashInitialized = false;
    resetEditor();
    document.getElementById('app-shell').hidden = true;
    document.getElementById('screen-login').hidden = false;
    location.hash = '';
  });
}

async function loadDashboard(token) {
  loadCommits(token);
  loadFileStatus(token);
}

function loadCommits(token) {
  const list = document.getElementById('commits-list');
  list.innerHTML = '<div class="commits-empty">Đang tải…</div>';
  getCommits(token).then((commits) => {
    if (!commits.length) {
      list.innerHTML = '<div class="commits-empty">Không có dữ liệu.</div>';
      return;
    }
    list.innerHTML = commits
      .map(
        (c) => `<div class="commit-row">
          <span class="commit-sha">${c.sha}</span>
          <a class="commit-msg" href="${c.url}" target="_blank" rel="noopener noreferrer"
             title="${escHtml(c.message)}">${escHtml(c.message)}</a>
          <span class="commit-date">${relTime(c.date)}</span>
        </div>`,
      )
      .join('');
  });
}

async function loadFileStatus(token) {
  const grid = document.getElementById('file-status-grid');
  grid.innerHTML = '<div class="status-loading">Đang tải…</div>';

  const results = await Promise.allSettled(
    FILE_STATUS_CONFIG.map((f) => getFileLastCommit(token, f.path)),
  );

  grid.innerHTML = FILE_STATUS_CONFIG.map((f, i) => {
    const r = results[i];
    const meta = r.status === 'fulfilled' ? r.value : null;
    const badge = meta ? ageBadge(meta.date) : null;
    return `
      <a href="#${f.hash}" class="file-status-card">
        <span class="file-status-name">${escHtml(f.name)}</span>
        <span class="file-status-path">${escHtml(f.path)}</span>
        ${meta
          ? `<span class="file-status-date">${relTime(meta.date)}</span>
             <span class="file-status-badge ${badge.cls}">${badge.label}</span>`
          : `<span class="file-status-date" style="color:var(--danger);font-size:11px">Không tải được</span>`
        }
      </a>`;
  }).join('');
}

// ─── Mobile sidebar ───────────────────────────────────────────────────────────

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle  = document.getElementById('btn-sidebar-toggle');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar on mobile after nav click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.sidebar-link') && window.innerWidth < 768) {
      closeSidebar();
    }
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

// Dirty guard — intercept sidebar clicks only (not all hash changes)
function checkDirtyBeforeNav(newHash) {
  if (!isDirty) return true;
  return confirm(
    'Bạn có thay đổi chưa lưu.\nNếu rời trang bây giờ, các thay đổi sẽ bị mất.\n\nTiếp tục?',
  );
}

async function navigate() {
  const hash = location.hash.replace(/^#/, '');
  const session = getSession();

  if (!session) {
    document.getElementById('app-shell').hidden = true;
    document.getElementById('screen-login').hidden = false;
    return;
  }

  // Shell visible
  document.getElementById('app-shell').hidden = false;
  document.getElementById('screen-login').hidden = true;

  setupDashboard(session);

  const panelId = HASH_MAP[hash] ?? 'panel-dashboard';

  // Reset editor state when switching panels
  resetEditor();
  showPanel(panelId);

  if (panelId === 'panel-dashboard') {
    loadDashboard(session.token);
    return;
  }

  // Editor: dynamically import and init
  const editorSrc = EDITOR_MAP[hash];
  if (editorSrc) {
    try {
      const { init } = await import(editorSrc);
      await init({ token: session.token, showToast, setLoading });
      relabelSaveButtons();
      updatePublishUI();
    } catch (e) {
      const bodyId = `editor-${hash.replace('-', '')}-body`
        .replace('shopHome', 'shop-home')
        .replace('homeHero', 'home-hero');
      const body = document.getElementById(`editor-${hash}-body`)
                || document.getElementById(`editor-${hash.replace('-','')}-body`);
      if (body) {
        body.innerHTML = `<div class="editor-error">Không tải được editor: ${escHtml(e.message)}</div>`;
      }
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  setupSidebar();
  setupPreview();
  setupPublish();

  // Sidebar link click → dirty guard
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar-link[href^="#"]');
    if (!link) return;
    const target = link.getAttribute('href');
    if (!checkDirtyBeforeNav(target)) {
      e.preventDefault();
    }
    // Otherwise let browser handle hash change → triggers navigate()
  });

  // File status cards are plain <a href="#hash"> — same guard
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.file-status-card[href^="#"]');
    if (!card) return;
    if (!checkDirtyBeforeNav(card.getAttribute('href'))) {
      e.preventDefault();
    }
  });

  // Warn on page unload when dirty
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // Ctrl+S / Cmd+S → trigger active editor save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      window.__adminSaveFn?.();
    }
  });

  // Hash router
  window.addEventListener('hashchange', navigate);

  // Login button — gọi window.open synchronously (tránh popup blocker)
  document.getElementById('btn-login').addEventListener('click', () => {
    document.getElementById('login-error').textContent = '';
    openAuthPopup(
      (session) => {
        navigate();
        location.hash = '#dashboard';
      },
      (msg) => {
        document.getElementById('login-error').textContent = msg;
      },
    );
  });

  // Initial load
  navigate();
});
