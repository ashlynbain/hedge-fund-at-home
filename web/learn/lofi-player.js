/** Optional study lofi — plays only after you click (browser autoplay rules). */
(function () {
  const STORAGE_VOL = "hfah-lofi-volume";
  const STORAGE_PLAYING = "hfah-lofi-playing";
  const STORAGE_STATION = "hfah-lofi-station";
  const DEFAULT_STATION = "dronezone";

  const STATION_GROUPS = [
    {
      label: "Lofi & downtempo beats",
      stations: [
        { id: "groovesalad", label: "Groove Salad", hint: "Ambient downtempo beats" },
        { id: "groovesalad2", label: "Groove Salad 2", hint: "Alt chill beat mix" },
        { id: "gsclassic", label: "Groove Salad Classic", hint: "Early-2000s chill beats" },
        { id: "beatblender", label: "Beat Blender", hint: "Deep-house downtempo" },
        { id: "spacestation", label: "Space Station Soma", hint: "Spaced-out mid-tempo" },
        { id: "secretagent", label: "Secret Agent", hint: "Cinematic lounge chill" },
        { id: "fluid", label: "Fluid", hint: "Nu-jazz & mellow grooves" },
      ],
    },
    {
      label: "Softer / study ambient",
      stations: [
        { id: "lush", label: "Lush", hint: "Sensual downtempo & vocals" },
        { id: "dronezone", label: "Drone Zone", hint: "Ultra-calm ambient textures" },
        { id: "sonicuniverse", label: "Sonic Universe", hint: "Mellow jazz & soul" },
      ],
    },
  ];

  const STATIONS = STATION_GROUPS.flatMap((g) =>
    g.stations.map((s) => ({
      ...s,
      url: `https://ice1.somafm.com/${s.id}-128-mp3`,
    }))
  );

  const audio = document.getElementById("lofi-audio");
  const toggle = document.getElementById("lofi-toggle");
  const label = document.getElementById("lofi-label");
  const volWrap = document.getElementById("lofi-vol-wrap");
  const vol = document.getElementById("lofi-volume");
  const station = document.getElementById("lofi-station");
  const dock = document.getElementById("lofi-dock");

  if (!audio || !toggle || !label || !vol || !station || !dock) return;

  function populateStationSelect() {
    station.textContent = "";
    for (const group of STATION_GROUPS) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group.label;
      for (const s of group.stations) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        opt.title = s.hint;
        optgroup.appendChild(opt);
      }
      station.appendChild(optgroup);
    }
  }

  populateStationSelect();

  let playing = false;
  let pendingResume = localStorage.getItem(STORAGE_PLAYING) === "1";

  function stationById(id) {
    return STATIONS.find((s) => s.id === id) || STATIONS[0];
  }

  function savedVolume() {
    const raw = parseFloat(localStorage.getItem(STORAGE_VOL));
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.35;
  }

  function setUi() {
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    label.textContent = playing ? "Lofi on" : "Lofi off";
    dock.classList.toggle("lofi-dock--playing", playing);
    volWrap.hidden = !playing;
  }

  function applyVolume() {
    audio.volume = vol.value / 100;
    localStorage.setItem(STORAGE_VOL, String(audio.volume));
  }

  function setStation(id, { restart } = { restart: false }) {
    const picked = stationById(id);
    station.value = picked.id;
    localStorage.setItem(STORAGE_STATION, picked.id);
    const wasPlaying = playing;
    if (wasPlaying) audio.pause();
    audio.src = picked.url;
    audio.load();
    if (wasPlaying && restart) play();
  }

  async function play() {
    applyVolume();
    try {
      await audio.play();
      playing = true;
      pendingResume = false;
      localStorage.setItem(STORAGE_PLAYING, "1");
      setUi();
    } catch {
      playing = false;
      localStorage.setItem(STORAGE_PLAYING, "0");
      setUi();
      label.textContent = "Tap to play";
    }
  }

  function pause() {
    audio.pause();
    playing = false;
    pendingResume = false;
    localStorage.setItem(STORAGE_PLAYING, "0");
    setUi();
  }

  toggle.addEventListener("click", () => {
    if (playing) pause();
    else play();
  });

  vol.addEventListener("input", applyVolume);

  station.addEventListener("change", () => {
    setStation(station.value, { restart: true });
  });

  audio.addEventListener("playing", () => {
    playing = true;
    setUi();
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      playing = false;
      setUi();
    }
  });

  audio.addEventListener("error", () => {
    playing = false;
    localStorage.setItem(STORAGE_PLAYING, "0");
    label.textContent = "Stream unavailable";
    setUi();
  });

  vol.value = String(Math.round(savedVolume() * 100));
  applyVolume();
  setStation(localStorage.getItem(STORAGE_STATION) || DEFAULT_STATION, { restart: false });
  setUi();

  if (pendingResume) {
    label.textContent = "Click anywhere to resume";
    const resume = () => {
      if (pendingResume) play();
    };
    document.addEventListener("click", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });
  }
})();
