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
  Database,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Menu as MenuIcon,
  Minus,
  Moon,
  PackagePlus,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api, assetUrl } from './api';
import type { AdminOrder, Category, CustomizationOption, Dashboard, Product, ProductCustomization, ProductDraft, Report, StockMovement, ViewKey } from './types';

const money = (value: number) => `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
const dateTime = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const navGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> }> = [
  { label: 'OPERASYON', items: [{ key: 'dashboard', label: 'Operasyon Ã–zeti', icon: LayoutDashboard }, { key: 'orders', label: 'SipariÅŸler', icon: ClipboardList }] },
  { label: 'MENÃœ VE FÄ°YAT', items: [{ key: 'products', label: 'MenÃ¼ ÃœrÃ¼nleri', icon: ShoppingBag }, { key: 'categories', label: 'Kategoriler', icon: Tags }] },
  { label: 'STOK VE MUTFAK', items: [{ key: 'stock', label: 'Stok YÃ¶netimi', icon: Boxes }] },
  { label: 'RAPORLAMA', items: [{ key: 'reports', label: 'Raporlar', icon: BarChart3 }] },
  { label: 'SÄ°STEM', items: [{ key: 'settings', label: 'Ayarlar', icon: Settings }] },
];

function Brand() {
  return <div className="brand"><span><BurgerLogoIcon /></span><div><small>MAGIC COFFEE</small><b>Operasyon Paneli</b></div></div>;
}

function BurgerLogoIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 27c.8-10.5 9.1-18 22-18s21.2 7.5 22 18H10Z" fill="currentColor" fillOpacity=".12" />
    <path d="m22 16 2 2m8-4v3m10-1-2 2" />
    <path d="M8 31h48v7H8z" />
    <path d="M9 41h46l-5 7-7-4-7 4-7-4-7 4-6-4-7 4-4-7Z" fill="currentColor" fillOpacity=".16" />
    <path d="M9 51h46v1c0 4-3 7-7 7H16c-4 0-7-3-7-7v-1Z" fill="currentColor" fillOpacity=".12" />
  </svg>;
}

function Modal({ title, subtitle, onClose, children, footer, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`}>
      <header><div><small>{subtitle}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
      <div className="modal__body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

function Loading() { return <div className="state-card"><Loader2 className="spin" /><b>Veriler hazÄ±rlanÄ±yor</b><span>LÃ¼tfen kÄ±sa bir sÃ¼re bekleyin.</span></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><PackagePlus /><b>{title}</b><span>{text}</span></div>; }

function DashboardView({ data, loading, onRefresh, onNavigate }: { data: Dashboard | null; loading: boolean; onRefresh: () => void; onNavigate: (view: ViewKey) => void }) {
  if (loading && !data) return <Loading />;
  const stats = data?.stats;
  const cards = [
    { label: 'AKTÄ°F ÃœRÃœN', value: stats?.active_product_count ?? 0, note: `${stats?.product_count ?? 0} toplam Ã¼rÃ¼n`, icon: ShoppingBag },
    { label: 'KATEGORÄ°', value: stats?.category_count ?? 0, note: 'Kiosk menÃ¼sÃ¼nde', icon: Tags },
    { label: 'BUGÃœNKÃœ SÄ°PARÄ°Å', value: stats?.today_order_count ?? 0, note: 'Tamamlanan iÅŸlem', icon: ClipboardList },
    { label: 'BUGÃœNKÃœ CÄ°RO', value: money(stats?.today_revenue ?? 0), note: 'GÃ¼ncel toplam', icon: TrendingUp, featured: true },
  ];
  return <>
    <PageHeader eyebrow="OPERASYON" title="HoÅŸ geldin, Magic Coffee" description="Kiosk menÃ¼sÃ¼nÃ¼, stok durumunu ve satÄ±ÅŸ performansÄ±nÄ± tek merkezden yÃ¶net." actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    <div className="stat-grid">{cards.map((card) => <article className={`stat-card ${card.featured ? 'featured' : ''}`} key={card.label}><span><card.icon /></span><small>{card.label}</small><b>{card.value}</b><p>{card.note}</p></article>)}</div>
    <div className="operation-grid">
      <button onClick={() => onNavigate('products')}><span><ShoppingBag /></span><b>MenÃ¼ ve fiyat</b><p>ÃœrÃ¼nleri, fiyatlarÄ±, gÃ¶rselleri ve satÄ±ÅŸ durumunu yÃ¶net.</p><ChevronRight /></button>
      <button onClick={() => onNavigate('stock')}><span><Boxes /></span><b>Stok kontrolÃ¼</b><p>Kritik Ã¼rÃ¼nleri gÃ¶r, stok giriÅŸ ve dÃ¼zeltmelerini kaydet.</p><ChevronRight /></button>
      <button onClick={() => onNavigate('reports')}><span><BarChart3 /></span><b>Raporlama</b><p>Ciro, sipariÅŸ ve Ã¼rÃ¼n satÄ±ÅŸlarÄ±nÄ± tarih aralÄ±ÄŸÄ±yla incele.</p><ChevronRight /></button>
    </div>
    <div className="dashboard-columns">
      <section className="panel-card"><header><div><small>SON HAREKETLER</small><h3>Son sipariÅŸler</h3></div><button className="text-button" onClick={() => onNavigate('orders')}>TÃ¼mÃ¼nÃ¼ gÃ¶r <ChevronRight /></button></header>
        {!data?.recentOrders.length ? <Empty title="HenÃ¼z sipariÅŸ yok" text="Kiosktan alÄ±nan sipariÅŸler burada gÃ¶rÃ¼necek." /> : <div className="compact-list">{data.recentOrders.map((order) => <div key={order.number}><span><b>{order.number}</b><small>{dateTime(order.created_at)}</small></span><strong>{money(order.total)}</strong></div>)}</div>}
      </section>
      <section className="panel-card"><header><div><small>Ã‡OK SATANLAR</small><h3>ÃœrÃ¼n performansÄ±</h3></div></header>
        {!data?.topProducts.length ? <Empty title="SatÄ±ÅŸ verisi oluÅŸmadÄ±" text="Ä°lk sipariÅŸten sonra sÄ±ralama baÅŸlayacak." /> : <div className="compact-list ranked">{data.topProducts.map((product, index) => <div key={product.name}><i>{index + 1}</i><span><b>{product.name}</b><small>{product.quantity} adet</small></span><strong>{money(product.revenue)}</strong></div>)}</div>}
      </section>
    </div>
  </>;
}

