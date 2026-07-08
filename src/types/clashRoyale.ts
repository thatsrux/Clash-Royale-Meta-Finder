export interface Card {
  name: string;
  id: number;
  level: number;
  starLevel?: number;
  maxLevel: number;
  count: number;
  key?: string; 
  form?: string; 
  activeForm?: string; 
  slot?: string; 
  _forceForm?: 'hero' | 'evo' | 'normal'; // Internal override for deck visualization
  iconUrls: {
    medium: string;
    evolutionMedium?: string;
    heroMedium?: string; 
  };
  rarity: string;
  evolutionLevel?: number;
  heroLevel?: number;
}

/**
 * DYNAMIC DETECTION LOGIC
 * Disambiguation between Evolutions and Heroes.
 * For DECK cards, we use metadata. For USER cards, we use levels.
 */

// Global registry to share dynamically discovered icon URLs across the app
export const globalIconRegistry: Record<number, { medium?: string, evolutionMedium?: string, heroMedium?: string }> = {};

export const registerCardIcons = (cards: Card[]) => {
  if (!cards || !Array.isArray(cards)) return;
  cards.forEach(c => {
    if (c && c.id && c.iconUrls) {
      if (!globalIconRegistry[c.id]) globalIconRegistry[c.id] = {};
      if (c.iconUrls.medium) globalIconRegistry[c.id].medium = c.iconUrls.medium;
      if (c.iconUrls.evolutionMedium) globalIconRegistry[c.id].evolutionMedium = c.iconUrls.evolutionMedium;
      if (c.iconUrls.heroMedium) globalIconRegistry[c.id].heroMedium = c.iconUrls.heroMedium;
    }
  });
};

export const globalCardMap: Record<number, any> = {};

export const registerAllGameCards = (cards: any[]) => {
  if (!cards || !Array.isArray(cards)) return;
  cards.forEach(c => {
    globalCardMap[c.id] = c;
  });
};

export const getBaseLevel = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'champion': return 11;
    case 'hero': return 11;
    case 'legendary': return 9;
    case 'epic': return 6;
    case 'rare': return 3;
    case 'common': return 1;
    default: return 1;
  }
};

export const getRarityClass = (card: Card) => {
  if (card.name && card.name.toLowerCase().includes('ronin')) return 'legendary';
  const info = globalCardMap[card.id];
  return (info?.rarity || card.rarity || 'common').toLowerCase();
};

export const getDisplayLevel = (card: Card) => {
  const info = globalCardMap[card.id];
  const rarity = (info?.rarity || card.rarity || 'common').toLowerCase();
  const baseLevel = getBaseLevel(rarity);
  const level = Number(card.level) || 0;
  return level + baseLevel - 1;
};



export const isChampion = (card: Card) => {
  return card.rarity?.toLowerCase() === 'champion' || card.activeForm === 'champion';
};

export const isEvoUnlocked = (card: Card) => {
  if (card._forceForm === 'evo') return true;
  if (card._forceForm === 'hero' || card._forceForm === 'normal') return false;

  // 1. Trust evolutionLevel bitmask (1 = Evo, 2 = Hero, 3 = Both)
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0) {
    if ((card.evolutionLevel & 1) === 1) return true;
  }

  // 2. Check metadata keys and icon URLs
  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();
  const iconUrl = (card.iconUrls?.medium || '').toLowerCase();
  
  if (key.endsWith('-evo') || form === 'evolution' || form === 'evo' || activeForm === 'evolution' || activeForm === 'evo') return true;
  if (iconUrl.includes('evo') || iconUrl.includes('ev1')) return true;

  // 3. Last resort: check name
  const name = (card.name || '').toLowerCase();
  if (name.includes('evolved') || name.includes('evolution')) return true;

  return false;
};

export const isHeroVariantUnlocked = (card: Card) => {
  if (card._forceForm === 'hero') return true;
  if (card._forceForm === 'evo' || card._forceForm === 'normal') return false;

  // 1. Trust heroLevel or evolutionLevel bitmask (2 = Hero)
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0) {
    if ((card.evolutionLevel & 2) === 2) return true;
  }

  // 2. Check metadata keys and icon URLs
  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();
  const iconUrl = (card.iconUrls?.medium || '').toLowerCase();

  if (key.endsWith('-hero') || form === 'hero' || activeForm === 'hero' || iconUrl.includes('hero')) return true;
  if (card.rarity?.toLowerCase() === 'hero' || (card.name || '').toLowerCase().includes('hero')) return true;

  return false;
};

