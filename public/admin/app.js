/**
 * app.js — WOTU Admin SPA
 * Hash router: #dashboard | #site | #sofa | #combo | #shop-home | #home-hero
 * Layout: sidebar nav (desktop persistent, mobile drawer) + content panels
 */

import { getSession, clearSession, openAuthPopup } from './auth.js';
import { getCommits, getFileLastCommit } from './github.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function showToast(html, type = 'info', ms = 6000) {
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
}

// ─── Panel map ────────────────────────────────────────────────────────────────

const PANELS = [
  'panel-dashboard',
  'panel-site', 'panel-sofa', 'panel-combo', 'panel-shop-home', 'panel-home-hero',
  'panel-shop-hero', 'panel-products',
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
};

const EDITOR_MAP = {
  'site':       '/admin/editors/site-info.js',
  'sofa':       '/admin/editors/sofa-may.js',
  'combo':      '/admin/editors/combo.js',
  'shop-home':  '/admin/editors/shop-home.js',
  'home-hero':  '/admin/editors/home-hero.js',
  'shop-hero':  '/admin/editors/shop-hero.js',
  'products':   '/admin/editors/products.js',
};

const FILE_STATUS_CONFIG = [
  { name: 'Thông tin liên hệ', path: 'src/data/site.yml',           hash: 'site' },
  { name: 'Sofa Mây',          path: 'src/data/shop-sofa-may.yml',   hash: 'sofa' },
  { name: 'Combo Tổ Ấm',       path: 'src/data/combo-to-am.yml',     hash: 'combo' },
  { name: 'Combo trang chủ',   path: 'src/data/shop-home.yml',       hash: 'shop-home' },
  { name: 'Trang chủ Studio',  path: 'src/data/home.yml',            hash: 'home-hero' },
  { name: 'Trang chủ Shop',    path: 'src/data/shop-home.yml',       hash: 'shop-hero' },
  { name: 'Catalog sản phẩm',  path: 'src/data/shop-products.yml',   hash: 'products' },
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
      init({ token: session.token, showToast, setLoading });
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