const STANDARD_CONTENT: CustomizationOption[] = [
  ['tomato', 'Domates'], ['lettuce', 'Marul'], ['cheddar', 'Cheddar Peyniri'], ['onion', 'SoÄŸan'], ['pickle', 'TurÅŸu'],
].map(([id, name]) => ({ id, name, priceDelta: 0, defaultSelected: true, enabled: true }));
const FRY_SIZES: CustomizationOption[] = [
  { id: 'small', name: 'KÃ¼Ã§Ã¼k', priceDelta: 0, defaultSelected: true, enabled: true },
  { id: 'medium', name: 'Orta', priceDelta: 20, defaultSelected: false, enabled: true },
  { id: 'large', name: 'BÃ¼yÃ¼k', priceDelta: 35, defaultSelected: false, enabled: true },
];
const defaultCustomization = (kind: ProductDraft['kind']): ProductCustomization => {
  const menu = kind === 'menu' || kind === 'bundle';
  return {
    content: { enabled: kind !== 'simple', title: 'Burger Ä°Ã§eriÄŸi', options: kind === 'simple' ? [] : STANDARD_CONTENT.map((item) => ({ ...item })) },
    sides: { enabled: menu, title: 'Patates Boyu', options: menu ? FRY_SIZES.map((item) => ({ ...item })) : [] },
    drinks: { enabled: menu, title: 'Ä°Ã§ecek SeÃ§imi', options: [] },
  };
};

const emptyProduct = (categoryId = ''): ProductDraft => ({
  categoryId, name: '', description: '', price: 0, image: '', emoji: '', kind: 'simple',
  customizable: false, popular: false, active: true, stockQuantity: null, criticalStock: null,
  stockTrackingEnabled: false, stockSellable: true, customization: defaultCustomization('simple'),
});

