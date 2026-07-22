import React, { useMemo } from 'react';
import { Trophy, Shield } from 'lucide-react';
import type { PlayerProfile, Card } from '../../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked } from '../../types/clashRoyale';

interface ProfileHeaderProps {
  profile: PlayerProfile;
  getDisplayLevel: (card: Card) => number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, getDisplayLevel }) => {
  const collectionLevel = useMemo(() => {
    if (!profile) return 0;
    if (profile.collectionLevel !== undefined) return profile.collectionLevel;
    
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
      </div>
    </div>
  );
};
