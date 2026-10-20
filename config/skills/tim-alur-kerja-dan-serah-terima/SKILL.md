---
name: tim-alur-kerja-dan-serah-terima
description: "Alur kerja tim, pembagian peran, format brief dan serah-terima, lokasi file, standar dokumen, dan kapan bertanya."
version: 3.0.0
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
| Desain UI/UX, wireframe, prototipe, handoff ke dev | Mio (UI/UX) | wireframe, prototipe HTML, skrip uji pengguna, handoff | docs/design/ |

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

**6. Lokasi file.** Simpan di folder proyek aktif di bawah /workspace (atau /workspace/hasil-agen bila tidak ada proyek), di subfolder pada tabel di atas, dengan tool write_file atau perintah terminal. Nama file huruf kecil, kata dipisah tanda hubung, tanpa spasi, misalnya riset-pesaing-kopi.md. Bila permintaan menyebut path, nama berkas, atau format tertentu (mis. satu berkas .html, atau folder proyek sendiri), path dan format dari permintaan itu menang atas tabel di atas; bila beberapa berkas dihasilkan, sebut semuanya dan buat folder yang belum ada. Jangan menimpa file yang sudah ada tanpa konfirmasi; beri sufiks -v2. Jangan menulis di /opt/data, /tmp, atau cache/scratch. Bila instruksi meminta berkas ringkasan di `rapat/<tanggal>-<judul>.md`, isi berkas itu dengan hasil kerja (Selesai, File, Asumsi/risiko, Berikutnya) dan tetap simpan deliverable di path yang diminta; tulis berkas rapat paling akhir, setelah hasilnya diperiksa. Sebut path lengkapnya di jawaban dan pastikan file benar-benar ada.

**7. Kapan bertanya.** Hanya bila terblokir (informasi penting hilang dan tidak bisa diasumsikan, atau tindakan tidak bisa dibatalkan). Selain itu buat asumsi paling masuk akal, tulis di bagian Asumsi, dan lanjutkan.

**8. Status.** Pakai kata yang sama: Selesai, Sedang dikerjakan, Terhambat (sebutkan penyebab dan siapa yang bisa membantu), Perlu keputusan (sebutkan opsi dan rekomendasi).

**9. Kejujuran kerja**
Jangan mengarang data, sumber, atau kutipan. Bedakan FAKTA, PERKIRAAN, dan OPINI. Katakan "belum diuji" atau "datanya belum ada" bila memang begitu. Jangan mengaku sudah menyimpan, menguji, atau mengirim sesuatu yang belum.

**10. Batas tindakan.** Agen menyiapkan draf, analisis, dan rencana. Mengirim pesan ke orang lain, memposting, membayar, atau bertransaksi dilakukan pengguna sendiri.

**11. Folder bersama dengan agen lain (permintaan yang sama bisa dikerjakan paralel)**
1. Sebelum menulis ke folder deliverable, daftar isinya dengan waktu ubah: `find <folder> -type f -printf '%p %s %TT\n' | sort`.
2. Bila `write_file` menolak karena berkas diubah agen lain, jangan timpa dan jangan menulis ulang dengan nama lain: tunggu sampai ukuran/waktu ubah berhenti berubah (loop `sleep 20` dengan daftar yang sama), lalu `read_file` semua berkasnya. Menimpa membuang pekerjaan agen lain dan membuat dua versi saling bertabrakan.
3. Periksa hasil mereka dengan bukti (jalankan di peramban, hitung ulang angka, cek aturan wajib dari rapat), lalu tulis hanya yang belum ada (handoff, ringkasan rapat, perbaikan kecil lewat `patch`). Jangan menyusun ulang berkas orang lain agar "jadi milik sendiri".
4. Di laporan akhir katakan berkas mana ditulis agen lain dan apa yang Anda verifikasi atau tambahkan; jangan mengklaim kepengarangan atas apa yang tidak Anda tulis.
5. Jangan meninggalkan berkas bantu (skrip hitung, tangkapan layar, server uji) di folder deliverable; hapus atau hentikan sebelum menutup.

## Pitfalls

- Mengarang data atau sumber; menyatakan selesai tanpa menyimpan file.
- Menyimpan hasil di folder yang tidak terlihat pengguna.
- Mengubah ruang lingkup tanpa memberi tahu agen yang bergantung.
- Pertanyaan berlebihan yang menghentikan pekerjaan.
- Dokumen panjang tanpa ringkasan.

## Verification

- Catatan serah-terima lengkap dan path file benar-benar ada.
- Ringkasan di atas dokumen cukup untuk memahami hasilnya; asumsi dan sumber tercatat.

<!-- skill-v3: dummy, pendalaman -->
## Aturan Data Dummy (berlaku untuk semua agen)

**Prinsip: jangan menunggu data.** Bila data, berkas, akses, atau angka yang dibutuhkan belum ada dan tidak bisa dicari sendiri, jangan berhenti dan jangan hanya bertanya. Buat data dummy yang realistis, kerjakan hasilnya sampai selesai, lalu serahkan dengan label yang jelas. Pengguna lebih terbantu menerima hasil lengkap yang tinggal diganti datanya daripada pertanyaan balik.

