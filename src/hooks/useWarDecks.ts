import { useMemo, useCallback } from 'react';
import type { PlayerProfile, Card, MagicItems } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, getCardsToNextLevel, getVirtualLevelAndGold } from '../types/clashRoyale';
import type { MetaDeck } from '../App';

export const useWarDecks = (
  profile: PlayerProfile,
  magicItems: MagicItems,
  rawDeckCounts: any,
  getRarityClass: ((card: Card) => string) | undefined,
  getDisplayLevel: (card: Card) => number,
  warUseGold: boolean,
  warUseGems: boolean,
  warUseWildcards: boolean,
  warUseEvoShards: boolean,
  warUseHeroCoins: boolean
) => {
  const warScoredDecks = useMemo(() => {
    if (!rawDeckCounts || !profile || !getRarityClass) return [];
    
    return Object.values(rawDeckCounts).map((meta: any) => {
      let totalLevel = 0;
      let maxLevelCount = 0;
      let ownedCount = 0;
      let levelScoreBoost = 0;
      
      let localCommonWild = warUseWildcards ? (Number(magicItems?.commonWild) || 0) : 0;
      let localRareWild = warUseWildcards ? (Number(magicItems?.rareWild) || 0) : 0;
      let localEpicWild = warUseWildcards ? (Number(magicItems?.epicWild) || 0) : 0;
      let localLegendaryWild = warUseWildcards ? (Number(magicItems?.legendaryWild) || 0) : 0;
      let localChampionWild = warUseWildcards ? (Number(magicItems?.championWild) || 0) : 0;
      let localEvoShards = warUseEvoShards ? (Number(magicItems?.evoShards) || 0) : 0;
      let localHeroCoins = warUseHeroCoins ? (Number(magicItems?.heroCoins) || 0) : 0;
      let localGems = warUseGems ? (Number(magicItems?.gems) || 0) : 0;
      
      const missingEvos: { name: string; icon: string }[] = [];
      const missingHeroes: { name: string; icon: string }[] = [];
      const virtualUpgrades: { id: number; gold: number; level: number }[] = [];
      const evoShardsUsed: { id: number; count: number }[] = [];
      const heroCoinsUsed: { id: number; count: number }[] = [];
      let gemsUsed = 0;
      const gemsUsedByCard: { id: number; count: number }[] = [];
      const wildcardsUsed = { common: 0, rare: 0, epic: 0, legendary: 0, champion: 0 };
      const wildcardsUsedByCard: { id: number; count: number; rarity: string }[] = [];
      const missingBaseCards: string[] = [];
      const nonMaxLevelCards: string[] = [];
      const missingVariantNames: string[] = [];
        
      meta.cards.forEach((metaCard: any) => {
        const userCard = profile.cards.find((c: any) => Number(c.id) === Number(metaCard.id));
        const forcedForm = (metaCard as any)._forceForm;
        const metaIsEvo = forcedForm === 'evo';
        const metaIsHero = forcedForm === 'hero';
        const rarity = getRarityClass(metaCard);
        
        if (userCard) {
          ownedCount++;
          const displayLevel = Number(getDisplayLevel(userCard));
          
          if (displayLevel >= 16) {
            maxLevelCount++;
            totalLevel += displayLevel;
          } else {
            let currentWildCards = 0;
            if (rarity === 'common') currentWildCards = localCommonWild;
            else if (rarity === 'rare') currentWildCards = localRareWild;
            else if (rarity === 'epic') currentWildCards = localEpicWild;
            else if (rarity === 'legendary') currentWildCards = localLegendaryWild;
            else if (rarity === 'champion') currentWildCards = localChampionWild;

            const { virtualLevel, totalGold, remainingCount, remainingWildCards, remainingGems } = getVirtualLevelAndGold(rarity, displayLevel, userCard.count, currentWildCards, localGems);
            
            let finalVirtualLevel = warUseGold ? virtualLevel : displayLevel;
            let finalTotalGold = warUseGold ? totalGold : 0;
            
            if (warUseGold && finalVirtualLevel > displayLevel) {
              const usedWCs = currentWildCards - remainingWildCards;
              if (usedWCs > 0) {
                wildcardsUsedByCard.push({ id: metaCard.id, count: usedWCs, rarity });
                if (rarity === 'common') { wildcardsUsed.common += usedWCs; localCommonWild = remainingWildCards; }
                else if (rarity === 'rare') { wildcardsUsed.rare += usedWCs; localRareWild = remainingWildCards; }
                else if (rarity === 'epic') { wildcardsUsed.epic += usedWCs; localEpicWild = remainingWildCards; }
                else if (rarity === 'legendary') { wildcardsUsed.legendary += usedWCs; localLegendaryWild = remainingWildCards; }
                else if (rarity === 'champion') { wildcardsUsed.champion += usedWCs; localChampionWild = remainingWildCards; }
              }
              
              const usedGems = localGems - remainingGems;
              if (usedGems > 0) {
                gemsUsed += usedGems;
                gemsUsedByCard.push({ id: metaCard.id, count: usedGems });
                localGems = remainingGems;
              }

              virtualUpgrades.push({ id: metaCard.id, gold: finalTotalGold, level: finalVirtualLevel });
            }
            
            totalLevel += finalVirtualLevel;
            if (finalVirtualLevel >= 16) maxLevelCount++;
            else nonMaxLevelCards.push(metaCard.name);
            
            const requiredCards = getCardsToNextLevel(rarity, finalVirtualLevel);
            if (requiredCards > 0) {
               const currentProgressCount = warUseGold ? remainingCount : userCard.count;
               const progress = Math.min(1, currentProgressCount / requiredCards);
               levelScoreBoost += (progress / 128) * 100;
            }
          }
          
          if (metaIsEvo && !isEvoUnlocked(userCard)) {
            let shardsNeeded = 6;
            if (magicItems?.specificEvoShards && magicItems.specificEvoShards[metaCard.name]) {
              shardsNeeded -= magicItems.specificEvoShards[metaCard.name];
            }
            if (localEvoShards >= shardsNeeded) {
              localEvoShards -= shardsNeeded;
              evoShardsUsed.push({ id: metaCard.id, count: shardsNeeded });
            } else {
              missingEvos.push({ name: metaCard.name, icon: getCardIcon(metaCard, false, true) });
              missingVariantNames.push(metaCard.name + ' (Evo)');
            }
          }
          if (metaIsHero && !isHeroVariantUnlocked(userCard)) {
            if (localHeroCoins >= 200) {
              localHeroCoins -= 200;
              heroCoinsUsed.push({ id: metaCard.id, count: 200 });
            } else {
              missingHeroes.push({ name: metaCard.name, icon: getCardIcon(metaCard, true, false) });
              missingVariantNames.push(metaCard.name);
            }
          }
        } else { 
          totalLevel += 1; 
          missingBaseCards.push(metaCard.name);
          nonMaxLevelCards.push(metaCard.name);
          
          if (metaIsEvo) {
            let shardsNeeded = 6;
            if (magicItems?.specificEvoShards && magicItems.specificEvoShards[metaCard.name]) {
              shardsNeeded -= magicItems.specificEvoShards[metaCard.name];
            }
            if (localEvoShards >= shardsNeeded) {
              localEvoShards -= shardsNeeded;
              evoShardsUsed.push({ id: metaCard.id, count: shardsNeeded });
            } else {
              missingEvos.push({ name: metaCard.name, icon: getCardIcon(metaCard, false, true) });
              missingVariantNames.push(metaCard.name + ' (Evo)');
            }
          }
          if (metaIsHero) {
            if (localHeroCoins >= 200) {
              localHeroCoins -= 200;
              heroCoinsUsed.push({ id: metaCard.id, count: 200 });
            } else {
              missingHeroes.push({ name: metaCard.name, icon: getCardIcon(metaCard, true, false) });
              missingVariantNames.push(metaCard.name);
            }
          }
        }
      });

      const levelScore = (totalLevel / 128) * 100 + levelScoreBoost;
      const missingCardPenalty = (8 - ownedCount) * 10;
      const missingVariantPenalty = (missingEvos.length + missingHeroes.length) * 5;
      const missingMaxLevelPenalty = (8 - maxLevelCount) * 2;
      
      let affinityRaw = levelScore - missingCardPenalty - missingVariantPenalty - missingMaxLevelPenalty;
      affinityRaw = Math.max(0, Math.min(100, affinityRaw));
      
      const tieBreaker = (Math.min(meta.count, 999) * 0.001) + ((meta.maxMedals || 0) * 0.0000001);
      const score = affinityRaw + tieBreaker;
      const avgElixir = getDeckAverageElixir(meta.cards);
      
      const totalVirtualGold = virtualUpgrades.reduce((sum: number, u: any) => sum + u.gold, 0);
      const totalEvoShardsUsed = evoShardsUsed.reduce((sum: number, e: any) => sum + e.count, 0);
      const totalCostScore = (gemsUsed * 1000) + 
                             (totalEvoShardsUsed * 5000) + 
                             (totalVirtualGold * 0.001) + 
                             (wildcardsUsed.common * 1) + 
                             (wildcardsUsed.rare * 5) + 
                             (wildcardsUsed.epic * 20) + 
                             (wildcardsUsed.legendary * 100) + 
                             (wildcardsUsed.champion * 200);

      const winRate = (meta.totalMatches || 0) > 0 ? ((meta.wins || 0) / (meta.totalMatches || 1)) * 100 : 0;

      return {
        name: `Meta Archetype`,
        cards: meta.cards,
        towerTroopId: meta.towerTroopId,
        count: meta.count,
        maxedCount: maxLevelCount,
        isBestSynergy: ownedCount === 8 && missingEvos.length === 0 && missingHeroes.length === 0,
        maxMedals: meta.maxRating,
        bestPlayerName: meta.bestPlayerName,
        score,
        avgLevel: totalLevel / 8,
        elixirCost: avgElixir,
        missingEvos,
        missingHeroes,
        virtualUpgrades,
        evoShardsUsed,
        heroCoinsUsed,
        gemsUsed,
        gemsUsedByCard,
        totalCostScore,
        wildcardsUsed,
        wildcardsUsedByCard,
        winRate,
        totalMatches: meta.totalMatches,
        scoreBreakdown: {
          baseLevelScore: (totalLevel / 128) * 100,
          levelScoreBoost,
          missingCardPenalty,
          missingVariantPenalty,
          missingMaxLevelPenalty,
          missingBaseCards,
          missingVariants: missingVariantNames,
          nonMaxLevelCards
        }
      } as MetaDeck;
    });
  }, [rawDeckCounts, profile, magicItems, getRarityClass, getDisplayLevel, warUseGold, warUseGems, warUseWildcards, warUseEvoShards, warUseHeroCoins]);


    const evaluateGlobalPool = useCallback((combination: MetaDeck[]) => {
    let localCommonWild = warUseWildcards ? (Number(magicItems?.commonWild) || 0) : 0;
    let localRareWild = warUseWildcards ? (Number(magicItems?.rareWild) || 0) : 0;
    let localEpicWild = warUseWildcards ? (Number(magicItems?.epicWild) || 0) : 0;
    let localLegendaryWild = warUseWildcards ? (Number(magicItems?.legendaryWild) || 0) : 0;
    let localChampionWild = warUseWildcards ? (Number(magicItems?.championWild) || 0) : 0;
    let localEvoShards = warUseEvoShards ? (Number(magicItems?.evoShards) || 0) : 0;
    let localHeroCoins = warUseHeroCoins ? (Number(magicItems?.heroCoins) || 0) : 0;
    let localGems = warUseGems ? (Number(magicItems?.gems) || 0) : 0;
    let localSpecificEvoShards = magicItems?.specificEvoShards ? JSON.parse(JSON.stringify(magicItems.specificEvoShards)) : {};

    let totalCombinedScore = 0;
    const evaluatedDecks: MetaDeck[] = [];

    for (const meta of combination) {
      let totalLevel = 0;
      let maxLevelCount = 0;
      let ownedCount = 0;
      let levelScoreBoost = 0;

      const missingEvos: { name: string; icon: string }[] = [];
      const missingHeroes: { name: string; icon: string }[] = [];
      const virtualUpgrades: { id: number; gold: number; level: number }[] = [];
      const evoShardsUsed: { id: number; count: number }[] = [];
      const heroCoinsUsed: { id: number; count: number }[] = [];
      let gemsUsed = 0;
      const gemsUsedByCard: { id: number; count: number }[] = [];
      const wildcardsUsed = { common: 0, rare: 0, epic: 0, legendary: 0, champion: 0 };
      const wildcardsUsedByCard: { id: number; count: number; rarity: string }[] = [];
      const missingBaseCards: string[] = [];
      const nonMaxLevelCards: string[] = [];
      const missingVariantNames: string[] = [];

      meta.cards.forEach((metaCard: any) => {
        const userCard = profile?.cards.find((c: any) => Number(c.id) === Number(metaCard.id));
        const forcedForm = (metaCard as any)._forceForm;
        const metaIsEvo = forcedForm === 'evo';
        const metaIsHero = forcedForm === 'hero';
        const rarity = getRarityClass ? getRarityClass(metaCard) : 'common';
        
        if (userCard) {
          ownedCount++;
          const displayLevel = Number(getDisplayLevel ? getDisplayLevel(userCard) : 1);
          
          if (displayLevel >= 16) {
            maxLevelCount++;
            totalLevel += displayLevel;
          } else {
            let currentWildCards = 0;
            if (warUseWildcards) {
              if (rarity === 'common') currentWildCards = localCommonWild;
              else if (rarity === 'rare') currentWildCards = localRareWild;
              else if (rarity === 'epic') currentWildCards = localEpicWild;
              else if (rarity === 'legendary') currentWildCards = localLegendaryWild;
              else if (rarity === 'champion') currentWildCards = localChampionWild;
            }
            
            let localGemsPool = localGems;
            
            if (getVirtualLevelAndGold) {
              const res = getVirtualLevelAndGold(rarity, displayLevel, userCard.count, currentWildCards, localGemsPool);
              
              const usedWCs = currentWildCards - res.remainingWildCards;
              if (usedWCs > 0 && warUseWildcards) {
                wildcardsUsedByCard.push({ id: metaCard.id, count: usedWCs, rarity });
                if (rarity === 'common') { wildcardsUsed.common += usedWCs; localCommonWild = res.remainingWildCards; }
                else if (rarity === 'rare') { wildcardsUsed.rare += usedWCs; localRareWild = res.remainingWildCards; }
                else if (rarity === 'epic') { wildcardsUsed.epic += usedWCs; localEpicWild = res.remainingWildCards; }
                else if (rarity === 'legendary') { wildcardsUsed.legendary += usedWCs; localLegendaryWild = res.remainingWildCards; }
                else if (rarity === 'champion') { wildcardsUsed.champion += usedWCs; localChampionWild = res.remainingWildCards; }
              }
              
              const usedGems = localGemsPool - res.remainingGems;
              if (usedGems > 0 && warUseGems) {
                gemsUsed += usedGems;
                gemsUsedByCard.push({ id: metaCard.id, count: usedGems });
                localGems = res.remainingGems;
              }

              let finalVirtualLevel = warUseGold ? res.virtualLevel : displayLevel;
              let finalTotalGold = warUseGold ? res.totalGold : 0;
              
              if (warUseGold && finalVirtualLevel > displayLevel) {
                virtualUpgrades.push({ id: metaCard.id, gold: finalTotalGold, level: finalVirtualLevel });
              }
              
              totalLevel += finalVirtualLevel;
              if (finalVirtualLevel >= 16) maxLevelCount++;
              else nonMaxLevelCards.push(metaCard.name);
              
              const requiredCards = getCardsToNextLevel(rarity, finalVirtualLevel);
              if (requiredCards > 0) {
                 const currentProgressCount = warUseGold ? res.remainingCount : userCard.count;
                 const progress = Math.min(1, currentProgressCount / requiredCards);
                 levelScoreBoost += (progress / 128) * 100;
              }
            } else {
              totalLevel += displayLevel;
              nonMaxLevelCards.push(metaCard.name);
            }
          }
          
          if (metaIsEvo && !isEvoUnlocked(userCard)) {
            let shardsNeeded = 6;
            if (localSpecificEvoShards && localSpecificEvoShards[metaCard.name]) {
               const specShards = localSpecificEvoShards[metaCard.name];
               if (specShards > 0) {
                 const usedSpec = Math.min(shardsNeeded, specShards);
                 shardsNeeded -= usedSpec;
                 localSpecificEvoShards[metaCard.name] -= usedSpec;
               }
            }
            
            if (localEvoShards >= shardsNeeded && warUseEvoShards) {
              localEvoShards -= shardsNeeded;
              evoShardsUsed.push({ id: metaCard.id, count: shardsNeeded });
            } else {
              missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls?.evolutionMedium || '' });
              missingVariantNames.push(metaCard.name + ' (Evo)');
            }
          }
          
          if (metaIsHero && !isHeroVariantUnlocked(userCard)) {
            if (localHeroCoins >= 200 && warUseHeroCoins) {
              localHeroCoins -= 200;
              heroCoinsUsed.push({ id: metaCard.id, count: 200 });
            } else {
              missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls?.heroMedium || '' });
              missingVariantNames.push(metaCard.name);
            }
          }
        } else {
          totalLevel += 1; 
          missingBaseCards.push(metaCard.name);
          nonMaxLevelCards.push(metaCard.name);
          
          if (metaIsEvo) {
            let shardsNeeded = 6;
            if (localSpecificEvoShards && localSpecificEvoShards[metaCard.name]) {
              const specShards = localSpecificEvoShards[metaCard.name];
              if (specShards > 0) {
                 const usedSpec = Math.min(shardsNeeded, specShards);
                 shardsNeeded -= usedSpec;
                 localSpecificEvoShards[metaCard.name] -= usedSpec;
              }
            }
            if (localEvoShards >= shardsNeeded && warUseEvoShards) {
              localEvoShards -= shardsNeeded;
              evoShardsUsed.push({ id: metaCard.id, count: shardsNeeded });
            } else {
              missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls?.evolutionMedium || '' });
              missingVariantNames.push(metaCard.name + ' (Evo)');
            }
          }
          if (metaIsHero) {
            if (localHeroCoins >= 200 && warUseHeroCoins) {
              localHeroCoins -= 200;
              heroCoinsUsed.push({ id: metaCard.id, count: 200 });
            } else {
              missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls?.heroMedium || '' });
              missingVariantNames.push(metaCard.name);
            }
          }
        }
      });

      const levelScore = (totalLevel / 128) * 100 + levelScoreBoost;
      const missingCardPenalty = (8 - ownedCount) * 10;
      const missingVariantPenalty = (missingEvos.length + missingHeroes.length) * 5;
      const missingMaxLevelPenalty = (8 - maxLevelCount) * 2;
      
      let affinityRaw = levelScore - missingCardPenalty - missingVariantPenalty - missingMaxLevelPenalty;
      affinityRaw = Math.max(0, Math.min(100, affinityRaw));
      
      const tieBreaker = (Math.min(meta.count, 999) * 0.001) + ((meta.maxMedals || 0) * 0.0000001);
      const score = affinityRaw + tieBreaker;
      totalCombinedScore += score;
      
      const avgElixir = meta.elixirCost || 0;
      const totalVirtualGold = virtualUpgrades.reduce((sum: number, u: any) => sum + u.gold, 0);
      const totalEvoShardsUsed = evoShardsUsed.reduce((sum: number, e: any) => sum + e.count, 0);
      const totalCostScore = (gemsUsed * 1000) + 
                             (totalEvoShardsUsed * 5000) + 
                             (totalVirtualGold * 0.001) + 
                             (wildcardsUsed.common * 1) + 
                             (wildcardsUsed.rare * 5) + 
                             (wildcardsUsed.epic * 20) + 
                             (wildcardsUsed.legendary * 100) + 
                             (wildcardsUsed.champion * 200);

      const winRate = meta.winRate || 0;

      evaluatedDecks.push({
        ...meta,
        score,
        avgLevel: totalLevel / 8,
        elixirCost: avgElixir,
        missingEvos,
        missingHeroes,
        virtualUpgrades,
        evoShardsUsed,
        heroCoinsUsed,
        gemsUsed,
        gemsUsedByCard,
        totalCostScore,
        wildcardsUsed,
        wildcardsUsedByCard,
        winRate,
        scoreBreakdown: {
          baseLevelScore: (totalLevel / 128) * 100,
          levelScoreBoost,
          missingCardPenalty,
          missingVariantPenalty,
          missingMaxLevelPenalty,
          missingBaseCards,
          missingVariants: missingVariantNames,
          nonMaxLevelCards
        }
      });
    }

    return { decks: evaluatedDecks, combinedScore: totalCombinedScore };
  }, [profile, magicItems, getRarityClass, getDisplayLevel, getVirtualLevelAndGold, warUseGold, warUseGems, warUseWildcards, warUseEvoShards, warUseHeroCoins, isEvoUnlocked, isHeroVariantUnlocked]);
  
  const bestWarDecks = useMemo(() => {


    if (!warScoredDecks || warScoredDecks.length === 0) return [];
    
    const sortedDecks = [...warScoredDecks].sort((a, b) => b.score - a.score);
    
    let bestCombination: MetaDeck[] = [];
    let bestScore = -1;

    const maxDecksToConsider = Math.min(200, sortedDecks.length);

    const findCombination = (
      currentIndex: number, 
      currentCombination: MetaDeck[], 
      usedCards: Set<number>, 
      currentScore: number
    ) => {
        if (currentCombination.length === 4) {
          const { decks, combinedScore } = evaluateGlobalPool(currentCombination);
          if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestCombination = decks;
          }
          return;
        }

      const remainingNeeded = 4 - currentCombination.length;
      if (currentIndex < maxDecksToConsider) {
         const optimisticMax = currentScore + (sortedDecks[currentIndex].score * remainingNeeded);
         if (optimisticMax <= bestScore) return; 
      }

      for (let i = currentIndex; i < maxDecksToConsider; i++) {
        const deck = sortedDecks[i];
        
        let hasOverlap = false;
        for (const card of deck.cards) {
          if (usedCards.has(card.id)) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          currentCombination.push(deck);
          for (const card of deck.cards) usedCards.add(card.id);
          
          findCombination(i + 1, currentCombination, usedCards, currentScore + deck.score);
          
          currentCombination.pop();
          for (const card of deck.cards) usedCards.delete(card.id);
        }
      }
    };

    findCombination(0, [], new Set(), 0);
    return bestCombination;
  }, [warScoredDecks]);

  return bestWarDecks;
};
