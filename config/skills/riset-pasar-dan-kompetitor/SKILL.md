---
name: riset-pasar-dan-kompetitor
description: "Playbook riset pasar: pertanyaan riset, sumber, kompetitor, pelanggan, ukuran pasar, harga, sintesis, dan rekomendasi."
version: 3.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [riset, pasar, kompetitor, pelanggan, harga]
---

# Playbook Riset Pasar dan Kompetitor

## When to Use

- Sebelum meluncurkan produk, menentukan harga, memilih segmen, memilih kanal, atau memahami pesaing dan pelanggan.

## Procedure

**1. Pertanyaan riset yang terikat keputusan**
Tulis: "Keputusan: <apa yang akan diputuskan>. Pertanyaan: <apa yang perlu diketahui>. Bila jawabannya X maka kita lakukan A, bila Y maka B." Ruang lingkup: produk, wilayah, segmen, periode. Riset yang tidak mengubah keputusan dilewati.

**2. Rencana sumber**

| Jenis | Sumber | Dipakai untuk |
| --- | --- | --- |
| Primer | situs/harga/menu pesaing, wawancara, survei, uji beli | fakta terkini |
| Resmi | BPS, kementerian, asosiasi industri, laporan perusahaan | ukuran dan tren pasar |
| Perilaku | marketplace (terjual, ulasan), Google Trends, kata kunci pencarian, ulasan Google Maps | permintaan dan keluhan |
| Sosial | komentar, forum, grup, pertanyaan di media sosial | bahasa dan masalah pelanggan |
| Sekunder | berita, laporan riset publik | konteks (cek sumber aslinya) |

Catat sumber, tautan, dan tanggal akses untuk tiap fakta. Bila tidak bisa mengakses internet, katakan dan tandai semuanya sebagai perkiraan.

**3. Kompetitor: tiga lingkaran**
Langsung (produk sama), tidak langsung (masalah sama, cara berbeda), pengganti/kebiasaan lama (mis. membuat sendiri, tidak membeli). Ambil 5-8 nama, bukan hanya yang besar.

**4. Tabel kompetitor (kriteria sama untuk semua, beri tanggal cek)**

| Pesaing | Penawaran inti | Harga/paket | Target | Kekuatan | Kelemahan | Saluran | Pesan utama | Bukti sosial | Tgl cek |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Isi sel yang tidak diketahui dengan "n/a", jangan menebak.

**5. Analisis ulasan pelanggan:** ambil 30-50 ulasan (bintang 1-3 dan 5), kelompokkan tema (harga, kualitas, layanan, pengiriman, fitur), hitung frekuensi, kutip kalimat asli (singkat) sebagai bukti.

**6. Pelanggan**
Segmen (siapa, ukuran, kemampuan bayar), kebutuhan dan pekerjaan yang ingin diselesaikan, pemicu membeli, alasan menolak, kebiasaan (kapan, di mana, berapa sering), dan keputusan dipengaruhi siapa. Bila ada peluang wawancara, 5-8 orang per segmen cukup untuk pola awal.

**7. Ukuran pasar (beri rentang dan tulis asumsi)**
- TAM: seluruh kebutuhan. SAM: yang bisa dijangkau dengan model kita. SOM: yang realistis direbut dalam 12 bulan.
- Bottom-up (lebih meyakinkan): jumlah calon pelanggan x frekuensi beli x harga rata-rata, dengan sumber tiap angka.
- Tandai: FAKTA (bersumber), PERKIRAAN (dengan asumsi), OPINI.

**8. Harga**
Kumpulkan rentang harga pasar, tentukan posisi (murah, sepadan, premium), dasar nilai (apa yang membuat pantas), uji sensitivitas (jika harga +/-10%, volume berubah berapa), dan biaya pokok untuk memastikan margin.

**9. Sintesis**
- SWOT berdasarkan fakta (bukan opini).
- Peta posisi 2 sumbu (mis. harga vs kualitas) dan celah yang kosong.
- Kebutuhan yang belum terlayani, dari keluhan berulang.
- Risiko: pesaing merespons, regulasi, ketergantungan pemasok/kanal.

**10. Rekomendasi (berurutan, dengan keyakinan)**

| # | Rekomendasi | Alasan (data) | Keyakinan (tinggi/sedang/rendah) | Data yang masih kurang | Langkah berikutnya |
| --- | --- | --- | --- | --- | --- |

**11. Template laporan** (docs/riset/<topik>.md): ringkasan 5 baris, keputusan dan pertanyaan, metode dan sumber, temuan (kompetitor, pelanggan, pasar, harga), sintesis, rekomendasi, keterbatasan, lampiran data dan tautan.

## Pitfalls

