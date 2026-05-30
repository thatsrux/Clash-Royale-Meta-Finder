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
  // If we have explicit deck metadata, USE IT
  if (card._forceForm === 'evo') return true;
  if (card._forceForm === 'hero' || card._forceForm === 'normal') return false;

  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();
  if (key.endsWith('-evo') || form === 'evolution' || form === 'evo' || activeForm === 'evolution' || activeForm === 'evo') return true;
  if (key.endsWith('-hero') || form === 'hero' || activeForm === 'hero') return false;

  // Fallback to levels for User Collection
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0) return true;
  if (!!card.iconUrls?.evolutionMedium) return true;
  
  return false;
};

export const isHeroVariantUnlocked = (card: Card) => {
  // If we have explicit deck metadata, USE IT
  if (card._forceForm === 'hero') return true;
  if (card._forceForm === 'evo' || card._forceForm === 'normal') return false;

  const key = (card.key || '').toLowerCase();
  const form = (card.form || '').toLowerCase();
  const activeForm = (card.activeForm || '').toLowerCase();
  if (key.endsWith('-hero') || form === 'hero' || activeForm === 'hero') return true;
  if (key.endsWith('-evo') || form === 'evolution' || form === 'evo' || activeForm === 'evolution' || activeForm === 'evo') return false;

  // Fallback for User Collection
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  if (card.rarity?.toLowerCase() === 'hero' || (card.name || '').toLowerCase().includes('hero')) return true;
  if (!!(card.iconUrls as any)?.heroMedium) return true;
  
  return false;
};

export const isAnyHeroUnlocked = (card: Card) => {
  return isChampion(card) || isHeroVariantUnlocked(card);
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
