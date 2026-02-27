import React, { useState, useEffect } from 'react';
import { Search, Trophy, Shield, Layout, User, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, Target, X as CloseIcon } from 'lucide-react';
import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getSeasons, getPlayerDeck } from './services/royaleApi';
import type { PlayerProfile, Card } from './types/clashRoyale';
import { DeckBuilder } from './components/DeckBuilder';
import './styles/App.css';

// Use environment variable for the API Key
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

  // CACHE FOR META DECKS
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
      case 'champion': 
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
      case 'champion': 
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
    const rarity = (info?.rarity || card.rarity || 'common').toLowerCase();
    // For Giant and Mini Pekka, we can override rarity class if needed, but keeping original for border color
    return rarity;
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
      try {
        const seasons = await getSeasons(INTEGRATED_API_KEY);
        if (seasons.items && seasons.items.length > 0) {
          seasonId = seasons.items[seasons.items.length - 1].id;
        }
      } catch (e) { console.warn('[Meta] Seasons lookup failed'); }

      const pathsToTry = [
        '/locations/global/pathoflegend/players?limit=200',
        seasonId ? `/locations/global/pathoflegend/seasons/${seasonId}/rankings/players?limit=200` : null,
        '/locations/global/rankings/pathoflegend?limit=100',
        '/locations/global/rankings/players?limit=100'
      ].filter(Boolean) as string[];
      
      let rankingsData: any = null;
      for (const path of pathsToTry) {
        try {
          rankingsData = await fetchRankings(INTEGRATED_API_KEY, path);
          if (rankingsData && rankingsData.items && rankingsData.items.length > 0) break;
        } catch (e) {}
      }

      if (!rankingsData || !rankingsData.items) throw new Error('Failed to sync leaderboard');

      const items = rankingsData.items;
      const sampleSize = 200;
      const playersToFetch = items.slice(0, sampleSize);
      const decksWithRatings: { deck: Card[], rating: number }[] = [];
      const batchSize = 8;
      
      const extractDeckFromLog = (log: any[]) => {
        const recentMatch = log.find(entry => entry.type === 'pathOfLegend' || entry.type === 'PvP');
        return (recentMatch && recentMatch.team && recentMatch.team[0]) ? recentMatch.team[0].cards : null;
      };

      for (let i = 0; i < playersToFetch.length; i += batchSize) {
        const batch = playersToFetch.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (p: any) => {
            try { 
              const log = await getBattleLog(p.tag, INTEGRATED_API_KEY);
              const deckFromLog = log ? extractDeckFromLog(log) : null;
              const deck = deckFromLog || await getPlayerDeck(p.tag, INTEGRATED_API_KEY);
              return deck ? { deck, rating: p.eloRating || p.trophies || 0 } : null;
            } catch { return null; }
          })
        );
        decksWithRatings.push(...batchResults.filter((d): d is { deck: Card[], rating: number } => d !== null));
        setMetaProgress(Math.round(((i + batch.length) / playersToFetch.length) * 100));
      }
      
      const deckCounts: Record<string, { cards: Card[], count: number, maxRating: number }> = {};
      decksWithRatings.forEach(item => {
        const key = item.deck.map((c: any) => c.id).sort((a, b) => a - b).join(',');
        if (deckCounts[key]) {
          deckCounts[key].count++;
          deckCounts[key].maxRating = Math.max(deckCounts[key].maxRating, item.rating);
        } else {
          deckCounts[key] = { cards: item.deck, count: 1, maxRating: item.rating };
        }
      });

      const scoredDecks = Object.values(deckCounts).map(meta => {
        let totalLevel = 0;
        let eliteCount = 0;
        let allAtLeast14 = true;
        const missingEvos: { name: string; icon: string }[] = [];
        
        meta.cards.forEach((metaCard, index) => {
          const userCard = profile.cards.find(c => Number(c.id) === Number(metaCard.id));
          if (userCard) {
            const displayLevel = Number(getDisplayLevel(userCard));
            totalLevel += displayLevel;
            if (displayLevel >= 15) eliteCount++;
            if (displayLevel < 14) allAtLeast14 = false;
            if (index < 2 && metaCard.iconUrls.evolutionMedium && !(userCard.evolutionLevel && userCard.evolutionLevel > 0)) {
              missingEvos.push({ name: metaCard.name, icon: metaCard.iconUrls.evolutionMedium || metaCard.iconUrls.medium });
            }
          } else { totalLevel += 1; allAtLeast14 = false; }
        });

        const avgLevel = totalLevel / 8;
        const affinityScore = (eliteCount * 100.0) + avgLevel - (missingEvos.length * 10.0) + (meta.count * 0.1);

        return {
          name: `Meta Archetype`,
          cards: meta.cards,
          count: meta.count,
          maxedCount: eliteCount,
          isBestSynergy: allAtLeast14,
          maxMedals: meta.maxRating,
          score: affinityScore,
          avgLevel: avgLevel,
          missingEvos
        };
      });

      setMetaDecksCache(scoredDecks.sort((a, b) => b.score - a.score));
    } catch (err: any) {
      setError('Meta analysis sync failed.');
    } finally {
      setIsMetaLoading(false);
    }
  };

  const sortedCards = profile?.cards ? [...profile.cards].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'elixir': comparison = (cardMap[b.id]?.elixirCost || 0) - (cardMap[a.id]?.elixirCost || 0); break;
      case 'rarity': 
        comparison = getRarityWeight(getRarityClass(b)) - getRarityWeight(getRarityClass(a)); 
        break;
      case 'evo':
        const isEvoA = a.evolutionLevel !== undefined && a.evolutionLevel > 0;
        const isEvoB = b.evolutionLevel !== undefined && b.evolutionLevel > 0;
        comparison = isEvoA === isEvoB ? getDisplayLevel(b) - getDisplayLevel(a) : (isEvoB ? 1 : -1);
        break;
      case 'level': default: comparison = getDisplayLevel(b) - getDisplayLevel(a); break;
    }
    if (comparison === 0) comparison = a.name.localeCompare(b.name);
    return sortOrder === 'desc' ? comparison : -comparison;
  }) : [];

  return (
    <div className="app-container">
      <header className="main-header-centered">
        <h1>Clash Royale Meta Finder</h1>
        <p>Load your profile to check your collection and find meta decks</p>
      </header>

      <div className="search-section">
        <form onSubmit={handleSearch} className="input-group">
          <label className="input-label-premium">PLAYER TAG</label>
          <div className="modern-input-wrapper">
            <div className="input-prefix">#</div>
            <input 
              type="text" 
              placeholder="P802VR..." 
              value={playerTag} 
              onChange={(e) => setPlayerTag(e.target.value.replace('#', ''))} 
            />
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
        {error && <p style={{ color: '#ff4d4d', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>{error}</p>}
      </div>

      {!profile && !loading && (
        <div className="hero-landing">
          <div className="hero-content">
            <h2>Master the Meta with <span>Your</span> Cards.</h2>
            <p>Enter your Player Tag to analyze your collection, track your progress, and discover pro-level decks you can actually play.</p>
            <div className="hero-features-grid">
              <div className="h-feat"><div className="h-icon"><Trophy size={20} /></div><span>Pro Meta Sync</span></div>
              <div className="h-feat"><div className="h-icon"><Target size={20} /></div><span>Affinity Scoring</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card c1">👑</div>
            <div className="floating-card c2">⚔️</div>
            <div className="floating-card c3">💎</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <RefreshCw size={48} className="spin" color="var(--primary)" />
          <p>Fetching Royale Data...</p>
        </div>
      )}

      {profile && !loading && (
        <div className="profile-view">
          <div className="tabs">
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}><User size={18} /> Profile</button>
            <button className={activeTab === 'decks' ? 'active' : ''} onClick={() => setActiveTab('decks')}><Layout size={18} /> Meta Decks</button>
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
                    
                    // Logic for Hero / Champion Badge
                    const isActualChampion = getRarityClass(card) === 'champion' || getRarityClass(card) === 'hero';
                    const isSpecificHero = card.name.toLowerCase().includes('mini p.e.k.k.a') || card.name.toLowerCase() === 'giant';
                    const isHero = isActualChampion || isSpecificHero;

                    // Only show Evo badge if it's NOT a specific hero we want to mark as gold
                    const isEvo = card.evolutionLevel !== undefined && card.evolutionLevel > 0 && !isSpecificHero;
                    
                    return (
                      <div key={card.id} className={`card-item ${getRarityClass(card)}`}>
                        <div className="card-image-container">
                          <img 
                            src={isEvo && card.iconUrls.evolutionMedium ? card.iconUrls.evolutionMedium : card.iconUrls.medium} 
                            alt={card.name} 
                            className="card-image" 
                          />
                          <div className="card-badges">
                            {isEvo && (
                              <div className="badge evo-badge" title="Evolution Unlocked">
                                <Sparkles size={10} />
                              </div>
                            )}
                            {isHero && (
                              <div className="badge hero-badge" title="Hero / Champion Card">
                                <Crown size={10} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card-level-badge">Level {displayLevel}</div>
                        <div className="card-info">
                          <div className="card-name">{card.name}</div>
                          {cardMap[card.id]?.elixirCost !== undefined && (
                            <div className="elixir-badge">{cardMap[card.id].elixirCost}</div>
                          )}
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
