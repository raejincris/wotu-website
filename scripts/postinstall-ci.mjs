// Đảm bảo ./dist tồn tại trước khi `wrangler deploy` chạy trên Cloudflare
// Workers Builds.
//
// VẤN ĐỀ: Workers Builds đôi khi bỏ qua bước build (`npm run build`) do build
// cache nhiễm → ./dist không được sinh → `npx wrangler deploy` fail với
// "The directory specified by the assets.directory field does not exist".
// (Thử `build.command` trong wrangler.jsonc KHÔNG ăn trong CI vì cache khiến
// wrangler bỏ qua custom build — chỉ chạy khi deploy cục bộ.)
//
// GIẢI PHÁP: bước cài đặt phụ thuộc (`npm clean-install`) thì LUÔN chạy mỗi
// lần build, nên ta build site ngay trong `postinstall` → chắc chắn có dist
// trước khi deploy, miễn nhiễm build cache.
//
// Chỉ chạy trong môi trường CI/Cloudflare (CI=true, hoặc build tại
// /opt/buildhome) — `npm install` trên máy cục bộ KHÔNG bị build lây.
import { execSync } from 'node:child_process';

const inCI = Boolean(process.env.CI) || process.cwd().includes('buildhome');
if (!inCI) {
  process.exit(0);
}

console.log('[postinstall] Môi trường CI → build site tĩnh (npm run build)…');
execSync('npm run build', { stdio: 'inherit' });
