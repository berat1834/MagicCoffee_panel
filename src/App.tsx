import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  Edit3,
  Eye,
  Filter,
  FolderTree,
  ImagePlus,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Menu as MenuIcon,
  Minus,
  MonitorSmartphone,
  Moon,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { API_BASE_URL, api, assetUrl } from './api';
import { SectionChip, SectionIcon, accentStyle } from './sections';
import type {
  AdminOrder,
  CastlesDevice,
  CastlesDeviceDraft,
  Category,
  CustomizationOption,
  Dashboard,
  DashboardSectionRow,
  Filters,
  Kiosk,
  KioskUpdate,
  Product,
  ProductCustomization,
  ProductDraft,
  Report,
  Section,
  SectionDraft,
  StockMovement,
  ViewKey,
} from './types';
import { Empty, ErrorBanner, Modal, PageHeader, Skeleton, dateTime, daysAgo, money, today } from './ui';
import { DashboardView, filterLabel } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { KiosksView } from './views/KiosksView';
import { SectionsView } from './views/SectionsView';

type NavItem = { key: ViewKey; label: string; icon: typeof LayoutDashboard };
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: 'GENEL', items: [{ key: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, { key: 'kiosks', label: 'Kiosklar', icon: MonitorSmartphone }] },
  { label: 'KATALOG', items: [{ key: 'sections', label: 'Kategoriler', icon: LayoutGrid }, { key: 'categories', label: 'Alt Kategoriler', icon: FolderTree }, { key: 'products', label: 'Ürünler', icon: ShoppingBag }, { key: 'stock', label: 'Stok', icon: Boxes }] },
  { label: 'SATIŞ', items: [{ key: 'orders', label: 'Siparişler', icon: ClipboardList }, { key: 'reports', label: 'Raporlar', icon: BarChart3 }] },
  { label: 'SİSTEM', items: [{ key: 'pos-devices', label: 'POS Cihazları', icon: CreditCard }, { key: 'settings', label: 'Ayarlar', icon: Settings }] },
];
const VIEW_KEYS = navGroups.flatMap((group) => group.items.map((item) => item.key));

/** Hangi sayfada hangi global filtre geçerli. */
const FILTER_SCOPE: Partial<Record<ViewKey, { kiosk: boolean; section: boolean }>> = {
  dashboard: { kiosk: true, section: true },
  orders: { kiosk: true, section: true },
  reports: { kiosk: true, section: true },
  products: { kiosk: false, section: true },
  categories: { kiosk: false, section: true },
  stock: { kiosk: false, section: true },
};

const FILTER_STORAGE_KEY = 'mk-panel-filters';
const VIEW_STORAGE_KEY = 'mk-panel-view';
const readFilters = (): Filters => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}');
    return { kiosk: typeof parsed.kiosk === 'string' ? parsed.kiosk : '', section: typeof parsed.section === 'string' ? parsed.section : '' };
  } catch { return { kiosk: '', section: '' }; }
};
const readView = (): ViewKey => {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY) as ViewKey | null;
  return stored && VIEW_KEYS.includes(stored) ? stored : 'dashboard';
};

function Brand() {
  return <div className="brand"><span><KioskLogoIcon /></span><div><small>MAGICPAY</small><b>Kiosk Yönetimi</b></div></div>;
}

function KioskLogoIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="17" y="8" width="30" height="40" rx="5" fill="currentColor" fillOpacity=".12" />
    <path d="M23 16h18M23 24h8m4 0h6M23 32h8m4 0h6" />
    <path d="M26 48v8m12-8v8M20 56h24" />
  </svg>;
}

