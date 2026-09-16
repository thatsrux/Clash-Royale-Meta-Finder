import React, { useMemo } from 'react';
import { Trophy, Shield, Layers3 } from 'lucide-react';
import type { PlayerProfile, Card } from '../../types/clashRoyale';
import { hasCopiesToReachMaxLevel, isEvoUnlocked, isHeroVariantUnlocked } from '../../types/clashRoyale';

interface ProfileHeaderProps {
  profile: PlayerProfile;
  getDisplayLevel: (card: Card) => number;
  getRarityClass: (card: Card) => string;
  totalCardCount?: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, getDisplayLevel, getRarityClass, totalCardCount }) => {
  const collectionLevel = useMemo(() => {
    const apiCollectionLevel = Number(profile.collectionLevel);
    if (Number.isFinite(apiCollectionLevel) && apiCollectionLevel > 0) {
      return apiCollectionLevel;
    }
    
    let totalLevels = 0;
    let bonus = 0;
    const allOwnedCards = [...(profile.cards || []), ...(profile.supportCards || [])];
    allOwnedCards.forEach(c => {
      totalLevels += getDisplayLevel(c);
      if (isEvoUnlocked(c)) bonus += 5;
      if (isHeroVariantUnlocked(c)) bonus += 5;
    });
    return totalLevels + bonus;
  }, [profile, getDisplayLevel]);

  const cardProgress = useMemo(() => {
    const cards = profile.cards || [];

    return cards.reduce((progress, card) => {
      const displayLevel = getDisplayLevel(card);
      const isMaxed = displayLevel >= 16;

      if (isMaxed) {
        progress.maxed += 1;
        progress.potentialMaxed += 1;
        return progress;
      }

      if (hasCopiesToReachMaxLevel(getRarityClass(card), displayLevel, card.count)) {
        progress.potentialMaxed += 1;
      }

      return progress;
    }, { maxed: 0, potentialMaxed: 0, total: Math.max(cards.length, totalCardCount || 0) });
  }, [profile.cards, getDisplayLevel, getRarityClass, totalCardCount]);

  return (
    <div className="profile-header">
      <div>
        <h2 className="profile-name">{profile.name}</h2>
        <span className="profile-tag">{profile.tag}</span>
      </div>
      <div className="profile-stats">
        <div className="stat-badge">
          <Trophy color="var(--secondary)" size={24} />
          <div className="stat-values">
            <div className="stat-main">{profile.trophies}</div>
            <div className="stat-label">TROPHIES</div>
          </div>
        </div>
        <div className="stat-badge">
          <Shield color="var(--primary)" size={24} />
          <div className="stat-values">
            <div className="stat-main">{collectionLevel}</div>
            <div className="stat-label">COLLECTION</div>
          </div>
        </div>
        <div
          className="stat-badge maxed-cards-stat"
          tabIndex={0}
          aria-label={`${cardProgress.maxed} maxed cards out of ${cardProgress.total}. ${cardProgress.potentialMaxed} potential maxed cards out of ${cardProgress.total}.`}
        >
          <Layers3 color="#68e7a5" size={24} />
          <div className="stat-values">
            <div className="stat-main">{cardProgress.maxed}/{cardProgress.total}</div>
            <div className="stat-label">MAXED CARDS</div>
          </div>
          <div className="stat-tooltip" role="tooltip">
            <div className="stat-tooltip-label">POTENTIAL MAXED CARDS</div>
            <div className="stat-tooltip-value">{cardProgress.potentialMaxed}/{cardProgress.total}</div>
            <div className="stat-tooltip-note">All copies ready — only gold required</div>
          </div>
        </div>
      </div>
    </div>
  );
};
