import { AlertTriangle, Check, Coffee, Copy, Edit3, KeyRound, ListChecks, Loader2, PackagePlus, Plus, RefreshCcw, Search, Trash2, Undo2, Wifi, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Category, Machine, MachineDraft, MachineMode, MachineProduct, MachineProductOption, Product, VendJob, VendJobStatus } from './types';

const money = (value: number) => `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
const dateTime = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const relativeTime = (value: string | null) => {
  if (!value) return 'Hiç bağlanmadı';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds} sn önce`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} dk önce`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} sa önce`;
  return `${Math.round(seconds / 86400)} gün önce`;
};

export const MODE_LABELS: Record<MachineMode, string> = { AUTO: 'Otomatik', REMOTE: 'Uzaktan seçim', CREDIT: 'Kredi (düğme)' };
const MODE_HINTS: Record<MachineMode, string> = {
  AUTO: 'Köprü cihazı makinenin MDB özelliklerine bakarak modu kendisi seçer.',
  REMOTE: 'MDB 4.3 uzaktan ürün seçimi: makine ürünü kiosktaki seçime göre kendisi hazırlar.',
  CREDIT: 'Eski makineler: kioskta ödeme alınır, müşteri makinede ilgili ürün düğmesine basar.',
};

export const VEND_STATUS: Record<VendJobStatus, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  QUEUED: { label: 'Sırada', tone: 'muted' },
  SENT: { label: 'Gönderildi', tone: 'muted' },
  WAITING_SELECTION: { label: 'Seçim bekleniyor', tone: 'warn' },
  DISPENSING: { label: 'Hazırlanıyor', tone: 'muted' },
  SUCCESS: { label: 'Başarılı', tone: 'ok' },
  FAILED: { label: 'Başarısız', tone: 'warn' },
  EXPIRED: { label: 'Zaman aşımı', tone: 'warn' },
  REFUNDED: { label: 'İade edildi', tone: 'ok' },
  REFUND_FAILED: { label: 'İade başarısız', tone: 'danger' },
};

/** Panelde dikkat gerektiren otomat işi: iadesi başarısız olan veya elle iade bekleyen. */
export const vendNeedsAttention = (job: VendJob) => job.status === 'REFUND_FAILED' || job.needsManualRefund;

/** Kredi modunda (elle veya tespitle) müşteri ürünü makinede kendisi seçer. */
const machineUsesCredit = (machine: Machine) => machine.mode === 'CREDIT' || (machine.mode === 'AUTO' && machine.detectedMode === 'CREDIT');

