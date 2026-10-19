---
name: uiux-riset-desain-dan-handoff
description: "Playbook UI/UX: memahami pengguna, alur dan arsitektur informasi, wireframe teks, sistem desain, aksesibilitas, review heuristik, copy antarmuka, dan handoff ke developer."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [ui, ux, desain, aksesibilitas, handoff]
---

# Playbook UI/UX

## When to Use

- Merancang atau memperbaiki alur dan tampilan produk (web, aplikasi, dashboard, landing page, email); mereview desain yang sudah ada; menyusun sistem desain; menulis spesifikasi untuk Frontend Dev.

## Procedure

**1. Pahami masalah sebelum bentuk**
Tulis dalam lima baris: siapa penggunanya, tugas utama (job to be done), konteks pakai (perangkat, waktu, gangguan), ukuran keberhasilan (mis. waktu selesai, jumlah klik, tingkat error), dan batasan (teknologi, brand, tenggat). Bila belum ada data pengguna, tulis persona ringan dan tandai sebagai ASUMSI yang perlu diuji.

**2. Alur dan arsitektur informasi**
- Petakan alur utama (happy path) dulu, lalu cabang: error, kosong, batal, izin ditolak, koneksi putus.
- Kurangi langkah: setiap layar punya satu tujuan dan satu aksi utama.
- Beri nama menu dengan bahasa pengguna, bukan istilah internal. Uji dengan card sorting sederhana bila menunya banyak.
- Tulis alur sebagai daftar bernomor atau diagram teks: `Layar A --[aksi]--> Layar B`.

**3. Wireframe dan spesifikasi layar (teks)**
Per layar tulis: tujuan, blok dari atas ke bawah (header, konten, aksi), isi tiap blok, urutan prioritas visual, dan perilaku di 360, 768, 1280 px. Gunakan grid 4/8 px dan maksimal 2 level penekanan utama per layar.

**4. Status antarmuka yang wajib ada**
Normal, memuat (skeleton atau spinner dengan batas waktu), kosong (jelaskan + ajak bertindak), error (apa yang salah + cara memperbaiki), sukses, nonaktif, hover, fokus, aktif, dan data sangat panjang atau sangat sedikit. Desain yang hanya punya status normal belum selesai.

**5. Sistem desain minimum**
- Token: warna (primer, sekunder, netral, semantik: sukses/peringatan/bahaya), tipografi (skala 12/14/16/20/24/32), jarak (4, 8, 12, 16, 24, 32), radius, bayangan.
- Komponen inti: tombol (primer, sekunder, bahaya, teks), input, select, checkbox/radio, kartu, tabel, modal, toast, tab, navigasi, badge. Tulis varian dan status tiap komponen.
- Satu komponen untuk satu fungsi; jangan membuat varian baru bila yang ada cukup.

**6. Aksesibilitas (WCAG 2.1 AA) sebagai syarat, bukan tambahan**
- Kontras teks >= 4.5:1 (teks besar >= 3:1), komponen UI >= 3:1.
- Semua fungsi bisa lewat keyboard, urutan fokus logis, fokus terlihat.
- Target sentuh >= 44x44 px; warna bukan satu-satunya penanda (tambah ikon/teks).
- Label form terlihat (bukan hanya placeholder); error dikaitkan ke field-nya.
- Hormati `prefers-reduced-motion`; animasi 150-300 ms, tidak berkedip lebih dari 3 kali per detik.

**7. Review heuristik (Nielsen) dengan tingkat keparahan**
Periksa: visibilitas status sistem, kecocokan dengan dunia nyata, kontrol dan kebebasan pengguna (undo, batal), konsistensi, pencegahan error, mengenali lebih baik daripada mengingat, fleksibilitas, desain minimalis, bantuan pesan error, dokumentasi. Beri severity 0-4 dan usulan perbaikan konkret per temuan.

**8. Copy antarmuka (microcopy)**
Tombol = kata kerja spesifik ("Simpan perubahan", bukan "OK"). Error = apa yang terjadi + cara memperbaiki, tanpa menyalahkan. Kosong = apa ini + satu langkah pertama. Konsisten istilah dan huruf kapital. Hindari jargon dan teks terpotong.

**9. Uji dengan pengguna (ringan)**
5 pengguna cukup untuk menemukan sebagian besar masalah utama. Beri tugas, bukan pertanyaan ("Coba pesan produk X"), minta berpikir keras, jangan membantu. Catat: berhasil/gagal, waktu, titik bingung, kutipan. Prioritaskan temuan berdasarkan frekuensi x dampak.

**10. Handoff ke Frontend Dev (docs/design/<fitur>-handoff.md)**

```
Tujuan dan alur | Daftar layar + status tiap layar
Token dan komponen yang dipakai (nama, varian, ukuran, jarak)
Perilaku responsif (breakpoint) | Interaksi dan animasi (durasi, easing, pemicu)
Aksesibilitas (urutan fokus, label ARIA, kontras) | Teks final (copy) per status
Kasus tepi (teks panjang, data kosong, error) | Kriteria penerimaan yang bisa diuji
Pertanyaan terbuka dan asumsi
```

Pastikan setiap kriteria penerimaan bisa dicek Takumi (QA) dan dibangun tanpa menebak.

## Pitfalls

- Mendesain hanya happy path; mendekorasi sebelum alurnya benar; memakai warna sebagai satu-satunya penanda; placeholder sebagai label; mengabaikan layar kecil; handoff tanpa status error/kosong; menyalin pola tren tanpa alasan pengguna; menyatakan desain "sudah diuji" tanpa pengguna nyata.

## Verification

- Satu tugas utama bisa diselesaikan dengan langkah minimum yang tertulis; semua status ada; cek kontras dan fokus keyboard lolos; copy final tertulis; handoff bisa dikerjakan Frontend Dev tanpa bertanya hal dasar; asumsi yang belum diuji ditandai.
