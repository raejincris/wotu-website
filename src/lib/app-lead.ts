/**
 * Gửi thêm 1 bản lead sang app quản lý (app.wotu.vn) để khách vào danh sách khách hàng + phễu bán
 * hàng ngay — web3forms (email) vẫn là đường chính, KHÔNG phụ thuộc hàm này.
 *
 * - `mode: 'no-cors'` + body `text/plain` → request "simple", không preflight, không cần CORS
 *   header phía app. Không đọc được phản hồi — cố ý: lỗi app không được làm hỏng form.
 * - `keepalive` để vẫn gửi được khi form native chuyển trang ngay sau submit.
 * - CSP `connect-src` phải có https://app.wotu.vn (BaseLayout + ShopLayout + _headers).
 */
export type AppLeadKind = 'lien_he' | 'tu_van_combo' | 'gio_hang';

const ENDPOINT = 'https://app.wotu.vn/api/public/website-lead';

export function sendLeadToApp(kind: AppLeadKind, data: FormData | Record<string, unknown>): void {
  try {
    const get = (k: string) => String((data instanceof FormData ? data.get(k) : data[k]) ?? '').trim();
    const phone = get('phone');
    if (!phone) return;
    const message = [get('message'), get('note'), get('cart')].filter(Boolean).join('\n\n');
    const body = JSON.stringify({
      kind,
      name: get('name'),
      phone,
      email: get('email'),
      message: message.slice(0, 3000),
      page: location.pathname,
      hp: get('botcheck'),
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
