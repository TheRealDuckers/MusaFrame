const BACKEND = "https://musaframe.onrender.com";

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

// Fetch now playing
async function updateNowPlaying() {
  try {
    const res = await fetch(`${BACKEND}/api/current`);
    const data = await res.json();

    if (!data || !data.item) return;

    const track = data.item;
    const artists = track.artists.map(a => a.name).join(", ");

    trackTitle.textContent = track.name;
    trackMeta.textContent = artists;

    const artUrl = track.album.images[0].url;
    albumArt.src = artUrl;
    bg.style.backgroundImage = `url(${artUrl})`;

    isPlaying = data.is_playing;
    playPauseIcon.className = isPlaying ? "icon-pause" : "icon-play";

  } catch (err) {
    console.error("Error updating now playing:", err);
  }
}

// Controls (main)
playPauseBtn.onclick = () => {
  fetch(`${BACKEND}/api/${isPlaying ? "pause" : "play"}`, { method: "POST" });
  isPlaying = !isPlaying;
  playPauseIcon.className = isPlaying ? "icon-pause" : "icon-play";
};

nextBtn.onclick = () => fetch(`${BACKEND}/api/next`, { method: "POST" });
prevBtn.onclick = () => fetch(`${BACKEND}/api/previous`, { method: "POST" });

volumeSlider.oninput = () => {
  fetch(`${BACKEND}/api/volume?percent=${volumeSlider.value}`, {
    method: "POST"
  });
};

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
