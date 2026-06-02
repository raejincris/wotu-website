/**
 * section-layout.ts — giải mã `layout` (bật/tắt + thứ tự section) cho trang chủ.
 *
 * `layout` là mảng [{ id, on }] do admin sửa. Hàm trả về 2 helper:
 *   on(id)    → section có hiển thị không (mặc định true)
 *   order(id) → chỉ số thứ tự để gắn CSS `order` (số nhỏ = lên trên)
 *
 * Robust: id mặc định thiếu trong `layout` (vd section mới thêm sau) vẫn hiện,
 * xếp cuối theo thứ tự defaults — không bao giờ "mất" section ngoài ý muốn.
 */
export interface LayoutItem { id: string; on?: boolean; }

export function resolveLayout(layout: unknown, defaults: string[]) {
  const base: LayoutItem[] = Array.isArray(layout) && layout.length
    ? (layout as LayoutItem[]).filter((s) => s && typeof s.id === 'string')
    : defaults.map((id) => ({ id, on: true }));

  // Bổ sung id mặc định còn thiếu (giữ nguyên thứ tự defaults), tránh mất section.
  const seen = new Set(base.map((s) => s.id));
  defaults.forEach((id) => { if (!seen.has(id)) base.push({ id, on: true }); });

  const orderMap = new Map(base.map((s, i) => [s.id, i]));
  const onMap = new Map(base.map((s) => [s.id, s.on !== false]));

  return {
    on: (id: string) => (onMap.has(id) ? !!onMap.get(id) : true),
    order: (id: string) => (orderMap.has(id) ? orderMap.get(id)! : defaults.indexOf(id)),
  };
}
