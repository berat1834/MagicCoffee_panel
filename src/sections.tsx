import {
  Apple,
  Backpack,
  Baby,
  Beef,
  BookOpen,
  CakeSlice,
  Candy,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  Dumbbell,
  Fish,
  Flower2,
  Footprints,
  Gem,
  Gift,
  Glasses,
  Headphones,
  IceCreamCone,
  Laptop,
  Leaf,
  Milk,
  Palette,
  PawPrint,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Soup,
  Sparkles,
  Store,
  Utensils,
  Watch,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Section } from './types';

/** lucide ikon adı → bileşen. Seçicide gösterilen ikonlar da bu listedir. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  Coffee, Beef, Pizza, Sandwich, Salad, CakeSlice, IceCreamCone, Croissant, CupSoda, Cookie,
  Shirt, Footprints, Headphones, Sparkles, BookOpen, Gift, Flower2,
  Utensils, Soup, Drumstick, Fish, Donut, Candy, Popcorn, Apple, Milk,
  Backpack, Watch, Smartphone, Laptop, Glasses, Gem, Palette, Baby, Dumbbell, PawPrint, Leaf, ShoppingBasket, Store,
};

export const ACCENT_PRESETS = [
  '#7a4a2a', '#c2410c', '#dc2626', '#b45309', '#16a34a', '#db2777', '#0ea5e9', '#a16207', '#f59e0b',
  '#ea580c', '#4f46e5', '#334155', '#0f766e', '#c026d3', '#2563eb', '#9333ea', '#e11d48', '#684cf0',
];

export function SectionIcon({ name, ...props }: { name?: string; className?: string; style?: CSSProperties }) {
  const Icon = (name && SECTION_ICONS[name]) || Store;
  return <Icon {...props} />;
}

/** Kategorinin vurgu rengine göre CSS değişkenleri. */
export const accentStyle = (accent?: string): CSSProperties => ({ ['--accent' as string]: accent || '#684cf0' });

export function SectionChip({ section, fallback, compact = false }: { section?: Section; fallback?: string; compact?: boolean }) {
  if (!section) return fallback ? <span className="section-chip section-chip--unknown">{fallback}</span> : <span className="muted">—</span>;
  return <span className={`section-chip ${compact ? 'section-chip--compact' : ''} ${section.active ? '' : 'is-passive'}`} style={accentStyle(section.accent)} title={section.tagline || section.name}>
    <SectionIcon name={section.icon} />
    {!compact && <span>{section.name}</span>}
  </span>;
}

export function IconPicker({ value, accent, onChange }: { value: string; accent: string; onChange: (name: string) => void }) {
  return <div className="icon-picker" style={accentStyle(accent)} role="radiogroup" aria-label="Kategori ikonu">
    {Object.entries(SECTION_ICONS).map(([name, Icon]) => <button type="button" role="radio" aria-checked={value === name} title={name} key={name} className={value === name ? 'selected' : ''} onClick={() => onChange(name)}><Icon /></button>)}
  </div>;
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="color-picker">
    <label className="color-picker__input" style={accentStyle(value)}><input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#684cf0'} onChange={(event) => onChange(event.target.value)} aria-label="Özel renk seç" /><code>{value}</code></label>
    <div className="color-picker__swatches">{ACCENT_PRESETS.map((color) => <button type="button" key={color} title={color} aria-label={`Renk ${color}`} className={value.toLowerCase() === color ? 'selected' : ''} style={{ background: color }} onClick={() => onChange(color)} />)}</div>
  </div>;
}
