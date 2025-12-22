import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

// ===== ENV VARS =====
let {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URL,              // <-- Add this in Render
  SPOTIFY_REFRESH_TOKEN
} = process.env;

// ===== LOAD REFRESH TOKEN FROM FILE IF EXISTS =====
if (fs.existsSync("refresh_token.txt")) {
  SPOTIFY_REFRESH_TOKEN = fs.readFileSync("refresh_token.txt", "utf8").trim();
  console.log("Loaded refresh token from file");
}

// ===== TOKEN CACHE =====
let accessToken = null;
let accessTokenExpiresAt = 0;

// ===== GET ACCESS TOKEN =====
async function getAccessToken() {
  const now = Date.now();

  if (accessToken && now < accessTokenExpiresAt - 30000) {
    return accessToken;
  }

  const creds = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

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
    console.error("Failed to refresh token:", await res.text());
    throw new Error("Token refresh failed");
  }

  const data = await res.json();
  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + data.expires_in * 1000;

  return accessToken;
}

// ===== SPOTIFY API WRAPPER =====
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

// ===== CORS =====
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ===== LOGIN =====
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  const scope = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state
  });

  res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

// ===== CALLBACK =====
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  const creds = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });

  const data = await tokenRes.json();

  if (data.error) {
    return res.status(400).send("Error during Spotify login");
  }

  // ===== SAVE REFRESH TOKEN AUTOMATICALLY =====
  if (data.refresh_token) {
    fs.writeFileSync("refresh_token.txt", data.refresh_token);
    SPOTIFY_REFRESH_TOKEN = data.refresh_token;
    console.log("Saved new refresh token");
  }

  // ===== REDIRECT BACK TO FRONTEND =====
  res.redirect(FRONTEND_URL || "/");
});

// ===== API ENDPOINTS =====

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
    await spotifyApi(`/me/player/volume?volume_percent=${percent}`, {
      method: "PUT"
    });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
