---
name: brainstorming-teknik-dan-evaluasi
description: "Playbook brainstorming: perumusan masalah, teknik ide, penilaian, uji asumsi, dan rencana tindak."
version: 3.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [brainstorming, strategi, ide, evaluasi]
---

# Playbook Brainstorming dan Strategi

## When to Use

- Mencari ide produk, fitur, kampanye, nama, model bisnis, atau solusi masalah; memilih prioritas; menyusun strategi dari tujuan yang masih kabur.

## Procedure

**1. Rumuskan masalah (sebelum ide)**
- Pernyataan: "Bagaimana kita bisa <hasil yang diinginkan> untuk <siapa> dengan <batasan>?"
- Tulis ulang dengan 2 cara berbeda (lebih luas dan lebih sempit) lalu pilih yang paling berguna.
- Lima mengapa: tanyakan "mengapa" lima kali untuk menemukan akar, bukan gejala.
- Tanyakan maksimal 3 hal yang menentukan: tujuan dan ukuran sukses, batasan (waktu, biaya, sumber daya), serta apa yang sudah dicoba.

**2. Peta situasi (singkat)**
Pengguna dan kebutuhan, pesaing atau alternatif, aset yang dimiliki, kendala keras, dan asumsi yang belum diuji.

**3. Diverge: hasilkan ide tanpa menilai (minimal 15, targetkan 25)**

| Teknik | Cara memakainya |
| --- | --- |
| SCAMPER | Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse |
| Analogi | Bagaimana industri lain (maskapai, game, rumah sakit) menyelesaikan masalah serupa? |
| Membalik | Bagaimana membuat masalah ini lebih buruk? Lalu balikkan |
| Tanpa batasan | Bila waktu dan dana tak terbatas? Bila hanya 1 hari dan Rp0? |
| Pengguna ekstrem | Pemula total, pakar, yang paling hemat, yang paling sibuk |
| 6 topi berpikir | fakta, perasaan, manfaat, risiko, kreatif, proses |
| Jobs to be done | Pekerjaan apa yang "disewa" pengguna dari produk ini? |

Pisahkan ide AMAN (mudah, hasil pasti), BERANI (berisiko, hasil besar), dan GILA (aneh, mungkin memicu ide baru). Jangan hanya memberi yang aman.

**4. Kelompokkan**
Gabungkan ide yang mirip ke 4-6 tema, beri nama tema, buang duplikat, dan catat ide gabungan yang lebih kuat dari bagian-bagiannya.

**5. Converge: nilai dengan kriteria tertulis**

| Kriteria | Bobot (contoh) | Skor 1-5 |
| --- | --- | --- |
| Dampak pada tujuan | 30% | |
| Kemudahan/kecepatan | 20% | |
| Biaya rendah | 15% | |
| Risiko rendah | 15% | |
| Kecocokan dengan aset/keunggulan | 10% | |
| Kebaruan/pembeda | 10% | |

Total = jumlah(skor x bobot). Sesuaikan bobot dengan tujuan pengguna dan tulis alasannya. Alternatif cepat: matriks dampak vs usaha (kuadran "menang cepat", "proyek besar", "tambahan", "hindari").

**6. Pilih tiga teratas dan tantang**
Untuk tiap ide: premortem ("bayangkan 6 bulan lagi gagal, apa penyebabnya?"), kritik terkuat, dan siapa yang akan menolaknya. Sertakan pandangan peran lain: sales (apakah laku?), konten (bisa diceritakan?), riset (apa datanya?), QA (apa yang bisa rusak?), security (apa risikonya?).

**7. Uji asumsi (eksperimen termurah)**

| Asumsi terbesar | Eksperimen | Biaya/waktu | Tanda berhasil | Tanda berhenti |
| --- | --- | --- | --- | --- |
| "Orang mau bayar Rp X" | halaman pra-pesan | 2 hari | 20 pra-pesan | < 5 dalam seminggu |

Contoh eksperimen: wawancara 10 calon pengguna, halaman uji dengan tombol daftar, iklan kecil, prototipe kertas, pesan manual (concierge), survei 2 pertanyaan.

**8. Rencana tindak (tabel)**
`Langkah | Penanggung jawab | Perkiraan usaha | Keluaran | Tenggat | Dependensi`
Tulis keputusan yang dibutuhkan dari pengguna dan batas waktu keputusannya.

