const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const db = require('./db');
try { db.cleanupOrphanedRoomData(); } catch (_) {}
try { db.syncGalleryFromAllSources(); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'otel-jwt-gizli-anahtar-degistirin';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + (file.originalname || 'image').replace(/\s/g, '-'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Yüklenen dosyaların aynı sunucudan erişilebilir olması için
app.use('/uploads', express.static(UPLOADS_DIR));

const ACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 dakika işlem yoksa oturum sonlanır

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, mesaj: 'Oturum gerekli.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const admin = db.getAdminById(req.user.id);
    if (!admin) return res.status(401).json({ ok: false, mesaj: 'Oturum geçersiz.' });
    const lastActivity = admin.lastActivity ? new Date(admin.lastActivity).getTime() : 0;
    if (Date.now() - lastActivity > ACTIVITY_TIMEOUT_MS) {
      return res.status(401).json({ ok: false, mesaj: 'Oturum süresi doldu. 10 dakikadan fazla işlem yapılmadı.' });
    }
    db.updateAdminActivity(req.user.id);
    next();
  } catch {
    res.status(401).json({ ok: false, mesaj: 'Geçersiz oturum.' });
  }
}

function superAdminOnly(req, res, next) {
  if (req.user.role !== 'super_admin') return res.status(403).json({ ok: false, mesaj: 'Yetkiniz yok.' });
  next();
}

// --- Public API ---
app.get('/api/slider', (req, res) => res.json(db.getSlider()));
app.get('/api/settings', (req, res) => res.json(db.getSettings()));
app.get('/api/rooms', (req, res) => {
  const rooms = db.getRooms(true);
  const checkIn = req.query.checkIn;
  const checkOut = req.query.checkOut;
  if (checkIn && checkOut) {
    const list = rooms.map(r => {
      const avail = db.getRoomAvailabilityForRange(r.id, checkIn, checkOut);
      return { ...r, totalPrice: avail ? avail.totalPrice : null, availableCount: avail ? avail.availableCount : 0, nights: avail ? avail.nights : 0 };
    });
    return res.json(list);
  }
  res.json(rooms);
});
app.get('/api/rooms/:id', (req, res) => {
  const room = db.getRoomById(req.params.id);
  if (!room) return res.status(404).json({ ok: false });
  res.json(room);
});
app.get('/api/rooms/:id/price', (req, res) => {
  const room = db.getRoomById(req.params.id);
  if (!room) return res.status(404).json({ ok: false });
  const dateStr = req.query.date;
  if (dateStr) {
    const effective = db.getRoomEffectivePriceAndCapacity(req.params.id, dateStr);
    if (effective) return res.json(effective);
  }
  res.json({ price: room.price, capacity: room.capacity != null ? room.capacity : 2 });
});
app.get('/api/featured-rooms', (req, res) => {
  const settings = db.getSettings();
  const allRooms = db.getRooms(true);
  const featuredIds = settings.featuredRoomIds || [];
  const featured = featuredIds.length ? allRooms.filter(r => featuredIds.includes(r.id)) : allRooms.slice(0, 3);
  res.json(featured);
});
app.get('/api/testimonials', (req, res) => res.json(db.getTestimonials()));

app.get('/api/services', (req, res) => res.json(db.getServices()));
app.get('/api/gallery', (req, res) => {
  if (req.query.home === '1' || req.query.home === 'true') return res.json(db.getGalleryForHome());
  res.json(db.getGallery());
});

app.get('/api/check-db', (req, res) => {
  try {
    const rooms = db.getRooms(true);
    const firstRoom = rooms[0];
    if (!firstRoom) return res.json({ ok: false, mesaj: 'Veritabanında oda yok. "npm run init" çalıştırın.' });
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dates = db.getDatesInRange(today, tomorrow);
    const eff = firstRoom && db.getRoomEffectivePriceAndCapacity(firstRoom.id, today);
    res.json({ ok: true, mesaj: 'Veritabanı hazır.', odalar: rooms.length, testOda: firstRoom.id, tarihTest: !!eff });
  } catch (err) {
    const errStr = (err && err.message) || String(err);
    console.error('check-db hatası:', errStr);
    res.status(500).json({ ok: false, mesaj: 'Veritabanı hatası: ' + errStr });
  }
});