function FilterBar({ view, filters, kiosks, sections, onChange }: { view: ViewKey; filters: Filters; kiosks: Kiosk[]; sections: Section[]; onChange: (patch: Partial<Filters>) => void }) {
  const scope = FILTER_SCOPE[view];
  if (!scope) return null;
  const section = sections.find((item) => item.id === filters.section);
  const active = (scope.kiosk && filters.kiosk) || (scope.section && filters.section);
  return <div className="filter-bar" style={accentStyle(section?.accent)}>
    <span className="filter-bar__label"><Filter /> Filtre</span>
    <label className={scope.kiosk ? '' : 'is-disabled'} title={scope.kiosk ? '' : 'Bu sayfada kiosk filtresi uygulanmaz'}>
      <MonitorSmartphone />
      <select value={filters.kiosk} disabled={!scope.kiosk} onChange={(event) => onChange({ kiosk: event.target.value })} aria-label="Kiosk filtresi">
        <option value="">Tüm kiosklar</option>
        {kiosks.map((kiosk) => <option key={kiosk.id} value={kiosk.id}>{kiosk.id.toUpperCase()} · {kiosk.name}</option>)}
      </select>
    </label>
    <label className={`${scope.section ? '' : 'is-disabled'} ${section ? 'has-section' : ''}`}>
      {section ? <SectionIcon name={section.icon} /> : <LayoutGrid />}
      <select value={filters.section} disabled={!scope.section} onChange={(event) => onChange({ section: event.target.value })} aria-label="Kategori filtresi">
        <option value="">Tüm kategoriler</option>
        {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    {active ? <button className="text-button" onClick={() => onChange(scope.kiosk ? { kiosk: '', section: '' } : { section: '' })}><X /> Temizle</button> : null}
    {!scope.kiosk && <small className="filter-bar__hint">Bu sayfada yalnız kategori filtresi geçerli</small>}
  </div>;
}

// ---------------------------------------------------------------- Ürün özelleştirme (mevcut kahve akışı)

const STANDARD_CONTENT: CustomizationOption[] = [
  ['no-foam', 'Köpüksüz'], ['extra-foam', 'Ekstra köpük'], ['less-sweet', 'Az tatlı'], ['decaf', 'Kafeinsiz seçenek'],
].map(([id, name]) => ({ id, name, priceDelta: 0, defaultSelected: true, enabled: true }));
const COFFEE_SIZES: CustomizationOption[] = [
  { id: 'small', name: 'Küçük', priceDelta: 0, defaultSelected: true, enabled: true },
  { id: 'medium', name: 'Orta', priceDelta: 20, defaultSelected: false, enabled: true },
  { id: 'large', name: 'Büyük', priceDelta: 35, defaultSelected: false, enabled: true },
];
const defaultCustomization = (kind: ProductDraft['kind']): ProductCustomization => {
  const drink = kind === 'coffee' || kind === 'cold-coffee';
  return {
    content: { enabled: drink, title: 'Ürün Notları', options: drink ? STANDARD_CONTENT.map((item) => ({ ...item })) : [] },
    sides: { enabled: drink, title: 'Boyut Seçimi', options: drink ? COFFEE_SIZES.map((item) => ({ ...item })) : [] },
    drinks: { enabled: false, title: 'Yan Ürün Seçimi', options: [] },
  };
};

const emptyProduct = (sectionId = '', categoryId = ''): ProductDraft => ({
  sectionId, categoryId, name: '', description: '', price: 0, image: '', emoji: '', kind: 'simple',
  customizable: false, popular: false, active: true, stockQuantity: null, criticalStock: null,
  stockTrackingEnabled: false, stockSellable: true, customization: defaultCustomization('simple'),
});

function ProductCustomizationEditor({ value, products, productId, sectionId, onChange }: { value: ProductCustomization; products: Product[]; productId?: string; sectionId: string; onChange: (value: ProductCustomization) => void }) {
  type StepKey = keyof ProductCustomization;
  // Yan ürün adayları: kahvenin tatlı/atıştırmalık alt kategorileri veya aynı ana kategorideki diğer satıştaki ürünler.
  const drinkProducts = products.filter((item) => item.id !== productId && item.active && (['desserts', 'snacks'].includes(item.categoryId) || (sectionId && item.sectionId === sectionId && item.kind === 'simple')));
  const emit = (key: StepKey, patch: Partial<ProductCustomization[StepKey]>) => onChange({ ...value, [key]: { ...value[key], ...patch } });
  const updateOption = (key: StepKey, id: string, patch: Partial<CustomizationOption>) => emit(key, { options: value[key].options.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const togglePreset = (key: 'sides' | 'drinks', preset: CustomizationOption, enabled: boolean) => {
    const current = value[key].options.find((item) => item.id === preset.id || (Boolean(preset.sourceProductId) && item.sourceProductId === preset.sourceProductId));
    let options = current
      ? value[key].options.map((item) => item.id === current.id ? { ...item, enabled } : item)
      : [...value[key].options, { ...preset, enabled }];
    if (key === 'sides' && !options.some((item) => item.enabled && item.defaultSelected)) {
      const firstEnabled = options.find((item) => item.enabled);
      options = options.map((item) => ({ ...item, defaultSelected: item.id === firstEnabled?.id }));
    }
    emit(key, { options });
  };
  const setDefault = (key: 'sides' | 'drinks', id: string) => emit(key, { options: value[key].options.map((item) => ({ ...item, defaultSelected: item.id === id })) });
  const addContent = () => emit('content', { options: [...value.content.options, { id: `custom-${Date.now()}`, name: 'Yeni içerik', priceDelta: 0, defaultSelected: true, enabled: true }] });

  const cards: Array<{ key: StepKey; label: string; hint: string }> = [
    { key: 'content', label: 'Ürün notları', hint: 'Köpük, tatlılık ve servis tercihlerini belirleyin.' },
    { key: 'sides', label: 'Boyut seçimi', hint: 'Kioskta sunulacak bardak boylarını seçin.' },
    { key: 'drinks', label: 'Yan ürün seçimi', hint: 'Ürünün yanında önerilecek tatlı veya atıştırmalıkları seçin.' },
  ];

  return <section className="customization-editor span-2">
    <header><div><small>ÜRÜNE ÖZEL SEÇİM AKIŞI</small><h3>İçerik adımları</h3><p>Etkinleştirdiğiniz adımlar kioskta bu ürün için sırayla gösterilir.</p></div><Sparkles /></header>
    <div className="customization-grid">{cards.map(({ key, label, hint }) => {
      const step = value[key];
      return <article className={`customization-card ${step.enabled ? 'is-enabled' : ''}`} key={key}>
        <div className="customization-card__head"><label><input type="checkbox" checked={step.enabled} onChange={(event) => emit(key, { enabled: event.target.checked })} /><span><b>{label}</b><small>{hint}</small></span></label></div>
        <label className="step-title"><span>Adım başlığı</span><input value={step.title} onChange={(event) => emit(key, { title: event.target.value })} disabled={!step.enabled} /></label>
        {step.enabled && key === 'content' && <div className="choice-list">
          {step.options.map((option) => <div className="choice-row" key={option.id}>
            <input title="Kioskta göster" type="checkbox" checked={option.enabled} onChange={(event) => updateOption(key, option.id, { enabled: event.target.checked })} />
            <input aria-label="İçerik adı" value={option.name} onChange={(event) => updateOption(key, option.id, { name: event.target.value })} />
            <label className="default-choice"><input type="checkbox" checked={option.defaultSelected} onChange={(event) => updateOption(key, option.id, { defaultSelected: event.target.checked })} /><span>Standart</span></label>
            <label className="price-choice"><input min="0" step="0.1" type="number" inputMode="decimal" placeholder="0" value={option.priceDelta || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateOption(key, option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            <button type="button" className="icon-danger" title="Seçeneği sil" onClick={() => emit(key, { options: step.options.filter((item) => item.id !== option.id) })}><Trash2 /></button>
          </div>)}
          <button type="button" className="add-choice" onClick={addContent}><Plus /> Seçenek Ekle</button>
        </div>}
        {step.enabled && key === 'sides' && <div className="choice-list">
          {COFFEE_SIZES.map((preset) => {
            const option = step.options.find((item) => item.id === preset.id);
            const enabled = Boolean(option?.enabled);
            return <div className="choice-row choice-row--preset" key={preset.id}>
              <input type="checkbox" checked={enabled} onChange={(event) => togglePreset('sides', preset, event.target.checked)} />
              <span className="preset-name"><b>{preset.name} Boy</b><small>{preset.id === 'small' ? 'Küçük bardak' : 'Bardak boyu yükseltme'}</small></span>
              <label className="default-choice"><input type="radio" name="default-side" checked={Boolean(option?.defaultSelected)} disabled={!enabled} onChange={() => option && setDefault('sides', option.id)} /><span>Varsayılan</span></label>
              <label className="price-choice"><input min="0" step="0.1" type="number" inputMode="decimal" placeholder="0" disabled={!enabled} value={(option?.priceDelta ?? preset.priceDelta) || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => option && updateOption('sides', option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            </div>;
          })}
        </div>}
        {step.enabled && key === 'drinks' && <div className="choice-list choice-list--drinks">
          {!drinkProducts.length && <p className="choice-empty">Önce aynı kategoriye veya Tatlılar/Atıştırmalıklar alt kategorisine satışta olan bir ürün ekleyin.</p>}
          {drinkProducts.map((drink) => {
            const option = step.options.find((item) => item.sourceProductId === drink.id || item.id === drink.id);
            const enabled = Boolean(option?.enabled);
            const preset: CustomizationOption = { id: drink.id, sourceProductId: drink.id, name: drink.name, image: drink.image, priceDelta: 0, defaultSelected: false, enabled: true };
            return <div className="choice-row choice-row--preset" key={drink.id}>
              <input type="checkbox" checked={enabled} onChange={(event) => togglePreset('drinks', preset, event.target.checked)} />
              <span className="preset-name preset-name--image">{drink.image ? <img src={assetUrl(drink.image)} alt="" /> : <span>{drink.emoji || '🥤'}</span>}<i><b>{drink.name}</b><small>{drink.stockSellable ? 'Satışta' : 'Anlık satışa kapalı'}</small></i></span>
              <label className="default-choice"><input type="radio" name="default-drink" checked={Boolean(option?.defaultSelected)} disabled={!enabled} onChange={() => option && setDefault('drinks', option.id)} /><span>Varsayılan</span></label>
              <label className="price-choice"><input min="0" step="0.1" type="number" inputMode="decimal" placeholder="0" disabled={!enabled} value={option?.priceDelta || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => option && updateOption('drinks', option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            </div>;
          })}
        </div>}
      </article>;
    })}</div>
  </section>;
}

function ProductThumb({ product, section }: { product: Pick<Product, 'image' | 'emoji'>; section?: Section }) {
  return <span className="product-thumb" style={accentStyle(section?.accent)}>{product.image ? <img src={assetUrl(product.image)} alt="" /> : product.emoji ? <em>{product.emoji}</em> : <SectionIcon name={section?.icon} />}</span>;
}

// ---------------------------------------------------------------- Ürünler

function ProductModal({ product, products, sections, categories, defaultSectionId, onClose, onSave }: { product: Product | null; products: Product[]; sections: Section[]; categories: Category[]; defaultSectionId: string; onClose: () => void; onSave: (draft: ProductDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<ProductDraft>(() => {
    if (product) return {
      id: product.id, sectionId: product.sectionId || categories.find((item) => item.id === product.categoryId)?.sectionId || '', categoryId: product.categoryId, name: product.name, description: product.description,
      price: product.price, image: product.image ?? '', emoji: product.emoji ?? '', kind: product.kind,
      group: product.group, protein: product.protein, patties: product.patties, serves: product.serves,
      customizable: product.customizable, popular: product.popular, active: product.active,
      stockQuantity: product.stockQuantity, criticalStock: product.criticalStock,
      stockTrackingEnabled: product.stockTrackingEnabled, stockSellable: product.stockSellable,
      customization: product.customization && 'content' in product.customization ? product.customization : defaultCustomization(product.kind),
    };
    return emptyProduct(defaultSectionId, categories.find((item) => item.sectionId === defaultSectionId)?.id ?? '');
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [priceInput, setPriceInput] = useState(() => product ? String(product.price) : '');
  const [pattiesInput, setPattiesInput] = useState(() => product?.patties == null ? '' : String(product.patties));
  const [stockQuantityInput, setStockQuantityInput] = useState(() => product?.stockQuantity == null ? '' : String(product.stockQuantity));
  const [criticalStockInput, setCriticalStockInput] = useState(() => product?.criticalStock == null ? '' : String(product.criticalStock));
  const isCustomizableDrink = draft.kind === 'coffee' || draft.kind === 'cold-coffee';
  const section = sections.find((item) => item.id === draft.sectionId);
  const sectionCategories = categories.filter((item) => item.sectionId === draft.sectionId);
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const changeSection = (sectionId: string) => setDraft((current) => ({ ...current, sectionId, categoryId: categories.find((item) => item.sectionId === sectionId)?.id ?? '' }));
  const selectImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('PNG, JPG veya WEBP formatında bir görsel seçin.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Görsel boyutu en fazla 5 MB olabilir.'); return; }
    setError(''); setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!draft.sectionId) { setError('Ana kategori seçimi zorunludur.'); return; }
    if (!draft.categoryId || !sectionCategories.some((item) => item.id === draft.categoryId)) { setError('Bu ana kategoride alt kategori yok. Önce Alt Kategoriler sayfasından bir alt kategori ekleyin.'); return; }

    const price = Number(priceInput);
    if (priceInput.trim() === '' || !Number.isFinite(price) || price < 0) { setError('Geçerli bir ürün fiyatı girin.'); return; }
    const patties = pattiesInput.trim() === '' ? undefined : Number(pattiesInput);
    if (patties !== undefined && (!Number.isInteger(patties) || patties < 1 || patties > 10)) { setError('Servis ölçüsü 1 ile 10 arasında bir tam sayı olmalıdır.'); return; }
    const stockQuantity = stockQuantityInput.trim() === '' ? null : Number(stockQuantityInput);
    if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) { setError('Başlangıç stoğu sıfır veya pozitif bir tam sayı olmalıdır.'); return; }
    const criticalStock = criticalStockInput.trim() === '' ? null : Number(criticalStockInput);
    if (criticalStock !== null && (!Number.isInteger(criticalStock) || criticalStock < 0)) { setError('Kritik stok sıfır veya pozitif bir tam sayı olmalıdır.'); return; }

    setSaving(true);
    try {
      let payload: ProductDraft = { ...draft, price, patties, stockQuantity, criticalStock };
      if (imageFile) {
        const uploaded = await api.uploadProductImage(imageFile);
        payload = { ...payload, image: uploaded.path };
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return <Modal wide title={product ? 'Ürünü düzenle' : 'Yeni ürün ekle'} subtitle="ÜRÜN" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="product-form" disabled={saving}>{saving ? <><Loader2 className="spin" /> Kaydediliyor...</> : <><Check /> Kaydet</>}</button></>}>
    <form id="product-form" className="form-grid" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <label><span>Ana kategori *</span><select required value={draft.sectionId} onChange={(e) => changeSection(e.target.value)}><option value="" disabled>Ana kategori seçin</option>{sections.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label><span>Alt kategori *</span><select required value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)} disabled={!sectionCategories.length}>{!sectionCategories.length && <option value="">{draft.sectionId ? 'Bu kategoride alt kategori yok' : 'Önce ana kategori seçin'}</option>}{sectionCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label><span>Ürün adı</span><input required value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ürün adı" /></label>
      <label><span>Fiyat (TL)</span><input required min="0" step="0.01" type="number" inputMode="decimal" placeholder="0" value={priceInput} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setPriceInput(event.target.value)} /></label>
      <label><span>Ürün tipi</span><select value={draft.kind} onChange={(e) => { const kind = e.target.value as ProductDraft['kind']; setDraft((current) => ({ ...current, kind, customization: defaultCustomization(kind), customizable: kind !== 'simple' })); }}><option value="simple">Standart ürün</option><option value="coffee">Sıcak kahve</option><option value="cold-coffee">Soğuk kahve</option></select></label>
      <label><span>Emoji (görsel yoksa)</span><input maxLength={8} value={draft.emoji ?? ''} onChange={(e) => set('emoji', e.target.value)} placeholder="🍕" /></label>
      <label className="span-2"><span>Açıklama</span><textarea value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Kiosk kartında gösterilecek açıklama" /></label>
      <label className="span-2"><span>Görsel yolu veya URL</span><input value={draft.image ?? ''} onChange={(e) => { set('image', e.target.value); setImageFile(null); setImagePreview(''); }} placeholder="/images/products/urun.webp" /></label>
      <div className="product-image-picker span-2">
        <div className="product-image-preview" style={accentStyle(section?.accent)}>{imagePreview || draft.image ? <img src={imagePreview || assetUrl(draft.image)} alt="Ürün önizlemesi" /> : draft.emoji ? <em>{draft.emoji}</em> : <ImagePlus />}</div>
        <div><b>Bilgisayardan ürün görseli seç</b><small>PNG, JPG veya WEBP · En fazla 5 MB · Görsel yoksa emoji ve kategori rengi gösterilir</small>{imageFile && <em>{imageFile.name}</em>}</div>
        <label className="file-picker"><ImagePlus /><span>Dosya Seç</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
      </div>
      <label><span>Ürün etiketi</span><input value={draft.protein ?? ''} onChange={(e) => set('protein', e.target.value || undefined)} placeholder="Sıcak / Soğuk / Vegan / Yeni" /></label>
      <label><span>Servis ölçüsü</span><input min="1" max="10" step="1" type="number" inputMode="numeric" placeholder="1" value={pattiesInput} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setPattiesInput(event.target.value)} /></label>
      <label><span>Başlangıç stoğu</span><input min="0" step="1" type="number" inputMode="numeric" value={stockQuantityInput} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setStockQuantityInput(event.target.value)} placeholder="Takip edilmiyorsa boş" /></label>
      <label><span>Kritik stok</span><input min="0" step="1" type="number" inputMode="numeric" placeholder="0" value={criticalStockInput} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCriticalStockInput(event.target.value)} /></label>
      {isCustomizableDrink && <ProductCustomizationEditor productId={product?.id} sectionId={draft.sectionId} value={draft.customization} products={products} onChange={(customization) => setDraft((current) => ({ ...current, customization, customizable: Object.values(customization).some((step) => step.enabled && step.options.some((option) => option.enabled)) }))} />}
      <div className="check-row span-2"><label><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} /><span>Satışta</span></label><label><input type="checkbox" checked={draft.popular} onChange={(e) => set('popular', e.target.checked)} /><span>Çok sevilen</span></label><span className={`customizable-state ${draft.customizable ? 'active' : ''}`}><Sparkles /> {draft.customizable ? 'Seçim akışı aktif' : 'Seçim akışı kapalı'}</span></div>
    </form>
  </Modal>;
}

function ProductsView({ products, sections, categories, filters, loading, error, onRefresh, onCreate, onUpdate, onDelete }: { products: Product[]; sections: Section[]; categories: Category[]; filters: Filters; loading: boolean; error: string; onRefresh: () => void; onCreate: (draft: ProductDraft) => Promise<void>; onUpdate: (id: string, draft: ProductDraft) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const visibleCategories = categories.filter((item) => !filters.section || item.sectionId === filters.section);
  useEffect(() => { if (category !== 'all' && !visibleCategories.some((item) => item.id === category)) setCategory('all'); }, [category, visibleCategories]);
  const term = search.toLocaleLowerCase('tr');
  const filtered = products.filter((product) => (!filters.section || product.sectionId === filters.section) && (category === 'all' || product.categoryId === category) && `${product.name} ${product.description} ${product.id}`.toLocaleLowerCase('tr').includes(term));
  const remove = async (product: Product) => { if (window.confirm(`${product.name} kalıcı olarak silinsin mi?`)) { try { await onDelete(product.id); } catch (err) { window.alert((err as Error).message); } } };
  const currentSection = sectionById.get(filters.section);
  return <>
    <PageHeader eyebrow="KATALOG" title="Ürünler" description={`${currentSection ? currentSection.name : 'Tüm kategoriler'} · ürünleri, fiyatları, görselleri ve satış durumlarını yönet.`} actions={<><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)} disabled={!sections.length}><Plus /> Yeni Ürün</button></>} />
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    <div className="toolbar"><label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara..." /></label><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Alt kategori"><option value="all">Tüm alt kategoriler</option>{visibleCategories.map((item) => <option value={item.id} key={item.id}>{filters.section ? item.name : `${sectionById.get(item.sectionId)?.name ?? item.sectionId} › ${item.name}`}</option>)}</select><span>{filtered.length} ürün</span></div>
    <section className="table-card">{loading && !products.length ? <Skeleton rows={8} /> : !filtered.length ? <Empty icon={ShoppingBag} title="Ürün bulunamadı" text="Filtreleri değiştirin veya yeni bir ürün ekleyin." action={<button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni Ürün</button>} /> : <div className="table-wrap"><table><thead><tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th /></tr></thead><tbody>{filtered.map((product) => {
      const section = sectionById.get(product.sectionId);
      return <tr key={product.id}><td><div className="product-cell"><ProductThumb product={product} section={section} /><div><b>{product.name}</b><small>{product.id}</small></div></div></td><td><div className="chip-stack"><SectionChip section={section} fallback={product.sectionId || '—'} /><span className="tag">{product.categoryName || categories.find((item) => item.id === product.categoryId)?.name || product.categoryId}</span></div></td><td><strong>{money(product.price)}</strong></td><td>{!product.stockTrackingEnabled ? <span className="muted">Takipsiz</span> : <span className={Number(product.stockQuantity ?? 0) <= (product.criticalStock ?? 0) ? 'stock-low' : ''}>{Number(product.stockQuantity ?? 0)} adet</span>}</td><td><span className={`status ${product.active ? 'active' : ''}`}>{product.active ? 'Satışta' : 'Kapalı'}</span></td><td><div className="row-actions"><button title="Düzenle" onClick={() => setEditing(product)}><Edit3 /></button><button className="danger" title="Sil" onClick={() => remove(product)}><Trash2 /></button></div></td></tr>;
    })}</tbody></table></div>}</section>
    {editing !== undefined && <ProductModal product={editing} products={products} sections={sections} categories={categories} defaultSectionId={filters.section || sections[0]?.id || ''} onClose={() => setEditing(undefined)} onSave={(draft) => editing ? onUpdate(editing.id, draft) : onCreate(draft)} />}
  </>;
}

// ---------------------------------------------------------------- Alt kategoriler

function CategoryModal({ category, sections, defaultSectionId, onClose, onSave }: { category: Category | null; sections: Section[]; defaultSectionId: string; onClose: () => void; onSave: (value: Partial<Category>) => Promise<void> }) {
  const [sectionId, setSectionId] = useState(category?.sectionId || defaultSectionId);
  const [name, setName] = useState(category?.name ?? ''); const [eyebrow, setEyebrow] = useState(category?.eyebrow ?? ''); const [active, setActive] = useState(category?.active ?? true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectionId) { setError('Ana kategori seçimi zorunludur.'); return; }
    setSaving(true); setError('');
    try { await onSave({ sectionId, name: name.trim(), eyebrow: eyebrow.trim(), active }); onClose(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };
  return <Modal title={category ? 'Alt kategoriyi düzenle' : 'Yeni alt kategori'} subtitle="ALT KATEGORİ" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="category-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}><form id="category-form" className="form-stack" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label><span>Ana kategori *</span><select required value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="" disabled>Ana kategori seçin</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Alt kategori adı</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sıcak Kahveler" /></label><label><span>Kısa açıklama</span><input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Buz gibi" /></label><label className="switch-line"><span><b>Kioskta göster</b><small>Kapalı alt kategoriler kiosk menüsünde görünmez.</small></span><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></label></form></Modal>;
}

function CategoriesView({ categories, sections, filters, loading, error, onRefresh, onCreate, onUpdate, onDelete, onReorder }: { categories: Category[]; sections: Section[]; filters: Filters; loading: boolean; error: string; onRefresh: () => void; onCreate: (value: Partial<Category>) => Promise<void>; onUpdate: (id: string, value: Partial<Category>) => Promise<void>; onDelete: (id: string, deleteProducts?: boolean) => Promise<void>; onReorder: (ids: string[]) => Promise<void> }) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const visible = categories.filter((item) => !filters.section || item.sectionId === filters.section);
  const groups = sections
    .filter((section) => !filters.section || section.id === filters.section)
    .map((section) => ({ section, items: visible.filter((item) => item.sectionId === section.id) }));
  const orphans = visible.filter((item) => !sections.some((section) => section.id === item.sectionId));
  const move = async (list: Category[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const ids = categories.map((item) => item.id);
    const a = ids.indexOf(list[index].id); const b = ids.indexOf(list[target].id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    await onReorder(ids);
  };
  const remove = async (category: Category) => {
    const hasProducts = category.productCount > 0;
    const message = hasProducts ? `${category.name} alt kategorisi ve bağlı ${category.productCount} ürün silinsin mi?` : `${category.name} alt kategorisi silinsin mi?`;
    if (window.confirm(message)) { try { await onDelete(category.id, hasProducts); } catch (err) { window.alert((err as Error).message); } }
  };
  const renderRows = (list: Category[]) => list.map((category, index) => <article className="category-row" key={category.id}><span className="category-index">{index + 1}</span><div className="category-copy"><b>{category.name}</b><small>{category.eyebrow || 'Kısa açıklama eklenmedi'} · {category.productCount} ürün</small></div><span className={`status ${category.active ? 'active' : ''}`}>{category.active ? 'Yayında' : 'Gizli'}</span><div className="row-actions"><button title="Yukarı" disabled={index === 0} onClick={() => move(list, index, -1)}><ArrowUp /></button><button title="Aşağı" disabled={index === list.length - 1} onClick={() => move(list, index, 1)}><ArrowDown /></button><button title="Düzenle" onClick={() => setEditing(category)}><Edit3 /></button><button className="danger" title="Sil" onClick={() => remove(category)}><Trash2 /></button></div></article>);
  return <><PageHeader eyebrow="KATALOG" title="Alt kategoriler" description="Her ana kategorinin kiosk kataloğundaki alt kategori sırasını, başlıklarını ve görünürlüğünü düzenle." actions={<><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)} disabled={!sections.length}><Plus /> Yeni Alt Kategori</button></>} />
    <div className="summary-strip summary-strip--3"><article><Tags /><span><b>{visible.length}</b><small>Alt kategori</small></span></article><article className="ok"><Eye /><span><b>{visible.filter((item) => item.active).length}</b><small>Kioskta görünür</small></span></article><article><ShoppingBag /><span><b>{visible.reduce((sum, item) => sum + item.productCount, 0)}</b><small>Bağlı ürün</small></span></article></div>
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    {loading && !categories.length ? <Skeleton rows={8} /> : !visible.length ? <section className="table-card"><Empty icon={FolderTree} title="Alt kategori yok" text="Seçili ana kategoriye ilk alt kategoriyi ekleyin." action={<button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni Alt Kategori</button>} /></section> : <div className="category-groups">
      {groups.filter((group) => group.items.length || filters.section).map(({ section, items }) => <section className="category-list panel-card" key={section.id} style={accentStyle(section.accent)}>
        <header><div className="group-title"><span className="accent-tile"><SectionIcon name={section.icon} /></span><div><small>{section.orderPrefix || 'ANA KATEGORİ'}</small><h3>{section.name}</h3></div></div><span className="muted">{items.length} alt kategori</span></header>
        {items.length ? renderRows(items) : <Empty icon={FolderTree} title="Bu kategoride alt kategori yok" text="Ürün ekleyebilmek için en az bir alt kategori gerekir." />}
      </section>)}
      {orphans.length > 0 && <section className="category-list panel-card"><header><div><small>EŞLEŞMEYEN</small><h3>Ana kategorisi bulunamayanlar</h3></div></header>{renderRows(orphans)}</section>}
    </div>}
    {editing !== undefined && <CategoryModal category={editing} sections={sections} defaultSectionId={filters.section || sections[0]?.id || ''} onClose={() => setEditing(undefined)} onSave={(value) => editing ? onUpdate(editing.id, value) : onCreate(value)} />}
  </>;
}

// ---------------------------------------------------------------- Stok

function StockView({ products, movements, sections, filters, loading, error, onRefresh, onAdjust, onSettings }: {
  products: Product[];
  movements: StockMovement[];
  sections: Section[];
  filters: Filters;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onAdjust: (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) => Promise<void>;
  onSettings: (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const scoped = products.filter((item) => !filters.section || item.sectionId === filters.section);
  const scopedIds = new Set(scoped.map((item) => item.id));
  const scopedMovements = filters.section ? movements.filter((item) => scopedIds.has(item.product_id)) : movements;
  const tracked = scoped.filter((item) => item.stockTrackingEnabled);
  const low = tracked.filter((item) => Number(item.stockQuantity ?? 0) <= (item.criticalStock ?? 0));
  const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = scoped.filter((item) => !normalizedSearch || [item.name, item.categoryName, sectionById.get(item.sectionId)?.name].some((value) => value?.toLocaleLowerCase('tr-TR').includes(normalizedSearch)));

  const changeSetting = async (product: Product, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => {
    setSavingKey(`${product.id}:settings`); setActionError('');
    try { await onSettings(product.id, payload); } catch (err) { setActionError((err as Error).message); } finally { setSavingKey(null); }
  };
  const changeStock = async (product: Product, direction: 1 | -1) => {
    const quantity = Number(quantityDrafts[product.id] ?? '1');
    if (!Number.isInteger(quantity) || quantity <= 0) { setActionError('Stok miktarı pozitif bir tam sayı olmalıdır.'); return; }
    setSavingKey(`${product.id}:stock`); setActionError('');
    try {
      await onAdjust(product.id, { mode: direction > 0 ? 'add' : 'remove', quantity, note: direction > 0 ? 'Panel stok girişi' : 'Panel stok azaltma' });
      setQuantityDrafts((current) => ({ ...current, [product.id]: '1' }));
    } catch (err) { setActionError((err as Error).message); } finally { setSavingKey(null); }
  };

  return <>
    <PageHeader eyebrow="KATALOG" title="Stok" description="Ürün stoklarını takip et, giriş ve düzeltme hareketlerini kayıt altına al. Stok tüm kiosklarda ortaktır." actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    <div className="summary-strip summary-strip--3"><article><Boxes /><span><b>{tracked.length}</b><small>Takip edilen ürün</small></span></article><article className={low.length ? 'warning' : ''}><AlertTriangle /><span><b>{low.length}</b><small>Kritik stok</small></span></article><article><Database /><span><b>{scopedMovements.length}</b><small>Stok hareketi</small></span></article></div>
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    {actionError && <div className="form-error page-error">{actionError}</div>}
    <div className="stock-layout">
      <section className="table-card">
        <div className="card-toolbar"><div><small>ÜRÜN STOKLARI</small><h3>Güncel durum</h3></div><label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün veya kategori ara..." /></label></div>
        {loading && !products.length ? <Skeleton rows={8} /> : <div className="stock-table-wrap"><table className="stock-table"><thead><tr><th>Ürün</th><th>Kategori</th><th>Güncel Stok</th><th>Stok Takibi</th><th>Kiosk</th><th>Stok İşlemi</th></tr></thead><tbody>
          {filtered.map((product) => {
            const tracking = product.stockTrackingEnabled;
            const sellable = product.stockSellable;
            const quantity = Number(product.stockQuantity ?? 0);
            const savingSettings = savingKey === `${product.id}:settings`;
            const savingStock = savingKey === `${product.id}:stock`;
            const kioskStatus = !sellable ? 'Satış kapalı' : tracking && quantity <= 0 ? 'Stok yok' : 'Satışta';
            const section = sectionById.get(product.sectionId);
            return <tr key={product.id}>
              <td><div className="stock-product"><ProductThumb product={product} section={section} /><span><b>{product.name}</b><small>{product.categoryName || product.id}</small></span></div></td>
              <td><SectionChip section={section} fallback={product.sectionId || '—'} /></td>
              <td>{tracking ? <strong className={quantity <= (product.criticalStock ?? 0) ? 'stock-low' : 'stock-ok'}>{quantity > 0 ? `VAR / ${quantity}` : 'YOK / 0'}</strong> : <span className="muted">Takip kapalı</span>}</td>
              <td><button className={`stock-toggle ${tracking ? 'is-on' : ''}`} disabled={savingSettings} onClick={() => changeSetting(product, { stockTrackingEnabled: !tracking })}>{savingSettings ? <Loader2 className="spin" /> : null}{tracking ? 'Açık' : 'Kapalı'}</button></td>
              <td><div className="kiosk-stock-state"><span className={`status ${sellable && (!tracking || quantity > 0) ? 'active' : ''}`}>{kioskStatus}</span><button className={`sale-toggle ${sellable ? '' : 'open'}`} disabled={savingSettings} onClick={() => changeSetting(product, { stockSellable: !sellable })}>{sellable ? 'Satışa Kapat' : 'Satışa Aç'}</button></div></td>
              <td><div className="stock-inline-actions"><input type="number" inputMode="numeric" min="1" step="1" value={quantityDrafts[product.id] ?? '1'} disabled={!tracking || savingStock} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantityDrafts((current) => ({ ...current, [product.id]: event.target.value }))} /><button className="stock-add" disabled={!tracking || savingStock} onClick={() => changeStock(product, 1)}>{savingStock ? <Loader2 className="spin" /> : <Plus />} Ekle</button><button className="stock-remove" disabled={!tracking || savingStock || quantity <= 0} onClick={() => changeStock(product, -1)}><Minus /> Azalt</button></div></td>
            </tr>;
          })}
          {!filtered.length && <tr><td colSpan={6}><Empty icon={Boxes} title="Ürün bulunamadı" text="Arama ifadesini veya kategori filtresini değiştirin." /></td></tr>}
        </tbody></table></div>}
      </section>
      <section className="panel-card movements"><header><div><small>HAREKET GEÇMİŞİ</small><h3>Son işlemler</h3></div></header>{!scopedMovements.length ? <Empty icon={Database} title="Hareket bulunmuyor" text="İlk stok işlemi burada görünecek." /> : <div className="movement-list">{scopedMovements.slice(0, 12).map((item) => <div key={item.id}><span className={item.quantity >= 0 ? 'plus' : 'minus'}>{item.quantity >= 0 ? '+' : ''}{item.quantity}</span><p><b>{item.product_name}</b><small>{item.note || item.movement_type}{item.kiosk_id ? ` · ${item.kiosk_id.toUpperCase()}` : ''} · {dateTime(item.created_at)}</small></p><strong>{item.after_quantity}</strong></div>)}</div>}</section>
    </div>
  </>;
}

// ---------------------------------------------------------------- Siparişler

const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  preparing: { label: 'Hazırlanıyor', tone: 'active' },
  ready: { label: 'Hazır', tone: 'active' },
  completed: { label: 'Tamamlandı', tone: 'active' },
  paid: { label: 'Ödendi', tone: 'active' },
  cancelled: { label: 'İptal', tone: 'danger' },
  canceled: { label: 'İptal', tone: 'danger' },
  failed: { label: 'Başarısız', tone: 'danger' },
};

function OrdersView({ orders, kiosks, sections, filters, loading, error, onRefresh }: { orders: AdminOrder[]; kiosks: Kiosk[]; sections: Section[]; filters: Filters; loading: boolean; error: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const kioskById = useMemo(() => new Map(kiosks.map((item) => [item.id, item])), [kiosks]);
  // Sunucu filtreyi uygulamasa bile listede tutarlılık için istemcide de süzülür.
  const filtered = orders.filter((order) => (!filters.kiosk || !order.kioskId || order.kioskId === filters.kiosk)
    && (!filters.section || !order.sectionIds.length || order.sectionIds.includes(filters.section))
    && (!search.trim() || order.number.toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr'))));
  const total = filtered.reduce((sum, order) => sum + order.total, 0);
  return <><PageHeader eyebrow="SATIŞ" title="Siparişler" description={`${filterLabel(filters, kiosks, sections)} · kiosklardan oluşturulan siparişler ve ödeme bilgileri.`} actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    <div className="toolbar"><label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş no ara (ör. KHV-0001)" /></label><span>{filtered.length} sipariş · {money(total)}</span></div>
    <section className="table-card">{loading && !orders.length ? <Skeleton rows={10} /> : !filtered.length ? <Empty icon={ClipboardList} title="Sipariş yok" text="Seçili filtrede sipariş bulunamadı." /> : <div className="table-wrap"><table><thead><tr><th>Sipariş</th><th>Kiosk</th><th>Kategoriler</th><th>Tarih</th><th>Ödeme</th><th>Ürün</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>{filtered.map((order) => {
      const kiosk = order.kioskId ? kioskById.get(order.kioskId) : undefined;
      const status = ORDER_STATUS[(order.status || '').toLowerCase()];
      return <tr key={order.number}><td><strong>{order.number}</strong></td><td>{kiosk ? <span className="cell-stack"><b>{kiosk.name}</b><small>{kiosk.id.toUpperCase()}</small></span> : order.kioskId ? <code>{order.kioskId.toUpperCase()}</code> : <span className="muted">—</span>}</td><td><span className="chip-row">{order.sectionIds.length ? order.sectionIds.map((id) => <SectionChip key={id} section={sectionById.get(id)} fallback={id} compact={order.sectionIds.length > 2} />) : <span className="muted">—</span>}</span></td><td>{dateTime(order.created_at)}</td><td>{order.payment_method === 'meal_card' || order.payment_method === 'meal-card' ? 'Yemek Kartı' : 'Banka Kartı'}</td><td>{order.item_count ?? 0} adet</td><td><strong>{money(order.total)}</strong></td><td><span className={`status ${status?.tone ?? ''}`}>{status?.label ?? (order.status || 'Alındı')}</span></td></tr>;
    })}</tbody></table></div>}</section>
  </>;
}

// ---------------------------------------------------------------- Raporlar

function ReportsView({ report, sections, kiosks, filters, productSection, loading, error, onLoad }: { report: Report | null; sections: Section[]; kiosks: Kiosk[]; filters: Filters; productSection: (productId: string) => string; loading: boolean; error: string; onLoad: (start: string, end: string) => void }) {
  const [start, setStart] = useState(daysAgo(6)); const [end, setEnd] = useState(today());
  const range = useRef({ start, end });
  useEffect(() => { onLoad(range.current.start, range.current.end); }, [filters.kiosk, filters.section]); // eslint-disable-line react-hooks/exhaustive-deps
  const apply = (nextStart: string, nextEnd: string) => { range.current = { start: nextStart, end: nextEnd }; onLoad(nextStart, nextEnd); };
  const clearDates = () => { const s = daysAgo(6); const e = today(); setStart(s); setEnd(e); apply(s, e); };
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const maxRevenue = Math.max(...(report?.daily.map((item) => item.revenue) ?? [1]), 1);
  const bySection = useMemo(() => {
    const totals = new Map<string, { revenue: number; quantity: number }>();
    report?.products.forEach((row) => {
      const id = productSection(row.product_id);
      const current = totals.get(id) ?? { revenue: 0, quantity: 0 };
      totals.set(id, { revenue: current.revenue + row.revenue, quantity: current.quantity + row.quantity });
    });
    return [...totals.entries()].map(([id, value]) => ({ id, section: sectionById.get(id), ...value })).sort((a, b) => b.revenue - a.revenue);
  }, [report, productSection, sectionById]);
  const maxSection = Math.max(1, ...bySection.map((row) => row.revenue));
  return <><PageHeader eyebrow="SATIŞ" title="Raporlar" description={`${filterLabel(filters, kiosks, sections)} · ciro, sipariş ortalaması ve ürün performansı.`} actions={<div className="date-filter"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Başlangıç" /><span>—</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Bitiş" /><button className="secondary compact" onClick={clearDates}>Son 7 gün</button><button className="primary" onClick={() => apply(start, end)}>Uygula</button></div>} />
    {error && <ErrorBanner message={error} onRetry={() => apply(start, end)} />}
    {loading && !report ? <><Skeleton variant="cards" rows={3} /><div className="spacer" /><Skeleton rows={6} /></> : <><div className="report-stats"><article><small>TOPLAM CİRO</small><b>{money(report?.summary.revenue ?? 0)}</b><span>Seçili tarih aralığı</span></article><article><small>SİPARİŞ</small><b>{report?.summary.order_count ?? 0}</b><span>Toplam işlem</span></article><article><small>ORTALAMA SEPET</small><b>{money(report?.summary.average_order ?? 0)}</b><span>Sipariş başına</span></article></div>
      <div className="report-layout"><section className="panel-card chart-card"><header><div><small>CİRO GÖRÜNÜMÜ</small><h3>Günlük satış</h3></div></header>{!report?.daily.length ? <Empty icon={BarChart3} title="Bu aralıkta satış yok" text="Farklı bir tarih aralığı veya filtre deneyin." /> : <div className="bar-chart">{report.daily.map((item) => <div key={item.day} title={`${item.order_count} sipariş`}><span><i style={{ height: `${Math.max(8, item.revenue / maxRevenue * 100)}%` }} /></span><b>{money(item.revenue)}</b><small>{new Date(`${item.day}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</small></div>)}</div>}</section>
        <section className="panel-card"><header><div><small>KATEGORİ DAĞILIMI</small><h3>Ana kategoriye göre ciro</h3></div></header>{!bySection.length ? <Empty icon={LayoutGrid} title="Kategori verisi yok" text="Siparişler geldikçe dağılım burada oluşur." /> : <div className="hbar-list">{bySection.map((row) => <div className="hbar" key={row.id || 'none'} style={accentStyle(row.section?.accent)}><span className="hbar__label"><SectionIcon name={row.section?.icon} /><b>{row.section?.name ?? (row.id || 'Bilinmiyor')}</b></span><span className="hbar__track"><i style={{ width: `${Math.max(2, (row.revenue / maxSection) * 100)}%` }} /></span><span className="hbar__value"><b>{money(row.revenue)}</b><small>{row.quantity} adet</small></span></div>)}</div>}</section></div>
      <section className="table-card report-products"><div className="card-toolbar"><div><small>ÜRÜN PERFORMANSI</small><h3>En çok satanlar</h3></div></div>{!report?.products.length ? <Empty icon={ShoppingBag} title="Ürün satışı yok" text="Siparişler geldikçe performans burada oluşur." /> : <div className="table-wrap"><table><thead><tr><th>Ürün</th><th>Kategori</th><th>Alt kategori</th><th>Adet</th><th>Ciro</th></tr></thead><tbody>{report.products.map((product) => <tr key={product.product_id}><td><b>{product.name}</b></td><td><SectionChip section={sectionById.get(productSection(product.product_id))} fallback="—" /></td><td><span className="tag">{product.category || '—'}</span></td><td>{product.quantity}</td><td><strong>{money(product.revenue)}</strong></td></tr>)}</tbody></table></div>}</section></>}
  </>;
}

// ---------------------------------------------------------------- Ayarlar

function SettingsView({ apiOnline, dark, kiosks, sections, devices, onToggleDark, onRefresh }: { apiOnline: boolean; dark: boolean; kiosks: Kiosk[]; sections: Section[]; devices: CastlesDevice[]; onToggleDark: () => void; onRefresh: () => void }) {
  const backendLabel = API_BASE_URL || 'Panel proxy (göreli /api)';
  return <><PageHeader eyebrow="SİSTEM" title="Ayarlar" description="MagicPay Kiosk yönetim ortamının bağlantı durumunu ve görünümünü kontrol et." />
    <div className="settings-grid">
      <section className="panel-card"><header><div><small>SERVİS DURUMU</small><h3>MagicPay Kiosk API</h3></div><span className={`health-dot ${apiOnline ? 'online' : ''}`} /></header><p>17 kiosk ve panel aynı merkezi katalog, sipariş ve ödeme servisini kullanır.</p><button className="setting-line clickable" onClick={onRefresh}><span><Database /><div><b>Backend bağlantısı</b><small>{backendLabel}</small></div></span><strong className={apiOnline ? '' : 'offline'}>{apiOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</strong></button></section>
      <section className="panel-card"><header><div><small>GÖRÜNÜM</small><h3>Tema tercihi</h3></div></header><p>Panel görünümünü çalışma ortamına göre değiştir.</p><button className="setting-line clickable" onClick={onToggleDark}><span>{dark ? <Moon /> : <Sun />}<div><b>{dark ? 'Karanlık mod' : 'Aydınlık mod'}</b><small>Değiştirmek için tıkla</small></div></span><ChevronRight /></button></section>
      <section className="panel-card"><header><div><small>PLATFORM</small><h3>Özet</h3></div></header><p>Kurulu kiosk, kategori ve ödeme cihazı sayıları.</p><div className="setting-line"><span><MonitorSmartphone /><div><b>{kiosks.length} kiosk · {sections.length} ana kategori</b><small>{devices.length} Castles POS cihazı · ödeme: CasPro</small></div></span><Activity /></div></section>
    </div>
  </>;
}

// ---------------------------------------------------------------- Uygulama kabuğu

type LoadKey = 'core' | 'dashboard' | 'kiosks' | 'devices' | 'stock' | 'orders' | 'reports';

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>(readView);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('magic-panel-theme') === 'dark');
  const [filters, setFilters] = useState<Filters>(readFilters);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState<Partial<Record<LoadKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<LoadKey, string>>>({});
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [sections, setSections] = useState<Section[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [devices, setDevices] = useState<CastlesDevice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<Product[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sectionFallback, setSectionFallback] = useState<DashboardSectionRow[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  const notify = useCallback((value: string) => { setMessage(value); window.setTimeout(() => setMessage(''), 2800); }, []);
  const track = useCallback(async <T,>(key: LoadKey, task: () => Promise<T>): Promise<T | undefined> => {
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));
    try { return await task(); }
    catch (err) { setErrors((current) => ({ ...current, [key]: (err as Error).message })); return undefined; }
    finally { setLoading((current) => ({ ...current, [key]: false })); }
  }, []);

  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  // Ürünlerde sectionId yoksa alt kategoriden türetilir.
  const withSection = useCallback((list: Product[]) => list.map((item) => item.sectionId ? item : { ...item, sectionId: categoryById.get(item.categoryId)?.sectionId ?? '' }), [categoryById]);
  const productSectionMap = useMemo(() => new Map(withSection(products).map((item) => [item.id, item.sectionId])), [products, withSection]);
  const productSection = useCallback((id: string) => productSectionMap.get(id) ?? '', [productSectionMap]);

  const loadCore = useCallback(() => track('core', async () => {
    const health = await api.health().catch(() => null);
    setApiOnline(health?.status === 'ok');
    const [sectionData, categoryData, productData] = await Promise.all([api.sections(), api.categories(), api.products()]);
    setSections(sectionData); setCategories(categoryData); setProducts(productData);
  }), [track]);
  const loadKiosks = useCallback(() => track('kiosks', async () => setKiosks(await api.kiosks())), [track]);
  const loadDevices = useCallback(() => track('devices', async () => setDevices(await api.devices())), [track]);
  const loadDashboard = useCallback(() => track('dashboard', async () => {
    const data = await api.dashboard(filters);
    setDashboard(data);
    if (!data.sections.length) {
      // API kategori özeti döndürmezse bugünkü rapordan ürün → ana kategori eşlemesiyle hesaplanır.
      const todayReport = await api.reports(today(), today(), filters).catch(() => null);
      const totals = new Map<string, number>();
      todayReport?.products.forEach((row) => { const id = productSection(row.product_id); totals.set(id, (totals.get(id) ?? 0) + row.revenue); });
      setSectionFallback([...totals.entries()].map(([sectionId, revenue]) => ({ sectionId, revenue, orderCount: 0 })));
    } else setSectionFallback([]);
  }), [track, filters, productSection]);
  const loadStock = useCallback(() => track('stock', async () => {
    const [stock, history] = await Promise.all([api.stock(filters.section || undefined), api.stockMovements(filters.section || undefined)]);
    setStockItems(stock); setMovements(history);
  }), [track, filters.section]);
  const loadOrders = useCallback(() => track('orders', async () => setOrders(await api.orders(filters))), [track, filters]);
  const loadReports = useCallback((start: string, end: string) => { void track('reports', async () => setReport(await api.reports(start, end, filters))); }, [track, filters]);

  const loadView = useCallback((view: ViewKey) => {
    if (view === 'dashboard') { void loadDashboard(); void loadKiosks(); }
    if (view === 'kiosks') { void loadKiosks(); void loadDevices(); }
    if (view === 'pos-devices') { void loadDevices(); void loadKiosks(); }
    if (view === 'stock') void loadStock();
    if (view === 'orders') void loadOrders();
  }, [loadDashboard, loadKiosks, loadDevices, loadStock, loadOrders]);

  useEffect(() => { void loadCore(); void loadKiosks(); void loadDevices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Görünüm veya filtre değişince ilgili veriyi yeniden yükle.
  useEffect(() => { loadView(activeView); }, [activeView, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  // Çevrimiçi rozetleri için kiosk listesi 30 sn'de bir tazelenir.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === 'visible' && (activeView === 'dashboard' || activeView === 'kiosks')) void api.kiosks().then(setKiosks).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeView]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('magic-panel-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); }, [filters]);
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, activeView); }, [activeView]);
  // Kalıcı filtrede artık var olmayan bir kiosk/kategori kaldıysa temizle.
  useEffect(() => {
    setFilters((current) => {
      const kioskGone = current.kiosk && kiosks.length && !kiosks.some((item) => item.id === current.kiosk);
      const sectionGone = current.section && sections.length && !sections.some((item) => item.id === current.section);
      return kioskGone || sectionGone ? { kiosk: kioskGone ? '' : current.kiosk, section: sectionGone ? '' : current.section } : current;
    });
  }, [kiosks, sections]);

  const navigate = (view: ViewKey) => { setActiveView(view); setMobileNav(false); window.scrollTo({ top: 0 }); };
  const changeFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  // Kiosklar ve cihazlar
  const updateKiosk = async (id: string, payload: KioskUpdate) => {
    const updated = await api.updateKiosk(id, payload);
    setKiosks((current) => current.map((item) => item.id === id ? { ...item, ...updated, online: updated.online || item.online, todayOrderCount: updated.todayOrderCount || item.todayOrderCount, todayRevenue: updated.todayRevenue || item.todayRevenue } : item));
    void loadDevices();
    notify('posSerial' in payload || 'featuredSectionId' in payload || 'name' in payload ? 'Kiosk güncellendi.' : payload.active ? 'Kiosk aktifleştirildi.' : 'Kiosk pasifleştirildi.');
  };
  const createDevice = async (draft: CastlesDeviceDraft) => { await api.createDevice(draft); await loadDevices(); notify('Castles cihazı eklendi.'); };
  const updateDevice = async (serial: string, draft: Partial<Omit<CastlesDeviceDraft, 'serial'>>) => { await api.updateDevice(serial, draft); await loadDevices(); notify('Cihaz güncellendi.'); };
  const deleteDevice = async (serial: string) => { await api.deleteDevice(serial); await Promise.all([loadDevices(), loadKiosks()]); notify('Cihaz silindi.'); };

  // Ana kategoriler
  const refreshSections = async () => setSections(await api.sections());
  const createSection = async (draft: SectionDraft) => { await api.createSection(draft); await refreshSections(); notify('Ana kategori oluşturuldu.'); };
  const updateSection = async (id: string, draft: Partial<SectionDraft>) => { await api.updateSection(id, draft); await refreshSections(); notify('Ana kategori güncellendi.'); };
  const deleteSection = async (id: string) => { await api.deleteSection(id); await refreshSections(); notify('Ana kategori silindi.'); };
  const reorderSections = async (ids: string[]) => {
    const previous = sections;
    setSections(ids.map((id, position) => ({ ...sections.find((item) => item.id === id)!, position })));
    try { await api.reorderSections(ids); notify('Kategori sırası güncellendi.'); }
    catch (err) { setSections(previous); throw err; }
  };

  // Ürünler ve alt kategoriler
  const refreshCatalog = async () => { await loadCore(); };
  const createProduct = async (draft: ProductDraft) => { await api.createProduct(draft); await refreshCatalog(); notify('Ürün oluşturuldu ve kiosklara eklendi.'); };
  const updateProduct = async (id: string, draft: ProductDraft) => { await api.updateProduct(id, draft); await refreshCatalog(); notify('Ürün güncellendi.'); };
  const deleteProduct = async (id: string) => { await api.deleteProduct(id); await refreshCatalog(); notify('Ürün silindi.'); };
  const createCategory = async (value: Partial<Category>) => { await api.createCategory(value); await refreshCatalog(); notify('Alt kategori oluşturuldu.'); };
  const updateCategory = async (id: string, value: Partial<Category>) => { await api.updateCategory(id, value); await refreshCatalog(); notify('Alt kategori güncellendi.'); };
  const deleteCategory = async (id: string, deleteProducts = false) => { await api.deleteCategory(id, deleteProducts); await refreshCatalog(); notify('Alt kategori silindi.'); };
  const reorderCategories = async (ids: string[]) => { setCategories(ids.map((id, position) => ({ ...categories.find((item) => item.id === id)!, position }))); try { await api.reorderCategories(ids); notify('Alt kategori sırası güncellendi.'); } catch { await loadCore(); } };
  const adjustStock = async (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) => { await api.adjustStock(id, payload); await loadStock(); notify('Stok hareketi kaydedildi.'); };
  const updateStockSettings = async (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => { await api.updateStockSettings(id, payload); await loadStock(); notify(payload.stockTrackingEnabled === true ? 'Stok takibi açıldı.' : payload.stockTrackingEnabled === false ? 'Stok takibi kapatıldı.' : payload.stockSellable === false ? 'Ürün anlık satışa kapatıldı.' : 'Ürün yeniden satışa açıldı.'); };

  const viewTitle = navGroups.flatMap((group) => group.items).find((item) => item.key === activeView)?.label ?? '';
  const onlineCount = kiosks.filter((item) => item.online).length;
  const noPosCount = kiosks.filter((item) => !item.posSerial).length;
  const coreLoading = Boolean(loading.core);
  const coreError = errors.core ?? '';

  return <div className="app">
    <header className="topbar"><button className="mobile-menu" aria-label={mobileNav ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={mobileNav} onClick={() => setMobileNav((value) => !value)}><MenuIcon /></button><Brand /><div className="top-actions"><span className={`api-pill ${apiOnline ? 'online' : ''}`}><Activity /> API: {apiOnline ? 'çevrimiçi' : 'çevrimdışı'}</span>{kiosks.length > 0 && <button className="kiosk-pill" onClick={() => navigate('kiosks')} title="Kiosk durumları"><MonitorSmartphone /> {onlineCount}/{kiosks.length} çevrimiçi{noPosCount ? <em>{noPosCount} POS yok</em> : null}</button>}<button onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}{dark ? 'Aydınlık Mod' : 'Karanlık Mod'}</button><span className="avatar">MP</span></div></header>
    {mobileNav && <button type="button" className="mobile-nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Menüyü kapat" />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="sidebar-title">Kiosk Yönetimi</div><nav>{navGroups.map((group) => <section key={group.label}><small>{group.label}</small>{group.items.map((item) => <button className={activeView === item.key ? 'active' : ''} key={item.key} onClick={() => navigate(item.key)}><item.icon /><span>{item.label}{item.key === 'sections' && sections.length ? <em className="nav-count">{sections.length}</em> : null}{item.key === 'kiosks' && noPosCount ? <em className="nav-count warn" title="POS atanmamış kiosk">{noPosCount}</em> : null}</span><ChevronRight /></button>)}</section>)}</nav></aside>
    <main className="content">
      <div className="mobile-title">{viewTitle}</div>
      <FilterBar view={activeView} filters={filters} kiosks={kiosks} sections={sections} onChange={changeFilters} />
      {activeView === 'dashboard' && <DashboardView data={dashboard} kiosks={kiosks} sections={sections} filters={filters} sectionFallback={sectionFallback} loading={Boolean(loading.dashboard)} error={errors.dashboard ?? ''} now={now} onRefresh={() => loadView('dashboard')} onNavigate={navigate} onFilter={changeFilters} />}
      {activeView === 'kiosks' && <KiosksView kiosks={kiosks} sections={sections} devices={devices} loading={Boolean(loading.kiosks)} error={errors.kiosks ?? ''} now={now} onRefresh={() => loadView('kiosks')} onUpdate={updateKiosk} />}
      {activeView === 'sections' && <SectionsView sections={sections} loading={coreLoading} error={coreError} onRefresh={() => void loadCore()} onCreate={createSection} onUpdate={updateSection} onDelete={deleteSection} onReorder={reorderSections} />}
      {activeView === 'categories' && <CategoriesView categories={categories} sections={sections} filters={filters} loading={coreLoading} error={coreError} onRefresh={() => void loadCore()} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} onReorder={reorderCategories} />}
      {activeView === 'products' && <ProductsView products={withSection(products)} sections={sections} categories={categories} filters={filters} loading={coreLoading} error={coreError} onRefresh={() => void loadCore().then(() => notify('Veriler yenilendi.'))} onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}
      {activeView === 'stock' && <StockView products={withSection(stockItems)} movements={movements} sections={sections} filters={filters} loading={Boolean(loading.stock)} error={errors.stock ?? ''} onRefresh={() => void loadStock()} onAdjust={adjustStock} onSettings={updateStockSettings} />}
      {activeView === 'orders' && <OrdersView orders={orders} kiosks={kiosks} sections={sections} filters={filters} loading={Boolean(loading.orders)} error={errors.orders ?? ''} onRefresh={() => void loadOrders()} />}
      {activeView === 'reports' && <ReportsView report={report} sections={sections} kiosks={kiosks} filters={filters} productSection={productSection} loading={Boolean(loading.reports)} error={errors.reports ?? ''} onLoad={loadReports} />}
      {activeView === 'pos-devices' && <DevicesView devices={devices} kiosks={kiosks} sections={sections} loading={Boolean(loading.devices)} error={errors.devices ?? ''} onRefresh={() => loadView('pos-devices')} onCreate={createDevice} onUpdate={updateDevice} onDelete={deleteDevice} onOpenKiosks={() => navigate('kiosks')} />}
      {activeView === 'settings' && <SettingsView apiOnline={apiOnline} dark={dark} kiosks={kiosks} sections={sections} devices={devices} onToggleDark={() => setDark((value) => !value)} onRefresh={() => void loadCore()} />}
    </main>
    {message && <div className="toast"><Check />{message}</div>}
  </div>;
}
