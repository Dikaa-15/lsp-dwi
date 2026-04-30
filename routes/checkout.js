const express = require('express');
const router = express.Router();
const db = require('../library/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware to check if user is logged in
const isCustomer = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/auth/login');
};

// Multer for Transfer Proof
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/images/bukti_transfer';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            req.fileValidationError = 'Bukti transfer harus berupa gambar';
            return cb(null, false);
        }
        cb(null, true);
    }
});

// GET Checkout Page
router.get('/', isCustomer, (req, res) => {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    if (ids.length === 0) return res.redirect('/cart');

    const query = `
        SELECT k.*, p.nama_produk, p.harga, p.gambar, b.nama_brand 
        FROM keranjang k
        JOIN produk p ON k.kode_produk = p.kode_produk
        LEFT JOIN brand b ON p.brand_id = b.id
        WHERE k.id IN (?) AND k.user_id = ?
    `;
    db.query(query, [ids, req.session.user.id], (err, results) => {
        if (err || results.length === 0) return res.redirect('/cart');
        
        // Fetch user data for address
        db.query('SELECT alamat_lengkap, whatsapp FROM users WHERE id = ?', [req.session.user.id], (err, userRows) => {
            res.render('checkout', {
                title: 'Checkout — AutoPart Center',
                items: results,
                userData: userRows[0] || {},
                itemIds: ids.join(',')
            });
        });
    });
});

// POST Process Checkout
router.post('/process', isCustomer, upload.single('bukti_transfer'), (req, res) => {
    const { item_ids, total_bayar: subtotal_bayar, alamat_pengiriman, metode_pembayaran, metode_pengiriman } = req.body;
    const user_id = req.session.user.id;
    const paymentMethod = (metode_pembayaran || 'bca').toLowerCase();
    const shippingMethod = (metode_pengiriman || 'regular').toLowerCase();
    const requiresProof = paymentMethod !== 'cod';
    const bukti_transfer = req.file ? '/images/bukti_transfer/' + req.file.filename : null;
    const id_pembelian = 'INV-' + Date.now();

    // Define shipping costs
    const shippingCosts = {
        regular: 8000,
        express: 15000,
        sameday: 20000
    };

    // Get the shipping cost based on the selected method
    const shippingCost = shippingCosts[shippingMethod] || shippingCosts.regular; // Default to regular if invalid

    // Calculate final total
    const finalTotalBayar = parseInt(subtotal_bayar) + shippingCost;

    if (req.fileValidationError) {
        req.flash('error', req.fileValidationError);
        return res.redirect('back');
    }

    if (requiresProof && !bukti_transfer) {
        req.flash('error', 'Wajib mengunggah bukti transfer');
        return res.redirect('back');
    }

    // 1. Create Pembelian Header
    const pembelian = {
        id_pembelian,
        user_id,
        total_bayar: finalTotalBayar, // Use the calculated total
        status: 'menunggu_verifikasi',
        bukti_transfer,
        metode_pembayaran: paymentMethod,
        metode_pengiriman: shippingMethod,
        alamat_pengiriman
    };

    db.query('INSERT INTO pembelian SET ?', pembelian, (err) => {
        if (err) throw err;

        // 2. Move items from Cart to Pembelian Detail
        const ids = item_ids.split(',');
        db.query('SELECT k.kode_produk, k.jumlah, p.harga FROM keranjang k JOIN produk p ON k.kode_produk = p.kode_produk WHERE k.id IN (?)', [ids], (err, items) => {
            
            const details = items.map(item => [id_pembelian, item.kode_produk, item.jumlah, item.harga]);
            db.query('INSERT INTO pembelian_detail (id_pembelian, kode_produk, jumlah, harga_saat_beli) VALUES ?', [details], (err) => {
                
                // 3. Clear these items from Cart
                db.query('DELETE FROM keranjang WHERE id IN (?)', [ids], (err) => {
                    res.redirect('/checkout/success/' + id_pembelian);
                });
            });
        });
    });
});

// GET Success Page
router.get('/success/:id', isCustomer, (req, res) => {
    res.render('success', {
        title: 'Pesanan Berhasil — AutoPart Center',
        id_pembelian: req.params.id
    });
});

module.exports = router;
