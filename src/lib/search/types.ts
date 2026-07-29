/** Một mục trong product search index (/search-index.json). Dùng chung endpoint + client. */
export interface SearchEntry {
  type: 'product' | 'combo' | 'room';
  id: string;
  title: string;
  cat: string;
  catKey: string;
  room: string;
  priceNum: number | null;
  priceText: string;
  rating: number | null;
  reviews: number | null;
  stock: boolean;
  img: string;
  url: string;
  /** Text đã bỏ dấu để so khớp không dấu. */
  kw: string;
}