app.post('/api/reservations', (req, res) => {
  try {
    const { roomId, guestName, email, phone, checkIn, checkOut, guests, note, roomCount, adults, childrenUnder6, children6Plus, rooms: roomsArray } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    if (!guestName || !email || !checkIn || !checkOut) {
      return res.status(400).json({ ok: false, mesaj: 'Zorunlu alanları doldurun.' });
    }
    if (checkIn < today) {
      return res.status(400).json({ ok: false, mesaj: 'Giriş tarihi geçmiş bir tarih olamaz.' });
    }
    const numGuests = Math.max(1, parseInt(guests, 10) || 1);
    const basePayload = { guestName, email, phone: phone || '', checkIn, checkOut, guests: numGuests, note: note || '', adults: adults != null ? parseInt(adults, 10) : null, childrenUnder6: childrenUnder6 != null ? parseInt(childrenUnder6, 10) : null, children6Plus: children6Plus != null ? parseInt(children6Plus, 10) : null };

    if (Array.isArray(roomsArray) && roomsArray.length > 0) {
      const groupId = 'g' + Date.now().toString();
      const stayDates = db.getDatesInRange(checkIn, checkOut);
      const stayNights = stayDates.length > 1 ? stayDates.slice(0, -1) : stayDates;
      let lineIndex = 0;
      for (const line of roomsArray) {
        const rid = line.roomId || line.room_id;
        const qty = Math.max(1, parseInt(line.quantity != null ? line.quantity : line.roomCount, 10) || 1);
        if (!rid) continue;
        const room = db.getRoomById(rid);
        if (!room) return res.status(400).json({ ok: false, mesaj: 'Seçilen odalardan biri bulunamadı.' });
        const cap = room.capacity != null ? room.capacity : 2;
        if (cap * qty < 1) return res.status(400).json({ ok: false, mesaj: 'Oda kapasitesi geçersiz.' });
        for (const dateStr of stayNights) {
          const eff = db.getRoomEffectivePriceAndCapacity(rid, dateStr);
          if (!eff || eff.open === 0) return res.status(400).json({ ok: false, mesaj: 'Seçilen tarihlerde "' + (room.name || rid) + '" satışa kapalı.' });
          const booked = db.getRoomBookedCountByDate(rid, dateStr);
          const availableRooms = Math.max(0, (eff.capacity || 0) - booked);
          if (availableRooms < qty) return res.status(400).json({ ok: false, mesaj: 'Seçilen tarihlerde "' + (room.name || rid) + '" için yeterli oda müsait değil.' });
        }
        const newItem = {
          id: groupId + '-' + String(lineIndex++),
          ...basePayload,
          roomId: rid,
          roomCount: qty,
          status: 'beklemede',
          createdAt: new Date().toISOString(),
          reservationGroupId: groupId
        };
        db.insertReservation(newItem);
      }
      return res.status(201).json({ ok: true, id: groupId, mesaj: 'Rezervasyon talebiniz alındı.' });
    }

    const singleRoomId = roomId;
    if (!singleRoomId) return res.status(400).json({ ok: false, mesaj: 'Oda seçimi gerekli.' });
    const room = db.getRoomById(singleRoomId);
    if (!room) return res.status(400).json({ ok: false, mesaj: 'Seçilen oda bulunamadı.' });
    const numRooms = Math.max(1, parseInt(roomCount, 10) || 1);
    const peoplePerRoom = room.capacity != null ? room.capacity : 2;
    if (peoplePerRoom * numRooms < numGuests) {
      return res.status(400).json({ ok: false, mesaj: 'Seçilen oda sayısı ve kapasite misafir sayısına yetmiyor.' });
    }
    var stayDates = db.getDatesInRange(checkIn, checkOut);
    if (stayDates.length > 1) stayDates = stayDates.slice(0, -1);
    for (const dateStr of stayDates) {
      const eff = db.getRoomEffectivePriceAndCapacity(singleRoomId, dateStr);
      if (!eff || eff.open === 0) {
        return res.status(400).json({ ok: false, mesaj: 'Seçilen tarihlerde oda satışa kapalı.' });
      }
      const booked = db.getRoomBookedCountByDate(singleRoomId, dateStr);
      const availableRooms = Math.max(0, (eff.capacity || 0) - booked);
      if (availableRooms < numRooms) {
        return res.status(400).json({ ok: false, mesaj: 'Seçilen tarihlerde yeterli oda müsait değil (en az ' + numRooms + ' oda gerekli).' });
      }
    }
    const newItem = {
      id: Date.now().toString(),
      ...basePayload,
      roomId: singleRoomId,
      roomCount: numRooms,
      status: 'beklemede',
      createdAt: new Date().toISOString()
    };
    db.insertReservation(newItem);
    res.status(201).json({ ok: true, id: newItem.id, mesaj: 'Rezervasyon talebiniz alındı.' });
  } catch (err) {
    var errStr = (err && (typeof err.message === 'string' ? err.message : String(err))) || '';
    if (!errStr && err) errStr = Object.prototype.toString.call(err);
    console.error('Rezervasyon hatası:', errStr || err);
    var kullaniciMesaj;
    if (errStr && (errStr.includes('FOREIGN KEY') || errStr.includes('SQLITE_CONSTRAINT'))) {
      kullaniciMesaj = 'Seçilen oda artık mevcut olmayabilir. Rezervasyon sayfasından tekrar oda seçin.';
    } else if (errStr && errStr.includes('locked')) {
      kullaniciMesaj = 'Veritabanı şu an kullanımda. Kısa süre sonra tekrar deneyin.';
    } else if (errStr && errStr.includes('no such column')) {
      kullaniciMesaj = 'Veritabanı sürümü uyumsuz. Proje klasöründe "npm run init" çalıştırın veya data klasöründeki otel.db dosyasını silip sunucuyu yeniden başlatın.';
    } else {
      kullaniciMesaj = errStr ? ('Rezervasyon kaydedilemedi. Hata: ' + errStr.slice(0, 200)) : 'Rezervasyon kaydedilemedi. Veritabanı hatası. Lütfen "npm run init" çalıştırın veya data/otel.db dosyasını silip sunucuyu yeniden başlatın.';
    }
    res.status(500).json({ ok: false, mesaj: kullaniciMesaj, detail: errStr ? errStr.slice(0, 300) : null });
  }
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ ok: false, mesaj: 'Ad, e-posta ve mesaj zorunludur.' });
  res.json({ ok: true, mesaj: 'Mesajınız alındı.' });
});

app.post('/api/complaints', (req, res) => {
  const { fullName, phone, title, description, reservationNo } = req.body;
  if (!fullName || !title) return res.status(400).json({ ok: false, mesaj: 'Ad soyad ve şikayet başlığı zorunludur.' });
  db.insertComplaint({
    fullName: String(fullName).trim(),
    phone: String(phone || '').trim(),
    title: String(title).trim(),
    description: String(description || '').trim(),
    reservationNo: String(reservationNo || '').trim()
  });
  res.json({ ok: true, mesaj: 'Şikayet veya öneriniz alındı. En kısa sürede değerlendirilecektir.' });
});

