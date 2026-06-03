# SEO Setup — đăng ký search engine & verify OG

> Hướng dẫn một lần cho `wotu.vn`. Làm SAU khi deploy. Các URL: site `https://www.wotu.vn`,
> sitemap `https://www.wotu.vn/sitemap-index.xml`, OG image `https://www.wotu.vn/og.png`.
> DNS quản lý trên **Cloudflare** (zone `wotu.vn`).

## Trạng thái đã biết (kiểm tra 03/06/2026)

- ✅ DNS **đã có sẵn 2 record `google-site-verification=...`** → Google Search Console rất có thể tự xác minh ngay khi thêm property, không cần thêm gì. **KHÔNG xoá 2 record cũ.**
- ❌ Chưa có record verify của Bing (`MS=...`).
- ✅ sitemap + robots.txt + og.png đều live (200).

---

## 1. Google Search Console

**Mục đích:** Google biết site, theo dõi index/thứ hạng/lỗi, nhận sitemap.

1. https://search.google.com/search-console → đăng nhập `raejin.cris@gmail.com`.
2. **Add property** → chọn ô **Domain** (KHÔNG chọn "URL prefix") → gõ `wotu.vn` → **Continue**.
   - Domain property phủ cả `wotu.vn` + `www.wotu.vn` + http/https một lượt.
3. Bấm **Verify** ngay (DNS đã có TXT google → thường xác minh tức thì).
   - Nếu lỗi (Google đưa mã TXT mới): Cloudflare → zone `wotu.vn` → **DNS → Add record**:
     `Type: TXT · Name: @ · Content: google-site-verification=... · TTL: Auto` → Save → đợi 1–5 phút → **Verify** lại. **Thêm song song, đừng xoá record cũ.**
4. Menu trái → **Sitemaps** → gõ `sitemap-index.xml` → **Submit**.
5. (tuỳ chọn) **URL Inspection** dán `https://www.wotu.vn/` → **Request Indexing** cho vài trang chính (`/`, `/san-pham/`, `/combo/`, `/studio/`).

---

## 2. Bing Webmaster Tools

**Cách nhanh nhất — import từ Google (khỏi verify lại):**

1. https://www.bing.com/webmasters → **Sign in with Google** (dùng luôn Gmail).
2. Trang chủ → ô **"Import your sites from Google Search Console"** → **Import** → chọn `wotu.vn` → xong (Bing tự lấy cả sitemap).

**Hoặc thủ công:** Add a site `https://www.wotu.vn` → verify bằng **DNS (CNAME/TXT)** (thêm record Bing yêu cầu vào Cloudflare) → **Sitemaps → Submit** `https://www.wotu.vn/sitemap-index.xml`.

---

## 3. Verify OG — Facebook Sharing Debugger

**Mục đích:** share link wotu.vn lên FB/Zalo/Messenger hiện ảnh + tiêu đề đẹp.

1. https://developers.facebook.com/tools/debug/ → dán `https://www.wotu.vn` → **Debug**.
2. Kiểm tra **Link Preview**: `og:image` (ảnh branded 1200×630), `og:title`, `og:description` đúng tiếng Việt.
3. **Luôn bấm "Scrape Again"** sau mỗi lần đổi (FB cache rất lâu).
4. Test thêm trang con OG riêng: `/combo/to-am/`, `/san-pham/sofa-may/` (có `og:type=product`).

> ⚠️ Mỗi lần đổi `og.png` hoặc copy OG rồi deploy → quay lại đây bấm **Scrape Again**.

**Tuỳ chọn:**
- Tổng hợp nhiều mạng: https://www.opengraph.xyz/ (dán URL xem preview FB/Twitter/LinkedIn).
- Zalo không có debug công khai — OG tag chuẩn là đủ; cache tự refresh sau vài giờ.

---

## Thứ tự đề xuất

1. **Deploy** (để og.png + ảnh WebP lên production).
2. **Google Search Console** + nộp sitemap.
3. **Import sang Bing** (1 phút).
4. **FB Debugger → Scrape Again**.
