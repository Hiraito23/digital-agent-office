---
name: uiux-riset-desain-dan-handoff
description: "Playbook UI/UX: memahami pengguna, alur dan arsitektur informasi, wireframe teks, sistem desain, aksesibilitas, review heuristik, copy antarmuka, dan handoff ke developer, plus referensi dan kerja dengan Figma serta mode data dummy."
version: 3.0.0
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
Tulis dalam lima baris: siapa penggunanya, tugas utama (job to be done), konteks pakai (perangkat, waktu, gangguan), ukuran keberhasilan (mis. waktu selesai, jumlah klik, tingkat error), dan batasan (teknologi, brand, tenggat). Bila belum ada data pengguna, tulis persona ringan dan tandai sebagai ASUMSI yang perlu diuji. Bila data klien belum masuk (harga, tipe, legalitas, jarak, tanggal, kontak), jangan isi angka atau klaim karangan: tandai slotnya MENUNGGU DATA dengan tiga penanda sekaligus (latar kuning, garis putus-putus, kata tertulis) dan catat daftar yang ditunggu serta dari siapa. Kalkulator atau form tidak diberi nilai bawaan yang tampak seperti data nyata. Klaim kelangkaan ("unit terbatas", hitung mundur) dan klaim tanpa bukti ("legalitas aman", "lokasi strategis") dilarang kecuali ada datanya.

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

**10. Handoff ke Frontend Dev (bawaan docs/design/<fitur>-handoff.md; bila pengguna menyebut path/format sendiri, mis. satu berkas HTML di docs/, pakai itu)**

```
Tujuan dan alur | Daftar layar + status tiap layar
Token dan komponen yang dipakai (nama, varian, ukuran, jarak)
Perilaku responsif (breakpoint) | Interaksi dan animasi (durasi, easing, pemicu)
Aksesibilitas (urutan fokus, label ARIA, kontras) | Teks final (copy) per status
Kasus tepi (teks panjang, data kosong, error) | Kriteria penerimaan yang bisa diuji
Pertanyaan terbuka dan asumsi
```

Pastikan setiap kriteria penerimaan bisa dicek Takumi (QA) dan dibangun tanpa menebak.

**11. Prototipe HTML/CSS statis (bila diminta)**
Bangun mobile-first (gaya dasar = 360 px, tambah @media 768 dan 1280), font sistem, token di `:root`, tanpa framework. Satu komponen dengan varian dipilih lewat atribut data (mis. `data-variant`), bukan dua salinan markup. Anotasi desain dan bilah kontrol prototipe diberi kelas khusus agar mudah dihapus saat produksi. Sebelum menyatakan selesai: hitung kontras dengan `scripts/kontras.py`, jalankan audit di peramban pada 360/768/1280 px, dan tinjau tangkapan layar. Resep, potongan audit, dan pola form/CTA ada di `references/prototipe-html-statis-dan-verifikasi.md`.

## Pitfalls

- Menaruh blok data ringkasan yang panjang sebelum CTA di hero: di seluler/desktop CTA jatuh di bawah lipatan layar; taruh CTA dulu, ringkasan sesudahnya.
- Bilah CTA lengket (fixed bottom) tanpa `padding-bottom` pada body menutupi isi terakhir; tautan teks inline (mis. di footer) default-nya setinggi ~16 px dan gagal target sentuh 44 px; beri `min-height` + `display:inline-flex`.
- Mendesain hanya happy path; mendekorasi sebelum alurnya benar; memakai warna sebagai satu-satunya penanda; placeholder sebagai label; mengabaikan layar kecil; handoff tanpa status error/kosong; menyalin pola tren tanpa alasan pengguna; menyatakan desain "sudah diuji" tanpa pengguna nyata.

## Verification

- Satu tugas utama bisa diselesaikan dengan langkah minimum yang tertulis; semua status ada; cek kontras dan fokus keyboard lolos; copy final tertulis; handoff bisa dikerjakan Frontend Dev tanpa bertanya hal dasar; asumsi yang belum diuji ditandai.

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila belum ada riset pengguna, konten, atau data layar)

