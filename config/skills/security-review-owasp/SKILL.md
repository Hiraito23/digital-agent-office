---
name: security-review-owasp
description: "Playbook keamanan: ruang lingkup, threat model, OWASP Top 10 dan ASVS, keamanan akun dan operasional, severity, laporan, dan respons insiden."
version: 3.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [security, owasp, asvs, threat-model, insiden]
---

# Playbook Keamanan

Hanya menilai sistem milik pengguna dan dalam ruang lingkup yang disetujui, di environment development/staging. Tidak ada serangan yang merusak data atau mengganggu layanan, dan tidak membantu menyerang pihak lain.

## When to Use

- Menilai keamanan website/aplikasi/API, akun dan kebiasaan kerja, konfigurasi, atau menyusun rencana respons insiden.

## Procedure

**1. Ruang lingkup tertulis** (tanpa ini jangan mulai): sistem dan alamatnya, environment, versi/commit, akun uji dan perannya, yang boleh diuji, yang dilarang (produksi, DoS, rekayasa sosial ke orang nyata), dan kontak bila ada masalah.

**2. Threat model singkat (STRIDE)**
Aset (data pribadi, kredensial, uang, reputasi) -> titik masuk (login, form, upload, API, webhook, email, perangkat) -> batas kepercayaan -> ancaman: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Urutkan berdasarkan dampak x kemungkinan; uji yang terbesar dulu.

**3. Daftar periksa aplikasi web (OWASP Top 10)**

| Kategori | Yang diperiksa |
| --- | --- |
| Akses tidak sah | IDOR (ganti ID di URL/body), akses antar-peran, endpoint admin tanpa pengecekan, path traversal |
| Kriptografi | HTTPS di mana-mana, HSTS, hash password (bcrypt/argon2), tidak ada secret di kode, token acak kuat |
| Injeksi | SQL/NoSQL/command/template injection, XSS (reflected, stored, DOM), kueri berparameter, escape keluaran |
| Desain tidak aman | rate limit, batas bisnis (diskon negatif, kuantitas minus), alur reset password |
| Salah konfigurasi | header (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy), mode debug, direktori terbuka, CORS terlalu longgar, akun/port bawaan |
| Komponen rentan | dependensi usang (npm audit, pemindai SCA), image Docker lama |
| Autentikasi | brute force, kebijakan password, MFA, masa berlaku/rotasi/pencabutan sesi, cookie HttpOnly/Secure/SameSite, enumerasi pengguna lewat pesan error |
| Integritas | pembaruan tanpa verifikasi, deserialisasi, pipeline CI/CD |
| Logging | kejadian penting tercatat, tidak mencatat password/token, ada peringatan |
| SSRF | URL yang dikirim pengguna di-fetch server, akses ke metadata cloud/jaringan internal |

**4. Autentikasi dan sesi:** coba token kedaluwarsa, token orang lain, logout lalu pakai ulang token, ubah peran di klaim, CSRF pada aksi yang mengubah data.

**5. Upload file:** batasi tipe (cek isi, bukan hanya ekstensi), ukuran, simpan di luar web root, nama acak, jangan eksekusi, pindai malware bila mungkin.

**6. API:** otorisasi tiap endpoint dan tiap objek, batasi field yang bisa diubah (mass assignment), paginasi dan batas laju, jangan membocorkan data berlebih di respons.

**7. Keamanan akun dan operasional (non-kode)**
- Password manager, password unik, MFA (aplikasi autentikator/kunci keamanan, bukan SMS bila bisa), pemulihan akun yang aman.
- Phishing: periksa domain pengirim dan tautan, jangan buka lampiran tak terduga, verifikasi permintaan transfer lewat jalur lain.
- Prinsip hak minimum, tinjau akses berkala, cabut akses saat orang berhenti, hindari akun bersama.
- Perangkat: enkripsi disk, pembaruan otomatis, kunci layar, kemampuan hapus jarak jauh.
- Backup 3-2-1 dan uji pemulihan; simpan satu salinan terpisah dari jaringan utama.
- Pisahkan data dan akun pribadi dengan bisnis.

