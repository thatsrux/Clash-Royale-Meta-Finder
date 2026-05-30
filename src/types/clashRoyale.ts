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
  };
  rarity: string;
  evolutionLevel?: number;
  heroLevel?: number;
}

export const isChampion = (card: Card) => {
  return card.rarity?.toLowerCase() === 'champion';
};

// Check if the specific card instance has Evolution unlocked
export const isEvoUnlocked = (card: Card) => {
  return card.evolutionLevel !== undefined && card.evolutionLevel > 0;
};

// Check if the card definition has an Evolution version available
export const hasEvoAvailable = (card: Card) => {
  return !!card.iconUrls?.evolutionMedium;
};

// Legacy helper - defaults to unlocked check for profile/collection
export const isEvo = (card: Card) => isEvoUnlocked(card);

// Check if the specific card instance has Hero Variant active/unlocked
export const isHeroVariantUnlocked = (card: Card) => {
  return card.heroLevel !== undefined && card.heroLevel > 0;
};

// Check if the card is one of the base cards that CAN be a Hero
export const hasHeroAvailable = (card: Card) => {
  const HERO_BASE_CARDS = ['Knight', 'Musketeer', 'Mini P.E.K.K.A', 'Giant', 'Dark Prince'];
  return HERO_BASE_CARDS.includes(card.name);
};

// Legacy helper
export const isHeroVariant = (card: Card) => isHeroVariantUnlocked(card);

export const isAnyHeroUnlocked = (card: Card) => {
  return isChampion(card) || isHeroVariantUnlocked(card) || card.rarity?.toLowerCase() === 'hero';
};

// Legacy helper
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
