export interface Card {
  name: string;
  id: number;
  level: number;
  starLevel?: number;
  maxLevel: number;
  count: number;
  key?: string; 
  form?: string; 
  activeForm?: string; // 2026 API: 'hero', 'evolution', 'champion', 'normal'
  slot?: string; // 2026 API: 'wildSlot', 'evolutionSlot', 'heroSlot'
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
  return card.rarity?.toLowerCase() === 'champion' || card.activeForm === 'champion';
};

/**
 * DYNAMIC DETECTION LOGIC (2026)
 * Strict disambiguation using 'activeForm' and 'slot' metadata.
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
  
  return isHeroRarity || hasHeroName || hasHeroIconProp || (card.heroLevel !== undefined);
};

// Check if the specific card instance is a Hero Variant
export const isHeroVariantUnlocked = (card: Card) => {
  // 1. HIGHEST PRIORITY: 2026 Official API 'activeForm'
  if (card.activeForm === 'hero') return true;
  if (card.activeForm === 'evolution' || card.activeForm === 'evo') return false;

  // 2. SECOND PRIORITY: RoyaleAPI 'form' or 'key' metadata
  const variant = (card as any)._variant || card.form || '';
  const key = card.key || '';
  if (variant === 'hero' || key.endsWith('-hero')) return true;
  if (variant === 'evo' || key.endsWith('-evo')) return false;

  // 3. THIRD PRIORITY: Definitive Rarity/Name
  const rarity = (card.rarity || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  if (rarity === 'hero' || name.includes('hero')) return true;
  
  // 4. FOURTH PRIORITY: Levels (Fallback)
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && !hasEvoAvailable(card)) return true;
  
  return false;
};

// Check if the specific card instance is an Evolution
export const isEvoUnlocked = (card: Card) => {
  // 1. HIGHEST PRIORITY: 2026 Official API 'activeForm'
  if (card.activeForm === 'evolution' || card.activeForm === 'evo') return true;
  if (card.activeForm === 'hero' || card.activeForm === 'champion') return false;

  // 2. SECOND PRIORITY: RoyaleAPI 'form' or 'key' metadata
  const variant = (card as any)._variant || card.form || '';
  const key = card.key || '';
  if (variant === 'evo' || key.endsWith('-evo')) return true;
  if (variant === 'hero' || key.endsWith('-hero')) return false;

  // 3. THIRD PRIORITY: Rarity or Name
  const rarity = (card.rarity || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  if (rarity === 'evo' || name.includes('evo')) return true;

  // 4. FOURTH PRIORITY: Levels
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && hasEvoAvailable(card)) return true;

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
