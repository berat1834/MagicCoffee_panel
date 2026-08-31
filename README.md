# Magic Coffee Panel

Magic Coffee kiosk sisteminin ürün, kategori, stok, sipariş ve raporlama yönetim panelidir.

## Gereksinimler

- Node.js 20+
- Magic Coffee API: `http://127.0.0.1:8300`

## Kurulum

```powershell
npm install
npm run dev
```

Panel geliştirme adresi:

```text
http://127.0.0.1:5371
```

Üretim derlemesi:

```powershell
npm run build
```

## Özellikler

- Dashboard
- Ürün ve kategori yönetimi
- Dosyadan ürün görseli yükleme
- Ürüne özel kahve özelleştirme adımları
- Stok takibi ve satır üzerinden stok işlemleri
- Kiosk satış durumunu açma/kapatma
- Sipariş ve satış raporları
