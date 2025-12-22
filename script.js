const BACKEND = "https://musaframe.onrender.com";

const albumArt = document.getElementById("albumArt");
const trackName = document.getElementById("trackName");
const artistName = document.getElementById("artistName");
const background = document.getElementById("background");

const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const volumeSlider = document.getElementById("volumeSlider");

let isPlaying = false;

// Fetch now playing
async function updateNowPlaying() {
  try {
    const res = await fetch(`${BACKEND}/api/current`);
    const data = await res.json();

    if (!data || !data.item) return;

    const track = data.item;
    const artists = track.artists.map(a => a.name).join(", ");

    trackName.textContent = track.name;
    artistName.textContent = artists;

    const artUrl = track.album.images[0].url;
    albumArt.src = artUrl;
    background.style.backgroundImage = `url(${artUrl})`;

    isPlaying = data.is_playing;
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶️";

  } catch (err) {
    console.error("Error updating now playing:", err);
  }
}

// Controls
playPauseBtn.onclick = () => {
  fetch(`${BACKEND}/api/${isPlaying ? "pause" : "play"}`, { method: "POST" });
  isPlaying = !isPlaying;
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶️";
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

// Motion-activated controls (Fire tablet)
window.addEventListener("devicemotion", () => {
  document.getElementById("controls").style.opacity = 1;
  setTimeout(() => {
    document.getElementById("controls").style.opacity = 0.3;
  }, 3000);
});
