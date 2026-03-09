const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'otel.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      kullanici_id TEXT PRIMARY KEY,
      kullanici_adi TEXT UNIQUE NOT NULL,
      kullanici_sifresi TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      last_activity TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 2,
      features TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      guests INTEGER NOT NULL DEFAULT 1,
      note TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'beklemede',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slider (
      id TEXT PRIMARY KEY,
      image_url TEXT DEFAULT '',
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      author TEXT DEFAULT '',
      text TEXT DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 5,
      image_url TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      short_desc TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      icon TEXT DEFAULT '⭐',
      order_index INTEGER NOT NULL DEFAULT 0,
      image_url TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL DEFAULT '',
      caption TEXT DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS room_price_overrides (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      price REAL NOT NULL,
      capacity INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS room_daily_rates (
      room_id TEXT NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      capacity INTEGER NOT NULL,
      PRIMARY KEY (room_id, date),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS sikayet_oneriler (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservation_change_requests (
      id TEXT PRIMARY KEY,
      reservation_display_id TEXT NOT NULL,
      email TEXT NOT NULL,
      guest_name TEXT DEFAULT '',
      current_room_id TEXT DEFAULT '',
      current_room_name TEXT DEFAULT '',
      current_check_in TEXT DEFAULT '',
      current_check_out TEXT DEFAULT '',
      new_room_id TEXT NOT NULL,
      new_room_name TEXT DEFAULT '',
      new_check_in TEXT NOT NULL,
      new_check_out TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'beklemede',
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT
    );
  `);
  // Eski veritabanlarını yeni yapıya taşı (kullanici_id, kullanici_adi, kullanici_sifresi)
  try { db.exec('ALTER TABLE admins RENAME COLUMN id TO kullanici_id'); } catch (e) {
    if (!e.message || !e.message.includes('no such column')) throw e;
  }
  try { db.exec('ALTER TABLE admins RENAME COLUMN username TO kullanici_adi'); } catch (e) {
    if (!e.message || !e.message.includes('no such column')) throw e;
  }
  try { db.exec('ALTER TABLE admins RENAME COLUMN email TO kullanici_adi'); } catch (e) {
    if (!e.message || !e.message.includes('no such column')) throw e;
  }
  try { db.exec('ALTER TABLE admins RENAME COLUMN password_hash TO kullanici_sifresi'); } catch (e) {
    if (!e.message || !e.message.includes('no such column')) throw e;
  }
  try { db.exec('ALTER TABLE admins ADD COLUMN last_activity TEXT'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE rooms ADD COLUMN capacity INTEGER NOT NULL DEFAULT 2'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE room_daily_rates ADD COLUMN open INTEGER NOT NULL DEFAULT 1'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN room_count INTEGER NOT NULL DEFAULT 1'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN adults INTEGER'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN children_under_6 INTEGER'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN children_6_plus INTEGER'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN reservation_group_id TEXT'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN payment_method TEXT'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE reservations ADD COLUMN payment_status TEXT'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE testimonials ADD COLUMN image_url TEXT DEFAULT \'\''); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE testimonials ADD COLUMN order_index INTEGER DEFAULT 0'); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE sikayet_oneriler ADD COLUMN reservation_no TEXT DEFAULT \'\''); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
  try { db.exec('ALTER TABLE services ADD COLUMN image_url TEXT DEFAULT \'\''); } catch (e) {
    if (!e.message || !e.message.includes('duplicate')) throw e;
  }
}

const MIN_DAILY_PRICE = 100;

function rowToPriceOverride(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    price: row.price,
    capacity: row.capacity != null ? row.capacity : null,
    createdAt: row.created_at
  };
}

function getRoomPriceOverrides(roomId) {
  const sql = roomId ? 'SELECT * FROM room_price_overrides WHERE room_id = ? ORDER BY date_from' : 'SELECT * FROM room_price_overrides ORDER BY date_from';
  const stmt = roomId ? db.prepare(sql) : db.prepare(sql);
  const rows = roomId ? stmt.all(roomId) : stmt.all();
  return rows.map(rowToPriceOverride);
}

function getRoomPriceOverrideById(id) {
  const row = db.prepare('SELECT * FROM room_price_overrides WHERE id = ?').get(id);
  return rowToPriceOverride(row);
}

/** Tarih string'ini YYYY-MM-DD yap (DD.MM.YYYY veya YYYY-MM-DD kabul eder). */
function normalizeDateStr(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, day, month, year] = m;
    const d = parseInt(day, 10);
    const mo = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (y < 1000 || y > 9999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }
  return null;
}

function getRoomEffectivePriceAndCapacity(roomId, dateStr) {
  const room = getRoomById(roomId);
  if (!room) return null;
  const norm = normalizeDateStr(dateStr) || dateStr;
  let dailyRow = null;
  try {
    dailyRow = db.prepare('SELECT price, capacity, open FROM room_daily_rates WHERE room_id = ? AND date = ?').get(roomId, norm);
  } catch (e) {
    if (e.message && e.message.includes('no such column') && e.message.includes('open')) {
      dailyRow = db.prepare('SELECT price, capacity FROM room_daily_rates WHERE room_id = ? AND date = ?').get(roomId, norm);
      if (dailyRow) dailyRow.open = 1;
    } else throw e;
  }
  if (dailyRow) {
    const p = dailyRow.price != null ? Number(dailyRow.price) : room.price;
    if (p === 0) return { price: 0, capacity: 0, open: 0 };
    return { price: dailyRow.price, capacity: dailyRow.capacity, open: dailyRow.open !== 0 ? 1 : 0 };
  }
  const row = db.prepare(
    'SELECT * FROM room_price_overrides WHERE room_id = ? AND date_from <= ? AND date_to >= ? ORDER BY date_from DESC LIMIT 1'
  ).get(roomId, norm, norm);
  if (row) {
    const price = row.price != null ? Number(row.price) : room.price;
    const cap = row.capacity != null ? row.capacity : room.capacity;
    if (price === 0) return { price: 0, capacity: 0, open: 0 };
    return { price: row.price, capacity: cap, open: cap > 0 ? 1 : 0 };
  }
  const cap = room.capacity;
  const roomPrice = room.price != null ? Number(room.price) : 0;
  if (roomPrice === 0) return { price: 0, capacity: 0, open: 0 };
  return { price: room.price, capacity: cap, open: cap > 0 ? 1 : 0 };
}

/** Tarih, konaklama gecelerinden biri mi? Çıkış günü dahil değil. Toplam rezerve oda sayısı (room_count toplamı). */
/** excludeReservationId veya excludeGroupId verilirse o rezervasyon(lar) hariç sayılır (tarih değişikliği için). */
function getRoomBookedCountByDate(roomId, dateStr, excludeReservationId, excludeGroupId) {
  let sql = 'SELECT COALESCE(SUM(COALESCE(room_count, 1)), 0) as c FROM reservations WHERE room_id = ? AND ? >= check_in AND ? < check_out AND status != ?';
  const params = [roomId, dateStr, dateStr, 'iptal'];
  if (excludeReservationId) {
    sql += ' AND id != ?';
    params.push(excludeReservationId);
  }
  if (excludeGroupId) {
    sql += ' AND (reservation_group_id IS NULL OR reservation_group_id != ?)';
    params.push(excludeGroupId);
  }
  const row = db.prepare(sql).get(...params);
  return (row && row.c != null) ? row.c : 0;
}

/** checkIn/checkOut aralığında konaklama geceleri için toplam fiyat ve minimum boş kontejan. Çıkış günü gece sayılmaz. excludeReservationId/excludeGroupId verilirse o rezervasyon hariç müsaitlik hesaplanır. */
function getRoomAvailabilityForRange(roomId, checkIn, checkOut, excludeReservationId, excludeGroupId) {
  const room = getRoomById(roomId);
  if (!room) return null;
  const dates = getDatesInRange(checkIn, checkOut);
  const stayNights = dates.length > 1 ? dates.slice(0, -1) : dates;
  if (!stayNights.length) return { totalPrice: 0, availableCount: 0, nights: 0 };
  let totalPrice = 0;
  let availableCount = Infinity;
  for (const dateStr of stayNights) {
    const eff = getRoomEffectivePriceAndCapacity(roomId, dateStr);
    if (!eff || eff.open === 0) return { totalPrice: 0, availableCount: 0, nights: stayNights.length };
    const cap = eff.capacity != null ? eff.capacity : room.capacity;
    const booked = getRoomBookedCountByDate(roomId, dateStr, excludeReservationId, excludeGroupId);
    const available = Math.max(0, (cap || 0) - booked);
    if (available < availableCount) availableCount = available;
    totalPrice += (eff.price != null ? Number(eff.price) : 0);
  }
  return { totalPrice, availableCount: availableCount === Infinity ? 0 : availableCount, nights: stayNights.length };
}

function getRoomCalendar(roomId, fromStr, toStr) {
  const room = getRoomById(roomId);
  if (!room) return null;
  const from = new Date(fromStr + 'T12:00:00Z');
  const to = new Date(toStr + 'T12:00:00Z');
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return [];
  const out = [];
  const oneDay = 24 * 60 * 60 * 1000;
  let d = from.getTime();
  const end = to.getTime();
  while (d <= end) {
    const dateStr = new Date(d).toISOString().slice(0, 10);
    const eff = getRoomEffectivePriceAndCapacity(roomId, dateStr);
    const capacity = eff.capacity != null ? eff.capacity : room.capacity;
    const bookedCount = getRoomBookedCountByDate(roomId, dateStr);
    if (eff) out.push({ date: dateStr, price: eff.price, capacity: capacity, bookedCount: bookedCount, open: eff.open !== 0 ? 1 : 0 });
    d += oneDay;
  }
  return out;
}

function insertRoomPriceOverride(override) {
  db.prepare(
    'INSERT INTO room_price_overrides (id, room_id, date_from, date_to, price, capacity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    override.id,
    override.roomId,
    override.dateFrom,
    override.dateTo,
    override.price,
    override.capacity != null ? override.capacity : null,
    override.createdAt
  );
  return getRoomPriceOverrideById(override.id);
}

function updateRoomPriceOverride(id, updates) {
  const o = getRoomPriceOverrideById(id);
  if (!o) return null;
  const merged = { ...o, ...updates };
  db.prepare(
    'UPDATE room_price_overrides SET room_id = ?, date_from = ?, date_to = ?, price = ?, capacity = ? WHERE id = ?'
  ).run(merged.roomId, merged.dateFrom, merged.dateTo, merged.price, merged.capacity != null ? merged.capacity : null, id);
  return getRoomPriceOverrideById(id);
}

function deleteRoomPriceOverride(id) {
  return db.prepare('DELETE FROM room_price_overrides WHERE id = ?').run(id);
}

/** Verilen oda ve tarih aralığıyla kesişen tüm override kayıtlarını siler (toplu güncellemede çakışmayı önlemek için). */
function deleteRoomPriceOverridesInRange(roomId, dateFrom, dateTo) {
  return db.prepare(
    'DELETE FROM room_price_overrides WHERE room_id = ? AND date_from <= ? AND date_to >= ?'
  ).run(roomId, dateTo, dateFrom);
}

/** Booking/Expedia tarzı: belirli bir oda+tarih için günlük fiyat/kapasite/open yazar (varsa günceller). Fiyat en az MIN_DAILY_PRICE. */
function upsertRoomDailyRate(roomId, dateStr, price, capacity, open) {
  const norm = normalizeDateStr(dateStr) || dateStr;
  const cap = capacity != null && !isNaN(capacity) ? Math.max(0, parseInt(capacity, 10)) : 0;
  const pr = (price != null && !isNaN(parseFloat(price))) ? parseFloat(price) : MIN_DAILY_PRICE;
  const isOpen = open !== undefined && open !== null ? (open ? 1 : 0) : 1;
  try {
    db.prepare(
      'INSERT INTO room_daily_rates (room_id, date, price, capacity, open) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_id, date) DO UPDATE SET price = excluded.price, capacity = excluded.capacity, open = excluded.open'
    ).run(roomId, norm, pr, cap, isOpen);
  } catch (e) {
    if (e.message && e.message.includes('no such column') && e.message.includes('open')) {
      try { db.exec('ALTER TABLE room_daily_rates ADD COLUMN open INTEGER NOT NULL DEFAULT 1'); } catch (alterErr) {
        if (!alterErr.message || !alterErr.message.includes('duplicate')) throw alterErr;
      }
      db.prepare(
        'INSERT INTO room_daily_rates (room_id, date, price, capacity, open) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_id, date) DO UPDATE SET price = excluded.price, capacity = excluded.capacity, open = excluded.open'
      ).run(roomId, norm, pr, cap, isOpen);
    } else throw e;
  }
}

/** Sadece o günün satışa açıklığını değiştirir; fiyat ve kontejan aynı kalır. */
function setRoomDayOpen(roomId, dateStr, open) {
  const eff = getRoomEffectivePriceAndCapacity(roomId, dateStr);
  if (!eff) return false;
  const pr = eff.price != null && !isNaN(parseFloat(eff.price)) ? parseFloat(eff.price) : MIN_DAILY_PRICE;
  const cap = eff.capacity != null ? eff.capacity : 0;
  upsertRoomDailyRate(roomId, dateStr, pr, cap, open ? 1 : 0);
  return true;
}

/** Tarih aralığındaki her günü YYYY-MM-DD olarak döndürür (dateFrom, dateTo dahil). */
function getDatesInRange(dateFrom, dateTo) {
  const from = normalizeDateStr(dateFrom);
  const to = normalizeDateStr(dateTo);
  if (!from || !to) return [];
  const fromDate = new Date(from + 'T12:00:00Z');
  const toDate = new Date(to + 'T12:00:00Z');
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate.getTime() > toDate.getTime()) return [];
  const out = [];
  const oneDay = 24 * 60 * 60 * 1000;
  let t = fromDate.getTime();
  const end = toDate.getTime();
  while (t <= end) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += oneDay;
  }
  return out;
}

/** Toplu güncelleme: her oda için aralıktaki her güne fiyat/kapasite/open yazar. openOnly=true ise sadece open güncellenir (fiyat ve kontejan korunur). */
function setBulkDailyRates(roomIds, dateFrom, dateTo, price, capacity, openOnly, openValue) {
  const dates = getDatesInRange(dateFrom, dateTo);
  if (!dates.length) return 0;
  const openVal = (openValue === 0 || openValue === '0') ? 0 : 1;
  let count = 0;
  if (openOnly) {
    const updateOpen = db.prepare('UPDATE room_daily_rates SET open = ? WHERE room_id = ? AND date = ?');
    const insertStmt = db.prepare('INSERT INTO room_daily_rates (room_id, date, price, capacity, open) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_id, date) DO UPDATE SET open = excluded.open');
    for (const roomId of roomIds) {
      const room = getRoomById(roomId);
      const defPrice = Math.max(MIN_DAILY_PRICE, (room && room.price != null) ? room.price : MIN_DAILY_PRICE);
      const defCap = (room && room.capacity != null) ? room.capacity : 2;
      for (const dateStr of dates) {
        const row = db.prepare('SELECT 1 FROM room_daily_rates WHERE room_id = ? AND date = ?').get(roomId, dateStr);
        if (row) updateOpen.run(openVal, roomId, dateStr);
        else insertStmt.run(roomId, dateStr, defPrice, defCap, openVal);
        count++;
      }
    }
    return count;
  }
  const priceNum = (price != null && price !== '' && !isNaN(parseFloat(price))) ? parseFloat(price) : MIN_DAILY_PRICE;
  if (!openOnly && priceNum < MIN_DAILY_PRICE) return 0;
  const stmt = db.prepare(
    'INSERT INTO room_daily_rates (room_id, date, price, capacity, open) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_id, date) DO UPDATE SET price = excluded.price, capacity = excluded.capacity, open = excluded.open'
  );
  for (const roomId of roomIds) {
    const room = getRoomById(roomId);
    const cap = (capacity !== undefined && capacity !== null && capacity !== '' && !isNaN(parseInt(capacity, 10)))
      ? Math.max(0, parseInt(capacity, 10)) : (room && room.capacity != null ? room.capacity : 2);
    for (const dateStr of dates) {
      stmt.run(roomId, dateStr, priceNum, cap, 1);
      count++;
    }
  }
  return count;
}

function rowToRoom(row) {
  if (!row) return null;
  let images = [];
  try {
    const parsed = JSON.parse(row.images || '[]');
    images = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'string' ? [parsed] : []);
  } catch (_) {
    if (typeof row.images === 'string' && row.images.trim()) images = [row.images.trim()];
  }
  images = images.filter(function (u) { return u != null && String(u).trim() !== ''; });
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    price: row.price,
    capacity: row.capacity != null ? row.capacity : 2,
    features: JSON.parse(row.features || '[]'),
    images: images,
    active: row.active !== 0,
    createdAt: row.created_at
  };
}

function rowToReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    guestName: row.guest_name,
    email: row.email,
    phone: row.phone || '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    roomCount: row.room_count != null ? row.room_count : 1,
    adults: row.adults != null ? row.adults : null,
    childrenUnder6: row.children_under_6 != null ? row.children_under_6 : null,
    children6Plus: row.children_6_plus != null ? row.children_6_plus : null,
    note: row.note || '',
    status: row.status,
    reservationGroupId: row.reservation_group_id || null,
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || '',
    createdAt: row.created_at
  };
}

function rowToSlider(row) {
  if (!row) return null;
  return { id: row.id, imageUrl: row.image_url, title: row.title || '', subtitle: row.subtitle || '', order: row.order_index };
}

function rowToAdmin(row) {
  if (!row) return null;
  const id = row.kullanici_id != null ? row.kullanici_id : row.id;
  const username = row.kullanici_adi != null ? row.kullanici_adi : (row.username != null ? row.username : row.email);
  const passwordHash = row.kullanici_sifresi != null ? row.kullanici_sifresi : row.password_hash;
  return { id, username: username || '', passwordHash: passwordHash || '', role: row.role, createdAt: row.created_at, lastActivity: row.last_activity || null };
}

function rowToTestimonial(row) {
  if (!row) return null;
  return { id: row.id, author: row.author || '', text: row.text || '', rating: row.rating, imageUrl: row.image_url || '', order: row.order_index != null ? row.order_index : 0 };
}

function rowToService(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    shortDesc: row.short_desc || '',
    detail: row.detail || '',
    icon: row.icon || '⭐',
    imageUrl: row.image_url || '',
    order: row.order_index != null ? row.order_index : 0
  };
}

function rowToGalleryItem(row) {
  if (!row) return null;
  const showOnHome = row.show_on_home != null ? (row.show_on_home === 1) : true;
  return { id: row.id, imageUrl: row.image_url || '', caption: row.caption || '', order: row.order_index != null ? row.order_index : 0, showOnHome };
}

// --- Admins ---
function getAdmins() {
  return db.prepare('SELECT * FROM admins').all().map(rowToAdmin);
}

function getAdminById(id) {
  const row = db.prepare('SELECT * FROM admins WHERE kullanici_id = ?').get(id);
  return rowToAdmin(row);
}

function getAdminByUsername(username) {
  const key = (username || '').trim();
  if (!key) return null;
  const row = db.prepare('SELECT * FROM admins WHERE kullanici_adi = ?').get(key);
  return rowToAdmin(row);
}

function insertAdmin(admin) {
  db.prepare(
    'INSERT INTO admins (kullanici_id, kullanici_adi, kullanici_sifresi, role, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(admin.id, (admin.username || '').trim(), admin.passwordHash, admin.role || 'admin', admin.createdAt);
}

function deleteAdmin(id) {
  return db.prepare('DELETE FROM admins WHERE kullanici_id = ?').run(id);
}

function updateAdminPassword(id, passwordHash) {
  const result = db.prepare('UPDATE admins SET kullanici_sifresi = ? WHERE kullanici_id = ?').run(passwordHash, id);
  return result.changes > 0;
}

function updateAdminUsername(id, username) {
  const result = db.prepare('UPDATE admins SET kullanici_adi = ? WHERE kullanici_id = ?').run((username || '').trim(), id);
  return result.changes > 0;
}

function updateAdminActivity(id) {
  const now = new Date().toISOString();
  try {
    db.prepare('UPDATE admins SET last_activity = ? WHERE kullanici_id = ?').run(now, id);
  } catch (_) {}
}

// --- Rooms ---
function getRooms(activeOnly = false) {
  let sql = 'SELECT * FROM rooms';
  if (activeOnly) sql += ' WHERE active = 1';
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all().map(rowToRoom);
}

function getRoomById(id) {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  return rowToRoom(row);
}

function insertRoom(room) {
  db.prepare(
    'INSERT INTO rooms (id, name, slug, description, price, capacity, features, images, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    room.id,
    room.name,
    room.slug,
    room.description || '',
    room.price,
    room.capacity != null ? room.capacity : 2,
    JSON.stringify(room.features || []),
    JSON.stringify(room.images || []),
    room.active !== false ? 1 : 0,
    room.createdAt
  );
}

function updateRoom(id, updates) {
  const r = getRoomById(id);
  if (!r) return null;
  const room = { ...r, ...updates };
  db.prepare(
    'UPDATE rooms SET name = ?, slug = ?, description = ?, price = ?, capacity = ?, features = ?, images = ?, active = ? WHERE id = ?'
  ).run(
    room.name,
    room.slug,
    room.description || '',
    room.price,
    room.capacity != null ? room.capacity : 2,
    JSON.stringify(room.features || []),
    JSON.stringify(room.images || []),
    room.active !== false ? 1 : 0,
    id
  );
  return getRoomById(id);
}

function deleteRoom(id) {
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.pragma('foreign_keys = OFF');
    run('DELETE FROM room_daily_rates WHERE room_id = ?', id);
    run('DELETE FROM room_price_overrides WHERE room_id = ?', id);
    run('DELETE FROM reservations WHERE room_id = ?', id);
    const result = run('DELETE FROM rooms WHERE id = ?', id);
    db.pragma('foreign_keys = ON');
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    db.pragma('foreign_keys = ON');
    throw e;
  }
}

/** Veritabanında karşılığı olmayan oda id’lerine ait fiyat kayıtlarını temizler (eski sistemden kalan). */
function cleanupOrphanedRoomData() {
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM room_daily_rates WHERE room_id NOT IN (SELECT id FROM rooms)').run();
    db.prepare('DELETE FROM room_price_overrides WHERE room_id NOT IN (SELECT id FROM rooms)').run();
    db.pragma('foreign_keys = ON');
  } catch (_) { db.pragma('foreign_keys = ON'); }
}

/** Tüm oda tiplerini ve ilişkili verileri siler (room_daily_rates, room_price_overrides, reservations, rooms). */
function deleteAllRooms() {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM room_daily_rates').run();
    db.prepare('DELETE FROM room_price_overrides').run();
    db.prepare('DELETE FROM reservations').run();
    db.prepare('DELETE FROM rooms').run();
    db.pragma('foreign_keys = ON');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    db.pragma('foreign_keys = ON');
    throw e;
  }
}

// --- Reservations ---
function getReservations() {
  return db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all().map(rowToReservation);
}

function getReservationById(id) {
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  return rowToReservation(row);
}

function getReservationsByGroupId(groupId) {
  if (!groupId) return [];
  return db.prepare('SELECT * FROM reservations WHERE reservation_group_id = ? ORDER BY id').all(groupId).map(rowToReservation);
}

function insertReservation(rev) {
  const id = rev.id != null ? String(rev.id) : Date.now().toString();
  const roomId = rev.roomId != null ? String(rev.roomId) : '';
  const guestName = rev.guestName != null ? String(rev.guestName).trim() : '';
  const email = rev.email != null ? String(rev.email).trim() : '';
  const phone = rev.phone != null ? String(rev.phone) : '';
  const checkIn = rev.checkIn != null ? String(rev.checkIn) : '';
  const checkOut = rev.checkOut != null ? String(rev.checkOut) : '';
  const guests = parseInt(rev.guests, 10);
  const roomCount = Math.max(1, parseInt(rev.roomCount, 10) || 1);
  const adults = rev.adults != null ? parseInt(rev.adults, 10) : null;
  const childrenUnder6 = rev.childrenUnder6 != null ? parseInt(rev.childrenUnder6, 10) : null;
  const children6Plus = rev.children6Plus != null ? parseInt(rev.children6Plus, 10) : null;
  const note = rev.note != null ? String(rev.note) : '';
  const status = rev.status != null ? String(rev.status) : 'beklemede';
  const createdAt = rev.createdAt != null ? String(rev.createdAt) : new Date().toISOString();
  const groupId = rev.reservationGroupId != null ? String(rev.reservationGroupId) : null;
  const paymentMethod = rev.paymentMethod != null ? String(rev.paymentMethod).trim() : null;
  const paymentStatus = rev.paymentStatus != null ? String(rev.paymentStatus).trim() : null;
  db.prepare(
    'INSERT INTO reservations (id, room_id, guest_name, email, phone, check_in, check_out, guests, room_count, adults, children_under_6, children_6_plus, note, status, created_at, reservation_group_id, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    roomId,
    guestName,
    email,
    phone,
    checkIn,
    checkOut,
    isNaN(guests) || guests < 1 ? 1 : guests,
    roomCount,
    adults,
    childrenUnder6,
    children6Plus,
    note,
    status,
    createdAt,
    groupId,
    paymentMethod,
    paymentStatus
  );
}

function updateReservationStatus(id, status) {
  const r = getReservationById(id);
  if (!r) return null;
  if (r.reservationGroupId) {
    db.prepare('UPDATE reservations SET status = ? WHERE reservation_group_id = ?').run(status, r.reservationGroupId);
    return getReservationById(id);
  }
  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, id);
  return getReservationById(id);
}

/** Müşteri iptali: id (veya grup id) ile bulunan rezervasyon (varsa grubu) iptal eder. E-posta eşleşmesi çağıran tarafında yapılır. */
function cancelReservationForGuest(id) {
  let r = getReservationById(id);
  if (!r && id && /^g\d+/.test(String(id).trim())) {
    const groupList = getReservationsByGroupId(String(id).trim());
    r = groupList[0] || null;
  }
  if (!r) return null;
  if (r.reservationGroupId) {
    db.prepare('UPDATE reservations SET status = ? WHERE reservation_group_id = ?').run('iptal', r.reservationGroupId);
    return db.prepare('SELECT COUNT(*) as c FROM reservations WHERE reservation_group_id = ?').get(r.reservationGroupId).c;
  }
  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('iptal', id);
  return 1;
}

function updateReservationPayment(id, paymentMethod, paymentStatus) {
  const r = getReservationById(id);
  if (!r) return null;
  const method = paymentMethod !== undefined && paymentMethod !== null ? String(paymentMethod).trim() : (r.paymentMethod || '');
  const status = paymentStatus !== undefined && paymentStatus !== null ? String(paymentStatus).trim() : (r.paymentStatus || '');
  db.prepare('UPDATE reservations SET payment_method = ?, payment_status = ? WHERE id = ?').run(method, status, id);
  return getReservationById(id);
}

/** Tarih değişikliği: rezervasyonun (veya grubun) check_in ve check_out değerlerini günceller. */
function updateReservationDates(id, checkIn, checkOut) {
  const r = getReservationById(id);
  if (!r) return null;
  const checkInStr = normalizeDateStr(checkIn) || String(checkIn || '').trim().slice(0, 10);
  const checkOutStr = normalizeDateStr(checkOut) || String(checkOut || '').trim().slice(0, 10);
  if (!checkInStr || !checkOutStr || checkInStr >= checkOutStr) return null;
  if (r.reservationGroupId) {
    db.prepare('UPDATE reservations SET check_in = ?, check_out = ? WHERE reservation_group_id = ?').run(checkInStr, checkOutStr, r.reservationGroupId);
    return db.prepare('SELECT COUNT(*) as c FROM reservations WHERE reservation_group_id = ?').get(r.reservationGroupId).c;
  }
  db.prepare('UPDATE reservations SET check_in = ?, check_out = ? WHERE id = ?').run(checkInStr, checkOutStr, id);
  return 1;
}

/** Oda ve tarih değişikliği: rezervasyonun (veya grubun) room_id, check_in ve check_out değerlerini günceller. */
function updateReservationRoomAndDates(id, roomId, checkIn, checkOut) {
  const r = getReservationById(id);
  if (!r) return null;
  const roomIdStr = String(roomId || '').trim();
  const checkInStr = normalizeDateStr(checkIn) || String(checkIn || '').trim().slice(0, 10);
  const checkOutStr = normalizeDateStr(checkOut) || String(checkOut || '').trim().slice(0, 10);
  if (!roomIdStr || !checkInStr || !checkOutStr || checkInStr >= checkOutStr) return null;
  if (r.reservationGroupId) {
    db.prepare('UPDATE reservations SET room_id = ?, check_in = ?, check_out = ? WHERE reservation_group_id = ?').run(roomIdStr, checkInStr, checkOutStr, r.reservationGroupId);
    return db.prepare('SELECT COUNT(*) as c FROM reservations WHERE reservation_group_id = ?').get(r.reservationGroupId).c;
  }
  db.prepare('UPDATE reservations SET room_id = ?, check_in = ?, check_out = ? WHERE id = ?').run(roomIdStr, checkInStr, checkOutStr, id);
  return 1;
}

// --- Slider ---
function getSlider() {
  return db.prepare('SELECT * FROM slider ORDER BY order_index ASC').all().map(rowToSlider);
}

function insertSliderItem(item) {
  db.prepare(
    'INSERT INTO slider (id, image_url, title, subtitle, order_index) VALUES (?, ?, ?, ?, ?)'
  ).run(item.id, item.imageUrl || '', item.title || '', item.subtitle || '', item.order ?? 0);
}

function updateSliderItem(id, updates) {
  const row = db.prepare('SELECT * FROM slider WHERE id = ?').get(id);
  if (!row) return null;
  const img = updates.imageUrl !== undefined ? updates.imageUrl : row.image_url;
  const title = updates.title !== undefined ? updates.title : row.title;
  const subtitle = updates.subtitle !== undefined ? updates.subtitle : row.subtitle;
  const order = updates.order !== undefined ? updates.order : row.order_index;
  db.prepare('UPDATE slider SET image_url = ?, title = ?, subtitle = ?, order_index = ? WHERE id = ?').run(img, title, subtitle, order, id);
  return rowToSlider(db.prepare('SELECT * FROM slider WHERE id = ?').get(id));
}

function deleteSliderItem(id) {
  return db.prepare('DELETE FROM slider WHERE id = ?').run(id);
}

function getSliderCount() {
  return db.prepare('SELECT COUNT(*) as c FROM slider').get().c;
}

// --- Settings ---
function getSettings() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'main'").get();
  return row ? JSON.parse(row.value) : {};
}

function setSettings(data) {
  const json = JSON.stringify(data);
  db.prepare("INSERT INTO settings (key, value) VALUES ('main', ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(json, json);
}

// --- Testimonials ---
function getTestimonials() {
  return db.prepare('SELECT * FROM testimonials ORDER BY order_index ASC, id ASC').all().map(rowToTestimonial);
}

function getTestimonialCount() {
  return db.prepare('SELECT COUNT(*) as c FROM testimonials').get().c;
}

function insertTestimonial(t) {
  const orderIdx = t.order != null ? t.order : getTestimonialCount();
  db.prepare('INSERT INTO testimonials (id, author, text, rating, image_url, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    t.id,
    t.author || '',
    t.text || '',
    t.rating ?? 5,
    t.imageUrl || '',
    orderIdx,
    t.createdAt || new Date().toISOString()
  );
}

function updateTestimonial(id, updates) {
  const row = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
  if (!row) return null;
  const author = updates.author !== undefined ? updates.author : row.author;
  const text = updates.text !== undefined ? updates.text : row.text;
  const rating = updates.rating !== undefined ? updates.rating : row.rating;
  const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : (row.image_url || '');
  const orderIdx = updates.order !== undefined ? updates.order : (row.order_index != null ? row.order_index : 0);
  db.prepare('UPDATE testimonials SET author = ?, text = ?, rating = ?, image_url = ?, order_index = ? WHERE id = ?').run(author, text, rating, imageUrl, orderIdx, id);
  return rowToTestimonial(db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id));
}

function deleteTestimonial(id) {
  return db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
}

// --- Services (Hizmetler) ---
function getServices() {
  return db.prepare('SELECT * FROM services ORDER BY order_index ASC, id ASC').all().map(rowToService);
}

function getServiceCount() {
  return db.prepare('SELECT COUNT(*) as c FROM services').get().c;
}

function insertService(s) {
  const id = s.id != null ? String(s.id) : Date.now().toString();
  db.prepare(
    'INSERT INTO services (id, title, short_desc, detail, icon, order_index, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    s.title || '',
    s.shortDesc != null ? s.shortDesc : (s.short_desc || ''),
    s.detail != null ? s.detail : (s.detail || ''),
    s.icon != null ? s.icon : '⭐',
    s.order != null ? s.order : getServiceCount(),
    s.imageUrl != null ? s.imageUrl : (s.image_url || '')
  );
  return getServiceById(id);
}

function getServiceById(id) {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  return rowToService(row);
}

function updateService(id, updates) {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!row) return null;
  const title = updates.title !== undefined ? updates.title : row.title;
  const shortDesc = updates.shortDesc !== undefined ? updates.shortDesc : (updates.short_desc !== undefined ? updates.short_desc : row.short_desc);
  const detail = updates.detail !== undefined ? updates.detail : row.detail;
  const icon = updates.icon !== undefined ? updates.icon : row.icon;
  const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : (updates.image_url !== undefined ? updates.image_url : (row.image_url || ''));
  const orderIdx = updates.order !== undefined ? updates.order : (row.order_index != null ? row.order_index : 0);
  db.prepare('UPDATE services SET title = ?, short_desc = ?, detail = ?, icon = ?, order_index = ?, image_url = ? WHERE id = ?').run(title, shortDesc, detail, icon, orderIdx, imageUrl, id);
  return getServiceById(id);
}

function deleteService(id) {
  return db.prepare('DELETE FROM services WHERE id = ?').run(id);
}

// --- Gallery ---
function getGallery() {
  return db.prepare('SELECT * FROM gallery ORDER BY order_index ASC, id ASC').all().map(rowToGalleryItem);
}

/** Sadece ana sayfada gösterilecek galeri öğeleri */
function getGalleryForHome() {
  return db.prepare('SELECT * FROM gallery WHERE show_on_home = 1 ORDER BY order_index ASC, id ASC').all().map(rowToGalleryItem);
}

function getGalleryCount() {
  return db.prepare('SELECT COUNT(*) as c FROM gallery').get().c;
}

function insertGalleryItem(item) {
  const id = item.id != null ? String(item.id) : Date.now().toString();
  const orderIdx = item.order != null ? item.order : getGalleryCount();
  const showOnHome = item.showOnHome !== false ? 1 : 0;
  db.prepare('INSERT INTO gallery (id, image_url, caption, order_index, show_on_home) VALUES (?, ?, ?, ?, ?)').run(
    id,
    item.imageUrl || '',
    item.caption || '',
    orderIdx,
    showOnHome
  );
  return getGalleryItemById(id);
}

function getGalleryItemById(id) {
  const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  return rowToGalleryItem(row);
}

/** Aynı imageUrl galeride yoksa ekler (kaynak silinse bile galeride kalsın). Ana sayfada göstermez (show_on_home=0). */
function ensureGalleryHasImage(imageUrl, caption) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) return null;
  const url = imageUrl.trim();
  const existing = db.prepare('SELECT id FROM gallery WHERE image_url = ?').get(url);
  if (existing) return getGalleryItemById(existing.id);
  const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
  const order = getGalleryCount();
  db.prepare('INSERT INTO gallery (id, image_url, caption, order_index, show_on_home) VALUES (?, ?, ?, ?, 0)').run(id, url, caption || '', order);
  return getGalleryItemById(id);
}

function updateGalleryItem(id, updates) {
  const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  if (!row) return null;
  const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : row.image_url;
  const caption = updates.caption !== undefined ? updates.caption : (row.caption || '');
  const orderIdx = updates.order !== undefined ? updates.order : (row.order_index != null ? row.order_index : 0);
  const showOnHome = updates.showOnHome !== undefined ? (updates.showOnHome ? 1 : 0) : (row.show_on_home != null ? row.show_on_home : 1);
  db.prepare('UPDATE gallery SET image_url = ?, caption = ?, order_index = ?, show_on_home = ? WHERE id = ?').run(imageUrl, caption, orderIdx, showOnHome, id);
  return getGalleryItemById(id);
}

function deleteGalleryItem(id) {
  return db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
}

/** Slider, odalar, yorumlar, hizmetlerdeki tüm resimleri galeriye ekler (yoksa). Sunucu açılışında veya manuel senkron için. */
function syncGalleryFromAllSources() {
  const slider = db.getSlider();
  slider.forEach(s => { if (s.imageUrl) db.ensureGalleryHasImage(s.imageUrl, s.title || s.subtitle || ''); });
  const rooms = db.getRooms(false);
  rooms.forEach(r => {
    const urls = Array.isArray(r.images) ? r.images : [];
    urls.forEach(url => { if (url) db.ensureGalleryHasImage(url, r.name || ''); });
  });
  const testimonials = db.getTestimonials();
  testimonials.forEach(t => { if (t.imageUrl) db.ensureGalleryHasImage(t.imageUrl, t.author || 'Yorum'); });
  const services = db.getServices();
  services.forEach(s => { if (s.imageUrl) db.ensureGalleryHasImage(s.imageUrl, s.title || ''); });
}

const DEFAULT_SERVICES = [
  { id: 'kahvalti', title: 'Kahvaltı', shortDesc: 'Zengin açık büfe kahvaltı', detail: 'Her sabah taze ve zengin açık büfe kahvaltımızla güne başlayın. Sıcak ve soğuk lezzetler, ev yapımı reçeller ve bölgeye özel ürünlerle konforunuzu tamamlıyoruz.', icon: '☕', order: 0 },
  { id: 'otopark', title: 'Otopark', shortDesc: 'Ücretsiz kapalı otopark', detail: 'Otelimizde misafirlerimiz için ücretsiz kapalı otopark imkânı sunuyoruz. Aracınız güvenle park edebilir; bölgede nadir bulunan bu hizmetle konforunuzu artırıyoruz.', icon: '🅿️', order: 1 },
  { id: 'wifi', title: 'Ücretsiz Wi-Fi', shortDesc: 'Tüm otel alanında hızlı internet', detail: 'Otelimizin tüm alanında ücretsiz ve hızlı Wi-Fi hizmeti veriyoruz. Odanızda, lobide ve ortak alanlarda kesintisiz bağlantı ile iş ve iletişim ihtiyaçlarınızı karşılayın.', icon: '📶', order: 2 },
  { id: 'restoran', title: 'Restoran', shortDesc: 'Yerel ve uluslararası mutfak', detail: 'Restoranımızda yerel lezzetler ve uluslararası mutfak seçenekleri sunuyoruz. Taze malzemelerle hazırlanan yemeklerimizi deneyimleyin.', icon: '🍽️', order: 3 },
  { id: 'oda-servisi', title: 'Oda Servisi', shortDesc: '24 saat oda servisi', detail: 'Konforunuz için 24 saat oda servisi hizmeti sunuyoruz. İstediğiniz saatte odanızda yemek ve içecek siparişi verebilirsiniz.', icon: '🛎️', order: 4 },
  { id: 'resepsiyon', title: 'Resepsiyon 7/24', shortDesc: 'Kesintisiz resepsiyon hizmeti', detail: 'Resepsiyon ekibimiz 7 gün 24 saat hizmetinizdedir. Giriş-çıkış, bilgi ve destek talepleriniz için her an yanınızdayız.', icon: '🏨', order: 5 }
];

function seedDefaultServicesIfEmpty() {
  if (getServiceCount() > 0) return;
  DEFAULT_SERVICES.forEach(function(s) { insertService(s); });
}

// --- Şikayet & Öneriler ---
function insertComplaint(data) {
  const id = Date.now().toString();
  db.prepare(
    'INSERT INTO sikayet_oneriler (id, full_name, phone, title, description, reservation_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    data.fullName || '',
    data.phone || '',
    data.title || '',
    data.description || '',
    data.reservationNo || '',
    data.createdAt || new Date().toISOString()
  );
  return id;
}

function getComplaints() {
  return db.prepare('SELECT * FROM sikayet_oneriler ORDER BY created_at DESC').all().map(function(row) {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      title: row.title,
      description: row.description,
      reservationNo: row.reservation_no != null ? row.reservation_no : '',
      createdAt: row.created_at
    };
  });
}

// --- Rezervasyon değişiklik talepleri (admin onayı bekler) ---
function insertReservationChangeRequest(data) {
  const id = Date.now().toString();
  db.prepare(
    'INSERT INTO reservation_change_requests (id, reservation_display_id, email, guest_name, current_room_id, current_room_name, current_check_in, current_check_out, new_room_id, new_room_name, new_check_in, new_check_out, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    data.reservationDisplayId || '',
    data.email || '',
    data.guestName || '',
    data.currentRoomId || '',
    data.currentRoomName || '',
    data.currentCheckIn || '',
    data.currentCheckOut || '',
    data.newRoomId || '',
    data.newRoomName || '',
    data.newCheckIn || '',
    data.newCheckOut || '',
    'beklemede',
    data.createdAt || new Date().toISOString()
  );
  return id;
}

function getReservationChangeRequests() {
  return db.prepare('SELECT * FROM reservation_change_requests ORDER BY created_at DESC').all().map(function(row) {
    return {
      id: row.id,
      reservationDisplayId: row.reservation_display_id,
      email: row.email,
      guestName: row.guest_name,
      currentRoomId: row.current_room_id,
      currentRoomName: row.current_room_name,
      currentCheckIn: row.current_check_in,
      currentCheckOut: row.current_check_out,
      newRoomId: row.new_room_id,
      newRoomName: row.new_room_name,
      newCheckIn: row.new_check_in,
      newCheckOut: row.new_check_out,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by
    };
  });
}

function getReservationChangeRequestById(id) {
  const row = db.prepare('SELECT * FROM reservation_change_requests WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    reservationDisplayId: row.reservation_display_id,
    email: row.email,
    guestName: row.guest_name,
    currentRoomId: row.current_room_id,
    currentRoomName: row.current_room_name,
    currentCheckIn: row.current_check_in,
    currentCheckOut: row.current_check_out,
    newRoomId: row.new_room_id,
    newRoomName: row.new_room_name,
    newCheckIn: row.new_check_in,
    newCheckOut: row.new_check_out,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
  };
}

function updateReservationChangeRequestStatus(id, status, reviewedBy) {
  const req = getReservationChangeRequestById(id);
  if (!req) return null;
  const now = new Date().toISOString();
  db.prepare('UPDATE reservation_change_requests SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?').run(status, now, reviewedBy || null, id);
  return getReservationChangeRequestById(id);
}

runMigrations();
ensureGalleryShowOnHomeColumn();
seedDefaultServicesIfEmpty();

function ensureGalleryShowOnHomeColumn() {
  try {
    const info = db.prepare('PRAGMA table_info(gallery)').all();
    if (info.some(c => c.name === 'show_on_home')) return;
    db.prepare('ALTER TABLE gallery ADD COLUMN show_on_home INTEGER NOT NULL DEFAULT 1').run();
  } catch (_) {}
}

module.exports = {
  db,
  runMigrations,
  getAdmins,
  getAdminById,
  getAdminByUsername,
  insertAdmin,
  deleteAdmin,
  updateAdminPassword,
  updateAdminUsername,
  updateAdminActivity,
  getRooms,
  getRoomById,
  insertRoom,
  updateRoom,
  deleteRoom,
  getRoomPriceOverrides,
  getRoomPriceOverrideById,
  getRoomEffectivePriceAndCapacity,
  getRoomBookedCountByDate,
  getDatesInRange,
  getRoomAvailabilityForRange,
  getRoomCalendar,
  insertRoomPriceOverride,
  updateRoomPriceOverride,
  deleteRoomPriceOverride,
  deleteRoomPriceOverridesInRange,
  normalizeDateStr,
  setBulkDailyRates,
  upsertRoomDailyRate,
  setRoomDayOpen,
  MIN_DAILY_PRICE,
  getReservations,
  getReservationById,
  getReservationsByGroupId,
  insertReservation,
  updateReservationStatus,
  updateReservationPayment,
  updateReservationDates,
  updateReservationRoomAndDates,
  cancelReservationForGuest,
  getSlider,
  insertSliderItem,
  updateSliderItem,
  deleteSliderItem,
  getSliderCount,
  getSettings,
  setSettings,
  getTestimonials,
  insertTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getServices,
  getServiceById,
  getServiceCount,
  insertService,
  updateService,
  deleteService,
  getGallery,
  getGalleryForHome,
  getGalleryCount,
  getGalleryItemById,
  ensureGalleryHasImage,
  insertGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  syncGalleryFromAllSources,
  insertComplaint,
  getComplaints,
  insertReservationChangeRequest,
  getReservationChangeRequests,
  getReservationChangeRequestById,
  updateReservationChangeRequestStatus,
  cleanupOrphanedRoomData,
  deleteAllRooms
};