// --- Public: Rezervasyon sorgulama / PDF / iptal (e-posta ile doğrulama) ---
function normalizeEmail(s) {
  return (s || '').trim().toLowerCase();
}
function getReservationPublic(id, email) {
  let r = db.getReservationById(id);
  let groupList = [];
  if (!r && id && /^g\d+/.test(String(id).trim())) {
    groupList = db.getReservationsByGroupId(String(id).trim());
    r = groupList[0] || null;
  }
  if (!r) return null;
  if (email && normalizeEmail(r.email) !== normalizeEmail(email)) return null;
  const room = db.getRoomById(r.roomId);
  const roomName = room ? room.name : r.roomId;
  const avail = db.getRoomAvailabilityForRange(r.roomId, r.checkIn, r.checkOut);
  const totalPrice = avail && avail.nights ? (avail.totalPrice || 0) * (r.roomCount || 1) : null;
  const nights = avail ? avail.nights : 0;
  const displayId = r.reservationGroupId || r.id;
  let status = r.status;
  if (groupList.length > 1) {
    const anyOnayli = groupList.some(x => x.status === 'onaylandi');
    const allIptal = groupList.every(x => x.status === 'iptal');
    if (anyOnayli) status = 'onaylandi';
    else if (allIptal) status = 'iptal';
  }
  return { ...r, id: displayId, status, roomName, totalPrice, nights };
}

app.get('/api/public/reservations/:id', (req, res) => {
  const id = (req.params.id || '').trim();
  const email = (req.query.email || '').trim();
  if (!id) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon numarası gerekli.' });
  const r = getReservationPublic(id, email || null);
  if (!r) return res.status(404).json({ ok: false, mesaj: 'Rezervasyon bulunamadı veya e-posta eşleşmiyor.' });
  res.json(r);
});

