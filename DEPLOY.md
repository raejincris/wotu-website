# Hướng dẫn Deploy WOTU website lên Cloudflare Pages

Setup này dùng **Cloudflare Pages + GitHub** để host site free, auto-rebuild khi sửa qua CMS, và GitHub OAuth để login admin. Tổng thời gian setup lần đầu: ~30 phút.

## Tổng quan kiến trúc

```
[bạn edit qua CMS /admin]
       ↓ (Save = commit qua GitHub API)
[GitHub repo main branch]
       ↓ (webhook on push)
[Cloudflare Pages auto-build: npm run build]
       ↓ (deploy dist/)
[https://www.wotu.vn] ← live trong 1-2 phút
```

---

## Phase 1 — GitHub repo + push code

### 1.1. Tạo GitHub account (nếu chưa có)

- Vào https://github.com/signup → đăng ký free.
- Verify email.

### 1.2. Tạo repo mới

- Vào https://github.com/new
- **Repository name:** `wotu-website` (hoặc tên khác bạn muốn)
- **Visibility:** **Private** (Recommended — content có thể chứa info nội bộ).
- **KHÔNG** tick "Add README" / "Add .gitignore" (mình đã có sẵn).
- Click **Create repository**.

### 1.3. Push code lên repo

Mở terminal tại folder `site/`:

```bash
cd "d:/AI/WOTU website/site"
git init -b main
git add .
git commit -m "Initial commit — Astro site + Sveltia CMS shell"
git remote add origin https://github.com/<YOUR_USERNAME>/wotu-website.git
git push -u origin main
```

GitHub sẽ hỏi credentials lần đầu. Nếu được hỏi password — không dùng password, mà dùng **Personal Access Token**:

- Vào https://github.com/settings/tokens/new
- Note: `wotu-cli`, Expiration: 90 days, Scopes: tick **repo**
- Generate → copy token → paste khi git hỏi password.

Hoặc cài **GitHub CLI** (`gh auth login`) cho dễ hơn.

---

## Phase 2 — Cloudflare Pages connect repo

### 2.1. Tạo Cloudflare account

- Vào https://dash.cloudflare.com/sign-up → đăng ký free.

### 2.2. Tạo Pages project

- Vào https://dash.cloudflare.com → sidebar **Workers & Pages** → tab **Pages** → **Create application** → **Connect to Git**.
- Authorize GitHub → chọn repo `wotu-website` → **Begin setup**.
- Build configuration:
  - **Framework preset:** Astro
  - **Build command:** `npm run build`
  - **Build output directory:** `dist`
  - **Root directory:** *(để trống nếu repo root = `site/`. Nếu repo root khác, set thành `site`)*
  - **Environment variables:** `NODE_VERSION` = `22`
- Click **Save and Deploy**.
- Đợi 2-3 phút, build xong sẽ có URL `<random>.pages.dev`. Mở thử → site đã live.

### 2.3. Custom domain `www.wotu.vn`

- Trong Pages project → **Custom domains** → **Set up a custom domain** → nhập `www.wotu.vn` → Continue.
- Cloudflare hướng dẫn DNS:
  - Nếu domain đã trỏ Cloudflare nameservers → tự động.
  - Nếu chưa → vào registrar (vd Mắt Bão / Tenten / GoDaddy) → đổi nameserver sang Cloudflare provided.
- Đợi DNS propagate 5-30 phút. Sau đó https://www.wotu.vn → live.

**Migration tip:** wotu.vn hiện trỏ Google Sites. Trước khi đổi DNS, deploy thử lên `<random>.pages.dev` và test toàn bộ. Khi mọi thứ OK mới đổi nameserver — downtime chỉ vài phút lúc DNS propagate.

---

## Phase 3 — GitHub OAuth App cho CMS

CMS Sveltia cần GitHub OAuth để login. Setup 1 lần, ~5 phút.

### 3.1. Tạo OAuth App

