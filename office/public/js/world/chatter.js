// Small talk between agents who are idle. World.updateChatter() lets two idle agents walk
// to each other and swap a few lines (speech bubbles, spoken when 🔊 Suara is on);
// makeConversation() writes the lines. No AI call is involved, so it costs nothing.
//
// Where the topics come from:
//   - everyday chat: food, travel, music, films, books, hobbies, health, nostalgia, the office
//   - fun facts, riddles (tebak-tebakan) and "which would you pick" questions
//   - developer culture, and banter between roles (PM + developer, QA + developer, ...)
//   - the weather, the time of day and the day of the week
//   - trending headlines (setNews(), fed from /api/news by main.js): technology, science,
//     sports, entertainment and business news, discussed with generic reactions
//
// Lines are written for two speakers who alternate, starting with the first. {lawan} is
// replaced by the name of the person who is being spoken to.

// ---------------------------------------------------------------------------
// Everyday topics
// ---------------------------------------------------------------------------

const GENERIC = [
  ["Udah ngopi belum hari ini?", "Baru satu gelas. Kamu?", "Belum, ayo ke pantry bareng.", "Boleh! Nanti aku yang seduh."],
  ["Nanti makan siang apa ya?", "Nasi goreng di depan kayaknya enak.", "Setuju, tapi antriannya suka panjang.", "Gampang, kita pesan duluan aja."],
  ["Rencana akhir pekanmu apa, {lawan}?", "Rebahan seharian. Kamu?", "Mau jalan ke gunung kalau cuacanya bagus.", "Wah seru, kirim fotonya ya!"],
  ["Rekor di mesin arcade itu siapa yang pegang ya?", "Kayaknya aku, hehe.", "Klaim sepihak nih. Rematch yuk?", "Siap, yang kalah traktir kopi."],
  ["Kamu dengerin musik apa pas kerja?", "Lo-fi, biar fokus.", "Aku malah suka lagu dari game jadul.", "Nah, tukeran playlist yuk."],
  ["Kamu pelihara hewan, {lawan}?", "Kucing dua ekor. Satu galak, satu manja.", "Persis kayak tim kita ya.", "Hush, jangan bilang-bilang."],
  ["Ikan di akuarium makin gemuk ya.", "Kebanyakan dikasih makan.", "Pasti ada yang diam-diam nambah porsi.", "Bukan aku, sumpah!"],
  ["Tanaman di sudut kantor kelihatan segar.", "Iya, tapi daunnya mulai kuning dikit.", "Mungkin kurang air. Nanti aku siram.", "Sekalian pupuknya, boleh."],
  ["Lagi baca buku apa akhir-akhir ini?", "Tentang kebiasaan kecil yang berdampak besar.", "Pinjam dong kalau sudah selesai.", "Boleh, nanti kutaruh di rak buku."],
  ["Kita kebanyakan duduk, ya.", "Betul. Besok jalan keliling taman yuk.", "Setuju, lima belas menit aja cukup.", "Deal! Jangan lupa pakai sepatu."],
  ["Semalam kamu tidur jam berapa?", "Jam dua. Kebanyakan mikir.", "Hati-hati, jangan begadang terus.", "Siap, malam ini tidur lebih awal."],
  ["Sudah coba tool baru yang lagi ramai itu?", "Belum sempat. Worth it nggak?", "Lumayan, tapi belajarnya butuh waktu.", "Oke, nanti kita coba bareng."],
  ["Kalau libur panjang, kamu mau ke mana?", "Pantai! Duduk dan nggak mikirin apa-apa.", "Enak banget kedengarannya.", "Ikut aja, nanti kita patungan."],
  ["Kantor ini nyaman ya, pemandangannya taman.", "Iya, apalagi kalau lagi cerah.", "Sofa di pantry itu bikin betah.", "Awas ketiduran lagi kayak kemarin."],
  ["Makanan favoritmu apa, {lawan}?", "Soto ayam, apalagi pakai koya.", "Selera yang bagus!", "Kapan-kapan kita cari soto enak bareng."],
  ["Lagi nonton serial apa?", "Yang tentang tim detektif itu.", "Wah, spoiler jangan ya.", "Tenang, aku cuma bilang endingnya bagus."],
  ["Kamu pernah belajar bahasa asing?", "Sedikit Jepang, buat nonton anime.", "Konnichiwa, {lawan}-san!", "Hahaha, logatmu lucu."],
  ["Rapat kemarin panjang banget ya.", "Untung ada notulen Hermes.", "Betul, aku tinggal baca poin akhirnya.", "Efisien!"],
  ["Wi-Fi hari ini lancar ya?", "Jangan disebut, nanti error.", "Hahaha, jinx!", "Cepat ketuk meja kayu."],
  ["Kamu tipe pagi atau tipe malam?", "Pagi, kepala paling jernih jam enam.", "Aku malam, ide muncul pas sepi.", "Pantas kita saling melengkapi."],
  ["Pernah coba teknik Pomodoro?", "Pernah, dua puluh lima menit fokus.", "Berhasil nggak?", "Lumayan, asal tidak lupa istirahatnya."],
  ["Kalau bisa punya kekuatan super, kamu pilih apa?", "Bisa memperbaiki semua bug dalam sekejap.", "Pilihan klasik seorang developer.", "Kamu sendiri?"],
  ["Teh atau kopi, {lawan}?", "Kopi tanpa gula.", "Aku teh hangat dengan madu.", "Dua-duanya bagus untuk kerja."],
  ["Hobimu apa di luar kerjaan?", "Fotografi. Suka motret langit.", "Keren! Pasti hasilnya cantik.", "Nanti kutunjukkan galerinya."],
  ["Kamu ingat hari pertama kita di kantor ini?", "Ingat, semua masih serba baru.", "Dan sekarang sudah seperti rumah.", "Iya, rumah yang ada ping-pongnya."],
  ["Ada ide nama buat proyek berikutnya?", "Sesuatu yang pendek dan gampang diingat.", "Misalnya apa?", "Entahlah, nanti kita brainstorming."],
  ["Kamu suka olahraga apa?", "Badminton, tiap Sabtu pagi.", "Wah, ajak aku dong.", "Boleh, bawa raketmu sendiri ya."],
  ["Pernah kepikiran kerja dari pantai?", "Sering, tapi sinyalnya pasti hilang.", "Betul juga, pasir masuk keyboard pula.", "Ya sudah, kantor ini saja cukup."],
  ["Kopi gratis di pantry itu penyelamat hidup.", "Setuju, tapi jangan sampai habis ya.", "Tenang, aku selalu isi ulang.", "Kamu memang pahlawan tim."],
  ["Kalau ada waktu kosong, kamu lakukan apa?", "Menggambar kecil-kecilan.", "Wah, aku nggak tahu kamu bisa menggambar.", "Cuma coretan, sih."],
  ["Hari ini terasa cepat ya.", "Karena banyak yang kita kerjakan.", "Semoga semuanya lancar sampai nanti.", "Amin! Semangat, {lawan}."],

  // food
  ["Kamu lebih suka mi instan pakai telur atau tanpa?", "Pakai telur, wajib! Setengah matang.", "Aku tambah irisan cabai rawit.", "Kamu memang berani, {lawan}."],
  ["Bubur ayam diaduk atau tidak diaduk?", "Tidak diaduk, itu prinsip.", "Hmm, itu perdebatan abadi.", "Biarlah, yang penting enak."],
  ["Bakso tanpa sambal itu kurang lengkap.", "Setuju, plus sedikit cuka.", "Dan kerupuk di atasnya.", "Sekarang aku jadi lapar."],
  ["Nasi padang favoritmu lauk apa?", "Rendang, nggak pernah gagal.", "Aku daun singkong dan ayam pop.", "Pilihan klasik yang aman."],
  ["Martabak manis atau martabak telur?", "Manis, dengan keju dan cokelat.", "Aku telur, apalagi kalau lagi hujan.", "Kita beli dua-duanya kapan-kapan."],
  ["Es kopi susu itu nikmatnya sederhana.", "Apalagi kalau gulanya pas.", "Aku suka yang agak pahit.", "Berarti selera kita beda tipis."],
  ["Pernah coba masak sendiri akhir-akhir ini?", "Nasi goreng, lumayan jadi.", "Aku masih gosong terus.", "Tenang, api kecil kuncinya."],
  ["Aku lagi belajar masak resep baru.", "Wah, resep apa?", "Soto betawi, santannya harus pas.", "Undang aku saat sudah jadi."],
  ["Hujan-hujan begini enaknya makan apa ya?", "Mi kuah panas, tanpa pikir panjang.", "Atau gorengan dan teh manis.", "Dua-duanya akan menang."],
  ["Sate ayam atau sate kambing?", "Sate ayam, bumbu kacangnya juara.", "Aku sate kambing, dengan kecap dan bawang.", "Pesan dua porsi, kita tukar."],
  ["Gudeg itu manisnya khas banget ya.", "Apalagi dengan krecek pedas.", "Dan telur pindang di sampingnya.", "Aku jadi ingin ke Yogyakarta."],

  // travel
  ["Kamu suka bepergian atau di rumah saja?", "Suka jalan, tapi tetap butuh waktu sendiri.", "Betul, keseimbangan itu penting.", "Rencana liburan berikutnya sudah ada?"],
  ["Yogyakarta itu bikin betah ya.", "Betul, suasananya tenang dan makanannya murah.", "Gudeg pagi hari itu juara.", "Ayo kita rencanakan ke sana."],
  ["Pernah ke Bali, {lawan}?", "Pernah, tapi aku lebih suka sisi tenangnya.", "Pantai sepi dengan matahari terbenam.", "Itu baru liburan sejati."],
  ["Raja Ampat itu mimpi banyak orang.", "Lautnya jernih sekali di foto-foto.", "Suatu hari kita harus ke sana.", "Tabung dulu dari sekarang."],
  ["Gunung atau pantai, pilihanmu?", "Gunung, udaranya segar.", "Aku pantai, suara ombaknya menenangkan.", "Dua-duanya baik untuk pikiran."],
  ["Kereta atau pesawat kalau bepergian jauh?", "Kereta, pemandangannya enak dilihat.", "Aku pesawat, biar cepat sampai.", "Waktu atau pemandangan, ya."],
  ["Bandung selalu terasa sejuk ya.", "Dan kulinernya tidak habis-habis.", "Bisa seharian cuma makan dan jalan.", "Itu rencana liburan terbaik."],
  ["Kalau punya sehari bebas, kamu mau ke mana?", "Ke toko buku, lalu kafe.", "Aku ke taman sambil membawa kamera.", "Hari yang sempurna."],

  // music, films, books
  ["Lagu apa yang paling sering kamu putar ulang?", "Lagu lama dari masa sekolah.", "Nostalgia memang kuat.", "Kadang satu lagu bisa mengubah suasana hari."],
  ["Kamu bisa main alat musik?", "Sedikit gitar, itu pun lagunya itu-itu saja.", "Mainkan satu buat kami kapan-kapan.", "Siapkan telinga yang sabar ya."],
  ["Podcast favoritmu apa?", "Yang bahas teknologi dan kebiasaan kerja.", "Rekomendasikan dong.", "Nanti kukirim daftarnya."],
  ["Pernah nonton konser?", "Pernah, desak-desakan tapi seru.", "Suara penonton ikut bernyanyi itu merinding.", "Pengalaman yang sulit dilupakan."],
  ["Film apa yang bisa kamu tonton berkali-kali?", "Yang ceritanya hangat dan lucu.", "Aku yang penuh aksi dan musik keras.", "Selera kita beda, tapi sama-sama santai."],
  ["Buku fiksi atau nonfiksi?", "Nonfiksi, biar ada ilmu baru.", "Aku fiksi, buat melarikan diri sejenak.", "Keduanya sama-sama berguna."],
  ["Kamu masih menulis catatan di buku?", "Masih, rasanya lebih ingat.", "Aku pakai aplikasi, takut kertasnya hilang.", "Yang penting dicatat."],
  ["Ada lagu yang bikin langsung semangat kerja?", "Yang temponya cepat dan tanpa lirik.", "Aku lagu tema game klasik.", "Putar saja jukebox di pojok kantor."],
  ["Jukebox kantor kita keren juga ya.", "Playlist-nya cocok untuk suasana santai.", "Kapan-kapan kita tambah lagu baru.", "Setuju, minta rekomendasi semua orang."],

  // developer culture
  ["Tab atau spasi, {lawan}?", "Spasi dong, rapi di mana-mana.", "Tab, lebih fleksibel.", "Perdebatan abadi para developer."],
  ["Mode gelap atau mode terang?", "Gelap, lebih nyaman buat mata.", "Aku terang kalau siang.", "Kantor kita punya keduanya, asyik."],
  ["Menamai variabel itu salah satu pekerjaan tersulit.", "Betul, 'data2' dan 'temp' ada di mana-mana.", "Dan 'final_final_baru'.", "Hahaha, jangan buka-bukaan."],
  ["'Di komputerku jalan kok.'", "Kalimat paling legendaris sedunia.", "Lalu kita kirim komputernya ke klien?", "Tentu tidak, kita pakai Docker."],
  ["Rubber duck debugging itu beneran ampuh.", "Ceritakan masalahnya ke bebek karet.", "Dan tiba-tiba solusinya muncul sendiri.", "Ajaib, padahal bebeknya diam saja."],
  ["Commit message terbaikmu apa?", "'perbaiki bug', singkat dan misterius.", "Aku 'update' saja, hehe.", "Nanti masa depan kita yang bingung."],
  ["Kamu sering lupa titik koma?", "Kadang, tapi linter selalu menyelamatkan.", "Alat bantu itu teman terbaik.", "Betul, kita fokus ke hal penting."],
  ["Dokumentasi itu surat cinta untuk diri sendiri di masa depan.", "Setuju, tiga bulan lagi pasti lupa.", "Makanya kutulis pelan-pelan.", "Terima kasih dari dirimu di masa depan."],
  ["Code review itu bukan menghakimi orang.", "Betul, kita menilai kodenya.", "Dan belajar satu sama lain.", "Suasananya jadi lebih nyaman."],
  ["Tes otomatis itu menenangkan hati.", "Kalau semuanya hijau, tidur nyenyak.", "Kalau merah, ya perbaiki dulu.", "Lebih baik tahu sekarang daripada nanti."],
  ["Rapat yang sebenarnya cukup lewat email itu sering terjadi.", "Hahaha, benar sekali.", "Makanya kita pakai notulen yang ringkas.", "Hermes bantu banget soal itu."],
  ["Refactor kecil tiap hari lebih baik daripada rombak besar.", "Betul, risikonya lebih kecil.", "Dan tes menjaga kita tetap aman.", "Pelan-pelan tapi pasti."],
  ["Kamu pakai shortcut keyboard apa yang paling sering?", "Ctrl+Z, penyelamat segalanya.", "Kalau aku Ctrl+S sebelum semuanya hilang.", "Dua kebiasaan yang bagus."],
  ["Aku pernah menghabiskan sejam cuma karena huruf kapital salah.", "Aduh, aku juga pernah.", "Pelajarannya: baca pesan error pelan-pelan.", "Dan minum air dulu sebelum panik."],

  // health and focus
  ["Fokus itu mahal harganya sekarang.", "Notifikasi mencuri banyak waktu.", "Aku mematikan semuanya pas lagi konsentrasi.", "Ide bagus, aku coba juga."],
  ["Kamu tidur siang sebentar kalau lelah?", "Dua puluh menit saja, lalu segar.", "Lebih dari itu malah pusing.", "Rahasia tidur siang yang efektif."],
  ["Minum air putihmu sudah cukup hari ini?", "Ya ampun, baru dua gelas.", "Ayo isi botolnya sekarang.", "Siap, terima kasih pengingatnya."],
  ["Peregangan sebentar yuk, sudah lama duduk.", "Boleh, leherku kaku sekali.", "Gerakkan bahu dan putar pergelangan tangan.", "Aaah, lega rasanya."],
  ["Pagi hari kamu mulai dengan apa?", "Meditasi lima menit, lalu kopi.", "Aku langsung cek kabar tim.", "Dua cara yang sama-sama bagus."],
  ["Punya tips menjaga semangat di hari Senin?", "Mulai dari tugas paling kecil.", "Dan beri hadiah kecil setelahnya.", "Strategi cerdas, kucoba nanti."],
  ["Ada kebiasaan kecil yang mau kamu mulai?", "Jalan kaki sepuluh menit tiap sore.", "Wah, aku ikut kalau tidak hujan.", "Deal, kita mulai hari ini."],

  // nostalgia and life
  ["Kamu masih ingat mainan masa kecilmu?", "Kelereng dan layang-layang.", "Kita dulu main sampai lupa waktu.", "Masa yang sederhana dan seru."],
  ["Kartun apa yang kamu tonton waktu kecil?", "Yang hari Minggu pagi itu.", "Ah, nostalgia sekali.", "Mau nonton lagi? Pasti seru."],
  ["Kalau bisa kembali ke masa sekolah, mau ngapain?", "Lebih rajin belajar bahasa.", "Aku ingin lebih berani mencoba.", "Pilihan bagus untuk diterapkan sekarang juga."],
  ["Skill baru apa yang ingin kamu pelajari tahun ini?", "Desain dasar, biar paham kerjaan Sakura.", "Aku mau belajar dasar keamanan.", "Saling belajar itu bikin tim kuat."],
  ["Siapa orang yang paling kamu kagumi?", "Guru SMA-ku yang sabar sekali.", "Orang yang sabar memang langka.", "Semoga kita bisa seperti itu."],
  ["Hal kecil apa yang membuat harimu bagus?", "Kopi hangat di pagi hari.", "Aku, langit yang cerah.", "Sederhana tapi manjur."],
  ["Pernah belajar sesuatu dari kegagalan?", "Sering, itu guru yang keras.", "Tapi pelajarannya awet.", "Betul, tidak mudah lupa."],
  ["Kamu punya kebiasaan unik saat kerja?", "Menata alat tulis lurus-lurus.", "Aku bicara sendiri saat mikir.", "Pantas kamu selalu tampak sibuk."],
  ["Warna favoritmu apa?", "Biru, rasanya tenang.", "Aku hijau, mirip taman di luar.", "Pantas kantor ini terasa cocok."],
  ["Musim favoritmu apa, {lawan}?", "Kemarau, langitnya cerah.", "Aku penghujan, aroma tanahnya.", "Aroma tanah basah itu memang enak dihirup."],
  ["Menurutmu apa yang membuat tim kita solid?", "Kita saling percaya dan terbuka.", "Dan tidak sungkan minta bantuan.", "Itu resep yang jarang gagal."],

  // the office
  ["Hari Jumat itu rasanya lebih ringan ya.", "Karena akhir pekan sudah dekat.", "Tapi jangan lupa selesaikan tugasnya.", "Siap, nanti sore kita rapikan."],
  ["Ping-pong di ruang game siap rematch kapan saja.", "Aku sudah latihan servis diam-diam.", "Hahaha, jangan curang ya.", "Siap, kita lihat siapa yang menang."],
  ["Sofa pantry itu empuknya kelewatan.", "Makanya sering ada yang ketiduran.", "Aku tidak akan menyebut nama.", "Kami semua tahu siapa."],
  ["Taman di luar jendela itu cantik sekali.", "Betul, apalagi saat matahari tenggelam.", "Kita foto bareng suatu hari nanti.", "Ide bagus, tim foto bersama."],
  ["Akuarium itu menenangkan, ya.", "Menonton ikan berenang bikin pikiran adem.", "Mungkin kita perlu tambah ikan baru.", "Hush, nanti yang mengurus siapa?"],
  ["Kamu pernah coba semua mesin arcade di ruang game?", "Sudah, yang merah paling susah.", "Yang biru lebih ramah pemula.", "Pantas aku selalu kalah di yang merah."],
  ["Lampu-lampu taman di luar bagus sekali kalau malam.", "Seperti suasana festival kecil.", "Kita nongkrong di luar kapan-kapan.", "Bawa kopi dan selimut tipis."],
  ["Papan whiteboard di ruang rapat sudah penuh sticky note.", "Itu ide-ide kita bulan ini.", "Mungkin saatnya dirapikan.", "Yuk, kita pilah mana yang dikerjakan."],
];

