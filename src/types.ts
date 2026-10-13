export type ViewKey = 'dashboard' | 'kiosks' | 'sections' | 'categories' | 'products' | 'stock' | 'orders' | 'reports' | 'pos-devices' | 'settings';

/** Global üst filtre: boş dize "Tümü" anlamına gelir. */
export type Filters = { kiosk: string; section: string };

/** 17 ana kategoriden biri (API: /api/admin/sections). */
export type Section = {
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  icon: string;
  accent: string;
  orderPrefix: string;
  position: number;
  active: boolean;
  productCount: number;
  categoryCount: number;
};

export type SectionDraft = {
  id?: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  icon: string;
  accent: string;
  orderPrefix: string;
  active: boolean;
};

/** API: /api/admin/kiosks */
export type Kiosk = {
  id: string;
  name: string;
  featuredSectionId: string;
  posSerial: string | null;
  active: boolean;
  lastSeenAt: string | null;
  online: boolean;
  orderPrefix: string;
  todayOrderCount: number;
  todayRevenue: number;
  appVersion: string | null;
};

export type KioskUpdate = {
  name?: string;
  featuredSectionId?: string;
  posSerial?: string | null;
  active?: boolean;
};

/** API: /api/admin/castles/devices */
export type CastlesDevice = {
  serial: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  assignedKioskId: string | null;
};

export type CastlesDeviceDraft = { serial: string; name: string; active: boolean };

/** Alt kategori (API: /api/admin/categories). */
export type Category = {
  id: string;
  sectionId: string;
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
  sectionId: string;
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

export type DashboardKioskRow = { kioskId: string; orderCount: number; revenue: number };
export type DashboardSectionRow = { sectionId: string; orderCount: number; revenue: number };

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
  /** Kiosk bazında bugünkü özet (API döndürmezse boş kalır). */
  kiosks: DashboardKioskRow[];
  /** Ana kategori bazında bugünkü ciro (API döndürmezse boş kalır). */
  sections: DashboardSectionRow[];
};

export type AdminOrder = {
  number: string;
  status: string;
  fulfillment: string;
  payment_method: string;
  total: number;
  created_at: string;
  item_count?: number;
  kioskId: string | null;
  sectionIds: string[];
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
  kiosk_id?: string | null;
};

export type Report = {
  start: string;
  end: string;
  summary: { order_count: number; revenue: number; average_order: number };
  products: Array<{ product_id: string; name: string; category: string; quantity: number; revenue: number }>;
  daily: Array<{ day: string; order_count: number; revenue: number }>;
};

export type ProductDraft = Omit<Product, 'id' | 'categoryName' | 'available' | 'unavailableReason' | 'position'> & { id?: string };
