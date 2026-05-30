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

export const isEvo = (card: Card) => {
  return (card.evolutionLevel !== undefined && card.evolutionLevel > 0) || !!card.iconUrls?.evolutionMedium;
};

// Hero variants are special versions of standard cards (Knight, Musketeer, Mini PEKKA, Giant, Dark Prince, etc.)
export const isHeroVariant = (card: Card) => {
  // We check if the card has a heroLevel > 0 which is the most reliable indicator in the API
  return card.heroLevel !== undefined && card.heroLevel > 0;
};

export const isAnyHero = (card: Card) => {
  return isChampion(card) || isHeroVariant(card) || card.rarity?.toLowerCase() === 'hero';
};

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
