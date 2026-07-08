import { Card, PlayerProfile, getDisplayLevel, isEvoUnlocked, isHeroVariantUnlocked, getCardIcon, getDeckAverageElixir } from '../types/clashRoyale';

export interface AffinityResult {
  score: number;
  maxedCount: number;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
  isBestSynergy: boolean;
  avgElixir: number;
}

export const calculateDeckAffinity = (
  metaDeckCards: Card[],
  metaCount: number,
  maxRating: number,
  userProfile: PlayerProfile
): AffinityResult => {
  let ownedCount = 0;
  let totalLevel = 0;
  let eliteCount = 0;
  const missingEvos: { name: string; icon: string }[] = [];
  const missingHeroes: { name: string; icon: string }[] = [];

  metaDeckCards.forEach((metaCard) => {
    const userCard = userProfile.cards.find(c => Number(c.id) === Number(metaCard.id));
    const forcedForm = (metaCard as any)._forceForm;
    const metaIsEvo = forcedForm === 'evo';
    const metaIsHero = forcedForm === 'hero';
    
    if (userCard) {
      ownedCount++;
      const displayLevel = Number(getDisplayLevel(userCard));
      totalLevel += displayLevel;
      if (displayLevel >= 16) eliteCount++;
      
      if (metaIsEvo && !isEvoUnlocked(userCard)) {
        missingEvos.push({ name: metaCard.name, icon: getCardIcon(metaCard, false, true) });
      }
      if (metaIsHero && !isHeroVariantUnlocked(userCard)) {
        missingHeroes.push({ name: metaCard.name, icon: getCardIcon(metaCard, true, false) });
      }
    } else { 
      totalLevel += 1; // Unowned cards are treated as level 1
      if (metaIsEvo) missingEvos.push({ name: metaCard.name, icon: getCardIcon(metaCard, false, true) });
      if (metaIsHero) missingHeroes.push({ name: metaCard.name, icon: getCardIcon(metaCard, true, false) });
    }
  });

  const levelScore = (totalLevel / 128) * 100;
  const missingCardPenalty = (8 - ownedCount) * 10;
  const missingVariantPenalty = (missingEvos.length + missingHeroes.length) * 5;
  const missingElitePenalty = (8 - eliteCount) * 2;
  
  let affinityRaw = levelScore - missingCardPenalty - missingVariantPenalty - missingElitePenalty;
  affinityRaw = Math.max(0, Math.min(100, affinityRaw));
  
  const tieBreaker = (Math.min(metaCount, 999) * 0.001) + (maxRating * 0.0000001);
  const score = affinityRaw + tieBreaker;
  const avgElixir = getDeckAverageElixir(metaDeckCards);

  return {
    score,
    maxedCount: eliteCount,
    missingEvos,
    missingHeroes,
    isBestSynergy: ownedCount === 8 && missingEvos.length === 0 && missingHeroes.length === 0,
    avgElixir
  };
};
