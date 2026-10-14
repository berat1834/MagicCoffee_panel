import type { AdminOrder, Category, Dashboard, Machine, MachineDraft, MachineMode, MachineProduct, MachineProductOption, PosDevice, PosDeviceDraft, PosPairing, Product, ProductDraft, Report, StockMovement, VendJob, VendJobStatus } from './types';

const FORBIDDEN_PROJECT_MARKER = ['full', 'moon'].join('');
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://magiccoffee-api.onrender.com').replace(/\/$/, '');
export const KIOSK_URL = (import.meta.env.VITE_KIOSK_URL ?? 'http://127.0.0.1:5370').replace(/\/$/, '');
if (API_BASE_URL.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER) || KIOSK_URL.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER)) {
  throw new Error('MagicCoffee disindaki servis adresleri kullanilamaz.');
}
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

/** HTTP durum kodunu taşıyan API hatası (ör. 409 çakışma onayı için). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
    throw new ApiError(message || 'İşlem tamamlanamadı.', response.status);
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

// ---- Kahve otomatları: yanıt normalleştirme ----
type Raw = Record<string, unknown>;
const pick = (raw: Raw, ...keys: string[]) => { for (const key of keys) if (raw[key] !== undefined && raw[key] !== null) return raw[key]; return undefined; };
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const nullableText = (value: unknown) => { const result = text(value).trim(); return result || null; };
const num = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
const nullableNumber = (value: unknown) => { if (value === null || value === undefined || value === '') return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const result = search.toString();
  return result ? `?${result}` : '';
};
/** Liste yanıtı dizi veya { <anahtar>: [...] } olarak gelebilir. */
const rowsOf = (raw: unknown, ...keys: string[]): Raw[] => {
  if (Array.isArray(raw)) return raw as Raw[];
  if (raw && typeof raw === 'object') for (const key of keys) { const value = (raw as Raw)[key]; if (Array.isArray(value)) return value as Raw[]; }
  return [];
};
const MACHINE_MODES: MachineMode[] = ['AUTO', 'REMOTE', 'CREDIT'];
const machineMode = (value: unknown): MachineMode => { const mode = String(value ?? '').toUpperCase() as MachineMode; return MACHINE_MODES.includes(mode) ? mode : 'AUTO'; };

function normalizeMachine(raw: Raw): Machine {
  const detected = String(pick(raw, 'detectedMode', 'detected_mode') ?? '').toUpperCase();
  return {
    id: text(raw.id),
    name: text(raw.name),
    mode: machineMode(raw.mode),
    detectedMode: detected === 'REMOTE' || detected === 'CREDIT' ? detected : null,
    modeWarning: nullableText(pick(raw, 'modeWarning', 'mode_warning')),
    active: raw.active !== false,
    online: Boolean(raw.online),
    lastSeenAt: nullableText(pick(raw, 'lastSeenAt', 'last_seen_at')),
    agentVersion: nullableText(pick(raw, 'agentVersion', 'agent_version')),
    hasToken: Boolean(pick(raw, 'hasToken', 'has_token')),
    productCount: num(pick(raw, 'productCount', 'product_count')),
    activeJobCount: num(pick(raw, 'activeJobCount', 'active_job_count')),
    attentionCount: num(pick(raw, 'attentionCount', 'attention_count')),
    createdAt: nullableText(pick(raw, 'createdAt', 'created_at')),
    updatedAt: nullableText(pick(raw, 'updatedAt', 'updated_at')),
  };
}

const normalizeMachineProduct = (raw: Raw): MachineProduct => ({
  productId: text(pick(raw, 'productId', 'product_id')),
  optionKey: text(pick(raw, 'optionKey', 'option_key')),
  selectionNo: num(pick(raw, 'selectionNo', 'selection_no')),
  price: nullableNumber(raw.price),
  active: raw.active !== false,
});

const normalizeProductOption = (raw: Raw): MachineProductOption => ({
  optionKey: text(pick(raw, 'optionKey', 'option_key')),
  label: text(pick(raw, 'label', 'name')) || text(pick(raw, 'optionKey', 'option_key')),
  price: nullableNumber(pick(raw, 'price', 'unitPrice', 'unit_price')),
  mapped: Boolean(raw.mapped),
  selectionNo: nullableNumber(pick(raw, 'selectionNo', 'selection_no')),
  mappedPrice: nullableNumber(pick(raw, 'mappedPrice', 'mapped_price')),
});

