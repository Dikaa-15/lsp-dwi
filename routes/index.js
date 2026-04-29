const express = require('express');
const router = express.Router();
const db = require('../library/database');

/* GET home page. */
router.get('/', function(req, res, next) {
  const searchQuery = (req.query.q || '').trim();
  const hasSearch = searchQuery.length > 0;
  const likeQuery = `%${searchQuery}%`;
  // Fetch products with their category and brand names
  const query = hasSearch ? `
    SELECT p.*, k.nama_kategori, b.nama_brand 
    FROM produk p
    LEFT JOIN kategori k ON p.kategori_id = k.id
    LEFT JOIN brand b ON p.brand_id = b.id
    WHERE p.nama_produk LIKE ? OR k.nama_kategori LIKE ? OR b.nama_brand LIKE ?
    ORDER BY p.kode_produk DESC
    LIMIT 12
  ` : `
    SELECT p.*, k.nama_kategori, b.nama_brand 
    FROM produk p
    LEFT JOIN kategori k ON p.kategori_id = k.id
    LEFT JOIN brand b ON p.brand_id = b.id
    ORDER BY p.kode_produk DESC
    LIMIT 8
  `;

  const params = hasSearch ? [likeQuery, likeQuery, likeQuery] : [];

  db.query(query, params, (err, products) => {
    if (err) {
      console.error(err);
      return res.render('index', { title: 'AutoPart Center', products: [], categories: [], searchQuery: '' });
    }

    // Fetch categories for the grid
    db.query('SELECT * FROM kategori LIMIT 4', (err, categories) => {
      res.render('index', { 
        title: 'AutoPart Center — Suku Cadang Otomotif Terpercaya',
        products: products || [],
        categories: categories || [],
        searchQuery
      });
    });
  });
});

// GET Product Detail
router.get('/produk/:kode', (req, res, next) => {
    const query = `
        SELECT p.*, k.nama_kategori, b.nama_brand 
        FROM produk p
        LEFT JOIN kategori k ON p.kategori_id = k.id
        LEFT JOIN brand b ON p.brand_id = b.id
        WHERE p.kode_produk = ?
    `;
    db.query(query, [req.params.kode], (err, results) => {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).render('error', { message: 'Produk tidak ditemukan', error: {} });

        const product = results[0];
        // Fetch related products
        db.query('SELECT * FROM produk WHERE kategori_id = ? AND kode_produk != ? LIMIT 4', [product.kategori_id, product.kode_produk], (err, related) => {
            res.render('product-detail', {
                title: product.nama_produk + ' — AutoPart Center',
                product,
                related: related || []
            });
        });
    });
});

module.exports = router;
