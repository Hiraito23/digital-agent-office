---
name: qa-test-plan-dan-laporan-bug
description: "Playbook QA: strategi uji berbasis risiko, test plan, desain test case, laporan bug, severity, regresi, dan verdict."
version: 3.0.0
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

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila belum ada objek uji atau data uji)

Jangan menunggu aplikasi atau data siap. Kerjakan perencanaan dan persiapan uji sekarang dengan data uji dummy, lalu tinggal dijalankan begitu objek tersedia.
- **Data uji dummy** (`data-dummy/qa/`): akun uji per peran (admin, pengguna biasa, tamu) dengan email `@example.com`; berkas CSV nilai masukan per kolom **valid, batas (min, maks, min-1, maks+1), kosong, terlalu panjang, karakter khusus/emoji/Unicode, spasi di tepi, format salah**; contoh lampiran (gambar kecil, PDF, berkas besar, ekstensi ganda).
- **Test case parametrik:** tulis satu kasus dengan tabel data masukan sehingga ratusan kombinasi tidak perlu ditulis satu-satu.
- **Objek uji mini:** bila diminta menguji tetapi tidak ada apa pun, buat prototipe kecil (satu halaman HTML dengan form dan validasi sengaja bermasalah) hanya untuk mendemonstrasikan siklus uji; label `OBJEK UJI DUMMY` dan jangan menyebut bug di dalamnya sebagai bug produk nyata.
- **Contoh laporan bug dummy** boleh dibuat untuk memperlihatkan format, jelas berlabel CONTOH. Jangan menyatakan ada bug pada sistem nyata yang belum kamu jalankan.
- Verdict pada fase ini selalu "BELUM DIUJI: rencana siap, data uji siap", bukan lulus/gagal.

## Pendalaman

**Tabel kelas ekuivalen dan batas:** untuk tiap masukan tulis kelas valid, kelas tidak valid, dan nilai batas. Contoh umur 17-60: uji 16, 17, 18, 59, 60, 61, kosong, "abc", 17.5, -1.

**Pairwise (kombinasi berpasangan):** untuk 4-5 parameter yang masing-masing punya beberapa nilai (peramban, peran, bahasa, perangkat), pilih himpunan kasus sehingga setiap pasangan nilai muncul minimal sekali; hasilnya jauh lebih sedikit daripada semua kombinasi.

**Uji eksploratori berbasis sesi:** piagam (charter) satu kalimat ("Jelajahi pembayaran dengan data tidak biasa untuk menemukan kegagalan validasi"), 45-90 menit, catatan: apa dicoba, apa ditemukan, pertanyaan, risiko baru. Akhiri dengan debrief singkat.

**Severity vs prioritas:** severity = dampak teknis ke pengguna (kritis: data hilang/keamanan/tidak bisa dipakai; mayor: fitur inti rusak ada jalan memutar; minor; kosmetik). Prioritas = urutan memperbaiki berdasar bisnis dan tenggat. Tulis keduanya terpisah.

**Contoh API cepat (curl):**

```
curl -i -X POST "$BASE/api/orders" -H "Content-Type: application/json" -d '{"qty": -1}'
# harapkan 400/422 dengan pesan jelas, bukan 500 dan bukan jejak tumpukan
```
Cek juga: tanpa token (401), token orang lain (403/404), ukuran badan sangat besar, tipe data salah, idempotensi (kirim dua kali).

**Uji performa ringan (asap):** ukur waktu respons halaman utama dan satu endpoint dengan 20 permintaan berurutan; catat median dan p95; bandingkan dengan target tertulis. Bukan uji beban penuh.

**Aksesibilitas cepat:** Tab melalui seluruh halaman (urutan logis, fokus terlihat), perbesar 200%, matikan CSS (urutan baca), kontras teks >= 4,5:1, label pada semua input, pesan galat terkait ke input.

**Daftar periksa rilis:** semua kasus prioritas tinggi lulus, tidak ada bug kritis/mayor terbuka (atau ada persetujuan tertulis), regresi inti lulus, migrasi data diuji pada salinan, rencana mundur (rollback) ada, pemantauan dan alarm siap, catatan rilis ditulis.

**Menangani uji tidak stabil (flaky):** jalankan ulang 10 kali, catat tingkat gagal, cari penyebab (waktu, urutan, data bersama, jaringan), perbaiki atau karantina dengan tiket; jangan menghapus diam-diam.

**Mutu hasil:** setiap kasus punya langkah, hasil diharapkan, dan data; setiap bug dapat direproduksi dari laporannya sendiri; bukti (log, tangkapan layar, respons) dilampirkan; data dummy berlabel.
