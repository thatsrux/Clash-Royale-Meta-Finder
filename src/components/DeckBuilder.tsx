import React, { useState, useMemo, useEffect } from 'react';
import { CardImage } from './CardImage';
import type { PlayerProfile, Card } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, isChampion, hasEvoAvailable, hasHeroAvailable, getCardIcon, getSubstitutions, detectArchetype, getArchetypeMatchups } from '../types/clashRoyale';
import { TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Medal, Target, Activity, Copy, Check, UserCircle2, ArrowUp, ArrowDown, LayoutDashboard, QrCode, Droplets, LineChart } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  virtualUpgrades?: { id: number; gold: number; level: number }[];
  evoShardsUsed?: { id: number; count: number }[];
  heroCoinsUsed?: { id: number; count: number }[];
  wildcardsUsed?: Record<string, number>;
  wildcardsUsedByCard?: { id: number; count: number; rarity: string }[];
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
  isMaxPotentialMode: boolean;
  setIsMaxPotentialMode: (val: boolean) => void;
}

// Meta Deck Builder Component
export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  profile, 
  getDisplayLevel, 
  cachedDecks, 
  onAnalysisStart, 
  isLoading, 
  progress,
  allGameCards,
  isMaxPotentialMode,
  setIsMaxPotentialMode
}) => {
  const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([]);
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [expandedMatchups, setExpandedMatchups] = useState<Record<number, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedFilters, selectedArchetypes]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
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

  const toggleArchetype = (arch: string) => {
    setSelectedArchetypes(prev => prev.includes(arch) ? prev.filter(a => a !== arch) : [...prev, arch]);
  };

  const toggleMatchup = (idx: number) => {
    setExpandedMatchups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const generateDeckLink = (deck: MetaDeck): string => {
    const { cards, towerTroopId } = deck;
    const deckCards = cards.filter(c => c && c.id && c.id < 68000000).slice(0, 8);
    const deckIds = deckCards.map(c => c.id).join(';');
    
    let towerId = '159000000';
    if (towerTroopId) {
      const tidStr = towerTroopId.toString();
      if (tidStr.startsWith('68')) {
        towerId = tidStr.replace('68', '159');
      } else if (!tidStr.startsWith('159')) {
        towerId = '159000000';
      } else {
        towerId = tidStr;
      }
    }

    const deepLinkParams = `deck=${deckIds}&l=MetaArchetype&tt=${towerId}`;
    return `https://link.clashroyale.com/en/?clashroyale://copyDeck?${deepLinkParams}`;
  };

  const handleCopyDeck = (deck: MetaDeck, index: number) => {
    const finalLink = generateDeckLink(deck);

    navigator.clipboard.writeText(finalLink).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });

    window.open(finalLink, '_self');
  };

  const handleShowQr = (deck: MetaDeck) => {
    setQrModalUrl(generateDeckLink(deck));
  };

  const getCardSubstitutesData = (cardName: string) => {
    const slug = cardName.toLowerCase().replace(/ /g, '-').replace(/\./g, '');
    const subs = getSubstitutions(slug);
    if (subs.length === 0) return null;
    
    // Find the first sub that the user actually owns
    for (const subSlug of subs) {
      const ownedCard = profile.cards.find(c => c.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '') === subSlug);
      if (ownedCard) {
        return { name: ownedCard.name, icon: getCardIcon(ownedCard, false, false) };
      }
    }
    
    // If none owned, just return the first one as a generic suggestion
    const firstSubCard = allGameCards.find(c => c.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '') === subs[0]);
    if (firstSubCard) {
      return { name: firstSubCard.name, icon: getCardIcon(firstSubCard, false, false) };
    }
    
    return null;
  };

  const { availableArchetypes, filteredRecommendations } = useMemo(() => {
    if (!cachedDecks || cachedDecks.length === 0) return { cardFilteredDecks: [], availableArchetypes: [], filteredRecommendations: [] };
    
    const cFiltered = cachedDecks
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

    const archs = new Set<string>();
    cFiltered.forEach(deck => {
      archs.add(detectArchetype(deck.cards));
    });
    const availableArchs = Array.from(archs).sort();

    let finalFiltered = cFiltered;
    if (selectedArchetypes.length > 0) {
      finalFiltered = finalFiltered.filter(deck => selectedArchetypes.includes(detectArchetype(deck.cards)));
    }

    finalFiltered.sort((a, b) => b.score - a.score);

    return { 
      availableArchetypes: availableArchs,
      filteredRecommendations: selectedFilters.length === 0 && selectedArchetypes.length === 0 ? finalFiltered : finalFiltered.slice(0, 100) 
    };
  }, [cachedDecks, selectedFilters, selectedArchetypes]);
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
            
            const cardRarity = (c.name && c.name.toLowerCase().includes('ronin')) ? 'legendary' : (c.rarity || 'common').toLowerCase();
            const isRonin = c.name && c.name.toLowerCase().includes('ronin');
            return (
              <div 
                key={`${c.id}-${c.isEvoFilter}-${idx}`} 
                className={`filter-grid-item ${isSelected ? 'selected' : ''} ${c.isEvoFilter ? 'evo' : ''} ${cardRarity === 'legendary' ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`}
                onClick={() => toggleFilter(c)}
                title={c.isEvoFilter ? `Evolved ${c.name}` : c.name}
              >
                <CardImage src={c.icon} cardName={c.name} alt={c.isEvoFilter ? `Evolved ${c.name}` : c.name} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="deck-builder">
      <div className="mode-toggle-container" style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '2rem', padding: '0.25rem', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setIsMaxPotentialMode(false)}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: 'none', background: !isMaxPotentialMode ? 'var(--primary)' : 'transparent', color: !isMaxPotentialMode ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Play Now
          </button>
          <button 
            onClick={() => setIsMaxPotentialMode(true)}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: 'none', background: isMaxPotentialMode ? 'var(--evo-purple)' : 'transparent', color: isMaxPotentialMode ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Sparkles size={16} /> Max Potential
          </button>
        </div>
      </div>
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
                <img key={i} src={getCardIcon(c, false, false)} alt="" className="tiny-card-asset" loading="lazy" />
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
                      <CardImage src={f.icon} cardName={f.name} />
                    </div>
                  ))}
                  {selectedArchetypes.map((arch) => (
                    <div 
                      key={arch}
                      onClick={() => toggleArchetype(arch)}
                      style={{ cursor: 'pointer', padding: '4px 8px', background: 'var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {arch} <X size={12} />
                    </div>
                  ))}
                </div>
              </div>

              {(selectedFilters.length > 0 || selectedArchetypes.length > 0) && (
                <button onClick={() => { setSelectedFilters([]); setSelectedArchetypes([]); }} className="clear-btn">
                  <X size={12} /> Reset
                </button>
              )}
            </div>
            
            <div className="filter-sections-container">
              {availableArchetypes && availableArchetypes.length > 0 && (
                <div className="filter-section-group">
                  <div className="section-title" style={{ color: 'var(--text)' }}>
                    <Target size={14} /> ARCHETYPES
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    {availableArchetypes.map(arch => (
                      <button
                        key={arch}
                        onClick={() => toggleArchetype(arch)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: selectedArchetypes.includes(arch) ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: selectedArchetypes.includes(arch) ? 'rgba(43, 115, 255, 0.2)' : 'transparent',
                          color: selectedArchetypes.includes(arch) ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        {arch}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
      
      {isLoading && !cachedDecks && (
        <div className="skeleton-container">
          <div className="analysis-status" style={{ marginBottom: '1.5rem', background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <div className="status-main">
              <RefreshCw size={14} className="spin" />
              <span>Analyzing Top 200 Pro Meta...</span>
            </div>
            <span className="status-percent">{progress}%</span>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="deck-suggestion skeleton-deck">
              <div className="deck-header skeleton-pulse" style={{ height: '60px' }}></div>
              <div className="deck-main-content">
                <div className="mini-card-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <div key={j} className="skeleton-card skeleton-pulse"></div>
                  ))}
                </div>
                <div className="skeleton-stats skeleton-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cachedDecks ? (
        <div className="recommendations-list" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
          {isLoading && (
            <div className="analysis-progress-container" style={{ margin: '1rem 0' }}>
              <div className="analysis-status">
                <div className="status-main">
                  <RefreshCw size={14} className="spin" />
                  <span>REFRESHING META DATA...</span>
                </div>
                <span className="status-percent">{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          <div className="results-summary-bar">
            <div className="total-decks-badge">
              <LayoutDashboard size={14} />
              <span>TOTAL DECKS: {filteredRecommendations.length} {filteredRecommendations.length > visibleCount && `(SHOWING ${visibleCount})`}</span>
            </div>
          </div>
          {filteredRecommendations.slice(0, visibleCount).map((deck, idx) => {
            const missingCards: any[] = [];
            const ownedLevelSum = deck.cards.reduce((sum: number, metaCard: any) => {
              const uCard = profile.cards.find(c => Number(c.id) === Number(metaCard.id));
              if (!uCard) missingCards.push(metaCard);
              return sum + (uCard ? getDisplayLevel(uCard) : 0);
            }, 0);
            const ownedCount = 8 - missingCards.length;
            const realAvgLevel = ownedCount > 0 ? (ownedLevelSum / ownedCount).toFixed(1) : 0;
            const affinityPercent = Math.floor(deck.score);
            const affinityColor = affinityPercent >= 95 ? '#4ade80' : (affinityPercent >= 70 ? '#fbbf24' : '#ef4444');
            const archetype = detectArchetype(deck.cards);

            const evoCount = deck.cards.filter((c: any) => c._forceForm === 'evo').length;
            const champCount = deck.cards.filter((c: any) => isChampion(c) || c._forceForm === 'hero').length;
            let themeClass = '';
            if (evoCount > champCount && evoCount > 0) themeClass = 'theme-evo';
            else if (champCount > evoCount && champCount > 0) themeClass = 'theme-champion';
            else if (evoCount > 0 && champCount > 0) themeClass = 'theme-mixed';

            const totalVirtualGold = deck.virtualUpgrades?.reduce((sum: number, u: any) => sum + u.gold, 0) || 0;
            const totalEvoShardsUsed = deck.evoShardsUsed?.reduce((sum: number, e: any) => sum + e.count, 0) || 0;
            const totalHeroCoinsUsed = deck.heroCoinsUsed?.reduce((sum: number, h: any) => sum + h.count, 0) || 0;
            const wcu = deck.wildcardsUsed || {};

            // STABLE KEY FOR PERFORMANCE
            const deckKey = deck.cards.map(c => `${c.id}-${(c as any)._forceForm}`).sort().join('|') + `-${deck.towerTroopId}`;

            return (
              <div key={deckKey} className={`deck-suggestion ${themeClass}`}>
                <div className="deck-header">
                  <div className="deck-header-left">
                    <div className="deck-header-info">
                      <div className="archetype-title">{archetype}</div>
                      <div className="deck-meta-tags">
                        <div className="meta-tag uses" title="Number of Pro Players using this exact 8-card combination"><Trophy size={12} /> <span>{deck.count} PRO USES</span></div>
                        {deck.maxMedals > 0 && <div className="meta-tag medals" title="Highest medals achieved with this deck"><Medal size={12} /> <span>{deck.maxMedals}</span></div>}
                        {deck.bestPlayerName && <div className="meta-tag player" title="Top player using this deck"><UserCircle2 size={12} /> <span>{deck.bestPlayerName}</span></div>}
                      </div>
                    </div>
                    <div className="deck-actions">
                      <button 
                        className={`action-btn copy-btn ${copiedIndex === idx ? 'copied' : ''}`}
                        onClick={() => handleCopyDeck(deck, idx)}
                      >
                        {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedIndex === idx ? 'COPIED!' : 'COPY'}</span>
                      </button>
                      <button 
                        className="action-btn qr-btn"
                        onClick={() => handleShowQr(deck)}
                        title="Show QR Code"
                      >
                        <QrCode size={14} />
                      </button>
                      <button 
                        className={`action-btn matchup-btn ${expandedMatchups[idx] ? 'active' : ''}`}
                        onClick={() => toggleMatchup(idx)}
                        title="View Matchups"
                      >
                        <LineChart size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="deck-header-right">
                    <div className="affinity-pill" style={{ borderColor: affinityColor, boxShadow: `0 0 10px ${affinityColor}33` }}>
                      <Target size={14} style={{ color: affinityColor }} />
                      <div className="affinity-content">
                        <span className="label">AFFINITY</span>
                        <span className="value" style={{ color: affinityColor }}>{affinityPercent}%</span>
                      </div>
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
                      const cardRarity = (card.name && card.name.toLowerCase().includes('ronin')) ? 'legendary' : (card.rarity || 'common').toLowerCase();
                      const isRonin = card.name && card.name.toLowerCase().includes('ronin');

                      const virtualUpgradeInfo = deck.virtualUpgrades?.find((u: any) => u.id === card.id);
                      const evoUsed = deck.evoShardsUsed?.find((e: any) => e.id === card.id);
                      const heroUsed = deck.heroCoinsUsed?.find((h: any) => h.id === card.id);

                      return (
                        <div 
                          key={card.id || index} 
                          className={`mini-card ${cardIsEvo ? 'evo-slot' : ''} ${cardIsChamp ? 'champion-slot' : ''} ${cardIsHero ? 'hero-slot' : ''} ${cardRarity === 'legendary' ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`} 
                          style={{ 
                            opacity: userCard ? 1 : 0.4, 
                            '--card-img': `url(${displayIcon})` 
                          } as React.CSSProperties}
                        >
                          <div className="card-image-container">
                            {displayIcon && <CardImage src={displayIcon} cardName={card.name} />}
                          </div>
                          
                          <div className="card-badges-container">
                            {virtualUpgradeInfo && (
                              <div className="virtual-upgrade-badge" title={`Can upgrade to lvl ${virtualUpgradeInfo.level}`}>
                                <span className="coin-icon">💰</span>{virtualUpgradeInfo.gold >= 1000 ? `${Math.floor(virtualUpgradeInfo.gold / 1000)}k` : virtualUpgradeInfo.gold}
                              </div>
                            )}
                            
                            {evoUsed && (
                              <div className="magic-badge evo-badge" title={`${evoUsed.count} Evo Shards needed`}>
                                💎 {evoUsed.count}
                              </div>
                            )}
                            
                            {heroUsed && (
                              <div className="magic-badge hero-badge" title={`${heroUsed.count} Hero Coins needed`}>
                                🪙 {heroUsed.count}
                              </div>
                            )}

                            {(() => {
                              const wcInfo = deck.wildcardsUsedByCard?.find((w: any) => w.id === card.id);
                              if (!wcInfo) return null;
                              return (
                                <div className="magic-badge" style={{
                                  background: `var(--rarity-${wcInfo.rarity})`,
                                  color: 'white',
                                  borderColor: 'rgba(255,255,255,0.3)'
                                }} title={`${wcInfo.count} ${wcInfo.rarity} Wildcards needed`}>
                                  🃏 {wcInfo.count}
                                </div>
                              );
                            })()}
                          </div>

                          <div className={`mini-level ${isMaxed ? 'maxed' : ''} ${virtualUpgradeInfo ? 'virtual' : ''}`}>
                            {virtualUpgradeInfo ? virtualUpgradeInfo.level : (userLevel || '!')}
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
                      <div className="stat-icon"><Droplets size={14} color="#d946ef" /></div>
                      <div className="stat-info"><span className="stat-label">AVG ELIXIR</span><span className="stat-value">{deck.elixirCost.toFixed(1)}</span></div>
                    </div>
                    <div className="deck-stat-item">
                      <div className="stat-icon"><Activity size={14} /></div>
                      <div className="stat-info"><span className="stat-label">AVG LEVEL</span><span className="stat-value">{realAvgLevel}</span></div>
                    </div>
                    <div className={`deck-stat-item ${deck.maxedCount === 8 ? 'maxed' : ''}`}>
                      <div className="stat-icon"><CheckCircle2 size={14} /></div>
                      <div className="stat-info"><span className="stat-label">MAXED CARDS</span><span className="stat-value">{deck.maxedCount}/8</span></div>
                    </div>
                  </div>
                </div>

                {expandedMatchups[idx] && (
                  <div className="matchup-expansion-panel">
                    <div className="matchup-col strong-vs">
                      <div className="matchup-header"><ArrowUp size={14} /> STRONG AGAINST</div>
                      <div className="matchup-tags">
                        {getArchetypeMatchups(archetype).strong.map(m => <span key={m} className="m-tag strong">{m}</span>)}
                      </div>
                    </div>
                    <div className="matchup-divider"></div>
                    <div className="matchup-col weak-vs">
                      <div className="matchup-header"><ArrowDown size={14} /> WEAK AGAINST</div>
                      <div className="matchup-tags">
                        {getArchetypeMatchups(archetype).weak.map(m => <span key={m} className="m-tag weak">{m}</span>)}
                      </div>
                    </div>
                  </div>
                )}

                {(missingCards.length > 0 || deck.missingEvos?.length > 0 || deck.missingHeroes?.length > 0) ? (
                  <div className="deck-missing-section">
                    <div className="missing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="missing-label"><AlertCircle size={12} /><span>MISSING REQUIREMENTS</span></div>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {totalVirtualGold > 0 && (
                          <div className="virtual-total-gold" title="Total Gold Needed">
                            <span className="coin-icon">💰</span> {totalVirtualGold >= 1000 ? `${Math.floor(totalVirtualGold / 1000)}k` : totalVirtualGold}
                          </div>
                        )}
                        {totalEvoShardsUsed > 0 && (
                          <div className="virtual-total-gold" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.1)' }} title="Wild Evo Shards">
                            <span className="coin-icon">🃏</span> {totalEvoShardsUsed}
                          </div>
                        )}
                        {totalHeroCoinsUsed > 0 && (
                          <div className="virtual-total-gold" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.1)' }} title="Hero Coins">
                            <span className="coin-icon">🪙</span> {totalHeroCoinsUsed}
                          </div>
                        )}
                        {wcu.common > 0 && <div className="virtual-total-gold" style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }} title="Common Wildcards"><span className="coin-icon">🃏</span> {wcu.common}</div>}
                        {wcu.rare > 0 && <div className="virtual-total-gold" style={{ color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.3)' }} title="Rare Wildcards"><span className="coin-icon">🃏</span> {wcu.rare}</div>}
                        {wcu.epic > 0 && <div className="virtual-total-gold" style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }} title="Epic Wildcards"><span className="coin-icon">🃏</span> {wcu.epic}</div>}
                        {wcu.legendary > 0 && <div className="virtual-total-gold" style={{ color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.3)' }} title="Legendary Wildcards"><span className="coin-icon">🃏</span> {wcu.legendary}</div>}
                        {wcu.champion > 0 && <div className="virtual-total-gold" style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }} title="Champion Wildcards"><span className="coin-icon">🃏</span> {wcu.champion}</div>}
                      </div>
                    </div>
                    <div className="missing-icons-list">
                      {deck.missingEvos?.map((evo, eIdx) => (
                        <div key={`evo-${eIdx}`} className="missing-item-badge evo">
                          <CardImage src={evo.icon} cardName={evo.name} />
                          <span>{evo.name} (EVO)</span>
                        </div>
                      ))}
                      {deck.missingHeroes?.map((hero, hIdx) => (
                        <div key={`hero-${hIdx}`} className="missing-item-badge hero">
                          <CardImage src={hero.icon} cardName={hero.name} />
                          <span>{hero.name}</span>
                        </div>
                      ))}
                      {missingCards.map((c: any, i: number) => {
                        const sub = getCardSubstitutesData(c.name);
                        return (
                          <div key={`card-${i}`} className="missing-item-badge">
                            <CardImage src={c.iconUrls.medium} cardName={c.name} />
                            <span>{c.name}</span>
                            {sub && (
                              <div style={{ marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Try:</span>
                                <CardImage src={sub.icon} cardName={sub.name} style={{ width: '16px', height: '16px', borderRadius: '50%' }} title={`Substitute with ${sub.name}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="deck-ready-footer" style={{ justifyContent: totalVirtualGold > 0 ? 'space-between' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={12} /><span>DECK FULLY READY</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {totalVirtualGold > 0 && (
                        <div className="virtual-total-gold" title="Total Gold Needed">
                          <span className="coin-icon">💰</span> {totalVirtualGold >= 1000 ? `${Math.floor(totalVirtualGold / 1000)}k` : totalVirtualGold}
                        </div>
                      )}
                      {totalEvoShardsUsed > 0 && (
                        <div className="virtual-total-gold" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.1)' }} title="Wild Evo Shards">
                          <span className="coin-icon">🃏</span> {totalEvoShardsUsed}
                        </div>
                      )}
                      {totalHeroCoinsUsed > 0 && (
                        <div className="virtual-total-gold" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.1)' }} title="Hero Coins">
                          <span className="coin-icon">🪙</span> {totalHeroCoinsUsed}
                        </div>
                      )}
                      {wcu.common > 0 && <div className="virtual-total-gold" style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }} title="Common Wildcards"><span className="coin-icon">🃏</span> {wcu.common}</div>}
                      {wcu.rare > 0 && <div className="virtual-total-gold" style={{ color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.3)' }} title="Rare Wildcards"><span className="coin-icon">🃏</span> {wcu.rare}</div>}
                      {wcu.epic > 0 && <div className="virtual-total-gold" style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }} title="Epic Wildcards"><span className="coin-icon">🃏</span> {wcu.epic}</div>}
                      {wcu.legendary > 0 && <div className="virtual-total-gold" style={{ color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.3)' }} title="Legendary Wildcards"><span className="coin-icon">🃏</span> {wcu.legendary}</div>}
                      {wcu.champion > 0 && <div className="virtual-total-gold" style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }} title="Champion Wildcards"><span className="coin-icon">🃏</span> {wcu.champion}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRecommendations.length > visibleCount && (
            <div className="load-more-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '3rem' }}>
              <button 
                onClick={handleLoadMore}
                className="action-btn" 
                style={{ padding: '1rem 2.5rem', borderRadius: '3rem', fontSize: '1rem' }}
              >
                <RefreshCw size={18} />
                <span>LOAD MORE DECKS</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {qrModalUrl && (
        <div className="qr-modal-overlay" onClick={() => setQrModalUrl(null)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Scan to Copy Deck</h3>
              <button onClick={() => setQrModalUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
              <QRCodeSVG value={qrModalUrl} size={256} level="H" includeMargin={false} fgColor="#000000" bgColor="#ffffff" />
            </div>
            <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Open your camera or a QR scanner app on your phone to copy this deck directly into Clash Royale.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