// ---------------------------------------------------------------------------
// Fun facts, riddles and "which would you pick" (generated from short data)
// ---------------------------------------------------------------------------

const FACTS = [
  ["gurita punya tiga jantung", "Dua untuk insang, satu untuk seluruh tubuh."],
  ["madu hampir tidak pernah basi", "Kadar airnya rendah, jadi bakteri sulit hidup di dalamnya."],
  ["satu hari di Venus lebih lama daripada satu tahunnya", "Planet itu berputar sangat pelan pada porosnya."],
  ["pisang secara botani termasuk buah beri", "Sedangkan stroberi justru bukan."],
  ["Indonesia punya belasan ribu pulau", "Angkanya sering disebut lebih dari tujuh belas ribu."],
  ["komodo hanya hidup liar di Indonesia", "Habitat aslinya di Pulau Komodo dan beberapa pulau tetangganya."],
  ["cahaya bergerak sekitar tiga ratus ribu kilometer per detik", "Cahaya matahari butuh sekitar delapan menit untuk sampai ke Bumi."],
  ["Candi Borobudur dibangun lebih dari seribu tahun lalu", "Dan sampai sekarang masih berdiri megah."],
  ["otak manusia memakai sekitar dua puluh persen energi tubuh", "Padahal beratnya hanya sekitar dua persen."],
  ["lebah madu berkomunikasi lewat tarian", "Gerakannya menunjukkan arah dan jarak sumber makanan."],
  ["bunga matahari muda mengikuti arah matahari sepanjang hari", "Setelah mekar, kebanyakan menghadap ke timur."],
  ["penguin kaisar jantan mengerami telur di atas kakinya", "Selama berminggu-minggu di tengah dingin Antartika."],
  ["bayi lahir dengan tulang lebih banyak daripada orang dewasa", "Sebagian tulangnya menyatu seiring pertumbuhan."],
  ["tidur membantu otak merapikan ingatan", "Makanya begadang sebelum ujian kurang efektif."],
  ["Tembok Besar China tidak terlihat jelas dari luar angkasa dengan mata telanjang", "Itu mitos yang sering dipercaya."],
  ["satu hari di Mars hampir sama panjang dengan di Bumi", "Sekitar dua puluh empat jam tiga puluh sembilan menit."],
  ["paus biru adalah hewan terbesar yang pernah ada", "Ukurannya melebihi dinosaurus terbesar."],
  ["lidah bunglon bisa lebih panjang dari tubuhnya", "Melesat sepersekian detik untuk menangkap mangsa."],
  ["bambu termasuk tanaman yang tumbuh paling cepat", "Beberapa jenis bisa tumbuh puluhan sentimeter dalam sehari."],
  ["air laut mengandung emas dalam jumlah sangat kecil", "Tapi mengambilnya jauh lebih mahal daripada nilainya."],
  ["kopi diminum di seluruh dunia dengan rasa yang berbeda-beda di tiap daerah", "Kopi Gayo dan Toraja dari Indonesia sangat dikenal."],
  ["sidik jari koala sangat mirip sidik jari manusia", "Para ilmuwan sampai heran kenapa bisa begitu."],
  ["kucing sering berdengkur saat merasa nyaman", "Ada juga yang berdengkur untuk menenangkan dirinya."],
  ["Jakarta pernah bernama Batavia", "Nama itu dipakai pada masa kolonial."],
  ["kunang-kunang menghasilkan cahaya dengan hampir tanpa panas", "Makanya disebut cahaya dingin."],
  ["hujan punya aroma khas yang disebut petrikor", "Datang dari tanah kering yang mulai basah."],
  ["gajah termasuk hewan darat dengan ingatan yang sangat baik", "Mereka bisa mengenali teman lama setelah bertahun-tahun."],
  ["semut bisa mengangkat beban berkali lipat dari berat tubuhnya", "Karena tubuhnya kecil, otot-ototnya sangat efisien."],
  ["bulan menjauh dari Bumi sekitar beberapa sentimeter tiap tahun", "Pelan sekali, tapi terus bergerak."],
  ["warna langit biru karena cahaya biru lebih banyak tersebar di atmosfer", "Dan saat senja cahayanya menempuh jalur lebih panjang, jadi tampak jingga."],
];
const factScript = ([fact, detail]) => [
  `Tahu nggak, ${fact}?`,
  "Serius? Aku baru tahu.",
  detail,
  "Keren, ilmu baru hari ini!",
];

