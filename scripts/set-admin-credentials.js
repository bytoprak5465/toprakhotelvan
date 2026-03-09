/**
 * Süper admin kullanıcı adı ve şifresini ayarlar.
 * Kullanım: node scripts/set-admin-credentials.js
 */
const bcrypt = require('bcryptjs');
const db = require('../db');

const admins = db.getAdmins();
const superAdmin = admins.find(a => a.role === 'super_admin') || admins[0];

if (!superAdmin) {
  console.error('Veritabanında hiç admin yok. Önce: npm run init');
  process.exit(1);
}

const newUsername = 'admin';
const newPassword = '1234';

db.updateAdminUsername(superAdmin.id, newUsername);
db.updateAdminPassword(superAdmin.id, bcrypt.hashSync(newPassword, 10));

console.log('Süper admin güncellendi.');
console.log('Kullanıcı adı:', newUsername);
console.log('Şifre:', newPassword);
