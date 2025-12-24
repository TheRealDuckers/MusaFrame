document.addEventListener("DOMContentLoaded", () => {
// If no token → block immediately
if (!DEVICE_TOKEN) {
  document.body.innerHTML = "Not authorized.";
  throw new Error("No device token");
}
});
