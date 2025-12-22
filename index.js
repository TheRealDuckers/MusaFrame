import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_REFRESH_TOKEN
} = process.env;

let accessToken = null;
let accessTokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < accessTokenExpiresAt - 30000) {
    return accessToken;
  }

  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  });

  if (!res.ok) {
    console.error("Failed to refresh token", await res.text());
    throw new Error("Token refresh failed");
  }

  const data = await res.json();
  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + (data.expires_in * 1000);
  return accessToken;
}

async function spotifyApi(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method: options.method || "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok && res.status !== 204) {
    console.error("Spotify API error", res.status, await res.text());
    throw new Error("Spotify API error");
  }
  if (res.status === 204) return null;
  return await res.json();
}

// CORS (for local dev / Render → tablet)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Now playing
app.get("/api/current", async (req, res) => {
  try {
    const data = await spotifyApi("/me/player/currently-playing");
    res.json(data || {});
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Play
app.post("/api/play", async (req, res) => {
  try {
    await spotifyApi("/me/player/play", { method: "PUT" });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Pause
app.post("/api/pause", async (req, res) => {
  try {
    await spotifyApi("/me/player/pause", { method: "PUT" });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Next
app.post("/api/next", async (req, res) => {
  try {
    await spotifyApi("/me/player/next", { method: "POST" });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Previous
app.post("/api/previous", async (req, res) => {
  try {
    await spotifyApi("/me/player/previous", { method: "POST" });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// Volume
app.post("/api/volume", async (req, res) => {
  const percent = Number(req.query.percent ?? req.body?.percent ?? 50);
  try {
    await spotifyApi(`/me/player/volume?volume_percent=${percent}`, { method: "PUT" });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
