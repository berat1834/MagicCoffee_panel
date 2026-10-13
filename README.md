# MagicPay Kiosk Yönetimi (panel, `platform` dalı)

17 kiosklu, 17 ana kategorili MagicPay Kiosk platformunun yönetim panelidir.

## Gereksinimler

- Node.js 20+
- MagicPay Kiosk API (yerelde varsayılan `http://127.0.0.1:8000`, `VITE_DEV_API_PROXY` ile değiştirilebilir)

## Kurulum

```powershell
npm install
npm run dev
```

Panel geliştirme adresi: `http://127.0.0.1:5371`

API olmadan arayüzü denemek için (yalnız geliştirme, üretim derlemesine girmez):

```powershell
$env:VITE_MOCK = '1'; npm run dev
```

Üretim derlemesi: `npm run build`

## Özellikler

- Gösterge paneli: seçili filtre için toplamlar, kiosk bazında tablo, kategori bazında ciro
- Global filtre: Kiosk (Tümü / k01..k17) ve Kategori (Tümü / 17), tarayıcıda saklanır
- Kiosklar: vitrin kategorisi, Castles POS ataması, aktiflik, çevrimiçi durumu, bugünkü satış
- Kategoriler (17 ana kategori): ad, açıklama, ikon, renk, sıralama, aktiflik
- Alt kategoriler, ürünler (özelleştirme, stok, görsel yükleme), stok hareketleri
- Siparişler ve raporlar (kiosk/kategori filtreli)
- POS Cihazları (Castles): seri listesi ve atanan kiosk

## Dağıtım

- Panel API'ye göreli yolla bağlanır; nginx `templates/default.conf.template` içindeki `API_UPSTREAM`
  (varsayılan `http://magickiosk-api.magickiosk.svc.cluster.local`) hedefine proxy yapar.
- `k8s/platform/*` ve `.github/workflows/deploy-platform.yml`: `platform` dalına push → `magickiosk` namespace.
