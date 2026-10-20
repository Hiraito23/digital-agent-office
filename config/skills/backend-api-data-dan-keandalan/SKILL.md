---
name: backend-api-data-dan-keandalan
description: "Playbook Backend: desain API dan kontrak, model data dan migrasi, validasi dan keamanan dasar, penanganan error, keandalan dan performa, pengujian, observabilitas, dan serah-terima, plus aturan tech stack, arsitektur folder, clean code, dan mode data dummy."
version: 3.0.0
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

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila basis data, layanan luar, atau data belum ada)

Jangan menunggu infrastruktur atau data. Bangun layanan yang **berjalan lokal dengan data benih dummy** dan dapat dialihkan ke sumber nyata lewat konfigurasi.
- **Basis data lokal:** bila belum ada, pakai SQLite (atau berkas JSON bila sangat sederhana) di belakang antarmuka repositori sehingga mengganti ke PostgreSQL/MySQL tidak mengubah logika bisnis. Migrasi tetap ditulis seperti untuk produksi.
- **Skrip benih dummy** (`seeds/seed-dummy.*`) deterministik (seed tetap) dan idempoten (aman dijalankan ulang): pengguna fiktif (`@example.com`), data referensi, transaksi 100-500 baris dengan distribusi realistis, ditambah kasus tepi (nilai nol, teks panjang, karakter khusus, tanggal batas, status campuran). Label DUMMY pada nama berkas dan kolom/catatan.
- **Layanan luar tiruan:** pembayaran, email, SMS, penyimpanan berkas, dan API pihak ketiga dibuat sebagai adaptor dengan implementasi `fake` (merekam panggilan, bisa dipaksa gagal/lambat) dan implementasi nyata yang membaca kredensial dari lingkungan. Jangan menaruh kredensial nyata di repositori; sediakan `.env.example` berisi nilai dummy.
- **Kontrak dulu:** tulis `docs/api/<fitur>.md` (endpoint, parameter, contoh permintaan/respons, kode galat) sebagai kontrak usulan yang dapat langsung dipakai Frontend dengan data tiruan.
- README: cara menjalankan lokal, cara menyemai data, cara beralih ke basis data dan layanan nyata, daftar hal yang masih dummy.

## Pendalaman

**Idempotensi untuk operasi yang berisiko ganda** (pembayaran, pembuatan pesanan): terima `Idempotency-Key`, simpan hasil pertama per kunci, kembalikan hasil yang sama untuk pengulangan; kunci kedaluwarsa setelah 24 jam.

**Paginasi:** untuk daftar besar pakai kursor (`?after=<id>&limit=50`) dengan urutan stabil (kolom unik sebagai penentu akhir), bukan `OFFSET` besar; kembalikan `next_cursor`; batasi `limit` maksimal.

**Migrasi aman (expand/contract):** tambah kolom/tabel baru (kompatibel), tulis ke keduanya, isi ulang data lama bertahap, pindahkan pembaca, baru hapus yang lama pada rilis berikutnya. Setiap migrasi punya langkah mundur atau alasan tertulis mengapa tidak bisa; uji pada salinan data.

**Indeks dan kueri:** periksa dengan `EXPLAIN (ANALYZE)`; indeks untuk kolom yang sering difilter/diurutkan/digabung, urutan kolom pada indeks majemuk dari yang paling selektif; hindari N+1 (ambil relasi sekaligus); batasi kolom yang diambil; ukur sebelum dan sesudah.

**Cache dan invalidasi:** cache hanya yang mahal dan sering dibaca; TTL pendek atau invalidasi saat tulis; kunci cache menyertakan versi dan parameter; tahan serbuan cache (stampede) dengan kunci pelindung; jangan men-cache data khusus pengguna di cache bersama.

**Ketahanan panggilan keluar:** batas waktu pada setiap panggilan, ulang dengan jeda eksponensial + jitter hanya untuk operasi idempoten, pemutus sirkuit saat layanan bawahan gagal berulang, dan perilaku turun-kelas (nilai bawaan, data basi, pesan jelas) alih-alih galat 500.

**Pola outbox:** simpan peristiwa yang harus dikirim (email, webhook) dalam tabel yang sama dengan transaksi data, lalu pekerja terpisah mengirim dan menandai terkirim; menghindari data tersimpan tapi pesan hilang (atau sebaliknya).

**Batas laju dan perlindungan:** batas per pengguna dan per alamat untuk endpoint sensitif (login, pendaftaran, ekspor), respons 429 dengan `Retry-After`, batas ukuran badan dan waktu proses.

**Observabilitas:** log terstruktur (waktu, tingkat, id permintaan, id pengguna ter-anonimkan, rute, durasi, status), jangan mencatat kata sandi/token/data pribadi; metrik laju, galat, latensi p50/p95/p99; endpoint kesehatan (`/healthz` hidup, `/readyz` siap); alarm pada galat 5xx dan latensi.

**Kerangka OpenAPI minimal:**

