// wotu-search-log — Cloudflare Worker ghi log truy vấn tìm kiếm của site.
// Mục đích: biết khách tìm gì (nhất là truy vấn 0 KẾT QUẢ → thiếu hàng/nội dung)
// và sinh gợi ý "phổ biến" thật cho Nav search.
//
// QUYỀN RIÊNG TƯ: chỉ lưu q (từ khoá, cắt ≤100 ký tự) + n (số kết quả) + ts.
// KHÔNG lưu IP, user-agent, cookie, hay bất kỳ định danh nào. Không đặt cookie.
//
// Endpoints:
//   POST /log  { q, n }            → chèn 1 dòng (fire-and-forget từ client). 204.
//   GET  /top?limit=8&days=90&zero=0
//        zero=0 → top từ khoá CÓ kết quả (n>0) → gợi ý phổ biến cho khách
//        zero=1 → top từ khoá 0 kết quả (n=0)  → insight cho chủ site
//        → JSON [{ q, c }]

const corsHeaders = (origin, allowed) => {
  const ok = origin && allowed.split(',').map((s) => s.trim()).includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed.split(',')[0].trim(),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
};

const json = (data, status, cors) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8', ...cors },
  });

export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname, searchParams } = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS || '');

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // ---- POST /log ----
    if (method === 'POST' && pathname === '/log') {
      // Chỉ nhận từ origin cho phép (browser không giả được Origin cross-site).
      const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
      if (!allowed.includes(origin)) return new Response(null, { status: 403, headers: cors });
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(null, { status: 400, headers: cors });
      }
      const q = String(body?.q ?? '').trim().slice(0, 100);
      const n = Math.max(0, Math.min(9999, parseInt(body?.n, 10) || 0));
      if (q.length < 2) return new Response(null, { status: 204, headers: cors });
      try {
        await env.DB.prepare('INSERT INTO searches (q, n, ts) VALUES (?, ?, ?)')
          .bind(q, n, Date.now())
          .run();
      } catch {
        // Nuốt lỗi — logging không được ảnh hưởng trải nghiệm.
      }
      return new Response(null, { status: 204, headers: cors });
    }

    // ---- GET /top ----
    if (method === 'GET' && pathname === '/top') {
      const limit = Math.max(1, Math.min(20, parseInt(searchParams.get('limit'), 10) || 8));
      const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days'), 10) || 90));
      const zero = searchParams.get('zero') === '1';
      const since = Date.now() - days * 86400_000;
      const cond = zero ? 'n = 0' : 'n > 0';
      try {
        const { results } = await env.DB.prepare(
          `SELECT q, COUNT(*) AS c FROM searches
           WHERE ts > ? AND ${cond}
           GROUP BY LOWER(q) ORDER BY c DESC, MAX(ts) DESC LIMIT ?`,
        )
          .bind(since, limit)
          .all();
        return json(results ?? [], 200, cors);
      } catch {
        return json([], 200, cors);
      }
    }

    return new Response('', { status: 404, headers: cors });
  },
};
