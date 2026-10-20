---
name: riset-saham-fundamental-dan-teknikal
description: "Playbook riset saham: sumber, fundamental, kualitas laba, valuasi, teknikal, skenario, risiko, dan template laporan."
version: 3.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [saham, riset, fundamental, teknikal, idx]
---

# Playbook Riset Saham

Hanya riset informasi. Bukan saran investasi: tidak ada perintah beli/jual personal, tidak ada janji hasil, tidak ada transaksi.

## When to Use

- Meriset satu emiten atau sektor, membandingkan beberapa saham, menyusun laporan pantauan, atau menjelaskan istilah dan laporan keuangan.

## Procedure

**1. Tetapkan pertanyaan dan horizon.** Apa yang ingin diketahui (nilai wajar, kualitas bisnis, risiko, perbandingan)? Horizon: trading (hari-minggu), menengah (bulan-1 tahun), panjang (>3 tahun). Horizon menentukan data yang relevan.

**2. Sumber (catat nama dan tanggal akses)**
- Primer: situs emiten (laporan tahunan, laporan keuangan, paparan publik), IDX (keterbukaan informasi, data perdagangan), OJK, BI, BPS, Kementerian terkait.
- Sekunder: berita keuangan kredibel, riset publik sekuritas, data pasar.
- Jika tidak bisa mengakses data terbaru, tulis: "Data per <tanggal terakhir yang diketahui>, perlu dicek ulang." Jangan mengarang angka.

**3. Pahami bisnisnya (sebelum angka)**
Bagaimana emiten menghasilkan uang? Segmen pendapatan, pelanggan utama, ketergantungan komoditas/kurs/regulasi, keunggulan (merek, skala, izin, biaya), siapa pemegang saham pengendali, dan rekam jejak manajemen.

**4. Analisis fundamental**

| Aspek | Metrik | Rumus / cara baca |
| --- | --- | --- |
| Pertumbuhan | pendapatan dan laba YoY, CAGR 3-5 tahun | stabil, siklikal, atau sekali jalan? |
| Profitabilitas | margin kotor, operasional, bersih; ROE; ROA | ROE = laba bersih / ekuitas rata-rata; bandingkan dengan sektor |
| Kualitas laba | arus kas operasi / laba bersih | konsisten >= 1 lebih sehat; waspada bila laba naik tapi kas turun |
| Leverage | DER, net debt / EBITDA, interest coverage | coverage = EBIT / beban bunga; < 2x berisiko |
| Likuiditas | current ratio, quick ratio | < 1 perlu dilihat penyebabnya |
| Efisiensi | perputaran piutang, persediaan | memburuk = modal kerja tersedot |
| Valuasi | PER, PBV, EV/EBITDA, dividend yield, PEG | bandingkan dengan sektor, sejarah 5 tahun, dan pesaing |
| Dividen | payout ratio, konsistensi | payout > 100% tidak berkelanjutan |

Cek bendera merah: opini audit non-WTP, perubahan auditor mendadak, transaksi pihak berelasi besar, piutang naik jauh lebih cepat dari penjualan, penggadaian saham pengendali, laba bergantung pada keuntungan sekali jalan, rights issue berulang.

**5. Valuasi sederhana (selalu beri rentang)**
- Relatif: nilai wajar = metrik pesaing/sektor x metrik emiten (mis. PER sektor x EPS proyeksi).
- Dividen/arus kas: bila memakai DCF, tulis asumsi pertumbuhan, margin, WACC, dan analisis sensitivitas (naik/turun 1-2 poin).
- Margin of safety: selisih antara nilai wajar konservatif dan harga pasar, bukan titik tunggal.

**6. Teknikal (bila diminta, sebagai skenario)**
Tren (HH/HL atau LH/LL), support dan resistance dari area yang sering diuji, volume pada breakout, MA 20/50/200, RSI (momentum, bukan sinyal tunggal), MACD. Tulis level pembatalan skenario ("tesis batal bila harga tutup di bawah X"). Sampaikan keterbatasan: teknikal probabilistik, bukan kepastian.

**7. Katalis dan risiko**
Katalis: laporan kuartal, aksi korporasi, kebijakan, harga komoditas, ekspansi, kontrak baru. Risiko: siklus, suku bunga dan kurs, regulasi, konsentrasi pelanggan, utang jatuh tempo, tata kelola, likuiditas saham (volume harian kecil, free float rendah), risiko pasar umum.

**8. Skenario (wajib)**

| Skenario | Asumsi kunci | Pemicu | Dampak pada laba/valuasi |
| --- | --- | --- | --- |
| Bull | | | |
| Base | | | |
| Bear | | | |

**9. Template laporan** (simpan di docs/riset-saham/<kode>-<tanggal>.md)

```
# <Kode> - <Nama emiten> (data per <tanggal>)
Ringkasan (3 kalimat): bisnis, kondisi keuangan, hal paling penting
Profil bisnis dan model pendapatan
Tabel metrik 3-5 tahun vs sektor vs pesaing
Kualitas laba dan bendera merah
Valuasi (rentang dan asumsi)
Katalis | Risiko
Skenario Bull/Base/Bear
Hal yang perlu dipantau berikutnya (tanggal bila ada)
Sumber (nama, tautan, tanggal akses)
Catatan: riset informasi, bukan saran investasi; keputusan dan risikonya ada pada pengguna.
```

