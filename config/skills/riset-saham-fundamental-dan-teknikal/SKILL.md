---
name: riset-saham-fundamental-dan-teknikal
description: "Template riset saham: fundamental, teknikal, skenario, dan risiko."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [saham, riset, fundamental, teknikal]
---

# Template riset saham: fundamental

## When to Use

- Meriset sebuah emiten atau sektor, membandingkan saham, atau menyusun laporan pantauan pasar.

## Procedure

**1. Sumber:** laporan keuangan dan keterbukaan informasi di situs emiten/IDX, OJK, BI, BPS, berita kredibel. Cantumkan sumber dan tanggal. Jika data terbaru tidak bisa diakses, tulis demikian; jangan mengarang angka.

**2. Rasio kunci**

| Aspek | Metrik | Cara baca |
| --- | --- | --- |
| Valuasi | PER, PBV, EV/EBITDA, dividend yield | bandingkan dengan sektor dan sejarah sendiri |
| Profitabilitas | margin kotor/bersih, ROE, ROA | konsisten naik atau turun? |
| Pertumbuhan | pendapatan dan laba YoY, 3 sampai 5 tahun | stabil, siklikal, atau sekali jalan? |
| Kesehatan | DER, current ratio, interest coverage, arus kas operasi | utang aman dan laba tertunai? |

**3. Teknikal (bila diminta):** tren (HH/HL atau LH/LL), support/resistance, volume, MA 20/50/200, RSI, MACD. Sajikan sebagai skenario dengan level pembatalan.

**4. Katalis dan risiko:** kebijakan, siklus komoditas, suku bunga, kurs, aksi korporasi, tata kelola, konsentrasi pelanggan, likuiditas saham.

**5. Template laporan** (docs/riset-saham/<kode>.md)

```
Ringkasan (3 kalimat) | Tanggal data dan sumber
Profil bisnis | Tabel metrik vs sektor
Kelebihan | Risiko
Skenario: Bull / Base / Bear (asumsi, kisaran, pemicu)
Yang perlu dipantau berikutnya
Catatan: riset informasi, bukan saran investasi.
```

**6. Aturan:** tidak ada perintah beli/jual personal, tidak ada janji untung, tidak ada transaksi.

## Pitfalls

- Memakai angka lama atau tanpa sumber.
- Satu rasio dijadikan kesimpulan.
- Bahasa yang meyakinkan berlebihan ("pasti naik").

## Verification

- Semua angka punya sumber dan tanggal; skenario dan risiko ada; disclaimer ada di akhir laporan.
