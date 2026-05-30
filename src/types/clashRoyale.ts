export interface Card {
  name: string;
  id: number;
  level: number;
  starLevel?: number;
  maxLevel: number;
  count: number;
  key?: string; 
  form?: string; 
  iconUrls: {
    medium: string;
    evolutionMedium?: string;
    heroMedium?: string; 
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
 * Disambiguation between Evolutions and Heroes.
 * These functions are independent as requested: levels don't dictate the form in a deck.
 */

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

// Check if the specific card instance is a Hero Variant
export const isHeroVariantUnlocked = (card: Card) => {
  // 1. HIGHEST PRIORITY: Explicit variant/form from Deck Metadata
  const variant = (card as any)._variant || card.form || '';
  const key = card.key || '';
  if (variant === 'hero' || key.endsWith('-hero')) return true;
  if (variant === 'evo' || key.endsWith('-evo')) return false;

  // 2. SECOND PRIORITY: Rarity or Name (Definitive markers)
  const rarity = (card.rarity || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  if (rarity === 'hero' || name.includes('hero')) return true;
  
  // 3. THIRD PRIORITY: Levels (Used for collection view or fallback)
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  
  // Special case: cards that use evolutionLevel slot for Hero (only if no evo available)
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && !hasEvoAvailable(card)) {
    return true;
  }
  
  return false;
};

// Check if the specific card instance is an Evolution
export const isEvoUnlocked = (card: Card) => {
  // 1. HIGHEST PRIORITY: Explicit variant/form from Deck Metadata
  const variant = (card as any)._variant || card.form || '';
  const key = card.key || '';
  if (variant === 'evo' || key.endsWith('-evo')) return true;
  if (variant === 'hero' || key.endsWith('-hero')) return false;

  // 2. SECOND PRIORITY: Rarity or Name
  const rarity = (card.rarity || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  if (rarity === 'evo' || name.includes('evo')) return true;

  // 3. THIRD PRIORITY: Levels
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0) {
    // If it has evoLevel > 0 AND an evo is available, it's an evo
    if (hasEvoAvailable(card)) return true;
  }

  return false;
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
