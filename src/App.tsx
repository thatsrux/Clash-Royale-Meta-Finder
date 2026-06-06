import React, { useState, useEffect } from 'react';
import { Search, Trophy, Shield, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, X as CloseIcon, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from './services/royaleApi';
import type { PlayerProfile, Card } from './types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, hasHeroAvailable, hasEvoAvailable } from './types/clashRoyale';
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
      const decksWithRatings: { deck: Card[], towerTroopId?: number, rating: number, playerName: string }[] = [];
      const batchSize = 20;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find(entry => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        if (!recentMatch || !recentMatch.team || !recentMatch.team[0]) return null;
        const allCards = recentMatch.team[0].cards || [];
        const towerTroop = allCards.find((c: any) => c.id >= 68000000);
        
        const deck = allCards.filter((c: any) => c.id < 68000000).slice(0, 8).map((c: any, index: number) => {
          let forcedForm: 'hero' | 'evo' | 'normal' = 'normal';
          
          if (index < 3) {
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
        let totalLevel = 0;
        let eliteCount = 0;
        let ownedCount = 0;
        const missingEvos: { name: string; icon: string }[] = [];
        const missingHeroes: { name: string; icon: string }[] = [];
        
        meta.cards.forEach((metaCard) => {
          const userCard = activeProfile.cards.find(c => Number(c.id) === Number(metaCard.id));
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
            totalLevel += 1; 
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

      setMetaDecksCache(scoredDecks.sort((a, b) => b.score - a.score));
    } catch (err: any) { setError('Meta analysis failed.'); } finally { setIsMetaLoading(false); }
  };

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

  const ExpandableRec = ({ featured, others, type }: { featured: any, others: any[], type: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!featured) return null;
    return (
      <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
        <div className={`recommendation-card ${type}`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
          <div className="rec-header">BEST NEXT {type.toUpperCase()}</div>
          <div className="rec-body">
            <img src={featured.icon} alt={featured.name} />
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
                <img src={item.icon} alt={item.name} />
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

  const UpgradeExpandable = ({ rarity, list }: { rarity: string, list: any[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (list.length === 0) return null;
    const featured = list[0];
    const others = list.slice(1, 6).sort((a, b) => b.count - a.count);

    return (
      <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
        <div className={`upgrade-rec-card ${rarity}`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
          <div className="rec-header">BEST NEXT {rarity.toUpperCase()}</div>
          <div className="rec-body-mini">
            <img src={featured.icon} alt={featured.name} />
            <div className="rec-mini-info">
              <div className="name">{featured.name}</div>
              <div className="meta-stats">Boosts {featured.count} archetypes</div>
            </div>
            {others.length > 0 && (
              <div className="expand-trigger mini">
                {isExpanded ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              </div>
            )}
          </div>
        </div>
        <div className="expand-wrapper">
          <div className="expanded-alternatives mini">
            {others.map((item: any, idx: number) => (
              <div key={item.name} className="alt-row mini" style={{ animationDelay: `${idx * 0.08}s` }}>
                <img src={item.icon} alt={item.name} />
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
                          let totalLevels = 0;
                          let bonus = 0;
                          const allOwnedCards = [...(profile!.cards || []), ...(profile!.supportCards || [])];
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

                  return (
                    <div key={card.id} className={`mini-card collection-item rarity-bg-${getRarityClass(card)}`}>
                      <img src={icon} alt={card.name} onError={(e) => { (e.target as HTMLImageElement).src = card.iconUrls.medium; }} />
                      <div className="mini-level">{displayLevel}</div>
                      {elixir !== undefined && <div className="collection-elixir">{elixir}</div>}
                      <div className="card-badges-compact">
                        {hero && <div className="badge hero-badge-tiny"><Crown size={8} strokeWidth={3} /></div>}
                        {evo && <div className="badge evo-badge-tiny"><Sparkles size={8} strokeWidth={3} /></div>}
                      </div>
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

              {metaDecksCache && !isMetaLoading && (
                <div className="variant-insights-section">
                  <div className="insights-divider"><TrendingUp size={20} /><span>META PROGRESSION INSIGHTS</span></div>
                  {(() => {
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

                    const missingEvoImpact: Record<number, { name: string, icon: string, impact: number, count: number }> = {};
                    const missingHeroImpact: Record<number, { name: string, icon: string, impact: number, count: number }> = {};
                    const upgradeRarityImpact: Record<number, { name: string, icon: string, impact: number, count: number, rarity: string, id: number }> = {};

                    allMetaDecks.forEach(deck => {
                      const weight = Math.pow(deck.score / 10, 3);
                      deck.missingEvos.forEach(evo => {
                        const card = deck.cards.find(c => c.name === evo.name);
                        if (!card) return;
                        if (!missingEvoImpact[card.id]) missingEvoImpact[card.id] = { name: evo.name, icon: evo.icon, impact: 0, count: 0 };
                        missingEvoImpact[card.id].impact += weight;
                        missingEvoImpact[card.id].count++;
                      });
                      deck.missingHeroes.forEach(hero => {
                        const card = deck.cards.find(c => c.name === hero.name);
                        if (!card) return;
                        if (!missingHeroImpact[card.id]) missingHeroImpact[card.id] = { name: hero.name, icon: hero.icon, impact: 0, count: 0 };
                        missingHeroImpact[card.id].impact += weight;
                        missingHeroImpact[card.id].count++;
                      });
                      deck.cards.forEach(metaCard => {
                        const userCard = profile!.cards.find(c => Number(c.id) === Number(metaCard.id));
                        const displayLevel = userCard ? getDisplayLevel(userCard) : 0;
                        if (displayLevel > 0 && displayLevel < 16) {
                          const r = getRarityClass(metaCard);
                          const gain = (16 - displayLevel) / 1.28 + 2;
                          if (!upgradeRarityImpact[metaCard.id]) upgradeRarityImpact[metaCard.id] = { id: metaCard.id, name: metaCard.name, icon: metaCard.iconUrls.medium, impact: 0, count: 0, rarity: r };
                          upgradeRarityImpact[metaCard.id].impact += (gain * weight);
                          upgradeRarityImpact[metaCard.id].count++;
                        }
                      });
                    });

                    const sortedEvos = Object.values(missingEvoImpact).sort((a, b) => b.impact - a.impact);
                    const sortedHeroes = Object.values(missingHeroImpact).sort((a, b) => b.impact - a.impact);
                    const rarities = ['common', 'rare', 'epic', 'legendary', 'champion'];
                    const rarityRecs = rarities.map(r => ({ rarity: r, list: Object.values(upgradeRarityImpact).filter(c => c.rarity === r).sort((a, b) => b.impact - a.impact) }));

                    return (
                      <>
                        <div className="recommendations-row">
                          <ExpandableRec featured={sortedEvos[0]} others={sortedEvos.slice(1, 6).sort((a, b) => b.count - a.count)} type="evo" />
                          <ExpandableRec featured={sortedHeroes[0]} others={sortedHeroes.slice(1, 6).sort((a, b) => b.count - a.count)} type="hero" />
                        </div>
                        <div className="stats-tables-row">
                          <div className="stats-column">
                            <div className="stats-header"><Sparkles size={14} /> EVO META USAGE</div>
                            <div className="stats-list">
                              {Object.values(absoluteEvoUsage).filter(evo => { const card = profile!.cards.find(c => c.name === evo.name); return !card || !isEvoUnlocked(card); }).sort((a, b) => b.count - a.count).map(evo => (
                                <div key={evo.name} className="stat-row-item"><img src={evo.icon} alt={evo.name} /><div className="stat-row-details"><span className="name">{evo.name}</span><span className="percent">{Math.round((evo.count / totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill evo" style={{ width: `${(evo.count / totalDecksCount) * 100}%` }}></div></div></div>
                              ))}
                            </div>
                          </div>
                          <div className="stats-column">
                            <div className="stats-header"><Crown size={14} /> HERO META USAGE</div>
                            <div className="stats-list">
                              {Object.values(absoluteHeroUsage).filter(hero => { const card = profile!.cards.find(c => c.name === hero.name); return !card || !isHeroVariantUnlocked(card); }).sort((a, b) => b.count - a.count).map(hero => (
                                <div key={hero.name} className="stat-row-item"><img src={hero.icon} alt={hero.name} /><div className="stat-row-details"><span className="name">{hero.name}</span><span className="percent">{Math.round((hero.count / totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill hero" style={{ width: `${(hero.count / totalDecksCount) * 100}%` }}></div></div></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="insights-divider" style={{ marginTop: '3rem' }}><ArrowUp size={20} /><span>UPGRADE PRIORITY BY RARITY</span></div>
                        <div className="upgrade-rec-grid">
                          {rarityRecs.map(rec => <UpgradeExpandable key={rec.rarity} rarity={rec.rarity} list={rec.list} />)}
                        </div>
                        <div className="stats-tables-grid-3">
                          {rarities.map(r => {
                            const list = Object.values(absoluteRarityUsage[r]).filter(item => { const cardId = Object.keys(absoluteRarityUsage[r]).find(id => absoluteRarityUsage[r][Number(id)].name === item.name); const userCard = profile!.cards.find(c => Number(c.id) === Number(cardId)); return !userCard || getDisplayLevel(userCard) < 16; }).sort((a, b) => b.count - a.count);
                            if (list.length === 0) return null;
                            return (
                              <div key={r} className="stats-column"><div className="stats-header rarity-header" style={{ color: `var(--rarity-${r})` }}>{r.toUpperCase()} USAGE</div><div className="stats-list mini">{list.slice(0, 10).map(item => (<div key={item.name} className="stat-row-item compact"><img src={item.icon} alt={item.name} /><div className="stat-row-details"><span className="name">{item.name}</span><span className="percent">{Math.round((item.count / totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className={`stat-row-bar-fill rarity-${r}`} style={{ width: `${(item.count / totalDecksCount) * 100}%` }}></div></div></div>))}</div></div>
                            );
                          })}
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
