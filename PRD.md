# Product Requirements Document (PRD): Sistem Manajemen Sparepart Otomotif

**Proyek:** Sistem E-commerce & Manajemen Inventaris Sparepart (Mobil & Motor)  
**Versi:** 1.0  
**Lead Developer:** Dwi Andika Febriansyah  
**Status:** In-Development / Brainstorming  

---

## 1. Pendahuluan
Aplikasi ini dirancang sebagai platform e-commerce khusus suku cadang otomotif. Fokus utama proyek ini adalah menyediakan sistem yang efisien untuk **Customer** dalam mencari dan membeli barang, serta memberikan kontrol penuh bagi **Admin** dalam mengelola stok dan memverifikasi transaksi.

## 2. Tujuan & Objektif
- Membangun katalog digital sparepart yang terorganisir berdasarkan `Brand` dan `Kategori`.
- Menyederhanakan proses transaksi melalui fitur **Keranjang Belanja (Cart)**.
- Menjamin akurasi data stok melalui sistem **Verifikasi Pesanan** oleh Admin.
- Memberikan pengalaman pengguna yang **Clean, Modern, dan Simple** (Tanpa Glassmorphism).

---

## 3. Profil Pengguna (Roles)

| Role | Deskripsi Singkat | Kebutuhan Utama |
| :--- | :--- | :--- |
| **Admin** | Pengelola operasional toko. | Manajemen CRUD produk, pantau stok, verifikasi pembayaran. |
| **Customer** | Pembeli/Pemilik kendaraan. | Pencarian produk, transaksi multi-item, kelola profil & alamat. |

---

## 4. Spesifikasi Fitur

### 4.1 Modul Customer (Front-End)
- **Landing Page:** Menampilkan hero banner promo dan grid produk terbaru.
- **Pencarian & Filter:** Filter berdasarkan Tipe Kendaraan (Mobil/Motor), Kategori, dan Brand.
- **Detail Produk:** Informasi spesifikasi, harga, stok, dan deskripsi lengkap.
- **Keranjang Belanja:** Menampung sementara barang yang akan dibeli sebelum checkout.
- **Manajemen Pesanan:** Halaman riwayat pembelian dan status tracking (Pending, Diproses, Dikirim, Selesai).
- **Profil Pengguna:** Pengaturan alamat pengiriman, nomor WhatsApp, dan foto profil.

### 4.2 Modul Admin (Back-End/Dashboard)
- **Dashboard Overview:** Statistik penjualan dan alert stok rendah.
- **Manajemen Data (CRUD):** Input/Edit/Hapus data Produk, Kategori, dan Brand.
- **Verifikasi Pesanan:** Validasi bukti transfer yang diunggah customer.
- **Update Status:** Mengubah status pesanan dan menginput nomor resi.

---

## 5. Struktur Database (ERD Logic)

Sistem ini menggunakan basis data relasional dengan tabel utama sebagai berikut:

1.  **`users`**: Data user (Admin/Customer), profil, dan kontak.
2.  **`produk`**: Katalog barang (terhubung ke tabel `kategori` & `brand`).
3.  **`keranjang`**: Data sementara belanjaan customer.
4.  **`pembelian` (Header)**: Data utama transaksi, total bayar, dan status.
5.  **`pembelian_detail`**: Rincian item di setiap transaksi (mendukung multi-produk).

---

## 6. Aturan Bisnis (Business Rules)
- **Keamanan:** Autentikasi berbasis Role (Admin tidak bisa akses belanja, Customer tidak bisa masuk Dashboard).
- **Logika Stok:** Stok produk **berkurang otomatis** hanya setelah Admin melakukan "Konfirmasi/Verifikasi" pembayaran pada pesanan.
- **Verifikasi:** Customer wajib mengunggah bukti transfer sebelum pesanan diproses oleh Admin.
- **Harga Statis:** Harga barang di `pembelian_detail` harus dikunci saat transaksi terjadi untuk keperluan audit.

---

## 7. Pedoman Desain (UI/UX)
- **Warna Utama:** Red-400 (#F87171) s/dt Red-500 (#EF4444) sebagai aksen aksi.
- **Warna Dasar:** Slate-800/900 untuk teks, Background Clean White/Slate-50.
- **Tipografi:** Inter / Roboto (San Serif).
- **Gaya:** Sederhana, Solid, Kotak dengan *rounded corners* (8px), Tanpa Glassmorphism.

---

## 8. Alur Pengguna (User Flow)
1. Customer memilih produk -> Masuk Keranjang.
2. Customer Checkout -> Isi Alamat -> Upload Bukti Bayar.
3. Status Pesanan: `menunggu_verifikasi`.
4. Admin cek bukti bayar -> Klik **Verifikasi**.
5. Sistem mengurangi stok -> Admin memproses pengiriman.
6. Customer menerima barang -> Status: `selesai`.

---