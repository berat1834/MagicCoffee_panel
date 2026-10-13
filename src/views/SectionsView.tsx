import { ArrowDown, ArrowUp, Check, Edit3, Eye, GripVertical, LayoutGrid, Loader2, Plus, RefreshCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { useState, type DragEvent, type FormEvent } from 'react';
import { ColorPicker, IconPicker, SectionIcon, accentStyle } from '../sections';
import type { Section, SectionDraft } from '../types';
import { Empty, ErrorBanner, Modal, PageHeader, Skeleton, Switch } from '../ui';

const slugify = (value: string) => value
  .toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function SectionModal({ section, sections, onClose, onSave }: { section: Section | null; sections: Section[]; onClose: () => void; onSave: (draft: SectionDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<SectionDraft>(() => section ? {
    name: section.name, nameEn: section.nameEn, tagline: section.tagline, taglineEn: section.taglineEn,
    icon: section.icon, accent: section.accent, orderPrefix: section.orderPrefix, active: section.active,
  } : { id: '', name: '', nameEn: '', tagline: '', taglineEn: '', icon: 'Store', accent: '#684cf0', orderPrefix: '', active: true });
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof SectionDraft>(key: K, value: SectionDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const prefix = draft.orderPrefix.trim().toLocaleUpperCase('en-US');
    if (!draft.name.trim()) { setError('Kategori adı zorunludur.'); return; }
    if (!/^[A-Z]{2,5}$/.test(prefix)) { setError('Sipariş öneki 2–5 büyük harften oluşmalıdır (ör. KHV).'); return; }
    if (sections.some((item) => item.id !== section?.id && item.orderPrefix.toUpperCase() === prefix)) { setError(`${prefix} öneki başka bir kategoride kullanılıyor.`); return; }
    if (!section && !/^[a-z0-9-]{2,40}$/.test(draft.id ?? '')) { setError('Kimlik yalnız küçük harf, rakam ve tire içerebilir.'); return; }
    if (!section && sections.some((item) => item.id === draft.id)) { setError('Bu kimlikte bir kategori zaten var.'); return; }
    setSaving(true); setError('');
    try {
      const payload: SectionDraft = { ...draft, name: draft.name.trim(), nameEn: draft.nameEn.trim(), tagline: draft.tagline.trim(), taglineEn: draft.taglineEn.trim(), orderPrefix: prefix };
      if (section) delete payload.id;
      await onSave(payload);
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  return <Modal wide title={section ? `${section.name} kategorisini düzenle` : 'Yeni ana kategori'} subtitle="ANA KATEGORİ" onClose={onClose} footer={<><button className="secondary" onClick={onClose}>Vazgeç</button><button className="primary" type="submit" form="section-form" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />} Kaydet</button></>}>
    <form id="section-form" className="form-grid" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <div className="section-preview span-2" style={accentStyle(draft.accent)}>
        <span><SectionIcon name={draft.icon} /></span>
        <div><b>{draft.name || 'Kategori adı'}</b><small>{draft.tagline || 'Kısa açıklama'}</small></div>
        <em>{(draft.orderPrefix || 'ÖNK').toUpperCase()}-0001</em>
      </div>
      <label><span>Ad (TR)</span><input required maxLength={60} value={draft.name} onChange={(event) => { const name = event.target.value; setDraft((current) => ({ ...current, name, ...(!section && !idTouched ? { id: slugify(name) } : {}) })); }} placeholder="Kahve" /></label>
      <label><span>Ad (EN)</span><input maxLength={60} value={draft.nameEn} onChange={(event) => set('nameEn', event.target.value)} placeholder="Coffee" /></label>
      <label><span>Kısa açıklama (TR)</span><input maxLength={120} value={draft.tagline} onChange={(event) => set('tagline', event.target.value)} placeholder="Taze çekilmiş kahveler" /></label>
      <label><span>Kısa açıklama (EN)</span><input maxLength={120} value={draft.taglineEn} onChange={(event) => set('taglineEn', event.target.value)} placeholder="Freshly ground coffee" /></label>
      {!section && <label><span>Kimlik (değiştirilemez)</span><input required value={draft.id ?? ''} onChange={(event) => { setIdTouched(true); set('id', slugify(event.target.value)); }} placeholder="kahve" /></label>}
      <label><span>Sipariş öneki</span><input required maxLength={5} value={draft.orderPrefix} onChange={(event) => set('orderPrefix', event.target.value.toLocaleUpperCase('en-US').replace(/[^A-Z]/g, ''))} placeholder="KHV" /></label>
      <div className="field span-2"><span>İkon</span><IconPicker value={draft.icon} accent={draft.accent} onChange={(icon) => set('icon', icon)} /></div>
      <div className="field span-2"><span>Vurgu rengi</span><ColorPicker value={draft.accent} onChange={(accent) => set('accent', accent)} /></div>
      <label className="switch-line span-2"><span><b>Kioskta göster</b><small>Pasif kategoriler kiosk ana menüsünde görünmez.</small></span><input type="checkbox" checked={draft.active} onChange={(event) => set('active', event.target.checked)} /></label>
    </form>
  </Modal>;
}

export function SectionsView({ sections, loading, error, onRefresh, onCreate, onUpdate, onDelete, onReorder }: {
  sections: Section[]; loading: boolean; error: string; onRefresh: () => void;
  onCreate: (draft: SectionDraft) => Promise<void>; onUpdate: (id: string, draft: Partial<SectionDraft>) => Promise<void>;
  onDelete: (id: string) => Promise<void>; onReorder: (ids: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Section | null | undefined>(undefined);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const reorder = (ids: string[]) => onReorder(ids).catch((err: Error) => setActionError(err.message));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void reorder(ids);
  };
  const drop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    setOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = sections.map((item) => item.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    setDragId(null);
    void reorder(ids);
  };
  const toggle = async (section: Section, active: boolean) => {
    setBusy(section.id); setActionError('');
    try { await onUpdate(section.id, { active }); } catch (err) { setActionError(`${section.name}: ${(err as Error).message}`); } finally { setBusy(null); }
  };
  const remove = async (section: Section) => {
    if (section.productCount > 0) return;
    if (!window.confirm(`${section.name} ana kategorisi silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(section.id); setActionError('');
    try { await onDelete(section.id); } catch (err) { setActionError(`${section.name}: ${(err as Error).message}`); } finally { setBusy(null); }
  };

  return <>
    <PageHeader eyebrow="KATALOG" title="Kategoriler" description="Kiosk ana menüsündeki 17 ana kategorinin adını, ikonunu, rengini ve sırasını yönet. Sürükleyerek veya oklarla sıralayın." actions={<><button className="secondary" onClick={onRefresh}><RefreshCcw /></button><button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni Kategori</button></>} />
    <div className="summary-strip summary-strip--3">
      <article><LayoutGrid /><span><b>{sections.length}</b><small>Ana kategori</small></span></article>
      <article className="ok"><Eye /><span><b>{sections.filter((item) => item.active).length}</b><small>Kioskta görünür</small></span></article>
      <article><ShoppingBag /><span><b>{sections.reduce((sum, item) => sum + item.productCount, 0)}</b><small>Toplam ürün</small></span></article>
    </div>
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    {actionError && <div className="form-error page-error">{actionError}</div>}
    {loading && !sections.length ? <Skeleton variant="cards" rows={9} />
      : !sections.length ? <section className="table-card"><Empty icon={LayoutGrid} title="Henüz ana kategori yok" text="İlk kategoriyi ekleyerek kiosk ana menüsünü oluşturun." action={<button className="primary" onClick={() => setEditing(null)}><Plus /> Yeni Kategori</button>} /></section>
      : <div className="section-grid">{sections.map((section, index) => <article
        key={section.id}
        className={`section-card ${section.active ? '' : 'is-passive'} ${dragId === section.id ? 'is-dragging' : ''} ${overId === section.id ? 'is-over' : ''}`}
        style={accentStyle(section.accent)}
        draggable
        onDragStart={(event) => { setDragId(section.id); event.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { setDragId(null); setOverId(null); }}
        onDragOver={(event) => { event.preventDefault(); if (overId !== section.id) setOverId(section.id); }}
        onDragLeave={() => setOverId((current) => (current === section.id ? null : current))}
        onDrop={(event) => drop(event, section.id)}
      >
        <header>
          <span className="grip" title="Sürükleyerek sırala"><GripVertical /></span>
          <span className="section-card__order">{index + 1}</span>
          <Switch checked={section.active} disabled={busy === section.id} onChange={(value) => toggle(section, value)} label={section.active ? 'Kioskta gizle' : 'Kioskta göster'} />
        </header>
        <div className="section-card__hero"><span><SectionIcon name={section.icon} /></span><div><h3>{section.name}</h3><small>{section.nameEn || '—'}</small></div></div>
        <p>{section.tagline || 'Kısa açıklama eklenmedi.'}</p>
        <div className="section-card__meta"><span><b>{section.productCount}</b> ürün</span>{section.categoryCount > 0 && <span><b>{section.categoryCount}</b> alt kategori</span>}<code>{section.orderPrefix || '—'}</code></div>
        <footer>
          <div className="row-actions">
            <button title="Yukarı taşı" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></button>
            <button title="Aşağı taşı" disabled={index === sections.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button>
          </div>
          <div className="row-actions">
            <button title="Düzenle" onClick={() => setEditing(section)}><Edit3 /></button>
            <button className="danger" disabled={section.productCount > 0 || busy === section.id} title={section.productCount > 0 ? 'Ürünü olan kategori silinemez' : 'Sil'} onClick={() => remove(section)}><Trash2 /></button>
          </div>
        </footer>
      </article>)}</div>}
    {editing !== undefined && <SectionModal section={editing} sections={sections} onClose={() => setEditing(undefined)} onSave={(draft) => editing ? onUpdate(editing.id, draft) : onCreate(draft)} />}
  </>;
}
