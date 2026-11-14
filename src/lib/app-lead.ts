/**
 * Gửi thêm 1 bản lead sang app quản lý (app.wotu.vn) để khách vào danh sách khách hàng + phễu bán
 * hàng ngay — web3forms (email) vẫn là đường chính, KHÔNG phụ thuộc hàm này.
 *
 * - `mode: 'no-cors'` + body `text/plain` → request "simple", không preflight, không cần CORS
 *   header phía app. Không đọc được phản hồi — cố ý: lỗi app không được làm hỏng form.
 * - `keepalive` để vẫn gửi được khi form native chuyển trang ngay sau submit.
 * - Kèm token Turnstile (`ts`) lấy từ `[data-turnstile]` trong form — app xác minh với Cloudflare
 *   (14/11/2026). Promise resolve khi request ĐÃ PHÁT ĐI (không chờ phản hồi) → form native
 *   `await` hàm này rồi mới chuyển trang.
 * - CSP `connect-src` phải có https://app.wotu.vn; Turnstile cần `script-src` + `frame-src`
 *   https://challenges.cloudflare.com (BaseLayout + ShopLayout + _headers).
 */
import { takeTurnstileToken } from './turnstile';

export type AppLeadKind = 'lien_he' | 'tu_van_combo' | 'gio_hang';

const ENDPOINT = 'https://app.wotu.vn/api/public/website-lead';

export async function sendLeadToApp(
  kind: AppLeadKind,
  data: FormData | Record<string, unknown>,
  form?: HTMLFormElement | null,
): Promise<void> {
  try {
    const get = (k: string) => String((data instanceof FormData ? data.get(k) : data[k]) ?? '').trim();
    const phone = get('phone');
    if (!phone) return;
    const hp = get('botcheck');
    // Bot dính bẫy thì khỏi tốn công giải Turnstile — app tự bỏ qua theo `hp`.
    const ts = hp ? '' : await takeTurnstileToken(form ?? null);
    const message = [get('message'), get('note'), get('cart')].filter(Boolean).join('\n\n');
    const body = JSON.stringify({
      kind,
      name: get('name'),
      phone,
      email: get('email'),
      message: message.slice(0, 3000),
      page: location.pathname,
      hp,
      ts,
    });
    void fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    }).catch(() => {});
  } catch {
    // Không bao giờ làm hỏng form vì đường phụ này.
  }
}
