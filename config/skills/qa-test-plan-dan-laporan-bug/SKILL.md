---
name: qa-test-plan-dan-laporan-bug
description: "Struktur tes oase-tanjung, template test plan, laporan bug, severity, dan checklist regresi."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [qa, testing, jest, playwright, vitest]
---

# Test Plan dan Laporan Bug

## When to Use

- Menguji fitur baru, menyusun test plan, menulis tes otomatis, melaporkan bug, atau regresi sebelum rilis.

## Procedure

**1. Struktur tes wajib**

WAJIB ikuti struktur tes proyek oase-tanjung: backend/test/<fitur>/*.spec.ts (Jest, mis. auth.service.spec.ts, permissions.guard.spec.ts) plus test/app.e2e-spec.ts, dan frontend/test/<fitur>/<fitur>-<aspek>.spec.ts(x) (mis. booking-mapper.spec.ts, booking-detail-tabs.spec.tsx). Satu folder per fitur, nama tes menjelaskan perilaku, data uji di fixtures/ fitur tersebut. Uji mapper (common/mappers), hooks, komponen modules/<fitur>, serta application dan service backend.

**2. Template test plan** (docs/qa/<fitur>-test-plan.md)

```
Ruang lingkup & di luar lingkup | Risiko tertinggi
Jenis tes: fungsional, UI, API, regresi, lintas browser/perangkat, izin antar peran
Data uji & environment | Kriteria lulus (exit criteria)
Test case: ID | Acceptance criteria | Langkah | Hasil diharapkan | Otomasi (ya/tidak)
```

**3. Sumber test case:** acceptance criteria (positif), input tidak valid (negatif), nilai batas (0, 1, maks, maks+1), kosong/null/spasi, karakter khusus dan panjang berlebih, peran tanpa izin, kegagalan jaringan/server, dan klik ganda saat submit.

**4. Praktik tes otomatis:** satu perilaku per tes; pola Arrange-Act-Assert; data uji milik tes sendiri (fixtures/); tidak bergantung urutan atau waktu; mock hanya batas luar (jaringan, waktu). E2E (Playwright) hanya alur kritis.

**5. Laporan bug**

```
Judul: <komponen> - <gejala singkat>
Langkah reproduksi: 1... 2... 3...
Diharapkan: ...   Aktual: ...
Severity: Critical | High | Medium | Low   Environment: <versi/commit, browser, data>
Bukti: <output tes, log, request/response>   Pemilik: Haruto | Kenji
```
Severity: Critical = data hilang/bocor, sistem tidak bisa dipakai; High = fitur utama gagal tanpa jalan pintas; Medium = fitur sebagian salah dengan jalan pintas; Low = kosmetik.

**6. Checklist regresi cepat:** login/logout dan izin per peran, CRUD fitur terkait, validasi form, paginasi dan filter, pesan error, responsif, dan fitur yang berbagi komponen atau endpoint yang sama.

**7. Status akhir:** Lulus (semua kriteria terpenuhi), Lulus dengan catatan (hanya Low/Medium yang disepakati), Gagal (ada Critical/High atau kriteria tidak terpenuhi).

## Pitfalls

- Menyatakan Lulus tanpa menjalankan tes; menyembunyikan tes yang flaky.
- Tes yang bergantung pada data produksi atau urutan eksekusi.
- Laporan bug tanpa langkah reproduksi; bug ganda.

## Verification

- Perintah tes dijalankan dan outputnya (jumlah lulus/gagal) dilampirkan; setiap acceptance criteria punya minimal satu tes.
