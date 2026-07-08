import { Card, getDisplayLevel, isHeroVariantUnlocked, isAnyHeroUnlocked, isEvoUnlocked, getCardIcon, getRarityClass } from '../../types/clashRoyale';
import { CardImage } from '../CardImage';
import { Crown, Sparkles, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { SortOption, SortOrder } from '../../hooks/useCardFilters';

interface Props {
  sortedCards: Card[];
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
  sortOrder: SortOrder;
  setSortOrder: (val: SortOrder) => void;
  cardMap: Record<number, any>;
}

export const CollectionGrid = ({ sortedCards, sortBy, setSortBy, sortOrder, setSortOrder, cardMap }: Props) => {
  return (
    <>
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
          const icon = getCardIcon(card, heroVariant || hero, evo);
          const elixir = cardMap[card.id]?.elixir;

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
            </div>
          );
        })}
      </div>
    </>
  );
};
