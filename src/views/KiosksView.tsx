import { AlertTriangle, Check, CreditCard, Edit3, LayoutGrid, List, Loader2, MonitorSmartphone, RefreshCcw, Search, TrendingUp, Wifi } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { ApiError, normalizeSerial } from '../api';
import { SectionChip, SectionIcon, accentStyle } from '../sections';
import type { CastlesDevice, Kiosk, KioskUpdate, Section } from '../types';
import { Empty, ErrorBanner, Modal, PageHeader, Skeleton, Switch, money, relativeTime } from '../ui';

type StatusFilter = 'all' | 'online' | 'offline' | 'no-pos' | 'passive';

export function OnlineBadge({ kiosk, now }: { kiosk: Kiosk; now: number }) {
  return kiosk.online
    ? <span className="online-badge online"><i />Çevrimiçi</span>
    : <span className="online-badge" title={kiosk.lastSeenAt ? `Son görülme: ${new Date(kiosk.lastSeenAt).toLocaleString('tr-TR')}` : 'Kiosk henüz bağlanmadı'}><i />{relativeTime(kiosk.lastSeenAt, now)}</span>;
}

export function PosChip({ serial, device }: { serial: string | null; device?: CastlesDevice }) {
  if (!serial) return <span className="warn-chip"><AlertTriangle /> Atanmamış</span>;
  return <span className="pos-chip" title={device ? `${device.name}${device.active ? '' : ' (pasif)'}` : 'Cihaz listesinde bulunamadı'}><CreditCard /><code>{serial}</code>{device && !device.active && <em>pasif</em>}</span>;
}

/** Cihaz → atanmış kiosk; API assignedKioskId vermezse kiosk.posSerial üzerinden eşleştirilir. */
export function deviceAssignments(devices: CastlesDevice[], kiosks: Kiosk[]) {
  const map = new Map<string, string>();
  devices.forEach((device) => {
    const kioskId = device.assignedKioskId
      ?? kiosks.find((kiosk) => kiosk.posSerial && normalizeSerial(kiosk.posSerial) === normalizeSerial(device.serial))?.id;
    if (kioskId) map.set(device.serial, kioskId);
  });
  return map;
}

export const findDevice = (devices: CastlesDevice[], serial: string | null) =>
  serial ? devices.find((device) => device.serial === serial || normalizeSerial(device.serial) === normalizeSerial(serial)) : undefined;

function KioskModal({ kiosk, kiosks, sections, devices, onClose, onSave }: {
  kiosk: Kiosk; kiosks: Kiosk[]; sections: Section[]; devices: CastlesDevice[];
  onClose: () => void; onSave: (payload: KioskUpdate) => Promise<void>;
}) {
  const current = findDevice(devices, kiosk.posSerial);
  const [name, setName] = useState(kiosk.name);
  const [featuredSectionId, setFeaturedSectionId] = useState(kiosk.featuredSectionId);
  const [posSerial, setPosSerial] = useState(current?.serial ?? kiosk.posSerial ?? '');
  const [active, setActive] = useState(kiosk.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const assignments = useMemo(() => deviceAssignments(devices, kiosks), [devices, kiosks]);
  const kioskName = (id: string) => kiosks.find((item) => item.id === id)?.name ?? id.toUpperCase();
  const selectedSection = sections.find((item) => item.id === featuredSectionId);
  const unknownSerial = kiosk.posSerial && !current ? kiosk.posSerial : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Kiosk adı boş bırakılamaz.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), featuredSectionId, posSerial: posSerial || null, active });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(err.message || 'Bu POS cihazı başka bir kioska atanmış. Önce o kiosktan kaldırın.');
      else setError((err as Error).message || 'Kiosk kaydedilemedi.');
    } finally { setSaving(false); }
  };

  return <Modal title={`${kiosk.id.toUpperCase()} · Kiosku düzenle`} subtitle="KİOSK PROFİLİ" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="kiosk-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}>
    <form id="kiosk-form" className="form-stack" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <div className="kiosk-preview" style={accentStyle(selectedSection?.accent)}><span><SectionIcon name={selectedSection?.icon} /></span><div><b>{name || 'Kiosk adı'}</b><small>Vitrin: {selectedSection?.name ?? 'Seçilmedi'} · Sipariş öneki {selectedSection?.orderPrefix || kiosk.orderPrefix || '—'}</small></div></div>
      <label><span>Kiosk adı</span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Kiosk 01 · Kahve" /></label>
      <label><span>Vitrin kategorisi</span><select value={featuredSectionId} onChange={(event) => setFeaturedSectionId(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}{section.active ? '' : ' (pasif)'}</option>)}</select><small className="field-hint">Kiosk ana menüsünde öne çıkarılır; sipariş numarası öneki bu kategoriden gelir.</small></label>
      <label><span>Castles POS cihazı</span><select value={posSerial} onChange={(event) => setPosSerial(event.target.value)}>
        <option value="">— Atanmamış (POS'u kaldır) —</option>
        {unknownSerial && <option value={unknownSerial}>{unknownSerial} · listede yok</option>}
        {devices.map((device) => {
          const owner = assignments.get(device.serial);
          const taken = Boolean(owner && owner !== kiosk.id);
          return <option key={device.serial} value={device.serial} disabled={taken}>{device.serial} · {device.name}{device.active ? '' : ' (pasif)'}{taken && owner ? ` — ${kioskName(owner)} kioskuna atanmış` : ''}</option>;
        })}
      </select><small className="field-hint">{devices.length ? 'Başka kioska atanmış cihazlar seçilemez. Önce o kiosktan kaldırın.' : 'Henüz Castles cihazı yok. POS Cihazları sayfasından ekleyin.'}</small></label>
      {!posSerial && <div className="inline-warning"><AlertTriangle /> POS atanmadan bu kiosk ödeme alamaz.</div>}
      <label className="switch-line"><span><b>Kiosk aktif</b><small>Pasif kiosklar API'ye bağlanamaz ve sipariş alamaz.</small></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
    </form>
  </Modal>;
}

