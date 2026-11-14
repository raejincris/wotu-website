/**
 * Cloudflare Turnstile cho bản lead gửi sang app.wotu.vn (14/11/2026).
 *
 * Vì sao: endpoint lead bên app chỉ chặn bằng header Origin — script ngoài trình duyệt tự đặt
 * được. Token Turnstile thì phải do trình duyệt thật giải ra → app xác minh với Cloudflare.
 *
 * - Nạp script LƯỜI: chỉ khi khách bắt đầu điền form (`focusin`) → trang không form/khách không
 *   điền thì không tốn 1 byte JS bên thứ ba.
 * - `appearance: 'interaction-only'`: khách bình thường không thấy gì; chỉ khi Cloudflare nghi
 *   ngờ mới hiện ô tích trong `[data-turnstile]` của form.
 * - Token dùng 1 lần → lấy xong thì `reset` để lần gửi sau có token mới.
 * - Hết giờ / lỗi / bị chặn → trả '' . App sẽ từ chối bản lead đó, nhưng email web3forms vẫn
 *   đi bình thường — không bao giờ làm hỏng form vì Turnstile.
 * - Site key rỗng (`site.forms.turnstileSiteKey`) → tắt hẳn, không nạp gì.
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
};

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** Phải khớp TURNSTILE_ACTION bên app (src/lib/website-lead.ts). */
const ACTION = 'website-lead';

let loader: Promise<TurnstileApi | null> | null = null;

/** Ô widget của form: bên trong form, hoặc ngoài form với `data-turnstile-for="<id form>"`. */
function boxOf(form: HTMLFormElement | null): HTMLElement | null {
  if (!form) return null;
  return (
    form.querySelector<HTMLElement>('[data-turnstile]') ??
    (form.id ? document.querySelector<HTMLElement>(`[data-turnstile-for="${CSS.escape(form.id)}"]`) : null)
  );
}

function loadApi(): Promise<TurnstileApi | null> {
  if (loader) return loader;
  loader = new Promise((resolve) => {
    const w = window as unknown as { turnstile?: TurnstileApi };
    if (w.turnstile) return resolve(w.turnstile);
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(w.turnstile ?? null);
    s.onerror = () => {
      loader = null; // cho phép thử lại lần sau
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return loader;
}

type State = {
  api: TurnstileApi | null;
  id: string | null;
  token: string;
  waiters: Array<(t: string) => void>;
};
const states = new WeakMap<HTMLElement, State>();

function flush(st: State, token: string): void {
  st.token = token;
  if (!token) return;
  const ws = st.waiters.splice(0);
  ws.forEach((fn) => fn(token));
}

/** Bắt đầu giải sớm (gọi khi khách focus vào form) để lúc bấm gửi đã có token sẵn. */
export function warmTurnstile(box: HTMLElement | null): void {
  if (!box || states.has(box)) return;
  const sitekey = box.dataset.sitekey?.trim();
  if (!sitekey) return;
  const st: State = { api: null, id: null, token: '', waiters: [] };
  states.set(box, st);
  const giveUp = () => {
    states.delete(box); // lần sau thử lại
    st.waiters.splice(0).forEach((fn) => fn(''));
  };
  void loadApi().then((api) => {
    if (!api) return giveUp(); // script bị chặn (adblock / mạng) → form khỏi chờ hết giờ
    st.api = api;
    try {
      st.id = api.render(box, {
        sitekey,
        action: ACTION,
        appearance: 'interaction-only',
        'refresh-expired': 'auto',
        language: 'vi',
        callback: (t: string) => flush(st, t),
        'expired-callback': () => { st.token = ''; },
        'error-callback': () => { st.token = ''; },
      });
    } catch {
      giveUp();
    }
  });
}

/** Gắn tự-warm vào form: lần đầu khách chạm vào ô nào thì bắt đầu giải. */
export function attachTurnstile(form: HTMLFormElement | null): void {
  const box = boxOf(form);
  if (!form || !box?.dataset.sitekey) return;
  form.addEventListener('focusin', () => warmTurnstile(box), { once: true });
}

/** Lấy token cho 1 lần gửi. Không có site key → '' ngay. Quá `timeoutMs` → ''. */
export function takeTurnstileToken(form: HTMLFormElement | null, timeoutMs = 6000): Promise<string> {
  const box = boxOf(form);
  if (!box?.dataset.sitekey) return Promise.resolve('');
  warmTurnstile(box);
  const st = states.get(box);
  if (!st) return Promise.resolve('');

  const consume = (t: string): string => {
    st.token = '';
    if (st.api && st.id) {
      try { st.api.reset(st.id); } catch { /* bỏ qua */ }
    }
    return t;
  };
  if (st.token) return Promise.resolve(consume(st.token));

  return new Promise((resolve) => {
    let done = false;
    const fn = (t: string) => {
      if (done) return;
      done = true;
      resolve(consume(t));
    };
    st.waiters.push(fn);
    setTimeout(() => {
      if (done) return;
      done = true;
      st.waiters = st.waiters.filter((w) => w !== fn);
      resolve('');
    }, timeoutMs);
  });
}