**Kapan memakai dummy:** brief tanpa data (tidak ada daftar pelanggan, laporan keuangan, ulasan, log, API, desain, dll.), sumber tidak bisa diakses, atau data nyata belum boleh dipakai. **Kapan tetap bertanya:** hanya bila benar-benar terblokir (butuh kredensial, izin, atau keputusan yang tidak bisa dibatalkan), dan tetap kerjakan bagian yang bisa jalan dengan dummy sambil menunggu jawaban.

**Cara membuat dummy yang baik**
1. Simpan di `data-dummy/<topik>/` pada folder proyek (atau `/workspace/hasil-agen/data-dummy/<topik>/`): `README.md` (apa isinya, asumsi, cara mengganti dengan data asli), data (CSV/JSON/MD), dan skrip pembuat `buat-dummy.py` (atau .js) dengan **seed tetap** supaya hasilnya bisa diulang.
2. Realistis dan konsisten: distribusi masuk akal (bukan semua angka bulat), hubungan antar kolom benar (total = jumlah, tanggal berurutan, laba = pendapatan - biaya), campuran kasus normal, tepi (batas), dan buruk (kosong, terlalu panjang, salah format).
3. Beri label di mana-mana: kata **DUMMY** atau **CONTOH** di nama folder, judul dokumen, kolom/komentar, dan banner pertama dokumen hasil: `⚠ Memakai data DUMMY, ganti sebelum dipakai untuk keputusan nyata.`
4. Buat hasil mudah diganti: satu berkas data atau satu konfigurasi sumber; kode/dokumen membaca dari sana, bukan angka yang tertanam di banyak tempat.
5. Data pribadi dummy harus jelas palsu: nama fiktif, email `nama@example.com`, telepon `0800-000-0000`-an, alamat generik. Jangan memakai data orang atau perusahaan nyata.

**Batas keras (dummy tidak boleh menipu)**
- Dummy untuk struktur, simulasi, dan contoh angka, bukan untuk fakta. Jangan menyebut sumber, kutipan, testimoni, harga pasar, atau statistik "nyata" yang kamu karang. Fakta eksternal diberi rentang dan label "ilustrasi/asumsi", atau diganti placeholder `[DATA ASLI DIBUTUHKAN: ...]`.
- Jangan menyimpulkan keputusan nyata (investasi, hukum, medis, keuangan) dari dummy; sebut bahwa kesimpulan hanya mendemonstrasikan metode.
- Dummy tidak dikirim ke orang lain atau dipublikasikan sebagai asli.

**Serah-terima** tambahkan satu baris di format serah-terima: `Data: ASLI / DUMMY / CAMPURAN, yang perlu diganti: <daftar>, cara mengganti: <langkah singkat, path berkas>`.

**Generator dummy minimal (Python, tanpa pustaka tambahan)**

```python
import csv, random
random.seed(42)                      # seed tetap = hasil bisa diulang
nama = ["Ayu", "Bima", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hadi"]
kota = ["Jakarta", "Bandung", "Surabaya", "Medan", "Yogyakarta", "Makassar"]
with open("pelanggan-DUMMY.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "nama", "kota", "email", "nilai_order_rp"])
    for i in range(1, 51):
        n = random.choice(nama)
        w.writerow([i, f"{n} Contoh {i}", random.choice(kota), f"{n.lower()}{i}@example.com", random.randint(5, 80) * 10000])
```

**Template README dummy**

```
# Data DUMMY: <topik>
Dibuat: <tanggal>   Dibuat oleh: <agen>   Seed: 42
Isi: <berkas dan kolom>
Asumsi: <distribusi, rentang, aturan>
Yang BUKAN fakta: semua angka dan nama di sini fiktif.
Cara mengganti dengan data asli: <letakkan berkas asli di ... lalu jalankan ...>
```

## Pendalaman: koordinasi tim

- **Definisi siap dikerjakan:** tujuan jelas, keluaran dan format disebut, data tersedia atau diganti dummy, tenggat dan prioritas ada. Bila satu saja kurang, isi dengan asumsi atau dummy, jangan berhenti.
- **Kontrak antar agen:** pemberi tugas menyebut path masukan dan format keluaran; penerima menyerahkan berkas bernama stabil sehingga agen berikutnya tidak menebak. Saat menerima keluaran agen lain, baca dulu bagian Asumsi dan label Data (ASLI/DUMMY) sebelum memakainya.
- **Pemeriksaan silang:** keluaran yang dipakai orang lain dicek satu orang selain pembuatnya (QA untuk materi dan alur; Security untuk sistem dan data pelanggan).
- **Catatan keputusan:** keputusan penting ditulis satu baris (apa, kenapa, siapa, tanggal) di bagian atas dokumen agar tidak diperdebatkan ulang.
- **Eskalasi:** terhambat lebih dari satu langkah dan tidak ada dummy yang masuk akal: sebut apa yang dibutuhkan, siapa yang bisa menyediakan, dan apa yang sudah dikerjakan sementara.
- **Penutupan:** sebelum menyatakan selesai, buka kembali berkas yang disimpan, pastikan ada dan terbaca, hitung ulang angka kunci, dan cocokkan dengan ringkasan di chat.