export function KiosksView({ kiosks, sections, devices, loading, error, now, onRefresh, onUpdate }: {
  kiosks: Kiosk[]; sections: Section[]; devices: CastlesDevice[]; loading: boolean; error: string; now: number;
  onRefresh: () => void; onUpdate: (id: string, payload: KioskUpdate) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Kiosk | null>(null);
  const [layout, setLayout] = useState<'grid' | 'table'>(() => (localStorage.getItem('mk-panel-kiosk-layout') === 'table' ? 'table' : 'grid'));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState('');
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const changeLayout = (value: 'grid' | 'table') => { setLayout(value); localStorage.setItem('mk-panel-kiosk-layout', value); };

  const term = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = kiosks.filter((kiosk) => {
    if (term && ![kiosk.id, kiosk.name, kiosk.posSerial ?? '', sectionById.get(kiosk.featuredSectionId)?.name ?? ''].some((value) => value.toLocaleLowerCase('tr-TR').includes(term))) return false;
    if (status === 'online') return kiosk.online;
    if (status === 'offline') return !kiosk.online;
    if (status === 'no-pos') return !kiosk.posSerial;
    if (status === 'passive') return !kiosk.active;
    return true;
  });
  const online = kiosks.filter((item) => item.online).length;
  const noPos = kiosks.filter((item) => !item.posSerial).length;
  const revenue = kiosks.reduce((sum, item) => sum + item.todayRevenue, 0);
  const orderCount = kiosks.reduce((sum, item) => sum + item.todayOrderCount, 0);

  const toggleActive = async (kiosk: Kiosk, active: boolean) => {
    setToggling(kiosk.id); setToggleError('');
    try { await onUpdate(kiosk.id, { active }); }
    catch (err) { setToggleError(`${kiosk.name}: ${(err as Error).message}`); }
    finally { setToggling(null); }
  };

  return <>
    <PageHeader eyebrow="MAĞAZA AĞI" title="Kiosklar" description="17 kioskun vitrin kategorisini, POS atamasını, çevrimiçi durumunu ve bugünkü satışlarını yönet." actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    <div className="summary-strip">
      <article><MonitorSmartphone /><span><b>{kiosks.length}</b><small>Toplam kiosk · {kiosks.filter((item) => item.active).length} aktif</small></span></article>
      <article className="ok"><Wifi /><span><b>{online}</b><small>Çevrimiçi (son 2 dk)</small></span></article>
      <article className={noPos ? 'warning' : ''}><AlertTriangle /><span><b>{noPos}</b><small>POS atanmamış</small></span></article>
      <article><TrendingUp /><span><b>{money(revenue)}</b><small>Bugün · {orderCount} sipariş</small></span></article>
    </div>
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    {toggleError && <div className="form-error page-error">{toggleError}</div>}
    <div className="toolbar">
      <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kiosk, kategori veya seri no ara..." /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} aria-label="Durum filtresi">
        <option value="all">Tüm durumlar</option><option value="online">Çevrimiçi</option><option value="offline">Çevrimdışı</option><option value="no-pos">POS atanmamış</option><option value="passive">Pasif</option>
      </select>
      <span>{filtered.length} kiosk</span>
      <div className="segmented" role="group" aria-label="Görünüm"><button className={layout === 'grid' ? 'active' : ''} onClick={() => changeLayout('grid')} title="Kart görünümü"><LayoutGrid /></button><button className={layout === 'table' ? 'active' : ''} onClick={() => changeLayout('table')} title="Tablo görünümü"><List /></button></div>
    </div>
    {loading && !kiosks.length ? <Skeleton variant={layout === 'grid' ? 'cards' : 'table'} rows={layout === 'grid' ? 8 : 10} />
      : !filtered.length ? <section className="table-card"><Empty icon={MonitorSmartphone} title={kiosks.length ? 'Filtreye uyan kiosk yok' : 'Kiosk bulunamadı'} text={kiosks.length ? 'Arama veya durum filtresini değiştirin.' : 'API kiosk listesini döndürmedi. Bağlantıyı kontrol edip yenileyin.'} /></section>
      : layout === 'grid'
        ? <div className="kiosk-grid">{filtered.map((kiosk) => {
          const section = sectionById.get(kiosk.featuredSectionId);
          return <article className={`kiosk-card ${kiosk.active ? '' : 'is-passive'}`} key={kiosk.id} style={accentStyle(section?.accent)}>
            <header>
              <span className="kiosk-card__icon"><SectionIcon name={section?.icon} /></span>
              <div><small>{kiosk.id.toUpperCase()} · {kiosk.orderPrefix || section?.orderPrefix || '—'}</small><h3 title={kiosk.name}>{kiosk.name}</h3></div>
              <OnlineBadge kiosk={kiosk} now={now} />
            </header>
            <div className="kiosk-card__rows">
              <div><small>Vitrin</small><SectionChip section={section} fallback={kiosk.featuredSectionId || 'Seçilmedi'} /></div>
              <div><small>POS</small><PosChip serial={kiosk.posSerial} device={findDevice(devices, kiosk.posSerial)} /></div>
            </div>
            <div className="kiosk-card__stats"><div><small>Bugün sipariş</small><b>{kiosk.todayOrderCount}</b></div><div><small>Bugün ciro</small><b>{money(kiosk.todayRevenue)}</b></div></div>
            <footer>
              <label className="switch-label"><Switch checked={kiosk.active} disabled={toggling === kiosk.id} onChange={(value) => toggleActive(kiosk, value)} label={kiosk.active ? 'Kioskı pasifleştir' : 'Kioskı aktifleştir'} /><span>{toggling === kiosk.id ? 'Kaydediliyor…' : kiosk.active ? 'Aktif' : 'Pasif'}</span></label>
              <button className="secondary compact" onClick={() => setEditing(kiosk)}><Edit3 /> Düzenle</button>
            </footer>
          </article>;
        })}</div>
        : <section className="table-card"><div className="table-wrap"><table><thead><tr><th>Kiosk</th><th>Vitrin</th><th>POS</th><th>Bağlantı</th><th>Bugün</th><th>Aktif</th><th /></tr></thead><tbody>{filtered.map((kiosk) => {
          const section = sectionById.get(kiosk.featuredSectionId);
          return <tr key={kiosk.id} className={kiosk.active ? '' : 'is-passive'}>
            <td><div className="product-cell" style={accentStyle(section?.accent)}><span className="accent-tile"><SectionIcon name={section?.icon} /></span><div><b>{kiosk.name}</b><small>{kiosk.id.toUpperCase()} · {kiosk.orderPrefix || section?.orderPrefix || '—'}{kiosk.appVersion ? ` · v${kiosk.appVersion}` : ''}</small></div></div></td>
            <td><SectionChip section={section} fallback={kiosk.featuredSectionId} /></td>
            <td><PosChip serial={kiosk.posSerial} device={findDevice(devices, kiosk.posSerial)} /></td>
            <td><OnlineBadge kiosk={kiosk} now={now} /></td>
            <td><strong>{money(kiosk.todayRevenue)}</strong><small className="cell-sub">{kiosk.todayOrderCount} sipariş</small></td>
            <td><Switch checked={kiosk.active} disabled={toggling === kiosk.id} onChange={(value) => toggleActive(kiosk, value)} label={kiosk.active ? 'Kioskı pasifleştir' : 'Kioskı aktifleştir'} /></td>
            <td><div className="row-actions"><button title="Düzenle" onClick={() => setEditing(kiosk)}><Edit3 /></button></div></td>
          </tr>;
        })}</tbody></table></div></section>}
    {editing && <KioskModal kiosk={editing} kiosks={kiosks} sections={sections} devices={devices} onClose={() => setEditing(null)} onSave={(payload) => onUpdate(editing.id, payload)} />}
  </>;
}
