/**
 * Chuẩn hoá text cho tìm kiếm KHÔNG DẤU tiếng Việt.
 * Dùng chung 2 nơi:
 *  - Build-time: sinh field `kw` cho product index (search-index.json).
 *  - Client: chuẩn hoá query người dùng gõ trước khi so khớp với `kw`.
 * Nhờ vậy "sofa may" khớp "Sofa Mây", "ban an" khớp "Bàn ăn".
 */

/**
 * Bỏ dấu thanh + dấu mũ tiếng Việt, đưa đ/Đ về d.
 * NFD tách ký tự nền khỏi dấu kết hợp (U+0300–U+036F) rồi xoá dấu.
 */
export function stripDiacritics(input: string): string {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hoá đầy đủ để so khớp: bỏ dấu → thường → gộp khoảng trắng → trim.
 * Giữ chữ-số và khoảng trắng; ký tự khác (·, ", -, …) đổi thành khoảng trắng
 * để token tách sạch ("sofa·3-cho" → "sofa 3 cho").
 */
export function normalizeText(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách query thành các token đã chuẩn hoá (bỏ token rỗng).
 * Dùng cho so khớp AND: mọi token phải xuất hiện trong `kw`.
 */
export function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(' ') : [];
}
