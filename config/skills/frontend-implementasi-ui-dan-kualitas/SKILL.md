---
name: frontend-implementasi-ui-dan-kualitas
description: "Playbook Frontend: membaca proyek yang ada, implementasi UI dari desain, HTML/CSS/JS semantik, state dan data fetching, responsif, aksesibilitas, performa, pengujian, dan serah-terima, plus aturan tech stack, arsitektur folder, clean code, implementasi dari Figma, dan mode data dummy."
version: 3.0.0
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

<!-- skill-v3: dummy, pendalaman -->
## Mode Data Dummy (bila backend, API, atau data belum ada)

Jangan menunggu backend. Bangun antarmuka sampai **berjalan penuh dengan data tiruan**, dan rancang supaya pergantian ke API asli hanya satu langkah.
- **Lapisan data dengan saklar:** semua pengambilan data lewat satu modul (`src/data/api.*`) dengan opsi `USE_MOCK` (variabel lingkungan atau konstanta di satu tempat). Komponen tidak tahu apakah data tiruan atau asli.
- **Data tiruan** di `src/mock/*.json` (atau `mock/`), berlabel `DUMMY`, dengan bentuk yang sama persis dengan kontrak API (bila kontrak belum ada, tulis `docs/api-kontrak-usulan.md` berisi endpoint, parameter, dan contoh respons yang kamu asumsikan, lalu minta Backend menyesuaikan atau menyetujui).
- **Cakupan kasus:** daftar penuh, satu item, kosong, sangat panjang, galat server (500), galat validasi (422), lambat (tunda 1-2 detik agar status memuat terlihat), dan terputus. Sediakan cara memicunya (parameter `?mock=error` atau tombol di mode pengembangan).
- **Isi yang realistis:** nama, harga rupiah, tanggal, dan teks panjang berbahasa Indonesia, bukan "lorem ipsum" atau "test123". Pakai pembuat data dengan seed tetap bila diperlukan.
- Semua halaman dapat dibuka dan dipakai tanpa server lain. Di README tulis cara menjalankan, cara mengganti ke API asli (mis. `USE_MOCK=false` dan alamat dasar API), dan daftar data tiruan yang harus dicocokkan dengan kontrak.

## Pendalaman

**Arsitektur state:** simpan state sedekat mungkin dengan pemakainya; data server diperlakukan sebagai cache (pengambilan, status memuat/galat/kosong, pembatalan, ulang otomatis terbatas), bukan disalin ke banyak tempat. State turunan dihitung, tidak disimpan.

**Pola formulir:** validasi sisi klien untuk kecepatan dan sisi server sebagai sumber kebenaran; pesan galat dekat inputnya dan dibaca pembaca layar (`aria-describedby`, `aria-invalid`); cegah kirim ganda (nonaktifkan tombol saat mengirim); pertahankan isian saat galat; fokus pindah ke galat pertama.

**Anggaran performa:** LCP < 2,5 s, CLS < 0,1, INP < 200 ms pada perangkat menengah dan jaringan 4G; ukuran JS awal < 170 KB terkompresi bila bisa; gambar memakai ukuran dan format sesuai (WebP/AVIF), `loading="lazy"` di bawah lipatan, dimensi dituliskan agar tidak melompat. Ukur dengan Lighthouse atau DevTools, jangan menebak.

**Skeleton dan transisi:** tampilkan kerangka dengan ukuran yang sama dengan konten akhir (mencegah lompatan), jangan menampilkan spinner untuk tindakan < 300 ms, hormati `prefers-reduced-motion`.

**Arsitektur CSS:** token (variabel CSS) untuk warna, jarak, radius; kelas komponen kecil dan komposabel; hindari `!important` dan selektor bersarang dalam; urutan: reset, token, dasar, komponen, utilitas. Mobile-first dengan titik henti berdasarkan konten, bukan perangkat.

**Piramida pengujian:** banyak uji unit untuk logika murni (format, validasi, reducer), sedang uji komponen (render, interaksi, keadaan), sedikit uji uji-ujung (alur utama saja). Tiap bug yang ditemukan mendapat uji yang gagal dulu. Contoh uji komponen: render daftar kosong menampilkan teks ajakan, klik tombol memanggil handler sekali, galat 500 menampilkan pesan dan tombol coba lagi.

**Daftar periksa tinjau kode sendiri:** tidak ada `console.log` tertinggal, tidak ada kunci/URL rahasia tertanam, semua status (memuat/kosong/galat) ada, fokus dan label benar, tidak ada gambar tanpa alt, tidak ada ketergantungan baru tanpa alasan, nama berkas dan komponen konsisten dengan proyek, build dan lint lulus.

**Verifikasi nyata sebelum menyatakan selesai:** jalankan aplikasi, buka di peramban pada lebar 360 dan 1280, tekan Tab melalui halaman, picu status galat dan kosong, dan periksa konsol tanpa galat. Tulis apa yang kamu periksa di serah-terima.

**Mutu hasil:** berjalan tanpa backend, saklar mock jelas, data tiruan sesuai kontrak, semua dummy berlabel, README menjelaskan penggantian ke data asli.

