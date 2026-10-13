import { Activity, AlertTriangle, Check, CreditCard, Edit3, Link2, Loader2, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { SectionChip } from '../sections';
import type { CastlesDevice, CastlesDeviceDraft, Kiosk, Section } from '../types';
import { Empty, ErrorBanner, Modal, PageHeader, Skeleton, Switch, dateTime } from '../ui';
import { deviceAssignments } from './KiosksView';

function DeviceModal({ device, devices, onClose, onSave }: { device: CastlesDevice | null; devices: CastlesDevice[]; onClose: () => void; onSave: (draft: CastlesDeviceDraft) => Promise<void> }) {
  const [serial, setSerial] = useState(device?.serial ?? '');
  const [name, setName] = useState(device?.name ?? '');
  const [active, setActive] = useState(device?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanSerial = serial.trim();
    if (!device) {
      if (!/^[A-Za-z0-9]{4,64}$/.test(cleanSerial)) { setError('Seri numarası 4–64 karakter, yalnız harf ve rakam olmalıdır.'); return; }
      if (cleanSerial.replace(/\D/g, '').length < 12) { setError('Castles seri numarası en az 12 rakam içermelidir.'); return; }
      if (devices.some((item) => item.serial === cleanSerial)) { setError('Bu seri numarası zaten kayıtlı.'); return; }
    }
    if (name.trim().length < 2) { setError('Cihaz adı en az 2 karakter olmalıdır.'); return; }
    setSaving(true); setError('');
    try { await onSave({ serial: cleanSerial, name: name.trim(), active }); onClose(); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };
  return <Modal title={device ? 'Cihazı düzenle' : 'Yeni Castles cihazı'} subtitle="POS CİHAZLARI" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="device-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}>
    <form id="device-form" className="form-stack" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <label><span>Seri numarası</span><input required readOnly={Boolean(device)} value={serial} onChange={(event) => setSerial(event.target.value.replace(/\s/g, ''))} placeholder="0000136250609467" inputMode="numeric" /><small className="field-hint">{device ? 'Seri numarası değiştirilemez; gerekirse cihazı silip yeniden ekleyin.' : 'Cihaz etiketindeki seri numarası. Ödemede son 12 hane kullanılır.'}</small></label>
      <label><span>Cihaz adı</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="AVM Giriş POS" /></label>
      <label className="switch-line"><span><b>Cihaz aktif</b><small>Pasif cihazla ödeme başlatılmaz.</small></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
    </form>
  </Modal>;
}

export function DevicesView({ devices, kiosks, sections, loading, error, onRefresh, onCreate, onUpdate, onDelete, onOpenKiosks }: {
  devices: CastlesDevice[]; kiosks: Kiosk[]; sections: Section[]; loading: boolean; error: string; onRefresh: () => void;
  onCreate: (draft: CastlesDeviceDraft) => Promise<void>; onUpdate: (serial: string, draft: Partial<Omit<CastlesDeviceDraft, 'serial'>>) => Promise<void>;
  onDelete: (serial: string) => Promise<void>; onOpenKiosks: () => void;
}) {
  const [editing, setEditing] = useState<CastlesDevice | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const assignments = useMemo(() => deviceAssignments(devices, kiosks), [devices, kiosks]);
  const kioskById = useMemo(() => new Map(kiosks.map((item) => [item.id, item])), [kiosks]);
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const term = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = devices.filter((device) => !term || [device.serial, device.name, kioskById.get(assignments.get(device.serial) ?? '')?.name ?? ''].some((value) => value.toLocaleLowerCase('tr-TR').includes(term)));
  const assignedCount = devices.filter((item) => assignments.has(item.serial)).length;
  const kiosksWithoutPos = kiosks.filter((item) => !item.posSerial).length;

  const run = async (serial: string, action: () => Promise<void>) => {
    setBusy(serial); setActionError('');
    try { await action(); } catch (err) { setActionError((err as Error).message); } finally { setBusy(null); }
  };
  const remove = (device: CastlesDevice) => {
    const owner = kioskById.get(assignments.get(device.serial) ?? '');
    const message = owner
      ? `${device.serial} şu anda "${owner.name}" kioskuna atanmış. Silinirse kiosk ödeme alamaz. Yine de silinsin mi?`
      : `${device.serial} (${device.name}) silinsin mi?`;
    if (window.confirm(message)) void run(device.serial, () => onDelete(device.serial));
  };

  return <>
    <PageHeader eyebrow="ÖDEME" title="POS Cihazları (Castles)" description="Castles POS seri numaralarını yönet. Cihazlar kiosklara Kiosklar sayfasından atanır; her cihaz tek bir kioska atanabilir." actions={<><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)}><Plus /> Cihaz Ekle</button></>} />
    <div className="summary-strip">
      <article><CreditCard /><span><b>{devices.length}</b><small>Kayıtlı cihaz</small></span></article>
      <article className="ok"><Activity /><span><b>{devices.filter((item) => item.active).length}</b><small>Aktif</small></span></article>
      <article><Link2 /><span><b>{assignedCount}</b><small>Kioska atanmış</small></span></article>
      <article className={kiosksWithoutPos ? 'warning' : ''}><AlertTriangle /><span><b>{kiosksWithoutPos}</b><small>POS'suz kiosk</small></span></article>
    </div>
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    {actionError && <div className="form-error page-error">{actionError}</div>}
    <div className="toolbar"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Seri no, cihaz veya kiosk ara..." /></label><span>{filtered.length} cihaz</span><button className="secondary compact" onClick={onOpenKiosks}><Link2 /> Kiosklara ata</button></div>
    <section className="table-card">{loading && !devices.length ? <Skeleton rows={6} /> : !filtered.length ? <Empty icon={CreditCard} title={devices.length ? 'Aramaya uyan cihaz yok' : 'Henüz Castles cihazı yok'} text={devices.length ? 'Arama ifadesini değiştirin.' : 'Seri numarasıyla ilk cihazı ekleyin, ardından Kiosklar sayfasından atayın.'} action={!devices.length ? <button className="primary" onClick={() => setEditing(null)}><Plus /> Cihaz Ekle</button> : undefined} /> : <div className="table-wrap"><table className="pos-table"><thead><tr><th>Cihaz</th><th>Seri No</th><th>Atanan Kiosk</th><th>Durum</th><th>Güncellendi</th><th /></tr></thead><tbody>
      {filtered.map((device) => {
        const owner = kioskById.get(assignments.get(device.serial) ?? '');
        const ownerId = assignments.get(device.serial);
        return <tr key={device.serial} className={device.active ? '' : 'is-passive'}>
          <td><div className="terminal-cell"><span><CreditCard /></span><div><b>{device.name}</b><small>Castles · CasPro</small></div></div></td>
          <td><code>{device.serial}</code></td>
          <td>{owner ? <span className="assigned-kiosk"><SectionChip compact section={sectionById.get(owner.featuredSectionId)} /><span><b>{owner.name}</b><small>{owner.id.toUpperCase()}</small></span></span> : ownerId ? <code>{ownerId.toUpperCase()}</code> : <span className="muted">Boşta</span>}</td>
          <td><label className="switch-label"><Switch checked={device.active} disabled={busy === device.serial} onChange={(active) => void run(device.serial, () => onUpdate(device.serial, { active }))} label={device.active ? 'Cihazı pasifleştir' : 'Cihazı aktifleştir'} /><span>{device.active ? 'Aktif' : 'Pasif'}</span></label></td>
          <td>{device.updatedAt ? dateTime(device.updatedAt) : '—'}</td>
          <td><div className="row-actions"><button title="Düzenle" onClick={() => setEditing(device)}><Edit3 /></button><button className="danger" title="Sil" disabled={busy === device.serial} onClick={() => remove(device)}><Trash2 /></button></div></td>
        </tr>;
      })}
    </tbody></table></div>}</section>
    {editing !== undefined && <DeviceModal device={editing} devices={devices} onClose={() => setEditing(undefined)} onSave={(draft) => editing ? onUpdate(editing.serial, { name: draft.name, active: draft.active }) : onCreate(draft)} />}
  </>;
}