**8. Membuktikan temuan dengan aman:** gunakan data uji, satu permintaan seperlunya, jangan mengunduh massal data nyata, jangan mengubah/menghapus data. Catat permintaan dan respons yang membuktikan.

**9. Severity (CVSS disederhanakan)**

| Level | Kriteria | Contoh | Target perbaikan |
| --- | --- | --- | --- |
| Critical | eksploitasi mudah, dampak data/uang/akses penuh | SQLi di login, bucket publik berisi data pelanggan | segera (jam) |
| High | dampak besar tapi butuh syarat | IDOR membaca data pengguna lain | hari |
| Medium | dampak terbatas atau butuh banyak syarat | XSS yang butuh interaksi, header hilang pada halaman sensitif | minggu |
| Low | dampak kecil/hardening | informasi versi terbuka | jadwal biasa |
| Info | catatan | praktik terbaik | opsional |

**10. Template temuan**

```
ID: SEC-001   Judul: <jenis> pada <lokasi>
Severity: High (alasan satu kalimat)   Status: Terbuka | Diperbaiki | Diterima risikonya
Lokasi: file:baris atau endpoint
Deskripsi dan dampak (bahasa awam + teknis)
Langkah reproduksi yang aman: 1. ... 2. ...
Bukti: permintaan/respons, tangkapan layar (tanpa data sensitif)
Rekomendasi: perbaikan akar + contoh konfigurasi/kode + mitigasi sementara
Referensi: OWASP/CWE/ASVS
```

**11. Laporan akhir** (docs/security/<objek>-<tanggal>.md): ringkasan eksekutif (3 kalimat dan risiko tertinggi), ruang lingkup dan metode, tabel temuan per severity, hal yang berjalan baik, urutan perbaikan (hentikan pendarahan dulu, lalu akar masalah), dan hal yang belum diuji.

**12. Respons insiden (ringkas)**
1. Deteksi dan catat waktu. 2. Isolasi (cabut akses, putus perangkat/layanan yang terdampak). 3. Amankan bukti (log, salinan). 4. Ganti semua kredensial yang mungkin bocor dan cabut sesi. 5. Tentukan cakupan data terdampak. 6. Beri tahu pihak terkait dan penyedia, patuhi kewajiban pelaporan (mis. UU PDP). 7. Pulihkan dari backup bersih. 8. Tinjau penyebab dan perbaiki prosesnya.

## Pitfalls

- Melaporkan keluaran pemindai mentah sebagai temuan tanpa verifikasi.
- Menakut-nakuti tanpa bukti; melebihkan severity.
- Menyalin data sensitif ke laporan; menyimpan token/password di catatan.
- Menguji di luar ruang lingkup atau di produksi.
- Rekomendasi samar ("perkuat keamanan") tanpa langkah konkret.

## Verification

- Ruang lingkup tertulis; setiap temuan punya bukti, severity beralasan, dan rekomendasi konkret.
- Fakta terbukti dipisahkan dari dugaan; data sensitif tidak tersalin.
- Perbaikan diuji ulang sebelum temuan ditutup.

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila belum ada sistem atau ruang lingkup tertulis)

**Tanpa ruang lingkup tertulis, jangan menguji sistem nyata apa pun.** Itu aturan keselamatan, bukan alasan menunggu. Kerjakan semua yang bisa dikerjakan secara aman:
- **Sistem contoh (dummy)**: deskripsikan arsitektur ilustrasi (web + API + basis data + penyimpanan berkas) berlabel `SISTEM DUMMY` sebagai bahan threat model STRIDE lengkap dengan aliran data dan batas kepercayaan.
- **Laporan contoh dengan temuan fiktif** berlabel `CONTOH, bukan temuan nyata` untuk memperlihatkan format (ringkasan eksekutif, tabel temuan, bukti, perbaikan). Jangan menulis temuan pada sistem nyata yang belum diuji.
- **Data uji aman:** akun uji fiktif per peran; daftar masukan uji non-destruktif untuk sistem milik sendiri atau yang diizinkan (mis. `<script>alert(1)</script>` untuk XSS refleksi, `' OR '1'='1` untuk pengujian injeksi pada lingkungan uji, `../../etc/passwd` untuk path traversal pada sandbox, ID objek orang lain untuk IDOR). Hanya dijalankan pada target yang masuk ruang lingkup.
- **Daftar periksa siap pakai** dan **rencana uji** (apa, urutan, alat, bukti yang dikumpulkan) yang tinggal dijalankan setelah ruang lingkup disetujui.
- Jangan pernah memindai, menyerang, atau mencoba masuk ke sistem pihak lain, dan jangan membuat eksploit yang bisa dipakai di luar pengujian terotorisasi.

