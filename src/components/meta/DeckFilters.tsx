import { SlidersHorizontal, Filter, ListFilter, Target, Search } from 'lucide-react';

interface Props {
  isFiltersExpanded: boolean;
  setIsFiltersExpanded: (val: boolean) => void;
  minCountFilter: number;
  setMinCountFilter: (val: number) => void;
  missingFilter: number | 'all';
  setMissingFilter: (val: number | 'all') => void;
  playstyleFilter: string;
  setPlaystyleFilter: (val: string) => void;
  showBestSynergyOnly: boolean;
  setShowBestSynergyOnly: (val: boolean) => void;
  cardFilter: string;
  setCardFilter: (val: string) => void;
  totalFiltered: number;
}

export const DeckFilters = ({
  isFiltersExpanded, setIsFiltersExpanded,
  minCountFilter, setMinCountFilter,
  missingFilter, setMissingFilter,
  playstyleFilter, setPlaystyleFilter,
  showBestSynergyOnly, setShowBestSynergyOnly,
  cardFilter, setCardFilter,
  totalFiltered
}: Props) => {
  return (
    <div className="filters-container">
      <div className="filters-header" onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}>
        <div className="filters-title">
          <SlidersHorizontal size={20} />
          <span>Advanced Deck Filters</span>
        </div>
        <div className="filters-summary">
          <span className="badge badge-primary">{totalFiltered} DECKS FOUND</span>
        </div>
      </div>
      
      <div className={`filter-animation-wrapper ${isFiltersExpanded ? 'expanded' : ''}`}>
        <div className="filters-grid">
          <div className="filter-group">
            <label><Filter size={14} /> Min. Pro Usage</label>
            <select value={minCountFilter} onChange={(e) => setMinCountFilter(Number(e.target.value))}>
              <option value={1}>1+ Players (All Meta)</option>
              <option value={2}>2+ Players (Common)</option>
              <option value={5}>5+ Players (Popular)</option>
              <option value={10}>10+ Players (Core Meta)</option>
            </select>
          </div>

          <div className="filter-group">
            <label><ListFilter size={14} /> Missing Cards Allowed</label>
            <select value={missingFilter} onChange={(e) => setMissingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">Any Amount</option>
              <option value={0}>0 (Ready to Play)</option>
              <option value={1}>Max 1 Missing</option>
              <option value={2}>Max 2 Missing</option>
            </select>
          </div>

          <div className="filter-group">
            <label><Target size={14} /> Playstyle Archetype</label>
            <select value={playstyleFilter} onChange={(e) => setPlaystyleFilter(e.target.value)}>
              <option value="all">All Playstyles</option>
              <option value="Beatdown">Beatdown (Golem, EGiant)</option>
              <option value="Control">Control (Miner, Graveyard)</option>
              <option value="Bridge Spam">Bridge Spam</option>
              <option value="Siege">Siege (X-Bow, Mortar)</option>
              <option value="Bait">Bait (Goblin Barrel)</option>
              <option value="Midrange">Midrange</option>
            </select>
          </div>

          <div className="filter-group">
            <label><Search size={14} /> Specific Card Filter</label>
            <input 
              type="text" 
              placeholder="e.g. 'Log', 'Hog Rider'"
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-toggles">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={showBestSynergyOnly} 
              onChange={(e) => setShowBestSynergyOnly(e.target.checked)} 
            />
            <span className="slider"></span>
            <span className="toggle-label">Show Perfect Synergy Only (No penalties)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