function Modal({ title, subtitle, onClose, children, footer, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`}>
      <header><div><small>{subtitle}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
      <div className="modal__body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

function Loading() { return <div className="state-card"><Loader2 className="spin" /><b>Veriler hazırlanıyor</b><span>Lütfen kısa bir süre bekleyin.</span></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><PackagePlus /><b>{title}</b><span>{text}</span></div>; }

function MachineModal({ machine, onClose, onSave }: { machine: Machine | null; onClose: () => void; onSave: (draft: MachineDraft) => Promise<void> }) {
  const [id, setId] = useState(machine?.id ?? '');
  const [name, setName] = useState(machine?.name ?? '');
  const [mode, setMode] = useState<MachineMode>(machine?.mode ?? 'AUTO');
  const [active, setActive] = useState(machine?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanId = id.trim().toLowerCase();
    if (!machine && cleanId && !/^[a-z0-9_-]{1,32}$/.test(cleanId)) { setError('Otomat kimliği en fazla 32 karakter; küçük harf, rakam, - ve _ olabilir (ör. m01).'); return; }
    if (name.trim().length < 2) { setError('Otomat adı en az 2 karakter olmalıdır.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...(machine ? {} : cleanId ? { id: cleanId } : {}), name: name.trim(), mode, active }); onClose(); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };
  return <Modal title={machine ? 'Otomatı düzenle' : 'Yeni otomat'} subtitle="KAHVE OTOMATI" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="machine-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}>
    <form id="machine-form" className="form-stack" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      {!machine && <label><span>Otomat kimliği (isteğe bağlı)</span><input value={id} onChange={(event) => setId(event.target.value.replace(/\s/g, '').toLowerCase())} placeholder="m01" maxLength={32} /><small className="field-hint">Boş bırakılırsa sunucu sıradaki kimliği (m01, m02…) verir. Sonradan değiştirilemez.</small></label>}
      <label><span>Otomat adı</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Magic Coffee Kahve Makinesi" /></label>
      <label><span>Satış modu</span><select value={mode} onChange={(event) => setMode(event.target.value as MachineMode)}>{(Object.keys(MODE_LABELS) as MachineMode[]).map((item) => <option key={item} value={item}>{MODE_LABELS[item]}</option>)}</select><small className="field-hint">{MODE_HINTS[mode]}{machine?.detectedMode ? ` Köprünün tespit ettiği mod: ${MODE_LABELS[machine.detectedMode]}.` : ''}</small></label>
      {mode === 'CREDIT' && <div className="inline-warning"><AlertTriangle /> Kredi modunda müşteri ödemeden sonra makinede ilgili ürün düğmesine basmalıdır.</div>}
      {machine?.modeWarning && <div className="inline-warning"><AlertTriangle /> {machine.modeWarning}</div>}
      <label className="switch-line"><span><b>Otomat aktif</b><small>Kiosk tek aktif otomatı kullanır. Pasif otomata satış işi gönderilmez; kiosk normal sipariş alır.</small></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
    </form>
  </Modal>;
}

/** Köprü token'ı: üretildiğinde yalnız bir kez gösterilir. */
function TokenModal({ machine, onClose, onCreate }: { machine: Machine; onClose: () => void; onCreate: (id: string) => Promise<string> }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const create = async () => {
    setBusy(true); setError('');
    try {
      const value = await onCreate(machine.id);
      if (!value) throw new Error('Sunucu token döndürmedi.');
      setToken(value);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); }
    catch {
      const input = document.getElementById('machine-token-value') as HTMLInputElement | null;
      input?.select();
      setCopied(document.execCommand?.('copy') ?? false);
    }
  };
  return <Modal title={`${machine.name} · Token`} subtitle="KÖPRÜ CİHAZI ERİŞİMİ" onClose={onClose} footer={token ? <button className="primary" onClick={onClose}><Check /> Kaydettim, kapat</button> : <><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" disabled={busy} onClick={() => void create()}>{busy ? <Loader2 className="spin" /> : <KeyRound />} Token oluştur</button></>}>
    <div className="form-stack">
      {error && <div className="form-error">{error}</div>}
      {!token ? <>
        <p className="muted">Köprü cihazı (Raspberry Pi) API'ye bu token ile bağlanır. Token sunucuda yalnız özet (hash) olarak saklanır ve <b>yalnız bir kez</b> gösterilir.</p>
        {machine.hasToken && <div className="inline-warning"><AlertTriangle /> Bu otomatın mevcut token'ı geçersiz olur; köprü cihazına yeni token girilene kadar otomat satış yapamaz.</div>}
      </> : <>
        <div className="inline-warning"><AlertTriangle /> Bu token bir daha gösterilmeyecek. Şimdi kopyalayıp köprü cihazındaki MACHINE_TOKEN ayarına girin.</div>
        <div className="token-box"><input id="machine-token-value" readOnly value={token} onFocus={(event) => event.currentTarget.select()} /><button className="secondary compact" onClick={() => void copy()}>{copied ? <Check /> : <Copy />} {copied ? 'Kopyalandı' : 'Kopyala'}</button></div>
      </>}
    </div>
  </Modal>;
}

type MappingDraft = { selectionNo: string; price: string; active: boolean };
const mappingKey = (productId: string, optionKey: string) => `${productId}\u0000${optionKey}`;

/** Ürün ve ürün × seçenek kombinasyonu → makine ürün numarası eşleme ekranı. */
function MappingModal({ machine, products, categories, loadMappings, loadOptions, onClose, onSave }: {
  machine: Machine; products: Product[]; categories: Category[];
  loadMappings: (id: string) => Promise<MachineProduct[]>;
  loadOptions: (id: string, productId: string) => Promise<MachineProductOption[]>;
  onClose: () => void; onSave: (id: string, rows: MachineProduct[]) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, MappingDraft>>({});
  const [options, setOptions] = useState<Record<string, MachineProductOption[] | 'loading' | string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [onlyMapped, setOnlyMapped] = useState(false);
  const categoryName = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);

  useEffect(() => {
    let cancelled = false;
    loadMappings(machine.id).then((rows) => {
      if (cancelled) return;
      setDrafts(Object.fromEntries(rows.map((row) => [mappingKey(row.productId, row.optionKey), { selectionNo: String(row.selectionNo), price: row.price == null ? '' : String(row.price), active: row.active }])));
    }).catch((err: Error) => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadMappings, machine.id]);

  const fetchOptions = async (productId: string) => {
    setOptions((current) => ({ ...current, [productId]: 'loading' }));
    try {
      const list = await loadOptions(machine.id, productId);
      setOptions((current) => ({ ...current, [productId]: list }));
      // Sunucuda eşlenmiş kombinasyonlar (taslakta yoksa) doldurulur.
      setDrafts((current) => {
        const next = { ...current };
        list.forEach((option) => {
          const key = mappingKey(productId, option.optionKey);
          if (option.mapped && option.selectionNo != null && !next[key]) next[key] = { selectionNo: String(option.selectionNo), price: option.mappedPrice == null ? '' : String(option.mappedPrice), active: true };
        });
        return next;
      });
    }
    catch (err) { setOptions((current) => ({ ...current, [productId]: (err as Error).message || 'Seçenekler alınamadı.' })); }
  };
  const update = (key: string, patch: Partial<MappingDraft>) => setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? { selectionNo: '', price: '', active: true }), ...patch } }));
  const mappedKeysOf = (productId: string) => Object.keys(drafts).filter((key) => key.startsWith(`${productId}\u0000`) && drafts[key].selectionNo.trim());
  const term = search.trim().toLocaleLowerCase('tr-TR');
  const visible = products.filter((product) => (!category || product.categoryId === category) && (!term || `${product.name} ${product.id}`.toLocaleLowerCase('tr-TR').includes(term)) && (!onlyMapped || mappedKeysOf(product.id).length > 0));
  const mappedCount = Object.values(drafts).filter((item) => item.selectionNo.trim()).length;

  const save = async () => {
    const rows: MachineProduct[] = [];
    const used = new Map<number, string>();
    for (const [key, draft] of Object.entries(drafts)) {
      if (!draft.selectionNo.trim()) continue;
      const [productId, optionKey] = key.split('\u0000');
      const productName = products.find((item) => item.id === productId)?.name ?? productId;
      const selectionNo = Number(draft.selectionNo);
      if (!Number.isInteger(selectionNo) || selectionNo < 0 || selectionNo > 9999) { setError(`${productName}: makine ürün numarası 0–9999 arasında tam sayı olmalıdır.`); return; }
      const price = draft.price.trim() === '' ? null : Number(draft.price.replace(',', '.'));
      if (price !== null && (!Number.isFinite(price) || price <= 0)) { setError(`${productName}: fiyat pozitif olmalı veya boş bırakılmalıdır.`); return; }
      if (draft.active && used.has(selectionNo)) { setError(`${selectionNo} numarası birden fazla aktif eşlemede kullanılıyor (${used.get(selectionNo)} ve ${productName}). Kioskta seçilen ürün makinede tam olarak aynı ürün olmalıdır.`); return; }
      if (draft.active) used.set(selectionNo, productName);
      rows.push({ productId, optionKey, selectionNo, price, active: draft.active });
    }
    setSaving(true); setError('');
    try { await onSave(machine.id, rows); onClose(); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const row = (product: Product, optionKey: string, label: string, basePrice: number | null) => {
    const key = mappingKey(product.id, optionKey);
    const draft = drafts[key] ?? { selectionNo: '', price: '', active: true };
    const mapped = Boolean(draft.selectionNo.trim());
    return <div className={`mapping-row ${mapped ? 'is-mapped' : ''} ${optionKey ? 'mapping-row--variant' : ''}`} key={key}>
      <span className="mapping-row__label"><b>{label}</b>{optionKey && <code>{optionKey}</code>}</span>
      <label className="mapping-row__field"><span>Makine no</span><input type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={draft.selectionNo} onChange={(event) => update(key, { selectionNo: event.target.value })} /></label>
      <label className="mapping-row__field"><span>Fiyat (TL)</span><input type="number" inputMode="decimal" min="0" step="0.01" placeholder={basePrice != null ? String(basePrice) : 'Ürün fiyatı'} value={draft.price} disabled={!mapped} onChange={(event) => update(key, { price: event.target.value })} /></label>
      <label className="mapping-row__active" title="Eşleme aktif"><input type="checkbox" checked={draft.active} disabled={!mapped} onChange={(event) => update(key, { active: event.target.checked })} /><span>Aktif</span></label>
      <button type="button" className="icon-button" title="Eşlemeyi kaldır" disabled={!mapped} onClick={() => update(key, { selectionNo: '', price: '' })}><Trash2 /></button>
    </div>;
  };

  return <Modal wide title={`${machine.name} · Ürün eşleme`} subtitle="OTOMAT ÜRÜNLERİ" onClose={onClose} footer={<><span className="muted mapping-count">{mappedCount} eşleme</span><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" disabled={saving || loading} onClick={() => void save()}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}>
    <div className="form-stack">
      <p className="muted">Kioskta seçilen ürün makinede <b>tam olarak aynı</b> ürün olmalıdır. Seçenekli ürünlerde (boy, ürün notları) her kombinasyon ayrı makine numarasına eşlenir; eşlenmeyen ürün ve kombinasyonlar kioskta gösterilmez. Fiyat boşsa ürün (ve seçenek) fiyatı kullanılır.</p>
      {machineUsesCredit(machine) && <div className="inline-warning"><AlertTriangle /> Kredi modu: müşteri ödemeden sonra makinede bu numaralı düğmeye basmalıdır; numaralar ve fiyatlar makinedekiyle aynı olmalıdır.</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="toolbar mapping-toolbar">
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Kategori"><option value="">Tüm kategoriler</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ürün ara..." /></label>
        <label className="mapping-only"><input type="checkbox" checked={onlyMapped} onChange={(event) => setOnlyMapped(event.target.checked)} /><span>Yalnız eşlenenler</span></label>
      </div>
      {loading ? <Loading /> : !visible.length ? <Empty title="Ürün bulunamadı" text="Kategori veya arama filtresini değiştirin." /> : <div className="mapping-list">
        {visible.map((product) => {
          const productOptions = options[product.id];
          const loaded = Array.isArray(productOptions) ? productOptions.filter((item) => item.optionKey) : [];
          // Yüklenmemiş ama daha önce eşlenmiş varyantlar da gösterilir.
          const savedVariants = mappedKeysOf(product.id).map((key) => key.split('\u0000')[1]).filter((key) => key && !loaded.some((item) => item.optionKey === key));
          return <section className="mapping-product" key={product.id}>
            <header><div><b>{product.name}</b><small>{product.id} · {money(product.price)}</small></div><span className="tag">{product.categoryName ?? categoryName.get(product.categoryId) ?? product.categoryId}</span>
              <button type="button" className="secondary compact" disabled={productOptions === 'loading'} onClick={() => void fetchOptions(product.id)}>{productOptions === 'loading' ? <Loader2 className="spin" /> : <ListChecks />} {Array.isArray(productOptions) ? 'Seçenekleri yenile' : 'Seçenek kombinasyonları'}</button>
            </header>
            {row(product, '', 'Standart (seçeneksiz)', product.price)}
            {loaded.map((option) => row(product, option.optionKey, option.label, option.price))}
            {savedVariants.map((optionKey) => row(product, optionKey, optionKey, null))}
            {typeof productOptions === 'string' && productOptions !== 'loading' && <div className="form-error">{productOptions}</div>}
            {Array.isArray(productOptions) && !loaded.length && <small className="muted">Bu ürünün seçenek kombinasyonu yok; yalnız standart hali eşlenir.</small>}
          </section>;
        })}
      </div>}
    </div>
  </Modal>;
}

const JOB_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'REFUND_FAILED', label: 'Dikkat: iade başarısız' },
  { value: 'FAILED', label: 'Başarısız' },
  { value: 'EXPIRED', label: 'Zaman aşımı' },
  { value: 'REFUNDED', label: 'İade edildi' },
  { value: 'SUCCESS', label: 'Başarılı' },
  { value: 'QUEUED', label: 'Sırada' },
  { value: 'WAITING_SELECTION', label: 'Seçim bekleniyor' },
  { value: 'DISPENSING', label: 'Hazırlanıyor' },
];

export function MachinesView({ machines, products, categories, jobs, loading, jobsLoading, error, jobsError, jobFilter, onJobFilter, onRefresh, onRefreshJobs, onCreate, onUpdate, onDelete, onCreateToken, loadMappings, loadOptions, onSaveMappings, onRetryRefund }: {
  machines: Machine[]; products: Product[]; categories: Category[]; jobs: VendJob[];
  loading: boolean; jobsLoading: boolean; error: string; jobsError: string;
  jobFilter: { machine: string; status: string }; onJobFilter: (patch: Partial<{ machine: string; status: string }>) => void;
  onRefresh: () => void; onRefreshJobs: () => void;
  onCreate: (draft: MachineDraft) => Promise<void>;
  onUpdate: (id: string, draft: Partial<MachineDraft>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateToken: (id: string) => Promise<string>;
  loadMappings: (id: string) => Promise<MachineProduct[]>;
  loadOptions: (id: string, productId: string) => Promise<MachineProductOption[]>;
  onSaveMappings: (id: string, rows: MachineProduct[]) => Promise<void>;
  onRetryRefund: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Machine | null | undefined>(undefined);
  const [tokenFor, setTokenFor] = useState<Machine | null>(null);
  const [mappingFor, setMappingFor] = useState<Machine | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const machineById = useMemo(() => new Map(machines.map((item) => [item.id, item])), [machines]);
  const attention = jobs.filter(vendNeedsAttention).length;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key); setActionError('');
    try { await action(); } catch (err) { setActionError((err as Error).message); } finally { setBusy(null); }
  };
  const remove = (machine: Machine) => {
    if (window.confirm(`"${machine.name}" silinsin mi? Ürün eşlemeleri de silinir; kiosk otomatsız (normal) çalışır.`)) void run(`del:${machine.id}`, () => onDelete(machine.id));
  };

  return <>
    <header className="page-header"><div><small>KAHVE OTOMATI</small><h1>Otomatlar</h1><p>Kioska bağlı kahve otomatını (MDB köprü cihazı), ürün → makine numarası eşlemelerini ve otomat satış işlerini yönet. Başarısız satışlar otomatik iade edilir.</p></div><div className="page-actions"><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)}><Plus /> Otomat Ekle</button></div></header>
    <div className="pos-stats machine-stats">
      <article><Coffee /><div><small>KAYITLI OTOMAT</small><b>{machines.length}</b></div></article>
      <article><Wifi /><div><small>ÇEVRİMİÇİ</small><b>{machines.filter((item) => item.online).length}</b></div></article>
      <article><ListChecks /><div><small>EŞLENEN ÜRÜN</small><b>{machines.filter((item) => item.active).reduce((sum, item) => sum + item.productCount, 0)}</b></div></article>
      <article className={attention ? 'warning' : ''}><AlertTriangle /><div><small>DİKKAT GEREKTİREN İŞ</small><b>{attention}</b></div></article>
    </div>
    {error && <div className="form-error pos-page-error">{error}</div>}
    {actionError && <div className="form-error pos-page-error">{actionError}</div>}
    <section className="table-card">{loading && !machines.length ? <Loading /> : !machines.length ? <Empty title="Henüz otomat yok" text="Otomat ekleyin, köprü cihazı için token oluşturun ve ürünleri makine numaralarına eşleyin." /> : <div className="table-wrap"><table><thead><tr><th>Otomat</th><th>Mod</th><th>Bağlantı</th><th>Ajan</th><th>Eşleme</th><th>Durum</th><th /></tr></thead><tbody>
      {machines.map((machine) => <tr key={machine.id} className={machine.active ? '' : 'is-passive'}>
        <td><div className="terminal-cell"><span><Coffee /></span><div><b>{machine.name}</b><small>{machine.id}{machine.hasToken ? '' : ' · token yok'}</small></div></div></td>
        <td><span className="cell-stack"><b>{MODE_LABELS[machine.mode]}</b><small>{machine.detectedMode ? `Tespit: ${MODE_LABELS[machine.detectedMode]}` : 'Tespit bekleniyor'}</small>{machineUsesCredit(machine) && <span className="warn-chip" title="Kredi modunda kiosk ödemeyi alır, müşteri ürünü makinede kendisi seçer."><AlertTriangle /> Müşteri makinede düğmeye basmalı</span>}{machine.modeWarning && <small className="mode-warning">{machine.modeWarning}</small>}</span></td>
        <td><span className="cell-stack">{machine.online ? <span className="online-badge online"><i />Çevrimiçi</span> : <span className="online-badge" title={machine.lastSeenAt ? `Son görülme: ${new Date(machine.lastSeenAt).toLocaleString('tr-TR')}` : 'Köprü cihazı henüz bağlanmadı'}><i />{relativeTime(machine.lastSeenAt)}</span>}{machine.lastSeenAt && <small>{dateTime(machine.lastSeenAt)}</small>}</span></td>
        <td>{machine.agentVersion ? <code>{machine.agentVersion}</code> : <span className="muted">—</span>}</td>
        <td><span className="cell-stack"><b>{machine.productCount} eşleme</b>{machine.activeJobCount > 0 && <small>{machine.activeJobCount} iş sürüyor</small>}</span></td>
        <td><button className={`stock-toggle ${machine.active ? 'is-on' : ''}`} disabled={busy === machine.id} onClick={() => void run(machine.id, () => onUpdate(machine.id, { active: !machine.active }))}>{busy === machine.id ? <Loader2 className="spin" /> : null}{machine.active ? 'Aktif' : 'Pasif'}</button></td>
        <td><div className="row-actions"><button title="Ürün eşleme" onClick={() => setMappingFor(machine)}><ListChecks /></button><button title="Token oluştur" onClick={() => setTokenFor(machine)}><KeyRound /></button><button title="Düzenle" onClick={() => setEditing(machine)}><Edit3 /></button><button className="danger" title="Sil" disabled={busy === `del:${machine.id}`} onClick={() => remove(machine)}><Trash2 /></button></div></td>
      </tr>)}
    </tbody></table></div>}</section>

    <div className="toolbar vend-toolbar">
      <b className="toolbar-title">Son otomat satış işleri</b>
      <select value={jobFilter.machine} onChange={(event) => onJobFilter({ machine: event.target.value })} aria-label="Otomat"><option value="">Tüm otomatlar</option>{machines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={jobFilter.status} onChange={(event) => onJobFilter({ status: event.target.value })} aria-label="Durum">{JOB_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <span>{jobs.length} iş</span>
      <button className="secondary compact" onClick={onRefreshJobs}><RefreshCcw /> Yenile</button>
    </div>
    {jobsError && <div className="form-error pos-page-error">{jobsError}</div>}
    <section className="table-card">{jobsLoading && !jobs.length ? <Loading /> : !jobs.length ? <Empty title="Otomat işi yok" text="Seçili filtrede otomat satış işi bulunamadı." /> : <div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Sipariş</th><th>Otomat</th><th>Ürün</th><th>Tutar</th><th>Durum</th><th>Mesaj</th><th /></tr></thead><tbody>
      {jobs.map((job) => {
        const status = VEND_STATUS[job.status];
        const machine = machineById.get(job.machineId);
        const canRetry = job.status === 'REFUND_FAILED';
        return <tr key={job.id} className={vendNeedsAttention(job) ? 'is-attention' : ''}>
          <td>{job.createdAt ? dateTime(job.createdAt) : '—'}</td>
          <td><strong>{job.orderNumber || '—'}</strong></td>
          <td>{machine?.name ?? (job.machineId || '—')}</td>
          <td><span className="cell-stack"><b>{job.productName || job.productId}</b><small>{[job.variantLabel, job.selectionNo != null ? `#${job.selectionNo}` : ''].filter(Boolean).join(' · ') || '—'}</small></span></td>
          <td><strong>{money(job.amount)}</strong></td>
          <td><span className={`vend-status vend-status--${status.tone}`}>{status.label}</span>{job.attempts > 1 && <small className="cell-sub">{job.attempts} deneme</small>}</td>
          <td className="vend-message">{job.message || <span className="muted">—</span>}</td>
          <td>{canRetry && <button className="secondary compact" disabled={busy === `retry:${job.id}`} onClick={() => void run(`retry:${job.id}`, () => onRetryRefund(job.id))}>{busy === `retry:${job.id}` ? <Loader2 className="spin" /> : <Undo2 />} İadeyi tekrar dene</button>}</td>
        </tr>;
      })}
    </tbody></table></div>}</section>

    {editing !== undefined && <MachineModal machine={editing} onClose={() => setEditing(undefined)} onSave={(draft) => editing ? onUpdate(editing.id, draft) : onCreate(draft)} />}
    {tokenFor && <TokenModal machine={tokenFor} onClose={() => { setTokenFor(null); onRefresh(); }} onCreate={onCreateToken} />}
    {mappingFor && <MappingModal machine={mappingFor} products={products} categories={categories} loadMappings={loadMappings} loadOptions={loadOptions} onClose={() => setMappingFor(null)} onSave={onSaveMappings} />}
  </>;
}