Jangan menunggu hasil riset atau data nyata untuk mulai mendesain. Buat bahan dummy yang realistis, rancang, dan serahkan dengan label.
- **Persona dan skenario dummy** (2-3 persona: tujuan, hambatan, perangkat, kemahiran digital) di `data-dummy/design/persona-DUMMY.md`, ditandai sebagai hipotesis yang harus diuji, bukan temuan riset.
- **Konten layar dummy yang masuk akal** (bukan lorem ipsum): nama, harga rupiah, tanggal, status, judul panjang dan pendek, daftar kosong, satu entri dengan teks sangat panjang, angka besar. Tujuannya menguji tata letak pada kasus normal, kosong, dan ekstrem. Simpan sebagai `konten-DUMMY.json` yang sama dipakai prototipe dan handoff Frontend.
- **Hasil uji pengguna dummy** hanya untuk memperlihatkan cara membaca (tingkat keberhasilan tugas, waktu, galat, skor SUS), jelas berlabel, dan jangan dipakai sebagai bukti bahwa desain sudah teruji.
- **Token desain contoh** (warna, tipografi, jarak, radius, bayangan) sebagai titik awal bila belum ada sistem desain.
- Keluaran lengkap: alur, wireframe teks, spesifikasi status, prototipe HTML statis bila diminta, handoff ke Frontend, dan rencana uji pengguna 5 orang (skrip, tugas, metrik) untuk menggantikan hipotesis dummy.

## Pendalaman

**Peta perjalanan pengguna:** tahap (sadar, pertimbangan, memakai, kembali) x apa yang dilakukan, dipikirkan, dirasakan, titik gesek, peluang. Tandai tiga titik gesek terbesar dan rancang solusi untuk itu dulu.

**Card sorting ringan** untuk arsitektur informasi: 20-30 kartu konten, 5 peserta, kelompokkan dan beri nama; hitung kartu yang sering dikelompokkan bersama untuk menentukan menu. Dengan dummy, jelaskan metodenya dan beri contoh tabel hasil berlabel.

**Skala jarak dan tipografi:** jarak kelipatan 4 atau 8 (4, 8, 12, 16, 24, 32, 48); skala huruf (12, 14, 16, 20, 24, 32) dengan tinggi baris 1,4-1,6 untuk teks isi; maksimal 2 keluarga huruf; lebar baris teks 60-75 karakter.

**Kontras warna (WCAG):** rasio kontras = (L1 + 0,05) / (L2 + 0,05) dengan L luminans relatif; teks normal >= 4,5:1, teks besar (>= 24 px atau 19 px tebal) >= 3:1, komponen UI dan ikon bermakna >= 3:1. Cek pasangan warna pada tiap status (hover, nonaktif, galat).

**Matriks status komponen:** untuk tiap komponen (tombol, input, kartu, tabel) tulis default, hover, fokus, aktif, nonaktif, memuat, galat, kosong, sukses. Spesifikasikan juga perilaku pada layar 360, 768, dan 1280 px.

**Bank microcopy:** tombol memakai kata kerja spesifik ("Simpan perubahan", bukan "OK"); galat = apa yang terjadi + cara memperbaikinya, tanpa menyalahkan ("Nomor ponsel harus 10-13 angka"); keadaan kosong = kenapa kosong + satu tindakan ("Belum ada pesanan. Buat pesanan pertama"); konfirmasi penghapusan menyebut apa yang akan hilang dan bisa dibatalkan atau tidak.

**Skrip uji kegunaan 5 orang (30 menit):** pengantar (uji desain, bukan Anda), 3-4 tugas realistis tanpa petunjuk, minta berpikir keras, catat keberhasilan, waktu, galat, kutipan; akhiri dengan SUS (10 butir; skor = jumlah (butir ganjil - 1) + (5 - butir genap), lalu x 2,5; >= 68 di atas rata-rata). Lima peserta mengungkap sebagian besar masalah besar.

**Heuristik Nielsen dengan keparahan:** nilai 0-4 per temuan (kosmetik sampai bencana) dan tulis perbaikan; urutkan menurut keparahan x seberapa sering terkena.

**Daftar periksa handoff:** semua status ada, ukuran dan jarak dalam token, teks alternatif gambar, urutan fokus keyboard, perilaku responsif, animasi (durasi, easing, dan versi `prefers-reduced-motion`), data contoh (JSON) dan kasus ekstrem, aset yang diekspor, pertanyaan terbuka untuk dev.

**Mutu hasil:** setiap layar punya tujuan dan tindakan utama yang jelas, tidak ada keadaan yang terlewat, kontras memenuhi, dan semua konten/persona dummy berlabel.

