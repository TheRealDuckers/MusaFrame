const params = new URLSearchParams(location.search);
const token = params.get("token");

if (token) {
  localStorage.setItem("deviceToken", token);
  history.replaceState({}, "", "/MusaFrame/");
}


const BACKEND = "https://musaframe.onrender.com";

// Read device token (must exist or user is blocked)
const DEVICE_TOKEN = localStorage.getItem("deviceToken");

document.addEventListener("DOMContentLoaded", () => {
// If no token → block immediately
if (!DEVICE_TOKEN) {
  document.body.innerHTML = "Not authorized.";
  throw new Error("No device token");
}
});

const app = document.getElementById("app");
const bg = document.getElementById("bg");

const albumArt = document.getElementById("albumArt");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");

const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const volumeSlider = document.getElementById("volumeSlider");

let isPlaying = false;
let idleTimeout;

const fallbackArt = "favicon.png";

// Helper for secure POST requests
function post(url) {
  return fetch(url, {
    method: "POST",
    headers: {
      "x-device-token": DEVICE_TOKEN
    }
  });
}

// Fetch now playing
async function updateNowPlaying() {
  try {
    const res = await fetch(`${BACKEND}/api/current`);
    const data = await res.json();

    // If backend says "not logged in" → redirect
    if (!data || !data.item) {
      window.location.href = `${BACKEND}/login`;
      return;
    }

    const track = data.item;
    const artists = track.artists.map(a => a.name).join(", ");

    trackTitle.textContent = track.name;
    trackMeta.textContent = artists;

    // Safe fallback album art
    let artUrl = fallbackArt;
    if (
      track &&
      track.album &&
      Array.isArray(track.album.images) &&
      track.album.images.length > 0
    ) {
      artUrl = track.album.images[0].url;
    }

    albumArt.src = artUrl;
    bg.style.backgroundImage = `url(${artUrl})`;

    isPlaying = data.is_playing;
    playPauseIcon.className = isPlaying ? "icon-pause" : "icon-play";

  } catch (err) {
    console.error("Error updating now playing:", err);
  }
}

// Controls (secure)
playPauseBtn.onclick = () => {
  post(`${BACKEND}/api/${isPlaying ? "pause" : "play"}`);
  isPlaying = !isPlaying;
  playPauseIcon.className = isPlaying ? "icon-pause" : "icon-play";
};

nextBtn.onclick = () => post(`${BACKEND}/api/next`);
prevBtn.onclick = () => post(`${BACKEND}/api/previous`);

volumeSlider.oninput = () => {
  post(`${BACKEND}/api/volume?percent=${volumeSlider.value}`);
};

enterFullscreen()

// Auto-update every 3 seconds
setInterval(updateNowPlaying, 3000);
updateNowPlaying();

// TAP TO OPEN/CLOSE CONTROLS
function toggleControls() {
  if (app.classList.contains("expanded")) {
    app.classList.remove("expanded");
    clearTimeout(idleTimeout);
  } else {
    app.classList.add("expanded");
    idleTimeout = setTimeout(() => app.classList.remove("expanded"), 5000);
  }
}

document.body.addEventListener("pointerdown", toggleControls);

// LOGIN CHECK
async function checkLogin() {
  try {
    const res = await fetch(`${BACKEND}/api/current`);
    const data = await res.json();

    if (!data || !data.item) {
      window.location.href = `${BACKEND}/login`;
      return false;
    }

    return true;

  } catch (err) {
    window.location.href = `${BACKEND}/login`;
    return false;
  }
}

window.addEventListener("load", checkLogin);

// FULLSCREEN HELPERS
function enterFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) exitFullscreen();
  else enterFullscreen();
}


document.addEventListener("pointerup", () => clearTimeout(holdTimer));
document.addEventListener("pointerleave", () => clearTimeout(holdTimer));

// Tap album art → toggle fullscreen
albumArt.addEventListener("click", toggleFullscreen);

