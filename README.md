# Agentic Digital Office (Docker)

Panduan lengkap (instalasi, cara kerja agen, soul, skill, suara): [docs/PANDUAN.md](docs/PANDUAN.md).

Dua container:

| Container | Isi | Alamat |
|---|---|---|
| `office` | Kantor 3D (three.js) + adapter Hermes | http://localhost:3000 (juga `/office`) |
| `hermes` | Hermes Agent resmi (API + dashboard) | dashboard http://127.0.0.1:9119, API http://127.0.0.1:8642 |

Semua port hanya terbuka di komputer ini (127.0.0.1).

## Perintah (jalankan di folder ini)

```
docker compose up -d                  # nyalakan
docker compose down                   # matikan (data tetap aman di volume)
docker compose logs -f                # lihat log
docker exec -it hermes hermes setup   # isi API key model (wajib sekali)
docker compose restart                # restart setelah ganti API key
docker compose up -d --build office   # build ulang setelah mengubah apa pun di office/ (tampilan, server, adapter)
```

## File

- `.env` — rahasia lokal: `API_SERVER_KEY` dan login dashboard (`DASH_USER` / `DASH_PASS`).
- `config/team.json` + `config/people.json` — agen, persona, tampilan, suara. Kelola dari panel **⚙ Agen** di kantor
  (tambah/ubah/hapus agen, edit SOUL.md), langsung berlaku tanpa restart.
  - `costume` (opsional): `tikus-listrik`, `kadal-api`, `kura-air`, `kodok-daun`, `rubah-cokelat` (tema Pokémon);
    `dino-oranye`, `serigala-bertanduk`, `naga-biru`, `bayi-bersayap` (tema Digimon);
    `ninja-oranye`, `seragam-pelaut`, `gakuran`, `petarung-gi`, `bajak-laut-jerami`, `penyihir` (tema Anime)
  - `hair`: `short`, `long`, `bob`, `ponytail`, `bun`, `spiky`, `cap`
  - `outfit`: `shirt`, `blazer`, `hoodie`, `dress`
  - `accessory`: `glasses`, `headset` (opsional)
  - warna: `hairColor`, `skin`, `top`, `shirt`, `tie`, `pants`, `shoes`, `cap`, `brim`
- `office/public/` — kantor 3D (three.js). Ikut di-build ke dalam image: setelah mengedit, jalankan
  `docker compose up -d --build office`, lalu refresh browser.
  - `js/office3d.js` lantai, dinding, furnitur, taman · `js/people3d.js` karakter voxel + animasi
  - `js/world3d.js` kamera, cahaya, perilaku agen · `js/main.js` UI & koneksi
  - `js/jukebox.js` playlist musik dari `audio/` (file pribadi, jangan dibagikan; tambah lagu di
    `PLAYLIST`) · `style.css` tampilan panel
  - `js/voice.js` suara agen (suara browser; terbaik di Microsoft Edge). Atur per agen di
    panel ⚙ Agen (`config/people.json` → `voice`): `lang`, `gender`, `prefer`, `pitch`, `rate`. Tombol 🔊 Suara / 🔊 Tes.
  - Tombol ▦ di atas: HD / Pixel / Retro (gaya piksel).
- `office/server.js` — server web, three.js dari `node_modules` (tanpa CDN), proxy WebSocket ke adapter.
- `office/hermes-gateway-adapter.js` — adapter Hermes dari Claw3D (MIT), dimodifikasi agar memuat `config/team.json` dan menerapkan perubahan tim secara live.
- `office/agents-api.js` — API panel ⚙ Agen; SOUL.md lewat API resmi dashboard Hermes.

Data Hermes ada di volume Docker `kantor-hermes_hermes-data`, riwayat chat kantor di `kantor-hermes_office-data`.