app.get('/api/public/reservations/:id/pdf', (req, res) => {
  const id = (req.params.id || '').trim();
  const email = (req.query.email || '').trim();
  if (!id) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon numarası gerekli.' });
  const r = getReservationPublic(id, email || null);
  if (!r) return res.status(404).json({ ok: false, mesaj: 'Rezervasyon bulunamadı veya e-posta eşleşmiyor.' });
  const settings = db.getSettings();
  const hotelName = (settings && settings.introTitle) ? settings.introTitle : 'Toprak Otel';
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rezervasyon-' + id + '.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text(hotelName, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text('Rezervasyon Voucher', { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(10);
  doc.text('Rezervasyon No: ' + (r.id || '-'));
  doc.text('Misafir: ' + (r.guestName || '-'));
  doc.text('E-posta: ' + (r.email || '-'));
  doc.text('Telefon: ' + (r.phone || '-'));
  doc.text('Oda: ' + (r.roomName || r.roomId));
  doc.text('Oda sayısı: ' + (r.roomCount != null ? r.roomCount : 1));
  doc.text('Giriş: ' + (r.checkIn || '-'));
  doc.text('Çıkış: ' + (r.checkOut || '-'));
  doc.text('Gece sayısı: ' + (r.nights || '-'));
  doc.text('Misafir sayısı: ' + (r.guests != null ? r.guests : '-'));
  if (r.totalPrice != null && r.totalPrice > 0) doc.text('Tahmini toplam: ₺' + Number(r.totalPrice).toLocaleString('tr-TR'));
  doc.text('Durum: ' + (r.status === 'onaylandi' ? 'Onaylı' : r.status === 'iptal' ? 'İptal' : r.status === 'gelmeyen' ? 'Gelmeyen' : 'Beklemede'));
  doc.moveDown(1);
  doc.fontSize(9).text('Bu belge rezervasyonunuzun özetidir. Rezervasyon numaranız ve e-posta ile rezervasyonunuzu sorgulayabilir veya iptal edebilirsiniz.', { align: 'left' });
  doc.end();
});

app.post('/api/public/reservations/:id/cancel', (req, res) => {
  const id = (req.params.id || '').trim();
  const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
  if (!id) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon numarası gerekli.' });
  if (!email) return res.status(400).json({ ok: false, mesaj: 'E-posta gerekli.' });
  const r = getReservationPublic(id, email);
  if (!r) return res.status(404).json({ ok: false, mesaj: 'Rezervasyon bulunamadı veya e-posta eşleşmiyor.' });
  if (normalizeEmail(r.email) !== normalizeEmail(email)) return res.status(403).json({ ok: false, mesaj: 'E-posta adresi bu rezervasyonla eşleşmiyor.' });
  if (r.status === 'iptal') return res.status(400).json({ ok: false, mesaj: 'Bu rezervasyon zaten iptal edilmiş.' });
  const today = new Date().toISOString().slice(0, 10);
  if ((r.checkIn || '') < today) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon giriş tarihi geçmiş. İptal sadece giriş tarihi gelmemiş rezervasyonlar için yapılabilir.' });
  const count = db.cancelReservationForGuest(id);
  res.json({ ok: true, mesaj: count > 0 ? 'Rezervasyon iptal edildi.' : 'İptal işlemi yapılamadı.' });
});

/** Rezervasyon tarih/oda değişikliği talebi: sadece son 24 saat içinde. Talep oluşturulur, admin onayından sonra uygulanır. */
app.post('/api/public/reservations/:id/change-dates', (req, res) => {
  const id = (req.params.id || '').trim();
  const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
  const newCheckIn = (req.body && req.body.newCheckIn) ? String(req.body.newCheckIn).trim().slice(0, 10) : '';
  const newCheckOut = (req.body && req.body.newCheckOut) ? String(req.body.newCheckOut).trim().slice(0, 10) : '';
  const newRoomId = (req.body && req.body.newRoomId) ? String(req.body.newRoomId).trim() : null;
  if (!id) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon numarası gerekli.' });
  if (!email) return res.status(400).json({ ok: false, mesaj: 'E-posta gerekli.' });
  if (!newCheckIn || !newCheckOut || newCheckIn >= newCheckOut) return res.status(400).json({ ok: false, mesaj: 'Geçerli giriş ve çıkış tarihi girin.' });
  const r = getReservationPublic(id, email);
  if (!r) return res.status(404).json({ ok: false, mesaj: 'Rezervasyon bulunamadı veya e-posta eşleşmiyor.' });
  if (r.status === 'iptal') return res.status(400).json({ ok: false, mesaj: 'İptal edilmiş rezervasyon değiştirilemez.' });
  const createdAt = r.createdAt ? new Date(r.createdAt).getTime() : 0;
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (createdAt < twentyFourHoursAgo) return res.status(400).json({ ok: false, mesaj: 'Tarih/oda değişikliği sadece rezervasyonun yapıldığı andan itibaren 24 saat içinde yapılabilir.' });
  const groupId = r.reservationGroupId || null;
  const targetRoomId = newRoomId || r.roomId;
  if (newRoomId && !db.getRoomById(newRoomId)) return res.status(400).json({ ok: false, mesaj: 'Seçilen oda tipi bulunamadı.' });
  const excludeId = groupId ? null : (r.id || id);
  if (groupId) {
    const groupList = db.getReservationsByGroupId(groupId);
    let totalRoomCount = 0;
    let sameRoom = false;
    for (const resItem of groupList) {
      if (resItem.status === 'iptal') continue;
      totalRoomCount += (resItem.roomCount || 1);
      if (resItem.roomId === targetRoomId) sameRoom = true;
    }
    const avail = db.getRoomAvailabilityForRange(targetRoomId, newCheckIn, newCheckOut, null, sameRoom ? groupId : null);
    if (!avail || avail.availableCount < totalRoomCount) return res.status(400).json({ ok: false, mesaj: 'Seçilen oda veya tarihlerde yeterli müsaitlik yok. Lütfen başka seçenek deneyin.' });
  } else {
    const need = r.roomCount || 1;
    const sameRoom = targetRoomId === r.roomId;
    const avail = db.getRoomAvailabilityForRange(targetRoomId, newCheckIn, newCheckOut, sameRoom ? excludeId : null, null);
    if (!avail || avail.availableCount < need) return res.status(400).json({ ok: false, mesaj: 'Seçilen oda veya tarihlerde yeterli müsaitlik yok. Lütfen başka seçenek deneyin.' });
  }
  const newRoom = db.getRoomById(targetRoomId);
  const requestId = db.insertReservationChangeRequest({
    reservationDisplayId: id,
    email,
    guestName: r.guestName || '',
    currentRoomId: r.roomId || '',
    currentRoomName: r.roomName || r.roomId || '',
    currentCheckIn: r.checkIn || '',
    currentCheckOut: r.checkOut || '',
    newRoomId: targetRoomId,
    newRoomName: newRoom ? newRoom.name : targetRoomId,
    newCheckIn,
    newCheckOut
  });
  res.json({ ok: true, mesaj: 'Değişiklik talebiniz alındı. Onaylandıktan sonra rezervasyonunuz güncellenecektir.', requestId });
});

// --- Auth ---
app.post('/api/auth/login', (req, res) => {
  console.log('[LOGIN] İstek geldi, body:', { username: req.body?.username ? '(var)' : '(yok)', password: req.body?.password ? '(var)' : '(yok)' });
  const { username, password } = req.body;
  if (!username || !password) {
    console.log('[LOGIN] Hata: kullanıcı adı veya şifre boş');
    return res.status(400).json({ ok: false, mesaj: 'Kullanıcı adı ve şifre gerekli.' });
  }
  const admin = db.getAdminByUsername(String(username).trim());
  if (!admin) {
    console.log('[LOGIN] Hata: kullanıcı bulunamadı:', String(username).trim());
    return res.status(401).json({ ok: false, mesaj: 'Kullanıcı adı veya şifre hatalı.' });
  }
  if (!bcrypt.compareSync(String(password), admin.passwordHash)) {
    console.log('[LOGIN] Hata: şifre yanlış, kullanıcı:', admin.username);
    return res.status(401).json({ ok: false, mesaj: 'Kullanıcı adı veya şifre hatalı.' });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
  db.updateAdminActivity(admin.id); // Giriş anında aktivite güncelle; yoksa hemen sonraki istek 401 döner
  console.log('[LOGIN] Başarılı:', admin.username);
  res.json({ ok: true, token: String(token), user: { id: admin.id, username: admin.username, role: admin.role } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const admin = db.getAdminById(req.user.id);
  if (!admin) return res.status(401).json({ ok: false });
  res.json({ id: admin.id, username: admin.username, role: admin.role });
});

app.put('/api/auth/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ ok: false, mesaj: 'Mevcut ve yeni şifre gerekli.' });
  const admin = db.getAdminById(req.user.id);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.passwordHash)) return res.status(401).json({ ok: false, mesaj: 'Mevcut şifre hatalı.' });
  if (newPassword.length < 6) return res.status(400).json({ ok: false, mesaj: 'Yeni şifre en az 6 karakter olmalı.' });
  db.updateAdminPassword(admin.id, bcrypt.hashSync(newPassword, 10));
  res.json({ ok: true, mesaj: 'Şifre güncellendi.' });
});

app.put('/api/auth/change-username', authMiddleware, (req, res) => {
  const { newUsername, password } = req.body;
  const trimmed = (newUsername || '').trim();
  if (!trimmed) return res.status(400).json({ ok: false, mesaj: 'Yeni kullanıcı adı gerekli.' });
  if (!password) return res.status(400).json({ ok: false, mesaj: 'Şifre doğrulaması gerekli.' });
  const admin = db.getAdminById(req.user.id);
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) return res.status(401).json({ ok: false, mesaj: 'Şifre hatalı.' });
  const existing = db.getAdminByUsername(trimmed);
  if (existing && existing.id !== admin.id) return res.status(400).json({ ok: false, mesaj: 'Bu kullanıcı adı zaten kullanılıyor.' });
  db.updateAdminUsername(admin.id, trimmed);
  const token = jwt.sign({ id: admin.id, username: trimmed, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, mesaj: 'Kullanıcı adı güncellendi.', token, user: { id: admin.id, username: trimmed, role: admin.role } });
});

// --- Protected: Slider ---
app.get('/api/admin/slider', authMiddleware, (req, res) => res.json(db.getSlider()));
app.post('/api/admin/slider', authMiddleware, upload.single('image'), (req, res) => {
  const imageUrl = req.file ? '/uploads/' + req.file.filename : (req.body.imageUrl || '');
  const item = { id: Date.now().toString(), imageUrl, title: req.body.title || '', subtitle: req.body.subtitle || '', order: db.getSliderCount() };
  db.insertSliderItem(item);
  if (imageUrl) db.ensureGalleryHasImage(imageUrl, (req.body.title || req.body.subtitle || '').trim());
  res.status(201).json({ ok: true, item });
});
app.put('/api/admin/slider/:id', authMiddleware, upload.single('image'), (req, res) => {
  const updates = {};
  if (req.file) {
    updates.imageUrl = '/uploads/' + req.file.filename;
    db.ensureGalleryHasImage(updates.imageUrl, (req.body.title || req.body.subtitle || '').trim());
  }
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.subtitle !== undefined) updates.subtitle = req.body.subtitle;
  if (req.body.order !== undefined) updates.order = parseInt(req.body.order, 10);
  const item = db.updateSliderItem(req.params.id, updates);
  if (!item) return res.status(404).json({ ok: false });
  res.json({ ok: true, item });
});
app.delete('/api/admin/slider/:id', authMiddleware, (req, res) => {
  db.deleteSliderItem(req.params.id);
  res.json({ ok: true });
});

// --- Protected: Settings (intro, featured, about, contact) ---
app.get('/api/admin/settings', authMiddleware, (req, res) => res.json(db.getSettings()));
app.put('/api/admin/settings', authMiddleware, (req, res) => {
  const current = db.getSettings();
  const updated = { ...current, ...req.body };
  db.setSettings(updated);
  res.json({ ok: true, settings: updated });
});

// --- Protected: Rooms ---
app.get('/api/admin/rooms', authMiddleware, (req, res) => res.json(db.getRooms(false)));
app.post('/api/admin/rooms', authMiddleware, upload.array('images', 10), (req, res) => {
  const images = (req.files || []).map(f => '/uploads/' + f.filename);
  const cap = req.body.capacity != null && !isNaN(parseInt(req.body.capacity, 10)) ? Math.max(1, parseInt(req.body.capacity, 10)) : 2;
  const room = {
    id: Date.now().toString(),
    name: req.body.name || 'Oda', slug: (req.body.name || 'oda').toLowerCase().replace(/\s+/g, '-'),
    description: req.body.description || '', price: parseFloat(req.body.price) || 0, capacity: cap,
    features: JSON.parse(req.body.features || '[]'),
    images, active: req.body.active !== 'false', createdAt: new Date().toISOString()
  };
  db.insertRoom(room);
  const roomName = room.name || '';
  images.forEach(url => { db.ensureGalleryHasImage(url, roomName); });
  res.status(201).json({ ok: true, room });
});
app.put('/api/admin/rooms/:id', authMiddleware, upload.array('images', 10), (req, res) => {
  const r = db.getRoomById(req.params.id);
  if (!r) return res.status(404).json({ ok: false });
  const updates = {};
  if (req.body.name !== undefined) { updates.name = req.body.name; updates.slug = (req.body.name || r.slug).toLowerCase().replace(/\s+/g, '-'); }
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
  if (req.body.capacity !== undefined) updates.capacity = parseInt(req.body.capacity, 10) >= 1 ? parseInt(req.body.capacity, 10) : 1;
  if (req.body.features !== undefined) updates.features = Array.isArray(req.body.features) ? req.body.features : JSON.parse(req.body.features || '[]');
  if (req.body.active !== undefined) updates.active = req.body.active !== 'false';
  // Resim sırası / silme: body.imagesOrder JSON array (mevcut URL'ler istenen sırada); yeni yüklenen dosyalar sona eklenir. Path olarak sakla (/uploads/xxx).
  function toImagePath(url) {
    if (typeof url !== 'string' || !url.trim()) return '';
    const s = url.trim();
    const match = s.match(/\/uploads\/[^?#]+/);
    if (match) return match[0];
    if (s.startsWith('/uploads/')) return s.split('?')[0];
    return s;
  }
  if (req.body.imagesOrder !== undefined) {
    let ordered = req.body.imagesOrder;
    if (typeof ordered === 'string') try { ordered = JSON.parse(ordered); } catch (e) { ordered = []; }
    if (!Array.isArray(ordered)) ordered = [];
    ordered = ordered.map(toImagePath).filter(Boolean);
    const newUrls = (req.files || []).map(f => '/uploads/' + f.filename);
    updates.images = ordered.concat(newUrls);
  } else if ((req.files || []).length) {
    updates.images = [...(r.images || []), ...(req.files || []).map(f => '/uploads/' + f.filename)];
  }
  const room = db.updateRoom(req.params.id, updates);
  (req.files || []).forEach(f => {
    const url = '/uploads/' + f.filename;
    db.ensureGalleryHasImage(url, updates.name || r.name || '');
  });
  res.json({ ok: true, room });
});
app.delete('/api/admin/rooms/:id', authMiddleware, (req, res) => {
  try {
    db.deleteRoom(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, mesaj: e.message || 'Oda silinemedi.' });
  }
});

// --- Protected: Tarihe göre fiyat dönemleri ---
app.get('/api/admin/room-price-overrides', authMiddleware, (req, res) => {
  const list = db.getRoomPriceOverrides(req.query.roomId || null);
  res.json(list);
});
app.post('/api/admin/room-price-overrides', authMiddleware, (req, res) => {
  const { roomId, dateFrom, dateTo, price, capacity } = req.body;
  if (!roomId || !dateFrom || !dateTo || price == null) return res.status(400).json({ ok: false, mesaj: 'Oda, tarih başlangıç, bitiş ve fiyat gerekli.' });
  const id = Date.now().toString();
  db.insertRoomPriceOverride({ id, roomId, dateFrom, dateTo, price: parseFloat(price) || 0, capacity: capacity != null ? parseInt(capacity, 10) : null, createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true, override: db.getRoomPriceOverrideById(id) });
});
app.put('/api/admin/room-price-overrides/:id', authMiddleware, (req, res) => {
  const o = db.getRoomPriceOverrideById(req.params.id);
  if (!o) return res.status(404).json({ ok: false });
  const updates = {};
  if (req.body.roomId !== undefined) updates.roomId = req.body.roomId;
  if (req.body.dateFrom !== undefined) updates.dateFrom = req.body.dateFrom;
  if (req.body.dateTo !== undefined) updates.dateTo = req.body.dateTo;
  if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
  if (req.body.capacity !== undefined) updates.capacity = req.body.capacity !== '' && req.body.capacity != null ? parseInt(req.body.capacity, 10) : null;
  const updated = db.updateRoomPriceOverride(req.params.id, updates);
  res.json({ ok: true, override: updated });
});
app.delete('/api/admin/room-price-overrides/:id', authMiddleware, (req, res) => {
  db.deleteRoomPriceOverride(req.params.id);
  res.json({ ok: true });
});
app.get('/api/admin/rooms/:id/calendar', authMiddleware, (req, res) => {
  const room = db.getRoomById(req.params.id);
  if (!room) return res.status(404).json({ ok: false });
  const from = db.normalizeDateStr(req.query.from) || req.query.from;
  const to = db.normalizeDateStr(req.query.to) || req.query.to;
  if (!from || !to) return res.status(400).json({ ok: false, mesaj: 'from ve to tarih parametreleri gerekli (YYYY-MM-DD).' });
  const list = db.getRoomCalendar(req.params.id, from, to);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(list);
});
app.post('/api/admin/room-price-overrides/bulk', authMiddleware, (req, res) => {
  const { roomIds, dateFrom, dateTo, price, capacity, openOnly, open } = req.body;
  if (!roomIds || !Array.isArray(roomIds) || !roomIds.length || !dateFrom || !dateTo) {
    return res.status(400).json({ ok: false, mesaj: 'En az bir oda ile tarih başlangıç ve bitiş gerekli.' });
  }
  const fromNorm = db.normalizeDateStr(dateFrom);
  const toNorm = db.normalizeDateStr(dateTo);
  if (!fromNorm || !toNorm) {
    return res.status(400).json({ ok: false, mesaj: 'Tarih formatı YYYY-MM-DD veya GG.AA.YYYY olmalı.' });
  }
  if (openOnly === true || openOnly === 'true') {
    const openVal = (open === 0 || open === '0') ? 0 : 1;
    const count = db.setBulkDailyRates(roomIds, fromNorm, toNorm, null, null, true, openVal);
    return res.status(200).json({ ok: true, updated: count });
  }
  const priceNum = (price != null && price !== '' && !isNaN(parseFloat(price))) ? parseFloat(price) : 0;
  if (priceNum < db.MIN_DAILY_PRICE) {
    return res.status(400).json({ ok: false, mesaj: '100 TL altı girdiniz. Fiyat en az 100 ₺ olmalıdır.' });
  }
  const count = db.setBulkDailyRates(roomIds, fromNorm, toNorm, price, capacity);
  res.status(200).json({ ok: true, updated: count });
});

app.patch('/api/admin/rooms/:id/calendar/day', authMiddleware, (req, res) => {
  try {
    const room = db.getRoomById(req.params.id);
    if (!room) return res.status(404).json({ ok: false });
    const date = db.normalizeDateStr(req.body.date) || req.body.date;
    if (!date) return res.status(400).json({ ok: false, mesaj: 'date gerekli (YYYY-MM-DD).' });
    const { open, price, capacity } = req.body;
    if (price !== undefined || capacity !== undefined) {
      const eff = db.getRoomEffectivePriceAndCapacity(req.params.id, date);
      if (!eff) return res.status(400).json({ ok: false });
      const p = (price !== undefined && price !== '' && !isNaN(parseFloat(price))) ? parseFloat(price) : eff.price;
      if (p < db.MIN_DAILY_PRICE) {
        return res.status(400).json({ ok: false, mesaj: '100 TL altı girdiniz. Fiyat en az 100 ₺ olmalıdır.' });
      }
      const c = (capacity !== undefined && capacity !== '' && !isNaN(parseInt(capacity, 10))) ? Math.max(0, parseInt(capacity, 10)) : eff.capacity;
      db.upsertRoomDailyRate(req.params.id, date, p, c, eff.open);
      return res.json({ ok: true });
    }
    const openVal = (open === 0 || open === '0' || open === false) ? 0 : 1;
    const ok = db.setRoomDayOpen(req.params.id, date, openVal);
    if (!ok) return res.status(400).json({ ok: false });
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH calendar/day hatası:', err);
    res.status(500).json({ ok: false, mesaj: 'Sunucu hatası: ' + (err.message || 'bilinmeyen') });
  }
});

// --- Protected: Reservations ---
app.get('/api/admin/reservations', authMiddleware, (req, res) => res.json(db.getReservations()));
app.get('/api/admin/reservations/:id', authMiddleware, (req, res) => {
  const r = db.getReservationById(req.params.id);
  if (!r) return res.status(404).json({ ok: false, mesaj: 'Rezervasyon bulunamadı.' });
  res.json(r);
});

// --- Protected: Şikayet & Öneriler (iletişim formundan gelen talepler) ---
app.get('/api/admin/complaints', authMiddleware, (req, res) => res.json(db.getComplaints()));

app.get('/api/admin/reservation-change-requests', authMiddleware, (req, res) => res.json(db.getReservationChangeRequests()));
app.get('/api/admin/reservation-change-requests/:id', authMiddleware, (req, res) => {
  const req_ = db.getReservationChangeRequestById(req.params.id);
  if (!req_) return res.status(404).json({ ok: false, mesaj: 'Talep bulunamadı.' });
  res.json(req_);
});
app.post('/api/admin/reservation-change-requests/:id/approve', authMiddleware, (req, res) => {
  const reqId = req.params.id;
  const changeReq = db.getReservationChangeRequestById(reqId);
  if (!changeReq) return res.status(404).json({ ok: false, mesaj: 'Talep bulunamadı.' });
  if (changeReq.status !== 'beklemede') return res.status(400).json({ ok: false, mesaj: 'Talep zaten işlenmiş.' });
  const id = changeReq.reservationDisplayId;
  let internalId = id;
  if (/^g\d+/.test(String(id))) {
    const list = db.getReservationsByGroupId(id);
    if (list.length) internalId = list[0].id;
  }
  const updated = db.updateReservationRoomAndDates(internalId, changeReq.newRoomId, changeReq.newCheckIn, changeReq.newCheckOut);
  if (!updated) return res.status(400).json({ ok: false, mesaj: 'Rezervasyon güncellenemedi (müsaitlik değişmiş olabilir).' });
  db.updateReservationChangeRequestStatus(reqId, 'onaylandi', req.user.id);
  res.json({ ok: true, mesaj: 'Talep onaylandı, rezervasyon güncellendi.' });
});
app.post('/api/admin/reservation-change-requests/:id/reject', authMiddleware, (req, res) => {
  const changeReq = db.getReservationChangeRequestById(req.params.id);
  if (!changeReq) return res.status(404).json({ ok: false, mesaj: 'Talep bulunamadı.' });
  if (changeReq.status !== 'beklemede') return res.status(400).json({ ok: false, mesaj: 'Talep zaten işlenmiş.' });
  db.updateReservationChangeRequestStatus(req.params.id, 'reddedildi', req.user.id);
  res.json({ ok: true, mesaj: 'Talep reddedildi.' });
});

app.patch('/api/admin/reservations/:id', authMiddleware, (req, res) => {
  const { status, paymentMethod, paymentStatus } = req.body;
  let reservation = db.getReservationById(req.params.id);
  if (!reservation) return res.status(404).json({ ok: false });
  if (status !== undefined && status !== null) {
    if (!['beklemede', 'onaylandi', 'iptal', 'gelmeyen'].includes(status)) return res.status(400).json({ ok: false, mesaj: 'Geçersiz durum.' });
    reservation = db.updateReservationStatus(req.params.id, status);
  }
  if (paymentMethod !== undefined || paymentStatus !== undefined) {
    reservation = db.updateReservationPayment(req.params.id, paymentMethod, paymentStatus);
  }
  res.json({ ok: true, reservation });
});

// --- Protected: Admins (super_admin only) ---
app.get('/api/admin/admins', authMiddleware, superAdminOnly, (req, res) => {
  const now = Date.now();
  const admins = db.getAdmins().map(a => {
    const lastActivity = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const isActive = (now - lastActivity) < ACTIVITY_TIMEOUT_MS;
    return { id: a.id, username: a.username, role: a.role, createdAt: a.createdAt, lastActivity: a.lastActivity, isActive };
  });
  res.json(admins);
});
app.post('/api/admin/admins', authMiddleware, superAdminOnly, (req, res) => {
  const { username, password, role } = req.body;
  if (db.getAdminByUsername(username)) return res.status(400).json({ ok: false, mesaj: 'Bu kullanıcı adı zaten kayıtlı.' });
  const admin = { id: Date.now().toString(), username: (username || '').trim(), passwordHash: bcrypt.hashSync(password, 10), role: role || 'admin', createdAt: new Date().toISOString() };
  db.insertAdmin(admin);
  res.status(201).json({ ok: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
});
app.put('/api/admin/admins/:id', authMiddleware, superAdminOnly, (req, res) => {
  const { id } = req.params;
  const { username: newUsername, password: newPassword } = req.body;
  const target = db.getAdminById(id);
  if (!target) return res.status(404).json({ ok: false, mesaj: 'Kullanıcı bulunamadı.' });
  if (newUsername !== undefined && newUsername !== null) {
    const trimmed = (newUsername + '').trim();
    if (!trimmed) return res.status(400).json({ ok: false, mesaj: 'Kullanıcı adı boş olamaz.' });
    const existing = db.getAdminByUsername(trimmed);
    if (existing && existing.id !== id) return res.status(400).json({ ok: false, mesaj: 'Bu kullanıcı adı zaten kayıtlı.' });
    db.updateAdminUsername(id, trimmed);
  }
  if (newPassword !== undefined && newPassword !== null && String(newPassword).length > 0) {
    if (String(newPassword).length < 6) return res.status(400).json({ ok: false, mesaj: 'Şifre en az 6 karakter olmalı.' });
    db.updateAdminPassword(id, bcrypt.hashSync(newPassword, 10));
  }
  if ((newUsername === undefined || newUsername === null) && (newPassword === undefined || newPassword === null || String(newPassword).length === 0))
    return res.status(400).json({ ok: false, mesaj: 'Kullanıcı adı veya şifre girin.' });
  res.json({ ok: true });
});
app.delete('/api/admin/admins/:id', authMiddleware, superAdminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ ok: false, mesaj: 'Kendinizi silemezsiniz.' });
  db.deleteAdmin(req.params.id);
  res.json({ ok: true });
});

// --- Protected: Testimonials ---
app.get('/api/admin/testimonials', authMiddleware, (req, res) => res.json(db.getTestimonials()));
app.post('/api/admin/testimonials', authMiddleware, upload.single('image'), (req, res) => {
  const imageUrl = (req.file && req.file.filename) ? '/uploads/' + req.file.filename : '';
  const author = (req.body.author || '').trim();
  const text = (req.body.text || '').trim();
  if (!imageUrl && !author && !text) return res.status(400).json({ ok: false, mesaj: 'En az bir fotoğraf yükleyin veya yazar/yorum girin.' });
  const rating = Math.min(5, Math.max(0, parseInt(req.body.rating, 10) || 0));
  const item = { id: Date.now().toString(), author, text, rating, imageUrl };
  db.insertTestimonial(item);
  if (imageUrl) db.ensureGalleryHasImage(imageUrl, author || 'Yorum');
  res.status(201).json({ ok: true, item });
});
app.put('/api/admin/testimonials/:id', authMiddleware, upload.single('image'), (req, res) => {
  const existing = db.getTestimonials().find(t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ ok: false });
  const updates = {
    author: (req.body.author != null ? req.body.author : existing.author || '').trim(),
    text: (req.body.text != null ? req.body.text : existing.text || '').trim(),
    rating: req.body.rating !== undefined && req.body.rating !== '' ? Math.min(5, Math.max(0, parseInt(req.body.rating, 10) || 0)) : existing.rating
  };
  if (req.file && req.file.filename) {
    updates.imageUrl = '/uploads/' + req.file.filename;
    db.ensureGalleryHasImage(updates.imageUrl, updates.author || 'Yorum');
  }
  if (req.body.order !== undefined && req.body.order !== '') updates.order = parseInt(req.body.order, 10);
  const item = db.updateTestimonial(req.params.id, updates);
  if (!item) return res.status(404).json({ ok: false });
  res.json({ ok: true, item });
});
app.delete('/api/admin/testimonials/:id', authMiddleware, (req, res) => {
  db.deleteTestimonial(req.params.id);
  res.json({ ok: true });
});

