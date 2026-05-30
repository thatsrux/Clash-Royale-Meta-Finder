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
    heroMedium?: string; // Provided dynamically by API proxy for Heroes
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
 * Perfect disambiguation between Evolutions and Heroes.
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

// Check if the specific card instance has Hero Variant active/unlocked
export const isHeroVariantUnlocked = (card: Card) => {
  const rarity = (card.rarity || '').toLowerCase();
  const type = (card as any).type?.toLowerCase() || '';
  const tag = (card as any).tag?.toLowerCase() || '';
  const name = (card.name || '').toLowerCase();

  // HIGHEST PRIORITY: Explicit Hero marking
  if (rarity === 'hero' || type === 'hero' || tag === 'hero' || name.includes('hero')) {
    return true;
  }
  
  // SECOND PRIORITY: Explicit hero level
  if (card.heroLevel !== undefined && card.heroLevel > 0) {
    return true;
  }
  
  // THIRD PRIORITY: Fallback for cards that use the evolution slot for Hero versions
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && !hasEvoAvailable(card)) {
    return true;
  }
  return false;
};

// Check if the specific card instance has Evolution unlocked
export const isEvoUnlocked = (card: Card) => {
  const rarity = (card.rarity || '').toLowerCase();
  const type = (card as any).type?.toLowerCase() || '';
  const tag = (card as any).tag?.toLowerCase() || '';
  const name = (card.name || '').toLowerCase();

  // A card CANNOT be an Evolution if it is definitively a Hero
  if (isHeroVariantUnlocked(card)) return false;
  
  // Explicit Evo marking
  if (rarity === 'evo' || type === 'evo' || tag === 'evo' || name.includes('evo')) {
    return true;
  }

  // A card CANNOT be an Evolution if it doesn't have an Evolution version available
  if (!hasEvoAvailable(card)) return false;
  
  return (card.evolutionLevel !== undefined && card.evolutionLevel > 0);
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
