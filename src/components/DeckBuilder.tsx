import React, { useState, useMemo } from 'react';
import type { PlayerProfile, Card } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isChampion, hasEvoAvailable, hasHeroAvailable, getCardIcon } from '../types/clashRoyale';
import { TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Medal, Target, Activity, Copy, Check, UserCircle2, ArrowUp, ArrowDown, LayoutDashboard } from 'lucide-react';

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
}

// Meta Deck Builder Component
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
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
    
    // EXPLICIT REPLICATION OF ROYALEAPI WORKING FORMAT
    // Example: https://link.clashroyale.com/en/?clashroyale://copyDeck?deck=...&l=Royals&tt=159000000
    
    // 1. Get the 8 card IDs
    const deckCards = cards.filter(c => c && c.id && c.id < 68000000).slice(0, 8);
    const deckIds = deckCards.map(c => c.id).join(';');
    
    // 2. Format Tower Troop ID (Game uses 159xxxxxx range for Tower Troops in links)
    // If we have a tower ID like 26000057 (Princess), it needs to be mapped or prefixed correctly.
    // The user's example uses 159000000 (Princess Tower)
    let towerId = '159000000';
    if (towerTroopId) {
      const tidStr = towerTroopId.toString();
      if (tidStr.startsWith('68')) {
        // Map 68xxxxxx (API) to 159xxxxxx (Link)
        towerId = tidStr.replace('68', '159');
      } else if (!tidStr.startsWith('159')) {
        // Fallback for unexpected IDs - default to Princess Tower
        towerId = '159000000';
      } else {
        towerId = tidStr;
      }
    }

    // 3. Build the exact query string
    // 'l' is the label (deck name)
    // 'tt' is the tower troop
    const deepLinkParams = `deck=${deckIds}&l=MetaArchetype&tt=${towerId}`;
    const finalLink = `https://link.clashroyale.com/en/?clashroyale://copyDeck?${deepLinkParams}`;

    navigator.clipboard.writeText(finalLink).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });

    window.location.href = finalLink;
  };

  const { filteredRecommendations } = useMemo(() => {
    if (!cachedDecks || cachedDecks.length === 0) return { filteredRecommendations: [] };
    
    const filtered = cachedDecks
      .filter(deck => 
        selectedFilters.every(filter => {
          if (filter.isEvoFilter) {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'evo');
          } else if (filter.rarity === 'hero') {
            return deck.cards.some(c => Number(c.id) === filter.id && (c as any)._forceForm === 'hero');
          } else {
            return deck.cards.some(c => Number(c.id) === filter.id);
          }
        })
      );

    return { filteredRecommendations: selectedFilters.length === 0 ? filtered : filtered.slice(0, 100) };
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

  const FilterGrid = ({ items, title, icon: Icon, color }: { items: FilterItem[], title: string, icon: any, color: string }) => {
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
                <img 
                  src={c.icon} 
                  alt={c.isEvoFilter ? `Evolved ${c.name}` : c.name} 
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('-ev1.png') || target.src.includes('-hero.png')) {
                      // Fallback to base card icon if evolution/hero icon fails
                      target.src = target.src.replace('-ev1.png', '.png').replace('-hero.png', '.png');
                    } else {
                      target.src = 'https://cdn.royaleapi.com/static/img/cards-150/unknown.png';
                    }
                  }} 
                />
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
                <img key={i} src={getCardIcon(c, false, false)} alt="" className="tiny-card-asset" />
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
                      className="active-filter-icon-wrapper"
                      onClick={() => toggleFilter(f)}
                      title={`Remove ${f.name}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <img src={f.icon} alt={f.name} />
                    </div>
                  ))}
                </div>
              </div>

              {selectedFilters.length > 0 && (
                <button onClick={() => setSelectedFilters([])} className="clear-btn">
                  <X size={12} /> Reset
                </button>
              )}
            </div>
            
            <div className="filter-sections-container">
              <FilterGrid items={sections.evos} title="EVOLUTIONS" icon={Sparkles} color="var(--evo-purple)" />
              <FilterGrid items={sections.champions} title="CHAMPIONS" icon={Crown} color="var(--champion-gold)" />
              <FilterGrid items={sections.heroes} title="HEROES" icon={Crown} color="var(--hero-yellow)" />
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
          <div className="results-summary-bar">
            <div className="total-decks-badge">
              <LayoutDashboard size={14} />
              <span>TOTAL DECKS: {filteredRecommendations.length}</span>
            </div>
          </div>
          {filteredRecommendations.map((deck, idx) => {
            const affinityPercent = Math.floor(deck.score);
            const affinityColor = affinityPercent >= 95 ? '#4ade80' : (affinityPercent >= 70 ? '#fbbf24' : '#ef4444');

            return (
              <div key={idx} className="deck-suggestion">
                <div className="deck-header">
                  <div className="deck-info-primary">
                    <div className="uses-badge"><Trophy size={12} /><span>{deck.count} PRO USES</span></div>
                    {deck.maxMedals > 0 && <div className="medals-badge"><Medal size={12} /><span>{deck.maxMedals}</span></div>}
                    {deck.bestPlayerName && <div className="player-badge"><UserCircle2 size={12} /><span>{deck.bestPlayerName}</span></div>}
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
                      
                      // STRICT VARIANT DETECTION (Restricted to slots 0, 1, 2)
                      const forcedForm = (card as any)._forceForm;
                      const canHaveVariant = index < 3;
                      const cardIsHero = canHaveVariant && (forcedForm === 'hero' || isHeroVariantUnlocked(card));
                      const cardIsEvo = canHaveVariant && (forcedForm === 'evo' || (!cardIsHero && isEvoUnlocked(card)));
                      const cardIsChamp = isChampion(card);
                      
                      const displayIcon = getCardIcon(card, cardIsHero, cardIsEvo);

                      return (
                        <div key={card.id || index} className={`mini-card ${cardIsEvo ? 'evo-slot' : ''} ${cardIsChamp ? 'champion-slot' : ''} ${cardIsHero ? 'hero-slot' : ''}`}>
                          <div className="card-image-container">
                            {displayIcon && <img src={displayIcon} alt={card.name} onError={(e) => { (e.target as HTMLImageElement).src = card.iconUrls?.medium || ''; }} />}
                          </div>
                          <div className={`mini-level ${isMaxed ? 'maxed' : ''}`}>
                            {userLevel || '!'}
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