const RIDDLES = [
  ["Kenapa programmer suka tempat gelap?", "Karena cahaya menarik bug."],
  ["Kenapa komputer nggak pernah kedinginan?", "Karena punya banyak Windows."],
  ["Kenapa database selalu bahagia?", "Karena punya banyak relasi."],
  ["Kenapa kursor selalu berkedip?", "Karena menunggu kamu mengetik."],
  ["Apa yang selalu naik tapi tidak pernah turun?", "Umur."],
  ["Apa yang punya kunci tapi tidak bisa membuka pintu?", "Keyboard."],
  ["Apa yang makin kering makin banyak dipakai?", "Handuk."],
  ["Kenapa laut itu asin?", "Karena ikannya tidak pernah mandi, eh, berkeringat terus."],
  ["Apa yang bisa kamu patahkan tanpa menyentuhnya?", "Janji."],
  ["Kenapa jam dinding sering terlihat sibuk?", "Karena tangannya tidak pernah berhenti bergerak."],
  ["Kenapa kalender itu populer?", "Karena banyak yang menunggu tanggalnya."],
  ["Apa yang punya banyak halaman tapi tidak punya kaki?", "Buku."],
  ["Kenapa awan tidak pernah kesepian?", "Karena selalu ada yang menemani di langit."],
  ["Kenapa baterai tidak suka rapat panjang?", "Karena cepat habis dayanya."],
];
const riddleScript = ([q, a]) => [
  `Tebak-tebakan, {lawan}: ${q}`,
  "Hmm, aku menyerah. Apa jawabannya?",
  a,
  "Hahaha, receh tapi lucu!",
];

