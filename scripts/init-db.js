const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// db.js data klasörüne yazıyor; önce data ve uploads var olsun
const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = require('../db');

const hasAdmins = db.getAdmins().length > 0;
if (hasAdmins) {
  console.log('Veritabanı zaten dolu. Seed atlanıyor.');
  process.exit(0);
}

// Varsayılan veri
db.insertAdmin({
  id: '1',
  username: 'admin',
  passwordHash: bcrypt.hashSync('admin123', 10),
  role: 'super_admin',
  createdAt: new Date().toISOString()
});

[
  { id: '1', name: 'Standart Oda', slug: 'standart-oda', description: 'Şehir manzaralı, modern donanımlı odalar. 24 m².', price: 1200, features: ['WiFi', 'Minibar', 'Klima'], images: [], active: true, createdAt: new Date().toISOString() },
  { id: '2', name: 'Deniz Manzaralı', slug: 'deniz-manzarali', description: 'Balkonlu, denize nazır odalar. 32 m².', price: 1800, features: ['WiFi', 'Minibar', 'Balkon', 'Deniz manzarası'], images: [], active: true, createdAt: new Date().toISOString() },
  { id: '3', name: 'Suite', slug: 'suite', description: 'Jakuzili, oturma alanlı lüks suit. 55 m².', price: 2800, features: ['WiFi', 'Minibar', 'Jakuzi', 'Oturma alanı', 'Balkon'], images: [], active: true, createdAt: new Date().toISOString() }
].forEach(r => db.insertRoom(r));

db.insertSliderItem({ id: '1', imageUrl: '', title: 'Konforunuz Bizim Önceliğimiz', subtitle: 'Denize sıfır lüks konaklama', order: 0 });

db.setSettings({
  introText: 'Modern konfor ve geleneksel misafirperverliği bir arada sunan otelimizde unutulmaz bir tatil sizi bekliyor.',
  featuredRoomIds: ['1', '2', '3'],
  aboutStory: 'Yıllardır misafirlerimize huzur dolu anlar yaşatıyoruz.',
  mission: 'Misafir memnuniyetini her şeyin üstünde tutmak.',
  vision: 'Bölgenin en tercih edilen oteli olmak.',
  contact: {
    address: 'Örnek Mah. Sahil Cad. No: 1, Antalya',
    phone: '+90 242 123 45 67',
    email: 'info@otel.com',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3180.74!2d30.7133!3d36.8969!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDUzJzQ4LjgiTiAzMMKwNDInNDcuOSJF!5e0!3m2!1str!2str!4v1'
  }
});

db.insertTestimonial({ id: '1', author: 'Ayşe Y.', text: 'Harika bir konaklama deneyimi. Kesinlikle tekrar geleceğiz.', rating: 5 });
db.insertTestimonial({ id: '2', author: 'Mehmet K.', text: 'Personel çok ilgili, odalar tertemiz. Tavsiye ederim.', rating: 5 });

console.log('Veritabanı seed tamamlandı.');
console.log('Varsayılan giriş: admin / admin123');