- Mencampur fakta, perkiraan, dan opini; statistik tanpa sumber.
- Hanya melihat pesaing besar dan mengabaikan pengganti/kebiasaan lama.
- Tabel dengan kriteria berbeda tiap pesaing.
- Menyalin klaim pemasaran pesaing sebagai fakta.
- Terlalu banyak data tanpa kesimpulan dan rekomendasi.
- Mengambil data pribadi atau melanggar syarat layanan situs.

## Verification

- Setiap klaim penting punya sumber dan tanggal, atau ditandai perkiraan beserta asumsinya.
- Ada tabel pembanding seragam, tema ulasan, rentang ukuran pasar, dan rekomendasi berprioritas dengan tingkat keyakinan.

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila data pasar tidak bisa diakses)

Jangan berhenti karena belum ada data. Bila sumber tidak bisa diakses atau pengguna belum memberi data, kerjakan riset sebagai **kerangka berisi data ilustrasi**, bukan laporan fakta.
- **Kompetitor ilustrasi** (`data-dummy/riset/kompetitor-DUMMY.csv`): 5 pesaing fiktif (Pesaing A-E) dengan kolom positioning, kisaran harga, segmen, kekuatan, kelemahan, kanal, tanggal cek. Jangan memberi data karangan pada merek nyata.
- **Ulasan pelanggan dummy** 40-60 baris (`bintang, tema, kutipan singkat fiktif`) dengan distribusi realistis (mis. 55% bintang 4-5, 25% bintang 3, 20% bintang 1-2) untuk menunjukkan analisis tema dan frekuensi.
- **Survei dummy** 100 responden (usia, kota, frekuensi beli, anggaran, alasan) dan tabel hasilnya; tulis margin kesalahan dengan rumus agar pembaca tahu batas simpulan.
- **Ukuran pasar:** hitung dengan **asumsi eksplisit** dan rentang (rendah/tengah/tinggi), tandai `ESTIMASI DUMMY`, jangan menyebut angka seolah dari lembaga riset nyata.
- Laporan tetap utuh (ringkasan, temuan, rekomendasi), plus **rencana mengumpulkan data asli**: sumber, metode, jumlah sampel, siapa mengerjakan, perkiraan waktu.

## Pendalaman

**TAM-SAM-SOM dua arah (selalu hitung keduanya, bandingkan):**
- Atas-bawah: populasi target x tingkat adopsi x harga tahunan (setiap faktor punya dasar).
- Bawah-atas: jumlah calon pelanggan yang bisa dijangkau per kanal x konversi realistis x harga. Bila dua hasil berbeda jauh, cari asumsi yang paling goyah.

**Pekerjaan yang ingin diselesaikan (JTBD) untuk wawancara:** "Ceritakan terakhir kali Anda memilih/membeli X. Apa yang terjadi sebelum itu? Apa alternatifnya? Apa yang hampir membuat Anda batal?" Gali kejadian nyata, bukan pendapat; 8-12 wawancara cukup untuk melihat pola.

**Lima kekuatan Porter (ringkas):** ancaman pendatang baru, daya tawar pemasok, daya tawar pembeli, produk pengganti, rivalitas. Beri nilai rendah/sedang/tinggi dengan satu alasan masing-masing; simpulkan menarik atau tidaknya pasar.

**Peta posisi (perceptual map):** pilih dua sumbu yang dipedulikan pelanggan (mis. harga dan kenyamanan), letakkan pesaing dan kita; cari ruang kosong, lalu cek apakah ada permintaan di sana.

**Riset harga Van Westendorp:** empat pertanyaan (terlalu murah sampai meragukan, murah, mahal, terlalu mahal); titik potong kurva memberi rentang harga yang dapat diterima. Dengan dummy, tunjukkan cara membaca grafik saja.

**Model Kano untuk prioritas fitur:** wajib, kinerja, pemikat; fitur wajib yang hilang menghancurkan kepuasan, pemikat memberi pembeda murah.

**Segmentasi RFM (bila ada data transaksi):** recency, frequency, monetary diberi skor 1-5; segmen juara, setia, berisiko, tidur; tiap segmen diberi tindakan.

**Ukuran sampel survei:** n = z^2 x p(1-p) / e^2; untuk tingkat keyakinan 95% (z = 1,96), p = 0,5, galat 10% butuh ~97 responden. Tulis galatnya di setiap temuan.

**Triangulasi:** setiap temuan penting didukung minimal dua jenis bukti (mis. ulasan + wawancara + data harga). Temuan satu sumber diberi label "indikasi".

**Mutu hasil:** keputusan yang dibantu jelas di bagian atas, setiap angka ada sumber atau label dummy/estimasi dengan asumsinya, kompetitor dibandingkan dengan kriteria yang sama dan tanggal cek, rekomendasi berurutan dengan tingkat keyakinan.
