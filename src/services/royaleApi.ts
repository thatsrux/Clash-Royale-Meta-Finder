const BASE_URL = '/api';

export const getPlayerProfile = async (playerTag: string, apiKey: string) => {
  const cleanTag = playerTag.replace('#', '');
  const response = await fetch(`${BASE_URL}/players/%23${cleanTag}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch player profile');
  return response.json();
};

export const getAllCards = async (apiKey: string) => {
  const response = await fetch(`${BASE_URL}/cards`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch cards');
  return response.json();
};

export const getLocations = async (apiKey: string) => {
  const response = await fetch(`${BASE_URL}/locations`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
};

export const getSeasons = async (apiKey: string) => {
  const response = await fetch(`${BASE_URL}/locations/global/seasons`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch seasons');
  return response.json();
};

export const getPathOfLegendSeasons = async (apiKey: string) => {
  // Try the official pathoflegend specific endpoint first, fallback to general seasons
  try {
    const response = await fetch(`${BASE_URL}/locations/global/pathoflegend/seasons`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
    });
    if (response.ok) return await response.json();
  } catch (e) { console.warn('[API] PoL specific seasons failed, trying general'); }

  return getSeasons(apiKey);
};

export const fetchRankings = async (apiKey: string, path: string) => {
  console.log(`[API] Fetching Rankings: ${path}`);
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const getPlayerDeck = async (playerTag: string, apiKey: string) => {
  const cleanTag = playerTag.replace('#', '');
  const response = await fetch(`${BASE_URL}/players/%23${cleanTag}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.currentDeck;
};

export const getBattleLog = async (playerTag: string, apiKey: string) => {
  const cleanTag = playerTag.replace('#', '');
  console.log(`[API] Fetching Battle Log for: ${cleanTag}`);
  const response = await fetch(`${BASE_URL}/players/%23${cleanTag}/battlelog`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) return null;
  return response.json();
};
