import { useState, useMemo } from 'react';
import { PlayerProfile, Card, getDisplayLevel, getCardIcon, isEvoUnlocked, isHeroVariantUnlocked, hasHeroAvailable, hasEvoAvailable, isChampion, registerCardIcons, getRarityClass } from '../types/clashRoyale';
import { fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from '../services/royaleApi';
import { calculateDeckAffinity } from '../utils/affinityAlgorithm';

export const useMetaDecks = (profile: PlayerProfile | null, apiKey: string) => {
  const [metaDecksCache, setMetaDecksCache] = useState<any[] | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaProgress, setMetaProgress] = useState(0);
  const [error, setError] = useState('');

  const performMetaAnalysis = async (customProfile?: PlayerProfile) => {
    const activeProfile = customProfile || profile;
    if (!activeProfile) return;
    
    setIsMetaLoading(true);
    setMetaProgress(0);
    setError('');
    
    try {
      let seasonId: string | undefined;
      let prevSeasonId: string | undefined;
      
      try {
        const seasons = await getPathOfLegendSeasons(apiKey);
        if (seasons.items && seasons.items.length > 0) {
          seasonId = seasons.items[seasons.items.length - 1].id;
          if (seasons.items.length > 1) {
            prevSeasonId = seasons.items[seasons.items.length - 2].id;
          }
        }
      } catch (e) { console.warn('[Meta] Seasons lookup failed'); }

      const pathsToTry = [
        '/locations/global/pathoflegend/players?limit=100',
        seasonId ? `/locations/global/rankings/seasons/${seasonId}/players?limit=100` : null,
        prevSeasonId ? `/locations/global/rankings/seasons/${prevSeasonId}/players?limit=100` : null,
        seasonId ? `/locations/global/seasons/${seasonId}/rankings/players?limit=100` : null,
        prevSeasonId ? `/locations/global/seasons/${prevSeasonId}/rankings/players?limit=100` : null,
        '/locations/global/rankings/players?limit=100',
        '/locations/57000000/rankings/players?limit=100'
      ].filter(Boolean) as string[];
      
      let rankingsData: any = null;
      for (const path of pathsToTry) {
        try {
          const data = await fetchRankings(apiKey, path);
          if (data && data.items && data.items.length > 0) {
            rankingsData = data;
            break;
          }
        } catch (e) { console.warn(`[Meta] Error on path: ${path}`); }
      }

      if (!rankingsData) throw new Error('Could not find any active rankings.');

      const playersToFetch = rankingsData.items.slice(0, 200);
      const decksWithRatings: { deck: Card[], towerTroopId?: number, rating: number, playerName: string }[] = [];
      const batchSize = 20;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find((entry: any) => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        if (!recentMatch || !recentMatch.team || !recentMatch.team[0]) return null;
        const allCards = recentMatch.team[0].cards || [];
        registerCardIcons(allCards);
        const towerTroop = allCards.find((c: any) => c.id >= 68000000);
        
        const deck = allCards.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
          let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
          const isChamp = isChampion(c);
          if (index < 3 && !isChamp) {
            if (isHeroVariantUnlocked(c)) forcedForm = 'hero';
            else if (isEvoUnlocked(c)) forcedForm = 'evo';
            else if (hasHeroAvailable(c)) forcedForm = 'hero';
            else if (hasEvoAvailable(c)) forcedForm = 'evo';
          }
          return { ...c, _forceForm: forcedForm, key: c.key, form: c.form, activeForm: c.activeForm, slot: c.slot };
        });
        return { deck, towerTroopId: towerTroop?.id };
      };

      for (let i = 0; i < playersToFetch.length; i += batchSize) {
        const batch = playersToFetch.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (p: any) => {
          try { 
            const pElo = Number(p.eloRating || 0);
            const pTrophy = Number(p.trophies || 0);
            const proRating = pElo > 0 ? pElo : pTrophy;
            const proName = p.name || "Unknown Pro";

            const log = await getBattleLog(p.tag, apiKey);
            const logData = log ? extractDeckFromLog(log) : null;
            if (logData && logData.deck.length === 8) return { ...logData, rating: proRating, playerName: proName };
            
            const deck = await getPlayerDeck(p.tag, apiKey);
            if (deck && Array.isArray(deck)) {
              const filtered = deck.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
                let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
                if (index < 3) {
                  if (isHeroVariantUnlocked(c)) forcedForm = 'hero';
                  else if (isEvoUnlocked(c)) forcedForm = 'evo';
                }
                return { ...c, _forceForm: forcedForm };
              });
              const tower = deck.find((c: any) => c.id >= 68000000);
              return filtered.length === 8 ? { deck: filtered, towerTroopId: tower?.id, rating: proRating, playerName: proName } : null;
            }
          } catch { return null; }
          return null;
        }));
        decksWithRatings.push(...results.filter((d): d is any => d !== null));
        setMetaProgress(Math.round(((i + batch.length) / playersToFetch.length) * 100));
      }
      
      const deckCounts: Record<string, { cards: Card[], towerTroopId?: number, count: number, maxRating: number, bestPlayerName: string }> = {};
      decksWithRatings.forEach(item => {
        const key = item.deck.map((c: any) => `${c.id}-${c._forceForm}`).sort().join(',');
        const itemRating = Number(item.rating);
        if (deckCounts[key]) {
          deckCounts[key].count++;
          if (itemRating > deckCounts[key].maxRating) {
            deckCounts[key].maxRating = itemRating;
            deckCounts[key].bestPlayerName = item.playerName;
          }
          if (!deckCounts[key].towerTroopId) deckCounts[key].towerTroopId = item.towerTroopId;
        } else {
          deckCounts[key] = { cards: item.deck, towerTroopId: item.towerTroopId, count: 1, maxRating: itemRating, bestPlayerName: item.playerName };
        }
      });

      const scoredDecks = Object.values(deckCounts).map(meta => {
        const affinity = calculateDeckAffinity(meta.cards, meta.count, meta.maxRating, activeProfile);
        let totalLevel = 0;
        meta.cards.forEach(c => {
          const u = activeProfile.cards.find(ac => Number(ac.id) === Number(c.id));
          totalLevel += u ? getDisplayLevel(u) : 1;
        });

        return {
          name: `Meta Archetype`,
          cards: meta.cards,
          towerTroopId: meta.towerTroopId,
          count: meta.count,
          bestPlayerName: meta.bestPlayerName,
          maxMedals: meta.maxRating,
          avgLevel: totalLevel / 8,
          ...affinity
        };
      });

      setMetaDecksCache(scoredDecks.sort((a, b) => b.score - a.score));
    } catch (err: any) { 
      setError('Meta analysis failed.'); 
    } finally { 
      setIsMetaLoading(false); 
    }
  };

  const metaInsightsData = useMemo(() => {
    if (!metaDecksCache || !profile) return null;
    
    const allMetaDecks = metaDecksCache;
    const totalDecksCount = allMetaDecks.length;
    const absoluteEvoUsage: Record<number, { name: string, icon: string, count: number }> = {};
    const absoluteHeroUsage: Record<number, { name: string, icon: string, count: number }> = {};
    const absoluteRarityUsage: Record<string, Record<number, { name: string, icon: string, count: number, rarity: string }>> = { common: {}, rare: {}, epic: {}, legendary: {}, champion: {} };

    allMetaDecks.forEach(deck => {
      deck.cards.forEach((metaCard: any, idx: number) => {
        const forcedForm = metaCard._forceForm;
        const cardRarity = getRarityClass(metaCard);
        if (absoluteRarityUsage[cardRarity]) {
          if (!absoluteRarityUsage[cardRarity][metaCard.id]) absoluteRarityUsage[cardRarity][metaCard.id] = { name: metaCard.name, icon: metaCard.iconUrls?.medium || '', count: 0, rarity: cardRarity };
          absoluteRarityUsage[cardRarity][metaCard.id].count++;
        }
        if (idx < 3) {
          if (forcedForm === 'evo') {
            if (!absoluteEvoUsage[metaCard.id]) absoluteEvoUsage[metaCard.id] = { name: metaCard.name, icon: getCardIcon(metaCard, false, true), count: 0 };
            absoluteEvoUsage[metaCard.id].count++;
          } else if (forcedForm === 'hero') {
            if (!absoluteHeroUsage[metaCard.id]) absoluteHeroUsage[metaCard.id] = { name: metaCard.name, icon: getCardIcon(metaCard, true, false), count: 0 };
            absoluteHeroUsage[metaCard.id].count++;
          }
        }
      });
    });

    const missingEvoImpact: Record<number, { name: string, icon: string, impact: number, count: number }> = {};
    const missingHeroImpact: Record<number, { name: string, icon: string, impact: number, count: number }> = {};
    const upgradeRarityImpact: Record<number, { name: string, icon: string, impact: number, count: number, rarity: string, id: number }> = {};

    allMetaDecks.forEach(deck => {
      const weight = Math.pow(deck.score / 10, 3);
      deck.missingEvos.forEach((evo: any) => {
        const card = deck.cards.find((c: any) => c.name === evo.name);
        if (!card) return;
        if (!missingEvoImpact[card.id]) missingEvoImpact[card.id] = { name: evo.name, icon: evo.icon, impact: 0, count: 0 };
        missingEvoImpact[card.id].impact += weight;
        missingEvoImpact[card.id].count++;
      });
      deck.missingHeroes.forEach((hero: any) => {
        const card = deck.cards.find((c: any) => c.name === hero.name);
        if (!card) return;
        if (!missingHeroImpact[card.id]) missingHeroImpact[card.id] = { name: hero.name, icon: hero.icon, impact: 0, count: 0 };
        missingHeroImpact[card.id].impact += weight;
        missingHeroImpact[card.id].count++;
      });
      deck.cards.forEach((metaCard: any) => {
        const userCard = profile!.cards.find(c => Number(c.id) === Number(metaCard.id));
        const displayLevel = userCard ? getDisplayLevel(userCard) : 0;
        if (displayLevel > 0 && displayLevel < 16) {
          const r = getRarityClass(metaCard);
          const gain = (16 - displayLevel) / 1.28 + 2;
          if (!upgradeRarityImpact[metaCard.id]) upgradeRarityImpact[metaCard.id] = { id: metaCard.id, name: metaCard.name, icon: metaCard.iconUrls?.medium || '', impact: 0, count: 0, rarity: r };
          upgradeRarityImpact[metaCard.id].impact += (gain * weight);
          upgradeRarityImpact[metaCard.id].count++;
        }
      });
    });

    const sortedEvos = Object.values(missingEvoImpact).sort((a, b) => b.impact - a.impact);
    const sortedHeroes = Object.values(missingHeroImpact).sort((a, b) => b.impact - a.impact);
    const rarities = ['common', 'rare', 'epic', 'legendary', 'champion'];
    const rarityRecs = rarities.map(r => ({ rarity: r, list: Object.values(upgradeRarityImpact).filter(c => c.rarity === r).sort((a, b) => b.impact - a.impact) }));

    return {
      totalDecksCount,
      absoluteEvoUsage,
      absoluteHeroUsage,
      absoluteRarityUsage,
      sortedEvos,
      sortedHeroes,
      rarityRecs,
      rarities
    };
  }, [metaDecksCache, profile]);

  return {
    metaDecksCache,
    isMetaLoading,
    metaProgress,
    error,
    performMetaAnalysis,
    metaInsightsData
  };
};
