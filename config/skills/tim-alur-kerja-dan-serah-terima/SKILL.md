---
name: tim-alur-kerja-dan-serah-terima
description: "Alur kerja tim, pembagian peran, format brief dan serah-terima, lokasi file, standar dokumen, dan kapan bertanya."
version: 2.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [tim, workflow, handoff, dokumen]
---

# Alur Kerja Tim dan Serah-terima

## When to Use

- Memulai tugas, menerima atau menyerahkan pekerjaan ke agen lain, ragu siapa mengerjakan apa, di mana menyimpan file, atau kapan boleh bertanya.

## Procedure

**1. Siapa mengerjakan apa**

| Kebutuhan | Agen | Keluaran khas | Folder |
| --- | --- | --- | --- |
| Menjual, penawaran, follow-up, funnel | Haruto (Sales Digital) | skrip, penawaran, pipeline | docs/sales/ |
| Riset saham dan pasar modal | Kenji (Analis Saham) | laporan emiten/sektor | docs/riset-saham/ |
| Konten, caption, copy, kalender | Sakura (Content & Copywriter) | draf konten, kalender | docs/konten/ |
| Ide, strategi, prioritas | Yui (Brainstorming) | daftar ide, penilaian, rencana | docs/brainstorm/ |
| Menguji dan memeriksa kualitas | Takumi (QA) | test plan, laporan bug, verdict | docs/qa/ |
| Keamanan sistem dan akun | Akane (Security) | laporan temuan | docs/security/ |
| Riset pasar, pesaing, pelanggan | Daichi (Riset Pasar) | laporan riset | docs/riset/ |

**2. Alur umum satu inisiatif**
Yui (tantangan, ide, prioritas) -> Daichi (fakta pasar, pesaing, pelanggan) -> Sakura (konten) dan Haruto (penjualan) secara paralel -> Takumi (periksa kualitas materi dan alur: konsistensi angka, klaim, tautan, kejelasan) -> Akane (bila ada sistem, akun, atau data pelanggan) -> kembali ke Yui untuk rangkuman keputusan. Pekerjaan yang tidak saling bergantung boleh paralel; yang bergantung menunggu keluaran sebelumnya.

**3. Brief tugas yang baik (saat memberi atau menerima)**

```
Tujuan: apa hasil akhirnya dan untuk keputusan apa
Konteks: produk/proyek, audiens, batasan, yang sudah ada
Keluaran: format, panjang, nama file
Kriteria selesai: bagaimana kita tahu sudah baik
Tenggat dan prioritas
```
Bila ada bagian yang kurang, ajukan maksimal 3 pertanyaan paling menentukan. Selain itu buat asumsi, tandai, dan jalan terus.

**4. Format serah-terima (akhiri setiap pekerjaan)**

```
Selesai: <apa yang dikerjakan, 1-2 kalimat>
File: <path lengkap di bawah /workspace, satu per baris>
Ringkasan temuan/isi: <3-5 poin>
Asumsi dan risiko: <yang belum pasti>
Berikutnya: <nama agen> untuk <tugas>
```

**5. Standar dokumen**
Judul jelas; ringkasan di atas (3-5 baris); isi dengan subjudul dan tabel bila perbandingan; sumber dan tanggal data; asumsi dan keterbatasan di akhir; Bahasa Indonesia sederhana, kalimat pendek, istilah asing dijelaskan sekali. Dokumen yang akan dibaca pengambil keputusan harus bisa dipahami dalam 2 menit dari bagian ringkasannya.

**6. Lokasi file.** Simpan di folder proyek aktif di bawah /workspace (atau /workspace/hasil-agen bila tidak ada proyek), di subfolder pada tabel di atas, dengan tool write_file atau perintah terminal. Nama file huruf kecil, kata dipisah tanda hubung, tanpa spasi, misalnya riset-pesaing-kopi.md. Jangan menimpa file yang sudah ada tanpa konfirmasi; beri sufiks -v2. Jangan menulis di /opt/data, /tmp, atau cache/scratch. Sebut path lengkapnya di jawaban dan pastikan file benar-benar ada.

**7. Kapan bertanya.** Hanya bila terblokir (informasi penting hilang dan tidak bisa diasumsikan, atau tindakan tidak bisa dibatalkan). Selain itu buat asumsi paling masuk akal, tulis di bagian Asumsi, dan lanjutkan.

**8. Status.** Pakai kata yang sama: Selesai, Sedang dikerjakan, Terhambat (sebutkan penyebab dan siapa yang bisa membantu), Perlu keputusan (sebutkan opsi dan rekomendasi).

**9. Kejujuran kerja**
Jangan mengarang data, sumber, atau kutipan. Bedakan FAKTA, PERKIRAAN, dan OPINI. Katakan "belum diuji" atau "datanya belum ada" bila memang begitu. Jangan mengaku sudah menyimpan, menguji, atau mengirim sesuatu yang belum.

**10. Batas tindakan.** Agen menyiapkan draf, analisis, dan rencana. Mengirim pesan ke orang lain, memposting, membayar, atau bertransaksi dilakukan pengguna sendiri.

## Pitfalls

- Mengarang data atau sumber; menyatakan selesai tanpa menyimpan file.
- Menyimpan hasil di folder yang tidak terlihat pengguna.
- Mengubah ruang lingkup tanpa memberi tahu agen yang bergantung.
- Pertanyaan berlebihan yang menghentikan pekerjaan.
- Dokumen panjang tanpa ringkasan.

## Verification

- Catatan serah-terima lengkap dan path file benar-benar ada.
- Ringkasan di atas dokumen cukup untuk memahami hasilnya; asumsi dan sumber tercatat.
