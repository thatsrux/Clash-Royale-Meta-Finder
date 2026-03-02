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
  // Official path for trophy road seasons (if it exists, though usually it's just /locations/global/seasons)
  const response = await fetch(`${BASE_URL}/locations/global/seasons`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch seasons');
  return response.json();
};

export const getPathOfLegendSeasons = async (apiKey: string) => {
  // Official path for Path of Legend (Ranked) seasons
  try {
    const response = await fetch(`${BASE_URL}/locations/global/rankings/seasons`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Accept': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`[API] PoL/Ranked Seasons found: ${data.items?.length || 0}`);
      return data;
    }
  } catch (e) { console.warn('[API] Ranked seasons specific path failed'); }

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
  if (!data.items || data.items.length === 0) {
    console.log(`[API] No items returned from: ${path}`);
  }
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
