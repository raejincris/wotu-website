/**
 * github.js — GitHub REST API wrapper
 * Đọc/ghi YAML files trong repo raejincris/wotu-website.
 *
 * Encoding: tất cả YAML chứa tiếng Việt → dùng encodeURIComponent/escape
 * thay vì btoa/atob thuần (btoa crash với ký tự ngoài Latin-1).
 */

import {
  setTextDraft, setBinaryDraft, setDeleteDraft, getDraft, listDrafts, clearDrafts,
} from './lib/drafts.js';

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

/**
 * Đọc file từ repo → { yamlString, sha }.
 * Draft-aware: nếu có bản nháp text cho path → trả nội dung nháp (để editor
 * hiện đúng thay đổi chưa đăng khi mở lại). sha='draft' (không dùng khi ghi nháp).
 */
export async function getFile(token, path) {
  const d = getDraft(path);
  if (d && d.type === 'text') return { yamlString: d.content, sha: 'draft' };

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
 * "Lưu" file → ghi vào hàng đợi NHÁP (chưa lên web). Đăng sau qua publishDrafts.
 * @returns {{ commitUrl: string, draft: boolean }}
 */
export async function putFile(token, path, yamlString, _sha, _message) {
  setTextDraft(path, yamlString);
  return { commitUrl: '', draft: true };
}

/**
 * "Lưu" nhiều file text → tất cả vào hàng đợi NHÁP.
 * @param {{path:string, content:string}[]} files
 * @returns {{ commitUrl: string, draft: boolean }}
 */
export async function putFiles(token, files, _message) {
  files.forEach((f) => setTextDraft(f.path, f.content));
  return { commitUrl: '', draft: true };
}

/**
 * Commit NHIỀU thay đổi (text/binary/xoá) trong MỘT commit (Git Data API)
 * → chỉ 1 lần build CF. Dùng bởi publishDrafts.
 * @param {{path:string, base64?:string, delete?:boolean}[]} items
 */
async function _commitItems(token, items, message) {
  const h = { ...ghHeaders(token), 'Content-Type': 'application/json' };
  const api = (p) => `${API}/repos/${REPO}/${p}`;

  // 1. ref + commit gốc → tree gốc
  let res = await fetch(api(`git/ref/heads/${BRANCH}`), { headers: ghHeaders(token) });
  if (!res.ok) await ghThrow(res);
  const baseCommitSha = (await res.json()).object.sha;
  res = await fetch(api(`git/commits/${baseCommitSha}`), { headers: ghHeaders(token) });
  if (!res.ok) await ghThrow(res);
  const baseTreeSha = (await res.json()).tree.sha;

  // 2. tạo blob + dựng tree mới (sha:null = xoá file)
  const tree = [];
  for (const it of items) {
    if (it.delete) { tree.push({ path: it.path, mode: '100644', type: 'blob', sha: null }); continue; }
    res = await fetch(api('git/blobs'), {
      method: 'POST', headers: h,
      body: JSON.stringify({ content: it.base64, encoding: 'base64' }),
    });
    if (!res.ok) await ghThrow(res);
    tree.push({ path: it.path, mode: '100644', type: 'blob', sha: (await res.json()).sha });
  }

  res = await fetch(api('git/trees'), {
    method: 'POST', headers: h,
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  if (!res.ok) await ghThrow(res);
  const newTreeSha = (await res.json()).sha;

  res = await fetch(api('git/commits'), {
    method: 'POST', headers: h,
    body: JSON.stringify({ message, tree: newTreeSha, parents: [baseCommitSha] }),
  });
  if (!res.ok) await ghThrow(res);
  const newCommit = await res.json();

  res = await fetch(api(`git/refs/heads/${BRANCH}`), {
    method: 'PATCH', headers: h,
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  if (!res.ok) await ghThrow(res);

  return { commitUrl: newCommit.html_url };
}

/**
 * ĐĂNG tất cả nháp đang chờ lên web — gom thành 1 commit (1 build CF).
 * @returns {{ commitUrl: string, count: number } | { none: true }}
 */
export async function publishDrafts(token, message) {
  const drafts = listDrafts();
  if (!drafts.length) return { none: true };

  const items = drafts.map((d) => {
    if (d.type === 'delete') return { path: d.path, delete: true };
    if (d.type === 'binary') return { path: d.path, base64: d.content };
    return { path: d.path, base64: b64Encode(d.content) }; // text → utf8 base64
  });

  const { commitUrl } = await _commitItems(token, items, message);
  clearDrafts();
  return { commitUrl, count: drafts.length };
}

export { draftCount, listDrafts, clearDrafts } from './lib/drafts.js';

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
export async function putBinaryFile(token, path, base64, _sha, _message) {
  setBinaryDraft(path, base64);
  return { commitUrl: '', path, draft: true };
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

/** "Xoá" 1 file → ghi nháp xoá (chỉ thực thi khi Đăng). @returns {{ commitUrl, draft }} */
export async function deleteFile(token, path, _sha, _message) {
  setDeleteDraft(path);
  return { commitUrl: '', draft: true };
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
