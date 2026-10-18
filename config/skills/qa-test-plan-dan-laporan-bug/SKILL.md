---
name: qa-test-plan-dan-laporan-bug
description: "Playbook QA: strategi uji berbasis risiko, test plan, desain test case, laporan bug, severity, regresi, dan verdict."
version: 2.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [qa, testing, regresi, bug]
---

# Playbook QA

## When to Use

- Menguji website, aplikasi, alur proses, materi penjualan/konten, atau dokumen; menyusun test plan; melaporkan bug; regresi sebelum rilis; memberi verdict kelayakan.

## Procedure

**1. Kenali objek dan kriteria**
Apa yang diuji, untuk siapa, dan apa arti "berhasil" (requirement, acceptance criteria, desain, atau harapan pengguna)? Bila kriteria tidak bisa diuji ("harus bagus"), minta atau buat asumsi yang terukur dan tandai.

**2. Strategi berbasis risiko**

| Risiko | Contoh | Kedalaman uji |
| --- | --- | --- |
| Tinggi (uang, data pribadi, tidak bisa dibatalkan) | pembayaran, login, hapus data | uji mendalam + negatif + regresi |
| Sedang (sering dipakai) | pencarian, daftar, form utama | uji normal + batas |
| Rendah (kosmetik) | warna, teks bantu | uji singkat |

**3. Template test plan** (docs/qa/<objek>-test-plan.md)

```
Objek dan versi | Tujuan | Di dalam lingkup | Di luar lingkup
Risiko utama | Jenis tes: fungsional, UI/UX, kompatibilitas (browser, perangkat, ukuran layar), performa dasar, aksesibilitas, keamanan dasar, regresi
Environment dan data uji (akun, peran, data contoh) | Kriteria masuk dan lulus
Jadwal dan penanggung jawab
```

**4. Teknik desain test case**
- Partisi kesetaraan: kelompokkan input yang diperlakukan sama, uji satu wakil tiap kelompok.
- Nilai batas: 0, 1, maksimum, maksimum+1, minimum-1.
- Tabel keputusan untuk aturan bisnis bertingkat (diskon, izin).
- Transisi status: draf -> kirim -> setuju -> selesai, termasuk transisi yang tidak boleh.
- Tebak kesalahan: kosong, spasi saja, sangat panjang, emoji, karakter khusus (`' " < > & %`), huruf besar/kecil, tanggal tidak valid, angka negatif, tempel teks berformat, klik ganda, tombol back/refresh di tengah proses, koneksi lambat atau putus, sesi kedaluwarsa.
- Peran dan izin: setiap peran mencoba melakukan yang bukan haknya.

Format: `ID | Fitur | Kondisi awal | Langkah | Hasil diharapkan | Hasil aktual | Status (Lulus/Gagal/Belum diuji/Diblokir) | Bukti`

**5. Daftar periksa UI dan UX cepat**
Tata letak di 360, 768, 1280 px; teks terpotong; fokus keyboard dan urutan Tab; kontras minimal 4.5:1; label form; pesan error spesifik dan membantu; status loading, kosong, dan gagal; tautan dan tombol bekerja; judul halaman; tidak ada error di konsol.

**6. Aksesibilitas dasar:** gambar bermakna punya alt, kontrol dapat dioperasikan keyboard, heading berurutan, warna bukan satu-satunya penanda, target sentuh >= 44 px.

**7. Menjalankan uji**
Jalankan sungguhan (buka halaman, panggil endpoint, jalankan skrip) dan catat hasil nyata. Bila tidak bisa menjalankan, status "Belum diuji" beserta alasannya; jangan menebak. Ulangi bug sekali untuk memastikan konsisten dan catat frekuensi (selalu/kadang).

**8. Laporan bug (satu bug satu laporan, cek duplikat)**

```
Judul: <area> - <gejala singkat, spesifik>
Environment: <versi/commit, browser/perangkat, akun/peran, data>
Langkah reproduksi: 1. ... 2. ... 3. ...
Hasil diharapkan: ...
Hasil aktual: ...
Frekuensi: selalu | kadang (x dari y) 
Severity: Critical | High | Medium | Low   Prioritas: P0-P3
Bukti: tangkapan layar, log, request/response
Dugaan penyebab (opsional, ditandai dugaan)
```

| Severity | Arti | Contoh |
| --- | --- | --- |
| Critical | data hilang/bocor, sistem tidak bisa dipakai, uang salah | pembayaran dobel, login terbuka tanpa password |
| High | fitur utama gagal tanpa jalan pintas | tidak bisa checkout |
| Medium | fitur sebagian salah, ada jalan pintas | filter tidak akurat |
| Low | kosmetik atau saran | typo, spasi |

Severity = dampak; prioritas = urutan perbaikan (mempertimbangkan frekuensi dan jumlah pengguna terdampak).

**9. Regresi:** setelah perbaikan, uji ulang bug itu, area sekitarnya, dan fitur yang berbagi komponen atau data. Jaga daftar regresi inti (alur utama, login/izin, pembayaran, form utama) dan jalankan sebelum tiap rilis.

**10. Laporan hasil dan verdict**

```
Ringkasan: ... (3 kalimat)
Cakupan: diuji X dari Y kasus; belum diuji: ... (alasan)
Hasil: Lulus N | Gagal N | Diblokir N
Bug terbuka per severity: Critical n, High n, Medium n, Low n
Risiko yang tersisa
Verdict: LULUS | LULUS DENGAN CATATAN | GAGAL  + syarat yang harus diperbaiki dulu
```

Aturan verdict: ada Critical/High terbuka = GAGAL; hanya Medium/Low yang disepakati = LULUS DENGAN CATATAN; semua kriteria terpenuhi = LULUS.

**11. Meninjau dokumen/copy/alur proses:** periksa kejelasan, konsistensi istilah, angka yang saling bertentangan, langkah yang hilang, asumsi tersembunyi, dan apakah pembaca baru bisa melakukannya tanpa bertanya.

## Pitfalls

- Menyatakan Lulus tanpa menjalankan; menyembunyikan tes yang flaky.
- Bug tanpa langkah reproduksi atau tanpa environment; bug ganda.
- Menilai severity dari perasaan; menyerang orang alih-alih produk.
- Hanya menguji jalur bahagia.
- Menguji di produksi atau memakai data pribadi asli.

## Verification

- Setiap kriteria punya minimal satu test case; hasil nyata dilampirkan.
- Setiap bug punya langkah reproduksi, environment, bukti, dan severity beralasan.
- Laporan memisahkan Diuji, Belum diuji, dan Diduga; verdict tegas dan konsisten dengan aturan.