const PICKS = [
  ["kopi setiap pagi", "teh setiap sore", "kopi", "pagi tanpa kopi rasanya belum mulai"],
  ["libur di gunung", "libur di pantai", "gunung", "udaranya sejuk dan pemandangannya luas"],
  ["bisa terbang", "bisa menghilang", "terbang", "bisa melihat kantor ini dari atas"],
  ["bekerja pagi", "bekerja malam", "pagi", "kepalaku paling jernih saat itu"],
  ["punya kucing", "punya anjing", "kucing", "mandiri dan menggemaskan"],
  ["nasi goreng", "mi goreng", "nasi goreng", "lebih mengenyangkan"],
  ["hujan seharian", "panas seharian", "hujan", "suasananya adem dan tenang"],
  ["membaca buku", "menonton film", "buku", "imajinasiku yang bekerja"],
  ["jalan kaki", "naik sepeda", "sepeda", "lebih cepat dan menyehatkan"],
  ["pesan teks", "telepon", "teks", "bisa dibalas kapan saja"],
  ["kerja di kantor", "kerja dari rumah", "kantor", "ada yang diajak ngobrol dan ada ping-pong"],
  ["sarapan besar", "sarapan ringan", "ringan", "biar tidak ngantuk"],
  ["tinggal di kota", "tinggal di desa", "desa", "tenang dan udaranya segar"],
  ["belajar bahasa baru", "belajar alat musik", "alat musik", "hasilnya bisa dinikmati orang lain"],
  ["menikmati senja di pantai", "menikmati fajar di gunung", "fajar di gunung", "cahayanya keemasan"],
  ["lagu lama", "lagu baru", "lagu lama", "selalu ada kenangan di dalamnya"],
  ["makan pedas", "makan manis", "pedas", "bikin semangat"],
  ["liburan sendirian", "liburan ramai-ramai", "ramai-ramai", "lebih seru berbagi cerita"],
];
const pickScript = ([x, y, pick, why]) => [
  `Pilih mana, {lawan}: ${x} atau ${y}?`,
  `Hmm... aku pilih ${pick}.`,
  "Kenapa begitu?",
  `Karena ${why}.`,
];

