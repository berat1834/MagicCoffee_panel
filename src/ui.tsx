import { AlertTriangle, PackagePlus, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const money = (value: number) => `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
export const dateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};
export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

/** "3 dk önce", "2 sa önce", "5 gün önce" gibi göreli zaman. */
export function relativeTime(value: string | null | undefined, now = Date.now()) {
  if (!value) return 'Hiç bağlanmadı';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Bilinmiyor';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'Az önce';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(time));
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><small>{subtitle}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Kapat"><X /></button></header>
      <div className="modal__body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

/** Yükleme iskeleti: tablo/kart yerleşimini taklit eden gri bloklar. */
export function Skeleton({ rows = 6, variant = 'table' }: { rows?: number; variant?: 'table' | 'cards' }) {
  if (variant === 'cards') return <div className="skeleton-grid" aria-busy="true" aria-label="Yükleniyor">{Array.from({ length: rows }, (_, index) => <div className="skeleton-card" key={index}><i /><b /><span /><span /></div>)}</div>;
  return <div className="skeleton-table" aria-busy="true" aria-label="Yükleniyor">{Array.from({ length: rows }, (_, index) => <div key={index}><i /><b /><span /><span /></div>)}</div>;
}

export function Empty({ title, text, icon: Icon = PackagePlus, action }: { title: string; text: string; icon?: LucideIcon; action?: ReactNode }) {
  return <div className="empty"><Icon /><b>{title}</b><span>{text}</span>{action && <div className="empty__action">{action}</div>}</div>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-banner" role="alert"><AlertTriangle /><span>{message}</span>{onRetry && <button className="secondary compact" onClick={onRetry}>Tekrar dene</button>}</div>;
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button>;
}

export function StatCard({ label, value, note, icon: Icon, featured = false }: { label: string; value: ReactNode; note: string; icon: LucideIcon; featured?: boolean }) {
  return <article className={`stat-card ${featured ? 'featured' : ''}`}><span><Icon /></span><small>{label}</small><b>{value}</b><p>{note}</p></article>;
}
