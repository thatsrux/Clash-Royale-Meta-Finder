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

// Hero variants are special versions of standard cards (Knight, Musketeer, Mini PEKKA, Giant)
export const isHeroVariant = (card: Card) => {
  const HERO_BASE_CARDS = ['Knight', 'Musketeer', 'Mini P.E.K.K.A', 'Giant'];
  return HERO_BASE_CARDS.includes(card.name) && (card.heroLevel !== undefined && card.heroLevel > 0);
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
