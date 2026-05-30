export interface Card {
  name: string;
  id: number;
  level: number;
  starLevel?: number;
  maxLevel: number;
  count: number;
  iconUrls: {
    medium: string;
    evolutionMedium?: string;
    heroMedium?: string; // Potential for future API updates
  };
  rarity: string;
  evolutionLevel?: number;
  heroLevel?: number;
}

export const isChampion = (card: Card) => {
  return card.rarity?.toLowerCase() === 'champion';
};

/**
 * DYNAMIC DETECTION LOGIC
 * These helpers use card properties rather than hardcoded lists.
 */

// Check if the specific card instance has Evolution unlocked
export const isEvoUnlocked = (card: Card) => {
  return (card.evolutionLevel !== undefined && card.evolutionLevel > 0) || 
         (card.name || '').toLowerCase().includes('evo');
};

// Check if the card definition has an Evolution version available (Dynamic via icons)
export const hasEvoAvailable = (card: Card) => {
  return !!card.iconUrls?.evolutionMedium || 
         (card.name || '').toLowerCase().includes('evo');
};

// Check if the specific card instance has Hero Variant active/unlocked
export const isHeroVariantUnlocked = (card: Card) => {
  return (card.heroLevel !== undefined && card.heroLevel > 0) || 
         (card.name || '').toLowerCase().includes('hero');
};

// Check if the card is a Hero variant (Dynamic via metadata indicators)
export const hasHeroAvailable = (card: Card) => {
  const isHeroRarity = card.rarity?.toLowerCase() === 'hero';
  const hasHeroName = (card.name || '').toLowerCase().includes('hero');
  const hasHeroIconProp = !!(card.iconUrls as any).heroMedium;
  
  return isHeroRarity || hasHeroName || hasHeroIconProp;
};

export const isAnyHeroUnlocked = (card: Card) => {
  return isChampion(card) || isHeroVariantUnlocked(card) || card.rarity?.toLowerCase() === 'hero';
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
