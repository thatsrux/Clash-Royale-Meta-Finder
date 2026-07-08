import { useState } from 'react';
import { type PlayerProfile, getCardIcon, getCardSlug } from '../../types/clashRoyale';
import { type MetaDeck } from '../../hooks/useDeckFilters';
import { CardImage } from '../CardImage';
import { generateDeckLink } from '../../utils/deckUtils';
import { getSubstitutions } from '../../types/clashRoyale'; // Wait, I should make sure this is exported. It is.
import { Copy, QrCode, LineChart, Target, Info, Sparkles, Crown, Check } from 'lucide-react';

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

  const affinityPercent = Math.floor(deck.score);
  const affinityColor = affinityPercent >= 95 ? '#4ade80' : (affinityPercent >= 70 ? '#fbbf24' : '#ef4444');

  return (
    <div className="deck-card pure-style">
      <div className="deck-header">
        <div className="deck-header-left">
          <h3 className="deck-name">{deck.name} <span className="deck-rating">Top 200</span></h3>
          <div className="deck-meta">
            <span className="meta-stat">Avg Elixir: {deck.elixirCost.toFixed(1)}</span>
            <span className="meta-stat">Maxed: {deck.maxedCount}/8</span>
            {deck.bestPlayerName && <span className="meta-stat highlight">Best Pro: {deck.bestPlayerName} ({deck.maxMedals} Medals)</span>}
          </div>
          <div className="deck-actions">
            <button className={`action-btn copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyDeck}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>
            <button className="action-btn qr-btn" onClick={() => setQrModalUrl(generateDeckLink(deck))} title="Show QR Code">
              <QrCode size={14} />
            </button>
            <button className={`action-btn matchup-btn ${expandedMatchup ? 'active' : ''}`} onClick={() => setExpandedMatchup(!expandedMatchup)} title="View Matchups">
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

      <div className="deck-cards">
        {deck.cards.map((c: any) => {
          const isMissing = profile && !profile.cards.find(uc => Number(uc.id) === Number(c.id));
          const forcedForm = (c as any)._forceForm;
          const isEvo = forcedForm === 'evo';
          const isHero = forcedForm === 'hero';
          const isRonin = c.name && c.name.toLowerCase().includes('ronin');
          const isLegendary = c.rarity?.toLowerCase() === 'legendary';
          
          return (
            <div key={`${c.id}-${forcedForm}`} className={`mini-card deck-slot ${isMissing ? 'missing' : ''} ${isHero ? 'champion-slot' : ''} ${isEvo ? 'evo-slot' : ''} ${isLegendary ? 'card-legendary' : ''} ${isRonin ? 'card-ronin' : ''}`}>
              <CardImage src={getCardIcon(c, isHero, isEvo)} cardName={c.name} />
              <div className="card-badges-compact">
                {isHero && <div className="badge hero-badge-tiny"><Crown size={8} strokeWidth={3} /></div>}
                {isEvo && <div className="badge evo-badge-tiny"><Sparkles size={8} strokeWidth={3} /></div>}
              </div>
            </div>
          );
        })}
      </div>

      {expandedMatchup && (
        <div className="matchup-panel">
          <div className="matchup-header">
            <LineChart size={16} /> Matchup Advantages
          </div>
          <div className="matchup-body">
            <p className="matchup-placeholder">Detailed matchup data is currently being gathered from Top 200 battles. Check back later for win-rates against popular meta archetypes.</p>
          </div>
        </div>
      )}

      {(deck.missingEvos.length > 0 || deck.missingHeroes.length > 0) && (
        <div className="missing-variants-alert">
          <Info size={16} />
          <span>
            <strong>Requires unlock:</strong> 
            {deck.missingEvos.map((e: any) => e.name).join(', ')}
            {deck.missingEvos.length > 0 && deck.missingHeroes.length > 0 ? ' & ' : ''}
            {deck.missingHeroes.map((h: any) => h.name).join(', ')}
          </span>
        </div>
      )}

      {deck.cards.map((c: any) => {
        const isMissing = profile && !profile.cards.find(uc => Number(uc.id) === Number(c.id));
        if (!isMissing) return null;
        const sub = getCardSubstitutesData(c.name);
        if (!sub) return null;
        return (
          <div key={`sub-${c.id}`} className="substitution-suggestion">
            <div className="sub-icon"><CardImage src={sub.icon} cardName={sub.name} /></div>
            <div className="sub-text">
              Replace <strong>{c.name}</strong> with <strong>{sub.name}</strong> (Available in your collection)
            </div>
          </div>
        );
      })}
    </div>
  );
};
