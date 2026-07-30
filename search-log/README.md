# wotu-search-log — Worker log truy vấn tìm kiếm

Ghi log query search của site (→ D1) để: (1) biết khách tìm gì mà site chưa có
(truy vấn **0 kết quả**), (2) sinh gợi ý "phổ biến" thật cho Nav search.

**Quyền riêng tư:** chỉ lưu `q` (từ khoá ≤100 ký tự) + `n` (số kết quả) + `ts`.
KHÔNG IP, user-agent, cookie, hay định danh nào.

## Deploy (thủ công — chạy trong terminal có `wrangler login`)

```bash
cd "WOTU website/site/search-log"
npx wrangler login                              # nếu chưa đăng nhập

# 1) Tạo D1 database → copy "database_id" in ra
npx wrangler d1 create wotu-search-log
#    → dán database_id vào wrangler.toml (thay SET_AFTER_D1_CREATE)

# 2) Tạo bảng (chạy schema lên D1 remote)
npx wrangler d1 execute wotu-search-log --remote --file=./schema.sql

# 3) Deploy worker — BẮT BUỘC -c wrangler.toml
npx wrangler deploy -c wrangler.toml
```

⚠️ **PHẢI có `-c wrangler.toml`**: wrangler đi ngược lên thư mục cha, gặp
`site/wrangler.jsonc` trước → nếu KHÔNG chỉ định config, `wrangler deploy` sẽ
deploy nhầm **site (`wotu-website`)** thay vì worker này (giống bẫy `cms-auth`).
Luôn `cd search-log` + `-c wrangler.toml`.

Sau deploy, worker chạy tại `https://wotu-search-log.raejin-cris.workers.dev`
(khớp `LOG_ENDPOINT` trong [`src/lib/search/client.ts`](../src/lib/search/client.ts) +
`connect-src` trong `public/_headers` + meta CSP 2 layout).

⚠️ Giống `cms-auth`: **KHÔNG nối git/Workers Builds** vào worker này — deploy thủ công.
Site vẫn chạy bình thường nếu worker CHƯA deploy (client fire-and-forget, lỗi thì bỏ qua;
gợi ý fallback về danh sách cứng).

## Xem dữ liệu

```bash
# Top từ khoá 0 kết quả (thiếu hàng/nội dung) 30 ngày qua:
npx wrangler d1 execute wotu-search-log --remote \
  --command="SELECT q, COUNT(*) c FROM searches WHERE n=0 AND ts>strftime('%s','now','-30 days')*1000 GROUP BY LOWER(q) ORDER BY c DESC LIMIT 30"
```

Hoặc mở `https://wotu-search-log.raejin-cris.workers.dev/top?zero=1&limit=30`.
