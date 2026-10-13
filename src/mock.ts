/**
 * Yalnız geliştirme: `VITE_MOCK=1 npm run dev` ile API yerine tarayıcı içi örnek veri kullanılır.
 * main.tsx bu dosyayı yalnız `import.meta.env.DEV` iken içe aktarır; üretim derlemesine girmez.
 */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = Json;

const SECTIONS: Array<[string, string, string, string, string, string, string]> = [
  ['kahve', 'Kahve', 'Coffee', 'Taze çekilmiş kahveler', 'Coffee', '#7a4a2a', 'KHV'],
  ['burger', 'Burger', 'Burgers', 'Izgara burger menüleri', 'Beef', '#c2410c', 'BRG'],
  ['pizza', 'Pizza', 'Pizza', 'Taş fırın pizzalar', 'Pizza', '#dc2626', 'PZA'],
  ['doner', 'Döner & Dürüm', 'Doner & Wraps', 'Döner, dürüm, porsiyon', 'Sandwich', '#b45309', 'DNR'],
  ['salata', 'Salata & Bowl', 'Salads & Bowls', 'Hafif ve doyurucu', 'Salad', '#16a34a', 'SLT'],
  ['tatli', 'Tatlı & Pasta', 'Desserts', 'Pasta, cheesecake, tatlılar', 'CakeSlice', '#db2777', 'TTL'],
  ['dondurma', 'Dondurma', 'Ice Cream', 'Top dondurma, milkshake', 'IceCreamCone', '#0ea5e9', 'DND'],
  ['firin', 'Fırın', 'Bakery', 'Simit, poğaça, kruvasan', 'Croissant', '#a16207', 'FRN'],
  ['icecek', 'Soğuk İçecek & Smoothie', 'Drinks & Smoothies', 'Meyve suyu, smoothie, limonata', 'CupSoda', '#f59e0b', 'ICK'],
  ['atistirmalik', 'Atıştırmalık & Market', 'Snacks & Market', 'Cips, çikolata, su', 'Cookie', '#ea580c', 'ATS'],
  ['giyim', 'Giyim', 'Clothing', 'Tişört, sweatshirt, şapka', 'Shirt', '#4f46e5', 'GYM'],
  ['ayakkabi', 'Ayakkabı & Çanta', 'Shoes & Bags', 'Sneaker, terlik, sırt çantası', 'Footprints', '#334155', 'AYK'],
  ['elektronik', 'Elektronik Aksesuar', 'Electronics', 'Şarj aleti, kulaklık, kablo', 'Headphones', '#0f766e', 'ELK'],
  ['kozmetik', 'Kozmetik & Bakım', 'Beauty & Care', 'Parfüm, krem, bakım', 'Sparkles', '#c026d3', 'KZM'],
  ['kirtasiye', 'Kitap & Kırtasiye', 'Books & Stationery', 'Kitap, defter, kalem', 'BookOpen', '#2563eb', 'KRT'],
  ['oyuncak', 'Oyuncak & Hediyelik', 'Toys & Gifts', 'Oyuncak, hediyelik eşya', 'Gift', '#9333ea', 'OYN'],
  ['cicek', 'Çiçek', 'Flowers', 'Buket, saksı çiçeği', 'Flower2', '#e11d48', 'CCK'],
];

const emptyCustomization = () => ({
  content: { enabled: false, title: 'Ürün Notları', options: [] },
  sides: { enabled: false, title: 'Boyut Seçimi', options: [] },
  drinks: { enabled: false, title: 'Yan Ürün Seçimi', options: [] },
});

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