**9. Format keluaran satu halaman (docs/brainstorm/<topik>.md)**
```
Tantangan (1 kalimat) | Ukuran sukses
Rekomendasi utama (3 baris) dan alasannya
Tiga ide teratas + skor + risiko + eksperimen pertama
Rencana 2 minggu
Pertanyaan terbuka dan keputusan yang dibutuhkan
Lampiran: semua ide per tema, tabel penilaian, asumsi
```

## Pitfalls

- Menilai sambil menghasilkan ide (mematikan ide aneh yang sering jadi inspirasi).
- Menyetujui semua usulan pengguna tanpa menantang asumsinya.
- Daftar panjang tanpa rekomendasi tegas.
- Ide yang tidak bisa diuji atau tidak punya langkah pertama.
- Mencampur masalah dengan solusi di rumusan tantangan.

## Verification

- Ada rumusan masalah, minimal 15 ide dengan tema, tabel penilaian berbobot, tiga pilihan teratas dengan risiko, eksperimen berbatas waktu, dan satu rekomendasi tegas.

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila konteks atau data belum ada)

Jangan menunggu data lengkap sebelum bertukar pikiran. Bila masalah, pasar, atau angka belum diberikan:
- **Skenario ilustrasi:** tulis satu skenario pendek yang masuk akal (siapa, masalah, batasan, anggaran, waktu) dan tandai `SKENARIO DUMMY`. Bila pengguna sudah memberi sebagian konteks, lengkapi sisanya dengan asumsi bertanda, jangan mengganti yang sudah diberikan.
- **Data penilaian dummy:** isi tabel penilaian ide dengan skor 1-5 beserta alasan satu kalimat per skor, lalu tandai bahwa skor adalah penilaian awal yang harus diuji. Beri angka dampak/usaha perkiraan dengan rentang (mis. dampak 100-300 pelanggan baru) dan tulis dasar asumsinya.
- **Data uji asumsi dummy:** rancang eksperimen lengkap (hipotesis, metrik, sampel, ambang lolos) dan sertakan contoh hasil DUMMY untuk menunjukkan cara membacanya, jelas berlabel.
- Hasil tetap utuh: rumusan masalah, 25 ide, pengelompokan, penilaian, tiga teratas yang ditantang, eksperimen, rencana tindak. Tutup dengan daftar "fakta yang perlu dikonfirmasi sebelum memutuskan".

## Pendalaman

**Teknik pemicu ide (pakai minimal tiga yang berbeda):**
- SCAMPER: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse; tanyakan tiap huruf pada produk, proses, atau pesan.
- Brainstorming terbalik: "bagaimana membuat masalah ini lebih buruk?", lalu balik tiap jawaban jadi ide.
- Analogi: bagaimana industri lain (logistik, game, kesehatan) menyelesaikan masalah serupa?
- Batasan ekstrem: "bila anggaran nol", "bila harus selesai besok", "bila pelanggan 100x lebih banyak".
- Enam topi berpikir untuk penilaian akhir: fakta, perasaan, kehati-hatian, manfaat, kreativitas, proses.

**Pra-mortem:** bayangkan proyek gagal total enam bulan lagi; tulis 8 penyebab paling mungkin, beri peluang dan dampak, lalu tambahkan pencegahan ke rencana tindak.

**Skor RICE** untuk memprioritaskan: Reach (berapa orang per periode) x Impact (0,25 / 0,5 / 1 / 2 / 3) x Confidence (%) / Effort (orang-minggu). Tulis tiap angka dengan dasar. Bandingkan hasil RICE dengan firasat; selisih besar = ada asumsi yang belum diungkap.

**Peta asumsi:** daftar asumsi, nilai dua sumbu (seberapa penting, seberapa belum terbukti). Uji dulu yang penting dan paling belum terbukti, dengan eksperimen termurah (wawancara 5 orang, halaman pendaftaran palsu, prototipe kertas, pre-order).

**Pohon peluang-solusi:** tujuan bisnis -> peluang (kebutuhan pelanggan) -> solusi -> eksperimen. Pastikan tiap solusi terhubung ke peluang yang nyata.

**Memo keputusan satu halaman:** keputusan yang diminta, opsi (2-4), kriteria dan skor, rekomendasi dengan alasan, risiko terbesar dan cara memantaunya, **kriteria berhenti** (angka atau kejadian yang membuat kita membatalkan), pemilik keputusan, tanggal tinjau.

**Mutu hasil:** ide tidak dinilai saat diverge; penilaian memakai kriteria tertulis; ada tiga teratas dengan tantangan terhadapnya; eksperimen punya ambang lolos; rencana tindak punya pemilik dan tanggal; semua data dummy berlabel.
