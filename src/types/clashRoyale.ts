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

export const isChampion = (card: Card) => {
  return card.rarity?.toLowerCase() === 'champion' || card.activeForm === 'champion';
};

export const isEvoUnlocked = (card: Card) => {
  if (card._forceForm === 'evo') return true;
  if (card._forceForm === 'hero' || card._forceForm === 'normal') return false;

  // 1. Trust evolutionLevel bitmask (1 = Evo, 2 = Hero, 3 = Both)
  if (card.evolutionLevel !== undefined) {
    if ((card.evolutionLevel & 1) === 1) return true;
  }

  // 2. Check metadata keys
  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();
  
  if (key.endsWith('-evo') || form === 'evolution' || form === 'evo' || activeForm === 'evolution' || activeForm === 'evo') return true;

  // 3. Last resort: check name if we know it's an evolved version
  if ((card.name || '').toLowerCase().includes('evolved')) return true;

  return false;
};

export const isHeroVariantUnlocked = (card: Card) => {
  if (card._forceForm === 'hero') return true;
  if (card._forceForm === 'evo' || card._forceForm === 'normal') return false;

  // 1. Trust heroLevel or evolutionLevel bitmask (2 = Hero)
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  
  if (card.evolutionLevel !== undefined) {
    if ((card.evolutionLevel & 2) === 2) return true;
  }

  // 2. Check metadata keys
  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();

  if (key.endsWith('-hero') || form === 'hero' || activeForm === 'hero') return true;
  if (card.rarity?.toLowerCase() === 'hero' || (card.name || '').toLowerCase().includes('hero')) return true;

  return false;
};

export const isAnyHeroUnlocked = (card: Card) => {
  return isChampion(card) || isHeroVariantUnlocked(card);
};

// Check if the card definition has an Evolution version available (Static check)
export const hasEvoAvailable = (card: Card) => {
  return !!card.iconUrls?.evolutionMedium || (card.name || '').toLowerCase().includes('evo') || 
         ['princess', 'tombstone', 'drill', 'wizard', 'zap', 'tesla', 'wall-breakers', 'bomber', 'valkyrie', 'ice-spirit', 'royal-recruits', 'barbs', 'knight', 'archer', 'mortar', 'skeleton', 'firecracker', 'rg', 'bats'].some(s => getCardSlug(card.name).includes(s));
};

// Check if the card definition has a Hero version available (Static check)
export const hasHeroAvailable = (card: Card) => {
  const isHeroRarity = card.rarity?.toLowerCase() === 'hero';
  const hasHeroName = (card.name || '').toLowerCase().includes('hero');
  const hasHeroIconProp = !!card.iconUrls?.heroMedium;
  const hasHeroLevelProp = card.heroLevel !== undefined;
  
  return isHeroRarity || hasHeroName || hasHeroIconProp || hasHeroLevelProp;
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
 * ICON & SLUG UTILITIES
 * Centralized logic for generating card image URLs.
 */

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
  
  // 1. Check for explicit variant URLs in payload
  if (isHero && card.iconUrls?.heroMedium) return card.iconUrls.heroMedium;
  if (isEvo && card.iconUrls?.evolutionMedium) return card.iconUrls.evolutionMedium;
  
  // 2. Check if the standard medium icon already matches the requested form
  const mediumIcon = card.iconUrls?.medium || '';
  if (isHero && mediumIcon.toLowerCase().includes('hero')) return mediumIcon;
  if (isEvo && (mediumIcon.toLowerCase().includes('evo') || mediumIcon.toLowerCase().includes('evolution'))) return mediumIcon;
  
  // 3. Fallback to stable RoyaleAPI CDN
  const slug = getCardSlug(card.name);
  
  // SPECIAL OVERRIDES for new cards missing from main CDN static path
  if (slug === 'princess' && isEvo) {
    return 'https://cdns3.royaleapi.com/cdn-cgi/image/w=150,h=180,format=auto/static/img/cards/v9-f09d5c9d/princess-ev1.png';
  }
  if (slug === 'tombstone' && isEvo) {
    return 'https://cdns3.royaleapi.com/cdn-cgi/image/w=150,h=180,format=auto/static/img/cards/v9-f09d5c9d/tombstone-hero.png';
  }

  const BASE_CDN = "https://cdn.royaleapi.com/static/img/cards-150";
  
  if (isHero) return `${BASE_CDN}/${slug}-hero.png`;
  if (isEvo) return `${BASE_CDN}/${slug}-ev1.png`;
  
  return mediumIcon || `${BASE_CDN}/${slug}.png`;
};