const POOL = [...GENERIC, ...FACTS.map(factScript), ...RIDDLES.map(riddleScript), ...PICKS.map(pickScript)];

// ---------------------------------------------------------------------------
// Role pairs (unordered). Lines alternate between the first and the second role.
// dev = frontend or backend.
// ---------------------------------------------------------------------------

const BY_ROLE = [
  { roles: ["pm", "dev"], lines: ["{lawan}, estimasinya sudah ada?", "Hampir. Tinggal beberapa edge case.", "Oke, kabari kalau ada hambatan ya.", "Siap, nanti kuperbarui."] },
  { roles: ["pm", "dev"], lines: ["Prioritas minggu ini kita fokus ke fitur utama dulu.", "Setuju, yang kecil-kecil kita tunda.", "Nanti kita masukkan ke daftar berikutnya.", "Siap, jadi lebih terarah."] },
  { roles: ["qa", "dev"], lines: ["Aku nemu satu bug kecil di form tadi.", "Hah? Di mana? Kucek sekarang.", "Tenang, bukan yang parah kok.", "Fiuh, makasih sudah dikabari dulu."] },
  { roles: ["sec", "dev"], lines: ["Jangan lupa validasi inputnya ya.", "Sudah, tapi kucek sekali lagi deh.", "Bagus. Satu celah kecil bisa jadi masalah besar.", "Betul, kupasang tesnya juga."] },
  { roles: ["ux", "fe"], lines: ["Spacing tombol itu pas nggak menurutmu?", "Menurutku sudah, mungkin tambah 4px.", "Oke, nanti kurevisi desainnya.", "Dan kusesuaikan di kodenya."] },
  { roles: ["infra", "be"], lines: ["Skema barunya aman buat migrasi?", "Aman, rollback-nya juga sudah ada.", "Mantap. Backup dulu sebelum jalan ya.", "Selalu, itu aturan nomor satu."] },
  { roles: ["pm", "ux"], lines: ["Alur login-nya bisa dibuat lebih singkat?", "Bisa, kita buang satu langkah.", "Pengguna pasti suka.", "Kubuatkan prototipenya sore ini."] },
  { roles: ["pm", "qa"], lines: ["Fitur ini sudah siap diuji?", "Sudah, test plan-nya ada.", "Kalau lulus, kita rilis minggu ini.", "Kukabari hasilnya secepatnya."] },
  { roles: ["be", "fe"], lines: ["Kontrak API-nya sudah kubagikan.", "Sudah kubaca, ada satu field yang belum jelas.", "Yang mana? Kujelaskan.", "Nanti kutulis di dokumen supaya jelas."] },
  { roles: ["sec", "infra"], lines: ["Port database itu tidak terbuka ke publik, kan?", "Tidak, hanya lewat jaringan internal.", "Bagus. Backup-nya dienkripsi juga?", "Ya, dan sudah kuuji restore-nya."] },
  { roles: ["qa", "sec"], lines: ["Tes login-ku sudah mencakup kasus gagal berulang.", "Bagus. Tambahkan juga kasus akun terkunci.", "Siap, kutambahkan sebentar lagi.", "Kita saling melengkapi."] },
  { roles: ["qa", "ux"], lines: ["Pesan error di form itu kurang jelas.", "Benar juga, nanti kuperbaiki teksnya.", "Tambahkan contoh isian yang benar.", "Ide bagus, pengguna jadi tidak bingung."] },
  { roles: ["infra", "sec"], lines: ["Kunci API sudah dipindah ke env semua?", "Sudah, dan akses databasenya dibatasi.", "Bagus, tolong catat di dokumentasi.", "Siap, kutulis hari ini."] },
  { roles: ["fe", "qa"], lines: ["Komponen tabelnya sudah bisa kamu uji?", "Sudah, filternya lancar tapi urutan kolom aneh.", "Oh, nanti kurapikan.", "Terima kasih, kabari kalau sudah."] },
  { roles: ["be", "qa"], lines: ["Endpoint baru sudah siap diuji.", "Aku cek status code dan validasinya ya.", "Kalau ada yang gagal, kasih tahu aku.", "Pasti, lengkap dengan langkah reproduksinya."] },
  { roles: ["ux", "be"], lines: ["Kira-kira data apa yang bisa ditampilkan di dashboard?", "Ada ringkasan harian dan daftar terbaru.", "Pas, bisa kubuat kartu-kartunya.", "Kuberi endpoint khusus supaya cepat."] },
  { roles: ["pm", "infra"], lines: ["Kapan lingkungan staging bisa dipakai tim?", "Besok pagi, tinggal uji akhir.", "Mantap, kuberi tahu tim lain.", "Kukirim catatan cara pakainya juga."] },
  { roles: ["pm", "sec"], lines: ["Ada temuan keamanan yang perlu kita prioritaskan?", "Satu yang tinggi, kuberi detailnya sore ini.", "Kita jadwalkan perbaikannya segera.", "Setuju, keamanan tidak bisa menunggu."] },
  { roles: ["ux", "qa"], lines: ["Kontras warna tombol itu sudah memenuhi standar?", "Sudah, tapi untuk teks kecil kutingkatkan lagi.", "Bagus, aku ikut cek dengan pembaca layar.", "Wah, terima kasih sudah teliti."] },
  { roles: ["fe", "infra"], lines: ["Build frontend-nya agak lambat di pipeline.", "Mungkin cache dependensi belum aktif.", "Coba kuatur, nanti kukabari hasilnya.", "Mantap, waktunya pasti turun."] },
];

