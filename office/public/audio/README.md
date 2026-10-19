# Musik latar

File MP3 tidak disimpan di repository karena lagunya milik pihak lain.
Taruh file MP3 Anda sendiri di folder ini, lalu daftarkan di `PLAYLIST`
pada `office/public/js/ui/jukebox.js` (bukan `js/jukebox.js`), contoh:

```js
{ src: "/audio/nama-lagu.mp3", title: "Judul lagu" },
```

Setelah itu jalankan `docker compose up -d --build office`.
