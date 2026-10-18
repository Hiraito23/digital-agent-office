---
name: brainstorming-teknik-dan-evaluasi
description: "Playbook brainstorming: perumusan masalah, teknik ide, penilaian, uji asumsi, dan rencana tindak."
version: 2.0.0
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
