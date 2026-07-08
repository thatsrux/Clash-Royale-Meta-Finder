import { useState } from 'react';
import { type PlayerProfile, getCardIcon, getCardSlug, isChampion, isHeroVariantUnlocked, isEvoUnlocked, getDisplayLevel, detectArchetype, getArchetypeMatchups, getSubstitutions } from '../../types/clashRoyale';
import { type MetaDeck } from '../../hooks/useDeckFilters';
import { CardImage } from '../CardImage';
import { generateDeckLink } from '../../utils/deckUtils';
import { Copy, QrCode, LineChart, Target, Check, Trophy, Medal, UserCircle2, ArrowUp, ArrowDown, Droplets, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  deck: MetaDeck;
  profile: PlayerProfile | null;
  setQrModalUrl: (url: string) => void;
}

export const DeckCard = ({ deck, profile, setQrModalUrl }: Props) => {
  const [copied, setCopied] = useState(false);
  const [expandedMatchup, setExpandedMatchup] = useState(false);

  const handleCopyDeck = () => {
    const finalLink = generateDeckLink(deck);
    navigator.clipboard.writeText(finalLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    window.open(finalLink, '_self');
  };

  const getCardSubstitutesData = (cardName: string) => {
    if (!profile) return null;
    const slug = getCardSlug(cardName);
    const subs = getSubstitutions(slug);
    if (subs.length === 0) return null;
    
    for (const subSlug of subs) {
      const ownedCard = profile.cards.find(c => getCardSlug(c.name) === subSlug);
      if (ownedCard) {
        return { name: ownedCard.name, icon: getCardIcon(ownedCard, false, false) };
      }
    }
    return null;
  };

  const missingCards: any[] = [];
  const ownedLevelSum = deck.cards.reduce((sum: number, metaCard: any) => {
    const uCard = profile?.cards.find(c => Number(c.id) === Number(metaCard.id));
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

  return (
    <div className={`deck-suggestion ${themeClass}`}>
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
              className={`action-btn copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyDeck}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>
            <button 
              className="action-btn qr-btn"
              onClick={() => setQrModalUrl(generateDeckLink(deck))}
              title="Show QR Code"
            >
              <QrCode size={14} />
            </button>
            <button 
              className={`action-btn matchup-btn ${expandedMatchup ? 'active' : ''}`}
              onClick={() => setExpandedMatchup(!expandedMatchup)}
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
            const userCard = profile?.cards.find(c => Number(c.id) === Number(card.id));
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

      {expandedMatchup && (
        <div className="matchup-expansion-panel">
          <div className="matchup-col strong-vs">
            <div className="matchup-header"><ArrowUp size={14} /> STRONG AGAINST</div>
            <div className="matchup-tags">
              {getArchetypeMatchups(archetype).strong.map((m: string) => <span key={m} className="m-tag strong">{m}</span>)}
            </div>
          </div>
          <div className="matchup-divider"></div>
          <div className="matchup-col weak-vs">
            <div className="matchup-header"><ArrowDown size={14} /> WEAK AGAINST</div>
            <div className="matchup-tags">
              {getArchetypeMatchups(archetype).weak.map((m: string) => <span key={m} className="m-tag weak">{m}</span>)}
            </div>
          </div>
        </div>
      )}

      {(missingCards.length > 0 || deck.missingEvos?.length > 0 || deck.missingHeroes?.length > 0) ? (
        <div className="deck-missing-section">
          <div className="missing-label"><AlertCircle size={12} /><span>MISSING REQUIREMENTS</span></div>
          <div className="missing-icons-list">
            {deck.missingEvos?.map((evo: any, eIdx: number) => (
              <div key={`evo-${eIdx}`} className="missing-item-badge evo">
                <CardImage src={evo.icon} cardName={evo.name} />
                <span>{evo.name} (EVO)</span>
              </div>
            ))}
            {deck.missingHeroes?.map((hero: any, hIdx: number) => (
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
        <div className="deck-ready-footer"><CheckCircle2 size={12} /><span>DECK FULLY READY</span></div>
      )}
    </div>
  );
};
