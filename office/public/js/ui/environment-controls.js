// Header button for the weather (cerah, berawan, hujan, badai, kabut). Each click moves to the
// next option; the choice is remembered per browser. The office is always at night. The world (world/environment.js) does the actual lighting.
import { WEATHERS } from "../world/environment.js";

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
  const weatherBtn = document.getElementById("weather-toggle");
  let weather = load(KEY_WEATHER, WEATHERS, "cerah");

  const render = () => {
    const w = WEATHERS.find((x) => x.id === weather);
    weatherBtn.textContent = `${w.icon} ${w.label}`;
    weatherBtn.title = "Cuaca. Klik untuk berganti (cerah, berawan, hujan, badai, kabut)";
    weatherBtn.classList.toggle("playing", weather !== "cerah");
  };

  env.setTime("malam", { instant: true }); // the office is always at night
  env.setWeather(weather);
  render();

  weatherBtn.addEventListener("click", () => {
    weather = WEATHERS[(WEATHERS.findIndex((w) => w.id === weather) + 1) % WEATHERS.length].id;
    env.setWeather(weather);
    store(KEY_WEATHER, weather);
    render();
  });
};