function ProductCustomizationEditor({ value, products, productId, onChange }: { value: ProductCustomization; products: Product[]; productId?: string; onChange: (value: ProductCustomization) => void }) {
  type StepKey = keyof ProductCustomization;
  const drinkProducts = products.filter((item) => item.id !== productId && item.categoryId === 'drinks' && item.active);
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
  const addContent = () => emit('content', { options: [...value.content.options, { id: `custom-${Date.now()}`, name: 'Yeni iÃ§erik', priceDelta: 0, defaultSelected: true, enabled: true }] });

  const cards: Array<{ key: StepKey; label: string; hint: string }> = [
    { key: 'content', label: 'Ä°Ã§erik / Sos seÃ§imi', hint: 'Burger malzemelerini Ã¼rÃ¼ne Ã¶zel belirleyin.' },
    { key: 'sides', label: 'Yan Ã¼rÃ¼n seÃ§imi', hint: 'Sunulacak patates boylarÄ±nÄ± seÃ§in.' },
    { key: 'drinks', label: 'Ä°Ã§ecek seÃ§imi', hint: 'Mevcut iÃ§eceklerden kioskta gÃ¶sterilecekleri seÃ§in.' },
  ];

  return <section className="customization-editor span-2">
    <header><div><small>ÃœRÃœNE Ã–ZEL SEÃ‡Ä°M AKIÅI</small><h3>Ä°Ã§erik adÄ±mlarÄ±</h3><p>EtkinleÅŸtirdiÄŸiniz adÄ±mlar kioskta bu Ã¼rÃ¼n iÃ§in sÄ±rayla gÃ¶sterilir.</p></div><Sparkles /></header>
    <div className="customization-grid">{cards.map(({ key, label, hint }) => {
      const step = value[key];
      return <article className={`customization-card ${step.enabled ? 'is-enabled' : ''}`} key={key}>
        <div className="customization-card__head"><label><input type="checkbox" checked={step.enabled} onChange={(event) => emit(key, { enabled: event.target.checked })} /><span><b>{label}</b><small>{hint}</small></span></label></div>
        <label className="step-title"><span>AdÄ±m baÅŸlÄ±ÄŸÄ±</span><input value={step.title} onChange={(event) => emit(key, { title: event.target.value })} disabled={!step.enabled} /></label>
        {step.enabled && key === 'content' && <div className="choice-list">
          {step.options.map((option) => <div className="choice-row" key={option.id}>
            <input title="Kioskta gÃ¶ster" type="checkbox" checked={option.enabled} onChange={(event) => updateOption(key, option.id, { enabled: event.target.checked })} />
            <input aria-label="Ä°Ã§erik adÄ±" value={option.name} onChange={(event) => updateOption(key, option.id, { name: event.target.value })} />
            <label className="default-choice"><input type="checkbox" checked={option.defaultSelected} onChange={(event) => updateOption(key, option.id, { defaultSelected: event.target.checked })} /><span>Standart</span></label>
            <label className="price-choice"><input min="0" step="0.01" type="number" inputMode="decimal" placeholder="0" value={option.priceDelta || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateOption(key, option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            <button type="button" className="icon-danger" title="SeÃ§eneÄŸi sil" onClick={() => emit(key, { options: step.options.filter((item) => item.id !== option.id) })}><Trash2 /></button>
          </div>)}
          <button type="button" className="add-choice" onClick={addContent}><Plus /> SeÃ§enek Ekle</button>
        </div>}
        {step.enabled && key === 'sides' && <div className="choice-list">
          {FRY_SIZES.map((preset) => {
            const option = step.options.find((item) => item.id === preset.id);
            const enabled = Boolean(option?.enabled);
            return <div className="choice-row choice-row--preset" key={preset.id}>
              <input type="checkbox" checked={enabled} onChange={(event) => togglePreset('sides', preset, event.target.checked)} />
              <span className="preset-name"><b>{preset.name} Patates</b><small>{preset.id === 'small' ? 'KÃ¼Ã§Ã¼k boy' : 'Boy yÃ¼kseltme seÃ§eneÄŸi'}</small></span>
              <label className="default-choice"><input type="radio" name="default-side" checked={Boolean(option?.defaultSelected)} disabled={!enabled} onChange={() => option && setDefault('sides', option.id)} /><span>VarsayÄ±lan</span></label>
              <label className="price-choice"><input min="0" step="0.01" type="number" inputMode="decimal" placeholder="0" disabled={!enabled} value={(option?.priceDelta ?? preset.priceDelta) || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => option && updateOption('sides', option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            </div>;
          })}
        </div>}
        {step.enabled && key === 'drinks' && <div className="choice-list choice-list--drinks">
          {!drinkProducts.length && <p className="choice-empty">Ã–nce Ä°Ã§ecekler kategorisine satÄ±ÅŸta olan bir Ã¼rÃ¼n ekleyin.</p>}
          {drinkProducts.map((drink) => {
            const option = step.options.find((item) => item.sourceProductId === drink.id || item.id === drink.id);
            const enabled = Boolean(option?.enabled);
            const preset: CustomizationOption = { id: drink.id, sourceProductId: drink.id, name: drink.name, image: drink.image, priceDelta: 0, defaultSelected: false, enabled: true };
            return <div className="choice-row choice-row--preset" key={drink.id}>
              <input type="checkbox" checked={enabled} onChange={(event) => togglePreset('drinks', preset, event.target.checked)} />
              <span className="preset-name preset-name--image">{drink.image ? <img src={assetUrl(drink.image)} alt="" /> : <span>ğŸ¥¤</span>}<i><b>{drink.name}</b><small>{drink.stockSellable ? 'SatÄ±ÅŸta' : 'AnlÄ±k satÄ±ÅŸa kapalÄ±'}</small></i></span>
              <label className="default-choice"><input type="radio" name="default-drink" checked={Boolean(option?.defaultSelected)} disabled={!enabled} onChange={() => option && setDefault('drinks', option.id)} /><span>VarsayÄ±lan</span></label>
              <label className="price-choice"><input min="0" step="0.01" type="number" inputMode="decimal" placeholder="0" disabled={!enabled} value={option?.priceDelta || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => option && updateOption('drinks', option.id, { priceDelta: event.target.value === '' ? 0 : Number(event.target.value) })} /><span>TL</span></label>
            </div>;
          })}
        </div>}
      </article>;
    })}</div>
  </section>;
}

function ProductModal({ product, products, categories, onClose, onSave }: { product: Product | null; products: Product[]; categories: Category[]; onClose: () => void; onSave: (draft: ProductDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<ProductDraft>(() => product ? {
    id: product.id, categoryId: product.categoryId, name: product.name, description: product.description,
    price: product.price, image: product.image ?? '', emoji: product.emoji ?? '', kind: product.kind,
    group: product.group, protein: product.protein, patties: product.patties, serves: product.serves,
    customizable: product.customizable, popular: product.popular, active: product.active,
    stockQuantity: product.stockQuantity, criticalStock: product.criticalStock,
    stockTrackingEnabled: product.stockTrackingEnabled, stockSellable: product.stockSellable,
    customization: product.customization ?? defaultCustomization(product.kind),
  } : emptyProduct(categories[0]?.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const selectImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('PNG, JPG veya WEBP formatÄ±nda bir gÃ¶rsel seÃ§in.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('GÃ¶rsel boyutu en fazla 5 MC olabilir.'); return; }
    setError(''); setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { let payload = draft; if (imageFile) { const uploaded = await api.uploadProductImage(imageFile); payload = { ...draft, image: uploaded.path }; } await onSave(payload); onClose(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); } };
  return <Modal wide title={product ? 'ÃœrÃ¼nÃ¼ dÃ¼zenle' : 'Yeni Ã¼rÃ¼n ekle'} subtitle="MENÃœ ÃœRÃœNÃœ" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>VazgeÃ§</button><button className="primary" type="submit" form="product-form" disabled={saving}>{saving ? <><Loader2 className="spin" /> GÃ¶rsel yÃ¼kleniyor...</> : <><Check /> Kaydet</>}</button></>}>
    <form id="product-form" className="form-grid" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <label><span>ÃœrÃ¼n adÄ±</span><input required value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Magic Coffee" /></label>
      <label><span>Kategori</span><select required value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label><span>Fiyat (TL)</span><input required min="0" step="0.01" type="number" value={draft.price} onChange={(e) => set('price', Number(e.target.value))} /></label>
      <label><span>ÃœrÃ¼n tipi</span><select value={draft.kind} onChange={(e) => { const kind = e.target.value as ProductDraft['kind']; setDraft((current) => ({ ...current, kind, customization: defaultCustomization(kind), customizable: kind !== 'simple' })); }}><option value="simple">Standart</option><option value="burger">Burger</option><option value="menu">MenÃ¼</option><option value="bundle">Ã‡ok kiÅŸilik menÃ¼</option></select></label>
      <label className="span-2"><span>AÃ§Ä±klama</span><textarea value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Kiosk kartÄ±nda gÃ¶sterilecek aÃ§Ä±klama" /></label>
      <label className="span-2"><span>GÃ¶rsel yolu veya URL</span><input value={draft.image ?? ''} onChange={(e) => { set('image', e.target.value); setImageFile(null); setImagePreview(''); }} placeholder="/images/products/urun.webp" /></label>
      <div className="product-image-picker span-2">
        <div className="product-image-preview">{imagePreview || draft.image ? <img src={imagePreview || assetUrl(draft.image)} alt="ÃœrÃ¼n Ã¶nizlemesi" /> : <ImagePlus />}</div>
        <div><b>Bilgisayardan Ã¼rÃ¼n gÃ¶rseli seÃ§</b><small>PNG, JPG veya WEBP Â· En fazla 5 MC</small>{imageFile && <em>{imageFile.name}</em>}</div>
        <label className="file-picker"><ImagePlus /><span>Dosya SeÃ§</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
      </div>
      <label><span>Protein</span><input value={draft.protein ?? ''} onChange={(e) => set('protein', e.target.value || undefined)} placeholder="Et / Tavuk" /></label>
      <label><span>KÃ¶fte katÄ±</span><input min="1" max="10" type="number" value={draft.patties ?? ''} onChange={(e) => set('patties', e.target.value ? Number(e.target.value) : undefined)} /></label>
      <label><span>BaÅŸlangÄ±Ã§ stoÄŸu</span><input min="0" type="number" value={draft.stockQuantity ?? ''} onChange={(e) => set('stockQuantity', e.target.value === '' ? null : Number(e.target.value))} placeholder="Takip edilmiyorsa boÅŸ" /></label>
      <label><span>Kritik stok</span><input min="0" type="number" value={draft.criticalStock ?? ''} onChange={(e) => set('criticalStock', e.target.value === '' ? null : Number(e.target.value))} /></label>
      <ProductCustomizationEditor productId={product?.id} value={draft.customization} products={products} onChange={(customization) => setDraft((current) => ({ ...current, customization, customizable: Object.values(customization).some((step) => step.enabled && step.options.some((option) => option.enabled)) }))} />
      <div className="check-row span-2"><label><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} /><span>SatÄ±ÅŸta</span></label><label><input type="checkbox" checked={draft.popular} onChange={(e) => set('popular', e.target.checked)} /><span>Ã‡ok sevilen</span></label><span className={`customizable-state ${draft.customizable ? 'active' : ''}`}><Sparkles /> {draft.customizable ? 'SeÃ§im akÄ±ÅŸÄ± aktif' : 'SeÃ§im akÄ±ÅŸÄ± kapalÄ±'}</span></div>
    </form>
  </Modal>;
}

function ProductsView({ products, categories, loading, onRefresh, onCreate, onUpdate, onDelete }: { products: Product[]; categories: Category[]; loading: boolean; onRefresh: () => void; onCreate: (draft: ProductDraft) => Promise<void>; onUpdate: (id: string, draft: ProductDraft) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const filtered = products.filter((product) => (category === 'all' || product.categoryId === category) && `${product.name} ${product.description}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
  const remove = async (product: Product) => { if (window.confirm(`${product.name} kalÄ±cÄ± olarak silinsin mi?`)) await onDelete(product.id); };
  return <>
    <PageHeader eyebrow="MENÃœ VE FÄ°YAT" title="MenÃ¼ Ã¼rÃ¼nleri" description="Kiosktaki Ã¼rÃ¼nleri, fiyatlarÄ±, gÃ¶rselleri ve satÄ±ÅŸ durumlarÄ±nÄ± yÃ¶net." actions={<><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni ÃœrÃ¼n</button></>} />
    <div className="toolbar"><label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ÃœrÃ¼n ara..." /></label><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">TÃ¼m kategoriler</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span>{filtered.length} Ã¼rÃ¼n</span></div>
    <section className="table-card">{loading ? <Loading /> : !filtered.length ? <Empty title="ÃœrÃ¼n bulunamadÄ±" text="Filtreleri deÄŸiÅŸtirin veya yeni bir Ã¼rÃ¼n ekleyin." /> : <div className="table-wrap"><table><thead><tr><th>ÃœrÃ¼n</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th /></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="product-cell"><span>{product.image ? <img src={assetUrl(product.image)} alt="" /> : product.emoji || <ShoppingBag />}</span><div><b>{product.name}</b><small>{product.id}</small></div></div></td><td><span className="tag">{product.categoryName}</span></td><td><strong>{money(product.price)}</strong></td><td>{!product.stockTrackingEnabled ? <span className="muted">Takipsiz</span> : <span className={Number(product.stockQuantity ?? 0) <= (product.criticalStock ?? 0) ? 'stock-low' : ''}>{Number(product.stockQuantity ?? 0)} adet</span>}</td><td><span className={`status ${product.active ? 'active' : ''}`}>{product.active ? 'SatÄ±ÅŸta' : 'KapalÄ±'}</span></td><td><div className="row-actions"><button title="DÃ¼zenle" onClick={() => setEditing(product)}><Edit3 /></button><button className="danger" title="Sil" onClick={() => remove(product)}><Trash2 /></button></div></td></tr>)}</tbody></table></div>}</section>
    {editing !== undefined && <ProductModal product={editing} products={products} categories={categories} onClose={() => setEditing(undefined)} onSave={(draft) => editing ? onUpdate(editing.id, draft) : onCreate(draft)} />}
  </>;
}

function CategoryModal({ category, onClose, onSave }: { category: Category | null; onClose: () => void; onSave: (value: { name: string; eyebrow: string; active: boolean }) => Promise<void> }) {
  const [name, setName] = useState(category?.name ?? ''); const [eyebrow, setEyebrow] = useState(category?.eyebrow ?? ''); const [active, setActive] = useState(category?.active ?? true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { await onSave({ name, eyebrow, active }); onClose(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); } };
  return <Modal title={category ? 'Kategoriyi dÃ¼zenle' : 'Yeni kategori'} subtitle="KATEGORÄ° YÃ–NETÄ°MÄ°" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>VazgeÃ§</button><button className="primary" type="submit" form="category-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}><form id="category-form" className="form-stack" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label><span>Kategori adÄ±</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label><label><span>KÄ±sa aÃ§Ä±klama</span><input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Buz gibi" /></label><label className="switch-line"><span><b>Kioskta gÃ¶ster</b><small>KapalÄ± kategoriler kiosk menÃ¼sÃ¼nde gÃ¶rÃ¼nmez.</small></span><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></label></form></Modal>;
}

function CategoriesView({ categories, loading, onCreate, onUpdate, onDelete, onReorder }: { categories: Category[]; loading: boolean; onCreate: (value: Partial<Category>) => Promise<void>; onUpdate: (id: string, value: Partial<Category>) => Promise<void>; onDelete: (id: string) => Promise<void>; onReorder: (ids: string[]) => Promise<void> }) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const move = async (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= categories.length) return; const ids = categories.map((item) => item.id); [ids[index], ids[target]] = [ids[target], ids[index]]; await onReorder(ids); };
  const remove = async (category: Category) => { if (window.confirm(`${category.name} kategorisi silinsin mi?`)) { try { await onDelete(category.id); } catch (err) { window.alert((err as Error).message); } } };
  return <><PageHeader eyebrow="MENÃœ VE FÄ°YAT" title="Kategori yÃ¶netimi" description="Kiosk kategori sÄ±rasÄ±nÄ±, baÅŸlÄ±klarÄ±nÄ± ve gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼nÃ¼ dÃ¼zenle." actions={<button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni Kategori</button>} />
    <div className="category-summary"><article><Tags /><span><b>{categories.length}</b><small>Toplam kategori</small></span></article><article><Eye /><span><b>{categories.filter((item) => item.active).length}</b><small>Kioskta gÃ¶rÃ¼nÃ¼r</small></span></article><article><ShoppingBag /><span><b>{categories.reduce((sum, item) => sum + item.productCount, 0)}</b><small>BaÄŸlÄ± Ã¼rÃ¼n</small></span></article></div>
    <section className="category-list panel-card"><header><div><small>KATEGORÄ° SIRASI</small><h3>Kiosk menÃ¼ yapÄ±sÄ±</h3></div><span className="muted">Oklarla sÄ±ralamayÄ± deÄŸiÅŸtir</span></header>{loading ? <Loading /> : categories.map((category, index) => <article className="category-row" key={category.id}><span className="category-index">{index + 1}</span><div className="category-copy"><b>{category.name}</b><small>{category.eyebrow || 'KÄ±sa aÃ§Ä±klama eklenmedi'} Â· {category.productCount} Ã¼rÃ¼n</small></div><span className={`status ${category.active ? 'active' : ''}`}>{category.active ? 'YayÄ±nda' : 'Gizli'}</span><div className="row-actions"><button disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></button><button disabled={index === categories.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button><button onClick={() => setEditing(category)}><Edit3 /></button><button className="danger" onClick={() => remove(category)}><Trash2 /></button></div></article>)}</section>
    {editing !== undefined && <CategoryModal category={editing} onClose={() => setEditing(undefined)} onSave={(value) => editing ? onUpdate(editing.id, value) : onCreate(value)} />}
  </>;
}

function StockView({ products, movements, loading, onRefresh, onAdjust, onSettings }: {
  products: Product[];
  movements: StockMovement[];
  loading: boolean;
  onRefresh: () => void;
  onAdjust: (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) => Promise<void>;
  onSettings: (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const tracked = products.filter((item) => item.stockTrackingEnabled);
  const low = tracked.filter((item) => Number(item.stockQuantity ?? 0) <= (item.criticalStock ?? 0));
  const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = products.filter((item) => !normalizedSearch || [item.name, item.categoryName].some((value) => value?.toLocaleLowerCase('tr-TR').includes(normalizedSearch)));

  const changeSetting = async (product: Product, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => {
    setSavingKey(`${product.id}:settings`);
    setError('');
    try { await onSettings(product.id, payload); }
    catch (err) { setError((err as Error).message); }
    finally { setSavingKey(null); }
  };

  const changeStock = async (product: Product, direction: 1 | -1) => {
    const quantity = Number(quantityDrafts[product.id] ?? '1');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Stok miktarÄ± pozitif bir tam sayÄ± olmalÄ±dÄ±r.');
      return;
    }
    setSavingKey(`${product.id}:stock`);
    setError('');
    try {
      await onAdjust(product.id, {
        mode: direction > 0 ? 'add' : 'remove',
        quantity,
        note: direction > 0 ? 'Panel stok giriÅŸi' : 'Panel stok azaltma',
      });
      setQuantityDrafts((current) => ({ ...current, [product.id]: '1' }));
    } catch (err) { setError((err as Error).message); }
    finally { setSavingKey(null); }
  };

  return <>
    <PageHeader eyebrow="STOK VE MUTFAK" title="Stok yÃ¶netimi" description="ÃœrÃ¼n stoklarÄ±nÄ± takip et, giriÅŸ ve dÃ¼zeltme hareketlerini kayÄ±t altÄ±na al." actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    <div className="stock-summary"><article><Boxes /><span><small>TAKÄ°P EDÄ°LEN</small><b>{tracked.length}</b></span></article><article className={low.length ? 'warning' : ''}><AlertTriangle /><span><small>KRÄ°TÄ°K STOK</small><b>{low.length}</b></span></article><article><Database /><span><small>TOPLAM HAREKET</small><b>{movements.length}</b></span></article></div>
    {error && <div className="form-error stock-error">{error}</div>}
    <div className="stock-layout">
      <section className="table-card">
        <div className="card-toolbar"><div><small>ÃœRÃœN STOKLARI</small><h3>GÃ¼ncel durum</h3></div><label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ÃœrÃ¼n veya kategori ara..." /></label></div>
        {loading ? <Loading /> : <div className="stock-table-wrap"><table className="stock-table"><thead><tr><th>ÃœrÃ¼n</th><th>Kategori</th><th>GÃ¼ncel Stok</th><th>Stok Takibi</th><th>Kiosk</th><th>Stok Ä°ÅŸlemi</th></tr></thead><tbody>
          {filtered.map((product) => {
            const tracking = product.stockTrackingEnabled;
            const sellable = product.stockSellable;
            const quantity = Number(product.stockQuantity ?? 0);
            const savingSettings = savingKey === `${product.id}:settings`;
            const savingStock = savingKey === `${product.id}:stock`;
            const kioskStatus = !sellable ? 'SatÄ±ÅŸ kapalÄ±' : tracking && quantity <= 0 ? 'Stok yok' : 'SatÄ±ÅŸta';
            return <tr key={product.id}>
              <td><div className="stock-product"><span className="stock-image">{product.image ? <img src={assetUrl(product.image)} alt="" /> : <Boxes />}</span><span><b>{product.name}</b><small>{product.id}</small></span></div></td>
              <td><span className="tag">{product.categoryName}</span></td>
              <td>{tracking ? <strong className={quantity <= (product.criticalStock ?? 0) ? 'stock-low' : 'stock-ok'}>{quantity > 0 ? `VAR / ${quantity}` : 'YOK / 0'}</strong> : <span className="muted">Takip kapalÄ±</span>}</td>
              <td><button className={`stock-toggle ${tracking ? 'is-on' : ''}`} disabled={savingSettings} onClick={() => changeSetting(product, { stockTrackingEnabled: !tracking })}>{savingSettings ? <Loader2 className="spin" /> : null}{tracking ? 'AÃ§Ä±k' : 'KapalÄ±'}</button></td>
              <td><div className="kiosk-stock-state"><span className={`status ${sellable && (!tracking || quantity > 0) ? 'active' : ''}`}>{kioskStatus}</span><button className={`sale-toggle ${sellable ? '' : 'open'}`} disabled={savingSettings} onClick={() => changeSetting(product, { stockSellable: !sellable })}>{sellable ? 'SatÄ±ÅŸa Kapat' : 'SatÄ±ÅŸa AÃ§'}</button></div></td>
              <td><div className="stock-inline-actions"><input type="number" min="1" step="1" value={quantityDrafts[product.id] ?? '1'} disabled={!tracking || savingStock} onChange={(event) => setQuantityDrafts((current) => ({ ...current, [product.id]: event.target.value }))} /><button className="stock-add" disabled={!tracking || savingStock} onClick={() => changeStock(product, 1)}>{savingStock ? <Loader2 className="spin" /> : <Plus />} Ekle</button><button className="stock-remove" disabled={!tracking || savingStock || quantity <= 0} onClick={() => changeStock(product, -1)}><Minus /> Azalt</button></div></td>
            </tr>;
          })}
          {!filtered.length && <tr><td colSpan={6}><Empty title="ÃœrÃ¼n bulunamadÄ±" text="Arama ifadesini deÄŸiÅŸtirip tekrar deneyin." /></td></tr>}
        </tbody></table></div>}
      </section>
      <section className="panel-card movements"><header><div><small>HAREKET GEÃ‡MÄ°ÅÄ°</small><h3>Son iÅŸlemler</h3></div></header>{!movements.length ? <Empty title="Hareket bulunmuyor" text="Ä°lk stok iÅŸlemi burada gÃ¶rÃ¼necek." /> : <div className="movement-list">{movements.slice(0, 12).map((item) => <div key={item.id}><span className={item.quantity >= 0 ? 'plus' : 'minus'}>{item.quantity >= 0 ? '+' : ''}{item.quantity}</span><p><b>{item.product_name}</b><small>{item.note || item.movement_type} Â· {dateTime(item.created_at)}</small></p><strong>{item.after_quantity}</strong></div>)}</div>}</section>
    </div>
  </>;
}

function OrdersView({ orders, loading, onRefresh }: { orders: AdminOrder[]; loading: boolean; onRefresh: () => void }) {
  return <><PageHeader eyebrow="OPERASYON" title="SipariÅŸler" description="Kiosktan oluÅŸturulan sipariÅŸlerin durumunu ve Ã¶deme bilgilerini gÃ¶rÃ¼ntÃ¼le." actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    <section className="table-card">{loading ? <Loading /> : !orders.length ? <Empty title="HenÃ¼z sipariÅŸ yok" text="Kiosk sipariÅŸleri burada listelenecek." /> : <div className="table-wrap"><table><thead><tr><th>SipariÅŸ</th><th>Tarih</th><th>Tip</th><th>Ã–deme</th><th>ÃœrÃ¼n</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>{orders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td>{dateTime(order.created_at)}</td><td>{order.fulfillment === 'restaurant' ? 'Restoranda' : 'Paket'}</td><td>{order.payment_method === 'card' ? 'Banka KartÄ±' : 'Yemek KartÄ±'}</td><td>{order.item_count ?? 0} adet</td><td><strong>{money(order.total)}</strong></td><td><span className="status active">HazÄ±rlanÄ±yor</span></td></tr>)}</tbody></table></div>}</section>
  </>;
}

function ReportsView({ report, loading, onLoad }: { report: Report | null; loading: boolean; onLoad: (start: string, end: string) => void }) {
  const [start, setStart] = useState(daysAgo(6)); const [end, setEnd] = useState(today());
  useEffect(() => { onLoad(start, end); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const maxRevenue = Math.max(...(report?.daily.map((item) => item.revenue) ?? [1]), 1);
  return <><PageHeader eyebrow="RAPORLAMA" title="SatÄ±ÅŸ raporlarÄ±" description="Ciroyu, sipariÅŸ ortalamasÄ±nÄ± ve Ã¼rÃ¼n performansÄ±nÄ± tarih aralÄ±ÄŸÄ±yla analiz et." actions={<div className="date-filter"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /><span>â€”</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /><button className="primary" onClick={() => onLoad(start, end)}>Uygula</button></div>} />
    {loading && !report ? <Loading /> : <><div className="report-stats"><article><small>TOPLAM CÄ°RO</small><b>{money(report?.summary.revenue ?? 0)}</b><span>SeÃ§ili tarih aralÄ±ÄŸÄ±</span></article><article><small>SÄ°PARÄ°Å</small><b>{report?.summary.order_count ?? 0}</b><span>Toplam iÅŸlem</span></article><article><small>ORTALAMA SEPET</small><b>{money(report?.summary.average_order ?? 0)}</b><span>SipariÅŸ baÅŸÄ±na</span></article></div>
      <div className="report-layout"><section className="panel-card chart-card"><header><div><small>CÄ°RO GÃ–RÃœNÃœMÃœ</small><h3>GÃ¼nlÃ¼k satÄ±ÅŸ</h3></div></header>{!report?.daily.length ? <Empty title="Bu aralÄ±kta satÄ±ÅŸ yok" text="FarklÄ± bir tarih aralÄ±ÄŸÄ± deneyin." /> : <div className="bar-chart">{report.daily.map((item) => <div key={item.day}><span><i style={{ height: `${Math.max(8, item.revenue / maxRevenue * 100)}%` }} /></span><b>{money(item.revenue)}</b><small>{new Date(`${item.day}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</small></div>)}</div>}</section>
      <section className="table-card"><div className="card-toolbar"><div><small>ÃœRÃœN PERFORMANSI</small><h3>En Ã§ok satanlar</h3></div></div>{!report?.products.length ? <Empty title="ÃœrÃ¼n satÄ±ÅŸÄ± yok" text="SipariÅŸler geldikÃ§e performans burada oluÅŸur." /> : <div className="table-wrap"><table><thead><tr><th>ÃœrÃ¼n</th><th>Kategori</th><th>Adet</th><th>Ciro</th></tr></thead><tbody>{report.products.map((product) => <tr key={product.product_id}><td><b>{product.name}</b></td><td><span className="tag">{product.category}</span></td><td>{product.quantity}</td><td><strong>{money(product.revenue)}</strong></td></tr>)}</tbody></table></div>}</section></div></>}
  </>;
}

function SettingsView({ apiOnline, dark, onToggleDark }: { apiOnline: boolean; dark: boolean; onToggleDark: () => void }) {
  return <><PageHeader eyebrow="SÄ°STEM" title="Panel ayarlarÄ±" description="Magic Coffee yÃ¶netim ortamÄ±nÄ±n temel baÄŸlantÄ±larÄ±nÄ± ve gÃ¶rÃ¼nÃ¼mÃ¼nÃ¼ kontrol et." />
    <div className="settings-grid"><section className="panel-card"><header><div><small>SERVÄ°S DURUMU</small><h3>Magic Coffee API</h3></div><span className={`health-dot ${apiOnline ? 'online' : ''}`} /></header><p>Panel ve kiosk aynÄ± merkezi katalog ve sipariÅŸ servisini kullanÄ±r.</p><div className="setting-line"><span><Database /><div><b>Backend baÄŸlantÄ±sÄ±</b><small>http://127.0.0.1:8300</small></div></span><strong>{apiOnline ? 'Ã‡evrimiÃ§i' : 'Ã‡evrimdÄ±ÅŸÄ±'}</strong></div></section>
      <section className="panel-card"><header><div><small>GÃ–RÃœNÃœM</small><h3>Tema tercihi</h3></div></header><p>Panel gÃ¶rÃ¼nÃ¼mÃ¼nÃ¼ Ã§alÄ±ÅŸma ortamÄ±na gÃ¶re deÄŸiÅŸtir.</p><button className="setting-line clickable" onClick={onToggleDark}><span>{dark ? <Moon /> : <Sun />}<div><b>{dark ? 'KaranlÄ±k mod' : 'AydÄ±nlÄ±k mod'}</b><small>DeÄŸiÅŸtirmek iÃ§in tÄ±kla</small></div></span><ChevronRight /></button></section>
      <section className="panel-card"><header><div><small>KÄ°OSK</small><h3>CanlÄ± menÃ¼</h3></div></header><p>Panelde yaptÄ±ÄŸÄ±n deÄŸiÅŸiklikleri kiosk ekranÄ±nda kontrol et.</p><a className="setting-line clickable" href="http://127.0.0.1:5370" target="_blank" rel="noreferrer"><span><ExternalLink /><div><b>Kiosku aÃ§</b><small>Yeni sekmede gÃ¶rÃ¼ntÃ¼le</small></div></span><ChevronRight /></a></section></div>
  </>;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('magic-panel-theme') === 'dark');
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  const notify = (value: string) => { setMessage(value); window.setTimeout(() => setMessage(''), 2800); };
  const loadCore = useCallback(async () => { setLoading(true); try { const [health, categoryData, productData] = await Promise.all([api.health(), api.categories(), api.products()]); setApiOnline(health.status === 'ok'); setCategories(categoryData); setProducts(productData); } catch { setApiOnline(false); } finally { setLoading(false); } }, []);
  const loadDashboard = useCallback(async () => { setLoading(true); try { setDashboard(await api.dashboard()); } finally { setLoading(false); } }, []);
  const loadStock = useCallback(async () => { setLoading(true); try { const [stock, history] = await Promise.all([api.stock(), api.stockMovements()]); setProducts(stock); setMovements(history); } finally { setLoading(false); } }, []);
  const loadOrders = useCallback(async () => { setLoading(true); try { setOrders(await api.orders()); } finally { setLoading(false); } }, []);
  const loadReports = useCallback(async (start: string, end: string) => { setLoading(true); try { setReport(await api.reports(start, end)); } finally { setLoading(false); } }, []);
  useEffect(() => { loadCore(); loadDashboard(); }, [loadCore, loadDashboard]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('magic-panel-theme', dark ? 'dark' : 'light'); }, [dark]);
  const navigate = (view: ViewKey) => { setActiveView(view); setMobileNav(false); if (view === 'dashboard') loadDashboard(); if (view === 'orders') loadOrders(); if (view === 'stock') loadStock(); };
  const refreshCore = async () => { await loadCore(); notify('Veriler yenilendi.'); };
  const createProduct = async (draft: ProductDraft) => { await api.createProduct(draft); await loadCore(); notify('ÃœrÃ¼n oluÅŸturuldu ve kioska eklendi.'); };
  const updateProduct = async (id: string, draft: ProductDraft) => { await api.updateProduct(id, draft); await loadCore(); notify('ÃœrÃ¼n gÃ¼ncellendi.'); };
  const deleteProduct = async (id: string) => { await api.deleteProduct(id); await loadCore(); notify('ÃœrÃ¼n silindi.'); };
  const createCategory = async (value: Partial<Category>) => { await api.createCategory(value); await loadCore(); notify('Kategori oluÅŸturuldu.'); };
  const updateCategory = async (id: string, value: Partial<Category>) => { await api.updateCategory(id, value); await loadCore(); notify('Kategori gÃ¼ncellendi.'); };
  const deleteCategory = async (id: string) => { await api.deleteCategory(id); await loadCore(); notify('Kategori silindi.'); };
  const reorderCategories = async (ids: string[]) => { const ordered = ids.map((id, position) => ({ ...categories.find((item) => item.id === id)!, position })); setCategories(ordered); try { await api.reorderCategories(ids); notify('Kategori sÄ±rasÄ± gÃ¼ncellendi.'); } catch { await loadCore(); } };
  const adjustStock = async (id: string, payload: { mode: 'set' | 'add' | 'remove'; quantity: number; note: string }) => { await api.adjustStock(id, payload); await loadStock(); notify('Stok hareketi kaydedildi.'); };
  const updateStockSettings = async (id: string, payload: { stockTrackingEnabled?: boolean; stockSellable?: boolean }) => { await api.updateStockSettings(id, payload); await loadStock(); notify(payload.stockTrackingEnabled === true ? 'Stok takibi aÃ§Ä±ldÄ±.' : payload.stockTrackingEnabled === false ? 'Stok takibi kapatÄ±ldÄ±.' : payload.stockSellable === false ? 'ÃœrÃ¼n anlÄ±k satÄ±ÅŸa kapatÄ±ldÄ±.' : 'ÃœrÃ¼n yeniden satÄ±ÅŸa aÃ§Ä±ldÄ±.'); };
  const viewTitle = navGroups.flatMap((group) => group.items).find((item) => item.key === activeView)?.label ?? '';
  return <div className="app">
    <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav((value) => !value)}><MenuIcon /></button><Brand /><div className="top-actions"><span className={`api-pill ${apiOnline ? 'online' : ''}`}><Activity /> Backend: {apiOnline ? 'online' : 'offline'}</span><a href="http://127.0.0.1:5370" target="_blank" rel="noreferrer"><ExternalLink /> Kiosku AÃ§</a><button onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}{dark ? 'AydÄ±nlÄ±k Mod' : 'KaranlÄ±k Mod'}</button><span className="avatar">MC</span></div></header>
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="sidebar-title">Magic Coffee Panel</div><nav>{navGroups.map((group) => <section key={group.label}><small>{group.label}</small>{group.items.map((item) => <button className={activeView === item.key ? 'active' : ''} key={item.key} onClick={() => navigate(item.key)}><item.icon /><span>{item.label}</span><ChevronRight /></button>)}</section>)}</nav></aside>
    <main className="content"><div className="mobile-title">{viewTitle}</div>{activeView === 'dashboard' && <DashboardView data={dashboard} loading={loading} onRefresh={loadDashboard} onNavigate={navigate} />}{activeView === 'products' && <ProductsView products={products} categories={categories} loading={loading} onRefresh={refreshCore} onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}{activeView === 'categories' && <CategoriesView categories={categories} loading={loading} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} onReorder={reorderCategories} />}{activeView === 'stock' && <StockView products={products} movements={movements} loading={loading} onRefresh={loadStock} onAdjust={adjustStock} onSettings={updateStockSettings} />}{activeView === 'orders' && <OrdersView orders={orders} loading={loading} onRefresh={loadOrders} />}{activeView === 'reports' && <ReportsView report={report} loading={loading} onLoad={loadReports} />}{activeView === 'settings' && <SettingsView apiOnline={apiOnline} dark={dark} onToggleDark={() => setDark((value) => !value)} />}</main>
    {message && <div className="toast"><Check />{message}</div>}
  </div>;
}