export const isAnyHeroUnlocked = (card: Card) => {
  return isChampion(card) || isHeroVariantUnlocked(card);
};

// Check if the card definition has an Evolution version available (Static check)
export const hasEvoAvailable = (card: Card) => {
  if (!card) return false;
  const name = (card.name || '').toLowerCase();
  const slug = getCardSlug(card.name);
  const rarity = (card.rarity || '').toLowerCase();

  // 1. Explicit payload check
  if (card.iconUrls?.evolutionMedium || name.includes('evolved')) return true;

  // 2. Strict allowed list for Evolutions (Exclude Heroes and Champions)
  const evoWhitelist = [
    'princess', 'drill', 'wizard', 'zap', 'tesla', 'wall-breakers', 
    'bomber', 'valkyrie', 'ice-spirit', 'royal-recruits', 'barbs', 'knight', 
    'archer', 'mortar', 'skeleton', 'firecracker', 'rg', 'bats', 
    'battle-ram'
  ];

  // 3. Exclude high rarities that aren't evos
  if (rarity === 'champion' || rarity === 'hero') return false;

  return evoWhitelist.includes(slug);
};

// Check if the card definition has a Hero version available (Static check)
export const hasHeroAvailable = (card: Card) => {
  if (!card) return false;
  const name = (card.name || '').toLowerCase();
  const slug = getCardSlug(card.name);
  const rarity = (card.rarity || '').toLowerCase();

  // 1. Explicit payload check
  if (card.iconUrls?.heroMedium || name.includes('hero') || rarity === 'hero') return true;

  // 2. Strict allowed list for Heroes (Currently Tombstone and Wizard variants)
  const heroWhitelist = ['tombstone', 'wizard'];

  // 3. Champions are NOT Heroes in this context (they have their own section)
  if (rarity === 'champion') return false;

  return heroWhitelist.includes(slug);
};

// Aliases for backward compatibility
export const isEvo = (card: Card) => isEvoUnlocked(card);
export const isHeroVariant = (card: Card) => isHeroVariantUnlocked(card);
export const isAnyHero = (card: Card) => isAnyHeroUnlocked(card);

export interface PlayerProfile {
  tag: string;
  name: string;
  expLevel: number;
  collectionLevel?: number;
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  battleCount: number;
  threeWeaponWins: number;
  cards: Card[];
  supportCards?: Card[];
  currentDeck: Card[];
  currentFavouriteCard?: Card;
}

/**
 * SMART FEATURES: Archetypes & Substitutions
 */

// Basic substitution map by role
const CARD_SUBSTITUTIONS: Record<string, string[]> = {
  'little-prince': ['musketeer', 'dart-goblin', 'archer-queen', 'magic-archer'],
  'archer-queen': ['musketeer', 'little-prince', 'magic-archer'],
  'monk': ['knight', 'valkyrie', 'mini-pekka'],
  'skeleton-king': ['valkyrie', 'knight', 'mighty-miner'],
  'mighty-miner': ['valkyrie', 'mini-pekka', 'knight'],
  'golden-knight': ['knight', 'valkyrie', 'bandit'],
  'log': ['barbarian-barrel', 'zap', 'snowball', 'arrows'],
  'zap': ['snowball', 'log', 'arrows'],
  'fireball': ['poison', 'arrows'],
  'poison': ['fireball'],
  'knight': ['valkyrie', 'ice-golem'],
  'valkyrie': ['knight', 'dark-prince'],
  'hog-rider': ['ram-rider', 'royal-hogs'],
  'goblin-barrel': ['log', 'barbarian-barrel'],
  'tornado': ['poison', 'arrows'],
};

export const getSubstitutions = (slug: string): string[] => {
  return CARD_SUBSTITUTIONS[slug] || [];
};