const VEND_STATUSES: VendJobStatus[] = ['QUEUED', 'SENT', 'WAITING_SELECTION', 'DISPENSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED', 'REFUND_FAILED'];

function normalizeVendJob(raw: Raw): VendJob {
  const status = String(raw.status ?? '').toUpperCase() as VendJobStatus;
  return {
    id: text(raw.id),
    orderNumber: text(pick(raw, 'orderNumber', 'order_number')),
    machineId: text(pick(raw, 'machineId', 'machine_id')),
    productId: text(pick(raw, 'productId', 'product_id')),
    productName: text(pick(raw, 'productName', 'product_name')),
    variantLabel: text(pick(raw, 'variantLabel', 'variant_label', 'optionLabel', 'option_label')),
    selectionNo: nullableNumber(pick(raw, 'selectionNo', 'selection_no')),
    amount: num(raw.amount),
    status: VEND_STATUSES.includes(status) ? status : 'QUEUED',
    message: text(raw.message),
    attempts: num(raw.attempts),
    needsManualRefund: Boolean(pick(raw, 'needsManualRefund', 'needs_manual_refund')),
    createdAt: nullableText(pick(raw, 'createdAt', 'created_at')),
    updatedAt: nullableText(pick(raw, 'updatedAt', 'updated_at')),
  };
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

  // Kahve otomatları
  machines: () => request<unknown>('/api/admin/machines').then((raw) => rowsOf(raw, 'machines', 'items').map(normalizeMachine)),
  createMachine: (payload: MachineDraft) => request<Raw>('/api/admin/machines', { method: 'POST', body: JSON.stringify(payload) }).then(normalizeMachine),
  updateMachine: (id: string, payload: Partial<MachineDraft>) => request<Raw>(`/api/admin/machines/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }).then(normalizeMachine),
  deleteMachine: (id: string) => request<void>(`/api/admin/machines/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** Yeni köprü token'ı üretir; düz metin yalnız bu yanıtta döner. */
  createMachineToken: (id: string) => request<Raw>(`/api/admin/machines/${encodeURIComponent(id)}/token`, { method: 'POST', body: '{}' })
    .then((raw) => text(pick(raw ?? {}, 'token', 'machineToken', 'machine_token'))),
  machineProducts: (id: string) => request<unknown>(`/api/admin/machines/${encodeURIComponent(id)}/products`).then((raw) => rowsOf(raw, 'products', 'items', 'mappings').map(normalizeMachineProduct)),
  saveMachineProducts: (id: string, products: MachineProduct[]) =>
    request<unknown>(`/api/admin/machines/${encodeURIComponent(id)}/products`, { method: 'PUT', body: JSON.stringify({ products }) }).then((raw) => rowsOf(raw, 'products', 'items', 'mappings').map(normalizeMachineProduct)),
  machineProductOptions: (id: string, productId: string) =>
    request<unknown>(`/api/admin/machines/${encodeURIComponent(id)}/products/options${query({ productId })}`).then((raw) => rowsOf(raw, 'options', 'items').map(normalizeProductOption)),
  vendJobs: (params: { machine?: string; status?: string }) => request<unknown>(`/api/admin/vend-jobs${query(params)}`).then((raw) => rowsOf(raw, 'jobs', 'items').map(normalizeVendJob)),
  /** force: önceki iade sonucu belirsizken (409) kullanıcı onayıyla zorla yeniden dener. */
  retryVendRefund: (id: string, force = false) => request<Raw>(`/api/admin/vend-jobs/${encodeURIComponent(id)}/retry-refund${force ? '?force=true' : ''}`, { method: 'POST', body: '{}' }),
};

export function assetUrl(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path.toLowerCase().includes(FORBIDDEN_PROJECT_MARKER) ? '' : path;
  if (path.startsWith('/uploads/')) return apiUrl(path);
  if (path.startsWith('/images/')) return path;
  return `${KIOSK_URL}${path}`;
}