- Vào https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.
- Application name: `WOTU CMS`
- Homepage URL: `https://www.wotu.vn`
- Authorization callback URL: `https://www.wotu.vn/admin/`
- Click **Register application**.
- Copy **Client ID** (vd `Iv1.abc123...`).
- **Không cần generate Client Secret** (PKCE flow không dùng secret).

### 3.2. Wire Client ID vào CMS config

Sửa file `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: <YOUR_USERNAME>/wotu-website     # ← username + repo thật
  branch: main
  auth_type: pkce
  app_id: 'Iv1.abc123...'                # ← Client ID vừa copy
```

Commit + push:

```bash
git add public/admin/config.yml
git commit -m "Wire GitHub OAuth Client ID into CMS"
git push
```

CF Pages tự rebuild trong 1-2 phút. Sau đó vào `https://www.wotu.vn/admin/` → click **Login with GitHub** → authorize → vào dashboard CMS.

---

## Phase 4 — Test round-trip edit

1. Vào `https://www.wotu.vn/admin/`, login.
2. Click **Trang chủ** → **Nội dung trang chủ** → **Quote** → đổi `text` (lời khách hàng) thành chuỗi test.
3. Click **Save** (góc trên phải) → click **Publish**.
4. Mở GitHub repo → tab **Commits** → thấy commit mới do Sveltia tạo (~5s sau Save).
5. Mở Cloudflare Pages dashboard → thấy deployment đang chạy (~1-2 phút).
6. Reload `https://www.wotu.vn/` → quote mới hiện ra.
7. Revert: vào GitHub → commit vừa tạo → click **Revert** → đợi 1-2 phút → quote về cũ.

Nếu cả 7 bước OK → CMS workflow hoạt động.

---

## Phase 5 — Tuỳ chọn: form Contact wire backend

Form Contact hiện tại chỉ alert. Để nhận email thật khi khách submit, có 3 lựa chọn:

| Provider | Free tier | Setup |
|---|---|---|
| **Formspree** | 50 submit/m | Tạo form ID → đổi `<form action="https://formspree.io/f/<id>" method="POST">` |
| **Web3Forms** | 250 submit/m | Tương tự Formspree |
| **Cloudflare Workers + Resend** | 100 email/day | Cần code Worker + đăng ký Resend |

Báo dev khi chọn provider để wire form action.

---

## Phase 6 — Tuỳ chọn polish

- **Sitemap.xml**: cài `@astrojs/sitemap` integration → auto-generate khi build.
- **Analytics**: Plausible (paid €9/m) hoặc Cloudflare Web Analytics (free, ngay trong CF dashboard).
- **Image optimization**: hiện ảnh upload vào git repo, OK đến ~50 dự án. Khi catalog lớn → migrate sang Cloudflare Images ($5/m cho 100k ảnh).

---

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân & fix |
|---|---|
| Build Cloudflare fail "Cannot find module" | Set NODE_VERSION env var = `22` |
| Build fail "yaml import error" | `@rollup/plugin-yaml` chưa install — `npm install` trước khi build |
| `/admin/` trắng trang | Mở DevTools console kiểm tra. Thường do CSP block unpkg → check `_headers` có `script-src ... https://unpkg.com` |
| Login GitHub OAuth báo "redirect_uri mismatch" | Callback URL trong OAuth App phải khớp **chính xác** với URL admin (kèm trailing `/`) |
| Sau Save trong CMS không thấy commit trên GitHub | Check token GitHub đã expire chưa, hoặc OAuth scope thiếu `repo` |
| Image upload vào git làm repo nặng | Nén ảnh trước qua tinypng.com. Hoặc migrate sang Cloudflare Images |

---

## Backup chiến lược

- **Code + content**: GitHub đã là source of truth. Có history vô hạn.
- **Daily backup ra Drive (optional)**: GitHub Action `gh-action-backup` chạy 1 tuần/lần, đẩy zip lên Google Drive — nice-to-have, không bắt buộc.
- **Rollback**: bất cứ lúc nào, vào GitHub → revert commit → site về cũ trong 1-2 phút.
