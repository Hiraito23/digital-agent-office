// Header buttons for the sky: time of day (otomatis, pagi, siang, sore, malam) and weather
// (cerah, berawan, hujan, badai, kabut). Each click moves to the next option; the choice is
// remembered per browser. The world (world/environment.js) does the actual lighting.
import { TIMES, WEATHERS } from "../world/environment.js";

const KEY_TIME = "kantor-hermes-time";
const KEY_WEATHER = "kantor-hermes-weather";

const load = (key, options, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return options.some((o) => o.id === v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

export const initEnvironmentControls = ({ world }) => {
  const env = world.environment;
  const timeBtn = document.getElementById("time-toggle");
  const weatherBtn = document.getElementById("weather-toggle");
  let time = load(KEY_TIME, TIMES, "auto");
  let weather = load(KEY_WEATHER, WEATHERS, "cerah");

  const render = () => {
    const t = TIMES.find((x) => x.id === time);
    const w = WEATHERS.find((x) => x.id === weather);
    // "otomatis" also shows which part of the day it is right now
    timeBtn.textContent = time === "auto" ? `${t.icon} Otomatis · ${env.periodName()}` : `${t.icon} ${t.label}`;
    timeBtn.title = `Waktu: ${t.title}. Klik untuk berganti (otomatis, pagi, siang, sore, malam)`;
    weatherBtn.textContent = `${w.icon} ${w.label}`;
    weatherBtn.title = "Cuaca. Klik untuk berganti (cerah, berawan, hujan, badai, kabut)";
    timeBtn.classList.toggle("playing", time !== "auto");
    weatherBtn.classList.toggle("playing", weather !== "cerah");
  };

  env.setTime(time, { instant: true });
  env.setWeather(weather);
  render();

  timeBtn.addEventListener("click", () => {
    time = TIMES[(TIMES.findIndex((t) => t.id === time) + 1) % TIMES.length].id;
    env.setTime(time);
    store(KEY_TIME, time);
    render();
  });
  weatherBtn.addEventListener("click", () => {
    weather = WEATHERS[(WEATHERS.findIndex((w) => w.id === weather) + 1) % WEATHERS.length].id;
    env.setWeather(weather);
    store(KEY_WEATHER, weather);
    render();
  });
  // the label of "otomatis" follows the clock; a manual time-lapse also ends up here
  setInterval(render, 5000);
};
