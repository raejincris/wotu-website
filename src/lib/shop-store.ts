/* WOTU Shop — cart + favorite store (client-side localStorage).
 *
 * Đây là mini-cart cho concept retail: chưa có backend / payment.
 * Dữ liệu persist trong localStorage, sync giữa các tab qua `storage` event.
 * Các page subscribe qua `onChange` để update UI khi cart đổi.
 */

const CART_KEY = 'wotu-shop-cart-v1';
const FAV_KEY = 'wotu-shop-fav-v1';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  img?: string;
  variant?: string;
  qty: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCart(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<CartItem[]>(localStorage.getItem(CART_KEY), []);
}

function writeCart(items: CartItem[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  notify();
}

function readFav(): string[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<string[]>(localStorage.getItem(FAV_KEY), []);
}

function writeFav(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  notify();
}

function notify(): void {
  listeners.forEach((l) => {
    try { l(); } catch { /* swallow */ }
  });
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(
  item: Omit<CartItem, 'qty'>,
  qty = 1,
): void {
  const items = readCart();
  const existing = items.find((x) => x.id === item.id && x.variant === item.variant);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ ...item, qty });
  }
  writeCart(items);
}

export function removeFromCart(id: string, variant?: string): void {
  const items = readCart().filter(
    (x) => !(x.id === id && x.variant === variant),
  );
  writeCart(items);
}

export function updateQty(id: string, qty: number, variant?: string): void {
  if (qty <= 0) {
    removeFromCart(id, variant);
    return;
  }
  const items = readCart();
  const it = items.find((x) => x.id === id && x.variant === variant);
  if (it) {
    it.qty = qty;
    writeCart(items);
  }
}

export function clearCart(): void {
  writeCart([]);
}

export function getCartCount(): number {
  return readCart().reduce((sum, x) => sum + x.qty, 0);
}

export function getCartTotal(): number {
  return readCart().reduce((sum, x) => sum + x.price * x.qty, 0);
}

export function getFavorites(): string[] {
  return readFav();
}

export function isFavorite(id: string): boolean {
  return readFav().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const ids = readFav();
  const i = ids.indexOf(id);
  if (i >= 0) {
    ids.splice(i, 1);
    writeFav(ids);
    return false;
  }
  ids.push(id);
  writeFav(ids);
  return true;
}

export function getFavoriteCount(): number {
  return readFav().length;
}

/** Subscribe to any cart/favorite change. Returns unsubscribe. */
export function onChange(cb: Listener): () => void {
  listeners.add(cb);
  // Cross-tab sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY || e.key === FAV_KEY) cb();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}

/** Parse "6.900.000đ" → 6900000 (used khi data hardcode trong markup). */
export function parsePriceString(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

/** Mini toast — non-blocking notification at top of viewport. */
export function toast(msg: string, opts: { type?: 'success' | 'info' | 'error' } = {}): void {
  if (typeof document === 'undefined') return;
  const root =
    document.getElementById('wotu-toast-root') ||
    (() => {
      const d = document.createElement('div');
      d.id = 'wotu-toast-root';
      d.style.cssText =
        'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(d);
      return d;
    })();
  const el = document.createElement('div');
  const bg =
    opts.type === 'error'
      ? '#A35E45'
      : opts.type === 'info'
        ? '#2A2520'
        : '#6B8E7A';
  el.style.cssText = `
    background:${bg};color:#FBF7F0;padding:12px 22px;border-radius:999px;
    font:600 14px/1 'Inter',system-ui,sans-serif;
    box-shadow:0 14px 30px -10px rgba(0,0,0,.25);
    opacity:0;transform:translateY(-12px);
    transition:opacity .25s ease,transform .25s ease;pointer-events:auto;
  `;
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-12px)';
    setTimeout(() => el.remove(), 250);
  }, 2400);
}
