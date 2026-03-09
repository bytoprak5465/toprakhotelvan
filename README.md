# Gelişmiş Otel Web Sitesi

Modern, responsive otel sitesi: kullanıcı tarafı (anasayfa, odalar, hakkımızda, iletişim) + **admin panel** (slider, ana sayfa ayarları, oda yönetimi, rezervasyonlar, yorumlar, admin yönetimi). Dark/Light tema, animasyonlar ve API tabanlı yapı.

## Kurulum

```bash
cd otel-sitesi
npm install
npm run init
npm start
```

- **Site:** http://localhost:3000  
- **Admin:** http://localhost:3000/admin/  
- **Süper admin varsayılan giriş:** `admin` / `admin123`  
- **Şifre sıfırlama:** `npm run set-credentials` → giriş `admin` / `1234` olur

## Özellikler

### Kullanıcı tarafı
- **Anasayfa:** Slider (admin’den düzenlenir), tanıtım metni, öne çıkan odalar, misafir yorumları
- **Odalar:** Oda listesi, detay sayfası (galeri, özellikler, rezervasyon formu)
- **Hakkımızda:** Hikaye, misyon, vizyon (admin’den düzenlenir)
- **İletişim:** Form, adres/telefon/e-posta, harita (admin’den düzenlenir)
- **Tema:** Gece/gündüz modu (localStorage’da saklanır)
- **Responsive:** Mobil, tablet, masaüstü uyumlu

### Admin panel
- **Dashboard:** Rezervasyon ve oda özeti
- **Slider:** Slide ekleme/düzenleme/silme, görsel yükleme
- **Ana sayfa:** Tanıtım metni, öne çıkan oda ID’leri, hakkımızda/iletişim metinleri
- **Odalar:** Oda ekleme/düzenleme/silme, fiyat, özellikler, görsel yükleme, aktif/pasif
- **Rezervasyonlar:** Listeleme, onaylama/iptal
- **Yorumlar:** Misafir yorumu ekleme/silme
- **Adminler (süper admin):** Yeni admin ekleme/silme, rol (admin / super_admin)

### Teknik
- **Backend:** Node.js + Express, JWT ile admin oturumu, bcrypt ile şifre hash
- **Veritabanı:** SQLite (`data/otel.db`). Tüm veriler bu dosyada saklanır. Modül: `db.js`.
- **Görseller:** `public/uploads/` (slider ve oda fotoğrafları)

## Veritabanı yapısı

- **admins:** `kullanici_id` (birincil anahtar), `kullanici_adi`, `kullanici_sifresi` (hash), `role`, `created_at`, `last_activity`
- **rooms**, **reservations**, **slider**, **settings**, **testimonials** tabloları mevcut; detay için `db.js` içindeki migration’lara bakın.

## Süper admin girişi

- İlk kurulumda `npm run init` çalıştırıldıysa: **admin** / **admin123**
- Şifreyi sıfırlamak için: `npm run set-credentials` → süper admin hesabı **admin** / **1234** olarak güncellenir

## Sunucu

- **Başlatma:** `npm start` veya `node server.js`
- **Durdurma:** Terminalde **Ctrl+C**
- Siteyi mutlaka `npm start` ile çalıştırın; sadece `index.html` açıldığında API çağrıları çalışmaz.
