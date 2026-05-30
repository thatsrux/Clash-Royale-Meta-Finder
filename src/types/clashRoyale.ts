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

// Check if the specific card instance has Evolution unlocked
export const isEvoUnlocked = (card: Card) => {
  // A card CANNOT be an Evolution if it doesn't have an Evolution version available
  if (!hasEvoAvailable(card)) return false;
  return (card.evolutionLevel !== undefined && card.evolutionLevel > 0) || (card.name || '').toLowerCase().includes('evo');
};

// Check if the specific card instance has Hero Variant active/unlocked
export const isHeroVariantUnlocked = (card: Card) => {
  const name = card.name || '';
  if (name.toLowerCase().includes('hero')) return true;
  if (card.heroLevel !== undefined && card.heroLevel > 0) return true;
  
  // Crucial fallback: If the API uses 'evolutionLevel' for the special slot,
  // but the card has NO Evolution available, it MUST be a Hero.
  if (card.evolutionLevel !== undefined && card.evolutionLevel > 0 && !hasEvoAvailable(card)) {
    return true;
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