// ---------------------------------------------------------------------------
// Weather, time of day and day of the week
// ---------------------------------------------------------------------------

const WEATHER = {
  hujan: [
    ["Hujannya deras ya.", "Untung kita di dalam kantor.", "Suara hujan bikin ngantuk, jujur.", "Kopi hangat solusinya."],
    ["Hujan begini enaknya ngapain ya?", "Dengerin musik sambil kerja pelan-pelan.", "Atau baca buku di sofa pantry.", "Dua-duanya terdengar nyaman."],
    ["Taman di luar jadi basah semua.", "Tanamannya pasti senang.", "Dan udaranya jadi segar.", "Sayang kita tidak bisa main di luar."],
  ],
  badai: [
    ["Kamu dengar petirnya tadi?", "Kaget banget, sampai kursi bergetar.", "Semoga listrik aman.", "Aman kok, ada UPS di ruang server."],
    ["Anginnya kencang sekali di luar.", "Pohon-pohon sampai bergoyang.", "Untung kita di dalam gedung.", "Mari kita tunggu sampai reda."],
  ],
  kabut: [
    ["Kabutnya tebal banget di luar.", "Tamannya jadi kayak film misteri.", "Ayo foto dari jendela.", "Boleh, nanti kita bagi hasilnya."],
    ["Pandangan ke taman jadi samar ya.", "Suasananya tenang dan sedikit ajaib.", "Cocok untuk menulis puisi.", "Atau menyeduh teh panjang-panjang."],
  ],
  berawan: [
    ["Mendung ya hari ini.", "Adem, nggak silau di layar.", "Setuju, mataku lebih nyaman.", "Semoga nggak jadi hujan."],
    ["Awan-awan itu bergerak pelan sekali.", "Lihat bentuknya, mirip kelinci.", "Haha, imajinasimu bagus.", "Itu hobi lama dari kecil."],
  ],
  cerah: [
    ["Cerah banget hari ini.", "Sinar mentari bikin semangat.", "Kita istirahat sebentar di taman?", "Ide bagus, sepuluh menit saja."],
    ["Langit biru bersih tanpa awan.", "Cocok buat foto-foto.", "Nanti sore kita keluar sebentar?", "Boleh, bawa kamera ya."],
  ],
};
const PERIOD = {
  Pagi: [
    ["Pagi, {lawan}! Semangat hari ini?", "Pagi! Sudah sarapan?", "Belum, nanti sekalian ngopi.", "Ide bagus, aku ikut."],
    ["Pagi-pagi begini kepalaku masih mengumpulkan nyawa.", "Santai, kopi sebentar lagi siap.", "Terima kasih, penyelamat pagiku.", "Sama-sama, ayo mulai hari."],
    ["Cahaya pagi di jendela itu cantik.", "Hangat dan tidak menyilaukan.", "Cocok untuk memulai pekerjaan ringan dulu.", "Betul, pemanasan sebelum yang berat."],
  ],
  Siang: [
    ["Siang begini enaknya makan apa ya?", "Apa saja asal ada sambalnya.", "Hahaha, kamu memang tim pedas.", "Ayo cari bareng nanti."],
    ["Jam segini biasanya ngantuk melanda.", "Minum air putih dan peregangan sebentar.", "Atau jalan ke pantry ambil kopi.", "Strategi yang aman."],
  ],
  Sore: [
    ["Sore begini cahayanya bagus ya.", "Warna oranye di jendela cantik.", "Hampir waktunya istirahat.", "Sebentar lagi kita rapikan pekerjaan."],
    ["Sudah sore, hari ini cepat sekali berlalu.", "Karena banyak yang sudah selesai.", "Besok kita lanjutkan dengan semangat baru.", "Setuju, istirahat yang cukup."],
  ],
  Malam: [
    ["Sudah malam, lampunya cantik ya.", "Iya, kantor jadi hangat suasananya.", "Tapi jangan begadang terus.", "Siap, selesaikan ini lalu pulang."],
    ["Malam begini kantor terasa tenang.", "Suasana yang enak untuk berpikir.", "Asal jangan sampai larut ya.", "Tentu, besok masih ada hari."],
    ["Bintang-bintangnya kelihatan dari jendela.", "Kapan terakhir kita memandang langit malam?", "Rasanya sudah lama sekali.", "Yuk, sebentar saja di luar."],
  ],
};
const DAY = {
  1: [["Senin lagi, {lawan}.", "Semangat! Mulai dari yang ringan dulu.", "Betul, pemanasan sebelum tugas besar.", "Kopi dulu, baru rencana minggu ini."]],
  3: [["Sudah Rabu, minggu ini separuh jalan.", "Tidak terasa ya.", "Kita masih punya waktu mengejar target.", "Santai, selangkah demi selangkah."]],
  5: [["Jumat, akhir pekan sudah dekat!", "Tapi tugasnya jangan ditinggal ya.", "Tenang, kita rapikan sebelum sore.", "Setelah itu, istirahat panjang."]],
  6: [["Sabtu, tapi kita masih di kantor ya.", "Santai saja, suasananya lebih tenang.", "Betul, tidak ada yang mengejar.", "Sambil kopi dan musik pelan."]],
  0: [["Minggu begini harusnya rebahan.", "Hahaha, tapi kantor ini nyaman juga.", "Apalagi sofa pantrynya.", "Jangan sampai ketiduran lagi."]],
};

