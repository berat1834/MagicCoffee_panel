import type {
  AdminOrder,
  CastlesDevice,
  CastlesDeviceDraft,
  Category,
  Dashboard,
  Filters,
  Kiosk,
  KioskUpdate,
  Product,
  ProductDraft,
  Report,
  Section,
  SectionDraft,
  StockMovement,
} from './types';

const FORBIDDEN_PROJECT_MARKER = ['full', 'moon'].join('');
// Panel API'ye varsayılan olarak kendi adresi (nginx proxy) üzerinden, göreli yolla bağlanır.
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const KIOSK_URL = (import.meta.env.VITE_KIOSK_URL ?? '').replace(/\/$/, '');
if (API_BASE_URL.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER) || KIOSK_URL.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER)) {
  throw new Error('MagicPay Kiosk disindaki servis adresleri kullanilamaz.');
}
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

/** HTTP durum kodunu da taşıyan API hatası (ör. 409 çakışmaları için). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Gönderilen bilgiler geçersiz.',
  403: 'Bu işlem için yetkiniz yok.',
  404: 'Kayıt bulunamadı.',
  409: 'Kayıt başka bir kayıtla çakışıyor.',
  422: 'Gönderilen bilgiler geçersiz.',
  503: 'Sunucu meşgul, lütfen tekrar deneyin.',
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.', 0);
  }
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? '' : detail?.message || detail?.Message;
    throw new ApiError(message || STATUS_MESSAGES[response.status] || 'İşlem tamamlanamadı.', response.status);
  }
  return response.json() as Promise<T>;
}

function query(params: Record<string, string | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : '';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Görsel dosyası okunamadı.'));
    reader.readAsDataURL(file);
  });
}

// ---- Yanıt normalizasyonu: API camelCase döndürür; snake_case gelirse de tolere edilir. ----
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const pick = (raw: Raw, ...keys: string[]) => { for (const key of keys) if (raw[key] !== undefined) return raw[key]; return undefined; };
const num = (value: unknown) => { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; };
const text = (value: unknown) => (value == null ? '' : String(value));
const nullableText = (value: unknown) => (value == null || value === '' ? null : String(value));

export const normalizeSerial = (serial?: string | null) => (serial ?? '').replace(/\D/g, '').slice(-12);

export function normalizeSection(raw: Raw): Section {
  return {
    id: text(raw.id),
    name: text(raw.name),
    nameEn: text(pick(raw, 'nameEn', 'name_en')),
    tagline: text(raw.tagline),
    taglineEn: text(pick(raw, 'taglineEn', 'tagline_en')),
    icon: text(raw.icon) || 'Store',
    accent: text(raw.accent) || '#684cf0',
    orderPrefix: text(pick(raw, 'orderPrefix', 'order_prefix')),
    position: num(raw.position),
    active: raw.active !== false,
    productCount: num(pick(raw, 'productCount', 'product_count')),
    categoryCount: num(pick(raw, 'categoryCount', 'category_count')),
  };
}

export function normalizeKiosk(raw: Raw): Kiosk {
  return {
    id: text(raw.id),
    name: text(raw.name),
    featuredSectionId: text(pick(raw, 'featuredSectionId', 'featured_section_id')),
    posSerial: nullableText(pick(raw, 'posSerial', 'pos_serial')),
    active: raw.active !== false,
    lastSeenAt: nullableText(pick(raw, 'lastSeenAt', 'last_seen_at')),
    online: Boolean(raw.online),
    orderPrefix: text(pick(raw, 'orderPrefix', 'order_prefix')),
    todayOrderCount: num(pick(raw, 'todayOrderCount', 'today_order_count')),
    todayRevenue: num(pick(raw, 'todayRevenue', 'today_revenue')),
    appVersion: nullableText(pick(raw, 'appVersion', 'app_version')),
  };
}

export function normalizeDevice(raw: Raw): CastlesDevice {
  return {
    serial: text(raw.serial),
    name: text(raw.name),
    active: raw.active !== false,
    createdAt: nullableText(pick(raw, 'createdAt', 'created_at')),
    updatedAt: nullableText(pick(raw, 'updatedAt', 'updated_at')),
    assignedKioskId: nullableText(pick(raw, 'assignedKioskId', 'assigned_kiosk_id')),
  };
}

const normalizeCategory = (raw: Raw): Category => ({
  ...(raw as Category),
  sectionId: text(pick(raw, 'sectionId', 'section_id')),
  productCount: num(pick(raw, 'productCount', 'product_count')),
});

const normalizeProduct = (raw: Raw): Product => ({
  ...(raw as Product),
  sectionId: text(pick(raw, 'sectionId', 'section_id')),
});

function normalizeOrder(raw: Raw): AdminOrder {
  const sections = pick(raw, 'sectionIds', 'section_ids');
  let sectionIds: string[] = [];
  if (Array.isArray(sections)) sectionIds = sections.map(String);
  else if (typeof sections === 'string' && sections) {
    try { const parsed = JSON.parse(sections); sectionIds = Array.isArray(parsed) ? parsed.map(String) : [sections]; }
    catch { sectionIds = sections.split(',').map((item) => item.trim()).filter(Boolean); }
  }
  return {
    ...(raw as AdminOrder),
    total: num(raw.total),
    kioskId: nullableText(pick(raw, 'kioskId', 'kiosk_id')),
    sectionIds,
  };
}

function normalizeDashboard(raw: Raw): Dashboard {
  const kioskRows: Raw[] = pick(raw, 'kiosks', 'kioskSummary', 'kiosk_summary', 'perKiosk') ?? [];
  const sectionRows: Raw[] = pick(raw, 'sections', 'sectionSummary', 'section_summary', 'perSection') ?? [];
  return {
    stats: raw.stats ?? { product_count: 0, active_product_count: 0, category_count: 0, low_stock_count: 0, today_order_count: 0, today_revenue: 0 },
    recentOrders: (raw.recentOrders ?? raw.recent_orders ?? []).map(normalizeOrder),
    topProducts: raw.topProducts ?? raw.top_products ?? [],
    kiosks: Array.isArray(kioskRows) ? kioskRows.map((row) => ({
      kioskId: text(pick(row, 'kioskId', 'kiosk_id', 'id')),
      orderCount: num(pick(row, 'orderCount', 'order_count', 'todayOrderCount', 'today_order_count')),
      revenue: num(pick(row, 'revenue', 'todayRevenue', 'today_revenue')),
    })) : [],
    sections: Array.isArray(sectionRows) ? sectionRows.map((row) => ({
      sectionId: text(pick(row, 'sectionId', 'section_id', 'id')),
      orderCount: num(pick(row, 'orderCount', 'order_count')),
      revenue: num(pick(row, 'revenue', 'todayRevenue', 'today_revenue')),
    })) : [],
  };
}

const sectionPayload = (draft: Partial<SectionDraft>) => JSON.stringify(draft);

export const api = {
  health: () => request<{ status: string; database?: string }>('/health'),

  // Kiosklar
  kiosks: () => request<Raw[]>('/api/admin/kiosks').then((rows) => rows.map(normalizeKiosk)),
  updateKiosk: (id: string, payload: KioskUpdate) =>
    request<Raw>(`/api/admin/kiosks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeKiosk),

  // Ana kategoriler (sections)
  sections: () => request<Raw[]>('/api/admin/sections').then((rows) => rows.map(normalizeSection).sort((a, b) => a.position - b.position)),
  createSection: (payload: SectionDraft) => request<Raw>('/api/admin/sections', { method: 'POST', body: sectionPayload(payload) }).then(normalizeSection),
  updateSection: (id: string, payload: Partial<SectionDraft>) =>
    request<Raw>(`/api/admin/sections/${encodeURIComponent(id)}`, { method: 'PUT', body: sectionPayload(payload) }).then(normalizeSection),
  deleteSection: (id: string) => request<void>(`/api/admin/sections/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorderSections: (ids: string[]) => request('/api/admin/sections/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Castles POS cihazları
  devices: () => request<Raw[]>('/api/admin/castles/devices').then((rows) => rows.map(normalizeDevice)),
  createDevice: (payload: CastlesDeviceDraft) => request<Raw>('/api/admin/castles/devices', { method: 'POST', body: JSON.stringify(payload) }).then(normalizeDevice),
  updateDevice: (serial: string, payload: Partial<Omit<CastlesDeviceDraft, 'serial'>>) =>
    request<Raw>(`/api/admin/castles/devices/${encodeURIComponent(serial)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeDevice),
  deleteDevice: (serial: string) => request<void>(`/api/admin/castles/devices/${encodeURIComponent(serial)}`, { method: 'DELETE' }),

  // Gösterge / sipariş / rapor (kiosk + kategori filtreli)
  dashboard: (filters: Filters) => request<Raw>(`/api/admin/dashboard${query(filters)}`).then(normalizeDashboard),
  orders: (filters: Filters) => request<Raw[]>(`/api/admin/orders${query(filters)}`).then((rows) => rows.map(normalizeOrder)),
  reports: (start: string, end: string, filters: Filters) => request<Report>(`/api/admin/reports${query({ start, end, ...filters })}`),

  // Alt kategoriler
  categories: (section?: string) => request<Raw[]>(`/api/admin/categories${query({ section })}`).then((rows) => rows.map(normalizeCategory)),
  createCategory: (payload: Partial<Category>) => request<Raw>('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) }).then(normalizeCategory),
  updateCategory: (id: string, payload: Partial<Category>) => request<Raw>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeCategory),
  deleteCategory: (id: string, deleteProducts = false) => request<void>(`/api/admin/categories/${encodeURIComponent(id)}${deleteProducts ? '?deleteProducts=true' : ''}`, { method: 'DELETE' }),
  reorderCategories: (ids: string[]) => request('/api/admin/categories/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Ürünler ve stok
  products: (section?: string) => request<Raw[]>(`/api/admin/products${query({ section })}`).then((rows) => rows.map(normalizeProduct)),
  createProduct: (payload: ProductDraft) => request<Raw>('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }).then(normalizeProduct),
  updateProduct: (id: string, payload: Partial<ProductDraft>) => request<Raw>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeProduct),
  deleteProduct: (id: string) => request<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  stock: (section?: string) => request<Raw[]>(`/api/admin/stock${query({ section })}`).then((rows) => rows.map(normalizeProduct)),
  adjustStock: (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) =>
    request<Raw>(`/api/admin/stock/${encodeURIComponent(id)}/adjust`, { method: 'POST', body: JSON.stringify(payload) }).then(normalizeProduct),
  updateStockSettings: (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) =>
    request<Raw>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeProduct),
  stockMovements: (section?: string) => request<StockMovement[]>(`/api/admin/stock/movements${query({ section })}`),
  uploadProductImage: async (file: File) => {
    if (file.size > 5 * 1024 * 1024) throw new Error('Görsel boyutu en fazla 5 MB olabilir.');
    const dataUrl = await readAsDataUrl(file);
    return request<{ path: string }>('/api/admin/uploads/product-image', {
      method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl }),
    });
  },
};

export function assetUrl(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER) ? '' : path;
  if (path.startsWith('/uploads/')) return apiUrl(path);
  if (path.startsWith('/images/')) return path;
  return KIOSK_URL ? `${KIOSK_URL}${path}` : path;
}
