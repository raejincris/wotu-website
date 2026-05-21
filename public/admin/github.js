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

/** Đọc file từ repo → { yamlString, sha } */
export async function getFile(token, path) {
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // 409 = conflict (ai đó commit trước)
    if (res.status === 409) {
      throw new Error('FILE_CONFLICT');
    }
    throw new Error(err.message || `HTTP ${res.status}`);
  }
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