**10. Membandingkan beberapa saham:** tabel dengan kriteria sama (pertumbuhan, margin, ROE, DER, PER, PBV, dividen, likuiditas) dan kesimpulan per kriteria, bukan peringkat tunggal.

## Pitfalls

- Memakai data lama tanpa tanggal atau angka tanpa sumber.
- Satu rasio dijadikan kesimpulan (PER murah belum tentu murah).
- Mengabaikan likuiditas dan free float pada saham kecil.
- Bahasa meyakinkan berlebihan ("pasti naik").
- Mencampur fakta, perkiraan, dan opini.

## Verification

- Semua angka punya sumber dan tanggal; rasio dihitung dengan rumus yang konsisten.
- Ada rentang valuasi, tiga skenario, risiko, dan level pembatalan.
- Disclaimer ada di akhir laporan dan tidak ada instruksi beli/jual.

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila data keuangan atau harga tidak tersedia)

Jangan berhenti dengan "datanya belum cukup". Bila tidak bisa mengakses data resmi, kerjakan metodenya dengan **emiten fiktif** dan tandai semuanya DUMMY. Ini mendemonstrasikan analisis, bukan menilai saham nyata.
- **Emiten ilustrasi:** `PT Contoh Sejahtera Tbk (kode DUMY)`, sektor dipilih sesuai konteks. Jangan memakai kode saham atau nama perusahaan nyata dengan angka karangan.
- **Laporan keuangan 5 tahun** (`data-dummy/saham/dumy-keuangan-DUMMY.csv`): pendapatan, HPP, laba kotor, beban usaha, EBITDA, laba bersih, kas operasi, capex, kas, utang berbunga, ekuitas, saham beredar. Pertahankan hubungan akuntansi (laba kotor = pendapatan - HPP; ekuitas tahun berikutnya = ekuitas + laba - dividen; arus kas masuk akal terhadap laba) dan sisipkan satu kejanggalan (mis. kas operasi jauh di bawah laba) supaya analisis kualitas laba punya bahan.
- **Harga harian dummy 250 hari** (random walk dengan seed tetap + volume) untuk latihan tren, support/resistance, MA, RSI, MACD.
- **Emiten nyata diminta tetapi data tidak bisa diakses:** buat **kerangka laporan yang siap diisi** (tabel metrik dengan sel input kosong, rumus tertulis, daftar data yang harus diambil beserta sumbernya: laporan keuangan emiten, IDX, OJK), plus satu contoh terisi dengan emiten fiktif. Jangan mengisi angka nyata dari ingatan.
- Semua keluaran memuat banner: `⚠ Data DUMMY, bukan analisis saham nyata. Riset informasi, bukan saran investasi.`

## Pendalaman

**DuPont (membongkar ROE):** ROE = margin bersih x perputaran aset x leverage (aset / ekuitas). ROE naik karena margin dan perputaran lebih sehat daripada karena utang.

**Kualitas laba:** akrual = (laba bersih - kas operasi) / rata-rata aset; akrual tinggi berulang = waspada. Free cash flow = kas operasi - capex; FCF yield = FCF / kapitalisasi pasar. Cash conversion cycle = hari piutang + hari persediaan - hari utang usaha.

**Skor kesehatan ringkas (bukan ramalan):** hitung 9 tanda Piotroski (laba positif, ROA naik, kas operasi positif, kas operasi > laba, utang turun, current ratio naik, tanpa penerbitan saham baru, margin kotor naik, perputaran aset naik). 7-9 kuat, 0-3 lemah; sebut keterbatasannya (lebih cocok untuk saham murah/kecil).

**Contoh DCF mini dengan sensitivitas**

```
FCF tahun 1 = 100 (dummy), pertumbuhan 10% selama 5 tahun, lalu 3% abadi, WACC 11%
Nilai ekuitas = jumlah FCF terdiskon + nilai akhir terdiskon - utang bersih
Tabel sensitivitas: WACC 10% / 11% / 12% x pertumbuhan akhir 2% / 3% / 4%
```
Tampilkan rentang nilai wajar dari tabel itu, bukan satu angka.

**Teknikal sebagai skenario:** tulis tiga hal: level masuk skenario, level pembatalan, dan target wajar berdasar jarak support-resistance; hitung rasio risiko-imbalan (target - masuk) / (masuk - pembatalan) dan abaikan setup < 1,5. Konfirmasi dengan volume; satu indikator tidak cukup.

**Bobot skenario:** beri peluang subjektif bull/base/bear (mis. 25/50/25) dan hitung nilai ekspektasi, lalu tulis bahwa peluang adalah penilaian, bukan data.

**Daftar bendera merah tambahan:** margin kotor naik sementara beban naik tersembunyi, perubahan kebijakan akuntansi, piutang pihak berelasi, dana IPO tidak sesuai tujuan, penundaan laporan, kenaikan pesat saham free float kecil tanpa berita (gorengan).

**Mutu hasil:** setiap angka punya sumber dan tanggal (atau label DUMMY), rumus tertulis, skenario ada pemicu dan pembatal, dan penutup riset informasi tidak dihilangkan. Tidak ada kata pasti, tidak ada perintah beli/jual.