export const detectArchetype = (cards: Card[]): string => {
  const slugs = cards.map(c => getCardSlug(c.name));
  
  if (slugs.includes('hog-rider') && cards.reduce((acc, c) => acc + c.level, 0) / 8 <= 3.1) return 'Hog Cycle';
  if (slugs.includes('x-bow')) return 'X-Bow Control';
  if (slugs.includes('golem')) return 'Golem Beatdown';
  if (slugs.includes('lavahound') && slugs.includes('clone')) return 'Lava Clone';
  if (slugs.includes('lavahound')) return 'LavaLoon';
  if (slugs.includes('miner') && slugs.includes('poison')) return 'Miner Poison';
  if (slugs.includes('graveyard') && slugs.includes('poison')) return 'Splashyard';
  if (slugs.includes('graveyard')) return 'Graveyard Control';
  if (slugs.includes('goblin-barrel') && slugs.includes('princess')) return 'Log Bait';
  if (slugs.includes('royal-giant')) return 'Royal Giant';
  if (slugs.includes('battle-ram') && slugs.includes('pekka')) return 'Pekka Bridge Spam';
  if (slugs.includes('goblin-giant')) return 'Goblin Giant Sparky';
  if (slugs.includes('balloon') && slugs.includes('lumberjack')) return 'LumberLoon';
  
  return 'Control / Midrange'; // Default fallback
};

const CARD_ELIXIR_COSTS: Record<string, number> = {
  'skeletons': 1, 'ice-spirit': 1, 'fire-spirit': 1, 'electro-spirit': 1, 'heal-spirit': 1,
  'goblins': 2, 'spear-goblins': 2, 'zap': 2, 'giant-snowball': 2, 'bats': 2, 'log': 2, 'barbarian-barrel': 2, 'wall-breakers': 2, 'miner': 3, 'princess': 3,
  'knight': 3, 'archers': 3, 'minions': 3, 'bomber': 2, 'arrows': 3, 'cannon': 3, 'tombstone': 3, 'skeleton-barrel': 3, 'goblin-gang': 3, 'dart-goblin': 3, 'skeleton-army': 3, 'guards': 3, 'ice-golem': 2, 'mega-minion': 3, 'bandit': 3, 'royal-ghost': 3, 'fisherman': 3, 'earthquake': 2, 'firecracker': 3, 'elixir-golem': 8,
  'valkyrie': 4, 'musketeer': 4, 'mini-pekka': 4, 'hog-rider': 4, 'fireball': 4, 'poison': 4, 'furnace': 3, 'flying-machine': 3, 'battle-ram': 4, 'zappies': 4, 'bomb-tower': 3, 'tesla': 4, 'magic-archer': 4, 'hunter': 4, 'night-witch': 4, 'lumberjack': 4, 'dark-prince': 4, 'baby-dragon': 4, 'skeleton-dragons': 3,
  'giant': 5, 'goblin-hut': 5, 'inferno-tower': 5, 'wizard': 5, 'witch': 5, 'balloon': 5, 'prince': 5, 'executioner': 5, 'cannon-cart': 5, 'ram-rider': 5, 'royal-hogs': 5, 'bowler': 5, 'graveyard': 5,
  'royal-giant': 6, 'elite-barbarians': 6, 'rocket': 6, 'lightning': 6, 'x-bow': 6, 'sparky': 6, 'goblin-giant': 6, 'barbarians': 5, 'minion-horde': 5,
  'pekka': 7, 'mega-knight': 7, 'lava-hound': 7, 'royal-recruits': 7,
  'golem': 8, 'three-musketeers': 9, 'mirror': 0, 'clone': 3, 'tornado': 3,
  'little-prince': 3, 'archer-queen': 5, 'skeleton-king': 4, 'mighty-miner': 4, 'golden-knight': 4, 'monk': 5
};

export const getCardElixirCost = (card: Card): number => {
  if ((card as any).elixirCost !== undefined) return (card as any).elixirCost;
  const slug = getCardSlug(card.name);
  return CARD_ELIXIR_COSTS[slug] || 3; // Fallback to 3 if unknown
};

export const getDeckAverageElixir = (cards: Card[]): number => {
  const deckCards = cards.filter(c => c && c.id < 68000000).slice(0, 8);
  if (deckCards.length === 0) return 0;
  const total = deckCards.reduce((acc, card) => acc + getCardElixirCost(card), 0);
  return total / deckCards.length;
};

