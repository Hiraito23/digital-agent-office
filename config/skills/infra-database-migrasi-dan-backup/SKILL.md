---
name: infra-database-migrasi-dan-backup
description: "Struktur infra oase-tanjung, prosedur migrasi aman, checklist backup/restore, dan Docker Compose."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [database, migrasi, docker, backup, typeorm]
---

# Migrasi Database, Backup, dan Environment

## When to Use

- Merancang skema, membuat atau menjalankan migrasi, menyiapkan environment Docker, atau menjadwalkan dan menguji backup.

## Procedure

**1. Struktur wajib**

WAJIB ikuti struktur proyek oase-tanjung: migrasi TypeORM di backend/src/databases/migrations/<timestamp>-<NamaPerubahan>.ts (contoh: 1790168933911-CustomerMasterData.ts), seeder di backend/src/databases/seeders/<nama>.seeder.ts, entity di backend/src/entities/<domain>/<nama>.entity.ts, integrasi Redis/storage/mail di backend/src/infrastructure/. Layanan lokal (MySQL, Redis, MinIO, phpMyAdmin) dijalankan lewat docker-compose.local.yml di root dengan env dari backend/.env; Dockerfile backend di backend/Dockerfile.backend. Script utilitas (backup, restore) di scripts/, dokumentasi (ERD, runbook) di docs/. Kredensial hanya di .env, tidak pernah di repository.

**2. Perancangan skema:** satu tabel satu konsep; tipe data tepat (uang = DECIMAL, waktu = TIMESTAMP UTC); NOT NULL secara default; UNIQUE dan FK dengan ON DELETE yang disengaja; kolom audit `created_at`, `updated_at`; soft delete (`deleted_at`) bila perlu; index untuk kolom filter/join yang nyata (cek dengan EXPLAIN), bukan semua kolom.

**3. Migrasi aman**

1. Nama `<timestamp>-<NamaPerubahan>.ts` dengan `up` dan `down` yang benar-benar membalikkan.
2. Perubahan merusak dibuat bertahap (expand -> migrate -> contract): tambah kolom nullable -> isi data bertahap -> tambah constraint -> baru hapus kolom lama di rilis berikutnya.
3. Uji naik-turun di database lokal: `migration:run` -> `migration:revert` -> `migration:run`.
4. Tabel besar: hindari kunci panjang; jalankan di jam sepi; sediakan perkiraan durasi.
5. Jangan `synchronize: true` di luar development.

**4. Checklist backup dan restore**

- Backup terjadwal (mis. `mysqldump --single-transaction` atau `pg_dump -Fc`), disimpan di luar mesin yang sama, ada retensi.
- UJI restore ke database kosong secara berkala dan catat waktunya; backup yang tidak pernah diuji belum dianggap ada.
- User aplikasi hanya punya hak yang dibutuhkan (bukan root); kredensial lewat env; `.env.example` tanpa nilai rahasia.

**5. Docker Compose (development/staging):** versi image dipin, `healthcheck`, volume bernama untuk data, jaringan khusus, `depends_on` dengan `condition: service_healthy`, port hanya yang perlu, dan README cara nyalakan, reset, dan isi seed.

**6. Tindakan berisiko** (DROP, TRUNCATE, DELETE massal, migrasi destruktif): tulis rencana, dampak, backup terverifikasi, dan langkah rollback; minta konfirmasi eksplisit sebelum menjalankan.

## Pitfalls

- Migrasi tanpa `down`, atau `down` yang menghapus data; mengubah migrasi yang sudah dijalankan (buat migrasi baru).
- Index berlebihan; FK tanpa aturan hapus yang jelas; menyimpan uang sebagai float.
- Backup tanpa uji restore; kredensial di compose file atau repo.

## Verification

- Migrasi lolos naik-turun-naik; seed berjalan; environment menyala dari nol sesuai dokumentasi.
- Restore dari backup terbaru berhasil; rencana rollback dan risiko tercatat.
