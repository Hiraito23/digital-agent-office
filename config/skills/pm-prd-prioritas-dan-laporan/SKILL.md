---
name: pm-prd-prioritas-dan-laporan
description: "Template PRD, user story Given/When/Then, prioritas MoSCoW/RICE, Definition of Done, dan format laporan."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [product, prd, user-story, prioritas]
---

# PRD, Prioritas, dan Laporan

## When to Use

- Mengubah ide menjadi PRD dan tugas per peran.
- Memprioritaskan fitur, menyusun rilis, atau melaporkan progres.

## Procedure

**1. Template PRD** (simpan di docs/prd/<fitur>.md)

```
# <Nama fitur>
## Latar belakang & masalah      (siapa mengalami apa, buktinya, dampaknya)
## Tujuan & metrik sukses        (angka target dan cara mengukurnya; tandai bila asumsi)
## Ruang lingkup                 In: ... | Out: ... (yang sengaja tidak dikerjakan)
## Persona & skenario utama
## User stories & acceptance criteria
## Kebutuhan non-fungsional      (performa, keamanan, aksesibilitas, audit)
## Edge case & error
## Risiko & dependensi
## Pertanyaan terbuka
```

**2. User story yang baik (INVEST)**

```
Sebagai <peran>, saya ingin <tujuan>, agar <manfaat>.
Acceptance criteria:
- Given <kondisi awal>, When <aksi>, Then <hasil yang bisa diamati>.
- Given input tidak valid, When disimpan, Then tampil pesan error di field terkait dan data tidak tersimpan.
```
Satu story cukup kecil untuk selesai dalam satu iterasi; setiap kriteria harus bisa diuji Takumi.

**3. Prioritas.** MoSCoW (Must/Should/Could/Won't) untuk lingkup rilis; RICE untuk mengurutkan: skor = (Reach x Impact x Confidence) / Effort. Tampilkan tabel dan alasan; Effort dari estimasi tim, bukan tebakan sendiri.

**4. Pembagian tugas**

| Tugas | Pemilik | Bergantung pada | Keluaran |
| --- | --- | --- | --- |
| Alur dan desain | Sakura | PRD | wireframe, tokens |
| Kontrak API + skema | Kenji, Daichi | PRD | kontrak, migrasi |
| Frontend | Haruto | desain, kontrak | UI + tes |
| QA | Takumi | implementasi | hasil tes |
| Security | Akane | implementasi | laporan |

**5. Definition of Done:** acceptance criteria terpenuhi; QA lulus; tidak ada temuan security Critical/High terbuka; dokumentasi dan catatan rilis diperbarui; dapat diuji di staging.

**6. Laporan progres**

```
Selesai: ...
Sedang dikerjakan: ... (pemilik, perkiraan)
Terhambat: ... (penyebab, bantuan yang dibutuhkan)
Keputusan yang dibutuhkan: ...
Risiko: ...
```

## Pitfalls

- Fitur tanpa metrik atau tanpa batas ruang lingkup.
- Acceptance criteria yang samar ("mudah dipakai") sehingga tidak bisa diuji.
- Mengarang angka, tanggal, atau data pengguna.
- Memasukkan semua ke satu rilis; tidak memotong ke irisan MVP.

## Verification

- Setiap story punya kriteria Given/When/Then yang bisa diuji.
- Asumsi dan pertanyaan terbuka tercatat; dependensi antar-peran jelas; PRD tersimpan di docs/prd/.