```
openapi: 3.0.3
info: { title: Contoh API, version: 0.1.0 }
paths:
  /api/orders:
    post:
      summary: Buat pesanan
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/OrderInput' } } } }
      responses: { '201': { description: Dibuat }, '422': { description: Validasi gagal } }
```

**Uji asap beban:** 50 permintaan paralel ke endpoint utama (`ab -n 500 -c 50` atau `k6`), catat p95 dan galat; bandingkan dengan target tertulis; ulangi setelah perbaikan.

**Pemulihan:** cadangan diuji pulihkan sungguhan pada lingkungan terpisah (cadangan yang tidak pernah diuji dianggap tidak ada); catat RPO dan RTO yang disepakati.

**Mutu hasil:** kontrak tertulis dan cocok dengan implementasi; validasi dan otorisasi di setiap endpoint; uji jalur sukses, galat, dan batas; berjalan dari nol dengan satu perintah menggunakan data dummy; semua yang dummy atau fake berlabel dan dapat dialihkan lewat konfigurasi.

## Aturan Tech Stack (ikuti proyek, jangan mengganti diam-diam)

**Langkah 0, selalu: deteksi stack yang SUDAH ada.** Baca berkas manifes (`package.json`, `pyproject.toml`/`requirements.txt`, `go.mod`, `pom.xml`/`build.gradle`, `composer.json`, `Gemfile`), lockfile, `Dockerfile`/`docker-compose.yml`, konfigurasi migrasi (`prisma/`, `drizzle/`, `alembic/`, `migrations/`), skrip CI, `README`, dan struktur folder. **Ikuti bahasa, kerangka, ORM, pengelola paket, gaya penamaan, dan pola yang sudah ada.** Jangan memperkenalkan kerangka atau ORM kedua, dan jangan menulis ulang layanan dalam bahasa lain. Dependensi baru hanya bila perlu dan alasannya dicatat di serah-terima.

**Bila proyek baru atau pengguna tidak menentukan, bawaan modern:**
- **Node.js LTS + TypeScript (`strict`)**: kerangka **Fastify** atau **Hono** (atau Express bila proyek sudah memakainya); alternatif **FastAPI (Python 3.12+)** dengan Pydantic, atau **Go** untuk layanan ringan. Satu bahasa utama per layanan.
- Validasi: **Zod** (Node) / **Pydantic** (Python); semua masukan dan konfigurasi divalidasi di batas sistem.
- Basis data: **PostgreSQL** (SQLite hanya untuk lokal/uji); akses lewat **Drizzle** atau **Prisma** (Node) / **SQLAlchemy 2 + Alembic** (Python); migrasi berurutan dan dilacak di repositori; tanpa SQL string hasil gabungan input.
- API: **REST + OpenAPI 3** (kontrak ditulis dan diuji), versi di jalur (`/api/v1`), kode status dan format galat seragam (RFC 9457 *problem details* atau struktur galat tetap proyek).
- Auth: sesi/cookie `HttpOnly` atau token berumur pendek + refresh; kata sandi dengan argon2/bcrypt; otorisasi per objek, bukan hanya per rute.
- Pekerjaan latar: antrean (BullMQ/Redis, atau pustaka bawaan proyek) dengan percobaan ulang dan *dead-letter*.
- Uji: **Vitest/Jest** atau **pytest**, uji integrasi dengan basis data nyata di kontainer (Testcontainers) atau SQLite terisolasi, uji kontrak terhadap OpenAPI.
- Operasional: **Docker** multi-tahap (pengguna non-root, tanpa rahasia di image), `docker-compose` untuk lokal, **GitHub Actions** (lint, tipe, uji, build, pemindaian dependensi), konfigurasi via variabel lingkungan (prinsip 12-factor), log terstruktur ke stdout.

## Arsitektur Folder (bawaan; sesuaikan dengan struktur proyek yang ada)

Pisahkan **lapisan** dan kelompokkan **per modul/domain**. Arah ketergantungan: `routes -> controllers/handlers -> services -> repositories -> basis data`; domain/aturan bisnis tidak bergantung pada kerangka web atau ORM.

```
src/
  main.ts / server.ts   # titik masuk: bangun app, pasang plugin, mulai server (tanpa logika bisnis)
  config/               # pembaca env + validasi (satu tempat), konstanta
  modules/
    <modul>/            # satu folder per domain (orders, users, billing)
      <modul>.routes.ts       # definisi rute + skema validasi
      <modul>.controller.ts   # terjemah HTTP <-> pemanggilan service (tipis)
      <modul>.service.ts      # aturan bisnis, transaksi, orkestrasi
      <modul>.repository.ts   # satu-satunya yang menyentuh basis data modul ini
      <modul>.schema.ts       # skema masukan/keluaran (Zod) + tipe
      <modul>.test.ts         # uji modul (unit + integrasi)
  shared/
    errors/             # kelas galat aplikasi + pemetaan ke respons
    middleware/         # auth, rate limit, logging, id permintaan
    lib/                # utilitas murni (uang, tanggal, id)
    db/                 # koneksi, transaksi, helper
    clients/            # adaptor layanan luar (pembayaran, email) + versi fake
  jobs/                 # pekerja latar dan penjadwal
migrations/             # migrasi basis data berurutan
seeds/                  # data benih (dummy berlabel) idempoten
docs/api/               # kontrak per fitur / openapi.yaml
tests/                  # uji uji-ujung dan fixture bersama
.env.example  Dockerfile  docker-compose.yml
```

