import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CardImage } from './CardImage';
import type { PlayerProfile, Card } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isChampion, hasEvoAvailable, hasHeroAvailable, getCardIcon, getSubstitutions, getVirtualLevelAndGold, getCardsToNextLevel, getDeckAverageElixir } from '../types/clashRoyale';
import { TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Medal, Target, Activity, Copy, Check, UserCircle2, ArrowUp, ArrowDown, LayoutDashboard, QrCode, Droplets, Gem, Swords } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MetaDeck {
  name: string;
  cards: Card[];
  score: number;
  avgLevel: number;
  elixirCost: number;
  count: number;
  maxedCount: number;
  isBestSynergy: boolean;
  maxMedals: number;
  bestPlayerName?: string;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
  virtualUpgrades?: { id: number; gold: number; level: number }[];
  evoShardsUsed?: { id: number; count: number }[];
  heroCoinsUsed?: { id: number; count: number }[];
  gemsUsed?: number;
  gemsUsedByCard?: { id: number; count: number }[];
  totalCostScore?: number;
  wildcardsUsed?: Record<string, number>;
  wildcardsUsedByCard?: { id: number; count: number; rarity: string }[];
  towerTroopId?: number;
  winRate?: number;
  totalMatches?: number;
  scoreBreakdown?: {
    baseLevelScore: number;
    levelScoreBoost: number;
    missingCardPenalty: number;
    missingVariantPenalty: number;
    missingMaxLevelPenalty: number;
    missingBaseCards: string[];
    missingVariants: string[];
    nonMaxLevelCards: string[];
  };
}

interface FilterItem {
  id: number;
  name: string;
  icon: string;
  isEvoFilter: boolean;
  rarity: string;
}

interface DeckBuilderProps {
  profile: PlayerProfile;
  apiKey: string;
  getDisplayLevel: (card: Card) => number;
  cachedDecks: MetaDeck[] | null;
  onAnalysisStart: () => void;
  isLoading: boolean;
  progress: number;
  allGameCards: Card[];
  isMaxPotentialMode: boolean;
  setIsMaxPotentialMode: (val: boolean) => void;
  rawDeckCounts?: any;
  magicItems?: any;
  getRarityClass?: (card: Card) => string;
}

