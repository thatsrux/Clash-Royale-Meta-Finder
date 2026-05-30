import React, { useState, useMemo } from 'react';
import type { PlayerProfile, Card } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isChampion, hasEvoAvailable, hasHeroAvailable } from '../types/clashRoyale';
import { TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Trophy, ArrowUp, Filter, X, Sparkles, Crown, Medal, Target, Activity, Copy, Check } from 'lucide-react';

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
  allGameCards: any[];
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  profile, 
  getDisplayLevel, 
  cachedDecks, 
  onAnalysisStart, 
  isLoading, 
  progress,
  allGameCards 
}) => {
  const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const THEORETICAL_MAX_SCORE = 1530;
  
  const getCardSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/\./g, '')
      .replace(/ /g, '-')
      .replace('mini-p-e-k-k-a', 'mini-pekka')
      .replace('p-e-k-k-a', 'pekka')
      .replace('hero-', ''); // Avoid double hero in slug
  };

  const getCardIcon = (card: any, isHero: boolean, isEvo: boolean) => {
    const slug = getCardSlug(card.name || '');
    if (isHero) {
      // Prioritize explicit heroMedium if provided by API, otherwise fallback to CDN pattern
      return (card.iconUrls as any)?.heroMedium || `https://cdn.royaleapi.com/static/img/cards-150/${slug}-hero.png`;
    }
    if (isEvo) {
      return card.iconUrls?.evolutionMedium || `https://cdn.royaleapi.com/static/img/cards-150/${slug}-evo.png`;
    }
    return card.iconUrls?.medium || '';
  };

  const toggleFilter = (item: FilterItem) => {
    setSelectedFilters(prev => {
      const exists = prev.find(f => f.id === item.id && f.isEvoFilter === item.isEvoFilter);
      if (exists) {
        return prev.filter(f => !(f.id === item.id && f.isEvoFilter === item.isEvoFilter));
      }
      return [...prev, item];
    });
  };

  const handleCopyDeck = (deck: MetaDeck, index: number) => {
    const { cards, towerTroopId } = deck;
    
    // 1. Separate cards by type to reorder them correctly for the slots logic
    const evoCards = cards.filter(c => isEvoUnlocked(c));
    const otherCards = cards.filter(c => !isEvoUnlocked(c));
    
    // 2. The Link.ClashRoyale format (2024+) expects the evolved cards FIRST
    // The number in &slots=N tells the game that the FIRST N cards in the &deck string are evolved.
    const orderedDeck = [...evoCards, ...otherCards].slice(0, 8);
    const finalIds = orderedDeck.map(c => c.id).join(';');
    const evoCount = Math.min(evoCards.length, 2);

    // 3. Construct the official 2024 URL structure
    // Format: ...?deck=ID1;ID2...&tower=TOWER_ID&slots=EVO_COUNT
    let link = `https://link.clashroyale.com/deck/en?deck=${finalIds}&slots=${evoCount}`;
    
    // Tower Troop uses the 'tower' parameter in the modern format (RoyaleAPI/Official compatible)
    // Note: 'tt' is also used but 'tower' is more standard in latest client deep links.
    if (towerTroopId) link += `&tower=${towerTroopId}`;
    
    navigator.clipboard.writeText(link).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });

    window.location.href = link;
  };

  const { filteredRecommendations } = useMemo(() => {
    if (!cachedDecks || cachedDecks.length === 0) return { filteredRecommendations: [] };
    
    const filtered = cachedDecks
      .filter(deck => 
        selectedFilters.every(filter => {
          if (filter.isEvoFilter) {
            return deck.cards.some(c => Number(c.id) === filter.id && isEvoUnlocked(c));
          } else {
            return deck.cards.some(c => Number(c.id) === filter.id);
          }
        })
      )
      .slice(0, 50);

    return { filteredRecommendations: filtered };
  }, [cachedDecks, selectedFilters]);

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
        const slug = getCardSlug(c.name);
        const iconUrl = c.iconUrls?.medium || '';
        const rarity = (c.rarity || 'common').toLowerCase();
        
        // DYNAMIC DETECTION (No hardcoded lists)
        const isEvoBase = hasEvoAvailable(c);
        const isChampionBase = rarity === 'champion';
        const isHeroBase = hasHeroAvailable(c);

        if (isEvoBase) {
          const evoIcon = c.iconUrls?.evolutionMedium || `https://cdn.royaleapi.com/static/img/cards-150/${slug}-evo.png`;
          evos.push({ id: c.id, icon: evoIcon, name: c.name, isEvoFilter: true, rarity });
        }
        
        if (isChampionBase) {
          champions.push({ 
            id: c.id, 
            icon: iconUrl, 
            name: c.name, 
            isEvoFilter: false, 
            rarity: 'champion' 
          });
        }

        if (isHeroBase && !isChampionBase) {
          const heroIcon = (c.iconUrls as any)?.heroMedium || `https://cdn.royaleapi.com/static/img/cards-150/${slug}-hero.png`;
          heroes.push({ 
            id: c.id, 
            icon: heroIcon, 
            name: c.name.toLowerCase().includes('hero') ? c.name : `${c.name} (Hero)`, 
            isEvoFilter: false, 
            rarity: 'hero' 
          });
        }
        
        normal.push({ id: c.id, icon: iconUrl, name: c.name, isEvoFilter: false, rarity });
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

  const FilterGrid = ({ items, title, icon: Icon, color, type }: { items: FilterItem[], title: string, icon: any, color: string, type?: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="filter-section-group">
        <div className="section-title" style={{ color }}>
          <Icon size={14} /> {title} ({items.length})
        </div>
        <div className="filter-grid">
          {items.map((c, idx) => {
            const isSelected = selectedFilters.some(f => f.id === c.id && f.isEvoFilter === c.isEvoFilter);
            
            return (
              <div 
                key={`${c.id}-${c.isEvoFilter}-${idx}`} 
                className={`filter-grid-item ${isSelected ? 'selected' : ''} ${c.isEvoFilter ? 'evo' : ''}`}
                onClick={() => toggleFilter(c)}
                title={c.isEvoFilter ? `Evolved ${c.name}` : c.name}
              >
                <img src={c.icon} alt={c.name} onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.royaleapi.com/static/img/cards-150/unknown.png'; }} />
                {c.isEvoFilter && <div className="evo-mini-icon"></div>}
                {type === 'hero' && <div className="hero-mini-icon"></div>}
                {type === 'champion' && <div className="champion-mini-icon"></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="deck-builder">
      <div className="builder-header-simple">
        <button 
          onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
          className={`explore-meta-btn ${isFilterExpanded ? 'active' : ''}`}
        >
          <Filter size={18} />
          <span>FILTER CARDS</span>
          {selectedFilters.length > 0 && <span className="filter-count-badge">{selectedFilters.length}</span>}
        </button>
      </div>

      <div className={`filter-animation-wrapper ${isFilterExpanded ? 'expanded' : ''}`}>
        {Array.isArray(allGameCards) && allGameCards.length > 0 && (
          <div className="card-filter-grid-section">
            <div className="filter-header-minimal">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                <Sparkles size={14} /> ACTIVE FILTERS
              </div>
              {selectedFilters.length > 0 && (
                <button onClick={() => setSelectedFilters([])} className="clear-btn">
                  <X size={12} /> Reset
                </button>
              )}
            </div>
            
            <div className="filter-sections-container">
              <FilterGrid items={sections.evos} title="EVOLUTIONS" icon={Sparkles} color="var(--evo-purple)" />
              <FilterGrid items={sections.champions} title="CHAMPIONS" icon={Crown} color="var(--champion-gold)" type="champion" />
              <FilterGrid items={sections.heroes} title="HEROES" icon={Crown} color="var(--hero-yellow)" type="hero" />
              <FilterGrid items={sections.normal} title="ALL CARDS" icon={Filter} color="var(--text-muted)" />
            </div>
          </div>
        )}
      </div>

      {!cachedDecks && !isLoading && (
        <div className="start-analysis-container-centered">
          <button onClick={onAnalysisStart} className="big-analysis-btn-premium">
            <TrendingUp size={24} />
            <span>FIND META DECKS</span>
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="analysis-progress-container">
          <div className="analysis-status">
            <div className="status-main">
              <RefreshCw size={14} className="spin" />
              <span>Analyzing Top 200 Pro Meta...</span>
            </div>
            <span className="status-percent">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              <div className="progress-glow"></div>
              <div className="progress-shimmer"></div>
            </div>
          </div>
          <p className="analysis-hint">Scanning battle logs and calculating card synergies...</p>
        </div>
      )}

      {cachedDecks && !isLoading ? (
        <div className="recommendations-list">
          {filteredRecommendations.map((deck, idx) => {
            const affinityPercent = Math.min(100, Math.max(0, Math.floor((deck.score / THEORETICAL_MAX_SCORE) * 100)));
            const affinityColor = affinityPercent > 80 ? '#4ade80' : (affinityPercent > 50 ? '#fbbf24' : '#ef4444');

            return (
              <div key={idx} className="deck-suggestion">
                <div className="deck-header">
                  <div className="deck-info-primary">
                    <div className="uses-badge"><Trophy size={12} /><span>{deck.count} PRO USES</span></div>
                    {deck.maxMedals > 0 && <div className="medals-badge"><Medal size={12} /><span>{deck.maxMedals}</span></div>}
                    {deck.isBestSynergy && <span className="best-synergy-badge">MAX POTENTIAL</span>}
                    <button 
                      className={`copy-deck-btn ${copiedIndex === idx ? 'copied' : ''}`}
                      onClick={() => handleCopyDeck(deck, idx)}
                    >
                      {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedIndex === idx ? 'COPIED!' : 'COPY'}</span>
                    </button>
                  </div>
                  
                  <div className="affinity-pill" style={{ borderColor: affinityColor }}>
                    <Target size={14} style={{ color: affinityColor }} />
                    <div className="affinity-content">
                      <span className="label">AFFINITY</span>
                      <span className="value" style={{ color: affinityColor }}>{affinityPercent}%</span>
                    </div>
                  </div>
                </div>

                <div className="deck-main-content">
                  <div className="mini-card-grid">
                    {deck.cards.map((card, index) => {
                      const userCard = profile.cards.find(c => Number(c.id) === Number(card.id));
                      const userLevel = userCard ? getDisplayLevel(userCard) : 0;
                      const isMaxed = userLevel >= 16;
                      const missingLvls = Math.max(0, 16 - userLevel);
                      
                      const cardIsEvo = isEvoUnlocked(card);
                      const cardIsChamp = isChampion(card);
                      const heroVar = isHeroVariantUnlocked(card);
                      
                      const displayIcon = getCardIcon(card, heroVar, cardIsEvo);

                      return (
                        <div key={card.id || index} className={`mini-card ${cardIsEvo ? 'evo-slot' : ''} ${cardIsChamp ? 'champion-slot' : ''} ${heroVar ? 'hero-slot' : ''}`}>
                          <div className="card-image-container">
                            {displayIcon && <img src={displayIcon} alt={card.name} onError={(e) => { (e.target as HTMLImageElement).src = card.iconUrls?.medium || ''; }} />}
                          </div>
                          <div className={`mini-level ${isMaxed ? 'maxed' : ''}`}>
                            {userLevel || '!'}
                          </div>
                          {!isMaxed && userLevel > 0 && (
                            <div className="missing-lvl-indicator">
                              <ArrowUp size={6} /> {missingLvls}
                            </div>
                          )}
                          {cardIsEvo && <div className="evo-indicator-tiny"></div>}
                          {cardIsChamp && <div className="champion-indicator-tiny"></div>}
                          {heroVar && <div className="hero-indicator-tiny"></div>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="deck-stats-group">
                    <div className="deck-stat-item">
                      <div className="stat-icon"><Activity size={14} /></div>
                      <div className="stat-info"><span className="stat-label">AVG LEVEL</span><span className="stat-value">{deck.avgLevel.toFixed(1)}</span></div>
                    </div>
                    <div className={`deck-stat-item ${deck.maxedCount === 8 ? 'maxed' : ''}`}>
                      <div className="stat-icon"><CheckCircle2 size={14} /></div>
                      <div className="stat-info"><span className="stat-label">MAXED CARDS</span><span className="stat-value">{deck.maxedCount}/8</span></div>
                    </div>
                  </div>
                </div>

                {(deck.missingEvos?.length > 0 || deck.missingHeroes?.length > 0) && (
                  <div className="deck-missing-section">
                    <div className="missing-label"><AlertCircle size={12} /><span>MISSING REQUIREMENTS</span></div>
                    <div className="missing-icons-list">
                      {deck.missingEvos?.map((evo, eIdx) => (
                        <div key={`evo-${eIdx}`} className="missing-item-badge evo">
                          <img src={evo.icon} alt={evo.name} />
                          <span>{evo.name} (EVO)</span>
                        </div>
                      ))}
                      {deck.missingHeroes?.map((hero, hIdx) => (
                        <div key={`hero-${hIdx}`} className="missing-item-badge hero">
                          <img src={hero.icon} alt={hero.name} />
                          <span>{hero.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!deck.missingEvos || deck.missingEvos.length === 0) && (!deck.missingHeroes || deck.missingHeroes.length === 0) && (
                  <div className="deck-ready-footer"><CheckCircle2 size={12} /><span>DECK FULLY READY</span></div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
