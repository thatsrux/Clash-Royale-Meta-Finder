import { type MetaDeck } from '../../hooks/useDeckFilters';
import { type PlayerProfile } from '../../types/clashRoyale';
import { DeckCard } from './DeckCard';

interface Props {
  decks: MetaDeck[];
  profile: PlayerProfile | null;
  setQrModalUrl: (url: string) => void;
}

export const DeckList = ({ decks, profile, setQrModalUrl }: Props) => {
  if (decks.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: '2rem' }}>
        <p>No Meta Decks found matching these filters.</p>
      </div>
    );
  }

  return (
    <div className="decks-grid">
      {decks.map((deck, idx) => (
        <DeckCard 
          key={`${deck.name}-${idx}`} 
          deck={deck} 
          profile={profile}
          setQrModalUrl={setQrModalUrl}
        />
      ))}
    </div>
  );
};