const db = {
  sections: <Row[]>SECTIONS.map(([id, name, nameEn, tagline, icon, accent, orderPrefix], position) => ({ id, name, nameEn, tagline, taglineEn: '', icon, accent, orderPrefix, position, active: id !== 'cicek' })),
  categories: <Row[]>SECTIONS.flatMap(([id, name]) => [
    { id: `${id}-1`, sectionId: id, name: `${name} Klasikler`, eyebrow: 'En sevilenler', position: 0, active: true },
    { id: `${id}-2`, sectionId: id, name: `${name} Yeni`, eyebrow: 'Yeni gelenler', position: 1, active: true },
  ]),
  products: ([] as Row[]).concat(SECTIONS.flatMap(([id, name], index) => Array.from({ length: id === 'kahve' ? 0 : 3 }, (_, n) => ({
    id: `${id}-p${n + 1}`, sectionId: id, categoryId: `${id}-${(n % 2) + 1}`, name: `${name} Ürün ${n + 1}`, description: 'Örnek ürün açıklaması', price: 99 + index * 20 + n * 15,
    image: '', emoji: ['☕', '🍔', '🍕', '🌯', '🥗', '🍰', '🍦', '🥐', '🥤', '🍫', '👕', '👟', '🎧', '💄', '📚', '🎁', '💐'][index], kind: 'simple', customizable: false, popular: n === 0, active: true, position: n,
    stockQuantity: n === 2 ? 2 : 25, criticalStock: 3, stockTrackingEnabled: n !== 1, stockSellable: true, available: true, customization: emptyCustomization(),
  }))), [
    { id: 'latte', sectionId: 'kahve', categoryId: 'kahve-1', name: 'Latte', description: 'Espresso ve süt', price: 145, image: '/images/products/latte.svg', emoji: '☕', kind: 'coffee', customizable: true, popular: true, active: true, position: 0, stockQuantity: null, criticalStock: null, stockTrackingEnabled: false, stockSellable: true, available: true, customization: emptyCustomization() },
    { id: 'americano', sectionId: 'kahve', categoryId: 'kahve-1', name: 'Americano', description: 'Sıcak su ve espresso', price: 120, image: '/images/products/americano.svg', emoji: '☕', kind: 'coffee', customizable: true, popular: false, active: true, position: 1, stockQuantity: null, criticalStock: null, stockTrackingEnabled: false, stockSellable: true, available: true, customization: emptyCustomization() },
  ]),
  kiosks: <Row[]>SECTIONS.map(([id, name, , , , , prefix], index) => {
    const n = String(index + 1).padStart(2, '0');
    return {
      id: `k${n}`, name: `Kiosk ${n} · ${name}`, featuredSectionId: id, orderPrefix: prefix,
      posSerial: index % 5 === 3 ? null : `0000136250${String(609400 + index).padStart(6, '0')}`,
      active: index !== 12, lastSeenAt: index % 4 === 1 ? iso((index + 1) * 3_600_000) : index === 16 ? null : iso(30_000),
      online: !(index % 4 === 1 || index === 16), todayOrderCount: (index * 7) % 23, todayRevenue: ((index * 7) % 23) * (180 + index * 9), appVersion: '1.0.0',
    };
  }),
  devices: <Row[]>Array.from({ length: 16 }, (_, index) => ({ serial: `0000136250${String(609400 + index).padStart(6, '0')}`, name: `Castles S1F2 #${index + 1}`, active: index !== 7, createdAt: iso(86_400_000 * 10), updatedAt: iso(86_400_000 * (index % 5)) })),
  movements: [] as Json[],
};

const sectionCounts = (section: Json) => ({
  ...section,
  productCount: db.products.filter((item) => item.sectionId === section.id).length,
  categoryCount: db.categories.filter((item) => item.sectionId === section.id).length,
});
const serial12 = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(-12);
const deviceOut = (device: Json) => ({ ...device, assignedKioskId: db.kiosks.find((kiosk) => kiosk.posSerial && serial12(kiosk.posSerial) === serial12(device.serial))?.id ?? null });
const categoryOut = (category: Json) => ({ ...category, productCount: db.products.filter((item) => item.categoryId === category.id).length });
const productOut = (product: Json) => ({ ...product, categoryName: db.categories.find((item) => item.id === product.categoryId)?.name });

const orders = db.kiosks.flatMap((kiosk, index) => Array.from({ length: kiosk.todayOrderCount }, (_, n) => {
  const sectionIds = n % 3 === 0 ? [kiosk.featuredSectionId, SECTIONS[(index + 3) % 17][0]] : [kiosk.featuredSectionId];
  return { number: `${kiosk.orderPrefix}-${String(n + 1).padStart(4, '0')}`, kiosk_id: kiosk.id, section_ids: sectionIds, status: 'preparing', fulfillment: 'package', payment_method: n % 4 ? 'card' : 'meal_card', total: kiosk.todayRevenue / Math.max(1, kiosk.todayOrderCount), created_at: iso(n * 900_000 + index * 60_000), item_count: 1 + (n % 3) };
})).sort((a, b) => b.created_at.localeCompare(a.created_at));

