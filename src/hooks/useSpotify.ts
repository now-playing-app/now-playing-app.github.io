// src/hooks/useSpotify.ts
import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124';
const REDIRECT_URI = 'https://now-playing-app.github.io/';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-private',
  'user-top-read',
  'user-library-read'
];

function generateRandomString(length: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const useSpotify = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));
  const [user, setUser] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('code_verifier');
    setToken(null);
    setUser(null);
    setTrack(null);
    setTopArtists([]);
  };

  const exchangeCodeForToken = useCallback(async (code: string) => {
    const codeVerifier = localStorage.getItem('code_verifier');
    if (!codeVerifier) return;

    setIsLoading(true);
    try {
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      });

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await response.json();
      
      if (data.access_token) {
        localStorage.setItem('spotify_token', data.access_token);
        setToken(data.access_token);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error('Token exchange error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error('User profile fetch error:', err);
    }
  }, []);

  const fetchCurrentlyPlaying = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 204 || res.status === 205) {
        setTrack(null);
        return;
      }
      if (res.status === 200) {
        const data = await res.json();
        setTrack(data.item);
      }
    } catch (err) {
      console.error('Currently playing fetch error:', err);
    }
  }, []);

  const fetchTopArtists = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopArtists(data.items);
      }
    } catch (err) {
      console.error('Top artists fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !token) {
      exchangeCodeForToken(code);
    } else if (token) {
      fetchUserProfile(token);
      fetchTopArtists(token);
      fetchCurrentlyPlaying(token);
    }
  }, [token, exchangeCodeForToken, fetchUserProfile, fetchTopArtists, fetchCurrentlyPlaying]);

  return {
    token,
    user,
    track,
    topArtists,
    isLoading,
    handleLogin,
    handleLogout,
    fetchCurrentlyPlaying: () => token && fetchCurrentlyPlaying(token),
  };
};