import React, { useState, useEffect } from 'react';
import { Search, Trophy, Shield, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, Target, X as CloseIcon } from 'lucide-react';
import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from './services/royaleApi';
import type { PlayerProfile, Card } from './types/clashRoyale';
import { isChampion, isEvo, isHeroVariant, isAnyHero } from './types/clashRoyale';
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
      const decksWithRatings: { deck: Card[], towerTroopId?: number, rating: number }[] = [];
      const batchSize = 20;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find(entry => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        if (!recentMatch || !recentMatch.team || !recentMatch.team[0]) return null;
        const allCards = recentMatch.team[0].cards || [];
        const towerTroop = allCards.find((c: any) => c.id >= 68000000);
        const deck = allCards.filter((c: any) => c.id < 68000000).slice(0, 8);
        return { deck, towerTroopId: towerTroop?.id };
      };

      for (let i = 0; i < playersToFetch.length; i += batchSize) {
        const batch = playersToFetch.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (p: any) => {
          try { 
            const log = await getBattleLog(p.tag, INTEGRATED_API_KEY);
            const logData = log ? extractDeckFromLog(log) : null;
            if (logData && logData.deck.length === 8) return { ...logData, rating: p.eloRating || p.trophies || 0 };
            const deck = await getPlayerDeck(p.tag, INTEGRATED_API_KEY);
            if (deck && Array.isArray(deck)) {
              const filtered = deck.filter((c: any) => c.id < 68000000).slice(0, 8);
              const tower = deck.find((c: any) => c.id >= 68000000);
              return filtered.length === 8 ? { deck: filtered, towerTroopId: tower?.id, rating: p.eloRating || p.trophies || 0 } : null;
            }
          } catch { return null; }
          return null;
        }));
        decksWithRatings.push(...results.filter((d): d is any => d !== null));
        setMetaProgress(Math.round(((i + batch.length) / playersToFetch.length) * 100));
      }
      
      const deckCounts: Record<string, { cards: Card[], towerTroopId?: number, count: number, maxRating: number }> = {};
      decksWithRatings.forEach(item => {
        const key = item.deck.map((c: any) => c.id).sort((a, b) => a - b).join(',');
        if (deckCounts[key]) {
          deckCounts[key].count++;
          deckCounts[key].maxRating = Math.max(deckCounts[key].maxRating, item.rating);
          if (!deckCounts[key].towerTroopId) deckCounts[key].towerTroopId = item.towerTroopId;
        } else {
          deckCounts[key] = { cards: item.deck, towerTroopId: item.towerTroopId, count: 1, maxRating: item.rating };
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
          if (userCard) {
            ownedCount++;
            const displayLevel = Number(getDisplayLevel(userCard));
            totalLevel += displayLevel;
            if (displayLevel >= 15) eliteCount++;
            if (isEvo(metaCard) && !isEvo(userCard)) {
              missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls.evolutionMedium || metaCard.iconUrls.medium });
            }
            if (isAnyHero(metaCard) && !isAnyHero(userCard)) {
              missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls.medium });
            }
          } else { 
            totalLevel += 1; 
            if (isEvo(metaCard)) missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls.evolutionMedium || metaCard.iconUrls.medium });
            if (isAnyHero(metaCard)) missingHeroes.push({ name: metaCard.name, icon: metaCard.iconUrls.medium });
          }
        });

        // SCORING: Base(Level*10) + Elite(Elite*25) - OwnershipPenalty(Missing*150) - FeaturePenalty(Missing*100) + MetaBonus(Count*2)
        const score = (totalLevel * 10) + (eliteCount * 25) - ((8 - ownedCount) * 150) - ((missingEvos.length + missingHeroes.length) * 100) + Math.min(meta.count * 2, 50);

        return {
          name: `Meta Archetype`,
          cards: meta.cards,
          towerTroopId: meta.towerTroopId,
          count: meta.count,
          maxedCount: eliteCount,
          isBestSynergy: ownedCount === 8 && missingEvos.length === 0 && missingHeroes.length === 0 && (totalLevel / 8) >= 14,
          maxMedals: meta.maxRating,
          score,
          avgLevel: totalLevel / 8,
          missingEvos,
          missingHeroes
        };
      });

      setMetaDecksCache(scoredDecks.sort((a, b) => b.score - a.score));
    } catch (err: any) { setError('Meta analysis failed.'); } finally { setIsMetaLoading(false); }
  };

  const sortedCards = profile?.cards ? [...profile.cards].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'elixir') comp = (cardMap[b.id]?.elixirCost || 0) - (cardMap[a.id]?.elixirCost || 0);
    else if (sortBy === 'rarity') comp = getRarityWeight(getRarityClass(b)) - getRarityWeight(getRarityClass(a));
    else if (sortBy === 'evo') comp = (isEvo(b) ? 1 : 0) - (isEvo(a) ? 1 : 0);
    else comp = getDisplayLevel(b) - getDisplayLevel(a);
    if (comp === 0) comp = a.name.localeCompare(b.name);
    return sortOrder === 'desc' ? comp : -comp;
  }) : [];

  const getCardSlug = (name: string) => name.toLowerCase().replace(/\./g, '').replace(/ /g, '-').replace('mini-p-e-k-k-a', 'mini-pekka').replace('p-e-k-k-a', 'pekka');

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
                  <div className="stat-badge"><Shield color="var(--primary)" size={24} /><div className="stat-values"><div className="stat-main">{profile.expLevel}</div><div className="stat-label">LEVEL</div></div></div>
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
                  const heroVariant = isHeroVariant(card);
                  const hero = isAnyHero(card);
                  const evo = isEvo(card);
                  const slug = getCardSlug(card.name);
                  const icon = heroVariant ? `https://cdn.royaleapi.com/static/img/cards-150/${slug}-hero.png` : (evo ? card.iconUrls.evolutionMedium : card.iconUrls.medium);

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
