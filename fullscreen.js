let holdTimer;
let isFullscreen = false;

function enterFullscreen() {
  const el = document.documentElement;

  if (!isFullscreen) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();

    isFullscreen = true;
  }
}

// Detect long press (2000ms)
document.addEventListener("pointerdown", () => {
  holdTimer = setTimeout(() => {
    enterFullscreen();
  }, 2000); // 2 seconds
});

document.addEventListener("pointerup", () => {
  clearTimeout(holdTimer);
});

document.addEventListener("pointerleave", () => {
  clearTimeout(holdTimer);
});
