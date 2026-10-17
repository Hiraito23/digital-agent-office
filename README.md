# Agentic Digital Office (Docker)

Panduan pemakaian (instalasi, cara kerja agen, soul, skill, suara): [docs/PANDUAN.md](docs/PANDUAN.md).
Untuk developer baru (arsitektur, peta folder, resep tugas umum): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
- `office/` — image Docker kantor: `server/` (Node: server web, API panel agen, adapter Hermes) dan `public/`
  (UI 3D dalam ES modules: `office/` scene, `characters/` karakter, `world/` agen, `ui/` panel). Peta lengkapnya ada di
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Setelah mengubah apa pun di `office/`: `docker compose up -d --build office`.

Data Hermes ada di volume Docker `kantor-hermes_hermes-data`, riwayat chat kantor di `kantor-hermes_office-data`.
