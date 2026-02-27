import React, { useState, useMemo } from 'react';
import type { PlayerProfile, Card } from '../types/clashRoyale';
import { TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Trophy, ArrowUp, Filter, X, ChevronDown, ChevronUp, Sparkles, Crown, Medal, Target, Activity } from 'lucide-react';

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

  const toggleFilter = (item: FilterItem) => {
    setSelectedFilters(prev => {
      const exists = prev.find(f => f.id === item.id && f.isEvoFilter === item.isEvoFilter);
      if (exists) {
        return prev.filter(f => !(f.id === item.id && f.isEvoFilter === item.isEvoFilter));
      }
      return [...prev, item];
    });
  };

  const filteredRecommendations = useMemo(() => {
    if (!cachedDecks) return [];
    if (selectedFilters.length === 0) return cachedDecks.slice(0, 50);
    return cachedDecks
      .filter(deck => 
        selectedFilters.every(filter => {
          if (filter.isEvoFilter) {
            // Check if the card is in one of the first 2 slots
            const cardInSlot1 = deck.cards[0] ? Number(deck.cards[0].id) === filter.id : false;
            const cardInSlot2 = deck.cards[1] ? Number(deck.cards[1].id) === filter.id : false;
            return cardInSlot1 || cardInSlot2;
          } else {
            return deck.cards.some(c => c && Number(c.id) === filter.id);
          }
        })
      )
      .slice(0, 50);
  }, [cachedDecks, selectedFilters]);

  const sections = useMemo(() => {
    const evos: FilterItem[] = [];
    const heroes: FilterItem[] = [];
    const normal: FilterItem[] = [];

    const rarityOrder: Record<string, number> = {
      'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'champion': 5
    };

    if (Array.isArray(allGameCards)) {
      allGameCards.forEach(c => {
        if (!c) return;
        const iconUrl = c.iconUrls?.medium || '';
        const evoIconUrl = c.iconUrls?.evolutionMedium;
        const rarity = c.rarity || 'common';

        if (evoIconUrl) {
          evos.push({ id: c.id, icon: evoIconUrl, name: c.name, isEvoFilter: true, rarity });
        }
        if (rarity.toLowerCase() === 'champion') {
          heroes.push({ id: c.id, icon: iconUrl, name: c.name, isEvoFilter: false, rarity });
        }
        normal.push({ id: c.id, icon: iconUrl, name: c.name, isEvoFilter: false, rarity });
      });
    }

    return {
      evos: evos.sort((a, b) => a.name.localeCompare(b.name)),
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
                <img src={c.icon} alt={c.name} />
                {c.isEvoFilter && <div className="evo-mini-icon"></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="deck-builder">
      <div className="builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TrendingUp size={24} color="var(--secondary)" />
          <h2 style={{ margin: 0 }}>Ultimate Pro Meta Analysis</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
            className={`filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
          >
            {isFilterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Card Filter
          </button>
          <button onClick={onAnalysisStart} disabled={isLoading} style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {Array.isArray(allGameCards) && allGameCards.length > 0 && isFilterExpanded && (
        <div className="card-filter-grid-section">
          <div className="filter-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <Filter size={14} /> EXPLORE META BY CARDS
            </div>
            {selectedFilters.length > 0 && (
              <button onClick={() => setSelectedFilters([])} className="clear-btn">
                <X size={12} /> Reset Filters ({selectedFilters.length})
              </button>
            )}
          </div>
          
          <div className="filter-sections-container">
            <FilterGrid items={sections.evos} title="EVOLUTIONS" icon={Sparkles} color="var(--evo-purple)" />
            <FilterGrid items={sections.heroes} title="HEROES / CHAMPIONS" icon={Crown} color="var(--hero-gold)" />
            <FilterGrid items={sections.normal} title="ALL CARDS" icon={Filter} color="var(--text-muted)" />
          </div>
        </div>
      )}
      
      {isLoading && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ height: '4px', width: '100%', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
            Deep Scanning Top 200 Pro Battle Logs... {progress}%
          </p>
        </div>
      )}

      {cachedDecks && !isLoading ? (
        <div className="recommendations-list">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filteredRecommendations.length} pro decks matching your criteria</span>
            {selectedFilters.length > 0 && <span style={{ color: 'var(--primary)' }}>Filters Active</span>}
          </div>
          {filteredRecommendations.map((deck, idx) => (
            <div key={idx} className="deck-suggestion">
              <div className="deck-header">
                <div className="deck-info-primary">
                  <div className="uses-badge">
                    <Trophy size={12} />
                    <span>{deck.count} PRO USES</span>
                  </div>
                  {deck.maxMedals > 0 && (
                    <div className="medals-badge">
                      <Medal size={12} />
                      <span>{deck.maxMedals}</span>
                    </div>
                  )}
                  {deck.isBestSynergy && (
                    <span className="best-synergy-badge">BEST SYNERGY</span>
                  )}
                </div>
                
                <div className="affinity-pill" style={{ borderColor: deck.score > 100 ? '#4ade80' : '#fbbf24' }}>
                  <Target size={14} style={{ color: deck.score > 100 ? '#4ade80' : '#fbbf24' }} />
                  <div className="affinity-content">
                    <span className="label">AFFINITY</span>
                    <span className="value" style={{ color: deck.score > 100 ? '#4ade80' : '#fbbf24' }}>{deck.score.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="deck-main-content">
                <div className="mini-card-grid">
                  {deck.cards.map((card, index) => {
                    const userCard = profile.cards.find(c => c && Number(c.id) === Number(card.id));
                    const userLevel = userCard ? getDisplayLevel(userCard) : 0;
                    const isMaxed = userLevel >= 15;
                    const missingLvls = Math.max(0, 15 - userLevel);
                    
                    const displayIcon = (index < 2 && card.iconUrls?.evolutionMedium) 
                      ? card.iconUrls.evolutionMedium 
                      : card.iconUrls?.medium || '';

                    return (
                      <div key={card.id || index} className={`mini-card ${index < 2 && card.iconUrls?.evolutionMedium ? 'evo-slot' : ''}`}>
                        <div className="card-image-container">
                          {displayIcon && <img src={displayIcon} alt={card.name} />}
                        </div>
                        <div className={`mini-level ${isMaxed ? 'maxed' : ''}`}>
                          {userLevel || '!'}
                        </div>
                        {!isMaxed && userLevel > 0 && (
                          <div className="missing-lvl-indicator">
                            <ArrowUp size={6} /> {missingLvls}
                          </div>
                        )}
                        {index < 2 && card.iconUrls?.evolutionMedium && <div className="evo-indicator-tiny"></div>}
                      </div>
                    );
                  })}
                </div>

                <div className="deck-stats-group">
                  <div className="deck-stat-item">
                    <div className="stat-icon"><Activity size={14} /></div>
                    <div className="stat-info">
                      <span className="stat-label">AVG LEVEL</span>
                      <span className="stat-value">{deck.avgLevel.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className={`deck-stat-item ${deck.maxedCount === 8 ? 'maxed' : ''}`}>
                    <div className="stat-icon"><CheckCircle2 size={14} /></div>
                    <div className="stat-info">
                      <span className="stat-label">MAXED CARDS</span>
                      <span className="stat-value">{deck.maxedCount}/8</span>
                    </div>
                  </div>
                </div>
              </div>

              {deck.missingEvos && deck.missingEvos.length > 0 && (
                <div className="deck-missing-section">
                  <div className="missing-label">
                    <AlertCircle size={12} />
                    <span>MISSING EVOLUTIONS</span>
                  </div>
                  <div className="missing-icons-list">
                    {deck.missingEvos.map((evo, eIdx) => (
                      <div key={eIdx} className="missing-item-badge">
                        <img src={evo.icon} alt={evo.name} />
                        <span>{evo.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!deck.missingEvos || deck.missingEvos.length === 0) && (
                <div className="deck-ready-footer">
                  <CheckCircle2 size={12} />
                  <span>EVOLUTIONS READY</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <TrendingUp size={48} color="var(--border)" style={{ marginBottom: '1rem' }} />
          <h3>No Data Analyzed</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Start scanning the Top 200 Leaderboard to find the best decks for your collection.</p>
          <button onClick={onAnalysisStart} className="order-toggle-btn" style={{ padding: '0.75rem 2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Start Deep Meta Analysis
          </button>
        </div>
      )}
    </div>
  );
};