const filterOrders = (params: URLSearchParams) => orders.filter((order) => (!params.get('kiosk') || order.kiosk_id === params.get('kiosk')) && (!params.get('section') || order.section_ids.includes(params.get('section')!)));

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function handle(method: string, url: URL, body: Json): Response {
  const path = url.pathname;
  const params = url.searchParams;
  const section = params.get('section');
  let match: RegExpMatchArray | null;
  if (path === '/health') return respond(200, { status: 'ok', database: 'mock' });
  if (path === '/api/admin/sections' && method === 'GET') return respond(200, db.sections.map(sectionCounts));
  if (path === '/api/admin/sections' && method === 'POST') { const item = { ...body, position: db.sections.length } as typeof db.sections[number]; db.sections.push(item); return respond(201, sectionCounts(item)); }
  if (path === '/api/admin/sections/reorder') { const ids = body.ids as string[]; db.sections.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)).forEach((item, position) => { item.position = position; }); return respond(200, { ok: true }); }
  if ((match = path.match(/^\/api\/admin\/sections\/([^/]+)$/))) {
    const item = db.sections.find((entry) => entry.id === match![1]);
    if (!item) return respond(404, { detail: 'Kategori bulunamadı.' });
    if (method === 'DELETE') { if (db.products.some((p) => p.sectionId === item.id)) return respond(409, { detail: 'Ürünü olan kategori silinemez.' }); db.sections = db.sections.filter((entry) => entry !== item); return respond(204); }
    Object.assign(item, body); return respond(200, sectionCounts(item));
  }
  if (path === '/api/admin/kiosks') return respond(200, db.kiosks);
  if ((match = path.match(/^\/api\/admin\/kiosks\/([^/]+)$/))) {
    const kiosk = db.kiosks.find((entry) => entry.id === match![1]);
    if (!kiosk) return respond(404, { detail: 'Kiosk bulunamadı.' });
    if (body.posSerial) {
      const owner = db.kiosks.find((entry) => entry.id !== kiosk.id && serial12(entry.posSerial) === serial12(body.posSerial));
      if (owner) return respond(409, { detail: `Bu POS cihazı zaten ${owner.name} kioskuna atanmış.` });
      body.posSerial = serial12(body.posSerial);
    }
    Object.assign(kiosk, body);
    if (body.featuredSectionId) kiosk.orderPrefix = db.sections.find((entry) => entry.id === body.featuredSectionId)?.orderPrefix ?? kiosk.orderPrefix;
    return respond(200, kiosk);
  }
  if (path === '/api/admin/castles/devices' && method === 'GET') return respond(200, db.devices.map(deviceOut));
  if (path === '/api/admin/castles/devices' && method === 'POST') { const item = { ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as typeof db.devices[number]; db.devices.push(item); return respond(201, deviceOut(item)); }
  if ((match = path.match(/^\/api\/admin\/castles\/devices\/([^/]+)$/))) {
    const item = db.devices.find((entry) => entry.serial === decodeURIComponent(match![1]));
    if (!item) return respond(404, { detail: 'Cihaz bulunamadı.' });
    if (method === 'DELETE') { db.devices = db.devices.filter((entry) => entry !== item); db.kiosks.forEach((kiosk) => { if (serial12(kiosk.posSerial) === serial12(item.serial)) kiosk.posSerial = null; }); return respond(204); }
    Object.assign(item, body, { updatedAt: new Date().toISOString() }); return respond(200, deviceOut(item));
  }
  if (path === '/api/admin/categories' && method === 'GET') return respond(200, db.categories.filter((item) => !section || item.sectionId === section).map(categoryOut));
  if (path === '/api/admin/categories' && method === 'POST') { const item = { id: `cat-${Date.now()}`, position: db.categories.length, ...body } as typeof db.categories[number]; db.categories.push(item); return respond(201, categoryOut(item)); }
  if (path === '/api/admin/categories/reorder') { const ids = body.ids as string[]; db.categories.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); return respond(200, { ok: true }); }
  if ((match = path.match(/^\/api\/admin\/categories\/([^/]+)$/))) {
    const item = db.categories.find((entry) => entry.id === match![1]);
    if (!item) return respond(404, { detail: 'Alt kategori bulunamadı.' });
    if (method === 'DELETE') { db.categories = db.categories.filter((entry) => entry !== item); db.products = db.products.filter((p) => p.categoryId !== item.id); return respond(204); }
    Object.assign(item, body); return respond(200, categoryOut(item));
  }
  if ((path === '/api/admin/products' || path === '/api/admin/stock') && method === 'GET') return respond(200, db.products.filter((item) => !section || item.sectionId === section).map(productOut));
  if (path === '/api/admin/products' && method === 'POST') { const item = { id: `p-${Date.now()}`, position: 0, available: true, ...body } as typeof db.products[number]; db.products.push(item); return respond(201, productOut(item)); }
  if ((match = path.match(/^\/api\/admin\/stock\/([^/]+)\/adjust$/))) {
    const item = db.products.find((entry) => entry.id === match![1]);
    if (!item) return respond(404, { detail: 'Ürün bulunamadı.' });
    const before = Number(item.stockQuantity ?? 0); const qty = Number(body.quantity);
    item.stockQuantity = body.mode === 'add' ? before + qty : body.mode === 'remove' ? Math.max(0, before - qty) : qty;
    db.movements.unshift({ id: Date.now(), product_id: item.id, product_name: item.name, movement_type: body.mode, quantity: body.mode === 'remove' ? -qty : qty, before_quantity: before, after_quantity: item.stockQuantity, note: body.note, created_at: new Date().toISOString() });
    return respond(200, productOut(item));
  }
  if (path === '/api/admin/stock/movements') return respond(200, db.movements);
  if ((match = path.match(/^\/api\/admin\/products\/([^/]+)$/))) {
    const item = db.products.find((entry) => entry.id === match![1]);
    if (!item) return respond(404, { detail: 'Ürün bulunamadı.' });
    if (method === 'DELETE') { db.products = db.products.filter((entry) => entry !== item); return respond(204); }
    Object.assign(item, body); return respond(200, productOut(item));
  }
  if (path === '/api/admin/orders') return respond(200, filterOrders(params));
  if (path === '/api/admin/dashboard') {
    const list = filterOrders(params);
    const revenue = list.reduce((sum, order) => sum + order.total, 0);
    return respond(200, {
      stats: { product_count: db.products.length, active_product_count: db.products.filter((p) => p.active).length, category_count: db.categories.length, low_stock_count: 4, today_order_count: list.length, today_revenue: revenue },
      recentOrders: list.slice(0, 8),
      topProducts: db.products.slice(0, 5).map((p, i) => ({ name: p.name, quantity: 20 - i * 3, revenue: (20 - i * 3) * p.price })),
      kiosks: db.kiosks.map((kiosk) => { const own = list.filter((order) => order.kiosk_id === kiosk.id); return { kioskId: kiosk.id, orderCount: own.length, revenue: own.reduce((sum, order) => sum + order.total, 0) }; }),
      sections: db.sections.map((item) => { const own = list.filter((order) => order.section_ids.includes(item.id)); return { sectionId: item.id, orderCount: own.length, revenue: own.reduce((sum, order) => sum + order.total / order.section_ids.length, 0) }; }),
    });
  }
  if (path === '/api/admin/reports') {
    const list = filterOrders(params);
    const revenue = list.reduce((sum, order) => sum + order.total, 0);
    const days = Array.from({ length: 7 }, (_, i) => new Date(now - (6 - i) * 86_400_000).toISOString().slice(0, 10));
    return respond(200, {
      start: params.get('start'), end: params.get('end'),
      summary: { order_count: list.length, revenue, average_order: list.length ? revenue / list.length : 0 },
      products: db.products.filter((p) => !section || p.sectionId === section).slice(0, 12).map((p, i) => ({ product_id: p.id, name: p.name, category: db.categories.find((c) => c.id === p.categoryId)?.name ?? '', quantity: 12 - (i % 6), revenue: (12 - (i % 6)) * p.price })),
      daily: days.map((day, i) => ({ day, order_count: 10 + i * 3, revenue: (10 + i * 3) * 210 })),
    });
  }
  return respond(404, { detail: 'Mock: uç tanımlı değil.' });
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return realFetch(input, init);
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  const body = init?.body ? JSON.parse(String(init.body)) as Json : {};
  return handle((init?.method ?? 'GET').toUpperCase(), url, body);
};
export {};
console.info('[mock] MagicPay Kiosk paneli örnek veriyle çalışıyor.');
