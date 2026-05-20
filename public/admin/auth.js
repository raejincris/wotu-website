/**
 * auth.js — GitHub OAuth popup flow + sessionStorage session management
 * Dùng lại wotu-cms-auth Worker (cùng protocol postMessage với Sveltia CMS).
 */

const AUTH_URL =
  'https://wotu-cms-auth.raejin-cris.workers.dev/auth?provider=github&site_id=www.wotu.vn';
const AUTH_ORIGIN = 'https://wotu-cms-auth.raejin-cris.workers.dev';
const SESSION_KEY = 'wotu_admin_session';
const SESSION_MS = 8 * 3600 * 1000; // 8 giờ

// ─── Session ──────────────────────────────────────────────────────────────────

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expires_at) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function saveSession(token, user) {
  const s = {
    token,
    login: user.login,
    avatar_url: user.avatar_url || '',
    expires_at: Date.now() + SESSION_MS,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

// ─── Popup OAuth ──────────────────────────────────────────────────────────────

/**
 * Mở popup OAuth GitHub.
 * PHẢI gọi synchronous trong click handler để tránh bị popup blocker chặn.
 *
 * @param {(session: object) => void} onSuccess
 * @param {(msg: string) => void} onError
 */
export function openAuthPopup(onSuccess, onError) {
  const popup = window.open(
    AUTH_URL,
    'wotu_auth',
    'width=640,height=720,left=200,top=80',
  );

  if (!popup) {
    onError('Trình duyệt đã chặn popup. Vui lòng cho phép popup cho trang này rồi thử lại.');
    return;
  }

  const handler = async (event) => {
    // Chỉ chấp nhận message từ auth Worker
    if (event.origin !== AUTH_ORIGIN) return;

    const { data } = event;

    // Bước 1: Worker báo sẵn sàng → ta reply để Worker gửi token
    if (data === 'authorizing:github') {
      popup.postMessage('authorizing:github', AUTH_ORIGIN);
      return;
    }

    // Bước 2: Worker trả token hoặc lỗi
    const match = String(data).match(/^authorization:github:(success|error):(.+)$/s);
    if (!match) return;

    window.removeEventListener('message', handler);
    clearInterval(closeWatcher);

    const [, state, payload] = match;
    let parsed = {};
    try { parsed = JSON.parse(payload); } catch { /* ignore */ }

    if (state === 'error') {
      onError(`Đăng nhập thất bại (${parsed.errorCode || 'UNKNOWN'}). Vui lòng thử lại.`);
      popup.close();
      return;
    }

    const { token } = parsed;
    if (!token) {
      onError('Không nhận được token. Vui lòng thử lại.');
      popup.close();
      return;
    }

    try {
      const user = await verifyToken(token);
      const session = saveSession(token, user);
      popup.close();
      onSuccess(session);
    } catch {
      onError('Xác minh token thất bại. Vui lòng thử lại.');
      popup.close();
    }
  };

  window.addEventListener('message', handler);

  // Cleanup nếu user đóng popup thủ công
  const closeWatcher = setInterval(() => {
    if (popup.closed) {
      clearInterval(closeWatcher);
      window.removeEventListener('message', handler);
    }
  }, 600);
}

async function verifyToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
