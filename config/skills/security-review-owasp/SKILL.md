---
name: security-review-owasp
description: "Checklist review keamanan berbasis OWASP Top 10/ASVS, template laporan temuan, dan pemetaan severity."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [security, owasp, audit, pentest]
---

# Review Keamanan (OWASP)

## When to Use

- Menguji keamanan fitur atau aplikasi tim ini di development/staging, meninjau kode berisiko, atau memverifikasi perbaikan.

## Procedure

**0. Aturan main.** Hanya aplikasi milik tim ini dan hanya development/staging. Tanpa DoS, tanpa merusak atau mengubah data nyata, tanpa menyalin data sensitif ke laporan.

**1. Threat model 10 menit:** aset, titik masuk (endpoint, form, upload, webhook), batas kepercayaan, peran. Mulai dari yang dampaknya terbesar.

**2. Checklist**

| Area | Periksa |
| --- | --- |
| Autentikasi | hash password (bcrypt/argon2), kebijakan password, brute force dan rate limit, masa berlaku/rotasi token, logout menghapus sesi, reset password aman |
| Otorisasi | IDOR (ganti id di URL/body), akses antar peran, endpoint admin, pengecekan di server bukan hanya UI |
| Input | SQL injection (query dengan string-concat), XSS (render HTML mentah), command injection, path traversal, mass assignment |
| Sesi/CSRF/CORS | cookie HttpOnly+Secure+SameSite, token CSRF bila memakai cookie, CORS tidak `*` untuk kredensial |
| Upload | tipe dan ukuran dibatasi, nama file di-sanitasi, disimpan di luar web root, tidak dieksekusi |
| Konfigurasi | secret di repo atau riwayat git, header (CSP, HSTS, X-Content-Type-Options, X-Frame-Options), mode debug mati, pesan error tidak bocor |
| Dependensi | `npm audit`, paket usang, image Docker dipin dan minimal |
| Data | data sensitif di log, enkripsi saat transit, backup terlindungi |

**3. Perintah bantu** (aman, baca-saja): `npm audit --omit=dev`, `git log -p -S"password" --all` (cari secret), `grep -rnE "(api[_-]?key|secret|token)\s*[:=]" src`, `curl -I <url>` untuk header.

**4. Template temuan**

```
ID: SEC-001   Judul: ...
Lokasi: file:baris atau endpoint
Dampak: apa yang bisa dilakukan penyerang
Langkah reproduksi: ... (aman, tanpa merusak)
Severity: Critical | High | Medium | Low (CVSS v3.1 skor, vektor)
Bukti: ...   Status: Terbuka | Diperbaiki | Terverifikasi
Rekomendasi: perbaikan konkret + contoh kode/konfigurasi, pemilik: Haruto | Kenji | Daichi
```
Severity: Critical = eksekusi kode, pengambilalihan akun massal, kebocoran data luas (CVSS 9-10); High = bypass otorisasi, injeksi (7-8,9); Medium = XSS terbatas, CSRF, konfigurasi lemah (4-6,9); Low = informasi bocor ringan (0,1-3,9).

**5. Setelah perbaikan:** uji ulang kasus yang sama, tandai Terverifikasi hanya bila terbukti; sertakan ringkasan jumlah temuan per severity dan risiko tersisa.

## Pitfalls

- Menyebut "rentan" tanpa bukti; mencampur fakta dengan dugaan; melebih-lebihkan severity.
- Menguji di luar lingkup atau di produksi; menyalin data pribadi atau secret ke laporan.

## Verification

- Setiap temuan punya lokasi, bukti, severity, dan rekomendasi; laporan tersimpan di docs/security/; temuan yang diperbaiki sudah diuji ulang.
