const express = require('express');
const router = express.Router();
const db = require('../library/database');

// Middleware to check if user is logged in
const isCustomer = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.flash('error', 'Silakan login terlebih dahulu');
        res.redirect('/auth/login');
    }
};

const getCartCount = (userId, callback) => {
    db.query('SELECT COUNT(*) as count FROM keranjang WHERE user_id = ?', [userId], (err, results) => {
        if (err) return callback(err);
        callback(null, Number(results?.[0]?.count || 0));
    });
};

// GET Cart Page
router.get('/', isCustomer, (req, res) => {
    const query = `
        SELECT k.*, p.nama_produk, p.harga, p.gambar, p.stok, b.nama_brand 
        FROM keranjang k
        JOIN produk p ON k.kode_produk = p.kode_produk
        LEFT JOIN brand b ON p.brand_id = b.id
        WHERE k.user_id = ?
    `;
    db.query(query, [req.session.user.id], (err, results) => {
        res.render('cart', {
            title: 'Keranjang Belanja — AutoPart Center',
            cartItems: results || []
        });
    });
});

// POST Add to Cart
router.post('/add', isCustomer, (req, res) => {
    const { kode_produk, jumlah } = req.body;
    const user_id = req.session.user.id;

    // Check if product already in cart
    db.query('SELECT * FROM keranjang WHERE user_id = ? AND kode_produk = ?', [user_id, kode_produk], (err, results) => {
        if (results.length > 0) {
            // Update quantity
            const newQty = parseInt(results[0].jumlah) + parseInt(jumlah || 1);
            db.query('UPDATE keranjang SET jumlah = ? WHERE id = ?', [newQty, results[0].id], (err) => {
                if (err) return res.json({ success: false, message: err.message });

                getCartCount(user_id, (countErr, cartCount) => {
                    if (countErr) return res.json({ success: false, message: countErr.message });
                    res.json({
                        success: true,
                        message: 'Jumlah produk diperbarui di keranjang',
                        cartCount,
                        addedNewItem: false
                    });
                });
            });
        } else {
            // Insert new item
            db.query('INSERT INTO keranjang SET ?', { user_id, kode_produk, jumlah: jumlah || 1 }, (err) => {
                if (err) return res.json({ success: false, message: err.message });

                getCartCount(user_id, (countErr, cartCount) => {
                    if (countErr) return res.json({ success: false, message: countErr.message });
                    res.json({
                        success: true,
                        message: 'Produk ditambahkan ke keranjang',
                        cartCount,
                        addedNewItem: true
                    });
                });
            });
        }
    });
});

// POST Update Qty
router.post('/update-qty', isCustomer, (req, res) => {
    const { id, delta } = req.body;
    db.query('UPDATE keranjang SET jumlah = jumlah + (?) WHERE id = ? AND user_id = ?', [delta, id, req.session.user.id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// DELETE Remove from Cart
router.post('/remove', isCustomer, (req, res) => {
    const { id } = req.body;
    db.query('DELETE FROM keranjang WHERE id = ? AND user_id = ?', [id, req.session.user.id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

module.exports = router;
