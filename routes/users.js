var express = require('express');
var router = express.Router();

const db = require('../library/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isCustomer = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Silakan login terlebih dahulu');
    return res.redirect('/auth/login');
};

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/images/avatars';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            req.fileValidationError = 'Avatar harus berupa gambar';
            return cb(null, false);
        }
        cb(null, true);
    }
});

const ORDER_TABS = new Set(['semua', 'menunggu_verifikasi', 'diproses', 'dikirim', 'selesai', 'dibatalkan']);

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// GET My Orders
router.get('/pesanan', isCustomer, (req, res) => {
    const requestedTab = (req.query.tab || 'semua').toLowerCase();
    const activeTab = ORDER_TABS.has(requestedTab) ? requestedTab : 'semua';

    const query = `
        SELECT
            p.*,
            (SELECT COUNT(*) FROM pembelian_detail WHERE id_pembelian = p.id_pembelian) as item_count,
            (
                SELECT pr.gambar
                FROM pembelian_detail pd
                JOIN produk pr ON pd.kode_produk = pr.kode_produk
                WHERE pd.id_pembelian = p.id_pembelian
                ORDER BY pd.id ASC
                LIMIT 1
            ) AS first_product_image
        FROM pembelian p
        WHERE p.user_id = ?
        ORDER BY p.tanggal_transaksi DESC
    `;
    db.query(query, [req.session.user.id], (err, results) => {
        const allOrders = results || [];
        const tabCounts = allOrders.reduce((acc, order) => {
            acc.semua += 1;
            if (order.status && Object.prototype.hasOwnProperty.call(acc, order.status)) {
                acc[order.status] += 1;
            }
            return acc;
        }, {
            semua: 0,
            menunggu_verifikasi: 0,
            diproses: 0,
            dikirim: 0,
            selesai: 0,
            dibatalkan: 0,
        });

        const orders = activeTab === 'semua'
            ? allOrders
            : allOrders.filter(order => order.status === activeTab);

        res.render('users/pesanan', {
            title: 'Pesanan Saya — AutoPart Center',
            orders,
            activeTab,
            tabCounts,
        });
    });
});

router.post('/pesanan/:id/selesai', isCustomer, (req, res) => {
    const orderId = req.params.id;

    db.query(
        'UPDATE pembelian SET status = "selesai" WHERE id_pembelian = ? AND user_id = ? AND status = "dikirim"',
        [orderId, req.session.user.id],
        (err, result) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            if (!result || result.affectedRows === 0) {
                return res.json({ success: false, message: 'Pesanan tidak dapat ditandai selesai' });
            }

            return res.json({ success: true, message: 'Pesanan berhasil ditandai selesai' });
        }
    );
});

router.get('/profile', isCustomer, (req, res) => {
    db.query('SELECT id, username, email, whatsapp, alamat_lengkap, avatar FROM users WHERE id = ?', [req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            req.flash('error', 'Profil tidak ditemukan');
            return res.redirect('/');
        }

        res.render('users/profile', {
            title: 'Profil Saya — AutoPart Center',
            profile: results[0]
        });
    });
});

router.post('/profile', isCustomer, avatarUpload.single('avatar'), async (req, res) => {
    if (req.fileValidationError) {
        req.flash('error', req.fileValidationError);
        return res.redirect('/users/profile');
    }

    const { username, whatsapp, alamat_lengkap, current_password, new_password, confirm_password } = req.body;

    db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id], async (err, results) => {
        if (err || results.length === 0) {
            req.flash('error', 'Profil tidak ditemukan');
            return res.redirect('/users/profile');
        }

        const currentUser = results[0];
        let nextAvatar = currentUser.avatar || null;

        if (req.file) {
            nextAvatar = '/images/avatars/' + req.file.filename;
        }

        const wantsPasswordChange = current_password || new_password || confirm_password;
        if (wantsPasswordChange) {
            if (!current_password || !new_password || !confirm_password) {
                req.flash('error', 'Lengkapi semua field password jika ingin mengganti password');
                return res.redirect('/users/profile');
            }

            if (new_password !== confirm_password) {
                req.flash('error', 'Password baru dan konfirmasi tidak sama');
                return res.redirect('/users/profile');
            }

            const validCurrentPassword = await bcrypt.compare(current_password, currentUser.password);
            if (!validCurrentPassword) {
                req.flash('error', 'Password saat ini salah');
                return res.redirect('/users/profile');
            }
        }

        const updates = {
            username: (username || currentUser.username).trim(),
            whatsapp: whatsapp || null,
            alamat_lengkap: alamat_lengkap || null,
            avatar: nextAvatar
        };

        if (wantsPasswordChange) {
            updates.password = await bcrypt.hash(new_password, 10);
        }

        db.query('UPDATE users SET ? WHERE id = ?', [updates, currentUser.id], (updateErr) => {
            if (updateErr) {
                req.flash('error', 'Gagal memperbarui profil: ' + updateErr.message);
                return res.redirect('/users/profile');
            }

            req.session.user.username = updates.username;
            req.session.user.avatar = updates.avatar;
            req.flash('success', 'Profil berhasil diperbarui');
            return res.redirect('/users/profile');
        });
    });
});

module.exports = router;