// ---------------------------------------------------------------------------
// Trending headlines (main.js calls setNews with /api/news)
// ---------------------------------------------------------------------------

let NEWS = [];
export const setNews = (items) => {
  NEWS = (Array.isArray(items) ? items : []).filter((i) => i && typeof i.title === "string" && i.title.length >= 15);
};

const NEWS_OPEN = [
  'Eh {lawan}, udah baca berita ini? "{t}"',
  'Lagi ramai nih: "{t}"',
  'Tadi aku lihat headline: "{t}"',
  '{lawan}, kamu ikuti kabar ini? "{t}"',
  'Baru muncul di berita: "{t}"',
  'Lewat di beranda berita tadi: "{t}"',
  'Ada kabar menarik: "{t}"',
];
const NEWS_REACT = [
  "Iya, aku juga sempat baca. Menarik ya.",
  "Oh, baru tahu aku. Menurutmu bagaimana?",
  "Wah, nggak nyangka. Sumbernya {src}, kan?",
  "Hmm, aku mau cek beritanya lebih lengkap dulu.",
  "Lumayan penting juga ya buat banyak orang.",
  "Hahaha, pas sekali dibahas hari ini.",
];
const NEWS_MID = {
  teknologi: [
    "Kira-kira ini bakal berpengaruh ke cara kerja kita nggak?",
    "Dunia teknologi memang berubah cepat sekali.",
    "Aku penasaran apa yang bisa kita coba dari kabar ini.",
    "Semoga fiturnya benar-benar berguna, bukan sekadar heboh.",
    "Kita perlu lihat dulu sisi keamanannya.",
    "Menarik untuk dicoba, asal tidak mengganggu pekerjaan.",
  ],
  sains: [
    "Sains itu selalu bikin kagum.",
    "Penasaran bagaimana penelitiannya dilakukan.",
    "Semoga hasilnya bisa dimanfaatkan banyak orang.",
    "Anak-anak sekolah pasti senang kalau diceritakan begini.",
    "Dunia ini masih penuh hal yang belum kita tahu.",
  ],
  olahraga: [
    "Pertandingannya pasti seru ya.",
    "Aku jadi ingin nonton bareng.",
    "Semoga sportif sampai akhir.",
    "Siapa jagoanmu?",
    "Olahraga memang selalu menyatukan orang.",
  ],
  hiburan: [
    "Kapan-kapan kita nonton bareng yuk.",
    "Seru juga buat bahan obrolan.",
    "Aku jadi penasaran sama karyanya.",
    "Semoga hasilnya sebagus yang dibicarakan.",
    "Pasti ramai dibahas di mana-mana.",
  ],
  bisnis: [
    "Semoga berdampak baik buat usaha kecil.",
    "Menarik melihat arah pasarnya.",
    "Kita perlu terus memantau perkembangannya.",
    "Bisa jadi inspirasi buat produk kita juga.",
    "Dunia usaha memang dinamis sekali.",
  ],
};
const NEWS_CLOSE = [
  "Ya sudah, kita pantau terus kabarnya.",
  "Nanti kita bahas lagi kalau ada kabar baru.",
  "Terima kasih sudah berbagi, {lawan}.",
  "Seru juga ngobrol soal ini.",
  "Oke, jadi bahan obrolan sore nanti.",
];

// ---------------------------------------------------------------------------
// Facts from Wikipedia (main.js calls setFacts with /api/facts; the server keeps a growing pool)
// ---------------------------------------------------------------------------

let WIKI = [];
export const setFacts = (items) => {
  WIKI = (Array.isArray(items) ? items : []).filter((f) => f && typeof f.text === "string" && typeof f.title === "string" && f.text.length >= 30);
};

