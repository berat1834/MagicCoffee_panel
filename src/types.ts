export type ViewKey = 'dashboard' | 'products' | 'categories' | 'stock' | 'orders' | 'reports' | 'pos-terminals' | 'machines' | 'settings';

export type PosProvider = 'PAVO_CLOUD';
export type PosStatus = 'ACTIVE' | 'PASSIVE' | 'MAINTENANCE';

export type PosDevice = {
  id: string;
  name: string;
  providerType: PosProvider;
  serialNumber: string | null;
  ipAddress: string | null;
  port: number | null;
  status: PosStatus;
  isDefault: boolean;
  cloudSourceFingerprint: string | null;
  cloudPairingId: number | null;
  paired: boolean;
};

export type PosDeviceDraft = {
  name: string;
  providerType: PosProvider;
  serialNumber: string | null;
  ipAddress: string | null;
  port: number | null;
  status: PosStatus;
  isDefault: boolean;
};

export type PosPairing = {
  success: boolean;
  pairingId: number;
  pairingCode: string;
  message: string;
};

export type Category = {
  id: string;
  name: string;
  eyebrow: string;
  position: number;
  active: boolean;
  productCount: number;
};

export type ProductKind = 'coffee' | 'cold-coffee' | 'simple';

export type CustomizationOption = {
  id: string;
  name: string;
  priceDelta: number;
  defaultSelected: boolean;
  enabled: boolean;
  sourceProductId?: string | null;
  image?: string | null;
  available?: boolean;
  unavailableReason?: string | null;
};

export type CustomizationStep = {
  enabled: boolean;
  title: string;
  options: CustomizationOption[];
};

export type ProductCustomization = {
  content: CustomizationStep;
  sides: CustomizationStep;
  drinks: CustomizationStep;
};

export type Product = {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  emoji?: string;
  kind: ProductKind;
  group?: 'can' | 'liter';
  protein?: string;
  patties?: number;
  serves?: number;
  customizable: boolean;
  popular: boolean;
  active: boolean;
  position: number;
  stockQuantity: number | null;
  criticalStock: number | null;
  stockTrackingEnabled: boolean;
  stockSellable: boolean;
  available: boolean;
  unavailableReason?: string | null;
  customization: ProductCustomization;
};

export type Dashboard = {
  stats: {
    product_count: number;
    active_product_count: number;
    category_count: number;
    low_stock_count: number;
    today_order_count: number;
    today_revenue: number;
  };
  recentOrders: AdminOrder[];
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  /** Kahve otomatı özeti (API göndermezse yok). */
  vending?: { attentionCount: number; machineCount: number; onlineMachineCount: number } | null;
};

export type AdminOrder = {
  number: string;
  status: string;
  fulfillment: string;
  payment_method: string;
  total: number;
  created_at: string;
  item_count?: number;
};

export type StockMovement = {
  id: number;
  product_id: string;
  product_name: string;
  movement_type: string;
  quantity: number;
  before_quantity: number | null;
  after_quantity: number | null;
  note: string;
  created_at: string;
};

export type Report = {
  start: string;
  end: string;
  summary: { order_count: number; revenue: number; average_order: number };
  products: Array<{ product_id: string; name: string; category: string; quantity: number; revenue: number }>;
  daily: Array<{ day: string; order_count: number; revenue: number }>;
};

export type ProductDraft = Omit<Product, 'id' | 'categoryName' | 'available' | 'unavailableReason' | 'position'> & { id?: string };

/** Otomat satış modu: AUTO (köprü tespit eder) / REMOTE (MDB 4.3 uzaktan seçim) / CREDIT (müşteri makinede düğmeye basar). */
export type MachineMode = 'AUTO' | 'REMOTE' | 'CREDIT';

/** API: /api/admin/machines */
export type Machine = {
  id: string;
  name: string;
  mode: MachineMode;
  detectedMode: 'REMOTE' | 'CREDIT' | null;
  /** API'nin mod uyarısı (ör. kredi modunda müşterinin düğmeye basması gerektiği). */
  modeWarning: string | null;
  active: boolean;
  online: boolean;
  lastSeenAt: string | null;
  agentVersion: string | null;
  hasToken: boolean;
  productCount: number;
  activeJobCount: number;
  attentionCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MachineDraft = { id?: string; name: string; mode: MachineMode; active: boolean };

/** Ürün (veya ürün × seçenek kombinasyonu) → makine ürün numarası eşlemesi. optionKey boşsa ürünün standart hali. */
export type MachineProduct = { productId: string; optionKey: string; selectionNo: number; price: number | null; active: boolean };

/** GET /api/admin/machines/{id}/products/options?productId= : ürünün seçenek kombinasyonları. */
export type MachineProductOption = { optionKey: string; label: string; price: number | null; mapped: boolean; selectionNo: number | null; mappedPrice: number | null };

export type VendJobStatus = 'QUEUED' | 'SENT' | 'WAITING_SELECTION' | 'DISPENSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'REFUND_FAILED';

/** API: /api/admin/vend-jobs */
export type VendJob = {
  id: string;
  orderNumber: string;
  machineId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  selectionNo: number | null;
  amount: number;
  status: VendJobStatus;
  message: string;
  attempts: number;
  needsManualRefund: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};
