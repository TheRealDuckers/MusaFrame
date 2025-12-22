const BACKEND = "https://musaframe.onrender.com";

const app = document.getElementById("app");
const bg = document.getElementById("bg");

const albumArt = document.getElementById("albumArt");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");

const playPauseBtn = document.getElementById("playPauseBtn");
const playIcon = document.getElementById("playIcon");
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
    playIcon.innerHTML = isPlaying
      ? `<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`
      : `<path fill="currentColor" d="M8 5v14l11-7z"/>`;

  } catch (err) {
    console.error("Error updating now playing:", err);
  }
}

// Controls
playPauseBtn.onclick = () => {
  fetch(`${BACKEND}/api/${isPlaying ? "pause" : "play"}`, { method: "POST" });
  isPlaying = !isPlaying;
  playIcon.innerHTML = isPlaying
    ? `<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`
    : `<path fill="currentColor" d="M8 5v14l11-7z"/>`;
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

// Expand controls on tap or motion
function expandControls() {
  app.classList.add("expanded");
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => app.classList.remove("expanded"), 4000);
}

document.addEventListener("click", expandControls);
window.addEventListener("devicemotion", expandControls);