## Aturan Tech Stack (ikuti proyek, jangan mengganti diam-diam)

**Langkah 0, selalu: deteksi stack yang SUDAH ada.** Baca `package.json` (dependensi, skrip, `engines`), berkas kunci (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`), `tsconfig*.json`, konfigurasi bundler (`vite.config.*`, `next.config.*`), lint/format (`eslint.config.*`, `.prettierrc*`), `README`, dan struktur `src/`. **Ikuti yang ada**: pengelola paket yang sama dengan berkas kuncinya, gaya komponen, pustaka UI, cara styling, dan pola uji yang sudah dipakai. Jangan menambahkan pustaka kedua untuk hal yang sudah ada (dua pustaka state, dua pustaka tanggal, dua sistem styling). Menambah dependensi baru hanya bila perlu, kecil, terawat, dan alasannya ditulis di serah-terima.

**Bila proyek baru atau pengguna tidak menentukan, bawaan modern (versi stabil/LTS saat ini):**
- Bahasa: **TypeScript** dengan `"strict": true` (tanpa `any` tanpa alasan), modul ES.
- Runtime/pengelola paket: **Node.js LTS** terbaru, **pnpm** (atau ikuti lockfile yang ada); simpan versi di `engines` dan `.nvmrc`/`.node-version`.
- Kerangka: **React** (komponen fungsi + hooks) dengan **Vite** untuk SPA, atau **Next.js (App Router)** bila butuh SSR/SEO/rute berbasis berkas; Vue 3 atau Svelte bila proyek memakainya. Satu kerangka saja.
- Styling: **CSS variabel (design tokens) + Tailwind CSS** atau **CSS Modules**; ikuti yang sudah ada. Tanpa gaya inline untuk hal yang berulang.
- Data server: **TanStack Query** (atau `fetch` + hooks sederhana) untuk cache/status; validasi respons dengan **Zod**; formulir dengan **React Hook Form + Zod**. State lokal sebisanya `useState/useReducer`; state global kecil (Zustand/Context) hanya bila perlu.
- Uji: **Vitest** (unit/komponen) + **Testing Library**, **Playwright** untuk alur utama; **MSW** untuk menyimulasikan API.
- Kualitas: **ESLint** (konfigurasi flat) + **Prettier**, `tsc --noEmit` di CI, hook pra-commit ringan (lint-staged), **GitHub Actions** untuk lint + tipe + uji + build.
- Aksesibilitas/performa: aturan `eslint-plugin-jsx-a11y`, Lighthouse CI atau pemeriksaan manual terhadap anggaran performa.
- Rahasia dan konfigurasi: variabel lingkungan (`.env.example` dilacak, `.env` tidak), hanya variabel berawalan publik yang boleh sampai ke klien.

## Arsitektur Folder (bawaan; sesuaikan dengan struktur proyek yang ada)

Pilih pembagian **berdasarkan fitur**, bukan berdasarkan jenis berkas semata. Tulis struktur akhir di `README`/`docs/arsitektur.md` bila kamu membuat atau mengubahnya.

```
src/
  app/                  # entry, router, provider global, layout aplikasi
  pages/ atau routes/   # komponen halaman tipis: merakit fitur, tanpa logika bisnis
  features/
    <fitur>/            # satu folder per fitur/domain (mis. orders, auth, catalog)
      components/       # komponen khusus fitur
      hooks/            # hooks khusus fitur
      api/              # fungsi akses data + tipe respons fitur
      model/ atau lib/  # logika murni, selector, mapper, validasi (mudah diuji)
      index.ts          # API publik fitur (hanya ekspor ini yang boleh diimpor dari luar)
  shared/
    ui/                 # komponen generik tanpa logika bisnis (Button, Modal, Input)
    lib/                # utilitas murni (format, tanggal, uang)
    api/                # klien HTTP, penanganan galat, interseptor
    config/             # konstanta, flag fitur, pembaca env
    styles/             # token, reset, tema
    types/              # tipe lintas fitur
  assets/               # gambar, font, ikon
tests/ atau __tests__/  # uji lintas fitur dan e2e (uji unit berdampingan dengan berkasnya: x.test.ts)
public/                 # aset statis apa adanya
docs/                   # keputusan arsitektur, panduan
```

Aturan batas (jaga arah ketergantungan, otomatiskan dengan `eslint-plugin-boundaries`/`import/no-restricted-paths` bila memungkinkan):
- `shared` tidak mengimpor dari `features`; `features` tidak saling mengimpor internal satu sama lain (hanya lewat `index.ts` fitur atau lewat `app`); `pages` boleh mengimpor `features` dan `shared`.
- Komponen presentasional menerima data lewat props; komponen kontainer/hooks yang mengambil data. Tidak ada pemanggilan jaringan langsung di komponen UI generik.
- Nama: komponen `PascalCase.tsx`, hooks `useXxx.ts`, utilitas `camelCase.ts`, folder `kebab-case`, tipe `PascalCase`, konstanta `UPPER_SNAKE_CASE`. Satu komponen utama per berkas; berkas gaya berdampingan dengan komponennya.
- Impor memakai alias (`@/features/orders`) bukan `../../../`; tidak ada impor melingkar.
- Proyek **vanilla JS/HTML**: tetap modular (ES modules per tanggung jawab: `ui/`, `state/`, `api/`, `utils/`), satu titik masuk `main.js`, tanpa variabel global.

**Clean code (berlaku untuk semua kode yang kamu tulis)**
- **Nama menjelaskan maksud:** variabel kata benda (`unpaidInvoices`), fungsi kata kerja (`calculateTotal`), boolean berawalan `is/has/can/should`, tanpa singkatan yang tidak umum, tanpa `data`, `temp`, `obj`, `foo`. Satu istilah untuk satu konsep di seluruh proyek.
- **Fungsi kecil dan satu tugas:** idealnya <= 40 baris, <= 3-4 parameter (lebih dari itu pakai objek), kompleksitas siklomatik <= 10, tingkat indentasi <= 3. Pakai *early return* dan *guard clause* daripada `if` bersarang.
- **Berkas fokus:** satu tanggung jawab per modul, <= 300 baris (pecah bila lebih), ekspor sedikit dan jelas. Tidak ada dependensi melingkar.
- **Tanpa angka/string ajaib:** pindahkan ke konstanta bernama atau konfigurasi (`MAX_UPLOAD_MB = 5`). Satu sumber kebenaran untuk setiap aturan bisnis; hindari menyalin logika (DRY), tetapi jangan menggabungkan dua hal yang kebetulan mirip (lebih baik duplikasi kecil daripada abstraksi yang salah).
- **Pisahkan efek samping dari logika:** fungsi murni untuk perhitungan (mudah diuji), lapisan tipis untuk I/O (basis data, jaringan, berkas, waktu, acak). Suntikkan dependensi (parameter/konstruktor) alih-alih memanggil global.
- **Penanganan galat yang sengaja:** jangan menelan galat (`catch {}` kosong), jangan mengembalikan `null` ambigu; pakai tipe galat/kode yang jelas, tambahkan konteks, tangani di batas yang tepat (controller, handler UI), dan catat sekali. Validasi masukan di batas sistem.
- **Komentar menjelaskan *mengapa*, bukan *apa*:** kode yang perlu komentar untuk dipahami lebih baik diubah namanya atau dipecah. Hapus kode mati dan komentar kadaluarsa; jangan meninggalkan `TODO` tanpa tiket/pemilik.
- **Pola data:** utamakan objek tak berubah dan fungsi tanpa mutasi parameter; tipe eksplisit pada batas modul (TypeScript `strict`, tanpa `any` tanpa alasan tertulis).
- **Format dan lint otomatis:** formatter (Prettier/gofmt/black) dan linter dijalankan sebelum commit; jangan memperdebatkan gaya, ikuti konfigurasi proyek. Tidak ada peringatan baru.
- **Perubahan kecil dan terarah:** satu commit satu maksud, pesan commit jelas (gaya Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), jangan merapikan berkas yang tidak terkait pada perubahan yang sama, dan jangan ubah perilaku saat refactor.
- **Aturan Boy Scout yang aman:** tinggalkan kode sedikit lebih rapi hanya di area yang kamu sentuh dan sudah punya uji; jangan refactor besar tanpa diminta.
- **Uji sebagai dokumentasi:** nama uji menyebut perilaku ("menolak pesanan tanpa item"), pola Arrange-Act-Assert, tanpa logika di dalam uji, satu alasan gagal per uji.

**Khusus frontend:** komponen kecil dan bisa dikomposisi (<= ~150 baris), props bertipe dan sedikit, tidak ada logika bisnis di JSX (pindah ke hooks/fungsi murni), `key` stabil pada daftar, efek (`useEffect`) hanya untuk sinkronisasi dengan sistem luar, tidak ada state turunan yang disimpan, dan tidak ada gaya atau teks yang tertanam berulang (token dan salinan teks terpusat).

## Implementasi dari Figma

Bila ada tautan atau berkas Figma: (1) bila alat Figma tersedia, ambil konteks desain (struktur layer, variabel/token, gaya, komponen, tangkapan layar) dari node yang disebut, jangan menebak dari gambar; (2) petakan **variabel Figma -> token CSS** dengan nama yang sama atau terjemahan yang konsisten (`color/brand/primary` -> `--color-brand-primary`), **Auto Layout -> flex/grid + gap/padding**, **komponen dan varian -> komponen dengan props** (varian = props bertipe), **mode (terang/gelap) -> tema**; (3) pakai komponen yang sudah ada di kode sebelum membuat yang baru; (4) bandingkan hasil dengan tangkapan layar pada lebar yang sama dan catat selisih yang disengaja; (5) bila alat Figma tidak tersedia, minta ekspor (tangkapan layar, spesifikasi handoff dari Mio) atau lanjutkan dari handoff teks dan data dummy, jangan menunggu.
