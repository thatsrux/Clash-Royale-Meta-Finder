import React, { useState, useEffect, useCallback } from 'react';
import { Search, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, X as CloseIcon, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { getPlayerProfile, getAllCards } from './services/royaleApi';
import { CardImage } from './components/CardImage';
import type { PlayerProfile, Card, MagicItems } from './types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, hasHeroAvailable, hasEvoAvailable, isChampion, getDeckAverageElixir, getCardsToNextLevel, getVirtualLevelAndGold } from './types/clashRoyale';
import { DeckBuilder } from './components/DeckBuilder';
import { useMetaInsights } from './hooks/useMetaInsights';
import { ProfileHeader } from './components/layout/ProfileHeader';
import { MagicItemsPanel } from './components/layout/MagicItemsPanel';
import { ExpandableEvoRec, ExpandableRec, UpgradeExpandable } from './components/ui/InsightsComponents';
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

  const [allGameCards, setAllGameCards] = useState<any[]>([]);
  const [insightsExpanded, setInsightsExpanded] = useState({ evo: false, hero: false, rarity: false });
  const [showMagicItems, setShowMagicItems] = useState(false);
  const [isMaxPotentialMode, setIsMaxPotentialMode] = useState(false);
  const [isApplyingMagicItems, setIsApplyingMagicItems] = useState(false);
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


  useEffect(() => {
    if (profile?.tag) {
      localStorage.setItem(`cr_magic_${profile.tag.replace('#', '')}`, JSON.stringify(magicItems));
    }
  }, [magicItems, profile?.tag]);


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




  const {
    metaDecksCache,
    setMetaDecksCache,
    isMetaLoading,
    metaProgress,
    rawDeckCounts,
    setRawDeckCounts,
    performMetaAnalysis,
    metaInsightsData
  } = useMetaInsights(
    profile,
    INTEGRATED_API_KEY,
    magicItems,
    isMaxPotentialMode,
    getDisplayLevel,
    getRarityClass
  );
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
          <MagicItemsPanel
            showMagicItems={showMagicItems}
            setShowMagicItems={setShowMagicItems}
            magicItems={magicItems}
            setMagicItems={setMagicItems}
            isApplyingMagicItems={isApplyingMagicItems}
            onApply={() => {
              setIsApplyingMagicItems(true);
              if (rawDeckCounts) {
                // To trigger re-render if needed
              }
              setTimeout(() => {
                setIsApplyingMagicItems(false);
                setShowMagicItems(false);
              }, 800);
            }}
            profile={profile}
            cardMap={cardMap}
          />

          <div className="tabs-premium-container">
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserCircle2 size={24} /><span>PROFILE</span></button>
            <button className={`tab-btn ${activeTab === 'decks' ? 'active' : ''}`} onClick={() => setActiveTab('decks')}><LayoutDashboard size={24} /><span>META DECKS</span></button>
          </div>

          {activeTab === 'profile' ? (
            <div className="profile-content">
              <ProfileHeader profile={profile} getDisplayLevel={getDisplayLevel} />

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
                rawDeckCounts={rawDeckCounts}
                magicItems={magicItems}
                getRarityClass={getRarityClass}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;



