# WOTU CMS Auth — OAuth bridge

Cloudflare Worker xử lý GitHub OAuth flow cho Sveltia CMS. Cần thiết vì GitHub không hỗ trợ PKCE — phải có server giữ Client Secret.

Dựa trên [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (MIT).

## Deploy lần đầu

Xem [`../DEPLOY.md`](../DEPLOY.md) — Phase 3.

Tóm tắt:
1. Tạo Client Secret cho GitHub OAuth App (https://github.com/settings/developers).
2. Vào CF dashboard → Compute → Workers → Create Worker (hoặc `wrangler deploy` từ folder này).
3. Set 2 env secret cho Worker: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
4. Update GitHub OAuth App callback URL → `https://wotu-cms-auth.<account>.workers.dev/callback`.
5. Update site `public/admin/config.yml` — thay `auth_type: pkce` bằng `base_url: https://<worker-url>` và `auth_endpoint: auth`.
