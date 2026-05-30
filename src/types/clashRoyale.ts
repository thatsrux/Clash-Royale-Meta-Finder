export interface Card {
  name: string;
  id: number;
  level: number;
  starLevel?: number;
  maxLevel: number;
  count: number;
  key?: string; // Added for RoyaleAPI 2026 key detection (e.g., 'knight-hero')
  form?: string; // Added for explicit form mapping
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
 * Perfect disambiguation using the '-hero' and '-evo' suffixes.
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

// Check if the specific card instance has Hero Variant active/unlocked
export const isHeroVariantUnlocked = (card: Card) => {
  const explicitVariant = (card as any)._variant || card.form || card.key || '';
  const name = (card.name || '').toLowerCase();
  
  // PRIMARY: Check for explicit hero markers in key or name
  if (explicitVariant.includes('hero') || name.includes('hero')) {
    return true;
  }

  // SECONDARY: If it's an evo, it's definitely not a hero
  if (explicitVariant.includes('evo') || name.includes('evo')) {
    return false;
  }
  
  // TERTIARY: Fallback to heroLevel if no other info
  if (card.heroLevel !== undefined && card.heroLevel > 0) {
    // If both levels exist, we only assume Hero if explicit. 
    // But if ONLY heroLevel > 0, then it's a hero.
    if (!card.evolutionLevel || card.evolutionLevel === 0) return true;
  }
  
  return (card.rarity || '').toLowerCase() === 'hero';
};

// Check if the specific card instance has Evolution unlocked
export const isEvoUnlocked = (card: Card) => {
  const explicitVariant = (card as any)._variant || card.form || card.key || '';
  const name = (card.name || '').toLowerCase();

  // PRIMARY: Check for explicit evo markers
  if (explicitVariant.includes('evo') || name.includes('evo')) {
    return true;
  }
  
  // SECONDARY: If it's a hero, it's not an evo
  if (isHeroVariantUnlocked(card)) return false;

  // TERTIARY: Fallback to evolutionLevel
  return (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && hasEvoAvailable(card));
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
