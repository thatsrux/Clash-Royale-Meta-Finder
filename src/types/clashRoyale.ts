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
 * SOURCE OF TRUTH RENDERING LOGIC
 * The form displayed in a deck depends ONLY on API metadata, NOT levels.
 */

export const getCardVisualForm = (card: Card): 'hero' | 'evo' | 'normal' | 'champion' => {
  // 1. ABSOLUTE PRIORITY: Forced form from Deck Analysis/API Response
  if (card._forceForm === 'hero') return 'hero';
  if (card._forceForm === 'evo') return 'evo';
  if (card._forceForm === 'normal') return 'normal';

  // 2. 2026 API Metadata
  const activeForm = (card.activeForm || '').toLowerCase();
  if (activeForm === 'hero') return 'hero';
  if (activeForm === 'evolution' || activeForm === 'evo') return 'evo';
  if (activeForm === 'champion') return 'champion';

  // 3. RoyaleAPI Key-based detection
  const key = (card.key || '').toLowerCase();
  if (key.endsWith('-hero')) return 'hero';
  if (key.endsWith('-evo')) return 'evo';

  // 4. FALLBACK: Static properties (Only for collection view where no deck metadata exists)
  if (card.rarity?.toLowerCase() === 'champion') return 'champion';
  if (card.rarity?.toLowerCase() === 'hero') return 'hero';
  if ((card.name || '').toLowerCase().includes('hero')) return 'hero';
  if ((card.name || '').toLowerCase().includes('evo')) return 'evo';

  return 'normal';
};

// Check if the card definition has an Evolution version available
export const hasEvoAvailable = (card: Card) => {
  return !!card.iconUrls?.evolutionMedium || (card.name || '').toLowerCase().includes('evo');
};

// Check if the card definition has a Hero version available
export const hasHeroAvailable = (card: Card) => {
  const isHeroRarity = card.rarity?.toLowerCase() === 'hero';
  const hasHeroName = (card.name || '').toLowerCase().includes('hero');
  const hasHeroIconProp = !!(card.iconUrls as any)?.heroMedium;
  const hasHeroLevelProp = card.heroLevel !== undefined;
  
  return isHeroRarity || hasHeroName || hasHeroIconProp || hasHeroLevelProp;
};

// Wrappers for backward compatibility, now using the unified visual logic
export const isHeroVariantUnlocked = (card: Card) => getCardVisualForm(card) === 'hero';
export const isEvoUnlocked = (card: Card) => getCardVisualForm(card) === 'evo';
export const isChampion = (card: Card) => getCardVisualForm(card) === 'champion';
export const isAnyHeroUnlocked = (card: Card) => isChampion(card) || isHeroVariantUnlocked(card);

// Aliases for backward compatibility
export const isEvo = (card: Card) => isEvoUnlocked(card);
export const isHeroVariant = (card: Card) => isHeroVariantUnlocked(card);
export const isAnyHero = (card: Card) => isAnyHeroUnlocked(card);

export interface PlayerProfile {
  tag: string;
  name: string;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  battleCount: number;
  threeWeaponWins: number;
  cards: Card[];
  currentDeck: Card[];
  currentFavouriteCard?: Card;
}
