import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import cors from "cors";
import qs from "qs";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI
} = process.env;

let accessToken = null;
let refreshToken = null;
let deviceToken = null; // Only the paired device gets this

// Helper: Spotify API request with auto-refresh
async function spotifyRequest(method, url, data = {}) {
  try {
    const res = await axios({
      method,
      url,
      headers: { Authorization: `Bearer ${accessToken}` },
      data
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      await refreshAccessToken();
      const retry = await axios({
        method,
        url,
        headers: { Authorization: `Bearer ${accessToken}` },
        data
      });
      return retry.data;
    }
    throw err;
  }
}

// Refresh token
async function refreshAccessToken() {
  const body = qs.stringify({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const auth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    body,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  accessToken = res.data.access_token;
  console.log("🔄 Access token refreshed");
}

// Login route
app.get("/login", (req, res) => {
  const scope = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
  ].join(" ");

  const params = qs.stringify({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Callback route
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const body = qs.stringify({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI
  });

  const auth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await axios.post(
    "https://accounts.spotify.com/api/token",
    body,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  accessToken = tokenRes.data.access_token;
  refreshToken = tokenRes.data.refresh_token;

  // Generate a device token tied to THIS login
  deviceToken = crypto.randomBytes(32).toString("hex");
  console.log("🔐 Device paired:", deviceToken);

  // Redirect token to the frontend domain
  res.redirect(`https://therealduckers.github.io/MusaFrame/?token=${deviceToken}`);
});

// Middleware: only the paired device can control playback
function checkDeviceToken(req, res, next) {
  const token = req.headers["x-device-token"];
  if (!token || token !== deviceToken) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Get current track
app.get("/api/current", async (req, res) => {
  try {
    if (!accessToken) return res.json({ item: null });

    const data = await spotifyRequest(
      "get",
      "https://api.spotify.com/v1/me/player/currently-playing"
    );

    res.json(data || { item: null });
  } catch (err) {
    res.json({ item: null });
  }
});

// Playback controls
app.post("/api/play", checkDeviceToken, async (req, res) => {
  await spotifyRequest("put", "https://api.spotify.com/v1/me/player/play");
  res.json({ ok: true });
});

app.post("/api/pause", checkDeviceToken, async (req, res) => {
  await spotifyRequest("put", "https://api.spotify.com/v1/me/player/pause");
  res.json({ ok: true });
});

app.post("/api/next", checkDeviceToken, async (req, res) => {
  await spotifyRequest("post", "https://api.spotify.com/v1/me/player/next");
  res.json({ ok: true });
});

app.post("/api/previous", checkDeviceToken, async (req, res) => {
  await spotifyRequest("post", "https://api.spotify.com/v1/me/player/previous");
  res.json({ ok: true });
});

// Volume
app.post("/api/volume", checkDeviceToken, async (req, res) => {
  const percent = req.query.percent || 50;
  await spotifyRequest(
    "put",
    `https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}`
  );
  res.json({ ok: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MusaFrame backend running on ${PORT}`));
