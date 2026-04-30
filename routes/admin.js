const express = require('express');
const router = express.Router();
const db = require('../library/database');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware to check if user is admin
router.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        req.flash('error', 'Akses ditolak. Silakan masuk sebagai admin.');
        res.redirect('/auth/login');
    }
});

// GET Dashboard
router.get('/dashboard', (req, res) => {
    const qTotalProduk = 'SELECT COUNT(*) as count FROM produk';
    const qPesananBaru = 'SELECT COUNT(*) as count FROM pembelian WHERE status = "menunggu_verifikasi"';
    const qStokMenipis = 'SELECT COUNT(*) as count FROM produk WHERE stok < 5';
    const qTotalPenjualan = 'SELECT SUM(total_bayar) as total FROM pembelian WHERE status IN ("diproses", "dikirim", "selesai")';
    
    const qRecentOrders = `
        SELECT p.*, u.username 
        FROM pembelian p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.tanggal_transaksi DESC 
        LIMIT 5
    `;

    const qTopProducts = `
        SELECT p.nama_produk, SUM(pd.jumlah) as terjual, p.gambar
        FROM pembelian_detail pd 
        JOIN produk p ON pd.kode_produk = p.kode_produk 
        GROUP BY pd.kode_produk 
        ORDER BY terjual DESC 
        LIMIT 5
    `;

    const qLowStock = `
        SELECT nama_produk, stok, gambar 
        FROM produk 
        WHERE stok < 10 
        ORDER BY stok ASC 
        LIMIT 5
    `;

    const qSalesGrowth = `
        SELECT DATE(tanggal_transaksi) as tgl, SUM(total_bayar) as total 
        FROM pembelian 
        WHERE status IN ("diproses", "dikirim", "selesai") 
        AND tanggal_transaksi >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(tanggal_transaksi)
        ORDER BY tgl ASC
    `;

    db.query(qTotalProduk, (err, prod) => {
        db.query(qPesananBaru, (err, orders) => {
            db.query(qStokMenipis, (err, lowStockCount) => {
                db.query(qTotalPenjualan, (err, sales) => {
                    db.query(qRecentOrders, (err, recentOrders) => {
                        db.query(qTopProducts, (err, topProducts) => {
                            db.query(qLowStock, (err, lowStockProducts) => {
                                db.query(qSalesGrowth, (err, salesGrowth) => {
                                    res.render('admin/dashboard', { 
                                        title: 'Dashboard — AutoPart Admin',
                                        stats: {
                                            totalPenjualan: sales[0].total || 0,
                                            pesananBaru: orders[0].count,
                                            totalProduk: prod[0].count,
                                            stokMenipis: lowStockCount[0].count
                                        },
                                        recentOrders: recentOrders || [],
                                        topProducts: topProducts || [],
                                        lowStockProducts: lowStockProducts || [],
                                        salesGrowth: salesGrowth || []
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ==================== KATEGORI & BRAND ====================

router.get('/kategori-brand', (req, res) => {
    db.query('SELECT * FROM kategori', (err, kategori) => {
        db.query('SELECT * FROM brand', (err, brand) => {
            res.render('admin/kategori-brand', {
                title: 'Kategori & Brand — AutoPart Admin',
                kategoriList: kategori,
                brandList: brand
            });
        });
    });
});

// Kategori CRUD
router.post('/kategori/store', (req, res) => {
    const { nama } = req.body;
    db.query('INSERT INTO kategori SET ?', { id: uuidv4(), nama_kategori: nama }, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Kategori berhasil ditambahkan' });
    });
});

router.post('/kategori/update/:id', (req, res) => {
    const { nama } = req.body;
    db.query('UPDATE kategori SET nama_kategori = ? WHERE id = ?', [nama, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Kategori berhasil diperbarui' });
    });
});

router.delete('/kategori/delete/:id', (req, res) => {
    db.query('DELETE FROM kategori WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Gagal menghapus. Kategori mungkin masih digunakan oleh produk.' });
        res.json({ success: true, message: 'Kategori berhasil dihapus' });
    });
});

// Brand CRUD
router.post('/brand/store', (req, res) => {
    const { nama } = req.body;
    db.query('INSERT INTO brand SET ?', { id: uuidv4(), nama_brand: nama }, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Brand berhasil ditambahkan' });
    });
});

router.post('/brand/update/:id', (req, res) => {
    const { nama } = req.body;
    db.query('UPDATE brand SET nama_brand = ? WHERE id = ?', [nama, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Brand berhasil diperbarui' });
    });
});

router.delete('/brand/delete/:id', (req, res) => {
    db.query('DELETE FROM brand WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Gagal menghapus. Brand mungkin masih digunakan oleh produk.' });
        res.json({ success: true, message: 'Brand berhasil dihapus' });
    });
});

// ==================== PRODUK ====================

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/images/produk';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get('/produk', (req, res) => {
    const query = `
        SELECT p.*, k.nama_kategori, b.nama_brand 
        FROM produk p 
        LEFT JOIN kategori k ON p.kategori_id = k.id 
        LEFT JOIN brand b ON p.brand_id = b.id 
        ORDER BY p.kode_produk DESC
    `;
    db.query(query, (err, produk) => {
        db.query('SELECT * FROM kategori', (err, kategori) => {
            db.query('SELECT * FROM brand', (err, brand) => {
                res.render('admin/produk/index', {
                    title: 'Manajemen Produk — AutoPart Admin',
                    produkList: produk,
                    kategoriList: kategori,
                    brandList: brand
                });
            });
        });
    });
});

router.post('/produk/store', upload.single('gambar'), (req, res) => {
    const { kode_produk, nama_produk, tipe_kendaraan, kategori_id, brand_id, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? '/images/produk/' + req.file.filename : null;

    const newProd = { kode_produk, nama_produk, tipe_kendaraan, kategori_id, brand_id, harga, stok, deskripsi, gambar };

    db.query('INSERT INTO produk SET ?', newProd, (err) => {
        if (err) {
            req.flash('error', 'Gagal menambah produk: ' + err.message);
            return res.redirect('/admin/produk');
        }
        req.flash('success', 'Produk berhasil ditambahkan');
        res.redirect('/admin/produk');
    });
});

router.post('/produk/update/:kode', upload.single('gambar'), (req, res) => {
    const { nama_produk, tipe_kendaraan, kategori_id, brand_id, harga, stok, deskripsi } = req.body;
    let data = { nama_produk, tipe_kendaraan, kategori_id, brand_id, harga, stok, deskripsi };
    
    if (req.file) {
        data.gambar = '/images/produk/' + req.file.filename;
    }

    db.query('UPDATE produk SET ? WHERE kode_produk = ?', [data, req.params.kode], (err) => {
        if (err) {
            req.flash('error', 'Gagal update produk: ' + err.message);
            return res.redirect('/admin/produk');
        }
        req.flash('success', 'Produk berhasil diperbarui');
        res.redirect('/admin/produk');
    });
});

router.get('/produk/delete/:kode', (req, res) => {
    db.query('DELETE FROM produk WHERE kode_produk = ?', [req.params.kode], (err) => {
        if (err) {
            req.flash('error', 'Gagal menghapus produk: ' + err.message);
            return res.redirect('/admin/produk');
        }
        req.flash('success', 'Produk berhasil dihapus');
        res.redirect('/admin/produk');
    });
});

// ==================== PESANAN ====================

router.get('/pesanan', (req, res) => {
    const query = `
        SELECT p.*, u.username, u.whatsapp 
        FROM pembelian p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.tanggal_transaksi DESC
    `;
    db.query(query, (err, results) => {
        res.render('admin/pesanan', {
            title: 'Verifikasi Pesanan — AutoPart Admin',
            orders: results || []
        });
    });
});

// Update Status Pesanan
router.post('/pesanan/update-status', (req, res) => {
    const { id_pembelian, status, no_resi } = req.body;
    const resi = (no_resi || '').trim();

    if (status === 'selesai') {
        return res.json({ success: false, message: 'Penyelesaian pesanan dilakukan oleh customer' });
    }

    if (status === 'dikirim' && !resi) {
        return res.json({ success: false, message: 'Nomor resi wajib diisi saat pesanan dikirim' });
    }

    const updateOrder = () => {
        let query = 'UPDATE pembelian SET status = ?';
        let params = [status];

        if (resi) {
            query += ', resi = ?';
            params.push(resi);
        }

        query += ' WHERE id_pembelian = ?';
        params.push(id_pembelian);

        db.query(query, params, (err) => {
            if (err) return res.json({ success: false, message: err.message });

            // If status is verified ('diproses'), we should reduce stock
            if (status === 'diproses') {
                db.query('SELECT kode_produk, jumlah FROM pembelian_detail WHERE id_pembelian = ?', [id_pembelian], (err, items) => {
                    if (!err) {
                        items.forEach(item => {
                            db.query('UPDATE produk SET stok = stok - ? WHERE kode_produk = ?', [item.jumlah, item.kode_produk]);
                        });
                    }
                });
            }

            res.json({ success: true, message: 'Status pesanan berhasil diperbarui' });
        });
    };

    if (resi) {
        db.query('SHOW COLUMNS FROM pembelian LIKE "resi"', (schemaErr, rows) => {
            if (schemaErr) {
                return res.json({ success: false, message: schemaErr.message });
            }

            if (rows && rows.length > 0) {
                return updateOrder();
            }

            db.query('ALTER TABLE pembelian ADD COLUMN resi VARCHAR(100) NULL AFTER metode_pembayaran', (alterErr) => {
                if (alterErr) {
                    return res.json({ success: false, message: alterErr.message });
                }

                updateOrder();
            });
        });
        return;
    }

    updateOrder();
});

// GET Order Detail (JSON for Modal)
router.get('/pesanan/detail/:id', (req, res) => {
    const query = `
        SELECT pd.*, p.nama_produk, p.gambar 
        FROM pembelian_detail pd
        JOIN produk p ON pd.kode_produk = p.kode_produk
        WHERE pd.id_pembelian = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        res.json(results);
    });
});

module.exports = router;
