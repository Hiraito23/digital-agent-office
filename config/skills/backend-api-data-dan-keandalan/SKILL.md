---
name: backend-api-data-dan-keandalan
description: "Playbook Backend: desain API dan kontrak, model data dan migrasi, validasi dan keamanan dasar, penanganan error, keandalan dan performa, pengujian, observabilitas, dan serah-terima."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [backend, api, database, keamanan, keandalan]
---

# Playbook Backend

## When to Use

- Membangun atau mengubah API, logika bisnis, penyimpanan data, job latar belakang, atau integrasi; memperbaiki bug server; meninjau performa dan keandalan layanan.

## Procedure

**1. Kenali sistem yang ada**
Baca README, konfigurasi, struktur folder, skema data, dan satu endpoint serupa dari ujung ke ujung (route -> validasi -> logika -> data -> respons). Catat bahasa/framework, cara konfigurasi (env), cara menjalankan dan menguji, dan konvensi error. Ikuti polanya; jangan menambah dependensi tanpa alasan dan tanpa menyebutkannya.

**2. Kontrak dulu (docs/api/<fitur>.md)**
Tulis sebelum kode, agar Frontend Dev dan QA bisa bekerja paralel:

```
Endpoint: METODE /path | Tujuan | Autentikasi dan izin
Parameter (path/query) dan body: nama, tipe, wajib?, batas, contoh
Respons sukses: status + contoh JSON | Respons error: kode, bentuk, kapan terjadi
Idempotensi, paginasi, filter, urutan | Batas laju
```

Aturan: nama sumber jamak dan konsisten; metode sesuai arti (GET aman, PUT/DELETE idempoten, POST membuat); status HTTP tepat (200/201/204, 400 validasi, 401 belum masuk, 403 tak berizin, 404, 409 konflik, 422, 429, 5xx); bentuk error seragam `{ "error": { "code", "message", "details" } }`; jangan membocorkan detail internal. Perubahan yang merusak klien lama = versi baru atau kompatibel mundur.

**3. Model data**
- Normalisasi secukupnya; tentukan kunci utama, kunci asing, `NOT NULL`, `UNIQUE`, dan indeks sesuai pola kueri nyata (kolom filter, urut, join).
- Jejak waktu (`created_at`, `updated_at`); hapus lunak hanya bila ada alasan bisnis.
- Uang disimpan sebagai bilangan bulat satuan terkecil atau desimal presisi, bukan float. Waktu disimpan UTC.
- **Migrasi**: skrip berversi, dapat diulang, kompatibel mundur (tambah kolom nullable -> isi data -> wajibkan; jangan langsung hapus atau ganti nama). Beri rencana rollback dan cadangkan sebelum migrasi destruktif; jangan menjalankan migrasi pada data produksi tanpa persetujuan pengguna.

**4. Validasi, otorisasi, dan keamanan dasar**
- Validasi semua input di server (tipe, panjang, rentang, format, enum); tolak yang tidak dikenal. Jangan percaya klien, header, atau ID dari URL.
- Otorisasi di setiap endpoint dan di level objek: apakah pengguna ini berhak atas data ini (cegah IDOR)?
- Kueri berparameter atau ORM, tidak pernah menggabung string SQL. Hindari eksekusi perintah dari input pengguna dan path traversal pada file.
- Rahasia hanya dari environment atau secret manager, tidak di kode, log, atau repo. Hash kata sandi dengan algoritma lambat (argon2/bcrypt/scrypt). Token berumur pendek; cookie `HttpOnly`, `Secure`, `SameSite`.
- Batasi ukuran body, laju permintaan, dan waktu eksekusi. CORS hanya untuk asal yang dibutuhkan. Log tanpa data sensitif.
- Libatkan Akane (Security) untuk autentikasi, pembayaran, unggah file, dan data pribadi.

**5. Logika dan penanganan error**
- Letakkan aturan bisnis di lapisan layanan, bukan di route; fungsi kecil dan bisa diuji.
- Tangani error yang diharapkan secara eksplisit; error tak terduga dicatat dengan ID korelasi dan dijawab 500 generik.
- Operasi banyak langkah memakai transaksi atau pola kompensasi; jangan meninggalkan data setengah jadi.
- Panggilan keluar (HTTP, DB, antrean): beri timeout, coba ulang dengan backoff dan jitter hanya untuk operasi idempoten.
- Operasi yang bisa terkirim dua kali (webhook, klik ganda) dibuat idempoten (kunci idempotensi atau batasan unik).

**6. Performa dan skala**
Ukur sebelum mengoptimasi. Hindari N+1 (muat relasi sekaligus), paginasi untuk daftar (kursor lebih baik daripada offset besar), pilih kolom seperlunya, cache dengan aturan kedaluwarsa jelas, dan pindahkan pekerjaan berat ke job latar belakang. Periksa rencana kueri (`EXPLAIN`) untuk kueri lambat.

**7. Pengujian dan verifikasi nyata**
- Tes unit untuk logika, tes integrasi untuk endpoint dengan database uji, termasuk jalur negatif: input tidak valid, tidak berizin, tidak ditemukan, konflik, dependensi gagal.
- Jalankan sungguhan: panggil endpoint dengan `curl` atau klien, lihat status, isi, dan log; jalankan seluruh tes proyek sebelum menyatakan selesai. Gunakan data uji, jangan data produksi.
- Bila tidak bisa menjalankan, tulis "belum diuji" dan alasannya.

**8. Observabilitas dan operasional**
Log terstruktur (level, ID permintaan, durasi, hasil), metrik dasar (laju, error, latensi), endpoint kesehatan, konfigurasi lewat env dengan nilai bawaan aman, dan penghentian yang rapi. Jelaskan cara men-deploy, memutar balik, dan memeriksa bahwa layanan sehat.

**9. Review diri**
Baca ulang diff: kerentanan, rahasia tak sengaja, kueri tanpa indeks, error yang tertelan, perubahan di luar lingkup, kode mati. Pastikan migrasi aman dan dapat diputar balik.

**10. Serah-terima**
Tulis: perubahan dan file terkait, kontrak API, migrasi dan cara menjalankannya, cara menguji (perintah dan hasil nyata), variabel lingkungan baru, risiko dan asumsi, serta langkah berikutnya. Beri tahu Frontend Dev tentang kontrak atau perubahan respons, dan minta Takumi (QA) dan Akane (Security) meninjau alur penting.

## Pitfalls

- Menulis kode sebelum kontrak; mempercayai input klien; otorisasi hanya di UI; SQL gabung string; rahasia di repo atau log; migrasi destruktif tanpa cadangan; float untuk uang; N+1; tanpa timeout; error tertelan; menyatakan selesai tanpa menjalankan tes dan endpoint-nya.

## Verification

- Kontrak tertulis dan sesuai implementasi; validasi dan otorisasi ada; jalur negatif teruji; tes lulus; endpoint dijalankan dengan hasil nyata; migrasi aman dan dapat diputar balik; tidak ada rahasia di diff; serah-terima lengkap.