## Pendalaman

**Matriks STRIDE per komponen:** tiap komponen dan aliran data dinilai untuk Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege; tulis ancaman, kontrol yang ada, celah, dan pencegahan.

**Pohon serangan satu tujuan:** mis. "mengambil data pelanggan" -> lewat API tanpa otorisasi objek (IDOR) / lewat akun admin yang dibobol (kata sandi lemah, tanpa MFA) / lewat cadangan terbuka. Beri biaya dan kemungkinan tiap cabang; perbaiki cabang termurah bagi penyerang dulu.

**Menguji IDOR dan otorisasi (metode):** buat dua akun peran sama dan satu admin; kumpulkan semua endpoint dan ID objek; ulangi permintaan akun A memakai ID milik akun B; ulangi tanpa token; ulangi dengan peran lebih rendah. Hasil yang seharusnya: 403/404 konsisten dan tanpa kebocoran informasi di pesan galat.

**Pemindaian rahasia pada kode (sistem milik sendiri):**

```
grep -rInE "(api[_-]?key|secret|token|passw(or)?d)\s*[:=]\s*['\"][^'\"]{8,}" --exclude-dir=node_modules --exclude-dir=.git .
git log -p | grep -nE "BEGIN (RSA|OPENSSH|EC) PRIVATE KEY"
```
Temuan rahasia: anggap bocor, cabut dan buat baru, bersihkan riwayat bila perlu.

**Audit dependensi:** `npm audit --omit=dev`, `pip-audit`, `go list -m -u all`; nilai keterjangkauan (apakah kode yang rentan benar-benar dipakai) sebelum menentukan severity; sematkan versi dan aktifkan pembaruan otomatis.

**Header dan transport (daftar periksa):** HTTPS dan HSTS, CSP yang membatasi sumber skrip, X-Content-Type-Options, X-Frame-Options/frame-ancestors, cookie Secure + HttpOnly + SameSite, CORS tidak memakai `*` dengan kredensial, pesan galat tanpa jejak tumpukan.

**Jebakan JWT/sesi:** algoritma "none", kunci lemah, tanpa kedaluwarsa, klaim peran bisa diubah klien, token tidak dicabut saat ganti kata sandi, penyimpanan di localStorage yang terjangkau XSS.

**Register risiko:** kemungkinan (1-5) x dampak (1-5) = skor; 15+ segera, 8-14 terjadwal, <8 dipantau. Tiap risiko punya pemilik, kontrol, dan tanggal tinjau.

**Deteksi dan pemantauan:** tentukan 5 kejadian yang harus memicu alarm (banyak gagal login, login dari negara baru, ekspor data besar, perubahan peran, akses berkas rahasia) dan siapa yang menerimanya.

**Runbook insiden satu halaman:** identifikasi, batasi (cabut akses, isolasi), bersihkan, pulihkan, pelajari (post-mortem tanpa menyalahkan), beri tahu pihak terdampak sesuai aturan (UU PDP: pemberitahuan bila kebocoran data pribadi). Simpan kontak darurat dan urutan hubungi.

**Mutu hasil:** setiap temuan punya bukti yang bisa diulang, dampak yang dijelaskan dalam bahasa bisnis, severity beralasan, dan perbaikan konkret; tidak ada data nyata yang disalin ke laporan; semua dummy dan contoh berlabel.
