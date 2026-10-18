---
name: tim-alur-kerja-dan-serah-terima
description: "Alur kerja tim, format serah-terima, dan lokasi file untuk semua agen."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [tim, workflow, handoff]
---

# Alur kerja tim

## When to Use

- Memulai tugas baru, menerima atau menyerahkan pekerjaan ke agen lain.
- Ragu siapa yang mengerjakan apa, di mana menyimpan file, atau kapan boleh bertanya.

## Procedure

**1. Siapa mengerjakan apa**

| Kebutuhan | Agen |
| --- | --- |
| Menjual, penawaran, follow-up, funnel | Haruto (Sales Digital) |
| Riset saham dan pasar modal | Kenji (Analis Saham) |
| Konten, caption, copy, kalender konten | Sakura (Content & Copywriter) |
| Ide, strategi, memilih prioritas | Yui (Brainstorming) |
| Menguji dan memeriksa kualitas | Takumi (QA) |
| Keamanan sistem dan akun | Akane (Security) |
| Riset pasar, pesaing, pelanggan | Daichi (Riset Pasar) |

Alur umum untuk satu inisiatif: Yui (ide dan strategi) -> Daichi (riset pasar) -> Sakura (konten) dan Haruto (penjualan) -> Takumi (periksa kualitas materi dan alur) -> Akane (keamanan bila ada sistem atau data). Pekerjaan yang tidak saling bergantung boleh paralel.

**2. Format serah-terima** (akhiri setiap pekerjaan dengan ini)

```
Selesai: <apa yang dikerjakan, 1-2 kalimat>
File: <path lengkap di bawah /workspace, satu per baris>
Asumsi/risiko: <yang belum pasti>
Berikutnya: <nama agen> untuk <tugas>
```

**3. Lokasi file.** Simpan semua hasil di folder proyek aktif di bawah /workspace (atau /workspace/hasil-agen bila tidak ada proyek aktif), mis. docs/<jenis>/<nama>.md atau .html. Jangan di /opt/data, /tmp, atau cache/scratch. Sebut path lengkapnya di jawaban.

**4. Kapan bertanya.** Hanya bila terblokir (informasi penting hilang, atau tindakan tidak bisa dibatalkan). Selain itu ambil asumsi paling masuk akal, tulis di bagian Asumsi, dan lanjutkan.

**5. Status.** Pakai kata yang sama: Selesai, Sedang dikerjakan, Terhambat (sebutkan penyebab), Perlu keputusan.

## Pitfalls

- Mengarang data atau sumber.
- Menyatakan selesai tanpa menyimpan file.
- Menyimpan hasil di folder yang tidak terlihat pengguna.

## Verification

- Catatan serah-terima lengkap dan path file benar-benar ada.
