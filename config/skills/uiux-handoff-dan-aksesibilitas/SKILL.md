---
name: uiux-handoff-dan-aksesibilitas
description: "Template handoff desain, pemetaan token ke Tailwind/Ant Design, daftar state, dan checklist WCAG AA."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [uiux, figma, design-system, aksesibilitas]
---

# Handoff Desain dan Aksesibilitas

## When to Use

- Menyusun desain baru, design system, atau handoff ke Haruto.
- Meninjau hasil implementasi terhadap desain, atau memeriksa aksesibilitas.

## Procedure

**1. Tahapan.** User flow -> wireframe -> high-fidelity -> state dan edge case -> handoff -> tinjau implementasi. Bila tanpa Figma: wireframe HTML statis dan `design-tokens.json` di docs/design/.

**2. Design tokens dan pemetaan**

| Token | Contoh | Dipakai di |
| --- | --- | --- |
| Warna (primary, success, warning, error, netral 50-900) | #2563eb | Tailwind `theme.extend.colors`, Ant Design `ConfigProvider token` |
| Tipografi (font, ukuran, tinggi baris) | 14/22, 16/24, 20/28 | Tailwind `fontSize`, token `fontSize` |
| Spasi | skala 4px (4, 8, 12, 16, 24, 32) | Tailwind spacing |
| Radius, bayangan | 6px, 8px | Tailwind `borderRadius`, `boxShadow` |
| Breakpoint | sm 640, md 768, lg 1024, xl 1280 | Tailwind screens |

**3. State yang harus ada pada tiap komponen interaktif:** default, hover, fokus, aktif, disabled, loading, error (dengan pesan), empty, sukses. Tulis microcopy Bahasa Indonesia yang jelas dan sopan.

**4. Template handoff per layar** (docs/design/<layar>.md)

```
Tujuan layar & pengguna
Flow: dari mana, ke mana
Komponen: nama (Ant Design/kustom), token yang dipakai, ukuran, jarak
State & pesan: tabel state di atas
Responsif: perilaku mobile / tablet / desktop
Interaksi: klik, keyboard, animasi (durasi, easing)
Catatan aksesibilitas & alasan keputusan
```

**5. Checklist WCAG 2.1 AA**

- Kontras teks >= 4,5:1 (teks besar >= 3:1); komponen UI dan ikon >= 3:1.
- Target sentuh >= 44x44 px; jarak antar target cukup.
- Semua fungsi bisa dipakai dengan keyboard; urutan fokus logis; fokus terlihat jelas.
- Setiap input punya label (bukan hanya placeholder); error dijelaskan dengan teks, tidak hanya warna.
- Gambar bermakna punya teks alternatif; heading berurutan; bahasa halaman diset.
- Animasi bisa dikurangi (prefers-reduced-motion); tidak ada konten berkedip cepat.

## Pitfalls

- Desain yang tidak bisa dibangun dengan Ant Design + Tailwind tanpa alasan kuat.
- Hanya mendesain kondisi ideal; melupakan error, empty, dan loading.
- Warna sebagai satu-satunya penanda status; token yang tidak konsisten dengan kode.

## Verification

- Semua state dan breakpoint terdokumentasi; kontras dicek; token cocok dengan konfigurasi Tailwind/Ant Design.
- Review implementasi menghasilkan daftar selisih spesifik (layar, elemen, nilai yang diharapkan vs aktual).
