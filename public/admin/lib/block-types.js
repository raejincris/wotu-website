/**
 * lib/block-types.js — danh mục loại khối nội dung (Phase 2 page-builder).
 * Mỗi loại: nhãn + icon + danh sách field (sinh form trong admin) + giá trị mặc định.
 * Component render tương ứng ở src/components/shop/blocks/ + BlockRenderer REGISTRY.
 * Thêm loại khối mới = thêm 1 entry ở đây + 1 component + 1 dòng registry.
 */
export const BLOCK_TYPES = {
  richText: {
    label: 'Văn bản',
    icon: '📝',
    desc: 'Eyebrow + tiêu đề + đoạn văn',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow (dòng nhỏ)', type: 'text' },
      { key: 'heading', label: 'Tiêu đề', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'body', label: 'Nội dung', type: 'area', hint: 'Cho phép &lt;em&gt;, &lt;a&gt;, &lt;br/&gt;' },
      { key: 'align', label: 'Căn lề', type: 'select', options: [
        { value: 'left', label: 'Trái' }, { value: 'center', label: 'Giữa' },
      ] },
    ],
    defaults: { eyebrow: '', heading: 'Tiêu đề mới', body: 'Nội dung khối…', align: 'left' },
  },
  bannerCta: {
    label: 'Banner CTA',
    icon: '📣',
    desc: 'Tiêu đề + phụ đề + nút kêu gọi',
    fields: [
      { key: 'heading', label: 'Tiêu đề', type: 'text', hint: 'Cho phép &lt;em&gt;' },
      { key: 'sub', label: 'Phụ đề', type: 'area' },
      { key: 'btnLabel', label: 'Chữ trên nút', type: 'text' },
      { key: 'btnHref', label: 'Link nút', type: 'text', hint: 'VD: /combo/ hoặc #contact' },
      { key: 'tone', label: 'Tông màu', type: 'select', options: [
        { value: 'accent', label: 'Nhấn (terracotta)' },
        { value: 'dark', label: 'Tối' },
        { value: 'soft', label: 'Kem nhạt' },
      ] },
    ],
    defaults: { heading: 'Ưu đãi đặc biệt', sub: '', btnLabel: 'Xem ngay', btnHref: '/combo/', tone: 'accent' },
  },
};

/** Tóm tắt 1 khối để hiện trong danh sách (admin Bố cục / Khối). */
export function blockSummary(block) {
  const t = BLOCK_TYPES[block?.type];
  const label = t?.label || block?.type || 'Khối';
  const text = (block?.heading || block?.btnLabel || '').replace(/<[^>]+>/g, '').trim();
  return `${t?.icon || '🧩'} ${label}${text ? ' — ' + text.slice(0, 30) : ''}`;
}
