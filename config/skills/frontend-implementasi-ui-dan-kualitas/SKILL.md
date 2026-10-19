---
name: frontend-implementasi-ui-dan-kualitas
description: "Playbook Frontend: membaca proyek yang ada, implementasi UI dari desain, HTML/CSS/JS semantik, state dan data fetching, responsif, aksesibilitas, performa, pengujian, dan serah-terima."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [frontend, html, css, javascript, performa, aksesibilitas]
---

# Playbook Frontend

## When to Use

- Membangun atau mengubah tampilan dan interaksi web; mengimplementasi desain dari UI/UX; memperbaiki bug tampilan, performa, atau aksesibilitas; menghubungkan UI ke API.

## Procedure

**1. Kenali proyek dulu, jangan langsung menulis**
Baca README, `package.json`, struktur folder, dan 2-3 file serupa dengan yang akan dibuat. Catat: framework (atau tanpa framework), gaya penamaan, cara styling, cara memanggil API, dan cara menjalankan/menguji. Ikuti pola yang sudah ada; jangan memperkenalkan library baru tanpa alasan kuat dan tanpa menyebutkannya di serah-terima.

**2. Pecah pekerjaan**
Tulis daftar kecil yang bisa dicek satu per satu: struktur HTML -> styling -> interaksi -> data -> status (memuat/kosong/error) -> responsif -> aksesibilitas -> uji. Kerjakan perubahan sekecil mungkin yang memenuhi kebutuhan; jangan merombak file yang tidak terkait.

**3. HTML semantik**
Gunakan elemen yang tepat (`button` untuk aksi, `a` untuk navigasi, `nav`, `main`, `section`, `h1-h6` berurutan, `label` terhubung ke `input`, `ul/li` untuk daftar, `table` untuk data tabular). Jangan membuat `div` yang diklik. Setiap gambar bermakna punya `alt`.

**4. CSS yang mudah dirawat**
- Mobile-first; breakpoint mengikuti konten (mis. 360, 768, 1024, 1280).
- Variabel CSS untuk warna, jarak, tipografi (token dari desain); jangan menyebar nilai ajaib.
- Pakai flex/grid, `rem`, `clamp()`; hindari tinggi tetap pada teks; uji teks panjang.
- Dukung mode gelap bila desain meminta (`prefers-color-scheme`) dan `prefers-reduced-motion`.
- Spesifisitas rendah; hindari `!important` dan selector bersarang dalam.

**5. JavaScript dan state**
- Pisahkan: data (fetch), state, render, dan event handler. Satu fungsi satu tugas.
- State milik komponen sedekat mungkin dengan pemakainya; angkat hanya bila dibagi.
- Selalu tangani keadaan data: memuat, sukses, gagal, dan kosong. Beri batas waktu dan tombol coba lagi.
- Debounce input pencarian; batalkan request lama (`AbortController`); hindari race condition.
- Jangan percaya data dari server atau URL: sisipkan teks dengan `textContent`, bukan `innerHTML`. Jangan simpan token atau rahasia di kode klien.
- Validasi form di klien untuk kenyamanan, tetapi anggap server sebagai validasi sebenarnya.

**6. Aksesibilitas saat membangun**
Urutan Tab logis, fokus terlihat, dialog memindahkan dan mengembalikan fokus (`Esc` menutup), `aria-*` hanya bila HTML semantik tidak cukup, pesan error terhubung ke field (`aria-describedby`), pembaruan dinamis diumumkan (`aria-live`), kontras >= 4.5:1, target sentuh >= 44 px.

**7. Performa (periksa, jangan menebak)**
- Ukur dulu (Lighthouse, tab Network/Performance): LCP < 2,5 s, INP < 200 ms, CLS < 0,1.
- Gambar: ukuran sesuai tampilan, format modern (WebP/AVIF), `width/height` atau `aspect-ratio`, `loading="lazy"` di bawah lipatan.
- Kurangi JavaScript yang dikirim; tunda yang tidak kritis (`defer`, import dinamis); animasikan `transform` dan `opacity`.
- Cache aset statis dengan nama berversi.

**8. Pengujian dan verifikasi nyata**
- Jalankan aplikasinya dan lihat hasilnya di 360, 768, 1280 px; coba keyboard saja; coba status memuat/kosong/error; pastikan konsol bebas error.
- Tulis atau perbarui tes otomatis yang sudah dipakai proyek (unit untuk logika, komponen/E2E untuk alur utama) dan jalankan seluruhnya sebelum menyatakan selesai.
- Cek browser yang ditargetkan; jangan pakai fitur tanpa fallback bila targetnya luas.

**9. Review diri sebelum serah-terima**
Baca ulang diff: kode mati, `console.log`, komentar sisa, nilai ajaib, duplikasi, nama yang membingungkan. Pastikan tidak ada perubahan di luar lingkup dan tidak ada rahasia di kode.

**10. Serah-terima**
Tulis: apa yang berubah dan di file mana, cara menjalankan dan mengujinya, bukti (hasil tes, ukuran layar yang dicek), keputusan dan asumsi (termasuk dependensi baru), batasan yang diketahui, dan langkah berikutnya. Minta Takumi (QA) menguji bila alurnya penting, dan Akane (Security) bila menyentuh input pengguna, autentikasi, atau data sensitif.

## Pitfalls

- Menulis sebelum membaca proyek; menambah library demi hal kecil; `div` yang diklik; `innerHTML` dengan data pengguna; hanya menguji di satu ukuran layar; mengabaikan status error/kosong; mengoptimasi tanpa mengukur; menyatakan selesai tanpa menjalankan dan melihat hasilnya.

## Verification

- Berjalan tanpa error konsol; semua status terlihat benar; responsif di 360/768/1280 px; bisa dioperasikan keyboard; tes yang ada lulus; diff bersih dan sesuai lingkup; serah-terima tertulis dengan cara menguji.
