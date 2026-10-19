// Jukebox: background music from local files in office/public/audio.
//
// Controls: previous / play-pause / next, repeat mode (all, one, off), a
// progress bar with the remaining time (click it to seek) and volume.
// The chosen track, repeat mode and volume are remembered per browser.
// Browsers block autoplay with sound, so playback may start on the first
// click or key press anywhere on the page.

// Add your own MP3s to office/public/audio and list them here.
const PLAYLIST = [
  { src: "/audio/title - asuka city.mp3", title: "Title - Asuka City" },
  { src: "/audio/title - harvest moon.mp3", title: "Main Theme Harvest Moon" },
  { src: "/audio/littleroot - pokemon.mp3", title: "Littleroot - Pokemon" },
];

const REPEAT_MODES = [
  { id: "all", icon: "🔁", label: "Ulangi semua" },
  { id: "one", icon: "🔂", label: "Ulangi lagu ini" },
  { id: "off", icon: "➡", label: "Tanpa ulang" },
];

const STORE_KEY = "kantor-hermes-jukebox";
const DUCK_LEVEL = 0.25; // music volume while an agent is speaking

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
};
const saveState = (state) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
};

// 75.4 → "1:15"
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const initJukebox = () => {
  const el = {
    panel: document.getElementById("jukebox"),
    toggle: document.getElementById("music-toggle"),
    close: document.getElementById("jb-close"),
    track: document.querySelector("#jukebox .jb-track"),
    prev: document.getElementById("jb-prev"),
    play: document.getElementById("jb-play"),
    next: document.getElementById("jb-next"),
    repeat: document.getElementById("jb-repeat"),
    progress: document.getElementById("jb-progress"),
    bar: document.getElementById("jb-progress-bar"),
    elapsed: document.getElementById("jb-elapsed"),
    remaining: document.getElementById("jb-remaining"),
    volume: document.getElementById("jb-volume"),
  };

  const state = { volume: 40, track: 0, repeat: "all", ...loadState() };
  if (!(state.track >= 0 && state.track < PLAYLIST.length)) state.track = 0;
  if (!REPEAT_MODES.some((m) => m.id === state.repeat)) state.repeat = "all";
  el.volume.value = state.volume;

  const audio = new Audio();
  audio.preload = "auto";
  let ducked = false;

  // ---- rendering ------------------------------------------------------------

  const applyVolume = () => {
    audio.volume = (state.volume * (ducked ? DUCK_LEVEL : 1)) / 100;
  };

  const renderTrack = () => {
    el.track.textContent = `${state.track + 1}/${PLAYLIST.length} · ${PLAYLIST[state.track].title}`;
  };

  const renderPlaying = () => {
    const playing = !audio.paused;
    el.play.textContent = playing ? "❚❚" : "▶";
    el.play.title = playing ? "Jeda" : "Putar";
    el.toggle.classList.toggle("playing", playing);
  };

  const renderRepeat = () => {
    const mode = REPEAT_MODES.find((m) => m.id === state.repeat);
    el.repeat.textContent = mode.icon;
    el.repeat.title = mode.label;
    el.repeat.classList.toggle("off", mode.id === "off");
    audio.loop = mode.id === "one";
  };

  const renderTime = () => {
    const duration = audio.duration;
    const known = Number.isFinite(duration) && duration > 0;
    el.bar.style.width = known
      ? `${(audio.currentTime / duration) * 100}%`
      : "0%";
    el.elapsed.textContent = formatTime(audio.currentTime);
    el.remaining.textContent = known
      ? `-${formatTime(duration - audio.currentTime)}`
      : "-0:00";
  };

  // ---- playback ---------------------------------------------------------------

  const loadTrack = (index) => {
    state.track = (index + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[state.track].src;
    applyVolume();
    renderTrack();
    renderTime();
    saveState(state);
  };

  const play = () => {
    audio
      .play()
      .then(() => {
        state.wantPlay = true;
        saveState(state);
      })
      .catch(() => {
        /* needs a user gesture first */
      });
  };

  const pause = () => {
    audio.pause();
    state.wantPlay = false;
    saveState(state);
  };

  const isPlaying = () => !audio.paused || state.wantPlay !== false;

  const goTo = (index) => {
    const resume = isPlaying();
    loadTrack(index);
    if (resume) play();
  };

  const next = () => goTo(state.track + 1);

  // "Previous" restarts the current song when it is more than 3 s in,
  // like most music players; otherwise it goes to the previous song.
  const previous = () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    goTo(state.track - 1);
  };

  // A song finished: "one" never gets here (audio.loop), "all" wraps around,
  // "off" stops after the last song.
  const onEnded = () => {
    const last = state.track === PLAYLIST.length - 1;
    if (state.repeat === "off" && last) {
      loadTrack(0);
      pause();
      return;
    }
    goTo(state.track + 1);
  };

  const cycleRepeat = () => {
    const i = REPEAT_MODES.findIndex((m) => m.id === state.repeat);
    state.repeat = REPEAT_MODES[(i + 1) % REPEAT_MODES.length].id;
    renderRepeat();
    saveState(state);
  };

  const seek = (event) => {
    if (!Number.isFinite(audio.duration)) return;
    const rect = el.progress.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    audio.currentTime = ratio * audio.duration;
  };

  // ---- wiring -----------------------------------------------------------------

  audio.addEventListener("play", renderPlaying);
  audio.addEventListener("pause", renderPlaying);
  audio.addEventListener("ended", onEnded);
  audio.addEventListener("timeupdate", renderTime);
  audio.addEventListener("loadedmetadata", renderTime);
  // MP3s are not in git: tell the user where to put them instead of staying silent.
  audio.addEventListener("error", () => {
    el.track.textContent = `File ${PLAYLIST[state.track].src.replace("/audio/", "")} belum ada di office/public/audio (lihat README di folder itu)`;
  });

  // ♪ Musik shows/hides the panel; the music keeps playing either way.
  el.toggle.addEventListener("click", () =>
    el.panel.classList.toggle("hidden"),
  );
  el.close.addEventListener("click", () => el.panel.classList.add("hidden"));
  el.play.addEventListener("click", () => (audio.paused ? play() : pause()));
  el.prev.addEventListener("click", previous);
  el.next.addEventListener("click", next);
  el.repeat.addEventListener("click", cycleRepeat);
  el.progress.addEventListener("click", seek);
  el.volume.addEventListener("input", () => {
    state.volume = Number(el.volume.value);
    applyVolume();
    saveState(state);
  });

  loadTrack(state.track);
  renderRepeat();
  renderPlaying();

  // Autoplay unless the user paused last time. If the browser blocks it,
  // start on the first interaction (but let jukebox buttons handle their own click).
  if (state.wantPlay !== false) {
    const events = ["pointerdown", "keydown", "touchstart", "wheel"];
    const resume = (event) => {
      events.forEach((e) => window.removeEventListener(e, resume, true));
      if (event?.target?.closest?.("#jukebox button, #jb-progress")) return;
      if (audio.paused) play();
    };
    audio
      .play()
      .then(() => {
        state.wantPlay = true;
        saveState(state);
      })
      .catch(() => {
        events.forEach((e) =>
          window.addEventListener(e, resume, { capture: true, passive: true }),
        );
      });
  }

  // Lower the music while an agent speaks (called from main.js).
  const duck = (on) => {
    ducked = on;
    applyVolume();
  };
  return { duck };
};
