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
}

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