Aturan batas:
- Controller tidak berisi aturan bisnis; service tidak mengenal objek `req/res`; hanya repository yang menulis kueri; modul lain memakai **service publik** modul itu, bukan repository-nya.
- Transaksi dimulai di service, bukan di controller atau repository tunggal.
- Satu skema sebagai sumber kebenaran untuk validasi, tipe, dan dokumentasi.
- Nama: berkas `kebab-case` atau konvensi bahasa proyek (Python `snake_case`, Go paket huruf kecil); tabel jamak `snake_case`, kolom `snake_case`, kunci utama `id`, waktu `created_at/updated_at` (UTC).
- Tidak ada impor melingkar antarmodul; ketergantungan lintas modul lewat antarmuka eksplisit atau peristiwa.

**Clean code (berlaku untuk semua kode yang kamu tulis)**
- **Nama menjelaskan maksud:** variabel kata benda (`unpaidInvoices`), fungsi kata kerja (`calculateTotal`), boolean berawalan `is/has/can/should`, tanpa singkatan yang tidak umum, tanpa `data`, `temp`, `obj`, `foo`. Satu istilah untuk satu konsep di seluruh proyek.
- **Fungsi kecil dan satu tugas:** idealnya <= 40 baris, <= 3-4 parameter (lebih dari itu pakai objek), kompleksitas siklomatik <= 10, tingkat indentasi <= 3. Pakai *early return* dan *guard clause* daripada `if` bersarang.
- **Berkas fokus:** satu tanggung jawab per modul, <= 300 baris (pecah bila lebih), ekspor sedikit dan jelas. Tidak ada dependensi melingkar.
- **Tanpa angka/string ajaib:** pindahkan ke konstanta bernama atau konfigurasi (`MAX_UPLOAD_MB = 5`). Satu sumber kebenaran untuk setiap aturan bisnis; hindari menyalin logika (DRY), tetapi jangan menggabungkan dua hal yang kebetulan mirip (lebih baik duplikasi kecil daripada abstraksi yang salah).
- **Pisahkan efek samping dari logika:** fungsi murni untuk perhitungan (mudah diuji), lapisan tipis untuk I/O (basis data, jaringan, berkas, waktu, acak). Suntikkan dependensi (parameter/konstruktor) alih-alih memanggil global.
- **Penanganan galat yang sengaja:** jangan menelan galat (`catch {}` kosong), jangan mengembalikan `null` ambigu; pakai tipe galat/kode yang jelas, tambahkan konteks, tangani di batas yang tepat (controller, handler UI), dan catat sekali. Validasi masukan di batas sistem.
- **Komentar menjelaskan *mengapa*, bukan *apa*:** kode yang perlu komentar untuk dipahami lebih baik diubah namanya atau dipecah. Hapus kode mati dan komentar kadaluarsa; jangan meninggalkan `TODO` tanpa tiket/pemilik.
- **Pola data:** utamakan objek tak berubah dan fungsi tanpa mutasi parameter; tipe eksplisit pada batas modul (TypeScript `strict`, tanpa `any` tanpa alasan tertulis).
- **Format dan lint otomatis:** formatter (Prettier/gofmt/black) dan linter dijalankan sebelum commit; jangan memperdebatkan gaya, ikuti konfigurasi proyek. Tidak ada peringatan baru.
- **Perubahan kecil dan terarah:** satu commit satu maksud, pesan commit jelas (gaya Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), jangan merapikan berkas yang tidak terkait pada perubahan yang sama, dan jangan ubah perilaku saat refactor.
- **Aturan Boy Scout yang aman:** tinggalkan kode sedikit lebih rapi hanya di area yang kamu sentuh dan sudah punya uji; jangan refactor besar tanpa diminta.
- **Uji sebagai dokumentasi:** nama uji menyebut perilaku ("menolak pesanan tanpa item"), pola Arrange-Act-Assert, tanpa logika di dalam uji, satu alasan gagal per uji.

**Khusus backend:** fungsi service menerima masukan yang sudah tervalidasi dan mengembalikan hasil atau melempar galat domain bertipe (bukan string); tidak ada kueri di dalam loop; semua uang memakai bilangan bulat satuan terkecil atau tipe desimal (bukan float); waktu disimpan UTC; id tidak berurutan bila bocor menjadi masalah (UUID/ULID); tidak ada rahasia atau data pribadi di log.