const FACT_OPEN = [
  "Tahu nggak, {lawan}? {fact}",
  "Fakta menarik: {fact}",
  "Eh, kamu tahu ini? {fact}",
  "Aku baru baca tentang {title}. {fact}",
  "Ada fakta seru tentang {title}: {fact}",
  "Sempat kepikiran soal {title}. {fact}",
];
const FACT_REACT = [
  "Serius? Aku baru tahu.",
  "Wah, menarik banget!",
  "Hah, beneran? Keren sekali.",
  "Nggak nyangka ya, dunia ini penuh kejutan.",
  "Hmm, jadi penasaran sama {title}.",
  "Oh, pantas banyak yang membahasnya.",
];
const FACT_MID = [
  "Ilmu baru hari ini!",
  "Aku jadi ingin baca lebih lanjut.",
  "Itu bisa jadi bahan cerita seru di pantry.",
  "Hal-hal begini bikin hari lebih berwarna.",
  "Menurutmu, apa hal paling unik yang pernah kamu pelajari?",
  "Dunia ini memang luas dan penuh hal menarik.",
];
const FACT_CLOSE = [
  "Nanti kita cari tahu hal-hal seperti ini lagi.",
  "Terima kasih sudah berbagi, {lawan}!",
  "Simpan buat obrolan berikutnya, ya.",
  "Seru, besok ceritakan yang lain.",
];

const shorten = (title, max = 88) => {
  const clean = title.replace(/["“”]/g, "'").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`;
};

// ---------------------------------------------------------------------------
// Building a conversation
// ---------------------------------------------------------------------------

const kindOf = (role = "") => {
  const r = String(role).toLowerCase();
  if (r.includes("product")) return "pm";
  if (r.includes("qa")) return "qa";
  if (r.includes("secur")) return "sec";
  if (r.includes("ui/ux") || r.includes("design")) return "ux";
  if (r.includes("front")) return "fe";
  if (r.includes("back")) return "be";
  if (r.includes("infra") || r.includes("database")) return "infra";
  return "other";
};
const matches = (spec, kind) => spec === kind || (spec === "dev" && (kind === "fe" || kind === "be"));

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); };

// a, b: agents { id, name, role }. ctx: { weather, period }. recent: keys of recent topics.
// Returns [{ who, text, news? }] with who = a or b; news = the source name on the first
// line of a news chat. The topic key is recorded in `recent`.
export const makeConversation = (a, b, ctx = {}, recent = []) => {
  const ka = kindOf(a.role);
  const kb = kindOf(b.role);
  let lines = null;
  let key = "";
  let first = a; // who says the first line
  let meta = null; // where the topic comes from: { icon, name }, shown in the Kantor tab
  const roll = Math.random();

  // 1. trending headlines (when the news feed has delivered something new)
  if (roll < 0.14 && NEWS.length) {
    const fresh = NEWS.filter((n) => !recent.includes(`news:${hash(n.title)}`));
    if (fresh.length) {
      const n = pick(fresh);
      key = `news:${hash(n.title)}`;
      meta = { icon: "📰", name: n.source || "Berita" };
      const mids = NEWS_MID[n.topic] ?? NEWS_MID.teknologi;
      const mid1 = pick(mids);
      const mid2 = pick(mids.filter((m) => m !== mid1));
      lines = [
        pick(NEWS_OPEN).replace("{t}", shorten(n.title)),
        pick(NEWS_REACT).replace("{src}", n.source || "media online"),
        mid1,
        mid2,
        pick(NEWS_CLOSE),
      ];
    }
  }

  // 2. facts from Wikipedia (striking ones are preferred)
  if (!lines && roll < 0.44 && WIKI.length) {
    const fresh = WIKI.filter((f) => !recent.includes(`fact:${hash(f.title)}`));
    if (fresh.length) {
      const fun = fresh.filter((f) => f.fun);
      const f = pick(fun.length && Math.random() < 0.65 ? fun : fresh);
      key = `fact:${hash(f.title)}`;
      meta = { icon: "📚", name: f.source || "Wikipedia" };
      const fill = (s) => s.replace("{fact}", f.text).replace(/\{title\}/g, f.title);
      lines = [fill(pick(FACT_OPEN)), fill(pick(FACT_REACT)), pick(FACT_MID), pick(FACT_CLOSE)];
    }
  }

  // 3. role banter
  if (!lines && roll < 0.56) {
    for (const spec of BY_ROLE.slice().sort(() => Math.random() - 0.5)) {
      const [r1, r2] = spec.roles;
      let swap = null;
      if (matches(r1, ka) && matches(r2, kb)) swap = false;
      else if (matches(r1, kb) && matches(r2, ka)) swap = true;
      if (swap === null) continue;
      key = `role:${spec.lines[0]}`;
      if (recent.includes(key)) continue;
      lines = spec.lines;
      first = swap ? b : a;
      break;
    }
  }

  // 4. weather, time of day, day of the week
  if (!lines && roll < 0.70) {
    const day = new Date().getDay();
    const options = [...(WEATHER[ctx.weather] ?? []), ...(PERIOD[ctx.period] ?? []), ...(DAY[day] ?? [])];
    const fresh = options.filter((l) => !recent.includes(`ctx:${l[0]}`));
    if (fresh.length) {
      lines = pick(fresh);
      key = `ctx:${lines[0]}`;
    }
  }

  // 5. everything else
  if (!lines) {
    const pool = POOL.map((l, i) => ({ l, k: `gen:${i}` })).filter((x) => !recent.includes(x.k));
    const chosen = pick(pool.length ? pool : POOL.map((l, i) => ({ l, k: `gen:${i}` })));
    lines = chosen.l;
    key = chosen.k;
  }
  recent.push(key);
  while (recent.length > 40) recent.shift();

  const second = first === a ? b : a;
  return lines.map((text, i) => {
    const who = i % 2 === 0 ? first : second;
    const other = who === first ? second : first;
    const line = { who, text: text.replaceAll("{lawan}", other.name) };
    if (i === 0 && meta) line.news = meta;
    return line;
  });
};

export const topicCount = () => POOL.length + BY_ROLE.length + Object.values(WEATHER).flat().length + Object.values(PERIOD).flat().length + Object.values(DAY).flat().length;
