---
name: backend-modul-nestjs-dan-kontrak-api
description: "Struktur modul NestJS oase-tanjung, template kontrak API, format error, dan checklist backend."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [backend, nestjs, express, api, typeorm]
---

# Modul NestJS dan Kontrak API

## When to Use

- Membuat modul, endpoint, DTO, atau use case baru di backend.
- Merancang atau mengubah kontrak API yang dipakai frontend.

## Procedure

**1. Struktur folder wajib**

WAJIB ikuti struktur folder proyek oase-tanjung (monorepo frontend/ + backend/). Backend NestJS:
backend/src/
  modules/<fitur>/
    <fitur>.module.ts
    controllers/<fitur>.controller.ts (tipis: terima request, panggil application)
    applications/<fitur>-crud.application.ts, <fitur>-index.application.ts, <fitur>-dropdown.application.ts (use case)
    services/<fitur>.service.ts (logika bisnis dan akses data)
    requests/<fitur>-create.request.ts, <fitur>-update.request.ts, <fitur>-index.request.ts (DTO + validasi)
    responses/<fitur>-detail.response.ts, <fitur>-list.response.ts
  entities/<domain>/<nama>.entity.ts (TypeORM)
  interface-models/<domain>/<nama>.interface.ts
  contracts/<domain>/<nama>-enum.contract.ts
  common/ (constants, decorators, enums, filters, interceptors, interfaces, pipes, request, utils)
  infrastructure/ (mail, redis, storage, sentry, rate-limit: integrasi luar, masing-masing <nama>.module.ts + services/)
  databases/migrations/<timestamp>-<NamaPerubahan>.ts, databases/seeders/<nama>.seeder.ts
  config.ts, app.module.ts, main.ts
backend/test/<fitur>/*.spec.ts dan test/app.e2e-spec.ts
Alur wajib: controller -> application -> service -> entity. Penamaan kebab-case dengan sufiks peran (.controller.ts, .application.ts, .request.ts, .response.ts, .entity.ts). Untuk layanan Express gunakan pola yang sama: modules/<fitur>/ dengan controllers, services, requests, responses.

**2. Template kontrak API** (tulis dan bagikan ke Haruto SEBELUM menulis kode)

```
POST /customers            izin: customer.create
Request : { name: string(1..120), email: string(email), phone?: string }
Response: 201 { id, name, email, phone, createdAt }
Error   : 400 validasi { code: "VALIDATION_ERROR", errors: [{ field, message }] }
          401 belum login | 403 tidak berizin | 409 { code: "EMAIL_TAKEN" }
GET /customers?page=1&limit=20&search=
Response: 200 { data: [...], meta: { page, limit, total, totalPages } }
```

**3. Format error seragam:** `{ statusCode, message, code, errors?: [{ field, message }] }`. Filter pengecualian global mengubah error internal menjadi 500 generik tanpa stack trace.

**4. Checklist implementasi**

- DTO dengan class-validator; `ValidationPipe` whitelist + forbidNonWhitelisted + transform.
- Controller tipis; logika di service; query lewat repository/QueryBuilder dengan parameter (bukan string-concat).
- Otorisasi: guard autentikasi + guard izin; periksa kepemilikan data (cegah IDOR).
- Transaksi untuk operasi multi-tabel; hindari N+1 (relations/join); paginasi dan batas `limit` maksimum.
- Tidak mengembalikan field sensitif (password hash, token); gunakan response class/serializer.
- Rate limit pada login dan endpoint sensitif; log tanpa data pribadi.
- Perubahan skema lewat migrasi (minta Daichi meninjau); jangan `synchronize: true` di luar development.
- Tes: unit service (sukses, gagal, edge) dan e2e endpoint (200/400/401/403/404).

## Pitfalls

- Menulis kode sebelum kontrak disepakati, lalu mengubah respons diam-diam.
- Logika bisnis di controller; query mentah dengan input pengguna.
- Mengembalikan entity langsung (membocorkan field).
- Lupa paginasi sehingga daftar besar membebani server.

## Verification

- `npm run build`, lint, dan tes lolos; endpoint dicoba dengan curl atau tes e2e untuk jalur sukses dan gagal.
- Dokumentasi endpoint (contoh request/response) tersimpan di docs/api/ dan sudah dikabarkan ke Haruto, Takumi, Akane.
