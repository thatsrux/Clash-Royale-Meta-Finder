import React, { useState, useEffect } from 'react';
import { Search, Trophy, Shield, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, X as CloseIcon, TrendingUp } from 'lucide-react';
import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from './services/royaleApi';
import type { PlayerProfile, Card } from './types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked } from './types/clashRoyale';
import { DeckBuilder } from './components/DeckBuilder';
import './styles/App.css';

const INTEGRATED_API_KEY = import.meta.env.VITE_CLASH_API_KEY || "";

interface CardInfo {
  id: number;
  rarity: string;
  maxLevel: number;
  elixirCost: number;
}

interface MetaDeck {
  name: string;
  cards: Card[];
  score: number;
  avgLevel: number;
  count: number;
  maxedCount: number;
  isBestSynergy: boolean;
  maxMedals: number;
  bestPlayerName?: string;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
  towerTroopId?: number;
}

type SortOption = 'level' | 'elixir' | 'rarity' | 'evo';
type SortOrder = 'asc' | 'desc';

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

  const getDisplayLevel = (card: Card) => {
    const info = cardMap[card.id];
    const rarity = (info?.rarity || card.rarity || 'common').toLowerCase();
    const baseLevel = getBaseLevel(rarity);
    const level = Number(card.level) || 0;
    return level + baseLevel - 1;
  };

  const getRarityClass = (card: Card) => {
    const info = cardMap[card.id];
    return (info?.rarity || card.rarity || 'common').toLowerCase();
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
        newMap[c.id] = { id: c.id, rarity: c.rarity, maxLevel: c.maxLevel, elixirCost: c.elixirCost || 0 };
      });
      setCardMap(newMap);

      const data = await getPlayerProfile(tagToSearch, INTEGRATED_API_KEY);
      setProfile(data);
      saveTagToHistory(tagToSearch);
      setPlayerTag(tagToSearch);
      setActiveTab('profile');
      setMetaDecksCache(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const performMetaAnalysis = async () => {
    if (!profile) return;
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
      const decksWithRatings: { deck: Card[], towerTroopId?: number, rating: number, playerName: string }[] = [];
      const batchSize = 20;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find(entry => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        if (!recentMatch || !recentMatch.team || !recentMatch.team[0]) return null;
        const allCards = recentMatch.team[0].cards || [];
        const towerTroop = allCards.find((c: any) => c.id >= 68000000);
        
        // Map cards and preserve their EXPLICIT variant state from the API (RoyaleAPI 2026)
        const deck = allCards.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
          // Detect variant type directly from the API object or ICON URL
          const key = (c.key || '').toLowerCase();
          const form = (c.form || '').toLowerCase();
          const activeForm = (c.activeForm || '').toLowerCase();
          const iconUrl = (c.iconUrls?.medium || '').toLowerCase();
          
          let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
          
          // ABSOLUTE PRIORITY: Metadata markers (ONLY for first 3 slots)
          if (index < 3) {
            if (activeForm === 'hero' || key.endsWith('-hero') || form === 'hero' || iconUrl.includes('hero') || !!c.iconUrls?.heroMedium) {
              forcedForm = 'hero';
            } else if (activeForm === 'evolution' || activeForm === 'evo' || key.endsWith('-evo') || form === 'evolution' || form === 'evo' || iconUrl.includes('evo') || !!c.iconUrls?.evolutionMedium) {
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

        return { deck, towerTroopId: towerTroop?.id };
      };

      for (let i = 0; i < playersToFetch.length; i += batchSize) {
        const batch = playersToFetch.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (p: any) => {
          try { 
            console.log(`[API] Fetching Battle Log for: ${p.tag}`);
            // Explicitly extract rating as a number
            const pElo = Number(p.eloRating || 0);
            const pTrophy = Number(p.trophies || 0);
            // Prioritize medals (PoL) for pro decks, fallback to trophies
            const proRating = pElo > 0 ? pElo : pTrophy;
            const proName = p.name || "Unknown Pro";

            const log = await getBattleLog(p.tag, INTEGRATED_API_KEY);
            const logData = log ? extractDeckFromLog(log) : null;
            if (logData && logData.deck.length === 8) return { ...logData, rating: proRating, playerName: proName };
            
            // Fallback to current deck if battle log is empty
            const deck = await getPlayerDeck(p.tag, INTEGRATED_API_KEY);
            if (deck && Array.isArray(deck)) {
              const filtered = deck.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
                const iconUrl = (c.iconUrls?.medium || '').toLowerCase();
                let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
                
                if (index < 3) {
                  if (iconUrl.includes('hero') || !!c.iconUrls?.heroMedium) forcedForm = 'hero';
                  else if (iconUrl.includes('evo')) forcedForm = 'evo';
                  else if (c.heroLevel > 0) forcedForm = 'hero';
                  else if (c.evolutionLevel > 0) forcedForm = 'evo';
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
        // Group by ID + ForceForm to ensure Knight-Hero and Knight-Evo are distinct archetypes
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
        let totalLevel = 0;
        let eliteCount = 0;
        let ownedCount = 0;
        const missingEvos: { name: string; icon: string }[] = [];
        const missingHeroes: { name: string; icon: string }[] = [];
        
        meta.cards.forEach((metaCard) => {
          const userCard = profile.cards.find(c => Number(c.id) === Number(metaCard.id));
          const forcedForm = (metaCard as any)._forceForm;
          const metaIsEvo = forcedForm === 'evo';
          const metaIsHero = forcedForm === 'hero';
          
          if (userCard) {
            ownedCount++;
            const displayLevel = Number(getDisplayLevel(userCard));
            totalLevel += displayLevel;
            if (displayLevel >= 16) eliteCount++;
            
            // CHECK IF USER HAS THE SPECIFIC VERSION REQUIRED BY THE META DECK
            if (metaIsEvo && !isEvoUnlocked(userCard)) {
              missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls.evolutionMedium || metaCard.iconUrls.medium });
            }
            if (metaIsHero && !isHeroVariantUnlocked(userCard)) {
              missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls.medium });
            }
          } else { 
            totalLevel += 1; 
            if (metaIsEvo) missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls.evolutionMedium || metaCard.iconUrls.medium });
            if (metaIsHero) missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls.medium });
          }
        });

        // NEW AFFINITY SCORING (0 to 100% strict scale)
        // 1. Level Contribution: Each of the 8 cards maxes out at level 16. Total possible levels = 128.
        const levelScore = (totalLevel / 128) * 100;
        
        // 2. Penalties:
        // Missing a base card completely: -10% (plus it already contributes 0 to the level score, resulting in ~ -22.5% total penalty)
        const missingCardPenalty = (8 - ownedCount) * 10;
        // Missing a REQUIRED Evo or Hero variant: -5% penalty each.
        const missingVariantPenalty = (missingEvos.length + missingHeroes.length) * 5;
        // Non-maxed card penalty: -2% for each card not at level 16. Heavily penalizes decks with few maxed cards.
        const missingElitePenalty = (8 - eliteCount) * 2;
        
        let affinityRaw = levelScore - missingCardPenalty - missingVariantPenalty - missingElitePenalty;
        affinityRaw = Math.max(0, Math.min(100, affinityRaw));
        
        // 3. Sorting Tie-Breakers (micro-decimals so 100% decks are sorted by pro uses, then by medals)
        const tieBreaker = (Math.min(meta.count, 999) * 0.001) + (meta.maxRating * 0.0000001);
        const score = affinityRaw + tieBreaker;

        return {
          name: `Meta Archetype`,
          cards: meta.cards,
          towerTroopId: meta.towerTroopId,
          count: meta.count,
          maxedCount: eliteCount,
          isBestSynergy: ownedCount === 8 && missingEvos.length === 0 && missingHeroes.length === 0,
          maxMedals: meta.maxRating,
          bestPlayerName: meta.bestPlayerName,
          score,
          avgLevel: totalLevel / 8,
          missingEvos,
          missingHeroes
        };
      });

      (window as any).decksData = scoredDecks;
      setMetaDecksCache(scoredDecks.sort((a, b) => b.score - a.score));
    } catch (err: any) { setError('Meta analysis failed.'); } finally { setIsMetaLoading(false); }
  };

  const sortedCards = profile?.cards ? [...profile.cards].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'elixir') comp = (cardMap[b.id]?.elixirCost || 0) - (cardMap[a.id]?.elixirCost || 0);
    else if (sortBy === 'rarity') comp = getRarityWeight(getRarityClass(b)) - getRarityWeight(getRarityClass(a));
    else if (sortBy === 'evo') comp = (isEvoUnlocked(b) ? 1 : 0) - (isEvoUnlocked(a) ? 1 : 0);
    else comp = getDisplayLevel(b) - getDisplayLevel(a);
    if (comp === 0) comp = a.name.localeCompare(b.name);
    return sortOrder === 'desc' ? comp : -comp;
  }) : [];

  const getCardSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/\./g, '')
      .replace(/ /g, '-')
      .replace('mini-p-e-k-k-a', 'mini-pekka')
      .replace('p-e-k-k-a', 'pekka')
      .replace('hero-', ''); // Avoid double hero in slug
  };

  const getCardIcon = (card: Card, isHero: boolean, isEvo: boolean) => {
    const slug = getCardSlug(card.name);
    const BASE_CDN = "https://cdns3.royaleapi.com/cdn-cgi/image/w=150,h=180,format=auto/static/img/cards/v9-f09d5c9d";
    
    if (isHero) {
      return (card.iconUrls as any).heroMedium || `${BASE_CDN}/${slug}-hero.png`;
    }
    if (isEvo) {
      return card.iconUrls.evolutionMedium || `${BASE_CDN}/${slug}-evo.png`;
    }
    return card.iconUrls.medium;
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
                        {profile.collectionLevel !== undefined ? profile.collectionLevel : (() => {
                          // Fallback calculation for Collection Level (Post-May 2026 update)
                          let totalLevels = 0;
                          let bonus = 0;
                          const allOwnedCards = [...(profile.cards || []), ...(profile.supportCards || [])];
                          allOwnedCards.forEach(c => {
                            totalLevels += getDisplayLevel(c);
                            if (isEvoUnlocked(c)) bonus += 5;
                            if (isHeroVariantUnlocked(c)) bonus += 5;
                          });
                          return totalLevels + bonus;
                        })()}
                      </div>
                      <div className="stat-label">COLLECTION</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="collection-header">
                <h3>Card Collection ({profile.cards.length})</h3>
                <div className="sort-controls">
                  <span className="sort-label">Sort by:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="sort-select">
                    <option value="level">Level</option><option value="elixir">Elixir</option><option value="rarity">Rarity</option><option value="evo">Evolution</option>
                  </select>
                  <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="order-toggle-btn">
                    {sortOrder === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
                  </button>
                </div>
              </div>

              <div className="card-grid">
                {sortedCards.map((card) => {
                  const displayLevel = getDisplayLevel(card);
                  const rarity = getRarityClass(card);
                  const heroVariant = isHeroVariantUnlocked(card);
                  const hero = isAnyHeroUnlocked(card);
                  const evo = isEvoUnlocked(card);
                  const icon = getCardIcon(card, heroVariant, evo);

                  return (
                    <div key={card.id} className={`card-item ${rarity} ${heroVariant ? 'hero-variant' : ''}`}>
                      <div className="card-image-container">
                        <img src={icon} alt={card.name} className="card-image" onError={(e) => { (e.target as HTMLImageElement).src = card.iconUrls.medium; }} />
                        <div className="card-badges">
                          {hero && <div className="badge hero-badge" title="Hero / Champion"><Crown size={12} strokeWidth={3} /></div>}
                          {evo && <div className="badge evo-badge" title="Evolution"><Sparkles size={12} strokeWidth={3} /></div>}
                        </div>
                      </div>
                      <div className="card-level-badge">Level {displayLevel}</div>
                      <div className="card-info">
                        <div className="card-name">{card.name}</div>
                        {cardMap[card.id]?.elixirCost !== undefined && <div className="elixir-badge">{cardMap[card.id].elixirCost}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {metaDecksCache && (
                <div className="variant-insights-section">
                  <div className="insights-divider">
                    <TrendingUp size={20} />
                    <span>META PROGRESSION INSIGHTS</span>
                  </div>

                  {(() => {
                    // CALCULATE RECOMMENDATIONS & STATS
                    const missingEvoCounts: Record<number, { name: string, icon: string, count: number, deckPotential: number }> = {};
                    const missingHeroCounts: Record<number, { name: string, icon: string, count: number, deckPotential: number }> = {};
                    let totalDecks = metaDecksCache.length;

                    metaDecksCache.forEach(deck => {
                      deck.missingEvos.forEach(evo => {
                        const card = deck.cards.find(c => c.name === evo.name);
                        if (!card) return;
                        if (!missingEvoCounts[card.id]) missingEvoCounts[card.id] = { name: evo.name, icon: evo.icon, count: 0, deckPotential: 0 };
                        missingEvoCounts[card.id].count++;
                        // If deck is high score (>70%) but missing this variant, increase priority
                        if (deck.score > 70) missingEvoCounts[card.id].deckPotential += deck.score;
                      });
                      deck.missingHeroes.forEach(hero => {
                        const card = deck.cards.find(c => c.name === hero.name);
                        if (!card) return;
                        if (!missingHeroCounts[card.id]) missingHeroCounts[card.id] = { name: hero.name, icon: hero.icon, count: 0, deckPotential: 0 };
                        missingHeroCounts[card.id].count++;
                        if (deck.score > 70) missingHeroCounts[card.id].deckPotential += deck.score;
                      });
                    });

                    const recommendationEvos = Object.values(missingEvoCounts).sort((a, b) => (b.deckPotential * 1.5 + b.count) - (a.deckPotential * 1.5 + a.count));
                    const recommendationHeroes = Object.values(missingHeroCounts).sort((a, b) => (b.deckPotential * 1.5 + b.count) - (a.deckPotential * 1.5 + a.count));

                    const bestEvo = recommendationEvos[0];
                    const bestHero = recommendationHeroes[0];

                    // STRICT SORT BY META USAGE % (Descending) for the tables
                    const sortedEvosByUsage = Object.values(missingEvoCounts).sort((a, b) => b.count - a.count);
                    const sortedHeroesByUsage = Object.values(missingHeroCounts).sort((a, b) => b.count - a.count);

                    return (
                      <>
                        <div className="recommendations-row">
                          {bestEvo && (
                            <div className="recommendation-card evo">
                              <div className="rec-header">BEST NEXT EVO</div>
                              <div className="rec-body">
                                <img src={bestEvo.icon} alt={bestEvo.name} />
                                <div className="rec-info">
                                  <div className="rec-name">{bestEvo.name}</div>
                                  <div className="rec-reason">Boosts {Math.round(bestEvo.count)} meta decks</div>
                                </div>
                              </div>
                            </div>
                          )}
                          {bestHero && (
                            <div className="recommendation-card hero">
                              <div className="rec-header">BEST NEXT HERO</div>
                              <div className="rec-body">
                                <img src={bestHero.icon} alt={bestHero.name} />
                                <div className="rec-info">
                                  <div className="rec-name">{bestHero.name}</div>
                                  <div className="rec-reason">Unlocks {Math.round(bestHero.count)} pro archetypes</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="stats-tables-row">
                          <div className="stats-column">
                            <div className="stats-header"><Sparkles size={14} /> EVO META USAGE</div>
                            <div className="stats-list">
                              {sortedEvosByUsage.map(evo => (
                                <div key={evo.name} className="stat-row-item">
                                  <img src={evo.icon} alt={evo.name} />
                                  <div className="stat-row-details">
                                    <span className="name">{evo.name}</span>
                                    <span className="percent">{Math.round((evo.count / totalDecks) * 100)}% Usage</span>
                                  </div>
                                  <div className="stat-row-bar-bg"><div className="stat-row-bar-fill evo" style={{ width: `${(evo.count / totalDecks) * 100}%` }}></div></div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="stats-column">
                            <div className="stats-header"><Crown size={14} /> HERO META USAGE</div>
                            <div className="stats-list">
                              {sortedHeroesByUsage.map(hero => (
                                <div key={hero.name} className="stat-row-item">
                                  <img src={hero.icon} alt={hero.name} />
                                  <div className="stat-row-details">
                                    <span className="name">{hero.name}</span>
                                    <span className="percent">{Math.round((hero.count / totalDecks) * 100)}% Usage</span>
                                  </div>
                                  <div className="stat-row-bar-bg"><div className="stat-row-bar-fill hero" style={{ width: `${(hero.count / totalDecks) * 100}%` }}></div></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <DeckBuilder 
              profile={profile} 
              apiKey={INTEGRATED_API_KEY} 
              getDisplayLevel={getDisplayLevel}
              cachedDecks={metaDecksCache}
              onAnalysisStart={performMetaAnalysis}
              isLoading={isMetaLoading}
              progress={metaProgress}
              allGameCards={allGameCards}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
