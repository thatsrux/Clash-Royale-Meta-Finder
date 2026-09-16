import React, { useMemo } from 'react';
import { Trophy, Shield, Layers3, Sparkles, Crown } from 'lucide-react';
import type { PlayerProfile, Card } from '../../types/clashRoyale';
import { hasCopiesToReachMaxLevel, hasEvoAvailable, hasHeroAvailable, isEvoUnlocked, isHeroVariantUnlocked } from '../../types/clashRoyale';

interface ProfileHeaderProps {
  profile: PlayerProfile;
  getDisplayLevel: (card: Card) => number;
  getRarityClass: (card: Card) => string;
  allGameCards?: Card[];
  totalCardCount?: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, getDisplayLevel, getRarityClass, allGameCards = [], totalCardCount }) => {
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

  const variantProgress = useMemo(() => {
    const ownedCards = profile.cards || [];
    const isStandaloneVariant = (card: Card, variant: 'evo' | 'hero') => {
      const key = (card.key || '').toLowerCase();
      const name = (card.name || '').toLowerCase();

      if (variant === 'evo') {
        return key.endsWith('-evo') || name.includes('evolved') || name.includes('evolution');
      }

      return key.endsWith('-hero') || name.includes('hero') || (card.rarity || '').toLowerCase() === 'hero';
    };

    const unlockedEvos = ownedCards.filter(isEvoUnlocked).length;
    const unlockedHeroes = ownedCards.filter(isHeroVariantUnlocked).length;
    const catalogEvos = allGameCards.filter(card => hasEvoAvailable(card) && !isStandaloneVariant(card, 'evo')).length;
    const catalogHeroes = allGameCards.filter(card => hasHeroAvailable(card) && !isStandaloneVariant(card, 'hero')).length;

    return {
      unlockedEvos,
      totalEvos: Math.max(unlockedEvos, catalogEvos),
      unlockedHeroes,
      totalHeroes: Math.max(unlockedHeroes, catalogHeroes),
    };
  }, [allGameCards, profile.cards]);

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
        <div className="stat-badge variant-stat evo-stat">
          <Sparkles color="#c084fc" size={24} />
          <div className="stat-values">
            <div className="stat-main">{variantProgress.unlockedEvos}/{variantProgress.totalEvos}</div>
            <div className="stat-label">UNLOCKED EVO</div>
          </div>
        </div>
        <div className="stat-badge variant-stat hero-stat">
          <Crown color="#facc15" size={24} />
          <div className="stat-values">
            <div className="stat-main">{variantProgress.unlockedHeroes}/{variantProgress.totalHeroes}</div>
            <div className="stat-label">UNLOCKED HEROES</div>
          </div>
        </div>
      </div>
    </div>
  );
};