## Referensi dan Kerja dengan Figma

Figma adalah acuan utama desain tim ini. Ambil referensi dari sana, jangan mendesain dari ingatan atau dari nol bila sudah ada sumbernya.

**1. Sumber referensi (urutan)**
1. File/tautan Figma yang diberikan pengguna atau tim (halaman, frame, node-id). Catat tautan lengkap dan `node-id` di dokumen supaya bisa dilacak.
2. Pustaka dan sistem desain yang sudah ada di file itu (komponen, varian, variabel, gaya). **Pakai ulang sebelum membuat baru.**
3. Referensi pola dari desain publik/Figma Community untuk inspirasi struktur dan interaksi: catat tautan dan apa yang dipelajari (pola, bukan salinan). Jangan menyalin aset, ilustrasi, atau merek yang berhak cipta.

**2. Bila alat Figma tersedia (konektor/MCP Figma)**
- Ambil konteks nyata dari node: metadata/struktur layer, variabel dan token (warna, tipografi, jarak, radius), gaya, komponen dan propertinya, tangkapan layar. Jangan menebak nilai dari gambar bila nilainya bisa dibaca.
- Hasilnya dipakai untuk spesifikasi dan handoff; sertakan tangkapan layar dan tautan node di `docs/design/<fitur>-handoff.md`.
- **Konektor Figma perlu diotorisasi pengguna di pengaturan konektor.** Bila alat belum tersedia atau menolak, jangan berhenti: minta pengguna menautkan atau mengekspor (tangkapan layar, PDF, JSON token), atau kerjakan dari deskripsi dan data dummy lalu tandai "belum diselaraskan dengan Figma" dengan daftar yang perlu dicocokkan.

**3. Praktik Figma yang diikuti saat merancang**
- **Struktur file:** halaman `Cover`, `Foundations` (warna, tipografi, jarak, ikon), `Components`, `Patterns`, `Screens` (per alur), `Handoff/Ready for dev`, `Archive`. Penamaan frame: `Alur / Layar / Status` (mis. `Checkout / Pembayaran / Galat`).
- **Auto Layout di semua tempat** (padding, gap, perataan, resize hug/fill) agar responsif dan mudah diterjemahkan ke flex/grid; jangan menaruh elemen manual dengan koordinat.
- **Komponen dan varian:** satu komponen utama dengan properti (ukuran, status, ikon on/off, teks), bukan banyak salinan; tulis status interaksi (default, hover, fokus, aktif, nonaktif, memuat, galat). Beri deskripsi komponen (kapan dipakai).
- **Variabel (token) dan mode:** warna, jarak, radius, tipografi sebagai variabel dengan nama hierarkis (`color/brand/primary`, `space/4`, `radius/md`); mode terang/gelap dan, bila perlu, kepadatan. Hindari nilai heksa/angka yang diketik langsung pada layar.
- **Grid dan jarak:** kolom 12 (desktop), 8 (tablet), 4 (ponsel) dengan margin dan gutter tertulis; jarak kelipatan 4/8 px.
- **Prototipe:** hubungkan alur utama (jalur bahagia + galat + kosong) agar dapat diputar saat uji pengguna.
- **Anotasi dan status:** beri catatan perilaku yang tidak terlihat (validasi, batas karakter, animasi), tandai `Ready for dev` hanya setelah semua status ada dan aksesibilitas diperiksa.
- **Aksesibilitas di Figma:** cek kontras tiap pasangan warna, ukuran target sentuh >= 44 px, urutan fokus dan label pembaca layar dicatat sebagai anotasi, tinggi baris dan ukuran teks minimum.

**4. Dari Figma ke handoff Frontend**
Setiap layar di handoff memuat: tautan node Figma, tangkapan layar, tabel token yang dipakai (nama Figma -> nama token kode), komponen dan propertinya, perilaku responsif (apa berubah di 360/768/1280), semua status, teks antarmuka final, aset yang diekspor (format, skala), dan pertanyaan terbuka. Pertahankan **nama yang sama** antara Figma dan kode (komponen, varian, token) agar tidak perlu diterjemahkan ulang.

**5. Menjaga konsistensi**
Setiap perubahan pada komponen dilakukan di komponen induk, bukan diubah di satu layar saja (hindari *detach instance*). Catat versi dan tanggal perubahan penting di halaman `Handoff`, dan beri tahu Frontend elemen mana yang berubah.
