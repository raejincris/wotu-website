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
  quote: {
    label: 'Trích dẫn',
    icon: '❝',
    desc: 'Câu trích nổi bật + tên người + vai trò',
    fields: [
      { key: 'text', label: 'Câu trích', type: 'area', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'author', label: 'Tên người nói', type: 'text' },
      { key: 'role', label: 'Vai trò / chú thích', type: 'text', hint: 'VD: Khách hàng tại Quy Nhơn' },
    ],
    defaults: { text: 'Một câu trích dẫn đáng nhớ…', author: '', role: '' },
  },
  imageText: {
    label: 'Ảnh + Văn bản',
    icon: '🖼️',
    desc: 'Ảnh một bên + tiêu đề/nội dung/nút bên kia',
    fields: [
      { key: 'image', label: 'Ảnh', type: 'image' },
      { key: 'imageAlt', label: 'Mô tả ảnh (alt)', type: 'text', hint: 'Cho SEO & trình đọc màn hình' },
      { key: 'imageSide', label: 'Ảnh nằm bên', type: 'select', options: [
        { value: 'left', label: 'Trái' }, { value: 'right', label: 'Phải' },
      ] },
      { key: 'eyebrow', label: 'Eyebrow (dòng nhỏ)', type: 'text' },
      { key: 'heading', label: 'Tiêu đề', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'body', label: 'Nội dung', type: 'area', hint: 'Cho phép &lt;em&gt;, &lt;a&gt;, &lt;br/&gt;' },
      { key: 'btnLabel', label: 'Chữ trên nút (tuỳ chọn)', type: 'text' },
      { key: 'btnHref', label: 'Link nút', type: 'text', hint: 'VD: /san-pham/ hoặc #contact' },
    ],
    defaults: { image: '', imageAlt: '', imageSide: 'left', eyebrow: '', heading: 'Tiêu đề mới', body: 'Nội dung khối…', btnLabel: '', btnHref: '' },
  },
  gallery: {
    label: 'Bộ sưu tập ảnh',
    icon: '🖾',
    desc: 'Lưới nhiều ảnh (2/3/4 cột), mỗi ảnh có chú thích',
    fields: [
      { key: 'heading', label: 'Tiêu đề (tuỳ chọn)', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'columns', label: 'Số cột', type: 'select', options: [
        { value: '2', label: '2 cột' }, { value: '3', label: '3 cột' }, { value: '4', label: '4 cột' },
      ] },
      { key: 'items', label: 'Ảnh trong bộ sưu tập', type: 'imageList',
        hint: 'Mỗi ảnh có chú thích tuỳ chọn. Ảnh mới cần Lưu mới hiện trên web.' },
    ],
    defaults: { heading: '', columns: '3', items: [] },
  },
  stats: {
    label: 'Số liệu nổi bật',
    icon: '📊',
    desc: 'Hàng các con số ấn tượng (vd 500+ tổ ấm)',
    fields: [
      { key: 'heading', label: 'Tiêu đề (tuỳ chọn)', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'items', label: 'Các con số', type: 'list', itemLabel: 'Thêm số liệu',
        itemFields: [
          { key: 'value', label: 'Con số', type: 'text' },
          { key: 'label', label: 'Nhãn', type: 'text' },
        ] },
    ],
    defaults: { heading: '', items: [
      { value: '500+', label: 'Tổ ấm đã hoàn thiện' },
      { value: '4+', label: 'Năm kinh nghiệm' },
      { value: '5★', label: 'Đánh giá khách hàng' },
    ] },
  },
  features: {
    label: 'Điểm nổi bật',
    icon: '✨',
    desc: 'Lưới thẻ: icon + tiêu đề + mô tả ngắn',
    fields: [
      { key: 'heading', label: 'Tiêu đề (tuỳ chọn)', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'items', label: 'Các điểm nổi bật', type: 'list', itemLabel: 'Thêm điểm',
        itemFields: [
          { key: 'icon', label: 'Icon (emoji)', type: 'text', hint: 'VD: 🛋️ 🚚 🛡️' },
          { key: 'heading', label: 'Tiêu đề', type: 'text' },
          { key: 'text', label: 'Mô tả', type: 'area' },
        ] },
    ],
    defaults: { heading: '', items: [
      { icon: '🛋️', heading: 'Tiêu đề điểm 1', text: 'Mô tả ngắn cho điểm nổi bật.' },
    ] },
  },
  faq: {
    label: 'Câu hỏi thường gặp',
    icon: '❓',
    desc: 'Accordion hỏi–đáp, phát JSON-LD FAQPage cho SEO',
    fields: [
      { key: 'heading', label: 'Tiêu đề (tuỳ chọn)', type: 'text', hint: 'Cho phép &lt;em&gt; in nghiêng' },
      { key: 'items', label: 'Các câu hỏi', type: 'list', itemLabel: 'Thêm câu hỏi',
        itemFields: [
          { key: 'question', label: 'Câu hỏi', type: 'text' },
          { key: 'answer', label: 'Trả lời', type: 'area', hint: 'Cho phép &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, &lt;a&gt;' },
          { key: 'open', label: 'Mở sẵn?', type: 'select', options: [
            { value: false, label: 'Không' }, { value: true, label: 'Có' },
          ] },
        ] },
    ],
    defaults: { heading: '', items: [
      { question: 'Câu hỏi mẫu?', answer: '<p>Câu trả lời mẫu.</p>', open: false },
    ] },
  },
  spacer: {
    label: 'Giãn cách',
    icon: '↕️',
    desc: 'Khoảng trống giữa các phần, tuỳ chọn đường kẻ',
    fields: [
      { key: 'size', label: 'Độ cao', type: 'select', options: [
        { value: 'small', label: 'Nhỏ' }, { value: 'medium', label: 'Vừa' }, { value: 'large', label: 'Lớn' },
      ] },
      { key: 'line', label: 'Đường kẻ mảnh', type: 'select', options: [
        { value: 'no', label: 'Không' }, { value: 'yes', label: 'Có' },
      ] },
    ],
    defaults: { size: 'medium', line: 'no' },
  },
};

/** Tóm tắt 1 khối để hiện trong danh sách (admin Bố cục / Khối). */
export function blockSummary(block) {
  const t = BLOCK_TYPES[block?.type];
  const label = t?.label || block?.type || 'Khối';
  const raw = block?.heading || block?.text || block?.btnLabel || block?.author || '';
  let text = String(raw).replace(/<[^>]+>/g, '').trim();
  if (!text && Array.isArray(block?.items)) {
    const unit = block?.type === 'gallery' ? 'ảnh' : 'mục';
    text = `${block.items.length} ${unit}`;
  }
  return `${t?.icon || '🧩'} ${label}${text ? ' — ' + text.slice(0, 30) : ''}`;
}
