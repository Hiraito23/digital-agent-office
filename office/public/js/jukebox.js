// Background music playlist from local files (office/public/audio).
// Plays the tracks in order and starts over after the last one.
// Browsers block autoplay with sound, so playback may start on the first interaction.
const PLAYLIST = [
  { src: "/audio/asuka-city.mp3", title: "Title / Asuka City — Digimon World 3 OST" },
  { src: "/audio/littleroot-town.mp3", title: "Littleroot Town — Pokémon Omega Ruby & Alpha Sapphire" },
];
const STORE_KEY = "kantor-hermes-jukebox";

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
};
const save = (state) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
};

export const initJukebox = () => {
  const panel = document.getElementById("jukebox");
  const toggle = document.getElementById("music-toggle");
  const playBtn = document.getElementById("jb-play");
  const nextBtn = document.getElementById("jb-next");
  const volume = document.getElementById("jb-volume");
  const trackEl = document.querySelector("#jukebox .jb-track");
  const state = { volume: 40, track: 0, ...load() };
  if (!(state.track >= 0 && state.track < PLAYLIST.length)) state.track = 0;
  volume.value = state.volume;

  const audio = new Audio();
  audio.preload = "auto";
  let ducked = false;
  const applyVolume = () => {
    audio.volume = (ducked ? state.volume * 0.25 : state.volume) / 100;
  };

  const showTrack = () => {
    trackEl.textContent = `${state.track + 1}/${PLAYLIST.length} · ${PLAYLIST[state.track].title}`;
  };
  const loadTrack = (index) => {
    state.track = (index + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[state.track].src;
    applyVolume();
    showTrack();
    save(state);
  };
  loadTrack(state.track);

  const setPlayingUi = () => {
    const playing = !audio.paused;
    playBtn.textContent = playing ? "❚❚ Jeda" : "▶ Putar";
    toggle.classList.toggle("playing", playing);
  };
  audio.addEventListener("play", setPlayingUi);
  audio.addEventListener("pause", setPlayingUi);

  const play = () => {
    audio.play().then(() => {
      state.wantPlay = true;
      save(state);
    }).catch(() => { /* needs a user gesture first */ });
  };
  const pause = () => {
    audio.pause();
    state.wantPlay = false;
    save(state);
  };
  const next = () => {
    const wasPlaying = !audio.paused || state.wantPlay !== false;
    loadTrack(state.track + 1);
    if (wasPlaying) play();
  };

  // one track ends → the next one starts (and the list wraps around)
  audio.addEventListener("ended", next);

  // ♪ Musik shows/hides the small panel; the music keeps playing either way.
  toggle.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.getElementById("jb-close").addEventListener("click", () => panel.classList.add("hidden"));
  playBtn.addEventListener("click", () => (audio.paused ? play() : pause()));
  nextBtn.addEventListener("click", next);

  volume.addEventListener("input", () => {
    state.volume = Number(volume.value);
    applyVolume();
    save(state);
  });

  // Autoplay: music is on unless the user paused it last time. Try right away;
  // if the browser blocks sound before any interaction, start on the first
  // click, key, touch or scroll anywhere on the page.
  if (state.wantPlay !== false) {
    const events = ["pointerdown", "keydown", "touchstart", "wheel"];
    const resume = (event) => {
      events.forEach((e) => window.removeEventListener(e, resume, true));
      // a first click on the jukebox buttons is handled by the buttons themselves
      if (event?.target?.closest?.("#jb-play, #jb-next")) return;
      if (audio.paused) play();
    };
    audio.play().then(() => {
      state.wantPlay = true;
      save(state);
    }).catch(() => {
      events.forEach((e) => window.addEventListener(e, resume, { capture: true, passive: true }));
    });
  }

  // Lower the music while an agent speaks.
  const duck = (on) => {
    ducked = on;
    applyVolume();
  };
  return { duck };
};
