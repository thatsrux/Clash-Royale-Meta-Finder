import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Trophy, Shield, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, X as CloseIcon, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from './services/royaleApi';
import { CardImage } from './components/CardImage';
import type { PlayerProfile, Card, MagicItems } from './types/clashRoyale';
import { registerCardIcons, isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, hasHeroAvailable, hasEvoAvailable, isChampion, getDeckAverageElixir, getCardsToNextLevel, getVirtualLevelAndGold } from './types/clashRoyale';
import { DeckBuilder } from './components/DeckBuilder';
import './styles/App.css';

const INTEGRATED_API_KEY = import.meta.env.VITE_CLASH_API_KEY || "";

interface CardInfo {
  id: number;
  rarity: string;
  maxLevel: number;
  elixirCost: number;
  name: string;
  iconUrls?: any;
}

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
  virtualUpgrades: { id: number; gold: number; level: number }[];
  evoShardsUsed: { id: number; count: number }[];
  heroCoinsUsed: { id: number; count: number }[];
  gemsUsed: number;
  gemsUsedByCard: { id: number; count: number }[];
  totalCostScore?: number;
  towerTroopId?: number;
  winRate?: number;
  totalMatches?: number;
}

type SortOption = 'level' | 'elixir' | 'rarity' | 'evo' | 'hero-only' | 'evo-only';
type SortOrder = 'asc' | 'desc';

