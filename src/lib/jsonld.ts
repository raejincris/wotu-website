/**
 * Serialize object thành chuỗi JSON-LD AN TOÀN để nhúng vào
 * `<script type="application/ld+json" set:html={...}>`.
 *
 * `JSON.stringify` thuần KHÔNG escape `</script>` — nếu data (vd description/title
 * từ YAML) lỡ chứa chuỗi đó, HTML parser sẽ đóng thẻ <script> sớm → vỡ trang +
 * có thể XSS. Escape `<` thành `<` chặn cả `</script>` lẫn `<!--`.
 */
export function jsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
