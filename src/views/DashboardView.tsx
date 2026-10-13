import { AlertTriangle, BarChart3, Boxes, Check, ChevronRight, ClipboardList, MonitorSmartphone, RefreshCcw, ShoppingBag, TrendingUp, Wifi } from 'lucide-react';
import { useMemo } from 'react';
import { SectionChip, SectionIcon, accentStyle } from '../sections';
import type { Dashboard, DashboardSectionRow, Filters, Kiosk, Section, ViewKey } from '../types';
import { Empty, ErrorBanner, PageHeader, Skeleton, StatCard, dateTime, money } from '../ui';
import { OnlineBadge } from './KiosksView';

export function filterLabel(filters: Filters, kiosks: Kiosk[], sections: Section[]) {
  const kiosk = filters.kiosk ? kiosks.find((item) => item.id === filters.kiosk)?.name ?? filters.kiosk.toUpperCase() : 'Tüm kiosklar';
  const section = filters.section ? sections.find((item) => item.id === filters.section)?.name ?? filters.section : 'tüm kategoriler';
  return `${kiosk} · ${section}`;
}

export function DashboardView({ data, kiosks, sections, filters, sectionFallback, loading, error, now, onRefresh, onNavigate, onFilter }: {
  data: Dashboard | null; kiosks: Kiosk[]; sections: Section[]; filters: Filters; sectionFallback: DashboardSectionRow[];
  loading: boolean; error: string; now: number; onRefresh: () => void; onNavigate: (view: ViewKey) => void; onFilter: (patch: Partial<Filters>) => void;
}) {
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections]);
  const stats = data?.stats;
  const online = kiosks.filter((item) => item.online).length;
  const noPos = kiosks.filter((item) => !item.posSerial).length;
  const orderCount = stats?.today_order_count ?? 0;
  const revenue = stats?.today_revenue ?? 0;

  const kioskRows = useMemo(() => kiosks.map((kiosk) => {
    const row = data?.kiosks.find((item) => item.kioskId === kiosk.id);
    return { kiosk, orderCount: row ? row.orderCount : kiosk.todayOrderCount, revenue: row ? row.revenue : kiosk.todayRevenue };
  }), [data, kiosks]);
  const maxKioskRevenue = Math.max(1, ...kioskRows.map((row) => row.revenue));

  const sectionRows = useMemo(() => {
    const source = data?.sections.length ? data.sections : sectionFallback;
    const rows = sections.map((section) => {
      const row = source.find((item) => item.sectionId === section.id);
      return { section, revenue: row?.revenue ?? 0, orderCount: row?.orderCount ?? 0 };
    });
    return rows.sort((a, b) => b.revenue - a.revenue || a.section.position - b.section.position);
  }, [data, sectionFallback, sections]);
  const maxSectionRevenue = Math.max(1, ...sectionRows.map((row) => row.revenue));
  const sectionTotal = sectionRows.reduce((sum, row) => sum + row.revenue, 0);

  if (loading && !data) return <>
    <PageHeader eyebrow="GÖSTERGE PANELİ" title="Bugünün özeti" description={filterLabel(filters, kiosks, sections)} />
    <Skeleton variant="cards" rows={4} /><div className="spacer" /><Skeleton rows={8} />
  </>;

  return <>
    <PageHeader eyebrow="GÖSTERGE PANELİ" title="Bugünün özeti" description={`${filterLabel(filters, kiosks, sections)} için bugünkü satışlar, kiosk durumu ve kategori performansı.`} actions={<button className="secondary" onClick={onRefresh}><RefreshCcw /> Yenile</button>} />
    {error && <ErrorBanner message={error} onRetry={onRefresh} />}
    <div className="stat-grid">
      <StatCard featured label="BUGÜNKÜ CİRO" value={money(revenue)} note={filters.kiosk || filters.section ? 'Seçili filtre için' : 'Tüm kiosklar toplamı'} icon={TrendingUp} />
      <StatCard label="BUGÜNKÜ SİPARİŞ" value={orderCount} note={`Ortalama sepet ${money(orderCount ? revenue / orderCount : 0)}`} icon={ClipboardList} />
      <StatCard label="ÇEVRİMİÇİ KİOSK" value={`${online}/${kiosks.length}`} note={noPos ? `${noPos} kioskta POS atanmamış` : 'Tüm kiosklarda POS atanmış'} icon={Wifi} />
      <StatCard label="AKTİF ÜRÜN" value={stats?.active_product_count ?? 0} note={`${stats?.product_count ?? 0} ürün · ${stats?.low_stock_count ?? 0} kritik stok`} icon={ShoppingBag} />
    </div>
    <div className="dashboard-split">
      <section className="table-card">
        <div className="card-toolbar"><div><small>KİOSK BAZINDA</small><h3>Bugün kiosklar</h3></div><button className="text-button" onClick={() => onNavigate('kiosks')}>Kiosklar <ChevronRight /></button></div>
        {!kiosks.length ? <Empty icon={MonitorSmartphone} title="Kiosk verisi yok" text="Kiosk listesi alınamadı." /> : <div className="table-wrap"><table className="kiosk-table"><thead><tr><th>Kiosk</th><th>Sipariş</th><th>Ciro</th><th>Bağlantı</th><th>POS</th></tr></thead><tbody>
          {kioskRows.map(({ kiosk, orderCount: count, revenue: total }) => {
            const section = sectionById.get(kiosk.featuredSectionId);
            const selected = filters.kiosk === kiosk.id;
            return <tr key={kiosk.id} className={`clickable ${selected ? 'is-selected' : ''} ${kiosk.active ? '' : 'is-passive'}`} onClick={() => onFilter({ kiosk: selected ? '' : kiosk.id })} title={selected ? 'Filtreyi kaldır' : 'Bu kiosku filtrele'}>
              <td><div className="product-cell product-cell--slim" style={accentStyle(section?.accent)}><span className="accent-tile"><SectionIcon name={section?.icon} /></span><div><b>{kiosk.name}</b><small>{kiosk.id.toUpperCase()}{kiosk.active ? '' : ' · pasif'}</small></div></div></td>
              <td><strong>{count}</strong></td>
              <td><div className="inline-bar" style={accentStyle(section?.accent)}><strong>{money(total)}</strong><i style={{ width: `${(total / maxKioskRevenue) * 100}%` }} /></div></td>
              <td><OnlineBadge kiosk={kiosk} now={now} /></td>
              <td>{kiosk.posSerial ? <span className="ok-chip" title={kiosk.posSerial}><Check /> Atandı</span> : <span className="warn-chip"><AlertTriangle /> Yok</span>}</td>
            </tr>;
          })}
        </tbody></table></div>}
      </section>
      <section className="panel-card">
        <header><div><small>KATEGORİ BAZINDA</small><h3>Bugünkü ciro dağılımı</h3></div><button className="text-button" onClick={() => onNavigate('reports')}>Raporlar <ChevronRight /></button></header>
        {!sectionRows.length ? <Empty icon={BarChart3} title="Kategori yok" text="Ana kategoriler yüklenemedi." /> : sectionTotal === 0 ? <Empty icon={BarChart3} title="Bugün henüz satış yok" text="İlk siparişle birlikte kategori dağılımı burada oluşur." /> : <div className="hbar-list">
          {sectionRows.map(({ section, revenue: total, orderCount: count }) => <button key={section.id} className={`hbar ${filters.section === section.id ? 'is-selected' : ''}`} style={accentStyle(section.accent)} onClick={() => onFilter({ section: filters.section === section.id ? '' : section.id })} title={filters.section === section.id ? 'Filtreyi kaldır' : `${section.name} kategorisini filtrele`}>
            <span className="hbar__label"><SectionIcon name={section.icon} /><b>{section.name}</b></span>
            <span className="hbar__track"><i style={{ width: `${total ? Math.max(2, (total / maxSectionRevenue) * 100) : 0}%` }} /></span>
            <span className="hbar__value"><b>{money(total)}</b>{count > 0 && <small>{count} sipariş</small>}</span>
          </button>)}
        </div>}
      </section>
    </div>
    <div className="dashboard-columns">
      <section className="panel-card"><header><div><small>SON HAREKETLER</small><h3>Son siparişler</h3></div><button className="text-button" onClick={() => onNavigate('orders')}>Tümünü gör <ChevronRight /></button></header>
        {!data?.recentOrders.length ? <Empty icon={ClipboardList} title="Henüz sipariş yok" text="Kiosklardan alınan siparişler burada görünecek." /> : <div className="compact-list">{data.recentOrders.map((order) => {
          const kiosk = kiosks.find((item) => item.id === order.kioskId);
          return <div key={order.number}><span><b>{order.number}</b><small>{kiosk?.name ?? order.kioskId?.toUpperCase() ?? '—'} · {dateTime(order.created_at)}</small></span><span className="chip-row">{order.sectionIds.slice(0, 3).map((id) => <SectionChip compact key={id} section={sectionById.get(id)} fallback={id} />)}</span><strong>{money(order.total)}</strong></div>;
        })}</div>}
      </section>
      <section className="panel-card"><header><div><small>ÇOK SATANLAR</small><h3>Ürün performansı</h3></div><button className="text-button" onClick={() => onNavigate('stock')}><Boxes /> Stok</button></header>
        {!data?.topProducts.length ? <Empty icon={ShoppingBag} title="Satış verisi oluşmadı" text="İlk siparişten sonra sıralama başlayacak." /> : <div className="compact-list ranked">{data.topProducts.map((product, index) => <div key={`${product.name}-${index}`}><i>{index + 1}</i><span><b>{product.name}</b><small>{product.quantity} adet</small></span><strong>{money(product.revenue)}</strong></div>)}</div>}
      </section>
    </div>
  </>;
}