// Meta Deck Builder Component
export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  profile, 
  getDisplayLevel, 
  cachedDecks, 
  onAnalysisStart, 
  isLoading, 
  progress,
  allGameCards,
  isMaxPotentialMode,
  setIsMaxPotentialMode,
  rawDeckCounts,
  magicItems,
  getRarityClass
}) => {
  type SelectedFilterItem = FilterItem & { mode: 'include' | 'exclude' };
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilterItem[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [expandedScoreIdx, setExpandedScoreIdx] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [sortCriterion, setSortCriterion] = useState<string>('winRate');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const isTouchDevice = useMemo(() => {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }, []);

  const [showWarDecks, setShowWarDecks] = useState(false);


  const [warUseGold, setWarUseGold] = useState(false);
  const [warUseGems, setWarUseGems] = useState(false);
  const [warUseWildcards, setWarUseWildcards] = useState(false);
  const [warUseEvoShards, setWarUseEvoShards] = useState(false);
  const [warUseHeroCoins, setWarUseHeroCoins] = useState(false);

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

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedFilters]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  const toggleFilter = (item: FilterItem, action: 'cycle' | 'include' | 'exclude' | 'remove' = 'cycle') => {
    setSelectedFilters(prev => {
      const existingIdx = prev.findIndex(f => f.id === item.id && f.isEvoFilter === item.isEvoFilter);
      
      if (action === 'remove') {
        if (existingIdx >= 0) return prev.filter((_, idx) => idx !== existingIdx);
        return prev;
      }

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const newFilters = [...prev];

        if (action === 'cycle') {
          if (existing.mode === 'include') {
            newFilters[existingIdx] = { ...existing, mode: 'exclude' };
            return newFilters;
          } else {
            return prev.filter((_, idx) => idx !== existingIdx);
          }
        } else if (action === 'include') {
          if (existing.mode === 'include') {
            return prev.filter((_, idx) => idx !== existingIdx);
          } else {
            newFilters[existingIdx] = { ...existing, mode: 'include' };
            return newFilters;
          }
        } else if (action === 'exclude') {
          if (existing.mode === 'exclude') {
            return prev.filter((_, idx) => idx !== existingIdx);
          } else {
            newFilters[existingIdx] = { ...existing, mode: 'exclude' };
            return newFilters;
          }
        }
      }

      if (action === 'exclude') {
        return [...prev, { ...item, mode: 'exclude' }];
      }
      return [...prev, { ...item, mode: 'include' }]; 
    });
  };

  const generateDeckLink = (deck: MetaDeck): string => {
    const { cards, towerTroopId } = deck;
    const deckCards = cards.filter(c => c && c.id && c.id < 68000000).slice(0, 8);
    const deckIds = deckCards.map(c => c.id).join(';');
    
    let towerId = '159000000';
    if (towerTroopId) {
      const tidStr = towerTroopId.toString();
      if (tidStr.startsWith('68')) {
        towerId = tidStr.replace('68', '159');
      } else if (!tidStr.startsWith('159')) {
        towerId = '159000000';
      } else {
        towerId = tidStr;
      }
    }

    const deepLinkParams = `deck=${deckIds}&l=MetaArchetype&tt=${towerId}`;
    return `https://link.clashroyale.com/en/?clashroyale://copyDeck?${deepLinkParams}`;
  };

  const handleCopyDeck = (deck: MetaDeck, index: number) => {
    const finalLink = generateDeckLink(deck);

    navigator.clipboard.writeText(finalLink).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });

    window.open(finalLink, '_self');
  };

  const handleShowQr = (deck: MetaDeck) => {
    setQrModalUrl(generateDeckLink(deck));
  };

  const getCardSubstitutesData = (cardName: string) => {
    const slug = cardName.toLowerCase().replace(/ /g, '-').replace(/\./g, '');
    const subs = getSubstitutions(slug);
    if (subs.length === 0) return null;
    
    // Find the first sub that the user actually owns
    for (const subSlug of subs) {
      const ownedCard = profile.cards.find(c => c.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '') === subSlug);
      if (ownedCard) {
        return { name: ownedCard.name, icon: getCardIcon(ownedCard, false, false) };
      }
    }
    
    // If none owned, just return the first one as a generic suggestion
    const firstSubCard = allGameCards.find(c => c.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '') === subs[0]);
    if (firstSubCard) {
      return { name: firstSubCard.name, icon: getCardIcon(firstSubCard, false, false) };
    }
    
    return null;
  };

  const { filteredRecommendations } = useMemo(() => {
    if (!cachedDecks || cachedDecks.length === 0) return { cardFilteredDecks: [], filteredRecommendations: [] };
    
    let finalFiltered = cachedDecks
      .filter(deck => {
        const includes = selectedFilters.filter(f => f.mode === 'include');
        const hasAllIncludes = includes.every(filter => {
          if (filter.isEvoFilter) {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'evo');
          } else if (filter.rarity === 'hero') {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'hero');
          } else {
            return deck.cards.some(c => Number(c.id) === filter.id);
          }
        });

        if (!hasAllIncludes) return false;

        const excludes = selectedFilters.filter(f => f.mode === 'exclude');
        const hasAnyExclude = excludes.some(filter => {
          if (filter.isEvoFilter) {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'evo');
          } else if (filter.rarity === 'hero') {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'hero');
          } else {
            return deck.cards.some(c => Number(c.id) === filter.id);
          }
        });

        if (hasAnyExclude) return false;

        return true;
      });

    finalFiltered.sort((a, b) => {
        const aDisplayScore = Math.round(a.score);
        const bDisplayScore = Math.round(b.score);
        
        if (aDisplayScore !== bDisplayScore) return b.score - a.score;
        
        const dir = sortDirection === 'desc' ? 1 : -1;
        
        if (sortCriterion === 'winRate') {
            const aVal = a.winRate || 0;
            const bVal = b.winRate || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'elixir') {
            const aVal = a.elixirCost || 0;
            const bVal = b.elixirCost || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'gems') {
            const aVal = a.gemsUsed || 0;
            const bVal = b.gemsUsed || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'gold') {
            const aVal = a.virtualUpgrades?.reduce((sum: number, u: any) => sum + u.gold, 0) || 0;
            const bVal = b.virtualUpgrades?.reduce((sum: number, u: any) => sum + u.gold, 0) || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'affinity') {
            if (a.score !== b.score) return (b.score - a.score) * dir;
        } else if (sortCriterion === 'evoShards') {
            const aVal = a.evoShardsUsed?.reduce((sum: number, e: any) => sum + e.count, 0) || 0;
            const bVal = b.evoShardsUsed?.reduce((sum: number, e: any) => sum + e.count, 0) || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'wildCards') {
            const aVal = Object.values(a.wildcardsUsed || {}).reduce((sum: number, count: any) => sum + count, 0);
            const bVal = Object.values(b.wildcardsUsed || {}).reduce((sum: number, count: any) => sum + count, 0);
            if (aVal !== bVal) return (bVal - aVal) * dir;
        } else if (sortCriterion === 'medals') {
            const aVal = a.maxMedals || 0;
            const bVal = b.maxMedals || 0;
            if (aVal !== bVal) return (bVal - aVal) * dir;
        }
        
        const aCost = a.totalCostScore || 0;
        const bCost = b.totalCostScore || 0;
        if (aCost !== bCost) return aCost - bCost;
        
        return (b.maxMedals || 0) - (a.maxMedals || 0);
    });

    return { 
      filteredRecommendations: selectedFilters.length === 0 ? finalFiltered : finalFiltered.slice(0, 100) 
    };
  }, [cachedDecks, selectedFilters, sortCriterion, sortDirection]);
  const sections = useMemo(() => {
    const evos: FilterItem[] = [];
    const champions: FilterItem[] = [];
    const heroes: FilterItem[] = [];
    const normal: FilterItem[] = [];

    const rarityOrder: Record<string, number> = {
      'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'champion': 5, 'hero': 6
    };

    if (Array.isArray(allGameCards)) {
      allGameCards.forEach(c => {
        if (!c) return;
        const iconUrl = c.iconUrls?.medium || '';
        const rarity = (c.rarity || 'common').toLowerCase();
        
        // DYNAMIC DETECTION (Strict categorization)
        const isChampRarity = rarity === 'champion';
        const canHaveEvo = hasEvoAvailable(c);
        const canHaveHero = hasHeroAvailable(c) && !isChampRarity;

        if (canHaveEvo) {
          const evoIcon = getCardIcon(c, false, true);
          evos.push({ id: c.id, icon: evoIcon, name: c.name, isEvoFilter: true, rarity });
        }
        
        if (isChampRarity) {
          champions.push({ 
            id: c.id, 
            icon: iconUrl, 
            name: c.name, 
            isEvoFilter: false, 
            rarity: 'champion' 
          });
        }

        if (canHaveHero) {
          const heroIcon = getCardIcon(c, true, false);
          heroes.push({ 
            id: c.id, 
            icon: heroIcon, 
            name: c.name.toLowerCase().includes('hero') ? c.name : `${c.name} (Hero)`, 
            isEvoFilter: false, 
            rarity: 'hero' 
          });
        }
        
        if (!isChampRarity) {
          normal.push({ id: c.id, icon: iconUrl, name: c.name, isEvoFilter: false, rarity });
        }
      });
    }

    return {
      evos: evos.sort((a, b) => a.name.localeCompare(b.name)),
      champions: champions.sort((a, b) => a.name.localeCompare(b.name)),
      heroes: heroes.sort((a, b) => a.name.localeCompare(b.name)),
      normal: normal.sort((a, b) => {
        const rA = rarityOrder[a.rarity.toLowerCase()] || 0;
        const rB = rarityOrder[b.rarity.toLowerCase()] || 0;
        if (rA !== rB) return rA - rB;
        return a.name.localeCompare(b.name);
      })
    };
  }, [allGameCards]);

  const renderFilterGrid = (items: FilterItem[], title: string, Icon: any, color: string) => {
    if (items.length === 0) return null;
    return (
      <div className="filter-section-group" key={title}>
        <div className="section-title" style={{ color }}>
          <Icon size={14} /> {title} ({items.length})
        </div>
        <div className="filter-grid">
          {items.map((c, idx) => {
            const selectedItem = selectedFilters.find(f => f.id === c.id && f.isEvoFilter === c.isEvoFilter);
            
            const cardRarity = (c.name && c.name.toLowerCase().includes('ronin')) ? 'legendary' : (c.rarity || 'common').toLowerCase();
            const isRonin = c.name && c.name.toLowerCase().includes('ronin');
            return (
              <div 
                key={`${c.id}-${c.isEvoFilter}-${idx}`} 
                className={`filter-grid-item ${selectedItem ? 'selected' : ''} ${selectedItem?.mode === 'include' ? 'selected-include' : ''} ${selectedItem?.mode === 'exclude' ? 'selected-exclude' : ''} ${c.isEvoFilter ? 'evo' : ''} ${cardRarity === 'legendary' ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  toggleFilter(c, isTouchDevice ? 'cycle' : 'include');
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isTouchDevice) toggleFilter(c, 'exclude');
                }}
                title={c.isEvoFilter ? `Evolved ${c.name}` : c.name}
              >
                <CardImage src={c.icon} cardName={c.name} alt={c.isEvoFilter ? `Evolved ${c.name}` : c.name} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const totalWarGold = useMemo(() => bestWarDecks.reduce((sum, deck) => sum + (deck.virtualUpgrades || []).reduce((g: any, u: any) => g + u.gold, 0), 0), [bestWarDecks]);
  const totalWarGems = useMemo(() => bestWarDecks.reduce((sum, deck) => sum + (deck.gemsUsed || 0), 0), [bestWarDecks]);
  const totalWarWildcards = useMemo(() => bestWarDecks.reduce((sum, deck) => sum + ((deck.wildcardsUsed?.common || 0) + (deck.wildcardsUsed?.rare || 0) + (deck.wildcardsUsed?.epic || 0) + (deck.wildcardsUsed?.legendary || 0) + (deck.wildcardsUsed?.champion || 0)), 0), [bestWarDecks]);
  const totalWarEvoShards = useMemo(() => bestWarDecks.reduce((sum, deck) => sum + (deck.evoShardsUsed || []).reduce((c: any, e: any) => c + e.count, 0), 0), [bestWarDecks]);
  const totalWarHeroCoins = useMemo(() => bestWarDecks.reduce((sum, deck) => sum + (deck.heroCoinsUsed || []).reduce((c: any, e: any) => c + e.count, 0), 0), [bestWarDecks]);

  return (
    <div className="deck-builder">
      <div 
        className="war-banner" 
        onClick={() => setShowWarDecks(!showWarDecks)} 
        style={{ 
          background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', 
          padding: '1rem', 
          borderRadius: '1rem', 
          margin: '0.5rem 1rem 1rem 1rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer', 
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '50%' }}>
            <Swords color="white" size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Clan War Decks</h3>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>Find the best 4 non-overlapping decks</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', width: '32px', height: '32px', borderRadius: '50%' }}>
          {showWarDecks ? <ArrowUp color="white" size={18} /> : <ArrowDown color="white" size={18} />}
        </div>
      </div>

      {showWarDecks && (
        <div className="war-toggles-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '0 1rem 1.5rem 1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ width: '100%', textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enable resources usage for War Decks
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => setWarUseGold(!warUseGold)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: `1px solid ${warUseGold ? '#fbbf24' : 'var(--border)'}`, background: warUseGold ? 'rgba(251, 191, 36, 0.1)' : 'transparent', color: warUseGold ? '#fbbf24' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ fontSize: '10px', color: '#000', lineHeight: 1 }}>💰</span>
              </div>
              Gold
            </button>
            {warUseGold && totalWarGold > 0 && <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>Used: {totalWarGold}</span>}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => setWarUseGems(!warUseGems)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: `1px solid ${warUseGems ? '#10b981' : 'var(--border)'}`, background: warUseGems ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: warUseGems ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <Gem size={16} /> Gems
            </button>
            {warUseGems && totalWarGems > 0 && <span style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>Used: {totalWarGems}</span>}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => setWarUseWildcards(!warUseWildcards)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: `1px solid ${warUseWildcards ? '#3b82f6' : 'var(--border)'}`, background: warUseWildcards ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: warUseWildcards ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <Copy size={16} /> Wildcards
            </button>
            {warUseWildcards && totalWarWildcards > 0 && <span style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>Used: {totalWarWildcards}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => setWarUseEvoShards(!warUseEvoShards)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: `1px solid ${warUseEvoShards ? '#d946ef' : 'var(--border)'}`, background: warUseEvoShards ? 'rgba(217, 70, 239, 0.1)' : 'transparent', color: warUseEvoShards ? '#d946ef' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <Sparkles size={16} /> Evo Shards
            </button>
            {warUseEvoShards && totalWarEvoShards > 0 && <span style={{ fontSize: '0.75rem', color: '#d946ef', marginTop: '0.25rem' }}>Used: {totalWarEvoShards}</span>}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => setWarUseHeroCoins(!warUseHeroCoins)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: `1px solid ${warUseHeroCoins ? '#f59e0b' : 'var(--border)'}`, background: warUseHeroCoins ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: warUseHeroCoins ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <Crown size={16} /> Hero Coins
            </button>
            {warUseHeroCoins && totalWarHeroCoins > 0 && <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>Used: {totalWarHeroCoins}</span>}
          </div>
        </div>
      )}

      {!showWarDecks && (
        <div className="mode-toggle-container" style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '2rem', padding: '0.25rem', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setIsMaxPotentialMode(false)}
              style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: 'none', background: !isMaxPotentialMode ? 'var(--primary)' : 'transparent', color: !isMaxPotentialMode ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Play Now
            </button>
            <button 
              onClick={() => setIsMaxPotentialMode(true)}
              style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: 'none', background: isMaxPotentialMode ? 'var(--evo-purple)' : 'transparent', color: isMaxPotentialMode ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Sparkles size={16} /> Max Potential
            </button>
          </div>
        </div>
      )}
      
      {!showWarDecks && (
        <>
        <div className="builder-header-simple">
        <div 
          className={`filter-preview-trigger ${isFilterExpanded ? 'active' : ''}`}
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <div className="preview-content">
            <div className="preview-info">
              <div className="preview-label">
                <Filter size={18} />
                <span>FILTER BY CARDS</span>
              </div>
              <div className="preview-status">
                {selectedFilters.length > 0 && (
                  <span className="active-badge">{selectedFilters.length} SELECTED</span>
                )}
              </div>
            </div>
            
            <div className="visual-projection">
              {allGameCards.slice(0, 28).map((c, i) => (
                <img key={i} src={getCardIcon(c, false, false)} alt="" className="tiny-card-asset" loading="lazy" />
              ))}
              <div className="projection-overlay"></div>
            </div>
          </div>
          <div className="expand-chevron">
            {isFilterExpanded ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
          </div>
        </div>
      </div>

      <div className={`filter-animation-wrapper ${isFilterExpanded ? 'expanded' : ''}`}>
        {Array.isArray(allGameCards) && allGameCards.length > 0 && (
          <div className="card-filter-grid-section">
            <div className="filter-header-minimal">
              <div className="active-filters-container">
                <div className="active-filters-label">
                  <Sparkles size={14} /> ACTIVE FILTERS
                </div>
                
                <div className="active-filters-visual-stack">
                  {selectedFilters.map((f) => (
                    <div 
                      key={`${f.id}-${f.isEvoFilter}`} 
                      className={`active-filter-icon-wrapper ${f.mode === 'exclude' ? 'excluded' : 'included'}`}
                      onClick={() => toggleFilter(f, 'remove')}
                      title={`Remove ${f.name}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardImage src={f.icon} cardName={f.name} />
                    </div>
                  ))}
                </div>
              </div>

              {selectedFilters.length > 0 && (
                <button onClick={() => { setSelectedFilters([]); }} className="clear-btn">
                  <X size={12} /> Reset
                </button>
              )}
            </div>
            
            <div className="filter-legend" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.5)', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              {isTouchDevice ? (
                <>
                  <span style={{ fontWeight: 600 }}>Tap to cycle:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                    <span>Include</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
                    <span>Exclude</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                    <span>Left Click = Include</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
                    <span>Right Click = Exclude</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="filter-sections-container">
              {renderFilterGrid(sections.evos, "EVOLUTIONS", Sparkles, "var(--evo-purple)")}
              {renderFilterGrid(sections.champions, "CHAMPIONS", Crown, "var(--champion-gold)")}
              {renderFilterGrid(sections.heroes, "HEROES", Crown, "var(--hero-yellow)")}
              {renderFilterGrid(sections.normal, "ALL CARDS", Filter, "var(--text-muted)")}
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {!cachedDecks && !isLoading && (
        <div className="start-analysis-container-centered">
          <button onClick={onAnalysisStart} className="big-analysis-btn-premium">
            <TrendingUp size={24} />
            <span>FIND META DECKS</span>
          </button>
        </div>
      )}
      
      {selectedFilters.length === 0 && !showWarDecks && !cachedDecks && !isLoading && (
        <div className="empty-state">
          <div className="empty-icon"><Activity size={48} /></div>
          <h3>Select Cards to Find Decks</h3>
          <p>Tap cards in the filter above to discover the perfect meta deck for your collection.</p>
          <button className="action-btn" onClick={() => setIsFilterExpanded(true)} style={{ marginTop: '1rem', background: 'var(--primary)' }}>
            <Filter size={16} />
            <span>FIND META DECKS</span>
          </button>
        </div>
      )}
      
      {isLoading && !cachedDecks && (
        <div className="skeleton-container">
          <div className="analysis-status" style={{ marginBottom: '1.5rem', background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <div className="status-main">
              <RefreshCw size={14} className="spin" />
              <span>Analyzing Top 200 Pro Meta...</span>
            </div>
            <span className="status-percent">{progress}%</span>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="deck-suggestion skeleton-deck">
              <div className="deck-header skeleton-pulse" style={{ height: '60px' }}></div>
              <div className="deck-main-content">
                <div className="mini-card-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <div key={j} className="skeleton-card skeleton-pulse"></div>
                  ))}
                </div>
                <div className="skeleton-stats skeleton-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cachedDecks ? (
        <div className="recommendations-list" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
          {isLoading && (
            <div className="analysis-progress-container" style={{ margin: '1rem 0' }}>
              <div className="analysis-status">
                <div className="status-main">
                  <RefreshCw size={14} className="spin" />
                  <span>REFRESHING META DATA...</span>
                </div>
                <span className="status-percent">{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          {showWarDecks ? (
            <div className="results-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div className="total-decks-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <Swords size={14} />
                <span>4 DISJOINT DECKS FOR CLAN WARS</span>
              </div>
              <div className="total-decks-badge" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <Trophy size={14} />
                <span>COMBINED SCORE: {Math.round(bestWarDecks.reduce((sum, d) => sum + d.score, 0))}</span>
              </div>
            </div>
          ) : (
            <div className="results-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="total-decks-badge">
                <LayoutDashboard size={14} />
                <span>TOTAL DECKS: {filteredRecommendations.length} {filteredRecommendations.length > visibleCount && `(SHOWING ${visibleCount})`}</span>
              </div>
              
              <div className="deck-sorting-controls">
                <span className="sorting-label">TIE-BREAKER</span>
                <select 
                  value={sortCriterion}
                  onChange={(e) => setSortCriterion(e.target.value)}
                  className="premium-select"
                >
                  <option value="winRate">Win Rate</option>
                  <option value="elixir">Avg Elixir</option>
                  <option value="medals">Medals</option>
                  <option value="gems">Gems Cost</option>
                  <option value="gold">Gold Cost</option>
                  <option value="affinity">Exact Affinity</option>
                  <option value="evoShards">Evo Shards Used</option>
                  <option value="wildCards">Wildcards Used</option>
                </select>
                <button 
                  onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="sort-dir-btn"
                  title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                >
                  {sortDirection === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                </button>
              </div>
            </div>
          )}
          
          {(showWarDecks ? bestWarDecks : filteredRecommendations.slice(0, visibleCount)).map((deck, idx) => {
            const missingCards: any[] = [];
            const ownedLevelSum = deck.cards.reduce((sum: number, metaCard: any) => {
              const uCard = profile.cards.find(c => Number(c.id) === Number(metaCard.id));
              if (!uCard) missingCards.push(metaCard);
              return sum + (uCard ? getDisplayLevel(uCard) : 0);
            }, 0);
            const ownedCount = 8 - missingCards.length;
            const realAvgLevel = ownedCount > 0 ? (ownedLevelSum / ownedCount).toFixed(1) : 0;
            const affinityPercent = Math.floor(deck.score);
            const affinityColor = affinityPercent >= 95 ? '#4ade80' : (affinityPercent >= 70 ? '#fbbf24' : '#ef4444');

            const evoCount = deck.cards.filter((c: any) => c._forceForm === 'evo').length;
            const champCount = deck.cards.filter((c: any) => isChampion(c) || c._forceForm === 'hero').length;
            let themeClass = '';
            if (evoCount > champCount && evoCount > 0) themeClass = 'theme-evo';
            else if (champCount > evoCount && champCount > 0) themeClass = 'theme-champion';
            else if (evoCount > 0 && champCount > 0) themeClass = 'theme-mixed';

            const totalVirtualGold = deck.virtualUpgrades?.reduce((sum: number, u: any) => sum + u.gold, 0) || 0;
            const totalEvoShardsUsed = deck.evoShardsUsed?.reduce((sum: number, e: any) => sum + e.count, 0) || 0;
            const totalHeroCoinsUsed = deck.heroCoinsUsed?.reduce((sum: number, h: any) => sum + h.count, 0) || 0;
            const wcu = deck.wildcardsUsed || {};

            // STABLE KEY FOR PERFORMANCE
            const deckKey = deck.cards.map(c => `${c.id}-${(c as any)._forceForm}`).sort().join('|') + `-${deck.towerTroopId}`;

            return (
              <div key={deckKey} className={`deck-suggestion ${themeClass}`}>
                <div className="deck-header">
                  <div className="deck-header-left">
                    <div className="deck-header-info">
                      <div className="deck-meta-tags">
                        <div className="meta-tag uses" title="Number of Pro Players using this exact 8-card combination"><Trophy size={12} /> <span>{deck.count} PRO USES</span></div>
                        {deck.maxMedals > 0 && <div className="meta-tag medals" title="Highest medals achieved with this deck"><Medal size={12} /> <span>{deck.maxMedals}</span></div>}
                        {deck.bestPlayerName && <div className="meta-tag player" title="Top player using this deck"><UserCircle2 size={12} /> <span>{deck.bestPlayerName}</span></div>}
                        {deck.winRate !== undefined && (
                          <div className="meta-tag" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }} title="Win Rate"><TrendingUp size={12} /> <span>{deck.winRate.toFixed(1)}% WR</span></div>
                        )}
                        <div className="meta-tag" style={{ color: '#d946ef', borderColor: 'rgba(217, 70, 239, 0.3)', background: 'rgba(217, 70, 239, 0.1)' }} title="Avg Elixir"><Droplets size={12} /> <span>{deck.elixirCost.toFixed(1)}</span></div>
                      </div>
                    </div>
                    <div className="deck-actions">
                      <button 
                        className={`action-btn copy-btn ${copiedIndex === idx ? 'copied' : ''}`}
                        onClick={() => handleCopyDeck(deck, idx)}
                      >
                        {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedIndex === idx ? 'COPIED!' : 'COPY'}</span>
                      </button>
                      <button 
                        className="action-btn qr-btn"
                        onClick={() => handleShowQr(deck)}
                        title="Show QR Code"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="deck-header-right" style={{ position: 'relative' }} 
                    onMouseEnter={() => setExpandedScoreIdx(idx)} 
                    onMouseLeave={() => setExpandedScoreIdx(null)}
                    onClick={() => setExpandedScoreIdx(expandedScoreIdx === idx ? null : idx)}
                  >
                    <div className="affinity-pill" style={{ borderColor: affinityColor, boxShadow: `0 0 10px ${affinityColor}33`, cursor: 'pointer' }}>
                      <Target size={14} style={{ color: affinityColor }} />
                      <div className="affinity-content">
                        <span className="label">AFFINITY</span>
                        <span className="value" style={{ color: affinityColor }}>{affinityPercent}%</span>
                      </div>
                    </div>
                    
                    {expandedScoreIdx === idx && deck.scoreBreakdown && (
                      <div className="score-breakdown-panel" style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        zIndex: 100, 
                        width: 'max-content',
                        minWidth: '300px',
                        maxWidth: '90vw',
                        background: 'rgba(15,23,42,0.95)', 
                        backdropFilter: 'blur(16px)', 
                        marginTop: '0.5rem', 
                        padding: '1.25rem', 
                        borderRadius: '1rem', 
                        border: '1px solid rgba(255,255,255,0.15)', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.2s ease-out' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><Activity size={16} /> SCORE BREAKDOWN</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)' }}>{deck.score.toFixed(2)}%</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}>
                            <span>📈 Base Level Score</span>
                            <span>+{deck.scoreBreakdown.baseLevelScore.toFixed(2)}%</span>
                          </div>
                          
                          {deck.scoreBreakdown.levelScoreBoost > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa' }}>
                              <span>⚡ Progress Boost</span>
                              <span>+{deck.scoreBreakdown.levelScoreBoost.toFixed(2)}%</span>
                            </div>
                          )}
                          
                          {deck.scoreBreakdown.missingCardPenalty > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                <span>🚫 Missing Cards Penalty (-10% each)</span>
                                <span>-{deck.scoreBreakdown.missingCardPenalty.toFixed(2)}%</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {deck.scoreBreakdown.missingBaseCards.map(c => <span key={c} style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>{c}</span>)}
                              </div>
                            </div>
                          )}
                          
                          {deck.scoreBreakdown.missingVariantPenalty > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316' }}>
                                <span>💎 Missing Evo/Hero Penalty (-5% each)</span>
                                <span>-{deck.scoreBreakdown.missingVariantPenalty.toFixed(2)}%</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {deck.scoreBreakdown.missingVariants.map(c => <span key={c} style={{ fontSize: '0.7rem', background: 'rgba(249,115,22,0.2)', color: '#f97316', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid rgba(249,115,22,0.3)' }}>{c}</span>)}
                              </div>
                            </div>
                          )}
                          
                          {deck.scoreBreakdown.missingMaxLevelPenalty > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eab308' }}>
                                <span>👑 Non-Max Level Penalty (-2% each)</span>
                                <span>-{deck.scoreBreakdown.missingMaxLevelPenalty.toFixed(2)}%</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {deck.scoreBreakdown.nonMaxLevelCards.map(c => <span key={c} style={{ fontSize: '0.7rem', background: 'rgba(234,179,8,0.2)', color: '#eab308', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid rgba(234,179,8,0.3)' }}>{c}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="deck-main-content">
                  <div className="mini-card-grid">
                    {deck.cards.map((card, index) => {
                      const userCard = profile.cards.find(c => Number(c.id) === Number(card.id));
                      const userLevel = userCard ? getDisplayLevel(userCard) : 0;
                      const isMaxed = userLevel >= 16;
                      
                      // STRICT VARIANT DETECTION (Restricted to slots 0, 1, 2)
                      const forcedForm = (card as any)._forceForm;
                      const canHaveVariant = index < 3;
                      const cardIsHero = canHaveVariant && (forcedForm === 'hero' || isHeroVariantUnlocked(card));
                      const cardIsEvo = canHaveVariant && (forcedForm === 'evo' || (!cardIsHero && isEvoUnlocked(card)));
                      const cardIsChamp = isChampion(card);
                      
                      const displayIcon = getCardIcon(card, cardIsHero, cardIsEvo);
                      const cardRarity = (card.name && card.name.toLowerCase().includes('ronin')) ? 'legendary' : (card.rarity || 'common').toLowerCase();
                      const isRonin = card.name && card.name.toLowerCase().includes('ronin');

                      const virtualUpgradeInfo = deck.virtualUpgrades?.find((u: any) => u.id === card.id);
                      const evoUsed = deck.evoShardsUsed?.find((e: any) => e.id === card.id);
                      const heroUsed = deck.heroCoinsUsed?.find((h: any) => h.id === card.id);

                      return (
                        <div 
                          key={card.id || index} 
                          className={`mini-card ${cardIsEvo ? 'evo-slot' : ''} ${cardIsChamp ? 'champion-slot' : ''} ${cardIsHero ? 'hero-slot' : ''} ${cardRarity === 'legendary' ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`} 
                          style={{ 
                            opacity: userCard ? 1 : 0.4, 
                            '--card-img': `url(${displayIcon})` 
                          } as React.CSSProperties}
                        >
                          <div className="card-image-container">
                            {displayIcon && <CardImage src={displayIcon} cardName={card.name} />}
                          </div>
                          
                          <div className="card-badges-container">
                            {virtualUpgradeInfo && (
                              <div className="virtual-upgrade-badge" title={`Can upgrade to lvl ${virtualUpgradeInfo.level}`}>
                                <span className="coin-icon">💰</span>{virtualUpgradeInfo.gold >= 1000 ? `${Math.floor(virtualUpgradeInfo.gold / 1000)}k` : virtualUpgradeInfo.gold}
                              </div>
                            )}
                            
                            {evoUsed && (
                              <div className="magic-badge evo-badge" title={`${evoUsed.count} Evo Shards needed`}>
                                💎 {evoUsed.count}
                              </div>
                            )}
                            
                            {heroUsed && (
                              <div className="magic-badge hero-badge" title={`${heroUsed.count} Hero Coins needed`}>
                                🪙 {heroUsed.count}
                              </div>
                            )}

                            {(() => {
                              const gemInfo = deck.gemsUsedByCard?.find((g: any) => g.id === card.id);
                              if (!gemInfo) return null;
                              return (
                                <div className="magic-badge" style={{
                                  background: '#10b981',
                                  color: 'white',
                                  borderColor: 'rgba(255,255,255,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }} title={`${gemInfo.count} Gems needed`}>
                                  <Gem size={10} fill="currentColor" /> {gemInfo.count}
                                </div>
                              );
                            })()}

                            {(() => {
                              const wcInfo = deck.wildcardsUsedByCard?.find((w: any) => w.id === card.id);
                              if (!wcInfo) return null;
                              return (
                                <div className="magic-badge" style={{
                                  background: `var(--rarity-${wcInfo.rarity})`,
                                  color: 'white',
                                  borderColor: 'rgba(255,255,255,0.3)'
                                }} title={`${wcInfo.count} ${wcInfo.rarity} Wildcards needed`}>
                                  🃏 {wcInfo.count}
                                </div>
                              );
                            })()}
                          </div>

                          <div className={`mini-level ${isMaxed ? 'maxed' : ''} ${virtualUpgradeInfo ? 'virtual' : ''}`}>
                            {virtualUpgradeInfo ? virtualUpgradeInfo.level : (userLevel || '!')}
                          </div>
                          {cardIsEvo && <div className="evo-indicator-tiny"></div>}
                          {cardIsChamp && <div className="champion-indicator-tiny"></div>}
                          {cardIsHero && <div className="hero-indicator-tiny"></div>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="deck-stats-group">
                    <div className="deck-stat-item">
                      <div className="stat-icon"><Droplets size={14} color="#d946ef" /></div>
                      <div className="stat-info"><span className="stat-label">AVG ELIXIR</span><span className="stat-value">{deck.elixirCost.toFixed(1)}</span></div>
                    </div>
                    <div className="deck-stat-item">
                      <div className="stat-icon"><Activity size={14} /></div>
                      <div className="stat-info"><span className="stat-label">AVG LEVEL</span><span className="stat-value">{realAvgLevel}</span></div>
                    </div>
                    <div className={`deck-stat-item ${deck.maxedCount === 8 ? 'maxed' : ''}`}>
                      <div className="stat-icon"><CheckCircle2 size={14} /></div>
                      <div className="stat-info"><span className="stat-label">MAXED CARDS</span><span className="stat-value">{deck.maxedCount}/8</span></div>
                    </div>
                  </div>
                </div>

                {(missingCards.length > 0 || deck.missingEvos?.length > 0 || deck.missingHeroes?.length > 0) ? (
                  <div className="deck-missing-section">
                    <div className="missing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="missing-label"><AlertCircle size={12} /><span>MISSING REQUIREMENTS</span></div>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {totalVirtualGold > 0 && (
                          <div className="virtual-total-gold" title="Total Gold Needed">
                            <span className="coin-icon">💰</span> {totalVirtualGold >= 1000 ? `${Math.floor(totalVirtualGold / 1000)}k` : totalVirtualGold}
                          </div>
                        )}
                        {(deck.gemsUsed || 0) > 0 && (
                          <div className="virtual-total-gold" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', gap: '3px' }} title="Gems Used">
                            <Gem size={12} fill="currentColor" /> {deck.gemsUsed}
                          </div>
                        )}
                        {totalEvoShardsUsed > 0 && (
                          <div className="virtual-total-gold" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.1)' }} title="Wild Evo Shards">
                            <span className="coin-icon">💎</span> {totalEvoShardsUsed}
                          </div>
                        )}
                        {totalHeroCoinsUsed > 0 && (
                          <div className="virtual-total-gold" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.1)' }} title="Hero Coins">
                            <span className="coin-icon">🪙</span> {totalHeroCoinsUsed}
                          </div>
                        )}
                        {wcu.common > 0 && <div className="virtual-total-gold" style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }} title="Common Wildcards"><span className="coin-icon">🃏</span> {wcu.common}</div>}
                        {wcu.rare > 0 && <div className="virtual-total-gold" style={{ color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.3)' }} title="Rare Wildcards"><span className="coin-icon">🃏</span> {wcu.rare}</div>}
                        {wcu.epic > 0 && <div className="virtual-total-gold" style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }} title="Epic Wildcards"><span className="coin-icon">🃏</span> {wcu.epic}</div>}
                        {wcu.legendary > 0 && <div className="virtual-total-gold" style={{ color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.3)' }} title="Legendary Wildcards"><span className="coin-icon">🃏</span> {wcu.legendary}</div>}
                        {wcu.champion > 0 && <div className="virtual-total-gold" style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }} title="Champion Wildcards"><span className="coin-icon">🃏</span> {wcu.champion}</div>}
                      </div>
                    </div>
                    <div className="missing-icons-list">
                      {deck.missingEvos?.map((evo, eIdx) => (
                        <div key={`evo-${eIdx}`} className="missing-item-badge evo">
                          <CardImage src={evo.icon} cardName={evo.name} />
                          <span>{evo.name} (EVO)</span>
                        </div>
                      ))}
                      {deck.missingHeroes?.map((hero, hIdx) => (
                        <div key={`hero-${hIdx}`} className="missing-item-badge hero">
                          <CardImage src={hero.icon} cardName={hero.name} />
                          <span>{hero.name}</span>
                        </div>
                      ))}
                      {missingCards.map((c: any, i: number) => {
                        const sub = getCardSubstitutesData(c.name);
                        return (
                          <div key={`card-${i}`} className="missing-item-badge">
                            <CardImage src={c.iconUrls.medium} cardName={c.name} />
                            <span>{c.name}</span>
                            {sub && (
                              <div style={{ marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Try:</span>
                                <CardImage src={sub.icon} cardName={sub.name} style={{ width: '16px', height: '16px', borderRadius: '50%' }} title={`Substitute with ${sub.name}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="deck-ready-footer" style={{ justifyContent: totalVirtualGold > 0 ? 'space-between' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={12} /><span>DECK FULLY READY</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {totalVirtualGold > 0 && (
                        <div className="virtual-total-gold" title="Total Gold Needed">
                          <span className="coin-icon">💰</span> {totalVirtualGold >= 1000 ? `${Math.floor(totalVirtualGold / 1000)}k` : totalVirtualGold}
                        </div>
                      )}
                      {(deck.gemsUsed || 0) > 0 && (
                        <div className="virtual-total-gold" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', gap: '3px' }} title="Gems Used">
                          <Gem size={12} fill="currentColor" /> {deck.gemsUsed}
                        </div>
                      )}
                      {totalEvoShardsUsed > 0 && (
                        <div className="virtual-total-gold" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.1)' }} title="Wild Evo Shards">
                          <span className="coin-icon">💎</span> {totalEvoShardsUsed}
                        </div>
                      )}
                      {totalHeroCoinsUsed > 0 && (
                        <div className="virtual-total-gold" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.1)' }} title="Hero Coins">
                          <span className="coin-icon">🪙</span> {totalHeroCoinsUsed}
                        </div>
                      )}
                      {wcu.common > 0 && <div className="virtual-total-gold" style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }} title="Common Wildcards"><span className="coin-icon">🃏</span> {wcu.common}</div>}
                      {wcu.rare > 0 && <div className="virtual-total-gold" style={{ color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.3)' }} title="Rare Wildcards"><span className="coin-icon">🃏</span> {wcu.rare}</div>}
                      {wcu.epic > 0 && <div className="virtual-total-gold" style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }} title="Epic Wildcards"><span className="coin-icon">🃏</span> {wcu.epic}</div>}
                      {wcu.legendary > 0 && <div className="virtual-total-gold" style={{ color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.3)' }} title="Legendary Wildcards"><span className="coin-icon">🃏</span> {wcu.legendary}</div>}
                      {wcu.champion > 0 && <div className="virtual-total-gold" style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }} title="Champion Wildcards"><span className="coin-icon">🃏</span> {wcu.champion}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(!showWarDecks && filteredRecommendations.length > visibleCount) && (
            <div className="load-more-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '3rem' }}>
              <button 
                onClick={handleLoadMore}
                className="action-btn" 
                style={{ padding: '1rem 2.5rem', borderRadius: '3rem', fontSize: '1rem' }}
              >
                <RefreshCw size={18} />
                <span>LOAD MORE DECKS</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {qrModalUrl && (
        <div className="qr-modal-overlay" onClick={() => setQrModalUrl(null)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Scan to Copy Deck</h3>
              <button onClick={() => setQrModalUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
              <QRCodeSVG value={qrModalUrl} size={256} level="H" includeMargin={false} fgColor="#000000" bgColor="#ffffff" />
            </div>
            <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Open your camera or a QR scanner app on your phone to copy this deck directly into Clash Royale.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


