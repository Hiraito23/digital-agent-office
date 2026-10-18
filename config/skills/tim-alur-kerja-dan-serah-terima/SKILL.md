---
name: tim-alur-kerja-dan-serah-terima
description: "Alur kerja tim, format serah-terima, lokasi file, dan aturan git untuk semua agen."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [tim, workflow, handoff, git]
---

# Alur Kerja Tim dan Serah-terima

## When to Use

- Memulai tugas baru, menerima atau menyerahkan pekerjaan ke agen lain.
- Ragu siapa yang mengerjakan apa, di mana menyimpan file, atau kapan boleh bertanya.

## Procedure

**1. Urutan kerja satu fitur**

| Tahap | Pemilik | Keluaran | Disimpan di |
| --- | --- | --- | --- |
| Kebutuhan | Yui | PRD + acceptance criteria | docs/prd/ |
| Alur dan desain | Sakura | wireframe, tokens, handoff | docs/design/ |
| Kontrak API + skema | Kenji + Daichi | kontrak, migrasi, ERD | docs/api/, backend/ |
| Implementasi | Kenji (backend), Haruto (frontend) | kode + tes unit | folder proyek |
| QA | Takumi | test plan, hasil tes, laporan bug | docs/qa/, tes di test/ |
| Security | Akane | laporan temuan | docs/security/ |
| Penutupan | Yui | status Selesai vs Definition of Done | docs/prd/ |

Pekerjaan yang tidak saling bergantung boleh paralel (mis. desain dan skema). Frontend menunggu kontrak API, QA menunggu implementasi.

**2. Format serah-terima** (akhiri setiap pekerjaan dengan ini)

```
Selesai: <apa yang dikerjakan, 1-2 kalimat>
File: <path lengkap di bawah /workspace, satu per baris>
Cara uji: <perintah atau langkah, hasil yang diharapkan>
Asumsi/risiko: <yang belum pasti>
Berikutnya: <nama agen> untuk <tugas>
```

**3. Lokasi file.** Simpan semua hasil di folder proyek aktif di bawah /workspace (atau /workspace/hasil-agen bila tidak ada proyek aktif). Jangan di /opt/data, /tmp, atau cache/scratch. Sebut path lengkapnya di jawaban.

**4. Aturan git.** Cek `git status` dan branch dulu. Kerja di satu branch bersama `agent/<nama-tugas>`. Jangan commit atau push ke main/master/develop, jangan force push, push hanya bila pengguna meminta. Commit kecil dengan pesan jelas.

**5. Kapan bertanya.** Hanya bila terblokir (informasi penting hilang, atau tindakan merusak/tidak bisa dibatalkan). Selain itu ambil asumsi paling masuk akal, tulis di bagian Asumsi, dan lanjutkan.

**6. Status.** Pakai kata yang sama: Selesai, Sedang dikerjakan, Terhambat (sebutkan penyebab dan siapa yang bisa membantu), Perlu keputusan.

## Pitfalls

- Mengubah kontrak API atau skema tanpa memberi tahu agen yang bergantung.
- Menyatakan selesai tanpa menjalankan tes atau build.
- Menyimpan hasil di folder yang tidak terlihat pengguna.
- Melebar ke fitur di luar PRD.

## Verification

- Catatan serah-terima lengkap dan path file benar-benar ada (`ls`).
- Perintah uji yang ditulis sudah dijalankan dan hasilnya sesuai.