// Clash Royale Meta Finder - Main Application Entry
function App() {
  const [playerTag, setPlayerTag] = useState('');
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [cardMap, setCardMap] = useState<Record<number, CardInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'decks'>('profile');
  const [sortBy, setSortBy] = useState<SortOption>('level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [metaDecksCache, setMetaDecksCache] = useState<MetaDeck[] | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaProgress, setMetaProgress] = useState(0);
  const [allGameCards, setAllGameCards] = useState<any[]>([]);
  const [insightsExpanded, setInsightsExpanded] = useState({ evo: false, hero: false, rarity: false });
  const [showMagicItems, setShowMagicItems] = useState(false);
  const [rawDeckCounts, setRawDeckCounts] = useState<any>(null);
  const [isMaxPotentialMode, setIsMaxPotentialMode] = useState(false);
  const [magicItems, setMagicItems] = useState<MagicItems>({
    commonWild: 0,
    rareWild: 0,
    epicWild: 0,
    legendaryWild: 0,
    championWild: 0,
    evoShards: 0,
    heroCoins: 0,
    specificEvoShards: {},
    gems: 0
  });

  const getBaseLevel = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 1;
      case 'rare': return 3;
      case 'epic': return 6;
      case 'legendary': return 9;
      case 'champion': return 11;
      case 'hero': return 11;
      default: return 1;
    }
  };

  const getDisplayLevel = useCallback((card: Card) => {
    const info = cardMap[card.id];
    const rarity = (info?.rarity || card.rarity || 'common').toLowerCase();
    const baseLevel = getBaseLevel(rarity);
    const level = Number(card.level) || 0;
    return level + baseLevel - 1;
  }, [cardMap]);

  const getRarityClass = useCallback((card: Card) => {
    if (card.name && card.name.toLowerCase().includes('ronin')) return 'legendary';
    const info = cardMap[card.id];
    return (info?.rarity || card.rarity || 'common').toLowerCase();
  }, [cardMap]);

  // MEMOIZED INSIGHTS CALCULATION - PERFORMANCE FIX
  const metaInsightsData = useMemo(() => {
    if (!metaDecksCache || !profile) return null;
    
    const allMetaDecks = metaDecksCache;
    const totalDecksCount = allMetaDecks.length;
    const absoluteEvoUsage: Record<number, { name: string, icon: string, count: number }> = {};
    const absoluteHeroUsage: Record<number, { name: string, icon: string, count: number }> = {};
    const absoluteRarityUsage: Record<string, Record<number, { name: string, icon: string, count: number, rarity: string }>> = { common: {}, rare: {}, epic: {}, legendary: {}, champion: {} };

    allMetaDecks.forEach(deck => {
      deck.cards.forEach((metaCard, idx) => {
        const forcedForm = (metaCard as any)._forceForm;
        const cardRarity = getRarityClass(metaCard);
        if (absoluteRarityUsage[cardRarity]) {
          if (!absoluteRarityUsage[cardRarity][metaCard.id]) absoluteRarityUsage[cardRarity][metaCard.id] = { name: metaCard.name, icon: metaCard.iconUrls.medium, count: 0, rarity: cardRarity };
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

    const missingEvoImpact: Record<number, { name: string, icon: string, impact: number, shardsNeeded: number }> = {};
    const missingHeroImpact: Record<number, { name: string, icon: string, impact: number, count: number }> = {};
    const upgradeRarityImpact: Record<number, { name: string, icon: string, impact: number, count: number, rarity: string, id: number, cardsNeeded: number, currentLevel: number }> = {};

    allMetaDecks.forEach(deck => {
      const weight = Math.pow(deck.score / 10, 3);
      deck.cards.forEach(metaCard => {
        const userCard = profile!.cards.find(c => Number(c.id) === Number(metaCard.id));
        const forcedForm = (metaCard as any)._forceForm;

        // Evo Logic
        if (forcedForm === 'evo' && (!userCard || !isEvoUnlocked(userCard))) {
          const shardsOwned = magicItems.specificEvoShards?.[metaCard.name] || 0;
          if (!missingEvoImpact[metaCard.id]) {
            missingEvoImpact[metaCard.id] = {
              name: metaCard.name,
              icon: getCardIcon(metaCard, false, true),
              impact: 0,
              shardsNeeded: Math.max(1, 6 - shardsOwned)
            };
          }
          const shardMultiplier = 1 + (shardsOwned * 0.3);
          missingEvoImpact[metaCard.id].impact += (weight * shardMultiplier);
        }

        // Hero Logic
        if (forcedForm === 'hero' && (!userCard || !isHeroVariantUnlocked(userCard))) {
          if (!missingHeroImpact[metaCard.id]) missingHeroImpact[metaCard.id] = { name: metaCard.name, icon: getCardIcon(metaCard, true, false), impact: 0, count: 0 };
          missingHeroImpact[metaCard.id].impact += weight;
          missingHeroImpact[metaCard.id].count++;
        }

        const displayLevel = userCard ? getDisplayLevel(userCard) : 0;
        if (displayLevel > 0 && displayLevel < 16) {
          const r = getRarityClass(metaCard);
          
          let totalNeeded = 0;
          for (let L = displayLevel; L < 16; L++) {
            totalNeeded += getCardsToNextLevel(r, L);
          }
          
          const owned = userCard?.count || 0;
          const cardsNeeded = Math.max(0, totalNeeded - owned);
          const progressRatio = totalNeeded > 0 ? Math.min(1, owned / totalNeeded) : 0;

          const levelGain = (16 - displayLevel) / 1.28 + 2;
          const progressMultiplier = 1 + (progressRatio * 1.5); // up to +150% if enough cards
          const finalGain = levelGain * progressMultiplier;

          if (!upgradeRarityImpact[metaCard.id]) {
            upgradeRarityImpact[metaCard.id] = { 
              id: metaCard.id, name: metaCard.name, icon: metaCard.iconUrls.medium, 
              impact: 0, count: 0, rarity: r, cardsNeeded, currentLevel: displayLevel 
            };
          }
          upgradeRarityImpact[metaCard.id].impact += (finalGain * weight);
          upgradeRarityImpact[metaCard.id].count++;
        }
      });
    });

    const evosList = Object.values(missingEvoImpact);
    const budget = Math.max(6, Number(magicItems.evoShards) || 0);

    const getCombinations = (list: any[], currentBudget: number): any[] => {
      const results: any[] = [];
      const generate = (index: number, currentCombo: any[], currentCost: number, currentImpact: number) => {
        if (currentCombo.length > 0) {
          results.push({
            items: [...currentCombo],
            totalImpact: currentImpact,
            totalCost: currentCost
          });
        }
        for (let i = index; i < list.length; i++) {
          const item = list[i];
          if (currentCost + item.shardsNeeded <= currentBudget) {
            currentCombo.push(item);
            generate(i + 1, currentCombo, currentCost + item.shardsNeeded, currentImpact + item.impact);
            currentCombo.pop();
          }
        }
      };
      generate(0, [], 0, 0);
      return results;
    };

    const allCombos = getCombinations(evosList, budget);
    const actualShards = Number(magicItems.evoShards) || 0;
    
    allCombos.sort((a, b) => {
      const aFeasible = a.totalCost <= actualShards;
      const bFeasible = b.totalCost <= actualShards;
      
      if (aFeasible && !bFeasible) return -1;
      if (!aFeasible && bFeasible) return 1;
      return b.totalImpact - a.totalImpact;
    });
    
    const sortedEvoCombos = allCombos.slice(0, 20);

    const sortedHeroes = Object.values(missingHeroImpact).sort((a, b) => b.impact - a.impact);
    const rarities = ['common', 'rare', 'epic', 'legendary', 'champion'];
    const rarityRecs = rarities.map(r => {
      const list = Object.values(upgradeRarityImpact).filter(c => c.rarity === r);
      let availableWilds = 0;
      if (r === 'common') availableWilds = Number(magicItems.commonWild) || 0;
      if (r === 'rare') availableWilds = Number(magicItems.rareWild) || 0;
      if (r === 'epic') availableWilds = Number(magicItems.epicWild) || 0;
      if (r === 'legendary') availableWilds = Number(magicItems.legendaryWild) || 0;
      if (r === 'champion') availableWilds = Number(magicItems.championWild) || 0;

      list.sort((a, b) => {
        const aFeasible = a.cardsNeeded <= availableWilds;
        const bFeasible = b.cardsNeeded <= availableWilds;
        
        if (aFeasible && !bFeasible) return -1;
        if (!aFeasible && bFeasible) return 1;
        return b.impact - a.impact;
      });

      return { rarity: r, list, availableWilds };
    });

    return {
      totalDecksCount,
      absoluteEvoUsage,
      absoluteHeroUsage,
      absoluteRarityUsage,
      sortedEvoCombos,
      sortedHeroes,
      rarityRecs,
      rarities
    };
  }, [
    metaDecksCache, profile, getDisplayLevel, getRarityClass, 
    magicItems.specificEvoShards, magicItems.evoShards, 
    magicItems.commonWild, magicItems.rareWild, magicItems.epicWild, magicItems.legendaryWild, magicItems.championWild
  ]);

  useEffect(() => {
    if (profile?.tag) {
      localStorage.setItem(`cr_magic_${profile.tag.replace('#', '')}`, JSON.stringify(magicItems));
    }
  }, [magicItems, profile?.tag]);

  const collectionLevel = useMemo(() => {
    if (!profile) return 0;
    if (profile.collectionLevel !== undefined) return profile.collectionLevel;
    
    let totalLevels = 0;
    let bonus = 0;
    const allOwnedCards = [...(profile.cards || []), ...(profile.supportCards || [])];
    allOwnedCards.forEach(c => {
      totalLevels += getDisplayLevel(c);
      if (isEvoUnlocked(c)) bonus += 5;
      if (isHeroVariantUnlocked(c)) bonus += 5;
    });
    return totalLevels + bonus;
  }, [profile, getDisplayLevel]); // cardMap is implicitly in getDisplayLevel

  useEffect(() => {
    const saved = localStorage.getItem('cr_tag_history');
    if (saved) setRecentTags(JSON.parse(saved));
    getAllCards(INTEGRATED_API_KEY).then(data => setAllGameCards(data.items || []));
  }, []);

  const normalizeTag = (tag: string) => {
    let t = tag.trim().toUpperCase();
    if (t && !t.startsWith('#')) t = '#' + t;
    return t;
  };

  const saveTagToHistory = (tag: string) => {
    const cleanTag = normalizeTag(tag);
    if (!cleanTag || cleanTag === '#') return;
    setRecentTags(prev => {
      const filtered = prev.filter(t => t !== cleanTag);
      const updated = [cleanTag, ...filtered].slice(0, 5);
      localStorage.setItem('cr_tag_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeTagFromHistory = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    setRecentTags(prev => {
      const updated = prev.filter(t => t !== tagToRemove);
      localStorage.setItem('cr_tag_history', JSON.stringify(updated));
      return updated;
    });
  };

  const getRarityWeight = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'champion': return 5;
      case 'hero': return 5;
      case 'legendary': return 4;
      case 'epic': return 3;
      case 'rare': return 2;
      case 'common': return 1;
      default: return 0;
    }
  };

  const handleSearch = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const rawTag = typeof e === 'string' ? e : playerTag;
    const tagToSearch = normalizeTag(rawTag);

    if (!tagToSearch || tagToSearch === '#') {
      setError('Please provide a player tag.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cardsData = await getAllCards(INTEGRATED_API_KEY);
      const newMap: Record<number, CardInfo> = {};
      cardsData.items.forEach((c: any) => {
        newMap[c.id] = { id: c.id, rarity: c.rarity, maxLevel: c.maxLevel, elixirCost: c.elixirCost || 0, name: c.name, iconUrls: c.iconUrls };
      });
      setCardMap(newMap);

      const data = await getPlayerProfile(tagToSearch, INTEGRATED_API_KEY);
      
      const cleanTag = data.tag.replace('#', '');
      const storedItemsStr = localStorage.getItem(`cr_magic_${cleanTag}`);
      if (storedItemsStr) {
        try {
          setMagicItems(JSON.parse(storedItemsStr));
        } catch(e) {
          console.error("Error parsing stored magic items", e);
        }
      } else {
        setMagicItems({
          commonWild: 0, rareWild: 0, epicWild: 0, legendaryWild: 0, championWild: 0, evoShards: 0, heroCoins: 0, specificEvoShards: {}, gems: 0
        });
      }

      setProfile(data);
      saveTagToHistory(tagToSearch);
      setPlayerTag(tagToSearch);
      setActiveTab('profile');
      setMetaDecksCache(null);
      
      // AUTO-TRIGGER META ANALYSIS IN BACKGROUND
      setTimeout(() => performMetaAnalysis(data), 100);

    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const performMetaAnalysis = async (customProfile?: PlayerProfile) => {
    const activeProfile = customProfile || profile;
    if (!activeProfile) return;
    setIsMetaLoading(true);
    setMetaProgress(0);
    
    try {
      let seasonId: string | undefined;
      let prevSeasonId: string | undefined;
      
      try {
        const seasons = await getPathOfLegendSeasons(INTEGRATED_API_KEY);
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
          const data = await fetchRankings(INTEGRATED_API_KEY, path);
          if (data && data.items && data.items.length > 0) {
            rankingsData = data;
            break;
          }
        } catch (e) { console.warn(`[Meta] Error on path: ${path}`); }
      }

      if (!rankingsData) throw new Error('Could not find any active rankings.');

      const playersToFetch = rankingsData.items.slice(0, 200);
      const decksWithRatings: { deck: Card[], towerTroopId?: number, rating: number, playerName: string, wins: number, totalMatches: number }[] = [];
      const batchSize = 20;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find(entry => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        if (!recentMatch || !recentMatch.team || !recentMatch.team[0]) return null;
        const allCards = recentMatch.team[0].cards || [];
        registerCardIcons(allCards);
        const towerTroop = allCards.find((c: any) => c.id >= 68000000);
        
        const recentDeckIds = allCards.filter((c: any) => c.id < 68000000).map((c: any) => c.id).sort().join(',');
        let wins = 0;
        let totalMatches = 0;
        
        log.forEach(entry => {
            if (entry.type === 'pathOfLegend' || entry.type === 'PvP') {
                if (entry.team && entry.team[0] && entry.team[0].cards) {
                    const entryDeckIds = entry.team[0].cards.filter((c: any) => c.id < 68000000).map((c: any) => c.id).sort().join(',');
                    if (entryDeckIds === recentDeckIds) {
                        totalMatches++;
                        const teamCrowns = entry.team[0].crowns || 0;
                        const oppCrowns = (entry.opponent && entry.opponent[0] && entry.opponent[0].crowns) ? entry.opponent[0].crowns : 0;
                        if (teamCrowns > oppCrowns) wins++;
                    }
                }
            }
        });
        
        const deck = allCards.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
          let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
          const isChamp = isChampion(c);
          
          if (index < 3 && !isChamp) {
            if (isHeroVariantUnlocked(c)) {
              forcedForm = 'hero';
            } else if (isEvoUnlocked(c)) {
              forcedForm = 'evo';
            } else if (hasHeroAvailable(c)) {
              // Aggressive fallback for Top 200 meta slots
              forcedForm = 'hero';
            } else if (hasEvoAvailable(c)) {
              // Aggressive fallback for Top 200 meta slots
              forcedForm = 'evo';
            }
          }

          return { 
            ...c, 
            _forceForm: forcedForm, 
            key: c.key, 
            form: c.form,
            activeForm: c.activeForm,
            slot: c.slot
          };
        });

        return { deck, towerTroopId: towerTroop?.id, wins, totalMatches };
      };

      for (let i = 0; i < playersToFetch.length; i += batchSize) {
        const batch = playersToFetch.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (p: any) => {
          try { 
            const pElo = Number(p.eloRating || 0);
            const pTrophy = Number(p.trophies || 0);
            const proRating = pElo > 0 ? pElo : pTrophy;
            const proName = p.name || "Unknown Pro";

            const log = await getBattleLog(p.tag, INTEGRATED_API_KEY);
            const logData = log ? extractDeckFromLog(log) : null;
            if (logData && logData.deck.length === 8) return { ...logData, rating: proRating, playerName: proName };
            
            const deck = await getPlayerDeck(p.tag, INTEGRATED_API_KEY);
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
              return filtered.length === 8 ? { deck: filtered, towerTroopId: tower?.id, rating: proRating, playerName: proName, wins: 0, totalMatches: 0 } : null;
            }
          } catch { return null; }
          return null;
        }));
        decksWithRatings.push(...results.filter((d): d is any => d !== null));
        setMetaProgress(Math.round(((i + batch.length) / playersToFetch.length) * 100));
      }
      
      const deckCounts: Record<string, { cards: Card[], towerTroopId?: number, count: number, maxRating: number, bestPlayerName: string, wins: number, totalMatches: number }> = {};
      decksWithRatings.forEach(item => {
        const key = item.deck.map((c: any) => `${c.id}-${c._forceForm}`).sort().join(',');
        const itemRating = Number(item.rating);

        if (deckCounts[key]) {
          deckCounts[key].count++;
          deckCounts[key].wins += item.wins || 0;
          deckCounts[key].totalMatches += item.totalMatches || 0;
          if (itemRating > deckCounts[key].maxRating) {
            deckCounts[key].maxRating = itemRating;
            deckCounts[key].bestPlayerName = item.playerName;
          }
          if (!deckCounts[key].towerTroopId) deckCounts[key].towerTroopId = item.towerTroopId;
        } else {
          deckCounts[key] = { cards: item.deck, towerTroopId: item.towerTroopId, count: 1, maxRating: itemRating, bestPlayerName: item.playerName, wins: item.wins || 0, totalMatches: item.totalMatches || 0 };
        }
      });

      setRawDeckCounts(deckCounts);
    } catch (err: any) { setError('Meta analysis failed.'); } finally { setIsMetaLoading(false); }
  };

  useEffect(() => {
    if (!rawDeckCounts || !profile) return;
    
    const scoredDecks = Object.values(rawDeckCounts).map((meta: any) => {
      let totalLevel = 0;
      let maxLevelCount = 0;
      let ownedCount = 0;
      let levelScoreBoost = 0;
      
      let localCommonWild = isMaxPotentialMode ? (Number(magicItems.commonWild) || 0) : 0;
      let localRareWild = isMaxPotentialMode ? (Number(magicItems.rareWild) || 0) : 0;
      let localEpicWild = isMaxPotentialMode ? (Number(magicItems.epicWild) || 0) : 0;
      let localLegendaryWild = isMaxPotentialMode ? (Number(magicItems.legendaryWild) || 0) : 0;
      let localChampionWild = isMaxPotentialMode ? (Number(magicItems.championWild) || 0) : 0;
      let localEvoShards = isMaxPotentialMode ? (Number(magicItems.evoShards) || 0) : 0;
      let localHeroCoins = isMaxPotentialMode ? (Number(magicItems.heroCoins) || 0) : 0;
      let localGems = isMaxPotentialMode ? (Number(magicItems.gems) || 0) : 0;
      
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
            
            const usedWCs = currentWildCards - remainingWildCards;
            if (usedWCs > 0) {
              wildcardsUsedByCard.push({ id: metaCard.id, count: usedWCs, rarity });
            }
            
            const usedGems = localGems - remainingGems;
            if (usedGems > 0) {
              gemsUsed += usedGems;
              gemsUsedByCard.push({ id: metaCard.id, count: usedGems });
              localGems = remainingGems;
            }

            if (rarity === 'common') { wildcardsUsed.common += usedWCs; localCommonWild = remainingWildCards; }
            else if (rarity === 'rare') { wildcardsUsed.rare += usedWCs; localRareWild = remainingWildCards; }
            else if (rarity === 'epic') { wildcardsUsed.epic += usedWCs; localEpicWild = remainingWildCards; }
            else if (rarity === 'legendary') { wildcardsUsed.legendary += usedWCs; localLegendaryWild = remainingWildCards; }
            else if (rarity === 'champion') { wildcardsUsed.champion += usedWCs; localChampionWild = remainingWildCards; }

              if (virtualLevel > displayLevel) {
                virtualUpgrades.push({ id: metaCard.id, gold: totalGold, level: virtualLevel });
              }
              
              totalLevel += virtualLevel;
              if (virtualLevel >= 16) maxLevelCount++;
              else nonMaxLevelCards.push(metaCard.name);
              
              const requiredCards = getCardsToNextLevel(rarity, virtualLevel);
              if (requiredCards > 0) {
                 const progress = Math.min(1, remainingCount / requiredCards);
                 levelScoreBoost += (progress / 128) * 100;
              }
            }
            
            if (metaIsEvo && !isEvoUnlocked(userCard)) {
              let shardsNeeded = 6;
              if (magicItems.specificEvoShards && magicItems.specificEvoShards[metaCard.name]) {
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
              if (magicItems.specificEvoShards && magicItems.specificEvoShards[metaCard.name]) {
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
        
        const tieBreaker = (Math.min(meta.count, 999) * 0.001) + (meta.maxRating * 0.0000001);
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

        const winRate = meta.totalMatches > 0 ? (meta.wins / meta.totalMatches) * 100 : 0;

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
        };
      });

      setMetaDecksCache(scoredDecks.sort((a, b) => {
        const aDisplayScore = Math.round(a.score);
        const bDisplayScore = Math.round(b.score);
        
        if (aDisplayScore !== bDisplayScore) return b.score - a.score;
        
        const aWinRate = a.winRate || 0;
        const bWinRate = b.winRate || 0;
        if (aWinRate !== bWinRate) return bWinRate - aWinRate;
        
        const aCost = a.totalCostScore || 0;
        const bCost = b.totalCostScore || 0;
        if (aCost !== bCost) return aCost - bCost;
        
        return (b.maxMedals || 0) - (a.maxMedals || 0);
      }));
  }, [rawDeckCounts, profile, magicItems, isMaxPotentialMode]);

  const sortedCards = profile?.cards ? [...profile.cards]
    .filter(c => {
      if (sortBy === 'hero-only') return isHeroVariantUnlocked(c);
      if (sortBy === 'evo-only') return isEvoUnlocked(c);
      return true;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'elixir') comp = (cardMap[b.id]?.elixirCost || 0) - (cardMap[a.id]?.elixirCost || 0);
      else if (sortBy === 'rarity') comp = getRarityWeight(getRarityClass(b)) - getRarityWeight(getRarityClass(a));
      else if (sortBy === 'evo' || sortBy === 'evo-only') comp = (isEvoUnlocked(b) ? 1 : 0) - (isEvoUnlocked(a) ? 1 : 0);
      else if (sortBy === 'hero-only') comp = (isHeroVariantUnlocked(b) ? 1 : 0) - (isHeroVariantUnlocked(a) ? 1 : 0);
      else comp = getDisplayLevel(b) - getDisplayLevel(a);
      
      if (comp === 0) comp = a.name.localeCompare(b.name);
      return sortOrder === 'desc' ? comp : -comp;
    }) : [];

  const ExpandableEvoRec = ({ featured, others }: { featured: any, others: any[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!featured) return null;
    return (
      <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
        <div className={`recommendation-card evo`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
          <div className="rec-header">BEST NEXT EVO UNLOCKS</div>
          <div className="rec-body">
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
               {featured.items.map((item: any, idx: number) => (
                  <React.Fragment key={item.name}>
                     {idx > 0 && <span style={{fontSize: '1.2rem', color: '#94a3b8'}}>+</span>}
                     <CardImage src={item.icon} cardName={item.name} />
                  </React.Fragment>
               ))}
            </div>
            <div className="rec-info">
              <div className="rec-name">{featured.items.map((i: any) => i.name).join(' + ')}</div>
              <div className="rec-reason" style={{ color: '#fbbf24', fontWeight: 600 }}>💎 {featured.totalCost} Shards</div>
            </div>
            {others.length > 0 && (
              <div className="expand-trigger">
                {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </div>
            )}
          </div>
        </div>
        <div className="expand-wrapper">
          <div className="expanded-alternatives">
            {others.map((combo: any, idx: number) => (
              <div key={idx} className="alt-row" style={{ animationDelay: `${idx * 0.1}s`, padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                   {combo.items.map((item: any, iIdx: number) => (
                      <React.Fragment key={item.name}>
                         {iIdx > 0 && <span style={{fontSize: '0.9rem', color: '#64748b'}}>+</span>}
                         <CardImage src={item.icon} cardName={item.name} />
                      </React.Fragment>
                   ))}
                </div>
                <div className="alt-info">
                  <span className="alt-name" style={{ fontSize: '0.85rem' }}>{combo.items.map((i: any) => i.name).join(' + ')}</span>
                  <span className="alt-stat" style={{ color: '#fbbf24', fontWeight: 600 }}>💎 {combo.totalCost} Shards</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ExpandableRec = ({ featured, others, type }: { featured: any, others: any[], type: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!featured) return null;
    return (
      <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
        <div className={`recommendation-card ${type}`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
          <div className="rec-header">BEST NEXT {type.toUpperCase()}</div>
          <div className="rec-body">
            <CardImage src={featured.icon} cardName={featured.name} />
            <div className="rec-info">
              <div className="rec-name">{featured.name}</div>
              <div className="rec-reason">{type === 'hero' ? 'Unlocks' : 'Completes'} {featured.count} archetypes</div>
            </div>
            {others.length > 0 && (
              <div className="expand-trigger">
                {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </div>
            )}
          </div>
        </div>
        <div className="expand-wrapper">
          <div className="expanded-alternatives">
            {others.map((item: any, idx: number) => (
              <div key={item.name} className="alt-row" style={{ animationDelay: `${idx * 0.1}s` }}>
                <CardImage src={item.icon} cardName={item.name} />
                <div className="alt-info">
                  <span className="alt-name">{item.name}</span>
                  <span className="alt-stat">{item.count} Archetypes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const UpgradeExpandable = ({ rarity, list, availableWilds }: { rarity: string, list: any[], availableWilds: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (list.length === 0) return null;
    const featured = list[0];
    const othersFeasible = list.slice(1, 10);

    const featuredFeasible = featured.cardsNeeded <= availableWilds;
    const featuredWildsUsed = featuredFeasible ? featured.cardsNeeded : availableWilds;
    const featuredRemainingNeed = featured.cardsNeeded - featuredWildsUsed;

    return (
      <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
        <div className={`upgrade-rec-card ${rarity}`} onClick={() => othersFeasible.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: othersFeasible.length > 0 ? 'pointer' : 'default' }}>
          <div className="rec-header">BEST NEXT {rarity.toUpperCase()}</div>
          <div className="rec-body-mini">
            <CardImage src={featured.icon} cardName={featured.name} />
            <div className="rec-mini-info">
              <div className="name">{featured.name}</div>
              <div className="meta-stats" style={{ color: featuredFeasible ? '#22c55e' : '#94a3b8', fontWeight: featuredFeasible ? 600 : 'normal', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                <span>{featuredFeasible ? 'Ready (✓)' : `Needs ${featuredRemainingNeed} cards`}</span>
                {featuredWildsUsed > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>( {featuredWildsUsed} 🃏 )</span>}
              </div>
            </div>
            {othersFeasible.length > 0 && (
              <div className="expand-trigger mini">
                {isExpanded ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              </div>
            )}
          </div>
        </div>
        <div className="expand-wrapper">
          <div className="expanded-alternatives mini">
            {othersFeasible.map((item: any, idx: number) => {
              const itemFeasible = item.cardsNeeded <= availableWilds;
              const itemWildsUsed = itemFeasible ? item.cardsNeeded : availableWilds;
              const itemRemainingNeed = item.cardsNeeded - itemWildsUsed;
              return (
                <div key={item.name} className="alt-row mini" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <CardImage src={item.icon} cardName={item.name} />
                  <div className="alt-info">
                    <span className="alt-name">{item.name}</span>
                    <span className="alt-stat" style={{ color: itemFeasible ? '#22c55e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <span>{itemFeasible ? 'Ready (✓)' : `Needs ${itemRemainingNeed} cards`}</span>
                      {itemWildsUsed > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>( {itemWildsUsed} 🃏 )</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="main-header-centered">
        <h1>Clash Royale Meta Finder</h1>
        <p>Analyze your collection and find the best pro decks for your levels</p>
      </header>

      <div className="search-section">
        <form onSubmit={handleSearch} className="input-group">
          <label className="input-label-premium">PLAYER TAG</label>
          <div className="modern-input-wrapper">
            <div className="input-prefix">#</div>
            <input type="text" placeholder="P802VR..." value={playerTag} onChange={(e) => setPlayerTag(e.target.value.replace('#', ''))} />
            <button type="submit" disabled={loading} className="modern-search-btn">
              {loading ? <RefreshCw size={20} className="spin" /> : <Search size={20} />}
              <span>SEARCH</span>
            </button>
          </div>
        </form>
        {recentTags.length > 0 && (
          <div className="recent-tags-container">
            <div className="recent-label"><Clock size={12} /> RECENT:</div>
            <div className="tags-list">
              {recentTags.map(tag => (
                <div key={tag} className="tag-chip" onClick={() => handleSearch(tag)}>
                  <span>{tag}</span>
                  <button className="remove-tag" onClick={(e) => removeTagFromHistory(e, tag)}><CloseIcon size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p style={{ color: '#ff4d4d', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>}
      </div>

      {loading && <div className="loading-state"><RefreshCw size={48} className="spin" color="var(--primary)" /><p>Fetching Royale Data...</p></div>}

      {profile && !loading && (
        <div className="profile-view">
          <div className="magic-items-config" style={{ marginBottom: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button 
              className="magic-toggle-btn" 
              onClick={() => setShowMagicItems(!showMagicItems)}
              style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Sparkles size={20} />
                <span>Magic Items 🃏</span>
              </div>
              {showMagicItems ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            </button>
            {showMagicItems && (
              <div className="magic-items-panel" style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wild Evo Shards</label>
                  <input 
                    type="number" min="0" max="6" 
                    value={magicItems.evoShards || ''} 
                    onChange={e => setMagicItems({...magicItems, evoShards: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>6 Shards = 1 Unlock</span>
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hero Coins</label>
                  <input 
                    type="number" min="0" 
                    value={magicItems.heroCoins || ''} 
                    onChange={e => setMagicItems({...magicItems, heroCoins: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>200 Coins = 1 Unlock</span>
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gems</label>
                  <input 
                    type="number" min="0" 
                    value={magicItems.gems || ''} 
                    onChange={e => setMagicItems({...magicItems, gems: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Used for missing cards</span>
                </div>
                
                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Rarity Wildcards</div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Common</label>
                        <input type="number" min="0" value={magicItems.commonWild || ''} onChange={e => setMagicItems({...magicItems, commonWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                      </div>
                      <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rare</label>
                        <input type="number" min="0" value={magicItems.rareWild || ''} onChange={e => setMagicItems({...magicItems, rareWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                      </div>
                      <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Epic</label>
                        <input type="number" min="0" value={magicItems.epicWild || ''} onChange={e => setMagicItems({...magicItems, epicWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                      </div>
                      <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Legendary</label>
                        <input type="number" min="0" value={magicItems.legendaryWild || ''} onChange={e => setMagicItems({...magicItems, legendaryWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                      </div>
                      <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Champion</label>
                        <input type="number" min="0" value={magicItems.championWild || ''} onChange={e => setMagicItems({...magicItems, championWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                      </div>
                   </div>
                </div>
                
                {profile && (
                  <div style={{ width: '100%', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Specific Evo Shards (Non-unlocked)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.8rem', padding: '0.5rem 0' }}>
                      {Object.values(cardMap).filter(c => hasEvoAvailable(c as unknown as Card) && !isEvoUnlocked(profile.cards.find(uc => uc.id === c.id) as Card)).map(evoCard => (
                         <div key={evoCard.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                           <img src={getCardIcon(evoCard as unknown as Card, false, true)} style={{ width: '45px', height: '54px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} alt={evoCard.name} title={evoCard.name} />
                           <input 
                             type="number" min="0" max="5" 
                             value={magicItems.specificEvoShards?.[evoCard.name] || ''}
                             onChange={e => {
                               const val = e.target.value === '' ? '' : parseInt(e.target.value);
                               const newShards = { ...(magicItems.specificEvoShards || {}) };
                               if (val === '' || val === 0) {
                                 delete newShards[evoCard.name];
                               } else {
                                 newShards[evoCard.name] = Math.min(5, Math.max(0, val));
                               }
                               setMagicItems({ ...magicItems, specificEvoShards: newShards });
                             }}
                             style={{ width: '100%', padding: '0.2rem', textAlign: 'center', borderRadius: '0.25rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.7rem' }}
                           />
                         </div>
                      ))}
                    </div>
                  </div>
                )}
                <button 
                  className="action-btn" 
                  style={{ width: '100%', marginTop: '0.5rem', background: 'var(--primary)', color: 'white' }}
                  onClick={() => {
                    if (rawDeckCounts) {
                      setRawDeckCounts({...rawDeckCounts});
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="tabs-premium-container">
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserCircle2 size={24} /><span>PROFILE</span></button>
            <button className={`tab-btn ${activeTab === 'decks' ? 'active' : ''}`} onClick={() => setActiveTab('decks')}><LayoutDashboard size={24} /><span>META DECKS</span></button>
          </div>

          {activeTab === 'profile' ? (
            <div className="profile-content">
              <div className="profile-header">
                <div><h2 className="profile-name">{profile.name}</h2><span className="profile-tag">{profile.tag}</span></div>
                <div className="profile-stats">
                  <div className="stat-badge"><Trophy color="var(--secondary)" size={24} /><div className="stat-values"><div className="stat-main">{profile.trophies}</div><div className="stat-label">TROPHIES</div></div></div>
                  <div className="stat-badge">
                    <Shield color="var(--primary)" size={24} />
                    <div className="stat-values">
                      <div className="stat-main">
                        {collectionLevel}
                      </div>
                      <div className="stat-label">COLLECTION</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="collection-header">
                <h3>Card Collection ({sortedCards.length})</h3>
                <div className="sort-controls">
                  <span className="sort-label">View:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="sort-select">
                    <option value="level">By Level</option>
                    <option value="rarity">By Rarity</option>
                    <option value="elixir">By Elixir</option>
                    <option value="evo">By Evolution</option>
                    <option value="hero-only">ONLY HEROES</option>
                    <option value="evo-only">ONLY EVOS</option>
                  </select>
                  <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="order-toggle-btn">
                    {sortOrder === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
                  </button>
                </div>
              </div>

              <div className="card-grid pure-style">
                {sortedCards.map((card) => {
                  const displayLevel = getDisplayLevel(card);
                  const heroVariant = isHeroVariantUnlocked(card);
                  const hero = isAnyHeroUnlocked(card);
                  const evo = isEvoUnlocked(card);
                  const icon = getCardIcon(card, heroVariant, evo);
                  const elixir = cardMap[card.id]?.elixirCost;

                  const rarityClass = getRarityClass(card);
                  const isRonin = card.name && card.name.toLowerCase().includes('ronin');
                  return (
                    <div key={card.id} className={`mini-card collection-item rarity-bg-${rarityClass} ${rarityClass === 'legendary' ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`}>
                      <CardImage src={icon} cardName={card.name} />
                      <div className="mini-level">{displayLevel}</div>
                      {elixir !== undefined && <div className="collection-elixir">{elixir}</div>}
                      <div className="card-badges-compact">
                        {hero && <div className="badge hero-badge-tiny"><Crown size={8} strokeWidth={3} /></div>}
                        {evo && <div className="badge evo-badge-tiny"><Sparkles size={8} strokeWidth={3} /></div>}
                      </div>
                      
                      {displayLevel < 16 && (
                        <div className="card-progress">
                          {card.count}/{getCardsToNextLevel(rarityClass, displayLevel)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isMetaLoading && (
                <div className="variant-insights-section loading">
                  <div className="insights-divider"><RefreshCw size={20} className="spin" /><span>ANALYZING META STRATEGIES...</span></div>
                  <div className="insights-loading-body">
                    <div className="loading-text">Calculating your next best moves based on Top 200 Pro Decks</div>
                    <div className="progress-track-mini"><div className="progress-bar-fill-mini" style={{ width: `${metaProgress}%` }}></div></div>
                    <div className="loading-subtext">Scanning battle logs and calculating affinity scores ({metaProgress}%)</div>
                  </div>
                </div>
              )}

              {metaDecksCache && !isMetaLoading && metaInsightsData && (
                <div className="variant-insights-section">
                  <div className="insights-divider"><TrendingUp size={20} /><span>META PROGRESSION INSIGHTS</span></div>
                  <>
                    <div className="recommendations-row">
                      <ExpandableEvoRec featured={metaInsightsData.sortedEvoCombos[0]} others={metaInsightsData.sortedEvoCombos.slice(1, 10)} />
                      <ExpandableRec featured={metaInsightsData.sortedHeroes[0]} others={metaInsightsData.sortedHeroes.slice(1, 6).sort((a, b) => b.count - a.count)} type="hero" />
                    </div>
                    <div className="stats-tables-row">
                      <div className="stats-column">
                        <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, evo: !prev.evo}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={14} /> MISSING EVO USAGE</div>
                          {insightsExpanded.evo ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </div>
                        {insightsExpanded.evo && (
                          <div className="stats-list">
                            {Object.values(metaInsightsData.absoluteEvoUsage).filter(evo => { const card = profile!.cards.find(c => c.name === evo.name); return !card || !isEvoUnlocked(card); }).sort((a, b) => b.count - a.count).map(evo => (
                              <div key={evo.name} className="stat-row-item"><CardImage src={evo.icon} cardName={evo.name} /><div className="stat-row-details"><span className="name">{evo.name}</span><span className="percent">{Math.round((evo.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill evo" style={{ width: `${(evo.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="stats-column">
                        <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, hero: !prev.hero}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Crown size={14} /> MISSING HERO USAGE</div>
                          {insightsExpanded.hero ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </div>
                        {insightsExpanded.hero && (
                          <div className="stats-list">
                            {Object.values(metaInsightsData.absoluteHeroUsage).filter(hero => { const card = profile!.cards.find(c => c.name === hero.name); return !card || !isHeroVariantUnlocked(card); }).sort((a, b) => b.count - a.count).map(hero => (
                              <div key={hero.name} className="stat-row-item"><CardImage src={hero.icon} cardName={hero.name} /><div className="stat-row-details"><span className="name">{hero.name}</span><span className="percent">{Math.round((hero.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill hero" style={{ width: `${(hero.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="insights-divider" style={{ marginTop: '3rem' }}>
                      <ArrowUp size={20} /><span>UPGRADE PRIORITY BY RARITY</span>
                    </div>
                    <div className="upgrade-rec-grid">
                      {metaInsightsData.rarityRecs.map(rec => <UpgradeExpandable key={rec.rarity} rarity={rec.rarity} list={rec.list} availableWilds={rec.availableWilds} />)}
                    </div>

                    <div className="stats-column" style={{ marginTop: '2rem' }}>
                      <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, rarity: !prev.rarity}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutDashboard size={14} /> MISSING UPGRADES USAGE DETAILS</div>
                        {insightsExpanded.rarity ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </div>
                      {insightsExpanded.rarity && (
                        <div className="stats-tables-grid-3" style={{ marginTop: '1rem' }}>
                          {metaInsightsData.rarities.map(r => {
                            const list = Object.values(metaInsightsData.absoluteRarityUsage[r]).filter(item => { const cardId = Object.keys(metaInsightsData.absoluteRarityUsage[r]).find(id => metaInsightsData.absoluteRarityUsage[r][Number(id)].name === item.name); const userCard = profile!.cards.find(c => Number(c.id) === Number(cardId)); return !userCard || getDisplayLevel(userCard) < 16; }).sort((a, b) => b.count - a.count);
                            if (list.length === 0) return null;
                            return (
                              <div key={r} className="stats-column"><div className="stats-header rarity-header" style={{ color: `var(--rarity-${r})` }}>{r.toUpperCase()} USAGE</div><div className="stats-list mini">{list.slice(0, 10).map(item => (<div key={item.name} className="stat-row-item compact"><CardImage src={item.icon} cardName={item.name} /><div className="stat-row-details"><span className="name">{item.name}</span><span className="percent">{Math.round((item.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className={`stat-row-bar-fill rarity-${r}`} style={{ width: `${(item.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>))}</div></div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <DeckBuilder 
                profile={profile} 
                apiKey={INTEGRATED_API_KEY} 
                getDisplayLevel={getDisplayLevel}
                cachedDecks={metaDecksCache}
                onAnalysisStart={performMetaAnalysis}
                isLoading={isMetaLoading}
                progress={metaProgress}
                allGameCards={allGameCards}
                isMaxPotentialMode={isMaxPotentialMode}
                setIsMaxPotentialMode={setIsMaxPotentialMode}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;




