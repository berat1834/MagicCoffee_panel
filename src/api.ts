import type { AdminOrder, Category, Dashboard, PosDevice, PosDeviceDraft, PosPairing, Product, ProductDraft, Report, StockMovement } from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://magiccoffee-api.onrender.com').replace(/\/$/, '');
export const KIOSK_URL = (import.meta.env.VITE_KIOSK_URL ?? 'http://127.0.0.1:5370').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || detail?.Message;
    throw new Error(message || 'İşlem tamamlanamadı.');
  }
  return response.json() as Promise<T>;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Görsel dosyası okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export const api = {
  health: () => request<{ status: string; database: string }>('/health'),
  dashboard: () => request<Dashboard>('/api/admin/dashboard'),
  categories: () => request<Category[]>('/api/admin/categories'),
  createCategory: (payload: Partial<Category>) => request<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: Partial<Category>) => request<Category>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id: string, deleteProducts = false) => request<void>(`/api/admin/categories/${id}${deleteProducts ? '?deleteProducts=true' : ''}`, { method: 'DELETE' }),
  reorderCategories: (ids: string[]) => request('/api/admin/categories/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  products: () => request<Product[]>('/api/admin/products'),
  createProduct: (payload: ProductDraft) => request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: Partial<ProductDraft>) => request<Product>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id: string) => request<void>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  stock: () => request<Product[]>('/api/admin/stock'),
  adjustStock: (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) =>
    request<Product>(`/api/admin/stock/${id}/adjust`, { method: 'POST', body: JSON.stringify(payload) }),
  updateStockSettings: (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) =>
    request<Product>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  uploadProductImage: async (file: File) => {
    if (file.size > 5 * 1024 * 1024) throw new Error('Görsel boyutu en fazla 5 MB olabilir.');
    const dataUrl = await readAsDataUrl(file);
    return request<{ path: string }>('/api/admin/uploads/product-image', {
      method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl }),
    });
  },
  stockMovements: () => request<StockMovement[]>('/api/admin/stock/movements'),
  orders: () => request<AdminOrder[]>('/api/admin/orders'),
  reports: (start: string, end: string) => request<Report>(`/api/admin/reports?start=${start}&end=${end}`),
  posDevices: () => request<PosDevice[]>('/api/admin/pos/devices'),
  refreshPosDeviceStatus: () => request<{ success: boolean }>('/api/admin/pos/devices/refresh-status', { method: 'POST' }),
  createPosDevice: (payload: PosDeviceDraft) => request<PosDevice>('/api/admin/pos/devices', { method: 'POST', body: JSON.stringify(payload) }),
  updatePosDevice: (id: string, payload: Partial<PosDeviceDraft>) => request<PosDevice>(`/api/admin/pos/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePosDevice: (id: string) => request<void>(`/api/admin/pos/devices/${id}`, { method: 'DELETE' }),
  pairPosDevice: (id: string, fingerprint: string) => request<PosPairing>(`/api/admin/pos/devices/${id}/pair`, { method: 'POST', body: JSON.stringify({ fingerprint }) }),
  checkPosPairing: (id: string, pairingId: number) => request<{ approved: boolean; active: boolean; message?: string }>(`/api/admin/pos/devices/${id}/pair/check`, { method: 'POST', body: JSON.stringify({ pairingId }) }),
};

export function assetUrl(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/uploads/')) return apiUrl(path);
  return `${KIOSK_URL}${path}`;
}
