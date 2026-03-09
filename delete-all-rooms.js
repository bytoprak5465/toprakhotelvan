/**
 * Tüm oda tiplerini ve ilişkili verileri siler.
 * Bir kez çalıştırın: node delete-all-rooms.js
 * (Sunucu kapalıyken çalıştırmanız iyi olur.)
 */
const db = require('./db');

try {
  db.deleteAllRooms();
  console.log('Tüm oda tipleri, günlük fiyatlar, fiyat dönemleri ve rezervasyonlar silindi. Yeniden oda ekleyebilirsiniz.');
} catch (err) {
  console.error('Hata:', err.message);
  process.exit(1);
}