// Matchup Mock logic based on archetypes
const ARCHETYPE_MATCHUPS: Record<string, { strong: string[], weak: string[] }> = {
  'Hog Cycle': { strong: ['Golem Beatdown', 'Pekka Bridge Spam'], weak: ['Splashyard', 'LavaLoon'] },
  'Golem Beatdown': { strong: ['X-Bow Control', 'Log Bait'], weak: ['Pekka Bridge Spam', 'Miner Poison'] },
  'Log Bait': { strong: ['Pekka Bridge Spam', 'Graveyard Control'], weak: ['X-Bow Control', 'Splashyard'] },
  'X-Bow Control': { strong: ['Log Bait', 'Splashyard'], weak: ['Golem Beatdown', 'Royal Giant'] },
  'LavaLoon': { strong: ['Graveyard Control', 'Log Bait'], weak: ['X-Bow Control', 'Miner Poison'] },
  'Pekka Bridge Spam': { strong: ['Golem Beatdown', 'Royal Giant'], weak: ['Log Bait', 'LavaLoon'] },
  'Splashyard': { strong: ['Hog Cycle', 'Log Bait'], weak: ['LavaLoon', 'Pekka Bridge Spam'] },
  'Miner Poison': { strong: ['Golem Beatdown', 'LavaLoon'], weak: ['Graveyard Control', 'X-Bow Control'] },
  'Royal Giant': { strong: ['X-Bow Control', 'Miner Poison'], weak: ['Pekka Bridge Spam', 'Log Bait'] },
  'Control / Midrange': { strong: ['Hog Cycle'], weak: ['Golem Beatdown'] }
};

export const getArchetypeMatchups = (archetype: string) => {
  return ARCHETYPE_MATCHUPS[archetype] || ARCHETYPE_MATCHUPS['Control / Midrange'];
};

export const getCardSlug = (name: string) => {
  if (!name) return 'unknown';
  return name.toLowerCase()
    .replace(/\./g, '')
    .replace(/ /g, '-')
    .replace('mini-p-e-k-k-a', 'mini-pekka')
    .replace('p-e-k-k-a', 'pekka')
    .replace('evolved-', '')
    .replace('-evolved', '')
    .replace('evolution-', '')
    .replace('-evolution', '')
    .replace('hero-', '')
    .replace('-hero', '')
    .replace('evo-', '')
    .replace('-evo', '');
};

export const getCardIcon = (card: Card, isHero: boolean, isEvo: boolean) => {
  if (!card) return 'https://cdn.royaleapi.com/static/img/cards-150/unknown.png';
  
  const slug = getCardSlug(card.name);

  // SPECIAL OVERRIDES for new cards missing from main CDN static path
  // Handle Princess Evolution (Clean CDN version)
  if (slug === 'princess' && isEvo) {
    return 'https://cdn.royaleapi.com/static/img/cards-150/princess-ev1.png';
  }
  // Handle Tombstone Evolution/Hero (Standard variant)
  if (slug === 'tombstone' && (isHero || isEvo)) {
    return 'https://cdn.royaleapi.com/static/img/cards-150/tombstone-hero.png';
  }

  // 1. Check for explicit variant URLs in payload or registry
  const registryIcons = globalIconRegistry[card.id] || {};
  const heroUrl = card.iconUrls?.heroMedium || registryIcons.heroMedium;
  const evoUrl = card.iconUrls?.evolutionMedium || registryIcons.evolutionMedium;
  
  if (isHero && heroUrl) return heroUrl;
  if (isEvo && evoUrl) return evoUrl;
  
  // 2. Check if the standard medium icon already matches the requested form
  const mediumIcon = card.iconUrls?.medium || registryIcons.medium || '';
  if (isHero && mediumIcon.toLowerCase().includes('hero')) return mediumIcon;
  if (isEvo && (mediumIcon.toLowerCase().includes('evo') || mediumIcon.toLowerCase().includes('ev1') || mediumIcon.toLowerCase().includes('evolution'))) return mediumIcon;
  
  // 3. Fallback to stable RoyaleAPI CDN
  const BASE_CDN = "https://cdn.royaleapi.com/static/img/cards-150";
  
  if (isHero) return `${BASE_CDN}/${slug}-hero.png`;
  if (isEvo) return `${BASE_CDN}/${slug}-ev1.png`;
  
  return mediumIcon || `${BASE_CDN}/${slug}.png`;
};


