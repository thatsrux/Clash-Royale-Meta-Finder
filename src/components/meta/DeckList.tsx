import { useState } from 'react';
import { type MetaDeck } from '../../hooks/useDeckFilters';
import { type PlayerProfile } from '../../types/clashRoyale';
import { DeckCard } from './DeckCard';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

interface Props {
  decks: MetaDeck[];
  profile: PlayerProfile | null;
  setQrModalUrl: (url: string) => void;
  isLoading?: boolean;
  progress?: number;
}

export const DeckList = ({ decks, profile, setQrModalUrl, isLoading, progress }: Props) => {
  const [visibleCount, setVisibleCount] = useState(20);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  if (decks.length === 0 && !isLoading) {
    return (
      <div className="empty-state" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p>No Meta Decks found matching these filters.</p>
      </div>
    );
  }

  return (
    <div className="recommendations-list" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
      {isLoading && (
        <div className="analysis-progress-container" style={{ margin: '1rem 0' }}>
          <div className="analysis-status">
            <div className="status-main">
              <RefreshCw size={14} className="spin" />
              <span>REFRESHING META DATA...</span>
            </div>
            <span className="status-percent">{progress || 0}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: `${progress || 0}%` }}></div>
          </div>
        </div>
      )}
      
      <div className="results-summary-bar">
        <div className="total-decks-badge">
          <LayoutDashboard size={14} />
          <span>TOTAL DECKS: {decks.length} {decks.length > visibleCount && `(SHOWING ${visibleCount})`}</span>
        </div>
      </div>
      
      {decks.slice(0, visibleCount).map((deck, idx) => (
        <DeckCard 
          key={`${deck.name}-${idx}`} 
          deck={deck} 
          profile={profile}
          setQrModalUrl={setQrModalUrl}
        />
      ))}

      {decks.length > visibleCount && (
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
  );
};