// --- Protected: Services (Hizmetler) ---
app.get('/api/admin/services', authMiddleware, (req, res) => res.json(db.getServices()));
app.post('/api/admin/services', authMiddleware, upload.single('image'), (req, res) => {
  const title = (req.body && req.body.title) ? String(req.body.title).trim() : '';
  const shortDesc = (req.body && req.body.shortDesc != null) ? String(req.body.shortDesc).trim() : '';
  const detail = (req.body && req.body.detail != null) ? String(req.body.detail).trim() : '';
  const icon = (req.body && req.body.icon != null) ? String(req.body.icon).trim() || '⭐' : '⭐';
  if (!title) return res.status(400).json({ ok: false, mesaj: 'Başlık zorunludur.' });
  const imageUrl = (req.file && req.file.filename) ? '/uploads/' + req.file.filename : '';
  const item = db.insertService({ title, shortDesc, detail, icon, imageUrl });
  if (imageUrl) db.ensureGalleryHasImage(imageUrl, title);
  res.status(201).json({ ok: true, item });
});
app.put('/api/admin/services/:id', authMiddleware, upload.single('image'), (req, res) => {
  const existing = db.getServiceById(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, mesaj: 'Hizmet bulunamadı.' });
  const updates = {};
  if (req.body && req.body.title !== undefined) updates.title = String(req.body.title).trim();
  if (req.body && req.body.shortDesc !== undefined) updates.shortDesc = String(req.body.shortDesc).trim();
  if (req.body && req.body.detail !== undefined) updates.detail = String(req.body.detail).trim();
  if (req.body && req.body.icon !== undefined) updates.icon = String(req.body.icon).trim() || '⭐';
  if (req.body && req.body.order !== undefined) updates.order = parseInt(req.body.order, 10);
  if (req.file && req.file.filename) {
    updates.imageUrl = '/uploads/' + req.file.filename;
    db.ensureGalleryHasImage(updates.imageUrl, updates.title !== undefined ? updates.title : existing.title);
  }
  const item = db.updateService(req.params.id, updates);
  res.json({ ok: true, item });
});
app.delete('/api/admin/services/:id', authMiddleware, (req, res) => {
  db.deleteService(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/gallery', authMiddleware, (req, res) => res.json(db.getGallery()));
app.post('/api/admin/gallery', authMiddleware, upload.single('image'), (req, res) => {
  const imageUrl = (req.file && req.file.filename) ? '/uploads/' + req.file.filename : '';
  if (!imageUrl) return res.status(400).json({ ok: false, mesaj: 'Resim gerekli.' });
  const showOnHome = req.body.showOnHome !== 'false' && req.body.showOnHome !== false;
  const item = { id: Date.now().toString(), imageUrl, caption: (req.body.caption || '').trim(), order: db.getGalleryCount(), showOnHome };
  db.insertGalleryItem(item);
  res.status(201).json({ ok: true, item: db.getGalleryItemById(item.id) });
});
app.put('/api/admin/gallery/:id', authMiddleware, upload.single('image'), (req, res) => {
  const existing = db.getGallery().find(g => g.id === req.params.id);
  if (!existing) return res.status(404).json({ ok: false, mesaj: 'Galeri öğesi bulunamadı.' });
  const updates = { caption: (req.body.caption !== undefined ? req.body.caption : existing.caption) || '' };
  if (req.file && req.file.filename) updates.imageUrl = '/uploads/' + req.file.filename;
  if (req.body.order !== undefined) updates.order = parseInt(req.body.order, 10);
  if (req.body.showOnHome !== undefined) updates.showOnHome = req.body.showOnHome === true || req.body.showOnHome === 'true';
  const item = db.updateGalleryItem(req.params.id, updates);
  res.json({ ok: true, item });
});
app.delete('/api/admin/gallery/:id', authMiddleware, (req, res) => {
  db.deleteGalleryItem(req.params.id);
  res.json({ ok: true });
});
app.patch('/api/admin/gallery/:id', authMiddleware, (req, res) => {
  const existing = db.getGallery().find(g => g.id === req.params.id);
  if (!existing) return res.status(404).json({ ok: false, mesaj: 'Galeri öğesi bulunamadı.' });
  const updates = {};
  if (req.body.showOnHome !== undefined) updates.showOnHome = req.body.showOnHome === true || req.body.showOnHome === 'true';
  if (Object.keys(updates).length === 0) return res.json({ ok: true, item: db.getGalleryItemById(req.params.id) });
  const item = db.updateGalleryItem(req.params.id, updates);
  res.json({ ok: true, item });
});

// SPA fallback for admin
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));

// Tüm yakalanmamış hatalar JSON dönsün (500 HTML yerine)
app.use(function(err, req, res, next) {
  console.error('Sunucu hatası:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, mesaj: (err && err.message) ? err.message : 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log('Otel sitesi: http://localhost:' + PORT);
  console.log('Admin: http://localhost:' + PORT + '/admin/');
});
