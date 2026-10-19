# Agentic Digital Office (Docker)

Panduan pemakaian (instalasi, cara kerja agen, soul, skill, suara): [docs/PANDUAN.md](docs/PANDUAN.md).
Untuk developer baru (arsitektur, peta folder, resep tugas umum): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Dua container:

| Container | Isi | Alamat |
|---|---|---|
| `office` | Kantor 3D (three.js) + adapter Hermes | http://localhost:3000 |
| `hermes` | Hermes Agent resmi (API + dashboard) | dashboard http://127.0.0.1:9119, API http://127.0.0.1:8642 |

Semua port hanya terbuka di komputer ini (127.0.0.1).

## Perintah (jalankan di folder ini)

```
docker compose up -d                  # nyalakan
docker compose down                   # matikan (data tetap aman di volume)
docker compose logs -f                # lihat log
docker exec -it hermes hermes model   # login provider AI + pilih model (wajib sekali, lihat PANDUAN)
docker compose restart hermes         # restart setelah ganti provider/model
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

Setelah login provider, salin juga `API_SERVER_KEY` ke `.env` milik Hermes (langkah 3 di bagian "Memilih provider dan model AI" di [PANDUAN](docs/PANDUAN.md)); tanpa itu API port 8642 tidak menyala.

Tim bawaan (7 agen dengan soul detail per peran) dan 8 skill tim ada di `config/team.json` dan `config/skills/`, jadi clone baru langsung lengkap tanpa membuat agen satu per satu (detail di [PANDUAN](docs/PANDUAN.md#tim-bawaan-soul-dan-skill-per-peran)). Tool tulis file Hermes diizinkan menulis ke folder proyek lewat `HERMES_WRITE_SAFE_ROOT` di `docker-compose.yml`.

Kantor berupa gedung tiga lantai dengan lift: lobby, ruang game, dan kantin di lantai 1, satu ruangan per agen di lantai 2, serta ruang rapat dan ruang server di lantai 3. Agen yang santai saling mengobrol (200+ topik, fakta dari Wikipedia, dan berita tren); di tab Kantor pada kotak chat Anda bisa ikut ngobrol dan satu agen akan menjawab. Hermes menugaskan agen lain lewat server MCP `office-team` yang dijalankan kantor dan didaftarkan otomatis ke Hermes (cek: `docker exec hermes hermes mcp list`).

Furnitur kantor bisa dipindah, diputar, ditambah, dan dihapus lewat tombol **🛠 Layout** di header (mode edit seperti build mode The Sims; tersimpan di `config/layout.json`). Caranya ada di [PANDUAN](docs/PANDUAN.md#mengatur-layout-kantor--layout).

Model AI tiap agen dipilih dari dropdown **Model AI** di panel **⚙ Agen** (kunci `model` di `team.json`; kosong = model default Hermes). Syaratnya sekali per komputer: `docker exec hermes hermes config set platforms.api_server.extra.direct_model_requests true`, lalu `docker compose restart hermes`. Panel **📊 Pemakaian** menampilkan token per agen dan model (harian, mingguan, bulanan). Cara memakai model berbayar (kredit Nous Portal atau API key Anthropic) ada di [PANDUAN](docs/PANDUAN.md#memakai-model-berbayar).

Data Hermes ada di volume Docker `digital-agent-office_hermes-data`, riwayat chat kantor di `digital-agent-office_office-data`.
