/**
 * app.js — WOTU Admin SPA
 * Hash router: #dashboard | #site | #sofa | #combo | #shop-home
 */

import { getSession, clearSession, openAuthPopup } from './auth.js';
import { getCommits } from './github.js';

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
  if (d < 60)   return 'vừa xong';
  if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  return `${Math.floor(d / 86400)} ngày trước`;
}

// ─── Screen switching ─────────────────────────────────────────────────────────

const SCREENS = [
  'screen-login', 'screen-dashboard',
  'editor-site', 'editor-sofa', 'editor-combo', 'editor-shop-home',
];

function showScreen(id) {
  SCREENS.forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

const HASH_MAP = {
  '':           'screen-login',
  'dashboard':  'screen-dashboard',
  'site':       'editor-site',
  'sofa':       'editor-sofa',
  'combo':      'editor-combo',
  'shop-home':  'editor-shop-home',
};

const EDITOR_MAP = {
  'site':      '/admin/editors/site-info.js',
  'sofa':      '/admin/editors/sofa-may.js',
  'combo':     '/admin/editors/combo.js',
  'shop-home': '/admin/editors/shop-home.js',
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

let dashReady = false;

function setupDashboard(session) {
  document.getElementById('user-avatar').src = session.avatar_url;
  document.getElementById('user-avatar').alt = session.login;
  document.getElementById('user-name').textContent = session.login;

  if (dashReady) return;
  dashReady = true;

  document.querySelectorAll('.dash-card[data-goto]').forEach((card) => {
    card.addEventListener('click', () => {
      location.hash = '#' + card.dataset.goto;
    });
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    dashReady = false;
    showScreen('screen-login');
    location.hash = '';
  });
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
          <a class="commit-msg" href="${c.url}" target="_blank" rel="noopener noreferrer">${escHtml(c.message)}</a>
          <span class="commit-date">${relTime(c.date)}</span>
        </div>`,
      )
      .join('');
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function navigate() {
  const hash = location.hash.replace(/^#/, '');
  const session = getSession();

  if (!session) {
    showScreen('screen-login');
    return;
  }

  const screen = HASH_MAP[hash];

  if (!screen || screen === 'screen-login') {
    location.hash = '#dashboard';
    return;
  }

  if (screen === 'screen-dashboard') {
    setupDashboard(session);
    loadCommits(session.token);
    showScreen('screen-dashboard');
    return;
  }

  // Editor screen — luôn re-init để lấy sha mới nhất
  showScreen(screen);
  const editorSrc = EDITOR_MAP[hash];
  if (editorSrc) {
    const { init } = await import(editorSrc);
    init({ token: session.token, showToast, setLoading });
  }
}

// ─── Back buttons (delegate) ─────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-back]')) {
    location.hash = '#dashboard';
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const session = getSession();

  if (session) {
    setupDashboard(session);
    navigate();
  } else {
    showScreen('screen-login');
  }

  // Login button — gọi window.open synchronously (tránh popup blocker)
  document.getElementById('btn-login').addEventListener('click', () => {
    document.getElementById('login-error').textContent = '';
    openAuthPopup(
      (session) => {
        setupDashboard(session);
        location.hash = '#dashboard';
      },
      (msg) => {
        document.getElementById('login-error').textContent = msg;
      },
    );
  });

  window.addEventListener('hashchange', navigate);
});
