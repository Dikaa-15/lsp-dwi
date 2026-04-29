const express = require('express');
const router = express.Router();
const db = require('../library/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// GET Login Page
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('auth/login', { title: 'Masuk — AutoPart Center' });
});

// POST Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            req.flash('error', 'Terjadi kesalahan sistem');
            return res.redirect('/auth/login');
        }

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    email: user.email,
                    avatar: user.avatar || null
                };
                req.flash('success', 'Selamat datang kembali!');
                return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/');
            }
        }

        req.flash('error', 'Email atau password salah');
        res.redirect('/auth/login');
    });
});

// GET Register Page
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('auth/register', { title: 'Daftar Akun — AutoPart Center' });
});

// POST Register
router.post('/register', async (req, res) => {
    const { username, email, password, whatsapp, alamat_lengkap } = req.body;

    // Check if email exists
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            req.flash('error', 'Terjadi kesalahan sistem');
            return res.redirect('/auth/register');
        }

        if (results.length > 0) {
            req.flash('error', 'Email sudah terdaftar');
            return res.redirect('/auth/register');
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                id: uuidv4(),
                username,
                email,
                password: hashedPassword,
                whatsapp,
                alamat_lengkap,
                role: 'customer'
            };

            db.query('INSERT INTO users SET ?', newUser, (err) => {
                if (err) {
                    req.flash('error', 'Gagal mendaftarkan akun');
                    return res.redirect('/auth/register');
                }
                req.flash('success', 'Akun berhasil dibuat! Silakan masuk.');
                res.redirect('/auth/login');
            });
        } catch (e) {
            req.flash('error', 'Terjadi kesalahan saat enkripsi password');
            res.redirect('/auth/register');
        }
    });
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
