import { useState } from 'react';
import { PlayerProfile } from '../types/clashRoyale';
import { useDeckFilters, MetaDeck } from '../hooks/useDeckFilters';
import { DeckFilters } from './meta/DeckFilters';
import { DeckList } from './meta/DeckList';
import { QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  profile: PlayerProfile | null;
  cachedDecks: MetaDeck[] | null;
  onAnalysisStart: () => void;
  isLoading: boolean;
  progress: number;
}

export const DeckBuilder = ({ profile, cachedDecks, onAnalysisStart, isLoading, progress }: Props) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

  const {
    minCountFilter, setMinCountFilter,
    missingFilter, setMissingFilter,
    playstyleFilter, setPlaystyleFilter,
    showBestSynergyOnly, setShowBestSynergyOnly,
    cardFilter, setCardFilter,
    filteredDecks
  } = useDeckFilters(cachedDecks, profile);

  return (
    <div className="deck-builder-container">
      {!cachedDecks && !isLoading && (
        <div className="empty-state">
          <h3>Discover Your Best Meta Decks</h3>
          <p>We'll analyze Top 200 players and match their successful decks against your exact card collection levels and available evolutions to find the perfect synergy.</p>
          <button className="primary-btn pulse" onClick={onAnalysisStart} style={{ marginTop: '1.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Scan Meta & Find Decks
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-state">
          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>Analyzing Top 200 Meta Decks... {progress}%</p>
          <p className="loading-subtext">Calculating Affinity Scores based on your collection levels, evolutions, and missing cards.</p>
        </div>
      )}

      {cachedDecks && !isLoading && (
        <div className="deck-builder-content">
          <DeckFilters 
            isFiltersExpanded={isFiltersExpanded}
            setIsFiltersExpanded={setIsFiltersExpanded}
            minCountFilter={minCountFilter}
            setMinCountFilter={setMinCountFilter}
            missingFilter={missingFilter}
            setMissingFilter={setMissingFilter}
            playstyleFilter={playstyleFilter}
            setPlaystyleFilter={setPlaystyleFilter}
            showBestSynergyOnly={showBestSynergyOnly}
            setShowBestSynergyOnly={setShowBestSynergyOnly}
            cardFilter={cardFilter}
            setCardFilter={setCardFilter}
            totalFiltered={filteredDecks.length}
          />

          <DeckList 
            decks={filteredDecks}
            profile={profile}
            setQrModalUrl={setQrModalUrl}
            isLoading={isLoading}
            progress={progress}
          />
        </div>
      )}

      {qrModalUrl && (
        <div className="qr-modal-overlay" onClick={() => setQrModalUrl(null)}>
          <div className="qr-modal-content pure-style" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setQrModalUrl(null)}><X size={20} /></button>
            <div className="qr-header">
              <QrCode size={24} />
              <h3>Scan to Copy Deck</h3>
            </div>
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={qrModalUrl} 
                size={220}
                bgColor="transparent"
                fgColor="var(--text-primary)"
                level="L"
              />
            </div>
            <p className="qr-instruction">Scan this QR code with your phone camera to instantly open Clash Royale and copy the deck.</p>
          </div>
        </div>
      )}
    </div>
  );
};
