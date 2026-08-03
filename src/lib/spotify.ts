import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "astro:env/server";

const SHOW_ID = "6E0Kks0fEvCGbwy1cmpKUS";
const MARKET = "ES";

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  releaseDate: string;
  durationMs: number;
  externalUrl: string;
  imageUrl: string | null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`No se pudo autenticar con Spotify (${response.status})`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export async function getRecentEpisodes(limit: number): Promise<SpotifyEpisode[]> {
  const token = await getAccessToken();
  const response = await fetch(
    `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?market=${MARKET}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    throw new Error(`No se pudo obtener los episodios de Spotify (${response.status})`);
  }

  const data = (await response.json()) as {
    items: Array<{
      id: string;
      name: string;
      description: string;
      release_date: string;
      duration_ms: number;
      external_urls: { spotify: string };
      images: Array<{ url: string }>;
    }>;
  };

  return data.items.map((episode) => ({
    id: episode.id,
    name: episode.name.trim(),
    description: episode.description,
    releaseDate: episode.release_date,
    durationMs: episode.duration_ms,
    externalUrl: episode.external_urls.spotify,
    imageUrl: episode.images[0]?.url ?? null,
  }));
}

export async function getLatestEpisode(): Promise<SpotifyEpisode | null> {
  const [episode] = await getRecentEpisodes(1);
  return episode ?? null;
}
