/**
 * github.js — GitHub REST API wrapper
 * Đọc/ghi YAML files trong repo raejincris/wotu-website.
 *
 * Encoding: tất cả YAML chứa tiếng Việt → dùng encodeURIComponent/escape
 * thay vì btoa/atob thuần (btoa crash với ký tự ngoài Latin-1).
 */

const REPO = 'raejincris/wotu-website';
const BRANCH = 'main';
const API = 'https://api.github.com';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** Decode base64 (GitHub API) → UTF-8 string (hỗ trợ tiếng Việt) */
function b64Decode(b64) {
  return decodeURIComponent(
    escape(atob(b64.replace(/\n/g, ''))),
  );
}

/** UTF-8 string → base64 (hỗ trợ tiếng Việt) */
function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Ném Error với thông báo tiếng Việt thân thiện theo HTTP status.
 * Giữ 'FILE_CONFLICT' (409) để editor xử lý riêng. Dùng cho mọi response không OK.
 */
async function ghThrow(res) {
  if (res.status === 409) throw new Error('FILE_CONFLICT');
  const err = await res.json().catch(() => ({}));
  const MAP = {
    401: 'Phiên đăng nhập GitHub đã hết hạn — đăng xuất rồi đăng nhập lại.',
    403: 'Không đủ quyền hoặc đã chạm giới hạn GitHub API — chờ vài phút rồi thử lại.',
    404: 'Không tìm thấy nội dung trên GitHub (kiểm tra đường dẫn file).',
    422: 'GitHub từ chối dữ liệu gửi lên (không hợp lệ).',
    500: 'GitHub đang gặp sự cố — thử lại sau ít phút.',
    502: 'GitHub đang gặp sự cố — thử lại sau ít phút.',
    503: 'GitHub đang gặp sự cố — thử lại sau ít phút.',
  };
  throw new Error(MAP[res.status] || err.message || `Lỗi GitHub (HTTP ${res.status})`);
}

/** Đọc file từ repo → { yamlString, sha } */
export async function getFile(token, path) {
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  return {
    yamlString: b64Decode(data.content),
    sha: data.sha,
  };
}

/**
 * Ghi file lên repo (tạo commit).
 * @returns {{ commitUrl: string }}
 */
export async function putFile(token, path, yamlString, sha, message) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: b64Encode(yamlString),
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  return { commitUrl: data.commit.html_url };
}

/** Lấy sha hiện tại của file (null nếu chưa tồn tại) — dùng trước khi ghi đè ảnh. */
export async function getFileMeta(token, path) {
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (res.status === 404) return null;
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  return { sha: data.sha };
}

/**
 * Ghi file nhị phân (ảnh) lên repo. base64 phải là base64 THÔ của bytes ảnh
 * (KHÔNG qua b64Encode — hàm đó encode text UTF-8 sẽ làm hỏng binary).
 * @param {string} base64 - phần base64 sau dấu phẩy của dataURL
 */
export async function putBinaryFile(token, path, base64, sha, message) {
  const cleanPath = encodeURIComponent(path).replace(/%2F/g, '/');
  const res = await fetch(`${API}/repos/${REPO}/contents/${cleanPath}`, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: base64,
      ...(sha ? { sha } : {}),
      branch: BRANCH,
    }),
  });
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  return { commitUrl: data.commit.html_url, path };
}

/**
 * Liệt kê nội dung 1 thư mục trong repo → [{ name, path, sha, type }].
 * type: 'file' | 'dir'. Trả [] nếu thư mục chưa tồn tại (404).
 */
export async function listDir(token, path) {
  const cleanPath = encodeURIComponent(path).replace(/%2F/g, '/');
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${cleanPath}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (res.status === 404) return [];
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((it) => ({ name: it.name, path: it.path, sha: it.sha, type: it.type }));
}

/** Xoá 1 file khỏi repo (tạo commit). @returns {{ commitUrl: string }} */
export async function deleteFile(token, path, sha, message) {
  const cleanPath = encodeURIComponent(path).replace(/%2F/g, '/');
  const res = await fetch(`${API}/repos/${REPO}/contents/${cleanPath}`, {
    method: 'DELETE',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (!res.ok) await ghThrow(res);
  const data = await res.json();
  return { commitUrl: data.commit.html_url };
}

/** Lấy thông tin user hiện tại */
export async function getUser(token) {
  const res = await fetch(`${API}/user`, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Lấy 8 commit gần nhất */
export async function getCommits(token) {
  const res = await fetch(
    `${API}/repos/${REPO}/commits?per_page=8&sha=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) return [];
  const list = await res.json();
  return list.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    date: c.commit.author.date,
    url: c.html_url,
  }));
}

/** Lấy commit gần nhất của 1 file cụ thể → { sha, date, message } | null */
export async function getFileLastCommit(token, path) {
  const res = await fetch(
    `${API}/repos/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=1&sha=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) return null;
  const list = await res.json();
  if (!list.length) return null;
  return {
    sha: list[0].sha.slice(0, 7),
    date: list[0].commit.author.date,
    message: list[0].commit.message.split('\n')[0],
  };
}
