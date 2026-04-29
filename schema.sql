-- Database Schema: Sparepart Management System (Automotive)

-- 1. Tabel Users: Menyimpan data autentikasi dan profil lengkap
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') DEFAULT 'customer',
    whatsapp VARCHAR(20),
    avatar VARCHAR(255),
    alamat_lengkap TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel Kategori: Filter berdasarkan jenis sparepart (misal: Mesin, Body, Kelistrikan)
CREATE TABLE IF NOT EXISTS kategori (
    id CHAR(36) PRIMARY KEY,
    nama_kategori VARCHAR(255) NOT NULL
);

-- 3. Tabel Brand: Filter berdasarkan merk (misal: Toyota, Honda, Yamaha, Denso)
CREATE TABLE IF NOT EXISTS brand (
    id CHAR(36) PRIMARY KEY,
    nama_brand VARCHAR(255) NOT NULL
);

-- 4. Tabel Produk: Katalog sparepart untuk mobil dan motor
CREATE TABLE IF NOT EXISTS produk (
    kode_produk VARCHAR(50) PRIMARY KEY,
    nama_produk VARCHAR(255) NOT NULL,
    tipe_kendaraan VARCHAR(100), -- Contoh: Mobil, Motor
    kategori_id CHAR(36),
    brand_id CHAR(36),
    harga BIGINT NOT NULL,
    stok INT NOT NULL DEFAULT 0,
    gambar VARCHAR(255),
    deskripsi TEXT,
    FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE SET NULL
);

-- 5. Tabel Keranjang: Menyimpan produk yang dipilih customer sebelum checkout
CREATE TABLE IF NOT EXISTS keranjang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36),
    kode_produk VARCHAR(50),
    jumlah INT NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (kode_produk) REFERENCES produk(kode_produk) ON DELETE CASCADE
);

-- 6. Tabel Pembelian (Header): Informasi utama pesanan dan status pembayaran
CREATE TABLE IF NOT EXISTS pembelian (
    id_pembelian VARCHAR(50) PRIMARY KEY,
    user_id CHAR(36),
    total_bayar BIGINT NOT NULL,
    status ENUM('pending', 'menunggu_verifikasi', 'diproses', 'dikirim', 'selesai', 'dibatalkan') DEFAULT 'pending',
    bukti_transfer VARCHAR(255), -- Link file bukti bayar untuk Admin
    metode_pembayaran VARCHAR(20) DEFAULT 'bca',
    resi VARCHAR(100),
    alamat_pengiriman TEXT,
    tanggal_transaksi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Tabel Pembelian Detail: Isi item dalam satu transaksi pembelian
CREATE TABLE IF NOT EXISTS pembelian_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pembelian VARCHAR(50),
    kode_produk VARCHAR(50),
    jumlah INT NOT NULL,
    harga_saat_beli BIGINT NOT NULL, -- Mencatat harga saat transaksi (history)
    FOREIGN KEY (id_pembelian) REFERENCES pembelian(id_pembelian) ON DELETE CASCADE,
    FOREIGN KEY (kode_produk) REFERENCES produk(kode_produk) ON DELETE CASCADE
);
